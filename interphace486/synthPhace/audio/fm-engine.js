// ============================================================
//  INTERPHACE FM ENGINE — MUSICAL TWO-STAGE FM
//  Modulator 2 -> Modulator 1 -> Carrier
// ============================================================

window.FMEngine = {};

const FM_DEPTH_PRESETS = [
  { name: "Off",          points: [[0, 1], [1, 1]] },
  { name: "Pluck Soft",   points: [[0, 2.8], [0.04, 2.2], [0.10, 1.4], [0.24, 0.65], [0.45, 0.24], [0.72, 0.12], [1, 0.08]] },
  { name: "Pluck Bright", points: [[0, 5.0], [0.025, 4.4], [0.07, 2.8], [0.16, 1.15], [0.32, 0.42], [0.58, 0.16], [1, 0.05]] },
  { name: "Tine Light",   points: [[0, 3.0], [0.05, 2.6], [0.14, 1.8], [0.32, 1.1], [0.55, 0.62], [0.78, 0.35], [1, 0.22]] },
  { name: "Tine Hard",    points: [[0, 6.5], [0.025, 6.0], [0.08, 4.0], [0.18, 2.0], [0.38, 0.82], [0.68, 0.34], [1, 0.12]] },
  { name: "Bell Clear",   points: [[0, 4.0], [0.06, 3.7], [0.18, 3.0], [0.38, 2.15], [0.62, 1.35], [0.82, 0.78], [1, 0.42]] },
  { name: "Bell Wild",    points: [[0, 8.0], [0.04, 7.4], [0.12, 6.2], [0.28, 4.6], [0.50, 3.2], [0.72, 2.0], [0.88, 1.0], [1, 0.45]] },
  { name: "Chime Long",   points: [[0, 5.0], [0.08, 4.6], [0.22, 4.0], [0.42, 3.2], [0.64, 2.4], [0.82, 1.65], [1, 0.9]] },
  { name: "Rise",         points: [[0, 0.03], [0.12, 0.08], [0.28, 0.25], [0.46, 0.8], [0.62, 2.0], [0.78, 4.5], [0.90, 7.0], [1, 1.0]] },
  { name: "Sweep",        points: [[0, 0.05], [0.14, 0.18], [0.30, 0.55], [0.48, 1.4], [0.65, 3.0], [0.80, 5.5], [0.92, 8.0], [1, 0.5]] },
  { name: "Bloom",        points: [[0, 0.04], [0.16, 0.10], [0.34, 0.35], [0.52, 1.1], [0.68, 3.0], [0.80, 6.0], [0.90, 8.5], [1, 2.0]] },
  { name: "Punch",        points: [[0, 7.0], [0.018, 7.0], [0.06, 1.8], [0.12, 0.35], [0.28, 0.12], [0.55, 0.08], [1, 0.05]] },
  { name: "Collapse",     points: [[0, 8.0], [0.14, 8.0], [0.30, 6.0], [0.46, 3.2], [0.60, 1.2], [0.74, 0.35], [0.88, 0.08], [1, 0.01]] },
  { name: "Late Burst",   points: [[0, 0.08], [0.50, 0.08], [0.62, 0.18], [0.72, 0.7], [0.80, 2.5], [0.87, 7.5], [0.92, 10.0], [0.97, 3.0], [1, 0.15]] },
  { name: "Double Hit",   points: [[0, 7.0], [0.035, 7.0], [0.10, 0.25], [0.28, 0.08], [0.43, 0.18], [0.50, 6.5], [0.56, 7.5], [0.64, 0.30], [0.82, 0.10], [1, 0.05]] },
  { name: "Pulse",        points: [[0, 0.12], [0.10, 5.5], [0.20, 0.15], [0.32, 7.0], [0.44, 0.18], [0.58, 8.5], [0.70, 0.20], [0.84, 6.0], [1, 0.10]] },
  { name: "Surge",        points: [[0, 0.2], [0.18, 1.0], [0.30, 4.0], [0.40, 8.0], [0.52, 2.0], [0.62, 9.0], [0.74, 3.0], [0.84, 10.0], [1, 0.4]] },
  { name: "Explosion",    points: [[0, 0.03], [0.24, 0.05], [0.40, 0.12], [0.52, 0.6], [0.60, 3.5], [0.66, 10.0], [0.72, 12.0], [0.80, 5.0], [0.90, 1.0], [1, 0.08]] },
  { name: "Metal Storm",  points: [[0, 3.0], [0.08, 9.0], [0.17, 2.0], [0.27, 11.0], [0.38, 4.0], [0.50, 12.0], [0.62, 3.0], [0.74, 10.0], [0.86, 5.0], [1, 1.0]] },
  { name: "Wall",         points: [[0, 7.0], [0.08, 9.0], [0.20, 10.0], [0.36, 11.0], [0.52, 12.0], [0.68, 11.0], [0.84, 9.0], [1, 7.0]] },
  { name: "Destroy",      points: [[0, 12.0], [0.06, 4.0], [0.14, 14.0], [0.24, 2.0], [0.36, 16.0], [0.50, 3.0], [0.64, 15.0], [0.78, 1.5], [0.90, 12.0], [1, 0.05]] },
];

