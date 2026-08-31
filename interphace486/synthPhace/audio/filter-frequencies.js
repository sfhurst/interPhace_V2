// Filter frequency tables and helpers. No DSP or DOM access.

(function () {
const LP_FREQ_PRESETS = [
  60, 80, 100, 125, 160, 200, 250, 315, 400, 500,
  630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000,
  6300, 8000, 10000, 12500, 16000, 20000 // 25 = all through
];

const HP_FREQ_PRESETS = [
  20, 25, 31, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000, 6300 // 0 = all through
];

// ------------------------------------------------------------
//  EQ FREQUENCY TABLES (MUSICALLY ALIGNED - 88 NOTES + HARMONICS)
// ------------------------------------------------------------

// 88 piano keys: A0 (27.5Hz) to C8 (4186Hz)
// Plus important harmonics up to G9 (12543Hz)

// Low range: A0 to G#4 (27.5Hz - 415.3Hz) - 48 frequencies
const EQ_FREQ_LOW = [
  27.5, 29.14, 30.87, 32.7, 34.65, 36.71, 38.89, 41.2, 43.65, 46.25, 49, 51.91, 55, 58.27, 61.74,
  65.41, 69.3, 73.42, 77.78, 82.41, 87.31, 92.5, 98, 103.83, 110, 116.54, 123.47,
  130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185, 196, 207.65, 220, 233.08, 246.94,
  261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392, 415.3
];

// Mid range: C4 to B6 (261.63Hz - 1975.53Hz) - 36 frequencies
const EQ_FREQ_MID = [
  261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392, 415.3, 440, 466.16, 493.88,
  523.25, 554.37, 587.33, 622.25, 659.25, 698.46, 739.99, 783.99, 830.61, 880, 932.33, 987.77,
  1046.5, 1108.73, 1174.66, 1244.51, 1318.51, 1396.91, 1479.98, 1567.98, 1661.22, 1760, 1864.66, 1975.53
];

// High range: C7 to G9 (2093Hz - 12543.85Hz) - 32 frequencies
const EQ_FREQ_HIGH = [
  2093, 2217.46, 2349.32, 2489.02, 2637.02, 2793.83, 2959.96, 3135.96, 3322.44, 3520, 3729.31, 3951.07,
  4186.01, 4434.92, 4698.63, 4978.03, 5274.04, 5587.65, 5919.91, 6271.93, 6644.88, 7040, 7458.62, 7902.13,
  8372.02, 8869.84, 9397.27, 9956.06, 10548.08, 11175.3, 11839.82, 12543.85
];

// All range: selected musical frequencies from A0 to G9 (27.5Hz - 12543.85Hz) - 61 frequencies
const EQ_FREQ_ALL = [
  27.5, 32.7, 36.71, 41.2, 43.65, 49, 55, 61.74, 65.41, 73.42, 82.41, 87.31, 98,
  110, 123.47, 130.81, 146.83, 164.81, 174.61, 196, 220, 246.94, 261.63, 293.66, 329.63, 349.23,
  392, 440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.66, 1318.51,
  1396.91, 1567.98, 1760, 1975.53, 2093, 2349.32, 2637.02, 2793.83, 3135.96, 3520, 3951.07,
  4186.01, 4698.63, 5274.04, 5587.65, 6271.93, 7040, 7902.13, 8372.02, 9397.27, 10548.08, 11839.82, 12543.85
];

// Frequency range lookup
const EQ_FREQ_RANGES = {
  low: EQ_FREQ_LOW,
  mid: EQ_FREQ_MID,
  high: EQ_FREQ_HIGH,
  all: EQ_FREQ_ALL
};


  function validateAscending(name, values) {
    if (!Array.isArray(values) || values.length < 2) throw new Error(`${name} must contain at least two values`);
    for (let i = 1; i < values.length; i += 1) {
      if (!Number.isFinite(values[i]) || values[i] <= values[i - 1]) {
        throw new Error(`${name} must be strictly ascending at index ${i}`);
      }
    }
  }

  validateAscending("Low-pass frequencies", LP_FREQ_PRESETS);
  validateAscending("High-pass frequencies", HP_FREQ_PRESETS);

  window.FilterFrequencyData = Object.freeze({
    LP_FREQ_PRESETS: Object.freeze(LP_FREQ_PRESETS.slice()),
    HP_FREQ_PRESETS: Object.freeze(HP_FREQ_PRESETS.slice()),
    EQ_FREQ_RANGES: Object.freeze({
      low: Object.freeze(EQ_FREQ_LOW.slice()),
      mid: Object.freeze(EQ_FREQ_MID.slice()),
      high: Object.freeze(EQ_FREQ_HIGH.slice()),
      all: Object.freeze(EQ_FREQ_ALL.slice()),
    }),
  });
})();
