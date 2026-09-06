// A dedicated tonal-percussion source.  It is intentionally separate from FM:
// no carrier/modulator/body-stack wiring is shared before the transient stage.
window.PrettyEngine = (() => {
  "use strict";
  const clamp = (value, low, high) => Math.max(low, Math.min(high, Number(value) || 0));
  const normal = value => clamp(value, 0, 100) / 100;
  const VOICES = Object.freeze([
    { name: "Round", partials: [[1, 1], [2, .07], [3, .025]] },
    { name: "Hollow", partials: [[1, .82], [2, .04], [3, .17], [5, .05]] },
    { name: "Bell", partials: [[1, .68], [2, .20], [3, .10], [4, .035]] },
    { name: "Mallet", partials: [[1, .86], [2, .15], [3, .06]] },
    { name: "Key", partials: [[1, .9], [2, .1], [4, .028]] },
  ]);

  function build(ctx, frequency, params = {}, maxDuration = 2) {
    const t0 = ctx.currentTime;
    const voice = VOICES[Math.round(clamp(params.voice, 0, VOICES.length - 1))] || VOICES[0];
    const body = normal(params.body ?? 60);
    const harmonics = normal(params.harmonics ?? 28);
    const spread = normal(params.spread ?? 0);
    const hollow = normal(params.bloom ?? 45);
    // Reserve the obvious cavity shift for the right end of the slider.
    const hollowShape = hollow * hollow;
    const chime = normal(params.damp ?? 35);
    const tone = normal(params.color ?? 14);
    const toneShape = tone * tone;
    const tremolo = normal(params.resonance ?? 0);
    const blend = normal(params.blend ?? 55);
    const volume = normal(params.volume ?? 80);
    const output = ctx.createGain();
    // 80% reproduces the former fixed Pretty output. The final fifth of
    // Pretty Volume provides 25% more amplitude when the source needs it.
    output.gain.setValueAtTime(.44 * (volume / .80), t0);
    const dryBus = ctx.createGain();
    const wetSource = ctx.createGain();
    const wetColor = ctx.createBiquadFilter();
    const tremoloGain = ctx.createGain();
    const wetMix = ctx.createGain();
    const dryBodyGain = ctx.createGain();
    const dryOvertoneGain = ctx.createGain();
    const wetBodyGain = ctx.createGain();
    const wetOvertoneGain = ctx.createGain();
    const toneGain = ctx.createGain();
    const chimeGain = ctx.createGain();
    const bodyBase = .52 + body * .78;
    const overtoneBase = .08 + harmonics * .88;
    const toneBase = toneShape;
    // Chime is a color layer. Its full slider travel intentionally reaches
    // only 30% of the former full-scale ring so generated patches cannot be
    // dominated by it.
    const chimeBase = chime * .30;
    dryBodyGain.gain.setValueAtTime(bodyBase, t0);
    dryOvertoneGain.gain.setValueAtTime(overtoneBase, t0);
    wetBodyGain.gain.setValueAtTime(bodyBase, t0);
    wetOvertoneGain.gain.setValueAtTime(overtoneBase, t0);
    toneGain.gain.setValueAtTime(toneBase, t0);
    chimeGain.gain.setValueAtTime(chimeBase, t0);
    dryBus.gain.setValueAtTime(1 - blend, t0);
    wetMix.gain.setValueAtTime(blend, t0);
    dryBodyGain.connect(dryBus); dryOvertoneGain.connect(dryBus);
    wetBodyGain.connect(wetSource); wetOvertoneGain.connect(wetSource);
    toneGain.connect(wetSource); chimeGain.connect(wetSource);
    // Tremolo belongs to Pretty's treated path only: Blend at the left still
    // gives the untouched B1 P1 foundation, while the right side can pulse.
    // Its rate and depth both rise with the slider, but its peak remains at
    // unity so it never adds level or creates a gain jump at note start.
    const tremoloDepth = tremolo * .48;
    tremoloGain.gain.setValueAtTime(1 - tremoloDepth, t0);
    wetSource.connect(wetColor).connect(tremoloGain).connect(wetMix);
    dryBus.connect(output); wetMix.connect(output);
    const oscillators = [];
    if (tremolo > 0) {
      const tremoloLfo = ctx.createOscillator();
      const tremoloAmount = ctx.createGain();
      tremoloLfo.type = "sine";
      tremoloLfo.frequency.setValueAtTime(.35 + Math.pow(tremolo, 1.3) * 8.65, t0);
      tremoloAmount.gain.setValueAtTime(tremoloDepth, t0);
      tremoloLfo.connect(tremoloAmount).connect(tremoloGain.gain);
      tremoloLfo.start(t0); tremoloLfo.stop(t0 + Math.max(.05, maxDuration + .05));
      oscillators.push(tremoloLfo);
    }
    voice.partials.forEach(([ratio, amplitude], index) => {
      const dryOsc = ctx.createOscillator(); const dryGain = ctx.createGain();
      const wetOsc = ctx.createOscillator(); const wetGain = ctx.createGain();
      dryOsc.type = wetOsc.type = "sine";
      const softenedRatio = index === 0 ? ratio : ratio * (1 + (hollowShape * .036));
      const targetDry = index === 0 ? dryBodyGain : dryOvertoneGain;
      const targetWet = index === 0 ? wetBodyGain : wetOvertoneGain;
      dryOsc.frequency.setValueAtTime(frequency * ratio, t0);
      wetOsc.frequency.setValueAtTime(frequency * softenedRatio, t0);
      dryGain.gain.setValueAtTime(amplitude * (index === 0 ? 1 : .80), t0);
      wetGain.gain.setValueAtTime(amplitude * (index === 0 ? 1 : .80), t0);
      dryOsc.connect(dryGain); dryGain.connect(targetDry);
      wetOsc.connect(wetGain); wetGain.connect(targetWet);
      [dryOsc, wetOsc].forEach(osc => {
        osc.start(t0); osc.stop(t0 + Math.max(.05, maxDuration + .05));
        oscillators.push(osc);
      });
      // A restrained static companion thickens the source without adding an
      // FM-style modulation stack or competing with spatial effects.
      if (index > 0 && spread > 0) {
        const drySide = ctx.createOscillator(); const drySideGain = ctx.createGain();
        const wetSide = ctx.createOscillator(); const wetSideGain = ctx.createGain();
        drySide.type = wetSide.type = "sine";
        drySide.frequency.setValueAtTime(frequency * ratio, t0);
        wetSide.frequency.setValueAtTime(frequency * ratio, t0);
        // Static source voicing, deliberately separate from the downstream
        // Width, Detune, and Chorus effects. At full travel this is 2.5x the
        // prior companion detune and presence, while remaining mono.
        const direction = index % 2 ? 1 : -1;
        drySide.detune.setValueAtTime(direction * spread * 17.5, t0);
        wetSide.detune.setValueAtTime(direction * spread * 17.5, t0);
        drySideGain.gain.setValueAtTime(amplitude * .70 * spread, t0);
        wetSideGain.gain.setValueAtTime(amplitude * .70 * spread, t0);
        drySide.connect(drySideGain); drySideGain.connect(dryOvertoneGain);
        wetSide.connect(wetSideGain); wetSideGain.connect(wetOvertoneGain);
        [drySide, wetSide].forEach(osc => {
          osc.start(t0); osc.stop(t0 + Math.max(.05, maxDuration + .05));
          oscillators.push(osc);
        });
      }
    });
    // Tone owns this clean, decaying brightness layer. Unlike Harmonics, it
    // remains available when the voice itself begins with very little upper
    // material, so its right end can always make a clear tonal change.
    if (toneBase > 0) {
      [[2, .34], [3, .16], [4, .07]].forEach(([ratio, amplitude]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency * ratio, t0);
        gain.gain.setValueAtTime(amplitude, t0);
        osc.connect(gain); gain.connect(toneGain);
        osc.start(t0); osc.stop(t0 + Math.max(.05, maxDuration + .05));
        oscillators.push(osc);
      });
    }
    // Chime is a separate, short inharmonic ring—not another gain trim on
    // the voice's existing partials. Its non-integer ratios keep it distinct
    // from Tone's clean harmonic brightness layer.
    if (chimeBase > 0) {
      [[2.76, .30], [4.13, .14], [5.41, .065]].forEach(([ratio, amplitude]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency * ratio, t0);
        gain.gain.setValueAtTime(amplitude, t0);
        osc.connect(gain); gain.connect(chimeGain);
        osc.start(t0); osc.stop(t0 + Math.max(.05, maxDuration + .05));
        oscillators.push(osc);
      });
    }
    // Tone owns the broad dark-to-open voicing range.
    wetColor.type = "lowpass";
    wetColor.frequency.setValueAtTime(200 + toneShape * 15800, t0);
    wetColor.Q.setValueAtTime(.45, t0);
    return { node: output, oscillators, targets: { dryBodyGain: dryBodyGain.gain, dryOvertoneGain: dryOvertoneGain.gain, wetBodyGain: wetBodyGain.gain, wetOvertoneGain: wetOvertoneGain.gain, toneGain: toneGain.gain, chimeGain: chimeGain.gain, bodyBase, overtoneBase, toneBase, chimeBase }, voice: voice.name };
  }
  return Object.freeze({ build, VOICES });
})();
