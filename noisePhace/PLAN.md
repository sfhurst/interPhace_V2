# noisePhace Plan

## Current position — Build 305

noisePhace is being redesigned as a continuous, evolving noise-bed instrument. The old 16×4/8 pattern-grid concept is retired. noisePhace is not a sequenced event lane, does not route noise into synthPhace or drumPhace, and does not need tempo-synchronized pattern logic.

The design should borrow the successful four-engine architecture of dronePhace without turning noisePhace into a copy of dronePhace. dronePhace is fundamentally about pitched voices; noisePhace is fundamentally about material: continuous noise, stochastic surface events, their evolving density/spectrum, and the environment they occupy.

The child remains render-first and non-realtime. Local audition renders a full bed and loops it with overlap. interPhace Global Play consumes the child renderer as an independent bed source.

## Core architecture

- B1 — Noise
- B2 — Artifact / Surface
- B3 — Movement
- B4 — Space
- B5 — Generate
- B6 — Phace selector / shell navigation as defined by interPhace

B1 and B2 are independent source engines with their own Amount controls so they can be blended. B3 and B4 operate on the resulting noise environment.

No noise engine is routed into synthPhace or drumPhace. If a drum synth later needs noise, implement the required limited noise source inside drumPhace itself. synthPhace already owns its own noise capability.

## B1 — Noise

Purpose: create the continuous noise floor/material underneath the environment.

Candidate controls:

1. Color
2. Tone
3. Body
4. Air
5. Amount
6. Preset

### Color

Color should be a continuous spectral-shaping control rather than a collection of unrelated hard-coded generators. It should cover useful regions associated with brown, pink, white, brighter/blue-like, green-like, and other shaped noise spectra.

Named presets may use familiar terms such as Brown, Pink, White, Green, Air, Deep, etc., but the DSP should not falsely imply that informal noise-color names have one universally standardized spectral definition.

### Tone

Broad tonal/filter shaping for the continuous source. It should be clearly audible and useful from dark/soft through bright/open.

### Body

Controls low/mid weight and physical fullness independently of simple brightness. It should allow a noise bed to feel deep, soft, broad, thin, or lightweight.

### Air

Controls high-frequency breath/hiss presence. It should provide a useful distinction between a soft colored-noise floor and an airy surrounding layer.

### Amount

Mix amount for the Continuous engine. Zero removes this source without disabling the other noise engine.

### Presets

Eventually target approximately 12 curated presets. INIT should define the canonical noisePhace continuous source. Presets should occupy known-good regions of the engine and may include concepts such as White, Pink, Brown, Air, Deep, Soft, Bright, etc. Final names and values must be determined by listening.

## B2 — Artifact / Surface

Purpose: create discrete stochastic material living inside or on top of the continuous bed.

Candidate controls:

1. Character
2. Density
3. Size
4. Tone
5. Amount
6. Preset

This engine should be capable of vinyl/record crackle but should not be limited to vinyl. It is a general continuous-time stochastic event engine.

Candidate material includes:

- vinyl crackle
- record surface noise
- dust
- tiny ticks
- pops
- soft static events
- electrical flecks
- granular debris
- sparse crackles
- rain-like micro-events
- other non-rhythmic surface artifacts discovered during development

### Character

Changes event morphology/distribution: click-like, dusty, crackly, soft static, granular, electrical, etc. This may eventually require internal DSP families rather than one interpolation.

### Density

First-class noisePhace parameter. Controls how frequently stochastic events occur. Events remain continuous-time and non-tempo-synchronized.

### Size

Controls event magnitude and/or duration character. Small values should support tiny dust/tick behavior; larger values may create more substantial cracks, pops, or broader events while remaining musically useful.

### Tone

Filters/colors the artifact events independently from B1 Noise Noise.

### Amount

Mix amount for the Artifact engine. Zero removes artifacts while leaving Noise intact.

### Presets

Eventually target approximately 12 curated presets. Vinyl/Record Crackle should be a primary reference preset, with additional presets developed for dust, sparse ticks, granular surfaces, electrical/static material, and other useful textures.

