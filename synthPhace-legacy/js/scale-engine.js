// ============================================================
//  SCALE ENGINE
//  Shared tonal context for pitch-relative controls.
//  Harmonic sliders remain fixed at -36..+36 semitones and
//  snap to values allowed by the selected scale.
// ============================================================

window.ScaleEngine = (() => {
  const SCALES = Object.freeze([
    { id: "major", name: "Major", intervals: [0, 2, 4, 5, 7, 9, 11] },
    { id: "minor", name: "Minor", intervals: [0, 2, 3, 5, 7, 8, 10] },
    { id: "minorPentatonic", name: "Minor Pentatonic", intervals: [0, 3, 5, 7, 10] },
    { id: "majorPentatonic", name: "Major Pentatonic", intervals: [0, 2, 4, 7, 9] },
    { id: "dorian", name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] },
    { id: "hirajoshi", name: "Hirajoshi", intervals: [0, 2, 3, 7, 8] },
  ]);

  const byId = Object.freeze(Object.fromEntries(SCALES.map(scale => [scale.id, scale])));

  function getScale(id = window.patch?.scale) {
    return byId[id] || byId.major;
  }

  function isAllowedSemitone(semitone, id = window.patch?.scale) {
    const value = Math.trunc(Number(semitone) || 0);
    if (value < -36 || value > 36) return false;
    const pc = ((value % 12) + 12) % 12;
    return getScale(id).intervals.includes(pc);
  }

  function allowedSemitones(id = window.patch?.scale) {
    const values = [];
    for (let value = -36; value <= 36; value++) {
      if (isAllowedSemitone(value, id)) values.push(value);
    }
    return values;
  }

  function nearestAllowedSemitone(semitone, id = window.patch?.scale) {
    const target = Math.max(-36, Math.min(36, Math.trunc(Number(semitone) || 0)));
    const allowed = allowedSemitones(id);
    let best = allowed[0] ?? 0;
    let bestDistance = Infinity;

    for (const value of allowed) {
      const distance = Math.abs(value - target);
      if (
        distance < bestDistance ||
        (distance === bestDistance && Math.abs(value) < Math.abs(best))
      ) {
        bestDistance = distance;
        best = value;
      }
    }
    return best;
  }

  function snapSlider(id, dispatch = true) {
    const slider = document.getElementById(id);
    if (!slider) return;
    const snapped = nearestAllowedSemitone(slider.value);
    slider.value = String(snapped);
    if (dispatch) slider.dispatchEvent(new Event("input", { bubbles: true }));
    if (window.UI?.updateRangeFill) window.UI.updateRangeFill(slider);
  }

  function refreshHarmonics() {
    snapSlider("harmonic1Offset");
    snapSlider("harmonic2Offset");
  }

  function updateButtons() {
    document.querySelectorAll("[data-scale-id]").forEach(button => {
      const active = button.dataset.scaleId === getScale().id;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function setScale(id, options = {}) {
    const scale = getScale(id);
    window.patch.scale = scale.id;
    updateButtons();

    if (options.refreshHarmonics !== false) refreshHarmonics();

    requestAnimationFrame(() => {
      if (typeof window.refreshChordPresetBank === "function") {
        window.refreshChordPresetBank();
      } else if (typeof window.refreshChordPresetModifiedState === "function") {
        window.refreshChordPresetModifiedState();
      }
    });
    return scale;
  }

  function register(patch) {
    patch.scale = getScale(patch.scale).id;
  }

  function initUI(patch) {
    document.querySelectorAll("[data-scale-id]").forEach(button => {
      button.addEventListener("click", () => {
        setScale(button.dataset.scaleId);
        if (typeof window.saveSession === "function") window.saveSession();
      });
    });
    setScale(patch.scale || "major");
  }

  return Object.freeze({
    SCALES,
    getScale,
    isAllowedSemitone,
    allowedSemitones,
    nearestAllowedSemitone,
    register,
    initUI,
    setScale,
    refreshHarmonics,
  });
})();
