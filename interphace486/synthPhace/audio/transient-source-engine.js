// ============================================================
//  TRANSIENT SOURCE ENGINE
// ============================================================
// Mono transient/articulation sources owned by the Noise section.
// Sources join the normal rack before filter/effects and are independent of
// Instrument Behavior personalities.
// ============================================================

window.TransientSourceEngine = {};

const TRANSIENT_SOURCE_PRESETS = Object.freeze([
  { name: "Off", key: "off", duration: 0 },
  { name: "Hammer", key: "hammer", duration: 0.050 },
  { name: "Felt Hammer", key: "felt", duration: 0.120 },
  { name: "Key Click", key: "keyClick", duration: 0.035 },
  { name: "Brass Blow", key: "brassBlow", duration: 0.460 },
  { name: "Breath / Air", key: "breath", duration: 0.220 },
  { name: "Mallet / Strike", key: "mallet", duration: 0.150 },
  { name: "Needle Drop", key: "needleDrop", duration: 0.666 },
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function presetFrom(value) {
  if (typeof value === "string") {
    if (value === "bow") value = "brassBlow"; // Build 83 compatibility
    return TRANSIENT_SOURCE_PRESETS.find(p => p.key === value || p.name === value) || TRANSIENT_SOURCE_PRESETS[0];
  }
  const index = Math.max(0, Math.min(TRANSIENT_SOURCE_PRESETS.length - 1, Number(value) || 0));
  return TRANSIENT_SOURCE_PRESETS[index];
}

function noiseBuffer(ctx, duration, seed, color = 0) {
  const frames = Math.max(1, Math.ceil(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rnd = seededRandom(seed);
  let low = 0;
  for (let i = 0; i < frames; i++) {
    const white = rnd() * 2 - 1;
    low += 0.035 * (white - low);
    data[i] = white * (1 - color) + low * color;
  }
  return buffer;
}

function connectNoise(ctx, out, config) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, config.duration, config.seed, config.color || 0);
  let node = source;

  if (config.hp) {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = config.hp;
    hp.Q.value = config.hpQ || 0.55;
    node.connect(hp);
    node = hp;
  }
  if (config.bp) {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = config.bp;
    bp.Q.value = config.bpQ || 0.8;
    node.connect(bp);
    node = bp;
  }
  if (config.lp) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = config.lp;
    lp.Q.value = config.lpQ || 0.55;
    node.connect(lp);
    node = lp;
  }

  const gain = ctx.createGain();
  const t = config.startTime;
  const peak = Math.max(0.0001, config.peak);
  gain.gain.setValueAtTime(0.0001, t);
  if (config.attack > 0) {
    gain.gain.linearRampToValueAtTime(peak, t + config.attack);
  } else {
    gain.gain.setValueAtTime(peak, t);
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, t + config.duration);
  node.connect(gain).connect(out);
  source.start(t);
  source.stop(t + config.duration);
}

function addPitchedKnock(ctx, out, startTime, rootHz, volume, type = "triangle", duration = 0.035, ratio = 2.0) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  const startHz = clamp(rootHz * ratio, 90, 2400);
  const endHz = clamp(rootHz * Math.max(0.7, ratio * 0.68), 70, 1800);
  osc.frequency.setValueAtTime(startHz, startTime);
  osc.frequency.exponentialRampToValueAtTime(endHz, startTime + duration * 0.72);
  gain.gain.setValueAtTime(Math.max(0.0001, volume), startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain).connect(out);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.005);
}


