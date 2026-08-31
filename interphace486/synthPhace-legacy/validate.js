const fs = require("fs");
const vm = require("vm");
const path = require("path");
const root = __dirname;
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const context = { window: {} };
vm.createContext(context);
for (const file of [
  "js/data/personality-authoring.js",
  "js/data/pitch-presets.js",
  "js/data/chord-presets.js",
  "js/data/envelope-presets.js",
  "js/data/instrument-behaviors.js",
  "js/data/character-personalities.js",
  "js/data/filter-frequencies.js",
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const data = context.window.InterPhaceData;
const filterData = context.window.FilterFrequencyData;
assert(filterData && Array.isArray(filterData.LP_FREQ_PRESETS), "Low-pass frequency table missing");
assert(filterData && Array.isArray(filterData.HP_FREQ_PRESETS), "High-pass frequency table missing");
assert(filterData.LP_FREQ_PRESETS[0] === 60 && filterData.LP_FREQ_PRESETS.at(-1) === 20000, "High Cut range must be 60 Hz to 20 kHz");
assert(filterData.HP_FREQ_PRESETS[0] === 20 && filterData.HP_FREQ_PRESETS.at(-1) === 6300, "Low Cut range must be 20 Hz to 6.3 kHz");
for (const [name, values] of [["High Cut", filterData.LP_FREQ_PRESETS], ["Low Cut", filterData.HP_FREQ_PRESETS]]) {
  assert(values.every((value, index) => Number.isFinite(value) && (index === 0 || value > values[index - 1])), `${name} frequencies must be strictly ascending`);
}


const chordPresetBanks = data.CHORD_PRESET_BANKS;
assert(chordPresetBanks && Object.keys(chordPresetBanks).length === 6, "Six scale-specific harmonic preset banks required");
for (const [scale, bank] of Object.entries(chordPresetBanks)) {
  assert(Array.isArray(bank) && bank.length >= 12, `Harmonic preset bank ${scale} must contain useful presets`);
  const names = new Set();
  for (let index = 0; index < bank.length; index += 1) {
    const preset = bank[index];
    assert(preset.index === index, `${scale} preset ${preset.name || index} must use contiguous index ${index}`);
    assert(preset.name && !names.has(preset.name), `Invalid or duplicate ${scale} preset name: ${preset.name}`);
    names.add(preset.name);
    for (const key of ["h1Gain", "h2Gain"]) {
      assert(Number.isFinite(preset[key]) && preset[key] >= 0 && preset[key] <= 100, `${preset.name} has invalid ${key}`);
    }
    for (const key of ["h1Offset", "h2Offset"]) {
      assert(Number.isFinite(preset[key]) && preset[key] >= -36 && preset[key] <= 36, `${preset.name} has invalid ${key}`);
    }
  }
}

const phases = new Set(["attack", "hold1", "decay1", "hold2", "decay2"]);
const sharedFields = [
  "phasePosition", "volume", "pitch", "brightness", "brightnessHz",
  "motionRate", "motionDepth", "gainRate", "gainDepth", "pitchRate",
  "pitchDepth", "brightnessMotionRate", "brightnessMotionDepth",
];
const schemas = [
  ["Instrument", data.INSTRUMENT_BEHAVIORS, [...sharedFields, "companionLower", "companionEqual", "companionHigher"]],
  ["Character", data.CHARACTER_PRESETS, sharedFields],
];
for (const [label, list, numericFields] of schemas) {
  assert(Array.isArray(list), `${label} data missing`);
  const names = new Set();
  for (const profile of list || []) {
    assert(profile.kind === label.toLowerCase(), `${profile.name} has invalid profile kind`);
    assert(Object.isFrozen(profile), `${profile.name} profile must be immutable`);
    assert(profile.name && !names.has(profile.name), `${label} invalid or duplicate name: ${profile.name}`);
    names.add(profile.name);
    assert(Array.isArray(profile.events) && profile.events.length === 20, `${profile.name} must contain exactly 20 explicit events`);
    const ids = new Set();
    for (const event of profile.events || []) {
      assert(Object.isFrozen(event), `${profile.name} event ${event.id} must be immutable`);
      assert(!ids.has(event.id), `${profile.name} has duplicate event id ${event.id}`);
      ids.add(event.id);
      assert(phases.has(event.phase), `${profile.name} event ${event.id} has invalid phase ${event.phase}`);
      assert(Number.isFinite(event.phasePosition) && event.phasePosition >= 0 && event.phasePosition <= 1,
        `${profile.name} event ${event.id} has invalid phase position`);
      for (const key of numericFields) {
        assert(Number.isFinite(event[key]), `${profile.name} event ${event.id} has invalid ${key}`);
      }
    }
  }
}


const envelopeControllerSource = fs.readFileSync(path.join(root, "js/app/envelope-controller.js"), "utf8");
assert(!/\benv\.personality\b/.test(envelopeControllerSource), "Live envelope controller must not recreate legacy personality state");
const stateSource = fs.readFileSync(path.join(root, "js/app/state.js"), "utf8");
assert(!/\bpersonality\s*:/.test(stateSource), "Default patch must not contain legacy personality state");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const chordSliderMatch = html.match(/id="chordPreset"[\s\S]*?max="(\d+)"/);
assert(chordSliderMatch, "Chord preset slider must exist");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
assert(duplicateIds.length === 0, `Duplicate HTML ids: ${[...new Set(duplicateIds)].join(", ")}`);
for (const match of html.matchAll(/<script\s+src="([^"]+)"/g)) {
  const source = match[1];
  if (/^https?:/.test(source)) continue;
  assert(fs.existsSync(path.join(root, source)), `Missing script: ${source}`);
}

const jsFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".js")) jsFiles.push(full);
  }
}
walk(path.join(root, "js"));
assert(jsFiles.length > 0, "No JavaScript modules found");

if (errors.length) {
  console.error(`FAIL (${errors.length})`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`PASS: ${data.INSTRUMENT_BEHAVIORS.length} instruments, ${data.CHARACTER_PRESETS.length} characters, ${jsFiles.length} JavaScript modules, ${ids.length} unique UI ids.`);
