// ============================================================
//  ARPEGGIATOR ENGINE — BUILD 96 / ARP ARRANGEMENT SYSTEM
//  Four independent one-bar arp voices (A/B/C/D).
//  Shape = melodic phrase across one bar, including phrase-level rests.
//  Motion = rhythmic mask + gate articulation.
//  Chance = per-step performance variation only.
//  Rate = per-voice rhythmic grid.
//  Sequence = one-bar tokens that arrange active arp voices.
// ============================================================

window.ArpEngine = (() => {
  const REST = null;
  const VOICE_IDS = Object.freeze(["A", "B", "C", "D"]);
  const RATES = Object.freeze(["1/16", "1/8", "1/4", "1/2"]);
  const RATE_STEPS_PER_BAR = Object.freeze({ "1/16": 16, "1/8": 8, "1/4": 4, "1/2": 2 });
  const RATE_BEATS = Object.freeze({ "1/16": .25, "1/8": .5, "1/4": 1, "1/2": 2 });

  // Shape phrases are authored on a normalized 16-cell bar. They are sampled
  // onto each voice's selected rate, so every shape remains exactly one bar long.
  const SHAPES = Object.freeze([
    { name: "Off", phrase: Array(16).fill(REST) },
    { name: "Up", phrase: [0,2,4,5,7,9,11,12,14,16,17,19,21,23,24,24] },
    { name: "Down", phrase: [24,24,23,21,19,17,16,14,12,11,9,7,5,4,2,0] },
    { name: "Up Down", phrase: [0,2,4,7,9,12,16,19,16,12,9,7,4,2,0,0] },
    { name: "Down Up", phrase: [19,16,12,9,7,4,2,0,2,4,7,9,12,16,19,19] },
    { name: "Up Rest", phrase: [0,2,4,7,9,12,16,19,REST,REST,REST,REST,REST,REST,REST,REST] },
    { name: "Down Rest", phrase: [19,16,12,9,7,4,2,0,REST,REST,REST,REST,REST,REST,REST,REST] },
    { name: "Rest Up", phrase: [REST,REST,REST,REST,REST,REST,REST,REST,0,2,4,7,9,12,16,19] },
    { name: "Rest Down", phrase: [REST,REST,REST,REST,REST,REST,REST,REST,19,16,12,9,7,4,2,0] },
    { name: "Fifth Hops", phrase: [0,7,12,7,14,7,19,12,7,0,12,19,14,7,12,0] },
    { name: "Dark Steps", phrase: [0,3,7,10,12,10,7,3,0,3,10,12,15,12,10,7] },
    { name: "Bright Steps", phrase: [0,4,7,11,12,16,19,23,19,16,12,11,7,4,0,4] },
    { name: "Skip Climb", phrase: [0,7,2,9,4,12,7,14,9,16,12,19,14,21,16,24] },
    { name: "Broken Seven", phrase: [0,7,10,3,12,10,7,3,14,7,17,10,19,12,10,7] },
    { name: "Octave Ladder", phrase: [0,12,2,14,4,16,7,19,9,21,12,24,7,19,0,12] },
    { name: "Walk", phrase: [0,2,4,5,7,5,4,2,0,2,4,7,9,7,4,2] },
    { name: "Run", phrase: [0,2,4,5,7,9,11,12,14,12,11,9,7,5,4,2] },
    { name: "Stagger", phrase: [0,4,2,7,5,9,7,12,9,14,12,16,14,19,16,12] },
    { name: "Wide", phrase: [0,12,4,16,7,19,11,23,12,24,7,19,4,16,0,12] },
    { name: "Pendulum", phrase: [0,7,12,7,2,7,14,7,4,7,16,7,5,7,12,7] },
    { name: "Sparse Climb", phrase: [0,REST,4,REST,7,REST,12,REST,14,REST,16,REST,19,REST,24,REST] },
    { name: "Sparse Fall", phrase: [24,REST,19,REST,16,REST,14,REST,12,REST,7,REST,4,REST,0,REST] },
    { name: "Drift", phrase: [0,7,3,10,12,7,4,9,14,7,2,11,16,9,4,12] },
    { name: "Turnaround", phrase: [0,4,7,12,16,12,9,7,4,2,0,2,4,7,4,0] },
    { name: "Answer", phrase: [0,4,7,12,REST,REST,7,4,12,9,7,4,REST,2,4,0] },
    { name: "Call Rest", phrase: [0,4,7,12,7,4,0,REST,REST,REST,REST,REST,REST,REST,REST,REST] },
    { name: "Two Calls", phrase: [0,4,7,12,REST,REST,REST,REST,0,7,12,16,REST,REST,REST,REST] },
    { name: "Rise Fall Rest", phrase: [0,4,7,12,16,12,7,4,REST,REST,REST,REST,REST,REST,REST,REST] },
    { name: "High Answer", phrase: [0,4,7,12,REST,7,4,0,12,16,19,24,REST,19,16,12] },
    { name: "Low Answer", phrase: [12,16,19,24,REST,19,16,12,0,4,7,12,REST,7,4,0] },
    { name: "Orbit", phrase: [0,12,7,19,4,16,9,21,7,19,2,14,11,23,7,19] },
    { name: "Broken Rest", phrase: [0,7,REST,3,12,REST,10,7,REST,14,7,REST,17,10,REST,7] },
    { name: "Long Arc", phrase: [0,2,4,7,9,12,16,19,23,19,16,12,9,7,4,0] },
  ]);

  // Motion is rate-independent. The 16-cell mask is sampled onto the current
  // Rate grid; gate is the fraction of each grid step that may sound.
  const MOTIONS = Object.freeze([
    { name: "Straight", mask: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], gate: .74 },
    { name: "Tight", mask: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], gate: .48 },
    { name: "Legato", mask: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], gate: .94 },
    { name: "Pulse", mask: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], gate: .72 },
    { name: "Back Pulse", mask: [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1], gate: .72 },
    { name: "Bounce", mask: [1,0,1,1,0,1,1,0,1,0,1,1,0,1,1,0], gate: .70 },
    { name: "Syncopate", mask: [1,0,1,1,0,1,0,1,1,0,1,0,1,1,0,1], gate: .68 },
    { name: "Stagger", mask: [1,0,1,1,0,1,0,1,1,0,0,1,1,0,1,0], gate: .72 },
    { name: "Skip", mask: [1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1], gate: .68 },
    { name: "Late", mask: [0,1,1,0,1,1,0,1,0,1,1,0,1,1,0,1], gate: .70 },
    { name: "Three Two", mask: [1,1,1,0,1,1,0,1,1,1,0,1,1,0,1,0], gate: .70 },
    { name: "Broken", mask: [1,1,0,0,1,0,1,1,0,1,0,0,1,1,0,1], gate: .66 },
    { name: "Sparse", mask: [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1], gate: .76 },
    { name: "Drift", mask: [1,1,0,1,0,0,1,1,0,1,0,1,0,0,1,0], gate: .80 },
    { name: "Open Drift", mask: [1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0], gate: .90 },
    { name: "First Half", mask: [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0], gate: .76 },
    { name: "Second Half", mask: [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1], gate: .76 },
    { name: "Quarter Hits", mask: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], gate: .84 },
    { name: "Offbeats", mask: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], gate: .78 },
    { name: "Push Pull", mask: [1,0,1,0,0,1,0,1,1,0,0,1,0,1,0,0], gate: .70 },
    { name: "Cluster", mask: [1,1,1,0,0,0,1,1,1,0,0,0,1,1,0,0], gate: .64 },
    { name: "Scatter", mask: [1,0,0,1,0,1,0,0,0,1,0,0,1,0,1,0], gate: .74 },
    { name: "Long Gate", mask: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], gate: .96 },
    { name: "Chop", mask: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], gate: .34 },

    // Restored from the Build 95 Motion bank. Rate is now global, so these
    // preserve the old rhythmic masks and gate personalities without carrying
    // their former embedded rate. They are appended so Build 96 motion indices
    // remain stable.
    { name: "Flash",       mask: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], gate: .54 },
    { name: "Burst",       mask: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], gate: .58 },
    { name: "Sprint",      mask: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], gate: .62 },
    { name: "Skip Run",    mask: [1,1,0,1,1,0,1,1,1,1,0,1,1,0,1,1], gate: .60 },
    { name: "Stutter",     mask: [1,1,1,0,1,0,0,1,1,1,1,0,1,0,0,1], gate: .56 },
    { name: "Quick Pulse", mask: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], gate: .66 },
    { name: "Walk",        mask: [1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0], gate: .78 },
    { name: "Slow Skip",   mask: [1,0,1,0,1,1,0,1,1,0,1,0,1,1,0,1], gate: .80 },
    { name: "Long Walk",   mask: [1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1], gate: .84 },
    { name: "Half Pulse",  mask: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], gate: .86 },
    { name: "Long Drift",  mask: [1,0,0,1,0,1,0,0,1,0,0,1,1,0,0,1], gate: .90 },
  ]);

  const CHANCE_PRESETS = Object.freeze([
    { name: "Off",   skip: 0.00, volume: 0.00, note: 0.00, volumeDipMin: 1.00, volumeDipMax: 1.00 },
    { name: "Human", skip: 0.00, volume: 0.24, note: 0.00, volumeDipMin: 0.90, volumeDipMax: 0.98 },
    { name: "Ghost", skip: 0.00, volume: 0.20, note: 0.00, volumeDipMin: 0.68, volumeDipMax: 0.84 },
    { name: "Skip",  skip: 0.14, volume: 0.00, note: 0.00, volumeDipMin: 1.00, volumeDipMax: 1.00 },
    { name: "Note",  skip: 0.00, volume: 0.00, note: 0.14, volumeDipMin: 1.00, volumeDipMax: 1.00 },
    { name: "Loose", skip: 0.08, volume: 0.24, note: 0.06, volumeDipMin: 0.82, volumeDipMax: 0.95 },
    { name: "Alive", skip: 0.10, volume: 0.28, note: 0.10, volumeDipMin: 0.78, volumeDipMax: 0.94 },
    { name: "Wild",  skip: 0.18, volume: 0.34, note: 0.18, volumeDipMin: 0.72, volumeDipMax: 0.92 },
  ]);

  let sequenceUI = null;

  function voiceDefaults(rate = "1/8") { return { shape: 0, motion: 0, chance: 0, rate: normalizeRate(rate) }; }

  function normalizeRate(value) {
    return RATES.includes(value) ? value : "1/8";
  }

  function legacyMotionRate(index) {
    if (index <= 4) return "1/16";
    if (index <= 10) return "1/8";
    if (index <= 13) return "1/4";
    return "1/2";
  }

  // Approximate semantic mapping from the pre-96 combined Motion bank to the
  // new rate-independent Motion bank.
  function legacyMotionIndex(index) {
    // Exact semantic targets now that the Build 95 motions are present again.
    // Their original rates are still migrated separately by legacyMotionRate().
    const map = [24,25,26,27,28,29,5,0,6,7,13,30,31,32,33,34];
    return map[Math.max(0, Math.min(map.length - 1, Number(index) || 0))] ?? 0;
  }

  function migrateLegacyState(arp) {
    if (!arp || typeof arp !== "object") return {
      sequence: "", voices: { A: voiceDefaults(), B: voiceDefaults(), C: voiceDefaults(), D: voiceDefaults() },
    };
    if (arp.voices && typeof arp.voices === "object") return arp;

    const rawLegacyShape = Math.max(0, Math.min(16, Number(arp.shape ?? arp.preset) || 0));
    const legacyShapeMap = [0,1,2,3,9,10,11,12,13,14,15,16,17,18,19,20,22];
    const legacyShape = legacyShapeMap[rawLegacyShape] ?? 0;
    const rawMotion = Number.isFinite(Number(arp.motion))
      ? Math.max(0, Math.min(15, Number(arp.motion)))
      : Math.max(0, Math.min(15, (Number(arp.preset) || 1) - 1));
    const rawChance = Math.max(0, Math.min(15, Number(arp.chance) || 0));
    const wasLooped = rawChance >= 8;
    const behaviorChance = rawChance % 8;
    const legacyRate = legacyMotionRate(rawMotion);
    return {
      sequence: legacyShape > 0 ? (wasLooped ? "A,A,A,A" : "A") : "",
      voices: {
        A: { shape: legacyShape, motion: legacyMotionIndex(rawMotion), chance: behaviorChance, rate: legacyRate },
        B: voiceDefaults(legacyRate), C: voiceDefaults(legacyRate), D: voiceDefaults(legacyRate),
      },
    };
  }

  function register(patch) {
    patch.arp = migrateLegacyState(patch.arp);
    if (!patch.arp.voices || typeof patch.arp.voices !== "object") patch.arp.voices = {};
    const inheritedRate = normalizeRate(patch.arp.rate);
    VOICE_IDS.forEach(id => {
      const voice = patch.arp.voices[id] || voiceDefaults(inheritedRate);
      patch.arp.voices[id] = {
        shape: Math.max(0, Math.min(SHAPES.length - 1, Number(voice.shape) || 0)),
        motion: Math.max(0, Math.min(MOTIONS.length - 1, Number(voice.motion) || 0)),
        chance: Math.max(0, Math.min(CHANCE_PRESETS.length - 1, Number(voice.chance) || 0)),
        rate: normalizeRate(voice.rate || inheritedRate),
      };
    });
    delete patch.arp.rate;
    if (typeof patch.arp.sequence !== "string") patch.arp.sequence = "";
  }

  function activeVoiceIds(patch) {
    return VOICE_IDS.filter(id => Number(patch?.arp?.voices?.[id]?.shape || 0) > 0);
  }

  function sequenceTokens(sequence) {
    if (!sequence) return [];
    return String(sequence).split(",").map(token => token.trim()).filter(token => token === "-" || VOICE_IDS.includes(token));
  }

  function sequenceValidForActive(sequence, active) {
    const tokens = sequenceTokens(sequence);
    if (!tokens.length) return false;
    return tokens.some(token => token !== "-") && tokens.every(token => token === "-" || active.includes(token));
  }

  function encode(tokens) { return tokens.join(","); }
  function displaySequence(tokens) { return tokens.map(token => token === "-" ? "BLANK" : token).join("-"); }

  function uniqueSequences(rows) {
    const seen = new Set();
    return rows.filter(tokens => {
      const key = encode(tokens);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function sequencePresetsForActive(active) {
    const off = { name: "Off", value: "", tokens: [] };
    if (!active.length) return [off];
    const A = active[0], B = active[1] || A, C = active[2] || B, D = active[3] || C;
    let rows;
    if (active.length === 1) {
      rows = [
        [A], [A,A], [A,A,A,A], [A,"-",A,"-"], [A,A,"-",A], [A,"-","-",A],
        [A,A,A,"-"], [A,"-",A,A], [A,A,"-","-",A,A,"-","-"],
        [A,A,A,A,A,"-",A,"-"],
      ];
    } else if (active.length === 2) {
      rows = [
        [A], [B], [A,B], [A,B,A,B], [A,A,B,A], [A,B,B,A], [A,B,A,A],
        [A,"-",B,"-"], [A,B,"-",A], [A,"-",A,B], [A,A,B,B], [A,B,B,B],
        [A,A,B,A,A,B,B,A], [A,B,A,B,A,A,B,A], [A,"-",B,A,B,"-",A,B],
      ];
    } else if (active.length === 3) {
      rows = [
        [A], [A,B], [A,B,A,C], [A,A,B,C], [A,C,B,A], [A,B,C,A], [A,B,C,B],
        [A,C,A,B], [A,"-",B,C], [A,B,"-",C], [A,A,C,B], [A,C,B,C],
        [A,A,B,A,A,C,B,A], [A,B,A,C,A,C,B,A], [A,B,C,B,A,"-",C,A],
      ];
    } else {
      rows = [
        [A], [A,B], [A,B,A,C], [A,B,C,D], [A,A,B,A], [A,B,D,B], [A,C,D,B],
        [A,D,C,B], [A,B,C,A], [A,"-",B,"-"], [A,B,"-",D], [A,C,A,D],
        [A,A,B,A,A,C,B,D], [A,B,A,C,D,C,B,A], [A,B,C,D,A,C,B,A],
        [A,"-",B,C,D,"-",C,A], [A,A,C,B,D,C,B,A],
      ];
    }
    return [off, ...uniqueSequences(rows).map(tokens => ({ name: displaySequence(tokens), value: encode(tokens), tokens }))];
  }

  function ensureSequence(patch) {
    const active = activeVoiceIds(patch);
    const presets = sequencePresetsForActive(active);
    if (!active.length) {
      patch.arp.sequence = "";
      return presets;
    }
    // Empty sequence is the explicit master Off state and remains Off while
    // Shapes are edited. Invalid non-empty sequences fall back to first active arp.
    if (patch.arp.sequence !== "" && !sequenceValidForActive(patch.arp.sequence, active)) {
      patch.arp.sequence = presets[1]?.value || active[0];
    }
    return presets;
  }

  function refreshSequenceUI(patch) {
    const presets = ensureSequence(patch);
    if (!sequenceUI) return presets;
    const { slider, value } = sequenceUI;
    slider.disabled = false;
    slider.min = "0";
    slider.max = String(presets.length - 1);
    let index = presets.findIndex(item => item.value === patch.arp.sequence);
    if (index < 0) index = 0;
    slider.value = String(index);
    patch.arp.sequence = presets[index].value;
    if (value) value.textContent = presets[index].name;
    return presets;
  }

  function initUI(patch) {
    VOICE_IDS.forEach(id => {
      const shapeSlider = document.getElementById(`arp${id}Shape`);
      const shapeValue = document.getElementById(`arp${id}ShapeValue`);
      const motionSlider = document.getElementById(`arp${id}Motion`);
      const motionValue = document.getElementById(`arp${id}MotionValue`);
      const chanceSlider = document.getElementById(`arp${id}Chance`);
      const chanceValue = document.getElementById(`arp${id}ChanceValue`);
      const rateButtons = [...document.querySelectorAll(`[data-selector-group="arp-${id.toLowerCase()}-rate"] button[data-rate]`)];
      if (!shapeSlider || !motionSlider || !chanceSlider) return;

      shapeSlider.max = String(SHAPES.length - 1);
      motionSlider.max = String(MOTIONS.length - 1);
      chanceSlider.max = String(CHANCE_PRESETS.length - 1);

      const updateShape = () => {
        const index = Math.max(0, Math.min(SHAPES.length - 1, Number(shapeSlider.value) || 0));
        patch.arp.voices[id].shape = index;
        if (shapeValue) shapeValue.textContent = SHAPES[index].name;
        refreshSequenceUI(patch);
        window.dispatchEvent(new CustomEvent("interphace:arp-voices-changed"));
      };
      const updateMotion = () => {
        const index = Math.max(0, Math.min(MOTIONS.length - 1, Number(motionSlider.value) || 0));
        patch.arp.voices[id].motion = index;
        if (motionValue) motionValue.textContent = MOTIONS[index].name;
      };
      const updateChance = () => {
        const index = Math.max(0, Math.min(CHANCE_PRESETS.length - 1, Number(chanceSlider.value) || 0));
        patch.arp.voices[id].chance = index;
        if (chanceValue) chanceValue.textContent = CHANCE_PRESETS[index].name;
      };
      const updateRateUI = () => {
        const rate = normalizeRate(patch.arp.voices[id].rate);
        patch.arp.voices[id].rate = rate;
        rateButtons.forEach(candidate => {
          const active = candidate.dataset.rate === rate;
          candidate.classList.toggle("active", active);
          candidate.setAttribute("aria-pressed", String(active));
        });
      };
      rateButtons.forEach(button => button.addEventListener("click", () => {
        patch.arp.voices[id].rate = normalizeRate(button.dataset.rate);
        updateRateUI();
      }));
      shapeSlider.addEventListener("input", updateShape);
      motionSlider.addEventListener("input", updateMotion);
      chanceSlider.addEventListener("input", updateChance);
      shapeSlider.value = String(patch.arp.voices[id].shape);
      motionSlider.value = String(patch.arp.voices[id].motion);
      chanceSlider.value = String(patch.arp.voices[id].chance);
      updateShape(); updateMotion(); updateChance(); updateRateUI();
    });

    const sequenceSlider = document.getElementById("arpSequence");
    const sequenceValue = document.getElementById("arpSequenceValue");
    if (sequenceSlider) {
      sequenceUI = { slider: sequenceSlider, value: sequenceValue };
      sequenceSlider.addEventListener("input", () => {
        const presets = sequencePresetsForActive(activeVoiceIds(patch));
        const index = Math.max(0, Math.min(presets.length - 1, Number(sequenceSlider.value) || 0));
        if (!presets[index]) return;
        patch.arp.sequence = presets[index].value;
        if (sequenceValue) sequenceValue.textContent = presets[index].name;
      });
      refreshSequenceUI(patch);
    }
  }

  function setVoiceRate(patch, id, rate) {
    if (!VOICE_IDS.includes(id)) return;
    register(patch);
    patch.arp.voices[id].rate = normalizeRate(rate);
    document.querySelectorAll(`[data-selector-group="arp-${id.toLowerCase()}-rate"] button[data-rate]`).forEach(candidate => {
      const active = candidate.dataset.rate === patch.arp.voices[id].rate;
      candidate.classList.toggle("active", active);
      candidate.setAttribute("aria-pressed", String(active));
    });
  }

  // Backward-compatible loader helper: an old global Rate applies to all voices.
  function setRate(patch, rate) {
    VOICE_IDS.forEach(id => setVoiceRate(patch, id, rate));
  }

  function setSequence(patch, sequence) {
    patch.arp.sequence = typeof sequence === "string" ? sequence : "";
    refreshSequenceUI(patch);
  }

  function getVoice(patch, id) {
    return patch?.arp?.voices?.[id] || voiceDefaults();
  }
  function getShape(patch, id = "A") {
    const voice = getVoice(patch, id);
    return SHAPES[Math.max(0, Math.min(SHAPES.length - 1, Number(voice.shape) || 0))];
  }
  function getMotion(patch, id = "A") {
    const voice = getVoice(patch, id);
    return MOTIONS[Math.max(0, Math.min(MOTIONS.length - 1, Number(voice.motion) || 0))];
  }
  function getChance(patch, id = "A") {
    const voice = getVoice(patch, id);
    return CHANCE_PRESETS[Math.max(0, Math.min(CHANCE_PRESETS.length - 1, Number(voice.chance) || 0))];
  }

  function scaleCorrect(value, patch) {
    if (value === REST) return REST;
    if (!window.ScaleEngine) return value;
    return window.ScaleEngine.nearestAllowedSemitone(value, patch?.scale);
  }

  function nearbyScaleTone(currentSemitone, patch, previousNote = null) {
    if (!window.ScaleEngine) return currentSemitone;
    const allowed = window.ScaleEngine.allowedSemitones(patch?.scale);
    const index = allowed.indexOf(currentSemitone);
    if (index < 0) return window.ScaleEngine.nearestAllowedSemitone(currentSemitone, patch?.scale);
    const candidates = [];
    [-2,-1,1,2].forEach(offset => {
      const candidateIndex = index + offset;
      if (candidateIndex < 0 || candidateIndex >= allowed.length) return;
      const note = allowed[candidateIndex];
      let weight = Math.abs(offset) === 1 ? 6 : 2;
      if (previousNote !== null && note === previousNote) weight *= .15;
      if (((note % 12) + 12) % 12 === 0) weight *= 1.35;
      candidates.push({ note, weight });
    });
    if (!candidates.length) return currentSemitone;
    const total = candidates.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of candidates) {
      roll -= item.weight;
      if (roll <= 0) return item.note;
    }
    return candidates[candidates.length - 1].note;
  }

  function sampledPhraseCell(array, stepIndex, totalSteps) {
    if (!array.length) return REST;
    // Use the end of each proportional phrase slice. Coarse rates therefore
    // still describe the whole one-bar arc instead of only sampling its starts.
    const sourceIndex = Math.min(
      array.length - 1,
      Math.max(0, Math.ceil((stepIndex + 1) * array.length / Math.max(1, totalSteps)) - 1),
    );
    return array[sourceIndex];
  }

  function sampledMotionActive(mask, stepIndex, totalSteps) {
    if (!mask.length) return false;
    const start = Math.floor(stepIndex * mask.length / Math.max(1, totalSteps));
    const end = Math.max(start + 1, Math.ceil((stepIndex + 1) * mask.length / Math.max(1, totalSteps)));
    const slice = mask.slice(start, Math.min(mask.length, end));
    const density = slice.reduce((sum, value) => sum + (value ? 1 : 0), 0) / Math.max(1, slice.length);
    return density >= .5;
  }

  function stepSeconds(patch, id = "A") {
    const beat = 60 / Math.max(40, Math.min(200, Number(patch.tempo) || 70));
    const rate = normalizeRate(getVoice(patch, id).rate);
    return beat * (RATE_BEATS[rate] || .5);
  }

  function barSeconds(patch) {
    const beat = 60 / Math.max(40, Math.min(200, Number(patch.tempo) || 70));
    return beat * 4;
  }

  function resolveVoicePerformance(patch, id, { applyChance = true } = {}) {
    const shape = getShape(patch, id);
    const motion = getMotion(patch, id);
    const chance = getChance(patch, id);
    const rate = normalizeRate(getVoice(patch, id).rate);
    const totalSteps = RATE_STEPS_PER_BAR[rate] || 8;
    const stepSec = stepSeconds(patch, id);
    const steps = [];
    let previousResolvedNote = null;

    for (let i = 0; i < totalSteps; i++) {
      const phraseValue = sampledPhraseCell(shape.phrase, i, totalSteps);
      const motionActive = sampledMotionActive(motion.mask, i, totalSteps);
      let note = motionActive ? scaleCorrect(phraseValue, patch) : REST;
      let gain = 1;

      if (note !== REST && applyChance) {
        if (chance.skip > 0 && Math.random() < chance.skip) note = REST;
        if (note !== REST && chance.note > 0 && Math.random() < chance.note) {
          note = nearbyScaleTone(note, patch, previousResolvedNote);
        }
        if (note !== REST && chance.volume > 0 && Math.random() < chance.volume) {
          gain = chance.volumeDipMin + Math.random() * (chance.volumeDipMax - chance.volumeDipMin);
        }
      }
      steps.push({
        note,
        gain,
        arpId: id,
        localIndex: i,
        startSeconds: i * stepSec,
        gateSeconds: stepSec * motion.gate,
      });
      if (note !== REST) previousResolvedNote = note;
    }

    return { id, shape, motion, chance, rate, steps, stepSeconds: stepSec, barSeconds: barSeconds(patch), gateSeconds: stepSec * motion.gate };
  }

  function resolvePerformance(patch) {
    const active = activeVoiceIds(patch);
    if (!active.length) return {
      activeVoiceIds: [], usedVoiceIds: [], sequence: [], sequenceName: "Off", steps: [],
      stepSeconds: stepSeconds(patch, active[0] || "A"), loopSeconds: 0, barSeconds: barSeconds(patch), musicalBars: 0,
    };
    ensureSequence(patch);
    const tokens = sequenceTokens(patch.arp.sequence);
    const barSec = barSeconds(patch);
    if (!tokens.length) return {
      activeVoiceIds: active, usedVoiceIds: [], sequence: [], sequenceName: "Off", steps: [],
      stepSeconds: stepSeconds(patch, active[0] || "A"), loopSeconds: 0, barSeconds: barSec, musicalBars: 0,
    };
    const allSteps = [];
    const used = [];
    tokens.forEach((token, barIndex) => {
      if (token === "-") return;
      if (!used.includes(token)) used.push(token);
      const voice = resolveVoicePerformance(patch, token);
      voice.steps.forEach(step => allSteps.push({
        ...step,
        barIndex,
        startSeconds: barIndex * barSec + step.startSeconds,
      }));
    });
    return {
      activeVoiceIds: active,
      usedVoiceIds: used,
      sequence: tokens,
      sequenceName: displaySequence(tokens),
      steps: allSteps,
      stepSeconds: stepSeconds(patch, active[0] || "A"),
      loopSeconds: Math.max(barSec, tokens.length * barSec),
      barSeconds: barSec,
      musicalBars: Math.max(1, tokens.length),
      rates: Object.fromEntries(used.map(id => [id, normalizeRate(getVoice(patch, id).rate)])),
    };
  }

  function isActive(patch) { return activeVoiceIds(patch).length > 0 && sequenceTokens(patch?.arp?.sequence).length > 0; }
  function usedVoiceIds(patch) { return resolvePerformance(patch).usedVoiceIds; }
  function describe(patch) { return resolvePerformance(patch); }

  return Object.freeze({
    REST, VOICE_IDS, RATES, SHAPES, MOTIONS, CHANCE_PRESETS,
    register, migrateLegacyState, initUI, setRate, setVoiceRate, setSequence, refreshSequenceUI,
    activeVoiceIds, usedVoiceIds, sequenceTokens, sequencePresetsForActive,
    getShape, getMotion, getChance, resolveVoicePerformance, resolvePerformance,
    stepSeconds, barSeconds, isActive, describe,
  });
})();
