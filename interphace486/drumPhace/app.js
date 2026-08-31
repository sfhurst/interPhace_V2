const shell = document.getElementById("shell");
const styleBtn = document.getElementById("shellB4");
const generateBtn = document.getElementById("shellB5");
const patternBtn = document.getElementById("shellB1");
const synthBtn = document.getElementById("shellB2");
const chanceBtn = document.getElementById("shellB3");
const auditionBtn = document.getElementById("shellAudition");


const app4_b1_p1_c1 = document.getElementById("app4_b1_p1_c1");
const app4_b1_p1 = document.getElementById("app4_b1_p1");
const synthPages = {
  kick: document.getElementById("app4_b2_p1"),
  snare: document.getElementById("app4_b2_p2"),
  hat: document.getElementById("app4_b2_p3"),
};

const synthTitles = {
  kick: document.getElementById("app4_b2_p1_title"),
  snare: document.getElementById("app4_b2_p2_title"),
  hat: document.getElementById("app4_b2_p3_title"),
};

const synthControls = {
  kick: {
    labels: Array.from({ length: 8 }, (_, index) => document.getElementById(`app4_b2_p1_c${index + 1}_label`)),
    sliders: Array.from({ length: 8 }, (_, index) => document.getElementById(`app4_b2_p1_c${index + 1}`)),
    values: Array.from({ length: 8 }, (_, index) => document.getElementById(`app4_b2_p1_c${index + 1}_value`)),
  },
  snare: {
    labels: Array.from({ length: 8 }, (_, index) => document.getElementById(`app4_b2_p2_c${index + 1}_label`)),
    sliders: Array.from({ length: 8 }, (_, index) => document.getElementById(`app4_b2_p2_c${index + 1}`)),
    values: Array.from({ length: 8 }, (_, index) => document.getElementById(`app4_b2_p2_c${index + 1}_value`)),
  },
  hat: {
    labels: Array.from({ length: 8 }, (_, index) => document.getElementById(`app4_b2_p3_c${index + 1}_label`)),
    sliders: Array.from({ length: 8 }, (_, index) => document.getElementById(`app4_b2_p3_c${index + 1}`)),
    values: Array.from({ length: 8 }, (_, index) => document.getElementById(`app4_b2_p3_c${index + 1}_value`)),
  },
};

const shellMaker = document.querySelector(".shell-maker");


const instruments = ["kick", "snare", "hat"];

const instrumentButtonMarkup = {
  kick: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.2"/><circle cx="12" cy="12" r="2.1"/></svg>`,
  snare: `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="8" rx="7.2" ry="2.8"/><path d="M4.8 8v8c0 1.55 3.22 2.8 7.2 2.8s7.2-1.25 7.2-2.8V8"/><path d="M7 12.4l10 3.2M7 15.6l10-3.2"/></svg>`,
  hat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10.5h15L12 6zM5.5 13.5h13L12 17z"/><path d="M12 3v3M12 17v4"/></svg>`,
};

function updatePatternButton() {
  if (!patternBtn) return;
  patternBtn.innerHTML = instrumentButtonMarkup[currentPage];
  patternBtn.classList.add("active");
  patternBtn.setAttribute("aria-label", `${currentPage} pattern`);
  patternBtn.setAttribute("title", `${currentPage} pattern`);
}

const instrumentNumbers = { kick: 1, snare: 2, hat: 3 };


function updateLogicalPageIds() {
  const instrumentPage = instrumentNumbers[currentPage];
  const gridPageId = currentView === "chance"
    ? `app4_b3_p${chancePageIndex[currentPage] + 1}`
    : `app4_b1_p${instrumentPage}`;

  app4_b1_p1.id = gridPageId;
  app4_b1_p1_c1.id = `${gridPageId}_c1`;

  return currentView === "synth" ? `app4_b2_p${instrumentPage}` : gridPageId;
}

const KICK_PRESETS = Object.freeze([
  Object.freeze({ name: "INIT",    values: Object.freeze([43, 118,  55,  420,  0,  0,  0]) }),
  Object.freeze({ name: "808",     values: Object.freeze([38, 105,  82, 1250,  3,  0,  4]) }),
  Object.freeze({ name: "909",     values: Object.freeze([48, 155,  38,  360, 38,  4, 42]) }),
  Object.freeze({ name: "606",     values: Object.freeze([56, 125,  28,  210, 18,  2, 16]) }),
  Object.freeze({ name: "CR78",    values: Object.freeze([51,  92,  72,  310,  4,  5,  8]) }),
  Object.freeze({ name: "SIMMONS", values: Object.freeze([63, 205, 145,  620, 10,  0, 12]) }),
  Object.freeze({ name: "DMX",     values: Object.freeze([54, 148,  31,  245, 48, 24, 50]) }),
  Object.freeze({ name: "DRE",     values: Object.freeze([46, 172,  27,  300, 55,  8, 46]) }),
  Object.freeze({ name: "DILLA",   values: Object.freeze([49, 116,  49,  335, 15, 30, 34]) }),
  Object.freeze({ name: "ROMIL",   values: Object.freeze([41, 164,  36,  510, 42, 12, 38]) }),
]);
const KICK_INIT = Object.freeze([...KICK_PRESETS[0].values, 0]);
const SNARE_PRESETS = Object.freeze([
  Object.freeze({ name: "INIT",    values: Object.freeze([50, 50, 100, 50, 50,  0,  0]) }),
  Object.freeze({ name: "TIGHT",   values: Object.freeze([58, 72,  76, 64, 28,  4,  6]) }),
  Object.freeze({ name: "CRACK",   values: Object.freeze([52, 92,  72, 72, 34,  2, 14]) }),
  Object.freeze({ name: "808",     values: Object.freeze([44, 46,  58, 44, 68, 34,  4]) }),
  Object.freeze({ name: "909",     values: Object.freeze([58, 78,  74, 68, 52, 18, 10]) }),
  Object.freeze({ name: "DRY",     values: Object.freeze([62, 66,  52, 58, 22,  0,  4]) }),
  Object.freeze({ name: "DUSTY",   values: Object.freeze([46, 54,  86, 30, 58, 10, 24]) }),
  Object.freeze({ name: "RING",    values: Object.freeze([54, 48,  62, 48, 70, 82,  6]) }),
  Object.freeze({ name: "DIGITAL", values: Object.freeze([60, 88,  64, 82, 30,  8, 28]) }),
  Object.freeze({ name: "BOOM",    values: Object.freeze([34, 42,  72, 38, 76, 54,  8]) }),
  Object.freeze({ name: "SOFT",    values: Object.freeze([40, 34,  78, 36, 60, 14,  2]) }),
  Object.freeze({ name: "RIM",     values: Object.freeze([76, 96,  24, 86, 18, 12, 18]) }),
]);
const SNARE_INIT = Object.freeze([...SNARE_PRESETS[0].values, 0]);

const HAT_PRESETS = Object.freeze([
  Object.freeze({ name: "INIT",    values: Object.freeze([ 50,   0, 100,   0,   0, 32,  0]) }),
  Object.freeze({ name: "TIGHT",   values: Object.freeze([ 78,  12,  74,  72,  10, 16,  8]) }),
  Object.freeze({ name: "CRISP",   values: Object.freeze([ 88,  18,  68,  84,  12, 22, 10]) }),
  Object.freeze({ name: "TICK",    values: Object.freeze([ 94,   4,  34, 100,   0,  9, 12]) }),
  Object.freeze({ name: "606",     values: Object.freeze([ 58,  72,  36,  30,  42, 38,  6]) }),
  Object.freeze({ name: "808",     values: Object.freeze([ 52,  58,  48,  18,  38, 44,  4]) }),
  Object.freeze({ name: "909",     values: Object.freeze([ 68,  78,  34,  58,  34, 34, 10]) }),
  Object.freeze({ name: "DIGITAL", values: Object.freeze([ 92,  24,  38,  92,   8, 18, 28]) }),
  Object.freeze({ name: "DUSTY",   values: Object.freeze([ 36,  18,  88,  18,  26, 55, 24]) }),
  Object.freeze({ name: "METAL",   values: Object.freeze([ 62,  94,  16,  20,  72, 42, 14]) }),
  Object.freeze({ name: "RING",    values: Object.freeze([ 54,  52,  22,  12,  92, 58, 10]) }),
  Object.freeze({ name: "NEEDLE",  values: Object.freeze([100,   6,  24, 100,   0,  8, 18]) }),
]);
const HAT_INIT = Object.freeze([...HAT_PRESETS[0].values, 0]);

