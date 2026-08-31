// ============================================================
//  FILTER ENGINE (LP/HP + 3-BAND PARAMETRIC EQ)
// ============================================================

window.FilterEngine = {};

// ------------------------------------------------------------
//  FREQUENCY LOOKUP TABLES
// ------------------------------------------------------------

const { LP_FREQ_PRESETS, HP_FREQ_PRESETS, EQ_FREQ_RANGES } = window.FilterFrequencyData;

// ------------------------------------------------------------
//  REGISTER DEFAULTS
// ------------------------------------------------------------

FilterEngine.register = function (patch) {
  patch.filter = {
    preset: 0,
    lpFreq: 25,  // Index 25 = 20kHz (all through)
    hpFreq: 0,   // Index 0 = 20Hz (all through)
    
    eq1: { freq: 18, gain: 0, q: 1.0, range: 'low' },   // 82.41Hz (E2 - bass guitar low E)
    eq2: { freq: 9, gain: 0, q: 1.0, range: 'mid' },    // 440Hz (A4 - concert pitch)
    eq3: { freq: 12, gain: 0, q: 1.0, range: 'high' },  // 4186Hz (C8 - top of piano)
    
    activeEQ: 'eq1', // Track which EQ tab is active
  };
};

// ------------------------------------------------------------
//  APPLY FILTERS
// ------------------------------------------------------------

FilterEngine.apply = function (ctx, inputNode, filterParams) {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  let currentNode = inputNode;

  // Always remove inaudible DC/subsonic energy before musical filtering.
  const dcBlock = ctx.createBiquadFilter();
  dcBlock.type = "highpass";
  dcBlock.frequency.value = 12;
  dcBlock.Q.value = 0.5;
  currentNode.connect(dcBlock);
  currentNode = dcBlock;

  const hpIndex = Math.round(clamp(filterParams?.hpFreq, 0, HP_FREQ_PRESETS.length - 1));
  if (hpIndex > 0) {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = HP_FREQ_PRESETS[hpIndex];
    hp.Q.value = 0.55;
    currentNode.connect(hp);
    currentNode = hp;
  }

  const lpIndex = Math.round(clamp(filterParams?.lpFreq, 0, LP_FREQ_PRESETS.length - 1));
  if (lpIndex < LP_FREQ_PRESETS.length - 1) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = LP_FREQ_PRESETS[lpIndex];
    lp.Q.value = 0.55;
    currentNode.connect(lp);
    currentNode = lp;
  }

  function getFrequency(eqParams) {
    const range = EQ_FREQ_RANGES[eqParams?.range] || EQ_FREQ_RANGES.all;
    return range[Math.round(clamp(eqParams?.freq, 0, range.length - 1))] || 1000;
  }

  for (const eqParams of [filterParams?.eq1, filterParams?.eq2, filterParams?.eq3]) {
    if (!eqParams) continue;
    const gain = clamp(eqParams.gain, -9, 9);
    if (Math.abs(gain) < 0.1) continue;
    const eq = ctx.createBiquadFilter();
    eq.type = "peaking";
    eq.frequency.value = getFrequency(eqParams);
    eq.Q.value = clamp(eqParams.q, 0.3, 6);
    eq.gain.value = gain;
    currentNode.connect(eq);
    currentNode = eq;
  }

  return { node: currentNode };
};


// ------------------------------------------------------------
//  RESPONSE INSPECTION (AUDIT / DEBUG)
// ------------------------------------------------------------

FilterEngine.getCutFrequencies = function (filterParams) {
  const clampIndex = (value, length) => Math.max(0, Math.min(length - 1, Math.round(Number(value) || 0)));
  return {
    lowCutHz: HP_FREQ_PRESETS[clampIndex(filterParams?.hpFreq, HP_FREQ_PRESETS.length)],
    highCutHz: LP_FREQ_PRESETS[clampIndex(filterParams?.lpFreq, LP_FREQ_PRESETS.length)],
  };
};

FilterEngine.describe = function (filterParams) {
  const cuts = FilterEngine.getCutFrequencies(filterParams);
  return {
    ...cuts,
    hasOpenWindow: cuts.lowCutHz < cuts.highCutHz,
    routing: "dc-block -> low-cut(high-pass) -> high-cut(low-pass) -> eq1 -> eq2 -> eq3",
    slopePerCut: "12 dB/octave biquad",
  };
};
