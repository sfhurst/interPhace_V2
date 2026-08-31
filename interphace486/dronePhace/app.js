
const shell = document.getElementById("shell");
const pages = [1,2,3,4].map(i => document.getElementById(`app6_b${i}_p1`));
const buttons = [1,2,3,4].map(i => document.getElementById(`shellB${i}`));
const generateBtn = document.getElementById("shellB5");
const STORAGE_KEY = "interPhace.dronePhace.ui.v2";
const LEGACY_STORAGE_KEY = "interPhace.dronePhace.ui.v1";
const PROJECT_STORAGE_KEY = "interPhace.interPhace.ui.v2";
const SAMPLE_RATE = 44100;
const AUDITION_SECONDS = 60;

const DEFAULTS = Object.freeze({
  app6_b1_p1_c1: 0,    // Source: sine
  app6_b1_p1_c2: 18,   // Harmony: add9 reference family
  app6_b1_p1_c3: 100,  // Voices: 5
  app6_b1_p1_c4: 50,   // Register: C3-centered
  app6_b1_p1_c5: 50,   // Spread: reference voicing openness
  app6_b2_p1_c1: 22,   // Harmonics
  app6_b2_p1_c2: 42,   // Brightness
  app6_b2_p1_c3: 8,    // Resonance
  app6_b2_p1_c4: 28,   // Texture / Air
  app6_b2_p1_c5: 18,   // Saturation
  app6_b3_p1_c1: 48,   // Volume Motion
  app6_b3_p1_c2: 18,   // Pitch Drift
  app6_b3_p1_c3: 10,   // Timbre Motion
  app6_b3_p1_c4: 32,   // Stereo Motion
  app6_b3_p1_c5: 28,   // Motion Speed
  app6_b4_p1_c1: 58,   // Width
  app6_b4_p1_c2: 42,   // Delay
  app6_b4_p1_c3: 24,   // Reverb
  app6_b4_p1_c4: 18,   // Space Motion
  app6_b4_p1_c5: 20,   // Distance: INIT acoustic perspective
});

const VOICE_PRESETS = Object.freeze([
  Object.freeze({ name: "INIT",        values: Object.freeze([ 0, 18,100, 50, 50]) }),
  Object.freeze({ name: "OPEN FIFTH",  values: Object.freeze([ 4,  0, 75, 50, 76]) }),
  Object.freeze({ name: "OPEN TRIAD",  values: Object.freeze([ 8,  9,100, 50, 58]) }),
  Object.freeze({ name: "ADD9",        values: Object.freeze([ 2, 18,100, 50, 68]) }),
  Object.freeze({ name: "SUSPENDED",   values: Object.freeze([ 6, 27,100, 50, 64]) }),
  Object.freeze({ name: "LOW BED",     values: Object.freeze([ 3, 64,100, 25, 46]) }),
  Object.freeze({ name: "HIGH AIR",    values: Object.freeze([ 0, 91, 75, 75, 82]) }),
  Object.freeze({ name: "OCTAVES",     values: Object.freeze([ 1, 55,100, 50, 88]) }),
  Object.freeze({ name: "WIDE FIFTH",  values: Object.freeze([ 5,  0,100, 50,100]) }),
  Object.freeze({ name: "CHORAL",      values: Object.freeze([18, 36,100, 50, 54]) }),
  Object.freeze({ name: "LUMINOUS",    values: Object.freeze([10,100,100, 75, 72]) }),
  Object.freeze({ name: "FOUNDATION",  values: Object.freeze([ 0,  0, 50, 25, 34]) }),
]);

const TONE_PRESETS = Object.freeze([
  Object.freeze({ name: "INIT",        values: Object.freeze([22, 42,  8, 28, 18]) }),
  Object.freeze({ name: "PURE",        values: Object.freeze([ 2, 52,  0,  2,  0]) }),
  Object.freeze({ name: "WARM",        values: Object.freeze([34, 28,  5, 10, 52]) }),
  Object.freeze({ name: "AIRY",        values: Object.freeze([20, 72,  4, 70,  8]) }),
  Object.freeze({ name: "LUMINOUS",    values: Object.freeze([58, 82, 18, 30, 10]) }),
  Object.freeze({ name: "GLASS",       values: Object.freeze([72, 90, 54, 10,  5]) }),
  Object.freeze({ name: "HOLLOW",      values: Object.freeze([40, 38, 76,  6, 10]) }),
  Object.freeze({ name: "DUSTY",       values: Object.freeze([24, 20, 10, 68, 34]) }),
  Object.freeze({ name: "WORN",        values: Object.freeze([38, 16, 18, 52, 78]) }),
  Object.freeze({ name: "SOFT ANALOG", values: Object.freeze([50, 34, 12, 18, 58]) }),
  Object.freeze({ name: "BREATH",      values: Object.freeze([12, 56,  2, 92,  6]) }),
  Object.freeze({ name: "DARK",        values: Object.freeze([ 8,  4,  8, 14, 42]) }),
]);