const drumSynthConfigs = {
  kick: [
    { label: "Pitch", min: 30, max: 80, step: 1, format: value => `${Math.round(value)} Hz` },
    { label: "Punch", min: 45, max: 220, step: 1, format: value => `${Math.round(value)} Hz` },
    { label: "Sweep", min: 15, max: 180, step: 1, format: value => `${Math.round(value)} ms` },
    { label: "Decay", min: 60, max: 1800, step: 10, format: value => `${Math.round(value)} ms` },
    { label: "Tone", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Noise", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Shape", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Preset", min: 0, max: KICK_PRESETS.length - 1, step: 1, format: value => KICK_PRESETS[Math.round(value)]?.name || "INIT" },
  ],
  // Snare and Hat remain on their existing placeholder sound engines for now.
  // Their B2 controls are deliberately left as four placeholders until those
  // synths receive the same focused rebuild as Kick.
  snare: [
    { label: "Body", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Snap", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Noise", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Tone", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Decay", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Ring", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Shape", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Preset", min: 0, max: SNARE_PRESETS.length - 1, step: 1, format: value => SNARE_PRESETS[Math.round(value)]?.name || "INIT" },
  ],
  hat: [
    { label: "Tone", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Metal", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Noise", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Click", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Ring", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Decay", min: 8, max: 140, step: 1, format: value => `${Math.round(value)} ms` },
    { label: "Shape", min: 0, max: 100, step: 1, format: value => String(Math.round(value)) },
    { label: "Preset", min: 0, max: HAT_PRESETS.length - 1, step: 1, format: value => HAT_PRESETS[Math.round(value)]?.name || "INIT" },
  ],
};

const drumSynthUiState = {
  kick: [...KICK_INIT],
  snare: [...SNARE_INIT],
  hat: [...HAT_INIT],
};

function sliderFillPercent(slider, value) {
  const min = Number(slider.min);
  const max = Number(slider.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
  return ((Number(value) - min) / (max - min)) * 100;
}

function syncDrumSynthUi() {
  const controls = synthControls[currentPage];
  const configs = drumSynthConfigs[currentPage];
  const values = drumSynthUiState[currentPage];

  if (synthTitles[currentPage]) synthTitles[currentPage].textContent = `${currentPage} synth`;

  controls.labels.forEach((label, index) => {
    const config = configs[index];
    if (label && config) label.textContent = config.label;
  });

  controls.sliders.forEach((slider, index) => {
    const config = configs[index];
    if (!slider || !config) return;
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = String(values[index]);
    slider.disabled = config.max <= config.min;
    slider.style.setProperty("--value", `${sliderFillPercent(slider, values[index])}%`);
    slider.setAttribute("aria-label", `${currentPage} ${config.label}`);
  });

  controls.values.forEach((value, index) => {
    const config = configs[index];
    if (value && config) value.textContent = config.format(values[index]);
  });
}

function renderSynthPages() {
  const synthActive = currentView === "synth";
  Object.entries(synthPages).forEach(([type, page]) => {
    page.classList.toggle("hidden", !(synthActive && type === currentPage));
  });
  if (synthActive) syncDrumSynthUi();
}


function updateSynthButton() {
  if (!synthBtn) return;
  const number = instrumentNumbers[currentPage];
  synthBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="14" rx="1.5"/>
    <path d="M6.5 5v8M9.5 5v8M12.5 5v8M15.5 5v8M18.5 5v8"/>
    <path d="M8 5v6h2V5M13 5v6h2V5M17 5v6h2V5"/>
  </svg><span class="num">${number}</span>`;
  synthBtn.setAttribute("aria-label", `${currentPage} synth`);
  synthBtn.setAttribute("title", `${currentPage} synth`);
  synthBtn.classList.toggle("active", currentView === "synth");
}

function getActiveChancePage() {
  return chancePages[chancePageIndex[currentPage]];
}

function updateRightNameplate() {
  if (!shellMaker) return;

  if (currentView === "chance") {
    const page = getActiveChancePage();
    shellMaker.textContent =
      page === "chance" ? "chance" :
      page === "volume" ? "volume" :
      "repeats";
  } else {
    shellMaker.textContent = "hurst.audio";
  }
}


function updateChanceButton() {
  if (!chanceBtn) return;
  const number = instrumentNumbers[currentPage];
  const page = getActiveChancePage();
  const pageLetter = ({ chance: "C", volume: "V", repeats: "R" })[page] || "";
  chanceBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 11.4c-1.5-1.1-3.7-2.1-5.2-1.2-1.6.9-1.6 3.3-.1 4.3 1.3.9 3.5.1 5.3-1.3"/>
    <path d="M12 11.4c1.5-1.1 3.7-2.1 5.2-1.2 1.6.9 1.6 3.3.1 4.3-1.3.9-3.5.1-5.3-1.3"/>
    <path d="M11.9 11.5c-1.1-1.5-2.1-3.7-1.2-5.2.9-1.6 3.3-1.6 4.3-.1.9 1.3.1 3.5-1.3 5.3"/>
    <path d="M12.1 11.5c-1.1 1.5-2.1 3.7-1.2 5.2.9 1.6 3.3 1.6 4.3.1.9-1.3.1-3.5-1.3-5.3"/>
    <path d="M12 13.2c-.2 3.2-1.1 5.4-2.8 7"/>
  </svg><span class="num">${number}${pageLetter}</span>`;
  const label = page[0].toUpperCase() + page.slice(1);
  chanceBtn.setAttribute("aria-label", `${currentPage} ${label}`);
  chanceBtn.setAttribute("title", `${currentPage} ${label}`);
  chanceBtn.classList.toggle("active", currentView === "chance");
}


function updateMiddleView() {
  const patternActive = currentView === "pattern";
  const synthActive = currentView === "synth";
  const chanceActive = currentView === "chance";

  app4_b1_p1.classList.toggle("hidden", !(patternActive || chanceActive));
  renderSynthPages();

  patternBtn.classList.toggle("active", patternActive);
  synthBtn.classList.toggle("active", synthActive);
  chanceBtn.classList.toggle("active", chanceActive);
}


const HamptonDrumEngine = (() => {
const LEVEL = Object.freeze({
  FORBIDDEN: 0,
  RARELY: 1,
  SOMETIMES: 2,
  MOSTLY: 3,
  ANCHOR: 4
});

const TABLES = {
  kick: {
    A: [4,0,2,1, 0,2,3,1, 2,3,1,2, 0,2,3,2],
    B: [1,2,1,2, 0,3,2,3, 1,2,3,2, 0,3,2,3]
  },

  snare: {
    // User-facing priorities:
    // 1 Always, 2 Mostly, 3 Sometimes, 4 Rarely, 5 Forbidden
    // Internal: 4 Always, 3 Mostly, 2 Sometimes, 1 Rarely, 0 Forbidden
    A: [0,1,0,1, 4,1,1,2, 0,1,0,1, 4,1,2,2],
    B: [0,1,0,1, 3,1,2,2, 0,1,0,1, 3,2,2,2]
  },

  hat: {
    A: [3,2,3,2, 3,2,3,2, 3,2,3,2, 3,2,3,2],
    B: [3,2,3,2, 3,2,3,2, 3,2,3,2, 3,2,3,2]
  }
};

const PROFILE = {
  kick: {
    stepChance: { mostly: 0.80, sometimes: 0.40, rarely: 0.15 },

    // Hampton Kick density ranges:
    // Sparse 2-3 = 15%
    // Medium 3-5 = 50%
    // Heavy 5-7 = 35%
    densityRanges: [
      { label: "Sparse", min: 2, max: 3, chance: 0.15 },
      { label: "Medium", min: 3, max: 5, chance: 0.50 },
      { label: "Heavy", min: 5, max: 7, chance: 0.35 }
    ],

    shapeChance: {
      front: 0.45,
      middle: 0.25,
      back: 0.65
    },

    shapeRegions: {
      front:  [0,1,2,3],
      middle: [2,3,4,5,6,7,8,9,10,11,12,13],
      back:   [12,13,14,15]
    }
  },

  snare: {
    stepChance: { mostly: 0.93, sometimes: 0.20, rarely: 0.05 },
    AMax: 3,
    BMax: 4,
    halfChance: { front: 0.50, back: 0.50 }
  },

  hat: {
    stepChance: { mostly: 0.82, sometimes: 0.48, rarely: 0.16 },
    densityRanges: [
      { label: "Sparse", min: 4, max: 6, chance: 0.33 },
      { label: "Medium", min: 5, max: 10, chance: 0.34 },
      { label: "Heavy", min: 8, max: 16, chance: 0.33 }
    ]
  }
};

function weightedChoice(entries) {
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);
  let roll = Math.random() * total;

  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }

  return entries[entries.length - 1][0];
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function rollDensity(config) {
  const ranges = config.densityRanges;
  const roll = Math.random();

  let cursor = 0;
  for (const entry of ranges) {
    cursor += entry.chance;
    if (roll <= cursor) {
      return {
        label: entry.label,
        max: randInt(entry.min, entry.max)
      };
    }
  }

  const fallback = ranges[ranges.length - 1];
  return {
    label: fallback.label,
    max: randInt(fallback.min, fallback.max)
  };
}

function rollShapeOrder(config) {
  const remaining = ["front", "middle", "back"];
  const order = [];

  while (remaining.length > 1) {
    const sorted = remaining
      .slice()
      .sort((a,b) => config.shapeChance[b] - config.shapeChance[a]);

    let winner = null;

    while (!winner) {
      for (const shape of sorted) {
        if (Math.random() < config.shapeChance[shape]) {
          winner = shape;
          break;
        }
      }
    }

    order.push(winner);
    remaining.splice(remaining.indexOf(winner), 1);
  }

  order.push(remaining[0]);
  return order;
}

function stepShapePriority(step, config, shapeOrder) {
  let best = 99;

  for (let priority = 0; priority < shapeOrder.length; priority++) {
    const shape = shapeOrder[priority];
    if (config.shapeRegions[shape].includes(step)) {
      best = Math.min(best, priority + 1);
    }
  }

  return best === 99 ? 3 : best;
}

function priorityName(priority) {
  if (priority === LEVEL.ANCHOR) return "always";
  if (priority === LEVEL.MOSTLY) return "mostly";
  if (priority === LEVEL.SOMETIMES) return "sometimes";
  if (priority === LEVEL.RARELY) return "rarely";
  return "forbidden";
}

function effectiveStepChance(priority, shapePriority, config) {
  if (priority === LEVEL.ANCHOR) return 1;
  if (priority === LEVEL.FORBIDDEN) return 0;

  const base = config.stepChance[priorityName(priority)] ?? 0;
  const penalty = (shapePriority - 1) * 0.10;
  return Math.max(0, base - penalty);
}


const LAST_GENERATED = { kick: null, snare: null, hat: null };

function applyKickForbiddenMap(table, barIndex) {
  const effective = table.slice();
  const snare = LAST_GENERATED.snare?.bars?.[barIndex];

  // Hampton overlap rule:
  // when generating Kick, every active Snare step becomes Forbidden first.
  if (!snare) return effective;

  for (let step = 0; step < 16; step++) {
    if (snare[step]) effective[step] = LEVEL.FORBIDDEN;
  }

  return effective;
}

function kickSpacingAllows(hits, step) {
  const on = i => i >= 0 && i < 16 && hits[i];

  // Never create a 3-hit run inside the bar.
  if (on(step - 2) && on(step - 1)) return false;
  if (on(step - 1) && on(step + 1)) return false;
  if (on(step + 1) && on(step + 2)) return false;

  // If K . K already exists, the middle gap stays empty.
  if (on(step - 1) && on(step + 1)) return false;

  return true;
}

function buildPhrase(type, tableName, barIndex = 0, previousBar = null) {
  const config = PROFILE[type];
  const density = rollDensity(config);
  const shapeOrder = rollShapeOrder(config);
  const sourceTable = TABLES[type][tableName];
  const table = type === "kick"
    ? applyKickForbiddenMap(sourceTable, barIndex)
    : sourceTable.slice();

  const hits = Array(16).fill(false);

  const candidates = table.map((priority, step) => ({
    step,
    priority,
    shapePriority: stepShapePriority(step, config, shapeOrder),
    randomOrder: Math.random()
  }));

  // A = step priority, B = shape priority, C = random tie-break.
  candidates.sort((a,b) =>
    b.priority - a.priority ||
    a.shapePriority - b.shapePriority ||
    a.randomOrder - b.randomOrder
  );

  let count = 0;

  for (const candidate of candidates) {
    if (candidate.priority === LEVEL.FORBIDDEN) continue;
    if (count >= density.max) break;

    if (type === "kick") {
      if (!kickSpacingAllows(hits, candidate.step)) continue;

      // Normal phrase boundaries obey the same no-3-hit-run rule.
      // This does NOT wrap the last loop bar back to Bar 1; that exception
      // belongs to later turnaround/mutation logic.
      if (previousBar && candidate.step <= 1) {
        const p14 = !!previousBar[14];
        const p15 = !!previousBar[15];

        // ... K K | K ... would make three consecutive primary kicks.
        if (candidate.step === 0 && p14 && p15) continue;

        // ... . K | K K ... would also make three across the boundary
        // once step 0 is already active in this bar.
        if (candidate.step === 1 && p15 && hits[0]) continue;
      }
    }

    const chance = effectiveStepChance(
      candidate.priority,
      candidate.shapePriority,
      config
    );

    const passed =
      candidate.priority === LEVEL.ANCHOR ||
      Math.random() < chance;

    if (passed) {
      hits[candidate.step] = true;
      count++;
    }
  }

  return {
    hits,
    densityName: density.label.toLowerCase(),
    densityMax: density.max,
    shapeOrder
  };
}

function mutate(source, amount, type, turnaround = false, memorySource = null) {
  const result = source.slice();
  const changeCount = Math.max(1, Math.round(16 * amount * (0.45 + Math.random() * 0.35)));

  for (let change = 0; change < changeCount; change++) {
    const active = [];
    const inactive = [];

    result.forEach((value, step) => {
      if (value) active.push(step);
      else inactive.push(step);
    });

    const removable = active.filter(step => !(type === "kick" && step === 0));
    const preferDrop = Math.random() < 0.55;

    if (preferDrop && removable.length) {
      let pool = removable.slice();

      if (memorySource) {
        const shared = pool.filter(step => memorySource[step]);

        if (shared.length && Math.random() < 0.28) {
          result[shared[Math.floor(Math.random() * shared.length)]] = false;
          continue;
        }

        const lessIdentified = pool.filter(step => !memorySource[step]);
        if (lessIdentified.length) pool = lessIdentified;
      }

      result[pool[Math.floor(Math.random() * pool.length)]] = false;
      continue;
    }

    if (inactive.length) {
      let pool = inactive.slice();

      if (turnaround) {
        const late = pool.filter(step => step >= 12);
        if (late.length && Math.random() < 0.70) pool = late;
      }

      result[pool[Math.floor(Math.random() * pool.length)]] = true;
    }
  }

  return result;
}

function restoreDropped(current, original, prior) {
  const result = current.slice();
  const returnCandidates = [];

  for (let step = 0; step < 16; step++) {
    if (original[step] && prior[step] && !current[step]) {
      returnCandidates.push(step);
    }
  }

  if (returnCandidates.length && Math.random() < 0.80) {
    const step = returnCandidates[Math.floor(Math.random() * returnCandidates.length)];
    result[step] = true;
  }

  return result;
}

function chooseTopology() {
  return weightedChoice([
    ["A-B-A′-B′", 0.62],
    ["A-A′-A″-A‴", 0.28],
    ["A-A′-B-B′", 0.10]
  ]);
}

function densityLabelFromCount(type, count) {
  const profile = PROFILE[type];

  // Kick now uses densityRanges rather than the older densityCeilings array.
  const entries = (profile.densityRanges || profile.densityCeilings || [])
    .slice()
    .sort((a,b) => a.max - b.max);

  if (!entries.length) return "Base";

  for (const entry of entries) {
    if (count <= entry.max) return entry.label;
  }

  return entries[entries.length - 1].label;
}

function barMeta(role, type, hits, baseMeta, turnaround = false) {
  return {
    role,
    densityName: densityLabelFromCount(type, hits.filter(Boolean).length).toLowerCase(),
    densityMax: baseMeta.densityMax,
    actualHits: hits.filter(Boolean).length,
    shapeOrder: baseMeta.shapeOrder.slice(),
    turnaround
  };
}


function cloneHits(hits) {
  return hits.slice();
}

function countHits(hits, start = 0, end = 16) {
  let count = 0;
  for (let i = start; i < end; i++) if (hits[i]) count++;
  return count;
}

function derivedMatchedTable(parentHits, originalTable, start = 0, end = 16) {
  const table = Array(16).fill(LEVEL.FORBIDDEN);

  for (let step = start; step < end; step++) {
    if (parentHits[step]) {
      table[step] = LEVEL.MOSTLY;
      continue;
    }

    const original = originalTable[step];

    if (original === LEVEL.MOSTLY) table[step] = LEVEL.SOMETIMES;
    else if (original === LEVEL.SOMETIMES) table[step] = LEVEL.SOMETIMES;
    else if (original === LEVEL.RARELY) table[step] = LEVEL.RARELY;
    else if (original === LEVEL.ANCHOR) table[step] = LEVEL.SOMETIMES;
    else table[step] = LEVEL.FORBIDDEN;
  }

  return table;
}

function buildMatchedFromTable(type, table, maxHits, start = 0, end = 16) {
  const config = PROFILE[type];
  const hits = Array(16).fill(false);

  const candidates = [];
  for (let step = start; step < end; step++) {
    const priority = table[step];
    if (priority === LEVEL.FORBIDDEN) continue;

    candidates.push({
      step,
      priority,
      randomOrder: Math.random()
    });
  }

  candidates.sort((a,b) =>
    b.priority - a.priority ||
    a.randomOrder - b.randomOrder
  );

  let count = 0;

  for (const candidate of candidates) {
    if (count >= maxHits) break;

    let chance = 0;
    if (candidate.priority === LEVEL.MOSTLY) chance = config.stepChance.mostly;
    else if (candidate.priority === LEVEL.SOMETIMES) chance = config.stepChance.sometimes;
    else if (candidate.priority === LEVEL.RARELY) chance = config.stepChance.rarely;
    else if (candidate.priority === LEVEL.ANCHOR) chance = 1;

    if (Math.random() < chance) {
      hits[candidate.step] = true;
      count++;
    }
  }

  return hits;
}

function mutationMatched(type, parentHits, originalTable) {
  const table = derivedMatchedTable(parentHits, originalTable);
  return buildMatchedFromTable(type, table, countHits(parentHits));
}

function mutationBackHalfFront(type, parentHits, originalTable) {
  const result = Array(16).fill(false);

  for (let i = 0; i < 8; i++) {
    result[i] = parentHits[i + 8];
  }

  const table = derivedMatchedTable(parentHits, originalTable, 8, 16);
  const rerolled = buildMatchedFromTable(
    type,
    table,
    countHits(parentHits, 8, 16),
    8,
    16
  );

  for (let i = 8; i < 16; i++) result[i] = rerolled[i];
  return result;
}

function mutationFrontHalfBack(type, parentHits, originalTable) {
  const result = Array(16).fill(false);

  for (let i = 0; i < 8; i++) {
    result[i + 8] = parentHits[i];
  }

  const table = derivedMatchedTable(parentHits, originalTable, 0, 8);
  const rerolled = buildMatchedFromTable(
    type,
    table,
    countHits(parentHits, 0, 8),
    0,
    8
  );

  for (let i = 0; i < 8; i++) result[i] = rerolled[i];
  return result;
}

function quarterRange(index) {
  return [index * 4, index * 4 + 4];
}

function quarterCounts(hits) {
  return [0,1,2,3].map(q => {
    const [start,end] = quarterRange(q);
    return countHits(hits, start, end);
  });
}

function chooseAddCandidate(type, hits, originalTable, allowedSteps, baseMeta = null) {
  const config = PROFILE[type];
  const candidates = [];

  for (const step of allowedSteps) {
    if (hits[step]) continue;

    const priority = originalTable[step];
    if (priority === LEVEL.FORBIDDEN) continue;

    let shapePriority = 1;
    if (baseMeta?.shapeOrder) {
      shapePriority = stepShapePriority(step, config, baseMeta.shapeOrder);
    }

    candidates.push({
      step,
      priority,
      chance: effectiveStepChance(priority, shapePriority, config),
      randomOrder: Math.random()
    });
  }

  candidates.sort((a,b) =>
    b.priority - a.priority ||
    a.randomOrder - b.randomOrder
  );

  for (const candidate of candidates) {
    if (type === "kick" && !kickSpacingAllows(hits, candidate.step)) continue;
    if (Math.random() < candidate.chance) return candidate.step;
  }

  return null;
}

function chooseRemoveCandidate(type, hits, originalTable, allowedSteps, baseMeta = null, preferLeastShape = false) {
  const candidates = [];

  for (const step of allowedSteps) {
    if (!hits[step]) continue;

    let shapePriority = 1;
    if (baseMeta?.shapeOrder) {
      shapePriority = stepShapePriority(step, PROFILE[type], baseMeta.shapeOrder);
    }

    candidates.push({
      step,
      originalPriority: originalTable[step],
      shapePriority,
      randomOrder: Math.random()
    });
  }

  if (!candidates.length) return null;

  candidates.sort((a,b) => {
    if (preferLeastShape && a.shapePriority !== b.shapePriority) {
      return b.shapePriority - a.shapePriority;
    }
    return a.originalPriority - b.originalPriority || a.randomOrder - b.randomOrder;
  });

  return candidates[0].step;
}

function mutationDensityPlusMinus(type, parentHits, originalTable, baseMeta) {
  const result = cloneHits(parentHits);
  const total = countHits(result);

  if (total <= 2) {
    const step = chooseAddCandidate(
      type,
      result,
      originalTable,
      [...Array(16).keys()],
      baseMeta
    );

    if (step === null) return { hits: result, applied: false, detail: "not eligible" };

    result[step] = true;
    return { hits: result, applied: true, detail: "+1" };
  }

  if (total >= 5) {
    const step = chooseRemoveCandidate(
      type,
      result,
      originalTable,
      [...Array(16).keys()],
      baseMeta,
      true
    );

    if (step === null) return { hits: result, applied: false, detail: "not eligible" };

    result[step] = false;
    return { hits: result, applied: true, detail: "-1" };
  }

  return { hits: result, applied: false, detail: "not eligible" };
}

function mutationSwap(parentHits) {
  const counts = quarterCounts(parentHits);
  const blank = counts.map((c,i)=>c===0?i:null).filter(v=>v!==null);
  const nonblank = counts.map((c,i)=>c>0?i:null).filter(v=>v!==null);

  if (!blank.length || !nonblank.length) {
    return { hits: cloneHits(parentHits), applied: false, detail: "not eligible" };
  }

  const qBlank = blank[Math.floor(Math.random()*blank.length)];
  const qFilled = nonblank[Math.floor(Math.random()*nonblank.length)];
  const result = cloneHits(parentHits);

  const [b0,b1] = quarterRange(qBlank);
  const [f0,f1] = quarterRange(qFilled);

  const blankSlice = result.slice(b0,b1);
  const filledSlice = result.slice(f0,f1);

  for (let i=0;i<4;i++) {
    result[b0+i] = filledSlice[i];
    result[f0+i] = blankSlice[i];
  }

  return {
    hits: result,
    applied: true,
    detail: `Q${qFilled+1} ↔ Q${qBlank+1}`
  };
}

function mutationShapeCorrection(type, parentHits, originalTable, baseMeta, direction = "balance") {
  const result = cloneHits(parentHits);
  const counts = quarterCounts(result);

  let fromQ;
  let toQ;

  if (direction === "front") {
    const frontQs = [0,1];
    const backQs = [2,3];
    fromQ = backQs.slice().sort((a,b)=>counts[b]-counts[a])[0];
    toQ = frontQs.slice().sort((a,b)=>counts[a]-counts[b])[0];
  } else if (direction === "back") {
    const frontQs = [0,1];
    const backQs = [2,3];
    fromQ = frontQs.slice().sort((a,b)=>counts[b]-counts[a])[0];
    toQ = backQs.slice().sort((a,b)=>counts[a]-counts[b])[0];
  } else {
    fromQ = [0,1,2,3].slice().sort((a,b)=>counts[b]-counts[a])[0];
    toQ = [0,1,2,3].slice().sort((a,b)=>counts[a]-counts[b])[0];
  }

  if (fromQ === toQ || counts[fromQ] === 0) {
    return { hits: result, applied: false, detail: "not eligible" };
  }

  const [fromStart, fromEnd] = quarterRange(fromQ);
  const [toStart, toEnd] = quarterRange(toQ);

  const removeStep = chooseRemoveCandidate(
    type,
    result,
    originalTable,
    Array.from({length:fromEnd-fromStart},(_,i)=>fromStart+i),
    baseMeta,
    true
  );

  if (removeStep === null) {
    return { hits: result, applied: false, detail: "no removable note" };
  }

  result[removeStep] = false;

  const addStep = chooseAddCandidate(
    type,
    result,
    originalTable,
    Array.from({length:toEnd-toStart},(_,i)=>toStart+i),
    baseMeta
  );

  if (addStep === null) {
    result[removeStep] = true;
    return { hits: result, applied: false, detail: "no legal add" };
  }

  result[addStep] = true;

  return {
    hits: result,
    applied: true,
    detail: `${direction}: Q${fromQ+1} → Q${toQ+1}`
  };
}

function samePattern(a,b) {
  return a.every((v,i)=>v===b[i]);
}

function mutatePrimePhrase(type, parentHits, originalTable, baseMeta, role) {
  const options = [];

  if (role === "A′") {
    options.push(["Back Half Front", 0.30]);
    options.push(["Matched", 0.30]);
    options.push(["Density +/-1", 0.15]);
    options.push(["Swap", 0.10]);
    options.push(["Shape Correction", 0.15]);
  } else if (role === "A‴") {
    options.push(["Front Half Back", 0.30]);
    options.push(["Matched", 0.30]);
    options.push(["Density +/-1", 0.15]);
    options.push(["Swap", 0.10]);
    options.push(["Shape Correction", 0.15]);
  } else {
    options.push(["Matched", 0.40]);
    options.push(["Density +/-1", 0.20]);
    options.push(["Swap", 0.15]);
    options.push(["Shape Correction", 0.25]);
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const mutation = weightedChoice(options);
    let result = null;
    let detail = "";

    if (mutation === "Matched") {
      result = mutationMatched(type, parentHits, originalTable);
    }

    else if (mutation === "Back Half Front") {
      result = mutationBackHalfFront(type, parentHits, originalTable);
    }

    else if (mutation === "Front Half Back") {
      result = mutationFrontHalfBack(type, parentHits, originalTable);
    }

    else if (mutation === "Density +/-1") {
      const out = mutationDensityPlusMinus(type, parentHits, originalTable, baseMeta);
      if (!out.applied) continue;
      result = out.hits;
      detail = out.detail;

      if (Math.random() < 0.35) {
        const matched = mutationMatched(type, result, originalTable);
        if (!samePattern(matched, result)) {
          result = matched;
          detail += " + Matched";
        }
      }
    }

    else if (mutation === "Swap") {
      const out = mutationSwap(parentHits);
      if (!out.applied) continue;
      result = out.hits;
      detail = out.detail;
    }

    else if (mutation === "Shape Correction") {
      const direction = weightedChoice([
        ["balance", 0.40],
        ["front", 0.30],
        ["back", 0.30]
      ]);

      const out = mutationShapeCorrection(
        type,
        parentHits,
        originalTable,
        baseMeta,
        direction
      );

      if (!out.applied) continue;
      result = out.hits;
      detail = out.detail;
    }

    if (!result || samePattern(result, parentHits)) continue;

    return {
      hits: result,
      mutation: detail ? `${mutation} (${detail})` : mutation
    };
  }

  return {
    hits: cloneHits(parentHits),
    mutation: "No Change"
  };
}


function chooseLowestPriorityStep(steps, priorityTable) {
  if (!steps.length) return null;

  // Internal priority numbers are inverted relative to the user-facing map:
  // 4 Always, 3 Mostly, 2 Sometimes, 1 Rarely, 0 Forbidden.
  // Lowest musical priority therefore means the smallest internal number.
  let lowest = Infinity;

  for (const step of steps) {
    lowest = Math.min(lowest, priorityTable[step]);
  }

  const tied = steps.filter(step => priorityTable[step] === lowest);
  return tied[Math.floor(Math.random() * tied.length)];
}

function removeTripleRuns(hits, priorityTable) {
  const result = hits.slice();

  // Repeat until no run of 3+ remains. This also safely handles 4+ runs.
  let changed = true;

  while (changed) {
    changed = false;

    for (let start = 0; start <= 13; start++) {
      if (result[start] && result[start + 1] && result[start + 2]) {
        const removeStep = chooseLowestPriorityStep(
          [start, start + 1, start + 2],
          priorityTable
        );

        if (removeStep !== null) {
          result[removeStep] = false;
          changed = true;
          break;
        }
      }
    }
  }

  return result;
}

function validateKickPhrase(hits, priorityTable) {
  return removeTripleRuns(hits, priorityTable);
}

function validatePrimeDifference({
  type,
  role,
  parentHits,
  candidateHits,
  originalTable,
  baseMeta,
  earlierBars
}) {
  let candidate = candidateHits.slice();
  let mutationName = null;

  const matchesEarlier = hits =>
    earlierBars.some(existing => samePattern(existing, hits));

  // If it duplicates any earlier phrase, recreate the later prime.
  // We allow several attempts because mutation eligibility can be narrow.
  for (let attempt = 0; attempt < 12 && matchesEarlier(candidate); attempt++) {
    const rerolled = mutatePrimePhrase(
      type,
      parentHits,
      originalTable,
      baseMeta,
      role
    );

    candidate = rerolled.hits.slice();
    mutationName = rerolled.mutation;

    if (type === "kick") {
      candidate = validateKickPhrase(candidate, originalTable);
    }
  }

  return {
    hits: candidate,
    mutation: mutationName
  };
}

function validateBaseOrPrime(type, hits, priorityTable) {
  if (type !== "kick") return hits.slice();
  return validateKickPhrase(hits, priorityTable);
}


function rollSnareHalf() { return Math.random() < 0.5 ? "front" : "back"; }

function buildSnarePhrase(tableName, barIndex = 0) {
  const table = TABLES.snare[tableName].slice();
  const maxHits = tableName === "A" ? PROFILE.snare.AMax : PROFILE.snare.BMax;
  const preferredHalf = rollSnareHalf();
  const hits = Array(16).fill(false);
  const kickBar = LAST_GENERATED.kick?.bars?.[barIndex];

  // Hampton overlap rule:
  // when generating Snare, every active Kick step becomes Forbidden first.
  if (kickBar) {
    for (let i = 0; i < 16; i++) {
      if (kickBar[i]) table[i] = LEVEL.FORBIDDEN;
    }
  }
  const candidates = table.map((priority,step)=>({
    step, priority,
    halfPriority: preferredHalf === "front" ? (step<8?1:2) : (step>=8?1:2),
    randomOrder: Math.random()
  })).sort((a,b)=>b.priority-a.priority || a.halfPriority-b.halfPriority || a.randomOrder-b.randomOrder);
  let count=0;
  for (const c of candidates) {
    if (c.priority===LEVEL.FORBIDDEN || count>=maxHits) continue;
    let chance=0;
    if (c.priority===LEVEL.ANCHOR) chance=1;
    else if (c.priority===LEVEL.MOSTLY) chance=PROFILE.snare.stepChance.mostly;
    else if (c.priority===LEVEL.SOMETIMES) chance=PROFILE.snare.stepChance.sometimes;
    else if (c.priority===LEVEL.RARELY) chance=PROFILE.snare.stepChance.rarely;
    if (c.priority!==LEVEL.ANCHOR && c.halfPriority===2) chance=Math.max(0,chance-.10);
    if (Math.random()<chance) { hits[c.step]=true; count++; }
  }
  return {hits,densityMax:maxHits,actualHits:count,preferredHalf};
}

function mutateSnareHalf(parentHits, originalTable, preferredHalf) {
  const result=parentHits.slice();
  const start=preferredHalf==="front"?0:8, end=start+8;
  const table=derivedMatchedTable(parentHits, originalTable, start, end);
  const rerolled=buildMatchedFromTable("snare", table, countHits(parentHits,start,end), start, end);
  for (let i=start;i<end;i++) result[i]=rerolled[i];
  if (samePattern(result,parentHits)) {
    const empty=[], active=[];
    for (let i=start;i<end;i++) {
      if (result[i]) active.push(i);
      else if (originalTable[i]!==LEVEL.FORBIDDEN) empty.push(i);
    }
    if (empty.length) result[empty[Math.floor(Math.random()*empty.length)]]=true;
    else if (active.length>1) result[active[Math.floor(Math.random()*active.length)]]=false;
  }
  return result;
}

function rollHatDensity() {
  let r=Math.random(), c=0;
  for (const x of PROFILE.hat.densityRanges) {
    c+=x.chance;
    if (r<=c) return {label:x.label,target:randInt(x.min,x.max)};
  }
  const x=PROFILE.hat.densityRanges.at(-1); return {label:x.label,target:randInt(x.min,x.max)};
}
function uniqueQuarterDistributions(total) {
  const out=[];
  for(let a=0;a<=4;a++) for(let b=a;b<=4;b++) for(let c=b;c<=4;c++) for(let d=c;d<=4;d++) if(a+b+c+d===total) out.push([a,b,c,d]);
  return out;
}
function shuffle4(v){ const a=v.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
function buildHatPhrase(tableName) {
  const density=rollHatDensity();
  const combos=uniqueQuarterDistributions(density.target);
  const quarterTargets=shuffle4(combos[Math.floor(Math.random()*combos.length)]);
  const table=TABLES.hat[tableName], hits=Array(16).fill(false);
  for(let q=0;q<4;q++){
    const target=quarterTargets[q]; if(!target) continue;
    const start=q*4;
    const candidates=[];
    for(let step=start;step<start+4;step++) candidates.push({step,priority:table[step],randomOrder:Math.random()});
    candidates.sort((a,b)=>b.priority-a.priority || a.randomOrder-b.randomOrder);
    let placed=0;
    for(const c of candidates){
      if(placed>=target) break;
      let chance=c.priority===LEVEL.ANCHOR?1:c.priority===LEVEL.MOSTLY?PROFILE.hat.stepChance.mostly:c.priority===LEVEL.SOMETIMES?PROFILE.hat.stepChance.sometimes:c.priority===LEVEL.RARELY?PROFILE.hat.stepChance.rarely:0;
      if(Math.random()<chance){hits[c.step]=true;placed++;}
    }
  }
  return {hits,densityName:density.label.toLowerCase(),densityMax:density.target,actualHits:countHits(hits),quarterTargets};
}

function generateKickExisting(topology) {
  const type = "kick";
  const tableA = TABLES[type].A;
  const tableB = TABLES[type].B;

  const Araw = buildPhrase(type, "A", 0);
  const A = {
    ...Araw,
    hits: validateBaseOrPrime(type, Araw.hits, tableA)
  };

  let bars;
  let metas;

  if (topology === "A-B-A′-B′") {
    const Braw = buildPhrase(type, "B", 1, type === "kick" ? A.hits : null);
    const B = {
      ...Braw,
      hits: validateBaseOrPrime(type, Braw.hits, tableB)
    };

    let A1 = mutatePrimePhrase(type, A.hits, tableA, A, "A′");
    A1.hits = validateBaseOrPrime(type, A1.hits, tableA);

    const A1check = validatePrimeDifference({
      type,
      role: "A′",
      parentHits: A.hits,
      candidateHits: A1.hits,
      originalTable: tableA,
      baseMeta: A,
      earlierBars: [A.hits, B.hits]
    });

    if (A1check.mutation) A1.mutation = A1check.mutation;
    A1.hits = A1check.hits;

    let B1 = mutatePrimePhrase(type, B.hits, tableB, B, "B′");
    B1.hits = validateBaseOrPrime(type, B1.hits, tableB);

    const B1check = validatePrimeDifference({
      type,
      role: "B′",
      parentHits: B.hits,
      candidateHits: B1.hits,
      originalTable: tableB,
      baseMeta: B,
      earlierBars: [A.hits, B.hits, A1.hits]
    });

    if (B1check.mutation) B1.mutation = B1check.mutation;
    B1.hits = B1check.hits;

    bars = [A.hits, B.hits, A1.hits, B1.hits];

    metas = [
      { role:"A", densityName:A.densityName, densityMax:A.densityMax, actualHits:countHits(A.hits), shapeOrder:A.shapeOrder.slice(), mutation:"Base" },
      { role:"B", densityName:B.densityName, densityMax:B.densityMax, actualHits:countHits(B.hits), shapeOrder:B.shapeOrder.slice(), mutation:"Base" },
      { ...barMeta("A′", type, A1.hits, A), mutation:A1.mutation },
      { ...barMeta("B′", type, B1.hits, B, true), mutation:B1.mutation }
    ];
  }

  else if (topology === "A-A′-B-B′") {
    let A1 = mutatePrimePhrase(type, A.hits, tableA, A, "A′");
    A1.hits = validateBaseOrPrime(type, A1.hits, tableA);

    const A1check = validatePrimeDifference({
      type,
      role: "A′",
      parentHits: A.hits,
      candidateHits: A1.hits,
      originalTable: tableA,
      baseMeta: A,
      earlierBars: [A.hits]
    });

    if (A1check.mutation) A1.mutation = A1check.mutation;
    A1.hits = A1check.hits;

    const Braw = buildPhrase(type, "B", 2);
    const B = {
      ...Braw,
      hits: validateBaseOrPrime(type, Braw.hits, tableB)
    };

    let B1 = mutatePrimePhrase(type, B.hits, tableB, B, "B′");
    B1.hits = validateBaseOrPrime(type, B1.hits, tableB);

    const B1check = validatePrimeDifference({
      type,
      role: "B′",
      parentHits: B.hits,
      candidateHits: B1.hits,
      originalTable: tableB,
      baseMeta: B,
      earlierBars: [A.hits, A1.hits, B.hits]
    });

    if (B1check.mutation) B1.mutation = B1check.mutation;
    B1.hits = B1check.hits;

    bars = [A.hits, A1.hits, B.hits, B1.hits];

    metas = [
      { role:"A", densityName:A.densityName, densityMax:A.densityMax, actualHits:countHits(A.hits), shapeOrder:A.shapeOrder.slice(), mutation:"Base" },
      { ...barMeta("A′", type, A1.hits, A), mutation:A1.mutation },
      { role:"B", densityName:B.densityName, densityMax:B.densityMax, actualHits:countHits(B.hits), shapeOrder:B.shapeOrder.slice(), mutation:"Base" },
      { ...barMeta("B′", type, B1.hits, B, true), mutation:B1.mutation }
    ];
  }

  else {
    let A1 = mutatePrimePhrase(type, A.hits, tableA, A, "A′");
    A1.hits = validateBaseOrPrime(type, A1.hits, tableA);

    let checked = validatePrimeDifference({
      type,
      role: "A′",
      parentHits: A.hits,
      candidateHits: A1.hits,
      originalTable: tableA,
      baseMeta: A,
      earlierBars: [A.hits]
    });

    if (checked.mutation) A1.mutation = checked.mutation;
    A1.hits = checked.hits;

    let A2 = mutatePrimePhrase(type, A1.hits, tableA, A, "A″");
    A2.hits = validateBaseOrPrime(type, A2.hits, tableA);

    checked = validatePrimeDifference({
      type,
      role: "A″",
      parentHits: A1.hits,
      candidateHits: A2.hits,
      originalTable: tableA,
      baseMeta: A,
      earlierBars: [A.hits, A1.hits]
    });

    if (checked.mutation) A2.mutation = checked.mutation;
    A2.hits = checked.hits;

    let A3 = mutatePrimePhrase(type, A2.hits, tableA, A, "A‴");
    A3.hits = validateBaseOrPrime(type, A3.hits, tableA);

    checked = validatePrimeDifference({
      type,
      role: "A‴",
      parentHits: A2.hits,
      candidateHits: A3.hits,
      originalTable: tableA,
      baseMeta: A,
      earlierBars: [A.hits, A1.hits, A2.hits]
    });

    if (checked.mutation) A3.mutation = checked.mutation;
    A3.hits = checked.hits;

    bars = [A.hits, A1.hits, A2.hits, A3.hits];

    metas = [
      { role:"A", densityName:A.densityName, densityMax:A.densityMax, actualHits:countHits(A.hits), shapeOrder:A.shapeOrder.slice(), mutation:"Base" },
      { ...barMeta("A′", type, A1.hits, A), mutation:A1.mutation },
      { ...barMeta("A″", type, A2.hits, A), mutation:A2.mutation },
      { ...barMeta("A‴", type, A3.hits, A, true), mutation:A3.mutation }
    ];
  }

  return { topology, bars, metas };
}

function generate(type) {
  const topology=chooseTopology();
  if(type==="kick") return generateKickExisting(topology);

  if(type==="snare"){
    const A=buildSnarePhrase("A",0), B=buildSnarePhrase("B",1);
    const meta=(role,obj,hits,mutation)=>({role,densityMax:obj.densityMax,actualHits:countHits(hits),half:obj.preferredHalf,mutation});
    if(topology==="A-B-A′-B′"){
      const A1=mutateSnareHalf(A.hits,TABLES.snare.A,A.preferredHalf), B1=mutateSnareHalf(B.hits,TABLES.snare.B,B.preferredHalf);
      return {topology,bars:[A.hits,B.hits,A1,B1],metas:[meta("A",A,A.hits,"Base"),meta("B",B,B.hits,"Base"),meta("A′",A,A1,`Matched ${A.preferredHalf} half`),meta("B′",B,B1,`Matched ${B.preferredHalf} half`)]};
    }
    if(topology==="A-A′-B-B′"){
      const A1=mutateSnareHalf(A.hits,TABLES.snare.A,A.preferredHalf), B1=mutateSnareHalf(B.hits,TABLES.snare.B,B.preferredHalf);
      return {topology,bars:[A.hits,A1,B.hits,B1],metas:[meta("A",A,A.hits,"Base"),meta("A′",A,A1,`Matched ${A.preferredHalf} half`),meta("B",B,B.hits,"Base"),meta("B′",B,B1,`Matched ${B.preferredHalf} half`)]};
    }
    const A1=mutateSnareHalf(A.hits,TABLES.snare.A,A.preferredHalf), A2=mutateSnareHalf(A1,TABLES.snare.A,A.preferredHalf), A3=mutateSnareHalf(A2,TABLES.snare.A,A.preferredHalf);
    return {topology,bars:[A.hits,A1,A2,A3],metas:[meta("A",A,A.hits,"Base"),meta("A′",A,A1,`Matched ${A.preferredHalf} half`),meta("A″",A,A2,`Matched ${A.preferredHalf} half`),meta("A‴",A,A3,`Matched ${A.preferredHalf} half`)]};
  }

  const A=buildHatPhrase("A"), B=buildHatPhrase("B");
  const hm=(role,x,mutation)=>({role,densityName:x.densityName,densityMax:x.densityMax,actualHits:x.actualHits,quarterTargets:x.quarterTargets,mutation});
  if(topology==="A-B-A′-B′"){
    const A1=buildHatPhrase("A"), B1=buildHatPhrase("B");
    return {topology,bars:[A.hits,B.hits,A1.hits,B1.hits],metas:[hm("A",A,"Base"),hm("B",B,"Base"),hm("A′",A1,"Distribution reroll"),hm("B′",B1,"Distribution reroll")]};
  }
  if(topology==="A-A′-B-B′"){
    const A1=buildHatPhrase("A"), B1=buildHatPhrase("B");
    return {topology,bars:[A.hits,A1.hits,B.hits,B1.hits],metas:[hm("A",A,"Base"),hm("A′",A1,"Distribution reroll"),hm("B",B,"Base"),hm("B′",B1,"Distribution reroll")]};
  }
  const A1=buildHatPhrase("A"),A2=buildHatPhrase("A"),A3=buildHatPhrase("A");
  return {topology,bars:[A.hits,A1.hits,A2.hits,A3.hits],metas:[hm("A",A,"Base"),hm("A′",A1,"Distribution reroll"),hm("A″",A2,"Distribution reroll"),hm("A‴",A3,"Distribution reroll")]};
}

  function setExistingBars(type, bars) {
    if (!["kick", "snare", "hat"].includes(type)) return;
    LAST_GENERATED[type] = bars
      ? { topology: "existing", bars: bars.map(bar => bar.slice()), metas: [] }
      : null;
  }

  function resetExisting() {
    LAST_GENERATED.kick = null;
    LAST_GENERATED.snare = null;
    LAST_GENERATED.hat = null;
  }

  return Object.freeze({
    generate,
    setExistingBars,
    resetExisting,
  });
})();

const styles = ["rand", "hampton", "lofi", "boom", "dilla", "romil", "dre"];
const styleLabels = {
  rand: "rand",
  hampton: "hampton",
  lofi: "lofi",
  boom: "boom bap",
  dilla: "dilla",
  romil: "romil",
  dre: "dre",
};

const ROWS = 16;
const MAX_COLS = 8;
const STORAGE_KEY = "drumPhace.build5.state";
const GRID_LABEL_MODE_KEY = "interPhace.gridLabelMode.v1";
const MAX_SAMPLE_BYTES = 2 * 1024 * 1024;
const MAX_SAMPLE_SECONDS = 2.0;
const MIDI_PPQ = 480;
const MIDI_STEP_TICKS = MIDI_PPQ / 4;
const MIDI_NOTES = { kick: 36, snare: 38, hat: 42 };
const MIDI_GHOST_VELOCITY = { kick: 48, snare: 52, hat: 56 };
const MIDI_FULL_VELOCITY = { kick: 112, snare: 108, hat: 100 };
const uploadedSamples = { kick: null, snare: null, hat: null };

let currentPage = "kick";
let currentView = "pattern";
const chancePages = ["chance", "volume", "repeats"];
const chancePageIndex = { kick: 0, snare: 0, hat: 0 };
let labelMode = (() => {
  try {
    return localStorage.getItem(GRID_LABEL_MODE_KEY) === "hex" ? "hex" : "res";
  } catch (_) {
    return "res";
  }
})();
let visibleCols = getDisplayColumns();
let chanceChooserTarget = null;
let chanceChooserAnchor = null;
let volumeChooserTarget = null;
let volumeChooserAnchor = null;
let repeatsChooserTarget = null;
let repeatsChooserAnchor = null;

const GLOBAL_PROJECT_STORAGE_KEY = "interPhace.interPhace.ui.v2";
const currentStyle = { kick: "rand", snare: "rand", hat: "rand" };

function drumBordersEnabled() {
  try {
    const saved = JSON.parse(localStorage.getItem(GLOBAL_PROJECT_STORAGE_KEY) || "null") || {};
    return !!saved?.child?.drumBorders;
  } catch (_) {
    return false;
  }
}
const styleIndex = { kick: 0, snare: 0, hat: 0 };

// Keep eight columns of state in memory even on phone. The UI simply reveals
// four or eight columns depending on available width.
const patternState = {
  kick: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill("off")),
  snare: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill("off")),
  hat: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill("off")),
};

const variationState = {
  kick: {
    chance: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill(null)),
    volume: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill(null)),
    repeats: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill(null)),
  },
  snare: {
    chance: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill(null)),
    volume: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill(null)),
    repeats: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill(null)),
  },
  hat: {
    chance: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill(null)),
    volume: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill(null)),
    repeats: Array.from({ length: ROWS }, () => Array(MAX_COLS).fill(null)),
  },
};

