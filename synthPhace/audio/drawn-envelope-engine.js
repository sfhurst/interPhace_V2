// User-drawn FM amplitude contour. The UI supplies a normalized, left-to-right
// curve; invalid or incomplete drawings never reach this engine.
window.DrawnEnvelopeEngine = (() => {
  "use strict";
  function apply(ctx, input, definition) {
    const duration = Math.max(.02, Math.min(20, Number(definition?.duration) || 2));
    const values = Array.isArray(definition?.curve) ? definition.curve : [];
    if (values.length < 8) return null;
    const curve = new Float32Array(values.map(value => Math.max(.0001, Math.min(1, Number(value) || 0))));
    curve[0] = .0001; curve[curve.length - 1] = .0001;
    const envelope = ctx.createGain();
    envelope.gain.setValueCurveAtTime(curve, ctx.currentTime, duration);
    input.connect(envelope);
    return { node: envelope, noteLength: duration };
  }
  return Object.freeze({ apply });
})();
