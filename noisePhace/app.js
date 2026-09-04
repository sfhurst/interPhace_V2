const STORAGE_KEY = "interPhace.noisePhace.ui.v2";
const NOISE_BED_SECONDS = 60;
const NOISE_SAMPLE_RATE = 44100;

const PAGE_NAMES = ["noise", "artifact", "movement", "space"];
const PAGE_PRESETS = Object.freeze({
  // B1 values: Color, Tone, Body, Air, Amount
  1: Object.freeze([
    Object.freeze({ name: "INIT", values: [50, 50, 50, 50] }),
    Object.freeze({ name: "WHITE", values: [70, 66, 34, 62] }),
    Object.freeze({ name: "PINK", values: [48, 52, 52, 40] }),
    Object.freeze({ name: "BROWN", values: [18, 34, 82, 16] }),
    Object.freeze({ name: "AIRY HISS", values: [82, 78, 18, 92] }),
    Object.freeze({ name: "DEEP WASH", values: [14, 28, 94, 10] }),
    Object.freeze({ name: "SOFT RAIN", values: [54, 58, 48, 62] }),
    Object.freeze({ name: "DARK RAIN", values: [30, 38, 70, 28] }),
    Object.freeze({ name: "MIST", values: [62, 60, 30, 76] }),
    Object.freeze({ name: "VELVET", values: [28, 42, 76, 22] }),
    Object.freeze({ name: "OPEN AIR", values: [76, 72, 24, 84] }),
    Object.freeze({ name: "LOW TIDE", values: [10, 24, 96, 8] }),
  ]),
  2: Object.freeze([
    Object.freeze({ name: "INIT", values: [50, 50, 50, 50] }),
    Object.freeze({ name: "VINYL", values: [48, 48, 34, 46] }),
    Object.freeze({ name: "DUST", values: [34, 68, 18, 40] }),
    Object.freeze({ name: "OLD RECORD", values: [44, 54, 42, 30] }),
    Object.freeze({ name: "STATIC", values: [82, 62, 28, 76] }),
    Object.freeze({ name: "LIGHT RAIN", values: [28, 56, 24, 58] }),
    Object.freeze({ name: "WINDOW RAIN", values: [26, 44, 54, 46] }),
    Object.freeze({ name: "EMBER", values: [58, 24, 44, 54] }),
    Object.freeze({ name: "TAPE", values: [20, 38, 22, 28] }),
    Object.freeze({ name: "CRACKLE", values: [52, 82, 28, 56] }),
    Object.freeze({ name: "SPARSE POPS", values: [40, 12, 78, 40] }),
    Object.freeze({ name: "DAMAGED", values: [88, 72, 66, 68] }),
  ]),
  3: Object.freeze([
    Object.freeze({ name: "INIT",     values: [0, 0, 0, 0, 50] }),
    Object.freeze({ name: "BREATHE",  values: [38, 18, 14, 12, 34] }),
    Object.freeze({ name: "GUST",     values: [72, 58, 42, 34, 58] }),
    Object.freeze({ name: "DRIFT",    values: [28, 22, 46, 58, 28] }),
    Object.freeze({ name: "WANDER",   values: [36, 34, 38, 72, 42] }),
    Object.freeze({ name: "TIDE",     values: [62, 42, 24, 28, 24] }),
    Object.freeze({ name: "RESTLESS", values: [56, 66, 52, 62, 78] }),
    Object.freeze({ name: "ORBIT",    values: [30, 26, 32, 92, 52] }),
    Object.freeze({ name: "WEATHER",  values: [76, 72, 64, 54, 48] }),
    Object.freeze({ name: "DEEP",     values: [82, 46, 58, 38, 18] }),
    Object.freeze({ name: "QUICK",    values: [46, 48, 44, 58, 92] }),
    Object.freeze({ name: "ALIVE",    values: [68, 76, 72, 78, 68] }),
  ]),
  4: Object.freeze([
    Object.freeze({ name: "INIT",       values: [50, 0, 0, 0, 0] }),
    Object.freeze({ name: "WIDE",       values: [82, 10, 16, 12, 8] }),
    Object.freeze({ name: "ROOM",       values: [56, 24, 28, 10, 18] }),
    Object.freeze({ name: "HALL",       values: [68, 34, 58, 18, 32] }),
    Object.freeze({ name: "DISTANT",    values: [62, 18, 42, 16, 78] }),
    Object.freeze({ name: "ORBIT",      values: [70, 16, 34, 88, 24] }),
    Object.freeze({ name: "FLOAT",      values: [76, 28, 52, 64, 36] }),
    Object.freeze({ name: "CAVERN",     values: [72, 30, 82, 28, 68] }),
    Object.freeze({ name: "CLOSE",      values: [34, 6, 8, 6, 4] }),
    Object.freeze({ name: "REFLECTION", values: [60, 68, 24, 22, 26] }),
    Object.freeze({ name: "SPIN",       values: [64, 22, 34, 100, 18] }),
    Object.freeze({ name: "FAR FIELD",  values: [84, 38, 66, 46, 88] }),
  ]),
});

