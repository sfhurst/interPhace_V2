## Build 97 — Random Patch envelope balance
- Random Patch no longer randomizes individual AHDHD envelope stage sliders.
- Random Patch now chooses one authored Envelope Shape preset (Tick, Arp, Pluck, Strike, Short, Medium, Long, Pad, Drone, or Wash), including that preset's time multiplier.
- The Arpeggiator remains completely untouched by Random Patch.
- Existing Random Patch rules for pitch/FM/texture remain unchanged.

# Build 97 — Per-Arp Rates + Sequence Master Off

- Keeps the restored Build 95 Motion identities and 35-preset Motion bank from the earlier Build 97 pass.
- Gives Arp A, B, C, and D their own Rate selectors: 1/16, 1/8, 1/4, 1/2.
- Tempo remains global in Arrangement; Arrangement is now Tempo → Arp Sequence.
- Existing Build 96/97 global Rate values migrate into all four arp voices so old patches preserve their sound until rates are deliberately changed.
- Arp Sequence now always has Off as the far-left preset, even when arp Shapes are active.
- Sequence Off is a master arp bypass: A/B/C/D settings remain intact, while audition and arp rendering use the normal non-arp patch.
- Changing active Shapes rebuilds the available sequence presets without forcing Sequence out of Off.
- Keeps separators between A/B/C/D and Arrangement.

# Build 96 — Arp Arrangement System

- Rebuilt the arpeggiator around four independent one-bar voices: Arp A, B, C, and D.
- Each arp now has its own Shape, Motion, and Chance controls. Shape = Off makes that arp inactive.
- Added a global Rate selector: 1/16, 1/8, 1/4, 1/2. Motion no longer owns rate.
- Chance is variation-only again: Off, Human, Ghost, Skip, Note, Loose, Alive, Wild. Removed all /Loop Chance variants.
- Added a dynamic Arp Sequence slider. Every sequence token equals one bar; sequence presets automatically rebuild from the currently active A/B/C/D voices and may include BLANK bars.
- Added 33 one-bar Shape phrases, including phrase-level rests such as Up Rest, Down Rest, Rest Up, Rest Down, Call Rest, Two Calls, Broken Rest, and longer melodic arcs.
- Expanded Motion to 24 rate-independent rhythmic/gate treatments.
- Old local sessions and imported patch files migrate their previous arp settings into Arp A. Old /Loop Chance selections migrate to A-A-A-A; native arps migrate to A.
- Audition now renders the complete multi-bar sequence, including blank bars and per-arp gate/chance behavior.
- Render no longer creates Motion Variations. The Arps render option now exports `arp/sequence.wav`, each sequence-referenced one-bar arp, and deterministic sounding steps for each referenced arp.
- Arps not referenced by the selected sequence are not exported.

# Build 95 — Extreme FM Shape Engine

- Rebuilt FM Shape as a true multiplier of the user-selected Modulator 1 depth.
- `0.0x` can now remove FM, `1.0x` is the base Mod 1 depth, and extreme presets reach up to `16x`.
- Preserved the underlying Mod 1 Amount calibration and Modulator 2 behavior.
- Replaced the old additive/always-above-base FM shapes with 21 deliberately authored trajectories:
  Off, Pluck Soft, Pluck Bright, Tine Light, Tine Hard, Bell Clear, Bell Wild, Chime Long, Rise, Sweep, Bloom, Punch, Collapse, Late Burst, Double Hit, Pulse, Surge, Explosion, Metal Storm, Wall, Destroy.
- Musical presets occupy the left half of the bank; the right half progressively explores violent FM bursts, collapses, repeated surges, sustained walls, and destructive motion.
- FM Shape slider range now derives from the preset bank.
- Character, Instrument Behavior, Noise, arp/gates, effects, ratio engine, and render architecture are unchanged.

# Build 93 — Intentional Instrument Behavior Bank

- Replaced the legacy mixed Instrument Behavior bank with 12 deliberate 20-anchor presets.
- Bank: Off, Bedroom Piano, Electric Piano, Bell, Mallet, Pluck, Brass, Woodwind, String, Pad, Drone, Soft Attack.
- Preserved the authored Bedroom Piano, Electric Piano, and Soft Attack contours.
- Re-authored Bell, Mallet, Pluck, Brass, Woodwind, String, Pad, and Drone using the modern seven-lane behavior model: volume, pitch, brightness, H1 gain, H2 gain, H1 excitation cents, H2 excitation cents.
- Added Build 92→93 session migration so retired behavior indices reopen at the closest intentional replacement instead of shifting silently.
- Character, Noise, arp/gates, FM, effects, transient, and render systems are unchanged.