function addBrassBlowBody(ctx, out, startTime, rootHz, volume, duration, seed) {
  const osc = ctx.createOscillator();
  const bodyFilter = ctx.createBiquadFilter();
  const bodyGain = ctx.createGain();
  const rnd = seededRandom(seed ^ 0x5a17);

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(rootHz, startTime);

  // This source began as an attempted bowed-string model but auditioned as a
  // useful brass-like mouth blow. Preserve its unstable onset and settling pitch.
  const catchTimes = [0, 0.018, 0.038, 0.065, 0.095, 0.125];
  catchTimes.forEach((dt, i) => {
    const cents = i === catchTimes.length - 1
      ? 0
      : (rnd() * 2 - 1) * (i < 3 ? 11 : 7);
    osc.detune.linearRampToValueAtTime(cents, startTime + dt);
  });

  const settleStart = startTime + 0.125;
  const settleEnd = startTime + duration;
  const vibratoRate = 5.2;
  const vibratoDepth = 5.0;
  const vibratoSteps = Math.max(8, Math.floor((duration - 0.125) * vibratoRate * 8));
  for (let i = 1; i <= vibratoSteps; i++) {
    const progress = i / vibratoSteps;
    const t = settleStart + (settleEnd - settleStart) * progress;
    const cents = Math.sin(progress * (duration - 0.125) * vibratoRate * Math.PI * 2) * vibratoDepth;
    osc.detune.linearRampToValueAtTime(cents, t);
  }

  bodyFilter.type = "lowpass";
  bodyFilter.frequency.setValueAtTime(clamp(rootHz * 7.5, 900, 5200), startTime);
  bodyFilter.frequency.exponentialRampToValueAtTime(clamp(rootHz * 5.2, 700, 3600), startTime + duration);
  bodyFilter.Q.value = 0.8;

  // Irregular pressure during the onset becomes smoother once the tone speaks.
  // These are authored gain points, not a clean LFO.
  const peak = Math.max(0.0001, volume * 0.30);
  bodyGain.gain.setValueAtTime(0.0001, startTime);
  bodyGain.gain.linearRampToValueAtTime(peak * 0.18, startTime + 0.018);
  bodyGain.gain.linearRampToValueAtTime(peak * 0.72, startTime + 0.050);
  bodyGain.gain.linearRampToValueAtTime(peak * 0.48, startTime + 0.078);
  bodyGain.gain.linearRampToValueAtTime(peak, startTime + 0.125);

  const tremRate = 7.0;
  const tremDepth = 0.13;
  const tremSteps = Math.max(10, Math.floor((duration - 0.125) * tremRate * 8));
  for (let i = 1; i <= tremSteps; i++) {
    const progress = i / tremSteps;
    const t = settleStart + (settleEnd - settleStart) * progress;
    const trem = 1 - tremDepth * 0.5 + Math.sin(progress * (duration - 0.125) * tremRate * Math.PI * 2) * tremDepth * 0.5;
    const tail = 1 - progress * 0.22;
    bodyGain.gain.linearRampToValueAtTime(Math.max(0.0001, peak * trem * tail), t);
  }
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(bodyFilter).connect(bodyGain).connect(out);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}



function addNeedleDrop(ctx, out, startTime, volume, seed) {
  const dustDuration = 0.450;
  const dustSource = ctx.createBufferSource();
  const dustBuffer = noiseBuffer(ctx, dustDuration, seed ^ 0x6d21, 0.91);
  const dustData = dustBuffer.getChannelData(0);
  const dustRnd = seededRandom(seed ^ 0xd057);

  // Same Dust texture character: sparse particulate static.
  for (let i = 0; i < dustData.length; i++) {
    if (dustRnd() < 0.0030) {
      const polarity = dustRnd() < 0.5 ? -1 : 1;
      const burst = 0.18 + dustRnd() * 0.28;
      dustData[i] += polarity * burst;
      if (i + 1 < dustData.length) dustData[i + 1] += polarity * burst * 0.55;
      if (i + 2 < dustData.length) dustData[i + 2] += polarity * burst * 0.28;
      if (i + 3 < dustData.length) dustData[i + 3] += polarity * burst * 0.12;
    }
  }

  dustSource.buffer = dustBuffer;
  const dustHp = ctx.createBiquadFilter();
  const dustLp = ctx.createBiquadFilter();
  const dustGain = ctx.createGain();
  dustHp.type = "highpass";
  dustHp.frequency.value = 90;
  dustHp.Q.value = 0.42;
  dustLp.type = "lowpass";
  dustLp.frequency.value = 5600;
  dustLp.Q.value = 0.42;

  // Turn the Dust up a little, then let it naturally disappear.
  const dustAttack = 0.315;
  const dustHold = 0.140;
  dustGain.gain.setValueAtTime(0.0001, startTime);
  dustGain.gain.linearRampToValueAtTime(volume * 0.18, startTime + dustAttack);
  dustGain.gain.setValueAtTime(volume * 0.18, startTime + dustAttack + dustHold);
  dustGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dustDuration);

  dustSource.connect(dustHp).connect(dustLp).connect(dustGain).connect(out);

  // Very subtle short time-based echo: 34 ms, one quiet parallel repeat.
  const microDelay = ctx.createDelay(0.100);
  const microDelayGain = ctx.createGain();
  microDelay.delayTime.value = 0.034;
  microDelayGain.gain.value = 0.16;
  dustGain.connect(microDelay).connect(microDelayGain).connect(out);

  dustSource.start(startTime);
  dustSource.stop(startTime + dustDuration);
}


