// interPhace application bootstrap. Controllers are loaded before this file.

// ============================================================
//  BOOT SEQUENCE
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  try {
    window.addEventListener(
      "click",
      () => {
        try {
          if (
            window.playbackContext &&
            window.playbackContext.state === "suspended"
          ) {
            window.playbackContext.resume();
          }
        } catch (err) {
          console.error("Error resuming audio context:", err);
        }
      },
      { once: true },
    );

    if (typeof FMEngine !== "undefined") FMEngine.register(patch);
    if (typeof ScaleEngine !== "undefined") ScaleEngine.register(patch);
    if (typeof AmpEnvelopeEngine !== "undefined")
      AmpEnvelopeEngine.register(patch);
    if (typeof FilterEngine !== "undefined") FilterEngine.register(patch);
    if (typeof EffectsEngine !== "undefined") EffectsEngine.register(patch);
    if (typeof TextureEngine !== "undefined") TextureEngine.register(patch);
    if (typeof TransientSourceEngine !== "undefined") TransientSourceEngine.register(patch);
    if (typeof ArpEngine !== "undefined") ArpEngine.register(patch);

    initAccordionUI();
    initCarrierUI();
    if (typeof ScaleEngine !== "undefined") ScaleEngine.initUI(patch);
    initTempoUI();
    if (typeof ArpEngine !== "undefined") ArpEngine.initUI(patch);
    initCarrierVolumeUI();
    initHarmonicsUI();
    initPresetUI();
    initEnvelopeUI();

    if (typeof FMEngine !== "undefined") FMEngine.initUI(patch);
    if (typeof FilterController !== "undefined") FilterController.initUI(patch);
    if (typeof EffectsEngine !== "undefined") EffectsEngine.initUI(patch);
    if (typeof TextureEngine !== "undefined") TextureEngine.initUI(patch);
    if (typeof TransientSourceEngine !== "undefined") TransientSourceEngine.initUI(patch);
    if (typeof RenderEngine !== "undefined") {
      RenderEngine.initRenderUI(patch);
      RenderEngine.initPlaybackUI(patch);
    }

    UI.enableSliderDoubleClickReset();
    UI.enableSliderKeyboardAcceleration();
    UI.captureInitialControlState();
    UI.initializeRangeFills();

    // Load saved session after all UI is initialized
    loadSession();

    // Auto-save session whenever any control changes
    setupAutoSave();

    console.log("✅ interPhace initialized successfully");
  } catch (err) {
    console.error("❌ Error initializing interPhace:", err);
    alert("Failed to initialize audio. Please refresh the page.");
  }
});