# Build 92 — Soft Attack Instrument Behavior

- Added **Soft Attack** as a utility Instrument Behavior.
- Uses an explicit 20-anchor AHDHD timeline with a 12 / 3 / 3 / 1 / 1 distribution across Attack / Hold 1 / Decay 1 / Hold 2 / Decay 2.
- Soft Attack does not change the user's Attack duration; it reshapes perceived onset with a strongly eased volume curve.
- Brightness, H1 gain, and H2 gain open progressively with the attack, with H2 held back most strongly at the start.
- Carrier pitch and H1/H2 excitation remain neutral throughout.
- The behavior reaches fully neutral values by the end of Attack and remains neutral for the rest of the note.
- Appended at the end of the Instrument Behavior bank so all existing behavior indices remain stable for saved patches.
- No Character, Noise Source, Transient Source, arp/gate, FM, effects, or render changes.

# Build 91 — Character Motion Bank

- Expanded Character from 8 to 21 presets.
- Kept existing indices 0–7 stable: Off, Analog Drift, Tape, Warble, Shimmer, Tremolo, Vibrato, Unstable.
- Added Early/Middle/Late/Fading/Bloom Tremolo.
- Added Early/Middle/Late/Fading/Bloom Vibrato.
- Added Slow Drift, Fading Drift, Bloom Drift.
- All Character presets use explicit 20-event AHDHD timelines.
- Positional presets concentrate event density in the envelope region named by the preset.
- Fading/Bloom presets vary modulation rate and depth continuously over the note.
- Tape Character remains motion/tone only; Tape/Cassette/Vinyl/Worn dirt remains in Noise Source.
- Character slider expanded to 21 positions.
- No changes to Instrument Behavior, Noise Source synthesis, transients, arp/gates, FM, effects, or render architecture.

# Build 90 — Character / Noise Source Cleanup

- Character is now strictly motion/tone behavior of the synthesized sound.
- Removed Character-generated noise, crackle, and static drive/saturation extras.
- Character bank is now: Off, Analog Drift, Tape, Warble, Shimmer, Tremolo, Vibrato, Unstable.
- Removed Cassette, Vinyl, Worn, Dusty, and Breathy from Character.
- Noise controls are now labeled Noise Source and Noise Volume.
- Noise Source bank is now: Off, Tape, Cassette, Vinyl, Worn, Dust, Air, Breath.
- Cassette and Vinyl are functional Noise Source entries using the existing noise engine architecture; deeper source sound design is intentionally deferred.
- Added session v6 migration so surviving Character names retain their meaning after index cleanup.
- Removed dirt-oriented Character selections migrate to the corresponding Noise Source when no Noise Source was already active.
- Instrument Behavior, Transient Source, arp/gates, FM, effects, and render behavior are unchanged.

# Build 89 — Electric Piano behavior

- Reauthored **Electric Piano** as a true 20-anchor Instrument Behavior using the seven current behavior lanes.
- Targets a warm Rhodes/Wurlitzer-like tine/reed response: brighter strike, stable pitch, slower harmonic decay, sustained H1 body, and longer-lived H2 metallic content.
- Uses a 5 / 4 / 5 / 3 / 3 anchor distribution across Attack / Hold 1 / Decay 1 / Hold 2 / Decay 2.
- No arp, gate, Noise, Character, effects, render, or Piano changes.

# Build 87 — Extreme Instrument Behavior Diagnostics

- Re-authored all six `Test ...` Instrument Behavior presets as intentionally extreme diagnostics.
- Every test now drives all seven current behavior lanes: volume, carrier pitch, brightness, H1 gain, H2 gain, H1 excitation cents, and H2 excitation cents.
- Stage-specific tests place all 20 anchors inside their named AHDHD stage so the Wash envelope can expose interpolation across that stage.
- `Test All` distributes its 20 anchors across Attack, Hold 1, Decay 1, Hold 2, and Decay 2.
- Piano and all musical Instrument Behavior presets are unchanged from Build 86.
- Arp/gate behavior is unchanged.

# Build 86 — Bedroom Piano Instrument Behavior

