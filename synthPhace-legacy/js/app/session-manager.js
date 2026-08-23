// ============================================================
//  SESSION PERSISTENCE
// ============================================================
(function () {
  const STORAGE_KEY = "interphace_session";
  const SESSION_VERSION = 8;
  let autosaveTimer = 0;
  let suspended = false;

  function clonePatch(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function captureSession() {
    return {
      version: SESSION_VERSION,
      timestamp: Date.now(),
      patch: clonePatch(window.patch),
      ui: {
        chordPreset: Number(document.getElementById("chordPreset")?.value || 0),
        filterPreset: Number(document.getElementById("filterPreset")?.value || 0),
      },
    };
  }

  function saveSession() {
    if (suspended) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(captureSession()));
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  }

  function scheduleSave() {
    if (suspended) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(saveSession, 180);
  }

  function migrateV2(session) {
    const migrated = window.PatchState.createDefaultPatch();
    migrated.midiNote = session.midiNote ?? migrated.midiNote;
    migrated.tempo = session.tempo ?? migrated.tempo;
    migrated.scale = session.scale ?? "major";
    migrated.sampleRate = session.sampleRate ?? migrated.sampleRate;
    migrated.renderDuration = session.renderDuration ?? migrated.renderDuration;
    migrated.sampleStep = session.sampleStep ?? migrated.sampleStep;
    migrated.sampleRange = session.sampleRange ?? migrated.sampleRange;

    migrated.synth.fm = {
      carrierVolume: session.carrierVolume,
      harmonic1: { gain: session.harmonic1Gain, noteOffset: session.harmonic1Offset },
      harmonic2: { gain: session.harmonic2Gain, noteOffset: session.harmonic2Offset },
      modulators: [
        { gain: session.mod1Gain, ratio: session.mod1Ratio, wave: session.mod1Wave },
        { gain: session.mod2Gain, ratio: session.mod2Ratio, wave: session.mod2Wave },
      ],
      fmDepthPreset: session.fmDepthPreset,
    };

    migrated.envelope.ahdhd = {
      attack1: session.attack1,
      hold1: session.hold1,
      decay1: session.decay1,
      decay1Target: Number(session.decay1Target) > 1
        ? Number(session.decay1Target) / 100
        : session.decay1Target,
      hold2: session.hold2,
      decay2: session.decay2,
      envMult: session.envMult,
      instrumentBehavior: session.instrumentBehavior ?? 0,
      character: session.envelopeCharacter ?? session.envelopePersonality ?? 0,
    };

    migrated.filter = {
      lpFreq: session.lpFreq,
      hpFreq: session.hpFreq,
      eq1: { freq: session.eq1Freq, gain: session.eq1Gain, q: session.eq1Q, range: session.eq1Range || "low" },
      eq2: { freq: session.eq2Freq, gain: session.eq2Gain, q: session.eq2Q, range: session.eq2Range || "mid" },
      eq3: { freq: session.eq3Freq, gain: session.eq3Gain, q: session.eq3Q, range: session.eq3Range || "high" },
    };

    migrated.fx = {
      bitCrush: { preset: session.bitCrushPreset || 0 },
      stereoWidth: { preset: session.stereoWidthPreset },
      detune: { preset: session.detunePreset },
      chorus: { preset: session.chorusPreset },
      delay: { preset: session.delayPreset },
      reverb: { preset: session.reverbPreset },
      wetDryMix: session.wetDryMix,
      saturation: { preset: session.saturationPreset || 0 },
    };
    migrated.texture = { preset: 0, amount: session.textureAmount || 0 };
    migrated.transient = { preset: 0, volume: 35 };

    return {
      version: SESSION_VERSION,
      timestamp: session.timestamp || Date.now(),
      patch: migrated,
      ui: { chordPreset: Number(session.chordPreset || 0) },
    };
  }

  function migrateV3(session) {
    const migrated = clonePatch(session);
    migrated.version = SESSION_VERSION;
    migrated.patch = migrated.patch || {};
    const texture = migrated.patch.texture || { preset: 0, amount: 0 };
    const oldPreset = Number(texture.preset) || 0;
    const textureMap = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 0, 5: 0, 6: 4, 7: 5 };
    texture.preset = Object.prototype.hasOwnProperty.call(textureMap, oldPreset) ? textureMap[oldPreset] : 0;
    migrated.patch.texture = texture;
    // Build 85: Companion Source became Noise-section Transient Source.
    const legacyTransient = migrated.patch.transient || migrated.patch.companionPreview || { preset: 0, volume: 35 };
    migrated.patch.transient = {
      preset: Number(legacyTransient.preset) >= 0 && Number(legacyTransient.preset) <= 6 ? Number(legacyTransient.preset) : 0,
      volume: Math.max(0, Math.min(100, Number(legacyTransient.volume) || 0)),
    };
    delete migrated.patch.companionPreview;
    return migrated;
  }

  function migrateV4(session) {
    const migrated = clonePatch(session);
    migrated.version = SESSION_VERSION;
    migrated.patch = migrated.patch || {};
    const legacyTransient = migrated.patch.transient || migrated.patch.companionPreview || { preset: 0, volume: 35 };
    migrated.patch.transient = {
      // Build 84 index 7 was the retired slide experiment; invalid transient indices resolve to Off.
      preset: Number(legacyTransient.preset) >= 0 && Number(legacyTransient.preset) <= 6 ? Number(legacyTransient.preset) : 0,
      volume: Math.max(0, Math.min(100, Number(legacyTransient.volume) || 0)),
    };
    delete migrated.patch.companionPreview;
    return migrated;
  }

  function migrateV5(session) {
    const migrated = clonePatch(session);
    migrated.version = SESSION_VERSION;
    migrated.patch = migrated.patch || {};
    migrated.patch.envelope = migrated.patch.envelope || {};
    migrated.patch.envelope.ahdhd = migrated.patch.envelope.ahdhd || {};
    const env = migrated.patch.envelope.ahdhd;
    const oldCharacter = Number(env.character) || 0;
    const characterMap = { 0: 0, 1: 1, 2: 2, 5: 3, 9: 4, 10: 5, 11: 6, 12: 7 };
    const movedNoiseMap = { 3: 2, 4: 3, 6: 4, 7: 5, 8: 7 };
    env.character = Object.prototype.hasOwnProperty.call(characterMap, oldCharacter) ? characterMap[oldCharacter] : 0;

    const texture = migrated.patch.texture || { preset: 0, amount: 0 };
    const oldNoisePreset = Number(texture.preset) || 0;
    const noiseMap = { 0: 0, 1: 1, 2: 5, 3: 6, 4: 7, 5: 4 };
    texture.preset = Object.prototype.hasOwnProperty.call(noiseMap, oldNoisePreset) ? noiseMap[oldNoisePreset] : 0;
    if (texture.preset === 0 && Object.prototype.hasOwnProperty.call(movedNoiseMap, oldCharacter)) {
      texture.preset = movedNoiseMap[oldCharacter];
      if (!(Number(texture.amount) > 0)) texture.amount = 25;
    }
    migrated.patch.texture = texture;
    return migrated;
  }

  function migrateV6(session) {
    const migrated = clonePatch(session);
    migrated.version = SESSION_VERSION;
    migrated.patch = migrated.patch || {};
    migrated.patch.envelope = migrated.patch.envelope || {};
    migrated.patch.envelope.ahdhd = migrated.patch.envelope.ahdhd || {};
    const env = migrated.patch.envelope.ahdhd;
    const oldBehavior = Number(env.instrumentBehavior) || 0;
    // Build 93 intentional 12-preset behavior bank. Preserve semantics where possible.
    const behaviorMap = {
      0: 0,  // Off
      1: 1,  // Piano -> Bedroom Piano
      2: 2,  // Electric Piano
      3: 3,  // Bell
      4: 3,  // Chime -> Bell
      5: 7,  // Flute -> Woodwind
      6: 7,  // Clarinet -> Woodwind
      7: 6,  // Brass
      8: 9,  // Choir -> Pad
      9: 8,  // String
      10: 9, // Pad
      11: 9, // Organ -> Pad
      12: 4, // Mallet
      13: 5, // Pluck
      14: 10,// Drone
      15: 11 // Soft Attack
    };
    env.instrumentBehavior = Object.prototype.hasOwnProperty.call(behaviorMap, oldBehavior)
      ? behaviorMap[oldBehavior]
      : 0;
    return migrated;
  }


  function migrateV7(session) {
    const migrated = clonePatch(session);
    migrated.version = SESSION_VERSION;
    migrated.patch = migrated.patch || {};
    if (typeof ArpEngine !== "undefined") {
      migrated.patch.arp = ArpEngine.migrateLegacyState(migrated.patch.arp);
    }
    return migrated;
  }
  function migrateSession(raw) {
    if (!raw || typeof raw !== "object") return null;
    if (raw.version === SESSION_VERSION && raw.patch) return raw;
    if (raw.version === 7 && raw.patch) return migrateV7(raw);
    if (raw.version === 6 && raw.patch) return migrateV6(raw);
    if (raw.version === 5 && raw.patch) return migrateV5(raw);
    if (raw.version === 4 && raw.patch) return migrateV4(raw);
    if (raw.version === 3 && raw.patch) return migrateV3(raw);
    if (!raw.patch || raw.version === 2 || raw.version === undefined) return migrateV2(raw);
    return null;
  }

  function setSlider(id, value) {
    const slider = document.getElementById(id);
    if (!slider || value === undefined || value === null) return;
    slider.value = value;
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function setRatioButton(modIndex, ratio) {
    const row = document.querySelector(`[data-selector-group="fm-ratio"][data-mod="${modIndex}"]`);
    const button = row && Array.from(row.querySelectorAll("button[data-ratio]")).find(
      item => Number(item.dataset.ratio) === Number(ratio),
    );
    button?.click();
  }

  function setWaveButton(modIndex, wave) {
    const row = document.querySelector(`[data-selector-group="fm-wave"][data-mod="${modIndex}"]`);
    const button = row && Array.from(row.querySelectorAll("button[data-wave]")).find(
      item => item.dataset.wave === wave,
    );
    button?.click();
  }

  function applyPatchToUI(savedPatch, ui = {}, options = {}) {
    // Begin from current-build Init using the real UI paths. Convenience
    // preset selectors are descriptive; exact saved parameters are applied
    // immediately afterward and may leave those labels in their modified state.
    if (!options.preservePatchPreset) setSlider("preset", 0);
    setSlider("chordPreset", 0);
    setSlider("fmRatioPreset", 0);
    setSlider("filterPreset", 0);

    const fm = savedPatch.synth?.fm || {};
    const envelope = savedPatch.envelope?.ahdhd || {};
    const filter = savedPatch.filter || {};
    const fx = savedPatch.fx || {};
    const texture = savedPatch.texture || {};
    const transient = savedPatch.transient || savedPatch.companionPreview || {};

    setSlider("rootNote", savedPatch.midiNote);
    setSlider("tempo", savedPatch.tempo);
    if (window.ScaleEngine) {
      window.ScaleEngine.setScale(savedPatch.scale || "major", { refreshHarmonics: false });
      window.ScaleEngine.refreshHarmonics();
    }
    const arpState = typeof ArpEngine !== "undefined"
      ? ArpEngine.migrateLegacyState(savedPatch.arp)
      : savedPatch.arp;
    ["A", "B", "C", "D"].forEach(id => {
      const voice = arpState?.voices?.[id] || {};
      setSlider(`arp${id}Shape`, voice.shape ?? 0);
      setSlider(`arp${id}Motion`, voice.motion ?? 0);
      setSlider(`arp${id}Chance`, voice.chance ?? 0);
      if (typeof ArpEngine !== "undefined") ArpEngine.setVoiceRate(window.patch, id, voice.rate || arpState?.rate || "1/8");
    });
    if (typeof ArpEngine !== "undefined") {
      ArpEngine.setSequence(window.patch, arpState?.sequence ?? "");
    }
    setSlider("carrierVolume", fm.carrierVolume);
    // Load the remembered harmonic preset first, then restore the exact saved
    // harmonic values. This preserves a custom voicing while retaining the
    // preset as its dimmable starting point.
    setSlider("chordPreset", 0);
    setSlider("harmonic1Gain", fm.harmonic1?.gain);
    setSlider(
      "harmonic1Offset",
      window.ScaleEngine?.nearestAllowedSemitone(fm.harmonic1?.noteOffset || 0) ?? fm.harmonic1?.noteOffset,
    );
    setSlider("harmonic2Gain", fm.harmonic2?.gain);
    setSlider(
      "harmonic2Offset",
      window.ScaleEngine?.nearestAllowedSemitone(fm.harmonic2?.noteOffset || 0) ?? fm.harmonic2?.noteOffset,
    );
    setSlider("mod1Gain", fm.modulators?.[0]?.gain);
    setSlider("mod2Gain", fm.modulators?.[1]?.gain);
    setSlider("fmDepthPreset", fm.fmDepthPreset);
    setRatioButton(1, fm.modulators?.[0]?.ratio);
    setRatioButton(2, fm.modulators?.[1]?.ratio);
    setWaveButton(1, fm.modulators?.[0]?.wave);
    setWaveButton(2, fm.modulators?.[1]?.wave);

    setSlider("attack1", envelope.attack1);
    setSlider("hold1", envelope.hold1);
    setSlider("decay1", envelope.decay1);
    setSlider("decay1Target", Number(envelope.decay1Target) * 100);
    setSlider("hold2", envelope.hold2);
    setSlider("decay2", envelope.decay2);
    setSlider("envMult", envelope.envMult);
    setSlider("instrumentBehavior", envelope.instrumentBehavior ?? 0);
    setSlider("envelopeCharacter", envelope.character ?? 0);

    setSlider("filterPreset", 0);
    setSlider("lpFreq", filter.lpFreq);
    setSlider("hpFreq", filter.hpFreq);
    [1, 2, 3].forEach(index => {
      const eq = filter[`eq${index}`] || {};
      const rangeButton = document.querySelector(
        `#eq${index}Range button[data-range="${eq.range}"]`,
      );
      rangeButton?.click();
      setSlider(`eq${index}Freq`, eq.freq);
      setSlider(`eq${index}Gain`, eq.gain);
      setSlider(`eq${index}Q`, eq.q);
    });
    requestAnimationFrame(() =>
      FilterController.updatePresetModifiedState?.()
    );

    setSlider("bitCrushPreset", fx.bitCrush?.preset);
    setSlider("stereoWidthPreset", fx.stereoWidth?.preset);
    setSlider("detunePreset", fx.detune?.preset);
    setSlider("chorusPreset", fx.chorus?.preset);
    setSlider("delayPreset", fx.delay?.preset);
    setSlider("reverbPreset", fx.reverb?.preset);
    setSlider("wetDryMix", fx.wetDryMix);
    setSlider("saturationPreset", fx.saturation?.preset);

    setSlider("texturePreset", texture.preset);
    setSlider("textureAmount", texture.amount);
    setSlider("transientSourcePreset", Number(transient.preset) >= 0 && Number(transient.preset) <= 6 ? Number(transient.preset) : 0);
    setSlider("transientSourceVolume", transient.volume ?? 35);
  }

  function createCurrentInitPatch() {
    const initPatch = window.PatchState.createDefaultPatch();
    if (typeof FMEngine !== "undefined") FMEngine.register(initPatch);
    if (typeof AmpEnvelopeEngine !== "undefined") AmpEnvelopeEngine.register(initPatch);
    if (typeof FilterEngine !== "undefined") FilterEngine.register(initPatch);
    if (typeof EffectsEngine !== "undefined") EffectsEngine.register(initPatch);
    if (typeof TextureEngine !== "undefined") TextureEngine.register(initPatch);
    if (typeof TransientSourceEngine !== "undefined") TransientSourceEngine.register(initPatch);
    if (typeof ArpEngine !== "undefined") ArpEngine.register(initPatch);
    return initPatch;
  }

  function overlayKnown(base, incoming) {
    if (incoming === undefined || incoming === null) return clonePatch(base);
    if (Array.isArray(base)) {
      if (!Array.isArray(incoming)) return clonePatch(base);
      return base.map((item, index) => overlayKnown(item, incoming[index]));
    }
    if (base && typeof base === "object") {
      const output = {};
      Object.keys(base).forEach(key => {
        output[key] = overlayKnown(base[key], incoming && typeof incoming === "object" ? incoming[key] : undefined);
      });
      return output;
    }
    if (typeof incoming !== typeof base) return base;
    if (typeof base === "number" && !Number.isFinite(Number(incoming))) return base;
    return incoming;
  }

  function normalizeImportedPatch(importedPatch) {
    const initPatch = createCurrentInitPatch();
    const sourcePatch = clonePatch(importedPatch || {});
    if (typeof ArpEngine !== "undefined") {
      sourcePatch.arp = ArpEngine.migrateLegacyState(sourcePatch.arp);
    }
    if (!sourcePatch.transient && sourcePatch.companionPreview) {
      sourcePatch.transient = {
        preset: Number(sourcePatch.companionPreview.preset) >= 0 && Number(sourcePatch.companionPreview.preset) <= 6 ? Number(sourcePatch.companionPreview.preset) : 0,
        volume: Math.max(0, Math.min(100, Number(sourcePatch.companionPreview.volume) || 0)),
      };
    }
    delete sourcePatch.companionPreview;
    const normalized = overlayKnown(initPatch, sourcePatch);
    // Build 61 output format is fixed. Old patch files cannot reintroduce
    // removed Render options.
    normalized.sampleRate = 48000;
    return normalized;
  }

  function loadExternalPatch(importedPatch, ui = {}) {
    const normalized = normalizeImportedPatch(importedPatch);
    suspended = true;
    applyPatchToUI(normalized, ui);
    suspended = false;
    saveSession();
    return normalized;
  }

  function loadSession() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const session = migrateSession(JSON.parse(stored));
      if (!session) throw new Error("Unsupported session format");
      suspended = true;
      applyPatchToUI(session.patch, session.ui);
      suspended = false;
      saveSession();
    } catch (error) {
      suspended = false;
      console.error("Failed to load session:", error);
    }
  }

  function setupAutoSave() {
    document.addEventListener("input", event => {
      if (event.target?.type === "range") scheduleSave();
    });
    document.addEventListener("click", event => {
      if (event.target.closest(".ui-selector-btn")) scheduleSave();
    });
  }

  window.SessionManager = Object.freeze({ saveSession, loadSession, setupAutoSave, applyPatchToUI, normalizeImportedPatch, loadExternalPatch });
  window.saveSession = saveSession;
  window.loadSession = loadSession;
  window.setupAutoSave = setupAutoSave;
})();
