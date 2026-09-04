
const shell = document.getElementById("shell");
const auditionBtn = document.getElementById("shellAudition");
const melodyBtn = document.getElementById("shellB1");
const arpBtn = document.getElementById("shellB2");
const ARP_B2_LONG_PRESS_MS = 900;
const ARP_B2_FILL_DELAY_MS = 200;
let arpB2LongPressTimer = null;
let arpB2LongPressStart = 0;
let arpB2LongPressFrame = 0;
let arpB2LongPressFired = false;

function setArpB2LongPressFill(percent) {
  arpBtn.style.setProperty("--clear-fill", `${Math.max(0, Math.min(100, percent))}%`);
}

function cancelArpB2LongPress() {
  if (arpB2LongPressTimer !== null) {
    clearTimeout(arpB2LongPressTimer);
    arpB2LongPressTimer = null;
  }
  if (arpB2LongPressFrame) {
    cancelAnimationFrame(arpB2LongPressFrame);
    arpB2LongPressFrame = 0;
  }
  setArpB2LongPressFill(0);
}

function updateArpB2LongPressFill(now) {
  if (!arpB2LongPressStart || arpB2LongPressTimer === null) return;
  setArpB2LongPressFill(Math.max(0, ((now - arpB2LongPressStart - ARP_B2_FILL_DELAY_MS) / (ARP_B2_LONG_PRESS_MS - ARP_B2_FILL_DELAY_MS)) * 100));
  arpB2LongPressFrame = requestAnimationFrame(updateArpB2LongPressFill);
}

function beginArpB2LongPress(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (currentView !== "arp") return;

  arpB2LongPressFired = false;
  cancelArpB2LongPress();
  arpB2LongPressStart = performance.now();

  try { arpBtn.setPointerCapture?.(event.pointerId); } catch (_) {}

  arpB2LongPressFrame = requestAnimationFrame(updateArpB2LongPressFill);
  arpB2LongPressTimer = window.setTimeout(() => {
    arpB2LongPressTimer = null;
    arpB2LongPressFired = true;

    if (arpB2LongPressFrame) {
      cancelAnimationFrame(arpB2LongPressFrame);
      arpB2LongPressFrame = 0;
    }

    setArpB2LongPressFill(100);

    if (arpB2CopyState) pasteArpPageToActive();
    else copyActiveArpPage();

    window.setTimeout(() => setArpB2LongPressFill(0), 180);
  }, ARP_B2_LONG_PRESS_MS);
}

const chanceBtn = document.getElementById("shellB3");
const styleBtn = document.getElementById("shellB4");
const generateBtn = document.getElementById("shellB5");

const app3_b1_p1_c1 = document.getElementById("app3_b1_p1_c1");
const app3_b1_p1 = document.getElementById("app3_b1_p1");
const arpStage = document.getElementById("app3_b2_p1");
const arpPatternGrid = document.getElementById("app3_b2_pattern_grid");
const shellMaker = document.querySelector(".shell-maker");
const arpTitle = document.getElementById("app3_b2_p1_title");

const macroLabels = [1,2,3,4].map(i => document.getElementById(`app3_b2_p1_c${i}_label`));
const macroSliders = [1,2,3,4].map(i => document.getElementById(`app3_b2_p1_c${i}`));
const macroValues = [1,2,3,4].map(i => document.getElementById(`app3_b2_p1_c${i}_value`));

const phrases = ["p1", "p2", "p3", "p4"];
const phraseNumbers = { p1: 1, p2: 2, p3: 3, p4: 4 };
const chancePages = ["chance", "volume", "gate"];

const PRODUCER_STYLES = Object.freeze(["postal", "bears"]);
const ARP_MUTATION_STYLES = Object.freeze(["sparse", "repeat", "motif", "phrase", "shuffle"]);
const STYLE_LABELS = Object.freeze({
  postal: "postal",
  bears: "bears",
  rotate: "rotate",
  subs: "subs",
  octave: "octave",
  sparse: "sparse",
  repeat: "repeat",
  reverse: "reverse",
  phrase: "phrase",
});

const ROWS = 16;
const MAX_COLS = 8;
const STORAGE_KEY = "interPhace.arpPhace.template.v1";
const GRID_LABEL_MODE_KEY = "interPhace.gridLabelMode.v1";

let currentPhrase = "p1";
let currentView = "melody";
let b2PageIndex = 0;
const b2Pages = ["Arp 1", "Arp 2", "Arp 3", "Arp 4"];
const b2Labels = [
  ["Pattern", "Rate", "Gate", "Rhythm"],
  ["Pattern", "Rate", "Gate", "Rhythm"],
  ["Pattern", "Rate", "Gate", "Rhythm"],
  ["Pattern", "Rate", "Gate", "Rhythm"],
];
const B2_GENERATOR_LAYOUT_VERSION = 3;
function activeB2Phrase() { return phrases[b2PageIndex] || "p1"; }
let visibleCols = getDisplayColumns();
let melodyChooserTarget = null;
let melodyChooserAnchor = null;
let melodyChooserOctave = 0;
let melodyChooserThirtySecond = false;
let melodyChooserFirstSubstep = null;
let melodyChooserFull = false;
let arpChooserTarget = null;
let arpChooserAnchor = null;
let arpChooserOctave = 0;
let arpChooserThirtySecond = false;
let arpChooserFirstSubstep = null;
let gateChooserTarget = null;
let gateChooserAnchor = null;
let chanceChooserTarget = null;
let chanceChooserAnchor = null;
let volumeChooserTarget = null;
let volumeChooserAnchor = null;
let melodyColumnCopyState = null;
let labelMode = (() => {
  try {
    return localStorage.getItem(GRID_LABEL_MODE_KEY) === "hex" ? "hex" : "res";
  } catch (_) {
    return "res";
  }
})();

const chancePageIndex = { p1: 0, p2: 0, p3: 0, p4: 0 };

// B4 is contextual. Each B1/B2/B3 page remembers its own selection.
const styleState = {
  melody: Object.fromEntries(phrases.map(phrase => [phrase, "postal"])),
  arp: Object.fromEntries(phrases.map(phrase => [phrase, "shuffle"])),
  chance: Object.fromEntries(phrases.map(phrase => [
    phrase,
    Object.fromEntries(chancePages.map(page => [page, "postal"]))
  ])),
};

const melodyState = Object.fromEntries(
  phrases.map(phrase => [
    phrase,
    Array.from({ length: ROWS }, () => Array(MAX_COLS).fill(""))
  ])
);

const chanceState = Object.fromEntries(
  phrases.map(phrase => [
    phrase,
    Object.fromEntries(
      chancePages.map(page => [
        page,
        Array.from({ length: ROWS }, () => Array(MAX_COLS).fill(null))
      ])
    )
  ])
);

const ARP_RATE_TABLE = Object.freeze([
  Object.freeze({ label: "1/32", beats: 0.125, stepsPerBar: 32 }),
  Object.freeze({ label: "1/16", beats: 0.25, stepsPerBar: 16 }),
  Object.freeze({ label: "1/8", beats: 0.5, stepsPerBar: 8 }),
  Object.freeze({ label: "1/4", beats: 1, stepsPerBar: 4 }),
  Object.freeze({ label: "1/2", beats: 2, stepsPerBar: 2 }),
  Object.freeze({ label: "1/1", beats: 4, stepsPerBar: 1 })
]);
const ARP_RATE_DEFAULT_INDEX = 1;

function arpRateEntry(value) {
  const index = Math.max(0, Math.min(ARP_RATE_TABLE.length - 1, Math.round(Number(value))));
  return ARP_RATE_TABLE[index] || ARP_RATE_TABLE[ARP_RATE_DEFAULT_INDEX];
}


function arpGatePercent(value) {
  const numeric = Number(value);
  return Math.max(10, Math.min(100, Number.isFinite(numeric) ? Math.round(numeric) : 75));
}

function arpGateTiming({ rateIndex, gatePercent, tempo }) {
  const rate = arpRateEntry(rateIndex);
  const bpm = Math.max(1, Number(tempo) || 75);
  const stepSeconds = (60 / bpm) * rate.beats;
  const gateSeconds = stepSeconds * (arpGatePercent(gatePercent) / 100);

  return Object.freeze({
    rate: rate.label,
    stepSeconds,
    gatePercent: arpGatePercent(gatePercent),
    gateSeconds,
  });
}

const ARP_PATTERN_PRESETS = Object.freeze([
  { name: "Off", phrase: Array(16).fill(null) },

  { name: "Up", phrase: ["1","2","3","4","5","6","7","1↑","1","2","3","4","5","6","7","1↑"] },
  { name: "Down", phrase: ["1↑","7","6","5","4","3","2","1","1↑","7","6","5","4","3","2","1"] },
  { name: "Up Down", phrase: ["1","2","3","4","5","6","7","1↑","7","6","5","4","3","2","1","2"] },
  { name: "Down Up", phrase: ["1↑","7","6","5","4","3","2","1","2","3","4","5","6","7","1↑","7"] },

  { name: "Triad Up", phrase: ["1","3","5","1↑","3","5","1↑","3↑","1","3","5","1↑","3","5","1↑","3↑"] },
  { name: "Triad Down", phrase: ["1↑","5","3","1","5","3","1","5↓","1↑","5","3","1","5","3","1","5↓"] },
  { name: "Triad 3 Start", phrase: ["3","5","1↑","3↑","5","1↑","3↑","5↑","3","5","1↑","3↑","5","1↑","3↑","5↑"] },
  { name: "Triad 5 Start", phrase: ["5","1↑","3↑","5↑","1↑","3↑","5↑","1↑","5","1↑","3↑","5↑","1↑","3↑","5↑","1↑"] },

  { name: "Seventh Up", phrase: ["1","3","5","7","1↑","3↑","5↑","7↑","1","3","5","7","1↑","3↑","5↑","7↑"] },
  { name: "Seventh Down", phrase: ["7↑","5↑","3↑","1↑","7","5","3","1","7↑","5↑","3↑","1↑","7","5","3","1"] },

  { name: "1 3 2 4", phrase: ["1","3","2","4","3","5","4","6","5","7","6","1↑","7","2↑","1↑","3↑"] },
  { name: "1 5 3 7", phrase: ["1","5","3","7","2","6","4","1↑","3","7","5","2↑","4","1↑","6","3↑"] },
  { name: "Skip Up", phrase: ["1","3","5","2","4","6","3","5","7","4","6","1↑","5","7","2↑","1↑"] },
  { name: "Skip Down", phrase: ["1↑","6","7","5","6","4","5","3","4","2","3","1","2","7↓","1","6↓"] },

  { name: "Pendulum", phrase: ["1","5","2","5","3","5","4","5","6","5","7","5","1↑","5","3↑","5"] },
  { name: "Low High", phrase: ["1","1↑","2","7","3","6","4","5","5","4","6","3","7","2","1↑","1"] },
  { name: "Inside Out", phrase: ["4","5","3","6","2","7","1","1↑","5","4","6","3","7","2","1↑","1"] },
  { name: "Outside In", phrase: ["1","1↑","2","7","3","6","4","5","4","5","3","6","2","7","1","1↑"] },

  { name: "Broken", phrase: ["1","3","5","3","2","4","6","4","3","5","7","5","4","6","1↑","6"] },
  { name: "Wide Broken", phrase: ["1","5","3↑","1↑","2","6","4↑","2↑","3","7","5↑","3↑","4","1↑","6↑","4↑"] },
  { name: "Octaves", phrase: ["1","1↑","2","2↑","3","3↑","4","4↑","5","5↑","6","6↑","7","7↑","1↑","1"] },

  { name: "Up From 3", phrase: ["3","4","5","6","7","1↑","2↑","3↑","3","4","5","6","7","1↑","2↑","3↑"] },
  { name: "Up From 5", phrase: ["5","6","7","1↑","2↑","3↑","4↑","5↑","5","6","7","1↑","2↑","3↑","4↑","5↑"] },
  { name: "Down From 5", phrase: ["5","4","3","2","1","7↓","6↓","5↓","5","4","3","2","1","7↓","6↓","5↓"] },

  { name: "Up 4th Rest", phrase: ["1","2","3","4","5","6","7",null,"1","2","3","4","5","6","7",null] },
  { name: "Down 4th Rest", phrase: ["1↑","7","6","5","4","3","2",null,"1↑","7","6","5","4","3","2",null] },
  { name: "Up 3rd Rest", phrase: ["1","2","3","4",null,null,null,null,"5","6","7","1↑","1","2","3","4"] },
  { name: "Up 2+4 Rest", phrase: ["1","2","3",null,"5","6","7",null,"1","2","3",null,"5","6","7",null] },
  { name: "Call Answer", phrase: ["1","2","3","4",null,null,null,null,"5","6","7","1↑",null,null,null,null] },
  { name: "Triad 4th Rest", phrase: ["1","3","5","1↑","3","5","1↑",null,"1","3","5","1↑","3","5","1↑",null] },
]);

const ARP_MOTION_PRESETS = Object.freeze([
  Object.freeze({ name: "Off" }),
  Object.freeze({ name: "Push" }),
  Object.freeze({ name: "Pull" }),
  Object.freeze({ name: "Skip 2" }),
  Object.freeze({ name: "Skip 3" }),
  Object.freeze({ name: "Backstep" }),
  Object.freeze({ name: "Forward Step" }),
  Object.freeze({ name: "Split" }),
  Object.freeze({ name: "Half Turn" }),
  Object.freeze({ name: "Pair Turn" }),
  Object.freeze({ name: "Alternating" }),
  Object.freeze({ name: "Cross" }),
  Object.freeze({ name: "Outside In" }),
  Object.freeze({ name: "Inside Out" }),
  Object.freeze({ name: "Zigzag" }),
  Object.freeze({ name: "Wide Zigzag" }),
  Object.freeze({ name: "Cluster" }),
  Object.freeze({ name: "Open Cluster" }),
  Object.freeze({ name: "Drift" }),
  Object.freeze({ name: "Scatter" }),
  Object.freeze({ name: "Scatter Wide" }),
  Object.freeze({ name: "Repeat 1" }),
  Object.freeze({ name: "Repeat 2" }),
  Object.freeze({ name: "Repeat 3" }),
  Object.freeze({ name: "Repeat 4" }),
  Object.freeze({ name: "Rest 1" }),
  Object.freeze({ name: "Rest 2" }),
  Object.freeze({ name: "Rest 3" }),
  Object.freeze({ name: "Rest 4" }),
]);

function applyArpMotionToPhrase(source, motionIndex) {
  return Array.from({ length: 16 }, (_, index) =>
    index < source.length ? source[index] : null
  );
}

function arpMotionStrength(motionIndex) {
  return Math.max(0, Math.min(
    ARP_MOTION_PRESETS.length - 1,
    Math.round(Number(motionIndex) || 0)
  ));
}

function arpRhythmPreset(motionIndex) {
  return ARP_MOTION_PRESETS[arpMotionStrength(motionIndex)] || ARP_MOTION_PRESETS[0];
}

