# drumPhace Build 5

- Browser-local persistence for all Kick, Snare and CHH pattern bars.
- Per-instrument style, current page, step label mode and tempo restore on reopen.
- Samples are intentionally not part of persisted state.
- Added Settings button and compact modal.
- Tempo is now adjustable from 40–200 BPM, default 75 BPM, and drives audition rendering.
- Added Clear Current Grid; clears all eight stored bars for the active instrument.
- Reserved disabled MIDI/WAV export and temporary sample controls for Build 6.
- Generate uses a shuffle icon.
- Audition button follows active instrument color for solo audition and turns interPhace blue for full-kit audition.
- After Stop, audition returns to the active page color.
- Pattern generation tables/rules are unchanged.


## Build 7
- Export actions now create one ZIP download instead of four/eight separate downloads.
- MIDI ZIP contains Kick, Snare, CHH, Full Kit MIDI files.
- WAV ZIP contains Kick, Snare, CHH, Full Kit WAV files.
- Both ZIP contains all eight files.

## Build 8
- Export ZIP names now use browser-local date and a daily persistent sequence.
- Format: drumPhace-yymmdd-###-midi|wav|both-4|8bars-###bpm.zip
- Sequence is stored in localStorage, starts at 001 each calendar day, and increments through 999.


## Build 222
- drumPhace B3 Chance now uses the same in-grid 4x3 value selector as arpPhace Chance.
- drumPhace B3 Volume now uses the same in-grid 4x3 value selector as arpPhace Volume.
- Selector values: 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, clear.
- Selector moves to the opposite half of the 16-row grid based on the selected step.
- Chosen values are displayed directly in the B3 grid cells.
- Repeats remains unchanged.


## Build 223
- Fixed drumPhace B3 active-pattern reference rendering.
- The active Kick/Snare/CHH pattern is now reapplied whenever the B3 variation grid renders.
- B3 no longer depends on visiting B1 first to reveal the active pattern.
- Entering a Chance or Volume selector value no longer makes the active drum reference disappear.


## Build 224
- Fixed B3 active-pattern reference disappearing after page reload.
- Root cause: parent-shell drum border synchronization fired after B3 rendered and the B1 overlap renderer cleared B3 borders.
- updateOverlaps now defers to B3's own reference-border renderer whenever drumPhace is on a Chance/Volume/Repeats page.


## Build 225
- Refactored drumPhace B3 to match arpPhace's reference-grid architecture.
- B3 now receives the active drum pattern as a reference during grid construction.
- Active and ghost drum reference borders are drawn in the same pass as Chance/Volume/Repeats values.
- Removed the separate updateChanceReferenceBorders repaint function.
- B1 overlap rendering no longer touches B3 during resize or shell border-sync events.


## Build 226
- Wired drumPhace B3 Chance into offline audio rendering.
- Blank Chance = 100%; stored Chance is rolled once per audio render.
- Wired B3 Volume using arpPhace's center +/-5% randomization.
- Ghost Volume scales from the existing ghost baseline, not full-hit volume.
- Chance/Volume now affect local audition, full-kit audition, WAV export, and interPhace drum rendering through the shared offline renderer.
- MIDI export remains deterministic and ignores Chance/Volume.
- B3 Chance/Volume selectors do nothing on blank drum steps.
- Clearing a drum hit clears its Chance, Volume, and Repeats data.
- Legacy saved variation data behind blank steps is removed on load.


## Build 227
- Wired drumPhace B3 Repeats as a universal trigger-gesture layer.
- Same repeat presets are available for Kick, Snare, and CHH.
- Presets: Double, Triple, Four-hit Roll, Flam, Drag, Stutter, Rise, Fade, Ghost Drag, Late Double, Accidental Double, Clear.
- Repeat gestures are expressed only as trigger offsets and per-trigger gain multipliers.
- Chance is resolved once for the whole gesture.
- B3 Volume scales the whole gesture before per-trigger repeat gain is applied.
- Ghost notes retain their ghost baseline before Volume and Repeat multipliers.
- Repeats work with both built-in synthesized drums and temporary uploaded samples.
- Repeats affect audio audition/WAV/global render only; MIDI remains the written deterministic pattern.
- Blank drum steps cannot receive Repeat values, and clearing a drum note clears Repeat data.


