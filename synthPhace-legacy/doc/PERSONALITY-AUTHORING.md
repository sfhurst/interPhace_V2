# Personality Authoring

Instrument Behaviors and Characters each contain exactly 20 explicit events.
Every event declares an AHDHD phase and a normalized position within that phase.
All 20 events may legally occupy the same phase.

Factory profiles use the helpers in `js/data/personality-authoring.js`:

```js
instrumentEvent(1, "attack", 0.0, {
  volume: 1.2,
  brightness: 18000,
  pitch: 4,
})
```

Neutral fields may be omitted. The authoring helper expands them into complete,
immutable event records before the audio engine receives the profile.

Instrument events may control volume, pitch, brightness, motion, and harmonic
balance. Build 86 adds literal `h1Gain` and `h2Gain` event lanes. If a behavior
authors either lane, that lane follows its explicit H1/H2 multiplier curve. Older
factory behaviors that do not author those fields retain the legacy lower/equal/
higher companion classification curves until deliberately redesigned. Character
events use the same phase timeline but have character-specific neutral values.

The audio engine does not repair malformed factory data. `validate.js` must pass
before packaging a build.

## Zero-duration phases

The macro AHDHD envelope owns phase duration. If a phase duration is zero, all
personality events assigned to that phase resolve to the same absolute time.
They are not redistributed into another phase. During interpolation, the later
event wins at that instant. This is intentional compression of the behavior,
not missing data.

## Test bench profiles
Build 21 includes six temporary Instrument Behavior profiles for validating the event engine. `Test All` distributes events across the full AHDHD timeline. The five phase-isolated profiles place all 20 events in one named phase. Their exaggerated volume, pitch, and brightness curves are diagnostic, not intended as instrument voicing.

## Instrument Behavior harmonic excitation

Instrument Behavior events support these neutral-by-default fields:

- `h1ExciteCents` — temporary cents offset applied to Harmonic 1 at that event position.
- `h2ExciteCents` — temporary cents offset applied to Harmonic 2 at that event position.

Excitation values are authored musically rather than hard-clamped by the personality engine. Current design guidance is to keep them subtle (normally within about ±20 cents).

Build 85 moved short articulation sources out of Personality ownership. Transient Source and Transient Volume are independent Noise-section patch controls; Instrument Behavior no longer selects or schedules them.


## Build 86 Bedroom Piano

`Piano` is the first factory Instrument Behavior authored against the explicit
seven-target model: volume, pitch, brightness, H1 gain, H2 gain, H1 excitation
cents, and H2 excitation cents. Its 20 events are distributed 6/3/6/2/3 across
Attack/Hold 1/Decay 1/Hold 2/Decay 2, concentrating resolution around the strike
and early decay. Excitation is confined to Attack and resolves to zero before
the sustained body. The macro AHDHD envelope and arp gate logic remain unchanged.