const RHYTHM_RECIPES_32 = Object.freeze([
  Object.freeze([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]),
  Object.freeze([0,1,2,16,3,4,5,17,6,7,8,18,9,10,11,19,12,20,13,21,14,22,15,23,24,25,26,27,28,29,30,31]),
  Object.freeze([0,16,1,2,3,17,4,5,6,18,7,8,9,19,10,11,20,12,21,13,22,14,23,15,24,25,26,27,28,29,30,31]),
  Object.freeze([0,1,16,2,3,17,4,5,18,6,7,19,8,9,20,10,21,11,12,22,13,14,23,15,24,25,26,27,28,29,30,31]),
  Object.freeze([0,16,1,17,2,3,18,4,19,5,6,20,7,21,8,9,22,10,23,11,12,13,14,15,24,25,26,27,28,29,30,31]),
  Object.freeze([0,1,16,3,17,2,4,18,5,7,19,6,20,8,9,21,11,22,10,12,23,13,15,14,24,25,26,27,28,29,30,31]),
  Object.freeze([0,16,2,1,17,3,18,4,6,19,5,7,20,8,21,10,9,11,22,12,14,23,13,15,24,25,26,27,28,29,30,31]),
  Object.freeze([0,1,2,3,16,4,5,6,17,7,18,19,20,21,22,23,8,9,10,11,24,12,13,14,15,25,26,27,28,29,30,31]),
  Object.freeze([0,1,16,2,3,17,4,5,18,6,7,19,20,21,22,23,8,24,9,10,25,11,12,26,13,14,27,15,28,29,30,31]),
  Object.freeze([0,16,1,3,17,2,5,18,4,7,19,6,20,21,22,23,8,9,24,11,10,25,13,12,26,15,14,27,28,29,30,31]),
  Object.freeze([0,16,1,17,2,18,3,19,4,20,5,21,6,22,7,23,24,8,25,9,26,10,27,11,28,12,29,13,30,14,31,15]),
  Object.freeze([0,1,16,17,2,3,18,19,4,5,20,21,6,7,22,23,24,25,8,9,26,27,10,11,28,29,12,13,30,31,14,15]),
  Object.freeze([0,16,17,15,18,19,1,20,21,14,22,23,2,24,25,13,26,27,3,8,28,12,7,29,4,9,30,11,6,31,5,10]),
  Object.freeze([0,16,1,17,2,18,3,19,4,20,5,21,6,22,7,23,8,24,9,25,10,26,11,27,12,28,13,29,14,30,15,31]),
  Object.freeze([0,1,3,2,5,4,7,6,16,9,8,17,11,10,18,19,13,12,20,21,22,14,23,24,25,15,26,27,28,29,30,31]),
  Object.freeze([0,1,16,2,17,3,4,18,5,6,19,20,7,8,21,22,9,10,23,24,11,12,25,26,13,27,28,29,15,30,31,14]),
  Object.freeze([0,1,2,16,17,18,19,3,4,5,20,21,22,23,24,6,7,8,25,26,27,28,9,10,11,29,30,31,12,13,14,15]),
  Object.freeze([0,1,16,17,18,19,2,3,20,15,21,22,4,5,23,14,24,25,6,7,26,13,27,28,8,9,29,12,30,31,10,11]),
  Object.freeze([0,1,16,2,17,3,18,4,19,5,20,6,21,7,22,23,8,24,9,25,10,26,11,27,12,28,13,29,14,30,15,31]),
  Object.freeze([0,16,1,17,3,2,18,5,4,19,7,20,21,9,22,23,6,8,24,11,10,25,13,26,27,15,28,12,29,30,14,31]),
  Object.freeze([0,16,1,17,2,18,4,19,3,20,6,21,5,22,8,23,7,24,10,25,9,26,12,27,11,28,14,29,30,31,15,13]),
  Object.freeze([0,1,16,17,2,3,18,19,4,5,20,21,6,7,22,23,8,9,24,25,10,11,26,27,12,13,28,29,14,15,30,31]),
  Object.freeze([0,1,16,17,18,2,3,19,20,21,4,5,22,23,24,6,7,25,26,27,8,9,28,29,30,10,11,14,31,12,13,15]),
  Object.freeze([0,16,1,2,17,18,19,3,4,20,21,22,5,6,23,24,25,7,8,26,27,28,9,10,29,30,31,11,12,14,13,15]),
  Object.freeze([0,1,2,16,17,18,3,4,5,19,20,21,22,6,7,8,23,24,25,26,9,10,11,27,28,29,30,12,13,31,14,15]),
  Object.freeze([0,1,2,3,16,17,18,19,4,5,6,7,20,21,22,23,8,9,10,11,24,25,26,27,12,13,14,15,28,29,30,31]),
  Object.freeze([0,1,16,17,2,3,18,19,20,4,5,21,22,6,7,23,24,25,8,9,26,27,28,10,11,29,30,12,13,31,14,15]),
  Object.freeze([0,16,1,17,18,2,19,3,20,21,4,22,5,23,24,6,25,7,26,27,8,28,9,29,30,10,31,11,15,12,13,14]),
  Object.freeze([0,16,17,1,18,19,2,20,21,3,22,23,4,24,25,5,26,27,6,28,15,7,29,14,8,30,13,9,31,12,10,11])
]);

function rhythmRecipe32(motionIndex) {
  const index = arpMotionStrength(motionIndex);
  return RHYTHM_RECIPES_32[index] || RHYTHM_RECIPES_32[0];
}

function applyRhythmRecipeToCells(cells, motionIndex) {
  const recipe = rhythmRecipe32(motionIndex);
  const out = Array(B2_DISPLAY_STEPS).fill("");
  for (let displayIndex = 0; displayIndex < B2_REAL_STEPS; displayIndex += 1) {
    out[displayIndex] = String(cells?.[recipe[displayIndex]] ?? "");
  }
  return out;
}

function normalizeGridToFirstActiveHalfStep(grid) {
  const ticks = splitArpGridToHalfSteps(grid);
  let first = ticks.findIndex(value => String(value ?? "").trim() !== "");
  if (first < 0) first = 0;

  const normalized = Array(B2_REAL_STEPS * 2).fill("");
  for (let tick = first; tick < ticks.length; tick += 1) {
    normalized[tick - first] = ticks[tick];
  }
  return packHalfStepsToArpGrid(normalized);
}

function normalizeGeneratedGridForDisplay(phraseId, trueGrid) {
  const ticks = splitArpGridToHalfSteps(trueGrid);
  let first = ticks.findIndex(value => String(value ?? "").trim() !== "");
  if (first < 0) first = 0;

  arpGeneratedDisplayOffsetTicks[phraseId] = first;
  arpGeneratedTrueGrid[phraseId] = cloneRealB2Grid(trueGrid);

  const normalized = Array(B2_REAL_STEPS * 2).fill("");
  for (let tick = first; tick < ticks.length; tick += 1) {
    normalized[tick - first] = ticks[tick];
  }
  return packHalfStepsToArpGrid(normalized);
}

function scaleGridByRate(grid, fromRateIndex, toRateIndex) {
  const fromRate = arpRateEntry(fromRateIndex);
  const toRate = arpRateEntry(toRateIndex);
  const scale = toRate.beats / fromRate.beats;
  if (!Number.isFinite(scale) || scale === 1) return cloneRealB2Grid(grid);

  const sourceTicks = splitArpGridToHalfSteps(grid);
  const targetTicks = Array(B2_REAL_STEPS * 2).fill("");

  sourceTicks.forEach((value, sourceTick) => {
    if (!String(value ?? "").trim()) return;
    const targetTick = Math.round(sourceTick * scale);
    if (targetTick < 0 || targetTick >= targetTicks.length) return;
    if (!targetTicks[targetTick]) targetTicks[targetTick] = value;
  });

  return packHalfStepsToArpGrid(targetTicks);
}





function applyRhythmOrderTweaks(events, level) {
  const out = events.slice();
  if (level >= 16 && out.length >= 8) [out[4], out[5]] = [out[5], out[4]];
  if (level >= 18 && out.length >= 12) [out[9], out[10]] = [out[10], out[9]];
  if (level >= 23 && out.length >= 6) [out[2], out[3]] = [out[3], out[2]];
  return out;
}




const ARP_UI_DEFAULTS = Object.freeze([ARP_RATE_DEFAULT_INDEX, 75, 0, 0]);
const arpUiState = Object.fromEntries(phrases.map(phrase => [phrase, [...ARP_UI_DEFAULTS]]));
const arpPatternState = Object.fromEntries(phrases.map(phrase => [phrase, Array(64).fill("")]));
const arpPatternCustom = Object.fromEntries(phrases.map(phrase => [phrase, false]));
const arpPatternCanonical = Object.fromEntries(
  phrases.map(phrase => [phrase, Array(64).fill("")])
);
const arpGeneratedTrueGrid = Object.fromEntries(
  phrases.map(phrase => [phrase, Array(64).fill("")])
);
const arpGeneratedDisplayOffsetTicks = Object.fromEntries(
  phrases.map(phrase => [phrase, 0])
);

const arpGenerateSource = Object.fromEntries(phrases.map(phrase => [phrase, null]));

let arpB2CopyState = null;

function clearArpB2CopyState() {
  arpB2CopyState = null;
}

function copyActiveArpPage() {
  const phraseId = activeB2Phrase();
  arpB2CopyState = Object.freeze({
    ui: [...arpUiState[phraseId]],
    grid: cloneRealB2Grid(arpPatternState[phraseId]),
    custom: arpPatternCustom[phraseId] === true,
    canonical: cloneRealB2Grid(arpPatternCanonical[phraseId]),
    generatedTrueGrid: cloneRealB2Grid(arpGeneratedTrueGrid[phraseId]),
    generatedOffset: Number(arpGeneratedDisplayOffsetTicks[phraseId]) || 0,
    style: styleState.arp[phraseId],
  });
}

function pasteArpPageToActive() {
  if (!arpB2CopyState) return false;
  const phraseId = activeB2Phrase();

  arpUiState[phraseId] = [...arpB2CopyState.ui];
  arpPatternState[phraseId] = cloneRealB2Grid(arpB2CopyState.grid);
  arpPatternCustom[phraseId] = arpB2CopyState.custom === true;
  arpPatternCanonical[phraseId] = cloneRealB2Grid(arpB2CopyState.canonical);
  arpGeneratedTrueGrid[phraseId] = cloneRealB2Grid(arpB2CopyState.generatedTrueGrid);
  arpGeneratedDisplayOffsetTicks[phraseId] = Math.max(
    0,
    Math.min((B2_REAL_STEPS * 2) - 1, Math.round(Number(arpB2CopyState.generatedOffset) || 0))
  );
  styleState.arp[phraseId] = ARP_MUTATION_STYLES.includes(arpB2CopyState.style)
    ? arpB2CopyState.style
    : ARP_MUTATION_STYLES[0];

  // Paste starts a fresh Generate session from the pasted result.
  resetArpGenerateSource(phraseId);

  syncB2PatternMirror(phraseId);
  saveState();
  syncArpUi();
  updateStyleButton();
  renderArpPatternBackgroundGrid();
  return true;
}

function resetArpGenerateSource(phraseId = activeB2Phrase()) {
  if (phraseId in arpGenerateSource) arpGenerateSource[phraseId] = null;
}

function arpGenerateSourceGrid(phraseId = activeB2Phrase()) {
  if (!Array.isArray(arpGenerateSource[phraseId])) {
    arpGenerateSource[phraseId] = cloneRealB2Grid(arpPatternState[phraseId]);
  }
  return cloneRealB2Grid(arpGenerateSource[phraseId]);
}

function cloneRealB2Grid(grid) {
  const out = Array(B2_DISPLAY_STEPS).fill("");
  for (let index = 0; index < B2_REAL_STEPS; index += 1) {
    out[index] = String(grid?.[index] ?? "");
  }
  return out;
}

function snapshotCurrentGridAsCanonical(phraseId) {
  arpPatternCanonical[phraseId] = cloneRealB2Grid(arpPatternState[phraseId]);
}

const B2_REAL_STEPS = 32;
const B2_DISPLAY_STEPS = 64;

function b2RealPatternIndex(patternIndex) {
  const numeric = Math.max(0, Math.min(B2_DISPLAY_STEPS - 1, Math.round(Number(patternIndex) || 0)));
  return numeric % B2_REAL_STEPS;
}

function syncB2PatternMirror(phraseId) {
  const grid = arpPatternState[phraseId];
  if (!Array.isArray(grid)) return;
  for (let index = 0; index < B2_REAL_STEPS; index += 1) {
    grid[index + B2_REAL_STEPS] = grid[index] || "";
  }
}

const arpLabels = ["Pattern", "Rate", "Gate", "Rhythm"];
const ARP_UI_SLOT_MAP = Object.freeze([2, 0, 1, 3]);


function updateLogicalPageIds() {
  const phrasePage = phraseNumbers[currentPhrase];
  const gridPageId = currentView === "chance"
    ? `app3_b3_p${chancePageIndex[currentPhrase] + 1}`
    : `app3_b1_p${phrasePage}`;
  const arpPageId = `app3_b2_p${b2PageIndex + 1}`;

  app3_b1_p1.id = gridPageId;
  app3_b1_p1_c1.id = `${gridPageId}_c1`;

  arpStage.id = arpPageId;
  arpTitle.id = `${arpPageId}_title`;
  macroLabels.forEach((element, index) => element.id = `${arpPageId}_c${index + 1}_label`);
  macroSliders.forEach((element, index) => element.id = `${arpPageId}_c${index + 1}`);
  macroValues.forEach((element, index) => element.id = `${arpPageId}_c${index + 1}_value`);

  return currentView === "arp" ? arpPageId : gridPageId;
}

function getDisplayColumns() {
  return window.matchMedia("(min-width: 760px)").matches ? 8 : 4;
}

function activeChancePage() {
  return chancePages[chancePageIndex[currentPhrase]];
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentPhrase,
      currentView,
      b2PageIndex,
      labelMode,
      chancePageIndex,
      styles: styleState,
      melodies: melodyState,
      chance: chanceState,
      arps: arpUiState,
      arpPatternEncoding: "degree-v1",
      arpPatterns: arpPatternState,
      arpPatternCustom,
      arpPatternCanonical,
      arpGeneratedTrueGrid,
      arpGeneratedDisplayOffsetTicks,
    }));
  } catch (_) {}
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return;

    if (phrases.includes(saved.currentPhrase)) currentPhrase = saved.currentPhrase;
    if (["melody","arp","chance"].includes(saved.currentView)) currentView = saved.currentView;
    if (Number.isInteger(saved.b2PageIndex)) b2PageIndex = Math.max(0, Math.min(3, saved.b2PageIndex));

    for (const phrase of phrases) {
      const pageIndex = Number(saved.chancePageIndex?.[phrase]);
      if (Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < chancePages.length) {
        chancePageIndex[phrase] = pageIndex;
      }

      const savedMelodyStyle = saved.styles?.melody?.[phrase];
      if (PRODUCER_STYLES.includes(savedMelodyStyle)) styleState.melody[phrase] = savedMelodyStyle;

      const savedArpStyle = saved.styles?.arp?.[phrase];
      if (ARP_MUTATION_STYLES.includes(savedArpStyle)) styleState.arp[phrase] = savedArpStyle;

      for (const page of chancePages) {
        const savedChanceStyle = saved.styles?.chance?.[phrase]?.[page];
        if (PRODUCER_STYLES.includes(savedChanceStyle)) styleState.chance[phrase][page] = savedChanceStyle;
      }

      const melody = saved.melodies?.[phrase];
      if (Array.isArray(melody)) {
        for (let row = 0; row < ROWS; row++) {
          if (!Array.isArray(melody[row])) continue;
          for (let col = 0; col < MAX_COLS; col++) {
            const value = melody[row][col];
            if (typeof value === "string") {
              melodyState[phrase][row][col] = ["off","on","ghost"].includes(value) ? "" : value;
            }
          }
        }
      }

      const savedChancePages = saved.chance?.[phrase];
      if (savedChancePages && typeof savedChancePages === "object") {
        for (const page of chancePages) {
          const savedGrid = savedChancePages[page];
          if (!Array.isArray(savedGrid)) continue;
          for (let row = 0; row < ROWS; row += 1) {
            if (!Array.isArray(savedGrid[row])) continue;
            for (let col = 0; col < MAX_COLS; col += 1) {
              const raw = savedGrid[row][col];
              if (raw === null || raw === undefined || raw === "") {
                chanceState[phrase][page][row][col] = null;
                continue;
              }
              const numeric = Number(raw);
              if (!Number.isFinite(numeric)) continue;
              if (page === "gate") {
                chanceState[phrase][page][row][col] = Math.max(1, Math.min(100, Math.round(numeric)));
              } else {
                chanceState[phrase][page][row][col] = Math.max(0, Math.min(100, Math.round(numeric)));
              }
            }
          }
        }
      }

      const arp = saved.arps?.[phrase];
      if (Array.isArray(arp)) {
        const rate = Math.max(0, Math.min(ARP_RATE_TABLE.length - 1, Math.round(Number.isFinite(Number(arp[0])) ? Number(arp[0]) : ARP_RATE_DEFAULT_INDEX)));
        const gateRaw = Number(arp[1]);
        const gate = Math.max(
          10,
          Math.min(100, Number.isFinite(gateRaw) ? Math.round(gateRaw) : 75)
        );
        const pattern = Math.max(0, Math.min(ARP_PATTERN_PRESETS.length - 1, Math.round(Number(arp[2]) || 0)));
        const motion = Math.max(
          0,
          Math.min(ARP_MOTION_PRESETS.length - 1, Math.round(Number(arp[3]) || 0))
        );
        arpUiState[phrase] = [rate, gate, pattern, motion];
      }

      const pattern = saved.arpPatterns?.[phrase];
      if (saved.arpPatternEncoding === "degree-v1" && Array.isArray(pattern)) {
        arpPatternState[phrase] = Array.from({ length: B2_DISPLAY_STEPS }, (_, index) =>
          index < B2_REAL_STEPS && typeof pattern[index] === "string" ? pattern[index] : ""
        );
        syncB2PatternMirror(phrase);
        arpPatternCustom[phrase] = saved.arpPatternCustom?.[phrase] === true;
        if (Array.isArray(saved.arpPatternCanonical?.[phrase])) {
          arpPatternCanonical[phrase] = Array.from({ length: B2_DISPLAY_STEPS }, (_, index) =>
            index < B2_REAL_STEPS && typeof saved.arpPatternCanonical[phrase][index] === "string"
              ? saved.arpPatternCanonical[phrase][index]
              : ""
          );
        } else if (arpPatternCustom[phrase]) {
          snapshotCurrentGridAsCanonical(phrase);
        }
        if (Array.isArray(saved.arpGeneratedTrueGrid?.[phrase])) {
          arpGeneratedTrueGrid[phrase] = Array.from({ length: B2_DISPLAY_STEPS }, (_, index) =>
            index < B2_REAL_STEPS && typeof saved.arpGeneratedTrueGrid[phrase][index] === "string"
              ? saved.arpGeneratedTrueGrid[phrase][index]
              : ""
          );
        }
        const savedOffset = Number(saved.arpGeneratedDisplayOffsetTicks?.[phrase]);
        if (Number.isFinite(savedOffset)) {
          arpGeneratedDisplayOffsetTicks[phrase] = Math.max(0, Math.min((B2_REAL_STEPS * 2) - 1, Math.round(savedOffset)));
        }
      }
    }
  } catch (_) {}
}


function refreshSequencerMelodyStateFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return;

    for (const phrase of phrases) {
      const melody = saved.melodies?.[phrase];
      if (Array.isArray(melody)) {
        for (let row = 0; row < ROWS; row += 1) {
          if (!Array.isArray(melody[row])) continue;
          for (let col = 0; col < MAX_COLS; col += 1) {
            const value = melody[row][col];
            melodyState[phrase][row][col] =
              typeof value === "string" && !["off", "on", "ghost"].includes(value)
                ? value
                : "";
          }
        }
      }

      const savedChancePages = saved.chance?.[phrase];
      if (savedChancePages && typeof savedChancePages === "object") {
        for (const page of chancePages) {
          const savedGrid = savedChancePages[page];
          if (!Array.isArray(savedGrid)) continue;

          for (let row = 0; row < ROWS; row += 1) {
            if (!Array.isArray(savedGrid[row])) continue;
            for (let col = 0; col < MAX_COLS; col += 1) {
              const raw = savedGrid[row][col];
              if (raw === null || raw === undefined || raw === "") {
                chanceState[phrase][page][row][col] = null;
                continue;
              }

              const numeric = Number(raw);
              if (!Number.isFinite(numeric)) {
                chanceState[phrase][page][row][col] = null;
                continue;
              }

              chanceState[phrase][page][row][col] = page === "gate"
                ? Math.max(1, Math.min(100, Math.round(numeric)))
                : Math.max(0, Math.min(100, Math.round(numeric)));
            }
          }
        }
      }
    }
  } catch (_) {}
}

// Build 484: audition is intentionally persistent across arpPhace pages and edits.
// Phace exit is still handled by the pagehide/beforeunload listeners below.

function cyclePhrase() {
  cancelMelodyColumnCopy({ rerender: false });
  const index = phrases.indexOf(currentPhrase);
  currentPhrase = phrases[(index + 1) % phrases.length];
  render();
  saveState();
}

function exactClover(label) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11.4c-1.5-1.1-3.7-2.1-5.2-1.2-1.6.9-1.6 3.3-.1 4.3 1.3.9 3.5.1 5.3-1.3"/><path d="M12 11.4c1.5-1.1 3.7-2.1 5.2-1.2 1.6.9 1.6 3.3.1 4.3-1.3.9-3.5.1-5.3-1.3"/><path d="M11.9 11.5c-1.1-1.5-2.1-3.7-1.2-5.2.9-1.6 3.3-1.6 4.3-.1.9 1.3.1 3.5-1.3 5.3"/><path d="M12.1 11.5c-1.1 1.5-2.1 3.7-1.2 5.2.9 1.6 3.3 1.6 4.3.1.9-1.3.1-3.5-1.3-5.3"/><path d="M12 13.2c-.2 3.2-1.1 5.4-2.8 7"/></svg><span class="num">${label}</span>`;
}

function updateButtons() {
  const number = phraseNumbers[currentPhrase];

  melodyBtn.innerHTML =
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l9-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/></svg><span class="num">${number}</span>`;

  arpBtn.innerHTML =
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h3v-3h3v-3h3V8h5"/><path d="M16 5l3 3-3 3"/></svg><span class="num">${b2PageIndex + 1}</span>`;

  const chancePageLetter = ({ chance: "C", volume: "V", gate: "G" })[activeChancePage()] || "";
  chanceBtn.innerHTML = exactClover(`${number}${chancePageLetter}`);

  melodyBtn.classList.toggle("active", currentView === "melody");
  arpBtn.classList.toggle("active", currentView === "arp");
  chanceBtn.classList.toggle("active", currentView === "chance");

  melodyBtn.setAttribute("aria-label", `Melody ${number}`);
  arpBtn.setAttribute("aria-label", `${b2Pages[b2PageIndex]} ${b2PageIndex + 1}`);
  arpBtn.title = `${b2Pages[b2PageIndex]} ${b2PageIndex + 1}`;
  chanceBtn.setAttribute("aria-label", `Melody ${number} ${activeChancePage()}`);
  chanceBtn.title = `Melody ${number} ${activeChancePage()}`;
  updateStyleButton();
}

function activeStyleOptions() {
  return currentView === "arp" ? ARP_MUTATION_STYLES : PRODUCER_STYLES;
}

function getActiveStyle() {
  if (currentView === "melody") return styleState.melody[currentPhrase];
  if (currentView === "arp") return styleState.arp[activeB2Phrase()];
  return styleState.chance[currentPhrase][activeChancePage()];
}

function setActiveStyle(style) {
  if (currentView === "melody") styleState.melody[currentPhrase] = style;
  else if (currentView === "arp") styleState.arp[activeB2Phrase()] = style;
  else styleState.chance[currentPhrase][activeChancePage()] = style;
}

function updateStyleButton() {
  const style = getActiveStyle();
  const label = STYLE_LABELS[style] || style;
  styleBtn.textContent = label;
  styleBtn.setAttribute("aria-label", `${currentView} style: ${label}`);
  styleBtn.title = `${currentView} style: ${label}`;
}

function cycleActiveStyle() {
  const options = activeStyleOptions();
  const current = getActiveStyle();
  const index = Math.max(0, options.indexOf(current));
  if (currentView === "arp") resetArpGenerateSource(activeB2Phrase());
  setActiveStyle(options[(index + 1) % options.length]);
  updateStyleButton();
  saveState();
}

function updateVisibility() {
  const gridActive = currentView !== "arp";
  app3_b1_p1.classList.toggle("hidden", !gridActive);
  arpStage.classList.toggle("hidden", gridActive);
}

function updateNameplate() {
  shellMaker.textContent = currentView === "chance" ? activeChancePage() : "hurst.audio";
}

function renderCell(button, state) {
  button.classList.remove("melodyOn", "melodyGhost", "variationReference", "variationEmpty");
  if (state === "on") button.classList.add("melodyOn");
  if (state === "ghost") button.classList.add("melodyGhost");
}

function formatGridRowLabel(rowIndex) {
  return labelMode === "res"
    ? String(rowIndex + 1)
    : rowIndex.toString(16).toUpperCase();
}

function toggleLabelMode() {
  labelMode = labelMode === "res" ? "hex" : "res";
  try { localStorage.setItem(GRID_LABEL_MODE_KEY, labelMode); } catch (_) {}
  render();
  saveState();
}

function toggleArpPatternLabelMode() {
  toggleLabelMode();
}

function makeToggleRowLabel(rowIndex) {
  const label = document.createElement("div");
  label.className = "labelCell";
  label.dataset.row = String(rowIndex);
  label.textContent = formatGridRowLabel(rowIndex);
  label.tabIndex = 0;
  label.setAttribute("role", "button");
  label.setAttribute("aria-label", "Toggle numbered and zero-based hexadecimal row labels");
  label.addEventListener("click", toggleLabelMode);
  label.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleLabelMode();
    }
  });
  return label;
}


function normalizeMelodyEntry(raw) {
  const text = String(raw ?? "").trim();
  if (text === "") return "";

  const parts = text.split(",").map(part => part.trim());
  if (parts.length > 2) return null;
  if (parts.some(part => part !== "" && !/^[+-]?\d+$/.test(part))) return null;

  const normalized = parts.map(part => {
    if (part === "") return "";
    const value = Number(part);
    if (!Number.isInteger(value) || value < -24 || value > 24) return null;
    return String(value);
  });

  if (normalized.some(value => value === null)) return null;
  if (parts.length === 1) return normalized[0];
  // Preserve explicit user intent: 0, and ,0 are both valid and remain distinct.
  return `${normalized[0]},${normalized[1]}`;
}

function melodyLinearIndex(phrase, row, col) {
  const phraseIndex = phrases.indexOf(phrase);
  if (phraseIndex < 0) return 0;
  const cellsPerPhrase = ROWS * MAX_COLS;
  return (phraseIndex * cellsPerPhrase) + (col * ROWS) + row;
}

function melodyPositionFromLinearIndex(index) {
  const cellsPerPhrase = ROWS * MAX_COLS;
  const totalCells = cellsPerPhrase * phrases.length;
  const wrapped = ((index % totalCells) + totalCells) % totalCells;
  const phraseIndex = Math.floor(wrapped / cellsPerPhrase);
  const within = wrapped % cellsPerPhrase;
  const col = Math.floor(within / ROWS);
  const row = within % ROWS;
  return Object.freeze({ phrase: phrases[phraseIndex], row, col, index: wrapped });
}

function getMelodyCellValue(position) {
  return melodyState[position.phrase]?.[position.row]?.[position.col] ?? "";
}

function setMelodyCellValue(position, value) {
  if (!melodyState[position.phrase]) return;
  melodyState[position.phrase][position.row][position.col] = value;
}

function getGateCellValue(position) {
  return chanceState[position.phrase]?.gate?.[position.row]?.[position.col] ?? null;
}

function setGateCellValue(position, value) {
  const grid = chanceState[position.phrase]?.gate;
  if (!grid?.[position.row]) return;
  if (value === null || value === undefined || value === "") {
    grid[position.row][position.col] = null;
    return;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return;
  // Gate state keeps exact integer precision. The manual picker is intentionally
  // quantized to 10% increments, but arp-derived and generated values must not be.
  grid[position.row][position.col] = Math.max(1, Math.min(100, Math.round(numeric)));
}

function readProjectScaleForMelody() {
  const project = readArpProjectPlaybackSettings();
  let scaleIndex = 0;
  try {
    const rootState = JSON.parse(localStorage.getItem(INTERPHACE_PROJECT_STORAGE_KEY) || "null") || {};
    scaleIndex = Math.max(0, Math.min(5, Math.round(Number(rootState.project?.scale) || 0)));
  } catch (_) {}

  const scaleSemitones = [
    [0,2,4,5,7,9,11],       // Major
    [0,2,3,5,7,8,10],       // Minor
    [0,3,5,7,10],           // Minor Pentatonic
    [0,2,4,7,9],            // Major Pentatonic
    [0,2,3,5,7,9,10],       // Dorian
    [0,2,3,7,8],            // Hirajoshi
  ][scaleIndex] || [0,2,4,5,7,9,11];

  return Object.freeze({
    rootMidi: project.rootMidi,
    scaleIndex,
    scaleSemitones: Object.freeze(scaleSemitones.slice()),
  });
}

function melodyDegreeToOffset(degree, octave = 0) {
  const { scaleSemitones } = readProjectScaleForMelody();
  const index = Number(degree) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= scaleSemitones.length) return null;
  return scaleSemitones[index] + (Math.max(-1, Math.min(1, octave)) * 12);
}

function arpDegreeTokenToOffset(token) {
  if (token === null || token === undefined || token === "") return null;
  if (typeof token === "number" && Number.isInteger(token)) return token;
  const match = String(token).trim().match(/^([1-7])([↓↑]?)$/);
  if (!match) return null;
  const octave = match[2] === "↓" ? -1 : match[2] === "↑" ? 1 : 0;
  return melodyDegreeToOffset(Number(match[1]), octave);
}

function compactThirtySecondPair(first, second) {
  const a = first == null ? "" : String(first);
  const b = second == null ? "" : String(second);
  if (a === "" && b === "") return "";
  if (b === "") return a;
  return `${a},${b}`;
}

function arpDegreeToken(degree, octave = 0) {
  const suffix = octave < 0 ? "↓" : octave > 0 ? "↑" : "";
  return `${degree}${suffix}`;
}

function arpDegreeEntryToMelodyOffsetEntry(raw) {
  const text = String(raw ?? "").trim();
  if (!text || text === "=") return text;
  const parts = text.split(",").slice(0, 2);
  const converted = parts.map(part => {
    const token = part.trim();
    if (!token) return "";
    const offset = arpDegreeTokenToOffset(token);
    return offset === null ? "" : String(offset);
  });
  if (parts.length === 1) return converted[0];
  return compactThirtySecondPair(converted[0], converted[1]);
}

function melodyOffsetToDegreeLabel(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  if (text === "=") return "=";

  const { scaleSemitones } = readProjectScaleForMelody();
  const labelOne = part => {
    const value = Number(String(part).trim());
    if (!Number.isInteger(value)) return String(part).trim();

    for (let octave = -1; octave <= 1; octave += 1) {
      const base = value - (octave * 12);
      const degreeIndex = scaleSemitones.indexOf(base);
      if (degreeIndex >= 0) {
        const suffix = octave < 0 ? "↓" : octave > 0 ? "↑" : "";
        return `${degreeIndex + 1}${suffix}`;
      }
    }
    return String(value);
  };

  const parts = text.split(",").slice(0, 2);
  if (parts.length === 2) { const a = parts[0].trim() === "" ? "—" : labelOne(parts[0]); const b = parts[1].trim() === "" ? "—" : labelOne(parts[1]); return `${a}·${b}`; }
  return labelOne(parts[0]);
}

function firstPassArpCells(phraseId) {
  // Only steps 1-32 are real B2 composition state. The displayed second half
  // mirrors these cells and is never part of melody transfer.
  const grid = arpPatternState[phraseId];
  if (!Array.isArray(grid)) return [];

  let lastUsedIndex = -1;
  for (let index = B2_REAL_STEPS - 1; index >= 0; index -= 1) {
    if (String(grid[index] ?? "").trim() !== "") {
      lastUsedIndex = index;
      break;
    }
  }
  if (lastUsedIndex < 0) return [];

  return Array.from(
    { length: lastUsedIndex + 1 },
    (_, index) => arpDegreeEntryToMelodyOffsetEntry(grid[index] || "")
  );
}

function transferArpIntoMelody(target, arpPhrase) {
  const sourceCells = firstPassArpCells(arpPhrase);
  if (!sourceCells.length) return false;

  const sourceUi = arpUiState[arpPhrase] || arpUiState[activeB2Phrase()];
  const arpGate = arpGatePercent(sourceUi?.[1]);
  const sourceRateIndex = Math.max(
    0,
    Math.min(
      ARP_RATE_TABLE.length - 1,
      Math.round(Number(sourceUi?.[0]) || ARP_RATE_DEFAULT_INDEX)
    )
  );
  const sourceRate = arpRateEntry(sourceRateIndex);
  const sourceRateSixteenths = sourceRate.beats / 0.25;

  const startIndex = melodyLinearIndex(target.phrase, target.row, target.col);
  const totalMelodyCells = ROWS * MAX_COLS * phrases.length;

  for (let offset = 0; offset < sourceCells.length; offset += 1) {
    const targetIndex = (startIndex + offset) % totalMelodyCells;
    if (offset > 0 && targetIndex === startIndex) continue;
    setGateCellValue(melodyPositionFromLinearIndex(targetIndex), null);
  }

  for (let offset = 0; offset < sourceCells.length; offset += 1) {
    const targetIndex = (startIndex + offset) % totalMelodyCells;
    if (offset > 0 && targetIndex === startIndex) continue;

    const position = melodyPositionFromLinearIndex(targetIndex);
    const value = sourceCells[offset];
    setMelodyCellValue(position, value);

    const triggers = parseMelodyCellEvents(value);
    if (!triggers.length) continue;

    if (sourceRate.label === "1/32" || value.includes(",")) {
      setGateCellValue(position, arpGate);
      continue;
    }

    const durationSixteenths = sourceRateSixteenths * (arpGate / 100);
    const releaseAbsolute = targetIndex + durationSixteenths;
    let releaseCell = Math.floor(releaseAbsolute);
    let fraction = releaseAbsolute - releaseCell;
    let releasePercent;

    if (fraction < 0.000001) {
      releaseCell -= 1;
      releasePercent = 100;
    } else {
      releasePercent = Math.max(1, Math.min(100, Math.round(fraction * 100)));
    }

    setGateCellValue(melodyPositionFromLinearIndex(releaseCell), releasePercent);
  }

  saveState();
  return true;
}

function closeMelodyChooser() {
  melodyChooserTarget = null;
  melodyChooserAnchor = null;
  melodyChooserOctave = 0;
  melodyChooserThirtySecond = false;
  melodyChooserFirstSubstep = null;
  melodyChooserFull = false;
  document.querySelector(".melodyEntryChooser")?.remove();
}