let activePage = 1;
let auditionState = "idle";
let auditionContext = null;
let auditionTransport = null;

const buttons = Array.from({ length: 4 }, (_, i) => document.getElementById(`shellB${i + 1}`));
const generateBtn = document.getElementById("shellB5");

function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function pageControlId(page, control) {
  return `app5_b${page}_p1_c${control}`;
}

function updateSlider(slider) {
  if (!slider) return;
  const valueEl = document.getElementById(`${slider.id}_value`);
  if (slider.classList.contains("presetSlider")) {
    const page = Number(slider.id.match(/app5_b(\d+)_/)?.[1] || 1);
    const presets = PAGE_PRESETS[page] || [];
    const index = Math.max(0, Math.min(presets.length - 1, Math.round(Number(slider.value) || 0)));
    slider.max = String(Math.max(0, presets.length - 1));
    slider.value = String(index);
    if (valueEl) valueEl.textContent = presets[index]?.name || "INIT";
  } else {
    const numeric = clamp(slider.value);
    slider.value = String(numeric);
    slider.style.setProperty("--value", `${numeric}%`);
    if (valueEl) valueEl.textContent = String(Math.round(numeric));
  }
}

function applyDefaults() {
  for (let page = 1; page <= 4; page++) {
    const preset = PAGE_PRESETS[page][0];

    preset.values.forEach((value, index) => {
      const slider = document.getElementById(pageControlId(page, index + 1));
      if (!slider) return;
      slider.value = String(value);
      slider.dataset.default = String(value);
    });

    // B1/B2 C5 Amount is a persistent mix control independent of presets.
    if (page === 1 || page === 2) {
      const amountSlider = document.getElementById(pageControlId(page, 5));
      if (amountSlider) {
        amountSlider.value = "50";
        amountSlider.dataset.default = "50";
      }
    }

    const presetSlider = document.getElementById(pageControlId(page, 6));
    if (presetSlider) {
      presetSlider.value = "0";
      presetSlider.min = "0";
      presetSlider.max = String(Math.max(0, PAGE_PRESETS[page].length - 1));
      presetSlider.step = "1";
      presetSlider.dataset.default = "0";
    }
  }
}

function save() {
  const values = {};
  document.querySelectorAll(".macroSlider, .presetSlider").forEach(slider => {
    values[slider.id] = Number(slider.value);
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      activePage,
      values,
      presets: {
        noise: Number(document.getElementById(pageControlId(1,6))?.value || 0),
        artifact: Number(document.getElementById(pageControlId(2,6))?.value || 0),
        movement: Number(document.getElementById(pageControlId(3,6))?.value || 0),
        space: Number(document.getElementById(pageControlId(4,6))?.value || 0),
      },
    }));
  } catch (_) {}
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return;
    const page = Number(saved.activePage);
    if (Number.isInteger(page) && page >= 1 && page <= 4) activePage = page;
    if (saved.values && typeof saved.values === "object") {
      Object.entries(saved.values).forEach(([id, value]) => {
        const slider = document.getElementById(id);
        if (!slider) return;
        const numeric = Number(value);
        if (Number.isFinite(numeric)) slider.value = String(numeric);
      });
    }
  } catch (_) {}
}

