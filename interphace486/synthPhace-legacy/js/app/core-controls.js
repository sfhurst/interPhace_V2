// ============================================================
//  UI → PATCH SYNC
// ============================================================

window.updateParamsFromHTML = () => {
  const rootNoteEl = document.getElementById("rootNote");
  if (rootNoteEl) patch.midiNote = Number(rootNoteEl.value);
};

// ============================================================
//  GLOBAL UI SECTIONS
// ============================================================

window.initAccordionUI = () => {
  const STORAGE_KEY = "interPhace.openSection";
  const panels = Array.from(document.querySelectorAll(".panel[data-section]"));
  if (!panels.length) return;

  const sectionName = (panel) => panel?.dataset.section || "";
  const findPanel = (name) =>
    panels.find((panel) => sectionName(panel) === name) || null;

  const saveOpenSection = (panel) => {
    try {
      if (panel) localStorage.setItem(STORAGE_KEY, sectionName(panel));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      // The accordion still works when storage is unavailable.
    }
  };

  const setPanelState = (panel, isOpen) => {
    const header = panel.querySelector(".panel-header");
    panel.classList.toggle("open", isOpen);
    if (header) header.setAttribute("aria-expanded", String(isOpen));
  };

  const scrollHeaderToTop = (panel) => {
    const header = panel.querySelector(".panel-header");
    if (!header) return;

    // Section navigation should be spatially deterministic: as soon as a
    // section opens, put its header at the top of the viewport. Do not use
    // smooth scrolling here; focus may otherwise arrive before the section
    // is actually visible.
    // The instrument header is sticky at the top of the viewport, so the
    // usable editing area begins immediately below it. Position the section
    // header at that boundary instead of at viewport y=0 (where it would be
    // hidden behind the branding / Audition bar).
    const stickyHeader = document.querySelector(".instrument-header");
    const stickyOffset = stickyHeader ? stickyHeader.getBoundingClientRect().height : 0;
    const targetTop =
      window.scrollY + header.getBoundingClientRect().top - stickyOffset;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "auto",
    });
  };

  const openOnly = (panel, { scroll = false, persist = true } = {}) => {
    panels.forEach((candidate) => {
      setPanelState(candidate, candidate === panel);
    });

    if (persist) saveOpenSection(panel);
    if (scroll && panel) {
      // Collapsing a section above the target changes document geometry.
      // Wait until the open/closed classes have been laid out, then anchor
      // the new section beneath the sticky instrument header.
      requestAnimationFrame(() => scrollHeaderToTop(panel));
    }
  };

  panels.forEach((panel) => {
    const header = panel.querySelector(".panel-header");
    if (!header) return;

    header.setAttribute("aria-expanded", "false");
    // Section headers remain mouse-clickable, but keyboard navigation moves
    // directly between the controls inside each section.
    header.tabIndex = -1;

    header.addEventListener("click", () => {
      const wasOpen = panel.classList.contains("open");

      if (wasOpen) {
        setPanelState(panel, false);
        saveOpenSection(null);
        return;
      }

      openOnly(panel, { scroll: true });
    });

    panel.addEventListener("focusin", (event) => {
      // Header activation is handled by its click/keyboard action. Controls
      // reached by Tab open their containing section automatically.
      if (event.target === header || panel.classList.contains("open")) return;
      openOnly(panel, { scroll: true });
    });
  });

  let savedSection = "";
  try {
    savedSection = localStorage.getItem(STORAGE_KEY) || "";
  } catch (_) {}

  const initialPanel =
    findPanel(savedSection) ||
    findPanel("pitch") ||
    panels[0];

  // Restore the saved section without moving the page on load.
  openOnly(initialPanel, { scroll: false, persist: false });

  const focusableSelector = [
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled]):not(.panel-header)',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const firstControl = (panel) => {
    if (!panel) return null;
    return Array.from(panel.querySelectorAll(focusableSelector)).find((el) => {
      return !el.hidden && el.getAttribute('aria-hidden') !== 'true';
    }) || null;
  };

  const jumpSection = (direction) => {
    const activePanel = document.activeElement?.closest?.('.panel[data-section]');
    const openPanel = panels.find((panel) => panel.classList.contains('open'));
    const currentPanel = activePanel || openPanel || initialPanel;
    const currentIndex = Math.max(0, panels.indexOf(currentPanel));
    const targetIndex = Math.max(0, Math.min(panels.length - 1, currentIndex + direction));
    const targetPanel = panels[targetIndex];
    if (!targetPanel) return;

    openOnly(targetPanel, { scroll: true });
    const control = firstControl(targetPanel);
    if (control) {
      requestAnimationFrame(() => control.focus({ preventScroll: true }));
    }
  };

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'PageDown' && event.key !== 'PageUp') return;

    event.preventDefault();
    jumpSection(event.key === 'PageDown' ? 1 : -1);
  });
};