const MOVEMENT_PRESETS = Object.freeze([
  Object.freeze({ name: "INIT", values: Object.freeze([38, 13, 27, 24, 17]) }),
  Object.freeze({ name: "STILL", values: Object.freeze([4, 3, 4, 4, 6]) }),
  Object.freeze({ name: "SLOW BREATH", values: Object.freeze([34, 6, 10, 10, 6]) }),
  Object.freeze({ name: "DEEP BREATH", values: Object.freeze([57, 7, 13, 13, 8]) }),
  Object.freeze({ name: "GLACIAL", values: Object.freeze([50, 7, 31, 21, 1]) }),
  Object.freeze({ name: "DRIFT", values: Object.freeze([17, 36, 24, 18, 11]) }),
  Object.freeze({ name: "TIDE", values: Object.freeze([62, 7, 41, 21, 7]) }),
  Object.freeze({ name: "STEREO WANDER", values: Object.freeze([20, 7, 17, 62, 11]) }),
  Object.freeze({ name: "BLOOM", values: Object.freeze([31, 6, 64, 18, 8]) }),
  Object.freeze({ name: "UNEASY", values: Object.freeze([52, 46, 43, 34, 21]) }),
  Object.freeze({ name: "FLOAT", values: Object.freeze([43, 15, 41, 48, 14]) }),
  Object.freeze({ name: "RESTLESS", values: Object.freeze([64, 32, 52, 53, 36]) }),
]);

const SPACE_PRESETS = Object.freeze([
  Object.freeze({ name: "INIT",        values: Object.freeze([58, 42, 24, 18, 20]) }),
  Object.freeze({ name: "CLOSE",       values: Object.freeze([22,  8,  6,  2,  0]) }),
  Object.freeze({ name: "WIDE",        values: Object.freeze([94, 18, 18, 12, 12]) }),
  Object.freeze({ name: "DEEP",        values: Object.freeze([66, 34, 76, 18, 68]) }),
  Object.freeze({ name: "LONG HALL",   values: Object.freeze([72, 28, 88, 16, 52]) }),
  Object.freeze({ name: "WASH",        values: Object.freeze([86, 48,100, 34, 72]) }),
  Object.freeze({ name: "ECHO FIELD",  values: Object.freeze([82, 92, 54, 42, 38]) }),
  Object.freeze({ name: "DISTANT",     values: Object.freeze([68, 30, 86, 18, 94]) }),
  Object.freeze({ name: "FLOATING",    values: Object.freeze([92, 42, 68, 82, 44]) }),
  Object.freeze({ name: "HUGE",        values: Object.freeze([100,68, 96, 56, 70]) }),
  Object.freeze({ name: "NARROW DARK", values: Object.freeze([10, 12, 42,  8, 58]) }),
  Object.freeze({ name: "EXPANSIVE",   values: Object.freeze([100,52, 84, 72, 48]) }),
]);

const PAGE_PRESETS = Object.freeze({
  1: VOICE_PRESETS,
  2: TONE_PRESETS,
  3: MOVEMENT_PRESETS,
  4: SPACE_PRESETS,
});

let activePage = 1;
let auditionState = "idle";
let auditionAudioContext = null;
let auditionTransport = null;
let auditionGeneration = 0;

function notifyAuditionState() {
  window.dispatchEvent(new CustomEvent("interPhace:audition-state"));
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function sliderValue(id) {
  return clamp(document.getElementById(id)?.value);
}

function save() {
  const values = {};
  const presets = {};
  document.querySelectorAll(".macroSlider").forEach(s => values[s.id] = Number(s.value));
  document.querySelectorAll(".presetSlider").forEach(s => presets[s.id] = Number(s.value));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ activePage, values, presets }));
}

function showPage(page) {
  activePage = page;
  pages.forEach((p,i) => p.classList.toggle("hidden", i !== page - 1));
  buttons.forEach((b,i) => b.classList.toggle("active", i === page - 1));
  shell.dataset.page = `app6_b${page}_p1`;
  save();
}

function updateSlider(s) {
  const min = Number(s.min || 0);
  const max = Number(s.max || 100);
  const value = Number(s.value);
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  s.style.setProperty("--value", `${Math.max(0, Math.min(100, percent))}%`);
  const v = document.getElementById(`${s.id}_value`);
  if (!v) return;
  if (s.classList.contains("presetSlider")) {
    const page = Number(s.id.match(/app6_b(\d+)_/)?.[1] || 1);
    v.textContent = PAGE_PRESETS[page]?.[value]?.name || "INIT";
  } else {
    v.textContent = s.value;
  }
}

function applyDefaults() {
  document.querySelectorAll(".macroSlider").forEach(s => {
    const value = DEFAULTS[s.id] ?? 50;
    s.defaultValue = String(value);
    s.setAttribute("value", String(value));
    s.value = String(value);
  });
}

function loadState() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (_) {}

  // Build 272 intentionally establishes the first DSP-authoritative defaults.
  // Do not migrate the old all-50 UI scaffold into the sound engine.
  if (saved?.values) {
    document.querySelectorAll(".macroSlider").forEach(s => {
      if (Number.isFinite(saved.values[s.id])) s.value = String(saved.values[s.id]);
    });
  }
  if (saved?.presets) {
    document.querySelectorAll(".presetSlider").forEach(s => {
      if (Number.isFinite(saved.presets[s.id])) s.value = String(saved.presets[s.id]);
    });
  }
  if (saved?.activePage >= 1 && saved?.activePage <= 4) activePage = saved.activePage;
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function presetIndexForCurrentValues(page) {
  const presets = PAGE_PRESETS[page] || [];
  const values = [1,2,3,4,5].map(i => sliderValue(`app6_b${page}_p1_c${i}`));
  return presets.findIndex(preset =>
    preset.values?.length === values.length &&
    preset.values.every((value, i) => Number(value) === Number(values[i]))
  );
}

function syncPresetForPage(page) {
  const slider = document.getElementById(`app6_b${page}_p1_c6`);
  if (!slider) return;
  const match = presetIndexForCurrentValues(page);
  if (match >= 0) slider.value = String(match);
  updateSlider(slider);
}

