// ============================================================
//  RENDER ENGINE (UPDATED FOR STEREO OUTPUT)
// ============================================================
// - Creates persistent AudioContext for playback
// - Adds safety limiter to prevent clipping
// - Better error handling
// - Handles stereo output from effects chain
// ============================================================

window.RenderEngine = {};
window.activePlayback = null;

// Persistent playback context (reused for performance)
window.playbackContext = null;

// ------------------------------------------------------------
//  GET OR CREATE PLAYBACK CONTEXT
// ------------------------------------------------------------

function getPlaybackContext() {
  try {
    if (!window.playbackContext || window.playbackContext.state === "closed") {
      window.playbackContext = new AudioContext();
      console.log("✅ Created new AudioContext");
    }

    if (window.playbackContext.state === "suspended") {
      window.playbackContext.resume();
    }

    return window.playbackContext;
  } catch (err) {
    console.error("❌ Failed to create AudioContext:", err);
    throw new Error("Could not initialize audio. Check browser permissions.");
  }
}

// ------------------------------------------------------------
//  RENDER UI (Build 96: construction-kit renderer + arranged arps)
// ------------------------------------------------------------

const RENDER_CONTENT_KEY = "interPhaceRenderContent";
const LEGACY_RENDER_SCOPE_KEY = "interPhaceRenderScope";
const VALID_RENDER_CONTENT = new Set([
  "root",
  "octaves",
  "chords",
  "progressions",
  "arps",
]);
let renderContent = new Set(["root"]);
let pendingRandomAudition = 0;

RenderEngine.initRenderUI = function (patch) {
  initRandomPatchButton();
  initLoadPatchButton();
  initRenderContentUI(patch);
  initRenderButton(patch);
};

const RANDOM_PATCH_SLIDER_IDS = Object.freeze([
  "carrierVolume",
  "harmonic1Gain",
  "harmonic1Offset",
  "harmonic2Gain",
  "harmonic2Offset",
  // Build 99: return to free AHDHD stage randomization. Envelope preset
  // buttons and Time Multiplier remain untouched by Random Patch.
  "attack1",
  "hold1",
  "decay1",
  "decay1Target",
  "hold2",
  "decay2",
  "mod1Gain",
  "mod2Gain",
]);

const RANDOM_PATCH_EFFECT_IDS = Object.freeze([
  "bitCrushPreset",
  "stereoWidthPreset",
  "detunePreset",
  "chorusPreset",
  "delayPreset",
  "reverbPreset",
  "saturationPreset",
]);

function randomSliderValue(slider) {
  const min = Number(slider.min || 0);
  const max = Number(slider.max || 100);
  const step = slider.step === "any" ? 0 : Number(slider.step || 1);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return slider.value;

  if (step > 0) {
    const steps = Math.max(0, Math.round((max - min) / step));
    const chosen = Math.floor(Math.random() * (steps + 1));
    const value = min + chosen * step;
    const decimals = String(slider.step || "1").includes(".")
      ? String(slider.step).split(".")[1].length
      : 0;
    return decimals ? value.toFixed(decimals) : String(Math.round(value));
  }
  return String(min + Math.random() * (max - min));
}

function randomizeButtonGroup(selector) {
  document.querySelectorAll(selector).forEach(group => {
    const buttons = Array.from(group.querySelectorAll("button:not([disabled])"));
    if (!buttons.length) return;
    buttons[Math.floor(Math.random() * buttons.length)].click();
  });
}

function acknowledgeRandomPatch(button) {
  button.classList.add("random-ack");
  button.textContent = "New Patch";
  window.clearTimeout(pendingRandomAudition);
  pendingRandomAudition = window.setTimeout(() => {
    button.classList.remove("random-ack");
    button.textContent = "Random Patch";
    const audition = document.getElementById("play");
    if (audition) audition.click();
  }, 180);
}

