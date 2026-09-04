window.PrettyEnvelopeEngine = (() => {
  "use strict";
  const normal = value => Math.max(0, Math.min(1, (Number(value) || 0) / 100));
  function apply(ctx, input, params = {}, targets = {}) {
    const t0 = ctx.currentTime;
    const attack = .003 + normal(params.attack ?? 15) * .16;
    const bodyDecay = .12 + normal(params.bodyDecay ?? 42) * 1.18;
    const overtoneDecay = .035 + normal(params.overtoneDecay ?? 25) * .62;
    const damp = normal(params.damp ?? 45);
    const release = .015 + normal(params.release ?? 18) * .26;
    const noteLength = Math.min(2, Math.max(bodyDecay, overtoneDecay) + attack + release);
    const amp = ctx.createGain(); amp.gain.setValueAtTime(.0001, t0);
    amp.gain.exponentialRampToValueAtTime(1, t0 + attack);
    amp.gain.exponentialRampToValueAtTime(.0001, t0 + noteLength);
    input.connect(amp);
    const schedule = (gain, base, decay, floor) => {
      if (!gain) return;
      gain.cancelScheduledValues(t0); gain.setValueAtTime(Math.max(.0001, base), t0);
      gain.linearRampToValueAtTime(Math.max(.0001, base * floor), t0 + attack + decay);
    };
    schedule(targets.bodyGain, targets.bodyBase || 1, bodyDecay, .10 + damp * .30);
    schedule(targets.overtoneGain, targets.overtoneBase || 1, overtoneDecay, .015 + damp * .13);
    return { node: amp, noteLength };
  }
  return Object.freeze({ apply });
})();
