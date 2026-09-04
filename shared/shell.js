
window.InterPhaceShell = (() => {
  const TOP_IDS = Object.freeze({
    row: "shellTop",
    name: "shellPhaceName",
    audition: "shellAudition",
    brand: "shellBrand",
  });

  const TOP_MARKUP = `
    <div class="shell-name-wrap"><div id="${TOP_IDS.name}" class="shell-name"></div></div>
    <button id="${TOP_IDS.audition}" class="shell-audition auditionBtn" type="button" aria-label="Audition" title="Audition">
      <svg class="play-icon playIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>
      <svg class="stop-icon stopIcon" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
    </button>
    <div id="${TOP_IDS.brand}" class="shell-maker">hurst.audio</div>`;

  function ensureTop(appRoot = document.getElementById("shell")) {
    if (!appRoot) return null;
    const top = appRoot.querySelector(`#${TOP_IDS.row}`);
    if (!top) throw new Error("Shared shell top row not found");
    if (!top.querySelector(`#${TOP_IDS.audition}`)) top.innerHTML = TOP_MARKUP;
    return {
      row: top,
      name: top.querySelector(`#${TOP_IDS.name}`),
      audition: top.querySelector(`#${TOP_IDS.audition}`),
      brand: top.querySelector(`#${TOP_IDS.brand}`),
    };
  }
  const PHACES = [
    { key: "interPhace", label: "iP", color: "#f0f1f3", rootHref: "index.html", childHref: "../index.html" },
    { key: "synthPhace", label: "sP", color: "#00aaff", rootHref: "synthPhace/index.html", childHref: "../synthPhace/index.html" },
    { key: "arpPhace", label: "aP", color: "#ff9f43", rootHref: "arpPhace/index.html?v=200", childHref: "../arpPhace/index.html?v=200" },
    { key: "drumPhace", label: "dP", color: "#ff4b4b", rootHref: "drumPhace/index.html", childHref: "../drumPhace/index.html" },
    { key: "noisePhace", label: "nP", color: "#a76cff", rootHref: "noisePhace/index.html", childHref: "../noisePhace/index.html" },
    { key: "dronePhace", label: "dP", color: "#66e0b3", rootHref: "dronePhace/index.html", childHref: "../dronePhace/index.html" },
  ];

  const INTERPHACE_SETTINGS_PAGE = Object.freeze({
    synthPhace: 1,
    drumPhace: 2,
    arpPhace: 3,
    noisePhace: 4,
    dronePhace: 5,
  });
  const SNAPSHOT_STORAGE_KEY = "interPhace.phaceSnapshots.v1";
  const SNAPSHOT_PHACES = Object.freeze(["synthPhace", "drumPhace", "arpPhace", "noisePhace", "dronePhace"]);
  const SNAPSHOT_SLOT_COUNT = 8;

  function cloneSnapshotValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readSnapshots() {
    const empty = Object.fromEntries(SNAPSHOT_PHACES.map((phace) => [phace, []]));
    try {
      const saved = JSON.parse(localStorage.getItem(SNAPSHOT_STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return empty;
      for (const phace of SNAPSHOT_PHACES) {
        if (!Array.isArray(saved[phace])) continue;
        empty[phace] = saved[phace]
          .filter((snapshot) => snapshot && typeof snapshot === "object" && snapshot.state && typeof snapshot.state === "object")
          .slice(0, SNAPSHOT_SLOT_COUNT);
      }
    } catch (_) {}
    return empty;
  }

  function writeSnapshots(snapshots) {
    try { localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots)); }
    catch (_) {}
  }

  const snapshots = Object.freeze({
    read: readSnapshots,
    hasOpenSlot(phace) {
      return SNAPSHOT_PHACES.includes(phace) && readSnapshots()[phace].length < SNAPSHOT_SLOT_COUNT;
    },
    save(phace, state) {
      if (!SNAPSHOT_PHACES.includes(phace) || !state || typeof state !== "object") return false;
      const all = readSnapshots();
      if (all[phace].length >= SNAPSHOT_SLOT_COUNT) return false;
      all[phace].push({ state: cloneSnapshotValue(state) });
      writeSnapshots(all);
      return true;
    },
    restore(phace, index) {
      const snapshot = readSnapshots()[phace]?.[index];
      return snapshot ? cloneSnapshotValue(snapshot.state) : null;
    },
    remove(phace, index) {
      if (!SNAPSHOT_PHACES.includes(phace)) return false;
      const all = readSnapshots();
      if (!all[phace]?.[index]) return false;
      all[phace].splice(index, 1);
      writeSnapshots(all);
      return true;
    },
  });

  function hrefForPhace(currentPhace, targetPhace) {
    const isRoot = currentPhace === "interPhace";
    const href = isRoot ? targetPhace.rootHref : targetPhace.childHref;
    const settingsPage = INTERPHACE_SETTINGS_PAGE[currentPhace];
    return !isRoot && targetPhace.key === "interPhace" && settingsPage
      ? `${href}?settings=${settingsPage}`
      : href;
  }

  function snapshotButton(button) {
    return {
      className: button.className,
      innerHTML: button.innerHTML,
      disabled: button.disabled,
      title: button.getAttribute("title"),
      ariaLabel: button.getAttribute("aria-label"),
      ariaPressed: button.getAttribute("aria-pressed"),
    };
  }

  function restoreButton(button, state) {
    button.className = state.className;
    button.innerHTML = state.innerHTML;
    button.disabled = state.disabled;

    if (state.title == null) button.removeAttribute("title");
    else button.setAttribute("title", state.title);

    if (state.ariaLabel == null) button.removeAttribute("aria-label");
    else button.setAttribute("aria-label", state.ariaLabel);

    if (state.ariaPressed == null) button.removeAttribute("aria-pressed");
    else button.setAttribute("aria-pressed", state.ariaPressed);
  }

  function installPhaceSelector(appRoot, currentPhace, { canSnapshot, onSnapshot } = {}) {
    const row = appRoot.querySelector(".shell-bottom-main");
    const buttons = Array.from({ length: 6 }, (_, i) =>
      appRoot.querySelector(`#shellB${i + 1}`)
    );

    if (!row || buttons.some((button) => !button)) return null;

    let normalState = buttons.map(snapshotButton);
    let selectorOpen = false;
    let suppressNextB6Click = false;
    let suppressB6ClickTimer = null;
    let b6HoldTimer = null;
    let b6HoldFrame = 0;
    let b6HoldStart = 0;
    let b6Holding = false;
    let b6HoldFired = false;
    const B6_HOLD_MS = 900;
    const B6_FILL_DELAY_MS = 200;
    const b6 = buttons[5];

    const setB6HoldFill = (percent) => {
      b6.style.setProperty("--snapshot-hold-fill", `${Math.max(0, Math.min(100, Number(percent) || 0))}%`);
    };
    const cancelB6Hold = () => {
      b6Holding = false;
      if (b6HoldTimer !== null) clearTimeout(b6HoldTimer);
      b6HoldTimer = null;
      if (b6HoldFrame) cancelAnimationFrame(b6HoldFrame);
      b6HoldFrame = 0;
      setB6HoldFill(0);
    };
    const paintB6Hold = (now) => {
      if (!b6Holding || b6HoldFired) return;
      setB6HoldFill(Math.max(0, ((now - b6HoldStart - B6_FILL_DELAY_MS) / (B6_HOLD_MS - B6_FILL_DELAY_MS)) * 100));
      b6HoldFrame = requestAnimationFrame(paintB6Hold);
    };

    b6.addEventListener("pointerdown", (event) => {
      if (selectorOpen || (event.pointerType === "mouse" && event.button !== 0)) return;
      b6HoldFired = false;
      cancelB6Hold();
      b6Holding = true;
      b6HoldStart = performance.now();
      const canSave = typeof canSnapshot === "function" && canSnapshot();
      if (canSave) b6HoldFrame = requestAnimationFrame(paintB6Hold);
      b6HoldTimer = window.setTimeout(() => {
        b6HoldTimer = null;
        if (!b6Holding || selectorOpen) return;
        b6HoldFired = true;
        suppressNextB6Click = true;
        if (suppressB6ClickTimer) clearTimeout(suppressB6ClickTimer);
        suppressB6ClickTimer = window.setTimeout(() => { suppressNextB6Click = false; }, 1000);
        if (canSave) {
          setB6HoldFill(100);
          onSnapshot?.();
        }
      }, B6_HOLD_MS);
    });
    b6.addEventListener("pointerup", (event) => {
      if (b6HoldFired) event.preventDefault();
      cancelB6Hold();
    });
    ["pointercancel", "pointerleave"].forEach((type) => b6.addEventListener(type, cancelB6Hold));

    function showSelector() {
      normalState = buttons.map(snapshotButton);
      selectorOpen = true;
      row.classList.add("phace-selector-open");

      PHACES.forEach((phace, index) => {
        const button = buttons[index];
        const active = phace.key === currentPhace;

        button.className = `shell-phace-select-btn${active ? " active" : ""}`;
        button.style.setProperty("--phace-select-color", phace.color);
        button.innerHTML = `<span class="phace-short-label">${phace.label}</span>`;
        button.disabled = false;
        button.setAttribute("aria-label", phace.key);
        button.setAttribute("title", phace.key);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });

    }

    function hideSelector() {
      selectorOpen = false;
      row.classList.remove("phace-selector-open");
      buttons.forEach((button, index) => {
        button.style.removeProperty("--phace-select-color");
        restoreButton(button, normalState[index]);
      });
    }

    // Capture phase is intentional: while selector mode is open, the shell
    // temporarily owns B1-B6 without firing the page's normal button handlers.
    row.addEventListener("click", (event) => {
      const button = event.target.closest("[id^='shellB']");
      if (!button || !row.contains(button)) return;

      const index = Number(button.id.replace("shellB", "")) - 1;

      if (index === 5 && suppressNextB6Click) {
        suppressNextB6Click = false;
        if (suppressB6ClickTimer) clearTimeout(suppressB6ClickTimer);
        suppressB6ClickTimer = null;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (!selectorOpen) {
        if (index !== 5) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showSelector();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (index < 0 || index >= PHACES.length) return;

      const targetPhace = PHACES[index];
      if (targetPhace.key === currentPhace) {
        hideSelector();
        return;
      }

      window.location.href = hrefForPhace(currentPhace, targetPhace);
    }, true);

    return {
      show: showSelector,
      hide: hideSelector,
      get isOpen() { return selectorOpen; },
    };
  }


  function installSliderDefaultReset() {
    if (document.documentElement.dataset.sliderDefaultResetBound === "1") return;
    document.documentElement.dataset.sliderDefaultResetBound = "1";

    document.addEventListener("dblclick", (event) => {
      const slider = event.target?.closest?.('input[type="range"]');
      if (!slider) return;

      // interPhace mixer sliders reserve double-click for mute/unmute.
      if (slider.classList.contains("mixerSlider")) return;

      const defaultValue = slider.getAttribute("value");
      if (defaultValue === null) return;

      slider.value = defaultValue;
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }


  function installSliderLabelValueResetTargets(root = document) {
    const sliders = root.querySelectorAll('input[type="range"]');

    sliders.forEach(slider => {
      const targets = [];
      const id = slider.id;

      if (id) {
        const esc = (window.CSS && CSS.escape) ? CSS.escape(id) : id.replace(/"/g, '\\"');
        const explicitLabel = document.querySelector(`label[for="${esc}"]`);
        if (explicitLabel) targets.push(explicitLabel);

        const idLabel = document.getElementById(`${id}_label`);
        if (idLabel) targets.push(idLabel);

        const idValue = document.getElementById(`${id}_value`);
        if (idValue) targets.push(idValue);
      }

      const parent =
        slider.closest(".macroControl, .control, .settingRow, .sliderRow, .mixerRow, .controlRow, .rangeRow")
        || slider.parentElement;

      if (parent) {
        parent.querySelectorAll(
          ".macroLabel, .macroValue, .control-label, .control-value, .settingLabel, .tempoValue, .sliderLabel, .sliderValue, label, output"
        ).forEach(el => targets.push(el));
      }

      [...new Set(targets)].forEach(target => {
        if (!target || target === slider || target.dataset.sliderResetTargetBound === "1") return;
        target.dataset.sliderResetTargetBound = "1";

        const fireSliderDoubleClick = event => {
          event.preventDefault();
          event.stopPropagation();
          slider.dispatchEvent(new MouseEvent("dblclick", {
            bubbles: true,
            cancelable: true,
            view: window,
          }));
        };

        target.addEventListener("dblclick", fireSliderDoubleClick);

        let lastTouchEnd = 0;
        target.addEventListener("touchend", event => {
          const now = performance.now();
          if (now - lastTouchEnd <= 360) {
            lastTouchEnd = 0;
            fireSliderDoubleClick(event);
          } else {
            lastTouchEnd = now;
          }
        }, { passive: false });
      });
    });
  }


  function createBackgroundSelectionAutoGroup(options) {
    const grid = typeof options.grid === "string"
      ? document.querySelector(options.grid)
      : options.grid;
    if (!grid) return null;

    const items = (options.items || []).filter((item) => item?.element);
    if (!items.length) return null;

    const getForegroundElements = () => {
      if (typeof options.foreground === "function") {
        return Array.from(options.foreground() || []).filter(Boolean);
      }
      if (typeof options.foreground === "string") {
        return Array.from(document.querySelectorAll(options.foreground));
      }
      if (options.foreground instanceof Element) return [options.foreground];
      return Array.from(options.foreground || []).filter(Boolean);
    };

    const maxOffset = Math.max(...items.map((item) => Number(item.rowOffset) || 0));
    let frame = 0;

    function gridMetrics() {
      const rect = grid.getBoundingClientRect();
      const styles = getComputedStyle(grid);
      const gap = parseFloat(styles.rowGap || styles.gap || "0") || 0;
      const rowHeight = Math.max(0, (rect.height - gap * 15) / 16);
      return { rect, gap, rowHeight };
    }

    function foregroundBottom() {
      let bottom = grid.getBoundingClientRect().top;
      getForegroundElements().forEach((element) => {
        if (!(element instanceof Element)) return;
        const styles = getComputedStyle(element);
        if (styles.display === "none" || styles.visibility === "hidden") return;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        bottom = Math.max(bottom, rect.bottom);
      });
      return bottom;
    }

    function findFirstSafeRow() {
      const { rect, gap, rowHeight } = gridMetrics();
      if (rowHeight <= 0) return 1;

      const clearBelow = foregroundBottom() + gap;
      let row = 1;

      for (; row <= 16; row += 1) {
        const rowTop = rect.top + (row - 1) * (rowHeight + gap);
        if (rowTop >= clearBelow) break;
      }

      const latestStart = Math.max(1, 16 - maxOffset);
      return Math.max(1, Math.min(row, latestStart));
    }

    function layout() {
      frame = 0;
      const startRow = findFirstSafeRow();
      items.forEach((item) => {
        const offset = Number(item.rowOffset) || 0;
        const col = Number(item.col) || 0;
        const colSpan = Math.max(1, Number(item.colSpan) || 1);
        item.element.style.gridRow = String(startRow + offset);
        // Grid column 1 is the fixed label track; data column A begins at CSS column 2.
        item.element.style.gridColumn = colSpan > 1
          ? `${col + 2} / span ${colSpan}`
          : String(col + 2);
        item.element.dataset.autoGridRow = String(startRow + offset);
        item.element.dataset.autoGridCol = String(col);
      });
      if (typeof options.onLayout === "function") options.onLayout(startRow);
    }

    function schedule() {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    }

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(schedule)
      : null;
    resizeObserver?.observe(grid);
    getForegroundElements().forEach((element) => resizeObserver?.observe(element));
    window.addEventListener("resize", schedule, { passive: true });

    schedule();

    return {
      layout,
      schedule,
      destroy() {
        if (frame) cancelAnimationFrame(frame);
        resizeObserver?.disconnect();
        window.removeEventListener("resize", schedule);
      },
    };
  }


  function installKeyboardPhaceNavigation(currentPhace) {
    function isEditableTarget(target) {
      if (!target || !(target instanceof Element)) return false;
      return Boolean(
        target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
      );
    }

    function navigateBy(offset) {
      const currentIndex = PHACES.findIndex((phace) => phace.key === currentPhace);
      if (currentIndex < 0) return;
      const nextIndex = (currentIndex + offset + PHACES.length) % PHACES.length;
      window.location.href = hrefForPhace(currentPhace, PHACES[nextIndex]);
    }

    window.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === "PageDown") {
        event.preventDefault();
        navigateBy(1);
      } else if (event.key === "PageUp") {
        event.preventDefault();
        navigateBy(-1);
      }
    });
  }


  function installSpacebarAudition(appRoot, auditionBtn) {
    if (!appRoot || !auditionBtn) return;
    if (appRoot.dataset.spacebarAuditionBound === "1") return;
    appRoot.dataset.spacebarAuditionBound = "1";

    function isTextEditingTarget(target) {
      if (!target || !(target instanceof Element)) return false;

      if (target.closest('textarea, [contenteditable="true"], [contenteditable=""]')) {
        return true;
      }

      const input = target.closest("input");
      if (!input) return false;

      const type = String(input.type || "text").toLowerCase();
      return [
        "text", "search", "email", "url", "tel", "password",
        "number", "date", "datetime-local", "month", "time", "week"
      ].includes(type);
    }

    window.addEventListener("keydown", event => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code !== "Space" && event.key !== " ") return;
      if (isTextEditingTarget(event.target)) return;

      event.preventDefault();
      event.stopPropagation();

      if (!auditionBtn.disabled) auditionBtn.click();
    });
  }


  async function paintBeforeSynchronousWork() {
    // Two animation-frame boundaries guarantee the rendering-state DOM/CSS has
    // been committed to screen before a long synchronous render blocks the UI.
    await new Promise(resolve => requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    }));
  }

  function clampSwingPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, numeric));
  }

  function swungSixteenthTime(positionSixteenths, sixteenthSeconds, swingPercent = 0) {
    const position = Math.max(0, Number(positionSixteenths) || 0);
    const stepSeconds = Math.max(0, Number(sixteenthSeconds) || 0);
    const swing = clampSwingPercent(swingPercent);

    // Swing is applied to the second sixteenth in each pair. Fractional
    // substeps inside that sixteenth inherit the same delay so 32nd-note
    // gestures keep their internal spacing.
    const sixteenthIndex = Math.floor(position + 1e-9);
    const swingDelay = sixteenthIndex % 2 === 1
      ? stepSeconds * 0.5 * (swing / 100)
      : 0;

    return (position * stepSeconds) + swingDelay;
  }

  function readMixerChannelGain(channel, { respectMute = true } = {}) {
    try {
      const saved = JSON.parse(localStorage.getItem("interPhace.interPhace.ui.v2") || "null") || {};
      const db = Number(saved?.mixer?.[channel] ?? 0);
      const muted = saved?.muted?.[channel] === true;
      const gain = Math.pow(10, db / 20);
      return Object.freeze({
        db,
        muted,
        gain: respectMute && muted ? 0 : gain,
      });
    } catch (_) {
      return Object.freeze({ db: 0, muted: false, gain: 1 });
    }
  }

  function bind(config) {
    const {
      app,
      name,
      accent,
      line,
      text,
      muted,
      getAuditionState,
      isPlaying,
      auditionDisabled = false,
      canSnapshot,
      onSnapshot,
    } = config;

    const appRoot = document.querySelector(app);
    if (!appRoot) throw new Error("Shell app root not found");

    installSliderLabelValueResetTargets(appRoot);

    appRoot.style.setProperty("--shell-accent", accent || "#8d939c");
    if (line) appRoot.style.setProperty("--shell-line", line);
    if (text) appRoot.style.setProperty("--shell-text", text);
    if (muted) appRoot.style.setProperty("--shell-muted", muted);

    const top = ensureTop(appRoot);
    const nameEl = top?.name;
    if (nameEl) nameEl.textContent = name;

    const auditionBtn = top?.audition;
    if (auditionBtn) auditionBtn.disabled = !!auditionDisabled;

    installSpacebarAudition(appRoot, auditionBtn);

    function normalizedAuditionState() {
      if (typeof getAuditionState === "function") {
        const state = String(getAuditionState() || "idle").toLowerCase();
        if (state === "rendering" || state === "playing") return state;
        return "idle";
      }
      return typeof isPlaying === "function" && isPlaying() ? "playing" : "idle";
    }

    function syncPlaying() {
      if (!auditionBtn) return;
      const state = normalizedAuditionState();
      const active = state !== "idle";
      auditionBtn.classList.toggle("is-playing", active);
      auditionBtn.classList.toggle("is-rendering", state === "rendering");
      auditionBtn.dataset.auditionState = state;
      auditionBtn.setAttribute(
        "aria-label",
        state === "rendering" ? "Cancel rendering" :
        state === "playing" ? "Stop" :
        "Audition"
      );
    }

    syncPlaying();
    const auditionStateEvent = "interPhace:audition-state";
    window.addEventListener(auditionStateEvent, syncPlaying);
    const timer = window.setInterval(syncPlaying, 100);
    window.addEventListener("beforeunload", () => {
      clearInterval(timer);
      window.removeEventListener(auditionStateEvent, syncPlaying);
    }, { once: true });

    const phaceSelector = installPhaceSelector(appRoot, name, { canSnapshot, onSnapshot });
    installKeyboardPhaceNavigation(name);

    return { auditionBtn, syncPlaying, phaceSelector };
  }

  ensureTop();
  installSliderDefaultReset();
  installSliderLabelValueResetTargets(document);

  return {
    bind,
    ensureTop,
    TOP_IDS,
    createBackgroundSelectionAutoGroup,
    paintBeforeSynchronousWork,
    readMixerChannelGain,
    swungSixteenthTime,
    snapshots,
  };
})();
