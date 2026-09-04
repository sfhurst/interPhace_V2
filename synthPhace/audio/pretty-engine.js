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
    const level = normal(params.level ?? 78);
    const strike = normal(params.strike ?? 12);
    const hollow = normal(params.bloom ?? 45);
    const chime = normal(params.damp ?? 35);
    const tone = normal(params.color ?? 14);
    const motion = normal(params.resonance ?? 14);
    const blend = normal(params.blend ?? 55);
    const output = ctx.createGain();
    output.gain.setValueAtTime(.12 + level * .32, t0);
    const bodyGain = ctx.createGain();
    const overtoneGain = ctx.createGain();
    const bodyBase = .52 + body * .78;
    const overtoneBase = (.08 + harmonics * .88) * (.50 + blend * .50);
    bodyGain.gain.setValueAtTime(bodyBase, t0);
    overtoneGain.gain.setValueAtTime(overtoneBase, t0);
    bodyGain.connect(output); overtoneGain.connect(output);
    const oscillators = [];
    voice.partials.forEach(([ratio, amplitude], index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const softenedRatio = index === 0 ? ratio : ratio * (1 + (hollow * .012));
      osc.frequency.setValueAtTime(frequency * softenedRatio, t0);
      osc.connect(gain); gain.connect(index === 0 ? bodyGain : overtoneGain);
      gain.gain.setValueAtTime(amplitude * (index === 0 ? 1 : .58 + chime * .62), t0);
      osc.start(t0); osc.stop(t0 + Math.max(.05, maxDuration + .05));
      oscillators.push(osc);
      // A restrained stereo pair gives the source a little air without turning
      // it into an FM-style modulation stack.
      if (index > 0 && spread > 0) {
        const side = ctx.createOscillator(); const sideGain = ctx.createGain();
        side.type = "sine"; side.frequency.setValueAtTime(frequency * ratio, t0);
        side.detune.setValueAtTime((index % 2 ? 1 : -1) * (spread * 7 + motion * 3), t0);
        sideGain.gain.setValueAtTime(amplitude * .28 * spread, t0);
        side.connect(sideGain); sideGain.connect(overtoneGain);
        side.start(t0); side.stop(t0 + Math.max(.05, maxDuration + .05));
        oscillators.push(side);
      }
    });
    const color = ctx.createBiquadFilter(); color.type = "lowpass";
    color.frequency.setValueAtTime(900 + tone * 10500 + strike * 3200, t0); color.Q.setValueAtTime(.25 + hollow * .65, t0);
    output.connect(color);
    return { node: color, oscillators, targets: { bodyGain: bodyGain.gain, overtoneGain: overtoneGain.gain, bodyBase, overtoneBase }, voice: voice.name };
  }
  return Object.freeze({ build, VOICES });
})();