const DRUM_REPEAT_PRESETS = Object.freeze({
  "2": Object.freeze({
    label: "2",
    name: "Double",
    events: Object.freeze([
      Object.freeze({ offset: 0.00, gain: 1.00 }),
      Object.freeze({ offset: 0.50, gain: 0.72 }),
    ]),
  }),
  "3": Object.freeze({
    label: "3",
    name: "Triple",
    events: Object.freeze([
      Object.freeze({ offset: 0.00, gain: 1.00 }),
      Object.freeze({ offset: 0.33, gain: 0.78 }),
      Object.freeze({ offset: 0.66, gain: 0.62 }),
    ]),
  }),
  "4": Object.freeze({
    label: "4",
    name: "Four-hit roll",
    events: Object.freeze([
      Object.freeze({ offset: 0.00, gain: 1.00 }),
      Object.freeze({ offset: 0.25, gain: 0.82 }),
      Object.freeze({ offset: 0.50, gain: 0.68 }),
      Object.freeze({ offset: 0.75, gain: 0.56 }),
    ]),
  }),
  "FL": Object.freeze({
    label: "FL",
    name: "Flam",
    events: Object.freeze([
      Object.freeze({ offset: 0.00, gain: 0.52 }),
      Object.freeze({ offset: 0.16, gain: 1.00 }),
    ]),
  }),
  "DR": Object.freeze({
    label: "DR",
    name: "Drag",
    events: Object.freeze([
      Object.freeze({ offset: 0.00, gain: 0.38 }),
      Object.freeze({ offset: 0.18, gain: 0.56 }),
      Object.freeze({ offset: 0.38, gain: 1.00 }),
    ]),
  }),
  "ST": Object.freeze({
    label: "ST",
    name: "Stutter",
    events: Object.freeze([
      Object.freeze({ offset: 0.00, gain: 1.00 }),
      Object.freeze({ offset: 0.20, gain: 0.82 }),
      Object.freeze({ offset: 0.40, gain: 0.66 }),
      Object.freeze({ offset: 0.60, gain: 0.52 }),
      Object.freeze({ offset: 0.80, gain: 0.40 }),
    ]),
  }),
  "UP": Object.freeze({
    label: "↑",
    name: "Rise",
    events: Object.freeze([
      Object.freeze({ offset: 0.00, gain: 0.42 }),
      Object.freeze({ offset: 0.33, gain: 0.68 }),
      Object.freeze({ offset: 0.66, gain: 1.00 }),
    ]),
  }),
  "DN": Object.freeze({
    label: "↓",
    name: "Fade",
    events: Object.freeze([
      Object.freeze({ offset: 0.00, gain: 1.00 }),
      Object.freeze({ offset: 0.33, gain: 0.68 }),
      Object.freeze({ offset: 0.66, gain: 0.42 }),
    ]),
  }),
  "GD": Object.freeze({
    label: "GD",
    name: "Ghost drag",
    events: Object.freeze([
      Object.freeze({ offset: 0.00, gain: 0.32 }),
      Object.freeze({ offset: 0.22, gain: 0.46 }),
      Object.freeze({ offset: 0.46, gain: 1.00 }),
    ]),
  }),
  "LD": Object.freeze({
    label: "LD",
    name: "Late double",
    events: Object.freeze([
      Object.freeze({ offset: 0.00, gain: 1.00 }),
      Object.freeze({ offset: 0.72, gain: 0.64 }),
    ]),
  }),
  "AC": Object.freeze({
    label: "AC",
    name: "Accidental double",
    events: Object.freeze([
      Object.freeze({ offset: 0.00, gain: 1.00 }),
      Object.freeze({ offset: 0.12, gain: 0.48 }),
    ]),
  }),
});

