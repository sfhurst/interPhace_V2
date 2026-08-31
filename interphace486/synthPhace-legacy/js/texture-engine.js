// ============================================================
//  NOISE SOURCE ENGINE
// ============================================================
// Deterministic, low-level added noise/dirt sources. Transient sources are
// handled separately by TransientSourceEngine.
// ============================================================

window.TextureEngine = {};

const TEXTURE_PRESETS = [
  { name: "Off", kind: "off" },
  { name: "Tape", kind: "tape", color: 0.72, motion: 0.18 },
  { name: "Cassette", kind: "cassette", color: 0.82, motion: 0.30 },
  { name: "Clean Vinyl", kind: "vinyl", color: 0.58, motion: 0.10, density: 0.0045 },
  { name: "Dirty Vinyl", kind: "worn", color: 0.64, motion: 0.28, density: 0.006 },
  { name: "Dust", kind: "dust", color: 0.46, density: 0.012 },
  { name: "Air", kind: "air", color: 0.12, motion: 0.08 },
  { name: "Breath", kind: "breath", color: 0.35, motion: 0.32 },
];

TextureEngine.register = function (patch) {
  patch.texture = patch.texture || { preset: 0, amount: 0 };
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
  const mult = Math.max(0.01, Number(env.multiplier ?? env.timeMultiplier ?? 1) || 1);
  const attack = Math.max(0, Number(env.attack ?? env.attack1 ?? 0) || 0) * mult;
  const hold1 = Math.max(0, Number(env.hold1 ?? 0) || 0) * mult;
  const decay1 = Math.max(0, Number(env.decay1 ?? 0) || 0) * mult;
  const hold2 = Math.max(0, Number(env.hold2 ?? 0) || 0) * mult;
  const decay2 = Math.max(0, Number(env.decay2 ?? 0) || 0) * mult;

  const tAttack = now + attack;
  const tHold1 = tAttack + hold1;
  const tDecay1 = tHold1 + decay1;
  const tHold2 = tDecay1 + hold2;
  const tDecay2 = tHold2 + decay2;

  param.cancelScheduledValues(now);
  param.setValueAtTime(0, now);

  // Sustained textures follow the tone's onset, then remain present through
  // Hold 1, Decay 1, and Hold 2 instead of inheriting the tonal mid-envelope
  // drop. They leave with the same final Decay 2 timing as the instrument.
  if (attack > 0) param.linearRampToValueAtTime(peak, tAttack);
  else param.setValueAtTime(peak, now);

  param.setValueAtTime(peak, tHold1);
  param.setValueAtTime(peak, tDecay1);
  param.setValueAtTime(peak, tHold2);

  if (decay2 > 0) {
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

  for (let i = 0; i < frames; i++) {
    const white = rnd() * 2 - 1;
    low += 0.035 * (white - low);
    const colored = white * (1 - (preset.color || 0)) + low * (preset.color || 0);
    let sample = colored;

    if (preset.kind === "dust" || preset.kind === "worn" || preset.kind === "vinyl") {
      const click = rnd() < (preset.density || 0) ? (rnd() * 2 - 1) * 4 : 0;
      sample = colored * 0.28 + click;
    }

    data[i] = sample;
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
  hp.Q.value = lp.Q.value = 0.45;
  hp.frequency.value = preset.kind === "air" ? 1800 : preset.kind === "breath" ? 550 : preset.kind === "cassette" ? 180 : 90;
  lp.frequency.value = preset.kind === "air" ? 12000 : preset.kind === "cassette" ? 6200 : preset.kind === "vinyl" ? 6900 : 7600;

  const env = ctx.createGain();
  const now = ctx.currentTime;
  const peak = amount * 0.105;
  const macroDuration = scheduleTextureMacroEnvelope(
    env.gain,
    now,
    envelopeParams,
    peak,
  );

  if (preset.motion) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = preset.kind === "breath" ? 0.55 : preset.kind === "cassette" ? 0.38 : 0.23;
    depth.gain.value = peak * preset.motion;
    lfo.connect(depth).connect(env.gain);
    lfo.start(now);
    lfo.stop(now + duration);
  }

  source.connect(hp).connect(lp).connect(env);
  source.start(now);
  source.stop(now + duration);

  const out = ctx.createGain();
  inputNode.connect(out);
  env.connect(out);
  return { mainBus: out, node: out };
};
