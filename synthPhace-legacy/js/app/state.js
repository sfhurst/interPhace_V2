// ============================================================
//  GLOBAL PATCH — AUTHORITATIVE SYNTH STATE
// ============================================================
// Engine modules register their owned defaults into this explicit rack shell.
(function () {
  function createDefaultPatch() {
    return {
      midiNote: 60,
      tempo: 120,
      sampleRate: 48000,
      scale: "major",
      arp: {
        sequence: "",
        voices: {
          A: { shape: 0, motion: 0, chance: 0, rate: "1/8" },
          B: { shape: 0, motion: 0, chance: 0, rate: "1/8" },
          C: { shape: 0, motion: 0, chance: 0, rate: "1/8" },
          D: { shape: 0, motion: 0, chance: 0, rate: "1/8" },
        },
      },

      synth: { fm: {} },
      envelope: { ahdhd: {}, fmDepth: {}, filterEnv: {} },
      texture: { preset: 0, amount: 0 },
      transient: { preset: 0, volume: 35 },
      filter: {},
      fx: {
        detune: {},
        chorus: {},
        reverb: {},
        delay: {},
      },
    };
  }

  window.PatchState = Object.freeze({ createDefaultPatch });
  window.patch = createDefaultPatch();
})();