- Re-authored the Piano Instrument Behavior as a restrained bedroom/lofi piano using exactly 20 phase-positioned events.
- Piano now targets the agreed seven behavior dimensions: volume, pitch, brightness, H1 gain, H2 gain, H1 excitation cents, and H2 excitation cents.
- Added true lane-specific H1/H2 gain support to the personality engine. Existing behaviors remain backward-compatible with their prior lower/equal/higher harmonic-balance data until they are individually re-authored.
- Piano resolution is concentrated 6/3/6/2/3 across Attack/Hold 1/Decay 1/Hold 2/Decay 2.
- Harmonic excitation is subtle and attack-only, settling to zero by the end of Attack.
- H2 decays faster than H1, while behavior-volume movement stays close to unity so the user's AHDHD envelope remains the dominant macro shape.
- Off remains the clean reference behavior.
- Arp/gate logic is unchanged.

# Build 81 — Render progress text

- Build 80 layout remains unchanged at idle.
- Render status is painted into the existing divider-to-Render gap with no box/background and no layout participation.
- Progress is tied to the actual WAV output queue: `Rendering X of Y...`.
- After WAV rendering: `Packaging files...`.
- After ZIP creation/download starts: `Y files rendered`.
- Render button stays labeled `Render`; no success popup is used by the active Build 81 render path.

# Build 80 — Render Output Contract

- Render now uses one authoritative rule: **visible + selected = render**.
- Patch Sounds exports `root/` and/or `oct/` according to the visible selected buttons.
- Chords exports `chd/` and/or `prg/` only when those visible selectors are selected.
- Arps exports `arp/` and/or `mot/` only when those visible selectors are selected.
- Removed duplicate harmonic/arp capability decisions from package selection; Render no longer second-guesses the UI.
- Kept compact M8-friendly folder/file naming and `interPhace-yymmdd-###.zip` package naming.
- `mot/` remains numbered with its descriptive mapping in `legend.txt`; chord/progression and arp-step names remain directly readable.

# Build 79 — Render Action Separation

- Adds the standard UI divider between Random Patch / Load Patch and the primary Render button.
- No render behavior, selector behavior, visibility logic, or patch-management logic changed.

# Build 78 — Render Group Visibility

- Patch Sounds remains always visible.
- Chords group hides only when both H1 Gain and H2 Gain are at their minimum positions.
- Arps group hides only when Arp Shape is at its minimum/Off position.
- Visibility is checked on initialization and on input/change from those three existing sliders.
- Visibility code only toggles CSS on the two Render group containers; it does not alter slider values, render selections, patch state, presets, or render logic.

# Build 77 visibility hotfix 3

- Render capability visibility is now a pure DOM read.
- Chords are visible when `harmonic1Gain` or `harmonic2Gain` is above the slider minimum.
- Arps are visible when `arpShape` is above the slider minimum.
- Render visibility code never writes harmonic gain, arp shape, patch state, or slider values.
- Removed Render refresh callbacks from harmonic and arp slider format/update functions.
- Manual `input`/`change`, DOM-load initialization, session initialization, and patch preset application all refresh visibility by re-reading slider positions.

# interPhace Build 77 — Intelligent Render Content

## Render UI
- Replaces the single Root / Octaves / All scope selector with independent multi-select folder banks.
- PATCH SOUNDS is always visible: Root, Octaves.
- CHORDS appears only when Harmonic 1 and/or Harmonic 2 has gain: Chords, Progressions.
- ARPS appears only when Arp Shape is active: Arp Steps, Motion Variations.
- Each bank uses the universal Build 76 `ui-selector-bank` / `ui-selector-btn` component system.
- Render selections persist as an array in localStorage. Hidden capability banks retain their preferences and return when valid again.
- Old Build 72–76 render scope values migrate to equivalent Build 77 selections.

## Render folders / M8 naming
- ZIP naming remains `interPhace-yymmdd-###.zip`.
- Short top-level folders: `root`, `oct`, `chd`, `prg`, `arp`, `mot`.
- `root`: `patch.wav`, `root.wav`, and active `tex.wav`, `h1.wav`, `h2.wav` solos.
- `oct`: `chr1` for chromatic +/-1 octave and `scl2` for scale +/-2 octaves.
- `chd`: compact musical chord/diad filenames such as `Cmaj.wav`, `Dmin.wav`, `C-E.wav`.
- `prg`: compact progression filenames such as `I-V-VI-IV.wav`.
- `arp`: current resolved arp performance rendered as individual active steps with Shape + Motion + step number in the filename.
- `mot`: numbered full-phrase Motion variations only; long Motion names are stored in `legend.txt` instead of WAV filenames.
- `patch.json` preserves the full source patch.