## B3 — Movement

Purpose: make the noise material evolve over long periods without becoming rhythmic.

Candidate controls:

1. Volume Motion
2. Density Motion
3. Color / Timbre Motion
4. Stereo Motion
5. Motion Speed
6. Preset

The Movement philosophy should inherit what worked in dronePhace: asynchronous processes, long-form withdrawal and return, useful subtlety at low/mid values, and an obvious but still musical upper range.

noisePhace Movement must use noise-native behavior rather than copying pitched-voice DSP.

### Volume Motion

Allows the overall noise environment and/or its component sources to recede, nearly disappear, and return. Motion is primarily attenuation-and-return rather than periodic swelling above nominal level.

### Density Motion

Modulates stochastic event population over time. Artifact activity may thin out, become sparse, disappear, and repopulate independently of overall volume.

This is a core distinction from dronePhace.

### Color / Timbre Motion

Moves spectral character over time. High hiss may withdraw while lower material remains; a noise floor may become darker/softer and later regain air; artifact coloration may evolve independently where useful.

### Stereo Motion

Moves internal noise components within the stereo environment. This is analogous in ownership to dronePhace Movement Stereo Motion: it moves material inside the field, not the field itself.

### Motion Speed

Controls the overall timescale while preserving asynchronous rate differences among the underlying processes. Do not make every modulation share one literal rate.

### Presets

Eventually target approximately 12 curated movement identities. Preserve the dronePhace lesson that 100 should be obvious and useful, not timid or intentionally unusable.

## B4 — Space

Purpose: define the acoustic environment around the noise material.

Candidate controls:

1. Width
2. Delay
3. Reverb
4. Space Motion
5. Distance
6. Preset

Space should use the successful semantic separation established in dronePhace:

- Movement Stereo Motion moves source material inside the environment.
- Space Motion moves/shapes the environment as a whole.

The DSP may borrow proven concepts from dronePhace, but values and ranges should be tuned for noise material by listening rather than copied blindly.

### Width

Near-mono through a clearly wide/decorrelated field.

### Delay

Asynchronous, non-tempo-synchronized reflections/echo field.

### Reverb

Diffuse environment ranging from restrained space to large wash.

### Space Motion

Whole-field spatial motion/orbit. Standalone noisePhace may use its own orbit.

### Distance

Acoustic perspective rather than mixer volume: direct presence/high-frequency detail may recede as distance increases while the diffuse field remains.

### Drone relationship / LINK

Add a simple relationship toggle associated with Space Motion.

- LINK Off: noisePhace uses its own standalone Space Motion.
- LINK On: during interPhace combined playback, noisePhace joins the shared bed orbit relationship with dronePhace.
- The reference linked behavior is the Build 285 Opposed Orbit experiment: Drone and Noise use the same whole-field orbit with opposite spatial polarity.
- When Drone moves left, Noise moves right; when Drone moves right, Noise moves left.
- Noise retains its own Width, Delay, Reverb, Distance, source material, and internal Movement. LINK coordinates the whole-field orbit only.
- Do not mechanically invert audio samples.
- Preserve Build 285's opposed-orbit behavior as the initial reference implementation.
- Orbit intensity/depth control may be explored later if needed; do not complicate the first permanent implementation unnecessarily.

## B5 — Generate

Long-term Generate should follow the same preset-combination philosophy planned for dronePhace.

Generate should choose:

- one curated B1 Noise preset
- one curated B2 Artifact preset
- one curated B3 Movement preset
- one curated B4 Space preset

Generate should target the whole noisePhace instrument rather than directly randomizing raw sliders.

The goal is a random combination of known-good page identities that remains understandable after generation because each page visibly lands on a named preset. Manual slider editing remains available afterward.

Do not implement Generate intelligence before the four engines and their preset banks are musically established.

## Non-rhythmic timing rule

noisePhace is a free-running bed.

