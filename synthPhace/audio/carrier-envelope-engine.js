(() => {
// ============================================================
//  INTERPHACE PHASE 3 — CONTINUOUS AHDHD ENVELOPE / MODULATION
// ============================================================

const AmpEnvelopeEngine = window.AmpEnvelopeEngine = {};

const { finite, clamp, lerp: interpolate, smoothstep } = window.AudioMath;

const CHARACTER_PRESETS = window.InterPhaceData.CHARACTER_PRESETS;

const INSTRUMENT_BEHAVIORS = window.InterPhaceData.INSTRUMENT_BEHAVIORS;

AmpEnvelopeEngine.register = function (patch) {
  patch.envelope.ahdhd = {
    attack1: 0.04,
    hold1: 0,
    decay1: 0.8,
    decay1Target: 0.1,
    hold2: 1.5,
    decay2: 0.9,
    envMult: 1,
    instrumentBehavior: 0,
    character: 0
  };
};

function timelineFor(envParams) {
  const mult = clamp(envParams.envMult, 0.05, 8);
  const durations = {
    attack: clamp(envParams.attack1, 0, 60) * mult,
    hold1: clamp(envParams.hold1, 0, 60) * mult,
    decay1: clamp(envParams.decay1, 0, 60) * mult,
    hold2: clamp(envParams.hold2, 0, 60) * mult,
    decay2: clamp(envParams.decay2, 0, 60) * mult,
  };

  const points = { start: 0 };
  points.attackEnd = durations.attack;
  points.hold1End = points.attackEnd + durations.hold1;
  points.decay1End = points.hold1End + durations.decay1;
  points.hold2End = points.decay1End + durations.hold2;
  points.end = points.hold2End + durations.decay2;
  return { durations, points, total: points.end };
}

AmpEnvelopeEngine.computeLength = function (envParams) {
  return Math.max(0.02, timelineFor(envParams).total);
};

function baseEnvelopeAt(time, timeline, sustain) {
  const { durations: d, points: p } = timeline;
  const floor = 0.00001;

  if (time <= p.attackEnd) {
    if (d.attack <= 0) return 1;
    return interpolate(floor, 1, smoothstep(time / d.attack));
  }
  if (time <= p.hold1End) return 1;
  if (time <= p.decay1End) {
    if (d.decay1 <= 0) return sustain;
    return interpolate(1, sustain, smoothstep((time - p.hold1End) / d.decay1));
  }
  if (time <= p.hold2End) return sustain;
  if (d.decay2 <= 0) return floor;
  return interpolate(sustain, floor, smoothstep((time - p.hold2End) / d.decay2));
}

function sampleCurve(duration, evaluator, minimumSamples = 256) {
  const count = Math.max(minimumSamples, Math.min(4096, Math.ceil(duration * 480)));
  const curve = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    const normalized = index / Math.max(1, count - 1);
    curve[index] = finite(evaluator(normalized, normalized * duration));
  }
  return curve;
}

function scheduleCurve(param, startTime, duration, curve) {
  param.cancelScheduledValues(startTime);
  if (duration <= 0.0001) {
    param.setValueAtTime(curve[curve.length - 1], startTime);
    return;
  }
  param.setValueCurveAtTime(curve, startTime, duration);
}

function interpolatePoints(points, normalized) {
  if (!points || !points.length) return 0;
  const x = clamp(normalized, 0, 1);
  if (x <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index++) {
    const left = points[index - 1];
    const right = points[index];
    if (x <= right[0]) {
      const span = Math.max(0.000001, right[0] - left[0]);
      return interpolate(left[1], right[1], smoothstep((x - left[0]) / span));
    }
  }
  return points[points.length - 1][1];
}



// ============================================================
// 20-EVENT PHASE-AWARE PERSONALITY ENGINE
// ============================================================
// Instrument Behaviors and Characters use the same event engine. A personality
// owns a flat list of exactly twenty behavioral events. Every event independently
// declares its AHDHD phase and its normalized position inside that phase.
// No phase receives a reserved number of events: all twenty may legally live in
// Attack, Hold 1, Decay 1, Hold 2, or Decay 2.
const MICRO_POINT_COUNT = 20;
const MICRO_PHASES = ["attack", "hold1", "decay1", "hold2", "decay2"];
const MICRO_PHASE_INDEX = Object.freeze(
  MICRO_PHASES.reduce((map, phase, index) => ({ ...map, [phase]: index }), {})
);
const INSTRUMENT_EVENT_DEFAULTS = window.PersonalityAuthoring.INSTRUMENT_DEFAULTS;
const CHARACTER_EVENT_DEFAULTS = window.PersonalityAuthoring.CHARACTER_DEFAULTS;

function requirePhaseName(phase) {
  if (!Object.prototype.hasOwnProperty.call(MICRO_PHASE_INDEX, phase)) {
    throw new Error(`Invalid personality phase: ${phase}`);
  }
  return phase;
}

function compileMicroProfile(profile, kind = profile?.kind) {
  if (!profile || !Array.isArray(profile.events) || profile.events.length !== MICRO_POINT_COUNT) {
    throw new Error(`Invalid personality profile: ${profile?.name || "Unnamed"}`);
  }
  const expectedKind = kind === "character" ? "character" : "instrument";
  if (profile.kind && profile.kind !== expectedKind) {
    throw new Error(`${profile.name} is not a ${expectedKind} profile`);
  }
  return {
    version: 3,
    pointCount: MICRO_POINT_COUNT,
    phases: MICRO_PHASES.slice(),
    events: profile.events,
  };
}

function phaseStartAndDuration(timeline, phase) {
  switch (requirePhaseName(phase)) {
    case "attack": return { start: 0, duration: timeline.durations.attack };
    case "hold1": return { start: timeline.points.attackEnd, duration: timeline.durations.hold1 };
    case "decay1": return { start: timeline.points.hold1End, duration: timeline.durations.decay1 };
    case "hold2": return { start: timeline.points.decay1End, duration: timeline.durations.hold2 };
    case "decay2": return { start: timeline.points.hold2End, duration: timeline.durations.decay2 };
    default: return { start: 0, duration: timeline.total };
  }
}

const resolvedEventCache = new WeakMap();

function resolvedMicroEvents(profile, kind, timeline) {
  if (!profile || !timeline) return [];
  let timelineCache = resolvedEventCache.get(timeline);
  if (!timelineCache) {
    timelineCache = new WeakMap();
    resolvedEventCache.set(timeline, timelineCache);
  }
  const cached = timelineCache.get(profile);
  if (cached) return cached;
  const micro = compileMicroProfile(profile, kind);
  if (!micro?.events?.length) return [];
  const sorted = micro.events.map((event, originalIndex) => {
    const phase = phaseStartAndDuration(timeline, event.phase);
    return {
      ...event,
      originalIndex,
      absoluteTime: phase.start + phase.duration * clamp(event.phasePosition, 0, 1),
    };
  }).sort((left, right) => {
    if (left.absoluteTime !== right.absoluteTime) return left.absoluteTime - right.absoluteTime;
    const phaseDifference = MICRO_PHASE_INDEX[left.phase] - MICRO_PHASE_INDEX[right.phase];
    return phaseDifference || left.phasePosition - right.phasePosition || left.originalIndex - right.originalIndex;
  });

  // Collapse anchors that resolve to the same instant (most commonly when an
  // AHDHD stage has zero duration). The later authored event wins, preventing
  // a one-sample intermediate value at a stage boundary.
  const resolved = [];
  const epsilon = 0.000001;
  for (const event of sorted) {
    const previous = resolved[resolved.length - 1];
    if (previous && Math.abs(event.absoluteTime - previous.absoluteTime) <= epsilon) {
      resolved[resolved.length - 1] = event;
    } else {
      resolved.push(event);
    }
  }
  timelineCache.set(profile, resolved);
  return resolved;
}

function microValue(profile, kind, key, timeline, time, fallback) {
  const events = resolvedMicroEvents(profile, kind, timeline);
  if (!events.length) return fallback;
  const firstValue = finite(events[0][key], fallback);
  if (time <= events[0].absoluteTime) return firstValue;

  for (let index = 1; index < events.length; index++) {
    const left = events[index - 1];
    const right = events[index];
    if (time <= right.absoluteTime) {
      const leftValue = finite(left[key], fallback);
      const rightValue = finite(right[key], fallback);
      const span = right.absoluteTime - left.absoluteTime;
      // Multiple events may intentionally occupy one instant (including a
      // zero-length phase). The later event wins without creating NaN values.
      if (span <= 0.000001) return rightValue;
      return interpolate(leftValue, rightValue, smoothstep((time - left.absoluteTime) / span));
    }
  }
  return finite(events[events.length - 1][key], fallback);
}

function microDescription(profile, kind) {
  const micro = compileMicroProfile(profile, kind);
  return {
    ...micro,
    events: micro.events.map(event => ({ ...event })),
    pointPhases: micro.events.map(event => event.phase),
    phasePositions: micro.events.map(event => event.phasePosition),
  };
}

function modulationWindow(normalized) {
  const fade = 0.06;
  const fadeIn = smoothstep(normalized / fade);
  const fadeOut = smoothstep((1 - normalized) / fade);
  return Math.min(fadeIn, fadeOut);
}

function createContinuousLFO(ctx, targetParam, config, startTime, duration, scale = 1, options = {}) {
  if (!targetParam || !config || duration <= 0) return null;

  const timeline = options.timeline;
  const profile = options.profile;
  const kind = options.kind;
  const rateKey = options.rateKey;
  const depthKey = options.depthKey;
  const baseDepth = finite(config.depth) * scale;

  const depthCurve = sampleCurve(duration, (normalized, time) => {
    const microDepth = timeline && profile && depthKey
      ? microValue(profile, kind, depthKey, timeline, time, baseDepth)
      : baseDepth;
    return microDepth * modulationWindow(normalized);
  });

  // A neutral depth curve cannot affect the target. Avoid constructing and
  // scheduling an oscillator, gain node, and random-rate curve for it.
  const hasAudibleDepth = depthCurve.some(value => Math.abs(value) > 0.000001);
  if (!hasAudibleDepth) return null;

  const oscillator = ctx.createOscillator();
  const depth = ctx.createGain();
  oscillator.type = config.wave || "sine";

  const baseRate = clamp(config.rate, 0.01, 30);
  const randomAmount = clamp(config.randomRate, 0, 0.85);
  const randomSegment = clamp(config.randomSegment || 1, 0.20, 4.0);
  const randomPointCount = Math.max(3, Math.ceil(duration / randomSegment) + 2);
  const randomPoints = [];
  for (let i = 0; i < randomPointCount; i++) {
    const normalized = i / (randomPointCount - 1);
    const variation = randomAmount > 0 ? 1 + ((Math.random() * 2 - 1) * randomAmount) : 1;
    randomPoints.push([normalized, variation]);
  }

  const rateCurve = sampleCurve(duration, (normalized, time) => {
    const microRate = timeline && profile && rateKey
      ? microValue(profile, kind, rateKey, timeline, time, baseRate)
      : baseRate;
    return clamp(microRate * interpolatePoints(randomPoints, normalized), 0.01, 30);
  });

  scheduleCurve(oscillator.frequency, startTime, duration, rateCurve);
  scheduleCurve(depth.gain, startTime, duration, depthCurve);
  oscillator.connect(depth);
  depth.connect(targetParam);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.01);
  return oscillator;
}