function showPage(page) {
  activePage = Math.max(1, Math.min(4, Number(page) || 1));
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`app5_b${i}_p1`)?.classList.toggle("hidden", i !== activePage);
    buttons[i - 1]?.classList.toggle("active", i === activePage);
  }
  const shell = document.getElementById("shell");
  if (shell) shell.dataset.page = `app5_b${activePage}_p1`;
  save();
}

function pageValues(page) {
  return Array.from({ length: 5 }, (_, index) =>
    Number(document.getElementById(pageControlId(page, index + 1))?.value || 0)
  );
}

function pageMatchesPreset(page, presetIndex) {
  const preset = PAGE_PRESETS[page]?.[presetIndex];
  if (!preset) return false;
  return preset.values.every((value, index) =>
    Number(document.getElementById(pageControlId(page, index + 1))?.value) === Number(value)
  );
}

function syncPresetForPage(page) {
  const slider = document.getElementById(pageControlId(page, 6));
  const valueEl = document.getElementById(`${slider?.id}_value`);
  if (!slider || !valueEl) return;
  const presets = PAGE_PRESETS[page] || [];
  const match = presets.findIndex((_, index) => pageMatchesPreset(page, index));
  const current = Math.max(0, Math.min(presets.length - 1, Number(slider.value) || 0));
  valueEl.textContent = presets[current]?.name || "INIT";
  valueEl.classList.toggle("preset-modified", match !== current);
}

function applyPagePreset(page, presetIndex) {
  const preset = PAGE_PRESETS[page]?.[presetIndex] || PAGE_PRESETS[page]?.[0];
  if (!preset) return;
  preset.values.forEach((value, index) => {
    const slider = document.getElementById(pageControlId(page, index + 1));
    if (!slider) return;
    slider.value = String(value);
    updateSlider(slider);
  });
  const presetSlider = document.getElementById(pageControlId(page, 6));
  if (presetSlider) {
    presetSlider.value = String(presetIndex);
    updateSlider(presetSlider);
  }
  syncPresetForPage(page);
  save();
}

function generateCurrentPage() {
  const page = document.getElementById(`app5_b${activePage}_p1`);
  if (!page) return;

  // Match dronePhace: randomize only direct sound controls on the visible page.
  // Preset sliders are excluded because they drive groups of other sliders.
  page.querySelectorAll(".macroSlider").forEach(slider => {
    const min = Number(slider.min || 0);
    const max = Number(slider.max || 100);
    const step = Number(slider.step || 1);
    const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
    const slots = Math.max(0, Math.round((max - min) / safeStep));
    const value = min + Math.floor(Math.random() * (slots + 1)) * safeStep;
    slider.value = String(Math.min(max, value));
    updateSlider(slider);
  });

  syncPresetForPage(activePage);
  save();
}

function seededNoise(length, seed = 9127) {
  let state = seed >>> 0;
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    state = (1664525 * state + 1013904223) >>> 0;
    data[i] = ((state / 4294967296) * 2) - 1;
  }
  return data;
}


function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}



function spaceSettings() {
  return {
    width: clamp(document.getElementById("app5_b4_p1_c1")?.value ?? 50) / 100,
    delay: clamp(document.getElementById("app5_b4_p1_c2")?.value ?? 0) / 100,
    reverb: clamp(document.getElementById("app5_b4_p1_c3")?.value ?? 0) / 100,
    spaceMotion: clamp(document.getElementById("app5_b4_p1_c4")?.value ?? 0) / 100,
    distance: clamp(document.getElementById("app5_b4_p1_c5")?.value ?? 0) / 100,
  };
}

