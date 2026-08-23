// ============================================================
//  PERSONALITY PROFILE AUTHORING
// ============================================================
// Factory profiles remain explicit 20-event timelines. Neutral parameter
// values are supplied here so personality files only state what changes.
(function () {
  const PHASES = Object.freeze(["attack", "hold1", "decay1", "hold2", "decay2"]);

  const SHARED_DEFAULTS = Object.freeze({
    volume: 1,
    pitch: 0,
    motionRate: 0,
    motionDepth: 0,
    gainRate: 0,
    gainDepth: 0,
    pitchRate: 0,
    pitchDepth: 0,
    brightnessMotionRate: 0,
    brightnessMotionDepth: 0,
  });

  const INSTRUMENT_DEFAULTS = Object.freeze({
    ...SHARED_DEFAULTS,
    brightness: 22000,
    brightnessHz: 22000,
    companionLower: 1,
    companionEqual: 1,
    companionHigher: 1,
    h1ExciteCents: 0,
    h2ExciteCents: 0,
  });

  const CHARACTER_DEFAULTS = Object.freeze({
    ...SHARED_DEFAULTS,
    brightness: 1,
    brightnessHz: 22000,
  });

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  function makeEvent(defaults, id, phase, phasePosition, values = {}) {
    if (!Number.isInteger(id) || id < 1) throw new Error(`Invalid personality event id: ${id}`);
    if (!PHASES.includes(phase)) throw new Error(`Invalid personality phase: ${phase}`);
    const position = Number(phasePosition);
    if (!Number.isFinite(position) || position < 0 || position > 1) {
      throw new Error(`Invalid personality phase position: ${phasePosition}`);
    }
    return { id, phase, phasePosition: position, ...defaults, ...values };
  }

  function makeProfile(kind, name, events, extras = {}) {
    if (!name || typeof name !== "string") throw new Error("Personality profile requires a name");
    if (!Array.isArray(events) || events.length !== 20) {
      throw new Error(`${name} must contain exactly 20 events`);
    }
    const ids = new Set(events.map(event => event.id));
    if (ids.size !== events.length) throw new Error(`${name} contains duplicate event ids`);
    return deepFreeze({ name, kind, events, ...extras });
  }

  window.PersonalityAuthoring = Object.freeze({
    PHASES,
    INSTRUMENT_DEFAULTS,
    CHARACTER_DEFAULTS,
    instrumentEvent(id, phase, phasePosition, values) {
      return makeEvent(INSTRUMENT_DEFAULTS, id, phase, phasePosition, values);
    },
    characterEvent(id, phase, phasePosition, values) {
      return makeEvent(CHARACTER_DEFAULTS, id, phase, phasePosition, values);
    },
    instrumentProfile(name, events, extras) {
      return makeProfile("instrument", name, events, extras);
    },
    characterProfile(name, events, extras) {
      return makeProfile("character", name, events, extras);
    },
    deepFreeze,
  });
})();