## Build 228
- Replaced the old placeholder Kick B2 controls with the first serious drumPhace kick synth.
- Kick controls: Pitch, Punch, Sweep, Decay, Tone, Noise, Shape, Preset.
- Useful direct ranges: Pitch 30–80 Hz; Punch 45–220 Hz; Sweep 15–180 ms; Decay 60–1800 ms; Tone/Noise/Shape 0–100.
- Preset currently contains INIT only.
- INIT is 43 Hz Pitch, 118 Hz Punch, 55 ms Sweep, 420 ms Decay, Tone 0, Noise 0, Shape 0.
- INIT reproduces the previous kick architecture: sine body, 118 -> ~52 -> 43 Hz pitch envelope and 420 ms decay.
- Tone adds a short pitched attack transient.
- Noise adds a short filtered noise transient.
- Shape adds progressive soft-clipped harmonic enrichment; Shape 0 is clean sine.
- Kick render tail now follows Decay so long kicks are not truncated.
- The new kick voice automatically feeds drum patterns, ghost hits, Chance, Volume, Repeats, local audition, full-kit render, WAV export, and interPhace drum rendering.
- Snare and Hat sound engines are unchanged. Their four B2 placeholder controls remain until their dedicated synth rebuilds.


## Build 230
- Added the first 10-preset Kick synth test bank.
- Presets: INIT, 808, 909, 606, CR78, SIMMONS, DMX, DRE, DILLA, ROMIL.
- Every preset is only stored positions for the seven visible Kick synth controls; no hidden preset parameters.
- Selecting a preset moves Pitch, Punch, Sweep, Decay, Tone, Noise, and Shape to the preset values.
- INIT remains the exact Build 228/229 reference setting.
- drumPhace CSS is unchanged from Build 229.


## Build 233
- Restored the complete Build 230 state as the new baseline.
- Removed the later Saturation, Boom, and Kick safety-limiter experiments by reverting to Build 230.
- Kick synth remains Pitch, Punch, Sweep, Decay, Tone, Noise, Shape, Preset.
- Retains the 10-preset Kick test bank from Build 230.
- CSS and application behavior are otherwise exactly Build 230.


## Build 238
- Restored the complete Build 233 state as the new baseline.
- No Hat synth rebuild.
- No separate synth-panel architecture.
- No routing changes.
- No CSS changes.
- Application behavior is otherwise exactly Build 233.


## Build 240
- Rebuilt drumPhace B2 using the same permanent-page pattern as interPhace settings.
- B2 now has three permanent sibling pages: app4_b2_p1 Kick, app4_b2_p2 Snare, app4_b2_p3 Hat.
- Each B2 page permanently owns its controls; no B2 IDs are renamed at runtime.
- A synthPages collection renders exactly one active B2 page, mirroring interPhace settings page handling.
- B1/B3 shared grid structure, runtime grid ID handling, and render logic are untouched.
- Kick synth and preset bank remain intact.
- Snare stays on its current four placeholder controls and voice.
- Hat is now an independent 8-control CHH synth: Pitch, Metal, Snap, Decay, Filter, Noise, Shape, Preset.
- Hat INIT: 0 st, Metal 0, Snap 50, Decay 32 ms, Filter 7.2 kHz, Noise 100, Shape 0.
- Hat Pitch -24..+24 st, Decay 8..140 ms, Filter 3.0..12.0 kHz, other continuous controls 0..100.
- Old 4-control Hat saved state migrates to INIT.
- CSS unchanged from Build 238.


## Build 241
- Added 12 usable Hat synth presets to the existing Build 240 CHH engine.
- Presets: INIT, TIGHT, CRISP, TICK, 606, 808, 909, DIGITAL, DUSTY, METAL, SOFT, NEEDLE.
- Hat Preset slider now selects 0..11 and writes the full seven Hat synthesis parameters.
- Selecting a preset updates Pitch, Metal, Snap, Decay, Filter, Noise, and Shape immediately.
- Selected Hat preset index persists in local storage.
- No B1/B3 grid changes.
- No B2 page-architecture changes.
- No Hat engine changes.
- CSS unchanged from Build 240.


## Build 242
- Reworked Hat Pitch from semitone transposition to an actual metallic-center frequency control.
- Hat Pitch range is now 3.0–12.0 kHz in 100 Hz steps.
- Hat Pitch now affects only the metallic partial cluster; it no longer moves the noise high-pass filter.
- Filter remains an independent 3.0–12.0 kHz brightness/high-pass control.
- INIT is pinned to the original CHH architecture: Pitch 7.2 kHz, Metal 0, Snap 50, Decay 32 ms, Filter 7.2 kHz, Noise 100, Shape 0.
- Because INIT Metal = 0, the new Pitch control is inert at INIT and cannot alter the original noise-only sound.
- Retuned all 11 non-INIT Hat presets for the new frequency-based Pitch behavior.
- Existing Build 241 Hat states using -24..+24 semitone values migrate Pitch to 7.2 kHz safely.
- CSS unchanged.