function applySpaceToBuffer(L, R, sampleRate, space, { suppressSpaceMotion = false } = {}) {
  const frames = L.length;
  const wetL = new Float32Array(L);
  const wetR = new Float32Array(R);

  // Width: mid/side scaling from near-mono through clearly wide.
  const widthScale = 0.15 + space.width * 1.45;
  for (let i = 0; i < frames; i++) {
    const mid = (wetL[i] + wetR[i]) * 0.5;
    const side = (wetL[i] - wetR[i]) * 0.5 * widthScale;
    wetL[i] = mid + side;
    wetR[i] = mid - side;
  }

  // Non-tempo-synced reflections.
  if (space.delay > 0.001) {
    const taps = [
      [0.071 + 0.061 * space.delay, 0.10 + 0.16 * space.delay],
      [0.143 + 0.097 * space.delay, 0.07 + 0.12 * space.delay],
      [0.281 + 0.133 * space.delay, 0.05 + 0.09 * space.delay],
    ];
    const dryL = new Float32Array(wetL);
    const dryR = new Float32Array(wetR);
    for (const [seconds, gain] of taps) {
      const d = Math.max(1, Math.round(seconds * sampleRate));
      for (let i = d; i < frames; i++) {
        wetL[i] += dryR[i - d] * gain;
        wetR[i] += dryL[i - d] * gain;
      }
    }
  }

  // Lightweight diffuse reverb using several irregular feedbackless reflections.
  if (space.reverb > 0.001) {
    const dryL = new Float32Array(wetL);
    const dryR = new Float32Array(wetR);
    const taps = [
      [0.037, 0.14], [0.083, 0.12], [0.129, 0.10],
      [0.211, 0.085], [0.347, 0.065], [0.503, 0.045],
    ];
    for (const [seconds, baseGain] of taps) {
      const d = Math.max(1, Math.round((seconds * (0.9 + 0.7 * space.reverb)) * sampleRate));
      const gain = baseGain * space.reverb * 1.65;
      for (let i = d; i < frames; i++) {
        wetL[i] += dryL[i - d] * gain + dryR[i - d] * gain * 0.35;
        wetR[i] += dryR[i - d] * gain + dryL[i - d] * gain * 0.35;
      }
    }
  }

  // Distance: reduce direct detail/presence while leaving diffuse energy.
  if (space.distance > 0.001) {
    let lpL = 0, lpR = 0;
    const coeff = 0.24 - space.distance * 0.205;
    const direct = 1 - space.distance * 0.42;
    for (let i = 0; i < frames; i++) {
      lpL += coeff * (wetL[i] - lpL);
      lpR += coeff * (wetR[i] - lpR);
      wetL[i] = wetL[i] * direct + lpL * (1 - direct);
      wetR[i] = wetR[i] * direct + lpR * (1 - direct);
    }
  }

  // Local independent whole-field Space Motion. During linked Global Play,
  // interPhace asks us to suppress this and applies the tested opposed orbit once.
  if (!suppressSpaceMotion && space.spaceMotion > 0.001) {
    const depth = space.spaceMotion;
    for (let i = 0; i < frames; i++) {
      const t = i / sampleRate;
      const angle =
        2 * Math.PI * ((0.010 + 0.045 * depth) * t)
        + 0.72 * depth * Math.sin(2 * Math.PI * (0.0037 + 0.006 * depth) * t + 0.4);
      const radius = depth * (
        0.28 + 0.68 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.0063 * t + 1.1))
      );
      const pan = Math.max(-0.97, Math.min(0.97, Math.sin(angle) * radius));
      const panL = Math.sqrt((1 - pan) * 0.5) * Math.SQRT2;
      const panR = Math.sqrt((1 + pan) * 0.5) * Math.SQRT2;
      wetL[i] *= panL;
      wetR[i] *= panR;
    }
  }

  L.set(wetL);
  R.set(wetR);
}

function motionSettings() {
  return {
    volume: clamp(document.getElementById("app5_b3_p1_c1")?.value ?? 0) / 100,
    density: clamp(document.getElementById("app5_b3_p1_c2")?.value ?? 0) / 100,
    timbre: clamp(document.getElementById("app5_b3_p1_c3")?.value ?? 0) / 100,
    stereo: clamp(document.getElementById("app5_b3_p1_c4")?.value ?? 0) / 100,
    speed: clamp(document.getElementById("app5_b3_p1_c5")?.value ?? 50) / 100,
  };
}

function motionRate(speed, slowHz, fastHz) {
  // Wide range: subtle values can take minutes, max values become obvious in seconds.
  return slowHz * Math.pow(fastHz / slowHz, speed);
}