function behaviorIndex(envParams) {
  return clamp(envParams.instrumentBehavior, 0, INSTRUMENT_BEHAVIORS.length - 1);
}

function characterIndex(envParams) {
  return clamp(envParams.character, 0, CHARACTER_PRESETS.length - 1);
}

function profileAuthorsField(profile, key) {
  return Array.isArray(profile?.events) && profile.events.some(event =>
    Object.prototype.hasOwnProperty.call(event, key)
  );
}

function applyCompanionBehavior(companions, behavior, startTime, duration, timeline) {
  if (!Array.isArray(companions) || !companions.length || !behavior || duration <= 0) return;

  // Build 86 adds literal H1/H2 gain lanes. Existing factory behaviors still use
  // the older lower/equal/higher musical-classification curves, so they retain
  // their exact sound until each preset is deliberately re-authored.
  const usesH1Gain = profileAuthorsField(behavior, "h1Gain");
  const usesH2Gain = profileAuthorsField(behavior, "h2Gain");

  companions.forEach((companion) => {
    if (!companion?.gain) return;
    const laneGainKey = companion.laneIndex === 2 ? "h2Gain" : "h1Gain";
    const usesLaneGain = companion.laneIndex === 2 ? usesH2Gain : usesH1Gain;

    let gainKey = laneGainKey;
    if (!usesLaneGain) {
      const className = companion.classification === "lower"
        ? "lower"
        : companion.classification === "higher"
          ? "higher"
          : "equal";
      gainKey = className === "lower"
        ? "companionLower"
        : className === "higher"
          ? "companionHigher"
          : "companionEqual";
    }

    const baseGain = Math.max(0, finite(companion.baseGain));
    const curve = sampleCurve(duration, (_normalized, time) =>
      Math.max(0, baseGain * microValue(behavior, "instrument", gainKey, timeline, time, 1))
    );
    scheduleCurve(companion.gain, startTime, duration, curve);

    if (companion.detune) {
      const exciteKey = companion.laneIndex === 2 ? "h2ExciteCents" : "h1ExciteCents";
      const exciteCurve = sampleCurve(duration, (_normalized, time) =>
        microValue(behavior, "instrument", exciteKey, timeline, time, 0)
      );
      scheduleCurve(companion.detune, startTime, duration, exciteCurve);
    }
  });
}

