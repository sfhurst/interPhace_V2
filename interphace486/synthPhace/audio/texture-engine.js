// ============================================================
//  NOISE SOURCE ENGINE
// ============================================================
// Deterministic, low-level added noise/dirt sources. Transient sources are
// handled separately by TransientSourceEngine.
// ============================================================

window.TextureEngine = {};

const TEXTURE_PRESETS = [
  { name: "Off", kind: "off" },

  // Continuous analog/media beds
  { name: "Tape", kind: "tape", hiss: 0.30, low: 0.70, flutter: 0.10, hp: 42, lp: 6500, level: 1.00 },
  { name: "Cassette", kind: "cassette", hiss: 0.62, low: 0.38, flutter: 0.20, hp: 210, lp: 7600, level: 1.12 },

  // Surface/media artifacts
  { name: "Clean Vinyl", kind: "vinyl", hiss: 0.035, low: 0.11, crackle: 0.00042, pop: 0.000010, rumble: 0.075, motorHum: 0.020, hp: 32, lp: 7200, level: 0.82 },
  { name: "Dirty Vinyl", kind: "worn", hiss: 0.18, low: 0.55, crackle: 0.0028, pop: 0.000070, rumble: 0.15, motorHum: 0.035, darkDip: 0.22, flutter: 0.14, hp: 42, lp: 6500, level: 0.92, dirtyTransient: 1.0 },
  { name: "Dust", kind: "dust", hiss: 0.14, low: 0.86, crackle: 0.0120, hp: 180, lp: 8200 },

  // Instrument-air textures
  { name: "Air", kind: "air", hiss: 0.94, low: 0.06, flutter: 0.04, hp: 2200, lp: 14500 },
  { name: "Breath", kind: "breath", hiss: 0.58, low: 0.42, breath: 0.34, flutter: 0.18, hp: 420, lp: 9000 },
];

TextureEngine.register = function (patch) {
  patch.texture = patch.texture || { preset: 0, amount: 10 };
};

TextureEngine.initUI = function (patch) {
  UI.bindSlider("texturePreset", "texturePresetValue", (v) => {
    patch.texture.preset = Number(v);
    return TEXTURE_PRESETS[Number(v)]?.name || "Off";
  });
  UI.bindSlider("textureAmount", "textureAmountValue", (v) => {
    patch.texture.amount = Number(v);
    return `${Math.round(v)}%`;
  });
};

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}


function scheduleTextureMacroEnvelope(param, now, envelopeParams, peak) {
  const env = envelopeParams || {};
  const mult = Math.max(0.01, Number(env.envMult ?? env.multiplier ?? env.timeMultiplier ?? 1) || 1);
  const attack = Math.max(0, Number(env.attack ?? env.attack1 ?? 0) || 0) * mult;
  const hold1 = Math.max(0, Number(env.hold1 ?? 0) || 0) * mult;
  const decay1 = Math.max(0, Number(env.decay1 ?? 0) || 0) * mult;
  const hold2 = Math.max(0, Number(env.hold2 ?? 0) || 0) * mult;
  const decay2 = Math.max(0, Number(env.decay2 ?? 0) || 0) * mult;
  const tonalSustain = Math.max(0, Math.min(1, Number(env.decay1Target ?? 0.1) || 0));

  // Texture follows the tonal envelope, but its body is slightly leaner and its
  // final decay is 18% faster so noise feels attached to the instrument rather
  // than hanging over the tone.
  const textureSustain = Math.pow(tonalSustain, 1.18);
  const textureDecay2 = decay2 * 0.82;

  const tAttack = now + attack;
  const tHold1 = tAttack + hold1;
  const tDecay1 = tHold1 + decay1;
  const tHold2 = tDecay1 + hold2;
  const tDecay2 = tHold2 + textureDecay2;

  param.cancelScheduledValues(now);
  param.setValueAtTime(0.0001, now);

  if (attack > 0) param.linearRampToValueAtTime(peak, tAttack);
  else param.setValueAtTime(peak, now);

  param.setValueAtTime(peak, tHold1);

  const sustainLevel = Math.max(0.0001, peak * textureSustain);
  if (decay1 > 0) param.linearRampToValueAtTime(sustainLevel, tDecay1);
  else param.setValueAtTime(sustainLevel, tHold1);

  param.setValueAtTime(sustainLevel, tHold2);

  if (textureDecay2 > 0) {
    param.exponentialRampToValueAtTime(0.0001, tDecay2);
  } else {
    param.setValueAtTime(0.0001, tHold2);
  }

  return Math.max(0.01, tDecay2 - now);
}