function addNeedleScratch(ctx, out, startTime, volume, seed) {
  const amount = 0.28;
  const attack = 0.115;
  const hold = 0.100;
  const decay = 0.180;
  const duration = attack + hold + decay;
  const tone = 4950;
  const roughness = 1.00;
  const movement = 0.35;
  const pan = 0.21;

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, duration, seed ^ 0x7331, 0.30 + roughness * 0.45);

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.35 + roughness * 1.2;
  bp.frequency.setValueAtTime(tone, startTime);
  bp.frequency.linearRampToValueAtTime(
    tone * (0.80 + movement * 0.25),
    startTime + Math.max(0.020, duration * 0.50)
  );
  bp.frequency.linearRampToValueAtTime(
    tone * (0.90 + movement * 0.12),
    startTime + duration
  );

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(volume * amount, startTime + attack);
  gain.gain.setValueAtTime(volume * amount, startTime + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  if (panner.pan) panner.pan.value = pan;

  source.connect(bp).connect(gain).connect(panner).connect(out);
  source.start(startTime);
  source.stop(startTime + duration);
}


function addChosenClick(ctx, out, startTime, volume, seed, variant) {
  // Audition bank is intentionally hot so character is easy to judge.
  volume = volume * 6.0;
  const rnd = seededRandom(seed ^ (variant * 7919));
  const family = (variant - 1) % 10;
  const alternate = variant > 10;
  const scale = alternate ? 1.08 : 1.0;

  if (family === 0) {
    // Dry dark mechanical tick.
    connectNoise(ctx, out, {
      duration: alternate ? 0.018 : 0.011, seed, color: 0.32,
      hp: alternate ? 650 : 900, lp: alternate ? 5200 : 6800,
      peak: volume * 0.34 * scale, attack: alternate ? 0.002 : 0, startTime,
    });
  } else if (family === 1) {
    // Low wood/plastic contact.
    connectNoise(ctx, out, {
      duration: alternate ? 0.030 : 0.022, seed, color: 0.62,
      hp: 180, bp: alternate ? 850 : 1150, bpQ: 0.62, lp: 4200,
      peak: volume * 0.30 * scale, attack: 0.002, startTime,
    });
    addPitchedKnock(ctx, out, startTime, alternate ? 150 : 190, volume * 0.09, "sine", 0.045, 0.82);
  } else if (family === 2) {
    // Tiny sub/contact thunk.
    connectNoise(ctx, out, {
      duration: 0.014, seed, color: 0.48, hp: 260, lp: 4300,
      peak: volume * 0.22, attack: 0.001, startTime,
    });
    addPitchedKnock(ctx, out, startTime, alternate ? 62 : 78, volume * 0.18 * scale, "sine", alternate ? 0.055 : 0.038, 0.68);
  } else if (family === 3) {
    // Bright stylus/key contact.
    connectNoise(ctx, out, {
      duration: alternate ? 0.016 : 0.009, seed, color: 0.10,
      hp: alternate ? 1500 : 2300, lp: alternate ? 9000 : 12500,
      peak: volume * 0.30 * scale, attack: 0, startTime,
    });
  } else if (family === 4) {
    // Double mechanical contact.
    connectNoise(ctx, out, {
      duration: 0.012, seed, color: 0.30, hp: 700, lp: 6500,
      peak: volume * 0.26, attack: 0, startTime,
    });
    connectNoise(ctx, out, {
      duration: 0.012, seed: seed ^ 0x4545, color: 0.36, hp: 600, lp: 5800,
      peak: volume * (alternate ? 0.19 : 0.14), attack: 0,
      startTime: startTime + (alternate ? 0.041 : 0.026),
    });
  } else if (family === 5) {
    // Hollow resonant tap.
    connectNoise(ctx, out, {
      duration: 0.020, seed, color: 0.44, hp: 240, lp: 5000,
      peak: volume * 0.22, attack: 0.001, startTime,
    });
    addPitchedKnock(ctx, out, startTime, alternate ? 310 : 240, volume * 0.12, "triangle", alternate ? 0.075 : 0.055, 0.92);
  } else if (family === 6) {
    // Dusty particulate click.
    connectNoise(ctx, out, {
      duration: alternate ? 0.060 : 0.042, seed, color: 0.82,
      hp: 120, lp: alternate ? 5000 : 6200,
      peak: volume * 0.24 * scale, attack: alternate ? 0.006 : 0.003, startTime,
    });
  } else if (family === 7) {
    // Soft felt/contact click.
    connectNoise(ctx, out, {
      duration: alternate ? 0.050 : 0.034, seed, color: 0.76,
      hp: 80, lp: alternate ? 2600 : 3400,
      peak: volume * 0.28 * scale, attack: alternate ? 0.008 : 0.004, startTime,
    });
  } else if (family === 8) {
    // Midrange snap with a short body.
    connectNoise(ctx, out, {
      duration: 0.015, seed, color: 0.22, hp: 500, bp: alternate ? 1750 : 2300,
      bpQ: 0.70, lp: 7200, peak: volume * 0.32 * scale, attack: 0, startTime,
    });
    connectNoise(ctx, out, {
      duration: 0.045, seed: seed ^ 0x9292, color: 0.70, hp: 120, lp: 2800,
      peak: volume * 0.08, attack: 0.004, startTime: startTime + 0.006,
    });
  } else {
    // Click with a very subtle millisecond reflection.
    const bus = ctx.createGain();
    const d = ctx.createDelay(0.100);
    const dg = ctx.createGain();
    d.delayTime.value = alternate ? 0.047 : 0.029;
    dg.gain.value = alternate ? 0.19 : 0.13;
    bus.connect(out);
    bus.connect(d).connect(dg).connect(out);
    connectNoise(ctx, bus, {
      duration: alternate ? 0.020 : 0.013, seed, color: alternate ? 0.42 : 0.28,
      hp: alternate ? 420 : 800, lp: alternate ? 5200 : 7000,
      peak: volume * 0.30, attack: 0.001, startTime,
    });
  }
}


