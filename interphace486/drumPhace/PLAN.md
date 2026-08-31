# drumPhace Plan

## Current position — Build 291

drumPhace is the most mature pattern child. Kick/Snare/Hat grids, ghost states, sound editors, presets, Chance/Volume/Repeats, bar copy behavior, render-first audition/export and the Hampton phrase generator are operational.

## Generator direction

1. Keep phrase generation rule-based rather than independent Bernoulli step rolls.
2. Process step priority in musical order: Always → Mostly → Sometimes → Rarely/Forbidden, with Shape as a secondary ranking rather than allowing Shape to override an Always anchor.
3. Treat Density as a ceiling/target range, not a forced quota that must fill weak steps.
4. Keep bar 1 strongly anchored on beat 1 for styles that require it.
5. Preserve A/B relationships and bounded A′/B′ mutation rather than generating every bar from scratch.
6. Current eight-bar Hampton memory rule: bar 5 = bar 1 and bar 6 = bar 2; allow 3/4 and 7/8 more independent behavior.
7. Continue expanding producer profiles only after each profile has explicit Kick/Snare/Hat rules.

## Sound-engine direction

Keep Kick, Snare and Hat controls intentionally compact. Presets must be real parameter sets, not labels over arbitrary values. Audio fixes must favor render-first look-ahead, tails and click-free boundaries rather than realtime workarounds.

## Variation direction

Chance, Volume and Repeats should support the generated groove rather than erase its identity. Generated variation must target active steps only. Clearing a step clears its attached variation state.

## Integration

interPhace global audition should treat drumPhace as an independent rhythmic source mixed alongside the arpPhace→synthPhace pitched path and noise/drone beds.

## Patch persistence — Build 288

interPhace patch export/import now preserves all eight current B2 synth values for each instrument. Full DRUMS patches include patterns, styles, and Chance/Volume/Repeats grids. KIT is sound-only. KICK/SNARE/HAT patches include the selected instrument's sound plus its own pattern and performance-variation grids.

- Global interPhace Swing is inherited by drum event scheduling; 0% is straight timing and repeat gestures retain their offsets relative to the swung base step.
