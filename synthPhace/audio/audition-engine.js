(() => {
  "use strict";

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const OfflineAudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const SAMPLE_RATE = 48000;
  const POST_RENDER_PAUSE_MS = 1000;
  const FINAL_FADE_SECONDS = 0.100;
  const TRAILING_SCAN_SECONDS = 0.250;
  // Audition-only perceptual tail threshold: -60 dB relative to this render's peak.
  const PERCEPTUAL_TAIL_DB = -60;
  const MIN_PERCEPTUAL_THRESHOLD = 0.00001;
  const INITIAL_SAFETY_SECONDS = 1.0;
  const EXTENSION_SECONDS = 5.0;
  const MAX_EXTRA_TAIL_SECONDS = 60.0;

  let playbackContext = null;
  let active = null;
  let activeGeneration = 0;
  let playing = false;
  let auditionState = "idle";
  let livePlaying = false;
  let liveTimer = null;
  let livePendingState = null;
  let liveNextTriggerAt = 0;
  let liveArpPlaying = false;
  let liveArpTimer = null;
  let liveArpPendingState = null;
  let liveArpNextLoopAt = 0;
  let liveArpCurrentLoop = null;
  let liveArpNextMelodyBarAt = 0;
  let liveArpMelodyBarIndex = 0;
  const liveVoices = new Set();
  const LIVE_LOOKAHEAD_SECONDS = 0.10;
  const LIVE_TICK_MS = 20;
  const LIVE_START_LEAD_SECONDS = 0.07;
  const LIVE_STOP_RELEASE_SECONDS = 0.30;
  const LIVE_MAX_COMPLEX_VOICES = 24;
  const LIVE_VOICE_STEAL_RELEASE_SECONDS = 0.020;
  const LIVE_ARP_LOOKAHEAD_SECONDS = 0.18;

  function notifyAuditionState() {
    window.dispatchEvent(new CustomEvent("interPhace:audition-state"));
  }

  function midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (Number(midiNote) - 69) / 12);
  }

  function envelopeLength(legacyPatch) {
    const drawn = legacyPatch?.envelope?.drawn;
    if (drawn?.active && drawn?.valid && Array.isArray(drawn.curve) && drawn.curve.length >= 8) {
      return Math.max(.02, Math.min(20, Number(drawn.duration) || 2));
    }
    if (!window.AmpEnvelopeEngine?.computeLength) {
      throw new Error("synthPhace envelope engine is unavailable.");
    }
    return window.AmpEnvelopeEngine.computeLength(legacyPatch?.envelope?.ahdhd || {});
  }

  function buildVoice(ctx, patch) {
    const frequency = midiToFrequency(patch.midiNote);
    if (patch.synth?.engine?.mode === "pretty") {
      if (!window.PrettyEngine?.build || !window.PrettyEnvelopeEngine?.apply) throw new Error("synthPhace Pretty engine is unavailable.");
      const drawn = patch.envelope?.prettyDrawn;
      const drawnDuration = drawn?.active && drawn?.valid ? Math.max(.02, Math.min(20, Number(drawn.duration) || 2)) : 2;
      const source = window.PrettyEngine.build(ctx, frequency, patch.synth?.pretty || {}, drawnDuration);
      if (drawn?.active && drawn?.valid && window.DrawnEnvelopeEngine?.apply) {
        const envelope = window.DrawnEnvelopeEngine.apply(ctx, source.node, drawn);
        if (envelope) return { source, envelope };
      }
      return { source, envelope: window.PrettyEnvelopeEngine.apply(ctx, source.node, patch.synth?.prettyEnvelope || {}, source.targets) };
    }
    if (!window.FMEngine?.build || !window.AmpEnvelopeEngine?.apply) throw new Error("synthPhace FM engine is unavailable.");
    const source = window.FMEngine.build(ctx, frequency, patch.synth?.fm || {}, envelopeLength(patch));
    const drawn = patch.envelope?.drawn;
    if (drawn?.active && drawn?.valid && window.DrawnEnvelopeEngine?.apply) {
      window.AmpEnvelopeEngine.initializeCompanionGains?.(source.modulationTargets, ctx.currentTime);
      const envelope = window.DrawnEnvelopeEngine.apply(ctx, source.node, drawn);
      if (envelope) return { source, envelope };
    }
    return { source, envelope: window.AmpEnvelopeEngine.apply(ctx, source.node, patch.envelope?.ahdhd || {}, source.modulationTargets) };
  }

  function ensurePlaybackContext() {
    if (!AudioContextClass) throw new Error("Web Audio playback is unavailable.");
    if (!playbackContext || playbackContext.state === "closed") {
      playbackContext = new AudioContextClass();
    }
    return playbackContext;
  }

  function readAuditionSettings() {
    const key = window.SynthPhacePatchAdapter?.PROJECT_STORAGE_KEY;
    let child = {};
    try {
      child = JSON.parse(localStorage.getItem(key) || "null")?.child || {};
    } catch (_) {}

    // Local Loop Audition and Loop Voice Length were retired for the live
    // migration. Standalone legacy audition remains a single full render until
    // the persistent live sP engine replaces it.
    const loop = false;
    const lengthSeconds = null;
    const rawEffectsRelease = Number(child.synthEffectsRelease);
    const effectsReleaseMs = Math.max(
      10,
      Math.min(4000, Math.round(Number.isFinite(rawEffectsRelease) ? rawEffectsRelease : 120)),
    );

    return Object.freeze({
      loop,
      lengthSeconds,
      effectsReleaseMs,
      effectsReleaseSeconds: effectsReleaseMs / 1000,
    });
  }

  const GLOBAL_MIXER_STORAGE_KEY = "interPhace.interPhace.ui.v2";

  function dbToGain(db) {
    return Math.pow(10, Number(db) / 20);
  }

  function readGlobalMixerChannel(channel) {
    try {
      const saved = JSON.parse(localStorage.getItem(GLOBAL_MIXER_STORAGE_KEY) || "null") || {};
      const db = Number(saved?.mixer?.[channel] ?? 0);
      const muted = !!saved?.muted?.[channel];
      return Object.freeze({
        db,
        muted,
        // Mixer mute is Global Play-only. Local synth audition still follows
        // the channel dB level even when globally muted.
        gain: dbToGain(db),
      });
    } catch (_) {
      return Object.freeze({ db: 0, muted: false, gain: 1 });
    }
  }


  function bufferPeak(buffer) {
    let peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak;
  }

  function perceptualThreshold(buffer) {
    return Math.max(
      MIN_PERCEPTUAL_THRESHOLD,
      bufferPeak(buffer) * Math.pow(10, PERCEPTUAL_TAIL_DB / 20),
    );
  }

  function peakInTail(buffer, seconds = TRAILING_SCAN_SECONDS) {
    const frames = Math.max(1, Math.round(seconds * buffer.sampleRate));
    const start = Math.max(0, buffer.length - frames);
    let peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = start; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak;
  }

  function lastMeaningfulFrame(buffer) {
    const threshold = perceptualThreshold(buffer);
    let last = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = data.length - 1; i >= 0; i -= 1) {
        if (Math.abs(data[i]) > threshold) { last = Math.max(last, i); break; }
      }
    }
    return last;
  }

  function finalizeBuffer(buffer) {
    const fadeFrames = Math.max(1, Math.round(FINAL_FADE_SECONDS * buffer.sampleRate));
    const meaningful = lastMeaningfulFrame(buffer);
    const endFrame = Math.min(buffer.length, meaningful + fadeFrames + 1);
    const outputLength = Math.max(fadeFrames + 1, endFrame);
    const finalized = new AudioBuffer({
      length: outputLength,
      numberOfChannels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
    });

    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const src = buffer.getChannelData(channel);
      const dst = finalized.getChannelData(channel);
      dst.set(src.subarray(0, outputLength));

      const fadeStart = Math.max(0, meaningful);
      const startGain = outputLength > fadeStart ? 1 : 0;
      for (let i = fadeStart; i < outputLength; i += 1) {
        const remaining = outputLength - 1 - i;
        const gain = remaining <= 0 ? 0 : remaining / Math.max(1, outputLength - 1 - fadeStart);
        dst[i] *= startGain * gain;
      }
      dst[outputLength - 1] = 0;
    }

    return finalized;
  }

  function buildGraph(ctx, legacyPatch, gateSeconds = null, effectsReleaseSeconds = 0.120, destination = null, { postMix = true } = {}) {
    if (!window.TransientSourceEngine?.apply) throw new Error("synthPhace transient source engine is unavailable.");
    if (!window.FilterEngine?.apply) throw new Error("synthPhace filter engine is unavailable.");
    if (!window.TextureEngine?.apply) throw new Error("synthPhace texture engine is unavailable.");
    if (!window.EffectsEngine?.applyAll) throw new Error("synthPhace effects engine is unavailable.");

    const graphStart = ctx.currentTime;
    const voice = buildVoice(ctx, legacyPatch);
    const envelope = voice.envelope;

    const transient = window.TransientSourceEngine.apply(
      ctx,
      envelope.node,
      legacyPatch.transient,
      legacyPatch.midiNote,
      legacyPatch.envelope.ahdhd,
    );

    const filtered = window.FilterEngine.apply(
      ctx,
      transient.node,
      legacyPatch.filter,
    );

    const textured = window.TextureEngine.apply(
      ctx,
      filtered.node,
      legacyPatch.texture,
      envelope.noteLength,
      legacyPatch.midiNote,
      legacyPatch.envelope.ahdhd,
    );

    let performanceNode = textured.node;
    let performanceLength = envelope.noteLength;

    if (Number.isFinite(gateSeconds) && gateSeconds > 0 && envelope.noteLength > gateSeconds) {
      performanceLength = gateSeconds;
      const gate = ctx.createGain();
      const fade = Math.min(0.035, Math.max(0.008, gateSeconds * 0.18));
      const releaseStart = graphStart + Math.max(0, gateSeconds - fade);
      gate.gain.setValueAtTime(1, graphStart);
      gate.gain.setValueAtTime(1, releaseStart);
      gate.gain.linearRampToValueAtTime(0, graphStart + gateSeconds);
      textured.node.connect(gate);
      performanceNode = gate;
    }

    const effected = window.EffectsEngine.applyAll(
      ctx,
      performanceNode,
      legacyPatch.fx,
      performanceLength,
      legacyPatch.tempo,
    );

    let finalNode = effected.node;

    // A gated trigger render is monophonic all the way through its effects.
    // At the voice gate boundary, stop feeding the effects upstream, then
    // quickly release the entire effected signal so delay/reverb cannot pile up.
    if (Number.isFinite(gateSeconds) && gateSeconds > 0) {
      const effectsRelease = ctx.createGain();
      const releaseEnd = graphStart + gateSeconds + effectsReleaseSeconds;
      effectsRelease.gain.setValueAtTime(1, graphStart);
      effectsRelease.gain.setValueAtTime(1, graphStart + gateSeconds);
      effectsRelease.gain.linearRampToValueAtTime(0, releaseEnd);
      effected.node.connect(effectsRelease);
      finalNode = effectsRelease;
    }

    const master = ctx.createGain();
    finalNode.connect(master);
    const synthMixer = readGlobalMixerChannel("synth");
    if (postMix) {
      master.gain.setValueAtTime(0.72 * synthMixer.gain, graphStart);
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.08;
      master.connect(limiter);
      limiter.connect(destination || ctx.destination);
    } else {
      // Cached aP buffers stop here: chance/volume, mixer gain, and any
      // output limiting remain live at playback time.
      master.gain.setValueAtTime(1, graphStart);
      master.connect(destination || ctx.destination);
    }

    return {
      source: voice.source,
      master,
      oscillators: Array.isArray(voice.source?.oscillators)
        ? voice.source.oscillators
        : [voice.source?.carrier].filter(Boolean),
      envelope,
      performanceLength,
      frequency: midiToFrequency(legacyPatch.midiNote),
      inspection: voice.source.inspection,
      mixer: synthMixer,
    };
  }

  async function renderPass(legacyPatch, totalSeconds, gateSeconds = null, effectsReleaseSeconds = 0.120, options = {}) {
    if (!OfflineAudioContextClass) {
      throw new Error("Offline Web Audio rendering is unavailable.");
    }
    const frameCount = Math.max(1, Math.ceil(totalSeconds * SAMPLE_RATE));
    const ctx = new OfflineAudioContextClass(2, frameCount, SAMPLE_RATE);
    const graph = buildGraph(ctx, legacyPatch, gateSeconds, effectsReleaseSeconds, null, options);
    const buffer = await ctx.startRendering();
    return { buffer, graph };
  }

  async function renderCompleteAudition(legacyPatch, generation, auditionSettings) {
    const naturalNoteLength = envelopeLength(legacyPatch);
    const gateSeconds = auditionSettings?.loop && Number.isFinite(auditionSettings.lengthSeconds)
      ? auditionSettings.lengthSeconds
      : null;
    const effectsReleaseSeconds = auditionSettings?.loop
      ? Number(auditionSettings.effectsReleaseSeconds ?? 0.120)
      : 0.120;
    const noteLength = gateSeconds === null
      ? naturalNoteLength
      : Math.min(naturalNoteLength, gateSeconds);

    const estimatedTail = window.EffectsEngine.computeTail?.(
      legacyPatch.fx,
      legacyPatch.tempo,
    ) || 0.24;

    const boundedLoop = gateSeconds !== null;
    let extraTail = boundedLoop
      ? effectsReleaseSeconds + INITIAL_SAFETY_SECONDS
      : Math.max(estimatedTail, 0.5) + INITIAL_SAFETY_SECONDS;
    let rendered = null;
    let graph = null;

    while (true) {
      if (generation !== activeGeneration) return null;

      const pass = await renderPass(legacyPatch, noteLength + extraTail, gateSeconds, effectsReleaseSeconds);
      rendered = pass.buffer;
      graph = pass.graph;

      if (peakInTail(rendered) <= perceptualThreshold(rendered)) break;

      extraTail += EXTENSION_SECONDS;
      if (extraTail > MAX_EXTRA_TAIL_SECONDS) {
        break;
      }
    }

    const finalized = finalizeBuffer(rendered);
    return {
      buffer: finalized,
      noteLength,
      naturalNoteLength,
      gateSeconds,
      renderedDuration: rendered.duration,
      finalDuration: finalized.duration,
      frequency: graph.frequency,
      inspection: graph.inspection,
      projectContext: window.SynthPhacePatchAdapter.readProjectContext(),
    };
  }

  function stop() {
    activeGeneration += 1;
    const record = active;
    active = null;
    playing = false;
    auditionState = "idle";
    notifyAuditionState();
    if (!record) return;

    const ctx = record.context;
    const now = ctx.currentTime;
    try {
      record.gain.gain.cancelScheduledValues(now);
      record.gain.gain.setValueAtTime(record.gain.gain.value, now);
      record.gain.gain.linearRampToValueAtTime(0, now + 0.012);
      record.source.stop(now + 0.014);
    } catch (_) {}
  }

  async function renderAndPlayCycle(generation) {
    if (generation !== activeGeneration || !playing) return null;

    const adapter = window.SynthPhacePatchAdapter;
    if (!adapter) throw new Error("synthPhace patch adapter is unavailable.");

    // Re-read both patch and audition settings at the start of every loop cycle.
    adapter.captureAndSave?.(window.SynthPhaceUIState || {});
    const legacyPatch = adapter.getLegacyPatch();
    const auditionSettings = readAuditionSettings();

    auditionState = "rendering";
    notifyAuditionState();
    const rendered = await renderCompleteAudition(legacyPatch, generation, auditionSettings);
    if (!rendered || generation !== activeGeneration || !playing) return null;

    await new Promise((resolve) => window.setTimeout(resolve, POST_RENDER_PAUSE_MS));
    if (generation !== activeGeneration || !playing) return null;

    const ctx = ensurePlaybackContext();
    if (ctx.state === "suspended") await ctx.resume();
    if (generation !== activeGeneration || !playing) return null;

    const source = ctx.createBufferSource();
    source.buffer = rendered.buffer;

    const gain = ctx.createGain();
    gain.gain.value = 1;

    source.connect(gain);
    gain.connect(ctx.destination);

    active = { context: ctx, source, gain, generation };

    source.addEventListener("ended", () => {
      if (generation !== activeGeneration || !playing) return;
      active = null;

      const nextSettings = readAuditionSettings();
      if (nextSettings.loop) {
        window.setTimeout(() => {
          if (generation !== activeGeneration || !playing) return;
          renderAndPlayCycle(generation).catch((error) => {
            if (generation === activeGeneration) {
              playing = false;
              console.error("synthPhace audition loop failed:", error);
            }
          });
        }, 0);
      } else {
        playing = false;
        auditionState = "idle";
        notifyAuditionState();
      }
    }, { once: true });

    auditionState = "playing";
    notifyAuditionState();
    source.start();
    return {
      ...rendered,
      auditionSettings,
    };
  }

  async function play() {
    stop();
    const generation = activeGeneration;
    playing = true;
    auditionState = "rendering";
    notifyAuditionState();

    try {
      return await renderAndPlayCycle(generation);
    } catch (error) {
      if (generation === activeGeneration) {
        playing = false;
        auditionState = "idle";
      }
      throw error;
    }
  }

  async function toggle() {
    if (playing) {
      stop();
      return null;
    }
    return play();
  }

  async function renderGlobalTrigger({ gateSeconds, effectsReleaseMs = 120 } = {}) {
    const adapter = window.SynthPhacePatchAdapter;
    if (!adapter) throw new Error("synthPhace patch adapter is unavailable.");

    adapter.captureAndSave?.(window.SynthPhaceUIState || {});
    const legacyPatch = adapter.getLegacyPatch();
    const safeGateSeconds = Math.max(0.01, Number(gateSeconds) || 0.01);
    const safeReleaseMs = Math.max(10, Math.min(4000, Math.round(Number(effectsReleaseMs) || 120)));

    const generation = activeGeneration;
    return renderCompleteAudition(
      legacyPatch,
      generation,
      {
        loop: true,
        lengthSeconds: safeGateSeconds,
        effectsReleaseMs: safeReleaseMs,
        effectsReleaseSeconds: safeReleaseMs / 1000,
      },
    );
  }



  async function renderPreEffectsArpNoteBuffer(sourcePatch, midiNote, gateSeconds, tempo) {
    const note = Number(midiNote);
    if (!Number.isFinite(note)) throw new Error("A valid arp MIDI note is required.");

    const patch = {
      ...sourcePatch,
      midiNote: note,
      tempo: Math.max(30, Math.min(300, Number(tempo) || 75)),
    };

    const naturalLength = patch.synth?.engine?.mode === "pretty" ? 2 : envelopeLength(patch);
    const safeGateSeconds = Math.max(0.01, Number(gateSeconds) || 0.01);
    const noteLength = Math.min(naturalLength, safeGateSeconds);
    const ctx = new OfflineAudioContextClass(
      2,
      Math.max(1, Math.ceil((noteLength + 0.08) * SAMPLE_RATE)),
      SAMPLE_RATE
    );

    const voice = buildVoice(ctx, patch);
    const envelope = voice.envelope;

    const transient = window.TransientSourceEngine.apply(
      ctx,
      envelope.node,
      patch.transient,
      patch.midiNote,
      patch.envelope.ahdhd,
    );

    const filtered = window.FilterEngine.apply(ctx, transient.node, patch.filter);

    const textured = window.TextureEngine.apply(
      ctx,
      filtered.node,
      patch.texture,
      envelope.noteLength,
      patch.midiNote,
      patch.envelope.ahdhd,
    );

    let performanceNode = textured.node;
    if (envelope.noteLength > safeGateSeconds) {
      const gate = ctx.createGain();
      const fade = Math.min(0.035, Math.max(0.008, safeGateSeconds * 0.18));
      const releaseStart = Math.max(0, safeGateSeconds - fade);
      gate.gain.setValueAtTime(1, 0);
      gate.gain.setValueAtTime(1, releaseStart);
      gate.gain.linearRampToValueAtTime(0, safeGateSeconds);
      textured.node.connect(gate);
      performanceNode = gate;
    }

    performanceNode.connect(ctx.destination);
    return ctx.startRendering();
  }

  const dryArpPrebuild = new Map();
  let lastDryArpPrebuildDiagnostics = null;
  // Full-note aP cache: a rendered buffer contains the complete sP sound and
  // effects, but deliberately excludes the live output controls.  A cache
  // generation is the complete captured patch state; old generations are not
  // discarded while a replacement generation is rendering.
  const completeArpPrebuild = new Map();
  const completeArpBuilds = new Map();
  let completeArpWarmGeneration = 0;
  let completeArpWarmPending = null;
  let lastCompleteArpPrebuildDiagnostics = { status: "not-run", hits: 0, misses: 0, liveFallbacks: 0, replacementReady: false };
  function stableState(value) {
    if (Array.isArray(value)) return value.map(stableState);
    if (value && typeof value === "object") return Object.keys(value).sort().reduce((out, key) => {
      out[key] = stableState(value[key]);
      return out;
    }, {});
    return value;
  }
  function fullArpSoundVersion(patch) {
    // midiNote is supplied separately below; tempo remains part of the state
    // because tempo-synced effects can change the rendered sound.
    const copy = cloneLiveState(patch) || {};
    delete copy.midiNote;
    return JSON.stringify(stableState(copy));
  }
  function fullArpCacheKey(soundVersion, midiNote, gateSeconds, releaseSeconds) {
    return `${soundVersion}|${Math.round(midiNote)}|${Math.round(gateSeconds * 10000)}|${Math.round(releaseSeconds * 10000)}`;
  }
  async function renderCompleteArpNote(sourcePatch, event, releaseSeconds) {
    const patch = { ...sourcePatch, midiNote: event.midiNote };
    const rendered = await renderPass(
      patch,
      event.gateSeconds + releaseSeconds + .08,
      event.gateSeconds,
      releaseSeconds,
      { postMix: false },
    );
    return finalizeBuffer(rendered.buffer);
  }
  async function prebuildCompleteArpNotes(sequence, suppliedPatch = null, requestGeneration = null) {
    const adapter = window.SynthPhacePatchAdapter;
    const sourcePatch = cloneLiveState(suppliedPatch) || adapter?.getLegacyPatch?.();
    if (!sourcePatch) throw new Error("A complete synth patch is required for aP full-note caching.");
    const releaseSeconds = Math.max(.01, Math.min(4, (Number(sequence?.effectsReleaseMs) || 30) / 1000));
    const soundVersion = fullArpSoundVersion(sourcePatch);
    const events = [...new Map((sequence?.events || []).map(event => {
      const midiNote = Math.round(Number(event?.midiNote));
      const gateSeconds = Math.max(.01, Number(event?.gateSeconds) || .01);
      return [fullArpCacheKey(soundVersion, midiNote, gateSeconds, releaseSeconds), { midiNote, gateSeconds }];
    })).values()].filter(event => Number.isFinite(event.midiNote));
    const startedQueue = performance.now(), notes = [], buildId = `${soundVersion}:${Date.now()}`;
    const requiredKeys = events.map(event => fullArpCacheKey(soundVersion, event.midiNote, event.gateSeconds, releaseSeconds));
    const initialReady = requiredKeys.filter(key => completeArpPrebuild.has(key)).length;
    completeArpBuilds.set(soundVersion, { status: initialReady === events.length ? "ready" : "building", buildId, total: events.length, ready: initialReady, requiredKeys });
    for (const event of events) {
      if (requestGeneration !== null && requestGeneration !== completeArpWarmGeneration) {
        return { status: "superseded", phrase: sequence?.phrase || null, soundVersion };
      }
      const started = performance.now();
      const key = fullArpCacheKey(soundVersion, event.midiNote, event.gateSeconds, releaseSeconds);
      if (!completeArpPrebuild.has(key)) completeArpPrebuild.set(key, await renderCompleteArpNote(sourcePatch, event, releaseSeconds));
      const buffer = completeArpPrebuild.get(key);
      const build = completeArpBuilds.get(soundVersion);
      if (build?.buildId === buildId) build.ready += 1;
      notes.push({ ...event, status: "ready", renderMs: Math.round((performance.now() - started) * 10) / 10, seconds: buffer.duration, frames: buffer.length });
    }
    const ready = requiredKeys.filter(key => completeArpPrebuild.has(key)).length;
    completeArpBuilds.set(soundVersion, { status: ready === events.length ? "ready" : "building", buildId, total: events.length, ready, requiredKeys });
    lastCompleteArpPrebuildDiagnostics = { status: ready === events.length ? "ready" : "partial", phrase: sequence?.phrase || null, soundVersion, notes, ready, cachedBuffers: completeArpPrebuild.size, totalQueueMs: Math.round((performance.now() - startedQueue) * 10) / 10, hits: lastCompleteArpPrebuildDiagnostics.hits || 0, misses: lastCompleteArpPrebuildDiagnostics.misses || 0, liveFallbacks: lastCompleteArpPrebuildDiagnostics.liveFallbacks || 0, replacementReady: ready === events.length };
    return lastCompleteArpPrebuildDiagnostics;
  }
  function warmCompleteArpNotes(sequence, synthState, { settleMs = 0 } = {}) {
    const patch = livePatch(synthState);
    if (!patch) return Promise.reject(new Error("A complete synth patch is required for aP full-note caching."));
    const generation = ++completeArpWarmGeneration;
    if (completeArpWarmPending) {
      clearTimeout(completeArpWarmPending.timer);
      completeArpWarmPending.resolve({ status: "superseded" });
      completeArpWarmPending = null;
    }
    return new Promise((resolve, reject) => {
      const launch = () => {
        completeArpWarmPending = null;
        prebuildCompleteArpNotes(sequence, patch, generation).then(resolve, reject);
      };
      const timer = window.setTimeout(launch, Math.max(0, Number(settleMs) || 0));
      completeArpWarmPending = { timer, resolve };
    });
  }
  async function prebuildDryArpNotes(sequence) {
    const adapter = window.SynthPhacePatchAdapter;
    const patch = adapter?.getLegacyPatch?.();
    const notes = [...new Set((sequence?.events || []).map(e => Number(e?.midiNote)).filter(Number.isFinite))];
    const queueStarted = performance.now();
    const results = [];
    for (const midiNote of notes) {
      const started = performance.now();
      const notePatch = { ...patch, midiNote };
      const seconds = Math.max(.05, Math.min(4, envelopeLength(notePatch) + .08));
      const ctx = new OfflineAudioContextClass(2, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);
      const voice = buildVoice(ctx, notePatch);
      voice.envelope.node.connect(ctx.destination);
      const buffer = await ctx.startRendering();
      dryArpPrebuild.set(midiNote, buffer);
      results.push({ midiNote, status: "ready", renderMs: Math.round((performance.now() - started) * 10) / 10, seconds: buffer.duration, frames: buffer.length });
    }
    lastDryArpPrebuildDiagnostics = { phrase: sequence?.phrase || null, notes: results, ready: dryArpPrebuild.size, totalQueueMs: Math.round((performance.now() - queueStarted) * 10) / 10 };
    return lastDryArpPrebuildDiagnostics;
  }

  async function renderArpPerformance({
    events = [],
    loopSeconds,
    effectsReleaseMs = 30,
    tempo = 75,
  } = {}) {
    const adapter = window.SynthPhacePatchAdapter;
    if (!adapter) throw new Error("synthPhace patch adapter is unavailable.");
    if (!OfflineAudioContextClass) throw new Error("Offline Web Audio rendering is unavailable.");

    adapter.captureAndSave?.(window.SynthPhaceUIState || {});
    const sourcePatch = adapter.getLegacyPatch();
    const safeTempo = Math.max(30, Math.min(300, Number(tempo) || 75));
    const safeLoopSeconds = Math.max(0.05, Number(loopSeconds) || 0.05);

    const normalizedEvents = Array.from(events || [])
      .map(event => ({
        midiNote: Number(event?.midiNote),
        gateSeconds: Math.max(0.01, Number(event?.gateSeconds) || 0.01),
        offsetSeconds: Math.max(0, Number(event?.offsetSeconds) || 0),
        volumeMultiplier: Math.max(0, Math.min(1, Number(event?.volumeMultiplier ?? 1))),
      }))
      .filter(event => Number.isFinite(event.midiNote));

    const naturalTail = Math.max(
      0.12,
      Number(window.EffectsEngine.computeTail?.(sourcePatch.fx, safeTempo)) || 0.12
    );
    const requestedRelease = Math.max(
      0.01,
      Math.min(4, (Number(effectsReleaseMs) || 30) / 1000)
    );
    const effectsTail = Math.max(naturalTail, requestedRelease);
    const totalSeconds = safeLoopSeconds + effectsTail + INITIAL_SAFETY_SECONDS;

    const ctx = new OfflineAudioContextClass(
      2,
      Math.max(1, Math.ceil(totalSeconds * SAMPLE_RATE)),
      SAMPLE_RATE
    );
    const performanceBus = ctx.createGain();
    const cache = new Map();

    const keyFor = event =>
      `${Math.round(event.midiNote)}:${Math.round(event.gateSeconds * 10000)}`;

    for (const event of normalizedEvents) {
      const key = keyFor(event);
      if (cache.has(key)) continue;
      cache.set(
        key,
        await renderPreEffectsArpNoteBuffer(
          sourcePatch,
          event.midiNote,
          event.gateSeconds,
          safeTempo
        )
      );
    }

    for (const event of normalizedEvents) {
      const buffer = cache.get(keyFor(event));
      if (!buffer) continue;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = event.volumeMultiplier;
      source.connect(gain);
      gain.connect(performanceBus);
      source.start(event.offsetSeconds);
    }

    const effected = window.EffectsEngine.applyAll(
      ctx,
      performanceBus,
      sourcePatch.fx,
      safeLoopSeconds,
      safeTempo,
    );

    const master = ctx.createGain();
    const synthMixer = readGlobalMixerChannel("synth");
    master.gain.value = 0.72 * synthMixer.gain;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;

    effected.node.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    const rendered = await ctx.startRendering();
    const finalized = finalizeBuffer(rendered);

    return {
      buffer: finalized,
      loopSeconds: safeLoopSeconds,
      eventCount: normalizedEvents.length,
      effectsTail,
      projectContext: adapter.readProjectContext(),
    };
  }


  async function renderArpNote({
    midiNote,
    gateSeconds,
    effectsReleaseMs = 30,
    tempo = 75,
  } = {}) {
    const adapter = window.SynthPhacePatchAdapter;
    if (!adapter) throw new Error("synthPhace patch adapter is unavailable.");

    adapter.captureAndSave?.(window.SynthPhaceUIState || {});
    const sourcePatch = adapter.getLegacyPatch();
    const note = Number(midiNote);
    if (!Number.isFinite(note)) throw new Error("A valid arp MIDI note is required.");

    const safeGateSeconds = Math.max(0.01, Number(gateSeconds) || 0.01);
    const safeReleaseMs = Math.max(
      10,
      Math.min(4000, Math.round(Number(effectsReleaseMs) || 30))
    );

    // Clone only for this render. The saved synthPhace patch/root is not mutated.
    const arpPatch = {
      ...sourcePatch,
      midiNote: note,
      tempo: Math.max(30, Math.min(300, Number(tempo) || 75)),
    };

    const generation = activeGeneration;
    return renderCompleteAudition(
      arpPatch,
      generation,
      {
        loop: true,
        lengthSeconds: safeGateSeconds,
        effectsReleaseMs: safeReleaseMs,
        effectsReleaseSeconds: safeReleaseMs / 1000,
      },
    );
  }



  async function renderConstructionNote({
    midiNote,
    gateSeconds = 2,
    tempo = 75,
    dry = false,
    noHarmonies = false,
    noiseOnly = false,
    transientOnly = false,
    needleDropVariation = 0,
    effectsReleaseMs = 120,
  } = {}) {
    const adapter = window.SynthPhacePatchAdapter;
    adapter.captureAndSave?.(window.SynthPhaceUIState || {});
    const sourcePatch = adapter.getLegacyPatch();
    const patch = JSON.parse(JSON.stringify(sourcePatch));
    patch.midiNote = Number.isFinite(Number(midiNote)) ? Number(midiNote) : sourcePatch.midiNote;
    patch.tempo = Math.max(30, Math.min(300, Number(tempo) || 75));
    if (noHarmonies || noiseOnly || transientOnly) {
      if (patch.synth?.fm?.harmonic1) patch.synth.fm.harmonic1.gain = 0;
      if (patch.synth?.fm?.harmonic2) patch.synth.fm.harmonic2.gain = 0;
    }
    if (noiseOnly || transientOnly) {
      if (patch.synth?.fm) patch.synth.fm.carrierVolume = 0;
      if (patch.synth?.pretty) patch.synth.pretty.level = 0;
    }
    if (noiseOnly) {
      if (patch.transient) patch.transient.volume = 0;
    }
    if (transientOnly) {
      if (patch.texture) patch.texture.amount = 0;
      if (patch.transient && Number(needleDropVariation) > 0) {
        patch.transient.exportVariation = Math.max(1, Math.min(5, Math.round(Number(needleDropVariation))));
      }
    }
    if (dry && patch.fx) {
      for (const value of Object.values(patch.fx)) {
        if (value && typeof value === "object") {
          if ("preset" in value) value.preset = 0;
          if ("wet" in value) value.wet = 0;
        }
      }
      patch.fx.wetDryMix = 0;
    }
    const safeEffectsReleaseMs = Math.max(10, Math.min(400, Math.round(Number(effectsReleaseMs) || 120)));
    return renderCompleteAudition(patch, activeGeneration, {
      loop: false,
      lengthSeconds: Math.max(0.05, Number(gateSeconds) || 2),
      effectsReleaseMs: safeEffectsReleaseMs,
      effectsReleaseSeconds: safeEffectsReleaseMs / 1000,
    });
  }

  function currentTransientPreset() {
    const adapter = window.SynthPhacePatchAdapter;
    adapter?.captureAndSave?.(window.SynthPhaceUIState || {});
    return Math.round(Number(adapter?.getLegacyPatch?.()?.transient?.preset) || 0);
  }

  function cloneLiveState(state) {
    try { return JSON.parse(JSON.stringify(state)); }
    catch (_) { return null; }
  }

  // The established graph builders use ctx.currentTime when scheduling their
  // source/envelope internals. This small scheduling view preserves that DSP
  // exactly while putting the next complete voice on a future transport point.
  function scheduledContext(ctx, startAt, scheduledSources = null) {
    return new Proxy(ctx, {
      get(target, property) {
        if (property === "currentTime") return startAt;
        const value = Reflect.get(target, property, target);
        // A complete live graph includes sources created inside its effects
        // (chorus/detune/width/delay modulators) as well as the core voice.
        // Keep every scheduled source with this voice so Stop can terminate
        // the whole graph instead of leaving silent LFOs running forever.
        if (
          scheduledSources &&
          (property === "createOscillator" || property === "createBufferSource") &&
          typeof value === "function"
        ) {
          return (...args) => {
            const source = value.apply(target, args);
            scheduledSources.push(source);
            return source;
          };
        }
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  function liveLoopSeconds(state) {
    const tempo = Math.max(30, Math.min(300, Number(state?.project?.tempo) || 75));
    const bars = Math.max(1, Math.min(16, Math.round(Number(state?.playback?.loopLengthBars) || 4)));
    return bars * 4 * 60 / tempo;
  }

  function livePatch(state) {
    const patch = cloneLiveState(state?.patch);
    if (!patch || typeof patch !== "object") return null;
    patch.midiNote = Math.max(21, Math.min(108, Math.round(Number(state?.project?.root) || patch.midiNote || 60)));
    patch.tempo = Math.max(30, Math.min(300, Number(state?.project?.tempo) || patch.tempo || 75));
    return patch;
  }

  function disposeLiveVoice(record) {
    if (!record || !liveVoices.delete(record)) return;
    if (record.cleanupTimer) window.clearTimeout(record.cleanupTimer);
    for (const oscillator of record.sources || []) {
      // This runs only after the graph's own gate and effects release are
      // silent. Stopping the source here reclaims the underlying DSP without
      // changing the audible note.
      try { oscillator.stop(record.context.currentTime + 0.005); } catch (_) {}
      try { oscillator.disconnect(); } catch (_) {}
    }
    try { record.master.disconnect(); } catch (_) {}
  }

  function releaseLiveVoice(record, at) {
    if (!record || !liveVoices.has(record)) return;
    try {
      record.master.gain.cancelScheduledValues(at);
      record.master.gain.setValueAtTime(record.master.gain.value, at);
      record.master.gain.linearRampToValueAtTime(0, at + LIVE_VOICE_STEAL_RELEASE_SECONDS);
    } catch (_) {}
    window.setTimeout(
      () => disposeLiveVoice(record),
      Math.max(0, at - record.context.currentTime + LIVE_VOICE_STEAL_RELEASE_SECONDS + .02) * 1000,
    );
  }

  function enforceLiveVoiceLimit(context, startAt) {
    const activeAtStart = [...liveVoices]
      .filter(record => record.startAt <= startAt && record.audibleUntil > startAt)
      .sort((a, b) => a.audibleUntil - b.audibleUntil);
    if (activeAtStart.length < LIVE_MAX_COMPLEX_VOICES) return;
    // This is an overload guard only. Under normal musical density, every
    // graph keeps its authored gate and effects-release behavior untouched.
    releaseLiveVoice(activeAtStart[0], Math.max(context.currentTime, startAt));
  }

  function registerLiveVoice(context, graph, startAt, gateSeconds, releaseSeconds) {
    enforceLiveVoiceLimit(context, startAt);
    const audibleUntil = startAt + gateSeconds + releaseSeconds;
    const record = {
      context,
      master: graph.master,
      sources: graph.sources,
      startAt,
      audibleUntil,
      cleanupTimer: null,
    };
    liveVoices.add(record);
    record.cleanupTimer = window.setTimeout(
      () => disposeLiveVoice(record),
      Math.ceil((Math.max(0, audibleUntil - context.currentTime) + 0.04) * 1000),
    );
    return record;
  }

  function scheduleLiveTrigger(startAt, state) {
    const context = ensurePlaybackContext();
    const patch = livePatch(state);
    if (!patch) return;
    const loopSeconds = liveLoopSeconds(state);
    const releaseSeconds = Math.max(0.01, Math.min(4, (Number(state?.playback?.effectsReleaseMs) || 120) / 1000));
    const sources = [];
    const graph = buildGraph(scheduledContext(context, startAt, sources), patch, loopSeconds, releaseSeconds);
    graph.sources = sources;
    registerLiveVoice(context, graph, startAt, loopSeconds, releaseSeconds);
  }

  function liveTick() {
    if (!livePlaying) return;
    const context = ensurePlaybackContext();
    const horizon = context.currentTime + LIVE_LOOKAHEAD_SECONDS;
    while (livePlaying && liveNextTriggerAt <= horizon) {
      if (!livePendingState) return;
      if (liveNextTriggerAt < context.currentTime - 0.02) liveNextTriggerAt = context.currentTime + 0.02;
      const triggerState = cloneLiveState(livePendingState);
      scheduleLiveTrigger(liveNextTriggerAt, triggerState);
      // The state that reaches this boundary defines the following musical
      // boundary too. Later edits wait there; they never restart this voice.
      liveNextTriggerAt += liveLoopSeconds(triggerState);
    }
  }

  async function startLive(state) {
    stopLive();
    const context = ensurePlaybackContext();
    if (context.state === "suspended") await context.resume();
    window.top?.InterPhaceRuntimeHost?.transportDiagnostic?.({ stage: "sP-context-ready", childAudioTime: context.currentTime });
    livePendingState = cloneLiveState(state);
    if (!livePendingState) throw new Error("A complete synthPhace live state is required.");
    livePlaying = true;
    const requestedDelay = Math.max(LIVE_START_LEAD_SECONDS, Number(state?.runtimeEntry?.startDelay) || 0);
    const targetEpochMs = Number(state?.runtimeEntry?.transportStartEpochMs);
    const remainingDelay = Number.isFinite(targetEpochMs) ? Math.max(.02, (targetEpochMs - Date.now()) / 1000) : requestedDelay;
    liveNextTriggerAt = context.currentTime + remainingDelay;
    window.top?.InterPhaceRuntimeHost?.transportDiagnostic?.({ stage: "sP-step-zero-armed", childAudioTime: context.currentTime, childStartAt: liveNextTriggerAt, requestedDelay, remainingDelay, expectedEpochMs: Number(state?.runtimeEntry?.transportStartEpochMs) || null });
    liveTick();
    liveTimer = window.setInterval(liveTick, LIVE_TICK_MS);
  }

  function updateLive(state) {
    const next = cloneLiveState(state);
    if (next) livePendingState = next;
  }

  function stopLive() {
    livePlaying = false;
    if (liveTimer) window.clearInterval(liveTimer);
    liveTimer = null;
    livePendingState = null;
    const context = playbackContext;
    if (!context) return;
    const now = context.currentTime;
    for (const record of [...liveVoices]) {
      try {
        record.master.gain.cancelScheduledValues(now);
        record.master.gain.setValueAtTime(record.master.gain.value, now);
        record.master.gain.linearRampToValueAtTime(0, now + LIVE_STOP_RELEASE_SECONDS);
      } catch (_) {}
      window.setTimeout(() => disposeLiveVoice(record), (LIVE_STOP_RELEASE_SECONDS + 0.04) * 1000);
    }
  }

  function scheduleLiveArpEvent(loop, event) {
    const state = loop?.state;
    const sequence = state?.sequence;
    const synthState = state?.synthState;
    const context = ensurePlaybackContext();
    const basePatch = livePatch(synthState);
    if (!sequence || !basePatch) return;
    const releaseSeconds = Math.max(0.01, Math.min(4, (Number(sequence.effectsReleaseMs) || 30) / 1000));
    const offset = Math.max(0, Number(event?.offsetSeconds) || 0);
    const gateSeconds = Math.max(.01, Number(event?.gateSeconds) || .01);
    const patch = cloneLiveState(basePatch);
    patch.midiNote = Math.max(21, Math.min(108, Math.round(Number(event?.midiNote) || basePatch.midiNote)));
    const sources = [];
    const graph = buildGraph(
      scheduledContext(context, loop.startAt + offset, sources),
      patch,
      gateSeconds,
      releaseSeconds,
    );
    graph.sources = sources;
    registerLiveVoice(context, graph, loop.startAt + offset, gateSeconds, releaseSeconds);
  }

  // The persistent root owns global musical time.  These helpers retain the
  // established sP graph and only accept an externally supplied context,
  // destination, and start time.
  function scheduleRootSynthTrigger({ context, destination, startTime, state }) {
    const patch = livePatch(state);
    if (!context || !destination || !patch) return;
    const loopSeconds = liveLoopSeconds(state);
    const releaseSeconds = Math.max(0.01, Math.min(4, (Number(state?.playback?.effectsReleaseMs) || 120) / 1000));
    const sources = [];
    const graph = buildGraph(scheduledContext(context, startTime, sources), patch, loopSeconds, releaseSeconds, destination);
    graph.sources = sources;
    registerLiveVoice(context, graph, startTime, loopSeconds, releaseSeconds);
  }

  function scheduleRootArpEvent({ context, destination, startTime, sequence, synthState, event, useFullNoteCache = false }) {
    const basePatch = livePatch(synthState);
    if (!context || !destination || !sequence || !basePatch || !event) return;
    const releaseSeconds = Math.max(0.01, Math.min(4, (Number(sequence.effectsReleaseMs) || 30) / 1000));
    const gateSeconds = Math.max(.01, Number(event.gateSeconds) || .01);
    const patch = cloneLiveState(basePatch);
    patch.midiNote = Math.max(21, Math.min(108, Math.round(Number(event.midiNote) || basePatch.midiNote)));
    if (useFullNoteCache) {
      const soundVersion = fullArpSoundVersion(patch);
      const key = fullArpCacheKey(soundVersion, patch.midiNote, gateSeconds, releaseSeconds);
      const buffer = completeArpPrebuild.get(key);
      if (buffer) {
        const source = context.createBufferSource();
        const liveGain = context.createGain();
        source.buffer = buffer;
        // These values are intentionally resolved at trigger time, after the
        // cache.  Cache output is never a frozen mixer/chance decision.
        const mixer = readGlobalMixerChannel("synth");
        liveGain.gain.setValueAtTime(
          Math.max(0, Number(event.volumeMultiplier ?? 1)) * 0.72 * mixer.gain,
          startTime,
        );
        source.connect(liveGain);
        liveGain.connect(destination);
        source.start(startTime);
        lastCompleteArpPrebuildDiagnostics = { ...lastCompleteArpPrebuildDiagnostics, hits: (lastCompleteArpPrebuildDiagnostics.hits || 0) + 1, last: "cache-hit", replacementReady: completeArpBuilds.get(soundVersion)?.status === "ready" };
        return { cached: true };
      }
      lastCompleteArpPrebuildDiagnostics = { ...lastCompleteArpPrebuildDiagnostics, misses: (lastCompleteArpPrebuildDiagnostics.misses || 0) + 1, liveFallbacks: (lastCompleteArpPrebuildDiagnostics.liveFallbacks || 0) + 1, last: "cache-miss-live-fallback", replacementReady: completeArpBuilds.get(soundVersion)?.status === "ready" };
      // Do not block a musical boundary.  The existing live graph plays now;
      // the exact replacement is built in the background for later notes.
      // A completed sound-version build may still lack this exact pitch/gate
      // key after a grid or Pattern change.  Queue the latest snapshot again;
      // the warmer renders only missing keys and supersedes stale requests.
      if (completeArpBuilds.get(soundVersion)?.status !== "building") {
        warmCompleteArpNotes(sequence, synthState, { settleMs: 80 }).catch(error => console.warn("aP full-note cache build failed.", error));
      }
    }
    const sources = [];
    const graph = buildGraph(scheduledContext(context, startTime, sources), patch, gateSeconds, releaseSeconds, destination);
    graph.sources = sources;
    if (Number(event.volumeMultiplier) !== 1) graph.master.gain.setValueAtTime(graph.master.gain.value * Math.max(0, Number(event.volumeMultiplier) || 0), startTime);
    registerLiveVoice(context, graph, startTime, gateSeconds, releaseSeconds);
    return { cached: false };
  }

  function stopRootVoices() {
    for (const record of [...liveVoices]) {
      const now = record.context.currentTime;
      try {
        record.master.gain.cancelScheduledValues(now);
        record.master.gain.setValueAtTime(record.master.gain.value, now);
        record.master.gain.linearRampToValueAtTime(0, now + LIVE_STOP_RELEASE_SECONDS);
      } catch (_) {}
      window.setTimeout(() => disposeLiveVoice(record), (LIVE_STOP_RELEASE_SECONDS + .04) * 1000);
    }
  }

  function arpLoopSeconds(state) {
    return Math.max(.05, Number(state?.sequence?.loopSeconds) || .05);
  }

  function isMelodySequence(state) {
    return state?.sequence?.view === "melody" || state?.sequence?.view === "chance";
  }

  function melodyBarCount(state) {
    return Math.max(1, Math.round((Number(state?.sequence?.loopSixteenths) || 16) / 16));
  }

  function melodyBarSeconds(state) {
    return Math.max(.05, arpLoopSeconds(state) / melodyBarCount(state));
  }

  function scheduleLiveMelodyBar(state, barIndex, startAt) {
    const sequence = state?.sequence;
    if (!sequence) return;
    const firstStep = barIndex * 16;
    const finalStep = firstStep + 16;
    const barOffsetSeconds = firstStep * (arpLoopSeconds(state) / Math.max(1, Number(sequence.loopSixteenths) || 16));
    for (const event of sequence.events || []) {
      const offset = Number(event?.offsetSixteenths);
      if (!Number.isFinite(offset) || offset < firstStep || offset >= finalStep) continue;
      scheduleLiveArpEvent(
        { state, startAt },
        { ...event, offsetSeconds: Math.max(0, Number(event.offsetSeconds) - barOffsetSeconds) }
      );
    }
  }

  function arpTick() {
    if (!liveArpPlaying) return;
    const context = ensurePlaybackContext();
    const horizon = context.currentTime + LIVE_ARP_LOOKAHEAD_SECONDS;
    while (liveArpPlaying) {
      if (isMelodySequence(liveArpPendingState)) {
        if (liveArpNextMelodyBarAt > horizon) return;
        const state = cloneLiveState(liveArpPendingState);
        if (!state) return;
        const barCount = melodyBarCount(state);
        scheduleLiveMelodyBar(state, liveArpMelodyBarIndex % barCount, liveArpNextMelodyBarAt);
        liveArpMelodyBarIndex = (liveArpMelodyBarIndex + 1) % barCount;
        liveArpNextMelodyBarAt += melodyBarSeconds(state);
        continue;
      }
      if (!liveArpCurrentLoop) {
        const state = cloneLiveState(liveArpPendingState);
        if (!state) return;
        liveArpCurrentLoop = { startAt: liveArpNextLoopAt, state, eventIndex: 0 };
        liveArpNextLoopAt += arpLoopSeconds(state);
      }

      const loop = liveArpCurrentLoop;
      const events = loop.state.sequence?.events || [];
      while (loop.eventIndex < events.length) {
        const event = events[loop.eventIndex];
        const eventAt = loop.startAt + Math.max(0, Number(event?.offsetSeconds) || 0);
        if (eventAt > horizon) return;
        scheduleLiveArpEvent(loop, event);
        loop.eventIndex += 1;
      }

      // A new loop takes the latest pending aP/sP state. The old loop has
      // already scheduled every one of its authored events and remains intact.
      if (liveArpNextLoopAt > horizon) return;
      liveArpCurrentLoop = null;
    }
  }

  async function startLiveArp(state) {
    stopLive();
    stopLiveArp();
    const context = ensurePlaybackContext();
    if (context.state === "suspended") await context.resume();
    window.top?.InterPhaceRuntimeHost?.transportDiagnostic?.({ stage: "sP-arp-context-ready", childAudioTime: context.currentTime });
    liveArpPendingState = cloneLiveState(state);
    if (!liveArpPendingState?.sequence || !liveArpPendingState?.synthState) throw new Error("A complete arp and synth live state is required.");
    liveArpPlaying = true;
    const requestedDelay = Math.max(LIVE_START_LEAD_SECONDS, Number(state?.runtimeEntry?.startDelay) || 0);
    const targetEpochMs = Number(state?.runtimeEntry?.transportStartEpochMs);
    const remainingDelay = Number.isFinite(targetEpochMs) ? Math.max(.02, (targetEpochMs - Date.now()) / 1000) : requestedDelay;
    liveArpNextLoopAt = context.currentTime + remainingDelay;
    window.top?.InterPhaceRuntimeHost?.transportDiagnostic?.({ stage: "sP-arp-step-zero-armed", childAudioTime: context.currentTime, childStartAt: liveArpNextLoopAt, requestedDelay, remainingDelay, expectedEpochMs: Number(state?.runtimeEntry?.transportStartEpochMs) || null });
    liveArpNextMelodyBarAt = liveArpNextLoopAt;
    liveArpMelodyBarIndex = 0;
    liveArpCurrentLoop = null;
    arpTick();
    liveArpTimer = window.setInterval(arpTick, LIVE_TICK_MS);
  }

  function updateLiveArp(state) {
    const next = cloneLiveState(state);
    if (next?.sequence && next?.synthState) liveArpPendingState = next;
  }

  function stopLiveArp() {
    liveArpPlaying = false;
    if (liveArpTimer) window.clearInterval(liveArpTimer);
    liveArpTimer = null;
    liveArpPendingState = null;
    liveArpCurrentLoop = null;
    liveArpNextMelodyBarAt = 0;
    liveArpMelodyBarIndex = 0;
  }

  async function prepareLive() {
    const context = ensurePlaybackContext();
    if (context.state === "suspended") await context.resume();
    window.top?.InterPhaceRuntimeHost?.transportDiagnostic?.({ stage: "sP-prepared", childAudioTime: context.currentTime });
  }

  window.SynthPhaceAuditionEngine = Object.freeze({
    play,
    stop,
    toggle,
    renderGlobalTrigger,
    renderArpNote,
    renderArpPerformance,
    renderConstructionNote,
    currentTransientPreset,
    getAuditionState: () => auditionState,
    isRendering: () => auditionState === "rendering",
    isPlaying: () => auditionState === "playing",
  });

  window.SynthPhaceLiveAPI = Object.freeze({
    state: () => window.SynthPhaceLiveState?.snapshot?.() || null,
    prepare: prepareLive,
    start: startLive,
    update: updateLive,
    startArp: startLiveArp,
    updateArp: updateLiveArp,
    scheduleRootSynthTrigger,
    scheduleRootArpEvent,
    stopRootVoices,
    prebuildDryArpNotes,
    prebuildCompleteArpNotes,
    warmCompleteArpNotes,
    completeArpPrebuildDiagnostics: () => ({ ...lastCompleteArpPrebuildDiagnostics, builds: [...completeArpBuilds.values()] }),
    dryArpPrebuildDiagnostics: () => lastDryArpPrebuildDiagnostics,
    stop: () => { stopLive(); stopLiveArp(); },
  });
})();