function applyPagePreset(page, index) {
  const preset = PAGE_PRESETS[page]?.[index];
  if (!preset?.values) return;
  preset.values.forEach((value, i) => {
    const slider = document.getElementById(`app6_b${page}_p1_c${i + 1}`);
    if (!slider) return;
    slider.value = String(value);
    updateSlider(slider);
  });
  const presetSlider = document.getElementById(`app6_b${page}_p1_c6`);
  if (presetSlider) {
    presetSlider.value = String(index);
    updateSlider(presetSlider);
  }
  save();
}

function generateCurrentPage() {
  const page = pages[activePage - 1];
  if (!page) return;
  page.querySelectorAll(".macroSlider").forEach(s => {
    s.value = String(Math.round(Math.random() * 100));
    updateSlider(s);
  });
  syncPresetForPage(activePage);
  save();
}

function readProjectContext() {
  try {
    const rootState = JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY) || "null") || {};
    const project = rootState.project || {};
    const scaleIndex = Math.max(0, Math.min(5, Math.round(Number(project.scale) || 0)));
    const scales = [
      [0,2,4,5,7,9,11],       // Major
      [0,2,3,5,7,8,10],       // Minor
      [0,2,3,5,7,9,10],       // Dorian
      [0,2,4,7,9],             // Major Pentatonic
      [0,3,5,7,10],            // Minor Pentatonic
      [0,2,3,7,8],             // Hirajoshi
    ];
    return {
      rootMidi: Math.max(21, Math.min(108, Math.round(Number(project.root) || 60))),
      scale: scales[scaleIndex] || scales[0],
    };
  } catch (_) {
    return { rootMidi: 60, scale: [0,2,4,5,7,9,11] };
  }
}

function nearestScaleSemitone(target, scale) {
  let best = scale[0] || 0;
  let distance = Infinity;
  for (let octave = -1; octave <= 2; octave++) {
    for (const degree of scale) {
      const candidate = degree + octave * 12;
      const d = Math.abs(candidate - target);
      if (d < distance) {
        distance = d;
        best = candidate;
      }
    }
  }
  return best;
}

const HARMONY_FAMILIES = Object.freeze([
  Object.freeze({ name: "root fifth", targets: Object.freeze([0, 7, 12, 19, 24]), weights: Object.freeze([0.34,0.25,0.18,0.13,0.08]) }),
  Object.freeze({ name: "open triad", targets: Object.freeze([0, 7, 16, 12, 19]), weights: Object.freeze([0.32,0.23,0.19,0.15,0.09]) }),
  // INIT/reference: C3 G3 E4 D4 G4 in C Major.
  Object.freeze({ name: "add9", targets: Object.freeze([0, 7, 16, 14, 19]), weights: Object.freeze([0.32,0.25,0.20,0.13,0.08]) }),
  Object.freeze({ name: "suspended", targets: Object.freeze([0, 7, 17, 14, 19]), weights: Object.freeze([0.32,0.24,0.18,0.15,0.09]) }),
  Object.freeze({ name: "sixth color", targets: Object.freeze([0, 7, 16, 21, 19]), weights: Object.freeze([0.32,0.23,0.18,0.14,0.10]) }),
  Object.freeze({ name: "seventh color", targets: Object.freeze([0, 7, 16, 22, 19]), weights: Object.freeze([0.32,0.23,0.18,0.14,0.09]) }),
  Object.freeze({ name: "octave pedal", targets: Object.freeze([0, 12, 24, 36, 48]), weights: Object.freeze([0.34,0.24,0.17,0.11,0.07]) }),
  Object.freeze({ name: "pedal upper", targets: Object.freeze([0, 12, 16, 19, 26]), weights: Object.freeze([0.34,0.23,0.18,0.13,0.09]) }),
  Object.freeze({ name: "soft cluster", targets: Object.freeze([0, 2, 7, 12, 14]), weights: Object.freeze([0.30,0.18,0.22,0.16,0.11]) }),
  Object.freeze({ name: "wide triad", targets: Object.freeze([0, 7, 16, 24, 31]), weights: Object.freeze([0.34,0.24,0.18,0.12,0.08]) }),
  Object.freeze({ name: "fifth ninth", targets: Object.freeze([0, 7, 14, 19, 26]), weights: Object.freeze([0.33,0.24,0.18,0.13,0.09]) }),
  Object.freeze({ name: "high color", targets: Object.freeze([0, 12, 19, 28, 38]), weights: Object.freeze([0.31,0.22,0.18,0.14,0.10]) }),
]);

function harmonyFamilyIndex(harmonyMacro) {
  return Math.max(
    0,
    Math.min(
      HARMONY_FAMILIES.length - 1,
      Math.round((clamp(harmonyMacro) / 100) * (HARMONY_FAMILIES.length - 1))
    )
  );
}

function spreadOctaveShifts(spreadMacro) {
  // Spread is harmonic voicing openness, not stereo detune.
  // The center band is neutral and preserves the INIT reference pitches exactly.
  const level = Math.max(0, Math.min(4, Math.round((clamp(spreadMacro) / 100) * 4)));
  return [
    [ 0,  0,-12,-12,-12], // compact
    [ 0,  0,  0,-12,  0], // close
    [ 0,  0,  0,  0,  0], // reference
    [ 0,  0,  0, 12, 12], // open
    [ 0,  0, 12, 12, 24], // very wide
  ][level];
}