- No 16-step grid.
- No bars.
- No 16ths/32nds.
- No tempo synchronization for stochastic events.
- No M1–M4 sequencing.
- Artifact events occur in continuous time. A crackle may occur at any point in the render rather than being quantized to musical steps.
- interPhace mixer controls whether the bed is audible and at what mix level.

## Audition / rendering

Current architecture remains render-first.

- Local audition fully renders the child bed before playback.
- Bed playback loops with overlap to hide fade/seam behavior.
- interPhace Global Play consumes the child renderer rather than duplicating the noise DSP.
- The existing 30-second noise render remains acceptable as the current starting point. Render length may be revisited after the new engines establish how slowly their Movement needs to evolve.
- Muted/inactive global sources should not be rendered unnecessarily.

## Development order

Use the development process that succeeded for dronePhace:

1. Remove/retire the old grid behavior from active noisePhace design.
2. Build one excellent B1 Noise INIT source and wire its controls to real DSP.
3. Expand B1 ranges until controls are clearly audible while INIT remains the reference.
4. Build and audition B1 presets.
5. Build B2 Artifact INIT, using vinyl/record crackle as a primary reference target.
6. Expand B2 and build its preset bank.
7. Build B3 Movement around noise-native volume, density, spectral, stereo, and timescale behavior.
8. Build B3 presets and expand the upper range if required.
9. Build B4 Space, borrowing the proven dronePhace semantic model.
10. Build B4 presets.
11. Permanently implement/test the optional Drone LINK / Opposed Orbit relationship in interPhace.
12. Only after all four pages are strong, implement B5 preset-combination Generate.

## Design principles

- noisePhace is material, not notes.
- Continuous noise and stochastic artifacts are separate source families.
- Density is a first-class parameter.
- Source engines mix through independent Amount controls.
- Motion is asynchronous and long-form, never a disguised rhythmic LFO.
- Space Motion owns the whole environment; Movement Stereo owns material inside it.
- Top-end control values should be clearly audible and remain musically useful.
- Preserve good INIT sounds when expanding ranges by remapping values rather than casually changing the reference sound.
- Prefer a small number of broad, expressive DSP engines over many brittle one-off generators.
- Build presets only after the underlying controls have useful musical ranges.
- noisePhace remains independent when auditioned alone and can become dronePhace's spatial dance partner when LINK is enabled.

## Chassis rebuild — Build 294

noisePhace now uses the planned fixed four-page architecture in code and UI. The old B1/B3 grids, N1–N4 cycling, pattern/ghost state, variance state, and grid-era navigation are retired from active noisePhace.

Implemented structural pages:
- B1 Noise — Color / Tone / Body / Air / Amount / Preset
- B2 Artifact — Character / Density / Size / Tone / Amount / Preset
- B3 Movement — Volume Motion / Density Motion / Color-Timbre / Stereo Motion / Motion Speed / Preset
- B4 Space — Width / Delay / Reverb / Space Motion / Distance / Preset + LINK
- B5 Generate remains intentionally inert until curated preset banks exist.
- B6 remains Phace.

Render length is now 60 seconds. The previous pleasant rain-like default renderer is preserved as the B1 INIT sound at the existing neutral 50/50/50/50 source values with Continuous Amount 100. B2 Artifact INIT starts with Amount 0 so the new source layer does not alter that reference sound before its DSP exists.

B2-B4 controls are structural only in this build except the LINK state itself; they must not be mistaken for finished DSP. The existing render-first child API, local overlap loop, and interPhace bed integration remain in place.

Noise Patch persistence now follows the new four-page authoritative-value shape: five sound values per page, preset metadata, and LINK state.

## Canonical clone correction — Build 295

Build 294's custom noise-only page classes and text-letter B1–B4 buttons are rejected. noisePhace now clones the canonical dronePhace/settings-page UI structure exactly where semantics are shared.

