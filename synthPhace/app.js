(() => {
  "use strict";

  const DATA = window.SynthPhaceControlData;
  if (!DATA) throw new Error("synthPhace control data missing");

  const STORAGE_KEY = "interPhace.synthPhace.ui.v3";
  const OLD_STORAGE_KEYS = ["interPhace.synthPhace.ui.v2", "interPhace.synthPhace.ui.v1"];
  const shell = document.getElementById("shell");
  const pages = Array.from(document.querySelectorAll(".synth-page"));
  const buttons = [1, 2, 3, 4, 5].map((number) => document.getElementById(`shellB${number}`));
  const backgroundAutoGroups = [];

  const b1Names = ["Carrier / Harmonics", "FM", "Texture / Transient"];
  const PRETTY_PRESETS = Object.freeze([
    { name: "Still", balance: 50, strike: 12, bloom: 45, damp: 35, color: 14, resonance: 14, blend: 55 },
    { name: "Keys", balance: 58, strike: 48, bloom: 18, damp: 52, color: 42, resonance: 8, blend: 70 },
    { name: "Bloom", balance: 68, strike: 8, bloom: 82, damp: 18, color: 30, resonance: 18, blend: 68 },
    { name: "Drift", balance: 46, strike: 4, bloom: 36, damp: 50, color: 20, resonance: 72, blend: 62 },
  ]);

  function selectedEngineMode() {
    try {
      return JSON.parse(localStorage.getItem("interPhace.interPhace.ui.v2") || "null")?.child?.synthEngine === "pretty" ? "pretty" : "fm";
    } catch (_) { return "fm"; }
  }

  function setSelectedEngineMode(mode) {
    const safe = mode === "pretty" ? "pretty" : "fm";
    try {
      const key = "interPhace.interPhace.ui.v2";
      const saved = JSON.parse(localStorage.getItem(key) || "null") || {};
      saved.child = { ...(saved.child || {}), synthEngine: safe };
      localStorage.setItem(key, JSON.stringify(saved));
    } catch (_) {}
  }
  const b2Names = ["Effects Presets", "Effects Amount"];
  const b3Names = ["High Cut / Low Cut", "EQ 1", "EQ 2", "EQ 3"];
  const b4Names = ["Envelope", "Behavior / Character", "Drawn Envelope"];

  const scaleById = Object.fromEntries(DATA.scales.map((scale) => [scale.id, scale]));
  const eqPageMap = {
    app2_b3_p2: "eq1",
    app2_b3_p3: "eq2",
    app2_b3_p4: "eq3",
  };

  let state = {
    button: 1,
    b1Page: 1,
    b2Page: 1,
    b3Page: 1,
    b4Page: 1,
    values: {},
    eqRanges: { eq1: "low", eq2: "mid", eq3: "high" },
  };

  let hadCurrentSavedState = false;
  let requiresBuild501NavigationMigration = false;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      hadCurrentSavedState = true;
      // B4 acquired page state in Build 501. Its absence identifies the old
      // four-page B1 layout without re-migrating current B1 P3 Texture.
      requiresBuild501NavigationMigration = !Object.hasOwn(saved, "b4Page");
      state = {
        ...state,
        ...saved,
        values: { ...state.values, ...(saved.values || {}) },
        eqRanges: { ...state.eqRanges, ...(saved.eqRanges || {}) },
      };
    } else {
      // Preserve only navigation when migrating from placeholder-control builds.
      for (const key of OLD_STORAGE_KEYS) {
        const old = JSON.parse(localStorage.getItem(key) || "null");
        if (!old || typeof old !== "object") continue;
        state.button = Number(old.button) || 1;
        state.b1Page = Number(old.b1Page) || 1;
        state.b2Page = Number(old.b2Page) || 1;
        state.b3Page = Number(old.b3Page) || 1;
        state.b4Page = Number(old.b4Page) || 1;
        requiresBuild501NavigationMigration = true;
        break;
      }
    }
  } catch (_) {}

  // Build 510 retunes the initial Pretty voice. Carry the old factory values
  // forward only when they are still an untouched factory set; user edits stay
  // exactly as they were.
  const oldPrettyFactory = { prettyBalance: 50, prettyStrike: 20, prettyBloom: 45, prettyDamp: 35, prettyColor: 42, prettyResonance: 28, prettyBlend: 70 };
  const newPrettyFactory = { prettyBalance: 50, prettyStrike: 12, prettyBloom: 45, prettyDamp: 35, prettyColor: 14, prettyResonance: 14, prettyBlend: 55 };
  if (state.prettyTuningVersion !== 2 && Object.entries(oldPrettyFactory).every(([name, value]) => Number(state.values[name]) === value)) {
    Object.assign(state.values, newPrettyFactory);
  }
  state.prettyTuningVersion = 2;

  if (!Number.isInteger(state.button) || state.button < 1 || state.button > 4) state.button = 1;

  // Build 501 moves the old B1 pages without changing any control IDs or sound state.
  // Preserve the closest matching destination for saved navigation from prior builds.
  if (requiresBuild501NavigationMigration) {
    const savedB1Page = Number(state.b1Page) || 1;
    if (savedB1Page === 4) state.b1Page = 3;
    if (savedB1Page === 3) {
      state.b1Page = 1;
      if (state.button === 1) {
        state.button = 4;
        state.b4Page = 2;
      }
    }
  }

  state.b1Page = Math.max(1, Math.min(b1Names.length, Number(state.b1Page) || 1));
  state.b2Page = Math.max(1, Math.min(2, Number(state.b2Page) || 1));
  state.b3Page = Math.max(1, Math.min(4, Number(state.b3Page) || 1));
  state.b4Page = Math.max(1, Math.min(b4Names.length, Number(state.b4Page) || 1));

  // Audition loop cycles re-read the live synth UI state before each offline render.
  window.SynthPhaceUIState = state;

  const shellBinding = InterPhaceShell.bind({
    app: "#shell",
    name: "synthPhace",
    accent: getComputedStyle(document.documentElement).getPropertyValue("--synth").trim() || "#00aaff",
    line: getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#2a2d33",
    text: getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#f0f1f3",
    muted: getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "#777d87",
    getAuditionState: () =>
      window.SynthPhaceAuditionEngine?.getAuditionState?.() ||
      (window.SynthPhaceAuditionEngine?.isPlaying?.() ? "playing" : "idle"),
    auditionDisabled: false,
    canSnapshot: () => window.InterPhaceShell?.snapshots?.hasOpenSlot("synthPhace"),
    onSnapshot: () => window.InterPhaceShell?.snapshots?.save("synthPhace", {
      ui: JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"),
      patch: JSON.parse(localStorage.getItem("interPhace.synthPhace.patch.v1") || "null"),
    }),
  });

  shellBinding.auditionBtn?.addEventListener("click", async () => {
    try {
      window.SynthPhacePatchAdapter?.captureAndSave(state);
      await window.SynthPhaceAuditionEngine?.toggle();
      shellBinding.syncPlaying?.();
    } catch (error) {
      console.error("synthPhace audition failed:", error);
    }
  });

  window.addEventListener("beforeunload", () => {
    window.SynthPhaceAuditionEngine?.stop();
  }, { once: true });

  window.addEventListener("pagehide", () => {
    window.SynthPhaceAuditionEngine?.stop();
  });

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.SynthPhacePatchAdapter?.captureAndSave(state);
  }

  function currentProjectScaleId() {
    return window.SynthPhacePatchAdapter?.readProjectContext().scaleId || "major";
  }

  function activePageId() {
    if (state.button === 1 && state.b1Page === 1 && selectedEngineMode() === "pretty") return "app2_b1_p1_pretty";
    if (state.button === 1 && state.b1Page === 2) return selectedEngineMode() === "pretty" ? "app2_b1_p2_pretty" : "app2_b1_p2";
    if (state.button === 1) return `app2_b1_p${state.b1Page}`;
    if (state.button === 2) return `app2_b2_p${state.b2Page}`;
    if (state.button === 3) return `app2_b3_p${state.b3Page}`;
    return selectedEngineMode() === "pretty" ? "app2_b4_p1_pretty" : `app2_b4_p${state.b4Page}`;
  }

  function syncButtonPage(buttonNumber, pageNumber, names) {
    const button = document.getElementById(`shellB${buttonNumber}`);
    if (!button) return;
    const num = button.querySelector(".num");
    if (num) num.textContent = String(pageNumber);
    const name = names[pageNumber - 1];
    if (name) {
      button.setAttribute("aria-label", name);
      button.setAttribute("title", name);
    }
  }

  function render() {
    const activeId = activePageId();
    pages.forEach((page) => page.classList.toggle("hidden", page.id !== activeId));
    buttons.forEach((button, index) => {
      if (!button) return;
      button.classList.toggle("active", index + 1 === state.button && index + 1 <= 4);
    });
    shell.dataset.page = activeId;
    shell.dataset.context = "synth";
    const currentB1Names = selectedEngineMode() === "pretty" ? ["Pretty Voice", "Pretty Tone", "Texture / Transient"] : b1Names;
    syncButtonPage(1, state.b1Page, currentB1Names);
    syncButtonPage(2, state.b2Page, b2Names);
    syncButtonPage(3, state.b3Page, b3Names);
    syncButtonPage(4, selectedEngineMode() === "pretty" ? 1 : state.b4Page, selectedEngineMode() === "pretty" ? ["Pretty Contour"] : b4Names);
    backgroundAutoGroups.forEach((group) => group?.schedule?.());
    save();
  }

  const generateExcludedNames = new Set([
    // Group presets drive other sliders and must never be fired by Generate.
    "chordPreset",
    "patchPreset",
    "ratioPreset",
    "envelopePreset",
  ]);

  function randomSliderValue(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const step = Number(input.step || 1);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return Number(input.value);

    const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
    const slots = Math.max(0, Math.round((max - min) / safeStep));
    const slot = Math.floor(Math.random() * (slots + 1));
    const value = min + (slot * safeStep);
    const decimals = (String(safeStep).split(".")[1] || "").length;
    return Number(value.toFixed(Math.min(8, decimals)));
  }

  function generateCurrentPage() {
    const page = document.getElementById(activePageId());
    if (!page) return;

    const inputs = Array.from(page.querySelectorAll('.macroControl input[type="range"]'))
      .filter((input) => !generateExcludedNames.has(input.dataset.name));

    inputs.forEach((input) => {
      input.value = String(randomSliderValue(input));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    save();
  }

  buttons.forEach((button, index) => {
    if (!button) return;
    const buttonNumber = index + 1;
    button.addEventListener("click", () => {
      if (buttonNumber === 5) {
        generateCurrentPage();
        return;
      }
      if (buttonNumber === 1) {
        if (state.button === 1) state.b1Page = (state.b1Page % b1Names.length) + 1;
        state.button = 1;
      } else if (buttonNumber === 2) {
        if (state.button === 2) state.b2Page = (state.b2Page % b2Names.length) + 1;
        state.button = 2;
      } else if (buttonNumber === 3) {
        if (state.button === 3) state.b3Page = (state.b3Page % b3Names.length) + 1;
        state.button = 3;
      } else if (buttonNumber === 4) {
        if (selectedEngineMode() !== "pretty" && state.button === 4) state.b4Page = (state.b4Page % b4Names.length) + 1;
        state.button = 4;
      }
      render();
    });
  });

  function setSliderVisual(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value);
    const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty("--value", `${Math.max(0, Math.min(100, percent))}%`);
  }

  function setValueText(input, text) {
    const valueEl = document.getElementById(`${input.id}_value`);
    if (valueEl) valueEl.textContent = text;
  }

  function trimNumber(value, digits = 3) {
    const rounded = Number(Number(value).toFixed(digits));
    return String(rounded);
  }

  function formatSeconds(seconds) {
    const n = Number(seconds) || 0;
    return `${n.toFixed(3)}s`;
  }

  function formatFrequency(value) {
    const hz = Number(value) || 0;
    if (hz >= 1000) return `${trimNumber(hz / 1000, hz >= 10000 ? 1 : 2)}kHz`;
    if (hz >= 100) return `${Math.round(hz)}Hz`;
    return `${trimNumber(hz, 2)}Hz`;
  }

  function freqToNoteName(freq) {
    const A4 = 440;
    const C0 = A4 * Math.pow(2, -4.75);
    const halfStepsFromC0 = Math.round(12 * Math.log2(freq / C0));
    const octave = Math.floor(halfStepsFromC0 / 12);
    const noteIndex = ((halfStepsFromC0 % 12) + 12) % 12;
    const noteNames = [
      "C", "C#", "D", "D#", "E", "F",
      "F#", "G", "G#", "A", "A#", "B",
    ];
    return noteNames[noteIndex] + octave;
  }

  function formatEqFrequency(freq) {
    const hz = Number(freq) || 0;
    const freqText = hz >= 1000
      ? `${(hz / 1000).toFixed(1)}kHz`
      : `${Math.round(hz)}Hz`;
    return `${freqText} (${freqToNoteName(hz)})`;
  }

  function ratioIndexForExact(value) {
    const numeric = Number(value);
    return DATA.fmRatioValues.findIndex((candidate) =>
      Math.abs(Number(candidate) - numeric) < 1e-9
    );
  }

  function currentMultiplier() {
    return Number(document.getElementById("app2_b4_p1_timeMultiplier")?.value || 1);
  }

  function frequencyArrayFor(input) {
    const eq = Object.entries(eqPageMap).find(([pageId]) => input.id.startsWith(pageId))?.[1];
    return eq ? DATA.filters.EQ_FREQ_RANGES[state.eqRanges[eq] || "all"] : null;
  }

  function formatterFor(input) {
    const name = input.dataset.name;
    switch (name) {
      case "carrierVolume": return (v) => String(Math.round(v));
      case "harmony1Volume":
      case "harmony2Volume":
      case "harmonics":
      case "mod1Amount":
      case "mod2Amount": return (v) => `${Math.round(v)}%`;
      case "harmony1Offset":
      case "harmony2Offset": return (v) => `${v > 0 ? "+" : ""}${Math.round(v)} ST`;
      case "chordPreset": return (v) => {
        const bank = currentChordBank();
        return bank[Number(v)]?.name || "Init";
      };
      case "mod1Shape": return (v) => DATA.fmDepthNames[v] ?? String(v);
      case "mod1Ratio":
      case "mod2Ratio": return (v) => trimNumber(DATA.fmRatioValues[v] ?? v, 3);
      case "mod1Wave":
      case "mod2Wave": return (v) => DATA.fmWaves[v] ?? String(v);
      case "ratioPreset": return (v) => DATA.fmRatioPresets[Number(v)]?.name || "Init";
      case "instrumentBehavior": return (v) => DATA.instrumentBehaviors[v] ?? "Off";
      case "instrumentCharacter": return (v) => DATA.instrumentCharacters[v] ?? "Off";
      case "highCut": return (v) => formatFrequency(DATA.filters.LP_FREQ_PRESETS[v] ?? 20000);
      case "lowCut": return (v) => formatFrequency(DATA.filters.HP_FREQ_PRESETS[v] ?? 20);
      case "eq1Freq":
      case "eq2Freq":
      case "eq3Freq": return (v) => {
        const bank = frequencyArrayFor(input) || [];
        return formatEqFrequency(bank[v] ?? bank[0] ?? 0);
      };
      case "eq1Gain":
      case "eq2Gain":
      case "eq3Gain": return (v) => `${v > 0 ? "+" : ""}${trimNumber(v, 1)}dB`;
      case "eq1Q":
      case "eq2Q":
      case "eq3Q": return (v) => trimNumber(v, 1);
      case "attack":
      case "hold1":
      case "decay1":
      case "hold2":
      case "decay2": return (v) => formatSeconds(v * currentMultiplier());
      case "drawnEnvelopeLength": return (v) => `${trimNumber(v, 2)}s`;
      case "decayPercent": return (v) => `${Math.round(v)}%`;
      case "timeMultiplier": return (v) => `${trimNumber(v, 2)}×`;
      case "envelopePreset": return (v) => {
        const name = DATA.envelopePresetOrder[v] || "init";
        return name[0].toUpperCase() + name.slice(1);
      };
      case "patchPreset": return (v) => window.InterPhaceData?.PRESET_LIBRARY?.[v]?.name ?? (v === 0 ? "Init" : String(v));
      case "texturePreset": return (v) => DATA.texturePresets[v] ?? "Off";
      case "textureAmount": return (v) => `${Math.round(v)}%`;
      case "transientPreset": return (v) => DATA.transientPresets[v] ?? "Off";
      case "transientVolume": return (v) => `${Math.round(v)}%`;
      case "bitCrushPreset": return (v) => DATA.bitCrushPresets[v] ?? "Off";
      case "saturationPreset": return (v) => DATA.saturationPresets[v] ?? "Off";
      case "bitCrushPresetWet": case "saturationPresetWet": case "widthPresetWet": case "detunePresetWet": case "chorusPresetWet": case "delayPresetWet": case "reverbPresetWet": return (v) => `${Math.round(v)}%`;
      case "widthPreset": return (v) => DATA.effects.width[v] ?? String(v);
      case "detunePreset": return (v) => DATA.effects.detune[v] ?? String(v);
      case "chorusPreset": return (v) => DATA.effects.chorus[v] ?? String(v);
      case "delayPreset": return (v) => DATA.effects.delay[v] ?? String(v);
      case "reverbPreset": return (v) => DATA.effects.reverb[v] ?? String(v);
      case "convolutionPreset": return (v) => (['Off','Piano Body','Rhodes Body','Wood Box','Large Wood Box','Metal Box','Glass','Small Speaker','Radio','Telephone','Bass Cabinet','Vintage Cabinet','Drum Shell','Mallet Body','Small Room','Dark Room','Bright Room','Concrete','Stairwell','Tunnel','Short Plate','Long Plate','Spring','Air Chamber','Dark Chamber','Stone Chamber','Cathedral','Ghost Chamber','Abyss'])[Math.round(v)] ?? String(Math.round(v));
      case "convolutionWet": return (v) => `${Math.round(v)}%`;
      case "prettyVoice": return (v) => ["Round", "Hollow", "Bell", "Mallet", "Key"][Math.round(v)] || "Round";
      case "prettyBalance": case "prettyStrike": case "prettyBloom": case "prettyDamp":
      case "prettyColor": case "prettyResonance": case "prettyBlend": case "prettyBody":
      case "prettyHarmonics": case "prettySpread": case "prettyLevel": case "prettyAttack":
      case "prettyBodyDecay": case "prettyOvertoneDecay": case "prettyEnvelopeDamp": case "prettyRelease": return (v) => `${Math.round(v)}%`;
      case "prettyPreset": return (v) => PRETTY_PRESETS[Math.round(v)]?.name || "Still";
      default: return (v) => String(v);
    }
  }

  function refreshInputDisplay(input) {
    const numeric = Number(input.value);
    setValueText(input, formatterFor(input)(numeric));
    setSliderVisual(input);
  }

  function bindRange(input) {
    if (!input) return;
    const name = input.dataset.name;
    if (name && Object.prototype.hasOwnProperty.call(state.values, name)) {
      const value = Number(state.values[name]);
      if (Number.isFinite(value)) input.value = String(value);
    }

    const sync = () => {
      const numericValue = Number(input.value);
      if (name) state.values[name] = numericValue;
      refreshInputDisplay(input);
      save();
    };

    input.addEventListener("input", sync);
    sync();
  }


  // Canonical synth patch harmonies are authored as Major-scale degrees.
  // Each row explicitly defines the corresponding degree in every supported project scale.
  const PATCH_HARMONY_SCALE_TABLE = Object.freeze({
    major:           Object.freeze([0, 2, 4, 5, 7, 9, 11]),
    minor:           Object.freeze([0, 2, 3, 5, 7, 8, 10]),
    dorian:          Object.freeze([0, 2, 3, 5, 7, 9, 10]),
    majorPentatonic: Object.freeze([0, 2, 4, 7, 9, 12, 14]),
    minorPentatonic: Object.freeze([0, 3, 5, 7, 10, 12, 15]),
    hirajoshi:       Object.freeze([0, 2, 3, 7, 8, 12, 14]),
  });
  const CANONICAL_MAJOR_DEGREES = Object.freeze([0, 2, 4, 5, 7, 9, 11]);

  function canonicalMajorHarmonyPosition(offset) {
    const value = Number(offset);
    if (!Number.isInteger(value) || value < -36 || value > 36) return null;
    const octave = Math.floor(value / 12);
    const pitchClass = ((value % 12) + 12) % 12;
    const degree = CANONICAL_MAJOR_DEGREES.indexOf(pitchClass);
    if (degree < 0) return null;
    return { degree, octave };
  }

  function patchHarmonyForScale(canonicalMajorOffset, scaleId = currentProjectScaleId()) {
    const position = canonicalMajorHarmonyPosition(canonicalMajorOffset);
    if (!position) {
      throw new Error(`Patch harmony ${canonicalMajorOffset} is not a canonical Major-scale position.`);
    }
    const table = PATCH_HARMONY_SCALE_TABLE[scaleId];
    if (!table) throw new Error(`No explicit patch harmony table for scale "${scaleId}".`);
    return Number(table[position.degree]) + (12 * position.octave);
  }

  function projectNormalizedPatch(patch) {
    if (!patch) return patch;
    const clone = structuredClone(patch);
    const fm = clone.synth?.fm;
    if (fm?.harmonic1) fm.harmonic1.noteOffset = patchHarmonyForScale(fm.harmonic1.noteOffset);
    if (fm?.harmonic2) fm.harmonic2.noteOffset = patchHarmonyForScale(fm.harmonic2.noteOffset);
    return clone;
  }

  function nearestAllowedSemitone(value) {
    const scale = scaleById[currentProjectScaleId()] || scaleById.major;
    const target = Math.max(-36, Math.min(36, Math.trunc(Number(value) || 0)));
    let best = 0;
    let distance = Infinity;
    for (let candidate = -36; candidate <= 36; candidate += 1) {
      const pc = ((candidate % 12) + 12) % 12;
      if (!scale.intervals.includes(pc)) continue;
      const d = Math.abs(candidate - target);
      if (d < distance || (d === distance && Math.abs(candidate) < Math.abs(best))) {
        best = candidate;
        distance = d;
      }
    }
    return best;
  }


  function setPresetIndicator(slider, index, label, modified) {
    if (!slider) return;
    slider.value = String(index);
    if (slider.dataset.name) state.values[slider.dataset.name] = Number(index);
    setValueText(slider, label);
    setSliderVisual(slider);
    document.getElementById(`${slider.id}_value`)?.classList.toggle("preset-modified", !!modified);
  }

  function currentChordBank() {
    return DATA.chordBanks[currentProjectScaleId()] || DATA.chordBanks.major;
  }

  function harmonicState() {
    return {
      h1Gain: Number(document.getElementById("app2_b1_p1_harmony1Volume")?.value || 0),
      h1Offset: Number(document.getElementById("app2_b1_p1_harmony1Offset")?.value || 0),
      h2Gain: Number(document.getElementById("app2_b1_p1_harmony2Volume")?.value || 0),
      h2Offset: Number(document.getElementById("app2_b1_p1_harmony2Offset")?.value || 0),
    };
  }

  function chordPresetMatch() {
    const current = harmonicState();
    return currentChordBank().findIndex((preset) =>
      Number(preset.h1Gain) === current.h1Gain &&
      Number(preset.h1Offset) === current.h1Offset &&
      Number(preset.h2Gain) === current.h2Gain &&
      Number(preset.h2Offset) === current.h2Offset
    );
  }

  let applyingChord = false;
  let loadedChordPresetIndex = Number(state.values.chordPreset ?? 0);

  function syncChordPreset() {
    const slider = document.getElementById("app2_b1_p1_chordPreset");
    if (!slider) return;
    const bank = currentChordBank();
    slider.max = String(Math.max(0, bank.length - 1));
    const match = chordPresetMatch();
    if (match >= 0) loadedChordPresetIndex = match;
    loadedChordPresetIndex = Math.max(0, Math.min(bank.length - 1, Number(loadedChordPresetIndex) || 0));
    setPresetIndicator(
      slider,
      loadedChordPresetIndex,
      bank[loadedChordPresetIndex]?.name || "Init",
      match < 0,
    );
  }

  function dispatchSlider(id, value) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyChordPreset(index) {
    loadedChordPresetIndex = Number(index) || 0;
    const preset = currentChordBank()[loadedChordPresetIndex];
    if (!preset) return;
    applyingChord = true;
    dispatchSlider("app2_b1_p1_harmony1Volume", preset.h1Gain);
    dispatchSlider("app2_b1_p1_harmony1Offset", preset.h1Offset);
    dispatchSlider("app2_b1_p1_harmony2Volume", preset.h2Gain);
    dispatchSlider("app2_b1_p1_harmony2Offset", preset.h2Offset);
    applyingChord = false;
    syncChordPreset();
    save();
  }

  let applyingPatchPreset = false;

  

  function waveIndexForExact(value) {
    const waves = ["sine", "square", "saw"];
    return waves.indexOf(String(value));
  }


  let loadedPatchPresetIndex = Number(state.values.patchPreset ?? 0);

  function patchMatchShape(patch) {
    if (!patch) return null;
    const fm = patch.synth?.fm || {};
    const env = patch.envelope?.ahdhd || {};
    const filter = patch.filter || {};
    const eq = (v = {}, fallback) => [v.range || fallback, Number(v.freq || 0), Number(v.gain || 0), Number(v.q ?? 1)];
    return {
      fm:[
        Number(fm.carrierVolume ?? 100),
        Number(fm.harmonic1?.gain || 0), Number(fm.harmonic1?.noteOffset || 0),
        Number(fm.harmonic2?.gain || 0), Number(fm.harmonic2?.noteOffset || 0),
        Number(fm.modulators?.[0]?.gain || 0), Number(fm.modulators?.[0]?.ratio ?? 1), String(fm.modulators?.[0]?.wave || "sine"),
        Number(fm.modulators?.[1]?.gain || 0), Number(fm.modulators?.[1]?.ratio ?? 2), String(fm.modulators?.[1]?.wave || "sine"),
        Number(fm.fmDepthPreset || 0),
      ],
      env:[
        Number(env.attack1 || 0), Number(env.hold1 || 0), Number(env.decay1 || 0),
        Number(env.decay1Target || 0), Number(env.hold2 || 0), Number(env.decay2 || 0),
        Number(env.envMult ?? 1), Number(env.instrumentBehavior || 0), Number(env.character || 0),
      ],
      texture:[Number(patch.texture?.preset || 0), Number(patch.texture?.amount || 0)],
      transient:[Number(patch.transient?.preset || 0), Number(patch.transient?.volume ?? 35)],
      filter:[
        Number(filter.lpFreq ?? 25), Number(filter.hpFreq || 0),
        eq(filter.eq1,"low"), eq(filter.eq2,"mid"), eq(filter.eq3,"high"),
      ],
      fx:[
        Number(patch.fx?.bitCrush?.preset || 0),
        Number(patch.fx?.saturation?.preset || 0),
        Number(patch.fx?.stereoWidth?.preset || 0),
        Number(patch.fx?.detune?.preset || 0),
        Number(patch.fx?.chorus?.preset || 0),
        Number(patch.fx?.delay?.preset || 0),
        Number(patch.fx?.reverb?.preset || 0),
      ],
    };
  }

  function patchPresetMatch() {
    if (selectedEngineMode() === "pretty") {
      return Math.max(0, Math.min(PRETTY_PRESETS.length - 1, Number(document.getElementById("app2_b1_p2_pretty_preset")?.value) || 0));
    }
    const current = window.SynthPhacePatchAdapter?.captureSynthPatch?.(state);
    if (!current) return -1;
    const currentKey = JSON.stringify(patchMatchShape(current));
    return (window.InterPhaceData?.PRESET_LIBRARY || []).findIndex((entry) =>
      JSON.stringify(patchMatchShape(projectNormalizedPatch(entry?.data?.patch))) === currentKey
    );
  }

  function syncPatchPreset() {
    const slider = document.getElementById("app2_b1_p1_patchPreset");
    if (!slider) return;
    if (selectedEngineMode() === "pretty") {
      const index = patchPresetMatch();
      slider.max = String(PRETTY_PRESETS.length - 1);
      setPresetIndicator(slider, index, PRETTY_PRESETS[index]?.name || "Still", false);
      return;
    }
    const library = window.InterPhaceData?.PRESET_LIBRARY || [];
    const match = patchPresetMatch();
    if (match >= 0) loadedPatchPresetIndex = match;
    loadedPatchPresetIndex = Math.max(0, Math.min(library.length - 1, Number(loadedPatchPresetIndex) || 0));
    setPresetIndicator(
      slider,
      loadedPatchPresetIndex,
      library[loadedPatchPresetIndex]?.name || "Init",
      match < 0,
    );
  }


  function assertAuthoredFmPresetIsLegal(patch, presetName = "Patch Preset") {
    const fm = patch?.synth?.fm || {};
    const mods = Array.isArray(fm.modulators) ? fm.modulators : [];
    const legalWaves = ["sine", "square", "saw"];

    [0, 1].forEach((modIndex) => {
      const mod = mods[modIndex] || {};
      const ratioIndex = ratioIndexForExact(mod.ratio ?? (modIndex === 0 ? 1 : 2));
      if (ratioIndex < 0) {
        throw new Error(
          `${presetName}: Mod ${modIndex + 1} ratio ${mod.ratio} is not an exact synthPhace FM ratio value.`
        );
      }
      if (!legalWaves.includes(String(mod.wave))) {
        throw new Error(
          `${presetName}: Mod ${modIndex + 1} waveform "${mod.wave}" is not a legal synthPhace waveform.`
        );
      }
    });
  }

  function applyPatchPreset(index) {
    if (selectedEngineMode() === "pretty") {
      applyPrettyPreset(index);
      syncPatchPreset();
      return;
    }
    const entry = window.InterPhaceData?.PRESET_LIBRARY?.[Number(index)];
    const patch = entry?.data?.patch;
    if (!patch) return;
    assertAuthoredFmPresetIsLegal(patch, entry?.name || "Patch Preset");

    applyingPatchPreset = true;
    loadedPatchPresetIndex = Number(index) || 0;

    // A synth preset owns synthPhace only. Project root, scale, tempo and arp
    // data in the legacy preset bank are intentionally ignored.
    const fm = patch.synth?.fm || {};
    dispatchSlider("app2_b1_p1_carrierVolume", fm.carrierVolume ?? 100);
    dispatchSlider("app2_b1_p1_harmonics", fm.harmonics ?? 0);
    dispatchSlider("app2_b1_p1_harmony1Volume", fm.harmonic1?.gain ?? 0);
    dispatchSlider("app2_b1_p1_harmony1Offset", patchHarmonyForScale(fm.harmonic1?.noteOffset ?? 0));
    dispatchSlider("app2_b1_p1_harmony2Volume", fm.harmonic2?.gain ?? 0);
    dispatchSlider("app2_b1_p1_harmony2Offset", patchHarmonyForScale(fm.harmonic2?.noteOffset ?? 0));

    dispatchSlider("app2_b1_p2_mod1Amount", fm.modulators?.[0]?.gain ?? 0);
    dispatchSlider("app2_b1_p2_mod1Ratio", ratioIndexForExact(fm.modulators?.[0]?.ratio ?? 1));
    dispatchSlider("app2_b1_p2_mod1Wave", waveIndexForExact(fm.modulators?.[0]?.wave));
    dispatchSlider("app2_b1_p2_mod2Amount", fm.modulators?.[1]?.gain ?? 0);
    dispatchSlider("app2_b1_p2_mod2Ratio", ratioIndexForExact(fm.modulators?.[1]?.ratio ?? 2));
    dispatchSlider("app2_b1_p2_mod2Wave", waveIndexForExact(fm.modulators?.[1]?.wave));
    dispatchSlider("app2_b1_p2_mod1Shape", fm.fmDepthPreset ?? 0);
    const pretty = patch.synth?.pretty || {};
    dispatchSlider("app2_b1_p2_pretty_balance", pretty.balance ?? 50);
    dispatchSlider("app2_b1_p2_pretty_strike", pretty.strike ?? 12);
    dispatchSlider("app2_b1_p2_pretty_bloom", pretty.bloom ?? 45);
    dispatchSlider("app2_b1_p2_pretty_damp", pretty.damp ?? 35);
    dispatchSlider("app2_b1_p2_pretty_color", pretty.color ?? 14);
    dispatchSlider("app2_b1_p2_pretty_resonance", pretty.resonance ?? 14);
    dispatchSlider("app2_b1_p2_pretty_blend", pretty.blend ?? 55);

    const env = patch.envelope?.ahdhd || {};
    dispatchSlider("app2_b1_p3_instrumentBehavior", env.instrumentBehavior ?? 0);
    dispatchSlider("app2_b1_p3_instrumentCharacter", env.character ?? 0);
    dispatchSlider("app2_b4_p1_attack", env.attack1 ?? 0.04);
    dispatchSlider("app2_b4_p1_hold1", env.hold1 ?? 0);
    dispatchSlider("app2_b4_p1_decay1", env.decay1 ?? 0.8);
    dispatchSlider("app2_b4_p1_decayPercent", (env.decay1Target ?? 0.1) * 100);
    dispatchSlider("app2_b4_p1_hold2", env.hold2 ?? 1.5);
    dispatchSlider("app2_b4_p1_decay2", env.decay2 ?? 0.9);
    dispatchSlider("app2_b4_p1_timeMultiplier", env.envMult ?? 1);

    dispatchSlider("app2_b1_p4_texturePreset", patch.texture?.preset ?? 0);
    dispatchSlider("app2_b1_p4_textureAmount", patch.texture?.amount ?? 0);
    dispatchSlider("app2_b1_p4_transientPreset", patch.transient?.preset ?? 0);
    dispatchSlider("app2_b1_p4_transientVolume", patch.transient?.volume ?? 35);

    const filter = patch.filter || {};
    dispatchSlider("app2_b3_p1_highCut", filter.lpFreq ?? 25);
    dispatchSlider("app2_b3_p1_lowCut", filter.hpFreq ?? 0);
    [["eq1","app2_b3_p2"],["eq2","app2_b3_p3"],["eq3","app2_b3_p4"]].forEach(([eqName,pageId]) => {
      const eq = filter[eqName] || {};
      const range = DATA.filters.EQ_FREQ_RANGES[eq.range] ? eq.range : ({eq1:"low",eq2:"mid",eq3:"high"})[eqName];
      configureEqRange(eqName, range, false);
      const bank = DATA.filters.EQ_FREQ_RANGES[range] || [];
      const legacyIndex = Math.max(0, Math.min(bank.length - 1, Math.round(Number(eq.freq) || 0)));
      dispatchSlider(`${pageId}_frequency`, legacyIndex);
      dispatchSlider(`${pageId}_gain`, eq.gain ?? 0);
      dispatchSlider(`${pageId}_q`, eq.q ?? 1);
    });

    const fx = patch.fx || {};
    dispatchSlider("app2_b2_p1_bitCrushPreset", fx.bitCrush?.preset ?? 0);
    dispatchSlider("app2_b2_p2_saturationPreset", fx.saturation?.preset ?? 0);
    dispatchSlider("app2_b2_p3_widthPreset", fx.stereoWidth?.preset ?? 0);
    dispatchSlider("app2_b2_p4_detunePreset", fx.detune?.preset ?? 0);
    dispatchSlider("app2_b2_p5_chorusPreset", fx.chorus?.preset ?? 0);
    dispatchSlider("app2_b2_p6_delayPreset", fx.delay?.preset ?? 0);
    dispatchSlider("app2_b2_p7_reverbPreset", fx.reverb?.preset ?? 0);

    applyingPatchPreset = false;
    syncChordPreset();
    syncRatioPreset();
    syncEnvelopePreset();
    syncPatchPreset();
    save();
  }


  function applyImportedSynthPatch(rawPatch) {
    if (!rawPatch || typeof rawPatch !== "object") return false;

    let patch = rawPatch;
    try {
      const destinationScale = currentProjectScaleId();
      if (patch.harmonyContext?.authoredScale &&
          patch.harmonyContext.authoredScale !== destinationScale) {
        patch = window.SynthPhacePatchAdapter?.translateSavedPatchHarmonies(
          patch,
          destinationScale,
        ) || patch;
      }
    } catch (error) {
      console.warn("Imported synth harmony translation fell back to nearest legal notes:", error);
    }

    setSelectedEngineMode(patch.synth?.engine?.mode);
    const fm = patch.synth?.fm || {};
    dispatchSlider("app2_b1_p1_carrierVolume", fm.carrierVolume ?? 100);
    dispatchSlider("app2_b1_p1_harmonics", fm.harmonics ?? 0);
    dispatchSlider("app2_b1_p1_harmony1Volume", fm.harmonic1?.gain ?? 0);
    dispatchSlider("app2_b1_p1_harmony1Offset", nearestAllowedSemitone(fm.harmonic1?.noteOffset ?? 0));
    dispatchSlider("app2_b1_p1_harmony2Volume", fm.harmonic2?.gain ?? 0);
    dispatchSlider("app2_b1_p1_harmony2Offset", nearestAllowedSemitone(fm.harmonic2?.noteOffset ?? 0));

    dispatchSlider("app2_b1_p2_mod1Amount", fm.modulators?.[0]?.gain ?? 0);
    dispatchSlider("app2_b1_p2_mod1Ratio", ratioIndexForExact(fm.modulators?.[0]?.ratio ?? 1));
    dispatchSlider("app2_b1_p2_mod1Wave", waveIndexForExact(fm.modulators?.[0]?.wave));
    dispatchSlider("app2_b1_p2_mod2Amount", fm.modulators?.[1]?.gain ?? 0);
    dispatchSlider("app2_b1_p2_mod2Ratio", ratioIndexForExact(fm.modulators?.[1]?.ratio ?? 2));
    dispatchSlider("app2_b1_p2_mod2Wave", waveIndexForExact(fm.modulators?.[1]?.wave));
    dispatchSlider("app2_b1_p2_mod1Shape", fm.fmDepthPreset ?? 0);
    const pretty = patch.synth?.pretty || {};
    dispatchSlider("app2_b1_p2_pretty_balance", pretty.balance ?? 50);
    dispatchSlider("app2_b1_p2_pretty_strike", pretty.strike ?? 20);
    dispatchSlider("app2_b1_p2_pretty_bloom", pretty.bloom ?? 45);
    dispatchSlider("app2_b1_p2_pretty_damp", pretty.damp ?? 35);
    dispatchSlider("app2_b1_p2_pretty_color", pretty.color ?? 42);
    dispatchSlider("app2_b1_p2_pretty_resonance", pretty.resonance ?? 28);
    dispatchSlider("app2_b1_p2_pretty_blend", pretty.blend ?? 70);

    const env = patch.envelope?.ahdhd || {};
    dispatchSlider("app2_b1_p3_instrumentBehavior", env.instrumentBehavior ?? 0);
    dispatchSlider("app2_b1_p3_instrumentCharacter", env.character ?? 0);
    dispatchSlider("app2_b4_p1_attack", env.attack1 ?? 0.04);
    dispatchSlider("app2_b4_p1_hold1", env.hold1 ?? 0);
    dispatchSlider("app2_b4_p1_decay1", env.decay1 ?? 0.8);
    dispatchSlider("app2_b4_p1_decayPercent", (env.decay1Target ?? 0.1) * 100);
    dispatchSlider("app2_b4_p1_hold2", env.hold2 ?? 1.5);
    dispatchSlider("app2_b4_p1_decay2", env.decay2 ?? 0.9);
    dispatchSlider("app2_b4_p1_timeMultiplier", env.envMult ?? 1);

    dispatchSlider("app2_b1_p4_texturePreset", patch.texture?.preset ?? 0);
    dispatchSlider("app2_b1_p4_textureAmount", patch.texture?.amount ?? 0);
    dispatchSlider("app2_b1_p4_transientPreset", patch.transient?.preset ?? 0);
    dispatchSlider("app2_b1_p4_transientVolume", patch.transient?.volume ?? 35);

    const filter = patch.filter || {};
    dispatchSlider("app2_b3_p1_highCut", filter.lpFreq ?? 25);
    dispatchSlider("app2_b3_p1_lowCut", filter.hpFreq ?? 0);
    [["eq1","app2_b3_p2"],["eq2","app2_b3_p3"],["eq3","app2_b3_p4"]].forEach(([eqName,pageId]) => {
      const eq = filter[eqName] || {};
      const range = DATA.filters.EQ_FREQ_RANGES[eq.range]
        ? eq.range
        : ({eq1:"low",eq2:"mid",eq3:"high"})[eqName];
      configureEqRange(eqName, range, false);
      const bank = DATA.filters.EQ_FREQ_RANGES[range] || [];
      const freqIndex = Math.max(0, Math.min(bank.length - 1, Math.round(Number(eq.freq) || 0)));
      dispatchSlider(`${pageId}_frequency`, freqIndex);
      dispatchSlider(`${pageId}_gain`, eq.gain ?? 0);
      dispatchSlider(`${pageId}_q`, eq.q ?? 1);
    });

    const fx = patch.fx || {};
    dispatchSlider("app2_b2_p1_bitCrushPreset", fx.bitCrush?.preset ?? 0);
    dispatchSlider("app2_b2_p1_bitCrushPresetWet", fx.bitCrush?.wet ?? patch.sharedWetDry ?? 100);
    dispatchSlider("app2_b2_p2_saturationPreset", fx.saturation?.preset ?? 0);
    dispatchSlider("app2_b2_p2_saturationPresetWet", fx.saturation?.wet ?? patch.sharedWetDry ?? 100);
    dispatchSlider("app2_b2_p3_widthPreset", fx.stereoWidth?.preset ?? 0);
    dispatchSlider("app2_b2_p3_widthPresetWet", fx.stereoWidth?.wet ?? patch.sharedWetDry ?? 100);
    dispatchSlider("app2_b2_p4_detunePreset", fx.detune?.preset ?? 0);
    dispatchSlider("app2_b2_p4_detunePresetWet", fx.detune?.wet ?? patch.sharedWetDry ?? 100);
    dispatchSlider("app2_b2_p5_chorusPreset", fx.chorus?.preset ?? 0);
    dispatchSlider("app2_b2_p5_chorusPresetWet", fx.chorus?.wet ?? patch.sharedWetDry ?? 100);
    dispatchSlider("app2_b2_p6_delayPreset", fx.delay?.preset ?? 0);
    dispatchSlider("app2_b2_p6_delayPresetWet", fx.delay?.wet ?? patch.sharedWetDry ?? 100);
    dispatchSlider("app2_b2_p7_reverbPreset", fx.reverb?.preset ?? 0);
    dispatchSlider("app2_b2_p7_reverbPresetWet", fx.reverb?.wet ?? patch.sharedWetDry ?? 100);
    dispatchSlider("app2_b2_p1_convolutionPreset", fx.convolution?.preset ?? 0);
    dispatchSlider("app2_b2_p2_convolutionWet", fx.convolution?.wet ?? 0);

    syncChordPreset();
    syncRatioPreset();
    syncEnvelopePreset();
    syncPatchPreset();
    save();
    return true;
  }

  function ratiosNow() {
    return {
      mod1: DATA.fmRatioValues[Number(document.getElementById("app2_b1_p2_mod1Ratio")?.value || 0)],
      mod2: DATA.fmRatioValues[Number(document.getElementById("app2_b1_p2_mod2Ratio")?.value || 0)],
    };
  }

  function ratioPresetMatch() {
    const current = ratiosNow();
    return DATA.fmRatioPresets.findIndex((preset) =>
      Math.abs(preset.mod1 - current.mod1) < 0.0005 &&
      Math.abs(preset.mod2 - current.mod2) < 0.0005
    );
  }

  let applyingRatioPreset = false;
  let loadedRatioPresetIndex = Number(state.values.ratioPreset ?? 0);

  function syncRatioPreset() {
    const slider = document.getElementById("app2_b1_p2_ratioPreset");
    if (!slider) return;
    const match = ratioPresetMatch();
    if (match >= 0) loadedRatioPresetIndex = match;
    loadedRatioPresetIndex = Math.max(0, Math.min(DATA.fmRatioPresets.length - 1, Number(loadedRatioPresetIndex) || 0));
    setPresetIndicator(
      slider,
      loadedRatioPresetIndex,
      DATA.fmRatioPresets[loadedRatioPresetIndex]?.name || "Init",
      match < 0,
    );
  }

  function applyRatioPreset(index) {
    loadedRatioPresetIndex = Number(index) || 0;
    const preset = DATA.fmRatioPresets[loadedRatioPresetIndex];
    if (!preset) return;
    applyingRatioPreset = true;
    dispatchSlider("app2_b1_p2_mod1Ratio", ratioIndexForExact(preset.mod1));
    dispatchSlider("app2_b1_p2_mod2Ratio", ratioIndexForExact(preset.mod2));
    applyingRatioPreset = false;
    syncRatioPreset();
    save();
  }

  const envelopeKeys = {
    attack1: "app2_b4_p1_attack",
    hold1: "app2_b4_p1_hold1",
    decay1: "app2_b4_p1_decay1",
    decay1Target: "app2_b4_p1_decayPercent",
    hold2: "app2_b4_p1_hold2",
    decay2: "app2_b4_p1_decay2",
    envMult: "app2_b4_p1_timeMultiplier",
  };

  const normalizedEnvelopePresets = DATA.envelopePresets;

  function envelopeState() {
    return {
      attack1: Number(document.getElementById(envelopeKeys.attack1)?.value || 0),
      hold1: Number(document.getElementById(envelopeKeys.hold1)?.value || 0),
      decay1: Number(document.getElementById(envelopeKeys.decay1)?.value || 0),
      decay1Target: Number(document.getElementById(envelopeKeys.decay1Target)?.value || 0) / 100,
      hold2: Number(document.getElementById(envelopeKeys.hold2)?.value || 0),
      decay2: Number(document.getElementById(envelopeKeys.decay2)?.value || 0),
      envMult: Number(document.getElementById(envelopeKeys.envMult)?.value || 1),
    };
  }

  function sameNumber(a, b) {
    return Math.abs(Number(a) - Number(b)) < 0.000001;
  }

  function envelopePresetMatch() {
    const current = envelopeState();
    return DATA.envelopePresetOrder.findIndex((name) => {
      const preset = normalizedEnvelopePresets[name];
      return Object.keys(current).every((key) => sameNumber(current[key], preset[key]));
    });
  }

  let applyingEnvelopePreset = false;
  let loadedEnvelopePresetIndex = Number(state.values.envelopePreset ?? 0);

  function refreshEnvelopeStageDisplays() {
    ["attack", "hold1", "decay1", "hold2", "decay2"].forEach((name) => {
      const input = document.querySelector(`[data-name="${name}"]`);
      if (input) refreshInputDisplay(input);
    });
  }

  function syncEnvelopePreset() {
    const slider = document.getElementById("app2_b4_p1_envelopePreset");
    if (!slider) return;
    const match = envelopePresetMatch();
    if (match >= 0) loadedEnvelopePresetIndex = match;
    loadedEnvelopePresetIndex = Math.max(
      0,
      Math.min(DATA.envelopePresetOrder.length - 1, Number(loadedEnvelopePresetIndex) || 0),
    );
    const name = DATA.envelopePresetOrder[loadedEnvelopePresetIndex] || "Init";
    setPresetIndicator(
      slider,
      loadedEnvelopePresetIndex,
      name[0].toUpperCase() + name.slice(1),
      match < 0,
    );
  }

  function applyEnvelopePreset(index) {
    loadedEnvelopePresetIndex = Number(index) || 0;
    const name = DATA.envelopePresetOrder[loadedEnvelopePresetIndex];
    const preset = normalizedEnvelopePresets[name];
    if (!preset) return;
    applyingEnvelopePreset = true;
    dispatchSlider(envelopeKeys.attack1, preset.attack1);
    dispatchSlider(envelopeKeys.hold1, preset.hold1);
    dispatchSlider(envelopeKeys.decay1, preset.decay1);
    dispatchSlider(envelopeKeys.decay1Target, preset.decay1Target * 100);
    dispatchSlider(envelopeKeys.hold2, preset.hold2);
    dispatchSlider(envelopeKeys.decay2, preset.decay2);
    dispatchSlider(envelopeKeys.envMult, preset.envMult);
    applyingEnvelopePreset = false;
    refreshEnvelopeStageDisplays();
    syncEnvelopePreset();
    save();
  }

  function eqInput(eq, suffix) {
    const pageId = Object.entries(eqPageMap).find(([, name]) => name === eq)?.[0];
    return pageId ? document.getElementById(`${pageId}_${suffix}`) : null;
  }

  function configureEqRange(eq, range, resetFrequency) {
    const validRange = DATA.filters.EQ_FREQ_RANGES[range] ? range : "all";
    state.eqRanges[eq] = validRange;
    const slider = eqInput(eq, "frequency");
    const bank = DATA.filters.EQ_FREQ_RANGES[validRange];
    if (slider) {
      slider.min = "0";
      slider.max = String(Math.max(0, bank.length - 1));
      slider.step = "1";
      let value = Number(slider.value);
      if (resetFrequency) value = Math.floor(bank.length / 2);
      value = Math.max(0, Math.min(bank.length - 1, Number.isFinite(value) ? value : 0));
      slider.value = String(value);
      state.values[slider.dataset.name] = value;
      refreshInputDisplay(slider);
    }
    document.querySelectorAll(`[data-eq="${eq}"].eqRangeButton`).forEach((button) => {
      const selected = button.dataset.range === validRange;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    save();
  }

  function buildEqRangeGrid(pageId, eq) {
    const container = document.getElementById(`${pageId}_grid`);
    if (!container) return;
    const labels = ["LOW", "MID", "HIGH", "ALL"];
    labels.forEach((label, col) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "backgroundSelectionCell is-active eqRangeButton";
      button.id = `${pageId}_range_${label.toLowerCase()}`;
      button.textContent = label;
      button.dataset.range = label.toLowerCase();
      button.dataset.eq = eq;
      button.style.gridColumn = String(col + 2);
      button.addEventListener("click", () => configureEqRange(eq, button.dataset.range, true));
      container.appendChild(button);
    });

    const page = container.closest(".synth-eq-page");
    const items = Array.from(container.querySelectorAll(".eqRangeButton")).map((element, col) => ({
      element,
      rowOffset: 0,
      col,
    }));
    const group = InterPhaceShell.createBackgroundSelectionAutoGroup?.({
      grid: container,
      foreground: () => Array.from(page?.querySelectorAll(".page-title, .control-stack > *") || []),
      items,
    });
    if (group) backgroundAutoGroups.push(group);
  }

  // Configure EQ frequency banks before range bindings restore stored frequency indices.
  Object.entries(eqPageMap).forEach(([pageId, eq]) => {
    const slider = document.getElementById(`${pageId}_frequency`);
    const range = state.eqRanges[eq] || ({ eq1: "low", eq2: "mid", eq3: "high" })[eq];
    const bank = DATA.filters.EQ_FREQ_RANGES[range];
    if (slider && bank) slider.max = String(bank.length - 1);
  });

  document.querySelectorAll('.macroControl input[type="range"]').forEach(bindRange);

  // B4 P3 is intentionally a freeform control, but its state lives in the
  // same saved synth UI object as every other control. A new stroke clears the
  // prior curve immediately; only a complete left-to-right Start→End stroke is
  // valid for audio.
  const drawnArea = document.getElementById("app2_b4_p3_drawArea");
  const drawnCanvas = document.getElementById("app2_b4_p3_canvas");
  const drawnLength = document.getElementById("app2_b4_p3_length");
  state.drawnEnvelope = state.drawnEnvelope && typeof state.drawnEnvelope === "object"
    ? state.drawnEnvelope : { valid: false, curve: [] };
  let drawing = null;

  function drawnMetrics() {
    const rect = drawnArea?.getBoundingClientRect();
    const pad = 18;
    return rect ? { rect, pad, width: Math.max(1, rect.width - pad * 2), height: Math.max(1, rect.height - pad * 2) } : null;
  }

  function redrawDrawnEnvelope() {
    if (!drawnCanvas || !drawnArea) return;
    const metrics = drawnMetrics(); if (!metrics) return;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    drawnCanvas.width = Math.round(metrics.rect.width * ratio);
    drawnCanvas.height = Math.round(metrics.rect.height * ratio);
    drawnCanvas.style.width = `${metrics.rect.width}px`; drawnCanvas.style.height = `${metrics.rect.height}px`;
    const ctx = drawnCanvas.getContext("2d"); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, metrics.rect.width, metrics.rect.height);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--line-strong").trim() || "#555a63";
    ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(metrics.pad, metrics.rect.height - metrics.pad); ctx.lineTo(metrics.rect.width - metrics.pad, metrics.rect.height - metrics.pad); ctx.stroke(); ctx.setLineDash([]);
    const points = drawing?.points || (state.drawnEnvelope.valid ? state.drawnEnvelope.curve.map((value, index, all) => [index / Math.max(1, all.length - 1), value]) : []);
    if (points.length > 1) {
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--synth").trim() || "#00aaff";
      ctx.lineWidth = 2.25; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath();
      points.forEach(([x, y], index) => {
        const px = metrics.pad + Math.max(0, Math.min(1, x)) * metrics.width;
        const py = metrics.rect.height - metrics.pad - Math.max(0, Math.min(1, y)) * metrics.height;
        if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }); ctx.stroke();
    }
  }

  function canvasPoint(event) {
    const metrics = drawnMetrics(); if (!metrics) return null;
    const x = (event.clientX - metrics.rect.left - metrics.pad) / metrics.width;
    const y = 1 - ((event.clientY - metrics.rect.top - metrics.pad) / metrics.height);
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), metrics };
  }

  function smoothDrawnCurve(points, count = 128) {
    const sampled = [];
    for (let index = 0; index < count; index += 1) {
      const x = index / (count - 1); let right = points.findIndex(point => point[0] >= x);
      if (right < 0) right = points.length - 1; const left = Math.max(0, right - 1);
      const a = points[left], b = points[right]; const span = Math.max(.00001, b[0] - a[0]);
      sampled.push(a[1] + (b[1] - a[1]) * Math.max(0, Math.min(1, (x - a[0]) / span)));
    }
    const smooth = sampled.map((_, index) => {
      let sum = 0, used = 0;
      for (let offset = -2; offset <= 2; offset += 1) { const value = sampled[index + offset]; if (value !== undefined) { sum += value; used += 1; } }
      return Math.max(0, Math.min(1, sum / used));
    });
    smooth[0] = 0; smooth[smooth.length - 1] = 0;
    const peak = Math.max(...smooth);
    // Normalize after correction/smoothing, not before: the drawn shape stays
    // intact while every successful contour reaches a consistent full peak.
    if (peak > .0001) {
      for (let index = 1; index < smooth.length - 1; index += 1) smooth[index] = Math.min(1, smooth[index] / peak);
    }
    return smooth;
  }

  if (drawnArea && drawnCanvas) {
    drawnArea.addEventListener("pointerdown", event => {
      const point = canvasPoint(event); if (!point) return;
      const distance = Math.hypot(event.clientX - (point.metrics.rect.left + point.metrics.pad), event.clientY - (point.metrics.rect.top + point.metrics.rect.height - point.metrics.pad));
      if (distance > 28) return;
      event.preventDefault(); drawnArea.setPointerCapture?.(event.pointerId);
      state.drawnEnvelope = { valid: false, curve: [] };
      drawing = { pointerId: event.pointerId, points: [[0, 0]] };
      save(); redrawDrawnEnvelope();
    });
    drawnArea.addEventListener("pointermove", event => {
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      const point = canvasPoint(event); if (!point) return; event.preventDefault();
      const previous = drawing.points[drawing.points.length - 1];
      // Time never moves backward in the stored envelope. Backward finger
      // motion is simply corrected at the current time position, not rejected.
      drawing.points.push([Math.max(previous[0], point.x), point.y]); redrawDrawnEnvelope();
    });
    const finishDraw = event => {
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      const point = canvasPoint(event); const metrics = point?.metrics;
      const endDistance = metrics ? Math.hypot(event.clientX - (metrics.rect.left + metrics.rect.width - metrics.pad), event.clientY - (metrics.rect.top + metrics.rect.height - metrics.pad)) : Infinity;
      if (endDistance <= 28) {
        drawing.points.push([1, 0]);
        state.drawnEnvelope = { valid: true, curve: smoothDrawnCurve(drawing.points) };
      } else state.drawnEnvelope = { valid: false, curve: [] };
      drawing = null; save(); redrawDrawnEnvelope();
    };
    drawnArea.addEventListener("pointerup", finishDraw);
    drawnArea.addEventListener("pointercancel", finishDraw);
    window.addEventListener("resize", redrawDrawnEnvelope);
    requestAnimationFrame(redrawDrawnEnvelope);
  }


  const patchPresetSlider = document.getElementById("app2_b1_p1_patchPreset");
  if (patchPresetSlider) {
    const presetCount = window.InterPhaceData?.PRESET_LIBRARY?.length || 1;
    patchPresetSlider.max = String(Math.max(0, presetCount - 1));
    patchPresetSlider.addEventListener("input", () => applyPatchPreset(patchPresetSlider.value));
    refreshInputDisplay(patchPresetSlider);
  }


  const sharedWetDryIds = [
  ];

  let syncingSharedWetDry = false;

  function setSharedWetDry(value, sourceId = "") {
    const numeric = Math.max(0, Math.min(100, Number(value) || 0));
    syncingSharedWetDry = true;
    sharedWetDryIds.forEach((id) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.value = String(numeric);
      if (input.dataset.name) state.values[input.dataset.name] = numeric;
      refreshInputDisplay(input);
    });
    syncingSharedWetDry = false;
    state.values.sharedWetDry = numeric;
    save();
  }

  const initialSharedWetDry = Number.isFinite(Number(state.values.sharedWetDry))
    ? Number(state.values.sharedWetDry)
    : Number(document.getElementById(sharedWetDryIds[0])?.value ?? 70);

  setSharedWetDry(initialSharedWetDry);

  sharedWetDryIds.forEach((id) => {
    document.getElementById(id)?.addEventListener("input", (event) => {
      if (syncingSharedWetDry) return;
      setSharedWetDry(event.target.value, id);
    });
  });

  // Build 458: Bit Crush presets own a recommended audition amount.
  // Users can still adjust Wet freely after selection.
  document.getElementById("app2_b2_p1_bitCrushPreset")?.addEventListener("input", (event) => {
    const index = Math.round(Number(event.target.value) || 0);
    const defaultWet = window.SynthPhaceEffects?.bitCrushDefaultWet?.(index);
    if (!Number.isFinite(defaultWet)) return;
    const wet = document.getElementById("app2_b2_p1_bitCrushPresetWet");
    if (!wet) return;
    wet.value = String(defaultWet);
    if (wet.dataset.name) state.values[wet.dataset.name] = defaultWet;
    refreshInputDisplay(wet);
    save();
  });

  // Build 459: Saturation presets load a recommended audition amount.
  // Wet remains freely adjustable after preset selection; Off forces 0%.
  document.getElementById("app2_b2_p2_saturationPreset")?.addEventListener("input", (event) => {
    const index = Math.round(Number(event.target.value) || 0);
    const defaultWet = window.SynthPhaceEffects?.saturationDefaultWet?.(index);
    if (!Number.isFinite(defaultWet)) return;
    const wet = document.getElementById("app2_b2_p2_saturationPresetWet");
    if (!wet) return;
    wet.value = String(defaultWet);
    if (wet.dataset.name) state.values[wet.dataset.name] = defaultWet;
    refreshInputDisplay(wet);
    save();
  });

  // Build 462: Width presets load their recommended audition amount.
  // Off forces 0%; the Wet slider remains freely adjustable afterward.
  document.getElementById("app2_b2_p3_widthPreset")?.addEventListener("input", (event) => {
    const index = Math.round(Number(event.target.value) || 0);
    const defaultWet = window.SynthPhaceEffects?.widthDefaultWet?.(index);
    if (!Number.isFinite(defaultWet)) return;
    const wet = document.getElementById("app2_b2_p3_widthPresetWet");
    if (!wet) return;
    wet.value = String(defaultWet);
    if (wet.dataset.name) state.values[wet.dataset.name] = defaultWet;
    refreshInputDisplay(wet);
    save();
  });

  // Build 466: Detune presets load their recommended audition amount.
  // Off forces 0%; Wet remains freely adjustable afterward.
  document.getElementById("app2_b2_p4_detunePreset")?.addEventListener("input", (event) => {
    const index = Math.round(Number(event.target.value) || 0);
    const defaultWet = window.SynthPhaceEffects?.detuneDefaultWet?.(index);
    if (!Number.isFinite(defaultWet)) return;
    const wet = document.getElementById("app2_b2_p4_detunePresetWet");
    if (!wet) return;
    wet.value = String(defaultWet);
    if (wet.dataset.name) state.values[wet.dataset.name] = defaultWet;
    refreshInputDisplay(wet);
    save();
  });

  // Build 467: Chorus presets load their recommended audition amount.
  // Off forces 0%; Wet remains freely adjustable afterward.
  document.getElementById("app2_b2_p5_chorusPreset")?.addEventListener("input", (event) => {
    const index = Math.round(Number(event.target.value) || 0);
    const defaultWet = window.SynthPhaceEffects?.chorusDefaultWet?.(index);
    if (!Number.isFinite(defaultWet)) return;
    const wet = document.getElementById("app2_b2_p5_chorusPresetWet");
    if (!wet) return;
    wet.value = String(defaultWet);
    if (wet.dataset.name) state.values[wet.dataset.name] = defaultWet;
    refreshInputDisplay(wet);
    save();
  });

  // Build 468: Delay presets load their recommended audition amount.
  // Off forces 0%; Wet remains freely adjustable afterward.
  document.getElementById("app2_b2_p6_delayPreset")?.addEventListener("input", (event) => {
    const index = Math.round(Number(event.target.value) || 0);
    const defaultWet = window.SynthPhaceEffects?.delayDefaultWet?.(index);
    if (!Number.isFinite(defaultWet)) return;
    const wet = document.getElementById("app2_b2_p6_delayPresetWet");
    if (!wet) return;
    wet.value = String(defaultWet);
    if (wet.dataset.name) state.values[wet.dataset.name] = defaultWet;
    refreshInputDisplay(wet);
    save();
  });

  // Build 469: Reverb presets load their recommended audition amount.
  // Off forces 0%; Wet remains freely adjustable afterward.
  document.getElementById("app2_b2_p7_reverbPreset")?.addEventListener("input", (event) => {
    const index = Math.round(Number(event.target.value) || 0);
    const defaultWet = window.SynthPhaceEffects?.reverbDefaultWet?.(index);
    if (!Number.isFinite(defaultWet)) return;
    const wet = document.getElementById("app2_b2_p7_reverbPresetWet");
    if (!wet) return;
    wet.value = String(defaultWet);
    if (wet.dataset.name) state.values[wet.dataset.name] = defaultWet;
    refreshInputDisplay(wet);
    save();
  });

  // Build 471: Convolution presets load their recommended audition amount.
  // Off forces 0%; Wet remains freely adjustable afterward.
  document.getElementById("app2_b2_p1_convolutionPreset")?.addEventListener("input", (event) => {
    const index = Math.round(Number(event.target.value) || 0);
    const defaultWet = window.SynthPhaceEffects?.convolutionDefaultWet?.(index);
    if (!Number.isFinite(defaultWet)) return;
    const wet = document.getElementById("app2_b2_p2_convolutionWet");
    if (!wet) return;
    wet.value = String(defaultWet);
    if (wet.dataset.name) state.values[wet.dataset.name] = defaultWet;
    refreshInputDisplay(wet);
    save();
  });

  // Harmonic offsets are scale-constrained like legacy synthPhace.
  ["app2_b1_p1_harmony1Offset", "app2_b1_p1_harmony2Offset"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", (event) => {
      const snapped = nearestAllowedSemitone(event.target.value);
      if (Number(event.target.value) !== snapped) {
        event.target.value = String(snapped);
        state.values[event.target.dataset.name] = snapped;
        refreshInputDisplay(event.target);
      }
      if (!applyingChord) syncChordPreset();
      save();
    });
  });

  ["app2_b1_p1_harmony1Volume", "app2_b1_p1_harmony2Volume"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      if (!applyingChord) syncChordPreset();
    });
  });

  const chordSlider = document.getElementById("app2_b1_p1_chordPreset");
  if (chordSlider) {
    chordSlider.max = String(currentChordBank().length - 1);
    chordSlider.addEventListener("input", () => applyChordPreset(chordSlider.value));
    syncChordPreset();
  }

  ["app2_b1_p2_mod1Ratio", "app2_b1_p2_mod2Ratio"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      if (!applyingRatioPreset) syncRatioPreset();
    });
  });
  document.getElementById("app2_b1_p2_ratioPreset")?.addEventListener("input", (event) => {
    applyRatioPreset(event.target.value);
  });
  syncRatioPreset();

  const prettyPresetSlider = document.getElementById("app2_b1_p2_pretty_preset");
  function applyPrettyPreset(index) {
    const safe = Math.max(0, Math.min(PRETTY_PRESETS.length - 1, Number(index) || 0));
    const preset = PRETTY_PRESETS[safe];
    if (!preset) return;
    Object.entries(preset).forEach(([key, value]) => {
      if (key === "name") return;
      dispatchSlider(`app2_b1_p2_pretty_${key}`, value);
    });
    setPresetIndicator(prettyPresetSlider, safe, preset.name, false);
    save();
  }
  if (prettyPresetSlider) {
    prettyPresetSlider.max = String(PRETTY_PRESETS.length - 1);
    prettyPresetSlider.addEventListener("input", event => applyPrettyPreset(event.target.value));
    refreshInputDisplay(prettyPresetSlider);
  }

  const envelopeDependentIds = Object.values(envelopeKeys);
  envelopeDependentIds.forEach((id) => {
    document.getElementById(id)?.addEventListener("input", (event) => {
      if (event.target.dataset.name === "timeMultiplier") refreshEnvelopeStageDisplays();
      if (!applyingEnvelopePreset) syncEnvelopePreset();
    });
  });
  document.getElementById("app2_b4_p1_envelopePreset")?.addEventListener("input", (event) => {
    applyEnvelopePreset(event.target.value);
  });

  if (!hadCurrentSavedState) {
    applyEnvelopePreset(3); // Legacy init applies Strike.
  } else {
    refreshEnvelopeStageDisplays();
    syncEnvelopePreset();
  }

  buildEqRangeGrid("app2_b3_p2", "eq1");
  buildEqRangeGrid("app2_b3_p3", "eq2");
  buildEqRangeGrid("app2_b3_p4", "eq3");
  configureEqRange("eq1", state.eqRanges.eq1, false);
  configureEqRange("eq2", state.eqRanges.eq2, false);
  configureEqRange("eq3", state.eqRanges.eq3, false);


  const patchPresetDependentNames = new Set([
    "carrierVolume","harmony1Volume","harmony1Offset","harmony2Volume","harmony2Offset",
    "mod1Amount","mod1Ratio","mod1Wave","mod2Amount","mod2Ratio","mod2Wave","mod1Shape",
    "instrumentBehavior","instrumentCharacter","attack","hold1","decay1","decayPercent",
    "hold2","decay2","timeMultiplier","texturePreset","textureAmount","transientPreset",
    "transientVolume","highCut","lowCut","eq1Freq","eq1Gain","eq1Q","eq2Freq","eq2Gain",
    "eq2Q","eq3Freq","eq3Gain","eq3Q","bitCrushPreset","saturationPreset","widthPreset",
    "detunePreset","chorusPreset","delayPreset","reverbPreset"
  ]);
  document.querySelectorAll('.macroControl input[type="range"]').forEach((input) => {
    if (!patchPresetDependentNames.has(input.dataset.name)) return;
    input.addEventListener("input", () => {
      if (!applyingPatchPreset) syncPatchPreset();
    });
  });
  syncPatchPreset();

  // If project scale changes in another tab/window, re-snap harmonics and refresh the chord bank.
  window.addEventListener("storage", (event) => {
    if (event.key !== window.SynthPhacePatchAdapter?.PROJECT_STORAGE_KEY) return;
    const selectedPatch = window.InterPhaceData?.PRESET_LIBRARY?.[loadedPatchPresetIndex]?.data?.patch;
    const patchWasUnmodified = patchPresetMatch() === loadedPatchPresetIndex;
    if (selectedPatch && patchWasUnmodified) {
      const fm = selectedPatch.synth?.fm || {};
      dispatchSlider("app2_b1_p1_harmony1Offset", patchHarmonyForScale(fm.harmonic1?.noteOffset ?? 0));
      dispatchSlider("app2_b1_p1_harmony2Offset", patchHarmonyForScale(fm.harmonic2?.noteOffset ?? 0));
    } else {
      ["app2_b1_p1_harmony1Offset", "app2_b1_p1_harmony2Offset"].forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        const snapped = nearestAllowedSemitone(input.value);
        if (Number(input.value) !== snapped) dispatchSlider(id, snapped);
      });
    }
    syncChordPreset();
    syncPatchPreset();
  });

  try {
    const pendingKey = "interPhace.synthPhace.import.pending.v1";
    const pending = JSON.parse(localStorage.getItem(pendingKey) || "null");
    if (pending && typeof pending === "object") {
      if (applyImportedSynthPatch(pending)) {
        localStorage.removeItem(pendingKey);
      }
    }
  } catch (error) {
    console.error("Could not apply imported synth patch:", error);
  }

  render();
})();
