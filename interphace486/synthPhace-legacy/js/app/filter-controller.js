// Filter control bindings. Owns DOM interaction only.

window.FilterController = {};

const FILTER_PRESETS = Object.freeze(
[
  {
    "name": "Flat",
    "lpFreq": 25,
    "hpFreq": 0,
    "eq1": {
      "range": "low",
      "freq": 18,
      "gain": 0,
      "q": 1.0
    },
    "eq2": {
      "range": "mid",
      "freq": 9,
      "gain": 0,
      "q": 1.0
    },
    "eq3": {
      "range": "high",
      "freq": 12,
      "gain": 0,
      "q": 1.0
    }
  },
  {
    "name": "Warm",
    "lpFreq": 23,
    "hpFreq": 0,
    "eq1": {
      "range": "low",
      "freq": 25,
      "gain": 2.5,
      "q": 0.8
    },
    "eq2": {
      "range": "mid",
      "freq": 11,
      "gain": 1.0,
      "q": 0.9
    },
    "eq3": {
      "range": "high",
      "freq": 15,
      "gain": -2.0,
      "q": 0.8
    }
  },
  {
    "name": "Dark",
    "lpFreq": 19,
    "hpFreq": 0,
    "eq1": {
      "range": "low",
      "freq": 25,
      "gain": 2.0,
      "q": 0.9
    },
    "eq2": {
      "range": "mid",
      "freq": 17,
      "gain": -1.0,
      "q": 0.9
    },
    "eq3": {
      "range": "high",
      "freq": 9,
      "gain": -3.0,
      "q": 0.8
    }
  },
  {
    "name": "Bright",
    "lpFreq": 25,
    "hpFreq": 3,
    "eq1": {
      "range": "low",
      "freq": 25,
      "gain": -1.5,
      "q": 0.9
    },
    "eq2": {
      "range": "mid",
      "freq": 23,
      "gain": 1.0,
      "q": 0.9
    },
    "eq3": {
      "range": "high",
      "freq": 23,
      "gain": 3.0,
      "q": 0.9
    }
  },
  {
    "name": "Airy",
    "lpFreq": 25,
    "hpFreq": 5,
    "eq1": {
      "range": "low",
      "freq": 33,
      "gain": -1.0,
      "q": 0.8
    },
    "eq2": {
      "range": "mid",
      "freq": 30,
      "gain": 0.5,
      "q": 0.8
    },
    "eq3": {
      "range": "high",
      "freq": 28,
      "gain": 4.0,
      "q": 0.8
    }
  },
  {
    "name": "Bass Focus",
    "lpFreq": 23,
    "hpFreq": 0,
    "eq1": {
      "range": "low",
      "freq": 18,
      "gain": 4.0,
      "q": 1.2
    },
    "eq2": {
      "range": "mid",
      "freq": 11,
      "gain": -2.0,
      "q": 0.9
    },
    "eq3": {
      "range": "high",
      "freq": 15,
      "gain": -1.0,
      "q": 0.8
    }
  },
  {
    "name": "Mid Scoop",
    "lpFreq": 24,
    "hpFreq": 3,
    "eq1": {
      "range": "low",
      "freq": 25,
      "gain": 2.0,
      "q": 0.9
    },
    "eq2": {
      "range": "mid",
      "freq": 17,
      "gain": -4.0,
      "q": 0.8
    },
    "eq3": {
      "range": "high",
      "freq": 15,
      "gain": 2.0,
      "q": 0.9
    }
  },
  {
    "name": "Presence",
    "lpFreq": 25,
    "hpFreq": 5,
    "eq1": {
      "range": "low",
      "freq": 33,
      "gain": -1.0,
      "q": 0.8
    },
    "eq2": {
      "range": "mid",
      "freq": 30,
      "gain": 3.0,
      "q": 1.0
    },
    "eq3": {
      "range": "high",
      "freq": 15,
      "gain": 2.0,
      "q": 0.9
    }
  },
  {
    "name": "Soft",
    "lpFreq": 21,
    "hpFreq": 0,
    "eq1": {
      "range": "low",
      "freq": 25,
      "gain": 1.5,
      "q": 0.8
    },
    "eq2": {
      "range": "mid",
      "freq": 17,
      "gain": 1.0,
      "q": 0.8
    },
    "eq3": {
      "range": "high",
      "freq": 9,
      "gain": -2.5,
      "q": 0.8
    }
  },
  {
    "name": "Telephone",
    "lpFreq": 17,
    "hpFreq": 13,
    "eq1": {
      "range": "all",
      "freq": 28,
      "gain": -2.0,
      "q": 0.9
    },
    "eq2": {
      "range": "mid",
      "freq": 23,
      "gain": 4.0,
      "q": 1.2
    },
    "eq3": {
      "range": "high",
      "freq": 3,
      "gain": 2.0,
      "q": 1.0
    }
  },
  {
    "name": "Lo-Fi",
    "lpFreq": 19,
    "hpFreq": 6,
    "eq1": {
      "range": "low",
      "freq": 33,
      "gain": 2.0,
      "q": 0.9
    },
    "eq2": {
      "range": "mid",
      "freq": 17,
      "gain": -1.5,
      "q": 0.9
    },
    "eq3": {
      "range": "high",
      "freq": 9,
      "gain": -2.0,
      "q": 0.8
    }
  },
  {
    "name": "Sub",
    "lpFreq": 11,
    "hpFreq": 0,
    "eq1": {
      "range": "low",
      "freq": 12,
      "gain": 4.0,
      "q": 1.2
    },
    "eq2": {
      "range": "low",
      "freq": 33,
      "gain": -2.0,
      "q": 0.9
    },
    "eq3": {
      "range": "mid",
      "freq": 5,
      "gain": -3.0,
      "q": 0.8
    }
  }
]
);

