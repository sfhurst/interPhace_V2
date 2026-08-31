// Centralized duration and sample planning for live and offline rendering.
window.RenderPlan = {
  create(patch, sampleRateOverride) {
    const noteLength = AmpEnvelopeEngine.computeLength(patch.envelope.ahdhd);
    const sourceLength = typeof TransientSourceEngine !== "undefined"
      ? TransientSourceEngine.computeRequiredLength(patch, noteLength)
      : noteLength;
    const effectsTail = EffectsEngine.computeTail(patch.fx, patch.tempo);
    const naturalDuration = sourceLength + effectsTail;
    const sampleRate = Math.max(
      22050,
      Math.min(96000, Number(sampleRateOverride ?? patch.sampleRate) || 48000),
    );

    return {
      noteLength,
      sourceLength,
      effectsTail,
      naturalDuration,
      duration: naturalDuration,
      sampleRate,
      frameCount: Math.max(1, Math.ceil(sampleRate * naturalDuration)),
    };
  },
};