function noiseMotionAt(t, motion) {
  const v1 = motionRate(motion.speed, 0.0028, 0.105);
  const v2 = motionRate(motion.speed, 0.0017, 0.071);
  const d1 = motionRate(motion.speed, 0.0035, 0.137);
  const c1 = motionRate(motion.speed, 0.0022, 0.089);
  const c2 = motionRate(motion.speed, 0.0041, 0.151);
  const s1 = motionRate(motion.speed, 0.0026, 0.123);
  const s2 = motionRate(motion.speed, 0.0019, 0.081);

  // 0..1 wandering shapes with deliberately unrelated rates/phases.
  const volumeWave = 0.5 + 0.31 * Math.sin(2 * Math.PI * v1 * t + 0.8)
                         + 0.19 * Math.sin(2 * Math.PI * v2 * t + 2.2);
  const densityWave = 0.5 + 0.34 * Math.sin(2 * Math.PI * d1 * t + 1.7)
                          + 0.16 * Math.sin(2 * Math.PI * (d1 * 0.61) * t + 4.0);
  const timbreWave = 0.5 + 0.30 * Math.sin(2 * Math.PI * c1 * t + 2.7)
                         + 0.20 * Math.sin(2 * Math.PI * c2 * t + 0.2);
  const stereoWave = 0.64 * Math.sin(2 * Math.PI * s1 * t + 0.35)
                   + 0.36 * Math.sin(2 * Math.PI * s2 * t + 3.3);

  const v = Math.max(0, Math.min(1, volumeWave));
  const d = Math.max(0, Math.min(1, densityWave));
  const c = Math.max(0, Math.min(1, timbreWave));
  const s = Math.max(-1, Math.min(1, stereoWave));

  // Volume only dips below baseline and returns. Never swell above authored level.
  const dipDepth = motion.volume * 0.82;
  const volumeGain = 1 - dipDepth * Math.pow(1 - v, 1.65);

  return { volumeGain, densityWave: d, timbreWave: c, stereoWave: s };
}

function renderArtifactLayer(sampleRate, frames, motion) {
  const L = new Float32Array(frames);
  const R = new Float32Array(frames);

  const character = clamp(document.getElementById("app5_b2_p1_c1")?.value ?? 50) / 100;
  const density = clamp(document.getElementById("app5_b2_p1_c2")?.value ?? 50) / 100;
  const size = clamp(document.getElementById("app5_b2_p1_c3")?.value ?? 50) / 100;
  const tone = clamp(document.getElementById("app5_b2_p1_c4")?.value ?? 50) / 100;
  const amount = (clamp(document.getElementById("app5_b2_p1_c5")?.value ?? 50) / 100) * 0.50;

  if (amount <= 0 || density <= 0) return { L, R };

  const random = mulberry32(0x51A7F00D);
  const seconds = frames / sampleRate;
  const maxEventsPerSecond = 0.10 + Math.pow(density, 1.75) * 42;
  const candidateCount = Math.max(1, Math.round(maxEventsPerSecond * seconds));

  const sharpness = 0.22 + character * 0.78;
  const popChance = 0.04 + size * 0.22 + Math.max(0, character - 0.72) * 0.16;
  const baseStereoSpread = 0.25 + character * 0.55;

  for (let eventIndex = 0; eventIndex < candidateCount; eventIndex++) {
    const start = Math.floor(random() * Math.max(1, frames - 2));
    const t = start / sampleRate;
    const mm = noiseMotionAt(t, motion);

    // Density motion thins events away and lets them return to the authored density.
    const densityRetention = 1 - motion.density * (0.82 * (1 - mm.densityWave));
    if (random() > densityRetention) continue;

    const isPop = random() < popChance;
    const baseMs = isPop ? 6 + size * 46 : 0.6 + size * 7.5;
    const durationMs = baseMs * (0.55 + random() * 1.1);
    const length = Math.max(2, Math.min(frames - start, Math.round(sampleRate * durationMs / 1000)));

    const eventAmp = (0.20 + random() * 0.80) *
      (isPop ? (0.55 + size * 0.75) : (0.24 + sharpness * 0.42));

    const wanderingPan = mm.stereoWave * motion.stereo * 0.82;
    const randomPan = (random() * 2 - 1) * baseStereoSpread * (1 - motion.stereo * 0.35);
    const pan = Math.max(-0.96, Math.min(0.96, wanderingPan + randomPan));
    const gainL = Math.sqrt((1 - pan) * 0.5);
    const gainR = Math.sqrt((1 + pan) * 0.5);

    // Timbre motion moves around the authored Tone rather than replacing it.
    const toneOffset = (mm.timbreWave - 0.5) * 2 * motion.timbre * 0.42;
    const movingTone = Math.max(0, Math.min(1, tone + toneOffset));

    let lowState = 0;
    let previous = 0;
    const lowCoeff = 0.025 + (1 - movingTone) * 0.16;
    const clickPolarity = random() < 0.5 ? -1 : 1;

    for (let j = 0; j < length; j++) {
      const x = j / Math.max(1, length - 1);
      const envelope = isPop
        ? Math.exp(-x * (3.0 + (1 - size) * 5.5))
        : Math.exp(-x * (8.0 + sharpness * 15.0));

      const noise = random() * 2 - 1;
      lowState += lowCoeff * (noise - lowState);
      const high = noise - lowState;

      let sample;
      if (character < 0.33) {
        sample = lowState * (0.72 + movingTone * 0.28);
      } else if (character < 0.72) {
        const impulse = j === 0 ? clickPolarity * (0.7 + random() * 0.3) : 0;
        sample = impulse * 0.65 + high * (0.25 + movingTone * 0.45) + lowState * 0.24;
      } else {
        const differentiator = high - previous;
        previous = high;
        sample = differentiator * (0.55 + movingTone * 0.55) + high * 0.18;
      }

      const idx = start + j;
      const shaped = Math.tanh(sample * eventAmp * (isPop ? 1.4 : 1.0)) * envelope * amount;
      L[idx] += shaped * gainL;
      R[idx] += shaped * gainR;
    }
  }

  return { L, R };
}