function addNeedleDropClicks(ctx, out, startTime, volume, seed) {
  const spacing = 0.016;
  const repeatLevel = 0.89;
  const pans = [0.59, -0.26];

  for (let n = 0; n < 2; n++) {
    const t = startTime + n * spacing;
    const hitVolume = volume * (n === 0 ? 1 : repeatLevel) * 6.0;

    // Click 33 noise: user-finalized darker color 0.72.
    const bus = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (panner.pan) panner.pan.value = pans[n];
    bus.connect(panner).connect(out);

    connectNoise(ctx, bus, {
      duration: 0.014,
      seed: seed ^ (n * 0x3311),
      color: 0.72,
      hp: 260,
      lp: 4300,
      peak: hitVolume * 0.22,
      attack: 0.001,
      startTime: t,
    });

    // User-finalized tone gain 0.20; remaining Click 33 tone values unchanged.
    addPitchedKnock(ctx, bus, t, 62, hitVolume * 0.20, "sine", 0.055, 0.68);
  }
}


function addChosenRepeatingClick(ctx, out, startTime, volume, seed, variant) {
  const local = variant - 20;           // 1..20
  const baseVariant = local;            // reuse Click 01..20 timbre families
  const rnd = seededRandom(seed ^ (variant * 15401));

  // Alternate 2 and 3 strikes, with a broad range of very short spacings.
  const repeats = (local % 3 === 0 || local % 5 === 0) ? 3 : 2;
  const spacingTable = [
    0.008, 0.011, 0.014, 0.017, 0.020,
    0.023, 0.026, 0.030, 0.034, 0.038,
    0.010, 0.013, 0.016, 0.019, 0.022,
    0.025, 0.029, 0.033, 0.037, 0.042
  ];
  const spacing = spacingTable[local - 1];

  for (let n = 0; n < repeats; n++) {
    // Small natural variation so repeated contacts do not sound copy/pasted.
    const jitter = n === 0 ? 0 : (rnd() - 0.5) * 0.002;
    const hitVolume = n === 0 ? volume : volume * (0.82 + rnd() * 0.14);
    addChosenClick(
      ctx, out,
      startTime + n * spacing + jitter,
      hitVolume,
      seed ^ (n * 0x3311),
      baseVariant
    );
  }
}