## Intelligent harmony
- Chord and progression outputs are unavailable when both harmonic gains are zero.
- One active harmonic lane produces diads; two active harmonic lanes produce triads.
- Active harmonic lanes are detected by identity, not merely counted. H2-only patches now correctly use H2 as the derived chord voice.
- Original harmonic gains are preserved while derived chord pitch assignments replace the patch's normal harmonic offsets.

## Arp derivatives
- Arp folders are unavailable when Arp Shape is Off.
- Arp Steps renders only active steps from the current resolved arp performance.
- Motion Variations keeps the current Shape and Chance behavior while cycling the curated Motion preset bank.
- The mirrored Chance family controls variation length: left half = native-length arps; right half = 4-bar loops.
- This works even when the selected Chance behavior is Off / Off-Loop.
- Motion variation files are full phrases only; no step explosion per variation.

## Validation
- All JavaScript files pass syntax checks.
- Project validator passes: 21 instruments, 13 characters, 27 JavaScript modules, 123 unique UI IDs.

### Build 77 visibility hotfix
- Render Chords capability now reads the live Harmonic 1 Gain and Harmonic 2 Gain slider values directly.
- Chords group is visible when either gain is greater than zero and hidden only when both are zero.
- Render Arps capability now reads the live Arp Shape slider directly.
- Arps group is visible whenever Arp Shape is not Off and hidden when Shape is Off.
- This avoids event-listener ordering lag between DOM controls and patch state.


## Build 77 visibility hotfix 2
- Render capability visibility now uses explicit `.is-unavailable` layout state instead of relying on the HTML `hidden` attribute.
- Harmonic 1 Gain and Harmonic 2 Gain authoritative slider callbacks explicitly refresh Render capability state after mutating patch state.
- Arp Shape authoritative update callback explicitly refreshes Render capability state after mutating patch state.
- Preset-applied harmonic changes also refresh Render capability state.
- Rules remain exact: Chords visible when H1 > 0 OR H2 > 0; Arps visible when Arp Shape > Off.


### Render visibility hotfix 4
- Chords and Arps render selector groups are now always present and always visible.
- Removed all capability visibility observers and DOM toggling logic.
- Render selection availability no longer reads or writes H1/H2 gain or Arp Shape controls.

## Build 82 — Personality articulation foundation

- Renamed inactive Instrument Behavior and Character presets from `None` to `Off`.
- Renamed Texture `Clean` to `Off`.
- Renamed Stereo Width `Mono` to `Off`; DSP remains unchanged at amount 0.
- Removed Felt and Hammer from Texture and deleted their special post-effects bypass path.
- Texture is now one consistent sustained/material layer family: Off, Tape, Dust, Air, Breath, Worn.
- Added Instrument Behavior event fields for H1/H2 excitation cents and companion source events.
- Added H1/H2 oscillator detune targets so behavior excitation can move each harmonic independently without changing its authored semitone interval.
- Added Companion Source Engine with Off, Hammer, Felt Hammer, Key Click, Bow / Scrape, Breath / Air, and Mallet / Strike.
- Added visible Companion Source Lab developer controls (source + volume). Sources fire at note-on and follow the normal mono filter/effects chain.
- Companion Source Lab is permanently retained behind `CompanionSourceEngine.DEV_TOOL_ENABLED` for later hiding/re-enabling.
- Offline render planning now accounts for late companion events and their source duration.
- Added Build 81 session migration so removed Texture preset indices do not silently load as the wrong texture.
- Existing Instrument Behavior presets remain musically unchanged; all new articulation fields default neutral/off until intentionally authored.

## Build 83 — Bowed String Companion
- Rebuilt the Bow / Scrape companion source as a pitched bowed-string articulation instead of friction noise alone.
- Added a root-pitched sawtooth body, low-pass body shaping, irregular bow-catch pitch wander, settling vibrato, and pressure-like amplitude motion/tremolo.
- Retained a filtered friction layer so the bow noise and pitched string remain mechanically connected.
- Extended Bow / Scrape source duration from 240 ms to 460 ms so the string can catch, bloom, and settle.
- No UI changes and no changes to the other companion sources or Personality presets.

