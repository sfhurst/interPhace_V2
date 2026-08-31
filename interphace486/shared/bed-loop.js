
window.InterPhaceBedLoop = (() => {
  const DEFAULT_OVERLAP_SECONDS = 3;
  const SCHEDULE_HORIZON_SECONDS = 150;
  const REFILL_INTERVAL_MS = 45000;

  function create({
    context,
    buffer,
    destination,
    gain = 1,
    overlapSeconds = DEFAULT_OVERLAP_SECONDS,
    startTime = context.currentTime + 0.02,
  }) {
    if (!context || !buffer || !destination) {
      throw new Error("Bed loop requires context, buffer, and destination.");
    }

    const duration = Math.max(0.1, Number(buffer.duration) || 0.1);
    const overlap = Math.max(0.02, Math.min(duration * 0.45, Number(overlapSeconds) || DEFAULT_OVERLAP_SECONDS));
    const stride = Math.max(0.05, duration - overlap);
    const targetGain = Math.max(0, Number(gain) || 0);
    const nodes = [];
    let stopped = false;
    let nextIndex = 0;
    let refillTimer = null;

    function scheduleOne(index) {
      const when = startTime + index * stride;
      const source = context.createBufferSource();
      const level = context.createGain();
      source.buffer = buffer;

      const fadeIn = index === 0 ? Math.min(0.08, overlap) : overlap;
      level.gain.setValueAtTime(0, when);
      level.gain.linearRampToValueAtTime(targetGain, when + fadeIn);

      const fadeOutStart = Math.max(when + fadeIn, when + duration - overlap);
      level.gain.setValueAtTime(targetGain, fadeOutStart);
      level.gain.linearRampToValueAtTime(0, when + duration);

      source.connect(level);
      level.connect(destination);
      source.start(when);
      source.stop(when + duration + 0.02);

      const node = { source, level, when };
      nodes.push(node);
      source.onended = () => {
        try { source.disconnect(); } catch (_) {}
        try { level.disconnect(); } catch (_) {}
        const i = nodes.indexOf(node);
        if (i >= 0) nodes.splice(i, 1);
      };
    }

    function fillSchedule() {
      if (stopped) return;
      const horizon = context.currentTime + SCHEDULE_HORIZON_SECONDS;
      while (startTime + nextIndex * stride < horizon) {
        scheduleOne(nextIndex++);
      }
    }

    function stop() {
      if (stopped) return;
      stopped = true;
      if (refillTimer) window.clearInterval(refillTimer);
      refillTimer = null;
      const now = context.currentTime;
      nodes.splice(0).forEach(({ source, level }) => {
        try {
          level.gain.cancelScheduledValues(now);
          level.gain.setValueAtTime(level.gain.value, now);
          level.gain.linearRampToValueAtTime(0, now + 0.012);
          source.stop(now + 0.014);
        } catch (_) {}
        window.setTimeout(() => {
          try { source.disconnect(); } catch (_) {}
          try { level.disconnect(); } catch (_) {}
        }, 30);
      });
    }

    fillSchedule();
    refillTimer = window.setInterval(fillSchedule, REFILL_INTERVAL_MS);

    return Object.freeze({
      stop,
      overlapSeconds: overlap,
      strideSeconds: stride,
    });
  }

  return Object.freeze({ create });
})();