function applyMatchingArpGateToMelodyNote(target, { full = false, subdivided = false } = {}) {
  if (!target || !phrases.includes(target.phrase)) return;

  const phraseId = target.phrase;
  const startIndex = (target.col * ROWS) + target.row;
  const cellsPerPhrase = ROWS * MAX_COLS;
  const arpGate = arpGatePercent(arpUiState[activeB2Phrase()]?.[1]);
  const arpRate = arpRateEntry(arpUiState[activeB2Phrase()]?.[0]);
  const arpRateSixteenths = arpRate.beats / 0.25;

  // Clear stale inherited articulation across the span this note can occupy.
  // This lets re-entering a note, or choosing Full, replace the old articulation.
  const clearCells = Math.max(1, Math.ceil(subdivided ? 1 : arpRateSixteenths));
  for (let offset = 0; offset < clearCells; offset += 1) {
    const localIndex = startIndex + offset;
    if (localIndex >= cellsPerPhrase) break;
    setGateCellValue(melodyPositionFromPhraseLocalIndex(phraseId, localIndex), null);
  }

  // Full means no explicit release command: blank Gate = hold.
  if (full) return;

  // A manually entered 32nd pair owns two half-step triggers in this cell.
  // The existing playback path interprets one Gate value per half-step.
  if (subdivided) {
    setGateCellValue(target, arpGate);
    return;
  }

  // Match the existing arp-transfer articulation translation so manual melody
  // notes and inserted A1-A4 material behave the same way.
  const durationSixteenths = arpRateSixteenths * (arpGate / 100);
  const releaseAbsolute = startIndex + durationSixteenths;
  if (releaseAbsolute > cellsPerPhrase) return; // loop boundary supplies release

  let releaseCell = Math.floor(releaseAbsolute);
  let fraction = releaseAbsolute - releaseCell;
  let releasePercent;

  if (fraction < 0.000001) {
    releaseCell -= 1;
    releasePercent = 100;
  } else {
    releasePercent = Math.max(1, Math.min(100, Math.round(fraction * 100)));
  }

  if (releaseCell < 0 || releaseCell >= cellsPerPhrase) return;
  setGateCellValue(melodyPositionFromPhraseLocalIndex(phraseId, releaseCell), releasePercent);
}

function clearMelodyStepVariation(target) {
  if (!target || !phrases.includes(target.phrase)) return;
  for (const page of ["chance", "volume", "gate"]) {
    const grid = chanceState[target.phrase]?.[page];
    if (grid?.[target.row]) grid[target.row][target.col] = null;
  }
}

function finishMelodyEntry(value) {
  if (!melodyChooserTarget) return;
  const target = melodyChooserTarget;
  setMelodyCellValue(target, value);
  // Clearing a melody cell clears all step-owned variation. Replacing a note
  // keeps Chance/Volume; Gate is handled by the note-entry articulation path.
  if (value === "") clearMelodyStepVariation(target);
  closeMelodyChooser();
  saveState();
  if (currentPhrase === target.phrase && currentView === "melody") renderMelodyGrid();
}

function chooseMelodyDegree(degree) {
  if (!melodyChooserTarget) return;
  const target = melodyChooserTarget;
  const offset = melodyDegreeToOffset(degree, melodyChooserOctave);
  if (offset === null || offset < -24 || offset > 24) return;

  if (melodyChooserThirtySecond) {
    if (melodyChooserFirstSubstep === null) {
      melodyChooserFirstSubstep = String(offset);
      melodyChooserOctave = 0;
      renderMelodyEntryChooser(melodyChooserAnchor, melodyChooserTarget);
      return;
    }
    const value = compactThirtySecondPair(melodyChooserFirstSubstep, String(offset));
    applyMatchingArpGateToMelodyNote(target, { full: melodyChooserFull, subdivided: true });
    finishMelodyEntry(value);
    return;
  }

  applyMatchingArpGateToMelodyNote(target, { full: melodyChooserFull, subdivided: false });
  finishMelodyEntry(String(offset));
}
function chooseMelodyArp(phraseId) {
  if (!melodyChooserTarget) return;
  const target = melodyChooserTarget;
  transferArpIntoMelody(target, phraseId);
  closeMelodyChooser();
  if (currentView === "melody") renderMelodyGrid();
}

function chooseMelodyRest() {
  if (!melodyChooserTarget) return;
  if (melodyChooserThirtySecond) {
    if (melodyChooserFirstSubstep === null) {
      melodyChooserFirstSubstep = "";
      melodyChooserOctave = 0;
      renderMelodyEntryChooser(melodyChooserAnchor, melodyChooserTarget);
      return;
    }
    finishMelodyEntry(compactThirtySecondPair(melodyChooserFirstSubstep, ""));
    return;
  }
  finishMelodyEntry("");
}

const MELODY_CLEAR_HOLD_MS = 900;

function clearWholeMelody(phraseId) {
  const phrase = melodyState[phraseId];
  if (!phrase) return;
  for (let row = 0; row < phrase.length; row += 1) {
    for (let col = 0; col < phrase[row].length; col += 1) {
      phrase[row][col] = "";
      clearMelodyStepVariation({ phrase: phraseId, row, col });
    }
  }
  saveState();
  closeMelodyChooser();
  if (currentPhrase === phraseId && currentView === "melody") renderMelodyGrid();
}

function attachMelodyClearHold(button, target) {
  let holdTimer = null;
  let consumed = false;

  const cancelHold = () => {
    if (holdTimer !== null) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    button.classList.remove("isClearHolding");
  };

  const beginHold = event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    consumed = false;
    cancelHold();
    button.classList.add("isClearHolding");
    try { button.setPointerCapture?.(event.pointerId); } catch (_) {}

    holdTimer = setTimeout(() => {
      holdTimer = null;
      consumed = true;
      button.classList.remove("isClearHolding");
      button.classList.add("didClearMelody");
      clearWholeMelody(target.phrase);
    }, MELODY_CLEAR_HOLD_MS);
  };

  button.addEventListener("pointerdown", beginHold);
  button.addEventListener("pointerup", cancelHold);
  button.addEventListener("pointercancel", cancelHold);
  button.addEventListener("pointerleave", event => {
    if (event.pointerType === "mouse") cancelHold();
  });

  button.addEventListener("click", event => {
    if (consumed) {
      consumed = false;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    chooseMelodyRest();
  });
}

function renderMelodyEntryChooser(anchorCell, target) {
  const pendingTarget = target || melodyChooserTarget;
  const pendingAnchor = anchorCell || melodyChooserAnchor;
  if (!pendingTarget || !pendingAnchor) return;

  document.querySelector(".melodyEntryChooser")?.remove();
  melodyChooserTarget = pendingTarget;
  melodyChooserAnchor = pendingAnchor;

  const gridRoot = app3_b1_p1_c1;
  if (!gridRoot) return;

  const chooser = document.createElement("div");
  chooser.className = "melodyEntryChooser";
  chooser.setAttribute("aria-label", "Melody note entry");

  const { scaleSemitones } = readProjectScaleForMelody();
  const items = [
    { type: "degree", label: "1", value: 1 },
    { type: "degree", label: "2", value: 2 },
    { type: "degree", label: "3", value: 3 },
    { type: "degree", label: "4", value: 4 },
    { type: "degree", label: "5", value: 5 },
    { type: "degree", label: "6", value: 6 },
    { type: "degree", label: "7", value: 7 },
    { type: "rest", label: "—" },
    { type: "octave", label: "↓", value: -1 },
    { type: "octave", label: "↑", value: 1 },
    { type: "thirtySecond", label: "32" },
    { type: "full", label: "full" },
    ...phrases.map((phraseId, index) => ({ type: "arp", label: `A${index + 1}`, value: phraseId })),
  ];

  // Fixed opposite-half placement: top-half selection -> A10:D13; bottom-half -> A4:D7.
  const anchorRow = Number(pendingAnchor.dataset.row);
  const startRow = anchorRow < 8 ? 9 : 3; // zero-based rows 10 and 4

  items.forEach((item, index) => {
    const localRow = Math.floor(index / 4);
    const localCol = index % 4;
    const logicalRow = startRow + localRow;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "stepBtn melodyChooserButton";
    button.tabIndex = -1;
    button.textContent = item.label;
    button.style.gridRow = String(logicalRow + 1);
    button.style.gridColumn = String(localCol + 2);
    button.dataset.row = String(logicalRow);
    button.dataset.col = String(localCol);

    if (logicalRow % 2 === 0) button.classList.add("eighthRow");
    if (logicalRow === 3 || logicalRow === 7 || logicalRow === 11) button.classList.add("rowDivider");

    if (item.type === "degree") {
      if (item.value > scaleSemitones.length) {
        button.disabled = true;
        button.classList.add("melodyChooserEmpty");
      } else {
        button.addEventListener("click", () => chooseMelodyDegree(item.value));
      }
    } else if (item.type === "rest") {
      button.classList.add("melodyClearButton");
      button.setAttribute("aria-label", "Clear step; hold to clear melody");
      attachMelodyClearHold(button, pendingTarget);
    } else if (item.type === "octave") {
      button.classList.toggle("isActiveModifier", melodyChooserOctave === item.value);
      button.addEventListener("click", () => {
        melodyChooserOctave = melodyChooserOctave === item.value ? 0 : item.value;
        renderMelodyEntryChooser(pendingAnchor, pendingTarget);
      });
    } else if (item.type === "thirtySecond") {
      button.classList.toggle("isActiveModifier", melodyChooserThirtySecond);
      if (melodyChooserThirtySecond && melodyChooserFirstSubstep !== null) {
        button.textContent = `32·${melodyChooserFirstSubstep === "" ? "—" : melodyOffsetToDegreeLabel(melodyChooserFirstSubstep)}`;
      }
      button.addEventListener("click", () => {
        melodyChooserThirtySecond = !melodyChooserThirtySecond;
        melodyChooserFirstSubstep = null;
        renderMelodyEntryChooser(pendingAnchor, pendingTarget);
      });
    } else if (item.type === "full") {
      button.classList.toggle("isActiveModifier", melodyChooserFull);
      button.setAttribute("aria-label", "Full note; hold until another note or Gate release");
      button.addEventListener("click", () => {
        melodyChooserFull = !melodyChooserFull;
        renderMelodyEntryChooser(pendingAnchor, pendingTarget);
      });
    } else if (item.type === "arp") {
      button.addEventListener("click", () => chooseMelodyArp(item.value));
    }

    chooser.appendChild(button);
  });

  gridRoot.appendChild(chooser);
}

function melodyColumnLetter(col) {
  return String.fromCharCode(65 + Math.max(0, Math.min(7, Number(col) || 0)));
}

function startMelodyColumnCopy(phrase, sourceCol) {
  if (currentView !== "melody" || phrase !== currentPhrase) return;

  const col = Number(sourceCol);
  if (!Number.isInteger(col) || col < 0 || col >= visibleCols) return;

  melodyColumnCopyState = {
    phrase,
    sourceCol: col,
    melody: Array.from({ length: ROWS }, (_, row) => melodyState[phrase][row][col]),
    chance: Array.from({ length: ROWS }, (_, row) => chanceState[phrase].chance[row][col]),
    volume: Array.from({ length: ROWS }, (_, row) => chanceState[phrase].volume[row][col]),
    gate: Array.from({ length: ROWS }, (_, row) => chanceState[phrase].gate[row][col]),
  };

  renderMelodyGrid();
}

function cancelMelodyColumnCopy({ rerender = true } = {}) {
  if (!melodyColumnCopyState) return;
  melodyColumnCopyState = null;

  if (rerender && currentView === "melody") {
    renderMelodyGrid();
  }
}

function pasteMelodyColumn(targetCol) {
  const copy = melodyColumnCopyState;
  if (!copy || currentView !== "melody" || copy.phrase !== currentPhrase) {
    cancelMelodyColumnCopy();
    return;
  }

  const col = Number(targetCol);
  if (!Number.isInteger(col) || col < 0 || col >= visibleCols || col === copy.sourceCol) {
    cancelMelodyColumnCopy();
    return;
  }


  for (let row = 0; row < ROWS; row++) {
    melodyState[copy.phrase][row][col] = copy.melody[row];
    chanceState[copy.phrase].chance[row][col] = copy.chance[row];
    chanceState[copy.phrase].volume[row][col] = copy.volume[row];
    chanceState[copy.phrase].gate[row][col] = copy.gate[row];

    if (copy.melody[row] === "") {
      chanceState[copy.phrase].chance[row][col] = null;
      chanceState[copy.phrase].volume[row][col] = null;
      chanceState[copy.phrase].gate[row][col] = null;
    }
  }

  melodyColumnCopyState = null;
  saveState();
  renderMelodyGrid();
}

function melodyButtonForCell({ phrase, row, col }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "stepBtn melodyGridCell";
  button.dataset.row = String(row);
  button.dataset.col = String(col);
  button.style.gridRow = String(row + 1);
  button.style.gridColumn = String(col + 2);

  const current = melodyState[phrase][row][col] || "";
  button.textContent = melodyOffsetToDegreeLabel(current);
  button.classList.toggle("melodyOn", current !== "");

  if (row % 2 === 0) button.classList.add("eighthRow");
  if (row === 3 || row === 7 || row === 11) button.classList.add("rowDivider");

  if (
    currentView === "melody" &&
    melodyColumnCopyState?.phrase === phrase &&
    row === 0
  ) {
    button.textContent = col === melodyColumnCopyState.sourceCol ? "Copied" : "Paste";
    button.classList.add("columnCopyTarget");
    button.style.color = "var(--arp)";
    button.style.fontWeight = "700";

    if (col === melodyColumnCopyState.sourceCol) {
      button.classList.add("columnCopySource");
      button.style.boxShadow = "inset 0 0 0 2px var(--arp)";
      button.style.background = "color-mix(in srgb, var(--arp) 14%, transparent)";
    }

    button.setAttribute(
      "aria-label",
      col === melodyColumnCopyState.sourceCol
        ? `Cancel copied bar ${melodyColumnLetter(col)}`
        : `Paste copied bar ${melodyColumnLetter(melodyColumnCopyState.sourceCol)} into bar ${melodyColumnLetter(col)}`
    );
  }

  let stepLongPressTimer = null;
  let stepLongPressFired = false;
  const STEP_LONG_PRESS_MS = 650;

  const cancelStepLongPress = () => {
    if (stepLongPressTimer !== null) {
      clearTimeout(stepLongPressTimer);
      stepLongPressTimer = null;
    }
  };

  button.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    stepLongPressFired = false;
    cancelStepLongPress();

    if (
      currentView === "melody" &&
      row === 0 &&
      !melodyColumnCopyState
    ) {
      stepLongPressTimer = window.setTimeout(() => {
        stepLongPressTimer = null;
        stepLongPressFired = true;
        startMelodyColumnCopy(phrase, col);
      }, STEP_LONG_PRESS_MS);
    }
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach(eventName => {
    button.addEventListener(eventName, cancelStepLongPress);
  });

  button.addEventListener("contextmenu", event => {
    if (currentView === "melody" && row === 0) {
      event.preventDefault();
    }
  });

  button.addEventListener("click", event => {
    if (stepLongPressFired) {
      stepLongPressFired = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (
      currentView === "melody" &&
      melodyColumnCopyState?.phrase === phrase
    ) {
      event.preventDefault();
      event.stopPropagation();

      if (row === 0 && col !== melodyColumnCopyState.sourceCol) {
        pasteMelodyColumn(col);
      } else {
        cancelMelodyColumnCopy();
      }
      return;
    }

    renderMelodyEntryChooser(button, { phrase, row, col });
  });

  return button;
}

function createUniversalGrid({ data, reference = null, onPress }) {
  app3_b1_p1_c1.innerHTML = "";
  document.documentElement.style.setProperty("--cols", visibleCols);

  for (let row = 0; row < ROWS; row++) {
    const label = makeToggleRowLabel(row);
    label.style.gridRow = String(row + 1);
    label.style.gridColumn = "1";
    if (row === 3 || row === 7 || row === 11) label.classList.add("rowDivider");
    app3_b1_p1_c1.appendChild(label);

    for (let col = 0; col < visibleCols; col++) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "stepBtn variationGridCell";
      button.dataset.row = row;
      button.dataset.col = col;
      button.style.gridRow = String(row + 1);
      button.style.gridColumn = String(col + 2);
      if (row % 2 === 0) button.classList.add("eighthRow");
      if (row === 3 || row === 7 || row === 11) button.classList.add("rowDivider");

      if (reference) {
        const ref = reference[row][col];
        if (String(ref ?? "").trim() !== "") button.classList.add("melodyOn", "variationReference");
        else button.classList.add("variationEmpty");
        const generated = data?.[row]?.[col];
        if (generated !== null && generated !== undefined && generated !== "") {
          button.textContent = String(generated);
          button.classList.add("hasVariationValue");
        }
      } else {
        renderCell(button, data[row][col]);
      }

      button.addEventListener("click", () => onPress?.({ row, col, button }));
      app3_b1_p1_c1.appendChild(button);
    }
  }
}