function isValidStepState(value) {
  return value === "off" || value === "on" || value === "ghost";
}

function clampTempo(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 75;
  return Math.min(300, Math.max(30, Math.round(numeric)));
}

function readGlobalProjectTempo() {
  try {
    const saved = JSON.parse(localStorage.getItem(GLOBAL_PROJECT_STORAGE_KEY) || "null") || {};
    return clampTempo(saved?.project?.tempo);
  } catch (_) {
    return 75;
  }
}

function readGlobalProjectSwing() {
  try {
    const saved = JSON.parse(localStorage.getItem(GLOBAL_PROJECT_STORAGE_KEY) || "null") || {};
    const value = Number(saved?.project?.swing);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  } catch (_) {
    return 0;
  }
}

function loadLocalState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return;

    if (instruments.includes(saved.currentPage)) currentPage = saved.currentPage;
    if (["pattern", "synth", "chance"].includes(saved.currentView)) currentView = saved.currentView;

    if (saved.variationPages && typeof saved.variationPages === "object") {
      for (const type of instruments) {
        const index = Number(saved.variationPages[type]);
        if (Number.isInteger(index) && index >= 0 && index < chancePages.length) {
          chancePageIndex[type] = index;
        }
      }
    }

    for (const type of instruments) {
      if (styles.includes(saved.styles?.[type])) {
        currentStyle[type] = saved.styles[type];
        styleIndex[type] = styles.indexOf(saved.styles[type]);
      }

      const savedSynth = saved.synths?.[type];
      if (Array.isArray(savedSynth)) {
        if (type === "kick" && savedSynth.length >= 8) {
          drumSynthUiState.kick = drumSynthConfigs.kick.map((config, index) => {
            const numeric = Number(savedSynth[index]);
            if (index === 7) {
              return Math.max(0, Math.min(KICK_PRESETS.length - 1, Number.isFinite(numeric) ? Math.round(numeric) : 0));
            }
            return Math.max(config.min, Math.min(config.max, Number.isFinite(numeric) ? numeric : KICK_INIT[index]));
          });
        } else if (type === "hat") {
          if (savedSynth.length >= 8 && Number(savedSynth[0]) >= 0 && Number(savedSynth[0]) <= 100) {
            drumSynthUiState.hat = drumSynthConfigs.hat.map((config, index) => {
              const numeric = Number(savedSynth[index]);
              if (index === 7) {
                return Math.max(0, Math.min(HAT_PRESETS.length - 1, Number.isFinite(numeric) ? Math.round(numeric) : 0));
              }
              return Math.max(config.min, Math.min(config.max, Number.isFinite(numeric) ? numeric : HAT_INIT[index]));
            });
          } else {
            drumSynthUiState.hat = [...HAT_INIT];
          }
        } else if (type === "snare") {
          if (savedSynth.length >= 8) {
            drumSynthUiState.snare = drumSynthConfigs.snare.map((config, index) => {
              const numeric = Number(savedSynth[index]);
              if (index === 7) {
                return Math.max(0, Math.min(SNARE_PRESETS.length - 1, Number.isFinite(numeric) ? Math.round(numeric) : 0));
              }
              return Math.max(config.min, Math.min(config.max, Number.isFinite(numeric) ? numeric : SNARE_INIT[index]));
            });
          } else {
            drumSynthUiState.snare = [...SNARE_INIT];
          }
        }
      }

      const savedGrid = saved.patterns?.[type];
      if (!Array.isArray(savedGrid)) continue;
      for (let row = 0; row < ROWS; row++) {
        if (!Array.isArray(savedGrid[row])) continue;
        for (let col = 0; col < MAX_COLS; col++) {
          const state = savedGrid[row][col];
          if (isValidStepState(state)) patternState[type][row][col] = state;
        }
      }
    }

    for (const type of instruments) {
      for (const page of chancePages) {
        const savedGrid = saved.variations?.[type]?.[page];
        if (!Array.isArray(savedGrid)) continue;
        for (let row = 0; row < ROWS; row++) {
          if (!Array.isArray(savedGrid[row])) continue;
          for (let col = 0; col < MAX_COLS; col++) {
            variationState[type][page][row][col] = savedGrid[row][col] ?? null;
          }
        }
      }

      // A blank drum step owns no backend variation state.
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < MAX_COLS; col++) {
          if (patternState[type][row][col] !== "off") continue;
          variationState[type].chance[row][col] = null;
          variationState[type].volume[row][col] = null;
          variationState[type].repeats[row][col] = null;
        }
      }
    }
  } catch (error) {
    console.warn("Could not restore drumPhace state", error);
  }
}

function saveLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      currentPage,
      currentView,
      labelMode,
      styles: { ...currentStyle },
      synths: {
        kick: [...drumSynthUiState.kick],
        snare: [...drumSynthUiState.snare],
        hat: [...drumSynthUiState.hat],
      },
      patterns: patternState,
      variationPages: { ...chancePageIndex },
      variations: variationState,
    }));
  } catch (error) {
    console.warn("Could not save drumPhace state", error);
  }
}

function updateTempoUI() {
  // Tempo is owned exclusively by interPhace.
}

function getDisplayColumns() {
  return window.matchMedia("(min-width: 760px)").matches ? 8 : 4;
}

function updateStyleButton() {
  styleBtn.textContent = styleLabels[currentStyle[currentPage]];
  styleBtn.setAttribute("aria-label", `${currentPage} style: ${styleLabels[currentStyle[currentPage]]}`);
}

function updateLabels() {
  document.querySelectorAll(".labelCell").forEach(label => {
    const row = Number(label.dataset.row);
    label.textContent = labelMode === "res" ? String(row + 1) : row.toString(16).toUpperCase();
  });
}

function setGridCellVisual(button, state, context) {
  button.dataset.state = state;
  button.classList.remove("kickOn", "kickGhost", "snareOn", "snareGhost", "hatOn", "hatGhost");
  if (state === "on") button.classList.add(`${context}On`);
  if (state === "ghost") button.classList.add(`${context}Ghost`);
}


let drumColumnCopyState = null;

function columnLetter(col) {
  return String.fromCharCode(65 + Math.max(0, Math.min(7, Number(col) || 0)));
}

function startDrumColumnCopy(type, sourceCol) {
  if (currentView !== "pattern" || type !== currentPage) return;

  const col = Number(sourceCol);
  if (!Number.isInteger(col) || col < 0 || col >= visibleCols) return;

  drumColumnCopyState = {
    type,
    sourceCol: col,
    pattern: Array.from({ length: ROWS }, (_, row) => patternState[type][row][col]),
    chance: Array.from({ length: ROWS }, (_, row) => variationState[type].chance[row][col]),
    volume: Array.from({ length: ROWS }, (_, row) => variationState[type].volume[row][col]),
    repeats: Array.from({ length: ROWS }, (_, row) => variationState[type].repeats[row][col]),
  };

  renderActiveDrumGrid();
  updateOverlaps();
}

function cancelDrumColumnCopy({ rerender = true } = {}) {
  if (!drumColumnCopyState) return;
  drumColumnCopyState = null;

  if (rerender && currentView === "pattern") {
    renderActiveDrumGrid();
    updateOverlaps();
  }
}

function pasteDrumColumn(targetCol) {
  const copy = drumColumnCopyState;
  if (!copy || currentView !== "pattern" || copy.type !== currentPage) {
    cancelDrumColumnCopy();
    return;
  }

  const col = Number(targetCol);
  if (!Number.isInteger(col) || col < 0 || col >= visibleCols || col === copy.sourceCol) {
    cancelDrumColumnCopy();
    return;
  }


  for (let row = 0; row < ROWS; row++) {
    patternState[copy.type][row][col] = copy.pattern[row];
    variationState[copy.type].chance[row][col] = copy.chance[row];
    variationState[copy.type].volume[row][col] = copy.volume[row];
    variationState[copy.type].repeats[row][col] = copy.repeats[row];

    // Blank drum steps never retain backend variation data.
    if (copy.pattern[row] === "off") {
      variationState[copy.type].chance[row][col] = null;
      variationState[copy.type].volume[row][col] = null;
      variationState[copy.type].repeats[row][col] = null;
    }
  }

  drumColumnCopyState = null;
  saveLocalState();
  renderActiveDrumGrid();
  updateOverlaps();
}

