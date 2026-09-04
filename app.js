document.addEventListener("DOMContentLoaded", () => {
  const shell = document.getElementById("shell");
  const pages = Array.from(document.querySelectorAll(".app1-page"));
  const buttons = [1, 2, 3, 4, 5].map((number) => document.getElementById(`shellB${number}`));
  const STORAGE_KEY = "interPhace.interPhace.ui.v2";
  const STARTUP_SESSION_KEY = "interPhace.interPhace.startupSplashSeen.v1";
  const ROOTS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  const SCALES = ["Major", "Minor", "Dorian", "Major Pentatonic", "Minor Pentatonic", "Hirajoshi"];
  const MIXER_MIN_DB = -60;
  const MIXER_MAX_DB = 6;
  const MIXER_STEP_DB = 0.5;
  const MIXER_DEFAULT_DB = 0;
  const EFFECTS_RELEASE_VALUES_MS = Object.freeze([
    ...Array.from({ length: 20 }, (_, index) => (index + 1) * 10),
    ...Array.from({ length: 38 }, (_, index) => 300 + (index * 100)),
  ]);

  function formatEffectsRelease(value) {
    const ms = Number(value) || 0;
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
  }

  function normalizeEffectsReleaseMs(value, fallback) {
    const numeric = Number(value);
    const target = Number.isFinite(numeric) ? numeric : fallback;
    return EFFECTS_RELEASE_VALUES_MS.reduce((best, candidate) =>
      Math.abs(candidate - target) < Math.abs(best - target) ? candidate : best
    , EFFECTS_RELEASE_VALUES_MS[0]);
  }

  function effectsReleaseIndex(value, fallback) {
    const normalized = normalizeEffectsReleaseMs(value, fallback);
    return EFFECTS_RELEASE_VALUES_MS.indexOf(normalized);
  }

  function effectsReleaseValueFromIndex(index, fallback) {
    const safeIndex = Math.max(0, Math.min(
      EFFECTS_RELEASE_VALUES_MS.length - 1,
      Math.round(Number(index) || 0)
    ));
    return EFFECTS_RELEASE_VALUES_MS[safeIndex] ?? fallback;
  }

  let state = {
    button: 0,
    b2Page: 1,
    b5Page: 1,
    project: { name: "", root: 60, scale: 0, scaleOrderVersion: 2, tempo: 75, length: 4, swing: 0, timing: 0 },
    mixer: { synth: 0, kick: 0, snare: 0, hat: 0, noise: 0, drone: 0, droneNoiseLink: false },
    mixerVersion: 2,
    muted: {},
    sequencer: Array.from({ length: 16 }, () => Array(4).fill("")),
    child: {
      synthTiming: 100,
      synthEngine: "fm",
      synthLoopLength: 4,
      synthAuditionLoop: false,
      synthAuditionLength: 6,
      synthEffectsRelease: 120,
      drumTiming: 100,
      drumBorders: false,
      arpTiming: 100,
      arpEffectsRelease: 30,
      arpTone: true,
      synthUseArpTrigger: false,
      noiseTiming: 100,
      noiseLeadIn: 0,
      noiseFadeIn: 0,
      noiseExportLength: 2,
      droneTiming: 100,
      droneLeadIn: 0,
      droneFadeIn: 0,
      droneExportLength: 2,
    },
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      state = {
        ...state,
        ...saved,
        project: { ...state.project, ...(saved.project || {}) },
        mixer: { ...state.mixer, ...(saved.mixer || {}) },
        muted: { ...state.muted, ...(saved.muted || {}) },
        sequencer: Array.isArray(saved.sequencer) ? saved.sequencer : state.sequencer,
        child: { ...state.child, ...(saved.child || {}) },
      };
    }
  } catch (_) {}

  let startupSplashSeen = false;
  try {
    startupSplashSeen = sessionStorage.getItem(STARTUP_SESSION_KEY) === "1";
    sessionStorage.setItem(STARTUP_SESSION_KEY, "1");
  } catch (_) {}

  const entryUrl = new URL(window.location.href);
  const contextualSettingsPage = Number(entryUrl.searchParams.get("settings"));
  if (Number.isInteger(contextualSettingsPage) && contextualSettingsPage >= 1 && contextualSettingsPage <= 5) {
    state.button = 5;
    state.b5Page = contextualSettingsPage;
    entryUrl.searchParams.delete("settings");
    window.history.replaceState(null, "", `${entryUrl.pathname}${entryUrl.search}${entryUrl.hash}`);
  } else if (!startupSplashSeen) {
    state.button = 0;
  }

  if (!Number.isInteger(state.button) || state.button < 0 || state.button > 5) state.button = 0;
  if (!Number.isInteger(state.b2Page) || state.b2Page < 1 || state.b2Page > 2) state.b2Page = 1;
  if (!Number.isInteger(state.b5Page) || state.b5Page < 1 || state.b5Page > 5) state.b5Page = 1;
  state.mixer.droneNoiseLink = state.mixer.droneNoiseLink === true;
  state.sequencer = Array.from({ length: 16 }, (_, row) =>
    Array.from({ length: 4 }, (_, col) => {
      const raw = String(state.sequencer?.[row]?.[col] || "").trim().toUpperCase();
      if (col === 0 && /^M[1-4]\.[1-8]$/.test(raw)) return raw;
      if (col === 1 && /^K[1-8]$/.test(raw)) return raw;
      if (col === 2 && /^S[1-8]$/.test(raw)) return raw;
      if (col === 3 && /^H[1-8]$/.test(raw)) return raw;
      return "";
    })
  );
  state.child.noiseLeadIn = Math.max(-10, Math.min(10, Math.round(Number(state.child.noiseLeadIn) || 0)));
  state.child.droneLeadIn = Math.max(-10, Math.min(10, Math.round(Number(state.child.droneLeadIn) || 0)));
  state.child.noiseFadeIn = Math.max(0, Math.min(10, Math.round(Number(state.child.noiseFadeIn) || 0)));
  state.child.droneFadeIn = Math.max(0, Math.min(10, Math.round(Number(state.child.droneFadeIn) || 0)));
  state.child.noiseExportLength = Math.max(0, Math.min(5, Math.round(Number(state.child.noiseExportLength) || 0)));
  state.child.droneExportLength = Math.max(0, Math.min(5, Math.round(Number(state.child.droneExportLength) || 0)));
  if (state.project.name === "Untitled") state.project.name = "";

  // Build 93: migrate the former 0-100 linear mixer to dB once.
  if (Number(state.mixerVersion || 1) < 2) {
    Object.keys(state.mixer).forEach((channel) => {
      const oldPercent = Math.max(0, Math.min(100, Number(state.mixer[channel]) || 0));
      const db = oldPercent <= 0
        ? MIXER_MIN_DB
        : 20 * Math.log10(oldPercent / 100);
      state.mixer[channel] = Math.max(
        MIXER_MIN_DB,
        Math.min(MIXER_MAX_DB, Math.round(db / MIXER_STEP_DB) * MIXER_STEP_DB),
      );
    });
    state.mixerVersion = 2;
  }


  let savePendingScaleOrderMigration = false;

  // Build 89: preserve the selected musical scale while reordering the Scale slider.
  if (Number(state.project.scaleOrderVersion || 1) < 2) {
    const oldToNewScaleIndex = [0, 1, 4, 3, 2, 5];
    const oldIndex = Math.max(0, Math.min(5, Math.round(Number(state.project.scale) || 0)));
    state.project.scale = oldToNewScaleIndex[oldIndex];
    state.project.scaleOrderVersion = 2;
    savePendingScaleOrderMigration = true;
  }

  // Build 58 migration for the expanded project controls.
  state.project.root = Number(state.project.root);
  if (!Number.isFinite(state.project.root)) state.project.root = 60;
  if (state.project.root >= 0 && state.project.root <= 11) state.project.root = 60 + state.project.root;
  state.project.root = Math.max(21, Math.min(108, Math.round(state.project.root)));

  state.project.length = Number(state.project.length);
  if (!Number.isFinite(state.project.length)) state.project.length = 4;
  state.project.length = Math.max(4, Math.min(64, Math.round(state.project.length / 4) * 4));

  let globalAuditionState = "idle";
  let globalAuditionGeneration = 0;
  let globalAuditionContext = null;
  let globalAuditionSources = [];
  let globalBedTransports = [];
  let globalBedOrbitController = null;
  let globalAuditionGain = null;

  function notifyGlobalAuditionState() {
    window.dispatchEvent(new CustomEvent("interPhace:audition-state"));
  }

  const shellBinding = InterPhaceShell.bind({
    app: "#shell",
    name: "interPhace",
    accent: "#8d939c",
    line: "#25282d",
    text: "#f2f3f5",
    muted: "#858b94",
    getAuditionState: () => globalAuditionState,
    auditionDisabled: false,
  });

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  if (savePendingScaleOrderMigration) save();


  const GLOBAL_RENDER_SAMPLE_RATE = 48000;
  const GLOBAL_POST_RENDER_PAUSE_MS = 1000;
  const GLOBAL_RENDER_HOST_TIMEOUT_MS = 10000;

  function currentRenderColumns() {
    return window.matchMedia("(min-width: 760px)").matches ? 8 : 4;
  }

  function ensureGlobalAuditionContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio playback is unavailable.");
    if (!globalAuditionContext || globalAuditionContext.state === "closed") {
      globalAuditionContext = new AudioContextClass();
    }
    return globalAuditionContext;
  }

  function waitForFrameAPI(frame, getter) {
    return new Promise((resolve, reject) => {
      const started = performance.now();

      function check() {
        try {
          const api = getter(frame.contentWindow);
          if (api) {
            resolve(api);
            return;
          }
        } catch (_) {}

        if (performance.now() - started > GLOBAL_RENDER_HOST_TIMEOUT_MS) {
          reject(new Error("Phace render host did not become ready."));
          return;
        }
        window.setTimeout(check, 25);
      }

      if (frame.contentWindow?.document?.readyState === "complete") check();
      else {
        frame.addEventListener("load", check, { once: true });
        window.setTimeout(check, 25);
      }
    });
  }

  function ensureRenderHost(id, src) {
    let frame = document.getElementById(id);
    if (frame) return frame;

    frame = document.createElement("iframe");
    frame.id = id;
    frame.src = src;
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.position = "fixed";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.left = "-10000px";
    frame.style.top = "-10000px";
    frame.style.border = "0";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";
    document.body.appendChild(frame);
    return frame;
  }

  async function getGlobalRenderAPIs({
    includeDrum = false,
    includeSynth = false,
    includeArp = false,
    includeNoise = false,
    includeDrone = false,
  } = {}) {
    const drumFrame = includeDrum
      ? ensureRenderHost("globalDrumRenderHost", "drumPhace/index.html")
      : null;
    const synthFrame = includeSynth
      ? ensureRenderHost("globalSynthRenderHost", "synthPhace/index.html")
      : null;
    const arpFrame = includeArp
      ? ensureRenderHost("globalArpRenderHost", "arpPhace/index.html?v=329")
      : null;
    const noiseFrame = includeNoise
      ? ensureRenderHost("globalNoiseRenderHost", "noisePhace/index.html")
      : null;
    const droneFrame = includeDrone
      ? ensureRenderHost("globalDroneRenderHost", "dronePhace/index.html")
      : null;

    const drumPromise = includeDrum
      ? waitForFrameAPI(drumFrame, win => win?.DrumPhaceRenderAPI)
      : Promise.resolve(null);
    const synthPromise = includeSynth
      ? waitForFrameAPI(
          synthFrame,
          win => win?.SynthPhaceAuditionEngine?.renderGlobalTrigger &&
            win?.SynthPhaceAuditionEngine?.renderArpPerformance
            ? win.SynthPhaceAuditionEngine
            : null
        )
      : Promise.resolve(null);
    const arpPromise = includeArp
      ? waitForFrameAPI(
          arpFrame,
          win => win?.ArpPhaceAuditionState?.globalArpSnapshot &&
            win?.ArpPhaceRenderAPI?.renderSourceBar
            ? {
                state: win.ArpPhaceAuditionState,
                render: win.ArpPhaceRenderAPI,
              }
            : null
        )
      : Promise.resolve(null);
    const noisePromise = includeNoise
      ? waitForFrameAPI(noiseFrame, win => win?.NoisePhaceRenderAPI?.renderBed ? win.NoisePhaceRenderAPI : null)
      : Promise.resolve(null);
    const dronePromise = includeDrone
      ? waitForFrameAPI(droneFrame, win => win?.DronePhaceRenderAPI?.renderBed ? win.DronePhaceRenderAPI : null)
      : Promise.resolve(null);

    const [drumAPI, synthAPI, arpAPI, noiseAPI, droneAPI] = await Promise.all([
      drumPromise,
      synthPromise,
      arpPromise,
      noisePromise,
      dronePromise,
    ]);

    return { drumAPI, synthAPI, arpAPI, noiseAPI, droneAPI };
  }

  function stopGlobalAudition() {
    globalAuditionGeneration += 1;

    const sources = globalAuditionSources.slice();
    const bedTransports = globalBedTransports.slice();
    const orbitController = globalBedOrbitController;
    const gain = globalAuditionGain;
    globalAuditionSources = [];
    globalBedTransports = [];
    globalBedOrbitController = null;
    globalAuditionGain = null;
    globalAuditionState = "idle";
    notifyGlobalAuditionState();
    shellBinding.syncPlaying?.();

    bedTransports.forEach(transport => {
      try { transport?.stop?.(); } catch (_) {}
    });
    try { orbitController?.stop?.(); } catch (_) {}

    if (!sources.length && !bedTransports.length && !orbitController && !gain) return;

    try {
      const ctx = globalAuditionContext;
      const now = ctx?.currentTime || 0;
      if (ctx && gain?.gain) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.012);
        sources.forEach(source => {
          try { source.stop(now + 0.014); } catch (_) {}
        });
        window.setTimeout(() => {
          sources.forEach(source => {
            try { source.disconnect(); } catch (_) {}
          });
          try { gain.disconnect(); } catch (_) {}
        }, 30);
      } else {
        sources.forEach(source => {
          try { source.stop(); } catch (_) {}
        });
      }
    } catch (_) {}
  }

  function wrapTailIntoLoop(rendered, loopFrames) {
    const output = new AudioBuffer({
      length: loopFrames,
      numberOfChannels: rendered.numberOfChannels,
      sampleRate: rendered.sampleRate,
    });

    for (let channel = 0; channel < rendered.numberOfChannels; channel += 1) {
      const src = rendered.getChannelData(channel);
      const dst = output.getChannelData(channel);
      dst.set(src.subarray(0, loopFrames));

      for (let i = loopFrames; i < src.length; i += 1) {
        dst[(i - loopFrames) % loopFrames] += src[i];
      }
    }

    let peak = 0;
    for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
      const data = output.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    }
    if (peak > 0.98) {
      const scale = 0.98 / peak;
      for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
        const data = output.getChannelData(channel);
        for (let i = 0; i < data.length; i += 1) data[i] *= scale;
      }
    }

    return output;
  }

  function copyBufferIntoContext(ctx, sourceBuffer) {
    const copied = ctx.createBuffer(
      sourceBuffer.numberOfChannels,
      sourceBuffer.length,
      sourceBuffer.sampleRate
    );
    for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel += 1) {
      copied.copyToChannel(sourceBuffer.getChannelData(channel), channel);
    }
    return copied;
  }

  async function renderGlobalMix(generation) {
    const sequenceInfo = interSequencerInfo();
    const sequencerActive = sequenceInfo.active;
    const projectBars = sequencerActive
      ? sequenceInfo.bars
      : Math.max(4, Math.min(64, Number(state.project.length) || 4));
    const tempo = Math.max(30, Math.min(300, Number(state.project.tempo) || 75));
    const secondsPerBar = (60 / tempo) * 4;
    const loopSeconds = projectBars * secondsPerBar;
    const triggerBars = Math.max(1, Math.min(16, Math.round(Number(state.child.synthLoopLength) || 4)));
    const triggerSeconds = triggerBars * secondsPerBar;
    const effectsReleaseMs = Math.max(10, Math.min(4000, Number(state.child.synthEffectsRelease) || 120));
    const arpEffectsReleaseMs = Math.max(10, Math.min(4000, Number(state.child.arpEffectsRelease) || 30));
    const useArpTrigger = state.child.synthUseArpTrigger === true;
    const renderColumns = currentRenderColumns();

    const seqHasKick = sequencerActive && state.sequencer.some(row => !!row?.[1]);
    const seqHasSnare = sequencerActive && state.sequencer.some(row => !!row?.[2]);
    const seqHasHat = sequencerActive && state.sequencer.some(row => !!row?.[3]);

    const drumActive = sequencerActive
      ? ((seqHasKick && !state.muted.kick) || (seqHasSnare && !state.muted.snare) || (seqHasHat && !state.muted.hat))
      : ["kick", "snare", "hat"].some(channel => !state.muted[channel]);
    const synthActive = sequencerActive
      ? (sequenceInfo.hasMelody && !state.muted.synth)
      : !state.muted.synth;
    const noiseActive = !state.muted.noise;
    const droneActive = !state.muted.drone;

    const { drumAPI, synthAPI, arpAPI, noiseAPI, droneAPI } = await getGlobalRenderAPIs({
      includeDrum: drumActive,
      includeSynth: synthActive,
      includeArp: synthActive && (sequencerActive || useArpTrigger),
      includeNoise: noiseActive,
      includeDrone: droneActive,
    });
    if (generation !== globalAuditionGeneration) return null;

    let drumRender = null;
    let synthRender = null;
    let arpSequence = null;
    const arpNoteBuffers = new Map();
    const sequencerDrumBuffers = new Map();
    let sequencerMelodyRender = null;

    if (sequencerActive) {
      if (drumActive) {
        const trackMeta = [
          null,
          { type: "kick", prefix: "K" },
          { type: "snare", prefix: "S" },
          { type: "hat", prefix: "H" },
        ];
        for (let row = 0; row < sequenceInfo.bars; row += 1) {
          for (let col = 1; col <= 3; col += 1) {
            const meta = trackMeta[col];
            if (state.muted[meta.type]) continue;
            const parsed = parseSequencerCell(state.sequencer[row][col], col);
            if (!parsed) continue;
            const key = `${meta.type}:${parsed.bar}`;
            if (sequencerDrumBuffers.has(key)) continue;
            const renderedBar = await drumAPI.renderSourceBar({
              activeType: meta.type,
              sourceBar: parsed.bar,
              tempo,
              swing: state.project.swing,
              respectMute: true,
            });
            if (renderedBar?.buffer) sequencerDrumBuffers.set(key, renderedBar);
            if (generation !== globalAuditionGeneration) return null;
          }
        }
      }

      if (synthActive) {
        // Build the sequenced Melody as one continuous performance and send it
        // through synthPhace once. This intentionally matches arpPhace audition:
        // delay/reverb/chorus state is continuous across sequencer bar boundaries
        // instead of being reset and tail-wrapped independently for every bar.
        const melodyEvents = [];
        for (let row = 0; row < sequenceInfo.bars; row += 1) {
          const parsed = parseSequencerCell(state.sequencer[row][0], 0);
          if (!parsed) continue;

          const snapshot = arpAPI?.state?.globalMelodyBarSnapshot?.(
            parsed.phrase,
            parsed.bar
          );
          if (!snapshot?.events?.length) continue;

          const barStart = row * secondsPerBar;
          for (const event of snapshot.events) {
            melodyEvents.push({
              ...event,
              offsetSeconds: barStart + Math.max(0, Number(event.offsetSeconds) || 0),
            });
          }
          if (generation !== globalAuditionGeneration) return null;
        }

        if (melodyEvents.length) {
          sequencerMelodyRender = await synthAPI.renderArpPerformance({
            events: melodyEvents,
            loopSeconds,
            effectsReleaseMs: arpEffectsReleaseMs,
            tempo,
          });
          if (generation !== globalAuditionGeneration) return null;
        }
      }
    } else {
      const drumPromise = drumActive
        ? drumAPI.renderVisible({
            mode: "all",
            tempo,
            swing: state.project.swing,
            columns: renderColumns,
          })
        : Promise.resolve(null);

      if (synthActive) {
        if (useArpTrigger) {
          arpSequence = arpAPI?.state?.globalArpSnapshot?.() || null;
          if (arpSequence?.events?.length) {
            const uniqueNotes = [...new Set(arpSequence.events.map(event => event.midiNote))];
            for (const midiNote of uniqueNotes) {
              if (generation !== globalAuditionGeneration) return null;
              const renderedNote = await synthAPI.renderArpNote({
                midiNote,
                gateSeconds: arpSequence.gateSeconds,
                effectsReleaseMs: arpEffectsReleaseMs,
                tempo,
              });
              if (renderedNote?.buffer) arpNoteBuffers.set(String(midiNote), renderedNote.buffer);
            }
          }
        } else {
          synthRender = await synthAPI.renderGlobalTrigger({
            gateSeconds: triggerSeconds,
            effectsReleaseMs,
          });
        }
      }

      drumRender = await drumPromise;
      if (generation !== globalAuditionGeneration) return null;
    }

    const noiseState = noiseActive ? (noiseAPI.getState?.() || {}) : {};
    const bedLinkActive = !!(noiseActive && droneActive && state.mixer.droneNoiseLink);

    const noiseRender = noiseActive
      ? noiseAPI.renderBed({
          sampleRate: 44100,
          duration: 60,
          suppressSpaceMotion: bedLinkActive,
        })
      : null;
    if (generation !== globalAuditionGeneration) return null;

    const droneRender = droneActive
      ? droneAPI.renderBed({
          sampleRate: 44100,
          duration: 60,
          suppressSpaceMotion: bedLinkActive,
        })
      : null;
    if (generation !== globalAuditionGeneration) return null;

    let musicalRender = null;
    if (drumActive || synthActive) {
      const synthBuffer = synthRender?.buffer || null;
      const fallbackArpTail = !sequencerActive && arpNoteBuffers.size
        ? Math.max(...[...arpNoteBuffers.values()].map(buffer =>
            Math.max(0, buffer.duration - (arpSequence?.gateSeconds || 0))
          ))
        : 0;
      const sequencerMelodyTail = sequencerActive && sequencerMelodyRender?.buffer
        ? Math.max(0, sequencerMelodyRender.buffer.duration - loopSeconds)
        : 0;
      const extraTail = sequencerActive
        ? sequencerMelodyTail
        : (useArpTrigger ? fallbackArpTail : (synthBuffer ? Math.max(0, synthBuffer.duration - triggerSeconds) : 0));

      const totalRenderSeconds = loopSeconds + extraTail + 0.05;
      const OfflineAudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OfflineAudioContextClass) throw new Error("Offline Web Audio rendering is unavailable.");
      const frameCount = Math.max(1, Math.ceil(totalRenderSeconds * GLOBAL_RENDER_SAMPLE_RATE));
      const offline = new OfflineAudioContextClass(2, frameCount, GLOBAL_RENDER_SAMPLE_RATE);
      const mixBus = offline.createGain();

      if (sequencerActive) {
        const trackMeta = [
          null,
          { type: "kick", prefix: "K" },
          { type: "snare", prefix: "S" },
          { type: "hat", prefix: "H" },
        ];

        for (let row = 0; row < sequenceInfo.bars; row += 1) {
          const barStart = row * secondsPerBar;

          for (let col = 1; col <= 3; col += 1) {
            const meta = trackMeta[col];
            if (state.muted[meta.type]) continue;
            const parsed = parseSequencerCell(state.sequencer[row][col], col);
            if (!parsed) continue;
            const renderedBar = sequencerDrumBuffers.get(`${meta.type}:${parsed.bar}`);
            if (!renderedBar?.buffer) continue;
            const source = offline.createBufferSource();
            source.buffer = copyBufferIntoContext(offline, renderedBar.buffer);
            source.connect(mixBus);
            source.start(barStart);
            source.stop(Math.min(totalRenderSeconds, barStart + secondsPerBar));
          }

          // Melody is scheduled once below as a continuous effects performance.
        }

        if (!state.muted.synth && sequencerMelodyRender?.buffer) {
          const source = offline.createBufferSource();
          source.buffer = copyBufferIntoContext(offline, sequencerMelodyRender.buffer);
          const melodyGain = offline.createGain();
          melodyGain.gain.value = mixerChannelGain("synth");
          source.connect(melodyGain);
          melodyGain.connect(mixBus);
          source.start(0);
        }
      } else {
        if (drumRender?.buffer) {
          const drumSource = offline.createBufferSource();
          drumSource.buffer = drumRender.buffer;
          drumSource.loop = true;
          drumSource.loopStart = 0;
          drumSource.loopEnd = drumRender.loopSeconds;
          drumSource.connect(mixBus);
          drumSource.start(0);
          drumSource.stop(loopSeconds);
        }

        const synthBus = offline.createGain();
        synthBus.gain.value = mixerChannelGain("synth");
        synthBus.connect(mixBus);

        if (useArpTrigger && arpSequence?.events?.length && arpNoteBuffers.size) {
          const arpLoopSeconds = Math.max(0.001, Number(arpSequence.loopSeconds) || loopSeconds);
          for (let loopStart = 0; loopStart < loopSeconds - 1e-6; loopStart += arpLoopSeconds) {
            for (const event of arpSequence.events) {
              const eventStart = loopStart + Number(event.offsetSeconds || 0);
              if (eventStart >= loopSeconds - 1e-6) continue;
              const sourceBuffer = arpNoteBuffers.get(String(event.midiNote));
              if (!sourceBuffer) continue;
              const source = offline.createBufferSource();
              source.buffer = copyBufferIntoContext(offline, sourceBuffer);
              source.connect(synthBus);
              source.start(eventStart);
            }
          }
        } else if (synthBuffer) {
          for (let eventStart = 0; eventStart < loopSeconds - 1e-6; eventStart += triggerSeconds) {
            const source = offline.createBufferSource();
            source.buffer = synthBuffer;
            source.connect(synthBus);
            source.start(eventStart);
          }
        }
      }

      const safety = offline.createDynamicsCompressor();
      safety.threshold.value = -3;
      safety.knee.value = 3;
      safety.ratio.value = 12;
      safety.attack.value = 0.002;
      safety.release.value = 0.08;
      mixBus.connect(safety);
      safety.connect(offline.destination);

      const rendered = await offline.startRendering();
      if (generation !== globalAuditionGeneration) return null;

      const loopFrames = Math.round(loopSeconds * GLOBAL_RENDER_SAMPLE_RATE);
      const wrappedLoopBuffer = wrapTailIntoLoop(rendered, loopFrames);
      let initialBuffer = null;

      // Direct synth triggering folds the final effects/release tail back onto
      // sample 0 so subsequent loop seams remain continuous. On the very first
      // playback pass there is no preceding loop, so that folded tail sounds
      // like a stray/ghost note at startup. Keep a clean first-cycle slice and
      // switch to the steady-state wrapped loop at the first boundary.
      if (!sequencerActive && !useArpTrigger) {
        initialBuffer = new AudioBuffer({
          length: loopFrames,
          numberOfChannels: rendered.numberOfChannels,
          sampleRate: rendered.sampleRate,
        });
        for (let channel = 0; channel < rendered.numberOfChannels; channel += 1) {
          initialBuffer.copyToChannel(
            rendered.getChannelData(channel).subarray(0, loopFrames),
            channel
          );
        }
      }

      musicalRender = {
        buffer: wrappedLoopBuffer,
        initialBuffer,
        loopSeconds,
      };
    }

    return {
      musical: musicalRender,
      noise: noiseRender,
      drone: droneRender,
      bars: projectBars,
      tempo,
      triggerBars,
      synthTriggerMode: sequencerActive ? "sequencer" : (useArpTrigger ? "arp" : "synth"),
      renderColumns,
      bedLinkActive,
      sequencerActive,
    };
  }
  async function startGlobalAudition() {
    if (globalAuditionState !== "idle") return;

    const generation = ++globalAuditionGeneration;
    globalAuditionState = "rendering";
    notifyGlobalAuditionState();
    shellBinding.syncPlaying?.();

    try {
      // Force the dim Stop rendering state to paint before any heavy child DSP begins.
      // This is especially important after the hidden render-host iframes already exist,
      // when renderGlobalMix() can otherwise enter synchronous child rendering immediately.
      await window.InterPhaceShell.paintBeforeSynchronousWork();
      if (generation !== globalAuditionGeneration || globalAuditionState !== "rendering") return;

      const rendered = await renderGlobalMix(generation);
      if (!rendered || generation !== globalAuditionGeneration || globalAuditionState !== "rendering") return;

      await new Promise(resolve => window.setTimeout(resolve, GLOBAL_POST_RENDER_PAUSE_MS));
      if (generation !== globalAuditionGeneration || globalAuditionState !== "rendering") return;

      const ctx = ensureGlobalAuditionContext();
      if (ctx.state === "suspended") await ctx.resume();
      if (generation !== globalAuditionGeneration || globalAuditionState !== "rendering") return;

      const master = ctx.createGain();
      master.gain.value = 1;
      const safety = ctx.createDynamicsCompressor();
      safety.threshold.value = -3;
      safety.knee.value = 3;
      safety.ratio.value = 12;
      safety.attack.value = 0.002;
      safety.release.value = 0.08;
      master.connect(safety);
      safety.connect(ctx.destination);

      const sources = [];
      const bedTransports = [];

      // Start Offset is relative to the musical timeline. Negative values let a bed
      // establish itself before drums/synth begin; positive values enter later.
      // Shift the musical start only as much as needed so no bed is scheduled
      // before the AudioContext's safe start time.
      const transportStartTime = ctx.currentTime + 0.02;
      const noiseLeadSeconds = rendered.noise?.buffer
        ? Math.max(-10, Math.min(10, Number(state.child.noiseLeadIn) || 0))
        : 0;
      const droneLeadSeconds = rendered.drone?.buffer
        ? Math.max(-10, Math.min(10, Number(state.child.droneLeadIn) || 0))
        : 0;
      const preRollSeconds = Math.max(0, -noiseLeadSeconds, -droneLeadSeconds);
      const sharedStartTime = transportStartTime + preRollSeconds;
      const noiseBedStartTime = sharedStartTime + noiseLeadSeconds;
      const droneBedStartTime = sharedStartTime + droneLeadSeconds;

      function startMusicalLoop(renderInfo, gainValue = 1) {
        if (!renderInfo?.buffer) return;
        const channelGain = ctx.createGain();
        channelGain.gain.value = gainValue;
        channelGain.connect(master);

        const loopSeconds = Math.max(0.001, Number(renderInfo.loopSeconds) || renderInfo.buffer.duration);

        if (renderInfo.initialBuffer) {
          const firstSource = ctx.createBufferSource();
          firstSource.buffer = copyBufferIntoContext(ctx, renderInfo.initialBuffer);
          firstSource.connect(channelGain);
          firstSource.start(sharedStartTime);
          firstSource.stop(sharedStartTime + loopSeconds);
          sources.push(firstSource);

          const loopSource = ctx.createBufferSource();
          loopSource.buffer = copyBufferIntoContext(ctx, renderInfo.buffer);
          loopSource.loop = true;
          loopSource.loopStart = 0;
          loopSource.loopEnd = loopSeconds;
          loopSource.connect(channelGain);
          loopSource.start(sharedStartTime + loopSeconds);
          sources.push(loopSource);
          return;
        }

        const source = ctx.createBufferSource();
        source.buffer = copyBufferIntoContext(ctx, renderInfo.buffer);
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = loopSeconds;
        source.connect(channelGain);
        source.start(sharedStartTime);
        sources.push(source);
      }

      function startBedLoop(renderInfo, gainValue = 1, destination = master, fadeInSeconds = 0, startTime = sharedStartTime) {
        if (!renderInfo?.buffer) return;
        const bedBuffer = copyBufferIntoContext(ctx, renderInfo.buffer);

        // Start Offset and Fade In belong only to the first entrance. The rendered bed
        // itself remains untouched and InterPhaceBedLoop repeats it normally.
        const entranceGain = ctx.createGain();
        const fadeSeconds = Math.max(0, Math.min(10, Number(fadeInSeconds) || 0));

        if (fadeSeconds > 0) {
          entranceGain.gain.setValueAtTime(0, startTime);
          entranceGain.gain.linearRampToValueAtTime(1, startTime + fadeSeconds);
        } else {
          entranceGain.gain.setValueAtTime(1, startTime);
        }
        entranceGain.connect(destination);

        bedTransports.push(InterPhaceBedLoop.create({
          context: ctx,
          buffer: bedBuffer,
          destination: entranceGain,
          gain: gainValue,
          overlapSeconds: 3,
          startTime,
        }));
      }

      function createOpposedBedOrbit(amount, droneDestination, noiseDestination) {
        const depth = Math.max(0, Math.min(1, Number(amount) || 0));
        if (depth <= 0.001) return Object.freeze({ stop() {} });

        let stopped = false;
        const startedAt = sharedStartTime;
        const tickMs = 40;

        function tick() {
          if (stopped) return;
          const t = Math.max(0, ctx.currentTime - startedAt);
          // Same asymmetric orbit family used by dronePhace Space Motion.
          const angle =
            2 * Math.PI * ((0.010 + 0.045 * depth) * t)
            + 0.72 * depth * Math.sin(2 * Math.PI * (0.0037 + 0.006 * depth) * t + 0.4);
          const radius = depth * (
            0.28 + 0.68 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.0063 * t + 1.1))
          );
          const pan = Math.max(-0.97, Math.min(0.97, Math.sin(angle) * radius));
          const now = ctx.currentTime;
          droneDestination.pan.setTargetAtTime(pan, now, 0.05);
          noiseDestination.pan.setTargetAtTime(-pan, now, 0.05);
        }

        tick();
        const timer = window.setInterval(tick, tickMs);
        return Object.freeze({
          stop() {
            if (stopped) return;
            stopped = true;
            window.clearInterval(timer);
            const now = ctx.currentTime;
            try { droneDestination.pan.cancelScheduledValues(now); } catch (_) {}
            try { noiseDestination.pan.cancelScheduledValues(now); } catch (_) {}
          },
        });
      }

      // Experimental Build 285 relationship: during interPhace Global Play only,
      // Drone and Noise occupy opposite sides of the same whole-field orbit.
      // Child local auditions remain independent.
      const droneOrbitPan = ctx.createStereoPanner();
      const noiseOrbitPan = ctx.createStereoPanner();
      droneOrbitPan.connect(master);
      noiseOrbitPan.connect(master);

      startMusicalLoop(rendered.musical, 1);
      startBedLoop(rendered.noise, mixerChannelGain("noise"), noiseOrbitPan, state.child.noiseFadeIn, noiseBedStartTime);
      startBedLoop(rendered.drone, mixerChannelGain("drone"), droneOrbitPan, state.child.droneFadeIn, droneBedStartTime);

      if (rendered.bedLinkActive && rendered.drone?.buffer && rendered.noise?.buffer) {
        // LINK uses the already-tested Build 285 opposed orbit. The linked
        // depth is the greater of the two authored Space Motion amounts so
        // either Phace can intentionally bring the shared orbit forward.
        const orbitAmount = Math.max(
          Number(rendered.drone?.spaceMotion) || 0,
          Number(rendered.noise?.spaceMotion) || 0
        );
        globalBedOrbitController = createOpposedBedOrbit(
          orbitAmount,
          droneOrbitPan,
          noiseOrbitPan
        );
      } else {
        globalBedOrbitController = null;
      }

      globalAuditionSources = sources;
      globalBedTransports = bedTransports;
      globalAuditionGain = master;
      globalAuditionState = "playing";
      notifyGlobalAuditionState();
      shellBinding.syncPlaying?.();
    } catch (error) {
      if (generation === globalAuditionGeneration) {
        globalAuditionState = "idle";
        shellBinding.syncPlaying?.();
      }
      console.error("interPhace global audition failed:", error);
    }
  }


  shellBinding.auditionBtn?.addEventListener("click", event => {
    event.preventDefault();
    if (globalAuditionState !== "idle") stopGlobalAudition();
    else startGlobalAudition();
  });

  window.addEventListener("pagehide", stopGlobalAudition);
  window.addEventListener("beforeunload", stopGlobalAudition, { once: true });

  function activePageId() {
    if (state.button === 0) return "app1_startup";
    if (state.button === 2) return `app1_b2_p${state.b2Page}`;
    return state.button === 5 ? `app1_b5_p${state.b5Page}` : `app1_b${state.button}_p1`;
  }

  function setSliderVisual(slider) {
    if (!slider) return;
    const min = Number(slider.min || 0);
    const max = Number(slider.max || 100);
    const value = Number(slider.value);
    const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
    slider.style.setProperty("--value", `${pct}%`);
  }

  function midiNoteText(midi) {
    const note = ROOTS[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${note}${octave} (${midi})`;
  }

  function durationText(bars, tempo) {
    const seconds = Math.round((bars * 4 * 60) / tempo);
    const mins = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, "0");
    return `${bars} bar${bars === 1 ? "" : "s"} (${mins}:${secs})`;
  }

  function renderProject() {
    const name = document.getElementById("app1_b1_p1_projectName");
    const root = document.getElementById("app1_b1_p1_rootNote");
    const scale = document.getElementById("app1_b1_p1_scale");
    const tempo = document.getElementById("app1_b1_p1_tempo");
    const length = document.getElementById("app1_b1_p1_length");
    const swing = document.getElementById("app1_b1_p1_swing");
    const timing = document.getElementById("app1_b1_p1_timing");

    name.value = state.project.name;
    root.value = state.project.root;
    scale.value = state.project.scale;
    tempo.value = state.project.tempo;
    length.value = state.project.length;
    swing.value = state.project.swing;
    timing.value = state.project.timing;

    document.getElementById("app1_b1_p1_rootNote_value").textContent = midiNoteText(state.project.root);
    document.getElementById("app1_b1_p1_scale_value").textContent = SCALES[state.project.scale] || SCALES[0];
    document.getElementById("app1_b1_p1_tempo_value").textContent = `${state.project.tempo} BPM`;
    document.getElementById("app1_b1_p1_length_value").textContent = durationText(state.project.length, state.project.tempo);
    document.getElementById("app1_b1_p1_swing_value").textContent = `${state.project.swing}%`;
    document.getElementById("app1_b1_p1_timing_value").textContent = `±${state.project.timing} ms`;

    [root, scale, tempo, length, swing, timing].forEach(setSliderVisual);
  }


  function dbToGain(db) {
    return Math.pow(10, Number(db) / 20);
  }

  function mixerValueText(db) {
    const value = Number(db);
    if (value === 0) return "0 dB";
    return `${value > 0 ? "+" : ""}${Number.isInteger(value) ? value : value.toFixed(1)} dB`;
  }

  function mixerChannelGain(channel) {
    if (state.muted[channel]) return 0;
    return dbToGain(state.mixer[channel] ?? MIXER_DEFAULT_DB);
  }

  function renderMixer() {
    document.querySelectorAll(".mixerSlider").forEach((slider) => {
      const channel = slider.dataset.channel;
      slider.value = state.mixer[channel];
      slider.closest(".macroControl")?.classList.toggle("is-muted", !!state.muted[channel]);
      document.getElementById(`${slider.id}_value`).textContent = state.muted[channel] ? "MUTE" : mixerValueText(state.mixer[channel]);
      setSliderVisual(slider);
    });

    const arpTriggerToggle = document.getElementById("app1_b2_p1_arpTrigger");
    if (arpTriggerToggle) arpTriggerToggle.checked = state.child.synthUseArpTrigger === true;

    const useArpPlayback = state.child.synthUseArpTrigger === true;
    const synthMixerControl = document.getElementById("app1_b2_p1_synth")?.closest(".mixerChannel");
    const synthMixerLabel = document.getElementById("app1_b2_p1_synth_label");
    const synthMixerSlider = document.getElementById("app1_b2_p1_synth");
    if (synthMixerControl) {
      synthMixerControl.classList.toggle("mixerChannel-arp", useArpPlayback);
      synthMixerControl.classList.toggle("mixerChannel-synth", !useArpPlayback);
    }
    if (synthMixerLabel) synthMixerLabel.textContent = useArpPlayback ? "Arp" : "Synth";
    if (synthMixerSlider) synthMixerSlider.setAttribute("aria-label", `${useArpPlayback ? "Arp" : "Synth"} mixer level`);

    const droneNoiseLinkToggle = document.getElementById("app1_b2_p1_droneNoiseLink");
    if (droneNoiseLinkToggle) droneNoiseLinkToggle.checked = state.mixer.droneNoiseLink === true;
  }

  // Audition Length positions: 1-5 seconds, 6 = Full. Older values above 5 migrate to Full.
  state.child.synthLoopLength = Math.max(
    1,
    Math.min(16, Math.round(Number(state.child.synthLoopLength) || 4)),
  );

  {
    const synthRelease = Number(state.child.synthEffectsRelease);
    const arpRelease = Number(state.child.arpEffectsRelease);
    state.child.arpTone = state.child.arpTone !== false;
    state.child.synthUseArpTrigger = state.child.synthUseArpTrigger === true;
    state.child.synthEffectsRelease = normalizeEffectsReleaseMs(synthRelease, 120);
    state.child.arpEffectsRelease = normalizeEffectsReleaseMs(arpRelease, 30);
    state.child.synthEngine = state.child.synthEngine === "pretty" ? "pretty" : "fm";
  }

  state.child.synthAuditionLength = Number(state.child.synthAuditionLength);
  if (!Number.isFinite(state.child.synthAuditionLength) || state.child.synthAuditionLength > 5) {
    state.child.synthAuditionLength = 6;
  } else {
    state.child.synthAuditionLength = Math.max(1, Math.min(5, state.child.synthAuditionLength));
  }

  const BED_EXPORT_LENGTHS_SECONDS = Object.freeze([15, 30, 60, 120, 180, 300]);

  function bedExportLengthSeconds(index) {
    const safeIndex = Math.max(0, Math.min(BED_EXPORT_LENGTHS_SECONDS.length - 1, Math.round(Number(index) || 0)));
    return BED_EXPORT_LENGTHS_SECONDS[safeIndex];
  }

  function renderChildSettings() {
    const bindings = [
      ["app1_b5_p1_loopLength", state.child.synthLoopLength, `${state.child.synthLoopLength} ${state.child.synthLoopLength === 1 ? "bar" : "bars"}`],
      ["app1_b5_p1_auditionLength", state.child.synthAuditionLength, state.child.synthAuditionLength === 6 ? "Full" : `${state.child.synthAuditionLength} s`],
      ["app1_b5_p1_effectsRelease", effectsReleaseIndex(state.child.synthEffectsRelease, 120), formatEffectsRelease(state.child.synthEffectsRelease)],
      ["app1_b5_p1_timing", state.child.synthTiming, `${state.child.synthTiming}%`],
      ["app1_b5_p2_timing", state.child.drumTiming, `${state.child.drumTiming}%`],
      ["app1_b5_p3_timing", state.child.arpTiming, `${state.child.arpTiming}%`],
      ["app1_b5_p3_effectsRelease", effectsReleaseIndex(state.child.arpEffectsRelease, 30), formatEffectsRelease(state.child.arpEffectsRelease)],
      ["app1_b5_p4_timing", state.child.noiseTiming, `${state.child.noiseTiming}%`],
      ["app1_b5_p4_leadIn", state.child.noiseLeadIn, `${state.child.noiseLeadIn > 0 ? "+" : ""}${state.child.noiseLeadIn} s`],
      ["app1_b5_p4_fadeIn", state.child.noiseFadeIn, `${state.child.noiseFadeIn} s`],
      ["app1_b5_p4_exportLength", state.child.noiseExportLength, `${bedExportLengthSeconds(state.child.noiseExportLength)} s`],
      ["app1_b5_p5_timing", state.child.droneTiming, `${state.child.droneTiming}%`],
      ["app1_b5_p5_leadIn", state.child.droneLeadIn, `${state.child.droneLeadIn > 0 ? "+" : ""}${state.child.droneLeadIn} s`],
      ["app1_b5_p5_fadeIn", state.child.droneFadeIn, `${state.child.droneFadeIn} s`],
      ["app1_b5_p5_exportLength", state.child.droneExportLength, `${bedExportLengthSeconds(state.child.droneExportLength)} s`],
    ];
    bindings.forEach(([id, value, text]) => {
      const slider = document.getElementById(id);
      if (id === "app1_b5_p1_effectsRelease" || id === "app1_b5_p3_effectsRelease") {
        slider.max = String(EFFECTS_RELEASE_VALUES_MS.length - 1);
      }
      slider.value = value;
      setSliderVisual(slider);
      document.getElementById(`${id}_value`).textContent = text;
    });
    document.getElementById("app1_b5_p1_auditionLoop").checked = !!state.child.synthAuditionLoop;
    const synthEngineToggle = document.getElementById("app1_b5_p1_synthEngine");
    if (synthEngineToggle) synthEngineToggle.checked = state.child.synthEngine === "pretty";
    document.getElementById("app1_b5_p2_otherInstrumentBorders").checked = !!state.child.drumBorders;
    const arpToneToggle = document.getElementById("app1_b5_p3_arpTone");
    if (arpToneToggle) arpToneToggle.checked = state.child.arpTone !== false;
  }


  window.InterPhaceExportSettings = Object.freeze({
    noiseLengthSeconds: () => bedExportLengthSeconds(state.child.noiseExportLength),
    droneLengthSeconds: () => bedExportLengthSeconds(state.child.droneExportLength),
    noiseLeadInSeconds: () => state.child.noiseLeadIn,
    droneLeadInSeconds: () => state.child.droneLeadIn,
    noiseFadeInSeconds: () => state.child.noiseFadeIn,
    droneFadeInSeconds: () => state.child.droneFadeIn,
  });

  const GRID_LABEL_MODE_KEY = "interPhace.gridLabelMode.v1";
  let interSequencerLabelMode = (() => {
    try { return localStorage.getItem(GRID_LABEL_MODE_KEY) === "hex" ? "hex" : "res"; }
    catch (_) { return "res"; }
  })();

  function interSequencerColumns() {
    return window.matchMedia("(min-width: 760px)").matches ? 8 : 4;
  }

  function interSequencerRowLabel(rowIndex) {
    return interSequencerLabelMode === "res"
      ? String(rowIndex + 1)
      : rowIndex.toString(16).toUpperCase();
  }

  function toggleInterSequencerLabelMode() {
    interSequencerLabelMode = interSequencerLabelMode === "res" ? "hex" : "res";
    try { localStorage.setItem(GRID_LABEL_MODE_KEY, interSequencerLabelMode); } catch (_) {}
    renderInterSequencerGrid();
  }

  function makeInterSequencerRowLabel(rowIndex) {
    const label = document.createElement("div");
    label.className = "labelCell";
    label.dataset.row = String(rowIndex);
    label.textContent = interSequencerRowLabel(rowIndex);
    label.tabIndex = 0;
    label.setAttribute("role", "button");
    label.setAttribute("aria-label", "Toggle numbered and zero-based hexadecimal row labels");
    label.addEventListener("click", toggleInterSequencerLabelMode);
    label.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleInterSequencerLabelMode();
      }
    });
    return label;
  }

  function interSequencerInfo() {
    let lastRow = -1;
    let hasMelody = false;
    let hasDrums = false;
    for (let row = 0; row < 16; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const value = String(state.sequencer?.[row]?.[col] || "").trim();
        if (!value) continue;
        lastRow = Math.max(lastRow, row);
        if (col === 0) hasMelody = true;
        else hasDrums = true;
      }
    }
    return Object.freeze({
      active: lastRow >= 0,
      bars: lastRow + 1,
      hasMelody,
      hasDrums,
    });
  }

  function sequencerCellTrackClass(col) {
    return ["melodyTrack", "kickTrack", "snareTrack", "hatTrack"][col] || "";
  }

  function parseSequencerCell(value, col) {
    const text = String(value || "").trim().toUpperCase();
    if (col === 0) {
      const match = /^M([1-4])\.([1-8])$/.exec(text);
      return match ? { phrase: `p${match[1]}`, melody: Number(match[1]), bar: Number(match[2]) } : null;
    }
    const prefix = ["", "K", "S", "H"][col];
    const match = new RegExp(`^${prefix}([1-8])$`).exec(text);
    return match ? { bar: Number(match[1]) } : null;
  }

  let interSequencerMelodyChoice = 1;
  let interSequencerSuppressClickUntil = 0;

  let interSequencerChooserAnchor = null;

  function closeInterSequencerChooser() {
    document.querySelector(".sequencerEntryChooser")?.remove();
    interSequencerChooserAnchor = null;
  }

  function commitInterSequencerChoice(row, col, value) {
    state.sequencer[row][col] = value;
    save();
    renderInterSequencerGrid();
  }

  function nextInterSequencerCellValue(row, col) {
    for (let priorRow = row - 1; priorRow >= 0; priorRow -= 1) {
      const prior = parseSequencerCell(state.sequencer[priorRow][col], col);
      if (!prior) continue;

      if (col === 0) {
        if (prior.bar < 8) return `M${prior.melody}.${prior.bar + 1}`;
        return `M${prior.melody === 4 ? 1 : prior.melody + 1}.1`;
      }

      return `${["", "K", "S", "H"][col]}${prior.bar === 8 ? 1 : prior.bar + 1}`;
    }

    return col === 0 ? "M1.1" : `${["", "K", "S", "H"][col]}1`;
  }

  function smartEnterInterSequencerCell(row, col) {
    state.sequencer[row][col] = nextInterSequencerCellValue(row, col);
    save();
    renderInterSequencerGrid();
    const cell = document.querySelector(`.interSequencerCell[data-row="${row}"][data-col="${col}"]`);
    renderInterSequencerEntryChooser(cell);
  }

  function renderInterSequencerEntryChooser(anchorButton) {
    closeInterSequencerChooser();
    if (!anchorButton) return;

    const gridRoot = document.getElementById("app1_b2_p2_c1");
    if (!gridRoot) return;

    const row = Number(anchorButton.dataset.row);
    const col = Number(anchorButton.dataset.col);
    if (!Number.isInteger(row) || !Number.isInteger(col) || col < 0 || col > 3) return;

    interSequencerChooserAnchor = anchorButton;
    const current = parseSequencerCell(state.sequencer[row][col], col);
    if (col === 0 && current?.melody) interSequencerMelodyChoice = current.melody;

    const chooser = document.createElement("div");
    chooser.className = "sequencerEntryChooser";
    chooser.setAttribute("aria-label", "Sequencer selector");

    const items = col === 0
      ? [
          ...[1,2,3,4].map(value => ({ label: `M${value}`, type: "melody", value, localRow: 0, localCol: value - 1 })),
          ...[1,2,3,4].map(value => ({ label: String(value), type: "bar", value, localRow: 1, localCol: value - 1 })),
          ...[5,6,7,8].map(value => ({ label: String(value), type: "bar", value, localRow: 2, localCol: value - 5 })),
        ]
      : [
          ...[1,2,3,4].map(value => ({ label: String(value), type: "bar", value, localRow: 0, localCol: value - 1 })),
          ...[5,6,7,8].map(value => ({ label: String(value), type: "bar", value, localRow: 1, localCol: value - 5 })),
        ];

    const chooserRows = col === 0 ? 3 : 2;
    const startRow = row < 8 ? 9 : (7 - chooserRows); // visible rows 10+ or ending at row 7

    items.forEach(item => {
      const logicalRow = startRow + item.localRow;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "stepBtn sequencerChooserButton";
      button.tabIndex = -1;
      button.textContent = item.label;
      button.style.gridRow = String(logicalRow + 1);
      button.style.gridColumn = String(item.localCol + 2);
      button.dataset.row = String(logicalRow);
      button.dataset.col = String(item.localCol);

      if (logicalRow % 2 === 0) button.classList.add("eighthRow");
      if (logicalRow === 3 || logicalRow === 7 || logicalRow === 11) button.classList.add("rowDivider");

      if (col === 0 && item.type === "melody") {
        button.classList.toggle("isActiveModifier", interSequencerMelodyChoice === item.value);
        button.addEventListener("click", event => {
          event.stopPropagation();
          interSequencerMelodyChoice = item.value;
          renderInterSequencerEntryChooser(anchorButton);
        });
      } else {
        button.addEventListener("click", event => {
          event.stopPropagation();
          const value = col === 0
            ? `M${interSequencerMelodyChoice}.${item.value}`
            : `${["","K","S","H"][col]}${item.value}`;
          commitInterSequencerChoice(row, col, value);
        });
      }

      chooser.appendChild(button);
    });

    gridRoot.appendChild(chooser);
  }

  function attachInterSequencerClearHold(button, row, col) {
    const HOLD_MS = 650;
    let timer = null;

    const cancel = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
    };

    button.addEventListener("pointerdown", event => {
      if (!state.sequencer[row][col]) return;
      cancel();
      timer = window.setTimeout(() => {
        timer = null;
        interSequencerSuppressClickUntil = performance.now() + 350;
        state.sequencer[row][col] = "";
        save();
        renderInterSequencerGrid();
      }, HOLD_MS);
    });

    ["pointerup","pointercancel","pointerleave"].forEach(type =>
      button.addEventListener(type, cancel)
    );
  }

  function renderInterSequencerGrid() {
    closeInterSequencerChooser();
    const grid = document.getElementById("app1_b2_p2_c1");
    if (!grid) return;
    const cols = interSequencerColumns();
    grid.style.setProperty("--seq-cols", String(cols));
    grid.replaceChildren();

    for (let row = 0; row < 16; row += 1) {
      const label = makeInterSequencerRowLabel(row);
      label.style.gridRow = String(row + 1);
      label.style.gridColumn = "1";
      if (row === 3 || row === 7 || row === 11) label.classList.add("rowDivider");
      grid.appendChild(label);

      for (let col = 0; col < cols; col += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stepBtn interSequencerCell";
        button.dataset.row = String(row);
        button.dataset.col = String(col);
        button.style.gridRow = String(row + 1);
        button.style.gridColumn = String(col + 2);
        if (row === 3 || row === 7 || row === 11) button.classList.add("rowDivider");

        if (col < 4) {
          const value = String(state.sequencer[row][col] || "");
          button.textContent = value;
          button.classList.add(sequencerCellTrackClass(col));
          button.classList.toggle("isSequenced", !!value);
          button.setAttribute("aria-label", value
            ? `Sequencer bar ${row + 1}, ${value}`
            : `Sequencer bar ${row + 1}, ${["melody","kick","snare","hat"][col]}`);
          attachInterSequencerClearHold(button, row, col);
          button.addEventListener("click", () => {
            if (performance.now() < interSequencerSuppressClickUntil) return;
            if (value) renderInterSequencerEntryChooser(button);
            else smartEnterInterSequencerCell(row, col);
          });
        } else {
          button.disabled = true;
          button.setAttribute("aria-label", `Reserved sequencer column ${col + 1}`);
        }

        grid.appendChild(button);
      }
    }
  }

  window.InterPhaceMixer = Object.freeze({
    minDb: MIXER_MIN_DB,
    maxDb: MIXER_MAX_DB,
    unityDb: 0,
    dbToGain,
    channelDb: (channel) => Number(state.mixer[channel] ?? MIXER_DEFAULT_DB),
    channelGain: mixerChannelGain,
    isMuted: (channel) => !!state.muted[channel],
    activeChannels: Object.freeze(["synth", "kick", "snare", "hat"]),
  });

  function render() {
    const activeId = activePageId();
    pages.forEach((page) => page.classList.toggle("hidden", page.id !== activeId));
    buttons.forEach((button, index) => button?.classList.toggle("active", index + 1 === state.button));
    shell.dataset.page = activeId;
    shell.dataset.context = "interPhace";
    const settingsPageNum = document.getElementById("app1_b5_page_num");
    if (settingsPageNum) settingsPageNum.textContent = String(state.b5Page);
    renderProject();
    renderMixer();
    renderInterSequencerGrid();
    renderChildSettings();
    save();
    document.documentElement.classList.add("interphase-ready");
  }

  let interSequencerClearTimer = null;
  let interSequencerClearFrame = 0;
  let interSequencerClearStart = 0;
  let interSequencerClearFired = false;
  const INTER_SEQUENCER_CLEAR_MS = 900;
  const INTER_SEQUENCER_CLEAR_FILL_DELAY_MS = 200;
  const interB2Button = buttons[1];

  function setInterSequencerClearFill(percent) {
    const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
    interB2Button?.style.setProperty("--clear-fill", `${clamped}%`);
  }

  function cancelInterSequencerClear() {
    if (interSequencerClearTimer !== null) {
      clearTimeout(interSequencerClearTimer);
      interSequencerClearTimer = null;
    }
    if (interSequencerClearFrame) cancelAnimationFrame(interSequencerClearFrame);
    interSequencerClearFrame = 0;
    if (!interSequencerClearFired) setInterSequencerClearFill(0);
  }

  function updateInterSequencerClearFill(now) {
    if (interSequencerClearTimer === null || interSequencerClearFired) return;
    setInterSequencerClearFill(Math.max(0, ((now - interSequencerClearStart - INTER_SEQUENCER_CLEAR_FILL_DELAY_MS) / (INTER_SEQUENCER_CLEAR_MS - INTER_SEQUENCER_CLEAR_FILL_DELAY_MS)) * 100));
    interSequencerClearFrame = requestAnimationFrame(updateInterSequencerClearFill);
  }

  function clearInterSequencerGrid() {
    if (globalAuditionState !== "idle") stopGlobalAudition();
    closeInterSequencerChooser();
    state.sequencer = Array.from({ length: 16 }, () => Array(4).fill(""));
    save();
    renderInterSequencerGrid();
  }

  interB2Button?.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    interSequencerClearFired = false;
    cancelInterSequencerClear();

    // Only B2 page 2 (Sequencer) owns this destructive hold.
    if (state.button !== 2 || state.b2Page !== 2) return;

    interSequencerClearStart = performance.now();
    try { interB2Button.setPointerCapture?.(event.pointerId); } catch (_) {}
    interSequencerClearFrame = requestAnimationFrame(updateInterSequencerClearFill);
    interSequencerClearTimer = window.setTimeout(() => {
      interSequencerClearTimer = null;
      interSequencerClearFired = true;
      if (interSequencerClearFrame) cancelAnimationFrame(interSequencerClearFrame);
      interSequencerClearFrame = 0;
      setInterSequencerClearFill(100);
      clearInterSequencerGrid();
      window.setTimeout(() => setInterSequencerClearFill(0), 180);
    }, INTER_SEQUENCER_CLEAR_MS);
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach(eventName => {
    interB2Button?.addEventListener(eventName, event => {
      try { interB2Button.releasePointerCapture?.(event.pointerId); } catch (_) {}
      cancelInterSequencerClear();
    });
  });
  interB2Button?.addEventListener("contextmenu", event => event.preventDefault());

  buttons.forEach((button, index) => {
    button?.addEventListener("click", (event) => {
      const nextButton = index + 1;
      if (nextButton === 2 && interSequencerClearFired) {
        interSequencerClearFired = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (state.button === 4 && nextButton !== 4) clearExportSelection();
      if (nextButton === 2 && state.button === 2) state.b2Page = (state.b2Page % 2) + 1;
      if (nextButton === 5 && state.button === 5) state.b5Page = (state.b5Page % 5) + 1;
      state.button = nextButton;
      render();
    });
  });

  const projectBindings = {
    app1_b1_p1_rootNote: ["root", Number],
    app1_b1_p1_scale: ["scale", Number],
    app1_b1_p1_tempo: ["tempo", Number],
    app1_b1_p1_length: ["length", Number],
    app1_b1_p1_swing: ["swing", Number],
    app1_b1_p1_timing: ["timing", Number],
  };

  document.getElementById("app1_b1_p1_projectName")?.addEventListener("input", (event) => {
    state.project.name = event.target.value;
    save();
  });

  Object.entries(projectBindings).forEach(([id, [key, cast]]) => {
    document.getElementById(id)?.addEventListener("input", (event) => {
      state.project[key] = cast(event.target.value);
      renderProject();
      save();
    });
  });

  document.querySelectorAll(".mixerSlider").forEach((slider) => {
    slider.addEventListener("input", (event) => {
      const channel = event.target.dataset.channel;
      state.mixer[channel] = Number(event.target.value);
      state.muted[channel] = false;
      renderMixer();
      save();
    });
    slider.addEventListener("dblclick", (event) => {
      const channel = event.target.dataset.channel;
      state.muted[channel] = !state.muted[channel];
      renderMixer();
      save();
    });
  });

  const childSliderBindings = {
    app1_b5_p1_loopLength: ["synthLoopLength", Number],
    app1_b5_p1_auditionLength: ["synthAuditionLength", Number],
    app1_b5_p1_timing: ["synthTiming", Number],
    app1_b5_p2_timing: ["drumTiming", Number],
    app1_b5_p3_timing: ["arpTiming", Number],
    app1_b5_p4_timing: ["noiseTiming", Number],
    app1_b5_p4_leadIn: ["noiseLeadIn", Number],
    app1_b5_p4_fadeIn: ["noiseFadeIn", Number],
    app1_b5_p4_exportLength: ["noiseExportLength", Number],
    app1_b5_p5_timing: ["droneTiming", Number],
    app1_b5_p5_leadIn: ["droneLeadIn", Number],
    app1_b5_p5_fadeIn: ["droneFadeIn", Number],
    app1_b5_p5_exportLength: ["droneExportLength", Number],
  };
  Object.entries(childSliderBindings).forEach(([id, [key, cast]]) => {
    document.getElementById(id)?.addEventListener("input", (event) => {
      state.child[key] = cast(event.target.value);
      renderChildSettings();
      save();
    });
  });

  [
    ["app1_b5_p1_effectsRelease", "synthEffectsRelease", 120],
    ["app1_b5_p3_effectsRelease", "arpEffectsRelease", 30],
  ].forEach(([id, key, fallback]) => {
    document.getElementById(id)?.addEventListener("input", (event) => {
      state.child[key] = effectsReleaseValueFromIndex(event.target.value, fallback);
      renderChildSettings();
      save();
    });
  });
  document.getElementById("app1_b2_p1_arpTrigger")?.addEventListener("change", (event) => {
    state.child.synthUseArpTrigger = event.target.checked;
    save();
    renderMixer();
  });
  document.getElementById("app1_b2_p1_droneNoiseLink")?.addEventListener("change", (event) => {
    state.mixer.droneNoiseLink = event.target.checked === true;
    save();
    renderMixer();
  });

  document.getElementById("app1_b5_p1_auditionLoop")?.addEventListener("change", (event) => { state.child.synthAuditionLoop = event.target.checked; save(); });
  document.getElementById("app1_b5_p1_synthEngine")?.addEventListener("change", (event) => {
    state.child.synthEngine = event.target.checked ? "pretty" : "fm";
    try {
      const key = "interPhace.synthPhace.patch.v1";
      const patch = JSON.parse(localStorage.getItem(key) || "null");
      if (patch && typeof patch === "object") {
        patch.synth ||= {};
        patch.synth.engine = { ...(patch.synth.engine || {}), mode: state.child.synthEngine };
        localStorage.setItem(key, JSON.stringify(patch));
      }
    } catch (_) {}
    save();
  });
  document.getElementById("app1_b5_p2_otherInstrumentBorders")?.addEventListener("change", (event) => {
    state.child.drumBorders = event.target.checked;
    save();
    window.dispatchEvent(new CustomEvent("interPhace:drumBorders", {
      detail: { enabled: state.child.drumBorders },
    }));
  });

  document.getElementById("app1_b5_p3_arpTone")?.addEventListener("change", (event) => {
    state.child.arpTone = event.target.checked;
    save();
    window.dispatchEvent(new CustomEvent("interPhace:arpTone", {
      detail: { enabled: state.child.arpTone },
    }));
  });

  function buildBackgroundSelectionGrid(container, pagePrefix) {
    if (!container) return null;

    const cells = [];
    for (let row = 1; row <= 16; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "backgroundSelectionCell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.id = `${pagePrefix}_r${row}_c${col + 1}`;
        cell.style.gridRow = String(row);
        cell.style.gridColumn = String(col + 2); // column 1 preserves the drum-grid label track
        cell.disabled = true;
        cells.push(cell);
      }
    }
    container.replaceChildren(...cells);

    const media = window.matchMedia("(min-width: 760px)");
    const syncVisibleColumns = () => {
      const desktop = media.matches;
      container.querySelectorAll(".backgroundSelectionCell").forEach((cell) => {
        cell.hidden = !desktop && Number(cell.dataset.col) >= 4;
      });
    };
    syncVisibleColumns();
    media.addEventListener?.("change", syncVisibleColumns);

    const at = (row, col) =>
      container.querySelector(`[data-row="${row}"][data-col="${col}"]`);

    const activate = (row, col, text, className = "") => {
      const cell = at(row, col);
      if (!cell) return null;
      cell.disabled = false;
      cell.textContent = text;
      cell.classList.add("is-active");
      if (className) cell.classList.add(className);
      return cell;
    };

    return { at, activate };
  }

  function buildUtilityGrid(container, mode) {
    if (!container) return;
    const pagePrefix = mode === "import" ? "app1_b3_p1" : "app1_b4_p1";
    const grid = buildBackgroundSelectionGrid(container, pagePrefix);
    if (!grid) return;
    const { activate } = grid;

    if (mode === "import") {
      const importButtons = ["PROJECTS", "PATCHES", "MIDI"].map((label, col) =>
        activate(2, col, label, "utilityImport"));

      importButtons[0]?.addEventListener("click", () => openProjectImportPicker());
      importButtons[1]?.addEventListener("click", () => openPatchImportPicker());
      // MIDI import remains intentionally unwired until its import contract is built.
    } else {
      const exportHeaders = ["PROJECT", "PATCHES", "MIDI", "AUDIO"].map((label, col) =>
        activate(2, col, label, "utilityHeader"));

      const patchRows = ["SYNTH", "DRUMS", "KICK", "SNARE", "HAT", "DRONE", "NOISE", "ARP", "MELODY", "SEQUENCER"];
      const midiRows = ["DRUMS", "KICK", "SNARE", "HAT", "MELODY"];
      const audioRows = ["SYNTH", "DRUMS", "KICK", "SNARE", "HAT", "DRONE", "NOISE", "MELODY"];

      const patchButtons = patchRows.map((label, index) => activate(3 + index, 1, label, "utilityChoice"));
      const midiButtons = midiRows.map((label, index) => activate(3 + index, 2, label, "utilityChoice"));
      const audioButtons = audioRows.map((label, index) => activate(3 + index, 3, label, "utilityChoice"));
      const projectJsonButton = activate(3, 0, "JSON", "utilityChoice");
      const projectM8sButton = activate(4, 0, "M8S", "utilityChoice");
      if (projectJsonButton) {
        projectJsonButton.dataset.exportGroup = "project";
        projectJsonButton.dataset.exportKey = "json";
        // project.json is the default/minimum export every time this page is opened.
        projectJsonButton.classList.add("is-selected");
      }

      if (projectM8sButton) {
        projectM8sButton.dataset.exportGroup = "project";
        projectM8sButton.dataset.exportKey = "m8s";
      }

      patchButtons.forEach((button, index) => {
        if (!button) return;
        button.dataset.exportGroup = "patch";
        button.dataset.exportKey = patchRows[index].toLowerCase();
      });
      midiButtons.forEach((button, index) => {
        if (!button) return;
        button.dataset.exportGroup = "mid";
        button.dataset.exportKey = midiRows[index].toLowerCase();
      });
      audioButtons.forEach((button, index) => {
        if (!button) return;
        button.dataset.exportGroup = "wav";
        button.dataset.exportKey = audioRows[index].toLowerCase();
      });

      const setGroupSelected = (buttons, selected) => {
        buttons.filter(Boolean).forEach((button) => button.classList.toggle("is-selected", selected));
      };

      const groupIsFullySelected = (buttons) => {
        const available = buttons.filter(Boolean);
        return available.length > 0 && available.every((button) => button.classList.contains("is-selected"));
      };

      const projectHeader = exportHeaders[0];
      const patchesHeader = exportHeaders[1];
      const midiHeader = exportHeaders[2];
      const audioHeader = exportHeaders[3];

      projectHeader?.addEventListener("click", () => {
        const allExportButtons = [projectJsonButton, projectM8sButton, ...patchButtons, ...midiButtons, ...audioButtons].filter(Boolean);
        const everythingSelected = allExportButtons.every(button => button.classList.contains("is-selected"));
        if (everythingSelected) {
          setGroupSelected([...patchButtons, ...midiButtons, ...audioButtons], false);
          projectJsonButton?.classList.add("is-selected");
        } else {
          setGroupSelected(allExportButtons, true);
        }
      });

      [
        [patchesHeader, patchButtons],
        [midiHeader, midiButtons],
        [audioHeader, audioButtons],
      ].forEach(([header, buttons]) => {
        header?.addEventListener("click", () => {
          setGroupSelected(buttons, !groupIsFullySelected(buttons));
        });
      });

      activate(14, 0, "NEW", "utilityAction");
      const exportProgress = activate(16, 1, "", "utilityProgress");
      if (exportProgress) {
        exportProgress.disabled = true;
        exportProgress.setAttribute("aria-live", "polite");
        exportProgress.setAttribute("aria-label", "Export progress");
      }
      activate(16, 0, "EXPORT", "utilityCommit");

    }

    container.querySelectorAll(".utilityChoice").forEach((button) => {
      button.addEventListener("click", () => {
        button.classList.toggle("is-selected");
      });
    });

    if (mode === "export") {
      const newButton = container.querySelector(".utilityAction");

      if (newButton) {
        const NEW_HOLD_MS = 900;
        let newHoldTimer = null;
        let newFillFrame = 0;
        let newHoldStart = 0;
        let newHolding = false;
        let newTriggered = false;

        const setNewFill = (percent) => {
          const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
          newButton.style.setProperty("--new-fill", `${clamped}%`);
        };

        const cancelNewHold = () => {
          newHolding = false;
          clearTimeout(newHoldTimer);
          newHoldTimer = null;
          if (newFillFrame) cancelAnimationFrame(newFillFrame);
          newFillFrame = 0;
          if (!newTriggered) setNewFill(0);
        };

        const performNewProjectReset = () => {
          if (newTriggered) return;
          newTriggered = true;
          newHolding = false;
          setNewFill(100);

          if (globalAuditionState !== "idle") stopGlobalAudition();

          // "New Project" resets musical/project content, but Button 5 contains
          // persistent per-Phace preferences. Preserve the entire child settings
          // object while returning Button 1 + Button 2 state to project defaults.
          const preservedChildSettings = cloneJson(state.child);

          const resetKeys = [
            STORAGE_KEY,
            "drumPhace.build5.state",
            "interPhace.synthPhace.ui.v3",
            "interPhace.synthPhace.ui.v2",
            "interPhace.synthPhace.ui.v1",
            "interPhace.synthPhace.patch.v1",
            "interPhace.arpPhace.template.v1",
            "interPhace.noisePhace.ui.v2",
            "interPhace.noisePhace.template.v2",
            "interPhace.dronePhace.ui.v2",
          ];

          resetKeys.forEach((key) => localStorage.removeItem(key));

          // Re-seed only the persistent Button 5 settings. On reload, all other
          // interPhace fields fall back to their defaults: C, Major, 75 BPM,
          // default project length/swing/timing, default mixer/mutes, and an
          // empty sequencer.
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              child: preservedChildSettings,
            }));
          } catch (_) {}

          window.location.reload();
        };

        const updateNewFill = (now) => {
          if (!newHolding || newTriggered) return;
          const elapsed = now - newHoldStart;
          setNewFill((elapsed / NEW_HOLD_MS) * 100);
          if (elapsed < NEW_HOLD_MS) {
            newFillFrame = requestAnimationFrame(updateNewFill);
          }
        };

        newButton.addEventListener("pointerdown", (event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          event.preventDefault();

          cancelNewHold();
          newTriggered = false;
          newHolding = true;
          newHoldStart = performance.now();
          setNewFill(0);

          try { newButton.setPointerCapture?.(event.pointerId); } catch (_) {}

          newFillFrame = requestAnimationFrame(updateNewFill);
          newHoldTimer = window.setTimeout(performNewProjectReset, NEW_HOLD_MS);
        });

        const endNewHold = (event) => {
          try { newButton.releasePointerCapture?.(event.pointerId); } catch (_) {}
          cancelNewHold();
        };

        newButton.addEventListener("pointerup", endNewHold);
        newButton.addEventListener("pointercancel", endNewHold);
        newButton.addEventListener("lostpointercapture", cancelNewHold);
        newButton.addEventListener("contextmenu", (event) => event.preventDefault());
        newButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
      }
    }

    if (mode === "export") {
      const exportButton = container.querySelector(".utilityCommit");
      const progressCell = container.querySelector(".utilityProgress");

      if (exportButton) {
        const EXPORT_HOLD_MS = 900;
        let exportHoldTimer = null;
        let exportFillFrame = 0;
        let exportHoldStart = 0;
        let exportHolding = false;
        let exportTriggered = false;
        let exportBusy = false;

        const setExportFill = (percent) => {
          const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
          exportButton.style.setProperty("--export-fill", `${clamped}%`);
        };

        let exportProgressDone = 0;
        let exportProgressTotal = 0;
        const setExportProgress = (done = 0, total = 0, label = "") => {
          if (!progressCell) return;
          exportProgressDone = done;
          exportProgressTotal = total;
          progressCell.textContent = total > 0
            ? `${done} / ${total}${label ? `  •  ${label}` : ""}`
            : label;
          progressCell.title = label || (total > 0 ? `${done} of ${total} files rendered` : "");
        };

        const cancelExportHold = () => {
          exportHolding = false;
          clearTimeout(exportHoldTimer);
          exportHoldTimer = null;
          if (exportFillFrame) cancelAnimationFrame(exportFillFrame);
          exportFillFrame = 0;
          if (!exportTriggered && !exportBusy) setExportFill(0);
        };

        const updateExportFill = (now) => {
          if (!exportHolding || exportTriggered) return;
          const elapsed = now - exportHoldStart;
          setExportFill((elapsed / EXPORT_HOLD_MS) * 100);
          if (elapsed < EXPORT_HOLD_MS) exportFillFrame = requestAnimationFrame(updateExportFill);
        };

        const performExport = async () => {
          if (exportTriggered || exportBusy) return;
          exportTriggered = true;
          exportHolding = false;
          exportBusy = true;
          setExportFill(100);
          clearTimeout(exportHoldTimer);
          exportHoldTimer = null;
          if (exportFillFrame) cancelAnimationFrame(exportFillFrame);
          exportFillFrame = 0;

          try {
            const total = countAudioConstructionFiles(container);
            setExportProgress(0, total, total ? "Rendering audio" : "Preparing export");
            await exportCurrentProject(container, {
              onAudioProgress(done, progressTotal, label) {
                setExportProgress(done, progressTotal, label || "Rendering audio");
              },
              onStage(label) { setExportProgress(exportProgressDone, exportProgressTotal, label); },
            });
            setExportProgress(total, total, total ? "Complete" : "Complete");
          } catch (error) {
            console.error("interPhace export failed:", error);
            setExportProgress(0, 0, "ERROR");
          } finally {
            exportBusy = false;
            window.setTimeout(() => {
              if (!exportBusy) {
                setExportFill(0);
                setExportProgress(0, 0, "");
              }
            }, 1800);
          }
        };

        exportButton.addEventListener("pointerdown", (event) => {
          if (exportBusy) return;
          if (event.pointerType === "mouse" && event.button !== 0) return;
          event.preventDefault();
          cancelExportHold();
          exportTriggered = false;
          exportHolding = true;
          exportHoldStart = performance.now();
          setExportFill(0);
          try { exportButton.setPointerCapture?.(event.pointerId); } catch (_) {}
          exportFillFrame = requestAnimationFrame(updateExportFill);
          exportHoldTimer = window.setTimeout(performExport, EXPORT_HOLD_MS);
        });

        const endExportHold = (event) => {
          try { exportButton.releasePointerCapture?.(event.pointerId); } catch (_) {}
          cancelExportHold();
        };

        exportButton.addEventListener("pointerup", endExportHold);
        exportButton.addEventListener("pointercancel", endExportHold);
        exportButton.addEventListener("lostpointercapture", cancelExportHold);
        exportButton.addEventListener("contextmenu", event => event.preventDefault());
        exportButton.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
        });
      }
    }
  }


  const PROJECT_EXPORT_SCHEMA = "interPhace.project";
  const PROJECT_EXPORT_VERSION = 1;
  const PATCH_EXPORT_SCHEMA = "interPhace.patch";
  const PATCH_EXPORT_VERSION = 2;

  function cloneJson(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function readStoredJson(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : null;
    } catch (_) {
      return null;
    }
  }

  function hasActiveGridCell(grid) {
    return Array.isArray(grid) && grid.some(row =>
      Array.isArray(row) && row.some(cell => cell === "on" || cell === "ghost")
    );
  }

  function anyPatternActive(patterns) {
    return patterns && typeof patterns === "object" &&
      Object.values(patterns).some(hasActiveGridCell);
  }

  function hasMelodyContent(grid) {
    return Array.isArray(grid) && grid.some(row =>
      Array.isArray(row) && row.some(cell =>
        typeof cell === "string" && cell.trim() !== "" && !["off","on","ghost"].includes(cell)
      )
    );
  }

  function valuesDiffer(values, defaults) {
    return Array.isArray(values) && Array.isArray(defaults) &&
      values.some((value, index) => Number(value) !== Number(defaults[index]));
  }

  function makePatch(type, phace, patchState, extra = {}) {
    return {
      schema: PATCH_EXPORT_SCHEMA,
      version: PATCH_EXPORT_VERSION,
      type,
      phace,
      ...extra,
      state: cloneJson(patchState),
    };
  }

  function synthPatchAvailable() {
    const patch = readStoredJson("interPhace.synthPhace.patch.v1");
    if (!patch) return null;

    const fm = patch.synth?.fm || {};
    const carrier = Number(fm.carrierVolume || 0);
    const h1 = Number(fm.harmonic1?.gain || 0);
    const h2 = Number(fm.harmonic2?.gain || 0);
    const texture = Number(patch.texture?.amount || 0);
    const transientActive =
      Number(patch.transient?.preset || 0) > 0 &&
      Number(patch.transient?.volume || 0) > 0;

    if (carrier <= 0 && h1 <= 0 && h2 <= 0 && texture <= 0 && !transientActive) return null;

    return makePatch("synth", "synthPhace", patch, {
      projectContext: { authoredScale: patch.harmonyContext?.authoredScale || null },
    });
  }

  function drumPatchSet() {
    const saved = readStoredJson("drumPhace.build5.state");
    if (!saved) return {};

    const defaults = {
      kick: [43, 118, 55, 420, 0, 0, 0, 0],
      snare: [50, 50, 100, 50, 50, 0, 0, 0],
      hat: [50, 0, 100, 0, 0, 32, 0, 0],
    };
    const synths = Object.fromEntries(
      ["kick", "snare", "hat"].map(type => [
        type,
        Array.isArray(saved.synths?.[type])
          ? [...defaults[type].map((fallback, index) =>
              Number.isFinite(Number(saved.synths[type][index]))
                ? Number(saved.synths[type][index])
                : fallback
            )]
          : [...defaults[type]],
      ])
    );

    const patterns = cloneJson(saved.patterns || {});
    const variations = cloneJson(saved.variations || {});
    const styles = cloneJson(saved.styles || {});

    const result = {
      drums: makePatch("drums", "drumPhace", {
        version: Number(saved.version || 1),
        styles,
        synths: cloneJson(synths),
        patterns,
        variationPages: cloneJson(saved.variationPages || {}),
        variations,
      }),
    };

    for (const type of ["kick", "snare", "hat"]) {
      result[type] = makePatch(type, "drumPhace", {
        synth: cloneJson(synths[type]),
        style: styles?.[type] ?? "rand",
        pattern: cloneJson(patterns?.[type] || []),
        variations: cloneJson(variations?.[type] || {}),
      });
    }

    return result;
  }

  function arpMelodyPatchSet() {
    const saved = readStoredJson("interPhace.arpPhace.template.v1");
    if (!saved) return {};

    const phrases = ["p1", "p2", "p3", "p4"];
    const anyMelody = phrases.some(phrase => hasMelodyContent(saved.melodies?.[phrase]));
    const arpDefaults = [1, 75, 0, 0];
    const generatorDefaults = [null, [50,50,50,50], [50,50,50,50], [50,50,50,50]];
    const anyGeneratorEdited = [1, 2, 3].some(page =>
      valuesDiffer(saved.b2GeneratorState?.[page], generatorDefaults[page])
    );
    const anyArpEdited =
      phrases.some(phrase => valuesDiffer(saved.arps?.[phrase], arpDefaults)) ||
      phrases.some(phrase => !!saved.arpPatternCustom?.[phrase]) ||
      phrases.some(phrase => Array.isArray(saved.arpPatterns?.[phrase]) &&
        saved.arpPatterns[phrase].some(value => String(value || "").trim() !== "")) ||
      anyGeneratorEdited;

    const result = {};
    if (anyArpEdited) {
      result.arp = makePatch("arp", "arpPhace", {
        arps: cloneJson(saved.arps || {}),
        arpPatternEncoding: saved.arpPatternEncoding || "degree-v1",
        arpPatterns: cloneJson(saved.arpPatterns || {}),
        arpPatternCustom: cloneJson(saved.arpPatternCustom || {}),
        b2GeneratorLayoutVersion: Number(saved.b2GeneratorLayoutVersion || 2),
        b2GeneratorState: cloneJson(saved.b2GeneratorState || [null, [50,50,50,50], [50,50,50,50], [50,50,50,50]]),
      });
    }
    if (anyMelody) {
      result.melody = makePatch("melody", "arpPhace", {
        melodies: cloneJson(saved.melodies || {}),
        // chance contains the Chance, Volume, and Gate grids for all M1-M4.
        chance: cloneJson(saved.chance || {}),
      });
    }
    return result;
  }

  function noisePatchAvailable() {
    const saved = readStoredJson("interPhace.noisePhace.ui.v2");
    if (!saved?.values) return null;
    const pageNames = ["noise", "artifact", "movement", "space"];
    const pages = {};
    const presets = {};
    for (let page = 1; page <= 4; page++) {
      pages[pageNames[page - 1]] = Array.from({ length: 5 }, (_, index) =>
        Number(saved.values?.[`app5_b${page}_p1_c${index + 1}`] ?? 0)
      );
      presets[pageNames[page - 1]] = Number(saved.values?.[`app5_b${page}_p1_c6`] ?? saved.presets?.[pageNames[page - 1]] ?? 0);
    }
    return makePatch("noise", "noisePhace", {
      pages,
      presets,
    });
  }

  function dronePatchAvailable() {
    const saved = readStoredJson("interPhace.dronePhace.ui.v2");
    if (!saved?.values) return null;

    const pageNames = ["voice", "tone", "movement", "space"];
    const pages = {};
    const presets = {};
    for (let page = 1; page <= 4; page++) {
      pages[pageNames[page - 1]] = Array.from({ length: 5 }, (_, index) => {
        const id = `app6_b${page}_p1_c${index + 1}`;
        return Number(saved.values?.[id] ?? 0);
      });
      const presetId = `app6_b${page}_p1_c6`;
      presets[pageNames[page - 1]] = Number(saved.presets?.[presetId] ?? 0);
    }

    return makePatch("drone", "dronePhace", {
      pages,
      presets,
    });
  }

  function sequencerPatchAvailable() {
    const grid = cloneJson(state.sequencer || []);
    const hasContent = Array.isArray(grid) && grid.some(row =>
      Array.isArray(row) && row.some(cell => String(cell || "").trim() !== "")
    );
    if (!hasContent) return null;
    return makePatch("sequencer", "interPhace", {
      grid,
    });
  }

  function collectAvailablePatches() {
    const patches = {};
    const synth = synthPatchAvailable();
    if (synth) patches.synth = synth;
    Object.assign(patches, drumPatchSet());
    Object.assign(patches, arpMelodyPatchSet());
    const noise = noisePatchAvailable();
    if (noise) patches.noise = noise;
    const drone = dronePatchAvailable();
    if (drone) patches.drone = drone;
    const sequencer = sequencerPatchAvailable();
    if (sequencer) patches.sequencer = sequencer;
    return patches;
  }

  function sanitizeExportName(value) {
    const clean = String(value || "")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "");
    return clean || "interPhace-project";
  }

  function selectedPatchKeys(container) {
    return Array.from(
      container.querySelectorAll('.utilityChoice.is-selected[data-export-group="patch"]')
    ).map(button => button.dataset.exportKey);
  }

  function selectedMidiKeys(container) {
    return Array.from(
      container.querySelectorAll('.utilityChoice.is-selected[data-export-group="mid"]')
    ).map(button => button.dataset.exportKey);
  }

  const MIDI_PPQ = 480;
  const MIDI_SIXTEENTH_TICKS = MIDI_PPQ / 4;
  const MIDI_DRUM_NOTES = Object.freeze({ kick: 36, snare: 38, hat: 42 });
  const MIDI_DRUM_GHOST_VELOCITY = Object.freeze({ kick: 53, snare: 58, hat: 64 });
  const MIDI_REPEAT_EVENTS = Object.freeze({
    "2": Object.freeze([{ offset: 0.00, gain: 1.00 }, { offset: 0.50, gain: 0.72 }]),
    "3": Object.freeze([{ offset: 0.00, gain: 1.00 }, { offset: 0.33, gain: 0.78 }, { offset: 0.66, gain: 0.62 }]),
    "4": Object.freeze([{ offset: 0.00, gain: 1.00 }, { offset: 0.25, gain: 0.82 }, { offset: 0.50, gain: 0.68 }, { offset: 0.75, gain: 0.56 }]),
    "FL": Object.freeze([{ offset: 0.00, gain: 0.52 }, { offset: 0.16, gain: 1.00 }]),
    "DR": Object.freeze([{ offset: 0.00, gain: 0.38 }, { offset: 0.18, gain: 0.56 }, { offset: 0.38, gain: 1.00 }]),
    "ST": Object.freeze([{ offset: 0.00, gain: 1.00 }, { offset: 0.20, gain: 0.82 }, { offset: 0.40, gain: 0.66 }, { offset: 0.60, gain: 0.52 }, { offset: 0.80, gain: 0.40 }]),
    "UP": Object.freeze([{ offset: 0.00, gain: 0.42 }, { offset: 0.33, gain: 0.68 }, { offset: 0.66, gain: 1.00 }]),
    "DN": Object.freeze([{ offset: 0.00, gain: 1.00 }, { offset: 0.33, gain: 0.68 }, { offset: 0.66, gain: 0.42 }]),
    "GD": Object.freeze([{ offset: 0.00, gain: 0.32 }, { offset: 0.22, gain: 0.46 }, { offset: 0.46, gain: 1.00 }]),
    "LD": Object.freeze([{ offset: 0.00, gain: 1.00 }, { offset: 0.72, gain: 0.64 }]),
  });

  function midiU16BE(value) {
    return [(value >>> 8) & 0xFF, value & 0xFF];
  }

  function midiU32BE(value) {
    return [(value >>> 24) & 0xFF, (value >>> 16) & 0xFF, (value >>> 8) & 0xFF, value & 0xFF];
  }

  function midiVlq(value) {
    let n = Math.max(0, Math.round(Number(value) || 0));
    const bytes = [n & 0x7F];
    while ((n >>= 7) > 0) bytes.unshift((n & 0x7F) | 0x80);
    return bytes;
  }

  function midiTextBytes(text) {
    return Array.from(new TextEncoder().encode(String(text || "")));
  }

  function midiTrackChunk(events, trackName = "") {
    const sorted = [...events].sort((a, b) => a.tick - b.tick || (a.order || 0) - (b.order || 0));
    const data = [];
    let lastTick = 0;

    if (trackName) {
      const name = midiTextBytes(trackName);
      data.push(...midiVlq(0), 0xFF, 0x03, ...midiVlq(name.length), ...name);
    }

    for (const event of sorted) {
      const tick = Math.max(lastTick, Math.round(event.tick));
      data.push(...midiVlq(tick - lastTick), ...event.bytes);
      lastTick = tick;
    }
    data.push(...midiVlq(0), 0xFF, 0x2F, 0x00);
    return new Uint8Array([
      0x4D,0x54,0x72,0x6B,
      ...midiU32BE(data.length),
      ...data,
    ]);
  }

  function midiTempoTrack(tempo) {
    const bpm = Math.max(20, Math.min(300, Number(tempo) || 75));
    const micros = Math.round(60000000 / bpm);
    const bytes = [0xFF, 0x51, 0x03, (micros >>> 16) & 0xFF, (micros >>> 8) & 0xFF, micros & 0xFF];
    return midiTrackChunk([{ tick: 0, order: 0, bytes }], "Tempo");
  }

  function createMidiFile(trackChunks, tempo = state.project.tempo) {
    const tracks = [midiTempoTrack(tempo), ...trackChunks];
    const header = new Uint8Array([
      0x4D,0x54,0x68,0x64, 0x00,0x00,0x00,0x06,
      ...midiU16BE(tracks.length > 1 ? 1 : 0),
      ...midiU16BE(tracks.length),
      ...midiU16BE(MIDI_PPQ),
    ]);
    const length = header.length + tracks.reduce((sum, track) => sum + track.length, 0);
    const out = new Uint8Array(length);
    let offset = 0;
    out.set(header, offset); offset += header.length;
    for (const track of tracks) { out.set(track, offset); offset += track.length; }
    return out;
  }

  function midiSwingTick(positionSixteenths) {
    const position = Math.max(0, Number(positionSixteenths) || 0);
    const sixteenthIndex = Math.floor(position + 1e-9);
    const swing = Math.max(0, Math.min(100, Number(state.project.swing) || 0));
    const delay = sixteenthIndex % 2 === 1 ? 0.5 * (swing / 100) : 0;
    return Math.round((position + delay) * MIDI_SIXTEENTH_TICKS);
  }

  function drumMidiEvents(type, saved) {
    const grid = saved?.patterns?.[type];
    if (!Array.isArray(grid)) return [];
    const variation = saved?.variations?.[type] || {};
    const events = [];
    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 16; row++) {
        const stepState = grid?.[row]?.[col];
        if (stepState !== "on" && stepState !== "ghost") continue;
        const volumeRaw = variation?.volume?.[row]?.[col];
        const volumePercent = volumeRaw === null || volumeRaw === undefined || volumeRaw === ""
          ? 100 : Math.max(0, Math.min(100, Number(volumeRaw)));
        const baseVelocity = stepState === "ghost"
          ? MIDI_DRUM_GHOST_VELOCITY[type]
          : 110;
        const repeatsKey = variation?.repeats?.[row]?.[col];
        const repeats = MIDI_REPEAT_EVENTS[repeatsKey] || [{ offset: 0, gain: 1 }];
        const stepIndex = col * 16 + row;
        for (const repeat of repeats) {
          const startPos = stepIndex + Math.max(0, Number(repeat.offset) || 0);
          const startTick = midiSwingTick(startPos);
          const velocity = Math.max(1, Math.min(127, Math.round(baseVelocity * (volumePercent / 100) * Math.max(0, Number(repeat.gain) || 0))));
          const note = MIDI_DRUM_NOTES[type];
          const endTick = startTick + Math.max(12, Math.round(MIDI_SIXTEENTH_TICKS * 0.25));
          events.push({ tick: startTick, order: 1, bytes: [0x99, note, velocity] });
          events.push({ tick: endTick, order: 0, bytes: [0x89, note, 0] });
        }
      }
    }
    return events;
  }

  function buildDrumMidi(key) {
    const saved = readStoredJson("drumPhace.build5.state");
    if (!saved) return null;
    const types = key === "drums" ? ["kick", "snare", "hat"] : [key];
    const allEvents = types.flatMap(type => drumMidiEvents(type, saved));
    if (!allEvents.length) return null;
    const label = key === "drums" ? "Drums" : key.charAt(0).toUpperCase() + key.slice(1);
    return createMidiFile([midiTrackChunk(allEvents, label)]);
  }

  function parseMidiMelodyCell(value) {
    const text = String(value ?? "").trim();
    if (!text || text === "=") return [];
    const parts = text.split(",").slice(0, 2);
    if (parts.length >= 2) {
      return parts.map((part, substep) => {
        const trimmed = part.trim();
        if (!/^[+-]?\d+$/.test(trimmed)) return null;
        const semitone = Number(trimmed);
        return Number.isInteger(semitone) && semitone >= -24 && semitone <= 24
          ? { semitone, substep } : null;
      }).filter(Boolean);
    }
    if (!/^[+-]?\d+$/.test(text)) return [];
    const semitone = Number(text);
    return Number.isInteger(semitone) && semitone >= -24 && semitone <= 24
      ? [{ semitone, substep: 0 }] : [];
  }

  function melodyMidiTrack(phrase, saved) {
    const melody = saved?.melodies?.[phrase];
    if (!Array.isArray(melody)) return null;
    const chanceState = saved?.chance?.[phrase] || {};
    const rawEvents = [];
    for (let localIndex = 0; localIndex < 128; localIndex++) {
      const col = Math.floor(localIndex / 16);
      const row = localIndex % 16;
      const rawValue = String(melody?.[row]?.[col] ?? "").trim();
      for (const entry of parseMidiMelodyCell(rawValue)) {
        const rawVolume = chanceState?.volume?.[row]?.[col];
        const volumePercent = rawVolume === null || rawVolume === undefined || rawVolume === ""
          ? 100 : Math.max(0, Math.min(100, Number(rawVolume)));
        rawEvents.push({
          offset: localIndex + (entry.substep * 0.5),
          semitone: entry.semitone,
          subdivided: entry.substep > 0 || rawValue.includes(","),
          sourceIndex: localIndex,
          velocity: Math.max(1, Math.min(127, Math.round(127 * (volumePercent / 100)))),
        });
      }
    }
    if (!rawEvents.length) return null;
    rawEvents.sort((a, b) => a.offset - b.offset);

    const gates = [];
    for (let localIndex = 0; localIndex < 128; localIndex++) {
      const col = Math.floor(localIndex / 16);
      const row = localIndex % 16;
      const rawGate = chanceState?.gate?.[row]?.[col];
      if (rawGate === null || rawGate === undefined || rawGate === "") continue;
      gates.push({ sourceIndex: localIndex, offset: localIndex + (Math.max(1, Math.min(100, Number(rawGate))) / 100), percent: Math.max(1, Math.min(100, Number(rawGate))) });
    }

    const rootMidi = Math.max(0, Math.min(127, Math.round(Number(state.project.root) || 60)));
    const events = [];
    rawEvents.forEach((event, index) => {
      const nextEvent = rawEvents[index + 1];
      let releaseAt = nextEvent ? nextEvent.offset : 128;
      const sameCellGate = gates.find(g => g.sourceIndex === event.sourceIndex);
      if (sameCellGate && event.subdivided) {
        releaseAt = Math.min(releaseAt, event.offset + (0.5 * (sameCellGate.percent / 100)));
      } else {
        const explicitRelease = gates.find(g => g.offset > event.offset && g.offset <= releaseAt);
        if (explicitRelease) releaseAt = explicitRelease.offset;
      }
      const startTick = midiSwingTick(event.offset);
      const endTick = Math.max(startTick + 1, midiSwingTick(releaseAt));
      const note = Math.max(0, Math.min(127, rootMidi + event.semitone));
      events.push({ tick: startTick, order: 1, bytes: [0x90, note, event.velocity] });
      events.push({ tick: endTick, order: 0, bytes: [0x80, note, 0] });
    });
    return midiTrackChunk(events, `M${Number(phrase.slice(1))}`);
  }

  function buildMelodyMidi() {
    const saved = readStoredJson("interPhace.arpPhace.template.v1");
    if (!saved) return null;
    const tracks = ["p1", "p2", "p3", "p4"]
      .map(phrase => melodyMidiTrack(phrase, saved))
      .filter(Boolean);
    return tracks.length ? createMidiFile(tracks) : null;
  }

  function midiExportFiles(container, folder, projectName) {
    const keys = selectedMidiKeys(container);
    const files = [];
    for (const key of keys) {
      const data = key === "melody" ? buildMelodyMidi() : buildDrumMidi(key);
      if (!data) continue;
      files.push({ name: `${folder}midi/${projectName}-${key}.mid`, data });
    }
    return files;
  }

  function projectPhaceState() {
    const arp = readStoredJson("interPhace.arpPhace.template.v1") || {};
    const synthUi = readStoredJson("interPhace.synthPhace.ui.v3") || {};
    return {
      arpPhace: {
        styles: cloneJson(arp.styles || {}),
        chancePageIndex: cloneJson(arp.chancePageIndex || {}),
        b2GeneratorLayoutVersion: Number(arp.b2GeneratorLayoutVersion || 2),
        b2GeneratorState: cloneJson(arp.b2GeneratorState || [null, [50,50,50,50], [50,50,50,50], [50,50,50,50]]),
      },
      synthPhace: {
        eqRanges: cloneJson(synthUi.eqRanges || {}),
      },
    };
  }

  function projectDocument(patches) {
    const projectPatches = cloneJson(patches || {});
    // Full project state must preserve an existing synth patch even when every
    // audible source is currently at zero. "Silent" is a valid project state.
    const storedSynth = readStoredJson("interPhace.synthPhace.patch.v1");
    if (storedSynth && !projectPatches.synth) {
      projectPatches.synth = makePatch("synth", "synthPhace", storedSynth, {
        projectContext: { authoredScale: storedSynth.harmonyContext?.authoredScale || null },
      });
    }
    return {
      schema: PROJECT_EXPORT_SCHEMA,
      version: PROJECT_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      project: cloneJson(state.project),
      mixer: cloneJson(state.mixer),
      muted: cloneJson(state.muted),
      childSettings: cloneJson(state.child),
      sequencer: cloneJson(state.sequencer),
      phaceState: projectPhaceState(),
      ui: { button: state.button, mixerPage: state.b2Page, settingsPage: state.b5Page },
      patches: projectPatches,
    };
  }

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i += 1) {
      crc ^= bytes[i];
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function pushU16(target, value) {
    target.push(value & 0xFF, (value >>> 8) & 0xFF);
  }

  function pushU32(target, value) {
    target.push(
      value & 0xFF,
      (value >>> 8) & 0xFF,
      (value >>> 16) & 0xFF,
      (value >>> 24) & 0xFF,
    );
  }

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      day: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    };
  }

  function createStoreZip(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    const stamp = dosDateTime();
    let offset = 0;

    for (const file of files) {
      const nameBytes = encoder.encode(file.name);
      const dataBytes = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
      const crc = crc32(dataBytes);

      const local = [];
      pushU32(local, 0x04034B50);
      pushU16(local, 20);
      pushU16(local, 0x0800);
      pushU16(local, 0);
      pushU16(local, stamp.time);
      pushU16(local, stamp.day);
      pushU32(local, crc);
      pushU32(local, dataBytes.length);
      pushU32(local, dataBytes.length);
      pushU16(local, nameBytes.length);
      pushU16(local, 0);

      const localBlob = new Uint8Array(local.length + nameBytes.length + dataBytes.length);
      localBlob.set(local, 0);
      localBlob.set(nameBytes, local.length);
      localBlob.set(dataBytes, local.length + nameBytes.length);
      localParts.push(localBlob);

      const central = [];
      pushU32(central, 0x02014B50);
      pushU16(central, 20);
      pushU16(central, 20);
      pushU16(central, 0x0800);
      pushU16(central, 0);
      pushU16(central, stamp.time);
      pushU16(central, stamp.day);
      pushU32(central, crc);
      pushU32(central, dataBytes.length);
      pushU32(central, dataBytes.length);
      pushU16(central, nameBytes.length);
      pushU16(central, 0);
      pushU16(central, 0);
      pushU16(central, 0);
      pushU16(central, 0);
      pushU32(central, 0);
      pushU32(central, offset);

      const centralBlob = new Uint8Array(central.length + nameBytes.length);
      centralBlob.set(central, 0);
      centralBlob.set(nameBytes, central.length);
      centralParts.push(centralBlob);
      offset += localBlob.length;
    }

    const centralOffset = offset;
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = [];
    pushU32(end, 0x06054B50);
    pushU16(end, 0);
    pushU16(end, 0);
    pushU16(end, files.length);
    pushU16(end, files.length);
    pushU32(end, centralSize);
    pushU32(end, centralOffset);
    pushU16(end, 0);

    return new Blob([...localParts, ...centralParts, new Uint8Array(end)], {
      type: "application/zip",
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }


  function audioBufferToWavBytes(buffer) {
    const channels = Math.max(1, Math.min(2, buffer.numberOfChannels));
    const frames = buffer.length;
    const bytes = new Uint8Array(44 + frames * channels * 2);
    const view = new DataView(bytes.buffer);
    const put = (o, str) => { for (let i=0;i<str.length;i++) bytes[o+i]=str.charCodeAt(i); };
    put(0,"RIFF"); view.setUint32(4,36+frames*channels*2,true); put(8,"WAVE");
    put(12,"fmt "); view.setUint32(16,16,true); view.setUint16(20,1,true);
    view.setUint16(22,channels,true); view.setUint32(24,buffer.sampleRate,true);
    view.setUint32(28,buffer.sampleRate*channels*2,true); view.setUint16(32,channels*2,true);
    view.setUint16(34,16,true); put(36,"data"); view.setUint32(40,frames*channels*2,true);
    let o=44;
    for (let i=0;i<frames;i++) for (let c=0;c<channels;c++) {
      const x=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]||0));
      view.setInt16(o, x<0 ? x*32768 : x*32767, true); o+=2;
    }
    return bytes;
  }

  function midiNoteName(note) {
    const names=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    const n=Math.round(Number(note)||60);
    return `${names[((n%12)+12)%12]}${Math.floor(n/12)-1}`;
  }

  function constructionScaleNotes(rootNote, scaleIndex) {
    const intervals = [
      [0,2,4,5,7,9,11], [0,2,3,5,7,8,10], [0,2,3,5,7,9,10],
      [0,2,4,7,9], [0,3,5,7,10], [0,2,3,7,8]
    ][Math.max(0,Math.min(5,Math.round(Number(scaleIndex)||0)))] || [0,2,4,5,7,9,11];
    const out=[];
    for (let oct=-2;oct<=2;oct++) for (const semitone of intervals) {
      const n=Math.round(rootNote)+oct*12+semitone;
      if (n>=0 && n<=127 && !out.includes(n)) out.push(n);
    }
    return out.sort((a,b)=>a-b);
  }


  async function assembleConstructionStem(barBuffers, secondsPerBar, totalBars) {
    const sampleRate = 48000;
    let maxTail=0;
    for(const item of barBuffers) if(item?.buffer) maxTail=Math.max(maxTail, item.buffer.duration-secondsPerBar);
    const ctx=new OfflineAudioContext(2,Math.max(1,Math.ceil((totalBars*secondsPerBar+Math.max(0,maxTail)+0.05)*sampleRate)),sampleRate);
    for(const item of barBuffers) {
      if(!item?.buffer) continue;
      const src=ctx.createBufferSource(); src.buffer=item.buffer; src.connect(ctx.destination);
      src.start(Math.max(0,item.row*secondsPerBar));
    }
    return ctx.startRendering();
  }

  async function repeatBedStem(buffer, totalSeconds, { leadInSeconds = 0, fadeInSeconds = 0 } = {}) {
    const sampleRate=buffer.sampleRate||48000;
    const ctx=new OfflineAudioContext(Math.min(2,buffer.numberOfChannels),Math.max(1,Math.ceil(totalSeconds*sampleRate)),sampleRate);
    const src=ctx.createBufferSource();
    const entrance=ctx.createGain();
    src.buffer=buffer; src.loop=true; src.connect(entrance); entrance.connect(ctx.destination);

    const lead=Math.max(-10,Math.min(10,Number(leadInSeconds)||0));
    const fade=Math.max(0,Math.min(10,Number(fadeInSeconds)||0));
    if(lead>=0){
      const start=Math.min(totalSeconds,lead);
      if(fade>0){
        entrance.gain.setValueAtTime(0,start);
        entrance.gain.linearRampToValueAtTime(1,Math.min(totalSeconds,start+fade));
      } else entrance.gain.setValueAtTime(1,start);
      if(start<totalSeconds){ src.start(start,0); src.stop(totalSeconds); }
    } else {
      const elapsed=-lead;
      const offset=buffer.duration>0 ? elapsed%buffer.duration : 0;
      const initial=fade>0 ? Math.min(1,elapsed/fade) : 1;
      entrance.gain.setValueAtTime(initial,0);
      if(fade>elapsed) entrance.gain.linearRampToValueAtTime(1,Math.min(totalSeconds,fade-elapsed));
      src.start(0,offset); src.stop(totalSeconds);
    }
    return ctx.startRendering();
  }


  function countAudioConstructionFiles(container) {
    const selected = new Set(
      [...container.querySelectorAll('.utilityChoice.is-selected[data-export-group="wav"]')]
        .map(b => b.dataset.exportKey)
    );
    if (!selected.size) return 0;

    const bars = currentRenderColumns();
    const drumState = readStoredJson("drumPhace.build5.state") || {};
    const arpState = readStoredJson("interPhace.arpPhace.template.v1") || {};
    const seq = interSequencerInfo();
    let total = 0;

    const drumTypes = selected.has("drums")
      ? ["kick","snare","hat"]
      : ["kick","snare","hat"].filter(type => selected.has(type));

    for (const type of drumTypes) {
      total += 2; // normal + ghost one-shots
      const grid = drumState.patterns?.[type] || [];
      for (let bar = 0; bar < bars; bar++) {
        if (grid.some(row => row?.[bar] === "on" || row?.[bar] === "ghost")) total += 1;
      }
      if (seq.active) {
        const col = type === "kick" ? 1 : type === "snare" ? 2 : 3;
        const hasTrack = state.sequencer.slice(0, seq.bars).some(row => !!parseSequencerCell(row?.[col], col));
        if (hasTrack) total += 1;
      }
    }

    if (selected.has("noise")) {
      total += 1;
      if (seq.active) total += 1;
    }
    if (selected.has("drone")) {
      total += 1;
      if (seq.active) total += 1;
    }

    if (selected.has("melody")) {
      for (let phrase = 1; phrase <= 4; phrase++) {
        const grid = arpState.melodies?.[`p${phrase}`] || [];
        for (let bar = 0; bar < bars; bar++) {
          if (grid.some(row => typeof row?.[bar] === "string" && row[bar].trim() !== "")) total += 1;
        }
      }
      if (seq.active && seq.hasMelody) total += 1;
    }

    if (selected.has("synth")) {
      const root = Math.round(Number(state.project.root) || 60);
      total += 4; // root dry, root wet, no-harmonies, isolated noise
      total += constructionScaleNotes(root, state.project.scale).length * 2;
    }

    return total;
  }

  async function audioConstructionExportFiles(container, folder, projectName, onProgress = null) {
    const selected = new Set(
      [...container.querySelectorAll('.utilityChoice.is-selected[data-export-group="wav"]')]
        .map(b => b.dataset.exportKey)
    );
    if (!selected.size) return [];
    const needDrum = ["drums","kick","snare","hat"].some(k=>selected.has(k));
    const needSynth = selected.has("synth");
    const needMelody = selected.has("melody");
    const needNoise = selected.has("noise");
    const needDrone = selected.has("drone");
    const {drumAPI,synthAPI,arpAPI,noiseAPI,droneAPI}=await getGlobalRenderAPIs({
      includeDrum:needDrum, includeSynth:(needSynth||needMelody), includeArp:needMelody,
      includeNoise:needNoise, includeDrone:needDrone
    });
    const files=[];
    const tempo=Math.round(Number(state.project.tempo)||75);
    const bars=currentRenderColumns();
    const base=`${folder}audio/`;
    const totalFiles = countAudioConstructionFiles(container);
    let completedFiles = 0;
    const report = (label) => {
      try { onProgress?.(completedFiles, totalFiles, label); } catch (_) {}
    };

    const add=(name,buffer,label=name)=>{
      if(!buffer?.length) return false;
      files.push({name:`${base}${name}`,data:audioBufferToWavBytes(buffer)});
      completedFiles += 1;
      report(label);
      return true;
    };

    // Individual drum samples and construction bars. No following-bar events are
    // scheduled; the WAV is allowed to continue only for the final hit's natural tail.
    if (needDrum && drumAPI) {
      const types=selected.has("drums") ? ["kick","snare","hat"] :
        ["kick","snare","hat"].filter(k=>selected.has(k));
      for (const type of types) {
        for (const ghost of [false,true]) {
          const label = `${type[0].toUpperCase()}${type.slice(1)} ${ghost ? "ghost" : "normal"}`;
          report(label);
          const r=await drumAPI.renderOneShot({activeType:type,ghost});
          add(`${type}-${ghost?"ghost":"normal"}.wav`,r.buffer,label);
        }
        for(let bar=1;bar<=bars;bar++) {
          const label = `${type[0].toUpperCase()}${type.slice(1)} bar ${bar}`;
          report(label);
          const r=await drumAPI.renderConstructionBar({activeType:type,sourceBar:bar,tempo,swing:state.project.swing});
          // Empty bars are harmless but construction kits should not contain blank files.
          let peak=0; for(let c=0;c<r.buffer.numberOfChannels;c++){const a=r.buffer.getChannelData(c);for(let i=0;i<a.length;i++)peak=Math.max(peak,Math.abs(a[i]));}
          if(peak>1e-5) add(`${type}-bar${bar}-${tempo}bpm.wav`,r.buffer,label);
        }
      }
    }

    if (needNoise && noiseAPI) {
      report("Noise loop");
      const duration=bedExportLengthSeconds(state.child.noiseExportLength);
      const r=noiseAPI.renderBed({duration});
      add(`noise-loop-${Math.round(r.loopSeconds)}s.wav`,r.buffer,"Noise loop");
    }
    if (needDrone && droneAPI) {
      report("Drone loop");
      const duration=bedExportLengthSeconds(state.child.droneExportLength);
      const r=droneAPI.renderBed({duration});
      add(`drone-loop-${Math.round(r.loopSeconds)}s.wav`,r.buffer,"Drone loop");
    }

    if (needMelody && arpAPI) {
      for(let phrase=1;phrase<=4;phrase++) for(let bar=1;bar<=bars;bar++) {
        const label = `Melody ${phrase} bar ${bar}`;
        report(label);
        const r=await arpAPI.render.renderSourceBar({phrase:`p${phrase}`,sourceBar:bar,preserveTail:true});
        if((r?.eventCount||0)>0) add(`M${phrase}-bar${bar}-${tempo}bpm.wav`,r.buffer,label);
      }
    }

    if (needSynth && synthAPI?.renderConstructionNote) {
      const root=Math.round(Number(state.project.root)||60);
      const gate=Math.max(0.25,Number(state.settings?.synthAuditionLength)||2);
      for (const dry of [true,false]) {
        const label = `Synth root ${dry ? "dry" : "wet"}`;
        report(label);
        const r=await synthAPI.renderConstructionNote({midiNote:root,gateSeconds:gate,tempo,dry,effectsReleaseMs:state.child.synthEffectsRelease});
        add(`synth-root-${midiNoteName(root)}-${dry?"dry":"wet"}.wav`,r.buffer,label);
      }
      report("Synth root no harmonies");
      const noH=await synthAPI.renderConstructionNote({midiNote:root,gateSeconds:gate,tempo,noHarmonies:true,effectsReleaseMs:state.child.synthEffectsRelease});
      add(`synth-root-${midiNoteName(root)}-no-harmonies-wet.wav`,noH.buffer,"Synth root no harmonies");
      report("Synth isolated noise");
      const noise=await synthAPI.renderConstructionNote({midiNote:root,gateSeconds:gate,tempo,noiseOnly:true,effectsReleaseMs:state.child.synthEffectsRelease});
      add(`synth-noise-isolated.wav`,noise.buffer,"Synth isolated noise");
      for(const note of constructionScaleNotes(root,state.project.scale)) for(const dry of [true,false]) {
        const label = `Synth ${midiNoteName(note)} ${dry ? "dry" : "wet"}`;
        report(label);
        const r=await synthAPI.renderConstructionNote({midiNote:note,gateSeconds:gate,tempo,dry,effectsReleaseMs:state.child.synthEffectsRelease});
        add(`synth-${midiNoteName(note)}-${dry?"dry":"wet"}.wav`,r.buffer,label);
      }
    }

    // Full interPhace sequencer arrangement, exported as independent track stems.
    // These are arrangement stems, not replacement "full melody" or "full drum" loops.
    const seq=interSequencerInfo();
    if(seq.active) {
      const secondsPerBar=(60/tempo)*4;
      if(needDrum && drumAPI) {
        const trackMeta=[null,{type:"kick",prefix:"K"},{type:"snare",prefix:"S"},{type:"hat",prefix:"H"}];
        for(let col=1;col<=3;col++) {
          const type=trackMeta[col].type;
          if(!(selected.has("drums")||selected.has(type))) continue;
          const label = `Sequencer ${type}`;
          report(label);
          const pieces=[];
          for(let row=0;row<seq.bars;row++) {
            const parsed=parseSequencerCell(state.sequencer[row][col],col); if(!parsed) continue;
            const r=await drumAPI.renderConstructionBar({activeType:type,sourceBar:parsed.bar,tempo,swing:state.project.swing});
            pieces.push({row,buffer:r.buffer});
          }
          if(pieces.length) add(`sequencer-${type}-${tempo}bpm.wav`,await assembleConstructionStem(pieces,secondsPerBar,seq.bars),label);
        }
      }
      if(needMelody && arpAPI && synthAPI && seq.hasMelody) {
        const melodyEvents=[];
        for(let row=0;row<seq.bars;row++) {
          const parsed=parseSequencerCell(state.sequencer[row][0],0); if(!parsed) continue;
          const snapshot=arpAPI.state.globalMelodyBarSnapshot(parsed.phrase,parsed.bar);
          if(!snapshot?.events?.length) continue;
          const barStart=row*secondsPerBar;
          for(const event of snapshot.events) melodyEvents.push({
            ...event,
            offsetSeconds:barStart+Math.max(0,Number(event.offsetSeconds)||0),
          });
        }
        if(melodyEvents.length){
          report("Sequencer melody");
          const r=await synthAPI.renderArpPerformance({
            events:melodyEvents,
            loopSeconds:seq.bars*secondsPerBar,
            effectsReleaseMs:state.child.arpEffectsRelease,
            tempo,
          });
          if(r?.buffer) add(`sequencer-melody-${tempo}bpm.wav`,r.buffer,"Sequencer melody");
        }
      }
      const seqSeconds=seq.bars*secondsPerBar;
      if(needNoise && noiseAPI) {
        report("Sequencer noise");
        const r=noiseAPI.renderBed({duration:bedExportLengthSeconds(state.child.noiseExportLength)});
        add(`sequencer-noise-${tempo}bpm.wav`,await repeatBedStem(r.buffer,seqSeconds,{leadInSeconds:state.child.noiseLeadIn,fadeInSeconds:state.child.noiseFadeIn}),"Sequencer noise");
      }
      if(needDrone && droneAPI) {
        report("Sequencer drone");
        const r=droneAPI.renderBed({duration:bedExportLengthSeconds(state.child.droneExportLength)});
        add(`sequencer-drone-${tempo}bpm.wav`,await repeatBedStem(r.buffer,seqSeconds,{leadInSeconds:state.child.droneLeadIn,fadeInSeconds:state.child.droneFadeIn}),"Sequencer drone");
      }
    }

    return files;
  }



  // Build 483: M8 exporter based on the user's current-firmware DEFAULT.m8s template.
  // Firmware 6.x project layout. M8 UI numbers below are hexadecimal.
  // Exact current-firmware INIT project supplied by the user.
  // Export starts from this file and changes only interPhace-owned fields.
  const M8_DEFAULT_PROJECT_B64 = "TThWRVJTSU9OAGIGAAAvU29uZ3MvAEVBVFMvAFZPD2WrOUywSi3msb8xD1o2F9yGI6OUPQ94wgJV98+eLsnrgKBX9+fUlKICrEQdGr2QkLN3/+pKEdUs2EyBST76meXL6pBl7ILfVjKN4zlJXUZa61vegEokwRKzzE43Ga+P2H2GWC53rsq71WChhaVZwgAAAJZCAERFRkFVTFQAAAAAAAAAAAAJAQARCwECAwQFBgcIAAAAAAAAAAABAQAAaQEAAAAAAAAAAAAAAAAAAADgAODg4ODg4ODg4ODgAP8AAAAAAAAAAAAAgAAAABAAADYqOCg3KTkn//////////8GBv//////////////////Bgb//////////////////wYG//////////////////8GBv//////////////////Bgb//////////////////wYG//////////////////8GBv//////////////////Bgb//////////////////wYG//////////////////8GBv//////////////////Bgb//////////////////wYG//////////////////8GBv//////////////////Bgb//////////////////wYG//////////////////8GBv//////////////////Bgb//////////////////wYG//////////////////8GBv//////////////////Bgb//////////////////wYG//////////////////8GBv//////////////////Bgb//////////////////wYG//////////////////8GBv//////////////////Bgb//////////////////wYG//////////////////8GBv//////////////////Bgb//////////////////wYG//////////////////8GBv//////////////////Gio6Slpqeor////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////h4uTo/vD//wECBAgP////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wCA////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD///8T//8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD///8E//8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/////AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AA8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8ADwAAAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AA8AAAAAAAAA/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8ADwAAAAAAAAAAAAAAAAAAAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wAPAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8AEQD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wAhAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/ADEA/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8AQQD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wBRAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AGEA/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8AcQD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wCBAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wAAAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AAAAAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wAAAAAAAAAAAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AAAAAAAAAAAA/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wDwAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/gD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAQAAgAAgAAAAAP8AAACAwAAAAAAA////////////////////////////////////gAD/AACA/wD/AACA/zD/AAAQ/zD/AAAQ/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AQH//////////////////////////////////////////////////////////////4D///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////8BAf//////////////////////////////////////////////////////////////gP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////wEB//////////////////////////////////////////////////////////////+A////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAnpAgP8AnLc2QP8wMID/APYQ4P/AEP//AICAAHUtA9pzP/NU4kZ4lcLq1OFd7zqcauNdWpqf+wD1DeF4r2r/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/w8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABDSFJPTUFUSUP/////////AAAAALUKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATUFKT1L//////////////wAAAACtBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE1JTk9S//////////////8AAAAArQYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABET1JJQU7/////////////AAAAANUKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATFlESUFO/////////////wAAAAC1BgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE1JWE9MWURJQU7///////8AAAAAawUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMT0NSSUFO////////////AAAAAJUCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUEVOVEFUT05JQ////////wAAAACpBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE1JTk9SIFBFTlRBVE9OSUMAAAAAnQIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABNQUpPUiBCTFVFU///////AAAAAOkEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATUlOT1IgQkxVRVP//////wAAAADNBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFJPTUFOSUFOIE1JTk9S//8AAAAAjQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABISVJBSk9TSEn/////////AAAAAKMBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAS1VNT0lKT1NISf///////wAAAACjBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAElOLVNFTv////////////8AAAAAYwQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABJV0FUT///////////////AAAAAAFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgFkAAAAMgLoAwAAMgSIEwAAMgBkAAAAMgLoAwAAMgSIEwAAMgD0AQAAMgLoAwAAMgUQJwAAMgDIAAAAMgLoAwAAMgVgIgAAMgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
  function m8DefaultProjectBytes() {
    const raw=atob(M8_DEFAULT_PROJECT_B64), bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
    return bytes;
  }

  const M8 = Object.freeze({
    SIZE: 112582,
    META: 14, MIXER: 206, GROOVE: 238, SONG: 750, PHRASES: 2798,
    CHAINS: 39518, TABLES: 47678, INSTRUMENTS: 80446,
    FX_CHA: 0x01, FX_RET: 0x08, FX_OFF: 0x1A, FX_SLI: 0xA6,
    NOTE_C4: 0x24,
  });

  function m8WriteString(bytes, offset, size, text) {
    bytes.fill(0, offset, offset + size);
    const enc = new TextEncoder().encode(String(text || ""));
    bytes.set(enc.slice(0, Math.max(0, size - 1)), offset);
  }
  function m8WriteFloat(bytes, offset, value) {
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setFloat32(offset, Number(value) || 0, true);
  }

  function m8BaseProject(projectName, tempo) {
    const bytes=m8DefaultProjectBytes();
    if(bytes.length!==M8.SIZE) throw new Error(`Unexpected DEFAULT.m8s size: ${bytes.length}`);
    const safe=String(projectName||"INTERPHACE").replace(/[^A-Za-z0-9 _-]/g,"_");
    m8WriteString(bytes,M8.META,128,`/Bundles/${safe}/`);
    m8WriteFloat(bytes,M8.META+129,Math.max(20,Math.min(300,Number(tempo)||75)));
    m8WriteString(bytes,M8.META+134,12,safe.toUpperCase().replace(/[^A-Z0-9_-]/g,"_").slice(0,11));

    // Clear only fields that this exporter owns. All timing, groove, mixer,
    // master, MIDI, FX-global and reserved bytes remain exactly as DEFAULT.m8s.
    [0,1,2,4].forEach(track=>{ bytes[M8.SONG+track]=0xFF; });
    [0x1A,0x2A,0x3A,0x5A].forEach(chain=>{
      for(let step=0;step<16;step++){ const o=M8.CHAINS+chain*32+step*2; bytes[o]=0xFF; bytes[o+1]=0; }
    });
    const phraseStarts=[0x11,0x21,0x31,0x51];
    for(const first of phraseStarts) for(let n=0;n<8;n++) for(let step=0;step<16;step++){
      const o=M8.PHRASES+(first+n)*144+step*9;
      bytes[o]=0xFF; bytes[o+1]=0xFF; bytes[o+2]=0xFF;
      bytes[o+3]=0xFF; bytes[o+4]=0; bytes[o+5]=0xFF; bytes[o+6]=0; bytes[o+7]=0xFF; bytes[o+8]=0;
    }
    for(let i=0;i<4;i++){
      const o=M8.INSTRUMENTS+i*215;
      bytes.fill(0,o,o+215); bytes[o]=0xFF;
    }
    return bytes;
  }

  function m8Fx(stepOffset, slot, key, value, bytes) {
    const o=stepOffset+3+slot*2; bytes[o]=key; bytes[o+1]=value;
  }
  function m8PhraseStep(bytes, phrase, step, {note=M8.NOTE_C4,velocity=0x7F,instrument=0,fx=[]}={}) {
    const o=M8.PHRASES+phrase*144+step*9;
    bytes[o]=note; bytes[o+1]=velocity; bytes[o+2]=instrument;
    for(let i=0;i<3;i++){ bytes[o+3+i*2]=0xFF; bytes[o+4+i*2]=0; }
    fx.slice(0,3).forEach((x,i)=>m8Fx(o,i,x[0],x[1],bytes));
  }
  function m8SetChain(bytes, chain, phrases, bars) {
    for(let i=0;i<bars;i++){ const o=M8.CHAINS+chain*32+i*2; bytes[o]=phrases[i]; bytes[o+1]=0; }
  }
  function m8Sampler(bytes,index,name,path,{fileSlices=false}={}) {
    const o=M8.INSTRUMENTS+index*215;

    // Build 481: common sampler defaults copied from the three matching
    // sampler blocks in the user's hardware-created PHACE TEST 6.6.2A project.
    // Name and path are overwritten below. SLI FILE markers work with slice=00
    // in that reference project, so we no longer write our guessed 01 value.
    bytes.fill(0,o,o+215);
    const head=[
      0x02,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0x01,0x01,0x00,
      0x00,0x80,0x00,0x00,0x00,0x00,0xFF,0x00,0x00,0xFF,0x00,0x00,0x00,0x80,0xC0,0x00,
      0x00,0x00,0x00,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
      0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0x80,0x00,
      0xFF,0x00,0x00,0x80,0xFF,0x00,0xFF,0x00,0x00,0x80,0xFF,0x30,0xFF,0x00,0x00,0x10,
      0xFF,0x30,0xFF,0x00,0x00,0x10,0xFF
    ];
    bytes.set(head,o);
    m8WriteString(bytes,o+1,12,name);
    bytes[o+19]=0x00;
    m8WriteString(bytes,o+87,128,path);
  }

  // Build 482: known-good 6.x standalone sampler .m8i template.
  // The bundle exports one .m8i for each interPhace sampler instrument.
  const M8I_SAMPLER_TEMPLATE_B64 = "TThWRVJTSU9OAAEGABACAAAAAAAAAAAAAAAAAQEAAIAAAAAA/wAA/wAAAIDAAAAAAP///////////////////////////////////wEA/wAAgP8A/wAAgP8w/wAAEP8w/wAAEP9TYW1wbGVzLzAwMV9raWNrIDAyLndhdgAvTG8tRmkgRHJ1bSBLaXQva2ljay9raWNrIDAyLndhdgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8AAP//AP8A/wAA//8A/wD/AAD//wD/AP8A";
  function m8SamplerInstrumentFile(name,path) {
    const raw=atob(M8I_SAMPLER_TEMPLATE_B64), bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
    // Instrument data begins at byte 14 in .m8i files.
    m8WriteString(bytes,15,12,name);
    bytes[14+19]=0x00; // FILE slice mode / hardware reference value
    m8WriteString(bytes,14+87,128,path);
    return bytes;
  }

  function m8ChanceByte(raw) {
    if(raw===null||raw===undefined||raw==="") return null;
    const p=Math.max(0,Math.min(100,Number(raw)));
    const levels=[0,6,13,20,26,33,40,46,53,60,66,73,80,86,93,100];
    let n=0,b=Infinity; levels.forEach((v,i)=>{const d=Math.abs(v-p);if(d<b){b=d;n=i;}});
    return (n<<4)|n;
  }
  function m8Velocity(raw, ghost=false) {
    if(raw===null||raw===undefined||raw==="") return ghost ? 0x46 : 0x7F;
    const p=Math.max(0,Math.min(100,Number(raw)));
    return Math.max(1,Math.min(127,Math.floor(127*p/100)));
  }

  function m8WavWithCueMarkers(buffers) {
    if(!buffers.length) return null;
    const sr=buffers[0]?.sampleRate||48000, ch=Math.min(2,Math.max(...buffers.map(b=>b?.numberOfChannels||1)));
    const audioFrames=Math.max(1,Math.round(sr*2));
    const slot=Math.max(1,Math.round(sr*3));
    const frames=slot*buffers.length, dataBytes=frames*ch*2;
    const cueDataBytes=4+buffers.length*24, cueChunkBytes=8+cueDataBytes;
    const smplDataBytes=60, smplChunkBytes=8+smplDataBytes;
    const out=new Uint8Array(12+24+cueChunkBytes+8+dataBytes+smplChunkBytes+cueChunkBytes), v=new DataView(out.buffer);
    const put=(o,t)=>{for(let i=0;i<t.length;i++)out[o+i]=t.charCodeAt(i);};
    put(0,"RIFF"); v.setUint32(4,out.length-8,true); put(8,"WAVE");
    put(12,"fmt "); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,ch,true);
    v.setUint32(24,sr,true); v.setUint32(28,sr*ch*2,true); v.setUint16(32,ch*2,true); v.setUint16(34,16,true);

    const cue1=36; put(cue1,"cue "); v.setUint32(cue1+4,cueDataBytes,true); v.setUint32(cue1+8,buffers.length,true);
    buffers.forEach((_,i)=>{
      const o=cue1+12+i*24,pos=i*slot;
      v.setUint32(o,i+1,true); v.setUint32(o+4,pos,true); put(o+8,"data");
      v.setUint32(o+12,0,true); v.setUint32(o+16,0,true); v.setUint32(o+20,pos,true);
    });

    const dataO=cue1+cueChunkBytes; put(dataO,"data"); v.setUint32(dataO+4,dataBytes,true);
    let o=dataO+8;
    for(const b of buffers) for(let i=0;i<slot;i++) for(let c=0;c<ch;c++){
      const a=b?.getChannelData?.(Math.min(c,(b?.numberOfChannels||1)-1));
      const x=Math.max(-1,Math.min(1,(i<audioFrames?a?.[i]:0)||0));
      v.setInt16(o,x<0?x*32768:x*32767,true); o+=2;
    }

    // Match the M8-created sliced WAV: 60-byte smpl chunk followed by a
    // second M8 cue table whose IDs are zero-based and whose chunk ID is atad.
    const smplO=dataO+8+dataBytes; put(smplO,"smpl"); v.setUint32(smplO+4,smplDataBytes,true);
    v.setUint32(smplO+8+12,60,true); // MIDI unity note, matching reference file
    v.setUint32(smplO+8+28,1,true);  // one sampler loop descriptor
    v.setUint32(smplO+8+32,24,true); // sampler data size used by reference

    const cue2=smplO+smplChunkBytes; put(cue2,"cue "); v.setUint32(cue2+4,cueDataBytes,true); v.setUint32(cue2+8,buffers.length,true);
    buffers.forEach((_,i)=>{
      const q=cue2+12+i*24,pos=i*slot;
      v.setUint32(q,i,true); v.setUint32(q+4,0,true); put(q+8,"atad");
      v.setUint32(q+12,0,true); v.setUint32(q+16,0,true); v.setUint32(q+20,pos,true);
    });
    return out;
  }

  async function m8CompositePairBuffer(first, second, gatePercent, tempo) {
    if(!first||!second) return first||second||null;
    const sr=first.sampleRate||48000, sixteenth=60/(Math.max(20,Number(tempo)||75)*4), half=sixteenth/2;
    const gateHalf=Math.max(0.005,half*Math.max(0,Math.min(100,Number(gatePercent)||100))/100);
    const length=Math.max(first.length,Math.ceil((half+Math.max(gateHalf,second.duration||0.01))*sr));
    const ctx=new OfflineAudioContext(2,Math.max(1,length),sr);
    const a=ctx.createBufferSource(), b=ctx.createBufferSource(); a.buffer=first; b.buffer=second; a.connect(ctx.destination); b.connect(ctx.destination);
    a.start(0); a.stop(Math.min(half,gateHalf)); b.start(half); b.stop(Math.min(length/sr,half+gateHalf));
    return ctx.startRendering();
  }

  async function m8ExportFiles(projectName){
    const tempo=Math.round(Number(state.project.tempo)||75), bars=currentRenderColumns();
    const bytes=m8BaseProject(projectName,tempo), files=[];
    const drum=readStoredJson("drumPhace.build5.state")||{}, arp=readStoredJson("interPhace.arpPhace.template.v1")||{};
    const apis=await getGlobalRenderAPIs({includeDrum:true,includeSynth:true,includeArp:true,includeNoise:false,includeDrone:false});
    const base=`${projectName}/`, sampleDir=`Samples/`, sampleRefDir=`Samples/`, instrumentDir=`Instruments/`;
    const defs=[{type:"kick",inst:0,chain:0x1A,p0:0x11},{type:"snare",inst:1,chain:0x2A,p0:0x21},{type:"hat",inst:2,chain:0x3A,p0:0x31}];
    for(const d of defs){
      const one=await apis.drumAPI?.renderOneShot({activeType:d.type,ghost:false});
      if(one?.buffer) files.push({name:`${base}${sampleDir}${d.type}-normal.wav`,data:audioBufferToWavBytes(one.buffer)});
      m8Sampler(bytes,d.inst,d.type.toUpperCase(),`${sampleRefDir}${d.type}-normal.wav`);
      files.push({name:`${base}${instrumentDir}${String(d.inst).padStart(2,"0")}.m8i`,data:m8SamplerInstrumentFile(d.type.toUpperCase(),`${sampleRefDir}${d.type}-normal.wav`)});
      const phrases=[], grid=drum.patterns?.[d.type]||[], vari=drum.variations?.[d.type]||{};
      for(let bar=0;bar<bars;bar++){
        let active=false; for(let row=0;row<16;row++) if(grid?.[row]?.[bar]==="on"||grid?.[row]?.[bar]==="ghost") active=true;
        const ph=active?d.p0+bar:0x00; phrases.push(ph); if(!active) continue;
        for(let row=0;row<16;row++){
          const cell=grid?.[row]?.[bar]; if(cell!=="on"&&cell!=="ghost") continue;
          const fx=[], cha=m8ChanceByte(vari.chance?.[row]?.[bar]); if(cha!==null) fx.push([M8.FX_CHA,cha]);
          if(vari.repeats?.[row]?.[bar]) fx.push([M8.FX_RET,0x21]);
          m8PhraseStep(bytes,ph,row,{velocity:m8Velocity(vari.volume?.[row]?.[bar],cell==="ghost"),instrument:d.inst,fx});
        }
      }
      m8SetChain(bytes,d.chain,phrases,bars); bytes[M8.SONG+d.inst]=d.chain;
    }

    // Melody 1: full valid scale range, one FILE-sliced WAV. Normal notes occupy
    // stable slices first; any two-note 32nd cells get additional composite slices.
    const mel=arp.melodies?.p1||[], chance=arp.chance?.p1||{}, root=Math.round(Number(state.project.root)||60);
    const notes=constructionScaleNotes(root,state.project.scale), noteMap=new Map(notes.map((n,i)=>[n,i]));
    let maxGate=0; for(let r=0;r<16;r++)for(let b=0;b<bars;b++){const g=Number(chance.gate?.[r]?.[b]);if(Number.isFinite(g))maxGate=Math.max(maxGate,g);} if(!maxGate)maxGate=100;
    const gateSeconds=(60/tempo/4)*(maxGate/100), rendered=[], bufferByNote=new Map();
    if(apis.synthAPI?.renderConstructionNote) for(const n of notes){
      const x=await apis.synthAPI.renderConstructionNote({midiNote:n,gateSeconds,tempo,dry:false,effectsReleaseMs:state.child.arpEffectsRelease});
      if(x?.buffer){ rendered.push(x.buffer); bufferByNote.set(n,x.buffer); }
    }
    const pairSliceMap=new Map();
    for(let bar=0;bar<bars;bar++) for(let row=0;row<16;row++){
      const entries=parseMidiMelodyCell(mel?.[row]?.[bar]); if(entries.length<2) continue;
      const actuals=entries.map(e=>Math.max(0,Math.min(127,root+e.semitone)));
      if(!actuals.every(n=>noteMap.has(n))) continue;
      const gate=Math.max(0,Math.min(100,Number(chance.gate?.[row]?.[bar]??100))), key=`${actuals[0]},${actuals[1]},${gate}`;
      if(pairSliceMap.has(key)||rendered.length>=128) continue;
      const pair=await m8CompositePairBuffer(bufferByNote.get(actuals[0]),bufferByNote.get(actuals[1]),gate,tempo);
      if(pair){ pairSliceMap.set(key,rendered.length); rendered.push(pair); }
    }
    const chainWav=m8WavWithCueMarkers(rendered.slice(0,128));
    if(chainWav) files.push({name:`${base}${sampleDir}synth-melody1-chain.wav`,data:chainWav});
    m8Sampler(bytes,3,"MELODY1",`${sampleRefDir}synth-melody1-chain.wav`,{fileSlices:true});
    files.push({name:`${base}${instrumentDir}03.m8i`,data:m8SamplerInstrumentFile("MELODY1",`${sampleRefDir}synth-melody1-chain.wav`)});
    const mph=[];
    for(let bar=0;bar<bars;bar++){
      let active=false; for(let row=0;row<16;row++) if(parseMidiMelodyCell(mel?.[row]?.[bar]).length) active=true;
      const ph=active?0x51+bar:0x00; mph.push(ph); if(!active) continue;
      for(let row=0;row<16;row++){
        const entries=parseMidiMelodyCell(mel?.[row]?.[bar]); if(!entries.length) continue;
        const actuals=entries.map(e=>Math.max(0,Math.min(127,root+e.semitone)));
        const gate=Math.max(0,Math.min(100,Number(chance.gate?.[row]?.[bar]??100)));
        let slice;
        if(entries.length>1) slice=pairSliceMap.get(`${actuals[0]},${actuals[1]},${gate}`);
        else slice=noteMap.get(actuals[0]);
        if(slice===undefined||slice>127) continue;
        const fx=[[M8.FX_SLI,slice]], cha=m8ChanceByte(chance.chance?.[row]?.[bar]); if(cha!==null) fx.push([M8.FX_CHA,cha]);
        // Composite 32nd slices already contain their two gated triggers. Single notes use OFF rounded down to M8 ticks.
        if(entries.length===1){ const ticks=Math.floor(gate*6/100); if(ticks>0&&ticks<6) fx.push([M8.FX_OFF,ticks]); }
        m8PhraseStep(bytes,ph,row,{velocity:m8Velocity(chance.volume?.[row]?.[bar]),instrument:3,fx});
      }
    }
    m8SetChain(bytes,0x5A,mph,bars); bytes[M8.SONG+4]=0x5A;

    files.unshift({name:`${base}${projectName}.m8s`,data:bytes});
    const endNibble=bars===8?"8":"4";
    files.push({name:`${base}README-M8.txt`,data:`interPhace Build 483 M8 INIT-template Bundle export\nTempo: ${tempo}\nBars: ${bars}\nKick: INST 00 / CHAIN 1A / PHRASES 11-1${endNibble}\nSnare: INST 01 / CHAIN 2A / PHRASES 21-2${endNibble}\nHat: INST 02 / CHAIN 3A / PHRASES 31-3${endNibble}\nMelody 1: INST 03 / CHAIN 5A / PHRASES 51-5${endNibble}\nEmpty bars use phrase 00.\nUnused chain rows remain empty.\nMelody WAV uses FILE cue markers; SLI selects the pre-pitched slice.\nMelody slices: max 2.0s audio + 1.0s silence pad.\nGroove and timing remain untouched from DEFAULT.m8s.\nBundle directory: /Bundles/${projectName}/\nSamples are referenced relatively under ${sampleRefDir}\nStandalone instruments are included under Instruments/\n`});
    return files;
  }

  async function exportCurrentProject(container, { onAudioProgress = null, onStage = null } = {}) {
    const availablePatches = collectAvailablePatches();
    const selectedKeys = selectedPatchKeys(container);
    const selectedMid = selectedMidiKeys(container).length;
    const selectedWav = container.querySelectorAll('.utilityChoice.is-selected[data-export-group="wav"]').length;
    const selectedProjectJson = !!container.querySelector('.utilityChoice.is-selected[data-export-group="project"][data-export-key="json"]');
    const selectedM8s = !!container.querySelector('.utilityChoice.is-selected[data-export-group="project"][data-export-key="m8s"]');
    const projectName = sanitizeExportName(state.project.name);

    // One selected Patch, with project JSON explicitly off and no other export category,
    // remains a true standalone patch export.
    if (!selectedProjectJson && !selectedM8s && selectedKeys.length === 1 && selectedMid === 0 && selectedWav === 0) {
      const key = selectedKeys[0];
      const patch = availablePatches[key];
      if (!patch) {
        console.warn(`Patch "${key}" is empty, unused, unavailable, or unimplemented; nothing exported.`);
        return;
      }
      downloadBlob(
        new Blob([JSON.stringify(patch, null, 2)], { type: "application/json" }),
        `${projectName}-${key}.patch.json`,
      );
      return;
    }

    const folder = `${projectName}/`;
    const files = [];
    onStage?.("Preparing export");
    if (selectedProjectJson) {
      files.push({
        name: `${folder}project.json`,
        data: JSON.stringify(projectDocument(availablePatches), null, 2),
      });
    }

    for (const key of selectedKeys) {
      const patch = availablePatches[key];
      if (!patch) continue;
      files.push({
        name: `${folder}patch/${key}.patch.json`,
        data: JSON.stringify(patch, null, 2),
      });
    }

    files.push(...midiExportFiles(container, folder, projectName));

    if (selectedM8s) {
      onStage?.("Building M8 export");
      files.push(...await m8ExportFiles(projectName));
    }

    if (selectedWav > 0) {
      onStage?.("Starting audio renders");
      files.push(...await audioConstructionExportFiles(container, folder, projectName, onAudioProgress));
    }

    if (!files.length) {
      console.warn("No export items are selected.");
      return;
    }

    onStage?.("Packaging files");
    downloadBlob(createStoreZip(files), `${projectName}.zip`);
  }


  const SYNTH_PENDING_IMPORT_KEY = "interPhace.synthPhace.import.pending.v1";

  function scaleIdFromProjectIndex(index) {
    return ["major", "minor", "dorian", "majorPentatonic", "minorPentatonic", "hirajoshi"][
      Math.max(0, Math.min(5, Math.round(Number(index) || 0)))
    ] || "major";
  }

  function normalizeLegacyScaleId(value) {
    if (Number.isFinite(Number(value))) return scaleIdFromProjectIndex(Number(value));
    const normalized = String(value || "").toLowerCase().replace(/[\s_-]+/g, "");
    const map = {
      major: "major",
      ionian: "major",
      minor: "minor",
      aeolian: "minor",
      dorian: "dorian",
      majorpentatonic: "majorPentatonic",
      pentatonicmajor: "majorPentatonic",
      minorpentatonic: "minorPentatonic",
      pentatonicminor: "minorPentatonic",
      hirajoshi: "hirajoshi",
    };
    return map[normalized] || scaleIdFromProjectIndex(state.project.scale);
  }

  const IMPORT_SCALE_INTERVALS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    majorPentatonic: [0, 2, 4, 7, 9],
    minorPentatonic: [0, 3, 5, 7, 10],
    hirajoshi: [0, 2, 3, 7, 8],
  };

  function legacyHarmonyPosition(offset, scaleId) {
    const intervals = IMPORT_SCALE_INTERVALS[scaleId];
    const value = Number(offset);
    if (!intervals || !Number.isInteger(value)) return null;
    const octave = Math.floor(value / 12);
    const pitchClass = ((value % 12) + 12) % 12;
    const degree = intervals.indexOf(pitchClass);
    if (degree < 0) return null;
    return { degree, octave, semitone: value };
  }

  function unwrapPossibleLegacyPatch(raw) {
    if (!raw || typeof raw !== "object") return null;
    if (raw.schema === PATCH_EXPORT_SCHEMA && raw.state) return raw;
    if (raw.data?.patch && typeof raw.data.patch === "object") return raw.data.patch;
    if (raw.patch && typeof raw.patch === "object") return raw.patch;
    return raw;
  }

  function normalizeLegacySynthPatch(raw) {
    const source = unwrapPossibleLegacyPatch(raw);
    if (!source || typeof source !== "object") return null;

    if (source.schema === PATCH_EXPORT_SCHEMA && source.type === "synth") return source;
    if (!source.synth && !source.envelope && !source.filter && !source.fx) return null;

    const authoredScale = source.harmonyContext?.authoredScale ||
      normalizeLegacyScaleId(source.scale ?? source.scaleId ?? source.project?.scale);
    const fm = cloneJson(source.synth?.fm || {});
    const h1Offset = Number(fm.harmonic1?.noteOffset ?? 0);
    const h2Offset = Number(fm.harmonic2?.noteOffset ?? 0);

    const canonical = {
      version: 2,
      harmonyContext: cloneJson(source.harmonyContext || {
        authoredScale,
        harmonic1: legacyHarmonyPosition(h1Offset, authoredScale),
        harmonic2: legacyHarmonyPosition(h2Offset, authoredScale),
      }),
      synth: cloneJson(source.synth || { fm: {} }),
      envelope: cloneJson(source.envelope || { ahdhd: {} }),
      filter: cloneJson(source.filter || {}),
      texture: cloneJson(source.texture || { preset: 0, amount: 0 }),
      transient: cloneJson(source.transient || { preset: 0, volume: 35 }),
      sharedWetDry: Number(source.sharedWetDry ?? source.fx?.wetDryMix ?? 70),
      fx: cloneJson(source.fx || {}),
    };

    // Legacy root/scale/tempo are intentionally discarded for Patch import.
    return makePatch("synth", "synthPhace", canonical, {
      legacyImported: true,
      projectContext: { authoredScale },
    });
  }

  function normalizePatchDocument(raw) {
    if (!raw || typeof raw !== "object") throw new Error("Patch file is not a JSON object.");

    if (
      raw.schema === PATCH_EXPORT_SCHEMA &&
      [1, PATCH_EXPORT_VERSION].includes(Number(raw.version)) &&
      raw.type &&
      raw.state
    ) {
      return cloneJson(raw);
    }

    const synthPatch = normalizeLegacySynthPatch(raw);
    if (synthPatch) return synthPatch;

    throw new Error("Unsupported patch format.");
  }

  function defaultDrumStorage() {
    const blankGrid = () => Array.from({ length: 16 }, () => Array(8).fill("off"));
    const blankVariation = () => Array.from({ length: 16 }, () => Array(8).fill(null));
    return {
      version: 1,
      currentPage: "kick",
      currentView: "pattern",
      labelMode: "res",
      tempo: Number(state.project.tempo) || 75,
      styles: { kick: "rand", snare: "rand", hat: "rand" },
      synths: {
        kick: [43, 118, 55, 420, 0, 0, 0, 0],
        snare: [50, 50, 100, 50, 50, 0, 0, 0],
        hat: [50, 0, 100, 0, 0, 32, 0, 0],
      },
      patterns: { kick: blankGrid(), snare: blankGrid(), hat: blankGrid() },
      variationPages: { kick: 0, snare: 0, hat: 0 },
      variations: {
        kick: { chance: blankVariation(), volume: blankVariation(), repeats: blankVariation() },
        snare: { chance: blankVariation(), volume: blankVariation(), repeats: blankVariation() },
        hat: { chance: blankVariation(), volume: blankVariation(), repeats: blankVariation() },
      },
    };
  }

  function mergeDrumPatch(patch) {
    const defaults = defaultDrumStorage();
    const existing = readStoredJson("drumPhace.build5.state") || defaults;
    const type = patch.type;
    const incoming = cloneJson(patch.state || {});

    const normalizeSynth = (values, fallback) =>
      Array.from({ length: 8 }, (_, index) =>
        Number.isFinite(Number(values?.[index])) ? Number(values[index]) : Number(fallback[index])
      );

    existing.synths = { ...defaults.synths, ...(existing.synths || {}) };
    for (const instrument of ["kick", "snare", "hat"]) {
      existing.synths[instrument] = normalizeSynth(existing.synths[instrument], defaults.synths[instrument]);
    }

    if (type === "drums") {
      const next = {
        ...defaults,
        ...existing,
        ...incoming,
        synths: { ...defaults.synths, ...(incoming.synths || {}) },
        patterns: { ...defaults.patterns, ...(incoming.patterns || {}) },
        styles: { ...defaults.styles, ...(incoming.styles || {}) },
        variationPages: { ...defaults.variationPages, ...(incoming.variationPages || {}) },
        variations: { ...defaults.variations, ...(incoming.variations || {}) },
      };
      for (const instrument of ["kick", "snare", "hat"]) {
        next.synths[instrument] = normalizeSynth(next.synths[instrument], defaults.synths[instrument]);
      }
      localStorage.setItem("drumPhace.build5.state", JSON.stringify(next));
      return;
    }

    if (type === "kit") {
      for (const instrument of ["kick", "snare", "hat"]) {
        if (Array.isArray(incoming.synths?.[instrument])) {
          existing.synths[instrument] = normalizeSynth(incoming.synths[instrument], defaults.synths[instrument]);
        }
      }
      localStorage.setItem("drumPhace.build5.state", JSON.stringify(existing));
      return;
    }

    if (["kick", "snare", "hat"].includes(type)) {
      if (Array.isArray(incoming.synth)) {
        existing.synths[type] = normalizeSynth(incoming.synth, defaults.synths[type]);
      }
      existing.patterns = { ...defaults.patterns, ...(existing.patterns || {}) };
      existing.variations = { ...defaults.variations, ...(existing.variations || {}) };
      existing.styles = { ...defaults.styles, ...(existing.styles || {}) };

      if (Array.isArray(incoming.pattern)) existing.patterns[type] = cloneJson(incoming.pattern);
      if (incoming.variations && typeof incoming.variations === "object") {
        existing.variations[type] = cloneJson(incoming.variations);
      }
      if (typeof incoming.style === "string") existing.styles[type] = incoming.style;

      localStorage.setItem("drumPhace.build5.state", JSON.stringify(existing));
      return;
    }

    throw new Error(`Unsupported drum patch type "${type}".`);
  }

  function mergeArpPatch(patch) {
    const existing = readStoredJson("interPhace.arpPhace.template.v1") || {
      currentPhrase: "p1",
      currentView: "melody",
      chancePageIndex: { p1: 0, p2: 0, p3: 0, p4: 0 },
      melodies: {},
      chance: {},
      arps: {},
      arpPatternEncoding: "degree-v1",
      arpPatterns: {},
      arpPatternCustom: {},
      b2GeneratorLayoutVersion: 2,
      b2GeneratorState: [null, [50,50,50,50], [50,50,50,50], [50,50,50,50]],
    };

    if (patch.type === "arp") {
      existing.arps = { ...(existing.arps || {}), ...(cloneJson(patch.state?.arps || {})) };
      if (patch.state?.arpPatternEncoding) existing.arpPatternEncoding = patch.state.arpPatternEncoding;
      existing.arpPatterns = {
        ...(existing.arpPatterns || {}),
        ...(cloneJson(patch.state?.arpPatterns || {})),
      };
      existing.arpPatternCustom = {
        ...(existing.arpPatternCustom || {}),
        ...(cloneJson(patch.state?.arpPatternCustom || {})),
      };
      if (Array.isArray(patch.state?.b2GeneratorState)) {
        existing.b2GeneratorLayoutVersion = Number(patch.state?.b2GeneratorLayoutVersion || 2);
        existing.b2GeneratorState = cloneJson(patch.state.b2GeneratorState);
      }
    } else if (patch.type === "melody") {
      existing.melodies = { ...(existing.melodies || {}), ...(cloneJson(patch.state?.melodies || {})) };
      existing.chance = { ...(existing.chance || {}), ...(cloneJson(patch.state?.chance || {})) };
    } else {
      throw new Error(`Unsupported arpPhace patch type "${patch.type}".`);
    }

    localStorage.setItem("interPhace.arpPhace.template.v1", JSON.stringify(existing));
  }

  function applyNoisePatch(patch) {
    if (patch.type !== "noise") throw new Error(`Unsupported noise patch type "${patch.type}".`);
    const pageNames = ["noise", "artifact", "movement", "space"];
    const incomingPages = patch.state?.pages || {};
    const incomingPresets = patch.state?.presets || {};
    const existing = readStoredJson("interPhace.noisePhace.ui.v2") || {
      version: 2,
      activePage: 1,
      link: false,
      values: {},
      presets: {},
    };
    const values = { ...(existing.values || {}) };
    const presets = { ...(existing.presets || {}) };

    for (let page = 1; page <= 4; page++) {
      const name = pageNames[page - 1];
      const pageValues = incomingPages?.[name];
      if (!Array.isArray(pageValues) || pageValues.length < 5) {
        throw new Error(`Noise patch is missing complete ${name} slider values.`);
      }
      for (let index = 0; index < 5; index++) {
        values[`app5_b${page}_p1_c${index + 1}`] = Number(pageValues[index]);
      }
      const preset = Number(incomingPresets?.[name]);
      if (Number.isFinite(preset)) {
        values[`app5_b${page}_p1_c6`] = preset;
        presets[name] = preset;
      }
    }

    localStorage.setItem("interPhace.noisePhace.ui.v2", JSON.stringify({
      ...existing,
      version: 2,
      values,
      presets,
    }));
  }

  function applyDronePatch(patch) {
    if (patch.type !== "drone") throw new Error(`Unsupported drone patch type "${patch.type}".`);
    const pageNames = ["voice", "tone", "movement", "space"];
    const incomingPages = patch.state?.pages || {};
    const incomingPresets = patch.state?.presets || {};
    const existing = readStoredJson("interPhace.dronePhace.ui.v2") || {
      activePage: 1,
      values: {},
      presets: {},
    };
    const values = { ...(existing.values || {}) };
    const presets = { ...(existing.presets || {}) };

    for (let page = 1; page <= 4; page++) {
      const name = pageNames[page - 1];
      const pageValues = incomingPages?.[name];
      if (!Array.isArray(pageValues) || pageValues.length < 5) {
        throw new Error(`Drone patch is missing complete ${name} slider values.`);
      }
      for (let index = 0; index < 5; index++) {
        values[`app6_b${page}_p1_c${index + 1}`] = Number(pageValues[index]);
      }
      if (Number.isFinite(Number(incomingPresets?.[name]))) {
        presets[`app6_b${page}_p1_c6`] = Number(incomingPresets[name]);
      }
    }

    localStorage.setItem("interPhace.dronePhace.ui.v2", JSON.stringify({
      ...existing,
      values,
      presets,
    }));
  }

  function applySequencerPatch(patch) {
    if (patch.type !== "sequencer") {
      throw new Error(`Unsupported sequencer patch type "${patch.type}".`);
    }
    const incoming = patch.state?.grid;
    if (!Array.isArray(incoming)) throw new Error("Sequencer patch grid is missing.");

    const normalized = Array.from({ length: 16 }, (_, row) =>
      Array.from({ length: 4 }, (_, col) => {
        const raw = String(incoming?.[row]?.[col] || "").trim().toUpperCase();
        if (col === 0 && /^M[1-4]\.[1-8]$/.test(raw)) return raw;
        if (col === 1 && /^K[1-8]$/.test(raw)) return raw;
        if (col === 2 && /^S[1-8]$/.test(raw)) return raw;
        if (col === 3 && /^H[1-8]$/.test(raw)) return raw;
        return "";
      })
    );

    const rootState = readStoredJson(STORAGE_KEY) || cloneJson(state);
    rootState.sequencer = normalized;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rootState));
  }

  function applyPatchDocument(patch, { reload = true } = {}) {
    switch (patch.type) {
      case "synth":
        localStorage.setItem("interPhace.synthPhace.patch.v1", JSON.stringify(cloneJson(patch.state)));
        localStorage.setItem(SYNTH_PENDING_IMPORT_KEY, JSON.stringify(cloneJson(patch.state)));
        break;
      case "drums":
      case "kit":
      case "kick":
      case "snare":
      case "hat":
        mergeDrumPatch(patch);
        break;
      case "arp":
      case "melody":
        mergeArpPatch(patch);
        break;
      case "noise":
        applyNoisePatch(patch);
        break;
      case "drone":
        applyDronePatch(patch);
        break;
      case "sequencer":
        applySequencerPatch(patch);
        break;
      default:
        throw new Error(`Unsupported patch type "${patch.type}".`);
    }

    if (reload) window.location.reload();
  }

  function validateProjectDocument(doc) {
    if (!doc || typeof doc !== "object") throw new Error("Project file is not a JSON object.");
    if (doc.schema !== PROJECT_EXPORT_SCHEMA) throw new Error("Not an interPhace project.json file.");
    if (Number(doc.version) !== PROJECT_EXPORT_VERSION) {
      throw new Error(`Unsupported project version ${doc.version}.`);
    }
    if (!doc.project || typeof doc.project !== "object") throw new Error("Project settings are missing.");
    return doc;
  }

  function applyProjectDocument(raw) {
    const doc = validateProjectDocument(raw);

    // Project import owns global musical context.
    const restoredRootState = {
      ...state,
      project: { ...state.project, ...(cloneJson(doc.project) || {}) },
      mixer: { ...state.mixer, ...(cloneJson(doc.mixer) || {}) },
      muted: { ...state.muted, ...(cloneJson(doc.muted) || {}) },
      child: { ...state.child, ...(cloneJson(doc.childSettings) || {}) },
      sequencer: Array.isArray(doc.sequencer) ? cloneJson(doc.sequencer) : state.sequencer,
      button: Number(doc.ui?.button) || 1,
      b2Page: Number(doc.ui?.mixerPage) || 1,
      b5Page: Number(doc.ui?.settingsPage) || 1,
      mixerVersion: 2,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(restoredRootState));

    const patches = doc.patches && typeof doc.patches === "object" ? doc.patches : {};

    // Full-state patch wins where both full and partial representations exist.
    if (patches.drums) applyPatchDocument(normalizePatchDocument(patches.drums), { reload: false });
    else {
      if (patches.kit) applyPatchDocument(normalizePatchDocument(patches.kit), { reload: false });
      for (const type of ["kick", "snare", "hat"]) {
        if (patches[type]) applyPatchDocument(normalizePatchDocument(patches[type]), { reload: false });
      }
    }

    if (patches.arp) applyPatchDocument(normalizePatchDocument(patches.arp), { reload: false });
    if (patches.melody) applyPatchDocument(normalizePatchDocument(patches.melody), { reload: false });
    if (patches.noise) applyPatchDocument(normalizePatchDocument(patches.noise), { reload: false });
    if (patches.drone) applyPatchDocument(normalizePatchDocument(patches.drone), { reload: false });
    if (patches.synth) applyPatchDocument(normalizePatchDocument(patches.synth), { reload: false });

    // Restore generator/editing state that belongs to the project but not to standalone patches.
    const projectPhaceState = doc.phaceState && typeof doc.phaceState === "object" ? doc.phaceState : {};
    if (projectPhaceState.arpPhace) {
      const arpState = readStoredJson("interPhace.arpPhace.template.v1") || {};
      arpState.styles = cloneJson(projectPhaceState.arpPhace.styles || arpState.styles || {});
      arpState.chancePageIndex = cloneJson(projectPhaceState.arpPhace.chancePageIndex || arpState.chancePageIndex || {});
      if (Array.isArray(projectPhaceState.arpPhace.b2GeneratorState)) {
        arpState.b2GeneratorLayoutVersion = Number(projectPhaceState.arpPhace.b2GeneratorLayoutVersion || 2);
        arpState.b2GeneratorState = cloneJson(projectPhaceState.arpPhace.b2GeneratorState);
      }
      localStorage.setItem("interPhace.arpPhace.template.v1", JSON.stringify(arpState));
    }
    if (projectPhaceState.synthPhace?.eqRanges) {
      const synthUi = readStoredJson("interPhace.synthPhace.ui.v3") || {};
      synthUi.eqRanges = { ...(synthUi.eqRanges || {}), ...cloneJson(projectPhaceState.synthPhace.eqRanges) };
      localStorage.setItem("interPhace.synthPhace.ui.v3", JSON.stringify(synthUi));
    }

    window.location.reload();
  }

  async function readJsonFile(file) {
    return JSON.parse(await file.text());
  }

  function readStoredZipProject(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const decoder = new TextDecoder("utf-8");
    let offset = 0;

    while (offset + 30 <= bytes.length) {
      if (view.getUint32(offset, true) !== 0x04034B50) break;
      const method = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const nameStart = offset + 30;
      const dataStart = nameStart + nameLength + extraLength;
      const filename = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));

      if (method !== 0) {
        throw new Error("This project ZIP uses unsupported compression.");
      }

      if (filename.toLowerCase().endsWith("/project.json") || filename.toLowerCase() === "project.json") {
        const text = decoder.decode(bytes.subarray(dataStart, dataStart + compressedSize));
        return JSON.parse(text);
      }

      offset = dataStart + compressedSize;
    }

    throw new Error("project.json was not found in this interPhace ZIP.");
  }

  function chooseFile(accept, handler) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.hidden = true;
    document.body.appendChild(input);

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      try {
        await handler(file);
      } catch (error) {
        console.error("interPhace import failed:", error);
        window.alert(`Import failed: ${error.message}`);
      }
    }, { once: true });

    input.click();
  }

  function openProjectImportPicker() {
    chooseFile(".json,.zip,application/json,application/zip", async file => {
      const lower = file.name.toLowerCase();
      const doc = lower.endsWith(".zip")
        ? readStoredZipProject(await file.arrayBuffer())
        : await readJsonFile(file);
      applyProjectDocument(doc);
    });
  }

  function openPatchImportPicker() {
    chooseFile(".json,application/json", async file => {
      const patch = normalizePatchDocument(await readJsonFile(file));
      applyPatchDocument(patch);
    });
  }

  function buildSnapshotGrid(container, pagePrefix) {
    if (!container) return;
    const grid = buildBackgroundSelectionGrid(container, pagePrefix);
    if (!grid) return;

    const label = document.createElement("span");
    label.className = "backgroundSelectionGridLabel snapshotGridLabel";
    label.textContent = "Snapshots";
    container.appendChild(label);

    for (let snapshot = 1; snapshot <= 8; snapshot += 1) {
      const row = snapshot <= 4 ? 15 : 16;
      const col = (snapshot - 1) % 4;
      const cell = grid.activate(row, col, String(snapshot), "snapshotButton");
      if (!cell) continue;
      cell.id = `${pagePrefix}_snapshot${snapshot}`;
      cell.setAttribute("aria-label", `Snapshot ${snapshot}`);
      attachSnapshotActions(cell, pagePrefix, snapshot - 1);
    }
    renderSnapshotGrid(pagePrefix);
  }

  const SNAPSHOT_PHACE_BY_PAGE = Object.freeze({ app1_b5_p1: "synthPhace", app1_b5_p2: "drumPhace", app1_b5_p3: "arpPhace", app1_b5_p4: "noisePhace", app1_b5_p5: "dronePhace" });
  const SNAPSHOT_HOLD_MS = 900;
  const SNAPSHOT_FILL_DELAY_MS = 200;
  let snapshotSuppressClickUntil = 0;

  function renderSnapshotGrid(pagePrefix) {
    const phace = SNAPSHOT_PHACE_BY_PAGE[pagePrefix];
    const saved = phace ? window.InterPhaceShell?.snapshots?.read?.()[phace] || [] : [];
    for (let index = 0; index < 8; index += 1) {
      const cell = document.getElementById(`${pagePrefix}_snapshot${index + 1}`);
      if (!cell) continue;
      const filled = Boolean(saved[index]);
      cell.classList.toggle("is-saved", filled);
      cell.style.setProperty("--snapshot-clear-fill", "0%");
      cell.setAttribute("aria-label", filled ? `Snapshot ${index + 1} saved` : `Snapshot ${index + 1} empty`);
    }
  }
  function renderSnapshotGrids() { Object.keys(SNAPSHOT_PHACE_BY_PAGE).forEach(renderSnapshotGrid); }

  function restorePhaceSnapshot(phace, snapshotState) {
    const write = (key, value) => value && typeof value === "object" ? localStorage.setItem(key, JSON.stringify(value)) : localStorage.removeItem(key);
    if (phace === "synthPhace") {
      write("interPhace.synthPhace.ui.v3", snapshotState.ui);
      write("interPhace.synthPhace.patch.v1", snapshotState.patch);
      return;
    }
    write({ drumPhace: "drumPhace.build5.state", arpPhace: "interPhace.arpPhace.template.v1", noisePhace: "interPhace.noisePhace.ui.v2", dronePhace: "interPhace.dronePhace.ui.v2" }[phace], snapshotState.state);
  }

  function attachSnapshotActions(cell, pagePrefix, index) {
    let timer = null, frame = 0, startedAt = 0, holding = false, fired = false;
    const setFill = percent => cell.style.setProperty("--snapshot-clear-fill", `${Math.max(0, Math.min(100, percent))}%`);
    const cancel = () => { holding = false; if (timer !== null) clearTimeout(timer); timer = null; if (frame) cancelAnimationFrame(frame); frame = 0; if (!fired) setFill(0); };
    const paint = now => { if (!holding || fired) return; setFill(Math.max(0, ((now - startedAt - SNAPSHOT_FILL_DELAY_MS) / (SNAPSHOT_HOLD_MS - SNAPSHOT_FILL_DELAY_MS)) * 100)); frame = requestAnimationFrame(paint); };
    cell.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const phace = SNAPSHOT_PHACE_BY_PAGE[pagePrefix];
      if (!(window.InterPhaceShell?.snapshots?.read?.()[phace] || [])[index]) return;
      fired = false; cancel(); holding = true; startedAt = performance.now(); frame = requestAnimationFrame(paint);
      timer = window.setTimeout(() => {
        timer = null; if (!holding) return; fired = true; setFill(100);
        snapshotSuppressClickUntil = performance.now() + 350;
        window.InterPhaceShell?.snapshots?.remove?.(phace, index); renderSnapshotGrids();
      }, SNAPSHOT_HOLD_MS);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(type => cell.addEventListener(type, cancel));
    cell.addEventListener("click", () => {
      if (performance.now() < snapshotSuppressClickUntil) return;
      const phace = SNAPSHOT_PHACE_BY_PAGE[pagePrefix];
      const snapshotState = window.InterPhaceShell?.snapshots?.restore?.(phace, index);
      if (snapshotState) restorePhaceSnapshot(phace, snapshotState);
    });
  }

  function clearExportSelection() {
    document.querySelectorAll("#app1_b4_p1_grid .is-selected").forEach((button) =>
      button.classList.remove("is-selected"));
  }

  buildUtilityGrid(document.getElementById("app1_b3_p1_grid"), "import");
  buildUtilityGrid(document.getElementById("app1_b4_p1_grid"), "export");
  ["app1_b5_p1", "app1_b5_p2", "app1_b5_p3", "app1_b5_p4", "app1_b5_p5"].forEach((pagePrefix) => {
    buildSnapshotGrid(document.getElementById(`${pagePrefix}_grid`), pagePrefix);
  });
  window.addEventListener("storage", event => {
    if (event.key !== GRID_LABEL_MODE_KEY) return;
    interSequencerLabelMode = event.newValue === "hex" ? "hex" : "res";
    renderInterSequencerGrid();
  });
  window.addEventListener("storage", event => {
    if (event.key === "interPhace.phaceSnapshots.v1") renderSnapshotGrids();
  });

  const interSequencerMedia = window.matchMedia("(min-width: 760px)");
  const handleInterSequencerColumns = () => renderInterSequencerGrid();
  if (interSequencerMedia.addEventListener) interSequencerMedia.addEventListener("change", handleInterSequencerColumns);
  else interSequencerMedia.addListener?.(handleInterSequencerColumns);

  render();
});
