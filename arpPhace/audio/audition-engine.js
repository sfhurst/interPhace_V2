(() => {
  "use strict";

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const SCHEDULER_MS = 40;
  const LOOKAHEAD_SECONDS = 0.35;
  const START_LEAD_SECONDS = 0.055;
  const STOP_FADE_SECONDS = 0.018;

  let context = null;
  let master = null;
  let playing = false;
  let rendering = false;
  let generation = 0;
  let scheduler = null;
  let nextLoopStart = 0;
  let snapshot = null;
  let passSnapshots = null;
  let loopPassIndex = 0;
  let synthBuffers = null;
  let synthHost = null;
  let runtimeSynthState = null;
  let runtimeUsesPitchedEngine = false;
  let pendingRuntimeState = null;
  let playheadTimers = [];
  let melodyBarIndex = 0;

  function midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (Number(midiNote) - 69) / 12);
  }

  function ensureContext() {
    if (!AudioContextClass) throw new Error("Web Audio playback is unavailable.");
    if (!context || context.state === "closed") context = new AudioContextClass();
    return context;
  }

  function notifyAuditionState() {
    window.dispatchEvent(new CustomEvent("interPhace:audition-state"));
  }

  function setButtonState() {
    const button = document.getElementById("shellAudition");
    if (!button) return;
    button.dataset.auditionState = rendering ? "rendering" : playing ? "playing" : "idle";
    notifyAuditionState();
  }

  function makeSaturationCurve(amount = 1.22) {
    const length = 1024;
    const curve = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const x = (i / (length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * amount);
    }
    return curve;
  }

  function scheduleSweetInternalVoice(ctx, destination, event, baseStart, effectsReleaseSeconds) {
    const start = baseStart + event.offsetSeconds;
    const gateEnd = start + Math.max(0.01, event.gateSeconds);
    const voiceFade = Math.min(0.035, Math.max(0.008, event.gateSeconds * 0.18));
    const voiceReleaseStart = Math.max(start, gateEnd - voiceFade);
    const effectEnd = gateEnd + Math.max(0.01, effectsReleaseSeconds);
    const frequency = midiToFrequency(event.midiNote);

    const voiceSum = ctx.createGain();
    const eventVolume = Math.max(0, Math.min(1, Number(event.volumeMultiplier ?? 1)));
    voiceSum.gain.value = 0.23 * eventVolume;

    const oscillators = [];
    const specs = [
      { ratio: 1, gain: 0.82, cents: 0, pan: 0 },
      { ratio: 2, gain: 0.12, cents: 0, pan: 0 },
      { ratio: 3, gain: 0.035, cents: 0, pan: 0 },
      { ratio: 1, gain: 0.10, cents: -5.2, pan: -0.50 },
      { ratio: 1, gain: 0.10, cents: 5.2, pan: 0.50 },
    ];

    for (const spec of specs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency * spec.ratio, start);
      osc.detune.setValueAtTime(spec.cents, start);

      const gain = ctx.createGain();
      gain.gain.value = spec.gain;
      osc.connect(gain);

      if (typeof ctx.createStereoPanner === "function" && spec.pan !== 0) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = spec.pan;
        gain.connect(panner);
        panner.connect(voiceSum);
      } else {
        gain.connect(voiceSum);
      }

      osc.start(start);
      osc.stop(effectEnd + 0.060);
      oscillators.push(osc);
    }

    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.setValueAtTime(Math.min(7200, Math.max(3200, frequency * 14)), start);
    warmth.Q.value = 0.42;

    const shaper = ctx.createWaveShaper();
    shaper.curve = makeSaturationCurve();
    shaper.oversample = "2x";

    const preEffectsGate = ctx.createGain();
    preEffectsGate.gain.setValueAtTime(0, start);
    preEffectsGate.gain.linearRampToValueAtTime(1, start + 0.008);
    preEffectsGate.gain.setValueAtTime(1, voiceReleaseStart);
    preEffectsGate.gain.linearRampToValueAtTime(0, gateEnd);

    voiceSum.connect(warmth);
    warmth.connect(shaper);
    shaper.connect(preEffectsGate);

    // Small early reflections make the tone wider/sweeter without depending
    // on a long reverb tail. The downstream release still owns their cutoff.
    const effectBus = ctx.createGain();
    preEffectsGate.connect(effectBus);

    const earlyA = ctx.createDelay(0.05);
    earlyA.delayTime.value = 0.018;
    const earlyAGain = ctx.createGain();
    earlyAGain.gain.value = 0.070;
    preEffectsGate.connect(earlyA);
    earlyA.connect(earlyAGain);
    earlyAGain.connect(effectBus);

    const earlyB = ctx.createDelay(0.05);
    earlyB.delayTime.value = 0.029;
    const earlyBGain = ctx.createGain();
    earlyBGain.gain.value = 0.045;
    preEffectsGate.connect(earlyB);
    earlyB.connect(earlyBGain);
    earlyBGain.connect(effectBus);

    const effectsRelease = ctx.createGain();
    effectsRelease.gain.setValueAtTime(1, start);
    effectsRelease.gain.setValueAtTime(1, gateEnd);
    effectsRelease.gain.linearRampToValueAtTime(0, effectEnd);

    effectBus.connect(effectsRelease);
    effectsRelease.connect(destination);
  }

  function ensureSynthHost() {
    if (synthHost?.contentWindow?.SynthPhaceAuditionEngine?.renderArpPerformance) {
      return Promise.resolve(synthHost);
    }

    return new Promise((resolve, reject) => {
      if (!synthHost) {
        synthHost = document.createElement("iframe");
        synthHost.src = "../synthPhace/index.html";
        synthHost.hidden = true;
        synthHost.setAttribute("aria-hidden", "true");
        synthHost.tabIndex = -1;
        document.body.appendChild(synthHost);
      }

      const started = performance.now();
      const poll = () => {
        if (synthHost?.contentWindow?.SynthPhaceAuditionEngine?.renderArpPerformance) {
          resolve(synthHost);
          return;
        }
        if (performance.now() - started > 12000) {
          reject(new Error("synthPhace arp render host did not become ready."));
          return;
        }
        window.setTimeout(poll, 40);
      };
      poll();
    });
  }

  function copyBufferToContext(ctx, sourceBuffer) {
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


  function wrapPhraseTail(sourceBuffer, loopSeconds) {
    const loopFrames = Math.max(1, Math.round(loopSeconds * sourceBuffer.sampleRate));
    const output = new AudioBuffer({
      length: loopFrames,
      numberOfChannels: sourceBuffer.numberOfChannels,
      sampleRate: sourceBuffer.sampleRate,
    });

    for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel += 1) {
      const src = sourceBuffer.getChannelData(channel);
      const dst = output.getChannelData(channel);
      dst.set(src.subarray(0, Math.min(loopFrames, src.length)));
      for (let i = loopFrames; i < src.length; i += 1) {
        dst[(i - loopFrames) % loopFrames] += src[i];
      }
    }
    return output;
  }

  async function prepareSynthBuffers(ctx, states, playGeneration) {
    const host = await ensureSynthHost();
    const api = host.contentWindow.SynthPhaceAuditionEngine;
    const state = states[0];

    if (playGeneration !== generation || !playing) return null;

    const rendered = await api.renderArpPerformance({
      events: state.events,
      loopSeconds: state.loopSeconds,
      effectsReleaseMs: state.effectsReleaseMs,
      tempo: state.tempo,
    });

    if (playGeneration !== generation || !playing || !rendered?.buffer) return null;

    return Object.freeze({
      phraseBuffer: copyBufferToContext(
        ctx,
        wrapPhraseTail(rendered.buffer, state.loopSeconds)
      ),
    });
  }

  function scheduleSynthPhrase(ctx, destination, baseStart) {
    const buffer = synthBuffers?.phraseBuffer;
    if (!buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    source.start(baseStart);
  }

  function scheduleLoop(baseStart) {
    if (!playing || !snapshot) return;
    if (pendingRuntimeState) {
      snapshot = pendingRuntimeState;
      passSnapshots = [snapshot];
      pendingRuntimeState = null;
    }
    const ctx = ensureContext();
    const pass = passSnapshots?.length
      ? passSnapshots[loopPassIndex % passSnapshots.length]
      : snapshot;
    loopPassIndex += 1;

    const melodyBarCount = Math.max(1, Math.round((Number(pass.loopSixteenths) || 16) / 16));
    const melodyBarSeconds = Math.max(.05, Number(pass.loopSeconds) / melodyBarCount);
    const isBarScheduledMelody = pass.arpTone && pass.view !== "arp";

    if (isBarScheduledMelody) {
      const firstStep = (melodyBarIndex % melodyBarCount) * 16;
      const finalStep = firstStep + 16;
      const barOffsetSeconds = firstStep * (Number(pass.loopSeconds) / Math.max(1, Number(pass.loopSixteenths) || 16));
      for (const event of pass.events) {
        const offset = Number(event?.offsetSixteenths);
        if (!Number.isFinite(offset) || offset < firstStep || offset >= finalStep) continue;
        scheduleSweetInternalVoice(
          ctx,
          master,
          { ...event, offsetSeconds: Math.max(0, Number(event.offsetSeconds) - barOffsetSeconds) },
          baseStart,
          pass.effectsReleaseSeconds
        );
      }
      schedulePlayheadFollower(ctx, baseStart, pass, firstStep, 16);
      melodyBarIndex = (melodyBarIndex + 1) % melodyBarCount;
      return melodyBarSeconds;
    }

    if (pass.arpTone) {
      for (const event of pass.events) {
        scheduleSweetInternalVoice(
          ctx,
          master,
          event,
          baseStart,
          pass.effectsReleaseSeconds
        );
      }
    } else {
      scheduleSynthPhrase(ctx, master, baseStart);
    }
    schedulePlayheadFollower(ctx, baseStart, pass);
    return pass.loopSeconds;
  }

  function clearPlayheadFollower() {
    for (const timer of playheadTimers) window.clearTimeout(timer);
    playheadTimers = [];
  }

  function schedulePlayheadFollower(ctx, baseStart, state, firstStep = 0, stepCount = null) {
    const totalSixteenths = Math.max(1, Math.round(Number(state?.loopSixteenths) || 1));
    const steps = Math.max(1, Math.round(stepCount ?? totalSixteenths));
    const sixteenth = Math.max(.01, Number(state?.loopSeconds) / totalSixteenths);
    for (let step = 0; step < steps; step += 1) {
      const delay = Math.max(0, (baseStart - ctx.currentTime + step * sixteenth) * 1000);
      playheadTimers.push(window.setTimeout(() => {
        try {
          window.top?.InterPhaceRuntimeHost?.arpPlayhead?.({
            mode: state.view === "arp" ? "arp" : "melody",
            phrase: state.phrase,
            step: firstStep + step,
          });
        } catch (_) {}
      }, delay));
    }
  }

  function schedulerTick() {
    if (!playing || !snapshot || !context) return;
    const horizon = context.currentTime + LOOKAHEAD_SECONDS;

    while (nextLoopStart <= horizon) {
      nextLoopStart += scheduleLoop(nextLoopStart);
    }
  }

  function stop() {
    const wasUsingPitchedEngine = runtimeUsesPitchedEngine;
    generation += 1;
    playing = false;
    rendering = false;
    snapshot = null;
    passSnapshots = null;
    loopPassIndex = 0;
    synthBuffers = null;
    runtimeUsesPitchedEngine = false;
    pendingRuntimeState = null;
    clearPlayheadFollower();

    if (scheduler) {
      clearInterval(scheduler);
      scheduler = null;
    }

    if (master && context && context.state !== "closed") {
      const now = context.currentTime;
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + STOP_FADE_SECONDS);
      } catch (_) {}
    }

    master = null;
    if (wasUsingPitchedEngine) {
      window.top?.InterPhaceRuntimeHost?.pitched?.().then(api => api?.stop?.()).catch(() => {});
    }
    setButtonState();
  }

  async function play(stateOverride = null) {
    stop();

    const state = stateOverride || window.ArpPhaceAuditionState?.snapshot?.();
    if (!state || !["arp","melody","chance"].includes(state.view)) return null;
    if (!Number.isFinite(state.loopSeconds) || state.loopSeconds <= 0) return null;

    // Chance is resolved once when Play begins. Looping reuses that exact
    // realized pass so the musical loop point stays at the phrase boundary and
    // no probability work occurs while playback is running. Stop -> Play rolls
    // a fresh realization through the normal snapshot path.
    passSnapshots = [state];
    if (!passSnapshots.some(pass => pass.events.length)) return null;

    const ctx = ensureContext();
    await ctx.resume();
    window.top?.InterPhaceRuntimeHost?.transportDiagnostic?.({ stage: "aP-context-ready", childAudioTime: ctx.currentTime, arpTone: !!state.arpTone });

    generation += 1;
    const playGeneration = generation;
    playing = true;
    rendering = !state.arpTone;
    snapshot = state;
    loopPassIndex = 0;
    melodyBarIndex = 0;

    master = ctx.createGain();
    const synthMixerGain =
      window.InterPhaceShell?.readMixerChannelGain?.("synth", { respectMute: false })?.gain ?? 1;
    master.gain.value = 0.82 * synthMixerGain;
    master.connect(ctx.destination);
    setButtonState();

    try {
      if (!state.arpTone) {
        synthBuffers = await prepareSynthBuffers(ctx, passSnapshots, playGeneration);
        if (playGeneration !== generation || !playing || !synthBuffers) return null;
      }

      rendering = false;
      setButtonState();

      const requestedDelay = Math.max(START_LEAD_SECONDS, Number(state?.runtimeEntry?.startDelay) || 0);
      const targetEpochMs = Number(state?.runtimeEntry?.transportStartEpochMs);
      const remainingDelay = Number.isFinite(targetEpochMs) ? Math.max(.02, (targetEpochMs - Date.now()) / 1000) : requestedDelay;
      nextLoopStart = ctx.currentTime + remainingDelay;
      window.top?.InterPhaceRuntimeHost?.transportDiagnostic?.({ stage: "aP-step-zero-armed", childAudioTime: ctx.currentTime, childStartAt: nextLoopStart, requestedDelay, remainingDelay, expectedEpochMs: Number(state?.runtimeEntry?.transportStartEpochMs) || null, arpTone: !!state.arpTone });
      nextLoopStart += scheduleLoop(nextLoopStart);

      scheduler = window.setInterval(schedulerTick, SCHEDULER_MS);
      return state;
    } catch (error) {
      if (playGeneration === generation) stop();
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

  async function startLive(state, synthState) {
    stop();
    if (!state || !Number.isFinite(state.loopSeconds) || state.loopSeconds <= 0) return null;
    runtimeSynthState = synthState || runtimeSynthState;
    if (state.arpTone) return play(state);

    const pitched = await window.top?.InterPhaceRuntimeHost?.pitched?.();
    if (!pitched || !runtimeSynthState) throw new Error("Persistent synth runtime is unavailable for arpPhace.");
    const ctx = ensureContext();
    await ctx.resume();
    generation += 1;
    playing = true;
    rendering = false;
    runtimeUsesPitchedEngine = true;
    snapshot = state;
    passSnapshots = [state];
    master = null;
    await pitched.startArp({
      sequence: state,
      synthState: runtimeSynthState,
      runtimeEntry: state.runtimeEntry,
    });
    const requestedDelay = Math.max(START_LEAD_SECONDS, Number(state?.runtimeEntry?.startDelay) || 0);
    const targetEpochMs = Number(state?.runtimeEntry?.transportStartEpochMs);
    const remainingDelay = Number.isFinite(targetEpochMs) ? Math.max(.02, (targetEpochMs - Date.now()) / 1000) : requestedDelay;
    nextLoopStart = ctx.currentTime + remainingDelay;
    schedulePlayheadFollower(ctx, nextLoopStart, state);
    scheduler = window.setInterval(() => {
      if (!playing || !snapshot) return;
      const horizon = ctx.currentTime + LOOKAHEAD_SECONDS;
      while (nextLoopStart + snapshot.loopSeconds <= horizon) {
        nextLoopStart += snapshot.loopSeconds;
        if (pendingRuntimeState) {
          snapshot = pendingRuntimeState;
          pendingRuntimeState = null;
        }
        schedulePlayheadFollower(ctx, nextLoopStart, snapshot);
      }
    }, SCHEDULER_MS);
    setButtonState();
    return state;
  }

  function updateLive(state, synthState) {
    if (!state) return;
    runtimeSynthState = synthState || runtimeSynthState;
    pendingRuntimeState = state;
    if (runtimeUsesPitchedEngine && runtimeSynthState) {
      window.top?.InterPhaceRuntimeHost?.pitched?.()
        .then(api => api?.updateArp?.({ sequence: state, synthState: runtimeSynthState }))
        .catch(console.error);
    }
  }

  async function prepareLive() {
    const ctx = ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
    window.top?.InterPhaceRuntimeHost?.transportDiagnostic?.({ stage: "aP-prepared", childAudioTime: ctx.currentTime });
  }

  function updateSynthLive(synthState) {
    runtimeSynthState = synthState || runtimeSynthState;
    if (runtimeUsesPitchedEngine && snapshot && runtimeSynthState) {
      window.top?.InterPhaceRuntimeHost?.pitched?.()
        .then(api => api?.updateArp?.({ sequence: pendingRuntimeState || snapshot, synthState: runtimeSynthState }))
        .catch(console.error);
    }
  }

  document.getElementById("shellAudition")?.addEventListener("click", async () => {
    try {
      const state = window.ArpPhaceLiveState?.snapshot?.();
      if (window.top !== window && window.InterPhaceShell?.runtime && state) {
        window.InterPhaceShell.runtime.requestStart("arpPhace", state);
        return;
      }
      await toggle();
    } catch (error) {
      console.error("arpPhace audition failed:", error);
    }
  });



  async function renderSourceBar({
    phrase = "p1",
    sourceBar = 1,
    preserveTail = false,
  } = {}) {
    const state = window.ArpPhaceAuditionState?.globalMelodyBarSnapshot?.(phrase, sourceBar);
    if (!state) throw new Error("arpPhace Melody source bar snapshot is unavailable.");
    if (!Number.isFinite(state.loopSeconds) || state.loopSeconds <= 0) {
      throw new Error("arpPhace Melody source bar duration is invalid.");
    }

    if (!state.arpTone) {
      const host = await ensureSynthHost();
      const api = host.contentWindow.SynthPhaceAuditionEngine;
      const rendered = await api.renderArpPerformance({
        events: state.events,
        loopSeconds: state.loopSeconds,
        effectsReleaseMs: state.effectsReleaseMs,
        tempo: state.tempo,
      });
      if (!rendered?.buffer) {
        throw new Error("synthPhace failed to render the Melody performance.");
      }

      return Object.freeze({
        buffer: preserveTail
          ? rendered.buffer
          : wrapPhraseTail(rendered.buffer, state.loopSeconds),
        loopSeconds: state.loopSeconds,
        phrase: state.phrase,
        sourceBar: state.sourceBar,
        tempo: state.tempo,
        eventCount: state.events.length,
      });
    }

    const OfflineAudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineAudioContextClass) throw new Error("Offline Web Audio rendering is unavailable.");

    const sampleRate = 48000;
    const effectsTail = Math.max(
      0.08,
      ...state.events.map(event =>
        Math.max(0, Number(event.gateSeconds) || 0) +
        Math.max(0.01, Number(state.effectsReleaseSeconds) || 0.03)
      )
    );
    const totalSeconds = state.loopSeconds + effectsTail + 0.08;
    const ctx = new OfflineAudioContextClass(
      2,
      Math.max(1, Math.ceil(totalSeconds * sampleRate)),
      sampleRate
    );

    const renderMaster = ctx.createGain();
    renderMaster.gain.value = 0.82;
    renderMaster.connect(ctx.destination);

    for (const event of state.events) {
      scheduleSweetInternalVoice(
        ctx,
        renderMaster,
        event,
        0,
        state.effectsReleaseSeconds
      );
    }

    const rendered = await ctx.startRendering();

    return Object.freeze({
      buffer: preserveTail ? rendered : wrapPhraseTail(rendered, state.loopSeconds),
      loopSeconds: state.loopSeconds,
      phrase: state.phrase,
      sourceBar: state.sourceBar,
      tempo: state.tempo,
      eventCount: state.events.length,
    });
  }

  window.ArpPhaceRenderAPI = Object.freeze({
    renderSourceBar,
  });

  window.ArpPhaceAuditionEngine = Object.freeze({
    play,
    stop,
    toggle,
    getAuditionState: () => rendering ? "rendering" : playing ? "playing" : "idle",
    isPlaying: () => playing && !rendering,
    isRendering: () => rendering,
  });

  window.ArpPhaceLiveAPI = Object.freeze({
    prepare: prepareLive,
    start: startLive,
    update: updateLive,
    updateSynth: updateSynthLive,
    globalMelody: () => window.ArpPhaceLiveState?.globalMelody?.() || null,
    globalMelodyBar: (phrase, bar) => window.ArpPhaceAuditionState?.globalMelodyBarSnapshot?.(phrase, bar) || null,
    scheduleRootToneEvent({ context, destination, startTime, event, effectsReleaseSeconds }) {
      if (!context || !destination || !event) return;
      // Root has already converted this event to its absolute audio start.
      // The established aP voice normally adds offsetSeconds itself, so clear
      // it here to avoid applying the musical offset twice.
      scheduleSweetInternalVoice(context, destination, { ...event, offsetSeconds: 0 }, startTime, Math.max(.01, Number(effectsReleaseSeconds) || .03));
    },
    stop,
  });
})();