Canonical shared structure:
- B1–B4 use the same slider-controls SVG icon used by dronePhace.
- Pages use `drum-synth-stage` → `drum-synth-panel` → `drum-synth-title` → `drum-synth-controls`.
- Controls use `macroControl`, `macroLabel`, `macroSlider`, `macroValue`, and `presetSlider`.
- B1–B4 are fixed pages and never cycle.
- B5 remains Generate; B6 remains the canonical shared Phace button.
- Slider controls 1–5 use 0–100, step 1.
- Preset remains control 6 and uses the canonical preset-slider presentation.
- Double-click slider reset is implemented from each control's declared INIT default.

Only semantic differences from dronePhace are allowed: app IDs, identity color/name, page/control labels, preset data, and noise DSP.

The visible LINK control from Build 294 is removed because no canonical placement/control geometry has yet been established. The relationship remains in the roadmap and must use the established hardware-status-light toggle language when implemented.

Render remains 60 seconds. B1 INIT preserves the current rain-like reference sound. B2 Artifact INIT remains Amount 0. B2-B4 DSP remains intentionally unwired until developed page-by-page.

## Runtime renderer reference fix — Build 296

Build 295 structurally cloned dronePhace correctly but retained stale Build 294 renderer references to the removed `values` object. The B1 rain INIT renderer now reads the canonical B1 slider controls directly. No obsolete `values.*`, grid, N1–N4, or variance-state references remain in active noisePhace JS.

## B1 Noise engine — Build 297

B1 is now named Noise rather than Continuous.

Controls are wired to real DSP:
- Color — moves the broad spectral tilt from deep/brown-weighted through pink/reference toward white/bright material.
- Tone — opens/closes the upper spectrum independently of Color.
- Body — controls low/mid weight and physical fullness.
- Air — adds a separate upper breath/hiss component.
- Amount — true B1 source level after source-character normalization.
- Preset — curated B1 selector.

Initial B1 preset bank:
INIT, WHITE, PINK, BROWN, AIRY HISS, DEEP WASH, SOFT RAIN, DARK RAIN, MIST, VELVET, OPEN AIR, LOW TIDE.

INIT remains the canonical rain-like reference at 50 / 50 / 50 / 50 / 100. B2 Artifact remains silent at INIT Amount 0, so B1 can be judged independently.

Preset values are exact legal 0–100 control values. B1 now has a real 0–11 preset selector; B2–B4 remain INIT-only until their engines are developed.

## B1 gain staging — Build 298

B1 Noise Amount retains its 0–100 UI range, but now maps to 0–50% actual output gain. This reduces the perceived loudness of broadband noise without changing Color, Tone, Body, Air, preset values, or preset relationships. Amount 100 is therefore half the previous output level.

## B1 gain staging — Build 299

B1 Noise Amount now maps 0–100 UI to 0–20% actual output gain. No B1 DSP or preset values changed.

## B2 Artifact engine — Build 300

B2 Artifact is now real DSP and mixes with B1 Noise before local audition and before `NoisePhaceRenderAPI.renderBed()`. interPhace therefore receives the combined B1 + B2 noise bed through its existing noise mixer channel.

Controls:
- Character — soft/organic particles through vinyl/crackle toward sharper electrical/static flecks.
- Density — strongly nonlinear stochastic event population; low values stay sparse, high values become busy but remain discrete.
- Size — event duration/scale and probability of larger pops.
- Tone — transient bandwidth/brightness.
- Amount — Artifact layer level, conservatively capped to 12% actual gain at slider 100.
- Preset — curated B2 identities.

Initial presets:
INIT, VINYL, DUST, OLD RECORD, STATIC, LIGHT RAIN, WINDOW RAIN, EMBER, TAPE, CRACKLE, SPARSE POPS, DAMAGED.

Artifact timing is continuous-time and stochastic. Event time, amplitude, stereo position, exact size, and morphology vary independently. No tempo/grid logic is used.

B1 and B2 are mixed inside the child renderer before the final safety stage. The interPhace Noise mixer continues to treat noisePhace as one child bed source, so its existing mute/dB channel controls the combined result.

## B2 gain staging — Build 301

B2 Artifact Amount now maps 0–100 UI to 0–35% actual output gain. Preset values and B2 DSP are unchanged.