function renderNoiseBedBuffer(sampleRate = NOISE_SAMPLE_RATE, duration = NOISE_BED_SECONDS, { suppressSpaceMotion = false } = {}) {
  const frames = Math.max(1, Math.round(sampleRate * duration));
  const L = new Float32Array(frames);
  const R = new Float32Array(frames);

  // B1 Noise: Color / Tone / Body / Air / Amount.
  const color = clamp(document.getElementById("app5_b1_p1_c1")?.value ?? 50) / 100;
  const tone = clamp(document.getElementById("app5_b1_p1_c2")?.value ?? 50) / 100;
  const body = clamp(document.getElementById("app5_b1_p1_c3")?.value ?? 50) / 100;
  const air = clamp(document.getElementById("app5_b1_p1_c4")?.value ?? 50) / 100;
  // Broadband noise reads much hotter than pitched material at the same peak.
  // Keep the full 0–100 UI range, but cap B1 at 20% actual output gain.
  const amount = (clamp(document.getElementById("app5_b1_p1_c5")?.value ?? 50) / 100) * 0.2;
  const motion = motionSettings();

  const whiteL = seededNoise(frames, 9228);
  const whiteR = seededNoise(frames, 10339);

  // Three broad spectral regions. Color moves the overall spectral tilt,
  // Tone opens/closes the upper spectrum, Body weights the low/mid region,
  // and Air restores a separate breath/hiss layer.
  let fastLpL = 0, fastLpR = 0;
  let midLpL = 0, midLpR = 0;
  let slowLpL = 0, slowLpR = 0;

  const fastCoeff = 0.045 + tone * 0.18;
  const midCoeff = 0.010 + (0.035 * (0.25 + tone * 0.75));
  const slowCoeff = 0.0012 + body * 0.0085;

  // Color: 0 = brown/deep, .5 = pink-ish/reference, 1 = white/bright.
  const deepTilt = 1 - color;
  const brightTilt = color;
  const lowWeight = 0.24 + deepTilt * 0.78 + body * 0.34;
  const midWeight = 0.38 + (1 - Math.abs(color - 0.48) * 1.35) * 0.28 + body * 0.16;
  const highWeight = 0.10 + brightTilt * 0.70 + tone * 0.18;
  const airWeight = air * (0.08 + tone * 0.18);

  for (let i = 0; i < frames; i++) {
    const wL = whiteL[i];
    const wR = whiteR[i];

    fastLpL += fastCoeff * (wL - fastLpL);
    fastLpR += fastCoeff * (wR - fastLpR);
    midLpL += midCoeff * (wL - midLpL);
    midLpR += midCoeff * (wR - midLpR);
    slowLpL += slowCoeff * (wL - slowLpL);
    slowLpR += slowCoeff * (wR - slowLpR);

    const highL = wL - fastLpL;
    const highR = wR - fastLpR;
    const upperMidL = fastLpL - midLpL;
    const upperMidR = fastLpR - midLpR;
    const bodyL = midLpL - slowLpL;
    const bodyR = midLpR - slowLpR;
    const lowL = slowLpL;
    const lowR = slowLpR;

    // Preserve the existing pleasant rain-like INIT evolution.
    const t = i / sampleRate;
    const rainBreath =
      0.78
      + 0.1175 * Math.sin(2 * Math.PI * 0.075 * t - 0.5)
      + 0.065 * Math.sin(2 * Math.PI * 0.029 * t + 1.1);

    const mm = noiseMotionAt(t, motion);
    const timbreOffset = (mm.timbreWave - 0.5) * 2 * motion.timbre;
    const movingTone = Math.max(0, Math.min(1, tone + timbreOffset * 0.30));
    const movingColor = Math.max(0, Math.min(1, color + timbreOffset * 0.24));
    const movingHighWeight = highWeight * (0.72 + movingColor * 0.56);
    const toneOpen = 0.65 + movingTone * 0.55;

    let left =
      lowL * lowWeight +
      bodyL * midWeight +
      upperMidL * (0.16 + movingTone * 0.34) +
      highL * movingHighWeight * toneOpen +
      highL * airWeight;
    let right =
      lowR * lowWeight +
      bodyR * midWeight +
      upperMidR * (0.16 + movingTone * 0.34) +
      highR * movingHighWeight * toneOpen +
      highR * airWeight;

    const shimmerL = airWeight * 0.12 * Math.sin(2 * Math.PI * 0.041 * t + 0.3);
    const shimmerR = airWeight * 0.12 * Math.sin(2 * Math.PI * 0.047 * t + 1.1);

    // Stereo motion shifts energy without collapsing the broad bed.
    const pan = mm.stereoWave * motion.stereo * 0.72;
    const panL = Math.sqrt((1 - pan) * 0.5) * Math.SQRT2;
    const panR = Math.sqrt((1 + pan) * 0.5) * Math.SQRT2;

    L[i] = Math.tanh((left * rainBreath) * (0.78 + body * 0.18 + shimmerL)) * amount * mm.volumeGain * panL;
    R[i] = Math.tanh((right * rainBreath) * (0.78 + body * 0.18 + shimmerR)) * amount * mm.volumeGain * panR;
  }

  // Keep Amount meaningful. Normalize only the source character, then apply Amount.
  let peak = 1e-9;
  if (amount > 0) {
    for (let i = 0; i < frames; i++) {
      peak = Math.max(peak, Math.abs(L[i] / amount), Math.abs(R[i] / amount));
    }
  }
  const sourceScale = 0.74 / peak;
  for (let i = 0; i < frames; i++) {
    L[i] *= sourceScale;
    R[i] *= sourceScale;
  }

  const artifact = renderArtifactLayer(sampleRate, frames, motion);
  for (let i = 0; i < frames; i++) {
    L[i] += artifact.L[i];
    R[i] += artifact.R[i];
  }

  const space = spaceSettings();
  applySpaceToBuffer(L, R, sampleRate, space, { suppressSpaceMotion });

  // Final safety only. Preserve B1/B2 relative gain staging.
  let mixedPeak = 1e-9;
  for (let i = 0; i < frames; i++) {
    mixedPeak = Math.max(mixedPeak, Math.abs(L[i]), Math.abs(R[i]));
  }
  if (mixedPeak > 0.92) {
    const safety = 0.92 / mixedPeak;
    for (let i = 0; i < frames; i++) {
      L[i] *= safety;
      R[i] *= safety;
    }
  }

  const buffer = new AudioBuffer({
    length: frames,
    numberOfChannels: 2,
    sampleRate,
  });
  buffer.copyToChannel(L, 0);
  buffer.copyToChannel(R, 1);
  return buffer;
}