function resolveVoicePlan(harmonyMacro, spreadMacro, scale, voiceCount) {
  const family = HARMONY_FAMILIES[harmonyFamilyIndex(harmonyMacro)] || HARMONY_FAMILIES[2];
  const shifts = spreadOctaveShifts(spreadMacro);
  const count = Math.max(1, Math.min(5, voiceCount));
  const offsets = family.targets
    .map((target, i) => nearestScaleSemitone(target, scale) + (shifts[i] || 0))
    .slice(0, count);
  const weights = family.weights.slice(0, count);
  return Object.freeze({ family, offsets, weights });
}

function droneParameters() {
  const project = readProjectContext();
  const source = sliderValue("app6_b1_p1_c1") / 100;
  const harmony = sliderValue("app6_b1_p1_c2");
  const voicesMacro = sliderValue("app6_b1_p1_c3");
  const registerMacro = sliderValue("app6_b1_p1_c4");
  const spread = sliderValue("app6_b1_p1_c5") / 100;

  const harmonics = sliderValue("app6_b2_p1_c1") / 100;
  const brightness = sliderValue("app6_b2_p1_c2") / 100;
  const resonance = sliderValue("app6_b2_p1_c3") / 100;
  const air = sliderValue("app6_b2_p1_c4") / 100;
  const saturation = sliderValue("app6_b2_p1_c5") / 100;

  const volumeMotion = sliderValue("app6_b3_p1_c1") / 100;
  const pitchDrift = sliderValue("app6_b3_p1_c2") / 100;
  const timbreMotion = sliderValue("app6_b3_p1_c3") / 100;
  const stereoMotion = sliderValue("app6_b3_p1_c4") / 100;
  const motionSpeed = sliderValue("app6_b3_p1_c5") / 100;

  const width = sliderValue("app6_b4_p1_c1") / 100;
  const delay = sliderValue("app6_b4_p1_c2") / 100;
  const reverb = sliderValue("app6_b4_p1_c3") / 100;
  const spaceMotion = sliderValue("app6_b4_p1_c4") / 100;
  const distance = sliderValue("app6_b4_p1_c5") / 100;

  const voiceCount = Math.max(1, Math.min(5, 1 + Math.round(voicesMacro * 4 / 100)));
  const registerLevel = Math.max(0, Math.min(4, Math.round((registerMacro / 100) * 4)));
  const registerSemitones = [-24, -12, 0, 12, 24][registerLevel];

  // interPhace may express Root as C4, C5, etc. dronePhace deliberately consumes
  // only its pitch class and chooses its own register. C at the neutral register
  // anchors at C3 (MIDI 48); D anchors at D3, etc.
  const rootPitchClass = ((project.rootMidi % 12) + 12) % 12;
  const baseRoot = 48 + rootPitchClass + registerSemitones;

  return {
    project, source, harmony, voiceCount, baseRoot, spread,
    harmonics, brightness, resonance, air, saturation,
    volumeMotion, pitchDrift, timbreMotion, stereoMotion, motionSpeed,
    width, delay, reverb, spaceMotion, distance,
  };
}

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function makeSeededNoise(length, seed = 42) {
  let state = seed >>> 0;
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    state = (1664525 * state + 1013904223) >>> 0;
    data[i] = ((state / 4294967296) * 2) - 1;
  }
  return data;
}

function addCrossDelay(L, R, dryL, dryR, seconds, gain, sampleRate) {
  const d = Math.max(1, Math.round(seconds * sampleRate));
  for (let i = d; i < L.length; i++) {
    L[i] += dryR[i - d] * gain;
    R[i] += dryL[i - d] * gain;
  }
}


function currentMovementPresetName() {
  const index = presetIndexForCurrentValues(3);
  return index >= 0 ? (MOVEMENT_PRESETS[index]?.name || "CUSTOM") : "CUSTOM";
}

function expandedMovementMacro(value, kind = "generic") {
  const x = clamp(value) / 100;
  // 0..70 recreates the former 0..100 range. The final 30% is new headroom.
  if (x <= 0.70) return x / 0.70;
  const u = (x - 0.70) / 0.30;
  const extra = {
    volume: 0.34,
    pitch: 0.55,
    timbre: 0.65,
    stereo: 0.80,
    speed: 2.20,
  }[kind] ?? 0.50;
  return 1 + Math.pow(u, 1.45) * extra;
}

function movementProfile(name, volumeMotion) {
  const base = {
    foundationProtection: 0.62,
    macroDepth: 0.30,
    eventCount: 1,
    holdFraction: 0.08,
    returnLag: 1.0,
  };
  const profiles = {
    "INIT":          { foundationProtection: 0.58, macroDepth: 0.18, eventCount: 1, holdFraction: 0.05, returnLag: 1.0 },
    "STILL":         { foundationProtection: 0.92, macroDepth: 0.05, eventCount: 0, holdFraction: 0.00, returnLag: 1.0 },
    "SLOW BREATH":   { foundationProtection: 0.74, macroDepth: 0.30, eventCount: 1, holdFraction: 0.06, returnLag: 1.0 },
    "DEEP BREATH":   { foundationProtection: 0.30, macroDepth: 0.62, eventCount: 1, holdFraction: 0.10, returnLag: 1.2 },
    "GLACIAL":       { foundationProtection: 0.18, macroDepth: 0.78, eventCount: 1, holdFraction: 0.14, returnLag: 1.5 },
    "DRIFT":         { foundationProtection: 0.78, macroDepth: 0.18, eventCount: 0, holdFraction: 0.00, returnLag: 1.0 },
    "TIDE":          { foundationProtection: 0.16, macroDepth: 0.82, eventCount: 1, holdFraction: 0.12, returnLag: 1.35 },
    "STEREO WANDER": { foundationProtection: 0.82, macroDepth: 0.16, eventCount: 0, holdFraction: 0.00, returnLag: 1.0 },
    "BLOOM":         { foundationProtection: 0.70, macroDepth: 0.26, eventCount: 1, holdFraction: 0.06, returnLag: 1.0 },
    "UNEASY":        { foundationProtection: 0.24, macroDepth: 0.66, eventCount: 2, holdFraction: 0.06, returnLag: 0.9 },
    "FLOAT":         { foundationProtection: 0.44, macroDepth: 0.48, eventCount: 1, holdFraction: 0.08, returnLag: 1.0 },
    "RESTLESS":      { foundationProtection: 0.08, macroDepth: 0.86, eventCount: 3, holdFraction: 0.04, returnLag: 0.78 },
  };
  const chosen = profiles[name] || base;
  return Object.freeze({
    ...chosen,
    macroDepth: Math.min(0.94, chosen.macroDepth * (0.65 + volumeMotion * 0.55)),
  });
}