function renderMelodyGrid() {
  closeMelodyChooser();
  app3_b1_p1_c1.innerHTML = "";

  for (let row = 0; row < ROWS; row += 1) {
    const label = makeToggleRowLabel(row);
    if (row === 3 || row === 7 || row === 11) label.classList.add("rowDivider");
    app3_b1_p1_c1.appendChild(label);

    for (let col = 0; col < visibleCols; col += 1) {
      app3_b1_p1_c1.appendChild(
        melodyButtonForCell({ phrase: currentPhrase, row, col })
      );
    }
  }
}

function closeGateChooser() {
  gateChooserTarget = null;
  gateChooserAnchor = null;
  document.querySelector(".gateEntryChooser")?.remove();
}

function finishGateEntry(value) {
  if (!gateChooserTarget) return;
  const target = gateChooserTarget;
  setGateCellValue({ phrase: currentPhrase, row: target.row, col: target.col }, value);
  closeGateChooser();
  saveState();
  if (currentView === "chance" && activeChancePage() === "gate") renderChanceGrid();
}

function renderGateEntryChooser(anchorCell, target) {
  const pendingTarget = target || gateChooserTarget;
  const pendingAnchor = anchorCell || gateChooserAnchor;
  if (!pendingTarget || !pendingAnchor) return;

  document.querySelector(".gateEntryChooser")?.remove();
  gateChooserTarget = pendingTarget;
  gateChooserAnchor = pendingAnchor;

  const chooser = document.createElement("div");
  chooser.className = "gateEntryChooser";
  chooser.setAttribute("aria-label", "Gate release entry");

  const values = [10,20,30,40,50,60,70,80,90,100,null,null];
  const anchorRow = Number(pendingAnchor.dataset.row);
  const startRow = anchorRow < 8 ? 10 : 4;

  values.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stepBtn gateChooserButton";
    button.tabIndex = -1;
    button.style.gridRow = String(startRow + Math.floor(index / 4));
    button.style.gridColumn = String((index % 4) + 2);

    if (index === 10) {
      button.textContent = "—";
      button.setAttribute("aria-label", "Clear gate, hold note");
      button.addEventListener("click", () => finishGateEntry(null));
    } else if (index === 11) {
      button.textContent = "";
      button.disabled = true;
      button.classList.add("gateChooserEmpty");
    } else {
      button.textContent = String(value);
      button.setAttribute("aria-label", `Release at ${value} percent of step`);
      button.addEventListener("click", () => finishGateEntry(value));
    }
    chooser.appendChild(button);
  });

  app3_b1_p1_c1.appendChild(chooser);
}


function closeChanceChooser() {
  chanceChooserTarget = null;
  chanceChooserAnchor = null;
  document.querySelector(".chanceEntryChooser")?.remove();
}

function finishChanceEntry(value) {
  if (!chanceChooserTarget) return;
  const { row, col } = chanceChooserTarget;
  chanceState[currentPhrase].chance[row][col] = value;
  closeChanceChooser();
  saveState();
  if (currentView === "chance" && activeChancePage() === "chance") renderChanceGrid();
}

function renderChanceEntryChooser(anchorCell, target) {
  const pendingTarget = target || chanceChooserTarget;
  const pendingAnchor = anchorCell || chanceChooserAnchor;
  if (!pendingTarget || !pendingAnchor) return;

  document.querySelector(".chanceEntryChooser")?.remove();
  chanceChooserTarget = pendingTarget;
  chanceChooserAnchor = pendingAnchor;

  const chooser = document.createElement("div");
  chooser.className = "chanceEntryChooser";
  chooser.setAttribute("aria-label", "Note chance entry");

  const values = [5,10,20,30,40,50,60,70,80,90,95,null];
  const anchorRow = Number(pendingAnchor.dataset.row);
  const startRow = anchorRow < 8 ? 10 : 4;

  values.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stepBtn chanceChooserButton";
    button.tabIndex = -1;
    button.style.gridRow = String(startRow + Math.floor(index / 4));
    button.style.gridColumn = String((index % 4) + 2);

    if (value === null) {
      button.textContent = "—";
      button.setAttribute("aria-label", "Clear chance, always play");
      button.addEventListener("click", () => finishChanceEntry(null));
    } else {
      button.textContent = String(value);
      button.setAttribute("aria-label", `${value} percent note chance`);
      button.addEventListener("click", () => finishChanceEntry(value));
    }
    chooser.appendChild(button);
  });

  app3_b1_p1_c1.appendChild(chooser);
}

function closeVolumeChooser() {
  volumeChooserTarget = null;
  volumeChooserAnchor = null;
  document.querySelector(".volumeEntryChooser")?.remove();
}

function finishVolumeEntry(value) {
  if (!volumeChooserTarget) return;
  const { row, col } = volumeChooserTarget;
  chanceState[currentPhrase].volume[row][col] = value;
  closeVolumeChooser();
  saveState();
  if (currentView === "chance" && activeChancePage() === "volume") renderChanceGrid();
}

function renderVolumeEntryChooser(anchorCell, target) {
  const pendingTarget = target || volumeChooserTarget;
  const pendingAnchor = anchorCell || volumeChooserAnchor;
  if (!pendingTarget || !pendingAnchor) return;

  document.querySelector(".volumeEntryChooser")?.remove();
  volumeChooserTarget = pendingTarget;
  volumeChooserAnchor = pendingAnchor;

  const chooser = document.createElement("div");
  chooser.className = "volumeEntryChooser";
  chooser.setAttribute("aria-label", "Note volume variation entry");

  const values = [5,10,20,30,40,50,60,70,80,90,95,null];
  const anchorRow = Number(pendingAnchor.dataset.row);
  const startRow = anchorRow < 8 ? 10 : 4;

  values.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stepBtn volumeChooserButton";
    button.tabIndex = -1;
    button.style.gridRow = String(startRow + Math.floor(index / 4));
    button.style.gridColumn = String((index % 4) + 2);

    if (value === null) {
      button.textContent = "—";
      button.setAttribute("aria-label", "Clear volume variation, use normal note level");
      button.addEventListener("click", () => finishVolumeEntry(null));
    } else {
      const low = Math.max(0, value - 5);
      const high = Math.min(100, value + 5);
      button.textContent = String(value);
      button.setAttribute("aria-label", `${value} percent volume center, random ${low} to ${high} percent`);
      button.addEventListener("click", () => finishVolumeEntry(value));
    }
    chooser.appendChild(button);
  });

  app3_b1_p1_c1.appendChild(chooser);
}

function renderChanceGrid() {
  closeGateChooser();
  closeChanceChooser();
  closeVolumeChooser();
  const page = activeChancePage();
  createUniversalGrid({
    data: chanceState[currentPhrase][page],
    reference: melodyState[currentPhrase],
    onPress: ({ row, col, button }) => {
      if (page === "gate") renderGateEntryChooser(button, { row, col });
      else if (page === "chance") renderChanceEntryChooser(button, { row, col });
      else if (page === "volume") renderVolumeEntryChooser(button, { row, col });
    },
  });
}

function sampledArpPatternCell(array, stepIndex, totalSteps) {
  if (!array.length) return null;
  const sourceIndex = Math.min(
    array.length - 1,
    Math.max(0, Math.ceil((stepIndex + 1) * array.length / Math.max(1, totalSteps)) - 1)
  );
  return array[sourceIndex];
}


function splitArpGridToHalfSteps(grid) {
  const ticks = Array(B2_REAL_STEPS * 2).fill("");
  for (let cellIndex = 0; cellIndex < B2_REAL_STEPS; cellIndex += 1) {
    const raw = String(grid?.[cellIndex] ?? "");
    if (!raw) continue;
    if (raw === "=") {
      ticks[cellIndex * 2] = "=";
      continue;
    }
    const parts = raw.split(",").slice(0, 2);
    ticks[cellIndex * 2] = parts[0] || "";
    if (parts.length > 1) ticks[(cellIndex * 2) + 1] = parts[1] || "";
  }
  return ticks;
}

function packHalfStepsToArpGrid(ticks) {
  const grid = Array(B2_DISPLAY_STEPS).fill("");
  for (let cellIndex = 0; cellIndex < B2_REAL_STEPS; cellIndex += 1) {
    const first = String(ticks[cellIndex * 2] ?? "");
    const second = String(ticks[(cellIndex * 2) + 1] ?? "");
    if (first === "=" && !second) {
      grid[cellIndex] = "=";
    } else if (second) {
      grid[cellIndex] = compactThirtySecondPair(first, second);
    } else {
      grid[cellIndex] = first;
    }
  }
  return grid;
}

function transformCurrentArpRate(previousRateIndex, nextRateIndex) {
  const phraseId = activeB2Phrase();
  resetArpGenerateSource(phraseId);

  // Custom Rate is a pure accordion on the CURRENT visible custom grid.
  // Do not reapply Rhythm during the Rate move.
  const scaledVisible = scaleGridByRate(
    arpPatternState[phraseId],
    previousRateIndex,
    nextRateIndex
  );

  arpPatternState[phraseId] = scaledVisible;
  syncB2PatternMirror(phraseId);

  // The accordion result becomes the new canonical custom truth.
  snapshotCurrentGridAsCanonical(phraseId);
}


function customMotionOrder(motionIndex) {
  return rhythmRecipe32(motionIndex);
}

function customMotionNormalizationOffset(phraseId, motionIndex) {
  const canonical = arpPatternCanonical[phraseId] || Array(B2_DISPLAY_STEPS).fill("");
  const moved = applyRhythmRecipeToCells(canonical, motionIndex);
  const ticks = splitArpGridToHalfSteps(moved);
  const first = ticks.findIndex(value => String(value ?? "").trim() !== "");
  return first < 0 ? 0 : first;
}

function renderedCustomGridFromCanonical(phraseId, motionIndex) {
  const canonical = arpPatternCanonical[phraseId] || Array(B2_DISPLAY_STEPS).fill("");
  const moved = applyRhythmRecipeToCells(canonical, motionIndex);
  arpPatternState[phraseId] = normalizeGridToFirstActiveHalfStep(moved);
  syncB2PatternMirror(phraseId);
}

function displayedIndexToCanonicalIndex(displayIndex, phraseId, motionIndex) {
  const recipe = rhythmRecipe32(motionIndex);
  const offsetTicks = customMotionNormalizationOffset(phraseId, motionIndex);
  const rawCell = Math.floor(((displayIndex * 2) + offsetTicks) / 2) % B2_REAL_STEPS;
  return recipe[rawCell];
}

function transformCurrentArpMotion(motionIndex) {
  resetArpGenerateSource(activeB2Phrase());
  renderedCustomGridFromCanonical(activeB2Phrase(), motionIndex);
}




function populateArpPatternFromPreset(patternIndex) {
  resetArpGenerateSource(activeB2Phrase());
  const presetIndex = Math.max(
    0,
    Math.min(ARP_PATTERN_PRESETS.length - 1, Math.round(Number(patternIndex) || 0))
  );
  const preset = ARP_PATTERN_PRESETS[presetIndex];

  const empty = Array(B2_DISPLAY_STEPS).fill("");
  if (!preset || presetIndex === 0 || !Array.isArray(preset.phrase)) {
    arpPatternState[activeB2Phrase()] = empty;
    syncB2PatternMirror(activeB2Phrase());
    arpPatternCustom[activeB2Phrase()] = false;
    return;
  }

  // Reference layout is always the 32 visible 16th-note cells.
  // Pattern contributes its immutable 16-step degree recipe to steps 1-16.
  const canonical = Array(B2_DISPLAY_STEPS).fill("");
  for (let index = 0; index < 16; index += 1) {
    const value = preset.phrase[index];
    canonical[index] = value === null || value === undefined ? "" : String(value);
  }

  // Rhythm is an absolute 32-position recipe.
  const rhythmGrid = applyRhythmRecipeToCells(
    canonical,
    arpUiState[activeB2Phrase()]?.[3] ?? 0
  );

  // Rate is pure resolution scaling from the 1/16 reference.
  const targetRateIndex = Math.max(
    0,
    Math.min(
      ARP_RATE_TABLE.length - 1,
      Math.round(Number.isFinite(Number(arpUiState[activeB2Phrase()]?.[0]))
        ? Number(arpUiState[activeB2Phrase()][0])
        : ARP_RATE_DEFAULT_INDEX)
    )
  );
  const sixteenthRateIndex = ARP_RATE_TABLE.findIndex(entry => entry.label === "1/16");
  const scaled = scaleGridByRate(
    rhythmGrid,
    sixteenthRateIndex >= 0 ? sixteenthRateIndex : ARP_RATE_DEFAULT_INDEX,
    targetRateIndex
  );

  const phraseId = activeB2Phrase();
  // Preserve true generated positions internally; normalize display/playback only.
  arpPatternState[phraseId] = normalizeGeneratedGridForDisplay(phraseId, scaled);
  syncB2PatternMirror(phraseId);
  arpPatternCustom[phraseId] = false;
}

function rebuildArpPatternFromControls() {
  const patternIndex = Math.max(
    0,
    Math.min(
      ARP_PATTERN_PRESETS.length - 1,
      Math.round(Number(arpUiState[activeB2Phrase()]?.[2]) || 0)
    )
  );

  // Pattern Off is authoritative and clears the visible/stored arp pattern.
  if (patternIndex === 0) {
    arpPatternState[activeB2Phrase()].fill("");
    arpPatternCustom[activeB2Phrase()] = false;
  } else {
    // populateArpPatternFromPreset reads the current Motion and Rate controls,
    // applies Motion to the 16-event Pattern source, then maps it by Rate.
    populateArpPatternFromPreset(patternIndex);
  }

  renderArpPatternBackgroundGrid();
}


function normalizeArpSemitoneToken(token) {
  const trimmed = String(token ?? "").trim();
  if (trimmed === "") return "";
  if (!/^[+-]?\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < -24 || value > 24) return null;
  return String(value);
}

function normalizeArpPatternEntry(raw, allowThirtySecondPair) {
  const text = String(raw ?? "").trim();
  if (text === "") return "";

  const parts = text.split(",").map(part => part.trim());
  if (parts.length > 2) return null;
  if (parts.length === 2 && !allowThirtySecondPair) return null;
  if (parts.some(part => part === "")) return null;

  const normalized = parts.map(normalizeArpSemitoneToken);
  if (normalized.some(value => value === null || value === "")) return null;
  return normalized.join(",");
}