## Amount ownership — Build 302

B1 Noise and B2 Artifact presets now control only C1-C4 character controls. C5 Amount is independent of preset selection.

Rules:
- B1 Amount defaults to 50 and retains the approved 0–20% actual-gain mapping.
- B2 Amount defaults to 50 and now maps 0–100 UI to 0–50% actual gain.
- Changing B1 or B2 presets never changes Amount.
- INIT resets only the preset-owned character controls; Amount stays where the user left it.
- Patch/project persistence still stores Amount because it is part of the authoritative engine state.

## B3 Motion engine — Build 303

B3 Motion is now active across the combined B1 Noise + B2 Artifact environment.

Controls:
- Volume Motion — creates dips and returns below the authored B1 level; never positive swells above baseline.
- Density Motion — stochastically thins B2 Artifact events and lets them return to the authored density.
- Color / Timbre Motion — slowly shifts B1 spectral color/tone and gently shifts B2 transient tone.
- Stereo Motion — moves B1 energy and B2 event position across the stereo field using independent wandering motion.
- Motion Speed — scales the ecosystem across a deliberately wide range while individual motion dimensions retain different rates and phases.
- Preset — curated motion behaviors.

Presets:
INIT, BREATHE, GUST, DRIFT, WANDER, TIDE, RESTLESS, ORBIT, WEATHER, DEEP, QUICK, ALIVE.

INIT is 0 / 0 / 0 / 0 / 50 and is sonically identical to the pre-Motion B1+B2 engine. Motion dimensions do not use synchronized LFO rates. At high Speed, movement becomes audible within seconds; lower settings can evolve over much longer periods.

The design target is environmental departure and return: rain/noise can seem to be pushed away, thin out, change spectral character, move through the stereo field, and return.

## B4 Space + LINK — Build 304

B4 Space is now active:
- Width — near-mono through clearly wide mid/side field.
- Delay — asynchronous non-tempo-synced reflections.
- Reverb — diffuse irregular reflection field.
- Space Motion — whole-field orbit using the same asymmetric orbit family already established in dronePhace / Build 285.
- Distance — darkens/recedes direct detail while retaining diffuse energy.
- Preset — 12 curated space identities.

Presets:
INIT, WIDE, ROOM, HALL, DISTANT, ORBIT, FLOAT, CAVERN, CLOSE, REFLECTION, SPIN, FAR FIELD.

LINK uses the canonical circular hardware-status-light toggle cloned from the project toggle standard. OFF is an empty ring; ON adds the noisePhace-purple center dot.

LINK behavior:
- Off: noisePhace local/global child render uses its own B4 Space Motion independently; dronePhace uses its own Space Motion independently.
- On, when both Drone and Noise are active in interPhace Global Play: both child renderers suppress their baked whole-field Space Motion and interPhace applies the existing tested Build 285 opposed orbit once, with Drone pan and Noise negative pan.
- Linked orbit depth uses the greater of Drone and Noise authored Space Motion values so either Phace can intentionally raise the shared orbit.
- LINK affects only whole-field orbit. Width, Delay, Reverb, Distance, B1/B2 material, and B3 Motion remain independent.
- Local noisePhace audition remains independent even when LINK is stored On.

interPhace Global Play now requests the full 60-second noisePhace bed rather than the stale 30-second duration.

## Mixer-owned Drone / Noise Link — Build 305

The Drone/Noise LINK relationship is no longer a noisePhace control. noisePhace B4 contains only Width, Delay, Reverb, Space Motion, Distance, and Preset.

interPhace Mixer now owns two relationship controls at the bottom of the mixer:
- Arp / Synth Control
- Drone / Noise Link

Both use the exact canonical `app1ToggleControl app1PairedControl` + `toggleTrack` implementation. Drone/Noise Link state is stored in interPhace mixer/project state and is not part of a noise patch.

Global behavior:
- Link Off: dronePhace and noisePhace use their own independent Space Motion.
- Link On with both beds active: child whole-field motion is suppressed and the existing tested opposed orbit is applied once.