## Build 243
- Completely rebuilt the Hat synthesis engine for greater variety.
- Hat controls are now: Tone, Metal, Noise, Click, Ring, Decay, Shape, Preset.
- Four independent sound layers: filtered Noise body, inharmonic Metal cluster, ultra-short Click transient, resonant Ring body.
- One Decay macro scales the layer envelopes differently rather than forcing all layers to behave identically.
- Tone controls spectral center across active layers; 50 is the neutral INIT point.
- INIT is locked to the original CHH architecture: Noise 100, Metal 0, Click 0, Ring 0, Decay 32 ms, Shape 0, with the original ~7.2 kHz noise high-pass behavior.
- Retuned 12 presets for the new engine: INIT, TIGHT, CRISP, TICK, 606, 808, 909, DIGITAL, DUSTY, METAL, RING, NEEDLE.
- Old Hat states with the former frequency-based control layout reset safely to INIT because the parameter meanings changed.
- B1/B3 grids unchanged.
- B2 page architecture unchanged.
- Kick and Snare unchanged.
- CSS unchanged.


## Build 244
- Hat transient cleanup after Build 243 audit.
- Added a 1.6 ms post-sum master attack envelope (~71 samples at 44.1 kHz) so layer combinations cannot produce a hard initial discontinuity.
- Noise attack changed from 0.8 ms to 1.6 ms.
- Metal attack changed from 0.45 ms to 2.0 ms.
- Six Metal oscillators now start 0.12 ms apart instead of all on the same sample.
- Click maximum gain reduced from 0.24 to 0.075 (~69% reduction) and attack changed from 0.25 ms to 0.9 ms.
- Ring attack changed from 0.8 ms to 2.0 ms.
- Layer bodies, controls, presets, B2 architecture, B1/B3 grids, Kick, Snare, and CSS are otherwise unchanged.


## Build 245
- Optimized built-in Hat rendering without shortening the loop or reducing the Hat engine.
- The current Hat sound is synthesized once per render into a short stereo buffer.
- The full 4/8-bar pattern then reuses that rendered Hat buffer for every trigger.
- Chance, Volume, Ghost, Repeats, mixer gain, full-loop tail wrapping, WAV export, and interPhace global rendering remain on the full pattern path.
- Uploaded Hat samples already use buffer triggering and are unchanged.
- Hat engine remains full Build 244 design: Noise + six-oscillator Metal + Click + two-oscillator Ring + Shape.
- Kick, Snare, B1/B3 grids, B2 page architecture, presets, and CSS unchanged.


## Build 246
- Applied the proven one-voice prerender/reuse optimization to the built-in Kick synth.
- The current Kick voice is synthesized once per full pattern render, then reused as a short buffer for every Kick trigger.
- Hat keeps the same prerender/reuse optimization from Build 245.
- Full 4/8-bar loop rendering is preserved.
- Chance, Volume, Ghost, Repeats, mixer gain, WAV export, and interPhace global rendering still operate on the complete pattern.
- Uploaded Kick/Hat samples already use buffer triggering and are unchanged.
- Kick synth controls, presets, Hat engine, Snare engine, B1/B3 grids, B2 architecture, and CSS are unchanged.


## Build 247
- Replaced Snare B2 placeholders with the 8-control snare synth layout: Body, Snap, Noise, Tone, Decay, Ring, Shape, Preset.
- INIT is the only Snare preset.
- INIT is mathematically mapped to the legacy default snare: 1850 Hz/Q .7 bandpass noise, .64 noise peak, 135 ms noise decay; triangle body 185 -> 145 Hz over 70 ms, .22 body peak, 90 ms body decay.
- INIT macro values: Body 50, Snap 50, Noise 100, Tone 50, Decay 50, Ring 0, Shape 0.
- Snap above 50 adds a separate short transient; at INIT 50 it contributes nothing, preserving the legacy sound.
- Ring and Shape are zero at INIT.
- Snare uses one-hit prerender/reuse from the start, matching the optimized Kick/Hat architecture.
- Old 4-slider Snare saved states migrate safely to INIT because the controls were placeholders.
- B1/B3 grids, B2 page architecture, Kick, Hat, and CSS unchanged.