function createUniversalGrid({
  container,
  rows,
  cols,
  data,
  reference = null,
  context,
  ariaLabelForCell,
  onCellPress,
  renderCell = setGridCellVisual,
}) {
  container.innerHTML = "";
  container.setAttribute("aria-label", `${context} pattern`);

  for (let row = 0; row < rows; row++) {
    const label = document.createElement("div");
    label.className = "labelCell";
    label.dataset.row = row;
    label.style.gridRow = String(row + 1);
    label.style.gridColumn = "1";
    label.tabIndex = 0;
    label.setAttribute("role", "button");
    label.setAttribute("aria-label", "Toggle decimal and M8 hexadecimal step labels");
    label.addEventListener("click", toggleLabelMode);
    label.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleLabelMode();
      }
    });
    container.appendChild(label);

    for (let col = 0; col < cols; col++) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = currentView === "chance" ? "stepBtn variationGridCell" : "stepBtn";
      button.dataset.type = context;
      button.dataset.row = row;
      button.dataset.col = col;
      button.style.gridRow = String(row + 1);
      button.style.gridColumn = String(col + 2);
      button.setAttribute(
        "aria-label",
        typeof ariaLabelForCell === "function"
          ? ariaLabelForCell({ row, col, context })
          : `${context} bar ${col + 1}, step ${row + 1}`
      );

      if (row % 2 === 0) button.classList.add("eighthRow");
      if (row === 3 || row === 7 || row === 11) button.classList.add("rowDivider");

      renderCell(
        button,
        data[row][col],
        context,
        row,
        col,
        reference ? reference[row]?.[col] : undefined
      );

      if (
        currentView === "pattern" &&
        drumColumnCopyState?.type === context &&
        row === 0
      ) {
        button.textContent = col === drumColumnCopyState.sourceCol ? "Copied" : "Paste";
        button.classList.add("columnCopyTarget");
        button.style.color = `var(--${context})`;
        button.style.fontWeight = "700";

        if (col === drumColumnCopyState.sourceCol) {
          button.classList.add("columnCopySource");
          button.style.boxShadow = `inset 0 0 0 2px var(--${context})`;
          button.style.background = `color-mix(in srgb, var(--${context}) 14%, transparent)`;
        }

        button.setAttribute(
          "aria-label",
          col === drumColumnCopyState.sourceCol
            ? `Cancel copied bar ${columnLetter(col)}`
            : `Paste copied bar ${columnLetter(drumColumnCopyState.sourceCol)} into bar ${columnLetter(col)}`
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

        // B1 Pattern: long-press only a row-1 step to copy that full bar/column.
        if (
          currentView === "pattern" &&
          row === 0 &&
          !drumColumnCopyState
        ) {
          stepLongPressTimer = window.setTimeout(() => {
            stepLongPressTimer = null;
            stepLongPressFired = true;
            startDrumColumnCopy(context, col);
          }, STEP_LONG_PRESS_MS);
          return;
        }

        // B3 variation grids: long-press clears only this step's current
        // Chance/Volume/Repeat value while preserving the drum note.
        if (currentView === "chance") {
          stepLongPressTimer = window.setTimeout(() => {
            stepLongPressTimer = null;
            stepLongPressFired = true;

            const activePage = getActiveChancePage();
            variationState[currentPage][activePage][row][col] = null;

            closeChanceChooser();
            closeVolumeChooser();
            closeRepeatsChooser();
            saveLocalState();

            if (currentView === "chance") renderActiveVariationGrid();
          }, STEP_LONG_PRESS_MS);
        }
      });

      ["pointerup", "pointercancel", "pointerleave"].forEach(eventName => {
        button.addEventListener(eventName, cancelStepLongPress);
      });

      button.addEventListener("contextmenu", event => {
        if (currentView === "chance" || (currentView === "pattern" && row === 0)) {
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
          currentView === "pattern" &&
          drumColumnCopyState?.type === context
        ) {
          event.preventDefault();
          event.stopPropagation();

          if (row === 0 && col !== drumColumnCopyState.sourceCol) {
            pasteDrumColumn(col);
          } else {
            // Source column or any non-row-1 cell cancels copy mode.
            cancelDrumColumnCopy();
          }
          return;
        }

        const nextValue = onCellPress({
          row,
          col,
          value: data[row][col],
          context,
          button,
        });

        if (nextValue !== undefined) {
          data[row][col] = nextValue;
          renderCell(
            button,
            nextValue,
            context,
            row,
            col,
            reference ? reference[row]?.[col] : undefined
          );
        }
      });

      container.appendChild(button);
    }
  }

  updateLabels();
}


function setVariationCellVisual(button, value, context, row, col, referenceValue) {
  const patternValue = referenceValue || "off";

  button.classList.remove(
    "kickOn", "kickGhost", "snareOn", "snareGhost", "hatOn", "hatGhost",
    "variationReference", "variationEmpty", "activeDrumDot", "activeDrumDotGhost"
  );
  button.style.borderTop = "";
  button.style.borderRight = "";
  button.style.borderBottom = "";
  button.style.borderLeft = "";

  if (patternValue === "off") {
    button.classList.add("variationEmpty");
  } else {
    button.classList.add("variationReference");
    const ghostSuffix = patternValue === "ghost" ? "-ghost" : "";
    const border = `1px solid var(--${context}${ghostSuffix})`;
    button.style.borderTop = border;
    button.style.borderRight = border;
    button.style.borderBottom = border;
    button.style.borderLeft = border;
  }

  if (value !== null && value !== undefined && value !== "") {
    button.dataset.value = String(value);
    const activePage = getActiveChancePage();
    button.textContent = activePage === "repeats"
      ? (DRUM_REPEAT_PRESETS[value]?.label || String(value))
      : String(value);
    button.classList.add("hasVariationValue");
  } else {
    delete button.dataset.value;
    button.textContent = "";
    button.classList.remove("hasVariationValue");
  }
}

function closeChanceChooser() {
  chanceChooserTarget = null;
  chanceChooserAnchor = null;
  document.querySelector(".chanceEntryChooser")?.remove();
}

function finishChanceEntry(value) {
  if (!chanceChooserTarget) return;
  const { row, col } = chanceChooserTarget;
  variationState[currentPage].chance[row][col] = value;
  closeChanceChooser();
  saveLocalState();
  if (currentView === "chance" && getActiveChancePage() === "chance") renderActiveVariationGrid();
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
  chooser.setAttribute("aria-label", "Drum chance entry");

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
      button.setAttribute("aria-label", `${value} percent drum chance`);
      button.addEventListener("click", () => finishChanceEntry(value));
    }
    chooser.appendChild(button);
  });

  app4_b1_p1_c1.appendChild(chooser);
}

function closeVolumeChooser() {
  volumeChooserTarget = null;
  volumeChooserAnchor = null;
  document.querySelector(".volumeEntryChooser")?.remove();
}

function finishVolumeEntry(value) {
  if (!volumeChooserTarget) return;
  const { row, col } = volumeChooserTarget;
  variationState[currentPage].volume[row][col] = value;
  closeVolumeChooser();
  saveLocalState();
  if (currentView === "chance" && getActiveChancePage() === "volume") renderActiveVariationGrid();
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
  chooser.setAttribute("aria-label", "Drum volume variation entry");

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
      button.setAttribute("aria-label", "Clear volume variation, use normal drum level");
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

  app4_b1_p1_c1.appendChild(chooser);
}

function closeRepeatsChooser() {
  repeatsChooserTarget = null;
  repeatsChooserAnchor = null;
  document.querySelector(".repeatsEntryChooser")?.remove();
}

function finishRepeatsEntry(value) {
  if (!repeatsChooserTarget) return;
  const { row, col } = repeatsChooserTarget;
  variationState[currentPage].repeats[row][col] = value;
  closeRepeatsChooser();
  saveLocalState();
  if (currentView === "chance" && getActiveChancePage() === "repeats") renderActiveVariationGrid();
}

function renderRepeatsEntryChooser(anchorCell, target) {
  const pendingTarget = target || repeatsChooserTarget;
  const pendingAnchor = anchorCell || repeatsChooserAnchor;
  if (!pendingTarget || !pendingAnchor) return;

  document.querySelector(".repeatsEntryChooser")?.remove();
  repeatsChooserTarget = pendingTarget;
  repeatsChooserAnchor = pendingAnchor;

  const chooser = document.createElement("div");
  chooser.className = "repeatsEntryChooser";
  chooser.setAttribute("aria-label", "Drum repeat gesture entry");

  const values = ["2","3","4","FL","DR","ST","UP","DN","GD","LD","AC",null];
  const anchorRow = Number(pendingAnchor.dataset.row);
  const startRow = anchorRow < 8 ? 10 : 4;

  values.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stepBtn repeatsChooserButton";
    button.tabIndex = -1;
    button.style.gridRow = String(startRow + Math.floor(index / 4));
    button.style.gridColumn = String((index % 4) + 2);

    if (value === null) {
      button.textContent = "—";
      button.setAttribute("aria-label", "Clear repeat gesture");
      button.addEventListener("click", () => finishRepeatsEntry(null));
    } else {
      const preset = DRUM_REPEAT_PRESETS[value];
      button.textContent = preset.label;
      button.setAttribute("aria-label", preset.name);
      button.title = preset.name;
      button.addEventListener("click", () => finishRepeatsEntry(value));
    }
    chooser.appendChild(button);
  });

  app4_b1_p1_c1.appendChild(chooser);
}

function renderActiveVariationGrid() {
  closeChanceChooser();
  closeVolumeChooser();
  closeRepeatsChooser();
  const page = getActiveChancePage();
  createUniversalGrid({
    container: app4_b1_p1_c1,
    rows: ROWS,
    cols: visibleCols,
    data: variationState[currentPage][page],
    reference: patternState[currentPage],
    context: currentPage,
    ariaLabelForCell: ({ row, col, context }) =>
      `${context} ${page}, bar ${col + 1}, step ${row + 1}`,
    onCellPress: ({ row, col, button }) => {
      if ((patternState[currentPage]?.[row]?.[col] || "off") === "off") return undefined;
      if (page === "chance") renderChanceEntryChooser(button, { row, col });
      else if (page === "volume") renderVolumeEntryChooser(button, { row, col });
      else if (page === "repeats") renderRepeatsEntryChooser(button, { row, col });
      return undefined;
    },
    renderCell: (button, value, context, row, col, referenceValue) => {
      setVariationCellVisual(button, value, context, row, col, referenceValue);
    },
  });
}

function renderActiveDrumGrid() {
  createUniversalGrid({
    container: app4_b1_p1_c1,
    rows: ROWS,
    cols: visibleCols,
    data: patternState[currentPage],
    context: currentPage,
    ariaLabelForCell: ({ row, col, context }) =>
      `${context} bar ${col + 1}, step ${row + 1}`,
    onCellPress: ({ row, col, value, context }) => {
      const next = value === "off" ? "on" : value === "on" ? "ghost" : "off";
      if (next === "off") {
        variationState[context].chance[row][col] = null;
        variationState[context].volume[row][col] = null;
        variationState[context].repeats[row][col] = null;
      }
      saveLocalStateDeferred = true;
      return next;
    },
    renderCell: (button, state, context) => {
      setGridCellVisual(button, state, context);
      if (saveLocalStateDeferred) {
        saveLocalStateDeferred = false;

        // The step's underlying three-stage state has already been updated.
        // Recompute Borders/dot augmentation immediately so on → ghost → off
        // never leaves stale inline borders or locator-dot classes behind.
        updateOverlaps();
        saveLocalState();
      }
    },
  });
}

let saveLocalStateDeferred = false;

function rebuildGrids() {
  visibleCols = getDisplayColumns();
  document.documentElement.style.setProperty("--cols", visibleCols);
  showCurrentGrid();
  if (currentView === "pattern") updateOverlaps();
}

function resolveStyle(style) {
  if (style !== "rand") return style;
  const realStyles = styles.filter(item => item !== "rand");
  return realStyles[Math.floor(Math.random() * realStyles.length)];
}


function currentPatternBars(type, startCol, count = 4) {
  const bars = [];
  for (let offset = 0; offset < count; offset++) {
    const col = startCol + offset;
    bars.push(
      Array.from({ length: ROWS }, (_, row) =>
        col < MAX_COLS && patternState[type][row][col] !== "off"
      )
    );
  }
  return bars;
}

function writeHamptonBars(type, startCol, bars) {
  for (let barIndex = 0; barIndex < bars.length; barIndex++) {
    const col = startCol + barIndex;
    if (col >= visibleCols || col >= MAX_COLS) break;

    const hits = bars[barIndex] || [];
    for (let row = 0; row < ROWS; row++) {
      const next = hits[row] ? "on" : "off";
      patternState[type][row][col] = next;

      if (next === "off") {
        variationState[type].chance[row][col] = null;
        variationState[type].volume[row][col] = null;
        variationState[type].repeats[row][col] = null;
      }
    }
  }
}

function randomizeHamptonGrid(type) {

  // Generate each four-bar half normally. On an 8-column display, preserve
  // two strong landmarks across the phrase: bar 5 repeats bar 1 exactly and
  // bar 6 repeats bar 2 exactly. Bars 3/4 and 7/8 remain free Hampton output.
  let firstHalfBars = null;

  for (let startCol = 0; startCol < visibleCols; startCol += 4) {
    HamptonDrumEngine.resetExisting();

    // Seed the other instruments from the actual drumPhace grid so Hampton's
    // Kick/Snare overlap-forbidden rule works regardless of generation order.
    for (const otherType of instruments) {
      if (otherType === type) continue;
      HamptonDrumEngine.setExistingBars(otherType, currentPatternBars(otherType, startCol, 4));
    }

    const result = HamptonDrumEngine.generate(type);

    if (startCol === 0) {
      firstHalfBars = result.bars.map(bar => bar.slice());
    } else if (startCol === 4 && firstHalfBars) {
      result.bars[0] = firstHalfBars[0].slice();
      result.bars[1] = firstHalfBars[1].slice();
    }

    HamptonDrumEngine.setExistingBars(type, result.bars);
    writeHamptonBars(type, startCol, result.bars);
  }

  if (type === currentPage) renderActiveDrumGrid();
  showCurrentGrid();
  updateOverlaps();
  saveLocalState();
}

function randomizeGrid(type) {
  if (currentStyle[type] === "hampton") {
    randomizeHamptonGrid(type);
    return;
  }

  const selectedStyle = currentStyle[type];
  const actualStyle = resolveStyle(selectedStyle);
  const engine = engines[type][actualStyle]["32"];

  const STYLE_THINNING = {
    lofi: { full: 0.6, ghost: 0.4 },
    boom: { full: 0.85, ghost: 0.6 },
    dilla: { full: 0.95, ghost: 0.55 },
    romil: { full: 0.95, ghost: 0.55 },
    dre: { full: 0.95, ghost: 0.55 },
  };

  const thin = STYLE_THINNING[selectedStyle] || { full: 1, ghost: 1 };
  const FULL_HIT_PROB = 0.8;
  const FULL_HIT_PROB_NOT = 0.6;
  const EQUAL_PROB = 0.3;
  const GHOST_PROB = 0.6;

  for (let row = 0; row < ROWS; row++) {
    // The current visible 16-step grid samples the even positions of the
    // 32-position style engine. The full 32-position tables remain intact.
    const engineIndex = row * 2;
    const expect = engine[engineIndex] || 0;

    for (let col = 0; col < visibleCols; col++) {
      let next = "off";

      if (expect === 1) {
        const full1 = Math.random() < FULL_HIT_PROB;
        const full2 = Math.random() < FULL_HIT_PROB;
        if ((full1 || full2) && Math.random() < thin.full) {
          next = "on";
        } else if (Math.random() < FULL_HIT_PROB_NOT && Math.random() < thin.ghost) {
          next = "ghost";
        }
      } else if (expect === 1.5) {
        if (Math.random() < EQUAL_PROB && Math.random() < thin.full) {
          next = "on";
        } else if (Math.random() < EQUAL_PROB && Math.random() < thin.ghost) {
          next = "ghost";
        }
      } else if (expect === 0.5) {
        const blank1 = Math.random() < GHOST_PROB;
        const blank2 = Math.random() < GHOST_PROB;
        if (!(blank1 || blank2) && Math.random() < thin.ghost) next = "ghost";
      }

      patternState[type][row][col] = next;
      if (next === "off") {
        variationState[type].chance[row][col] = null;
        variationState[type].volume[row][col] = null;
        variationState[type].repeats[row][col] = null;
      }
    }
  }

  if (type === currentPage) renderActiveDrumGrid();
  showCurrentGrid();
  updateOverlaps();
  saveLocalState();
}

