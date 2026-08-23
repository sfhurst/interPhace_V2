// ============================================================
//  ENVELOPE UI (AHDHD) WITH PERSONALITY
// ============================================================

window.initEnvelopeUI = function () {
  const env = patch.envelope.ahdhd;
  const presets = document.querySelectorAll("button[data-env]");
  const presetMap = window.InterPhaceData.ENVELOPE_PRESETS;
  const keys = ["attack1","hold1","decay1","decay1Target","hold2","decay2","envMult"];
  const same = (a,b) => Math.abs(Number(a)-Number(b)) < 0.000001;

  function updatePresetMatch() {
    const match = Object.entries(presetMap).find(([,v]) => keys.every(k => same(env[k],v[k])))?.[0] || null;
    presets.forEach(btn => btn.classList.toggle("active", match === btn.dataset.env));
  }

  presets.forEach(btn => btn.addEventListener("click", () => applyPreset(btn.dataset.env)));
  ["attack1","hold1","decay1","hold2","decay2"].forEach(bind);

  UI.bindSlider("decay1Target", "decay1TargetValue", v => {
    env.decay1Target = Number(v) / 100;
    updatePresetMatch();
    return Math.round(v) + "%";
  });

  const mult = document.getElementById("envMult");
  const multValue = document.getElementById("envMultValue");
  if (mult && multValue) {
    mult.addEventListener("input", () => {
      env.envMult = Number(mult.value);
      multValue.textContent = env.envMult + "×";
      updateAllEnvelopeDisplays();
      updatePresetMatch();
    });
    env.envMult = Number(mult.value);
    multValue.textContent = env.envMult + "×";
  }

  const behaviorSlider = document.getElementById("instrumentBehavior");
  const behaviorValue = document.getElementById("instrumentBehaviorValue");
  const behaviorNames = AmpEnvelopeEngine.getInstrumentBehaviorNames();
  if (behaviorSlider && behaviorValue) {
    behaviorSlider.max = String(Math.max(0, behaviorNames.length - 1));
    behaviorSlider.addEventListener("input", () => {
      env.instrumentBehavior = Number(behaviorSlider.value);
      behaviorValue.textContent = behaviorNames[env.instrumentBehavior] || "Off";
    });
    env.instrumentBehavior = Number(behaviorSlider.value);
    behaviorValue.textContent = behaviorNames[env.instrumentBehavior] || "Off";
  }

  const characterSlider = document.getElementById("envelopeCharacter");
  const characterValue = document.getElementById("envelopeCharacterValue");
  const characterNames = AmpEnvelopeEngine.getCharacterNames();
  if (characterSlider && characterValue) {
    characterSlider.max = String(Math.max(0, characterNames.length - 1));
    characterSlider.addEventListener("input", () => {
      env.character = Number(characterSlider.value);
      characterValue.textContent = characterNames[env.character] || "Off";
    });
    env.character = Number(characterSlider.value);
    characterValue.textContent = characterNames[env.character] || "Off";
  }

  applyPreset("strike");

  function bind(id) {
    const slider = document.getElementById(id);
    const value = document.getElementById(id + "Value");
    if (!slider || !value) return;
    slider.addEventListener("input", () => {
      env[id] = Number(slider.value);
      value.textContent = formatSeconds(env[id] * env.envMult);
      updatePresetMatch();
    });
    env[id] = Number(slider.value);
    value.textContent = formatSeconds(env[id] * env.envMult);
  }

  function updateAllEnvelopeDisplays() {
    ["attack1","hold1","decay1","hold2","decay2"].forEach(id => {
      const value = document.getElementById(id + "Value");
      if (value) value.textContent = formatSeconds(env[id] * env.envMult);
    });
  }

  function applyPreset(name) {
    const preset = presetMap[name];
    if (!preset) return;
    env.envMult = preset.envMult;
    const multInput = document.getElementById("envMult");
    const multSpan = document.getElementById("envMultValue");
    if (multInput) multInput.value = env.envMult;
    if (multSpan) multSpan.textContent = env.envMult + "×";
    ["attack1","hold1","decay1","decay1Target","hold2","decay2"].forEach(key => {
      env[key] = preset[key];
      const input = document.getElementById(key);
      const span = document.getElementById(key + "Value");
      if (input) input.value = key === "decay1Target" ? preset[key] * 100 : preset[key];
      if (span) span.textContent = key === "decay1Target" ? Math.round(preset[key] * 100) + "%" : formatSeconds(preset[key] * env.envMult);
    });
    updatePresetMatch();
    UI.refreshRangeFills();
  }
};

