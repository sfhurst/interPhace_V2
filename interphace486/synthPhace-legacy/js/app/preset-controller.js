// ============================================================
//  PATCH PRESET SYSTEM — COMPLETE SOUND/COMPOSITION SNAPSHOTS
// ============================================================

const PRESET_LIBRARY = window.InterPhaceData.PRESET_LIBRARY;

let loadedPitchPresetSnapshot = null;
let applyingPitchPreset = false;

function capturePitchPresetState() {
  const sliders = {};
  const setterSliders = new Set(["preset", "chordPreset", "fmRatioPreset", "filterPreset"]);
  document.querySelectorAll('input[type="range"]').forEach((slider) => {
    if (!slider.id || setterSliders.has(slider.id)) return;
    sliders[slider.id] = String(slider.value);
  });

  const buttons = {};
  document.querySelectorAll(".ui-selector-btn").forEach((button, index) => {
    // Render selections are workflow state, not part of a Patch Preset.
    if (button.dataset.renderContent) return;
    // EQ-band buttons only choose which EQ control pane is visible.
    if (button.dataset.eq) return;
    // Envelope preset buttons are convenience setters; exact AHDHD values are authoritative.
    if (button.dataset.env) return;
    const key = [
      button.id || "",
      button.dataset.scaleId || "",
      button.dataset.ratio || "",
      button.dataset.wave || "",
      button.dataset.env || "",
      button.dataset.rate || "",
      button.dataset.range || "",
      index,
    ].join(":");
    buttons[key] = button.classList.contains("active");
  });

  return JSON.stringify({ sliders, buttons });
}

function updatePitchPresetCustomState() {
  if (applyingPitchPreset || !loadedPitchPresetSnapshot) return;
  const presetName = document.getElementById("presetValue");
  if (!presetName) return;
  const isCustom = capturePitchPresetState() !== loadedPitchPresetSnapshot;
  presetName.classList.toggle("preset-modified", isCustom);
}

function rememberLoadedPitchPresetState() {
  loadedPitchPresetSnapshot = capturePitchPresetState();
  const presetName = document.getElementById("presetValue");
  if (presetName) presetName.classList.remove("preset-modified");
}

function applyPreset(presetIndex) {
  const selectedPreset = PRESET_LIBRARY[presetIndex];
  if (!selectedPreset?.data?.patch || !window.SessionManager) return;

  applyingPitchPreset = true;
  const presetSlider = document.getElementById("preset");
  const presetName = document.getElementById("presetValue");
  if (presetSlider) {
    presetSlider.value = String(presetIndex);
    UI.updateRangeFill(presetSlider);
  }
  if (presetName) {
    presetName.textContent = selectedPreset.name;
    presetName.classList.remove("preset-modified");
  }

  // Normalize against the current engine schema, then apply through the same
  // exact UI paths used by patch.json. preservePatchPreset prevents the
  // session loader from recursively moving this slider back to Init.
  const normalized = SessionManager.normalizeImportedPatch(selectedPreset.data.patch);
  SessionManager.applyPatchToUI(normalized, {}, { preservePatchPreset: true });

  UI.refreshRangeFills();
  window.refreshChordPresetModifiedState?.();
  applyingPitchPreset = false;
  rememberLoadedPitchPresetState();
  window.saveSession?.();
  console.log(`✅ Loaded complete patch preset: ${selectedPreset.name}`);
}

window.initPresetUI = function () {
  const presetSlider = document.getElementById("preset");
  if (presetSlider) {
    presetSlider.min = "0";
    presetSlider.max = String(Math.max(0, PRESET_LIBRARY.length - 1));
    presetSlider.step = "1";
  }

  UI.bindSlider("preset", "presetValue", (v) => {
    const presetIndex = Number(v);
    const preset = PRESET_LIBRARY[presetIndex];
    if (preset?.data?.patch) applyPreset(presetIndex);
    return preset ? preset.name : "Empty";
  });

  const queuePitchPresetCheck = (event) => {
    if (event.target?.id === "preset" || applyingPitchPreset) return;
    // Render controls do not make a Patch Preset custom.
    if (event.target?.closest?.('[data-selector-group^="render-"]')) return;
    requestAnimationFrame(updatePitchPresetCustomState);
  };
  document.addEventListener("input", queuePitchPresetCheck);
  document.addEventListener("change", queuePitchPresetCheck);
  document.addEventListener("click", queuePitchPresetCheck);
};