// ============================================================
//  CARRIER UI
// ============================================================

window.initCarrierUI = function () {
  const root = document.getElementById("rootNote");
  const valueSpan = document.getElementById("rootNoteValue");
  if (!root) return;

  const update = () => {
    patch.midiNote = Number(root.value);
    if (valueSpan) {
      valueSpan.textContent = `${midiToName(patch.midiNote)} (${patch.midiNote})`;
    }
  };

  root.addEventListener("input", update);
  update();
};

// ============================================================
//  TEMPO UI
// ============================================================

window.initTempoUI = function () {
  const tempo = document.getElementById("tempo");
  const valueSpan = document.getElementById("tempoValue");
  if (!tempo) return;

  const update = () => {
    patch.tempo = Number(tempo.value);
    if (valueSpan) {
      valueSpan.textContent = patch.tempo + " BPM";
    }
  };

  tempo.addEventListener("input", update);
  update();
};

// ============================================================
//  CARRIER VOLUME UI
// ============================================================

window.initCarrierVolumeUI = function () {
  UI.bindSlider("carrierVolume", "carrierVolumeValue", (v) => {
    patch.synth.fm.carrierVolume = Number(v);
    return Math.round(v);
  });
};

// ============================================================
//  HARMONICS UI
// ============================================================

// Chord preset libraries are scale-specific.
const CHORD_PRESET_BANKS = window.InterPhaceData.CHORD_PRESET_BANKS;
let loadedChordPresetSnapshot = null;
let applyingChordPreset = false;

function currentChordBank() {
  return CHORD_PRESET_BANKS?.[patch.scale] || CHORD_PRESET_BANKS.major || [];
}

function captureChordPresetState() {
  const fm = patch.synth.fm;
  return JSON.stringify({
    h1Gain: Number(fm.harmonic1.gain),
    h1Offset: Number(fm.harmonic1.noteOffset),
    h2Gain: Number(fm.harmonic2.gain),
    h2Offset: Number(fm.harmonic2.noteOffset),
  });
}

function presetMatchesState(preset) {
  if (!preset) return false;
  const fm = patch.synth.fm;
  return Number(fm.harmonic1.gain) === Number(preset.h1Gain) &&
    Number(fm.harmonic1.noteOffset) === Number(preset.h1Offset) &&
    Number(fm.harmonic2.gain) === Number(preset.h2Gain) &&
    Number(fm.harmonic2.noteOffset) === Number(preset.h2Offset);
}

function findMatchingChordPreset() {
  return currentChordBank().findIndex(presetMatchesState);
}

function rememberChordPresetState() {
  loadedChordPresetSnapshot = captureChordPresetState();
  document.getElementById("chordPresetValue")?.classList.remove("preset-modified");
}

function updateChordSliderForBank() {
  const slider = document.getElementById("chordPreset");
  const label = document.getElementById("chordPresetValue");
  const bank = currentChordBank();
  if (!slider || !bank.length) return;
  slider.min = "0";
  slider.max = String(bank.length - 1);
  slider.step = "1";

  const exact = findMatchingChordPreset();
  if (exact >= 0) {
    slider.value = String(exact);
    if (label) {
      label.textContent = bank[exact].name;
      label.classList.remove("preset-modified");
    }
    loadedChordPresetSnapshot = captureChordPresetState();
  } else {
    const index = Math.max(0, Math.min(bank.length - 1, Number(slider.value) || 0));
    slider.value = String(index);
    if (label) {
      label.textContent = bank[index]?.name || "Init";
      label.classList.add("preset-modified");
    }
  }
  if (window.UI?.updateRangeFill) window.UI.updateRangeFill(slider);
}

