(() => {
  const view = document.getElementById("interPhaceRuntimeView");
  if (!view) return;

  const DEFAULT_ROUTE = "interPhace/index.html";
  const ROUTES = new Set([
    "interPhace/index.html",
    "synthPhace/index.html",
    "arpPhace/index.html",
    "drumPhace/index.html",
    "noisePhace/index.html",
    "dronePhace/index.html",
  ]);
  const PHACES = new Set(["interPhace", "synthPhace", "arpPhace", "drumPhace", "noisePhace", "dronePhace"]);
  const phaceStates = new Map();
  let activeSession = null;
  let audioContext = null;
  let liveNoise = null;
  let liveNoiseModule = null;
  let liveDroneModule = null;
  // Kept only for the unused legacy buffer paths below. The live processor
  // path is driven exclusively by the poll-and-coalesce policy.
  let noiseReplacementTimer = null;
  let liveDrone = null;
  let droneReplacementTimer = null;
  let retiringNoise = null;
  let retiringDrone = null;
  const LIVE_STATE_POLL_MS = 250;
  const LIVE_STATE_SETTLE_MS = 800;
  const LIVE_CROSSFADE_SECONDS = 1.25;
  const LIVE_STOP_RELEASE_SECONDS = 0.3;
  const liveStateMeta = new Map();

  function cloneState(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return null; }
  }

  function recordLiveState(phace, state, { applied = false } = {}) {
    const previous = liveStateMeta.get(phace);
    const entry = {
      state,
      changedAt: Date.now(),
      revision: (previous?.revision || 0) + 1,
      appliedRevision: previous?.appliedRevision || 0,
      replacing: false,
    };
    if (applied) entry.appliedRevision = entry.revision;
    liveStateMeta.set(phace, entry);
  }

  function processPendingLiveState() {
    const phaces = activeSession?.mode === "global" ? activeSession.sources : [activeSession?.phace];
    for (const phace of phaces || []) {
      if (phace !== "noisePhace" && phace !== "dronePhace") continue;
      const entry = liveStateMeta.get(phace);
      if (!entry || entry.replacing || entry.appliedRevision === entry.revision || Date.now() - entry.changedAt < LIVE_STATE_SETTLE_MS) continue;
      const revision = entry.revision; entry.replacing = true;
      const replace = phace === "noisePhace" ? replaceLiveNoise(effectiveLiveState(phace, entry.state)) : replaceLiveDroneProcessor(effectiveLiveState(phace, entry.state));
      Promise.resolve(replace).catch(error => console.error(`${phace} live replacement failed.`, error)).finally(() => {
        entry.replacing = false;
        if (entry.revision === revision) entry.appliedRevision = revision;
      });
    }
  }

  window.setInterval(processPendingLiveState, LIVE_STATE_POLL_MS);

  function notifySession() {
    if (!view.contentWindow) return;
    view.contentWindow.postMessage({
      type: "interPhace:runtime-session",
      session: activeSession ? cloneState(activeSession) : null,
    }, window.location.origin);
  }

  async function ensureAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio playback is unavailable.");
    if (!audioContext || audioContext.state === "closed") audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") await audioContext.resume();
    if (!liveNoiseModule) {
      liveNoiseModule = audioContext.audioWorklet.addModule("noisePhace/live-noise-processor.js?v=565");
      await liveNoiseModule;
    }
    return audioContext;
  }

  async function replaceLiveNoise(state, { immediate = false } = {}) {
    const context = await ensureAudioContext();
    disposeNoise(retiringNoise);
    retiringNoise = null;
    const node = new AudioWorkletNode(context, "interphace-live-noise", {
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: { state },
    });
    node.onprocessorerror = () => console.error("noisePhace live processor stopped.");
    const gain = context.createGain();
    const now = context.currentTime;
    node.connect(gain); gain.connect(context.destination);
    gain.gain.setValueAtTime(0, now);
    const entry = state?.runtimeEntry;
    const entryAt = Math.max(now, Number(entry?.startAt) || now);
    const fade = entry ? Math.max(0, Number(entry.fadeIn) || 0) : (immediate ? 0.035 : LIVE_CROSSFADE_SECONDS);
    gain.gain.setValueAtTime(0, entryAt);
    gain.gain.linearRampToValueAtTime(Math.max(0, Number(state?.mixer?.gain) || 0), entryAt + fade);
    const previous = liveNoise;
    liveNoise = { node, gain };
    if (previous) {
      previous.gain.gain.cancelScheduledValues(now);
      previous.gain.gain.setValueAtTime(previous.gain.gain.value, now);
      previous.gain.gain.linearRampToValueAtTime(0, now + LIVE_CROSSFADE_SECONDS);
      retiringNoise = previous;
      previous.disposeTimer = window.setTimeout(() => {
        if (retiringNoise === previous) retiringNoise = null;
        disposeNoise(previous);
      }, (LIVE_CROSSFADE_SECONDS + 0.06) * 1000);
    }
  }

  function dbToGain(db) { return Math.pow(10, (Number(db) || 0) / 20); }
  function effectiveLiveState(phace, state) {
    const next = cloneState(state) || {};
    if (activeSession?.mode !== "global") return next;
    const project = phaceStates.get("interPhace") || {};
    const channel = phace === "noisePhace" ? "noise" : "drone";
    next.project = cloneState(project.project || {});
    next.mixer = { db: Number(project.mixer?.[channel]) || 0, muted: !!project.muted?.[channel], gain: project.muted?.[channel] ? 0 : dbToGain(project.mixer?.[channel]) };
    return next;
  }

  function syncGlobalMixer() {
    if (activeSession?.mode !== "global" || !audioContext) return;
    const now = audioContext.currentTime;
    for (const [phace, voice] of [["noisePhace", liveNoise], ["dronePhace", liveDrone]]) {
      if (!voice?.gain) continue;
      const state = effectiveLiveState(phace, phaceStates.get(phace) || {});
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(Math.max(0, Number(state.mixer?.gain) || 0), now, .025);
    }
  }

  function disposeNoise(voice) {
    if (!voice) return;
    if (voice.disposeTimer) window.clearTimeout(voice.disposeTimer);
    try { voice.node?.port.postMessage({ type: "shutdown" }); } catch (_) {}
    try { voice.node.disconnect(); voice.gain.disconnect(); } catch (_) {}
  }

  function releaseVoice(voice, dispose) {
    if (!voice || !audioContext) { dispose(voice); return; }
    const now = audioContext.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + LIVE_STOP_RELEASE_SECONDS);
    voice.disposeTimer = window.setTimeout(() => dispose(voice), (LIVE_STOP_RELEASE_SECONDS + .04) * 1000);
  }

  function stopLiveNoise() {
    disposeNoise(retiringNoise); retiringNoise = null;
    const current = liveNoise; liveNoise = null;
    if (!current || !audioContext) return;
    releaseVoice(current, disposeNoise);
  }

  async function replaceLiveDroneProcessor(state, immediate = false) {
    const context = await ensureAudioContext();
    disposeDrone(retiringDrone);
    retiringDrone = null;
    if (!liveDroneModule) { liveDroneModule = context.audioWorklet.addModule("dronePhace/live-drone-processor.js?v=568"); await liveDroneModule; }
    const node = new AudioWorkletNode(context, "interphace-live-drone", { numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { state } });
    const gain = context.createGain(), now = context.currentTime, entry = state?.runtimeEntry, entryAt = Math.max(now, Number(entry?.startAt) || now), fade = entry ? Math.max(0, Number(entry.fadeIn) || 0) : (immediate ? .04 : LIVE_CROSSFADE_SECONDS); node.connect(gain); gain.connect(context.destination); gain.gain.setValueAtTime(0,now); gain.gain.setValueAtTime(0,entryAt); gain.gain.linearRampToValueAtTime(Math.max(0,Number(state.mixer?.gain)||0),entryAt+fade);
    const previous=liveDrone;liveDrone={node,gain};if(previous){previous.gain.gain.cancelScheduledValues(now);previous.gain.gain.setValueAtTime(previous.gain.gain.value,now);previous.gain.gain.linearRampToValueAtTime(0,now+LIVE_CROSSFADE_SECONDS);retiringDrone=previous;previous.disposeTimer=window.setTimeout(()=>{if(retiringDrone===previous)retiringDrone=null;disposeDrone(previous)},(LIVE_CROSSFADE_SECONDS+.06)*1000)}
  }

  function disposeDrone(voice) {
    if (!voice) return;
    if (voice.disposeTimer) window.clearTimeout(voice.disposeTimer);
    try { voice.node?.port.postMessage({ type: "shutdown" }); } catch (_) {}
    try { voice.node?.disconnect(); voice.gain?.disconnect(); } catch (_) {}
  }

  function droneValue(state, id, fallback = 0) {
    return Math.max(0, Math.min(100, Number(state?.values?.[id] ?? fallback) || 0)) / 100;
  }

  function buildLiveDrone(state) {
    const context = audioContext;
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    const delay = context.createDelay(2.5);
    const feedback = context.createGain();
    const wet = context.createGain();
    const values = state?.values || {};
    const harmony = droneValue(state, "app6_b1_p1_c2", 18);
    const voices = Math.max(1, Math.min(5, 1 + Math.round(droneValue(state, "app6_b1_p1_c3", 100) * 4)));
    const register = [-24, -12, 0, 12, 24][Math.round(droneValue(state, "app6_b1_p1_c4", 50) * 4)] || 0;
    const spread = Math.round(droneValue(state, "app6_b1_p1_c5", 50) * 4);
    const root = Math.max(21, Math.min(108, Number(phaceStates.get("interPhace")?.project?.root) || 60));
    const families = [[0,7,12,19,24],[0,7,16,12,19],[0,7,16,14,19],[0,7,17,14,19],[0,12,24,36,48],[0,2,7,12,14]];
    const offsets = families[Math.min(families.length - 1, Math.round(harmony * (families.length - 1)))] || families[2];
    const shifts = [[0,0,-12,-12,-12],[0,0,0,-12,0],[0,0,0,0,0],[0,0,0,12,12],[0,0,12,12,24]][spread] || [0,0,0,0,0];
    const weights = [.34,.25,.20,.13,.08];
    const harmonics = droneValue(state, "app6_b2_p1_c1", 22);
    const brightness = droneValue(state, "app6_b2_p1_c2", 42);
    const air = droneValue(state, "app6_b2_p1_c4", 28);
    const saturation = droneValue(state, "app6_b2_p1_c5", 18);
    const width = droneValue(state, "app6_b4_p1_c1", 58);
    const delayAmount = droneValue(state, "app6_b4_p1_c2", 42);
    const reverb = droneValue(state, "app6_b4_p1_c3", 24);
    const motion = droneValue(state, "app6_b3_p1_c1", 48);
    filter.type = "lowpass"; filter.frequency.value = 700 * Math.pow(26, brightness); filter.Q.value = .2 + harmonics * 4;
    delay.delayTime.value = .12 + delayAmount * .55; feedback.gain.value = .05 + reverb * .28; wet.gain.value = delayAmount * .28 + reverb * .18;
    master.connect(filter); filter.connect(context.destination); filter.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(wet); wet.connect(filter);
    const nodes = [master, filter, delay, feedback, wet];
    for (let i = 0; i < voices; i++) {
      const oscillator = context.createOscillator(); const gain = context.createGain(); const pan = context.createStereoPanner();
      const midi = 48 + (root % 12) + register + offsets[i] + shifts[i];
      oscillator.type = harmonics > .55 ? "triangle" : "sine";
      oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      oscillator.detune.value = (i - 2) * (3 + width * 11);
      // Voice weights already sum to the authored bed level. Dividing by the
      // count again made the default five-voice drone nearly silent.
      gain.gain.value = weights[i] * (.62 + saturation * .24) * (1 - motion * .18);
      pan.pan.value = Math.max(-.92, Math.min(.92, (i - 2) * .25 * (.25 + width)));
      oscillator.connect(gain); gain.connect(pan); pan.connect(master); oscillator.start();
      nodes.push(oscillator, gain, pan);
    }
    if (air > .02) {
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate); const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const source = context.createBufferSource(); const airFilter = context.createBiquadFilter(); const airGain = context.createGain();
      source.buffer = buffer; source.loop = true; airFilter.type = "highpass"; airFilter.frequency.value = 2400; airGain.gain.value = Math.pow(air, 1.15) * .018;
      source.connect(airFilter); airFilter.connect(airGain); airGain.connect(master); source.start(); nodes.push(source, airFilter, airGain);
    }
    return { master, nodes };
  }

  async function replaceLiveDrone(state, { immediate = false } = {}) {
    await ensureAudioContext();
    const next = buildLiveDrone(state); const now = audioContext.currentTime;
    next.master.gain.setValueAtTime(0, now); next.master.gain.linearRampToValueAtTime(Math.max(0, Number(state?.mixer?.gain) || 0), now + (immediate ? .04 : .75));
    const previous = liveDrone; liveDrone = next;
    if (previous) { previous.master.gain.cancelScheduledValues(now); previous.master.gain.setValueAtTime(previous.master.gain.value, now); previous.master.gain.linearRampToValueAtTime(0, now + .75); window.setTimeout(() => previous.nodes.forEach(node => { try { node.stop?.(); node.disconnect(); } catch (_) {} }), 800); }
  }

  function stopLiveDrone() {
    if (droneReplacementTimer) window.clearTimeout(droneReplacementTimer); droneReplacementTimer = null;
    const current = liveDrone; liveDrone = null; if (!current || !audioContext) return;
    const now = audioContext.currentTime; current.master.gain.cancelScheduledValues(now); current.master.gain.setValueAtTime(current.master.gain.value, now); current.master.gain.linearRampToValueAtTime(0, now + .03);
    window.setTimeout(() => current.nodes.forEach(node => { try { node.stop?.(); node.disconnect(); } catch (_) {} }), 60);
  }

  function scheduleDroneReplacement(state) {
    if (droneReplacementTimer) window.clearTimeout(droneReplacementTimer);
    droneReplacementTimer = window.setTimeout(() => { droneReplacementTimer = null; if (activeSession?.phace === "dronePhace") replaceLiveDrone(state).catch(console.error); }, 550);
  }

  async function replaceRenderedDrone(rendered) {
    await ensureAudioContext();
    if (!window.InterPhaceBedLoop) throw new Error("Persistent bed loop is unavailable.");
    const left = rendered.left, right = rendered.right;
    if (!ArrayBuffer.isView(left) || !ArrayBuffer.isView(right) || left.BYTES_PER_ELEMENT !== 4 || right.BYTES_PER_ELEMENT !== 4 || left.length !== right.length) return;
    const buffer = audioContext.createBuffer(2, left.length, Number(rendered.sampleRate) || 44100);
    buffer.copyToChannel(left, 0); buffer.copyToChannel(right, 1);
    const bus = audioContext.createGain(); const now = audioContext.currentTime;
    bus.gain.setValueAtTime(0, now); bus.connect(audioContext.destination);
    const transport = window.InterPhaceBedLoop.create({ context: audioContext, buffer, destination: bus, gain: 1, overlapSeconds: 3, startTime: now + .02 });
    const target = Math.max(0, Number(rendered.gain) || 0);
    bus.gain.linearRampToValueAtTime(target, now + .70);
    const previous = liveDrone; liveDrone = { transport, bus };
    if (previous) {
      previous.bus.gain.cancelScheduledValues(now); previous.bus.gain.setValueAtTime(previous.bus.gain.value, now); previous.bus.gain.linearRampToValueAtTime(0, now + .70);
      window.setTimeout(() => { try { previous.transport.stop(); previous.bus.disconnect(); } catch (_) {} }, 760);
    }
  }

  async function startRuntimeSession(phace, state) {
    stopRuntimeSession();
    phaceStates.set(phace, cloneState(state));
    recordLiveState(phace, state, { applied: true });
    activeSession = { phace, startedAt: Date.now() };
    if (phace === "noisePhace") await replaceLiveNoise(state, { immediate: true });
    if (phace === "dronePhace") await replaceLiveDroneProcessor(state, true);
    notifySession();
  }

  async function startGlobalRuntimeSession(payload) {
    stopRuntimeSession();
    const project = cloneState(payload?.project);
    if (!project || typeof project !== "object") return;
    phaceStates.set("interPhace", project);
    const sources = [];
    const context = await ensureAudioContext();
    const entries = payload?.project?.bedEntry || {};
    const lead = { noisePhace: Math.max(-10, Math.min(10, Number(entries.noise?.leadIn) || 0)), dronePhace: Math.max(-10, Math.min(10, Number(entries.drone?.leadIn) || 0)) };
    const preRoll = Math.max(0, -lead.noisePhace, -lead.dronePhace);
    for (const phace of ["noisePhace", "dronePhace"]) {
      const source = cloneState(payload?.sources?.[phace]);
      if (!source || project.muted?.[phace === "noisePhace" ? "noise" : "drone"]) continue;
      const key = phace === "noisePhace" ? "noise" : "drone";
      source.runtimeEntry = { startAt: context.currentTime + .03 + preRoll + lead[phace], fadeIn: Math.max(0, Math.min(10, Number(entries[key]?.fadeIn) || 0)) };
      phaceStates.set(phace, source); recordLiveState(phace, source, { applied: true }); sources.push(phace);
    }
    activeSession = { phace: "interPhace", mode: "global", sources, startedAt: Date.now() };
    await Promise.all(sources.map(phace => phace === "noisePhace"
      ? replaceLiveNoise(effectiveLiveState(phace, phaceStates.get(phace)), { immediate: true })
      : replaceLiveDroneProcessor(effectiveLiveState(phace, phaceStates.get(phace)), true)));
    notifySession();
    return true;
  }

  function stopRuntimeSession() {
    activeSession = null;
    stopLiveNoise();
    disposeDrone(retiringDrone); retiringDrone = null;
    if (liveDrone?.transport) { try { liveDrone.transport.stop(); liveDrone.bus.disconnect(); } catch (_) {} liveDrone = null; }
    else if (liveDrone) { const current = liveDrone; liveDrone = null; releaseVoice(current, disposeDrone); }
    else stopLiveDrone();
    notifySession();
  }

  function normalizeRoute(raw) {
    try {
      const url = new URL(raw || DEFAULT_ROUTE, window.location.href);
      if (url.origin !== window.location.origin) return DEFAULT_ROUTE;
      const route = [...ROUTES].find((candidate) => url.pathname.endsWith(`/${candidate}`));
      if (route) return `${route}${url.search}`;
      if (url.pathname.endsWith("/index.html")) return `interPhace/index.html${url.search}`;
      return DEFAULT_ROUTE;
    } catch (_) {
      return DEFAULT_ROUTE;
    }
  }

  function routeFromHash() {
    const encoded = window.location.hash.slice(1);
    if (encoded) return normalizeRoute(decodeURIComponent(encoded));
    const settings = new URL(window.location.href).searchParams.get("settings");
    return /^[1-5]$/.test(settings || "")
      ? `interPhace/index.html?settings=${settings}`
      : DEFAULT_ROUTE;
  }

  function setRoute(route, { push = false } = {}) {
    const safe = normalizeRoute(route);
    if (view.getAttribute("src") !== safe) view.setAttribute("src", safe);
    const hash = `#${encodeURIComponent(safe)}`;
    if (push) window.history.pushState({ route: safe }, "", hash);
    else if (window.location.hash !== hash) window.history.replaceState({ route: safe }, "", hash);
  }

  window.addEventListener("message", async event => {
    if (event.origin !== window.location.origin || event.source !== view.contentWindow) return;
    const message = event.data || {};
    if (message.type === "interPhace:runtime-navigate") {
      setRoute(message.href, { push: true });
      return;
    }
    if (!PHACES.has(message.phace) && message.type !== "interPhace:runtime-stop" && message.type !== "interPhace:runtime-global-start") return;
    if (message.type === "interPhace:runtime-state") {
      const state = cloneState(message.state);
      if (state && typeof state === "object") {
        phaceStates.set(message.phace, state);
        if (message.phace === "noisePhace" || message.phace === "dronePhace") recordLiveState(message.phace, state);
        if (message.phace === "interPhace") syncGlobalMixer();
      }
      return;
    }
    if (message.type === "interPhace:runtime-start") {
      const state = cloneState(message.state);
      if (!state || typeof state !== "object") return;
      await startRuntimeSession(message.phace, state);
      return;
    }
    if (message.type === "interPhace:runtime-global-start") {
      await startGlobalRuntimeSession(message.payload);
      return;
    }
    if (message.type === "interPhace:runtime-rendered-bed" && message.phace === "dronePhace") {
      if (activeSession?.phace === "dronePhace") await replaceRenderedDrone(message.rendered);
      return;
    }
    if (message.type === "interPhace:runtime-stop") {
      stopRuntimeSession();
    }
  });

  window.addEventListener("popstate", () => setRoute(routeFromHash()));
  view.addEventListener("load", notifySession);
  window.InterPhaceRuntimeHost = Object.freeze({
    navigate: route => setRoute(route, { push: true }),
    stateFor: phace => cloneState(phaceStates.get(phace) || null),
    session: () => cloneState(activeSession),
    start: (phace, state) => startRuntimeSession(phace, state),
    startGlobal: payload => startGlobalRuntimeSession(payload),
    stop: () => stopRuntimeSession(),
    replaceRenderedBed: (phace, rendered) => {
      if (phace === "dronePhace" && activeSession?.phace === "dronePhace") return replaceRenderedDrone(rendered);
      return null;
    },
    receive(message) {
      window.dispatchEvent(new MessageEvent("message", { data: message, origin: window.location.origin, source: view.contentWindow }));
    },
  });
  setRoute(routeFromHash());
})();