function closeArpChooser() {
  arpChooserTarget = null; arpChooserAnchor = null; arpChooserOctave = 0; arpChooserThirtySecond = false; arpChooserFirstSubstep = null;
  document.querySelector(".arpEntryChooser")?.remove();
}
function finishArpEntry(value) {
  if (!arpChooserTarget) return;
  const phraseId = activeB2Phrase();
  resetArpGenerateSource(phraseId);
  const displayIndex = b2RealPatternIndex(arpChooserTarget.patternIndex);

  arpPatternState[phraseId][displayIndex] = value;
  syncB2PatternMirror(phraseId);

  // Manual edit is the only transition into custom mode.
  // The normalized visible 32-step grid becomes the complete custom truth;
  // hidden generated offset/unseen material are discarded.
  arpPatternCustom[phraseId] = true;
  arpGeneratedDisplayOffsetTicks[phraseId] = 0;
  arpGeneratedTrueGrid[phraseId] = Array(B2_DISPLAY_STEPS).fill("");
  snapshotCurrentGridAsCanonical(phraseId);

  // Quietly set Rate to the coarsest legal resolution represented by this grid.
  const ticks = splitArpGridToHalfSteps(arpPatternState[phraseId]);
  const occupied = ticks
    .map((entry, index) => String(entry ?? "").trim() ? index : -1)
    .filter(index => index >= 0);

  const legalRates = [
    { index: 5, spacing: 32 }, // 1/1
    { index: 4, spacing: 16 }, // 1/2
    { index: 3, spacing: 8 },  // 1/4
    { index: 2, spacing: 4 },  // 1/8
    { index: 1, spacing: 2 },  // 1/16
    { index: 0, spacing: 1 },  // 1/32
  ];
  const legal = legalRates.find(option =>
    occupied.every(tick => tick % option.spacing === 0)
  );
  if (legal) arpUiState[phraseId][0] = legal.index;

  closeArpChooser();
  saveState();
  syncArpUi();
  renderArpPatternBackgroundGrid();
}
function chooseArpDegree(degree) {
  if (!arpChooserTarget) return;
  const offset = melodyDegreeToOffset(degree, arpChooserOctave);
  if (offset === null || offset < -24 || offset > 24) return;
  const token = arpDegreeToken(degree, arpChooserOctave);
  if (arpChooserThirtySecond) {
    if (arpChooserFirstSubstep === null) { arpChooserFirstSubstep = token; arpChooserOctave = 0; renderArpEntryChooser(arpChooserAnchor, arpChooserTarget); return; }
    finishArpEntry(compactThirtySecondPair(arpChooserFirstSubstep, token)); return;
  }
  finishArpEntry(token);
}
function chooseArpRest() {
  if (!arpChooserTarget) return;
  if (arpChooserThirtySecond) {
    if (arpChooserFirstSubstep === null) { arpChooserFirstSubstep = ""; arpChooserOctave = 0; renderArpEntryChooser(arpChooserAnchor, arpChooserTarget); return; }
    finishArpEntry(compactThirtySecondPair(arpChooserFirstSubstep, "")); return;
  }
  finishArpEntry("");
}
function renderArpEntryChooser(anchorCell, target) {
  const pendingTarget = target || arpChooserTarget, pendingAnchor = anchorCell || arpChooserAnchor;
  if (!pendingTarget || !pendingAnchor || !arpPatternGrid) return;
  document.querySelector(".arpEntryChooser")?.remove(); arpChooserTarget = pendingTarget; arpChooserAnchor = pendingAnchor;
  const chooser = document.createElement("div"); chooser.className = "arpEntryChooser"; chooser.setAttribute("aria-label", "Arp degree entry");
  const { scaleSemitones } = readProjectScaleForMelody();
  const items = [
    ["degree","1",1],["degree","2",2],["degree","3",3],["degree","4",4],
    ["degree","5",5],["degree","6",6],["degree","7",7],["rest","—",0],
    ["octave","↓",-1],["octave","↑",1],["thirtySecond","32",0],["tie","=",0]
  ];
  const visibleRow = Number(pendingAnchor.dataset.row) - 8;
  const actualStartRow = 8 + (visibleRow <= 4 ? 6 : 1);
  items.forEach((item,index) => {
    const [type,label,value] = item; const button=document.createElement("button"); button.type="button"; button.className="stepBtn arpChooserButton"; button.tabIndex=-1; button.textContent=label;
    button.style.gridRow=String(actualStartRow+Math.floor(index/4)); button.style.gridColumn=String((index%4)+2);
    if (type === "degree") { if (value > scaleSemitones.length) { button.disabled=true; button.classList.add("arpChooserEmpty"); } else button.addEventListener("click",()=>chooseArpDegree(value)); }
    else if (type === "rest") button.addEventListener("click",chooseArpRest);
    else if (type === "octave") { button.classList.toggle("isActiveModifier",arpChooserOctave===value); button.addEventListener("click",()=>{ arpChooserOctave=arpChooserOctave===value?0:value; renderArpEntryChooser(pendingAnchor,pendingTarget); }); }
    else if (type === "thirtySecond") { button.classList.toggle("isActiveModifier",arpChooserThirtySecond); if (arpChooserThirtySecond && arpChooserFirstSubstep !== null) button.textContent=`32·${arpChooserFirstSubstep === "" ? "—" : arpChooserFirstSubstep}`; button.addEventListener("click",()=>{ arpChooserThirtySecond=!arpChooserThirtySecond; arpChooserFirstSubstep=null; renderArpEntryChooser(pendingAnchor,pendingTarget); }); }
    else if (type === "tie") button.addEventListener("click",()=>finishArpEntry("="));
    chooser.appendChild(button);
  });
  arpPatternGrid.appendChild(chooser);
}
function renderArpPatternBackgroundGrid() {
  if (!arpPatternGrid) return; const cells=[];
  for (let row=9; row<=16; row+=1) {
    const label=document.createElement("div"), visibleRow=row-9; label.className="labelCell"; label.dataset.row=String(row); label.textContent=labelMode==="res"?String(visibleRow+1):visibleRow.toString(16).toUpperCase(); label.style.gridRow=String(row); label.style.gridColumn="1"; label.tabIndex=0; label.setAttribute("role","button"); label.setAttribute("aria-label","Toggle numerical and hexadecimal row labels"); label.addEventListener("click",toggleArpPatternLabelMode); cells.push(label);
  }
  for (let row=1; row<=16; row+=1) for (let col=0; col<8; col+=1) {
    const cell=document.createElement("button"); cell.type="button"; cell.className="backgroundSelectionCell"; cell.dataset.row=String(row); cell.dataset.col=String(col); cell.id=`app3_b2_pattern_r${row}_c${col+1}`; cell.style.gridRow=String(row); cell.style.gridColumn=String(col+2); cell.disabled=true;
    if (row>=9) { cell.disabled=false; cell.classList.add("is-active","arpPatternCell","stepBtn"); if (row===12) cell.classList.add("arpPatternRowDivider"); const patternIndex=(col*8)+(row-9); cell.dataset.step=String(patternIndex+1); cell.dataset.patternIndex=String(patternIndex); cell.tabIndex=patternIndex+1; const value=arpPatternState[activeB2Phrase()][b2RealPatternIndex(patternIndex)]||""; cell.textContent=value.includes(",") ? value.split(",").map(v=>v===""?"—":v).join("·") : value; cell.classList.toggle("hasPatternValue",value!==""); cell.setAttribute("aria-label",value?`Arp pattern step ${patternIndex+1}: ${value.includes(",") ? value.split(",").map(v=>v===""?"—":v).join("·") : value}`:`Arp pattern step ${patternIndex+1}, empty`); cell.addEventListener("click",()=>renderArpEntryChooser(cell,{patternIndex})); }
    cells.push(cell);
  }
  arpPatternGrid.replaceChildren(...cells);
  const desktop=window.matchMedia("(min-width: 760px)").matches; arpPatternGrid.querySelectorAll(".backgroundSelectionCell").forEach(cell=>{ cell.hidden=!desktop && Number(cell.dataset.col)>=4; });
}


function syncArpUi() {
  arpTitle.textContent = b2Pages[b2PageIndex].toLowerCase();
  arpPatternGrid.style.visibility = "visible";
  const values = arpUiState[activeB2Phrase()];

  macroLabels.forEach((label, i) => label.textContent = b2Labels[b2PageIndex][i]);

  macroSliders.forEach((slider, displayIndex) => {
    const slot = ARP_UI_SLOT_MAP[displayIndex];
    const raw = values[slot];

    if (slot === 2) {
      const patternIndex = Math.max(0, Math.min(ARP_PATTERN_PRESETS.length - 1, Math.round(Number(raw))));
      slider.min = "0";
      slider.max = String(ARP_PATTERN_PRESETS.length - 1);
      slider.step = "1";
      slider.value = String(patternIndex);
      slider.style.setProperty("--value", `${(patternIndex / (ARP_PATTERN_PRESETS.length - 1)) * 100}%`);
      macroValues[displayIndex].textContent = ARP_PATTERN_PRESETS[patternIndex].name;
      return;
    }

    if (slot === 0) {
      const rateIndex = Math.max(0, Math.min(ARP_RATE_TABLE.length - 1, Math.round(Number(raw))));
      slider.min = "0";
      slider.max = String(ARP_RATE_TABLE.length - 1);
      slider.step = "1";
      slider.value = String(rateIndex);
      slider.style.setProperty("--value", `${(rateIndex / (ARP_RATE_TABLE.length - 1)) * 100}%`);
      macroValues[displayIndex].textContent = arpRateEntry(rateIndex).label;
      return;
    }

    if (slot === 1) {
      const gate = arpGatePercent(raw);
      slider.min = "10";
      slider.max = "100";
      slider.step = "1";
      slider.value = String(gate);
      slider.style.setProperty("--value", `${((gate - 10) / 90) * 100}%`);
      macroValues[displayIndex].textContent = `${gate}%`;
      return;
    }

    const rhythmIndex = Math.max(
      0,
      Math.min(ARP_MOTION_PRESETS.length - 1, Math.round(Number(raw) || 0))
    );
    slider.min = "0";
    slider.max = String(ARP_MOTION_PRESETS.length - 1);
    slider.step = "1";
    slider.value = String(rhythmIndex);
    slider.style.setProperty("--value", `${(rhythmIndex / (ARP_MOTION_PRESETS.length - 1)) * 100}%`);
    macroValues[displayIndex].textContent = ARP_MOTION_PRESETS[rhythmIndex].name;
  });
}


function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clearGeneratedMelody(phrase) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < MAX_COLS; col += 1) {
      melodyState[phrase][row][col] = "";
      clearMelodyStepVariation({ phrase, row, col });
    }
  }
}

function writeMelodyStep(phrase, step, value) {
  const col = Math.floor(step / ROWS);
  const row = step % ROWS;
  if (col < 0 || col >= MAX_COLS) return;
  melodyState[phrase][row][col] = value == null ? "" : String(value);
}

function degreeOffsetForGenerator(degree, octave = 0) {
  const offset = melodyDegreeToOffset(degree, octave);
  return offset === null ? "" : String(offset);
}

function generateMelody(style) {
  clearGeneratedMelody(currentPhrase);
  const totalSteps = 64; // four-bar phrase; wider displays retain extra empty workspace.

  if (style === "bears") {
    // Spacious, arching phrases with held space and occasional register lift.
    const seeds = [
      [1, 3, 5, 4, 2],
      [1, 5, 4, 3, 2],
      [3, 5, 6, 4, 2],
    ];
    const motif = randomChoice(seeds);
    const starts = [0, 8, 20, 32, 44, 56];
    starts.forEach((start, phraseIndex) => {
      const length = phraseIndex % 2 === 0 ? 3 : 2;
      for (let i = 0; i < length; i += 1) {
        if (Math.random() < 0.18) continue;
        const degree = motif[(i + phraseIndex) % motif.length];
        const octave = Math.random() < 0.16 ? 1 : 0;
        writeMelodyStep(currentPhrase, start + (i * 2), degreeOffsetForGenerator(degree, octave));
      }
    });
  } else {
    // Postal: tighter repeating cells, syncopated omissions, and small mutations.
    const seeds = [
      [1, 5, 3, 6],
      [1, 3, 5, 2],
      [3, 1, 5, 4],
    ];
    const motif = randomChoice(seeds).slice();
    for (let block = 0; block < 8; block += 1) {
      const start = block * 8;
      for (let i = 0; i < 4; i += 1) {
        if (Math.random() < 0.14) continue;
        let degree = motif[i];
        if (block > 0 && Math.random() < 0.22) degree = clamp(degree + randomChoice([-1, 1]), 1, 7);
        const octave = Math.random() < 0.10 ? 1 : 0;
        writeMelodyStep(currentPhrase, start + (i * 2), degreeOffsetForGenerator(degree, octave));
      }
    }
  }

  saveState();
  renderMelodyGrid();
}

function mapArpToken(raw, mapper) {
  const text = String(raw ?? "");
  if (!text || text === "=") return text;
  return text.split(",").map(part => {
    const token = part.trim();
    if (!token) return "";
    const match = token.match(/^([1-7])([↓↑]?)$/);
    if (!match) return token;
    return mapper(Number(match[1]), match[2] || "");
  }).join(",");
}

function generatedArpBase() {
  const grid = arpPatternState[activeB2Phrase()];
  return Array.from({ length: B2_REAL_STEPS }, (_, index) => grid?.[index] || "");
}

function arpActiveEvents(grid) {
  return Array.from({ length: B2_REAL_STEPS }, (_, index) => {
    const value = String(grid?.[index] ?? "").trim();
    return value ? { index, value } : null;
  }).filter(Boolean);
}

function normalizeStyleGrid(grid) {
  const out = cloneRealB2Grid(grid);
  const first = out.findIndex(value => String(value ?? "").trim() !== "");
  if (first <= 0) return out;
  const normalized = Array(B2_DISPLAY_STEPS).fill("");
  for (let i = first; i < B2_REAL_STEPS; i += 1) normalized[i - first] = out[i];
  return normalized;
}

function randomSourceCell(events, minLength, maxLength) {
  if (!events.length) return [];
  const maximum = Math.min(maxLength, events.length);
  const minimum = Math.min(minLength, maximum);
  const length = minimum + Math.floor(Math.random() * Math.max(1, maximum - minimum + 1));
  const start = Math.floor(Math.random() * Math.max(1, events.length - length + 1));
  return events.slice(start, start + length).map(event => event.value);
}

function placeStyleCell(target, cell, start, spacing = 1) {
  cell.forEach((value, offset) => {
    const index = start + offset * spacing;
    if (index >= 0 && index < B2_REAL_STEPS && value) target[index] = value;
  });
}

function sparseStyle(source) {
  const events = arpActiveEvents(source);
  if (!events.length) return cloneRealB2Grid(source);
  const out = Array(B2_DISPLAY_STEPS).fill("");
  const action = randomChoice(["thin","islands","extract","answer","trail"]);

  if (action === "thin") {
    const count = Math.min(events.length, randomChoice([4,5,6,7,8]));
    const picks = [events[0]];
    const pool = events.slice(1);
    while (picks.length < count && pool.length) picks.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
    picks.forEach(event => { out[event.index] = event.value; });
  } else if (action === "islands") {
    const starts = randomChoice([[0,10,24],[0,14,27],[0,18,28]]);
    starts.forEach((start,i) => placeStyleCell(out, randomSourceCell(events, i===0?2:1, 3), start));
  } else if (action === "extract") {
    placeStyleCell(out, randomSourceCell(events,2,4),0,randomChoice([1,2]));
    placeStyleCell(out, randomSourceCell(events,1,2),randomChoice([20,24,28]));
  } else if (action === "answer") {
    placeStyleCell(out,randomSourceCell(events,2,4),0);
    placeStyleCell(out,randomSourceCell(events,2,4),randomChoice([18,22,26]));
  } else {
    [0,8,16,24,31].forEach(target => {
      const nearest=events.reduce((best,event)=>Math.abs(event.index-target)<Math.abs(best.index-target)?event:best,events[0]);
      out[nearest.index]=nearest.value;
    });
  }
  return normalizeStyleGrid(out);
}

function repeatStyle(source) {
  const events=arpActiveEvents(source);
  if (!events.length) return cloneRealB2Grid(source);
  const out=Array(B2_DISPLAY_STEPS).fill("");
  const action=randomChoice(["one","two","three","change","break","octave"]);
  const cell=randomSourceCell(events, action==="one"||action==="octave"?1:2, action==="three"?3:2);
  const base=cell.length?cell:[events[0].value];
  const spacing=randomChoice([2,2,4]);

  for (let i=0;i<B2_REAL_STEPS;i+=spacing) out[i]=base[(i/spacing)%base.length];

  if (action==="one") {
    for (let i=0;i<B2_REAL_STEPS;i+=spacing) out[i]=base[0];
  } else if (action==="change") {
    const changes=randomSourceCell(events,1,2);
    [randomChoice([12,16,20]),randomChoice([26,28,30])].forEach((at,i)=>out[at]=changes[i%changes.length]||base[0]);
  } else if (action==="break") {
    const at=randomChoice([12,16,20]);
    for(let i=at;i<Math.min(32,at+4);i++)out[i]="";
    placeStyleCell(out,randomSourceCell(events,2,4),at);
  } else if (action==="octave") {
    const at=randomChoice([12,20,28]);
    out[at]=mapArpToken(base[0],(degree,suffix)=>`${degree}${suffix==="↑"?"":"↑"}`);
  }
  return normalizeStyleGrid(out);
}

function motifStyle(source) {
  const events = arpActiveEvents(source);
  if (!events.length) return cloneRealB2Grid(source);

  const out = Array(B2_DISPLAY_STEPS).fill("");
  const eventCount = Math.min(events.length, randomChoice([3,4,4,5,5,6]));
  const sourceCell = randomSourceCell(events, eventCount, eventCount);
  const cell = sourceCell.length ? sourceCell.slice() : [events[0].value];

  // Short melodic seed inside steps 1-10 with gaps and occasional adjacent-note bop.
  const shapesByCount = {
    3: [[0,2,5],[0,1,4],[0,3,6],[0,2,8],[0,1,7]],
    4: [[0,2,3,7],[0,1,4,8],[0,3,5,9],[0,2,6,7],[0,1,5,9],[0,3,4,8]],
    5: [[0,1,3,6,9],[0,2,3,7,9],[0,1,5,7,8],[0,3,4,6,9],[0,2,5,6,9]],
    6: [[0,1,3,4,7,9],[0,2,3,5,8,9],[0,1,4,5,7,9],[0,2,4,5,8,9]]
  };
  const positions = randomChoice(shapesByCount[cell.length] || shapesByCount[3]);

  // One restrained melodic gesture sometimes.
  if (cell.length > 2 && Math.random() < 0.45) {
    const index = 1 + Math.floor(Math.random() * (cell.length - 1));
    const mode = randomChoice(["neighbor","neighbor","repeat","octave"]);
    if (mode === "neighbor") {
      cell[index] = mapArpToken(cell[index], (degree, suffix) =>
        `${clamp(degree + randomChoice([-1,1]), 1, 7)}${suffix}`
      );
    } else if (mode === "repeat") {
      cell[index] = cell[Math.max(0, index - 1)];
    } else {
      cell[index] = mapArpToken(cell[index], (degree, suffix) =>
        `${degree}${suffix === "↑" ? "" : "↑"}`
      );
    }
  }

  positions.forEach((position, index) => {
    if (cell[index]) out[position] = cell[index];
  });

  // Motif is deliberately different from Sparse: repeat the entire first
  // 16-step half exactly in steps 17-32.
  for (let index = 0; index < 16; index += 1) {
    out[index + 16] = out[index];
  }

  return normalizeStyleGrid(out);
}