function smoothstep01(x) {
  const v = Math.max(0, Math.min(1, x));
  return v * v * (3 - 2 * v);
}

function dipEnvelope(t, center, descent, hold, ascent) {
  const start = center - descent - hold * 0.5;
  const downEnd = center - hold * 0.5;
  const upStart = center + hold * 0.5;
  const end = upStart + ascent;
  if (t <= start || t >= end) return 0;
  if (t < downEnd) return smoothstep01((t - start) / Math.max(1e-6, descent));
  if (t <= upStart) return 1;
  return 1 - smoothstep01((t - upStart) / Math.max(1e-6, ascent));
}

function renderDroneBuffer(sampleRate = SAMPLE_RATE, duration = AUDITION_SECONDS, options = {}) {
  const p = droneParameters();
  if (options.suppressSpaceMotion === true) p.spaceMotion = 0;
  const frames = Math.max(1, Math.round(sampleRate * duration));
  const L = new Float32Array(frames);
  const R = new Float32Array(frames);
  const voicePlan = resolveVoicePlan(p.harmony, p.spread * 100, p.project.scale, p.voiceCount);
  const offsets = voicePlan.offsets;
  const voiceAmps = voicePlan.weights;
  const baseRates = [0.041, 0.053, 0.067, 0.037, 0.079];

  // Tone is anchored so INIT reproduces the original reference coefficients:
  // roughly 0.075 second harmonic, 0.022 third harmonic, and only trace upper color.
  // Away from INIT the range is intentionally much broader while remaining bed-safe.
  const sourceRichness = p.source;
  const harmonicRatio = Math.max(0, p.harmonics / 0.22);
  const brightnessCentered = (p.brightness - 0.42);
  const brightLift = brightnessCentered >= 0
    ? 1 + (brightnessCentered / 0.58) * 1.15
    : 1 + (brightnessCentered / 0.42) * 0.72;

  const harmonic2 = Math.min(0.34, 0.075 * Math.pow(harmonicRatio, 0.82) * brightLift);
  const harmonic3 = Math.min(0.16, 0.022 * Math.pow(harmonicRatio, 1.05) * Math.max(0.20, brightLift * 1.08));
  const harmonic4 = Math.min(0.10, sourceRichness * Math.pow(p.harmonics, 1.25) * (0.04 + 0.08 * p.brightness));
  const harmonic5 = Math.min(0.11, p.resonance * (0.010 + 0.10 * p.brightness));
  const harmonic7 = Math.min(0.065, Math.pow(p.resonance, 1.35) * (0.012 + 0.055 * p.harmonics));

  // Brightness also acts as a broad musical tone filter. INIT is effectively open;
  // low values become genuinely dark, high values preserve the richer upper material.
  const toneCutoff = 700 * Math.pow(26, p.brightness); // ~700 Hz to ~18 kHz
  const toneAlpha = 1 - Math.exp(-2 * Math.PI * toneCutoff / sampleRate);

  const volumeMacro = expandedMovementMacro(p.volumeMotion * 100, "volume");
  const pitchMacro = expandedMovementMacro(p.pitchDrift * 100, "pitch");
  const timbreMacro = expandedMovementMacro(p.timbreMotion * 100, "timbre");
  const stereoMacro = expandedMovementMacro(p.stereoMotion * 100, "stereo");
  const speedMacro = expandedMovementMacro(p.motionSpeed * 100, "speed");

  // At 70 these reproduce the former 100 settings. Above 70 is deliberately
  // new territory, especially Motion Speed.
  const speedScale = 0.42 + speedMacro * 1.35;
  const driftDepth = 0.00010 + pitchMacro * 0.00315;
  const timbreDepth = timbreMacro;
  const stereoDepth = stereoMacro;
  const movementName = currentMovementPresetName();
  const profile = movementProfile(movementName, volumeMacro);

  const phasesL = new Float64Array(offsets.length);
  const phasesR = new Float64Array(offsets.length);
  let toneLpL = 0;
  let toneLpR = 0;

  // Macro movement events create the "drift away / low-water / return" arc.
  // They are deliberately tied to the render duration so a 60-second audition
  // exposes the complete gesture instead of hiding it at the seam.
  const eventTimeScale = speedMacro <= 1
    ? 1
    : Math.max(0.30, 1 / (1 + (speedMacro - 1) * 1.35));
  const baseEventCenters = profile.eventCount === 0
    ? []
    : profile.eventCount === 1
      ? [duration * 0.58]
      : profile.eventCount === 2
        ? [duration * 0.38, duration * 0.73]
        : [duration * 0.28, duration * 0.56, duration * 0.81];
  const eventCenters = baseEventCenters.map(center =>
    Math.max(duration * 0.10, center * eventTimeScale)
  );

  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;
    let left = 0;
    let right = 0;

    let macroDip = 0;
    for (let e = 0; e < eventCenters.length; e++) {
      const center = eventCenters[e];
      const eventDurationScale = speedMacro <= 1 ? 1 : Math.max(0.28, 1 / (1 + (speedMacro - 1) * 1.55));
      const descent = duration * (0.14 + 0.025 * e) * eventDurationScale;
      const hold = duration * profile.holdFraction * eventDurationScale;
      const ascent = descent * profile.returnLag;
      macroDip = Math.max(macroDip, dipEnvelope(t, center, descent, hold, ascent));
    }

    for (let j = 0; j < offsets.length; j++) {
      const f = midiToHz(p.baseRoot + offsets[j]);

      // Local asynchronous fades keep voices alive between the larger macro events.
      const localRate = (0.012 + j * 0.0037) * speedScale;
      const localWaveA = 0.5 + 0.5 * Math.sin(2 * Math.PI * localRate * t + j * 1.37 + 0.45);
      const localWaveB = 0.5 + 0.5 * Math.sin(2 * Math.PI * localRate * 0.37 * t + j * 0.73 + 1.2);
      const localShape = Math.pow(localWaveA * 0.76 + localWaveB * 0.24, 1.6);

      // Foundation protection is preset-specific. Some movements keep the root
      // present; Tide/Glacial/Restless allow it to nearly vanish.
      const voiceRoleDepth = [0.72, 0.86, 0.94, 1.0, 1.0][j] ?? 1.0;
      const foundationFactor = j === 0 ? (1 - profile.foundationProtection) : 1;
      const localDepth = Math.min(0.88, (0.05 + volumeMacro * 0.38) * voiceRoleDepth * (j === 0 ? 0.55 + foundationFactor * 0.75 : 1));
      const macroDepth = Math.min(
        0.97,
        profile.macroDepth * voiceRoleDepth * (j === 0 ? 0.30 + foundationFactor * 0.90 : 1)
      );

      const movement = Math.max(0.015, 1 - localDepth * localShape - macroDepth * macroDip);

      const driftL = 1 + driftDepth * Math.sin(2 * Math.PI * ((0.021 + j * 0.0042) * speedScale) * t + j);
      const driftR = 1 + driftDepth * Math.sin(2 * Math.PI * ((0.018 + j * 0.0048) * speedScale) * t + j + 1.2);
      phasesL[j] += 2 * Math.PI * f * driftL / sampleRate;
      phasesR[j] += 2 * Math.PI * f * driftR / sampleRate;

      // Timbre can disappear more deeply during the macro dip, so the drone
      // thins toward a purer core before reforming.
      const timbreWave = 0.5 + 0.5 * Math.sin(
        2 * Math.PI * ((0.010 + j * 0.0028) * speedScale) * t + j * 0.91 + 0.6
      );
      const timbreWithdraw = Math.min(
        0.96,
        timbreDepth * (0.26 + 0.46 * timbreWave + 0.48 * macroDip)
      );
      const timbreAtten = 1 - timbreWithdraw;
      const h2 = harmonic2 * timbreAtten;
      const h3 = harmonic3 * timbreAtten;
      const h4 = harmonic4 * (0.88 * timbreAtten + 0.12);
      const h5 = harmonic5 * (0.76 * timbreAtten + 0.24);
      const h7 = harmonic7 * (0.68 * timbreAtten + 0.32);
      const amp = voiceAmps[j] || 0.08;

      const sigL =
        Math.sin(phasesL[j])
        + h2 * Math.sin(2 * phasesL[j])
        + h3 * Math.sin(3 * phasesL[j])
        + h4 * Math.sin(4 * phasesL[j])
        + h5 * Math.sin(5 * phasesL[j])
        + h7 * Math.sin(7 * phasesL[j]);
      const sigR =
        Math.sin(phasesR[j])
        + h2 * Math.sin(2 * phasesR[j])
        + h3 * Math.sin(3 * phasesR[j])
        + h4 * Math.sin(4 * phasesR[j])
        + h5 * Math.sin(5 * phasesR[j])
        + h7 * Math.sin(7 * phasesR[j]);

      const pan = Math.max(-0.96, Math.min(0.96,
        stereoDepth * 0.80 * Math.sin(
          2 * Math.PI * ((0.010 + j * 0.0024) * speedScale) * t + j * 1.11
        )
      ));
      const panL = Math.sqrt(Math.max(0, (1 - pan) * 0.5)) * Math.SQRT2;
      const panR = Math.sqrt(Math.max(0, (1 + pan) * 0.5)) * Math.SQRT2;

      left += amp * movement * sigL * panL;
      right += amp * movement * sigR * panR;
    }

    // The whole bed also recedes during the macro event. This is still attenuation
    // only: the nominal level is the ceiling and the return stops there.
    const wholeBedDepth = Math.min(0.78, profile.macroDepth * (0.28 + volumeMacro * 0.46));
    const wholeBed = Math.max(0.08, 1 - wholeBedDepth * macroDip);

    const rawL = left * wholeBed;
    const rawR = right * wholeBed;
    toneLpL += toneAlpha * (rawL - toneLpL);
    toneLpR += toneAlpha * (rawR - toneLpR);
    L[i] = toneLpL;
    R[i] = toneLpR;
  }

  // Texture / Air now spans pristine -> subtle reference air -> clearly breathy/grainy.
  if (p.air > 0.001) {
    const noise = makeSeededNoise(frames, 42);
    const window = 160;
    let rolling = 0;
    const history = new Float32Array(window);
    for (let i = 0; i < frames; i++) {
      const slot = i % window;
      rolling -= history[slot];
      history[slot] = noise[i];
      rolling += history[slot];
      const high = noise[i] - rolling / Math.min(i + 1, window);
      const t = i / sampleRate;
      const airEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * (0.047 * (0.65 + p.motionSpeed)) * t - 0.7);
      // At INIT air=.28 -> about .0065, matching the reference. High settings become
      // audibly breathy/grainy without overwhelming the pitched bed.
      const airGain = 0.0005 + Math.pow(p.air, 1.15) * 0.026;
      const grain = high * (0.72 + 0.28 * Math.sin(2 * Math.PI * (0.19 + 0.11 * p.air) * t + 0.3));
      L[i] += airGain * grain * airEnv;
      const ri = i >= 211 ? i - 211 : i;
      R[i] += airGain * (0.72 * high + 0.28 * noise[ri]) * airEnv;
    }
  }

  // Space is intentionally obvious outside INIT. Width controls source-field
  // decorrelation; Delay creates asynchronous cross-reflections; Reverb builds a
  // denser feedback-like diffusion cloud; Space Motion orbits the whole field;
  // Distance changes acoustic perspective rather than acting as a volume knob.

  // Width: 0 is near mono, INIT remains moderate, 100 is deliberately huge.
  const widthCurve = Math.pow(p.width, 1.15);
  const sideGain = 0.04 + widthCurve * 2.05;
  let decorL = 0;
  let decorR = 0;
  for (let i = 0; i < frames; i++) {
    const mid = (L[i] + R[i]) * 0.5;
    const side = (L[i] - R[i]) * 0.5;
    // Tiny opposite-channel memory makes high width audible even for correlated material.
    decorL += 0.018 * (R[i] - decorL);
    decorR += 0.021 * (L[i] - decorR);
    const decorAmount = Math.max(0, p.width - 0.45) * 0.24;
    L[i] = mid + side * sideGain + (L[i] - decorL) * decorAmount;
    R[i] = mid - side * sideGain + (R[i] - decorR) * decorAmount;
  }

  const dryL = L.slice();
  const dryR = R.slice();

  // Delay: INIT stays in the reference neighborhood; high values become a clearly
  // audible, non-tempo-synced stereo echo field.
  if (p.delay > 0.001) {
    const d = p.delay;
    const gainScale = 0.42 + d * 1.45;
    const times = [0.19, 0.37, 0.63, 1.03, 1.61];
    const gains = [0.095, 0.080, 0.062, 0.046, 0.032];
    for (let k = 0; k < times.length; k++) {
      const asym = k % 2 ? 0.93 : 1.07;
      addCrossDelay(
        L, R, dryL, dryR,
        times[k] * (0.82 + d * 0.36) * asym,
        gains[k] * d * gainScale,
        sampleRate
      );
    }
  }

  // Reverb: multi-generation diffuse cross-delay cloud. This is intentionally
  // much stronger than the old six quiet taps, while remaining bounded.
  if (p.reverb > 0.001) {
    const wet = p.reverb;
    const revSourceL = L.slice();
    const revSourceR = R.slice();
    const roomScale = 0.62 + wet * 1.25;
    const taps = [
      [0.071,0.105],[0.113,0.092],[0.173,0.080],[0.257,0.069],
      [0.389,0.058],[0.577,0.048],[0.853,0.039],[1.271,0.031],
      [1.879,0.024],[2.683,0.018],
    ];
    for (let k = 0; k < taps.length; k++) {
      const [secs,gain] = taps[k];
      addCrossDelay(L,R,revSourceL,revSourceR,secs*roomScale,gain*wet,sampleRate);
    }
    // A second, quieter generation gives high Reverb a real tail/wash.
    if (wet > 0.28) {
      const gen2L = L.slice();
      const gen2R = R.slice();
      const feedback = Math.pow((wet - 0.28) / 0.72, 1.15);
      const taps2 = [[0.331,0.060],[0.719,0.047],[1.337,0.034],[2.291,0.024],[3.487,0.016]];
      for (let k = 0; k < taps2.length; k++) {
        const [secs,gain] = taps2[k];
        addCrossDelay(L,R,gen2L,gen2R,secs*roomScale,gain*feedback,sampleRate);
      }
    }
  }

  // Distance: dry presence and high-frequency detail recede while the diffuse
  // field remains. INIT at 20 stays close to the previous reference perspective.
  if (p.distance > 0.001) {
    const dist = p.distance;
    const cutoff = 1500 + Math.pow(1 - dist, 1.45) * 15000;
    const alpha = 1 - Math.exp(-2 * Math.PI * cutoff / sampleRate);
    let lpL = 0, lpR = 0;
    const directKeep = 1 - dist * 0.42;
    for (let i = 0; i < frames; i++) {
      lpL += alpha * (L[i] - lpL);
      lpR += alpha * (R[i] - lpR);
      L[i] = lpL * directKeep;
      R[i] = lpR * directKeep;
    }
  }

  // Space Motion moves the whole environment, not individual voices. It uses an
  // asymmetric orbit with changing radius/rate rather than a simple sine pan.
  if (p.spaceMotion > 0.001) {
    const m = p.spaceMotion;
    for (let i = 0; i < frames; i++) {
      const t = i / sampleRate;
      const angle =
        2 * Math.PI * ((0.010 + 0.045 * m) * t)
        + 0.72 * m * Math.sin(2 * Math.PI * (0.0037 + 0.006 * m) * t + 0.4);
      const radius = m * (0.28 + 0.68 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.0063 * t + 1.1)));
      const pan = Math.max(-0.97, Math.min(0.97, Math.sin(angle) * radius));
      const widthPulse = 0.82 + 0.38 * m * (0.5 + 0.5 * Math.cos(angle * 0.73 + 0.8));
      const inL = L[i], inR = R[i];
      const mid = (inL + inR) * 0.5;
      const side = (inL - inR) * 0.5 * widthPulse;
      const fieldL = mid + side;
      const fieldR = mid - side;
      const gL = Math.sqrt(Math.max(0, (1 - pan) * 0.5)) * Math.SQRT2;
      const gR = Math.sqrt(Math.max(0, (1 + pan) * 0.5)) * Math.SQRT2;
      L[i] = fieldL * gL;
      R[i] = fieldR * gR;
    }
  }

  // Saturation: INIT stays near the original tanh(.82×); the upper half adds
  // progressively denser warm compression rather than hard clipping.
  const drive = 0.64 + p.saturation * 1.00 + Math.pow(p.saturation, 2) * 1.10;
  const warmth = Math.pow(p.saturation, 1.4) * 0.08;
  let satLpL = 0;
  let satLpR = 0;
  let peak = 1e-9;
  for (let i = 0; i < frames; i++) {
    satLpL += 0.035 * (L[i] - satLpL);
    satLpR += 0.035 * (R[i] - satLpR);
    L[i] = Math.tanh((L[i] + satLpL * warmth) * drive);
    R[i] = Math.tanh((R[i] + satLpR * warmth) * drive);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }

  const outputScale = 0.80 / Math.max(1, peak / 0.92);
  const audioBuffer = new AudioBuffer({
    length: frames,
    numberOfChannels: 2,
    sampleRate,
  });
  const outL = audioBuffer.getChannelData(0);
  const outR = audioBuffer.getChannelData(1);
  for (let i = 0; i < frames; i++) {
    outL[i] = L[i] * outputScale;
    outR[i] = R[i] * outputScale;
  }
  return audioBuffer;
}


