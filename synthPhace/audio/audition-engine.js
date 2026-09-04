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
      const source = window.PrettyEngine.build(ctx, frequency, patch.synth?.pretty || {}, 2);
      return { source, envelope: window.PrettyEnvelopeEngine.apply(ctx, source.node, patch.synth?.prettyEnvelope || {}, source.targets) };
    }
    if (!window.FMEngine?.build || !window.AmpEnvelopeEngine?.apply) throw new Error("synthPhace FM engine is unavailable.");
    const source = window.FMEngine.build(ctx, frequency, patch.synth?.fm || {}, envelopeLength(patch));
    const drawn = patch.envelope?.drawn;
    if (drawn?.active && drawn?.valid && window.DrawnEnvelopeEngine?.apply) {
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

    const loop = !!child.synthAuditionLoop;
    const rawLength = Number(child.synthAuditionLength);
    const lengthSeconds = Number.isFinite(rawLength) && rawLength >= 1 && rawLength <= 5
      ? rawLength
      : null; // null = Full
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

  function buildGraph(ctx, legacyPatch, gateSeconds = null, effectsReleaseSeconds = 0.120) {
    if (!window.TransientSourceEngine?.apply) throw new Error("synthPhace transient source engine is unavailable.");
    if (!window.FilterEngine?.apply) throw new Error("synthPhace filter engine is unavailable.");
    if (!window.TextureEngine?.apply) throw new Error("synthPhace texture engine is unavailable.");
    if (!window.EffectsEngine?.applyAll) throw new Error("synthPhace effects engine is unavailable.");

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
      const releaseStart = Math.max(0, gateSeconds - fade);
      gate.gain.setValueAtTime(1, 0);
      gate.gain.setValueAtTime(1, releaseStart);
      gate.gain.linearRampToValueAtTime(0, gateSeconds);
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

    // Loop Audition is monophonic all the way through its effects.
    // At the voice gate boundary, stop feeding the effects upstream, then
    // quickly release the entire effected signal so delay/reverb cannot pile up.
    if (Number.isFinite(gateSeconds) && gateSeconds > 0) {
      const effectsRelease = ctx.createGain();
      const releaseEnd = gateSeconds + effectsReleaseSeconds;
      effectsRelease.gain.setValueAtTime(1, 0);
      effectsRelease.gain.setValueAtTime(1, gateSeconds);
      effectsRelease.gain.linearRampToValueAtTime(0, releaseEnd);
      effected.node.connect(effectsRelease);
      finalNode = effectsRelease;
    }

    const master = ctx.createGain();
    const synthMixer = readGlobalMixerChannel("synth");
    master.gain.setValueAtTime(0.72 * synthMixer.gain, 0);

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;

    finalNode.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    return {
      source: voice.source,
      envelope,
      performanceLength,
      frequency: midiToFrequency(legacyPatch.midiNote),
      inspection: voice.source.inspection,
      mixer: synthMixer,
    };
  }

  async function renderPass(legacyPatch, totalSeconds, gateSeconds = null, effectsReleaseSeconds = 0.120) {
    if (!OfflineAudioContextClass) {
      throw new Error("Offline Web Audio rendering is unavailable.");
    }
    const frameCount = Math.max(1, Math.ceil(totalSeconds * SAMPLE_RATE));
    const ctx = new OfflineAudioContextClass(2, frameCount, SAMPLE_RATE);
    const graph = buildGraph(ctx, legacyPatch, gateSeconds, effectsReleaseSeconds);
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
    effectsReleaseMs = 120,
  } = {}) {
    const adapter = window.SynthPhacePatchAdapter;
    adapter.captureAndSave?.(window.SynthPhaceUIState || {});
    const sourcePatch = adapter.getLegacyPatch();
    const patch = JSON.parse(JSON.stringify(sourcePatch));
    patch.midiNote = Number.isFinite(Number(midiNote)) ? Number(midiNote) : sourcePatch.midiNote;
    patch.tempo = Math.max(30, Math.min(300, Number(tempo) || 75));
    if (noHarmonies || noiseOnly) {
      if (patch.synth?.fm?.harmonic1) patch.synth.fm.harmonic1.gain = 0;
      if (patch.synth?.fm?.harmonic2) patch.synth.fm.harmonic2.gain = 0;
    }
    if (noiseOnly) {
      if (patch.synth?.fm) patch.synth.fm.carrierVolume = 0;
      if (patch.transient) patch.transient.volume = 0;
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

  window.SynthPhaceAuditionEngine = Object.freeze({
    play,
    stop,
    toggle,
    renderGlobalTrigger,
    renderArpNote,
    renderArpPerformance,
    renderConstructionNote,
    getAuditionState: () => auditionState,
    isRendering: () => auditionState === "rendering",
    isPlaying: () => auditionState === "playing",
  });
})();
