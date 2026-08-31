// ============================================================
//  RACK GRAPH BUILDER
// ============================================================
// Connects rack modules. DSP details remain owned by each module.
window.GraphBuilder = {
  build(ctx, patch, plan = RenderPlan.create(patch, ctx.sampleRate), options = {}) {
    const baseFreq = midiToFreq(patch.midiNote);
    const fmOut = FMEngine.build(ctx, baseFreq, patch.synth.fm, plan.noteLength);
    const envOut = AmpEnvelopeEngine.apply(
      ctx,
      fmOut.node,
      patch.envelope.ahdhd,
      fmOut.modulationTargets,
    );

    let mainBus = envOut.node;

    if (typeof TransientSourceEngine !== "undefined") {
      mainBus = TransientSourceEngine.apply(
        ctx, mainBus, patch.transient, patch.midiNote
      ).node;
    }

    if (patch.filter) mainBus = FilterEngine.apply(ctx, mainBus, patch.filter).node;

    if (typeof TextureEngine !== "undefined") {
      const texture = TextureEngine.apply(
        ctx,
        mainBus,
        patch.texture,
        plan.noteLength,
        patch.midiNote,
        patch.envelope.ahdhd,
      );
      mainBus = texture.mainBus || texture.node || mainBus;
    }

    if (options.stage === "preEffects") {
      return { node: mainBus, noteLength: plan.noteLength, plan };
    }

    mainBus = EffectsEngine.applyAll(
      ctx,
      mainBus,
      patch.fx,
      plan.noteLength,
      patch.tempo,
      { floatOutput: options.masterMode === "float" },
    ).node;


    // Offline float rendering must preserve the completed rack signal so the
    // actual samples can be measured before any final-output correction.
    if (options.masterMode === "float") {
      const floatOutput = ctx.createGain();
      floatOutput.gain.value = 1;
      mainBus.connect(floatOutput);
      return { node: floatOutput, noteLength: plan.noteLength, plan };
    }

    // Real-time fallback safety. Audition no longer uses this path.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.06;
    mainBus.connect(limiter);

    const output = ctx.createGain();
    output.gain.value = 0.92;
    limiter.connect(output);
    return { node: output, noteLength: plan.noteLength, plan };
  },
};