function spawn(ctx, presetValue, volumeValue, midiNote, offsetSeconds = 0) {
  const preset = presetFrom(presetValue);
  const volume = clamp(volumeValue, 0, 100) / 100;
  if (preset.key === "off" || volume <= 0) return null;

  const startTime = ctx.currentTime + Math.max(0, Number(offsetSeconds) || 0);
  const midi = Number.isFinite(Number(midiNote)) ? Number(midiNote) : 60;
  const rootHz = 440 * Math.pow(2, (midi - 69) / 12);
  const out = ctx.createGain();
  const seed = 1709 + midi * 101 + preset.key.length * 7919;

  switch (preset.key) {
    case "hammer":
      // Hammer now uses the exact Click 22 audition sound.
      addChosenRepeatingClick(ctx, out, startTime, volume, seed, 22);
      break;
    case "felt":
      // Felt Hammer now uses the exact Click 12 audition sound.
      addChosenClick(ctx, out, startTime, volume, seed, 12);
      break;
    case "keyClick":
      // Key Click now uses the exact Click 09 audition sound.
      addChosenClick(ctx, out, startTime, volume, seed, 9);
      break;
    case "brassBlow":
      // Build 83's attempted bow became a useful breathy brass-like articulation.
      // Preserve it intentionally as Brass Blow rather than discarding the sound.
      connectNoise(ctx, out, {
        duration: preset.duration, seed, color: 0.40, hp: 260,
        bp: clamp(rootHz * 3.8, 850, 4600), bpQ: 0.72, lp: 7200,
        peak: volume * 0.19, attack: 0.010, startTime,
      });
      addBrassBlowBody(ctx, out, startTime, rootHz, volume, preset.duration, seed);
      break;

    case "breath":
      connectNoise(ctx, out, {
        duration: preset.duration, seed, color: 0.16, hp: 900, bp: 3200, bpQ: 0.55, lp: 11500,
        peak: volume * 0.20, attack: 0.025, startTime,
      });
      break;

    case "needleDrop": {
      // Render the accepted Dust + Click 33 composite and replay it -3 semitones.
      // Playback rate changes pitch and speed together, like pitching a sample.
      const shiftRate = Math.pow(2, -3 / 12);
      const renderDuration = 0.560;
      const frames = Math.ceil(ctx.sampleRate * renderDuration);
      const offline = new OfflineAudioContext(1, frames, ctx.sampleRate);
      const offlineOut = offline.createGain();
      offlineOut.connect(offline.destination);

      addNeedleDrop(offline, offlineOut, 0, volume, seed);
      addNeedleDropClicks(offline, offlineOut, 0, volume * 2.0, seed ^ 0x33ad);
      addNeedleScratch(offline, offlineOut, 0, volume, seed);

      offline.startRendering().then((rendered) => {
        const shifted = ctx.createBufferSource();
        shifted.buffer = rendered;
        shifted.playbackRate.value = shiftRate;
        shifted.connect(out);
        shifted.start(startTime);
      });
      break;
    }








































    case "mallet":
      // Physical contact plus a note-relative resonant body. This is the useful
      // "kur-thump" character from the earlier Needle Drop experiment.
      connectNoise(ctx, out, {
        duration: 0.014, seed: seed ^ 0x1837, color: 0.34, hp: 900, lp: 6500,
        peak: volume * 0.16, attack: 0.001, startTime,
      });
      addPitchedKnock(ctx, out, startTime, rootHz, volume * 0.44, "sine", 0.105, 0.72);
      addPitchedKnock(ctx, out, startTime, rootHz, volume * 0.17, "triangle", 0.060, 1.12);
      connectNoise(ctx, out, {
        duration: 0.105, seed: seed ^ 0x4a91, color: 0.88, hp: 45, lp: 850,
        peak: volume * 0.16, attack: 0.003, startTime: startTime + 0.004,
      });
      break;
  }

  return { node: out, duration: preset.duration, preset };
}