function initRandomPatchButton() {
  const button = document.getElementById("randomPatch");
  if (!button) return;

  button.addEventListener("click", () => {
    RenderEngine.stop();
    const playBtn = document.getElementById("play");
    if (playBtn) {
      playBtn.disabled = false;
      playBtn.textContent = "Audition";
      playBtn.classList.remove("playing");
    }

    RANDOM_PATCH_SLIDER_IDS.forEach(id => {
      const slider = document.getElementById(id);
      if (!slider) return;
      slider.value = randomSliderValue(slider);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });

    randomizeButtonGroup('[data-selector-group="fm-ratio"][data-mod]');
    randomizeButtonGroup('[data-selector-group="fm-wave"][data-mod]');

    const textureSlider = document.getElementById("textureAmount");
    if (textureSlider) {
      const originalMax = textureSlider.max;
      textureSlider.max = String(Math.min(10, Number(originalMax || 100)));
      textureSlider.value = randomSliderValue(textureSlider);
      textureSlider.max = originalMax;
      textureSlider.dispatchEvent(new Event("input", { bubbles: true }));
      textureSlider.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Build 99: authored effect preset banks are fair game for Random Patch.
    // Each effect is rolled independently, including its Off position.
    RANDOM_PATCH_EFFECT_IDS.forEach(id => {
      const slider = document.getElementById(id);
      if (!slider) return;
      slider.value = randomSliderValue(slider);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Randomize the physical transient layer independently of Noise.
    ["transientSourcePreset", "transientSourceVolume"].forEach(id => {
      const slider = document.getElementById(id);
      if (!slider) return;
      slider.value = randomSliderValue(slider);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Keep the global effect blend useful: never let Random Patch exceed 60% wet.
    const wetDry = document.getElementById("wetDryMix");
    if (wetDry) {
      const originalMax = wetDry.max;
      wetDry.max = String(Math.min(60, Number(originalMax || 100)));
      wetDry.value = randomSliderValue(wetDry);
      wetDry.max = originalMax;
      wetDry.dispatchEvent(new Event("input", { bubbles: true }));
      wetDry.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (typeof refreshChordPresetModifiedState === "function") {
      requestAnimationFrame(refreshChordPresetModifiedState);
    }
    if (window.FilterController?.updatePresetModifiedState) {
      requestAnimationFrame(() => window.FilterController.updatePresetModifiedState());
    }
    if (typeof saveSession === "function") saveSession();
    acknowledgeRandomPatch(button);
  });
}

function initLoadPatchButton() {
  const button = document.getElementById("loadPatch");
  const input = document.getElementById("loadPatchFile");
  if (!button || !input) return;

  button.addEventListener("click", () => {
    input.value = "";
    input.click();
  });

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const importedPatch = raw?.patch || raw;
      if (!importedPatch || typeof importedPatch !== "object") {
        throw new Error("No interPhace patch data found in this file.");
      }
      if (!window.SessionManager?.loadExternalPatch) {
        throw new Error("Patch loader is unavailable.");
      }
      window.SessionManager.loadExternalPatch(importedPatch, raw?.ui || {});
    } catch (error) {
      console.error("Patch load error:", error);
      alert("Failed to load patch: " + error.message);
    }
  });
}

function migrateRenderContentPreference() {
  try {
    const saved = JSON.parse(localStorage.getItem(RENDER_CONTENT_KEY) || "null");
    if (Array.isArray(saved)) {
      const migrated = saved.map(value => (value === "arpSteps" || value === "motionVariations") ? "arps" : value);
      const valid = migrated.filter(value => VALID_RENDER_CONTENT.has(value));
      if (valid.length) return new Set(valid);
    }
  } catch (_) {}

  const legacy = localStorage.getItem(LEGACY_RENDER_SCOPE_KEY);
  if (legacy === "octaves") return new Set(["root", "octaves"]);
  if (legacy === "all") return new Set(["root", "octaves", "chords", "progressions"]);
  return new Set(["root"]);
}

function saveRenderContentPreference() {
  localStorage.setItem(RENDER_CONTENT_KEY, JSON.stringify(Array.from(renderContent)));
}

function selectedVisibleRenderContent() {
  // Build 80 render contract: the UI is authoritative. A folder renders only
  // when its selector button is selected AND its Render group is visible.
  // Do not re-interpret harmonic gain or arp state here.
  return Array.from(document.querySelectorAll("[data-render-content].active"))
    .filter(button => {
      const group = button.closest(".render-content-group");
      return group && !group.classList.contains("is-hidden");
    })
    .map(button => button.dataset.renderContent)
    .filter(value => VALID_RENDER_CONTENT.has(value));
}


function ensurePatchSoundsSelection() {
  // Root and Octaves form one required pair. At least one must always remain
  // selected so Render always has a fundamental patch-sound destination.
  if (!renderContent.has("root") && !renderContent.has("octaves")) {
    renderContent.add("root");
  }
}

function syncRenderContentButtons() {
  document.querySelectorAll("[data-render-content]").forEach(button => {
    const active = renderContent.has(button.dataset.renderContent);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function updateRenderGroupVisibility() {
  const h1 = document.getElementById("harmonic1Gain");
  const h2 = document.getElementById("harmonic2Gain");
  const arpShapes = ["A", "B", "C", "D"].map(id => document.getElementById(`arp${id}Shape`)).filter(Boolean);
  const chordsGroup = document.getElementById("renderChordsGroup");
  const arpsGroup = document.getElementById("renderArpsGroup");

  if (chordsGroup && h1 && h2) {
    const showChords = Number(h1.value) > Number(h1.min) || Number(h2.value) > Number(h2.min);
    chordsGroup.classList.toggle("is-hidden", !showChords);
  }

  if (arpsGroup) {
    const showArps = arpShapes.some(slider => Number(slider.value) > Number(slider.min));
    arpsGroup.classList.toggle("is-hidden", !showArps);
  }
}

function initRenderContentUI(patch) {
  renderContent = migrateRenderContentPreference();
  ensurePatchSoundsSelection();
  saveRenderContentPreference();

  const buttons = Array.from(document.querySelectorAll("[data-render-content]"));
  buttons.forEach(button => button.addEventListener("click", () => {
    const value = button.dataset.renderContent;
    if (!VALID_RENDER_CONTENT.has(value)) return;

    if (renderContent.has(value)) {
      // Patch Sounds behaves like a two-way switch when only one of the pair
      // is active: clicking that sole active choice transfers selection to
      // the other choice. If both are active, either may simply be turned off.
      if (value === "root" && !renderContent.has("octaves")) {
        renderContent.delete("root");
        renderContent.add("octaves");
      } else if (value === "octaves" && !renderContent.has("root")) {
        renderContent.delete("octaves");
        renderContent.add("root");
      } else {
        renderContent.delete(value);
      }
    } else {
      renderContent.add(value);
    }

    // Chords and Arps are intentionally unrestricted: either, both, or none.
    saveRenderContentPreference();
    syncRenderContentButtons();
  }));

  syncRenderContentButtons();

  // Build 78: visibility only. Read the three existing sliders and toggle
  // the two existing Render containers. Do not mutate any control or state.
  ["harmonic1Gain", "harmonic2Gain", "arpAShape", "arpBShape", "arpCShape", "arpDShape"].forEach(id => {
    const slider = document.getElementById(id);
    if (!slider) return;
    slider.addEventListener("input", updateRenderGroupVisibility);
    slider.addEventListener("change", updateRenderGroupVisibility);
  });
  updateRenderGroupVisibility();
}

function setRenderStatus(renderBtn, message = "") {
  if (!renderBtn) return;
  if (message) renderBtn.dataset.renderStatus = message;
  else delete renderBtn.dataset.renderStatus;
}

function initRenderButton(patch) {
  const renderBtn = document.getElementById("render");
  if (!renderBtn) return;

  // Build 81: status is painted in the existing divider -> Render gap via CSS.
  // No layout element is inserted and the button text/position never changes.
  setRenderStatus(renderBtn);

  renderBtn.addEventListener("click", async () => {
    try {
      renderBtn.disabled = true;
      updateParamsFromHTML();
      const selected = selectedVisibleRenderContent();
      const total = countRenderOutputFiles(patch, selected);
      let current = 0;
      const progress = {
        beginFile() {
          current += 1;
          setRenderStatus(renderBtn, `Rendering ${current} of ${total}...`);
        },
        packaging() {
          setRenderStatus(renderBtn, "Packaging files...");
        },
        complete() {
          setRenderStatus(renderBtn, `${total} files rendered`);
        },
      };

      await renderBuild81Package(patch, selected, progress);
      renderBtn.disabled = false;
    } catch (err) {
      console.error("Render error:", err);
      setRenderStatus(renderBtn, "Render failed");
      alert("Failed to render audio: " + err.message);
      renderBtn.disabled = false;
    }
  });
}

function clonePatch(source) {
  return JSON.parse(JSON.stringify(source));
}

function safeFileNote(midi) {
  return midiToName(midi).replace(/#/g, "s");
}

function arpActive(patch) {
  return typeof ArpEngine !== "undefined" && ArpEngine.isActive(patch);
}

async function renderPatchWav(patch) {
  if (arpActive(patch)) {
    const result = await renderArpToFloatBuffer(patch, 48000);
    return audioBufferToWav(result.buffer);
  }
  return renderNoteToWav(patch);
}

function makeSoloPatch(source, layer) {
  const p = clonePatch(source);
  const fm = p.synth.fm;
  const h1Gain = Number(fm.harmonic1?.gain) || 0;
  const h2Gain = Number(fm.harmonic2?.gain) || 0;

  if (layer === "whole") return p;

  // Solos remove unrelated layers but preserve the selected lane's authored gain,
  // envelope, filter, effects and arp behavior. Noise transients are an independent
  // patch layer, so they belong to Whole Patch rather than tonal/texture solos.
  p.texture.amount = 0;
  if (p.transient) p.transient.preset = 0;
  fm.carrierVolume = 0;
  if (fm.harmonic1) fm.harmonic1.gain = 0;
  if (fm.harmonic2) fm.harmonic2.gain = 0;

  if (layer === "root") fm.carrierVolume = Number(source.synth.fm.carrierVolume) || 0;
  if (layer === "h1" && fm.harmonic1) fm.harmonic1.gain = h1Gain;
  if (layer === "h2" && fm.harmonic2) fm.harmonic2.gain = h2Gain;
  if (layer === "texture") {
    p.texture = clonePatch(source.texture);
    // Texture is generated against a silent tonal input so only the texture lane remains.
  }
  return p;
}

async function addRootFolder(zip, patch, progress) {
  const folder = zip.folder("root");
  const jobs = [
    ["patch.wav", "whole", true],
    ["root.wav", "root", Number(patch.synth.fm.carrierVolume) > 0],
    ["tex.wav", "texture", Number(patch.texture?.amount) > 0 && Number(patch.texture?.preset) > 0],
    ["h1.wav", "h1", Number(patch.synth.fm.harmonic1?.gain) > 0],
    ["h2.wav", "h2", Number(patch.synth.fm.harmonic2?.gain) > 0],
  ];
  for (const [name, layer, active] of jobs) {
    if (!active) continue;
    progress?.beginFile();
    folder.file(name, await renderPatchWav(makeSoloPatch(patch, layer)));
  }
}

function chromaticMidiList(root, radius) {
  const out = [];
  for (let midi = root - radius; midi <= root + radius; midi++) {
    if (midi >= 0 && midi <= 127) out.push(midi);
  }
  return out;
}

function scaleMidiList(root, radius, scaleId) {
  const scale = window.ScaleEngine?.getScale(scaleId);
  const pcs = scale?.intervals || [0, 2, 4, 5, 7, 9, 11];
  const out = [];
  for (let offset = -radius; offset <= radius; offset++) {
    const pc = ((offset % 12) + 12) % 12;
    const midi = root + offset;
    if (midi >= 0 && midi <= 127 && pcs.includes(pc)) out.push(midi);
  }
  return out;
}

async function addNoteSet(folder, patch, notes, progress) {
  for (let i = 0; i < notes.length; i++) {
    const midi = notes[i];
    progress?.beginFile();
    console.log(`Rendering ${i + 1}/${notes.length}: ${midiToName(midi)}`);
    const notePatch = createNotePatch(patch, midi);
    folder.file(`${String(midi).padStart(3, "0")}_${safeFileNote(midi)}.wav`, await renderPatchWav(notePatch));
  }
}

async function addOctavesFolder(zip, patch, progress) {
  const root = Number(patch.midiNote);
  const octave = zip.folder("oct");
  await addNoteSet(octave.folder("chr1"), patch, chromaticMidiList(root, 12), progress);
  await addNoteSet(octave.folder("scl2"), patch, scaleMidiList(root, 24, patch.scale), progress);
}

function activeHarmonicCount(patch) {
  const fm = patch.synth.fm;
  return [fm.harmonic1, fm.harmonic2].filter(layer => Number(layer?.gain) > 0).length;
}

function degreePitch(scaleIntervals, degreeIndex) {
  const count = scaleIntervals.length;
  const wrapped = ((degreeIndex % count) + count) % count;
  const octave = Math.floor(degreeIndex / count);
  return scaleIntervals[wrapped] + octave * 12;
}

function chordDefinition(patch, degreeIndex) {
  const scale = window.ScaleEngine?.getScale(patch.scale) || { intervals: [0,2,4,5,7,9,11] };
  const intervals = scale.intervals;
  const rootOffset = degreePitch(intervals, degreeIndex);
  const voices = activeHarmonicCount(patch) + 1;
  const tones = [rootOffset];
  if (voices >= 2) tones.push(degreePitch(intervals, degreeIndex + 2));
  if (voices >= 3) tones.push(degreePitch(intervals, degreeIndex + 4));
  return { degreeIndex, rootOffset, tones: tones.map(tone => tone - rootOffset), absoluteTones: tones };
}

function makeChordPatch(source, degreeIndex) {
  const definition = chordDefinition(source, degreeIndex);
  const targetMidi = Math.max(0, Math.min(127, Number(source.midiNote) + definition.rootOffset));
  // Derived chord roots receive the same pitch-relative filter treatment as
  // octave exports; only active harmonic lanes are reassigned to chord tones.
  const p = createNotePatch(source, targetMidi);
  const sourceFm = source.synth.fm;
  const fm = p.synth.fm;
  const activeLanes = ["harmonic1", "harmonic2"].filter(key => Number(sourceFm[key]?.gain) > 0);

  ["harmonic1", "harmonic2"].forEach(key => {
    if (fm[key] && !activeLanes.includes(key)) fm[key].gain = 0;
  });
  activeLanes.forEach((key, index) => {
    if (fm[key] && definition.tones[index + 1] !== undefined) {
      fm[key].noteOffset = definition.tones[index + 1];
    }
  });
  return p;
}

function romanDegree(index) {
  return ["I", "II", "III", "IV", "V", "VI", "VII"][index] || `Degree-${index + 1}`;
}

function progressionBank(scaleLength) {
  if (scaleLength >= 7) {
    return [
      { name: "I-V-VI-IV", degrees: [0,4,5,3] },
      { name: "I-IV-V-I", degrees: [0,3,4,0] },
      { name: "II-V-I", degrees: [1,4,0] },
      { name: "VI-IV-I-V", degrees: [5,3,0,4] },
      { name: "I-VI-IV-V", degrees: [0,5,3,4] },
    ];
  }
  return [
    { name: "I-IV-V-I", degrees: [0,3,4,0] },
    { name: "I-V-IV-I", degrees: [0,4,3,0] },
    { name: "I-III-IV-V", degrees: [0,2,3,4] },
  ];
}

function concatenateAudioBuffers(buffers, sampleRate = 48000) {
  const channels = Math.max(...buffers.map(buffer => buffer.numberOfChannels), 2);
  const total = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const ctx = new OfflineAudioContext(channels, Math.max(1, total), sampleRate);
  const out = ctx.createBuffer(channels, Math.max(1, total), sampleRate);
  let cursor = 0;
  buffers.forEach(buffer => {
    for (let ch = 0; ch < channels; ch++) {
      const src = buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1));
      out.getChannelData(ch).set(src, cursor);
    }
    cursor += buffer.length;
  });
  return out;
}

async function renderPatchBufferForKit(patch) {
  return arpActive(patch)
    ? (await renderArpToFloatBuffer(patch, 48000)).buffer
    : (await renderPatchToFloatBuffer(patch, 48000)).buffer;
}

function noteClassName(midi) {
  return safeFileNote(midi).replace(/-?\d+$/, "");
}

function shortToken(value, max = 16) {
  return String(value || "")
    .replace(/[^A-Za-z0-9+-]+/g, "")
    .slice(0, max) || "x";
}

function chordQuality(tones) {
  const normalized = tones.map(value => ((value % 12) + 12) % 12);
  if (normalized.length < 3) return "";
  const third = normalized[1];
  const fifth = normalized[2];
  if (third === 4 && fifth === 7) return "maj";
  if (third === 3 && fifth === 7) return "min";
  if (third === 3 && fifth === 6) return "dim";
  if (third === 4 && fifth === 8) return "aug";
  if (third === 5 && fifth === 7) return "sus4";
  if (third === 2 && fifth === 7) return "sus2";
  return `_${third}_${fifth}`;
}

function chordFileLabel(patch, degreeIndex) {
  const definition = chordDefinition(patch, degreeIndex);
  const midi = Math.max(0, Math.min(127, Number(patch.midiNote) + definition.rootOffset));
  const rootName = noteClassName(midi);
  if (definition.tones.length === 2) {
    const secondMidi = Math.max(0, Math.min(127, midi + definition.tones[1]));
    return `${rootName}-${noteClassName(secondMidi)}`;
  }
  return `${rootName}${chordQuality(definition.tones)}`;
}

async function addChordsFolder(zip, patch, progress) {
  const harmonicCount = activeHarmonicCount(patch);
  if (harmonicCount === 0) return;
  const scale = window.ScaleEngine?.getScale(patch.scale) || { intervals: [0,2,4,5,7,9,11] };
  const folder = zip.folder("chd");
  for (let degree = 0; degree < scale.intervals.length; degree++) {
    const chordPatch = makeChordPatch(patch, degree);
    progress?.beginFile();
    folder.file(`${chordFileLabel(patch, degree)}.wav`, await renderPatchWav(chordPatch));
  }
}

async function addProgressionsFolder(zip, patch, progress) {
  if (activeHarmonicCount(patch) === 0) return;
  const scale = window.ScaleEngine?.getScale(patch.scale) || { intervals: [0,2,4,5,7,9,11] };
  const folder = zip.folder("prg");
  for (const progression of progressionBank(scale.intervals.length)) {
    progress?.beginFile();
    const buffers = [];
    for (const degree of progression.degrees) {
      buffers.push(await renderPatchBufferForKit(makeChordPatch(patch, degree)));
    }
    const combined = concatenateAudioBuffers(buffers, 48000);
    prepareRenderedBuffer(combined, { targetDb: -1 });
    folder.file(`${progression.name}.wav`, audioBufferToWav(combined));
  }
}

function applyArpStepGain(patch, gain) {
  const value = Number.isFinite(Number(gain)) ? Number(gain) : 1;
  if (value >= .9999) return patch;
  const p = clonePatch(patch);
  const fm = p.synth.fm;
  fm.carrierVolume = (Number(fm.carrierVolume) || 0) * value;
  if (fm.harmonic1) fm.harmonic1.gain = (Number(fm.harmonic1.gain) || 0) * value;
  if (fm.harmonic2) fm.harmonic2.gain = (Number(fm.harmonic2.gain) || 0) * value;
  if (p.texture) p.texture.amount = (Number(p.texture.amount) || 0) * value;
  return p;
}

function disableArps(patch) {
  const p = clonePatch(patch);
  if (!p.arp) p.arp = {};
  if (!p.arp.voices) p.arp.voices = {};
  ["A", "B", "C", "D"].forEach(id => {
    p.arp.voices[id] = p.arp.voices[id] || {};
    p.arp.voices[id].shape = 0;
  });
  p.arp.sequence = "";
  return p;
}

async function addArpsFolder(zip, patch, legendLines, progress) {
  if (!arpActive(patch)) return;
  const info = ArpEngine.resolvePerformance(patch);
  const used = info.usedVoiceIds || [];
  const folder = zip.folder("arp");

  legendLines.push("");
  legendLines.push("ARPS");
  legendLines.push(`Sequence: ${info.sequenceName || "A"}`);

  progress?.beginFile();
  folder.file("sequence.wav", await renderPatchWav(patch));

  const rootMidi = Number(patch.midiNote);
  for (const id of used) {
    const voice = ArpEngine.resolveVoicePerformance(patch, id, { applyChance: false });
    const voiceFolder = folder.folder(id);
    const voicePatch = clonePatch(patch);
    voicePatch.arp.sequence = id;

    legendLines.push(`${id}: ${voice.shape?.name || "Shape"} / ${voice.motion?.name || "Motion"} / ${voice.chance?.name || "Off"} / ${voice.rate || "1/8"}`);
    progress?.beginFile();
    voiceFolder.file(`${id}.wav`, await renderPatchWav(voicePatch));

    const stepsFolder = voiceFolder.folder("steps");
    for (let index = 0; index < voice.steps.length; index++) {
      const step = voice.steps[index];
      if (step.note === null) continue;
      const midi = Math.max(0, Math.min(127, rootMidi + step.note));
      let stepPatch = createNotePatch(disableArps(patch), midi);
      stepPatch = applyArpStepGain(stepPatch, step.gain);
      const number = String(index + 1).padStart(2, "0");
      progress?.beginFile();
      stepsFolder.file(`${id}_${number}.wav`, await renderNoteToWav(stepPatch));
    }
  }
}

function nextRenderFilename() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const localDate = `${yy}${mm}${dd}`;
  const counterKey = "interPhaceRenderCounter";
  const dateKey = "interPhaceRenderDate";
  const storedDate = localStorage.getItem(dateKey);
  const counter = storedDate === localDate
    ? (parseInt(localStorage.getItem(counterKey), 10) || 0) + 1
    : 1;
  localStorage.setItem(dateKey, localDate);
  localStorage.setItem(counterKey, String(counter));
  return `interPhace-${localDate}-${String(counter).padStart(3, "0")}.zip`;
}

function countRenderOutputFiles(patch, selectedContent) {
  const selected = new Set(
    Array.isArray(selectedContent)
      ? selectedContent.filter(value => VALID_RENDER_CONTENT.has(value))
      : ["root"],
  );
  if (!selected.size) selected.add("root");

  let total = 0;
  if (selected.has("root")) {
    total += 1; // whole patch is always rendered
    if (Number(patch.synth.fm.carrierVolume) > 0) total += 1;
    if (Number(patch.texture?.amount) > 0 && Number(patch.texture?.preset) > 0) total += 1;
    if (Number(patch.synth.fm.harmonic1?.gain) > 0) total += 1;
    if (Number(patch.synth.fm.harmonic2?.gain) > 0) total += 1;
  }
  if (selected.has("octaves")) {
    const root = Number(patch.midiNote);
    total += chromaticMidiList(root, 12).length;
    total += scaleMidiList(root, 24, patch.scale).length;
  }
  if (activeHarmonicCount(patch) > 0) {
    const scale = window.ScaleEngine?.getScale(patch.scale) || { intervals: [0,2,4,5,7,9,11] };
    if (selected.has("chords")) total += scale.intervals.length;
    if (selected.has("progressions")) total += progressionBank(scale.intervals.length).length;
  }
  if (arpActive(patch) && selected.has("arps")) {
    const info = ArpEngine.resolvePerformance(patch);
    total += 1; // complete arranged sequence
    for (const id of info.usedVoiceIds || []) {
      total += 1; // complete one-bar arp voice
      const voice = ArpEngine.resolveVoicePerformance(patch, id, { applyChance: false });
      total += voice.steps.filter(step => step.note !== null).length;
    }
  }
  return total;
}

async function renderBuild81Package(patch, selectedContent, progress) {
  if (typeof JSZip === "undefined") throw new Error("ZIP support is unavailable.");
  const zip = new JSZip();
  const selected = new Set(
    Array.isArray(selectedContent)
      ? selectedContent.filter(value => VALID_RENDER_CONTENT.has(value))
      : ["root"],
  );
  if (!selected.size) selected.add("root");

  const legend = [
    "interPhace Build 96 render",
    `Root: ${midiToName(Number(patch.midiNote))}`,
    `Scale: ${window.ScaleEngine?.getScale(patch.scale)?.name || patch.scale || "Major"}`,
  ];

  if (selected.has("root")) await addRootFolder(zip, patch, progress);
  if (selected.has("octaves")) await addOctavesFolder(zip, patch, progress);
  if (selected.has("chords")) await addChordsFolder(zip, patch, progress);
  if (selected.has("progressions")) await addProgressionsFolder(zip, patch, progress);
  if (selected.has("arps")) await addArpsFolder(zip, patch, legend, progress);

  zip.file("patch.json", JSON.stringify({
    format: "interPhace-patch",
    version: 1,
    patch,
  }, null, 2));

  legend.push("");
  legend.push("FOLDERS");
  if (selected.has("root")) legend.push("root  patch + active solo layers");
  if (selected.has("octaves")) legend.push("oct   chr1 chromatic +/-1; scl2 scale +/-2");
  if (selected.has("chords")) legend.push("chd   scale-derived diads/triads");
  if (selected.has("progressions")) legend.push("prg   chord progressions");
  if (selected.has("arps")) legend.push("arp   arranged sequence + used A/B/C/D one-bar arps + their sounding steps");
  zip.file("legend.txt", legend.join("\n") + "\n");

  progress?.packaging();
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nextRenderFilename();
  a.click();
  URL.revokeObjectURL(url);
  progress?.complete();
}

function createKeyZones(roots, lowMidi, highMidi) {
  return roots.map((root, index) => {
    const previous = roots[index - 1];
    const next = roots[index + 1];
    const low = index === 0 ? lowMidi : Math.floor((previous + root) / 2) + 1;
    const high = index === roots.length - 1 ? highMidi : Math.floor((root + next) / 2);
    return { root, rootNote: midiToName(root), low, lowNote: midiToName(low), high, highNote: midiToName(high) };
  });
}

// ------------------------------------------------------------
//  CREATE SCALED PATCH
// ------------------------------------------------------------

function nearestIndex(values, target) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  values.forEach((value, index) => {
    const distance = Math.abs(Math.log(Math.max(1e-9, value) / Math.max(1e-9, target)));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function scaleFilterForTarget(notePatch, originalPatch, targetMidi) {
  const filter = notePatch.filter;
  const sourceFilter = originalPatch.filter;
  const data = window.FilterFrequencyData;
  if (!filter || !sourceFilter || !data) return;

  const ratio = Math.pow(2, (Number(targetMidi) - Number(originalPatch.midiNote)) / 12);
  if (Math.abs(ratio - 1) < 1e-12) return;
  const lpValues = data.LP_FREQ_PRESETS;
  const hpValues = data.HP_FREQ_PRESETS;

  // Preserve the explicit all-through endpoints. Otherwise let cutoff
  // frequency ride the target note by the same pitch ratio as the root.
  const sourceLp = Math.round(Number(sourceFilter.lpFreq));
  if (sourceLp < lpValues.length - 1) {
    filter.lpFreq = nearestIndex(lpValues, lpValues[sourceLp] * ratio);
  }
  const sourceHp = Math.round(Number(sourceFilter.hpFreq));
  if (sourceHp > 0) {
    filter.hpFreq = nearestIndex(hpValues, hpValues[sourceHp] * ratio);
  }

  // EQ center frequencies are also pitch-relative during derived renders.
  // Convert derived bands to the broad "all" table so they can travel beyond
  // the source band's UI range without changing the authoritative root patch.
  ["eq1", "eq2", "eq3"].forEach(name => {
    const sourceEq = sourceFilter[name];
    const targetEq = filter[name];
    if (!sourceEq || !targetEq) return;
    const sourceRange = data.EQ_FREQ_RANGES[sourceEq.range] || data.EQ_FREQ_RANGES.all;
    const sourceIndex = Math.max(0, Math.min(sourceRange.length - 1, Math.round(Number(sourceEq.freq) || 0)));
    const scaledHz = sourceRange[sourceIndex] * ratio;
    targetEq.range = "all";
    targetEq.freq = nearestIndex(data.EQ_FREQ_RANGES.all, scaledHz);
  });
}

function createNotePatch(originalPatch, targetMidi) {
  const notePatch = JSON.parse(JSON.stringify(originalPatch));
  notePatch.midiNote = targetMidi;

  // FM keyboard scaling is intentionally left inside FMEngine. Audition and
  // export therefore use the exact same C4-centered scaling behavior.
  if (notePatch.synth?.fm?.modulators?.[0]) {
    delete notePatch.synth.fm.modulators[0].deviationScale;
  }
  if (notePatch.synth?.fm) {
    delete notePatch.synth.fm.fmDepthPresetScale;
  }

  scaleFilterForTarget(notePatch, originalPatch, targetMidi);
  return notePatch;
}

// ------------------------------------------------------------
//  RENDER NOTE TO WAV
// ------------------------------------------------------------

async function renderNoteToWav(patch) {
  const plan = RenderPlan.create(patch, 48000);
  const offlineCtx = new OfflineAudioContext(2, plan.frameCount, plan.sampleRate);
  const graph = GraphBuilder.build(offlineCtx, patch, plan, { masterMode: "float" });
  graph.node.connect(offlineCtx.destination);

  const renderedBuffer = await offlineCtx.startRendering();
  prepareRenderedBuffer(renderedBuffer);
  return audioBufferToWav(renderedBuffer);
}

function prepareRenderedBuffer(buffer, options = {}) {
  const targetDb = Number.isFinite(options.targetDb) ? options.targetDb : -1;
  const targetPeak = Math.pow(10, targetDb / 20);
  const channels = [];
  let peakBefore = 0;
  let clippedSamplesBefore = 0;
  let dcOffsetMaximum = 0;

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    channels.push(data);

    let mean = 0;
    for (let i = 0; i < data.length; i++) mean += data[i];
    mean /= Math.max(1, data.length);
    dcOffsetMaximum = Math.max(dcOffsetMaximum, Math.abs(mean));

    for (let i = 0; i < data.length; i++) {
      data[i] -= mean;
      const magnitude = Math.abs(data[i]);
      peakBefore = Math.max(peakBefore, magnitude);
      if (magnitude > 1) clippedSamplesBefore += 1;
    }
  }

  // Measure first. Only attenuate when the actual completed render exceeds
  // the requested output ceiling. Quiet sounds are never boosted.
  const appliedGain = peakBefore > targetPeak && peakBefore > 0
    ? targetPeak / peakBefore
    : 1;
  const fadeSamples = Math.min(
    Math.floor(buffer.sampleRate * 0.015),
    Math.floor(buffer.length / 2),
  );

  let peakAfter = 0;
  for (const data of channels) {
    for (let i = 0; i < data.length; i++) {
      data[i] *= appliedGain;
      peakAfter = Math.max(peakAfter, Math.abs(data[i]));
    }

    // Tiny ending fade prevents a click only when rendering truncates a tail.
    for (let i = 0; i < fadeSamples; i++) {
      const index = data.length - fadeSamples + i;
      data[index] *= 1 - i / Math.max(1, fadeSamples - 1);
    }
  }

  return {
    peakBefore,
    peakAfter,
    clippedSamplesBefore,
    dcOffsetMaximum,
    appliedGain,
    targetPeak,
  };
}


async function renderPreEffectsNoteBuffer(originalPatch, targetMidi, sampleRate) {
  const notePatch = createNotePatch(originalPatch, targetMidi);
  const noteLength = Math.max(.05, AmpEnvelopeEngine.computeLength(notePatch.envelope.ahdhd));
  const texturePad = .20;
  const sourceLength = typeof TransientSourceEngine !== "undefined"
    ? TransientSourceEngine.computeRequiredLength(notePatch, noteLength)
    : noteLength;
  const duration = sourceLength + texturePad;
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(sampleRate * duration)), sampleRate);
  const plan = RenderPlan.create(notePatch, sampleRate);
  const graph = GraphBuilder.build(ctx, notePatch, plan, { stage: "preEffects", masterMode: "float" });

  // Each scheduled arp voice is self-contained before the shared effects rack.
  graph.node.connect(ctx.destination);
  return ctx.startRendering();
}

async function renderArpToFloatBuffer(patch, sampleRate) {
  const info = ArpEngine.describe(patch);
  const steps = info.steps;
  const rootMidi = Number(patch.midiNote);
  const loopSeconds = info.loopSeconds;
  const effectsTail = EffectsEngine.computeTail(patch.fx, patch.tempo);
  const duration = Math.max(.1, loopSeconds + effectsTail);
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(sampleRate * duration)), sampleRate);

  const performanceBus = ctx.createGain();

  // Cache each interval's native pre-effects render. Repeated arp notes reuse
  // the exact same source sound while still becoming independent scheduled voices.
  const intervals = [...new Set(
    steps.filter(step => step.note !== null).map(step => step.note)
  )];
  const buffers = new Map();
  for (const interval of intervals) {
    const midi = Math.max(0, Math.min(127, rootMidi + interval));
    buffers.set(interval, await renderPreEffectsNoteBuffer(patch, midi, sampleRate));
  }

  steps.forEach((step, index) => {
    if (step.note === null) return; // rest: no source voice, previous gate has already released.
    const interval = step.note;
    const buffer = buffers.get(interval);
    if (!buffer) return;

    const start = Number.isFinite(step.startSeconds) ? step.startSeconds : index * info.stepSeconds;
    const gateSeconds = Number.isFinite(step.gateSeconds) ? step.gateSeconds : info.stepSeconds * .74;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gate = ctx.createGain();
    const natural = buffer.duration;
    const voiceLength = Math.min(natural, gateSeconds);
    const fade = Math.min(.035, Math.max(.008, voiceLength * .18));
    gate.gain.setValueAtTime(Number.isFinite(step.gain) ? step.gain : 1, start);
    if (natural > gateSeconds) {
      const releaseStart = Math.max(start, start + voiceLength - fade);
      gate.gain.setValueAtTime(1, releaseStart);
      gate.gain.linearRampToValueAtTime(0, start + voiceLength);
    }
    source.connect(gate).connect(performanceBus);
    source.start(start);
    source.stop(Math.min(duration, start + voiceLength + .01));
  });

  const effected = EffectsEngine.applyAll(
    ctx,
    performanceBus,
    patch.fx,
    loopSeconds,
    patch.tempo,
    { floatOutput: true },
  ).node;
  effected.connect(ctx.destination);

  const buffer = await ctx.startRendering();
  const analysis = prepareRenderedBuffer(buffer, { targetDb: -1 });
  return {
    buffer,
    analysis,
    plan: {
      noteLength: loopSeconds,
      effectsTail,
      naturalDuration: duration,
      duration,
      sampleRate,
      frameCount: buffer.length,
      arpLoopSeconds: loopSeconds,
    },
  };
}

async function renderPatchToFloatBuffer(patch, sampleRate) {
  const plan = RenderPlan.create(patch, sampleRate);
  const offlineCtx = new OfflineAudioContext(2, plan.frameCount, plan.sampleRate);
  const graph = GraphBuilder.build(offlineCtx, patch, plan, { masterMode: "float" });
  graph.node.connect(offlineCtx.destination);
  const buffer = await offlineCtx.startRendering();
  const analysis = prepareRenderedBuffer(buffer, { targetDb: -1 });
  return { buffer, analysis, plan };
}

// ------------------------------------------------------------
//  AUDIO BUFFER TO WAV
// ------------------------------------------------------------

function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const data = [];
  let ditherState = 0x1a2b3c4d;
  const random = () => {
    ditherState = (ditherState * 1664525 + 1013904223) >>> 0;
    return ditherState / 4294967296;
  };

  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      // Deterministic triangular dither before 16-bit quantization.
      const dither = (random() - random()) / 65536;
      const clamped = Math.max(-1, Math.min(1, sample + dither));
      const int16 = Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
      data.push(int16);
    }
  }

  const dataLength = data.length * bytesPerSample;
  const buffer_array = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer_array);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write PCM data
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    view.setInt16(offset, data[i], true);
    offset += 2;
  }

  return buffer_array;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// ------------------------------------------------------------