function shuffleStyle(source) {
  const out = cloneRealB2Grid(source);
  const active = arpActiveEvents(source);
  if (!active.length) return out;

  active.forEach((event, eventIndex) => {
    // Most notes change, but not every note has to. Timing is never touched.
    if (Math.random() >= 0.72) return;

    const mode = randomChoice(["neighbor","neighbor","neighbor","second","repeat","keep","octave"]);
    if (mode === "keep") return;

    if (mode === "repeat" && eventIndex > 0) {
      out[event.index] = active[eventIndex - 1].value;
      return;
    }

    if (mode === "octave") {
      out[event.index] = mapArpToken(event.value, (degree, suffix) =>
        `${degree}${suffix === "↑" ? "" : "↑"}`
      );
      return;
    }

    const distance = mode === "second" ? randomChoice([-2,2]) : randomChoice([-1,1]);
    out[event.index] = mapArpToken(event.value, (degree, suffix) =>
      `${clamp(degree + distance, 1, 7)}${suffix}`
    );
  });

  return normalizeStyleGrid(out);
}

function phraseStyle(source) {
  const out=Array(B2_DISPLAY_STEPS).fill("");
  const chunks=[0,8,16,24].map(start=>source.slice(start,start+8));
  const put=(chunk,start)=>chunk.forEach((value,i)=>{if(start+i<B2_REAL_STEPS)out[start+i]=value||"";});
  const vary=chunk=>{
    const next=chunk.slice();
    const active=next.map((v,i)=>String(v??"").trim()?i:-1).filter(i=>i>=0);
    if(active.length){
      const i=randomChoice(active);
      if(Math.random()<0.5)next[i]="";
      else next[i]=mapArpToken(next[i],(degree,suffix)=>`${clamp(degree+randomChoice([-1,1]),1,7)}${suffix}`);
    }
    return next;
  };
  const action=randomChoice(["abab","aaba","aa","swap","rotate","build","strip","return"]);

  if(action==="abab") [chunks[0],chunks[1],chunks[0],vary(chunks[1])].forEach((c,i)=>put(c,i*8));
  else if(action==="aaba") [chunks[0],chunks[0],chunks[1],vary(chunks[0])].forEach((c,i)=>put(c,i*8));
  else if(action==="aa") [chunks[0],vary(chunks[0]),chunks[0],vary(vary(chunks[0]))].forEach((c,i)=>put(c,i*8));
  else if(action==="swap") [chunks[2],chunks[3],chunks[0],chunks[1]].forEach((c,i)=>put(c,i*8));
  else if(action==="rotate") {
    randomChoice([[1,2,3,0],[2,3,0,1],[0,2,1,3],[3,0,1,2]]).forEach((which,i)=>put(chunks[which],i*8));
  } else if(action==="build") {
    put(chunks[0].map((v,i)=>i<4?v:""),0); put(chunks[0],8); put(chunks[0],16); put(vary(chunks[0]),24);
  } else if(action==="strip") {
    chunks.forEach((c,i)=>put(i===2?c.map((v,j)=>j%2===0?v:""):c,i*8));
  } else {
    put(chunks[0],0); put(chunks[1],8); put(chunks[2],16); put(vary(chunks[0]),24);
  }
  return normalizeStyleGrid(out);
}

function mutateArp(style) {
  const phraseId=activeB2Phrase();
  const source=arpGenerateSourceGrid(phraseId);
  if (!arpActiveEvents(source).length) return;

  let next=sparseStyle(source);
  if(style==="repeat") next=repeatStyle(source);
  else if(style==="motif") next=motifStyle(source);
  else if(style==="phrase") next=phraseStyle(source);
  else if(style==="shuffle") next=shuffleStyle(source);

  arpPatternState[phraseId]=cloneRealB2Grid(next);
  syncB2PatternMirror(phraseId);
  arpPatternCustom[phraseId]=true;
  snapshotCurrentGridAsCanonical(phraseId);
  saveState();
  syncArpUi();
  renderArpPatternBackgroundGrid();
}

function generatedChanceValue(page, style, row, col, hasMelody) {
  if (!hasMelody) return null;
  const position = row + (col * ROWS);
  const phraseEdge = row >= 12;

  if (page === "chance") {
    if (style === "bears") {
      const base = phraseEdge ? 68 : 82;
      return clamp(base + randomChoice([-18, -10, 0, 8]), 35, 100);
    }
    const accent = position % 8 === 0 ? 100 : 88;
    return clamp(accent + randomChoice([-18, -8, 0, 6]), 45, 100);
  }

  if (page === "volume") {
    if (style === "bears") return clamp(78 + randomChoice([-18, -10, -4, 0, 6]), 45, 100);
    return clamp(88 + randomChoice([-16, -8, 0, 4, 8]), 55, 100);
  }

  // Gate is an explicit release command. Null means hold. Producer styles
  // choose sparse, musical release points rather than filling every cell.
  if (page === "gate") {
    if (style === "bears") {
      if (Math.random() < 0.64) return null;
      return randomChoice([40,50,60,70,80,90,100]);
    }
    if (Math.random() < 0.46) return null;
    return randomChoice([30,40,50,60,70,80,90,100]);
  }

  return null;
}

function generateChancePage(style) {
  const page = activeChancePage();
  const grid = chanceState[currentPhrase][page];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < MAX_COLS; col += 1) {
      const hasMelody = String(melodyState[currentPhrase][row][col] ?? "").trim() !== "";
      grid[row][col] = generatedChanceValue(page, style, row, col, page === "gate" ? true : hasMelody);
    }
  }
  saveState();
  renderChanceGrid();
}

function generateActivePage() {
  const style = getActiveStyle();
  if (currentView === "melody") generateMelody(style);
  else if (currentView === "arp") mutateArp(style);
  else generateChancePage(style);
}

function render() {
  shell.dataset.context = currentPhrase;
  shell.dataset.page = updateLogicalPageIds();
  updateButtons();
  updateVisibility();
  updateNameplate();

  if (currentView === "melody") renderMelodyGrid();
  else if (currentView === "chance") renderChanceGrid();
  else {
    syncArpUi();
    const workspacePhrase = activeB2Phrase();
    const patternIndex = Math.max(
      0,
      Math.min(
        ARP_PATTERN_PRESETS.length - 1,
        Math.round(Number(arpUiState[workspacePhrase]?.[2]) || 0)
      )
    );
    if (b2PageIndex === 0 && patternIndex > 0 && !arpPatternCustom[workspacePhrase]) {
      populateArpPatternFromPreset(patternIndex);
    }
    renderArpPatternBackgroundGrid();
  }
}

function showMelodyView() {
  clearArpB2CopyState();
  if (currentView !== "melody") {
    currentView = "melody";
    render();
    saveState();
    return;
  }
  cyclePhrase();
}

function showArpView() {
  if (currentView !== "arp") {
    cancelMelodyColumnCopy({ rerender: false });
    currentView = "arp";
    render();
    saveState();
    return;
  }
  b2PageIndex = (b2PageIndex + 1) % 4;
  render();
  saveState();
}



function showChanceView() {
  clearArpB2CopyState();
  if (currentView !== "chance") {
    cancelMelodyColumnCopy({ rerender: false });
    currentView = "chance";
    render();
    saveState();
    return;
  }

  chancePageIndex[currentPhrase] = (chancePageIndex[currentPhrase] + 1) % chancePages.length;
  render();
  saveState();
}

function clearActiveChanceGrid() {
  const page = chancePages[chancePageIndex[currentPhrase]];
  const grid = chanceState[currentPhrase]?.[page];
  if (!Array.isArray(grid)) return;

  for (let row = 0; row < ROWS; row += 1) {
    if (!Array.isArray(grid[row])) continue;
    for (let col = 0; col < MAX_COLS; col += 1) {
      grid[row][col] = null;
    }
  }

  closeChanceChooser();
  closeVolumeChooser();
  closeGateChooser();
  saveState();
  if (currentView === "chance") renderChanceGrid();
}

let melodyButtonClearTimer = null;
let melodyButtonClearFrame = 0;
let melodyButtonClearStart = 0;
let melodyButtonClearFired = false;
const MELODY_BUTTON_CLEAR_MS = 900;
const MELODY_BUTTON_FILL_DELAY_MS = 200;

function setMelodyButtonClearFill(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  melodyBtn.style.setProperty("--clear-fill", `${clamped}%`);
}

function cancelMelodyButtonClear() {
  if (melodyButtonClearTimer !== null) {
    clearTimeout(melodyButtonClearTimer);
    melodyButtonClearTimer = null;
  }
  if (melodyButtonClearFrame) cancelAnimationFrame(melodyButtonClearFrame);
  melodyButtonClearFrame = 0;
  if (!melodyButtonClearFired) setMelodyButtonClearFill(0);
}

function updateMelodyButtonClearFill(now) {
  if (melodyButtonClearTimer === null || melodyButtonClearFired) return;
  setMelodyButtonClearFill(Math.max(0, ((now - melodyButtonClearStart - MELODY_BUTTON_FILL_DELAY_MS) / (MELODY_BUTTON_CLEAR_MS - MELODY_BUTTON_FILL_DELAY_MS)) * 100));
  melodyButtonClearFrame = requestAnimationFrame(updateMelodyButtonClearFill);
}

melodyBtn.addEventListener("pointerdown", event => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  melodyButtonClearFired = false;
  cancelMelodyButtonClear();

  // Destructive hold exists only while B1 is already showing the Melody grid.
  if (currentView !== "melody") return;

  melodyButtonClearStart = performance.now();
  try { melodyBtn.setPointerCapture?.(event.pointerId); } catch (_) {}
  melodyButtonClearFrame = requestAnimationFrame(updateMelodyButtonClearFill);
  melodyButtonClearTimer = window.setTimeout(() => {
    melodyButtonClearTimer = null;
    melodyButtonClearFired = true;
    if (melodyButtonClearFrame) cancelAnimationFrame(melodyButtonClearFrame);
    melodyButtonClearFrame = 0;
    setMelodyButtonClearFill(100);
    clearWholeMelody(currentPhrase);
    window.setTimeout(() => setMelodyButtonClearFill(0), 180);
  }, MELODY_BUTTON_CLEAR_MS);
});

["pointerup", "pointercancel", "pointerleave"].forEach(eventName => {
  melodyBtn.addEventListener(eventName, event => {
    try { melodyBtn.releasePointerCapture?.(event.pointerId); } catch (_) {}
    cancelMelodyButtonClear();
  });
});

melodyBtn.addEventListener("contextmenu", event => event.preventDefault());
melodyBtn.addEventListener("click", event => {
  if (melodyButtonClearFired) {
    melodyButtonClearFired = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  showMelodyView();
});
arpBtn.addEventListener("contextmenu", event => event.preventDefault());
arpBtn.addEventListener("pointerdown", beginArpB2LongPress);
["pointerup", "pointercancel", "pointerleave"].forEach(eventName => {
  arpBtn.addEventListener(eventName, event => {
    try { arpBtn.releasePointerCapture?.(event.pointerId); } catch (_) {}
    cancelArpB2LongPress();
  });
});

arpBtn.addEventListener("click", event => {
  if (arpB2LongPressFired) {
    arpB2LongPressFired = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  showArpView();
});

let chanceButtonClearTimer = null;
let chanceButtonClearFrame = 0;
let chanceButtonClearStart = 0;
let chanceButtonClearFired = false;
const CHANCE_BUTTON_CLEAR_MS = 900;
const CHANCE_BUTTON_FILL_DELAY_MS = 200;

function setChanceButtonClearFill(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  chanceBtn.style.setProperty("--clear-fill", `${clamped}%`);
}

function cancelChanceButtonClear() {
  if (chanceButtonClearTimer !== null) {
    clearTimeout(chanceButtonClearTimer);
    chanceButtonClearTimer = null;
  }
  if (chanceButtonClearFrame) cancelAnimationFrame(chanceButtonClearFrame);
  chanceButtonClearFrame = 0;
  if (!chanceButtonClearFired) setChanceButtonClearFill(0);
}

function updateChanceButtonClearFill(now) {
  if (chanceButtonClearTimer === null || chanceButtonClearFired) return;
  setChanceButtonClearFill(Math.max(0, ((now - chanceButtonClearStart - CHANCE_BUTTON_FILL_DELAY_MS) / (CHANCE_BUTTON_CLEAR_MS - CHANCE_BUTTON_FILL_DELAY_MS)) * 100));
  chanceButtonClearFrame = requestAnimationFrame(updateChanceButtonClearFill);
}

chanceBtn.addEventListener("pointerdown", event => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  chanceButtonClearFired = false;
  cancelChanceButtonClear();

  // Only the already-active B3 variation page owns this destructive hold.
  if (currentView !== "chance") return;

  chanceButtonClearStart = performance.now();
  try { chanceBtn.setPointerCapture?.(event.pointerId); } catch (_) {}
  chanceButtonClearFrame = requestAnimationFrame(updateChanceButtonClearFill);
  chanceButtonClearTimer = window.setTimeout(() => {
    chanceButtonClearTimer = null;
    chanceButtonClearFired = true;
    if (chanceButtonClearFrame) cancelAnimationFrame(chanceButtonClearFrame);
    chanceButtonClearFrame = 0;
    setChanceButtonClearFill(100);
    clearActiveChanceGrid();
    window.setTimeout(() => setChanceButtonClearFill(0), 180);
  }, CHANCE_BUTTON_CLEAR_MS);
});

["pointerup", "pointercancel", "pointerleave"].forEach(eventName => {
  chanceBtn.addEventListener(eventName, event => {
    try { chanceBtn.releasePointerCapture?.(event.pointerId); } catch (_) {}
    cancelChanceButtonClear();
  });
});

chanceBtn.addEventListener("contextmenu", event => event.preventDefault());
chanceBtn.addEventListener("click", event => {
  if (chanceButtonClearFired) {
    chanceButtonClearFired = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  showChanceView();
});

macroSliders.forEach((slider, displayIndex) => {
  slider.addEventListener("input", () => {

    const slot = ARP_UI_SLOT_MAP[displayIndex];

    // Pattern is the only Arp control that constructs a fresh grid.
    if (slot === 2) {
      const value = Math.max(
        0,
        Math.min(ARP_PATTERN_PRESETS.length - 1, Math.round(Number(slider.value) || 0))
      );
      arpUiState[activeB2Phrase()][slot] = value;

      // Any Pattern movement abandons custom memory and starts over.
      arpPatternCustom[activeB2Phrase()] = false;
      arpPatternCanonical[activeB2Phrase()] = Array(B2_DISPLAY_STEPS).fill("");
      arpGeneratedDisplayOffsetTicks[activeB2Phrase()] = 0;
      arpGeneratedTrueGrid[activeB2Phrase()] = Array(B2_DISPLAY_STEPS).fill("");

      slider.style.setProperty("--value", `${(value / (ARP_PATTERN_PRESETS.length - 1)) * 100}%`);
      macroValues[displayIndex].textContent = ARP_PATTERN_PRESETS[value].name;
      rebuildArpPatternFromControls();
      saveState();
      renderArpPatternBackgroundGrid();
      return;
    }

    if (slot === 0) {
      const previous = Math.max(
        0,
        Math.min(ARP_RATE_TABLE.length - 1, Math.round(Number(arpUiState[activeB2Phrase()][slot]) || 0))
      );
      const value = Math.max(
        0,
        Math.min(ARP_RATE_TABLE.length - 1, Math.round(Number(slider.value) || 0))
      );
      const isCustom = arpPatternCustom[activeB2Phrase()] === true;
      arpUiState[activeB2Phrase()][slot] = value;

      if (value !== previous) {
        if (isCustom) {
          transformCurrentArpRate(previous, value);
        } else {
          rebuildArpPatternFromControls();
        }
      }

      slider.style.setProperty("--value", `${(value / (ARP_RATE_TABLE.length - 1)) * 100}%`);
      macroValues[displayIndex].textContent = arpRateEntry(value).label;
      saveState();
      renderArpPatternBackgroundGrid();
      return;
    }

    // Gate is articulation only.
    if (slot === 1) {
      const value = arpGatePercent(slider.value);
      resetArpGenerateSource(activeB2Phrase());
      arpUiState[activeB2Phrase()][slot] = value;
      slider.style.setProperty("--value", `${((value - 10) / 90) * 100}%`);
      macroValues[displayIndex].textContent = `${value}%`;
      saveState();
      return;
    }

    // Untouched slider-generated grids recompute deterministically from Pattern.
    // Custom grids apply Motion to the current edited/generated event material.
    if (slot === 3) {
      const value = Math.max(
        0,
        Math.min(ARP_MOTION_PRESETS.length - 1, Math.round(Number(slider.value) || 0))
      );
      const isCustom = arpPatternCustom[activeB2Phrase()] === true;
      arpUiState[activeB2Phrase()][slot] = value;

      slider.style.setProperty("--value", `${(value / (ARP_MOTION_PRESETS.length - 1)) * 100}%`);
      macroValues[displayIndex].textContent = ARP_MOTION_PRESETS[value].name;

      if (isCustom) {
        transformCurrentArpMotion(value);
      } else {
        rebuildArpPatternFromControls();
      }

      saveState();
      renderArpPatternBackgroundGrid();
    }
  });
});


styleBtn.addEventListener("click", cycleActiveStyle);
generateBtn.addEventListener("click", generateActivePage);

// B2 audition is owned by ArpPhaceAuditionEngine. B1/B3 melody audition is intentionally deferred.

let resizeTimer;
window.addEventListener("resize", () => {
  if (currentView === "arp") renderArpPatternBackgroundGrid();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const next = getDisplayColumns();
    if (next !== visibleCols) {
      visibleCols = next;
      render();
    }
  }, 120);
});

