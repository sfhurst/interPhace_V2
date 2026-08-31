// ============================================================
//  SHARED AUDIO MATH
// ============================================================
window.AudioMath = Object.freeze({
  finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  },

  clamp(value, minimum, maximum) {
    const number = Number(value);
    const safe = Number.isFinite(number) ? number : minimum;
    return Math.min(maximum, Math.max(minimum, safe));
  },

  lerp(a, b, amount) {
    return a + (b - a) * amount;
  },

  smoothstep(value) {
    const x = Math.min(1, Math.max(0, Number(value) || 0));
    return x * x * (3 - 2 * x);
  },
});