const FM_RATIO_PRESETS = [
  { name: "Pure", mod1: 1.0, mod2: 1.0 },
  { name: "Gentle Octave", mod1: 1.0, mod2: 2.0 },
  { name: "Reverse Octave", mod1: 2.0, mod2: 1.0 },
  { name: "Warm Half", mod1: 0.5, mod2: 1.0 },
  { name: "Slow Under", mod1: 2.0, mod2: 0.5 },
  { name: "Soft Fifth", mod1: 1.0, mod2: 1.5 },
  { name: "Reverse Fifth", mod1: 1.5, mod2: 1.0 },
  { name: "Double", mod1: 2.0, mod2: 2.0 },
  { name: "Octave Motion", mod1: 2.0, mod2: 4.0 },
  { name: "Octave Under", mod1: 4.0, mod2: 2.0 },
  { name: "Fourth Stack", mod1: 2.0, mod2: 3.0 },
  { name: "Fourth Reverse", mod1: 3.0, mod2: 2.0 },
  { name: "Bell", mod1: 1.0, mod2: 3.0 },
  { name: "Bell Reverse", mod1: 3.0, mod2: 1.0 },
  { name: "Glass", mod1: 1.414, mod2: 2.0 },
  { name: "Glass Reverse", mod1: 2.0, mod2: 1.414 },
];

const MOD1_MAX_INDEX = 7.25;
const MOD2_MAX_INDEX = 3.25;

FMEngine.register = function (patch) {
  patch.synth.fm = {
    modulators: [
      { ratio: 1.0, gain: 0, wave: "sine" },
      { ratio: 2.0, gain: 0, wave: "sine" },
    ],
    fmDepthPreset: 0,
    ratioPreset: 0,
    carrierVolume: 100,
    harmonics: 0,
    harmonic1: { gain: 0, noteOffset: 0 },
    harmonic2: { gain: 0, noteOffset: 0 },
  };
};

FMEngine.initUI = function (patch) {
  const fm = patch.synth.fm;
  initFMRatioUI(fm);
  initFMWaveUI(fm);

  UI.bindSlider("mod1Gain", "mod1GainValue", value => {
    fm.modulators[0].gain = Number(value);
    return `${Math.round(value)}%`;
  });

  UI.bindSlider("mod2Gain", "mod2GainValue", value => {
    fm.modulators[1].gain = Number(value);
    return `${Math.round(value)}%`;
  });

  const depthSlider = document.getElementById("fmDepthPreset");
  if (depthSlider) {
    depthSlider.min = "0";
    depthSlider.max = String(FM_DEPTH_PRESETS.length - 1);
    depthSlider.step = "1";
  }

  UI.bindSlider("fmDepthPreset", "fmDepthPresetValue", value => {
    fm.fmDepthPreset = Number(value);
    return (FM_DEPTH_PRESETS[value] || FM_DEPTH_PRESETS[0]).name;
  });

  initFMRatioPresetUI(fm);
};