function updateChordPresetModifiedState() {
  if (applyingChordPreset) return;
  const slider = document.getElementById("chordPreset");
  const label = document.getElementById("chordPresetValue");
  const bank = currentChordBank();
  if (!slider || !label || !bank.length) return;

  const exact = findMatchingChordPreset();
  if (exact >= 0) {
    slider.value = String(exact);
    label.textContent = bank[exact].name;
    label.classList.remove("preset-modified");
    loadedChordPresetSnapshot = captureChordPresetState();
    if (window.UI?.updateRangeFill) window.UI.updateRangeFill(slider);
    return;
  }
  const index = Math.max(0, Math.min(bank.length - 1, Number(slider.value) || 0));
  label.textContent = bank[index]?.name || "Init";
  label.classList.add("preset-modified");
}

function setHarmonicSlider(id, value) {
  const slider = document.getElementById(id);
  if (!slider) return;
  slider.value = value;
  slider.dispatchEvent(new Event("input", { bubbles: true }));
}

function applyChordPreset(index) {
  const bank = currentChordBank();
  const preset = bank[index];
  if (!preset) return;
  applyingChordPreset = true;
  const slider = document.getElementById("chordPreset");
  const label = document.getElementById("chordPresetValue");
  if (slider) {
    slider.min = "0";
    slider.max = String(bank.length - 1);
    slider.value = String(index);
    UI.updateRangeFill(slider);
  }
  if (label) label.textContent = preset.name;
  setHarmonicSlider("harmonic1Gain", preset.h1Gain);
  setHarmonicSlider("harmonic1Offset", preset.h1Offset);
  setHarmonicSlider("harmonic2Gain", preset.h2Gain);
  setHarmonicSlider("harmonic2Offset", preset.h2Offset);
  applyingChordPreset = false;
  rememberChordPresetState();
}

window.refreshChordPresetModifiedState = updateChordPresetModifiedState;
window.refreshChordPresetBank = updateChordSliderForBank;

window.initHarmonicsUI = function () {
  // Harmonic 1
  UI.bindSlider("harmonic1Gain", "harmonic1GainValue", (v) => {
    patch.synth.fm.harmonic1.gain = Number(v);
    return Math.round(v) + "%";
  });

  UI.bindSlider("harmonic1Offset", "harmonic1OffsetValue", (v) => {
    const snapped = window.ScaleEngine
      ? window.ScaleEngine.nearestAllowedSemitone(v)
      : Number(v);
    const slider = document.getElementById("harmonic1Offset");
    if (slider && Number(slider.value) !== snapped) slider.value = String(snapped);
    patch.synth.fm.harmonic1.noteOffset = snapped;
    return (snapped > 0 ? "+" : "") + snapped + " ST";
  });

  // Harmonic 2
  UI.bindSlider("harmonic2Gain", "harmonic2GainValue", (v) => {
    patch.synth.fm.harmonic2.gain = Number(v);
    return Math.round(v) + "%";
  });

  UI.bindSlider("harmonic2Offset", "harmonic2OffsetValue", (v) => {
    const snapped = window.ScaleEngine
      ? window.ScaleEngine.nearestAllowedSemitone(v)
      : Number(v);
    const slider = document.getElementById("harmonic2Offset");
    if (slider && Number(slider.value) !== snapped) slider.value = String(snapped);
    patch.synth.fm.harmonic2.noteOffset = snapped;
    return (snapped > 0 ? "+" : "") + snapped + " ST";
  });

  const chordSlider = document.getElementById("chordPreset");
  if (chordSlider) {
    chordSlider.min = "0";
    chordSlider.max = String(Math.max(0, currentChordBank().length - 1));
    chordSlider.step = "1";
    chordSlider.addEventListener("input", () => {
      applyChordPreset(Number(chordSlider.value));
    });
  }

  ["harmonic1Gain", "harmonic1Offset", "harmonic2Gain", "harmonic2Offset"]
    .forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => {
        requestAnimationFrame(updateChordPresetModifiedState);
      });
    });

  const initialIndex = Math.max(
    0,
    Math.min(currentChordBank().length - 1, Number(chordSlider?.value || 0)),
  );
  applyChordPreset(initialIndex);
};