function notifyAuditionState() {
  window.dispatchEvent(new CustomEvent("interPhace:audition-state"));
}

function stopAudition() {
  auditionTransport?.stop?.();
  auditionTransport = null;
  auditionState = "idle";
  notifyAuditionState();
}

// Build 484: local audition survives all in-Phace navigation and edits.
// Leaving this Phace always stops its local audition.
window.addEventListener("pagehide", stopAudition);
window.addEventListener("beforeunload", stopAudition, { once: true });

async function startAudition() {
  auditionState = "rendering";
  notifyAuditionState();
  await window.InterPhaceShell.paintBeforeSynchronousWork();
  if (auditionState !== "rendering") return;

  const rendered = renderNoiseBedBuffer(NOISE_SAMPLE_RATE, NOISE_BED_SECONDS);
  if (auditionState !== "rendering") return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio playback is unavailable.");
  if (!auditionContext || auditionContext.state === "closed") auditionContext = new AudioContextClass();
  if (auditionContext.state === "suspended") await auditionContext.resume();

  const buffer = auditionContext.createBuffer(2, rendered.length, rendered.sampleRate);
  buffer.copyToChannel(rendered.getChannelData(0), 0);
  buffer.copyToChannel(rendered.getChannelData(1), 1);

  auditionTransport = InterPhaceBedLoop.create({
    context: auditionContext,
    buffer,
    destination: auditionContext.destination,
    gain: window.InterPhaceShell?.readMixerChannelGain?.("noise", { respectMute: false })?.gain ?? 1,
    overlapSeconds: 3,
    startTime: auditionContext.currentTime + 0.02,
  });
  auditionState = "playing";
  notifyAuditionState();
}

