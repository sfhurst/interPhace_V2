// ============================================================
//  UTILITIES
// ============================================================

window.midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

window.midiToName = (m) => {
  const names = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  return names[m % 12] + (Math.floor(m / 12) - 1);
};

window.formatSeconds = (v) => Number(v).toFixed(3) + "s";


