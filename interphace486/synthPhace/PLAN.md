# synthPhace Plan

## Current position — Build 293

The migrated synth engine is substantially operational. Carrier/harmonics, FM, behavior/character, texture/transient, envelope, filters/EQ, effects, preset adaptation, scale-aware harmony handling and offline audition are wired. The frozen `synthPhace-legacy` package remains the reference for migration truth.

## Near-term work

1. Protect preset fidelity. All discrete preset values must map to exact legal control values.
2. Keep harmony recognition reversible across seven-note and five-note project scales.
3. Continue using the legacy implementation only as a truth source; do not casually reintroduce legacy architecture.
4. Let arpPhace sequence synthPhace in interPhace global audition instead of adding another sequencing system here.
5. Keep B5 generation focused on useful patch creation rather than uncontrolled randomization.
6. Add visual helpers such as EQ curve / waveform display only when they do not destabilize responsive layout.

## Signal-chain intent

Base processing order remains conceptually: FM/source → Envelope → Filter/EQ → Width → Detune → Chorus → Delay → Reverb → dynamics/output protection as implemented by the current render engine.

## Preserve

Offline rendering, click-free envelopes/releases, exact preset recognition, canonical synthPhace blue identity, shared shell behavior, and project-level Root/Scale/Tempo ownership in interPhace.

## Harmonic companion gain fix — Build 293

H1/H2 companion oscillators are now initialized to their requested base gains before the Behavior/Character neutral early-return path. Harmony gain and note offset therefore remain audible with Instrument Behavior Off and Character Off. When a Behavior is active, the existing companion behavior curves continue to modulate those same base gains rather than being responsible for making the harmony audible at all.