AmpEnvelopeEngine.apply = function (ctx, inputNode, envParams, modulationTargets = {}) {
  const timeline = timelineFor(envParams);
  const noteLength = Math.max(0.02, timeline.total);
  const startTime = ctx.currentTime;
  const sustain = clamp(envParams.decay1Target, 0, 1);

  const envelope = ctx.createGain();
  const baseCurve = sampleCurve(noteLength, (_normalized, time) => baseEnvelopeAt(time, timeline, sustain));
  scheduleCurve(envelope.gain, startTime, noteLength, baseCurve);
  inputNode.connect(envelope);

  const selectedBehaviorIndex = behaviorIndex(envParams);
  const selectedCharacterIndex = characterIndex(envParams);
  const behavior = INSTRUMENT_BEHAVIORS[selectedBehaviorIndex] || INSTRUMENT_BEHAVIORS[0];
  const character = CHARACTER_PRESETS[selectedCharacterIndex] || CHARACTER_PRESETS[0];

  // Harmony companions are core synth voices, not personality effects.
  // Their requested base gains must be audible even when Behavior and Character
  // are both Off. Personality processing may modulate those base gains later.
  if (Array.isArray(modulationTargets.companions)) {
    modulationTargets.companions.forEach(companion => {
      if (!companion?.gain) return;
      const baseGain = Math.max(0, finite(companion.baseGain));
      companion.gain.cancelScheduledValues(startTime);
      companion.gain.setValueAtTime(baseGain, startTime);
    });
  }

  // A real reference state: with both personality selectors Off, the AHDHD
  // envelope goes straight through with no personality gain/filter/LFO nodes.
  if (selectedBehaviorIndex === 0 && selectedCharacterIndex === 0) {
    return { node: envelope, noteLength, timeline };
  }

  let output = envelope;

  // Volume micro-envelopes are always compiled. Neutral profiles resolve to 1.0.
  const modifier = ctx.createGain();
  const combinedCurve = sampleCurve(noteLength, (normalized) => {
    const time = normalized * noteLength;
    const behaviorGain = Math.max(0.02, microValue(behavior, "instrument", "volume", timeline, time, 1));
    const characterGain = Math.max(0.02, microValue(character, "character", "volume", timeline, time, 1));
    return behaviorGain * characterGain;
  });
  scheduleCurve(modifier.gain, startTime, noteLength, combinedCurve);
  envelope.connect(modifier);
  output = modifier;
  createContinuousLFO(ctx, modifier.gain, { rate: 0.01, depth: 0 }, startTime, noteLength, 1, {
    timeline, profile: behavior, kind: "instrument", rateKey: "motionRate", depthKey: "motionDepth"
  });
  createContinuousLFO(ctx, modifier.gain, { ...(character.gain || {}), wave: character.wave }, startTime, noteLength, 1, {
    timeline, profile: character, kind: "character", rateKey: "gainRate", depthKey: "gainDepth"
  });

  // Instrument brightness and character tone are combined continuously.
  // Neutral values leave the filter effectively open.
  {
    const brightnessFilter = ctx.createBiquadFilter();
    brightnessFilter.type = "lowpass";
    brightnessFilter.Q.setValueAtTime(0.55, startTime);
    const nyquistSafe = Math.max(1000, ctx.sampleRate * 0.46);
    const brightnessCurve = sampleCurve(noteLength, (_normalized, time) => {
      let hz = microValue(behavior, "instrument", "brightness", timeline, time, nyquistSafe);
      hz = Math.min(hz, microValue(character, "character", "brightnessHz", timeline, time, nyquistSafe));
      hz *= microValue(character, "character", "brightness", timeline, time, 1);
      return clamp(hz, 180, nyquistSafe);
    });
    scheduleCurve(brightnessFilter.frequency, startTime, noteLength, brightnessCurve);
    createContinuousLFO(ctx, brightnessFilter.detune, character.brightnessMotion, startTime, noteLength, 1, {
      timeline, profile: character, kind: "character", rateKey: "brightnessMotionRate", depthKey: "brightnessMotionDepth"
    });
    output.connect(brightnessFilter);
    output = brightnessFilter;
  }

  if (modulationTargets.detune) {
    const pitchCurve = sampleCurve(noteLength, (_normalized, time) =>
      microValue(behavior, "instrument", "pitch", timeline, time, 0)
    );
    scheduleCurve(modulationTargets.detune, startTime, noteLength, pitchCurve);
  }
  createContinuousLFO(ctx, modulationTargets.detune, { ...(character.pitch || {}), wave: character.wave }, startTime, noteLength, 1, {
    timeline, profile: character, kind: "character", rateKey: "pitchRate", depthKey: "pitchDepth"
  });

  // Character is modulation/tone only; added dirt and noise belong to Noise Source.
  // Character and instrument behavior intentionally never touch FM amount.
  applyCompanionBehavior(modulationTargets.companions, behavior, startTime, noteLength, timeline);

  return {
    node: output,
    noteLength,
    timeline,
  };
};

AmpEnvelopeEngine.getPersonalityNames = function () {
  return CHARACTER_PRESETS.map(item => item.name);
};

AmpEnvelopeEngine.getCharacterNames = AmpEnvelopeEngine.getPersonalityNames;
AmpEnvelopeEngine.getInstrumentBehaviorNames = function () {
  return INSTRUMENT_BEHAVIORS.map(item => item.name);
};

// Read-only framework inspection hooks for future editors/debugging.
AmpEnvelopeEngine.getInstrumentMicroProfile = function (index) {
  const profile = INSTRUMENT_BEHAVIORS[clamp(index, 0, INSTRUMENT_BEHAVIORS.length - 1)];
  return microDescription(profile, "instrument");
};
AmpEnvelopeEngine.getCharacterMicroProfile = function (index) {
  const profile = CHARACTER_PRESETS[clamp(index, 0, CHARACTER_PRESETS.length - 1)];
  return microDescription(profile, "character");
};


AmpEnvelopeEngine.MICRO_POINT_COUNT = MICRO_POINT_COUNT;
AmpEnvelopeEngine.MICRO_PHASES = MICRO_PHASES.slice();

})();