function toggleAudition(event) {
  event?.preventDefault?.();
  if (auditionState !== "idle") {
    stopAudition();
    return;
  }
  startAudition().catch(error => {
    console.error("noisePhace audition failed", error);
    stopAudition();
  });
}

window.NoisePhaceRenderAPI = Object.freeze({
  getState() {
    const space = spaceSettings();
    return Object.freeze({
      spaceMotion: space.spaceMotion,
    });
  },
  renderBed({
    sampleRate = NOISE_SAMPLE_RATE,
    duration = NOISE_BED_SECONDS,
    suppressSpaceMotion = false,
  } = {}) {
    const seconds = Math.max(1, Number(duration) || NOISE_BED_SECONDS);
    const space = spaceSettings();
    return Object.freeze({
      buffer: renderNoiseBedBuffer(sampleRate, seconds, { suppressSpaceMotion }),
      loopSeconds: seconds,
      sampleRate,
      spaceMotion: space.spaceMotion,
    });
  },
});

applyDefaults();
loadState();

document.querySelectorAll(".macroSlider").forEach(slider => {
  updateSlider(slider);
  slider.addEventListener("input", () => {
    updateSlider(slider);
    const page = Number(slider.id.match(/app5_b(\d+)_/)?.[1] || activePage);
    syncPresetForPage(page);
    save();
  });
  slider.addEventListener("dblclick", () => {
    const fallback = Number(slider.dataset.default);
    if (!Number.isFinite(fallback)) return;
    slider.value = String(fallback);
    updateSlider(slider);
    const page = Number(slider.id.match(/app5_b(\d+)_/)?.[1] || activePage);
    syncPresetForPage(page);
    save();
  });
});

document.querySelectorAll(".presetSlider").forEach(slider => {
  updateSlider(slider);
  slider.addEventListener("input", () => {
    const page = Number(slider.id.match(/app5_b(\d+)_/)?.[1] || activePage);
    applyPagePreset(page, Number(slider.value));
  });
});

buttons.forEach((button, index) => button?.addEventListener("click", () => showPage(index + 1)));
generateBtn?.addEventListener("click", generateCurrentPage);


const shellBinding = window.InterPhaceShell?.bind({
  app: "#shell",
  name: "noisePhace",
  accent: getComputedStyle(document.documentElement).getPropertyValue("--noise").trim() || "#a56cff",
  line: getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#2a2d33",
  text: getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#f0f1f3",
  muted: getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "#777d87",
  getAuditionState: () => auditionState,
  canSnapshot: () => window.InterPhaceShell?.snapshots?.hasOpenSlot("noisePhace"),
  onSnapshot: () => window.InterPhaceShell?.snapshots?.save("noisePhace", {
    state: JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"),
  }),
});
shellBinding?.auditionBtn?.addEventListener("click", toggleAudition);

showPage(activePage);