FilterController.getPresets = function () {
  return FILTER_PRESETS.map((preset) => JSON.parse(JSON.stringify(preset)));
};

FilterController.initUI = function (patch) {
  const { LP_FREQ_PRESETS, HP_FREQ_PRESETS, EQ_FREQ_RANGES } = window.FilterFrequencyData;
  const filter = patch.filter;
  let applyingPreset = false;
  let loadedPresetIndex = Math.max(
    0,
    Math.min(FILTER_PRESETS.length - 1, Number(filter.preset) || 0),
  );
  let loadedPresetSnapshot = null;

  const formatCut = (freq) =>
    freq >= 1000 ? (freq / 1000).toFixed(1) + "kHz" : freq + "Hz";

  const captureState = () => JSON.stringify({
    lpFreq: Number(filter.lpFreq),
    hpFreq: Number(filter.hpFreq),
    eq1: {
      range: filter.eq1.range,
      freq: Number(filter.eq1.freq),
      gain: Number(filter.eq1.gain),
      q: Number(filter.eq1.q),
    },
    eq2: {
      range: filter.eq2.range,
      freq: Number(filter.eq2.freq),
      gain: Number(filter.eq2.gain),
      q: Number(filter.eq2.q),
    },
    eq3: {
      range: filter.eq3.range,
      freq: Number(filter.eq3.freq),
      gain: Number(filter.eq3.gain),
      q: Number(filter.eq3.q),
    },
  });

  const updatePresetModifiedState = () => {
    if (applyingPreset || !loadedPresetSnapshot) return;
    const label = document.getElementById("filterPresetValue");
    if (!label) return;
    label.classList.toggle(
      "preset-modified",
      captureState() !== loadedPresetSnapshot,
    );
  };

  const markChangedSoon = () =>
    requestAnimationFrame(updatePresetModifiedState);

  UI.bindSlider("lpFreq", "lpFreqValue", (v) => {
    filter.lpFreq = Number(v);
    markChangedSoon();
    return formatCut(LP_FREQ_PRESETS[v]);
  });

  UI.bindSlider("hpFreq", "hpFreqValue", (v) => {
    filter.hpFreq = Number(v);
    markChangedSoon();
    return formatCut(HP_FREQ_PRESETS[v]);
  });

  const eqBandButtons = document.querySelectorAll("button[data-eq]");
  const eqBandPanels = document.querySelectorAll(".eq-band-panel");

  eqBandButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const eqName = btn.dataset.eq;
      eqBandButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      eqBandPanels.forEach((panel) => panel.classList.remove("active"));
      const activePanel = document.getElementById(`eq-panel-${eqName}`);
      activePanel?.classList.add("active");
      filter.activeEQ = eqName;

      // Hidden EQ panels have zero rendered width, so their range-fill visuals
      // cannot be calculated correctly while off-screen. Refresh the newly
      // visible band's sliders after layout.
      requestAnimationFrame(() => {
        if (activePanel && window.UI?.refreshRangeFills) {
          window.UI.refreshRangeFills(activePanel);
        }
      });
    });
  });

  initEQ("eq1", filter.eq1);
  initEQ("eq2", filter.eq2);
  initEQ("eq3", filter.eq3);

  function setRange(eqName, eqParams, range, { resetFrequency = true } = {}) {
    const rangeFreqs = EQ_FREQ_RANGES[range];
    if (!rangeFreqs) return;

    eqParams.range = range;
    const row = document.getElementById(`${eqName}Range`);
    row?.querySelectorAll("button[data-range]").forEach((button) => {
      button.classList.toggle("active", button.dataset.range === range);
    });

    if (resetFrequency) {
      eqParams.freq = Math.floor(rangeFreqs.length / 2);
    }

    eqParams.freq = Math.max(
      0,
      Math.min(rangeFreqs.length - 1, Number(eqParams.freq) || 0),
    );

    const freqSlider = document.getElementById(`${eqName}Freq`);
    if (freqSlider) {
      freqSlider.max = String(rangeFreqs.length - 1);
      freqSlider.value = String(eqParams.freq);
      if (window.UI?.updateRangeFill) window.UI.updateRangeFill(freqSlider);
    }

    updateFreqDisplay(eqName, eqParams);
  }

  function initEQ(eqName, eqParams) {
    const rangeRow = document.getElementById(`${eqName}Range`);

    rangeRow?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-range]");
      if (!button) return;
      setRange(eqName, eqParams, button.dataset.range, {
        resetFrequency: true,
      });
      markChangedSoon();
    });

    const freqSlider = document.getElementById(`${eqName}Freq`);
    if (freqSlider) {
      setRange(eqName, eqParams, eqParams.range, {
        resetFrequency: false,
      });
      freqSlider.addEventListener("input", () => {
        eqParams.freq = Number(freqSlider.value);
        updateFreqDisplay(eqName, eqParams);
        markChangedSoon();
      });
    }

    const gainSlider = document.getElementById(`${eqName}Gain`);
    const gainValue = document.getElementById(`${eqName}GainValue`);
    if (gainSlider && gainValue) {
      gainSlider.addEventListener("input", () => {
        eqParams.gain = Number(gainSlider.value);
        gainValue.textContent =
          (eqParams.gain > 0 ? "+" : "") + eqParams.gain + "dB";
        markChangedSoon();
      });
      gainValue.textContent =
        (eqParams.gain > 0 ? "+" : "") + eqParams.gain + "dB";
    }

    const qSlider = document.getElementById(`${eqName}Q`);
    const qValue = document.getElementById(`${eqName}QValue`);
    if (qSlider && qValue) {
      qSlider.addEventListener("input", () => {
        eqParams.q = Number(qSlider.value);
        qValue.textContent = Number(eqParams.q).toFixed(1);
        markChangedSoon();
      });
      qValue.textContent = Number(eqParams.q).toFixed(1);
    }
  }

  function setSlider(id, value) {
    const slider = document.getElementById(id);
    if (!slider) return;
    slider.value = String(value);
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    if (window.UI?.updateRangeFill) window.UI.updateRangeFill(slider);
  }

  function applyPreset(index) {
    const safeIndex = Math.max(
      0,
      Math.min(FILTER_PRESETS.length - 1, Number(index) || 0),
    );
    const preset = FILTER_PRESETS[safeIndex];

    applyingPreset = true;
    loadedPresetIndex = safeIndex;
    filter.preset = safeIndex;

    setSlider("hpFreq", preset.hpFreq);
    setSlider("lpFreq", preset.lpFreq);

    ["eq1", "eq2", "eq3"].forEach((eqName) => {
      const eqPreset = preset[eqName];
      const eqParams = filter[eqName];
      setRange(eqName, eqParams, eqPreset.range, {
        resetFrequency: false,
      });
      setSlider(`${eqName}Freq`, eqPreset.freq);
      setSlider(`${eqName}Gain`, eqPreset.gain);
      setSlider(`${eqName}Q`, eqPreset.q);
    });

    const presetSlider = document.getElementById("filterPreset");
    const presetValue = document.getElementById("filterPresetValue");

    if (presetSlider) {
      presetSlider.value = String(safeIndex);
      if (window.UI?.updateRangeFill) window.UI.updateRangeFill(presetSlider);
    }

    if (presetValue) {
      presetValue.textContent = preset.name;
      presetValue.classList.remove("preset-modified");
    }

    applyingPreset = false;
    loadedPresetSnapshot = captureState();

    // Presets update all three bands, including hidden panels. Defer one full
    // visual refresh so every slider is correct when its band is later shown.
    requestAnimationFrame(() => {
      if (window.UI?.refreshRangeFills) window.UI.refreshRangeFills();
    });
  }

  const presetSlider = document.getElementById("filterPreset");
  const presetValue = document.getElementById("filterPresetValue");

  if (presetSlider && presetValue) {
    presetSlider.min = "0";
    presetSlider.max = String(FILTER_PRESETS.length - 1);
    presetSlider.step = "1";
    presetSlider.value = String(loadedPresetIndex);
    presetValue.textContent = FILTER_PRESETS[loadedPresetIndex].name;

    presetSlider.addEventListener("input", () => {
      applyPreset(Number(presetSlider.value));
    });

    loadedPresetSnapshot = captureState();
    updatePresetModifiedState();
  }

  function updateFreqDisplay(eqName, eqParams) {
    const freqValue = document.getElementById(`${eqName}FreqValue`);
    if (!freqValue) return;

    const rangeFreqs = EQ_FREQ_RANGES[eqParams.range];
    const freq = rangeFreqs[eqParams.freq] || 1000;
    const noteName = freqToNoteName(freq);
    const freqText = freq >= 1000
      ? (freq / 1000).toFixed(1) + "kHz"
      : Math.round(freq) + "Hz";

    freqValue.textContent = `${freqText} (${noteName})`;
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

  FilterController.applyPreset = applyPreset;
  FilterController.updatePresetModifiedState = updatePresetModifiedState;
  FilterController.refreshVisuals = () => {
    requestAnimationFrame(() => {
      if (window.UI?.refreshRangeFills) window.UI.refreshRangeFills();
    });
  };
};
