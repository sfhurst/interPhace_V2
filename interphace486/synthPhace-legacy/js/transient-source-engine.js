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
  { name: "Needle Drop", key: "needleDrop", duration: 0.115 },
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
      connectNoise(ctx, out, {
        duration: preset.duration, seed, color: 0.18, hp: 900, lp: 9500,
        peak: volume * 0.42, attack: 0, startTime,
      });
      addPitchedKnock(ctx, out, startTime, rootHz, volume * 0.13, "triangle", 0.030, 2.15);
      break;

    case "felt":
      connectNoise(ctx, out, {
        duration: preset.duration, seed, color: 0.78, hp: 90, lp: 2100,
        peak: volume * 0.36, attack: 0.004, startTime,
      });
      addPitchedKnock(ctx, out, startTime, rootHz, volume * 0.055, "sine", 0.050, 1.05);
      break;

    case "keyClick":
      connectNoise(ctx, out, {
        duration: preset.duration, seed, color: 0.10, hp: 1800, bp: 4200, bpQ: 1.5, lp: 9800,
        peak: volume * 0.34, attack: 0, startTime,
      });
      addPitchedKnock(ctx, out, startTime, rootHz, volume * 0.045, "square", 0.014, 4.0);
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

    case "mallet":
      connectNoise(ctx, out, {
        duration: 0.055, seed, color: 0.30, hp: 350, lp: 7200,
        peak: volume * 0.25, attack: 0, startTime,
      });
      addPitchedKnock(ctx, out, startTime, rootHz, volume * 0.18, "sine", preset.duration, 1.48);
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

TransientSourceEngine.apply = function (ctx, inputNode, config, midiNote) {
  const generated = spawn(ctx, config?.preset, config?.volume, midiNote, 0);
  if (!generated) return { node: inputNode };
  const mix = ctx.createGain();
  inputNode.connect(mix);
  generated.node.connect(mix);
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