function getVisibleButtons(type) {
  if (type !== currentPage) return [];
  return Array.from(app4_b1_p1_c1.querySelectorAll(".stepBtn"));
}

// drumPhace overlap borders are controlled only by interPhace > drumPhace Settings > Borders.
// Off = no overlap borders. On = show both other drum instruments wherever they have hits.
function updateOverlaps() {
  const activeButtons = getVisibleButtons(currentPage);
  const enabled = drumBordersEnabled();
  const borderFor = (type, stepState) => {
    if (stepState === "off") return "";
    const ghostSuffix = stepState === "ghost" ? "-ghost" : "";
    return `1px solid var(--${type}${ghostSuffix})`;
  };

  for (const button of activeButtons) {
    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);

    button.style.borderTop = "";
    button.style.borderRight = "";
    button.style.borderBottom = "";
    button.style.borderLeft = "";
    button.classList.remove("activeDrumDot", "activeDrumDotGhost");

    if (!enabled || !Number.isInteger(row) || !Number.isInteger(col)) continue;

    const kickState = patternState.kick[row]?.[col] || "off";
    const snareState = patternState.snare[row]?.[col] || "off";
    const hatState = patternState.hat[row]?.[col] || "off";

    const activeState = patternState[currentPage]?.[row]?.[col] || "off";
    if (activeState === "on") button.classList.add("activeDrumDot");
    if (activeState === "ghost") button.classList.add("activeDrumDot", "activeDrumDotGhost");

    // The active instrument owns all four edges using the exact established
    // normal/ghost grid styling. Other instruments replace only their assigned
    // top/bottom edge, also using their own normal/ghost styling.
    if (currentPage === "kick") {
      const activeBorder = borderFor("kick", kickState);
      if (activeBorder) {
        button.style.borderTop = activeBorder;
        button.style.borderRight = activeBorder;
        button.style.borderBottom = activeBorder;
        button.style.borderLeft = activeBorder;
      }
      if (hatState !== "off") button.style.borderTop = borderFor("hat", hatState);
      if (snareState !== "off") button.style.borderBottom = borderFor("snare", snareState);
    } else if (currentPage === "snare") {
      const activeBorder = borderFor("snare", snareState);
      if (activeBorder) {
        button.style.borderTop = activeBorder;
        button.style.borderRight = activeBorder;
        button.style.borderBottom = activeBorder;
        button.style.borderLeft = activeBorder;
      }
      if (hatState !== "off") button.style.borderTop = borderFor("hat", hatState);
      if (kickState !== "off") button.style.borderBottom = borderFor("kick", kickState);
    } else if (currentPage === "hat") {
      const activeBorder = borderFor("hat", hatState);
      if (activeBorder) {
        button.style.borderTop = activeBorder;
        button.style.borderRight = activeBorder;
        button.style.borderBottom = activeBorder;
        button.style.borderLeft = activeBorder;
      }
      if (snareState !== "off") button.style.borderTop = borderFor("snare", snareState);
      if (kickState !== "off") button.style.borderBottom = borderFor("kick", kickState);
    }
  }
}

function toggleLabelMode() {
  labelMode = labelMode === "res" ? "hex" : "res";
  try { localStorage.setItem(GRID_LABEL_MODE_KEY, labelMode); } catch (_) {}
  updateLabels();
  saveLocalState();
}

function cycleStyle() {
  styleIndex[currentPage] = (styleIndex[currentPage] + 1) % styles.length;
  currentStyle[currentPage] = styles[styleIndex[currentPage]];
  updateStyleButton();
  saveLocalState();
}

function showCurrentGrid() {
  shell.dataset.context = currentPage;
  shell.dataset.page = updateLogicalPageIds();
  updatePatternButton();
  updateSynthButton();
  updateChanceButton();
  updateStyleButton();
  updateMiddleView();
  updateRightNameplate();

  if (currentView === "pattern") {
    renderActiveDrumGrid();
    updateOverlaps();
  } else if (currentView === "chance") {
    renderActiveVariationGrid();
  }
}

function switchPage(page) {
  cancelDrumColumnCopy({ rerender: false });
  currentPage = page;
  showCurrentGrid();
  updateAuditionColor();
  saveLocalState();
}

function cycleInstrument() {
  const index = instruments.indexOf(currentPage);
  const next = instruments[(index + 1) % instruments.length];
  switchPage(next);
}

function showPatternView() {
  if (currentView !== "pattern") {
    currentView = "pattern";
    showCurrentGrid();
    saveLocalState();
    return;
  }
  cycleInstrument();
}

function showSynthView() {
  if (currentView !== "synth") {
    cancelDrumColumnCopy({ rerender: false });
    currentView = "synth";
    showCurrentGrid();
    saveLocalState();
    return;
  }
  cycleInstrument();
}

function showChanceView() {
  if (currentView !== "chance") {
    cancelDrumColumnCopy({ rerender: false });
    currentView = "chance";
    showCurrentGrid();
    saveLocalState();
    return;
  }

  chancePageIndex[currentPage] = (chancePageIndex[currentPage] + 1) % chancePages.length;
  showCurrentGrid();
  saveLocalState();
}

let patternLongPressTimer = null;
let patternLongPressFrame = 0;
let patternLongPressStart = 0;
let patternLongPressFired = false;
const PATTERN_LONG_PRESS_MS = 650;

function setPatternLongPressFill(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  patternBtn.style.setProperty("--clear-fill", `${clamped}%`);
}

function cancelPatternLongPress() {
  if (patternLongPressTimer !== null) {
    clearTimeout(patternLongPressTimer);
    patternLongPressTimer = null;
  }
  if (patternLongPressFrame) cancelAnimationFrame(patternLongPressFrame);
  patternLongPressFrame = 0;
  if (!patternLongPressFired) setPatternLongPressFill(0);
}

function updatePatternLongPressFill(now) {
  if (patternLongPressTimer === null || patternLongPressFired) return;
  setPatternLongPressFill(((now - patternLongPressStart) / PATTERN_LONG_PRESS_MS) * 100);
  patternLongPressFrame = requestAnimationFrame(updatePatternLongPressFill);
}

patternBtn.addEventListener("pointerdown", event => {
  if (event.pointerType === "mouse" && event.button !== 0) return;

  patternLongPressFired = false;
  cancelPatternLongPress();

  // Destructive long-press action only exists when B1/Pattern is already active.
  if (currentView !== "pattern") return;

  patternLongPressStart = performance.now();
  try { patternBtn.setPointerCapture?.(event.pointerId); } catch (_) {}
  patternLongPressFrame = requestAnimationFrame(updatePatternLongPressFill);
  patternLongPressTimer = window.setTimeout(() => {
    patternLongPressTimer = null;
    patternLongPressFired = true;
    if (patternLongPressFrame) cancelAnimationFrame(patternLongPressFrame);
    patternLongPressFrame = 0;
    setPatternLongPressFill(100);
    clearCurrentGrid();
    window.setTimeout(() => setPatternLongPressFill(0), 180);
  }, PATTERN_LONG_PRESS_MS);
});

["pointerup", "pointercancel", "pointerleave"].forEach(eventName => {
  patternBtn.addEventListener(eventName, event => {
    try { patternBtn.releasePointerCapture?.(event.pointerId); } catch (_) {}
    cancelPatternLongPress();
  });
});

patternBtn.addEventListener("contextmenu", event => {
  event.preventDefault();
});

patternBtn.addEventListener("click", event => {
  if (patternLongPressFired) {
    patternLongPressFired = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  showPatternView();
});

synthBtn.addEventListener("click", showSynthView);

let chanceLongPressTimer = null;
let chanceLongPressFrame = 0;
let chanceLongPressStart = 0;
let chanceLongPressFired = false;
const CHANCE_LONG_PRESS_MS = 650;

function setChanceLongPressFill(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  chanceBtn.style.setProperty("--clear-fill", `${clamped}%`);
}

function cancelChanceLongPress() {
  if (chanceLongPressTimer !== null) {
    clearTimeout(chanceLongPressTimer);
    chanceLongPressTimer = null;
  }
  if (chanceLongPressFrame) cancelAnimationFrame(chanceLongPressFrame);
  chanceLongPressFrame = 0;
  if (!chanceLongPressFired) setChanceLongPressFill(0);
}

function updateChanceLongPressFill(now) {
  if (chanceLongPressTimer === null || chanceLongPressFired) return;
  setChanceLongPressFill(((now - chanceLongPressStart) / CHANCE_LONG_PRESS_MS) * 100);
  chanceLongPressFrame = requestAnimationFrame(updateChanceLongPressFill);
}

function clearActiveVariationGrid() {
  const page = getActiveChancePage();
  const grid = variationState[currentPage]?.[page];
  if (!Array.isArray(grid)) return;

  for (let row = 0; row < ROWS; row++) {
    if (!Array.isArray(grid[row])) continue;
    for (let col = 0; col < MAX_COLS; col++) {
      grid[row][col] = null;
    }
  }

  closeChanceChooser();
  closeVolumeChooser();
  closeRepeatsChooser();
  saveLocalState();

  if (currentView === "chance") renderActiveVariationGrid();
}

chanceBtn.addEventListener("pointerdown", event => {
  if (event.pointerType === "mouse" && event.button !== 0) return;

  chanceLongPressFired = false;
  cancelChanceLongPress();

  // Destructive long-press action only exists when B3 is already active.
  if (currentView !== "chance") return;

  chanceLongPressStart = performance.now();
  try { chanceBtn.setPointerCapture?.(event.pointerId); } catch (_) {}
  chanceLongPressFrame = requestAnimationFrame(updateChanceLongPressFill);
  chanceLongPressTimer = window.setTimeout(() => {
    chanceLongPressTimer = null;
    chanceLongPressFired = true;
    if (chanceLongPressFrame) cancelAnimationFrame(chanceLongPressFrame);
    chanceLongPressFrame = 0;
    setChanceLongPressFill(100);
    clearActiveVariationGrid();
    window.setTimeout(() => setChanceLongPressFill(0), 180);
  }, CHANCE_LONG_PRESS_MS);
});

["pointerup", "pointercancel", "pointerleave"].forEach(eventName => {
  chanceBtn.addEventListener(eventName, event => {
    try { chanceBtn.releasePointerCapture?.(event.pointerId); } catch (_) {}
    cancelChanceLongPress();
  });
});

chanceBtn.addEventListener("contextmenu", event => {
  event.preventDefault();
});

chanceBtn.addEventListener("click", event => {
  if (chanceLongPressFired) {
    chanceLongPressFired = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  showChanceView();
});

Object.entries(synthControls).forEach(([type, controls]) => {
  controls.sliders.forEach((slider, index) => {
    slider?.addEventListener("input", () => {
      const config = drumSynthConfigs[type]?.[index];
      if (!config) return;

      const numeric = Number(slider.value);
      const value = Math.max(config.min, Math.min(config.max, Number.isFinite(numeric) ? numeric : config.min));

      if (type === "kick" && index === 7) {
        const presetIndex = Math.max(0, Math.min(KICK_PRESETS.length - 1, Math.round(value)));
        const preset = KICK_PRESETS[presetIndex];
        preset.values.forEach((presetValue, controlIndex) => {
          drumSynthUiState.kick[controlIndex] = presetValue;
        });
        drumSynthUiState.kick[7] = presetIndex;
        if (currentPage === "kick") syncDrumSynthUi();
        saveLocalState();
        return;
      }

      if (type === "snare" && index === 7) {
        const presetIndex = Math.max(0, Math.min(SNARE_PRESETS.length - 1, Math.round(value)));
        const preset = SNARE_PRESETS[presetIndex];
        preset.values.forEach((presetValue, controlIndex) => {
          drumSynthUiState.snare[controlIndex] = presetValue;
        });
        drumSynthUiState.snare[7] = presetIndex;
        if (currentPage === "snare") syncDrumSynthUi();
        saveLocalState();
        return;
      }

      if (type === "hat" && index === 7) {
        const presetIndex = Math.max(0, Math.min(HAT_PRESETS.length - 1, Math.round(value)));
        const preset = HAT_PRESETS[presetIndex];
        preset.values.forEach((presetValue, controlIndex) => {
          drumSynthUiState.hat[controlIndex] = presetValue;
        });
        drumSynthUiState.hat[7] = presetIndex;
        if (currentPage === "hat") syncDrumSynthUi();
        saveLocalState();
        return;
      }

      drumSynthUiState[type][index] = value;
      slider.style.setProperty("--value", `${sliderFillPercent(slider, value)}%`);
      if (controls.values[index]) controls.values[index].textContent = config.format(value);
      saveLocalState();
    });
  });
});



function randomizeCurrentDrumSynth() {
  const type = currentPage;
  const configs = drumSynthConfigs[type];
  const controls = synthControls[type];
  const state = drumSynthUiState[type];

  if (!configs || !controls || !state) return;

  // Sliders 1-7 are randomized. Slider 8 is Preset and remains unchanged.
  for (let index = 0; index < Math.min(7, configs.length); index++) {
    const config = configs[index];
    const min = Number(config.min);
    const max = Number(config.max);
    const step = Number(config.step || 1);

    let value = min + Math.random() * (max - min);

    if (Number.isFinite(step) && step > 0) {
      value = Math.round((value - min) / step) * step + min;
    }

    value = Math.max(min, Math.min(max, value));
    state[index] = value;

    const slider = controls.sliders[index];
    if (slider) {
      slider.value = String(value);
      slider.style.setProperty("--value", `${sliderFillPercent(slider, value)}%`);
    }

    const valueEl = controls.values[index];
    if (valueEl) valueEl.textContent = config.format(value);
  }

  // Randomized values are custom settings, not a preset selection.
  // Preserve slider 8 exactly as requested.
  saveLocalState();
}

styleBtn.addEventListener("click", cycleStyle);
generateBtn.addEventListener("click", () => {
  if (currentView === "synth") {
    randomizeCurrentDrumSynth();
    return;
  }

  randomizeGrid(currentPage);
});


function clearCurrentGrid() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < MAX_COLS; col++) {
      patternState[currentPage][row][col] = "off";
      variationState[currentPage].chance[row][col] = null;
      variationState[currentPage].volume[row][col] = null;
      variationState[currentPage].repeats[row][col] = null;
    }
  }
  renderActiveDrumGrid();
  showCurrentGrid();
  updateOverlaps();
  saveLocalState();
}


let auditionSource = null;
let auditionGain = null;
let auditionAudioContext = null;
let auditionGeneration = 0;
let auditionState = "idle";
let auditionMode = "active";

function notifyAuditionState() {
  window.dispatchEvent(new CustomEvent("interPhace:audition-state"));
}

function updateAuditionColor() {
  auditionBtn.dataset.colorMode = currentPage;
}

// Build 486: internal drumPhace navigation never stops local audition.
// The shared shell emits this only when the user selects a different Phace.
window.addEventListener("interPhace:phace-exit", stopAudition);

function stopAudition() {
  auditionGeneration += 1;

  const source = auditionSource;
  const gain = auditionGain;
  auditionSource = null;
  auditionGain = null;

  if (source) {
    try {
      const ctx = source.context || auditionAudioContext;
      const now = ctx?.currentTime || 0;
      if (gain?.gain && ctx) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.012);
        source.stop(now + 0.014);
        window.setTimeout(() => {
          try { source.disconnect(); } catch (_) {}
          try { gain.disconnect(); } catch (_) {}
        }, 30);
      } else {
        source.stop();
        source.disconnect();
      }
    } catch (_) {}
  }

  auditionState = "idle";
  notifyAuditionState();
  auditionBtn.disabled = false;
  auditionMode = "active";
  updateAuditionColor();
  auditionBtn.setAttribute(
    "aria-label",
    currentView === "synth" ? `Audition ${currentPage} pattern` : "Audition full drum kit",
  );
}