function makeNoiseBuffer(ctx, duration, presetIndex, midiNote) {
  const frames = Math.max(1, Math.ceil(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rnd = seededRandom(991 + presetIndex * 7919 + midiNote * 104729);
  const preset = TEXTURE_PRESETS[presetIndex] || TEXTURE_PRESETS[0];

  let low = 0;
  let rumble = 0;
  let breath = 0;
  let dropout = 1;
  let dropoutTarget = 1;
  let dropoutCount = 0;
  let flutterPhase = rnd() * Math.PI * 2;

  const sr = ctx.sampleRate;
  const flutterRate =
    preset.kind === "cassette" ? 0.42 :
    preset.kind === "worn" ? 0.27 :
    preset.kind === "breath" ? 0.55 :
    0.21;

  for (let i = 0; i < frames; i++) {
    const white = rnd() * 2 - 1;

    // Smooth low-frequency bed. This is the "body" of media noise rather than
    // simply low-passing white noise after the fact.
    low += 0.018 * (white - low);

    // Very slow rumble for vinyl only.
    rumble += 0.0012 * (white - rumble);

    // Breath is correlated/noisy rather than static hiss.
    breath += 0.055 * (white - breath);

    let sample =
      white * Number(preset.hiss || 0) +
      low * Number(preset.low || 0);

    if (preset.rumble) {
      sample += rumble * preset.rumble * 4.0;
    }

    // Very quiet turntable/motor component for vinyl sources. Two low
    // harmonics keep it from reading as a pure test-tone hum.
    if (preset.motorHum) {
      const t = i / sr;
      sample += (
        Math.sin(Math.PI * 2 * 60 * t) * 0.72 +
        Math.sin(Math.PI * 2 * 120 * t) * 0.28
      ) * preset.motorHum;
    }

    if (preset.breath) {
      const shapedBreath = breath * (0.65 + 0.35 * Math.abs(white));
      sample = sample * (1 - preset.breath) + shapedBreath * preset.breath * 2.2;
    }

    // Sparse short surface events instead of single-sample impulses. Using a
    // short decaying burst avoids the digital "tick" quality.
    if (preset.crackle && rnd() < preset.crackle) {
      const polarity = rnd() < 0.5 ? -1 : 1;
      const dirtyBoost = preset.dirtyTransient ? 1.85 : 1.0;
      const burst = (0.32 + rnd() * 0.42) * dirtyBoost;
      data[i] += polarity * burst;
      if (i + 1 < frames) data[i + 1] += polarity * burst * 0.62;
      if (i + 2 < frames) data[i + 2] += polarity * burst * 0.34;
      if (i + 3 < frames) data[i + 3] += polarity * burst * 0.16;
      if (preset.dirtyTransient && i + 5 < frames) {
        data[i + 4] += polarity * burst * 0.08;
        data[i + 5] += polarity * burst * 0.035;
      }
    }

    // Rare, larger record pops. These are deliberately much sparser than the
    // low-level surface crackle.
    if (preset.pop && rnd() < preset.pop) {
      const polarity = rnd() < 0.5 ? -1 : 1;
      const popBoost = preset.dirtyTransient ? 1.75 : 1.0;
      const pop = (0.75 + rnd() * 0.70) * popBoost;
      const popLength = preset.dirtyTransient ? 22 : 12;
      const popDecay = preset.dirtyTransient ? 5.2 : 3.2;
      for (let n = 0; n < popLength && i + n < frames; n++) {
        data[i + n] += polarity * pop * Math.exp(-n / popDecay);
      }
    }

    // Tiny slow amplitude motion for tape/cassette/worn/breath. This is much
    // shallower than an audible tremolo and gives the texture life.
    if (preset.flutter) {
      flutterPhase += (Math.PI * 2 * flutterRate) / sr;
      const flutter = 1 + Math.sin(flutterPhase) * preset.flutter * 0.20;
      sample *= flutter;
    }

    data[i] += sample;
  }

  // Preserve the intended relationship between the continuous floor and
  // transient record artifacts. Only apply safety scaling if an actual sample
  // exceeds the buffer range; do not normalize every texture to its loudest pop.
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak > 1.0) {
    const safety = 0.98 / peak;
    for (let i = 0; i < data.length; i++) data[i] *= safety;
  }

  return buffer;
}

TextureEngine.apply = function (ctx, inputNode, texture, noteLength, midiNote, envelopeParams) {
  const presetIndex = Math.max(0, Math.min(TEXTURE_PRESETS.length - 1, Number(texture?.preset) || 0));
  const preset = TEXTURE_PRESETS[presetIndex];
  const amount = Math.max(0, Math.min(1, (Number(texture?.amount) || 0) / 100));
  if (!amount || preset.kind === "off") return { mainBus: inputNode, node: inputNode };

  const macroLength =
    typeof AmpEnvelopeEngine?.computeLength === "function"
      ? AmpEnvelopeEngine.computeLength(envelopeParams || {})
      : noteLength;
  const duration = Math.max(0.1, macroLength + 0.15);
  const source = ctx.createBufferSource();
  source.buffer = makeNoiseBuffer(ctx, duration, presetIndex, midiNote);

  const hp = ctx.createBiquadFilter();
  const lp = ctx.createBiquadFilter();
  hp.type = "highpass";
  lp.type = "lowpass";
  hp.Q.value = lp.Q.value = 0.42;
  hp.frequency.value = Number(preset.hp) || 90;
  lp.frequency.value = Number(preset.lp) || 7600;

  const env = ctx.createGain();
  const now = ctx.currentTime;
  const peak = amount * 0.105 * (Number(preset.level) || 1);
  const macroDuration = scheduleTextureMacroEnvelope(
    env.gain,
    now,
    envelopeParams,
    peak,
  );



  source.connect(hp).connect(lp).connect(env);
  source.start(now);
  source.stop(now + duration);

  const out = ctx.createGain();

  if (preset.darkDip) {
    // Dirty Vinyl can briefly lose clarity in the actual instrument, not just
    // in the added surface noise. This is coloration, never a volume dropout.
    const wornFilter = ctx.createBiquadFilter();
    wornFilter.type = "lowpass";
    wornFilter.Q.value = 0.35;
    wornFilter.frequency.setValueAtTime(18000, now);

    const rnd = seededRandom(44021 + midiNote * 131 + presetIndex * 997);
    let cursor = now + 0.35 + rnd() * 0.8;
    const endTime = now + macroDuration;
    while (cursor < endTime) {
      if (rnd() < preset.darkDip) {
        const dipStart = cursor;
        const dipBottom = dipStart + 0.018 + rnd() * 0.025;
        const dipEnd = dipBottom + 0.055 + rnd() * 0.120;
        const cutoff = 1800 + rnd() * 2600;
        wornFilter.frequency.setValueAtTime(18000, dipStart);
        wornFilter.frequency.exponentialRampToValueAtTime(cutoff, dipBottom);
        wornFilter.frequency.exponentialRampToValueAtTime(18000, dipEnd);
      }
      cursor += 0.22 + rnd() * 0.75;
    }

    inputNode.connect(wornFilter).connect(out);
  } else {
    inputNode.connect(out);
  }

  env.connect(out);
  return { mainBus: out, node: out };
};