loadState();
render();

window.addEventListener("storage", event => {
  if (event.key !== GRID_LABEL_MODE_KEY) return;
  labelMode = event.newValue === "hex" ? "hex" : "res";
  render();
});



const INTERPHACE_PROJECT_STORAGE_KEY = "interPhace.interPhace.ui.v2";

function readArpProjectPlaybackSettings() {
  try {
    const rootState = JSON.parse(localStorage.getItem(INTERPHACE_PROJECT_STORAGE_KEY) || "null") || {};
    const project = rootState.project || {};
    const child = rootState.child || {};
    return Object.freeze({
      rootMidi: Math.max(21, Math.min(108, Math.round(Number(project.root) || 60))),
      tempo: Math.max(30, Math.min(300, Number(project.tempo) || 75)),
      swing: Math.max(0, Math.min(100, Number(project.swing) || 0)),
      arpTone: child.arpTone !== false,
      effectsReleaseMs: Math.max(
        10,
        Math.min(4000, Math.round(Number(child.arpEffectsRelease) || 30))
      ),
    });
  } catch (_) {
    return Object.freeze({
      rootMidi: 60,
      tempo: 75,
      swing: 0,
      arpTone: true,
      effectsReleaseMs: 30,
    });
  }
}

function parseArpPatternCellValue(value) {
  const text=String(value??"").trim(); if (!text || text==="=") return [];
  const parts=text.split(",").slice(0,2);
  if (parts.length>=2) return parts.map((part,substep)=>{ const token=part.trim(); if (token==="") return null; const semitone=arpDegreeTokenToOffset(token); if (semitone===null) return null; return Object.freeze({semitone,substep,subdivided:true}); }).filter(Boolean);
  const semitone=arpDegreeTokenToOffset(text); if (semitone===null) return []; return [Object.freeze({semitone,substep:0,subdivided:false})];
}


function buildPresetSourceEventsForFullLoop(rateIndex) {
  const patternIndex = Math.max(
    0,
    Math.min(
      ARP_PATTERN_PRESETS.length - 1,
      Math.round(Number(arpUiState[activeB2Phrase()]?.[2]) || 0)
    )
  );
  if (patternIndex === 0) return [];

  const preset = ARP_PATTERN_PRESETS[patternIndex];
  if (!preset?.phrase) return [];

  const phrase = applyArpMotionToPhrase(
    preset.phrase.slice(0, 16),
    arpUiState[activeB2Phrase()]?.[3]
  );

  const rate = arpRateEntry(rateIndex);
  const sixteenthsPerEvent = rate.beats / 0.25;

  return phrase.flatMap((value, index) => {
    const semitone = arpDegreeTokenToOffset(value);
    if (semitone === null) return [];
    return [Object.freeze({ offsetSixteenths: index * sixteenthsPerEvent, semitone })];
  });
}

function buildArpAuditionSequence() {
  const project = readArpProjectPlaybackSettings();
  const phraseId = activeB2Phrase();
  const rateIndex = Math.max(
    0,
    Math.min(
      ARP_RATE_TABLE.length - 1,
      Math.round(
        Number.isFinite(Number(arpUiState[phraseId]?.[0]))
          ? Number(arpUiState[phraseId][0])
          : ARP_RATE_DEFAULT_INDEX
      )
    )
  );
  const rate = arpRateEntry(rateIndex);
  const gatePercent = arpGatePercent(arpUiState[phraseId]?.[1]);

  const loopSixteenths = B2_REAL_STEPS;
  const sixteenthSeconds = (60 / project.tempo) / 4;
  const rateStepSeconds = (60 / project.tempo) * rate.beats;
  const gateSeconds = rateStepSeconds * (gatePercent / 100);

  const eventsByPosition = new Map();

  for (let cellIndex = 0; cellIndex < B2_REAL_STEPS; cellIndex += 1) {
    const rawCell = String(arpPatternState[phraseId][cellIndex] ?? "").trim();

    if (rawCell === "=") {
      const priorKeys = [...eventsByPosition.keys()]
        .filter(key => key < cellIndex)
        .sort((a,b) => b-a);
      if (priorKeys.length) {
        const key = priorKeys[0];
        const previous = eventsByPosition.get(key);
        eventsByPosition.set(key, Object.freeze({
          ...previous,
          tieExtensionSixteenths: (previous.tieExtensionSixteenths || 0) + 1,
        }));
      }
      continue;
    }

    const parsed = parseArpPatternCellValue(rawCell);

    for (const entry of parsed) {
      const offsetSixteenths = cellIndex + (entry.subdivided ? entry.substep * 0.5 : 0);
      if (offsetSixteenths >= loopSixteenths) continue;

      eventsByPosition.set(
        offsetSixteenths,
        Object.freeze({
          offsetSixteenths,
          semitone: entry.semitone,
          subdivided: entry.subdivided,
        })
      );
    }
  }

  const events = [...eventsByPosition.values()]
    .sort((a, b) => a.offsetSixteenths - b.offsetSixteenths)
    .map(event => Object.freeze({
      ...event,
      midiNote: project.rootMidi + event.semitone,
      offsetSeconds: window.InterPhaceShell.swungSixteenthTime(
        event.offsetSixteenths,
        sixteenthSeconds,
        project.swing,
      ),
      gateSeconds: (
        event.subdivided
          ? Math.min(gateSeconds, (sixteenthSeconds * 0.5) * (gatePercent / 100))
          : gateSeconds
      ) + ((event.tieExtensionSixteenths || 0) * sixteenthSeconds),
    }));

  return Object.freeze({
    phrase: phraseId,
    view: currentView,
    rootMidi: project.rootMidi,
    tempo: project.tempo,
    swing: project.swing,
    arpTone: project.arpTone,
    effectsReleaseMs: project.effectsReleaseMs,
    effectsReleaseSeconds: project.effectsReleaseMs / 1000,
    rateIndex,
    rate: rate.label,
    gatePercent,
    gateSeconds,
    loopSixteenths,
    loopSeconds: loopSixteenths * sixteenthSeconds,
    events: Object.freeze(events),
  });
}

function parseMelodyCellEvents(value) {
  const text = String(value ?? "").trim();
  if (!text) return [];

  const parts = text.split(",");
  if (parts.length >= 2) {
    return parts.slice(0,2).map((part, substep) => {
      const trimmed = part.trim();
      if (!trimmed || !/^[+-]?\d+$/.test(trimmed)) return null;
      const semitone = Number(trimmed);
      if (!Number.isInteger(semitone) || semitone < -24 || semitone > 24) return null;
      return Object.freeze({ semitone, substep });
    }).filter(Boolean);
  }

  if (!/^[+-]?\d+$/.test(text)) return [];
  const semitone = Number(text);
  if (!Number.isInteger(semitone) || semitone < -24 || semitone > 24) return [];
  return [Object.freeze({ semitone, substep: 0 })];
}

function melodyPositionFromPhraseLocalIndex(phrase, index) {
  const cellsPerPhrase = ROWS * MAX_COLS;
  const wrapped = ((index % cellsPerPhrase) + cellsPerPhrase) % cellsPerPhrase;
  const col = Math.floor(wrapped / ROWS);
  const row = wrapped % ROWS;
  return Object.freeze({ phrase, row, col, index: wrapped });
}

function buildMelodyAuditionSequence(auditionPhrase = currentPhrase) {
  const project = readArpProjectPlaybackSettings();
  const sixteenthSeconds = (60 / project.tempo) / 4;
  const loopSixteenths = ROWS * MAX_COLS;
  auditionPhrase = phrases.includes(auditionPhrase) ? auditionPhrase : currentPhrase;

  // Melody audition is phrase-local. Only the currently selected M1-M4 is
  // traversed, and that same melody defines its own loop boundary.
  const rawEvents = [];
  for (let localIndex = 0; localIndex < loopSixteenths; localIndex += 1) {
    const position = melodyPositionFromPhraseLocalIndex(auditionPhrase, localIndex);
    const rawValue = String(getMelodyCellValue(position) ?? "").trim();
    if (!rawValue || rawValue === "=") continue;

    // Chance is resolved once when Play begins. Blank means 100%.
    const rawChance = chanceState[auditionPhrase]?.chance?.[position.row]?.[position.col];
    const chancePercent = rawChance === null || rawChance === undefined || rawChance === ""
      ? 100
      : Math.max(0, Math.min(100, Number(rawChance)));
    if (Math.random() * 100 >= chancePercent) continue;

    // Volume variation is also resolved once when Play begins. Blank means no
    // change. A stored center value means a random level within +/-5 percent.
    // Both 32nd sub-notes in one melody cell share the same resolved level.
    const rawVolume = chanceState[auditionPhrase]?.volume?.[position.row]?.[position.col];
    let volumeMultiplier = 1;
    if (rawVolume !== null && rawVolume !== undefined && rawVolume !== "") {
      const center = Math.max(5, Math.min(95, Number(rawVolume)));
      const low = Math.max(0, Math.round(center - 5));
      const high = Math.min(100, Math.round(center + 5));
      const resolvedPercent = low + Math.floor(Math.random() * ((high - low) + 1));
      volumeMultiplier = resolvedPercent / 100;
    }

    for (const entry of parseMelodyCellEvents(rawValue)) {
      const offsetSixteenths = localIndex + (entry.substep * 0.5);
      rawEvents.push({
        offsetSixteenths,
        semitone: entry.semitone,
        midiNote: project.rootMidi + entry.semitone,
        subdivided: entry.substep > 0 || rawValue.includes(","),
        sourceLinearIndex: localIndex,
        volumeMultiplier,
      });
    }
  }
  rawEvents.sort((a, b) => a.offsetSixteenths - b.offsetSixteenths);

  // Gate commands are also phrase-local. Blank means hold. Exact inherited
  // percentages remain intact; only the manual picker is quantized.
  const gateCommands = [];
  for (let localIndex = 0; localIndex < loopSixteenths; localIndex += 1) {
    const position = melodyPositionFromPhraseLocalIndex(auditionPhrase, localIndex);
    const rawGate = getGateCellValue(position);
    if (rawGate === null || rawGate === undefined || rawGate === "") continue;
    const gatePercent = Math.max(1, Math.min(100, Number(rawGate)));
    gateCommands.push({
      sourceLinearIndex: localIndex,
      offsetSixteenths: localIndex + (gatePercent / 100),
      gatePercent,
    });
  }

  const events = rawEvents.map((event, index) => {
    const nextEvent = rawEvents[index + 1];
    let releaseAt = nextEvent ? nextEvent.offsetSixteenths : loopSixteenths;

    // For a cell containing two 32nd triggers, an explicit Gate value applies
    // to each half-step independently.
    const sameCellGate = gateCommands.find(command => command.sourceLinearIndex === event.sourceLinearIndex);
    if (sameCellGate && event.subdivided) {
      const halfStart = event.offsetSixteenths;
      const halfGate = halfStart + (0.5 * (sameCellGate.gatePercent / 100));
      releaseAt = Math.min(releaseAt, halfGate);
    } else {
      const explicitRelease = gateCommands.find(command =>
        command.offsetSixteenths > event.offsetSixteenths &&
        command.offsetSixteenths <= releaseAt
      );
      if (explicitRelease) releaseAt = explicitRelease.offsetSixteenths;
    }

    const gateSixteenths = Math.max(0.01, releaseAt - event.offsetSixteenths);
    return Object.freeze({
      offsetSixteenths: event.offsetSixteenths,
      semitone: event.semitone,
      midiNote: event.midiNote,
      offsetSeconds: window.InterPhaceShell.swungSixteenthTime(
        event.offsetSixteenths,
        sixteenthSeconds,
        project.swing,
      ),
      gateSeconds: gateSixteenths * sixteenthSeconds,
      volumeMultiplier: event.volumeMultiplier ?? 1,
    });
  });

  return Object.freeze({
    phrase: auditionPhrase,
    view: currentView,
    rootMidi: project.rootMidi,
    tempo: project.tempo,
    swing: project.swing,
    arpTone: project.arpTone,
    effectsReleaseMs: project.effectsReleaseMs,
    effectsReleaseSeconds: project.effectsReleaseMs / 1000,
    rateIndex: ARP_RATE_DEFAULT_INDEX,
    rate: "melody",
    gatePercent: null,
    gateSeconds: null,
    loopSixteenths,
    loopSeconds: loopSixteenths * sixteenthSeconds,
    events: Object.freeze(events),
  });
}

function buildMelodyBarSequence(phrase, barNumber) {
  // Sequencer Melody source is derived from the exact working B1 audition snapshot.
  // Build the full requested M1-M4 Melody exactly as B1 Play does, then crop one
  // 16-sixteenth source column/bar and shift it to bar-local time.
  refreshSequencerMelodyStateFromStorage();

  const sourcePhrase = phrases.includes(phrase) ? phrase : "p1";
  const bar = Math.max(1, Math.min(8, Math.round(Number(barNumber) || 1)));
  const full = buildMelodyAuditionSequence(sourcePhrase);

  const startSixteenths = (bar - 1) * 16;
  const endSixteenths = startSixteenths + 16;
  const sixteenthSeconds = (60 / full.tempo) / 4;

  const events = full.events
    .filter(event =>
      Number(event.offsetSixteenths) >= startSixteenths &&
      Number(event.offsetSixteenths) < endSixteenths
    )
    .map(event => {
      const localSixteenths = Number(event.offsetSixteenths) - startSixteenths;
      const remainingSixteenths = Math.max(0.01, 16 - localSixteenths);
      const remainingSeconds = remainingSixteenths * sixteenthSeconds;

      return Object.freeze({
        ...event,
        offsetSixteenths: localSixteenths,
        offsetSeconds: window.InterPhaceShell.swungSixteenthTime(
          localSixteenths,
          sixteenthSeconds,
          full.swing ?? readArpProjectPlaybackSettings().swing,
        ),
        gateSeconds: Math.min(
          Math.max(0.01, Number(event.gateSeconds) || 0.01),
          remainingSeconds
        ),
      });
    });

  return Object.freeze({
    ...full,
    phrase: sourcePhrase,
    view: "melody",
    sourceBar: bar,
    sourceColumn: bar - 1,
    loopSixteenths: 16,
    loopSeconds: 16 * sixteenthSeconds,
    events: Object.freeze(events),
  });
}

window.ArpPhaceAuditionState = Object.freeze({
  snapshot() {
    return currentView === "arp"
      ? buildArpAuditionSequence()
      : buildMelodyAuditionSequence();
  },
  globalArpSnapshot() {
    return buildArpAuditionSequence();
  },
  globalMelodyBarSnapshot(phrase, barNumber) {
    return buildMelodyBarSequence(phrase, barNumber);
  },
});

window.addEventListener("beforeunload", () => window.ArpPhaceAuditionEngine?.stop());
window.addEventListener("pagehide", () => window.ArpPhaceAuditionEngine?.stop());

window.interPhaceArpGate = Object.freeze({
  getVoiceGate(phrase = currentPhrase, tempo = 75) {
    const state = arpUiState[phrases.includes(phrase) ? phrase : currentPhrase];
    return arpGateTiming({
      rateIndex: state?.[0],
      gatePercent: state?.[1],
      tempo,
    });
  },
});

const arpShellBinding = window.InterPhaceShell?.bind({
  app: "#shell",
  name: "arpPhace",
  accent: getComputedStyle(document.documentElement).getPropertyValue("--phace-arp").trim() || "#d98245",
  line: getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#2a2d33",
  text: getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#f0f1f3",
  muted: getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "#777d87",
  getAuditionState: () => window.ArpPhaceAuditionEngine?.getAuditionState?.() || "idle",
  canSnapshot: () => window.InterPhaceShell?.snapshots?.hasOpenSlot("arpPhace"),
  onSnapshot: () => window.InterPhaceShell?.snapshots?.save("arpPhace", {
    state: JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"),
  }),
});