function kickVoice(ctx, destination, startTime, strength = 1) {
  const [pitch, punch, sweepMs, decayMs, toneAmount, noiseAmount, shapeAmount] = drumSynthUiState.kick;

  const bodyPitch = Math.max(30, Math.min(80, Number(pitch) || 43));
  const startPitch = Math.max(bodyPitch + 1, Math.min(220, Number(punch) || 118));
  const sweepSeconds = Math.max(0.015, Math.min(0.180, (Number(sweepMs) || 55) / 1000));
  const decaySeconds = Math.max(0.060, Math.min(1.800, (Number(decayMs) || 420) / 1000));
  const tone = Math.max(0, Math.min(1, (Number(toneAmount) || 0) / 100));
  const noise = Math.max(0, Math.min(1, (Number(noiseAmount) || 0) / 100));
  const shape = Math.max(0, Math.min(1, (Number(shapeAmount) || 0) / 100));

  // Preserve the current kick at INIT: 118 -> 52 -> 43 Hz, 55 ms first
  // sweep, 320 ms settling point, 420 ms amplitude decay.
  const currentSweepRatio = sweepSeconds / 0.055;
  const settleSeconds = Math.min(
    Math.max(sweepSeconds + 0.012, 0.320 * currentSweepRatio),
    Math.max(sweepSeconds + 0.012, decaySeconds * 0.90),
  );
  const intermediatePitch = Math.max(
    bodyPitch + 0.5,
    bodyPitch + ((startPitch - bodyPitch) * 0.12),
  );

  const osc = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  const bodyBus = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const postGain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(startPitch, startTime);
  osc.frequency.exponentialRampToValueAtTime(intermediatePitch, startTime + sweepSeconds);
  osc.frequency.exponentialRampToValueAtTime(bodyPitch, startTime + settleSeconds);

  const peak = 0.92 * strength;
  bodyGain.gain.setValueAtTime(0.0001, startTime);
  bodyGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), startTime + 0.002);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decaySeconds);

  // Shape = 0 is a mathematically clean pass-through. Increasing Shape
  // progressively soft-clips the sine body to introduce useful harmonics.
  if (shape > 0.0001) {
    const drive = 1 + shape * 8;
    const samples = 1024;
    const curve = new Float32Array(samples);
    const norm = Math.tanh(drive);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2 / (samples - 1)) - 1;
      curve[i] = Math.tanh(x * drive) / norm;
    }
    shaper.curve = curve;
    shaper.oversample = "4x";
    postGain.gain.value = 1 / (1 + shape * 0.45);
    osc.connect(bodyGain);
    bodyGain.connect(shaper);
    shaper.connect(postGain);
    postGain.connect(destination);
  } else {
    osc.connect(bodyGain);
    bodyGain.connect(destination);
  }

  // Tone is a short pitched/click transient. Zero adds nothing.
  if (tone > 0.0001) {
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    const clickFilter = ctx.createBiquadFilter();
    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(950 + tone * 2600, startTime);
    clickOsc.frequency.exponentialRampToValueAtTime(420 + tone * 500, startTime + 0.012);
    clickFilter.type = "highpass";
    clickFilter.frequency.setValueAtTime(500 + tone * 900, startTime);
    clickFilter.Q.setValueAtTime(0.5, startTime);
    const clickPeak = Math.max(0.0002, strength * tone * 0.30);
    clickGain.gain.setValueAtTime(0.0001, startTime);
    clickGain.gain.exponentialRampToValueAtTime(clickPeak, startTime + 0.0007);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.010 + tone * 0.010);
    clickOsc.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(destination);
    clickOsc.start(startTime);
    clickOsc.stop(startTime + 0.025);
  }

  // Noise is a short filtered transient/body texture. Zero adds nothing.
  if (noise > 0.0001) {
    const noiseSeconds = 0.010 + noise * 0.045;
    const noiseSource = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noiseSource.buffer = makeNoiseBuffer(ctx, noiseSeconds);
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(900 + noise * 1800, startTime);
    noiseFilter.Q.setValueAtTime(0.7 + noise * 1.2, startTime);
    const noisePeak = Math.max(0.0002, strength * noise * 0.24);
    noiseGain.gain.setValueAtTime(0.0001, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(noisePeak, startTime + 0.001);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseSeconds);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);
    noiseSource.start(startTime);
    noiseSource.stop(startTime + noiseSeconds + 0.005);
  }

  osc.start(startTime);
  osc.stop(startTime + decaySeconds + 0.030);
}


function makeNoiseBuffer(ctx, seconds) {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function snareVoice(ctx, destination, startTime, strength = 1) {
  const [bodyAmount, snapAmount, noiseAmount, toneAmount, decayAmount, ringAmount, shapeAmount] = drumSynthUiState.snare;

  const bodyMacro = Math.max(0, Math.min(1, (Number(bodyAmount) || 0) / 100));
  const snap = Math.max(0, Math.min(1, (Number(snapAmount) || 0) / 100));
  const noiseMacro = Math.max(0, Math.min(1, (Number(noiseAmount) || 0) / 100));
  const tone = Math.max(0, Math.min(1, (Number(toneAmount) || 0) / 100));
  const decay = Math.max(0, Math.min(1, (Number(decayAmount) || 0) / 100));
  const ring = Math.max(0, Math.min(1, (Number(ringAmount) || 0) / 100));
  const shape = Math.max(0, Math.min(1, (Number(shapeAmount) || 0) / 100));

  // INIT maps exactly to the legacy snare:
  // 1850 Hz / Q .7 noise, .64 peak, 135 ms noise decay,
  // triangle body 185 -> 145 Hz in 70 ms, .22 peak, 90 ms body decay.
  const noiseCenter = 850 + tone * 2000;              // tone 50 -> 1850 Hz
  const noiseQ = 0.45 + tone * 0.50;                  // tone 50 -> .70
  const noiseDecay = 0.060 + decay * 0.150;           // decay 50 -> 135 ms
  const bodyStartHz = 135 + bodyMacro * 100;           // body 50 -> 185 Hz
  const bodyEndHz = 105 + bodyMacro * 80;              // body 50 -> 145 Hz
  const bodySweep = 0.045 + decay * 0.050;             // decay 50 -> 70 ms
  const bodyDecay = 0.050 + decay * 0.080;             // decay 50 -> 90 ms

  const snareBus = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const makeup = ctx.createGain();

  if (shape > 0.0001) {
    const drive = 1 + shape * 4;
    const samples = 1024;
    const curve = new Float32Array(samples);
    const norm = Math.tanh(drive);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2 / (samples - 1)) - 1;
      curve[i] = Math.tanh(x * drive) / norm;
    }
    shaper.curve = curve;
    shaper.oversample = "2x";
    makeup.gain.value = 1 / (1 + shape * 0.30);
    snareBus.connect(shaper);
    shaper.connect(makeup);
    makeup.connect(destination);
  } else {
    snareBus.connect(destination);
  }

  // Wire/noise layer.
  if (noiseMacro > 0.0001) {
    const noise = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    const noiseLength = Math.max(0.16, noiseDecay + 0.025);

    noise.buffer = makeNoiseBuffer(ctx, noiseLength);
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(noiseCenter, startTime);
    noiseFilter.Q.setValueAtTime(noiseQ, startTime);

    const noisePeak = 0.64 * strength * noiseMacro;
    noiseGain.gain.setValueAtTime(0.0001, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, noisePeak), startTime + 0.0015);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseDecay);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(snareBus);
    noise.start(startTime);
    noise.stop(startTime + noiseLength);
  }

  // Pitched shell/body layer.
  if (bodyMacro > 0.0001) {
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = "triangle";
    body.frequency.setValueAtTime(bodyStartHz, startTime);
    body.frequency.exponentialRampToValueAtTime(bodyEndHz, startTime + bodySweep);
    bodyGain.gain.setValueAtTime(0.0001, startTime);
    bodyGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.44 * bodyMacro * strength), startTime + 0.001);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startTime + bodyDecay);
    body.connect(bodyGain);
    bodyGain.connect(snareBus);
    body.start(startTime);
    body.stop(startTime + bodyDecay + 0.010);
  }

  // Snap layer. At INIT 50 it contributes zero so the legacy sound is exact.
  const snapExtra = Math.max(0, (snap - 0.5) * 2);
  if (snapExtra > 0.0001) {
    const snapNoise = ctx.createBufferSource();
    const snapHP = ctx.createBiquadFilter();
    const snapGain = ctx.createGain();
    snapNoise.buffer = makeNoiseBuffer(ctx, 0.018);
    snapHP.type = "highpass";
    snapHP.frequency.setValueAtTime(3500 + tone * 4500, startTime);
    snapGain.gain.setValueAtTime(0.0001, startTime);
    snapGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.16 * snapExtra * strength), startTime + 0.0008);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.012);
    snapNoise.connect(snapHP);
    snapHP.connect(snapGain);
    snapGain.connect(snareBus);
    snapNoise.start(startTime);
    snapNoise.stop(startTime + 0.018);
  }

  // Ring layer. INIT = 0.
  if (ring > 0.0001) {
    const ringOsc = ctx.createOscillator();
    const ringGain = ctx.createGain();
    const ringHz = 155 + bodyMacro * 115;
    const ringDecay = 0.070 + decay * 0.220;
    ringOsc.type = "sine";
    ringOsc.frequency.setValueAtTime(ringHz, startTime);
    ringGain.gain.setValueAtTime(0.0001, startTime);
    ringGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.16 * ring * strength), startTime + 0.002);
    ringGain.gain.exponentialRampToValueAtTime(0.0001, startTime + ringDecay);
    ringOsc.connect(ringGain);
    ringGain.connect(snareBus);
    ringOsc.start(startTime);
    ringOsc.stop(startTime + ringDecay + 0.012);
  }
}

function hatVoice(ctx, destination, startTime, strength = 1) {
  const [toneAmount, metalAmount, noiseAmount, clickAmount, ringAmount, decayMs, shapeAmount] = drumSynthUiState.hat;

  const tone = Math.max(0, Math.min(1, (Number(toneAmount) || 0) / 100));
  const metal = Math.max(0, Math.min(1, (Number(metalAmount) || 0) / 100));
  const noiseMix = Math.max(0, Math.min(1, (Number(noiseAmount) || 0) / 100));
  const click = Math.max(0, Math.min(1, (Number(clickAmount) || 0) / 100));
  const ring = Math.max(0, Math.min(1, (Number(ringAmount) || 0) / 100));
  const decay = Math.max(0.008, Math.min(0.140, (Number(decayMs) || 32) / 1000));
  const shape = Math.max(0, Math.min(1, (Number(shapeAmount) || 0) / 100));

  const hatBus = ctx.createGain();
  const masterGain = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const makeup = ctx.createGain();

  // Final post-sum transient envelope. Do the timing math before playback:
  // 1.6 ms is ~71 samples at 44.1 kHz, long enough to suppress a discontinuity
  // while remaining far below even the shortest 8 ms CHH decay.
  const masterAttack = 0.0016;
  masterGain.gain.setValueAtTime(0.0001, startTime);
  masterGain.gain.linearRampToValueAtTime(1, startTime + masterAttack);

  // Tone controls spectral center across the active layers.
  // 50 is neutral and maps the noise layer to the original 7.2 kHz HPF.
  const toneHz = 4200 + tone * 7000;
  const initNoiseHighpass = 7200;
  const noiseHighpass = toneAmount === 50 ? initNoiseHighpass : toneHz;

  if (shape > 0.0001) {
    const drive = 1 + shape * 5;
    const samples = 1024;
    const curve = new Float32Array(samples);
    const norm = Math.tanh(drive);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2 / (samples - 1)) - 1;
      curve[i] = Math.tanh(x * drive) / norm;
    }
    shaper.curve = curve;
    shaper.oversample = "2x";
    makeup.gain.value = 1 / (1 + shape * 0.35);
    hatBus.connect(masterGain);
    masterGain.connect(shaper);
    shaper.connect(makeup);
    makeup.connect(destination);
  } else {
    hatBus.connect(masterGain);
    masterGain.connect(destination);
  }

  // 1) Noise body. INIT reproduces the original CHH exactly in architecture:
  // 45 ms source, 7.2 kHz HPF, 0.30 peak, ~0.8 ms attack, 32 ms decay.
  if (noiseMix > 0.0001) {
    const noise = ctx.createBufferSource();
    const highpass = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    const noiseDecay = Math.max(0.008, decay);
    const sourceLength = Math.max(0.045, noiseDecay + 0.013);
    noise.buffer = makeNoiseBuffer(ctx, sourceLength);

    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(noiseHighpass, startTime);
    highpass.Q.setValueAtTime(0.6 + metal * 0.5, startTime);

    const peak = 0.30 * strength * noiseMix;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), startTime + 0.0016);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseDecay);

    noise.connect(highpass);
    highpass.connect(gain);
    gain.connect(hatBus);
    noise.start(startTime);
    noise.stop(startTime + sourceLength);
  }

  // 2) Metallic inharmonic cluster. Independent from Noise.
  if (metal > 0.0001) {
    const base = 3900 + tone * 5200;
    const ratios = [1.00, 1.29, 1.58, 1.93, 2.31, 2.73];
    const metalBus = ctx.createGain();
    const metalHP = ctx.createBiquadFilter();
    const metalGain = ctx.createGain();

    metalHP.type = "highpass";
    metalHP.frequency.setValueAtTime(Math.max(2800, 3600 + tone * 4200), startTime);
    metalHP.Q.setValueAtTime(0.55 + metal * 0.9, startTime);

    const metalDecay = Math.max(0.006, Math.min(0.110, decay * (0.62 + metal * 0.34)));
    const metalPeak = Math.max(0.0002, strength * metal * 0.18);
    metalGain.gain.setValueAtTime(0.0001, startTime);
    metalGain.gain.exponentialRampToValueAtTime(metalPeak, startTime + 0.0020);
    metalGain.gain.exponentialRampToValueAtTime(0.0001, startTime + metalDecay);

    ratios.forEach((ratio, index) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = index % 2 === 0 ? "square" : "triangle";
      osc.frequency.setValueAtTime(Math.min(19000, base * ratio), startTime);
      oscGain.gain.value = 0.16 * (1 - index * 0.08);
      osc.connect(oscGain);
      oscGain.connect(metalBus);
      const stagger = index * 0.00012;
      osc.start(startTime + stagger);
      osc.stop(startTime + metalDecay + 0.012);
    });

    metalBus.connect(metalHP);
    metalHP.connect(metalGain);
    metalGain.connect(hatBus);
  }

  // 3) Click transient. Extremely short, useful for needle-tight digital hats.
  if (click > 0.0001) {
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    const clickHP = ctx.createBiquadFilter();

    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(5000 + tone * 9000, startTime);
    clickOsc.frequency.exponentialRampToValueAtTime(2200 + tone * 3500, startTime + 0.004);

    clickHP.type = "highpass";
    clickHP.frequency.setValueAtTime(4200 + tone * 6800, startTime);
    clickHP.Q.setValueAtTime(0.5, startTime);

    const clickDecay = 0.0022 + click * 0.0048;
    const clickPeak = Math.max(0.0002, strength * click * 0.075);
    clickGain.gain.setValueAtTime(0.0001, startTime);
    clickGain.gain.exponentialRampToValueAtTime(clickPeak, startTime + 0.0009);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, startTime + clickDecay);

    clickOsc.connect(clickHP);
    clickHP.connect(clickGain);
    clickGain.connect(hatBus);
    clickOsc.start(startTime);
    clickOsc.stop(startTime + clickDecay + 0.004);
  }

  // 4) Ring body. Short resonant struck-metal layer with its own envelope.
  if (ring > 0.0001) {
    const ringOscA = ctx.createOscillator();
    const ringOscB = ctx.createOscillator();
    const ringGain = ctx.createGain();
    const ringBP = ctx.createBiquadFilter();

    const ringBase = 4700 + tone * 4300;
    ringOscA.type = "sine";
    ringOscB.type = "triangle";
    ringOscA.frequency.setValueAtTime(ringBase, startTime);
    ringOscB.frequency.setValueAtTime(Math.min(18000, ringBase * 1.47), startTime);

    ringBP.type = "bandpass";
    ringBP.frequency.setValueAtTime(Math.min(14000, ringBase * 1.10), startTime);
    ringBP.Q.setValueAtTime(2.0 + ring * 8.0, startTime);

    const ringDecay = Math.max(0.010, Math.min(0.140, decay * (0.72 + ring * 0.55)));
    const ringPeak = Math.max(0.0002, strength * ring * 0.15);
    ringGain.gain.setValueAtTime(0.0001, startTime);
    ringGain.gain.exponentialRampToValueAtTime(ringPeak, startTime + 0.0020);
    ringGain.gain.exponentialRampToValueAtTime(0.0001, startTime + ringDecay);

    ringOscA.connect(ringBP);
    ringOscB.connect(ringBP);
    ringBP.connect(ringGain);
    ringGain.connect(hatBus);

    ringOscA.start(startTime);
    ringOscB.start(startTime);
    ringOscA.stop(startTime + ringDecay + 0.015);
    ringOscB.stop(startTime + ringDecay + 0.015);
  }
}


const auditionVoices = {
  kick: kickVoice,
  snare: snareVoice,
  hat: hatVoice,
};

const GLOBAL_MIXER_STORAGE_KEY = "interPhace.interPhace.ui.v2";

function dbToGain(db) {
  return Math.pow(10, Number(db) / 20);
}

function readGlobalMixerChannel(channel, { respectMute = true } = {}) {
  try {
    const saved = JSON.parse(localStorage.getItem(GLOBAL_MIXER_STORAGE_KEY) || "null") || {};
    const db = Number(saved?.mixer?.[channel] ?? 0);
    const muted = !!saved?.muted?.[channel];
    return {
      db,
      muted,
      gain: respectMute && muted ? 0 : dbToGain(db),
    };
  } catch (_) {
    return { db: 0, muted: false, gain: 1 };
  }
}

