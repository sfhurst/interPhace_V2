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
  let stagedPitchedRuntimeState = null;
  let drumEngineFrame = null;
  let drumEngineReady = null;
  let pitchedEngineFrame = null;
  let pitchedEngineReady = null;
  let arpEngineFrame = null;
  let arpEngineReady = null;
  let liveRootDrums = null;
  let liveRootPitched = null;
  let transport = null;
  let rootSchedulerTimer = null;
  let transportGeneration = 0;
  const TRANSPORT_TICK_MS = 25;
  const TRANSPORT_CONTRACT_VERSION = 1;
  const RUNTIME_BUILD_VERSION = "647";
  // Kept only for the unused legacy buffer paths below. The live processor
  // path is driven exclusively by the poll-and-coalesce policy.
  let noiseReplacementTimer = null;
  let liveDrone = null;
  let droneReplacementTimer = null;
  let retiringNoise = null;
  let retiringDrone = null;
  let liveStatePollTimer = null;
  let runtimeGeneration = 0;
  let idleSuspendTimer = null;
  let idleCacheTimer = null;
  let idleCacheGeneration = 0;
  let idleCacheWarming = false;
  const IDLE_CACHE_DELAY_MS = 350;
  const LIVE_STATE_POLL_MS = 250;
  const LIVE_STATE_SETTLE_MS = 800;
  const LIVE_CROSSFADE_SECONDS = 1.25;
  const LIVE_STOP_RELEASE_SECONDS = 0.3;
  const liveStateMeta = new Map();
  const GLOBAL_RUNTIME_START_GUARD_SECONDS = 0.22;
  const TRANSPORT_DIAGNOSTIC_LIMIT = 2048;
  let transportDiagnostics = [];
  let lastDiagnosticRootStep = null;

  function clearTransportDiagnostics() {
    transportDiagnostics = [];
    lastDiagnosticRootStep = null;
  }

  function recordTransportDiagnostic(entry) {
    transportDiagnostics.push({ epochMs: Date.now(), ...cloneState(entry) });
    if (transportDiagnostics.length > TRANSPORT_DIAGNOSTIC_LIMIT) transportDiagnostics.shift();
  }

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

  // Foundation only: the persistent host is now the retained owner of the
  // complete sP live state. It deliberately makes no sound until the live
  // pitched voice is migrated in the next stage.
  function stagePitchedRuntimeState(state) {
    stagedPitchedRuntimeState = cloneState(state);
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

  function syncLiveStatePoll() {
    const sources = activeSession?.mode === "global" ? activeSession.sources : [activeSession?.phace];
    const needed = (sources || []).some(phace => phace === "noisePhace" || phace === "dronePhace");
    if (needed && !liveStatePollTimer) liveStatePollTimer = window.setInterval(processPendingLiveState, LIVE_STATE_POLL_MS);
    if (!needed && liveStatePollTimer) { window.clearInterval(liveStatePollTimer); liveStatePollTimer = null; }
  }
  function cancelIdleSuspend() { if (idleSuspendTimer) window.clearTimeout(idleSuspendTimer); idleSuspendTimer = null; }
  function scheduleIdleSuspend() { cancelIdleSuspend(); const generation = runtimeGeneration; idleSuspendTimer = window.setTimeout(() => { idleSuspendTimer = null; if (generation === runtimeGeneration && !activeSession && audioContext?.state === "running") audioContext.suspend().catch(console.error); }, 400); }
  function cancelIdleCacheWarmup() {
    idleCacheGeneration += 1;
    if (idleCacheTimer) window.clearTimeout(idleCacheTimer);
    idleCacheTimer = null;
    idleCacheWarming = false;
    // Do not create a hidden engine merely to cancel work. If one is already
    // retained, stop its queued idle jobs before a user action/playback route.
    drumEngineReady?.then(api => api.cancelWarmCache?.()).catch(() => {});
  }
  function scheduleIdleCacheWarmup(reason = "idle") {
    if (activeSession || document.hidden) return;
    if (idleCacheTimer) window.clearTimeout(idleCacheTimer);
    const generation = ++idleCacheGeneration;
    idleCacheTimer = window.setTimeout(async () => {
      idleCacheTimer = null;
      if (generation !== idleCacheGeneration || activeSession || document.hidden) return;
      idleCacheWarming = true;
      try {
        const api = await ensureDrumEngine();
        if (generation !== idleCacheGeneration || activeSession || document.hidden) return;
        api.warmCache?.();
        recordTransportDiagnostic({ stage: "dP-idle-cache-warm", reason });
      } catch (error) {
        console.warn("Idle drum-cache warmup failed.", error);
      } finally {
        if (generation === idleCacheGeneration) idleCacheWarming = false;
      }
    }, IDLE_CACHE_DELAY_MS);
  }

  function notifySession() {
    if (!view.contentWindow) return;
    view.contentWindow.postMessage({
      type: "interPhace:runtime-session",
      session: activeSession ? cloneState(activeSession) : null,
    }, window.location.origin);
  }

  function notifyDrumPlayhead(step) {
    if (!view.contentWindow) return;
    view.contentWindow.postMessage({ type: "interPhace:runtime-drum-playhead", step }, window.location.origin);
  }

  function notifyArpPlayhead(playhead) {
    if (!view.contentWindow) return;
    view.contentWindow.postMessage({ type: "interPhace:runtime-arp-playhead", playhead: cloneState(playhead) }, window.location.origin);
  }

  // interPhace is the sole timing authority. Local Phace snapshots have
  // different shapes (dP has only `snapshot`; aP carries a flattened
  // sequence), so they must never be used to reconstruct project Tempo or
  // Swing for the shared transport.
  function readProjectTiming() {
    try {
      const saved = JSON.parse(localStorage.getItem("interPhace.interPhace.ui.v2") || "null") || {};
      return saved.project || {};
    } catch (_) {
      return {};
    }
  }

  function transportStepAt(step) {
    if (!transport) return null;
    const position = Math.max(0, Math.floor(Number(step) || 0));
    const stepSeconds = 60 / transport.tempo / 4;
    const swingDelay = position % 2 === 1 ? stepSeconds * 0.5 * (transport.swing / 100) : 0;
    return transport.startAt + position * stepSeconds + swingDelay;
  }

  // Root-owned event contract for later audio migrations. It names an event
  // by absolute root-audio-clock time; no child consumes it in Milestone 1.1.
  function transportEventAt(step) {
    if (!transport) return null;
    const absoluteStep = Math.max(0, Math.floor(Number(step) || 0));
    return { contractVersion: TRANSPORT_CONTRACT_VERSION, generation: transport.generation, time: transportStepAt(absoluteStep), bar: Math.floor(absoluteStep / 16), step: absoluteStep, stepInBar: absoluteStep % 16 };
  }

  function transportSnapshot() {
    if (!transport || !audioContext) return null;
    if (audioContext.currentTime < transport.startAt) {
      return {
        contractVersion: TRANSPORT_CONTRACT_VERSION,
        generation: transport.generation,
        running: false,
        tempo: transport.tempo,
        swing: transport.swing,
        startAt: transport.startAt,
        now: audioContext.currentTime,
        scheduledEpochMs: transport.startEpochMs,
      };
    }
    const elapsed = Math.max(0, audioContext.currentTime - transport.startAt);
    const stepSeconds = 60 / transport.tempo / 4;
    // Audio uses the shared swung-sixteenth map. The visual phase must use
    // that same map rather than treating every sixteenth as equally spaced.
    // Otherwise the tracker advances before every swung offbeat is audible.
    let step = Math.max(0, Math.floor(elapsed / stepSeconds));
    while (transportStepAt(step + 1) <= audioContext.currentTime) step += 1;
    while (step > 0 && transportStepAt(step) > audioContext.currentTime) step -= 1;
    const event = transportEventAt(step);
    return { ...event, running: true, tempo: transport.tempo, swing: transport.swing, startAt: transport.startAt, now: audioContext.currentTime, scheduledEpochMs: transport.startEpochMs + (event.time - transport.startAt) * 1000 };
  }

  function notifyTransport() {
    const snapshot = transportSnapshot();
    if (snapshot && activeSession?.mode === "global") {
      const songBar = Math.max(0, Number(snapshot.bar) || 0);
      const drumSequence = activeSession.drumSequencer;
      const melodySequence = activeSession.pitchedMode === "sequencer-melody"
        ? activeSession.pitchedSequencer
        : null;
      const drumSource = Array.isArray(drumSequence) && drumSequence.length
        ? drumSequence[songBar % drumSequence.length]
        : null;
      const melodySource = Array.isArray(melodySequence) && melodySequence.length
        ? melodySequence[songBar % melodySequence.length]
        : null;
      snapshot.sequencerSource = {
        drum: drumSource ? {
          kick: Math.max(0, Number(drumSource.kick) - 1),
          snare: Math.max(0, Number(drumSource.snare) - 1),
          hat: Math.max(0, Number(drumSource.hat) - 1),
        } : null,
        melodySequenced: Array.isArray(melodySequence),
        melody: melodySource?.phrase && Number.isFinite(Number(melodySource.bar)) ? {
          phrase: melodySource.phrase,
          column: Math.max(0, Number(melodySource.bar) - 1),
        } : null,
      };
    }
    if (snapshot?.running && snapshot.step !== lastDiagnosticRootStep) {
      lastDiagnosticRootStep = snapshot.step;
      recordTransportDiagnostic({
        stage: "root-step-dispatched",
        rootAudioTime: snapshot.now,
        step: snapshot.step,
        bar: snapshot.bar,
        stepInBar: snapshot.stepInBar,
        drumSource: snapshot.sequencerSource?.drum || null,
        melodySource: snapshot.sequencerSource?.melody || null,
        visibleRoute: view.getAttribute("src") || null,
      });
    }
    if (!view.contentWindow) return;
    view.contentWindow.postMessage({ type: "interPhace:runtime-transport", transport: snapshot }, window.location.origin);
  }

  // The root owns all live musical scheduling.  Its one timer schedules audio
  // first, then publishes the current root-clock position for visible grids.
  // Audio source rules, horizons, and transport math remain in their existing
  // dP and pitched scheduler functions below.
  function runRootScheduler() {
    if (!transport || !audioContext) return;
    // The former independent timers isolated a source-side failure. Retain
    // that isolation while using one scheduling cadence.
    try { scheduleRootDrums(); }
    catch (error) { console.error("Root drum scheduling failed.", error); }
    try { scheduleRootPitched(); }
    catch (error) { console.error("Root pitched scheduling failed.", error); }
    notifyTransport();
  }

  function startRootScheduler() {
    if (!transport || rootSchedulerTimer) return;
    runRootScheduler();
    rootSchedulerTimer = window.setInterval(runRootScheduler, TRANSPORT_TICK_MS);
  }

  function stopRootScheduler() {
    if (rootSchedulerTimer) window.clearInterval(rootSchedulerTimer);
    rootSchedulerTimer = null;
  }

  function startTransport(startAt, project) {
    stopTransport();
    transport = {
      generation: ++transportGeneration,
      startAt,
      startEpochMs: Date.now() + Math.max(0, startAt - audioContext.currentTime) * 1000,
      tempo: Math.max(30, Math.min(300, Number(project?.tempo) || 75)),
      swing: Math.max(0, Math.min(100, Number(project?.swing) || 0)),
    };
    startRootScheduler();
  }

  function stopTransport() {
    stopRootScheduler();
    transport = null;
    transportGeneration += 1;
    notifyTransport();
  }

  function drumSessionAccent(state) {
    const snapshot = state?.snapshot || {};
    if (snapshot.currentView !== "synth") return "#ff4b4b";
    return { kick: "#ff4b4b", snare: "#66e0b3", hat: "#ffd84d" }[snapshot.currentPage] || "#ff4b4b";
  }

  function assembleSequencedMelody(sequenceRows, melodyBars, project) {
    if (!Array.isArray(sequenceRows) || !sequenceRows.length || !melodyBars) return null;
    const tempo = Math.max(30, Math.min(300, Number(project?.tempo) || 75));
    const swing = Math.max(0, Math.min(100, Number(project?.swing) || 0));
    const secondsPerBar = 240 / tempo;
    const events = [];
    sequenceRows.forEach((choice, row) => {
      if (!choice?.phrase || !choice?.bar) return;
      const source = melodyBars?.[choice.phrase]?.[choice.bar];
      if (!source?.events) return;
      for (const event of source.events) {
        events.push({ ...event, offsetSixteenths: row * 16 + Math.max(0, Number(event.offsetSixteenths) || 0), offsetSeconds: row * secondsPerBar + Math.max(0, Number(event.offsetSeconds) || 0) });
      }
    });
    return { view: "melody", phrase: "sequencer", tempo, swing, loopSixteenths: sequenceRows.length * 16, loopSeconds: sequenceRows.length * secondsPerBar, events };
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

  function ensureDrumEngine() {
    if (drumEngineReady) return drumEngineReady;
    drumEngineFrame = document.createElement("iframe");
    drumEngineFrame.id = "interPhacePersistentDrumEngine";
    drumEngineFrame.src = `drumPhace/index.html?persistent-engine=1&build=${RUNTIME_BUILD_VERSION}`;
    drumEngineFrame.setAttribute("aria-hidden", "true");
    drumEngineFrame.tabIndex = -1;
    Object.assign(drumEngineFrame.style, { position: "fixed", width: "1px", height: "1px", left: "-10000px", top: "-10000px", border: "0", opacity: "0", pointerEvents: "none" });
    document.body.appendChild(drumEngineFrame);
    drumEngineReady = new Promise((resolve, reject) => {
      const started = performance.now();
      const poll = () => {
        const api = drumEngineFrame?.contentWindow?.DrumPhaceLiveAPI;
        if (api) { resolve(api); return; }
        if (performance.now() - started > 10000) { reject(new Error("Persistent drum engine did not become ready.")); return; }
        window.setTimeout(poll, 25);
      };
      drumEngineFrame.addEventListener("load", poll, { once: true });
      window.setTimeout(poll, 25);
    });
    return drumEngineReady;
  }

  // sP stays loaded beside the retained dP engine. Its Web Audio context and
  // scheduled voices therefore survive visible Phace navigation.
  function ensurePitchedEngine() {
    if (pitchedEngineReady) return pitchedEngineReady;
    pitchedEngineFrame = document.createElement("iframe");
    pitchedEngineFrame.id = "interPhacePersistentPitchedEngine";
    pitchedEngineFrame.src = `synthPhace/index.html?persistent-engine=1&build=${RUNTIME_BUILD_VERSION}`;
    pitchedEngineFrame.setAttribute("aria-hidden", "true");
    pitchedEngineFrame.tabIndex = -1;
    Object.assign(pitchedEngineFrame.style, { position: "fixed", width: "1px", height: "1px", left: "-10000px", top: "-10000px", border: "0", opacity: "0", pointerEvents: "none" });
    document.body.appendChild(pitchedEngineFrame);
    pitchedEngineReady = new Promise((resolve, reject) => {
      const started = performance.now();
      const poll = () => {
        const api = pitchedEngineFrame?.contentWindow?.SynthPhaceLiveAPI;
        if (api) { resolve(api); return; }
        if (performance.now() - started > 10000) { reject(new Error("Persistent synth engine did not become ready.")); return; }
        window.setTimeout(poll, 25);
      };
      pitchedEngineFrame.addEventListener("load", poll, { once: true });
      window.setTimeout(poll, 25);
    });
    return pitchedEngineReady;
  }

  function ensureArpEngine() {
    if (arpEngineReady) return arpEngineReady;
    arpEngineFrame = document.createElement("iframe");
    arpEngineFrame.id = "interPhacePersistentArpEngine";
    arpEngineFrame.src = `arpPhace/index.html?persistent-engine=1&build=${RUNTIME_BUILD_VERSION}`;
    arpEngineFrame.setAttribute("aria-hidden", "true");
    arpEngineFrame.tabIndex = -1;
    Object.assign(arpEngineFrame.style, { position: "fixed", width: "1px", height: "1px", left: "-10000px", top: "-10000px", border: "0", opacity: "0", pointerEvents: "none" });
    document.body.appendChild(arpEngineFrame);
    arpEngineReady = new Promise((resolve, reject) => {
      const started = performance.now();
      const poll = () => {
        const api = arpEngineFrame?.contentWindow?.ArpPhaceLiveAPI;
        if (api) { resolve(api); return; }
        if (performance.now() - started > 10000) { reject(new Error("Persistent arp engine did not become ready.")); return; }
        window.setTimeout(poll, 25);
      };
      arpEngineFrame.addEventListener("load", poll, { once: true });
      window.setTimeout(poll, 25);
    });
    return arpEngineReady;
  }

  function stopRootDrums() {
    const current = liveRootDrums;
    liveRootDrums = null;
    if (!current || !audioContext) return;
    const now = audioContext.currentTime;
    current.bus.gain.cancelScheduledValues(now);
    current.bus.gain.setValueAtTime(current.bus.gain.value, now);
    current.bus.gain.linearRampToValueAtTime(0, now + .03);
    window.setTimeout(() => { try { current.bus.disconnect(); } catch (_) {} }, 60);
  }

  async function startRootDrums(api, drum) {
    if (!audioContext || !transport || !api?.configureRootGlobal?.(drum)) return;
    stopRootDrums();
    const bus = audioContext.createGain();
    bus.gain.setValueAtTime(1, audioContext.currentTime);
    bus.connect(audioContext.destination);
    const sequence = cloneState(drum.sequence) || [];
    const local = !!drum.local;
    const rootDrums = { api, bus, sequence, local, state: cloneState(drum), mixer: cloneState(drum.mixer) || {}, nextStep: 0 };
    const secondsPerStep = 60 / transport.tempo / 4;
    liveRootDrums = rootDrums;
    runRootScheduler();
    recordTransportDiagnostic({ stage: local ? "dP-root-solo-scheduler-armed" : "dP-root-scheduler-armed", rootAudioTime: audioContext.currentTime, rootStartAt: transport.startAt, sequenceBars: sequence.length });
  }

  function scheduleRootDrums() {
    const rootDrums = liveRootDrums;
    if (!rootDrums || !transport || !audioContext) return;
    const horizon = audioContext.currentTime + .1;
    const secondsPerStep = 60 / transport.tempo / 4;
    while (transportStepAt(rootDrums.nextStep) <= horizon) {
      const entry = {
        context: audioContext,
        destination: rootDrums.bus,
        absoluteStep: rootDrums.nextStep,
        startTime: transportStepAt(rootDrums.nextStep),
        secondsPerStep,
        sequence: rootDrums.sequence,
        mixer: rootDrums.mixer,
        state: rootDrums.state,
      };
      if (rootDrums.local) rootDrums.api.scheduleRootLocalStep(entry);
      else rootDrums.api.scheduleRootGlobalStep(entry);
      rootDrums.nextStep += 1;
    }
  }

  function stopRootPitched() {
    const current = liveRootPitched;
    liveRootPitched = null;
    if (!current || !audioContext) return;
    current.api.stopRootVoices?.();
    const now = audioContext.currentTime;
    current.bus.gain.cancelScheduledValues(now);
    current.bus.gain.setValueAtTime(current.bus.gain.value, now);
    current.bus.gain.linearRampToValueAtTime(0, now + .03);
    window.setTimeout(() => { try { current.bus.disconnect(); } catch (_) {} }, 60);
  }

  async function startRootPitched(api, globalPitched, arpApi = null) {
    if (!audioContext || !transport || !api || !globalPitched?.synthState) return;
    stopRootPitched();
    const bus = audioContext.createGain();
    bus.gain.setValueAtTime(1, audioContext.currentTime);
    bus.connect(audioContext.destination);
    const pitched = {
      api, bus,
      arpApi,
      mode: globalPitched.request?.mode || "synth",
      useFullNoteCache: globalPitched.request?.useFullNoteCache === true,
      synthState: cloneState(globalPitched.synthState),
      sequence: cloneState(globalPitched.sequence),
      nextBar: 0,
      nextLoopStep: 0,
    };
    liveRootPitched = pitched;
    // Solo aP's selected B1 Melody or B2 Arp page. Warming never holds the
    // transport: early events retain the established live graph until their
    // exact replacement exists.
    if (pitched.useFullNoteCache && pitched.mode === "melody") {
      api.warmCompleteArpNotes?.(cacheWindow(pitched.sequence, 0), pitched.synthState).catch(error => {
        console.warn("aP full-note cache warmup failed.", error);
      });
    }
    runRootScheduler();
    recordTransportDiagnostic({ stage: "sP-root-scheduler-armed", rootAudioTime: audioContext.currentTime, rootStartAt: transport.startAt, mode: pitched.mode });
  }

  function cacheWindow(sequence, bar) {
    const first = (Math.max(0, Number(bar) || 0) % Math.max(1, Math.round((Number(sequence?.loopSixteenths) || 16) / 16))) * 16;
    return { ...sequence, events: (sequence?.events || []).filter(event => Number(event?.offsetSixteenths) >= first && Number(event?.offsetSixteenths) < first + 16) };
  }

  function scheduleRootPitched() {
    const pitched = liveRootPitched;
    if (!pitched || !transport || !audioContext) return;
    const horizon = audioContext.currentTime + .1;
    const melody = pitched.mode === "melody" || pitched.mode === "sequencer-melody";
    if (melody) {
      while (transportStepAt(pitched.nextBar * 16) <= horizon) {
        const sequence = pitched.sequence;
        const sourceBars = Math.max(1, Math.round((Number(sequence?.loopSixteenths) || 16) / 16));
        const sourceBar = pitched.nextBar % sourceBars;
        const firstStep = sourceBar * 16;
        const finalStep = firstStep + 16;
        for (const event of sequence?.events || []) {
          const eventStep = Number(event?.offsetSixteenths);
          if (!Number.isFinite(eventStep) || eventStep < firstStep || eventStep >= finalStep) continue;
          const localStep = eventStep - firstStep;
          const startTime = transportStepAt(pitched.nextBar * 16 + localStep);
          if (sequence?.arpTone && pitched.arpApi?.scheduleRootToneEvent) {
            pitched.arpApi.scheduleRootToneEvent({ context: audioContext, destination: pitched.bus, startTime, event, effectsReleaseSeconds: sequence.effectsReleaseSeconds });
          } else pitched.api.scheduleRootArpEvent({ context: audioContext, destination: pitched.bus, startTime, sequence, synthState: pitched.synthState, event, useFullNoteCache: pitched.useFullNoteCache });
        }
        if (pitched.useFullNoteCache && !sequence?.arpTone) pitched.api.warmCompleteArpNotes?.(cacheWindow(sequence, sourceBar + 1), pitched.synthState).catch(() => {});
        pitched.nextBar += 1;
      }
      return;
    }
    while (transportStepAt(pitched.nextLoopStep) <= horizon) {
      pitched.api.scheduleRootSynthTrigger({
        context: audioContext,
        destination: pitched.bus,
        startTime: transportStepAt(pitched.nextLoopStep),
        state: pitched.synthState,
      });
      const bars = Math.max(1, Math.min(16, Math.round(Number(pitched.synthState?.playback?.loopLengthBars) || 4)));
      pitched.nextLoopStep += bars * 16;
    }
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
    if (activeSession.sources?.includes("drumPhace")) {
      const project = phaceStates.get("interPhace") || {};
      const mixer = Object.fromEntries(["kick", "snare", "hat"].map(channel => {
        const db = Number(project.mixer?.[channel]) || 0;
        const muted = !!project.muted?.[channel];
        return [channel, { db, muted, gain: muted ? 0 : dbToGain(db) }];
      }));
      if (liveRootDrums) liveRootDrums.mixer = mixer;
      else ensureDrumEngine().then(api => api.setGlobalMixer(mixer)).catch(() => {});
    }
    // The pitched root is shared with solo aP, so mute it only while iP owns
    // the active session.  The individual cached/live note gains retain the
    // synth slider level; this bus is solely iP's live mute gate.
    if (activeSession.sources?.includes("pitched") && liveRootPitched?.bus) {
      const project = phaceStates.get("interPhace") || {};
      const muted = !!project.muted?.synth;
      liveRootPitched.bus.gain.cancelScheduledValues(now);
      liveRootPitched.bus.gain.setTargetAtTime(muted ? 0 : 1, now, .012);
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
    cancelIdleCacheWarmup();
    stopRuntimeSession();
    cancelIdleCacheWarmup();
    cancelIdleSuspend();
    const generation = runtimeGeneration;
    clearTransportDiagnostics();
    recordTransportDiagnostic({ stage: "local-start-requested", phace });
    let localDrumApi = null, localPitchedApi = null, localArpApi = null;
    // Local pitched/drum auditions still use their native voices, but share
    // the root phase service so aP/dP grids do not invent local playheads.
    if (["drumPhace", "synthPhace", "arpPhace"].includes(phace)) {
      // A retained iframe being ready is not enough: its AudioContext may
      // still be cold. Resume every required child context before choosing
      // musical zero, otherwise a stale startDelay is applied after resume.
      if (phace === "drumPhace") {
        localDrumApi = await ensureDrumEngine();
      }
      if (phace === "synthPhace") {
        localPitchedApi = await ensurePitchedEngine();
      }
      if (phace === "arpPhace") {
        localPitchedApi = await ensurePitchedEngine();
        localArpApi = await ensureArpEngine();
      }
      recordTransportDiagnostic({ stage: "local-children-prepared", phace });
      const context = await ensureAudioContext();
      if (generation !== runtimeGeneration) return null;
      const startAt = context.currentTime + GLOBAL_RUNTIME_START_GUARD_SECONDS;
      const startDelay = Math.max(.02, startAt - context.currentTime);
      state.runtimeEntry = { ...(state.runtimeEntry || {}), startDelay, transportStartEpochMs: Date.now() + startDelay * 1000 };
      startTransport(startAt, readProjectTiming());
      recordTransportDiagnostic({ stage: "root-transport-started", phace, rootAudioTime: context.currentTime, rootStartAt: startAt, startDelay, transportGeneration: transport?.generation });
    }
    phaceStates.set(phace, cloneState(state));
    recordLiveState(phace, state, { applied: true });
    activeSession = {
      phace,
      startedAt: Date.now(),
      transport: !!transport,
      accent: phace === "drumPhace" ? drumSessionAccent(state) : null,
      // Preserve the route selected at Play. A later aP control-state message
      // must not misclassify an already-running full-synth session as Arp Tone.
      arpUsesSynth: phace === "arpPhace" && state?.arpTone === false,
    };
    syncLiveStatePoll();
    if (phace === "drumPhace") await startRootDrums(localDrumApi, { ...state, local: true });
    if (phace === "synthPhace") {
      await startRootPitched(localPitchedApi, { request: { mode: "synth" }, synthState: state });
      recordTransportDiagnostic({ stage: "sP-root-solo-scheduler-armed", rootAudioTime: audioContext?.currentTime || null, rootStartAt: transport?.startAt || null });
    }
    if (phace === "arpPhace") {
      const synthState = cloneState(localPitchedApi?.state?.()) || stagedPitchedRuntimeState;
      // `state` is the visible aP page snapshot: B1 uses the active M1–M4
      // Melody page and B2 uses the active A1–A4 Arp page.  Both use the
      // cached full-synth route when Arp Tone is off; an Arp Tone session
      // remains on its own local aP-tone route.
      if (synthState) await startRootPitched(localPitchedApi, { request: { mode: "melody", useFullNoteCache: !state.arpTone }, synthState, sequence: state }, state.arpTone ? localArpApi : null);
      recordTransportDiagnostic({ stage: "aP-root-solo-scheduler-armed", rootAudioTime: audioContext?.currentTime || null, rootStartAt: transport?.startAt || null, arpTone: !!state.arpTone });
    }
    if (phace === "noisePhace") await replaceLiveNoise(state, { immediate: true });
    if (phace === "dronePhace") await replaceLiveDroneProcessor(state, true);
    if (phace === "drumPhace") { /* root scheduler owns local dP events */ }
    if (phace === "synthPhace" && !liveRootPitched) await (await ensurePitchedEngine()).start(state);
    if (phace === "arpPhace" && !liveRootPitched) {
      // aP's full-synth route can be the first pitched action after reload.
      // Hydrate the saved sP state from the retained synth view before handing
      // the arp sequence to it; do not require the user to visit sP first.
      const pitched = await ensurePitchedEngine();
      const synthState = stagedPitchedRuntimeState || cloneState(pitched.state?.());
      if (synthState) stagePitchedRuntimeState(synthState);
      await (await ensureArpEngine()).start(state, synthState);
    }
    notifySession();
  }

  async function startGlobalRuntimeSession(payload) {
    cancelIdleCacheWarmup();
    stopRuntimeSession();
    cancelIdleCacheWarmup();
    cancelIdleSuspend();
    const generation = runtimeGeneration;
    clearTransportDiagnostics();
    recordTransportDiagnostic({ stage: "global-start-requested" });
    const project = cloneState(payload?.project);
    if (!project || typeof project !== "object") return;
    phaceStates.set("interPhace", project);
    const sources = [];
    const context = await ensureAudioContext();
    if (generation !== runtimeGeneration) return null;
    const drum = cloneState(payload?.sources?.drumPhace);
    const pitchedRequest = cloneState(payload?.sources?.pitched);
    const wantsDrone = !!payload?.sources?.dronePhace && !project.muted?.drone;
    // Load every global-live dependency before creating the shared entrance
    // point. Otherwise a first-load Worklet or hidden dP engine can consume
    // part of an authored offset/fade before iP's musical transport exists.
    if (wantsDrone && !liveDroneModule) {
      liveDroneModule = context.audioWorklet.addModule("dronePhace/live-drone-processor.js?v=568");
      await liveDroneModule;
    }
    const drumApi = drum ? await ensureDrumEngine() : null;
    let globalPitched = null;
    let pitchedApi = null;
    if (pitchedRequest?.enabled) {
      pitchedApi = await ensurePitchedEngine();
      // iP owns the project engine selection.  Rehydrate the current saved
      // sP state for every global start instead of preferring an older state
      // published when sP was last visible.
      const synthState = cloneState(pitchedApi.state?.()) || stagedPitchedRuntimeState;
      if (synthState) {
        stagePitchedRuntimeState(synthState);
        globalPitched = { request: pitchedRequest, synthState };
        if (pitchedRequest.mode === "sequencer-melody") {
          let melodyBars = cloneState(phaceStates.get("arpPhace")?.globalMelodyBars);
          if (!melodyBars) {
            const arp = await ensureArpEngine();
            melodyBars = {};
            for (const choice of pitchedRequest.melodySequence || []) {
              if (!choice?.phrase || !choice?.bar) continue;
              melodyBars[choice.phrase] = melodyBars[choice.phrase] || {};
              melodyBars[choice.phrase][choice.bar] = cloneState(arp.globalMelodyBar?.(choice.phrase, choice.bar));
            }
          }
          globalPitched.sequence = assembleSequencedMelody(pitchedRequest.melodySequence, melodyBars, project.project);
        } else if (pitchedRequest.mode === "melody") {
          // The visible aP state is authoritative. The retained aP iframe is
          // only a fallback for an older project that has not yet published.
          // Read the current iP-owned Arp Tone setting through aP's saved
          // melody snapshot every time. A retained published snapshot may
          // predate an iP settings edit.
          const arp = await ensureArpEngine();
          globalPitched.sequence = cloneState(arp.globalMelody?.()) || cloneState(phaceStates.get("arpPhace")?.globalMelody);
        }
        globalPitched.request.useFullNoteCache = !globalPitched.sequence?.arpTone && ["melody", "sequencer-melody"].includes(pitchedRequest.mode);
      }
    }
    // First-use context resume is deliberately completed before the root
    // transport starts. The following start calls now only arm already-ready
    // engines against one future entrance.
    recordTransportDiagnostic({ stage: "global-children-prepared", drum: !!drumApi, pitched: !!globalPitched?.synthState });
    // The live host and iP's rendered musical context are separate AudioContexts.
    // Reserve a short common future entrance so neither bed can begin its offset
    // or fade while iP is still finishing its transport setup.
    const globalStartAt = context.currentTime + GLOBAL_RUNTIME_START_GUARD_SECONDS;
    const transportStartEpochMs = Date.now() + Math.max(.02, globalStartAt - context.currentTime) * 1000;
    const entries = payload?.project?.bedEntry || {};
    const lead = { noisePhace: Math.max(-10, Math.min(10, Number(entries.noise?.leadIn) || 0)), dronePhace: Math.max(-10, Math.min(10, Number(entries.drone?.leadIn) || 0)) };
    const preRoll = Math.max(0, -lead.noisePhace, -lead.dronePhace);
    // This is the single global musical phase. Audio engines are given its
    // entrance; grids and trackers read this phase directly and never count
    // their own elapsed steps.
    startTransport(globalStartAt + preRoll, project.project);
    recordTransportDiagnostic({ stage: "root-transport-started", rootAudioTime: context.currentTime, rootStartAt: globalStartAt + preRoll, startEpochMs: transportStartEpochMs + preRoll * 1000, transportGeneration: transport?.generation });
    for (const phace of ["noisePhace", "dronePhace"]) {
      const source = cloneState(payload?.sources?.[phace]);
      if (!source || project.muted?.[phace === "noisePhace" ? "noise" : "drone"]) continue;
      const key = phace === "noisePhace" ? "noise" : "drone";
      source.runtimeEntry = { startAt: globalStartAt + preRoll + lead[phace], fadeIn: Math.max(0, Math.min(10, Number(entries[key]?.fadeIn) || 0)) };
      phaceStates.set(phace, source); recordLiveState(phace, source, { applied: true }); sources.push(phace);
    }
    if (drum) {
      phaceStates.set("drumPhace", drum);
      sources.push("drumPhace");
    }
    if (globalPitched?.synthState) {
      // Retain the entry metadata on the state bridge.  Global pitched events
      // themselves are now scheduled directly from the root transport.
      const startDelay = Math.max(.02, globalStartAt + preRoll - context.currentTime);
      globalPitched.runtimeEntry = { startDelay, transportStartEpochMs: Date.now() + startDelay * 1000, transportGeneration: transport?.generation };
      globalPitched.synthState.runtimeEntry = globalPitched.runtimeEntry;
    }
    if (globalPitched?.synthState && (globalPitched.request.mode !== "melody" || globalPitched.sequence?.events?.length)) sources.push("pitched");
    // Keep the live pitched request with the global session. sP state changes
    // arrive later from the visible view and must update this already-running
    // source at its next scheduler boundary; they must not merely be staged
    // for a future session.
    activeSession = {
      phace: "interPhace",
      mode: "global",
      sources,
      startedAt: Date.now(),
      transport: true,
      pitchedMode: globalPitched?.request?.mode || null,
      pitchedSequence: cloneState(globalPitched?.sequence) || null,
      pitchedSequencer: cloneState(globalPitched?.request?.melodySequence) || null,
      drumSequencer: cloneState(drum?.sequence) || null,
    };
    syncLiveStatePoll();
    if (drum) await startRootDrums(drumApi, drum);
    const rootArpApi = globalPitched?.sequence?.arpTone ? await ensureArpEngine() : null;
    if (globalPitched?.synthState && sources.includes("pitched")) await startRootPitched(pitchedApi, globalPitched, rootArpApi);
    await Promise.all(sources.map(async phace => phace === "noisePhace"
      ? replaceLiveNoise(effectiveLiveState(phace, phaceStates.get(phace)), { immediate: true })
      : phace === "dronePhace"
        ? replaceLiveDroneProcessor(effectiveLiveState(phace, phaceStates.get(phace)), true)
        : phace === "pitched"
          ? null
          : null));
    notifySession();
    return { started: true, startDelay: Math.max(.02, globalStartAt - context.currentTime) };
  }

  function stopRuntimeSession() {
    runtimeGeneration += 1;
    const session = activeSession;
    activeSession = null;
    syncLiveStatePoll();
    liveStateMeta.clear();
    stopTransport();
    stopRootDrums();
    stopRootPitched();
    stopLiveNoise();
    disposeDrone(retiringDrone); retiringDrone = null;
    if (liveDrone?.transport) { try { liveDrone.transport.stop(); liveDrone.bus.disconnect(); } catch (_) {} liveDrone = null; }
    else if (liveDrone) { const current = liveDrone; liveDrone = null; releaseVoice(current, disposeDrone); }
    else stopLiveDrone();
    if (session?.phace === "drumPhace" || session?.sources?.includes("drumPhace")) {
      ensureDrumEngine().then(api => api.stop()).catch(() => {});
    }
    if (session?.phace === "synthPhace") ensurePitchedEngine().then(api => api.stop()).catch(() => {});
    if (session?.phace === "arpPhace") ensureArpEngine().then(api => api.stop()).catch(() => {});
    if (session?.sources?.includes("pitched")) ensurePitchedEngine().then(api => api.stop()).catch(() => {});
    scheduleIdleSuspend();
    scheduleIdleCacheWarmup("stop");
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
    cancelIdleCacheWarmup();
    const normalized = normalizeRoute(route);
    const routeUrl = new URL(normalized, window.location.href);
    routeUrl.searchParams.set("build", RUNTIME_BUILD_VERSION);
    const safe = `${routeUrl.pathname.replace(/^\//, "")}${routeUrl.search}`;
    recordTransportDiagnostic({ stage: "route-requested", route: safe, push, transport: transportSnapshot() });
    if (view.getAttribute("src") !== safe) view.setAttribute("src", safe);
    const hash = `#${encodeURIComponent(safe)}`;
    if (push) window.history.pushState({ route: safe }, "", hash);
    else if (window.location.hash !== hash) window.history.replaceState({ route: safe }, "", hash);
  }

  window.addEventListener("message", async event => {
    if (event.origin !== window.location.origin || event.source !== view.contentWindow) return;
    const message = event.data || {};
    if (message.type === "interPhace:runtime-diagnostic") {
      recordTransportDiagnostic({ ...cloneState(message.entry), sourcePhace: message.phace || null });
      return;
    }
    if (message.type === "interPhace:runtime-navigate") {
      cancelIdleCacheWarmup();
      setRoute(message.href, { push: true });
      return;
    }
    if (!PHACES.has(message.phace) && message.type !== "interPhace:runtime-stop" && message.type !== "interPhace:runtime-global-start") return;
    if (message.type === "interPhace:runtime-state") {
      cancelIdleCacheWarmup();
      const state = cloneState(message.state);
      if (state && typeof state === "object") {
        phaceStates.set(message.phace, state);
        if (message.phace === "synthPhace") {
          stagePitchedRuntimeState(state);
          // sP deliberately coalesces updates at its own musical trigger
          // boundary; the host forwards state immediately but never restarts it.
          if (activeSession?.phace === "synthPhace" && liveRootPitched) liveRootPitched.synthState = cloneState(state);
          else if (activeSession?.phace === "synthPhace") ensurePitchedEngine().then(api => api.update(state)).catch(console.error);
          if (activeSession?.mode === "global" && activeSession.sources?.includes("pitched") && liveRootPitched) {
            liveRootPitched.synthState = cloneState(state);
          } else if (activeSession?.mode === "global" && activeSession.sources?.includes("pitched")) {
            ensurePitchedEngine().then(api => {
              if (activeSession.pitchedMode === "melody" || activeSession.pitchedMode === "sequencer-melody") {
                // iP Arp mode owns the melody sequence, while sP owns the
                // patch. Preserve that division and apply this patch on the
                // melody scheduler's next phrase boundary.
                api.updateArp({
                  sequence: cloneState(activeSession.pitchedSequence),
                  synthState: state,
                });
              } else {
                // iP Synth mode is the sP loop itself, so its next
                // tempo-locked Loop Length boundary receives the new patch.
                api.update(state);
              }
            }).catch(console.error);
          }
          // During solo full-synth aP, the root scheduler—not the retained
          // synth iframe—is audible.  Give its next unscheduled aP bar the
          // new sP state so the cache key naturally selects/builds the new
          // full-note buffers.
          if (activeSession?.phace === "arpPhace" && activeSession.arpUsesSynth && liveRootPitched?.mode === "melody") {
            liveRootPitched.synthState = cloneState(state);
            ensurePitchedEngine().then(api => api.warmCompleteArpNotes?.(liveRootPitched.sequence, state, { settleMs: 300 })).catch(error => console.warn("aP full-note cache replacement failed.", error));
          }
          if (activeSession?.phace === "arpPhace") ensureArpEngine().then(api => api.updateSynth(state)).catch(console.error);
        }
        if (message.phace === "arpPhace" && activeSession?.mode === "global" && ["melody", "sequencer-melody"].includes(activeSession.pitchedMode) && activeSession.sources?.includes("pitched")) {
          const sequence = activeSession.pitchedMode === "sequencer-melody"
            ? assembleSequencedMelody(activeSession.pitchedSequencer, state.globalMelodyBars, phaceStates.get("interPhace")?.project)
            : cloneState(state.globalMelody);
          const synthState = stagedPitchedRuntimeState || cloneState(phaceStates.get("synthPhace"));
          if (sequence?.events && synthState) {
            activeSession.pitchedSequence = sequence;
            if (liveRootPitched) {
              liveRootPitched.sequence = cloneState(sequence);
              liveRootPitched.synthState = cloneState(synthState);
            } else ensurePitchedEngine().then(api => api.updateArp({ sequence, synthState })).catch(console.error);
          }
        }
        if (message.phace === "arpPhace" && activeSession?.phace === "arpPhace") {
          // aP owns the melody sequence.  When Arp Tone is off, send that
          // sequence directly to the retained sP scheduler as well as to the
          // retained aP view.  The aP view is a control bridge, not a required
          // hop for the full-synth path; otherwise its phrase state can leave
          // sP playing the old eight-bar snapshot.
          ensureArpEngine().then(api => api.update(state, stagedPitchedRuntimeState)).catch(console.error);
          if (liveRootPitched?.mode === "melody") {
            // The audible root is authoritative after a live iP FM/Pretty
            // switch.  Never let an older staged iframe snapshot revert it.
            const synthState = cloneState(liveRootPitched?.synthState)
              || stagedPitchedRuntimeState
              || cloneState(phaceStates.get("synthPhace"));
            const sequence = cloneState(state);
            // The active route is authoritative for this running session.
            // Keep aP's later control snapshot from changing the route.
            sequence.arpTone = phaceStates.get("interPhace")?.child?.arpTone !== false;
            // The root scheduler is the audible solo aP route.  Always accept
            // its new grid snapshot; its retained synth state is valid when
            // the visible sP view has not posted one in this session.
            if (liveRootPitched?.mode === "melody") {
              liveRootPitched.sequence = cloneState(sequence);
              if (sequence.arpTone) ensureArpEngine().then(api => { if (liveRootPitched) liveRootPitched.arpApi = api; }).catch(console.error);
              if (synthState) liveRootPitched.synthState = cloneState(synthState);
              if (synthState && !sequence.arpTone) ensurePitchedEngine().then(api => api.warmCompleteArpNotes?.(sequence, synthState, { settleMs: 300 })).catch(error => console.warn("aP full-note cache replacement failed.", error));
            }
            if (synthState) {
              ensurePitchedEngine().then(api => api.updateArp({
                sequence,
                synthState,
              })).catch(console.error);
            }
          }
        }
        if (message.phace === "noisePhace" || message.phace === "dronePhace") recordLiveState(message.phace, state);
        if (message.phace === "drumPhace" && (activeSession?.phace === "drumPhace" || activeSession?.sources?.includes("drumPhace"))) {
          // dP can update its live engine during global iP playback, but it
          // cannot alter the global iP session's button color.
          if (activeSession?.phace === "drumPhace") activeSession.accent = drumSessionAccent(state);
          ensureDrumEngine().then(api => api.update(state)).catch(console.error);
          if (activeSession?.phace === "drumPhace") notifySession();
        }
        if (message.phace === "interPhace") syncGlobalMixer();
        if (message.phace === "interPhace" && activeSession?.phace === "arpPhace" && liveRootPitched?.mode === "melody") {
          const arpTone = state.child?.arpTone !== false;
          liveRootPitched.sequence = { ...liveRootPitched.sequence, arpTone };
          activeSession.arpUsesSynth = !arpTone;
          if (arpTone) ensureArpEngine().then(api => { if (liveRootPitched) liveRootPitched.arpApi = api; }).catch(console.error);
          else liveRootPitched.arpApi = null;
          ensurePitchedEngine().then(api => { const fresh = cloneState(api.state?.()); if (fresh && liveRootPitched) { liveRootPitched.synthState = fresh; if (!arpTone) api.warmCompleteArpNotes?.(liveRootPitched.sequence, fresh, { settleMs: 300 }); } }).catch(console.error);
        }
        if (message.phace === "interPhace" && activeSession?.mode === "global" && activeSession.sources?.includes("pitched") && ["melody", "sequencer-melody"].includes(liveRootPitched?.mode)) {
          const arpTone = state.child?.arpTone !== false;
          liveRootPitched.sequence = { ...liveRootPitched.sequence, arpTone };
          liveRootPitched.useFullNoteCache = !arpTone;
          if (arpTone) ensureArpEngine().then(api => { if (liveRootPitched) liveRootPitched.arpApi = api; }).catch(console.error);
          else {
            liveRootPitched.arpApi = null;
            ensurePitchedEngine().then(api => { const fresh = cloneState(api.state?.()); if (fresh && liveRootPitched) { fresh.playback = { ...(fresh.playback || {}), engine: state.child?.synthEngine === "pretty" ? "pretty" : "fm" }; liveRootPitched.synthState = fresh; api.warmCompleteArpNotes?.(cacheWindow(liveRootPitched.sequence, liveRootPitched.nextBar), fresh, { settleMs: 300 }); } }).catch(console.error);
          }
        }
        if (!activeSession) scheduleIdleCacheWarmup("state");
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
  view.addEventListener("load", () => {
    const route = view.getAttribute("src") || null;
    recordTransportDiagnostic({ stage: "route-loaded", route, transport: transportSnapshot() });
    notifySession();
    recordTransportDiagnostic({ stage: "route-transport-sent", route, transport: transportSnapshot() });
    notifyTransport();
    scheduleIdleCacheWarmup("route-load");
  });
  window.InterPhaceRuntimeHost = Object.freeze({
    navigate: route => setRoute(route, { push: true }),
    stateFor: phace => cloneState(phaceStates.get(phace) || null),
    pitchedState: () => cloneState(stagedPitchedRuntimeState),
    pitched: () => ensurePitchedEngine(),
    aPDryPrebuildDiagnostics: () => cloneState(pitchedEngineFrame?.contentWindow?.SynthPhaceLiveAPI?.dryArpPrebuildDiagnostics?.() || { status: "not-run" }),
    prebuildAPB1P1: async () => {
      const sequence = view.contentWindow?.ArpPhaceLiveState?.b1p1Melody?.();
      if (!sequence) return { status: "source-unavailable", source: "aP B1P1" };
      try {
        const api = await ensurePitchedEngine();
        const result = await api.prebuildDryArpNotes(sequence);
        return { status: "ready", ...cloneState(result) };
      } catch (error) {
        return { status: "error", message: String(error?.message || error) };
      }
    },
    prebuildAPB1P1Complete: async () => {
      const sequence = view.contentWindow?.ArpPhaceLiveState?.b1p1Melody?.();
      if (!sequence) return { status: "source-unavailable", source: "aP B1P1" };
      try { const result = await (await ensurePitchedEngine()).prebuildCompleteArpNotes(sequence); return { status: "ready", ...cloneState(result) }; }
      catch (error) { return { status: "error", message: String(error?.message || error) }; }
    },
    aPCompletePrebuildDiagnostics: () => cloneState(pitchedEngineFrame?.contentWindow?.SynthPhaceLiveAPI?.completeArpPrebuildDiagnostics?.() || { status: "not-run" }),
    aPFullNoteCacheDiagnostics: () => cloneState(pitchedEngineFrame?.contentWindow?.SynthPhaceLiveAPI?.completeArpPrebuildDiagnostics?.() || { status: "not-run" }),
    drumCacheDiagnostics: () => cloneState(drumEngineFrame?.contentWindow?.DrumPhaceLiveAPI?.cacheDiagnostics?.() || null),
    session: () => cloneState(activeSession),
    transportDiagnostics: () => cloneState(transportDiagnostics),
    lifecycleDiagnostics: () => ({ activeSession: !!activeSession, rootScheduler: !!rootSchedulerTimer, bedPoll: !!liveStatePollTimer, rootContext: audioContext?.state || "none", noise: !!liveNoise, drone: !!liveDrone, idleCacheTimer: !!idleCacheTimer, idleCacheWarming }),
    transportDiagnostic: entry => recordTransportDiagnostic(entry),
    start: (phace, state) => startRuntimeSession(phace, state),
    startGlobal: payload => startGlobalRuntimeSession(payload),
    stop: () => stopRuntimeSession(),
    drumPlayhead: step => notifyDrumPlayhead(step),
    arpPlayhead: playhead => notifyArpPlayhead(playhead),
    replaceRenderedBed: (phace, rendered) => {
      if (phace === "dronePhace" && activeSession?.phace === "dronePhace") return replaceRenderedDrone(rendered);
      return null;
    },
    receive(message) {
      window.dispatchEvent(new MessageEvent("message", { data: message, origin: window.location.origin, source: view.contentWindow }));
    },
  });
  window.InterPhaceTransport = Object.freeze({
    contractVersion: TRANSPORT_CONTRACT_VERSION,
    snapshot: () => cloneState(transportSnapshot()),
    eventAtStep: step => cloneState(transportEventAt(step)),
    isCurrent: generation => !!transport && Number(generation) === transport.generation,
  });
  setRoute(routeFromHash());
})();