//  CREATE AND DOWNLOAD ZIP
// ------------------------------------------------------------

async function createAndDownloadZip(wavFiles, patch, zones) {
  // Use JSZip library (we'll need to add this)
  // For now, implement a simple multi-file download
  // Or use a ZIP library

  // Check if JSZip is available
  if (typeof JSZip === "undefined") {
    // Fallback: download files individually
    console.warn("JSZip not available, downloading files individually");

    for (const file of wavFiles) {
      const blob = new Blob([file.data], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);

      // Small delay between downloads to avoid browser blocking
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    alert(`✅ Downloaded ${wavFiles.length} WAV files!`);
    return;
  }

  // Create ZIP with JSZip
  const zip = new JSZip();

  // Add all WAV files to ZIP
  for (const file of wavFiles) {
    zip.file(file.name, file.data);
  }

  const manifest = {
    format: "interPhace multisample",
    version: 2,
    rootMidi: patch.midiNote,
    rootNote: midiToName(patch.midiNote),
    lowMidi: zones[0].low,
    highMidi: zones[zones.length - 1].high,
    sampleStep: 1,
    zones,
    sampleRate: 48000,
    bitDepth: 16,
    renderedAt: new Date().toISOString(),
    patch: patch,
  };
  zip.file("interPhace-patch.json", JSON.stringify({
    format: "interPhace-patch",
    version: 1,
    patch: patch,
  }, null, 2));
    zip.file("interPhace-manifest.json", JSON.stringify(manifest, null, 2));

  const sfzRegions = zones.map((zone, index) =>
    `<region> sample=${wavFiles[index].name} key=${zone.root} lokey=${zone.low} hikey=${zone.high} pitch_keycenter=${zone.root}`
  ).join("\n");
  zip.file("interPhace.sfz", `// interPhace multisample mapping\n<group> ampeg_release=0.05\n${sfzRegions}\n`);

  const mapText = zones.map((zone, index) =>
    `${wavFiles[index].name}: ${zone.lowNote} (${zone.low}) through ${zone.highNote} (${zone.high}), root ${zone.rootNote} (${zone.root})`
  ).join("\n");
  zip.file("KEY-ZONES.txt", mapText + "\n");
  zip.file("README.txt", "interPhace multisample export\n\nWAV files are normalized 16-bit stereo PCM.\ninterPhace.sfz can be loaded by SFZ-compatible samplers.\nKEY-ZONES.txt lists the intended mapping for hardware samplers.\ninterPhace-patch.json is loadable with Load Patch.\nThe JSON manifest contains the complete patch and zone data.\n");

  // Generate ZIP file
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Download ZIP
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;

  // Generate filename from patch preset name if available
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const localDate = `${yy}${mm}${dd}`;

  const counterKey = "interPhaceRenderCounter";
  const dateKey = "interPhaceRenderDate";
  const storedDate = localStorage.getItem(dateKey);
  let counter = storedDate === localDate
    ? (parseInt(localStorage.getItem(counterKey), 10) || 0) + 1
    : 1;

  localStorage.setItem(dateKey, localDate);
  localStorage.setItem(counterKey, String(counter));

  const sequence = String(counter).padStart(3, "0");
  a.download = `interPhace-${localDate}-${sequence}.zip`;

  a.click();
  URL.revokeObjectURL(url);

  alert(`✅ Rendered ${wavFiles.length} notes!\nDownloading ZIP...`);
}

// ------------------------------------------------------------
//  PLAYBACK UI (start/stop button)
// ------------------------------------------------------------

RenderEngine.initPlaybackUI = function (patch) {
  const playBtn = document.getElementById("play");
  if (!playBtn) return;
  let auditionGeneration = 0;

  const setIdle = () => {
    playBtn.disabled = false;
    playBtn.textContent = "Audition";
    playBtn.classList.remove("playing");
  };

  const togglePlayback = async () => {
    if (window.activePlayback) {
      auditionGeneration += 1;
      RenderEngine.stop();
      setIdle();
      return;
    }

    const generation = ++auditionGeneration;
    try {
      playBtn.disabled = true;
      playBtn.textContent = "Rendering...";
      updateParamsFromHTML();

      const ctx = getPlaybackContext();
      const arpIsActive = typeof ArpEngine !== "undefined" && ArpEngine.isActive(patch);
      const result = arpIsActive
        ? await renderArpToFloatBuffer(patch, ctx.sampleRate)
        : await renderPatchToFloatBuffer(patch, ctx.sampleRate);
      if (generation !== auditionGeneration) return;

      const source = ctx.createBufferSource();
      source.buffer = result.buffer;
      const outGain = ctx.createGain();
      outGain.gain.value = 1;
      source.connect(outGain);
      outGain.connect(ctx.destination);

      const playback = {
        ctx,
        source,
        outGain,
        analysis: result.analysis,
        stopped: false,
      };
      window.activePlayback = playback;

      source.addEventListener("ended", () => {
        if (window.activePlayback === playback) {
          window.activePlayback = null;
          setIdle();
        }
      });

      console.log("🎧 Float audition analysis", {
        peakBefore: result.analysis.peakBefore,
        clippedSamplesBefore: result.analysis.clippedSamplesBefore,
        appliedGain: result.analysis.appliedGain,
        peakAfter: result.analysis.peakAfter,
      });

      source.start();
      playBtn.disabled = false;
      playBtn.textContent = "Stop";
      playBtn.classList.add("playing");
    } catch (err) {
      console.error("Playback error:", err);
      window.activePlayback = null;
      setIdle();
      alert("Failed to render audition. Please try again.");
    }
  };

  playBtn.addEventListener("click", togglePlayback);
  const handleSpace = (event) => {
    if (event.code !== "Space") return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (event.type === "keyup") togglePlayback();
  };
  window.addEventListener("keydown", handleSpace, true);
  window.addEventListener("keyup", handleSpace, true);
};

// ------------------------------------------------------------
//  START FROM PATCH (main render pipeline)
// ------------------------------------------------------------

RenderEngine.startFromPatch = function (patch) {
  updateParamsFromHTML();

  // Use persistent playback context (48kHz for performance)
  const ctx = getPlaybackContext();

  const plan = RenderPlan.create(patch, ctx.sampleRate);
  const graph = GraphBuilder.build(ctx, patch, plan);
  const finalNode = graph.node;
  const noteLength = graph.noteLength;
  const playbackTail = plan.effectsTail;

  finalNode.connect(ctx.destination);

  // --------------------------------------------------------
  // 7) NATURAL TIMEOUT CLEANUP
  // --------------------------------------------------------

  const cleanupTimeout = setTimeout(
    () => {
      if (
        window.activePlayback &&
        window.activePlayback.timeoutId === cleanupTimeout
      ) {
        window.activePlayback = null;

        // Update button UI
        const playBtn = document.getElementById("play");
        if (playBtn) {
          playBtn.textContent = "Audition";
          playBtn.classList.remove("playing");
        }
      }
    },
    (noteLength + playbackTail + 0.1) * 1000,
  );

  // --------------------------------------------------------
  // 8) RETURN PLAYBACK HANDLE
  // --------------------------------------------------------

  return {
    ctx,
    outGain: finalNode,
    noteLength,
    timeoutId: cleanupTimeout,
  };
};

// ------------------------------------------------------------
//  STOP (manual stop with fade-out)
// ------------------------------------------------------------

RenderEngine.stop = function () {
  if (!window.activePlayback) return;

  const playback = window.activePlayback;
  const { ctx, outGain, source, timeoutId } = playback;
  if (timeoutId) clearTimeout(timeoutId);

  const now = ctx.currentTime;
  outGain.gain.cancelScheduledValues(now);
  outGain.gain.setValueAtTime(outGain.gain.value, now);
  outGain.gain.linearRampToValueAtTime(0, now + 0.08);
  playback.stopped = true;

  setTimeout(() => {
    try {
      if (source) source.stop();
    } catch (_) {}
    if (window.activePlayback === playback) window.activePlayback = null;
  }, 100);
};