function initFMRatioUI(fm) {
  document.querySelectorAll('[data-selector-group="fm-ratio"][data-mod]').forEach(group => {
    const modIndex = Number(group.dataset.mod) - 1;
    if (modIndex < 0 || modIndex > 1) return;

    group.addEventListener("click", event => {
      const button = event.target.closest("button[data-ratio]");
      if (!button) return;
      fm.modulators[modIndex].ratio = Number(button.dataset.ratio);
      group.querySelectorAll("button[data-ratio]").forEach(item => {
        item.classList.toggle("active", item === button);
      });
      updateFMRatioPresetState(fm);
    });
  });
}


let loadedFMRatioPresetIndex = 0;

function ratiosMatchPreset(fm, preset) {
  if (!preset || !Array.isArray(fm.modulators)) return false;
  const mod1 = Number(fm.modulators[0]?.ratio);
  const mod2 = Number(fm.modulators[1]?.ratio);
  return Math.abs(mod1 - preset.mod1) < 0.0005 &&
         Math.abs(mod2 - preset.mod2) < 0.0005;
}

function setRatioButtonState(modIndex, ratio) {
  const group = document.querySelector(`[data-selector-group="fm-ratio"][data-mod="${modIndex + 1}"]`);
  if (!group) return;
  group.querySelectorAll("button[data-ratio]").forEach(button => {
    button.classList.toggle(
      "active",
      Math.abs(Number(button.dataset.ratio) - Number(ratio)) < 0.0005
    );
  });
}

function applyFMRatioPreset(fm, index) {
  const safeIndex = Math.max(0, Math.min(FM_RATIO_PRESETS.length - 1, Number(index) || 0));
  const preset = FM_RATIO_PRESETS[safeIndex];
  loadedFMRatioPresetIndex = safeIndex;
  fm.ratioPreset = safeIndex;
  fm.modulators[0].ratio = preset.mod1;
  fm.modulators[1].ratio = preset.mod2;

  setRatioButtonState(0, preset.mod1);
  setRatioButtonState(1, preset.mod2);

  const value = document.getElementById("fmRatioPresetValue");
  if (value) {
    value.textContent = preset.name;
    value.classList.remove("preset-modified");
  }
}

function updateFMRatioPresetState(fm) {
  const preset = FM_RATIO_PRESETS[loadedFMRatioPresetIndex];
  const value = document.getElementById("fmRatioPresetValue");
  if (!value || !preset) return;
  value.textContent = preset.name;
  value.classList.toggle("preset-modified", !ratiosMatchPreset(fm, preset));
}

