// ============================================================
//  UI HELPERS
// ============================================================

window.UI = {};

UI.updateRangeFill = (slider) => {
  if (!slider || slider.type !== "range") return;

  const min = Number(slider.min || 0);
  const max = Number(slider.max || 100);
  const value = Number(slider.value);
  const span = max - min;
  const percent = span > 0 ? ((value - min) / span) * 100 : 0;
  const clamped = Math.max(0, Math.min(100, percent));
  const mode = slider.dataset.rangeFill || "left";
  const active = "#00aaff";
  const inactive = "#34383b";
  // Keep the visual break around the hollow knob physically subtle.
  // Convert a small pixel gap to a percentage of this slider's rendered width
  // instead of using a fixed percentage, which became too wide on long sliders.
  const trackWidth = Math.max(1, slider.getBoundingClientRect().width || 1);
  const gapPx = Number(slider.dataset.rangeGapPx || 2);
  const gap = Math.max(0, Math.min(4, (gapPx / trackWidth) * 100));

  let stops;
  if (mode === "none") {
    stops = `${inactive} 0%, ${inactive} 100%`;
  } else if (mode === "right") {
    const before = Math.max(0, clamped - gap);
    const after = Math.min(100, clamped + gap);
    stops = `${inactive} 0%, ${inactive} ${before}%, transparent ${before}%, transparent ${after}%, ${active} ${after}%, ${active} 100%`;
  } else if (mode === "center") {
    const center = Math.max(0, Math.min(100, ((0 - min) / span) * 100));
    const low = Math.min(center, clamped);
    const high = Math.max(center, clamped);
    const lowGapStart = Math.max(0, low - gap);
    const lowGapEnd = Math.min(100, low + gap);
    const highGapStart = Math.max(0, high - gap);
    const highGapEnd = Math.min(100, high + gap);

    if (Math.abs(clamped - center) < 0.0001) {
      stops = `${inactive} 0%, ${inactive} 100%`;
    } else {
      stops = `${inactive} 0%, ${inactive} ${lowGapStart}%, transparent ${lowGapStart}%, transparent ${lowGapEnd}%, ${active} ${lowGapEnd}%, ${active} ${highGapStart}%, transparent ${highGapStart}%, transparent ${highGapEnd}%, ${inactive} ${highGapEnd}%, ${inactive} 100%`;
    }
  } else {
    const before = Math.max(0, clamped - gap);
    const after = Math.min(100, clamped + gap);
    stops = `${active} 0%, ${active} ${before}%, transparent ${before}%, transparent ${after}%, ${inactive} ${after}%, ${inactive} 100%`;
  }

  slider.style.setProperty("--range-track-bg", `linear-gradient(to right, ${stops})`);
};

UI.refreshRangeFills = (root = document) => {
  root.querySelectorAll('input[type="range"]').forEach((slider) => {
    UI.updateRangeFill(slider);
  });
};

UI.initializeRangeFills = () => {
  const sliders = Array.from(document.querySelectorAll('input[type="range"]'));
  sliders.forEach((slider) => {
    UI.updateRangeFill(slider);
    slider.addEventListener("input", () => UI.updateRangeFill(slider));
  });

  // Pixel-based gaps need recalculation if the rack changes width.
  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      sliders.forEach((slider) => UI.updateRangeFill(slider));
    });
  });
};


UI.enableSliderKeyboardAcceleration = () => {
  document.querySelectorAll('input[type="range"]').forEach((slider) => {
    slider.addEventListener("keydown", (event) => {
      if (!event.shiftKey) return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;

      const min = Number(slider.min || 0);
      const max = Number(slider.max || 100);
      const nativeStep = slider.step === "any" ? (max - min) / 100 : Number(slider.step || 1);
      const fastSteps = Number(slider.dataset.fastSteps || 10);
      const direction = (event.key === "ArrowRight" || event.key === "ArrowUp") ? 1 : -1;
      const next = Math.max(min, Math.min(max, Number(slider.value) + direction * nativeStep * fastSteps));

      // Avoid floating-point residue on decimal-step controls.
      const stepText = String(slider.step || "1");
      const decimals = stepText.includes(".") ? stepText.split(".")[1].length : 0;
      slider.value = decimals ? next.toFixed(decimals) : String(Math.round(next));

      event.preventDefault();
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
};

UI.bindSlider = (sliderId, valueId, formatFn) => {
  const slider = document.getElementById(sliderId);
  const value = document.getElementById(valueId);
  if (!slider || !value) return;

  // Preserve starting (default) value for reset on dblclick.
  const initialValue =
    slider.getAttribute("data-default") ?? slider.defaultValue;
  slider.dataset.defaultValue = initialValue;

  const update = () => {
    const v = Number(slider.value);
    value.textContent = formatFn ? formatFn(v) : v;

    UI.updateRangeFill(slider);
  };

  slider.addEventListener("input", update);

  update();
};

UI.bindButtonGroup = (selector, callback) => {
  const buttons = document.querySelectorAll(selector);
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      callback(btn);
    });
  });
};

UI.enableSliderDoubleClickReset = () => {
  document.querySelectorAll('input[type="range"]').forEach((slider) => {
    const initialValue =
      slider.getAttribute("data-default") ?? slider.defaultValue;
    slider.dataset.defaultValue = initialValue;

    slider.addEventListener("dblclick", () => {
      const resetValue = slider.dataset.defaultValue ?? slider.defaultValue;
      slider.value = resetValue;
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
};

UI.captureInitialControlState = () => {
  UI.initialControlState = {
    sliders: {},
    buttonGroups: [],
  };

  document.querySelectorAll('input[type="range"]').forEach((slider) => {
    const defaultValue =
      slider.getAttribute("data-default") ?? slider.defaultValue;
    UI.initialControlState.sliders[slider.id] = defaultValue;
  });

  const buttonGroupSelectors = [
    ".ui-selector-bank",
  ];
  buttonGroupSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((group) => {
      // Render banks are independent multi-select controls. They own their
      // persisted state in render-engine.js and may intentionally have no
      // active button (Chords / Arps), so the generic radio-style reset
      // system must never assign their first button as a default.
      if (group.dataset.selectorGroup?.startsWith("render-")) return;

      const buttons = Array.from(group.querySelectorAll("button"));
      if (!buttons.length) return;
      const activeIndex = buttons.findIndex((btn) =>
        btn.classList.contains("active"),
      );
      UI.initialControlState.buttonGroups.push({
        group,
        activeIndex: activeIndex >= 0 ? activeIndex : 0,
      });
    });
  });
};

UI.resetAllControlsToDefault = (excludedIds = []) => {
  const excluded = new Set(excludedIds);
  if (!UI.initialControlState) return;

  Object.entries(UI.initialControlState.sliders).forEach(
    ([id, defaultValue]) => {
      const slider = document.getElementById(id);
      if (!slider || excluded.has(id)) return;
      slider.value = defaultValue;
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    },
  );

  UI.initialControlState.buttonGroups.forEach(({ group, activeIndex }) => {
    const buttons = Array.from(group.querySelectorAll("button"));
    if (!buttons.length) return;
    buttons.forEach((btn, i) =>
      btn.classList.toggle("active", i === activeIndex),
    );
  });
};