window.DronePhaceRenderAPI = Object.freeze({
  renderBed({
    sampleRate = SAMPLE_RATE,
    duration = AUDITION_SECONDS,
    suppressSpaceMotion = false,
  } = {}) {
    const seconds = Math.max(1, Number(duration) || AUDITION_SECONDS);
    const current = droneParameters();
    return Object.freeze({
      buffer: renderDroneBuffer(sampleRate, seconds, { suppressSpaceMotion }),
      loopSeconds: seconds,
      sampleRate,
      spaceMotion: current.spaceMotion,
    });
  },
});

function stopAudition() {
  auditionGeneration++;
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
  const generation = ++auditionGeneration;
  auditionState = "rendering";
  notifyAuditionState();

  // Paint the rendering state before the synchronous 60-second DSP render.
  await window.InterPhaceShell.paintBeforeSynchronousWork();
  if (generation !== auditionGeneration || auditionState !== "rendering") return;

  // Render first. Nothing sounds until the complete 60-second drone exists.
  const rendered = renderDroneBuffer(SAMPLE_RATE, AUDITION_SECONDS);
  if (generation !== auditionGeneration) return;

  if (!auditionAudioContext) {
    auditionAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (auditionAudioContext.state === "suspended") await auditionAudioContext.resume();
  if (generation !== auditionGeneration) return;

  const buffer = auditionAudioContext.createBuffer(2, rendered.length, rendered.sampleRate);
  buffer.copyToChannel(rendered.getChannelData(0), 0);
  buffer.copyToChannel(rendered.getChannelData(1), 1);

  auditionTransport = InterPhaceBedLoop.create({
    context: auditionAudioContext,
    buffer,
    destination: auditionAudioContext.destination,
    gain: window.InterPhaceShell?.readMixerChannelGain?.("drone", { respectMute: false })?.gain ?? 1,
    overlapSeconds: 3,
    startTime: auditionAudioContext.currentTime + 0.02,
  });
  auditionState = "playing";
  notifyAuditionState();
}

function toggleAudition(event) {
  event?.preventDefault();
  if (auditionState !== "idle") {
    stopAudition();
    return;
  }
  startAudition().catch(error => {
    console.error("dronePhace audition failed", error);
    stopAudition();
  });
}

applyDefaults();
loadState();

document.querySelectorAll(".macroSlider").forEach(s => {
  updateSlider(s);
  s.addEventListener("input", () => {
    updateSlider(s);
    const page = Number(s.id.match(/app6_b(\d+)_/)?.[1] || activePage);
    syncPresetForPage(page);
    save();
  });
});

document.querySelectorAll(".presetSlider").forEach(s => {
  updateSlider(s);
  s.addEventListener("input", () => {
    const page = Number(s.id.match(/app6_b(\d+)_/)?.[1] || activePage);
    applyPagePreset(page, Number(s.value));
  });
});

buttons.forEach((b,i) => b.addEventListener("click", () => showPage(i + 1)));
generateBtn.addEventListener("click", generateCurrentPage);

const shellBinding = window.InterPhaceShell?.bind({
  app: "#shell",
  name: "dronePhace",
  accent: getComputedStyle(document.documentElement).getPropertyValue("--drone").trim() || "#66e0b3",
  line: getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#2a2d33",
  text: getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#f0f1f3",
  muted: getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "#777d87",
  getAuditionState: () => auditionState,
});
shellBinding?.auditionBtn?.addEventListener("click", toggleAudition);

showPage(activePage);