## Build 84 — Brass Blow + Guitar Slide
- Renamed the Build 83 Bow / Scrape happy accident to Brass Blow without changing its synthesis.
- Added a new Guitar Slide companion source at the end of the companion bank to preserve existing preset indices.
- Guitar Slide combines a root-related filtered saw string body, sine fundamental support, a fourth-below-to-root pitch glide, metal-on-string scrape noise, and short inharmonic resonances.
- Increased Companion Source Lab range from 0–6 to 0–7.
- Added compatibility mapping so legacy string key `bow` resolves to Brass Blow.

## Build 85 — Noise / Transient Architecture
- Renamed the visible Texture section to **Noise** while preserving the existing Texture Character and Amount controls unchanged.
- Moved the former Companion Source controls into Noise and renamed them **Transient Source** and **Transient Volume**.
- Removed Guitar Slide. The transient bank is now: Off, Hammer, Felt Hammer, Key Click, Brass Blow, Breath / Air, Mallet / Strike.
- Renamed the source module/state from Companion Source to Transient Source; transients remain mono and join the normal rack before filter/effects.
- Removed transient source/volume fields and scheduled transient events from Instrument Behavior. Instrument Behavior retains H1/H2 excitation cents.
- Added Build 84 session/import migration so existing companion selections 0–6 become the matching transient selections; retired Guitar Slide resolves to Off.

## Build 88 — stronger Bedroom Piano + diagnostic cleanup
- Removed the six temporary Instrument Behavior test presets (`Test All`, `Test Attack`, `Test Hold 1`, `Test Decay 1`, `Test Hold 2`, `Test Decay 2`).
- Retuned Piano for a more audible bedroom/lofi identity while preserving the AHDHD macro envelope.
- Piano still uses exactly 20 phase-anchored events, now distributed 7 Attack / 2 Hold 1 / 7 Decay 1 / 1 Hold 2 / 3 Decay 2.
- Increased strike brightness, strike gain emphasis, harmonic contrast, and short-lived H1/H2 excitation.
- H2 now falls more decisively than H1 through the primary decay.
- Kept carrier pitch movement restrained and brought adjacent stage-boundary values close together to reduce discontinuity risk.
- No arp, gate, Character, Noise, effects, render, or other musical preset changes.

## Build 94 — Personality Engine Authority + Hardening
- Increased the audible authority of every active Instrument Behavior except Off and Soft Attack by widening authored volume, brightness, H1/H2 gain, pitch, and excitation movement while preserving each preset's existing 20-anchor contour.
- Off + Off now truly bypasses personality gain/filter/LFO processing, leaving only the base AHDHD envelope in the personality stage.
- Coalesced personality anchors that resolve to the same absolute time; the later authored anchor wins, making zero-length AHDHD stages deterministic and safer at boundaries.
- Character slider maximum now derives from the Character preset bank at runtime.
- Character presets themselves are unchanged.

## Build 98 — Complete Instrument Preset Bank
- Rebuilt Patch Presets as complete current-build sound/composition snapshots rather than partial legacy assignments.
- Expanded the bank from 24 to 47 curated presets.
- Every preset explicitly defines all direct instrument controls: root, scale, carrier/harmonics, Arp A-D + rates + sequence, tempo, AHDHD, Behavior, Character, FM modulators/ratios/waves/shape, filters/EQ/ranges, Noise, Transient, all effects, and Wet/Dry.
- Convenience setters (Patch/Harmonic/Envelope/FM Ratio/Filter presets), render selections, and navigation controls are not preset authorities.
- Added simple, acoustic-inspired, degraded, ambient, extreme-FM, and Arp Arrangement instruments.
- Patch Presets now apply through the same normalized patch/UI path as patch.json loading, making future user-supplied patch.json presets straightforward to integrate.

## Build 99 — Expanded Random Patch
- Restored independent AHDHD stage randomization for Attack, Hold 1, Decay 1, Decay target, Hold 2, and Decay 2.
- Random Patch no longer chooses Envelope preset buttons; Time Multiplier remains untouched.
- Arp A/B/C/D and Arp Sequence remain untouched by Random Patch.
- Added independent random selection of all seven effect preset sliders: Bit Crush, Stereo Width, Detune, Chorus, Delay, Reverb, and Saturation.
- Added Transient Source and Transient Volume randomization.
- Wet/Dry Mix now randomizes from 0–60% only.
- Existing Noise Volume cap (0–10%), FM ratio/wave randomization, and core pitch/FM randomization are preserved.