function initFMRatioPresetUI(fm) {
  const slider = document.getElementById("fmRatioPreset");
  const value = document.getElementById("fmRatioPresetValue");
  if (!slider || !value) return;

  slider.min = "0";
  slider.max = String(FM_RATIO_PRESETS.length - 1);
  slider.step = "1";

  loadedFMRatioPresetIndex = Math.max(
    0,
    Math.min(FM_RATIO_PRESETS.length - 1, Number(fm.ratioPreset) || 0)
  );
  slider.value = String(loadedFMRatioPresetIndex);

  const loadedPreset = FM_RATIO_PRESETS[loadedFMRatioPresetIndex];
  value.textContent = loadedPreset.name;
  value.classList.toggle("preset-modified", !ratiosMatchPreset(fm, loadedPreset));

  slider.addEventListener("input", () => {
    applyFMRatioPreset(fm, slider.value);
    if (window.UI?.updateRangeFill) window.UI.updateRangeFill(slider);
    slider.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

FMEngine.getRatioPresets = function () {
  return FM_RATIO_PRESETS.map(preset => ({ ...preset }));
};

function initFMWaveUI(fm) {
  document.querySelectorAll('[data-selector-group="fm-wave"][data-mod]').forEach(group => {
    const modIndex = Number(group.dataset.mod) - 1;
    if (modIndex < 0 || modIndex > 1) return;

    group.addEventListener("click", event => {
      const button = event.target.closest("button[data-wave]");
      if (!button) return;
      fm.modulators[modIndex].wave = button.dataset.wave;
      group.querySelectorAll("button[data-wave]").forEach(item => item.classList.toggle("active", item === button));
    });
  });
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function normalizeWave(wave) {
  return wave === "saw" ? "sawtooth" : (wave || "sine");
}

function sliderToIndex(value, maximum) {
  const normalized = clamp(value, 0, 100) / 100;
  return maximum * normalized * normalized;
}

function waveCompensation(wave) {
  if (wave === "square") return 0.58;
  if (wave === "saw" || wave === "sawtooth") return 0.48;
  return 1;
}

function keyboardScale(baseFreq) {
  const midi = 69 + 12 * Math.log2(Math.max(1, baseFreq) / 440);
  const distanceAboveC4 = Math.max(0, midi - 60);
  const distanceBelowC4 = Math.max(0, 60 - midi);
  const highScale = Math.pow(2, -distanceAboveC4 / 60);
  const lowScale = Math.pow(2, -distanceBelowC4 / 120);
  return clamp(highScale * lowScale, 0.48, 1);
}

function scheduleShape(param, startTime, duration, baseDeviation, preset) {
  const safeDuration = Math.max(0.03, duration);
  param.cancelScheduledValues(startTime);

  preset.points.forEach((point, index) => {
    const time = startTime + clamp(point[0], 0, 1) * safeDuration;
    const multiplier = Math.max(0, Number(point[1]) || 0);
    const value = baseDeviation * multiplier;
    if (index === 0) param.setValueAtTime(value, time);
    else param.linearRampToValueAtTime(value, time);
  });
}

FMEngine.build = function (ctx, baseFreq, fmParams, noteLength) {
  const t0 = ctx.currentTime;
  const stopTime = t0 + Math.max(0.03, noteLength);
  const modulators = Array.isArray(fmParams.modulators) ? fmParams.modulators : [];
  const mod1Params = modulators[0] || { ratio: 1, gain: 0, wave: "sine" };
  const mod2Params = modulators[1] || { ratio: 2, gain: 0, wave: "sine" };
  const scale = keyboardScale(baseFreq);

  const carrier = ctx.createOscillator();
  carrier.type = "sine";
  carrier.frequency.setValueAtTime(baseFreq, t0);

  const mod1Ratio = clamp(mod1Params.ratio, 0.125, 16);
  const mod1Freq = baseFreq * mod1Ratio;
  const mod1Index = sliderToIndex(mod1Params.gain, MOD1_MAX_INDEX);
  const mod1Deviation = mod1Index * baseFreq * scale * waveCompensation(mod1Params.wave);

  let mod1 = null;
  let mod1Amount = null;
  let mod2 = null;
  let mod2Amount = null;
  let mod2Index = 0;
  let mod2Deviation = 0;

  if (mod1Deviation > 0) {
    mod1 = ctx.createOscillator();
    mod1.type = normalizeWave(mod1Params.wave);
    mod1.frequency.setValueAtTime(mod1Freq, t0);

    mod1Amount = ctx.createGain();
    const depthPreset = FM_DEPTH_PRESETS[
      clamp(fmParams.fmDepthPreset, 0, FM_DEPTH_PRESETS.length - 1)
    ] || FM_DEPTH_PRESETS[0];

    if (fmParams.fmDepthPreset > 0) {
      scheduleShape(mod1Amount.gain, t0, noteLength, mod1Deviation, depthPreset);
    } else {
      mod1Amount.gain.setValueAtTime(mod1Deviation, t0);
    }

    mod1.connect(mod1Amount);
    mod1Amount.connect(carrier.frequency);

    mod2Index = sliderToIndex(mod2Params.gain, MOD2_MAX_INDEX);
    mod2Deviation = mod2Index * mod1Freq * scale * waveCompensation(mod2Params.wave);

    if (mod2Deviation > 0) {
      mod2 = ctx.createOscillator();
      const mod2Ratio = clamp(mod2Params.ratio, 0.125, 16);
      const mod2Freq = baseFreq * mod2Ratio;
      mod2.type = normalizeWave(mod2Params.wave);
      mod2.frequency.setValueAtTime(mod2Freq, t0);

      mod2Amount = ctx.createGain();
      mod2Amount.gain.setValueAtTime(0, t0);
      mod2Amount.gain.linearRampToValueAtTime(
        mod2Deviation,
        t0 + Math.min(0.015, noteLength * 0.05)
      );
      mod2Amount.gain.setValueAtTime(
        mod2Deviation,
        Math.max(t0 + 0.015, stopTime - 0.02)
      );
      mod2Amount.gain.linearRampToValueAtTime(0, stopTime);

      mod2.connect(mod2Amount);
      mod2Amount.connect(mod1.frequency);
    }
  }

  const carrierGain = ctx.createGain();
  carrierGain.gain.value = clamp(fmParams.carrierVolume, 0, 127) / 127;
  carrier.connect(carrierGain);

  const mixer = ctx.createGain();
  carrierGain.connect(mixer);

  // Low-body experiment. The stored `harmonics` parameter is kept for patch
  // compatibility, but this version uses it primarily for low-frequency body:
  // fundamental reinforcement + restrained octave-down support. No detuning.
  const harmonicColor = clamp(fmParams.harmonics, 0, 100) / 100;
  const colorOscillators = [];

  function smooth01(value) {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function rangedAmount(start, full, maximum) {
    if (harmonicColor <= start) return 0;
    return maximum * smooth01((harmonicColor - start) / Math.max(0.0001, full - start));
  }

  function addBodyOsc(parentFreq, parentGain, ratio, amount, attackScale = 0.08) {
    if (amount <= 0) return;
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(parentFreq * ratio, t0);

    const gainNode = ctx.createGain();
    const level = parentGain * amount;
    gainNode.gain.setValueAtTime(level * 0.72, t0);
    gainNode.gain.linearRampToValueAtTime(
      level,
      Math.min(stopTime, t0 + Math.min(0.14, noteLength * attackScale))
    );
    gainNode.gain.linearRampToValueAtTime(level * 0.90, stopTime);

    oscillator.connect(gainNode);
    gainNode.connect(mixer);
    oscillator.start(t0);
    oscillator.stop(stopTime);
    colorOscillators.push(oscillator);
  }

  function addCleanHarmonics(parentFreq, parentGain) {
    if (harmonicColor <= 0 || parentGain <= 0) return;

    // First enlarge the existing pitch. Then introduce octave-down weight
    // gradually enough that it reads as body rather than a second bass note.
    addBodyOsc(parentFreq, parentGain, 1.0, rangedAmount(0.00, 0.30, 0.14), 0.10);
    addBodyOsc(parentFreq, parentGain, 0.5, rangedAmount(0.07, 0.65, 0.16), 0.14);

    // Very deep support is intentionally tiny and reserved for the top end.
    addBodyOsc(parentFreq, parentGain, 0.25, rangedAmount(0.78, 1.00, 0.025), 0.18);

    // A trace of 2nd harmonic prevents the reinforced sine stack from becoming
    // dull, but brightness is no longer the primary action of this control.
    addBodyOsc(parentFreq, parentGain, 2.0, rangedAmount(0.48, 1.00, 0.035), 0.06);
  }

  addCleanHarmonics(baseFreq, clamp(fmParams.carrierVolume, 0, 127) / 127);

  const harmonicLayers = [
    { layer: fmParams.harmonic1, laneIndex: 1 },
    { layer: fmParams.harmonic2, laneIndex: 2 },
  ].filter(item => Boolean(item.layer));
  const companions = [];

  harmonicLayers.forEach(({ layer, laneIndex }) => {
    const gain = clamp(layer.gain, 0, 100) / 100;
    if (gain <= 0) return;

    const layerFreq =
      baseFreq * Math.pow(2, clamp(layer.noteOffset, -36, 36) / 12);
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(layerFreq, t0);

    const layerGain = ctx.createGain();
    layerGain.gain.setValueAtTime(0, t0);

    oscillator.connect(layerGain);
    layerGain.connect(mixer);
    addCleanHarmonics(layerFreq, gain);

    const offset = clamp(layer.noteOffset, -36, 36);
    companions.push({
      gain: layerGain.gain,
      detune: oscillator.detune,
      baseGain: gain,
      laneIndex,
      classification: offset < 0 ? "lower" : offset > 0 ? "higher" : "equal",
    });

    oscillator.start(t0);
    oscillator.stop(stopTime);
  });

  mixer.gain.value = 1;

  if (mod2) {
    mod2.start(t0);
    mod2.stop(stopTime);
  }

  if (mod1) {
    mod1.start(t0);
    mod1.stop(stopTime);
  }

  carrier.start(t0);
  carrier.stop(stopTime);

  return {
    node: mixer,
    carrier,
    modulationTargets: {
      detune: carrier.detune,
      fmAmount: mod1Amount ? mod1Amount.gain : null,
      fmBaseDeviation: mod1Deviation,
      companions,
    },
    inspection: {
      mod1Active: Boolean(mod1),
      mod2Active: Boolean(mod2),
      keyboardScale: scale,
      mod1: {
        ratio: mod1Ratio,
        waveform: normalizeWave(mod1Params.wave),
        requestedAmount: clamp(mod1Params.gain, 0, 100),
        effectiveIndex: mod1Index,
        effectiveDeviationHz: mod1Deviation,
        waveformCompensation: waveCompensation(mod1Params.wave),
      },
      mod2: {
        ratio: clamp(mod2Params.ratio, 0.125, 16),
        waveform: normalizeWave(mod2Params.wave),
        requestedAmount: clamp(mod2Params.gain, 0, 100),
        effectiveIndex: mod2Index,
        effectiveDeviationHz: mod2Deviation,
        waveformCompensation: waveCompensation(mod2Params.wave),
      },
    },
  };
};

FMEngine.inspect = function (baseFreq, fmParams) {
  const modulators = Array.isArray(fmParams.modulators) ? fmParams.modulators : [];
  const mod1Params = modulators[0] || { ratio: 1, gain: 0, wave: "sine" };
  const mod2Params = modulators[1] || { ratio: 2, gain: 0, wave: "sine" };
  const scale = keyboardScale(baseFreq);
  const mod1Ratio = clamp(mod1Params.ratio, 0.125, 16);
  const mod1Freq = baseFreq * mod1Ratio;
  const mod1Index = sliderToIndex(mod1Params.gain, MOD1_MAX_INDEX);
  const mod2Index = sliderToIndex(mod2Params.gain, MOD2_MAX_INDEX);

  return {
    keyboardScale: scale,
    mod1: {
      active: mod1Index > 0,
      ratio: mod1Ratio,
      waveform: normalizeWave(mod1Params.wave),
      effectiveIndex: mod1Index,
      effectiveDeviationHz:
        mod1Index * baseFreq * scale * waveCompensation(mod1Params.wave),
      waveformCompensation: waveCompensation(mod1Params.wave),
    },
    mod2: {
      active: mod1Index > 0 && mod2Index > 0,
      ratio: clamp(mod2Params.ratio, 0.125, 16),
      waveform: normalizeWave(mod2Params.wave),
      effectiveIndex: mod2Index,
      effectiveDeviationHz:
        mod2Index * mod1Freq * scale * waveCompensation(mod2Params.wave),
      waveformCompensation: waveCompensation(mod2Params.wave),
    },
  };
};
