(() => {
  "use strict";

  const PROJECT_STORAGE_KEY = "interPhace.interPhace.ui.v2";
  const SYNTH_PATCH_STORAGE_KEY = "interPhace.synthPhace.patch.v1";
  const PATCH_VERSION = 5;
  const PRETTY_DEFAULT = Object.freeze({ voice: 0, body: 60, harmonics: 28, spread: 0, level: 78, strike: 12, bloom: 45, damp: 35, color: 14, resonance: 14, blend: 55, preset: 0 });
  const PRETTY_ENVELOPE_DEFAULT = Object.freeze({ attack: 15, bodyDecay: 42, overtoneDecay: 25, damp: 45, release: 18 });

  const DATA = window.SynthPhaceControlData;
  if (!DATA) throw new Error("synthPhace control data missing before patch adapter");

  const scaleIds = DATA.scales.map((scale) => scale.id);

  const SCALE_INTERVALS = Object.freeze(
    Object.fromEntries(DATA.scales.map((scale) => [scale.id, Object.freeze([...scale.intervals])])),
  );

  const SEVEN_NOTE_SCALES = Object.freeze(["major", "minor", "dorian"]);
  const FIVE_NOTE_SCALES = Object.freeze(["majorPentatonic", "minorPentatonic", "hirajoshi"]);

  // Explicit authored correspondence from each 5-note scale into 7-note degree space.
  // Values are zero-based 7-note degree indices. These are authored musical mappings,
  // never nearest-note calculations.
  const FIVE_TO_SEVEN_DEGREE_MAP = Object.freeze({
    majorPentatonic: Object.freeze([0, 1, 2, 4, 5]), // 1,2,3,5,6
    minorPentatonic: Object.freeze([0, 2, 3, 4, 6]), // 1,3,4,5,7
    hirajoshi:       Object.freeze([0, 1, 2, 4, 5]), // 1,2,b3,5,b6
  });

  function scaleFamily(scaleId) {
    if (SEVEN_NOTE_SCALES.includes(scaleId)) return 7;
    if (FIVE_NOTE_SCALES.includes(scaleId)) return 5;
    throw new Error(`Unknown synthPhace scale "${scaleId}".`);
  }

  function harmonyPositionForScale(offset, scaleId) {
    const intervals = SCALE_INTERVALS[scaleId];
    if (!intervals) throw new Error(`Unknown synthPhace scale "${scaleId}".`);
    const value = Number(offset);
    if (!Number.isInteger(value)) {
      throw new Error(`Harmony offset ${offset} is not an exact semitone value.`);
    }
    const octave = Math.floor(value / 12);
    const pitchClass = ((value % 12) + 12) % 12;
    const degree = intervals.indexOf(pitchClass);
    if (degree < 0) {
      throw new Error(`Harmony offset ${offset} is not a legal degree of ${scaleId}.`);
    }
    return Object.freeze({ degree, octave, semitone: value });
  }

  function harmonyOffsetFromPosition(position, authoredScale, destinationScale) {
    const fromFamily = scaleFamily(authoredScale);
    const toFamily = scaleFamily(destinationScale);
    const destinationIntervals = SCALE_INTERVALS[destinationScale];
    if (!position || !Number.isInteger(Number(position.degree)) || !Number.isInteger(Number(position.octave))) {
      throw new Error("Saved patch harmony metadata is incomplete.");
    }

    let destinationDegree = Number(position.degree);

    if (fromFamily === 5 && toFamily === 7) {
      const map = FIVE_TO_SEVEN_DEGREE_MAP[authoredScale];
      if (!map || destinationDegree < 0 || destinationDegree >= map.length) {
        throw new Error(`No authored 5→7 harmony mapping for ${authoredScale} degree ${destinationDegree + 1}.`);
      }
      destinationDegree = map[destinationDegree];
    } else if (fromFamily !== toFamily) {
      // 7→5 is intentionally unresolved. Do not collapse a seven-degree harmony by guessing.
      throw new Error(
        `Saved patch harmony ${authoredScale}→${destinationScale} requires an explicit 7→5 design decision.`,
      );
    }

    if (destinationDegree < 0 || destinationDegree >= destinationIntervals.length) {
      throw new Error(
        `Harmony degree ${destinationDegree + 1} does not exist in destination scale ${destinationScale}.`,
      );
    }
    return Number(destinationIntervals[destinationDegree]) + (12 * Number(position.octave));
  }

  function translateSavedPatchHarmonies(patch, destinationScale) {
    const clean = clone(patch);
    const context = clean.harmonyContext;
    if (!context?.authoredScale) return clean;

    const authoredScale = context.authoredScale;
    const fm = clean.synth?.fm;
    if (!fm) return clean;

    if (fm.harmonic1 && context.harmonic1) {
      fm.harmonic1.noteOffset = harmonyOffsetFromPosition(
        context.harmonic1,
        authoredScale,
        destinationScale,
      );
    }
    if (fm.harmonic2 && context.harmonic2) {
      fm.harmonic2.noteOffset = harmonyOffsetFromPosition(
        context.harmonic2,
        authoredScale,
        destinationScale,
      );
    }
    return clean;
  }


  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function number(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, number(value, minimum)));
  }

  function readProjectState() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY) || "null");
      return saved && typeof saved === "object" ? saved : {};
    } catch (_) {
      return {};
    }
  }

  function selectedEngineMode() {
    return readProjectState()?.child?.synthEngine === "pretty" ? "pretty" : "fm";
  }

  function readProjectContext() {
    const project = readProjectState().project || {};

    let rootNote = Math.round(number(project.root, 60));
    if (rootNote >= 0 && rootNote <= 11) rootNote += 60;
    rootNote = Math.max(21, Math.min(108, rootNote));

    const scaleIndex = Math.max(
      0,
      Math.min(scaleIds.length - 1, Math.round(number(project.scale, 0))),
    );
    const scaleId = scaleIds[scaleIndex] || "major";

    const tempo = clamp(number(project.tempo, 75), 30, 300);

    return Object.freeze({
      rootNote,
      scaleId,
      scaleIndex,
      tempo,
    });
  }

  function inputValue(id, fallback = 0) {
    const input = document.getElementById(id);
    return input ? number(input.value, fallback) : fallback;
  }

  function eqPatch(pageId, eqName, eqRanges) {
    const range = eqRanges?.[eqName] || ({ eq1: "low", eq2: "mid", eq3: "high" })[eqName];
    return {
      freq: Math.round(inputValue(`${pageId}_frequency`, 0)),
      gain: inputValue(`${pageId}_gain`, 0),
      q: inputValue(`${pageId}_q`, 1),
      range: DATA.filters.EQ_FREQ_RANGES[range] ? range : "all",
    };
  }

  function captureSynthPatch(uiState = {}) {
    const values = uiState.values || {};
    const ratioValues = DATA.fmRatioValues;
    const waveValues = ["sine", "square", "saw"];

    const mod1RatioIndex = Math.round(inputValue("app2_b1_p2_mod1Ratio", values.mod1Ratio ?? 2));
    const mod2RatioIndex = Math.round(inputValue("app2_b1_p2_mod2Ratio", values.mod2Ratio ?? 5));
    const mod1WaveIndex = Math.round(inputValue("app2_b1_p2_mod1Wave", values.mod1Wave ?? 0));
    const mod2WaveIndex = Math.round(inputValue("app2_b1_p2_mod2Wave", values.mod2Wave ?? 0));

    const projectContext = readProjectContext();
    const harmony1Offset = inputValue("app2_b1_p1_harmony1Offset", values.harmony1Offset ?? 0);
    const harmony2Offset = inputValue("app2_b1_p1_harmony2Offset", values.harmony2Offset ?? 0);

    return {
      version: PATCH_VERSION,
      harmonyContext: {
        authoredScale: projectContext.scaleId,
        harmonic1: harmonyPositionForScale(harmony1Offset, projectContext.scaleId),
        harmonic2: harmonyPositionForScale(harmony2Offset, projectContext.scaleId),
      },

      synth: {
        engine: { mode: selectedEngineMode() },
        pretty: {
          voice: inputValue("app2_b1_p1_pretty_voice", values.prettyVoice ?? PRETTY_DEFAULT.voice),
          body: inputValue("app2_b1_p1_pretty_body", values.prettyBody ?? PRETTY_DEFAULT.body),
          harmonics: inputValue("app2_b1_p1_pretty_harmonics", values.prettyHarmonics ?? PRETTY_DEFAULT.harmonics),
          spread: inputValue("app2_b1_p1_pretty_spread", values.prettySpread ?? PRETTY_DEFAULT.spread),
          level: inputValue("app2_b1_p1_pretty_level", values.prettyLevel ?? PRETTY_DEFAULT.level),
          strike: inputValue("app2_b1_p2_pretty_strike", values.prettyStrike ?? PRETTY_DEFAULT.strike),
          bloom: inputValue("app2_b1_p2_pretty_bloom", values.prettyBloom ?? PRETTY_DEFAULT.bloom),
          damp: inputValue("app2_b1_p2_pretty_damp", values.prettyDamp ?? PRETTY_DEFAULT.damp),
          color: inputValue("app2_b1_p2_pretty_color", values.prettyColor ?? PRETTY_DEFAULT.color),
          resonance: inputValue("app2_b1_p2_pretty_resonance", values.prettyResonance ?? PRETTY_DEFAULT.resonance),
          blend: inputValue("app2_b1_p2_pretty_blend", values.prettyBlend ?? PRETTY_DEFAULT.blend),
          preset: Math.round(inputValue("app2_b1_p2_pretty_preset", values.prettyPreset ?? 0)),
        },
        prettyEnvelope: {
          attack: inputValue("app2_b4_p1_pretty_attack", values.prettyAttack ?? PRETTY_ENVELOPE_DEFAULT.attack),
          bodyDecay: inputValue("app2_b4_p1_pretty_bodyDecay", values.prettyBodyDecay ?? PRETTY_ENVELOPE_DEFAULT.bodyDecay),
          overtoneDecay: inputValue("app2_b4_p1_pretty_overtoneDecay", values.prettyOvertoneDecay ?? PRETTY_ENVELOPE_DEFAULT.overtoneDecay),
          damp: inputValue("app2_b4_p1_pretty_damp", values.prettyEnvelopeDamp ?? PRETTY_ENVELOPE_DEFAULT.damp),
          release: inputValue("app2_b4_p1_pretty_release", values.prettyRelease ?? PRETTY_ENVELOPE_DEFAULT.release),
        },
        fm: {
          carrierVolume: inputValue("app2_b1_p1_carrierVolume", values.carrierVolume ?? 100),
          harmonics: inputValue("app2_b1_p1_harmonics", values.harmonics ?? 0),
          harmonic1: {
            gain: inputValue("app2_b1_p1_harmony1Volume", values.harmony1Volume ?? 0),
            noteOffset: harmony1Offset,
          },
          harmonic2: {
            gain: inputValue("app2_b1_p1_harmony2Volume", values.harmony2Volume ?? 0),
            noteOffset: harmony2Offset,
          },
          modulators: [
            {
              gain: inputValue("app2_b1_p2_mod1Amount", values.mod1Amount ?? 0),
              ratio: ratioValues[mod1RatioIndex] ?? 1,
              wave: waveValues[mod1WaveIndex] || "sine",
            },
            {
              gain: inputValue("app2_b1_p2_mod2Amount", values.mod2Amount ?? 0),
              ratio: ratioValues[mod2RatioIndex] ?? 2,
              wave: waveValues[mod2WaveIndex] || "sine",
            },
          ],
          fmDepthPreset: Math.round(inputValue("app2_b1_p2_mod1Shape", values.mod1Shape ?? 0)),
          ratioPreset: Math.round(inputValue("app2_b1_p2_ratioPreset", values.ratioPreset ?? 0)),
          chordPreset: Math.round(inputValue("app2_b1_p1_chordPreset", values.chordPreset ?? 0)),
        },
      },

      envelope: {
        drawn: {
          active: selectedEngineMode() === "fm" && Number(uiState.b4Page) === 3,
          valid: !!uiState.drawnEnvelope?.valid,
          duration: inputValue("app2_b4_p3_length", values.drawnEnvelopeLength ?? 2),
          curve: Array.isArray(uiState.drawnEnvelope?.curve) ? uiState.drawnEnvelope.curve.slice(0, 256) : [],
        },
        ahdhd: {
          attack1: inputValue("app2_b4_p1_attack", values.attack ?? 0.04),
          hold1: inputValue("app2_b4_p1_hold1", values.hold1 ?? 0),
          decay1: inputValue("app2_b4_p1_decay1", values.decay1 ?? 0.8),
          decay1Target: inputValue("app2_b4_p1_decayPercent", values.decayPercent ?? 10) / 100,
          hold2: inputValue("app2_b4_p1_hold2", values.hold2 ?? 1.5),
          decay2: inputValue("app2_b4_p1_decay2", values.decay2 ?? 0.9),
          envMult: inputValue("app2_b4_p1_timeMultiplier", values.timeMultiplier ?? 1),
          instrumentBehavior: Math.round(
            inputValue("app2_b1_p3_instrumentBehavior", values.instrumentBehavior ?? 0),
          ),
          character: Math.round(
            inputValue("app2_b1_p3_instrumentCharacter", values.instrumentCharacter ?? 0),
          ),
        },
      },

      filter: {
        lpFreq: Math.round(inputValue("app2_b3_p1_highCut", values.highCut ?? 25)),
        hpFreq: Math.round(inputValue("app2_b3_p1_lowCut", values.lowCut ?? 0)),
        eq1: eqPatch("app2_b3_p2", "eq1", uiState.eqRanges),
        eq2: eqPatch("app2_b3_p3", "eq2", uiState.eqRanges),
        eq3: eqPatch("app2_b3_p4", "eq3", uiState.eqRanges),
      },

      texture: { preset: Math.round(inputValue("app2_b1_p4_texturePreset", values.texturePreset ?? 0)), amount: inputValue("app2_b1_p4_textureAmount", values.textureAmount ?? 0) },
      transient: { preset: Math.round(inputValue("app2_b1_p4_transientPreset", values.transientPreset ?? 0)), volume: inputValue("app2_b1_p4_transientVolume", values.transientVolume ?? 35) },
      sharedWetDry: 100,
      fx: {
        bitCrush:{preset:Math.round(inputValue("app2_b2_p1_bitCrushPreset",values.bitCrushPreset??0)),wet:inputValue("app2_b2_p1_bitCrushPresetWet",values.bitCrushPresetWet??100)},
        saturation:{preset:Math.round(inputValue("app2_b2_p2_saturationPreset",values.saturationPreset??0)),wet:inputValue("app2_b2_p2_saturationPresetWet",values.saturationPresetWet??100)},
        stereoWidth:{preset:Math.round(inputValue("app2_b2_p3_widthPreset",values.widthPreset??0)),wet:inputValue("app2_b2_p3_widthPresetWet",values.widthPresetWet??100)},
        detune:{preset:Math.round(inputValue("app2_b2_p4_detunePreset",values.detunePreset??0)),wet:inputValue("app2_b2_p4_detunePresetWet",values.detunePresetWet??100)},
        chorus:{preset:Math.round(inputValue("app2_b2_p5_chorusPreset",values.chorusPreset??0)),wet:inputValue("app2_b2_p5_chorusPresetWet",values.chorusPresetWet??100)},
        delay:{preset:Math.round(inputValue("app2_b2_p6_delayPreset",values.delayPreset??0)),wet:inputValue("app2_b2_p6_delayPresetWet",values.delayPresetWet??100)},
        reverb:{preset:Math.round(inputValue("app2_b2_p7_reverbPreset",values.reverbPreset??0)),wet:inputValue("app2_b2_p7_reverbPresetWet",values.reverbPresetWet??100)},
        convolution:{preset:Math.round(inputValue("app2_b2_p1_convolutionPreset",values.convolutionPreset??0)),wet:inputValue("app2_b2_p2_convolutionWet",values.convolutionWet??0)}
      },
    };
  }

  function saveSynthPatch(patch) {
    const cleanPatch = clone(patch);
    localStorage.setItem(SYNTH_PATCH_STORAGE_KEY, JSON.stringify(cleanPatch));
    return cleanPatch;
  }

  function captureAndSave(uiState = {}) {
    return saveSynthPatch(captureSynthPatch(uiState));
  }

  function readSynthPatch() {
    try {
      const saved = JSON.parse(localStorage.getItem(SYNTH_PATCH_STORAGE_KEY) || "null");
      if (saved && typeof saved === "object" && [2, 3, 4, PATCH_VERSION].includes(Number(saved.version))) {
        const migrated = clone(saved);
        migrated.version = PATCH_VERSION;
        migrated.synth ||= {};
        migrated.synth.engine ||= { mode: "fm" };
        migrated.synth.pretty = { ...PRETTY_DEFAULT, ...(migrated.synth.pretty || {}) };
        migrated.synth.prettyEnvelope = { ...PRETTY_ENVELOPE_DEFAULT, ...(migrated.synth.prettyEnvelope || {}) };
        migrated.envelope ||= {};
        migrated.envelope.drawn ||= { active: false, valid: false, duration: 2, curve: [] };
        return migrated;
      }
    } catch (_) {}
    return null;
  }

  // Transitional compatibility object for the frozen legacy engines.
  // Root Note, Scale, and Tempo are injected from interPhace at request time;
  // they are deliberately not stored inside the canonical synthPhace patch.
  function toLegacyPatch(synthPatch = readSynthPatch(), projectContext = readProjectContext()) {
    const rawPatch = clone(synthPatch || captureSynthPatch());
    const patch = rawPatch.harmonyContext?.authoredScale &&
      rawPatch.harmonyContext.authoredScale !== projectContext.scaleId
      ? translateSavedPatchHarmonies(rawPatch, projectContext.scaleId)
      : rawPatch;
    return {
      midiNote: projectContext.rootNote,
      scale: projectContext.scaleId,
      tempo: projectContext.tempo,
      sampleRate: 48000,
      synth: patch.synth || { fm: {} },
      envelope: patch.envelope || { ahdhd: {} },
      filter: patch.filter || {},
      fx: {
        bitCrush: { preset: 0 },
        saturation: { preset: 0 },
        wetDryMix: 100,
        ...(patch.fx || {}),
      },
      texture: patch.texture || { preset: 0, amount: 0 },
      transient: patch.transient || { preset: 0, volume: 35 },
      arp: {
        sequence: "",
        voices: {
          A: { shape: 0, motion: 0, chance: 0, rate: "1/8" },
          B: { shape: 0, motion: 0, chance: 0, rate: "1/8" },
          C: { shape: 0, motion: 0, chance: 0, rate: "1/8" },
          D: { shape: 0, motion: 0, chance: 0, rate: "1/8" },
        },
      },
    };
  }

  function getLegacyPatch() {
    return toLegacyPatch(readSynthPatch() || captureSynthPatch(), readProjectContext());
  }

  window.SynthPhacePatchAdapter = Object.freeze({
    PROJECT_STORAGE_KEY,
    SYNTH_PATCH_STORAGE_KEY,
    PATCH_VERSION,
    PRETTY_DEFAULT,
    FIVE_TO_SEVEN_DEGREE_MAP,
    readProjectContext,
    harmonyPositionForScale,
    harmonyOffsetFromPosition,
    translateSavedPatchHarmonies,
    captureSynthPatch,
    captureAndSave,
    readSynthPatch,
    saveSynthPatch,
    toLegacyPatch,
    getLegacyPatch,
  });
})();