function readDrumMixerGains({ respectMute = true } = {}) {
  return {
    kick: readGlobalMixerChannel("kick", { respectMute }),
    snare: readGlobalMixerChannel("snare", { respectMute }),
    hat: readGlobalMixerChannel("hat", { respectMute }),
  };
}

function scheduleUploadedSample(ctx, destination, buffer, startTime, strength) {
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.value = strength;
  source.connect(gain);
  gain.connect(destination);
  source.start(startTime);
  source.stop(startTime + Math.min(buffer.duration, MAX_SAMPLE_SECONDS));
}

function resolveDrumAudioVariation(type, row, col) {
  const rawChance = variationState[type]?.chance?.[row]?.[col];
  const chancePercent = rawChance === null || rawChance === undefined || rawChance === ""
    ? 100
    : Math.max(0, Math.min(100, Number(rawChance)));
  if (Math.random() * 100 >= chancePercent) {
    return { play: false, volumeMultiplier: 1 };
  }

  const rawVolume = variationState[type]?.volume?.[row]?.[col];
  let volumeMultiplier = 1;
  if (rawVolume !== null && rawVolume !== undefined && rawVolume !== "") {
    const center = Math.max(5, Math.min(95, Number(rawVolume)));
    const low = Math.max(0, Math.round(center - 5));
    const high = Math.min(100, Math.round(center + 5));
    const resolvedPercent = low + Math.floor(Math.random() * ((high - low) + 1));
    volumeMultiplier = resolvedPercent / 100;
  }

  return { play: true, volumeMultiplier };
}

function resolvedRepeatEvents(type, row, col) {
  const key = variationState[type]?.repeats?.[row]?.[col];
  return DRUM_REPEAT_PRESETS[key]?.events || [{ offset: 0, gain: 1 }];
}

async function renderCurrentHatVoiceBuffer(sampleRate = 44100) {
  const decaySeconds = Math.max(0.008, Math.min(0.140, (Number(drumSynthUiState.hat[5]) || 32) / 1000));
  const duration = Math.max(0.060, Math.min(0.180, decaySeconds + 0.040));
  const frames = Math.ceil(duration * sampleRate);
  const offline = new OfflineAudioContext(2, frames, sampleRate);
  const gain = offline.createGain();
  gain.gain.value = 1;
  gain.connect(offline.destination);
  hatVoice(offline, gain, 0, 1);
  return await offline.startRendering();
}

async function renderCurrentSnareVoiceBuffer(sampleRate = 44100) {
  const decayMacro = Math.max(0, Math.min(1, (Number(drumSynthUiState.snare[4]) || 50) / 100));
  const ringMacro = Math.max(0, Math.min(1, (Number(drumSynthUiState.snare[5]) || 0) / 100));
  const noiseDecay = 0.060 + decayMacro * 0.150;
  const ringDecay = ringMacro > 0 ? 0.070 + decayMacro * 0.220 : 0;
  const duration = Math.max(0.18, Math.min(0.34, Math.max(noiseDecay + 0.035, ringDecay + 0.025)));
  const frames = Math.ceil(duration * sampleRate);
  const offline = new OfflineAudioContext(2, frames, sampleRate);
  const gain = offline.createGain();
  gain.gain.value = 1;
  gain.connect(offline.destination);
  snareVoice(offline, gain, 0, 1);
  return await offline.startRendering();
}

async function renderCurrentKickVoiceBuffer(sampleRate = 44100) {
  const decaySeconds = Math.max(0.060, Math.min(1.800, (Number(drumSynthUiState.kick[3]) || 420) / 1000));
  const duration = Math.max(0.120, Math.min(1.880, decaySeconds + 0.060));
  const frames = Math.ceil(duration * sampleRate);
  const offline = new OfflineAudioContext(2, frames, sampleRate);
  const gain = offline.createGain();
  gain.gain.value = 1;
  gain.connect(offline.destination);
  kickVoice(offline, gain, 0, 1);
  return await offline.startRendering();
}

function scheduleVisiblePatternVoice(offline, destination, type, secondsPerStep, swingPercent = 0, channelGain = 1, renderCols = visibleCols, renderedVoiceBuffer = null, sourceColumns = null) {
  const voice = auditionVoices[type];
  const ghostStrength = type === "kick" ? 0.42 : type === "snare" ? 0.46 : 0.50;
  const sample = uploadedSamples[type];

  for (let col = 0; col < renderCols; col++) {
    const sourceCol = Math.max(0, Math.min(MAX_COLS - 1, Number(sourceColumns?.[col] ?? col)));
    for (let row = 0; row < ROWS; row++) {
      const state = patternState[type][row][sourceCol];
      if (state === "off") continue;

      const variation = resolveDrumAudioVariation(type, row, sourceCol);
      if (!variation.play) continue;

      const stepIndex = col * ROWS + row;
      const baseStartTime = window.InterPhaceShell.swungSixteenthTime(
        stepIndex,
        secondsPerStep,
        swingPercent,
      );
      const baseStrength = state === "ghost" ? ghostStrength : 1;
      const gestureBaseStrength = baseStrength * variation.volumeMultiplier * channelGain;
      if (gestureBaseStrength <= 0) continue;

      for (const repeatEvent of resolvedRepeatEvents(type, row, sourceCol)) {
        const startTime = baseStartTime + (Math.max(0, Number(repeatEvent.offset) || 0) * secondsPerStep);
        const strength = gestureBaseStrength * Math.max(0, Number(repeatEvent.gain) || 0);
        if (strength <= 0) continue;

        if (renderedVoiceBuffer) {
          scheduleUploadedSample(offline, destination, renderedVoiceBuffer, startTime, strength);
        } else if (sample) {
          scheduleUploadedSample(offline, destination, sample, startTime, strength);
        } else {
          voice(offline, destination, startTime, strength);
        }
      }
    }
  }
}

function createLoopBufferWithWrappedTail(rendered, loopFrames) {
  const output = new AudioBuffer({
    length: loopFrames,
    numberOfChannels: rendered.numberOfChannels,
    sampleRate: rendered.sampleRate,
  });

  for (let channel = 0; channel < rendered.numberOfChannels; channel++) {
    const src = rendered.getChannelData(channel);
    const dst = output.getChannelData(channel);

    // Main musical region.
    dst.set(src.subarray(0, loopFrames));

    // Any decay extending beyond the loop point belongs to the next cycle.
    // Wrap it onto the beginning of the finished loop buffer instead of truncating it.
    for (let i = loopFrames; i < src.length; i++) {
      const wrappedIndex = (i - loopFrames) % loopFrames;
      dst[wrappedIndex] += src[i];
    }
  }

  return output;
}

function peakAbs(buffer) {
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      const value = Math.abs(data[i]);
      if (value > peak) peak = value;
    }
  }
  return peak;
}

function applyLoopSafetyGain(buffer, ceiling = 0.98) {
  const peak = peakAbs(buffer);
  if (!Number.isFinite(peak) || peak <= ceiling || peak <= 0) return buffer;

  const gain = ceiling / peak;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) data[i] *= gain;
  }
  return buffer;
}

async function renderVisiblePattern({
  mode = "active",
  activeType = currentPage,
  tempo = readGlobalProjectTempo(),
  swing = readGlobalProjectSwing(),
  columns = visibleCols,
  respectMute = true,
  sourceColumns = null,
  preserveTail = false,
} = {}) {
  const sampleRate = 44100;
  const renderTempo = clampTempo(tempo);
  const renderSwing = Math.max(0, Math.min(100, Number(swing) || 0));
  const renderCols = Math.max(1, Math.min(8, Math.round(Number(columns) || visibleCols)));
  const secondsPerStep = (60 / renderTempo) / 4;
  const totalSteps = renderCols * ROWS;
  const loopSeconds = totalSteps * secondsPerStep;

  const kickTail = Math.max(0.10, Math.min(1.85, (Number(drumSynthUiState.kick[3]) || 420) / 1000 + 0.05));
  const hatTail = Math.max(0.045, Math.min(0.16, (Number(drumSynthUiState.hat[5]) || 32) / 1000 + 0.02));
  const builtInTail = { kick: kickTail, snare: 0.2, hat: hatTail };
  const mixer = readDrumMixerGains({ respectMute });
  const requestedTypes = mode === "all" ? instruments : [activeType];
  // Build 273: a muted mixer channel is a render decision, not merely a zero-gain stage.
  // Skip its voice synthesis/sample scheduling entirely.
  const types = respectMute
    ? requestedTypes.filter(type => !mixer[type]?.muted)
    : requestedTypes;
  const tailSeconds = types.length
    ? Math.max(
        ...types.map(type =>
          uploadedSamples[type]
            ? Math.min(uploadedSamples[type].duration, MAX_SAMPLE_SECONDS)
            : builtInTail[type]
        )
      )
    : 0;

  // Render the exact visible pattern plus enough time for the last triggered
  // drum voice to finish naturally. We then wrap that tail into the beginning.
  const totalDuration = loopSeconds + tailSeconds;
  const frameCount = Math.ceil(totalDuration * sampleRate);
  const offline = new OfflineAudioContext(2, frameCount, sampleRate);

  const master = offline.createGain();
  master.gain.value = mode === "all"
    ? 1.0
    : activeType === "kick"
      ? 0.82
      : activeType === "snare"
        ? 0.78
        : 0.72;

  const safety = offline.createDynamicsCompressor();
  safety.threshold.value = -3;
  safety.knee.value = 3;
  safety.ratio.value = 12;
  safety.attack.value = 0.002;
  safety.release.value = 0.08;
  master.connect(safety);
  safety.connect(offline.destination);

  // Built-in Kick and Hat are synthesized once per render, then reused as
  // short buffers for every trigger across the complete visible loop.
  // Uploaded samples already use efficient buffer triggering and bypass this.
  const renderedKickVoice = types.includes("kick") && !uploadedSamples.kick
    ? await renderCurrentKickVoiceBuffer(sampleRate)
    : null;
  const renderedSnareVoice = types.includes("snare") && !uploadedSamples.snare
    ? await renderCurrentSnareVoiceBuffer(sampleRate)
    : null;
  const renderedHatVoice = types.includes("hat") && !uploadedSamples.hat
    ? await renderCurrentHatVoiceBuffer(sampleRate)
    : null;

  for (const type of types) {
    const renderedVoice =
      type === "kick" ? renderedKickVoice :
      type === "snare" ? renderedSnareVoice :
      type === "hat" ? renderedHatVoice :
      null;

    scheduleVisiblePatternVoice(
      offline,
      master,
      type,
      secondsPerStep,
      renderSwing,
      mixer[type]?.gain ?? 1,
      renderCols,
      renderedVoice,
      sourceColumns,
    );
  }

  const rendered = await offline.startRendering();
  const loopFrames = Math.round(loopSeconds * sampleRate);
  const outputBuffer = preserveTail
    ? applyLoopSafetyGain(rendered)
    : applyLoopSafetyGain(createLoopBufferWithWrappedTail(rendered, loopFrames));

  return {
    buffer: outputBuffer,
    loopSeconds,
    bars: renderCols,
    mode,
    activeType,
    tempo: renderTempo,
    swing: renderSwing,
    sampleRate,
    mixer,
  };
}

// Reusable offline drum renderer for future interPhace global rendering.
window.DrumPhaceRenderAPI = Object.freeze({
  renderVisible: renderVisiblePattern,
  renderSourceBar({
    activeType,
    sourceBar = 1,
    tempo = readGlobalProjectTempo(),
    swing = readGlobalProjectSwing(),
    respectMute = true,
  } = {}) {
    const safeType = instruments.includes(activeType) ? activeType : "kick";
    const safeBar = Math.max(1, Math.min(8, Math.round(Number(sourceBar) || 1)));
    return renderVisiblePattern({
      mode: "active",
      activeType: safeType,
      tempo,
      swing,
      columns: 1,
      sourceColumns: [safeBar - 1],
      respectMute,
    });
  },
  renderConstructionBar({
    activeType,
    sourceBar = 1,
    tempo = readGlobalProjectTempo(),
    swing = readGlobalProjectSwing(),
  } = {}) {
    const safeType = instruments.includes(activeType) ? activeType : "kick";
    const safeBar = Math.max(1, Math.min(8, Math.round(Number(sourceBar) || 1)));
    return renderVisiblePattern({
      mode: "active", activeType: safeType, tempo, swing, columns: 1,
      sourceColumns: [safeBar - 1], respectMute: false, preserveTail: true,
    });
  },
  async renderOneShot({ activeType, ghost = false } = {}) {
    const type = instruments.includes(activeType) ? activeType : "kick";
    const sampleRate = 44100;
    let buffer = uploadedSamples[type] || (
      type === "kick" ? await renderCurrentKickVoiceBuffer(sampleRate) :
      type === "snare" ? await renderCurrentSnareVoiceBuffer(sampleRate) :
      await renderCurrentHatVoiceBuffer(sampleRate)
    );
    if (!ghost) return { buffer, sampleRate, activeType: type, ghost: false };
    const out = new AudioBuffer({length:buffer.length, numberOfChannels:buffer.numberOfChannels, sampleRate:buffer.sampleRate});
    for (let c=0;c<buffer.numberOfChannels;c++) {
      const a=buffer.getChannelData(c), b=out.getChannelData(c);
      for (let i=0;i<a.length;i++) b[i]=a[i]*0.55;
    }
    return { buffer: out, sampleRate: out.sampleRate, activeType: type, ghost: true };
  },
});

async function startAudition(mode = "active") {
  if (auditionState !== "idle") return;

  const generation = ++auditionGeneration;
  const renderPage = currentPage;
  auditionMode = mode;
  auditionState = "rendering";
  notifyAuditionState();
  updateAuditionColor();
  auditionBtn.disabled = false;
  auditionBtn.setAttribute("aria-label", mode === "all" ? "Rendering full kit" : `Rendering ${renderPage} pattern`);

  try {
    const rendered = await renderVisiblePattern({
      mode,
      activeType: renderPage,
      // Local editing audition always remains available. Mixer dB still
      // applies, but Global Play mute does not.
      respectMute: false,
    });

    if (
      generation !== auditionGeneration ||
      auditionState !== "rendering"
    ) {
      stopAudition();
      return;
    }

    // The luxury of latency: the complete one-bar buffer exists first.
    // Then we deliberately wait one full second before playback.
    await new Promise(resolve => window.setTimeout(resolve, 1000));

    if (
      generation !== auditionGeneration ||
      auditionState !== "rendering"
    ) {
      stopAudition();
      return;
    }

    if (!auditionAudioContext) {
      auditionAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (auditionAudioContext.state === "suspended") await auditionAudioContext.resume();

    const source = auditionAudioContext.createBufferSource();
    const gain = auditionAudioContext.createGain();
    source.buffer = rendered.buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = rendered.loopSeconds;
    gain.gain.value = 1;

    source.connect(gain);
    gain.connect(auditionAudioContext.destination);
    source.start();

    auditionSource = source;
    auditionGain = gain;
    auditionState = "playing";
    notifyAuditionState();
    auditionBtn.disabled = false;
        auditionBtn.setAttribute("aria-label", "Stop audition");
  } catch (error) {
    console.error("Audition render failed", error);
    stopAudition();
  }
}



// Build 221: drumPhace audition follows the active editing context.
// B2 Synth pages render/loop only the active instrument pattern so sound edits
// can be auditioned in isolation. Other drumPhace pages retain full-kit audition.
auditionBtn.addEventListener("click", event => {
  event.preventDefault();

  if (auditionState !== "idle") {
    stopAudition();
    return;
  }

  startAudition(currentView === "synth" ? "active" : "all");
});

auditionBtn.addEventListener("dblclick", event => {
  event.preventDefault();
});

auditionBtn.addEventListener("contextmenu", event => event.preventDefault());

function shortFileName(name) {
  const clean = String(name || "sample").replace(/\.[^.]+$/, "");
  return clean.length > 13 ? `${clean.slice(0, 12)}…` : clean;
}


async function getDecodeContext() {
  if (!auditionAudioContext) auditionAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (auditionAudioContext.state === "suspended") await auditionAudioContext.resume();
  return auditionAudioContext;
}





window.addEventListener("storage", (event) => {
  if (event.key !== GLOBAL_PROJECT_STORAGE_KEY) return;
  if (currentView === "pattern") updateOverlaps();
  // Local audition/export read the global tempo at execution time,
  // so no child tempo state needs to be synchronized.
});

loadLocalState();
rebuildGrids();
updateAuditionColor();

window.addEventListener("interPhace:drumBorders", () => {
  if (currentView === "pattern") updateOverlaps();
});

const drumShellBinding = window.InterPhaceShell?.bind({
  app: "#shell",
  name: "drumPhace",
  accent: getComputedStyle(document.documentElement).getPropertyValue("--drum").trim() || "#ff4b4b",
  line: getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#2a2d33",
  text: getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#f0f1f3",
  muted: getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "#777d87",
  getAuditionState: () => auditionState,
});