TransientSourceEngine.register = function (patch) {
  patch.transient = patch.transient || { preset: 0, volume: 35 };
};

TransientSourceEngine.initUI = function (patch) {
  UI.bindSlider("transientSourcePreset", "transientSourcePresetValue", value => {
    patch.transient.preset = Number(value);
    return presetFrom(value).name;
  });
  UI.bindSlider("transientSourceVolume", "transientSourceVolumeValue", value => {
    patch.transient.volume = Number(value);
    return `${Math.round(value)}%`;
  });
};

function applyTransientEnvelopeFollower(ctx, node, envelopeParams, transientDuration) {
  const env = envelopeParams || {};
  const mult = Math.max(0.01, Number(env.envMult ?? env.multiplier ?? env.timeMultiplier ?? 1) || 1);
  const attack = Math.max(0, Number(env.attack ?? env.attack1 ?? 0) || 0) * mult;
  const decay1 = Math.max(0, Number(env.decay1 ?? 0) || 0) * mult;
  const tonalSustain = Math.max(0, Math.min(1, Number(env.decay1Target ?? 0.1) || 0));

  const follower = ctx.createGain();
  const now = ctx.currentTime;
  const end = now + Math.max(0.01, Number(transientDuration) || 0.01);
  const attackEnd = Math.min(end, now + attack);
  const decayStart = attackEnd;
  const decayEnd = Math.min(end, decayStart + Math.max(0.01, decay1 * 0.72));
  const sustain = Math.max(0.12, Math.pow(tonalSustain, 1.15));

  follower.gain.setValueAtTime(0.0001, now);
  if (attackEnd > now + 0.0005) follower.gain.linearRampToValueAtTime(1, attackEnd);
  else follower.gain.setValueAtTime(1, now);

  if (decayEnd > decayStart + 0.0005) {
    follower.gain.linearRampToValueAtTime(sustain, decayEnd);
  }
  follower.gain.setValueAtTime(sustain, Math.max(decayEnd, end - 0.012));
  follower.gain.linearRampToValueAtTime(0.0001, end);

  node.connect(follower);
  return follower;
}

TransientSourceEngine.apply = function (ctx, inputNode, config, midiNote, envelopeParams) {
  const generated = spawn(ctx, config?.preset, config?.volume, midiNote, 0);
  if (!generated) return { node: inputNode };
  const mix = ctx.createGain();
  inputNode.connect(mix);
  const followed = applyTransientEnvelopeFollower(
    ctx,
    generated.node,
    envelopeParams,
    generated.duration,
  );
  followed.connect(mix);
  return { node: mix };
};

TransientSourceEngine.getPresetNames = function () {
  return TRANSIENT_SOURCE_PRESETS.map(preset => preset.name);
};

TransientSourceEngine.getDuration = function (presetValue) {
  return presetFrom(presetValue).duration;
};

TransientSourceEngine.computeRequiredLength = function (patch, baseNoteLength) {
  let required = Math.max(0, Number(baseNoteLength) || 0);
  const transient = patch?.transient;
  if (transient && Number(transient.preset) > 0 && Number(transient.volume) > 0) {
    required = Math.max(required, TransientSourceEngine.getDuration(transient.preset));
  }
  return required;
};