## Build 248
- Fixed Snare B2 control binding after the 8-control expansion.
- JavaScript now binds all 8 Snare controls instead of only the original 4 placeholder controls.
- Ring and Shape now participate in UI sync, slider fill, value display, local storage, and the Snare synth engine.
- Preset is also correctly bound; it remains fixed at INIT because INIT is currently the only Snare preset.
- No synth sound changes.
- No grid changes.
- No B2 architecture changes.
- CSS unchanged.


## Build 249
- Added 12 Snare synth presets: INIT, TIGHT, CRACK, 808, 909, DRY, DUSTY, RING, DIGITAL, BOOM, SOFT, RIM.
- INIT remains the exact legacy snare mapping.
- Presets use only the seven visible Snare controls: Body, Snap, Noise, Tone, Decay, Ring, Shape.
- Selecting a preset updates all seven controls and persists the preset index.
- No Snare engine changes.
- No grid changes.
- No B2 architecture changes.
- CSS unchanged.


## Build 250
- Added B1 long-press clear for the active drum instrument.
- Hold B1 for 650 ms to clear the current Kick/Snare/Hat pattern.
- Clearing also removes that instrument's Chance, Volume, and Repeat values, matching existing clear semantics.
- The normal B1 click/cycle is suppressed after a successful long press.
- No grid layout or CSS changes.


## Build 251
- Removed drumPhace's independent tempo ownership.
- interPhace `project.tempo` is now the only tempo source for drumPhace local audition, repeats, MIDI/WAV export, and filenames.
- Global interPhace render can still pass an explicit tempo to `DrumPhaceRenderAPI.renderVisible()`.
- Removed drumPhace Tempo UI and local tempo persistence.
- MIDI import no longer changes tempo.


## Build 252
- Added B3 long-press clear for the active drum variation page.
- Hold B3 for 650 ms on Chance, Volume, or Repeats to clear only that value grid for the active instrument.
- Drum notes and the other two variation grids are preserved.
- Normal B3 page cycling is suppressed after a successful long press.


## Build 253
- Kept B3 long-press clear for the full active Chance/Volume/Repeats page.
- Added long-press clear on individual B3 grid steps.
- Hold a Chance/Volume/Repeat step for 650 ms to clear only that step's current variation value.
- The underlying drum note and the other two variation values on that step are preserved.
- Normal step click is suppressed after a successful long press.


## Build 254
- Long-press destructive actions now require the corresponding button page to already be active.
- B1 long-press clear only arms while Pattern view is active.
- B3 long-press full variation-page clear only arms while Chance/Volume/Repeats view is active.
- Long-pressing inactive B1/B3 no longer clears hidden state; the normal click/navigation behavior remains.
- B3 step long-press remains limited to the active B3 variation grid.


## Build 260
- On drumPhace B2/Synth pages, B5 now randomizes the active instrument's synth sliders 1-7.
- Slider 8 Preset is excluded and remains unchanged.
- On non-Synth drumPhace pages, B5 keeps its existing pattern/grid Generate behavior.


## Build 261
- Reserved Spacebar as the shared audition transport across Phaces.
- When not typing in a text-editing field, Space clicks the current shell audition button.
- Press Space again to stop when the current Phace audition button is already playing.
- Space no longer scrolls the page or activates a focused non-text control.
- Text inputs, textareas, and contenteditable fields keep normal Space typing.


## Build 264
- Added B1 Pattern bar/column copy-paste.
- Long-press a row-1 step for 650 ms to snapshot that active instrument column.
- While copy mode is active, row 1 becomes A-H paste targets for visible columns.
- Press a different row-1 column to paste the full copied bar there.
- Press the source column or any other grid cell to cancel without editing.
- Copy/paste includes note states plus attached Chance, Volume, and Repeat values.
- Copy mode cancels automatically when leaving Pattern view or changing instruments.


## Build 267
- Added Hampton to drumPhace B4 Style.
- Existing rand/lofi/boom bap/dilla/romil/dre generator path is unchanged.
- When Hampton is selected, B5 routes to the new Hampton A/B/A′/B′ phrase engine.
- Hampton Kick uses Sparse 2–3 (15%), Medium 3–5 (50%), Heavy 5–7 (35%) plus shape/priority/mutation logic.
- Hampton Snare uses the revised conservative A/B tables and 100/93/20/5/0 priority firing scale from the test engine.
- Hampton Hat uses the test quarter-distribution engine.
- Hampton Kick/Snare generation reads the other active instrument grid and forbids same-step overlap.
- Four visible columns generate one four-bar Hampton phrase; eight visible columns generate two independent four-bar Hampton phrases.
