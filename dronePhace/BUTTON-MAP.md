# dronePhace Button Map

**App ID:** `app6`  
**Role:** sustained tonal ambience / drone bed.

## Permanent bottom row

| Button | Function | Current page | Status |
|---|---|---|---|
| B1 | Voice | Source; Notes / Harmony; Voices; Register; Spread | DSP live |
| B2 | Tone | Harmonics; Brightness; Resonance; Texture / Air; Saturation | DSP live |
| B3 | Movement | Volume Motion; Pitch Drift; Timbre Motion; Stereo Motion; Motion Speed | DSP live |
| B4 | Space | Width; Delay; Reverb; Space Motion; Level | DSP live |
| B5 | Generate | Randomize the five controls on the currently visible B1–B4 page | Live |
| B6 | Phace | Opens shared Phace selector | Live |

## Project role

DronePhace is a sustained tonal bed. It should inherit project Root/Scale where tonal decisions require them, but it is not sequenced by arpPhace and does not need bar-by-bar melody arrangement.

## Control-template rule

The current five-macro page structure is the canonical dronePhace UI foundation unless later listening tests show a control is unnecessary or missing.

## Build 284 audition baseline

The top audition button renders a complete 30-second stereo drone from the current 20 macro values, then overlaps successive copies of the finished buffer by 3 seconds until Stop, smoothing the 30-second seam. The default macro positions are authored to reproduce the airy consonant reference drone and inherit the current interPhace Root/Scale.

## Build 279 Voice semantics

- Source: source/oscillator character.
- Notes / Harmony: 12 curated scale-aware voicing families.
- Voices: 1–5 active weighted tones.
- Register: drone-local octave region; global Root octave is ignored by dronePhace.
- Spread: harmonic octave spacing/openness, not stereo width.
- Preset: 12 Voice starting identities; INIT maps to the original reference voicing.

## Build 280 Tone semantics

- Harmonics: sine-dominant through richer controlled harmonic material.
- Brightness: upper-harmonic balance plus broad musical tone filtering.
- Resonance: restrained upper spectral emphasis/color.
- Texture / Air: pristine through subtle air into breathy/grainy surface.
- Saturation: clean through warm/compressed/worn coloration.
- INIT remains the original reference-tone target.

## Build 281 Movement semantics

- Volume Motion: per-voice fade-down/return plus slower whole-bed dip/return; never above baseline.
- Pitch Drift: restrained independent cents-level motion.
- Timbre Motion: harmonic withdrawal toward purer sine, then return.
- Stereo Motion: independent per-voice wandering.
- Motion Speed: scales long asynchronous periods; no tempo-LFO behavior.

## Build 282 audition/movement behavior

- Local drone audition: 60-second full render, then shared bed overlap transport until Stop.
- Global drone bed: 60-second child render, independent of musical loops.
- Movement presets may define one or more long macro dip events in addition to local per-voice motion.
- Foundation protection is preset-specific rather than hard-coded.

## Build 283 Movement range

- Approximately 0–70 preserves the former 0–100 DSP range.
- 70–100 is new high-motion territory.
- Existing preset values were remapped so their established sounds remain near their Build 282 behavior.
- Motion Speed receives the greatest added headroom; high values move macro events earlier and shorten their arcs.

## Build 284 Space semantics

- Width: near-mono through very wide/decorrelated field.
- Delay: asynchronous stereo reflections through obvious echo field.
- Reverb: diffuse environment from restrained room to large wash.
- Space Motion: whole-field asymmetric orbit/pan and field-shape movement.
- Distance: acoustic perspective; reduces direct/high-frequency presence rather than acting as mixer level.
- Movement Stereo Motion remains per-voice; Space Motion moves the environment around those voices.
