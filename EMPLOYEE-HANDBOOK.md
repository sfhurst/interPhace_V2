# interPhace Employee Handbook

**Read this file before every build.**

## Authority
- The user is the project manager. Build only what was requested and agreed.
- Do not add features, controls, pages, documentation, visual systems, architecture changes, or cleanup that was not requested.
- If a requested change conflicts with these rules or the current code, ask instead of improvising.

## Build discipline
- Audit the actual latest approved build before changing it. Do not substitute remembered or intended architecture for the code that exists.
- Build from the latest approved build only.
- Build numbers are consecutive and filenames include a short description.
- Make only the changes agreed for that build.
- Audit the completed build for regressions caused by the build before delivery.
- Do not add build-specific audit/changelog markdown files unless explicitly requested.

### Build 484 — persistent local Phace audition
- Local audition persists across all page/view/instrument/phrase changes and edits while the user remains inside the same Phace.
- Edits must not implicitly press Stop. A render-first Phace may continue playing the already-rendered buffer until the user explicitly restarts audition.
- The center Audition/Stop control remains the explicit local stop control.
- Leaving the current Phace always stops that Phace's local audition. Local audition never follows the user into another Phace.
- This rule applies to synthPhace, drumPhace, arpPhace, dronePhace, and noisePhace.

## Shared shell
- The top row is 100% recycled and always contains exactly three items: left Phace nameplate, center audition button, right `hurst.audio` nameplate. Phaces change content/behavior, not the top-row structure.
- The bottom row contains exactly six recycled buttons: `shellB1` through `shellB6`.
- `shellB6` is the permanent Phace selector.
- Bottom-button presentation is shell-owned: geometry, padding, icon size/stroke, page-number placement, press feedback, focus behavior, border/radius, and responsive sizing live in `shared/shell.css`. Child Phaces may provide only button content/icons plus accent/state semantics. `shellB6` keeps the shared Phace-selector appearance.
- Shared/recycled components remain shared. Do not duplicate them to solve local problems.

## Addressing
- Apps use `app#`.
- Logical button pages use `app#_b#_p#`. The ID is the page address; if the page moves, its ID moves with it.
- Controls beneath a page use readable semantic IDs prefixed by their page address where practical, e.g. `app2_b1_p1_carrierVolume`.
- Recycled physical components may represent multiple logical page addresses. A new logical page does not automatically mean a new DOM component.

## Official UI templates
- **Grid standard:** drumPhace B1 pages are the official grid design/layout until the project manager intentionally replaces that standard.
- **Settings/slider standard:** drumPhace B2 pages are the official settings/slider page design/layout until the project manager intentionally replaces that standard.
- All Phace sliders use the same shared control geometry/layout. Their accent color may follow the active Phace/instrument context.
- Slider tracks use the same light visual weight as the standard step-grid outline: 1px. Keep the slider thumb large enough for touch use.
- **Slider reset standard:** double-clicking a slider returns it to its declared default value. interPhace Mixer sliders are the exception: their existing double-click mute/unmute behavior remains authoritative.
- Do not invent a Phace-specific control style when an official template already exists.
- **Background Selection Grid standard:** use the shared `backgroundSelectionGrid` toolbox control for page-alignment/selection scaffolds. It matches drumPhace B1 geometry (16 rows; 4 columns on phone, 8 on larger screens; same label track and gaps), keeps unused cells invisible/inert, reveals only explicitly activated cells, and uses uniform 1px cell borders with no heavier musical row dividers.
- **Background grid placement is intentional per page:** fixed-row controls stay at their designed rows; predictive-row controls keep their assigned columns but move vertically to the first safe row below foreground controls. Do not make every grid control predictive by default. Current predictive example: synthPhace EQ range buttons. Current fixed examples: Import/Export and iP B5 snapshot buttons.
- **Responsive target:** optimize for reasonable modern phone, tablet/iPad, and normal laptop/desktop viewports. Do not shrink touch targets, distort the grid, or invent cramped fallback layouts merely to support unusably small windows.
- Per-page classes may extend Background Selection Grid styling without changing the shared geometry.

## synthPhace legacy
- `synthPhace-legacy/` is frozen reference code. Do not modify it unless explicitly instructed.
- Legacy IDs and wiring remain intact so old synth logic can be mapped intentionally into the rebuilt live synthPhace.

## Project documentation
- `APP-BUTTON-PAGE-PLAN.md` is permanent architecture documentation and should stay current when the app/button/page plan changes.
- This handbook is permanent project guidance and must be read before every build.


## Preset data truth standard
- Presets are authored data, not suggestions. A preset must contain values the current instrument can actually represent.
- Do not add runtime "best guess," nearest-value, or silent repair logic to make malformed preset data fit a control.
- If a preset value is not legal for its control, fix the preset definition itself.
- Preset setter controls are selectors; the resulting instrument control values are authoritative.
- synthPhace envelope presets must use exact legal Envelope slider values and an exact legal Time Multiplier. Time Multiplier is the intentional range-extension mechanism that preserves fine slider resolution.
- A loaded preset must therefore reproduce its own stored control values exactly and must not appear modified immediately after loading.
- Project-owned musical context such as Root, Scale, and Tempo is not silently rewritten by an instrument preset.


### Exact discrete preset values
- Discrete preset values must be exact members of their instrument tables.
- FM Ratio preset values must exactly equal an entry in the synthPhace FM ratio table; do not select the nearest ratio.
- FM waveform preset values must exactly equal one of the waveform values exposed by synthPhace (`sine`, `square`, `saw`); do not silently substitute another waveform.
- Authored preset validation should fail visibly during development when invalid discrete preset data is encountered. Fix the preset data rather than coercing it at runtime.


### Canonical synthPhace patch context
- synthPhace Patch Presets are authored and validated at C4 (MIDI 60) in Major.
- Root is transposition context and does not define harmony-slider relationships.
- Patch loading must not change the interPhace project Root or Scale.
- Scale-dependent harmony translation must use explicit authored scale/harmony tables. Do not use nearest-note guessing.


### Scale-aware Patch Preset recognition
Patch Presets store canonical Major harmony positions. Explicit per-scale harmony tables translate those positions into the current project scale. Patch loading and Patch Preset matching must use the same table. A freshly selected Patch Preset must recognize itself in every supported global scale and must never dim merely because the project scale differs from Major. Nearest-note logic is not permitted for Patch Preset harmony translation.


### Saved/custom patch harmony context
- Saved/custom synthPhace patches must store the scale in which their harmony was authored plus each harmony's exact scale degree and octave.
- Do not infer imported harmony intent from semitone offsets alone when authored context is available.
- Harmony-family conversion uses the explicit authored degree-mapping tables in the synthPhace patch adapter; do not replace those tables with generic chromatic nearest-note snapping.
- 5→5 and 7→7 scale-family changes preserve degree identity.
- 5→7 conversion uses the explicit 5→7 degree table.
- 7→5 conversion is intentionally approximate: use the explicit deterministic 7→5 degree table. This is accepted musical guessing because a seven-degree scale contains degrees with no exact five-degree counterpart.
- The approximation belongs in the mapping table, where it is reviewable and repeatable; do not add ad-hoc runtime guessing beyond that table.


### Build ZIP packaging and localhost development
- Development localhost serves the permanent working folder `C:\Users\hurst.audio\Dev\interPhace_main\current\`.
- Every delivered interPhace build ZIP must be flat at the project-root level: opening the ZIP shows `index.html`, project JavaScript/CSS, Phace folders, documentation, `favicon.ico`, and other project-root files directly.
- Never wrap a delivered build inside an additional `interPhace-build-XX` folder or other parent directory.
- The ZIP must be suitable for extracting directly into the permanent `current` folder and overwriting its contents while localhost remains running.
- Build/version names belong in the ZIP filename and documentation, not as an extra directory inside the archive.
- Every delivered build increments the integer build number. Do not use letter suffixes.
- Use the canonical root `favicon.ico` supplied by the user in every future build unless explicitly changed.


### The luxury of latency
- interPhace is not a realtime instrument or realtime mixer. Do not optimize architecture around immediate audio response.
- Lean into latency deliberately. Correct, deterministic audio creation is more important than immediacy.
- interPhace creates/renders audio first and only plays audio after creation is complete.
- Never begin playback while render work is still in progress.
- After a global render reports complete, intentionally wait a full 1.0 second before starting playback. This safety pause is part of the product behavior, not a temporary workaround.
- Future playback/export systems should prefer offline/precomputed rendering wherever practical instead of fragile realtime synchronization.


### synthPhace global loop length
- interPhace owns a synthPhace Loop Length setting of 1–16 bars, default 4 bars.
- For global interPhace rendering, an un-arpeggiated synth voice retriggers at that bar interval.
- The next trigger releases the prior voice using the established legacy arp release/retrigger behavior rather than stacking uncontrolled voices.
- arpPhace may later override or layer with this behavior when arp sequencing is engaged.


### Offline synthPhace audition
- synthPhace audition follows the same luxury-of-latency rule as global interPhace playback.
- The complete synth sound is rendered into an in-memory AudioBuffer before any audition audio is played.
- Offline rendering may run faster than the musical duration; a 30-second sound does not intentionally take 30 seconds to create.
- The renderer inspects the completed buffer tail. If meaningful audio still reaches the end of the render window, it extends and re-renders rather than playing a truncated sound.
- The finalized in-memory buffer receives a short terminal fade to an exact zero sample to prevent endpoint discontinuity clicks.
- After the completed buffer is finalized, synthPhace waits the required full 1.0 second before playback begins.
- Audition playback is therefore buffer playback only; synthesis/effects generation does not occur concurrently with what the user hears.


### synthPhace Audition Loop rendering
- Audition Length affects synthPhace audition only when Audition Loop is enabled.
- With Audition Loop off, synthPhace always renders and plays the complete natural audition.
- With Audition Loop on, every cycle re-reads current synthPhace settings, renders a fresh completed in-memory buffer, waits the standard one-second post-render pause, and then plays it.
- A 1–5 second Audition Length is a voice gate. At the gate endpoint the synth voice releases before effects, then the effected output uses the current Effects Release setting so delay/reverb cannot accumulate into the next loop cycle.
- `Full` uses the natural envelope length even while looping.
- A loop cycle never modifies a buffer already being heard; edits become audible on the next read/render cycle.
- Audition Loop continues until the Audition/Stop control is pressed or the user leaves synthPhace.

### Settings terminology and identity
- synthPhace Settings uses `Global Trigger Interval` for the 1-16 bar interPhace-level retrigger interval.
- `Loop Voice Length` and `Loop Audition` are the paired local synthPhace audition-loop controls.
- interPhace B5 Settings page titles use each Phace's identity color as a page-location cue.
- synthPhace Loop Audition uses a synthPhace-blue toggle track when enabled.

### Phace naming and settings colors
- Displayed Phace names use the branded camel-case spelling with capital `P`: synthPhace, drumPhace, arpPhace, noisePhace.
- noisePhace identity color is purple.

### Settings title capitalization
- B5 settings titles must preserve branded camel-case Phace names and must not inherit lowercase text transformation.

### Phace toggle identity colors
- Settings toggles use the owning Phace's actual project identity-color variable when ON; do not substitute generic blue/red/orange/purple values.
- OFF toggles remain neutral/dark.

### Canonical Phace identity colors
- synthPhace: `#00aaff`
- drumPhace: `#ff4b4b`
- arpPhace: `#f29a4a`
- noisePhace: `#a56cff`
- dronePhace: `#66e0b3`
- UI meaning `this Phace` must use the canonical Phace identity color, not an approximate color or an instrument-specific variable.
- Settings titles, toggle ON states, shell accents, and other Phace-identity UI should reference these semantic identity variables.

### Toggle visual standard
- interPhace Settings toggles use a flat hardware-status-light visual rather than a sliding switch.
- OFF is a small neutral circle with an empty center.
- ON adds a smaller centered dot using the owning Phace's canonical identity color.
- Do not use glow, shadow, bevel, animation, or simulated depth for these indicators.

### Toggle outer ring
- The Settings toggle outer ring uses the standard inactive interPhace button border color (`--line`).
- The outer ring remains identical in ON and OFF states; state is communicated only by the inner Phace-colored indicator dot.

### Toggle/slider visual relationship
- Settings toggle outer indicators should visually match the current slider knob rather than approximating its border from unrelated UI variables.
- OFF is the slider-knob visual with an empty center; ON adds only the smaller Phace identity-color center dot.

### synthPhace harmonic companion baseline — Build 293
- H1/H2 harmony voices are core synth voices and must remain audible when Instrument Behavior and Character are both Off.
- Companion base gains are initialized before the neutral personality early return.
- Behavior/Character may modulate companion gain/detune but must never be required for basic harmony audibility.

### arpPhace target architecture — Build 332
- arpPhace is a musical-idea/melody generator first; arpeggiation is one available generation technique, not the defining architecture.
- B1 M1-M4 remains the durable/experimental melody workspace. Generated B2 material is auditioned, mutated, and then kept/pasted into B1 through trial and error.
- Target B2 pages are `Sparse`, `Motif`, `Arp`, and `Phrase`. They are temporary pattern-generator workspaces, not four persistent arps linked one-to-one with M1-M4.
- Rests and empty space are first-class compositional output. Do not fill unused steps merely because a grid cell exists.
- Generator phrase logic should favor small recognizable ideas plus deliberate repetition/mutation structures such as `A A A A′`; mutation preserves identity rather than rerandomizing wholesale.
- B3 Chance/Volume/Gate remains a retained core design.
- Planned producer/style references include Smokers Delight, Postal Service, and Message to Bears. Style changes probabilities within the shared generator architecture.

### arpPhace release/effects-tail rule — Build 332
- Monophonic note ownership does not require hard-cut monophonic audio. A new note may begin while the prior note's natural decay/release continues.
- Delay, reverb, and other post-voice effects may overlap subsequent notes and must be allowed to ring substantially beyond 400 ms when the active patch requires it.
- Do not impose an artificial approximately 400 ms tail ceiling on arpPhace render/audition/export paths.
- Render-first/offline systems should allocate/extend the render window far enough to preserve meaningful voice and effects tails, then terminate cleanly at true silence or an intentional final fade.
- This rule is especially important for sparse delay-driven material where effects tails are part of the composition.

### arpPhace synth-tone melody buffer identity — Build 292
- synthPhace-tone audition buffers for arpPhace must be keyed by both MIDI note and concrete event gate duration.
- Never use melody snapshot `state.gateSeconds` as the note duration; melody snapshots intentionally have no single global gate.
- Melody event `gateSeconds` is authoritative and includes holds, Gate-grid releases, and 32nd-note timing.
- Arp events may still share the same Rate/Gate-derived duration, but they use the same note+gate buffer contract.

### audition runtime fix — Build 291
- Removed duplicate legacy InterPhaceShell.bind calls from arpPhace, drumPhace, and noisePhace HTML. Those stale bindings polled the retired `.isPlaying` class and fought the new state-aware shell binding.
- Shared audition state now also syncs immediately through the `interPhace:audition-state` event rather than relying only on the 100 ms polling fallback.
- dronePhace and noisePhace yield one animation frame after entering rendering state and before their synchronous bed render so the dim stop-square can actually paint.
- drumPhace and synthPhace now notify shared state immediately on idle/rendering/playing transitions.
- arpPhace audition engine notifies the shell immediately when its playback/render state changes.
- drumPhace dynamic kick/snare/hat accent behavior remains intact; only its obsolete duplicate shell-state binding was removed.

### audition CSS cleanup — Build 290
- Removed obsolete child-owned audition icon visibility rules from arpPhace, drumPhace, and noisePhace.
- Shared shell is now the sole owner of play/stop icon visibility and rendering opacity.
- Canonical visual states remain: idle = play triangle; rendering = dim stop square; playing = full-opacity stop square.
- Child Phaces may still own audition accent color semantics, but not icon-state visibility.

### shared audition visual contract — Build 289
- Shared shell owns audition visuals for all Phaces.
- Official states: idle, rendering, playing.
- Idle = play triangle.
- Rendering = stop square at reduced opacity; button remains clickable so rendering can be cancelled.
- Playing = full-opacity stop square.
- Child engines report state; they must not independently own audition icon visibility/opacity.
- Standardizing visual state must not change playback scope. drumPhace B2 synth audition remains active-instrument-only; other drum pages remain full-kit audition. arpPhace remains current-phrase audition. drone/noise remain local bed auditions. synthPhace remains local patch audition. interPhace remains Global Play.
- synthPhace now exposes getAuditionState(), isRendering(), isPlaying(), play(), stop(), and toggle() through its audition engine.

### authoritative Patch contract — Build 288
- A Patch stores every persistent value required to reproduce the selected sound/performance object. Never truncate newer controls to an older state shape.
- Actual parameter/slider values are authoritative. Preset selectors may be metadata, but importing must not depend on preset tables remaining unchanged.
- DRUMS = full three-instrument drum state; KIT = three synths only; KICK/SNARE/HAT = single synth + that instrument's pattern + Chance/Volume/Repeats + style.
- DRONE = all twenty B1–B4 sound slider values; preset indices are optional UI restoration metadata.
- ARP must include pattern/custom-pattern state in addition to macro controls. MELODY includes notes plus Chance/Volume/Gate.
- Patch schema v2 is current; retain v1 import compatibility.
- Project import/export embeds and restores the same child Patch contracts rather than maintaining a second divergent state definition.

### interPhace mixer relationship controls — Build 305
- Relationship controls live at the bottom of interPhace Mixer, below the six level sliders.
- Canonical labels: `Arp / Synth Control` and `Drone / Noise Link`.
- Both use the exact `app1ToggleControl app1PairedControl` + `toggleTrack` contract.
- Drone/Noise Link belongs to interPhace mixer/project state, not noisePhace patch state.
- noisePhace B4 contains only Width, Delay, Reverb, Space Motion, Distance, Preset.
- LINK Off = independent child Space Motion. LINK On with both beds active = exact tested opposed orbit.
- Shared bed auditions use `InterPhaceShell.paintBeforeSynchronousWork()` before heavy synchronous rendering.
- Rendering cursor stays normal; state is communicated by dim stop icon only.

### noisePhace B4 Space + LINK — Build 304
- B4 controls: Width, Delay, Reverb, Space Motion, Distance, Preset.
- LINK clones the canonical 16px circular hardware-status-light toggle; ON uses the noisePhace purple center dot.
- LINK Off = Drone and Noise whole-field Space Motion remain independent.
- LINK On during interPhace Global Play with both beds active = suppress baked child whole-field Space Motion and apply the existing Build 285 opposed orbit once.
- Opposed orbit remains exact tested behavior: Drone pan = `pan`, Noise pan = `-pan`; do not invert samples.
- Linked orbit depth uses the greater authored Space Motion amount from Drone/Noise.
- LINK does not alter Width, Delay, Reverb, Distance, B1/B2 material, or B3 Motion.
- Local noisePhace audition remains independent even when LINK is enabled.
- interPhace Global Play requests 60 seconds from noisePhace.

### noisePhace B3 Motion — Build 303
- B3 controls: Volume Motion, Density Motion, Color/Timbre Motion, Stereo Motion, Motion Speed, Preset.
- Volume Motion is dips-and-returns only; never swell above the authored baseline.
- Density Motion thins B2 stochastic events rather than changing a sequenced/grid density.
- Color/Timbre Motion affects both B1 spectral character and B2 transient tone.
- Stereo Motion affects both continuous B1 energy and B2 event placement.
- Motion dimensions use deliberately different rates/phases; do not synchronize them into one LFO.
- Motion Speed has a wide range: high values must become obvious within seconds while low values support long environmental drift.
- B3 INIT = 0/0/0/0/50 and must preserve the exact pre-Motion sound.
- B3 presets: INIT, BREATHE, GUST, DRIFT, WANDER, TIDE, RESTLESS, ORBIT, WEATHER, DEEP, QUICK, ALIVE.

### noisePhace Amount ownership — Build 302
- B1/B2 presets own C1-C4 only. C5 Amount is a persistent mix control and must never be changed by preset selection, including INIT.
- B1 Amount default = 50; mapping remains UI 0–100 → actual 0–20%.
- B2 Amount default = 50; mapping is UI 0–100 → actual 0–50%.
- Patch/project persistence still stores Amount as authoritative engine state.
- Preset recognition compares only preset-owned controls.

### noisePhace B2 Artifact engine — Build 300
- B2 Artifact is a continuous-time stochastic event engine mixed with B1 Noise before local/global child output.
- Controls: Character, Density, Size, Tone, Amount, Preset.
- Character spans soft/organic particles → vinyl/crackle → electrical/static flecks.
- Density is nonlinear and never tempo/grid quantized.
- Size controls event scale/duration and larger-pop likelihood.
- Tone controls transient bandwidth/brightness.
- B2 Amount uses 0–35% actual gain at UI 0–100.
- B2 preset bank: INIT, VINYL, DUST, OLD RECORD, STATIC, LIGHT RAIN, WINDOW RAIN, EMBER, TAPE, CRACKLE, SPARSE POPS, DAMAGED.
- `NoisePhaceRenderAPI.renderBed()` returns the combined B1+B2 bed; interPhace Noise mixer therefore controls the combined child result through its existing one-channel noise path.

### noisePhace B1 gain staging — Build 298
- B1 Noise Amount uses the full 0–100 UI range but maps to 0–20% actual output gain.
- Do not compensate by changing the authored B1 preset values; preserve their relative relationships.
- This is gain staging only. Color, Tone, Body, Air, and preset identities remain unchanged.

### noisePhace B1 Noise engine — Build 297
- B1 is named Noise, not Continuous.
- B1 controls are Color, Tone, Body, Air, Amount, Preset.
- INIT preserves the rain-like reference at 50/50/50/50/100.
- B1 has 12 curated presets: INIT, WHITE, PINK, BROWN, AIRY HISS, DEEP WASH, SOFT RAIN, DARK RAIN, MIST, VELVET, OPEN AIR, LOW TIDE.
- Color controls broad spectral tilt; Tone controls openness; Body controls low/mid weight; Air controls separate upper hiss/breath; Amount controls B1 source level.
- Preset values must remain exact legal slider values and INIT must remain recognizable after loading.

### noisePhace renderer state binding — Build 296
- After structural clone work, audit transplanted DSP for stale state-object references before release.
- noisePhace B1 renderer reads the canonical live B1 controls/state; removed Build 294 `values.*` references are invalid.
- Structural clone correctness and runtime DSP wiring must both pass before a checkpoint is considered valid.

### noisePhace canonical clone correction — Build 295
- Build 294 custom noise page classes and C/A/M/S text buttons are rejected and must not be reused.
- noisePhace must clone the canonical dronePhace/drumPhace slider-page hierarchy and shell icon treatment exactly where behavior is shared.
- B1–B4 use the canonical slider-controls SVG icon, fixed-page navigation, and standard `drum-synth-*` / `macro*` classes.
- Do not invent Phace-specific slider/page/button presentation when the canonical template exists.
- Only IDs, names, identity color, semantic labels, preset data, and DSP may differ from the canonical clone.
- Extra controls such as the planned Drone LINK must not be given ad-hoc geometry; use an established project control standard when implemented.
- Build 294 is not a valid UI checkpoint.

### noisePhace chassis implementation — Build 294
- noisePhace B1–B4 are fixed pages and do not cycle.
- Old B1/B3 grid, pattern, ghost, variance, and N1–N4 state are retired from active implementation.
- B1 Continuous, B2 Artifact, B3 Movement, B4 Space, B5 Generate, B6 Phace are the canonical noisePhace button meanings.
- noisePhace render length is 60 seconds.
- B1 INIT preserves the prior rain-like default sound; B2 Artifact INIT begins with Amount 0.
- B2-B4 controls may exist structurally before their DSP is implemented; do not claim a control affects audio until wired.
- Use dronePhace as a page/shell structural reference, not as noise DSP.
- Noise patch persistence uses complete B1–B4 slider values plus preset metadata and LINK state.

### noisePhace redesign — Build 287
- Retire the old N1–N4 grid/pattern concept from the forward design.
- noisePhace is a free-running, non-tempo-synchronized evolving material bed.
- Planned pages: B1 Continuous Noise, B2 Artifact/Surface, B3 Movement, B4 Space, B5 Generate.
- B1 and B2 have independent Amount controls and mix continuous spectral noise with stochastic surface events.
- Density is a first-class noisePhace concept.
- Do not route noisePhace into synthPhace or drumPhace. Each instrument owns any noise source it requires internally.
- B3 Movement borrows dronePhace's long-form/asynchronous philosophy but uses noise-native Volume, Density, Color/Timbre, Stereo, and Speed behavior.
- B4 Space uses Width, Delay, Reverb, Space Motion, and Distance. A LINK control may join the Build 285 Drone/Noise Opposed Orbit relationship during interPhace playback.
- Planned B5 Generate eventually selects one curated preset from each B1–B4 page rather than rolling raw sliders.
- Development order: build and validate INIT + presets page-by-page before implementing intelligent Generate.

### dronePhace freeze checkpoint
- Build 286 freezes the current dronePhace core DSP as the canonical checkpoint.
- Planned future B5 Generate behavior: choose one curated preset from each of Voice, Tone, Movement, and Space, generating the full drone from four known-good page presets instead of raw slider rolls.
- Do not implement this Generate change until dronePhace work resumes after noisePhace development.
- The actual drone audition/render length is 60 seconds; any remaining 30-second wording is stale documentation/comment text to clean up in the next code build.

### experimental opposed bed orbit
- Build 285 temporarily tests a Global-Play-only relationship where Drone and Noise use the same whole-field orbit with opposite pan polarity.
- Local child auditions remain independent.
- interPhace suppresses dronePhace's baked whole-field orbit only for the global child render, then applies the shared orbit once to both beds.
- Treat this as an experiment until explicitly promoted to a permanent Bed Relationship feature.

### dronePhace Space authority
- B4 Space owns environment: Width, Delay, Reverb, whole-field Space Motion, and Distance.
- B3 Stereo Motion moves voices independently inside the field; B4 Space Motion moves/orbits the resulting environment as a whole.
- Space Motion must not be a plain fixed-rate sine pan; use asymmetric/variable orbit behavior.
- Distance is acoustic perspective, not mixer volume. Global/mix level remains an interPhace mixer concern.
- Space controls should be clearly audible across their useful range; do not make the top end timid merely to guarantee subtlety.

### dronePhace Movement headroom
- Preserve established useful Movement sounds when expanding range: remap preset positions rather than discarding their DSP targets.
- As of Build 283, roughly slider 0–70 spans the former 0–100 Movement range; 70–100 is deliberate additional headroom.
- High Movement values should increase asynchronous contrast, not force every process to one shared rate. Motion Speed gets the largest upper-range expansion.

### dronePhace Movement authority
- After the initial attack, Movement is attenuation-and-return only. Do not create periodic gain swells above the nominal baseline.
- Volume Motion must support independent per-voice fades and a separate slow full-bed dip/return.
- Upper/color voices may disappear more deeply than the foundation voice so the tonal center remains stable.
- Timbre Motion may withdraw harmonics toward a purer tone and return; Pitch/Voice remain under B1 authority.
- Motion Speed remains slow/asynchronous and must not turn dronePhace into tempo-synced LFO behavior.

### dronePhace Tone authority
- B2 Tone must create materially distinct but bed-safe source coloration; it should not collapse into tiny upper-harmonic changes.
- Tone INIT remains calibrated to the original reference: sine-dominant, restrained second/third harmonic, subtle air, and gentle saturation.
- Tone controls may interact internally, but Voice remains pitch/voicing authority and Space remains stereo/environment authority.

### dronePhace pitch ownership
- interPhace Root remains a full project MIDI/root note because synthPhace may use its register.
- dronePhace deliberately consumes only the Root pitch class and owns its register on B1 Voice.
- dronePhace Harmony must remain scale-aware. Spread means harmonic voicing openness across octaves; stereo width belongs to B4 Space.
- Voice INIT must preserve the original reference voicing target: under C Major, C3–G3–E4–D4–G4 with progressively lighter upper/color voices.

### dronePhace page presets
- B1–B4 use Preset as the sixth page control.
- Page presets change only the five controls on their own page.
- INIT on each page is the canonical default state for that page.
- B1 Voice, B2 Tone, B3 Movement, and B4 Space each have 12 curated page presets as of Build 278. INIT on all four pages reconstructs the canonical default drone.
- Generate remains independent of Preset and continues to randomize the five non-preset controls on the visible page until generation behavior is intentionally revised.

### interPhace bed audition
- dronePhace and noisePhace are free-running bed sources for audition. dronePhace renders 60 seconds; noisePhace renders 30 seconds. The shared bed transport overlaps successive copies by 3 seconds until Stop.
- In interPhace Global Play, Drone keeps an independent 60-second bed boundary and Noise a 30-second boundary, each with 3-second overlap; neither redefines the Drum or Synth/Arp musical loop lengths.
- interPhace must use the child render APIs rather than duplicating child DSP.
- Mixer mute is a render decision: muted channels are skipped before child rendering where possible. Active channels use the interPhace dB mixer gain.

### drumPhace render-first audition
- drumPhace audition follows the luxury-of-latency architecture: read pattern -> fully offline-render audio -> wait 1 second -> play the completed buffer.
- Single click/touch renders Kick, Snare, and Hat together across all currently displayed pattern columns.
- The completed visible-pattern buffer loops in memory; drum voices are not synthesized in realtime during playback.
- Stop fades the playback buffer before stopping.
- drumPhace exposes a reusable visible-pattern offline render API for interPhace global rendering.

### drumPhace visible-pattern loop rendering
- drumPhace audition renders the entire currently displayed pattern width rather than forcing a one-bar loop.
- The musical loop duration is `visible columns × 16 sixteenth-note steps`.
- Final drum decays are allowed to render beyond the musical loop boundary; that tail is wrapped into the beginning of the finished loop buffer so decay continues naturally into the next cycle.
- Do not hard-truncate drum tails at the loop boundary.

### drumPhace audition input
- drumPhace audition uses one action only: single click/touch toggles full-kit audition.
- Do not use long-press or double-click for drumPhace audition.
- Kick, Snare, and Hat are rendered together; selection/muting belongs to mixer architecture rather than audition gesture complexity.

### Phace render level ownership
- Phace renderers should produce audio at their designed nominal level without arbitrary mix-balancing attenuation.
- Relative loudness between Phaces belongs to the interPhace dB mixer.
- drumPhace full-kit rendering uses unity master gain; safety limiting remains a protection stage, not a mix-level control.

### Global mixer ownership
- Individual Phaces read their current gain/mute values from the shared interPhace mixer state before rendering audio.
- synthPhace uses the Synth mixer channel.
- drumPhace applies Kick, Snare, and Hat mixer channels independently before summing the kit.
- Mixer dB is converted with `10^(dB/20)`; mute is exact zero gain.
- Mixer edits affect future renders. Completed in-memory AudioBuffers remain immutable while playing.

### synthPhace single-effects-chain loop rule
- Loop Audition is monophonic through the full synthPhace signal chain, including delay and reverb.
- At Loop Voice Length, the voice releases before effects so the effects stop receiving new signal.
- The existing effected output then performs a short smooth release to zero before the next cycle may begin.
- Effects from one Loop Audition cycle must not accumulate underneath later cycles.
- Normal one-shot synthPhace audition is exempt: it should preserve the complete natural delay/reverb tail.

### Effects Release
- synthPhace Settings and arpPhace Settings each expose an `Effects Release` slider from 10–400 ms in 10 ms steps. Zero is intentionally unavailable to reduce click risk.
- synthPhace default: 120 ms. arpPhace default: 30 ms.
- synthPhace Loop Audition uses its Effects Release setting immediately.
- arpPhace stores its Effects Release independently for arp note/retrigger behavior.
- Effects Release is a post-effects fade used to prevent delay/reverb accumulation; it does not replace the pre-effects voice release.
- synthPhace Effects Release is grouped beneath Global Trigger Interval because it participates in loop/retrigger behavior.

### interPhace global audition
- interPhace global Audition uses the same single-action button logic as the Phaces: one click/touch starts; one click/touch while rendering or playing stops. Do not add long-press or double-click behavior.
- Global Audition is an offline render coordinator, not a realtime mixer.
- The global project Tempo and Length define the completed loop buffer.
- drumPhace renders Kick, Snare, and Hat together using the current device pattern width (typically 8 bars on laptop, 4 on phone) and repeats that finished drum loop to fill the global project loop.
- synthPhace is monophonic and retriggers at Global Trigger Interval. Local synthPhace Loop Audition and Loop Voice Length settings are ignored by interPhace global Audition.
- synthPhace Effects Release is used at each global retrigger so the outgoing effected sound releases rather than accumulating indefinitely.
- Synth/Kick/Snare/Hat read the interPhace dB mixer before their renders.
- interPhace combines the completed Phace renders into one finished in-memory AudioBuffer, applies a final safety stage, waits the required full 1.0 second, then loops that completed buffer.
- Nothing audible begins before the complete global buffer exists.

### Export grid category headers
- Export columns are `Project`, `Patches`, `MIDI`, and `Audio`.
- The four category cells are headers and selectors; each has the same strong bottom-divider treatment used at drumPhace 4/8/12/16 step boundaries.
- Patches, MIDI, and Audio headers select/deselect all export items beneath that category; separate per-column ALL cells are not used.
- Project is singular. Selecting Project also selects all Patch items because every patch used by the project is embedded in the Project export.
- Project selection does not imply MIDI or Audio exports.

### Export header behavior
- Export category headers are controls, not selectable export items.
- Project, Patches, MIDI, and Audio headers never enter a selected visual state.
- Project toggles Patch choices because Project includes all project patches.
- Patches, MIDI, and Audio headers toggle only their child export choices.

### Export button sets
- Patches buttons: Synth, Drums, Kit, Kick, Snare, Hat, Arp, Melody.
- MIDI buttons: Drums, Kick, Snare, Hat, Melody.
- Audio buttons: Synth, Drums, Kit, Kick, Snare, Hat, Arp, Melody.
- Kit sits between Drums and Kick in both Patches and Audio.
- MIDI export skips any selected item that contains no note data; empty `.mid` files are never written.
- Melody exports one Standard MIDI File containing one track for each non-empty M1-M4 melody; empty melodies are omitted.
- Melody Chance is not exported or rolled. Volume maps to MIDI velocity and Gate determines note-off timing.
- Arp sketch pages are intentionally not MIDI export targets.

### Export button preservation rule
- Adding an export type does not authorize removal or renaming of existing export buttons unless the export contract is explicitly changed.
- Current Patches and Audio button sets retain Drone and Noise in addition to the new Kit button.

### Export-page NEW control
- The Export page uses `NEW` as the destructive new-project/reset action.
- NEW returns interPhace and all current Phaces to their authoritative default state and clears persisted pattern grids.
- NEW must not selectively fake-reset visible controls; it clears persisted project/Phace state and lets each app rebuild from its own defaults.
- The Export page does not use a global `ALL` action button.
- `EXPORT` remains the entry point for the export process.

### NEW hold-to-confirm behavior
- NEW is destructive and must require a continuous 1.2-second press-and-hold.
- A flat fill meter inside the NEW button shows hold progress.
- A normal click/tap does nothing.
- Releasing before completion cancels the action and returns the fill to zero.
- At 100%, NEW performs the reset exactly once.

### Project/Patch export contract
- Export creates `<Project Name>.zip` containing `<Project Name>/project.json` and optional `<Project Name>/patch/` files.
- `project.json` is the authoritative full-project document and embeds all valid patches actually used by the project.
- Standalone patch files are reusable typed/versioned state packages requested by selected Patch buttons.
- Export requests for nonexistent, unimplemented, empty, or unused instruments are ignored rather than creating placeholder files.
- Full project import restores from the embedded patches in `project.json`; standalone patch import routes by patch metadata.

### Project vs Patch import ownership
- Project import owns global interPhace context and must restore Project Name, Root, Scale, Tempo, Length, Timing, mixer/mutes, Phace settings, and embedded Phace state.
- Patch import never changes Project Name, Root, Scale, Tempo, or other project-level musical context.
- Patch import routes by typed patch metadata and replaces only the whole/partial Phace state named by that patch.
- synthPhace patch import adapts harmony state to the current project's scale using authored harmony metadata and the explicit harmony-family degree tables; legacy synth patches are reconstructed as faithfully as current controls permit.
- Legacy synth patch root/scale/tempo fields are migration hints only and are not allowed to overwrite current project context during Patch import.
- A single selected Patch export produces a direct standalone patch JSON when no MIDI/Audio exports are selected, supporting patch-library migration.

### drumPhace overlap borders
- interPhace > drumPhace Settings > Borders is the single authority for drum overlap borders.
- Borders is binary; do not reintroduce per-instrument cycling modes.
- When Off, drumPhace shows no other-instrument overlap borders.
- When On, the active drum page shows both other instruments wherever they contain a normal or ghost hit.
- Kick page: Hat uses the top border; Snare uses the bottom border.
- Snare page: Hat uses the top border; Kick uses the bottom border.
- Hat page: Snare uses the top border; Kick uses the bottom border.
- The active instrument's fill/state is never replaced by overlap-border rendering.

### drumPhace overlap border ownership
- When Borders is On, an active step on the current drum page owns a full border in that instrument's identity color.
- Other instruments may replace only the top or bottom edge of that border where they overlap.
- Kick page: Kick owns full red; Hat may replace top with yellow; Snare may replace bottom with green.
- Snare page: Snare owns full green; Hat may replace top with yellow; Kick may replace bottom with red.
- Hat page: Hat owns full yellow; Snare may replace top with green; Kick may replace bottom with red.
- Left/right edges remain the active instrument color whenever the active instrument has a hit.
- Top/bottom overlap indicators remain visible even when the current page's instrument is off on that step.

### drumPhace border persistence
- When the interPhace Borders toggle is On, overlap borders are persistent across drum instrument/page changes.
- Cycling Kick, Snare, and Hat must immediately redraw the border system for the newly active instrument.
- A page/grid rebuild must never temporarily disable or clear the Borders feature; it must render the new grid first and then reapply current border ownership.

### drumPhace active-step dots
- The Borders toggle also enables a centered locator dot for hits belonging to the currently viewed drum instrument.
- Kick = red dot; Snare = green dot; Hat = yellow dot.
- Ghost hits use a lighter/dimmer version of the same dot.
- The dot always represents the active drum page and cycles with Kick/Snare/Hat.
- Other instruments are never represented by dots; their presence remains top/bottom border information.
- Borders Off removes both overlap-border augmentation and active-step locator dots.

### drumPhace border normal/ghost styling
- Borders and active-step dots must reuse drumPhace's established normal-grid visual definitions.
- Border weight matches the standard drum step border weight.
- Normal Kick/Snare/Hat use their normal identity colors; ghost hits use the existing Kick/Snare/Hat ghost colors.
- Normal/ghost state is evaluated independently for every border owner. An overlapping ghost instrument changes only its assigned edge to that instrument's ghost styling.
- Do not introduce separate border-only opacity, color, or weight values when the normal grid already defines them.

### drumPhace step-edit overlay synchronization
- Borders and active-step dots are derived visuals and must be recomputed after every three-stage drum step edit.
- The authoritative pattern cycle remains `off → on → ghost → off`.
- Derived border/dot visuals must never remain on a step after its authoritative state changes.
- Locator-dot pseudo-elements remain non-interactive (`pointer-events: none`) and must not participate in hit testing.

### Handbook maintenance
- The handbook records current authoritative behavior, not a chronological build log.
- When a rule is superseded, replace or consolidate the old rule rather than appending a contradictory correction.
- Build history belongs in `APP-BUTTON-PAGE-PLAN.md`; the handbook should remain concise enough to use as the implementation authority.

### Phace package separation
- Each Phace remains independently packageable and may retain its own local UI implementation when that supports standalone distribution.
- Cleanup must not create dependencies from one Phace into another Phace's source files merely to reduce duplication.
- Within a Phace, remove proven dead template baggage and exact redundant rules only when behavior and cascade context are preserved.

### drumPhace B1 vs B3 border ownership
- interPhace > drumPhace Settings > Borders applies only to drumPhace B1 pattern pages.
- B1 may show active-instrument locator dots plus other-instrument top/bottom overlap borders when Borders is On.
- B3 Chance/Volume/Repeats pages ignore the Borders toggle.
- B3 displays only the current instrument's own full reference border on steps where that instrument has a normal or ghost hit, using the established normal/ghost border colors.
- B3 never shows active-step locator dots or other-instrument overlap borders.
- Keep B3 cell interiors visually clear because these cells are reserved for future text/value display.

### Phace selector identity
- Button 6 opens the shared Phace selector.
- The active Phace button uses its full identity-color border and identity-color label/icon.
- Every inactive Phace button remains neutral except for a single bottom border in that Phace's identity color.
- Selector identity colors: interPhace white, synthPhace blue, arpPhace orange, drumPhace red, noisePhace purple.
- This presentation is shared-shell owned; child Phaces must not override it locally.

### dronePhace UI foundation
- dronePhace is App 6 and remains independently packageable.
- Identity color is mint green (`#66e0b3`), intentionally separated from noisePhace purple.
- B1 Voice, B2 Tone, B3 Movement, and B4 Space are slider-control pages and use the established slider icon.
- B5 uses the shared Generate icon. Additional generation behavior is not yet locked.
- interPhace owns dronePhace project/settings context; B5 P5 is the dronePhace Settings page and initially exposes Timing only.
- Phace selector mode now uses all six bottom buttons: B1 interPhace, B2 synthPhace, B3 arpPhace, B4 drumPhace, B5 noisePhace, B6 dronePhace. The active Phace keeps its full identity treatment; inactive Phaces keep only their identity bottom border.

### Bottom-button Phace icon identity
- On a child Phace's normal pages, its B1-B5 functional button icons use that Phace's canonical identity color even when the button is inactive.
- Active state is communicated by the established full identity-color border; do not gray inactive functional icons.
- The shared B6 Phace button remains shell-owned.

### interPhace B5 page numbering
- interPhace B5 is a recycled multi-page Settings button and must display the current settings page number using the shared bottom-button `.num` treatment.
- The number follows the logical page: P1 synthPhace, P2 drumPhace, P3 arpPhace, P4 noisePhace, P5 dronePhace.

### dronePhace control-template rule
- dronePhace B1-B4 use drumPhace B2 as the literal control-layout template.
- Stage placement, page-title treatment, panel width, slider geometry, label/value layout, vertical spacing, phone compression, and height-responsive spacing must match drumPhace B2.
- dronePhace may differ in identity color and control content only unless an explicit later design intentionally changes the template.

### Slider visual synchronization
- Any Phace using the shared/drumPhace slider template must keep the range input's `--value` fill percentage synchronized with the actual native slider value.
- Initial load, restored state, presets/generation, programmatic changes, and manual input must all use the same visual synchronization path so track fill and knob position never diverge.

### synthPhace control-template rule
- synthPhace slider/control pages use drumPhace B2 as the literal layout template.
- Page-title placement, panel width, label/value arrangement, slider geometry, control spacing, phone compression, and height-responsive breathing must match drumPhace B2.
- synthPhace may differ only by identity color, control content, and explicitly required page-specific functional overlays.

### Template classes extend behavioral classes
- Visual template classes must be added alongside existing Phace behavioral classes unless those original classes are proven unused.
- Never replace classes used by JavaScript for page discovery, navigation, control grouping, or state.
- synthPhace keeps `synth-page`, `page-title`, and `control-stack` even while also using the drumPhace B2 visual-template classes.

### Recycled bottom-button numbering
- Any bottom button that displays a logical page number must participate in the shared `.navBtn` button contract so icon sizing, number sizing, number spacing, press behavior, and alignment match exactly.
- Do not reproduce `.num` styling on a differently structured button.

### Phace page-title identity
- Child-Phace page titles use that Phace's canonical identity color explicitly.
- Do not rely solely on accidental/inherited parent color for page-title identity.

### Canonical Phace identity variables
- Every Phace identity color used by interPhace must be defined in the canonical `:root` identity table, not merely referenced by a page-specific rule.
- B5 settings titles use the uniform selector pattern `.app1-settings-title.<phace>-title`.
- Current dronePhace identity variable is `--phace-drone: #66e0b3`.

### interPhace B5 settings-page identity
- Every B5 child-Phace settings page owns a `--settings-phace-color` derived from the canonical Phace identity variable.
- Shared B5 titles and sliders inherit that page identity color.
- Do not add one-off title-only color fixes for individual B5 pages.
- Current mapping: Synth blue, Drum red, Arp orange, Noise purple, Drone mint.

### interPhace page-title alignment
- Project, Mixer, Import, Export, and Settings titles should share the same apparent vertical title position.
- Utility pages may use absolute positioning to float a title above the Background Selection Grid, but that positioning must reproduce the standard app1 title rhythm rather than introduce a separate top offset.

### Canonical page-name typography
- All primary page names use the same visual typography: 13px size, line-height 1, weight 650, .08em letter spacing, and 2px top inset.
- Child control pages use `.drum-synth-title`; interPhace uses `.app1-title`.
- Different page types may use different positioning mechanisms when required by their layout, but those mechanisms must preserve the same apparent title baseline.
- Historical duplicate title-typography declarations should be removed rather than layered.

### Utility title baseline trim
- Import/Export use absolute title overlays because of the Background Selection Grid.
- Their overlay baseline is calibrated 2px above the prior nominal page-padding calculation: 18px desktop/tablet and 16px phone, matching the apparent baseline of normal interPhace page names.

### B6 Phace gateway presentation
- In normal child/interPhace navigation mode, B6 is visually special because it represents entry into the Phace selector rather than a normal functional page.
- Its alien icon is larger than standard functional icons and the button may use a restrained inset/double-border cue.
- This special presentation must apply only while the selector is closed.
- When the Phace selector opens, B6 becomes the ordinary dronePhace selector choice and must use the same selector presentation rules as B1-B5.

### B6 Phace convergence glyph
- The normal closed-state B6 gateway uses the custom six-Phace convergence glyph: six outer nodes feeding one central node.
- The glyph represents the six Phaces converging through interPhace.
- Normal B6 uses the established 28px gateway icon size and neutral shell text color.
- Do not add a separate decorative border treatment unless explicitly redesigned; the glyph itself provides the special identity.
- Selector-open mode still replaces B6 with the ordinary dronePhace selector button.

### B6 convergence-glyph colors
- Each outer node plus its connecting arm uses one canonical Phace identity color: interPhace white, synth blue, arp orange, drum red, noise purple, drone mint.
- The central convergence node remains neutral white.
- These colors apply only to the normal closed-state B6 gateway glyph; selector mode retains normal selector styling.

### interPhace favicon
- The canonical interPhace favicon is the colored six-Phace convergence glyph used by normal B6.
- Use the shared root `favicon.svg` across interPhace and all child Phaces; retain `favicon.ico` only as a compatibility fallback.

### Six-P interPhace mark
- The current experimental interPhace/B6 mark uses six radial capital-P forms around the central convergence node.
- Each P uses one canonical Phace identity color.
- The same geometry is shared by B6 and `favicon.svg`.

### interPhace brand-mark options
- Current canonical mark: `assets/brand/interphace-mark-six-p.svg` — six colored radial capital-P forms around the white center.
- Preserved alternate: `assets/brand/interphace-mark-convergence-nodes.svg` — six colored node/arm convergence mark from the prior design.
- B6 and favicon currently use the six-P mark.

### arpPhace Rate table
- B2 A1-A4 Rate is a six-position discrete selector: `1/32`, `1/16`, `1/8`, `1/4`, `1/2`, `1/1`.
- Default Rate is `1/16`.
- Because A1-A4 recycle one physical B2 control page, render/sync logic must restore the selected arp's discrete Rate range, index, fill, and musical label.

### JavaScript initialization order
- Constants used while constructing module-level state objects must be declared before those state initializers.
- arpPhace Rate tables/defaults therefore precede `arpUiState` initialization.

### arpPhace B2 pattern-grid foundation
- arpPhace B2 A1-A4 share one recycled Background Selection Grid for future Pattern editing.
- Only logical rows 9-16 are visible.
- Phone: 4 columns × 8 rows. Laptop: 8 columns × 8 rows.
- Traversal follows the standard grid order: A9-A16, then B9-B16, continuing by column.
- This grid is independent of B1 melody-grid behavior.
- Pattern population, semitone labels, editing, and Rate-aware interpretation are separate later builds.

### arpPhace B2 pattern-grid reference
- arpPhace B2 uses the shared Background Selection Grid component from interPhace Import/Export without redefining its geometry.
- Build the same logical 16×8 grid and activate only rows 9-16 for the arp pattern editor.
- Keep the shared label-track column and responsive A-D/A-H visibility rules.
- arpPhace-specific CSS may control layering and identity color only; it must not create a separate grid geometry.

### Grid row-label modes
- Standard full 16-row Phace grids expose clickable row labels. Normal labels are 1-16; alternate zero-based/M8-style labels are 0-F.
- arpPhace B2's half-height Pattern grid exposes logical rows 9-16 as visible labels 1-8; alternate mode is 0-7.
- Clicking any row label toggles the label mode for that Phace and the mode is persisted.
- Four-row grouping remains visible through the established strong bottom divider. On arpPhace B2 this means actual row 12, which is visible row 4.

### Reuse established control styles
- Do not create page-specific visual classes when an established shared/Phace control class already defines the required appearance.
- Short-grid row labels use the same `.labelCell` appearance as standard grid row labels. Their numbering range may differ, but their visual treatment does not.

### arpPhace B2 short-grid label mode
- B2 Pattern-grid row labels toggle between numerical `1-8` and binary `000-111`.
- Binary mode is zero-based and fixed to three bits.
- B2 label mode is independent of the B1/B3 full-grid label mode.
- The standard `.labelCell` appearance is used in both modes.

### arpPhace B2 short-grid label mode correction
- B2 Pattern-grid row labels toggle between numerical `1-8` and hexadecimal/zero-based `0-7`.
- Do not display binary labels on this grid.

### Standard row-label behavior includes interaction
- Reusing the standard `.labelCell` appearance does not replace the standard interaction contract.
- Clickable row labels must also carry the established click and Enter/Space toggle behavior.
- arpPhace B2 short-grid labels use standard appearance plus their own `1-8` ↔ `0-7` mode.

### Recycled-page styling rule
- If a physical page element changes logical ID as a recycled control page cycles, structural/layout CSS must target a stable physical class, not one temporary logical page ID.
- Logical IDs may continue to change for app/button/page identity.
- arpPhace B2 uses stable `.arp-editor-stage` for positioning, layering, and pointer-event ownership across A1-A4.

### Background-grid row-label interaction
- Background Selection Grid disables pointer events at the container level and re-enables them on interactive descendants.
- Standard `.labelCell` row labels placed inside that component must explicitly receive `pointer-events: auto`; this is an interaction override only, not a visual style.

### Global grid row-label preference
- Numerical/hex row labeling is one shared interPhace UI preference, not a per-Phace or per-grid preference.
- Shared storage key: `interPhace.gridLabelMode.v1`.
- Numerical mode displays `1-16` on full grids and `1-8` on arpPhace B2's short grid.
- Hex mode displays `0-F` on full grids and `0-7` on arpPhace B2's short grid.
- Clicking any row label that supports mode switching changes the shared preference for all applicable grids.
- Individual Phaces must not restore an older local label-mode value over the shared preference.

### arpPhace B2 semitone Pattern entry
- Each A1-A4 arp owns an independent 64-cell Pattern array.
- Pattern values are whole-number chromatic semitone offsets from the project root; root is `0`.
- Valid offset range is `-24` through `24`.
- Blank means no Pattern event.
- Only at `1/32` Rate may a visible cell contain two comma-separated offsets such as `6,7`; these represent the primary 16th-position event and its following 32nd-note substep.
- Other Rates accept one integer per visible cell.
- Pattern cells reuse the established Background Selection Grid appearance; stored values receive the canonical arp-orange active border/text identity.

### arpPhace B2 inline Pattern editing
- Pattern cells are edited directly in the grid; do not use prompt/modal entry.
- Active cells use inline text input while retaining the established Background Selection Grid geometry and identity treatment.
- Enter or blur commits a valid value; Escape restores the last valid value.
- Invalid text is never persisted.
- Semitone validation remains `-24` through `24`, with comma-separated pairs allowed only at `1/32`.

### Grid keyboard traversal
- arpPhace B2 Pattern inputs follow the standard column-first grid traversal order for keyboard navigation: A9-A16, then B9-B16, continuing by column.
- Shift+Tab reverses that order.

### arpPhace B2 Pattern preset migration
- B2 Pattern uses the exact final legacy Shape bank as named starting-point presets.
- Pattern index 0 is always `Off` and clears the arp Pattern grid.
- Legacy Shape `phrase[16]` values are already chromatic semitone offsets/rests and therefore map directly to the new root-relative semitone Pattern editor.
- Preset population is Rate-aware and uses the legacy proportional Shape sampling rule so coarse Rates still span the entire one-bar authored phrase.
- The sampled one-bar result repeats across the four-bar 64-cell Pattern state.
- At `1/32`, two sampled substeps are stored in each visible 16th cell as comma-separated values.
- The editable grid remains authoritative after population; presets are starting points rather than a replacement for manual editing.

### arpPhace Pattern Shape duration
- A Pattern preset derived from a legacy Shape is a fixed 16-event contour.
- Do not restart that contour automatically at each bar.
- Rate controls the traversal duration of the 16 events: 1/32 = 1/2 bar, 1/16 = 1 bar, 1/8 = 2 bars, 1/4 = 4 bars, 1/2 = 8 bars, 1/1 = 16 bars.
- The B2 Pattern grid displays/stores the portion that fits its 64 visible sixteenth-position cells.
- At 1/32, two Shape events share one visible cell using comma-separated semitone values.

### arpPhace Shape repetition within the Pattern window
- Treat each legacy Shape as one fixed 16-event contour.
- Rate determines the contour duration.
- Repeat a Shape only after its full contour completes, and only when another complete contour fits in the 64-cell four-bar Pattern window.
- Expected repetitions: 1/32 ×8, 1/16 ×4, 1/8 ×2, 1/4 ×1.
- At 1/2 and 1/1 the contour exceeds the visible window, so display only the leading four-bar portion.

### 1/32 Pattern cell display
- At 1/32 Rate, each visible B2 Pattern cell represents two ordered 32nd subslots and must preserve the comma-pair representation in the grid.
- Do not collapse a populated pair to one displayed value and do not fabricate `0` for an empty first subslot.

### arpPhace 1/32 Pattern mapping
- The canonical 1/32 preset mapping is the Build 173 substep-sampling behavior.
- Each visible 16th cell contains two separately sampled 32nd subslots from the 16-position Shape.
- Do not implement 1/32 by pairing adjacent source Shape entries; that compresses and changes the Shape.
- A populated pair is displayed comma-separated, e.g. `0,0`.
- Empty/rest substeps remain empty and must not be replaced with fabricated `0` values.

### Zero-valued slider/index state
- Never use `value || default` when `0` is a valid slider/index value.
- Rate index `0` is arpPhace `1/32` and must be preserved explicitly.
- Use finite/nullish validation rather than truthiness for enumerated slider indices.

### Canonical arpPhace 1/32 Shape mapping
- At 1/32 Rate, the visible Pattern grid remains 16th-based and each cell stores two consecutive Shape events.
- Pair source entries `(0,1)`, `(2,3)`, `(4,5)`, etc.; do not duplicate a source entry across both substeps.
- A 16-event Shape occupies 8 visible cells and may repeat after the complete contour.
- Rate index `0` is valid 1/32 state and must never be replaced by a truthiness-based default.

### arpPhace B2 Motion
- Motion is not the legacy rhythmic mask. In the new arpPhace architecture it is a discrete, non-destructive rearrangement of the selected Pattern's 16-event source sequence.
- Motion defaults to `Off`.
- Motion is applied before Rate maps the Pattern into the B2 grid, so the transformed order is visible directly in the grid.
- Current Motion presets: Off, Reverse, Ping Pong, Rotate +1, Rotate +2, Rotate +4, Pair Swap, Half Swap, Odds First, Evens First, Outside In, Inside Out, Mirror Half.
- Selecting a different Motion does not rename or overwrite the selected Pattern preset; it derives a transformed grid representation from it.

### arpPhace B2 derived Pattern rebuild
- Rate, Pattern, and Motion are coupled inputs to one derived B2 Pattern-grid representation.
- Their input handlers must use one authoritative rebuild function rather than maintaining separate population snippets.
- Rebuild order is: selected Pattern source → apply Motion permutation → map by Rate → write/display B2 grid.
- Cycling A1-A4 must rebuild any preset-derived Pattern from that page's stored controls so stale stored grid output cannot hide Motion changes.

### arpPhace B2 Gate
- Gate is a per-arp percentage from `10%` through `100%`, default `75%`.
- Gate is measured against the current Rate step duration.
- `100%` holds the voice until the next Rate step; lower values release the pre-effects arp voice earlier.
- The Gate endpoint triggers the established arp voice-release/retrigger stage before effects.
- After the pre-effects voice release, arpPhace's existing Settings `Effects Release` controls the downstream post-effects fade/tail.
- Gate must not create a second Effects Release parameter.
- `10%` is the intentional lower bound to allow tight articulation without a near-zero gate.

### arpPhace Settings — Arp Tone
- Use the standard interPhace toggle component.
- Default On.
- On selects arpPhace's internal tone.
- Off selects synthPhace as the intended arp sound source.
- Persist in interPhace child settings as `arpTone`.
- Shared arp playback should consume this setting when routing is wired; do not create a duplicate sound-source preference.

### Settings toggle wiring
- New interPhace settings toggles must copy the established Borders/Loop Audition persistence pattern, including the actual root persistence function name.
- Do not assume child-Phace `saveState()` helpers exist in root `app.js`.

### Phace settings toggle checked-state colors
- Phace-specific settings toggles reuse the standard toggle component and only specialize the checked dot color through the canonical Phace color token.
- Arp Tone uses `var(--phace-arp)` in the same way Loop Audition uses synth blue and Borders uses drum red.

### arpPhace B2 Audition
- Center Audition on B2 is a page-local looping arp audition. It plays only the current A1-A4 arp page.
- Audition toggles Play/Stop. Cycling arp pages, switching between B1/B2/B3/B4, changing M1-M4/A1-A4, or editing/generating inside arpPhace does not stop the current audition. Leaving arpPhace stops it.
- B1/B3 Audition belongs to the Melody sequencer and remains separate.
- The audio engine receives already-constructed Pattern event offsets; Rate and Motion do not operate as additional realtime transforms during rendering.
- Root offset `0` is the global interPhace Root MIDI note. `+12` and `-12` are octave offsets.
- Global Tempo controls clock timing. Empty Pattern cells are rests.
- Gate ends the pre-effects voice. arpPhace `Effects Release` then releases the effected output.
- The loop repeats only after the complete 16-event Pattern contour duration implied by its construction Rate.

### arpPhace internal audition tone
- Arp Tone On uses a dedicated sustained internal oscillator voice so Gate owns note length.
- Tone recipe: sine fundamental 0.78, octave-under 0.18, second harmonic 0.12, third harmonic 0.035, subtle perfect-fifth component 0.040, and ±5-cent stereo detuned fundamentals at 0.10 each.
- Use an 8 ms attack, warm low-pass filter, mild tanh-style saturation, and short 18/29 ms early reflections.
- Pre-effects voice release follows the standard 8-35 ms Gate fade ending at the Gate boundary.
- Post-effects fade uses arpPhace Settings `Effects Release`.
- Arp Tone Off routes the identical note/event sequence through the current synthPhace patch using synthPhace's bounded arp-note render API.

### arpPhace B1 Melody sequencer
- M1-M4 form one 256-cell linear Melody sequence: M1 then M2 then M3 then M4, wrapping to M1.
- Melody cells use inline semitone-offset text entry with range `-24` to `24`; root is `0`; blank is rest.
- Melody comma pairs are always legal 32nd substeps. Preserve explicit intent such as `0,` and `,0`.
- Tab navigation stays exclusively in Melody cells and traverses the global linear sequence; temporary selector buttons must never capture Tab.

### Melody cell selector
- Clicking a Melody cell opens a temporary selector using the established Background Selection Grid button appearance.
- Selector positions below the selected row when practical and above it near the bottom of the viewport.
- Selector offers scale-valid semitone offsets for one octave in a persisted `+` or `-` direction, plus A1-A4 and Close.
- Direct typing immediately closes the selector.
- Offset labels are the UI language; do not substitute note names.

### Arp-to-Melody transfer
- Selecting A1-A4 copies one complete first pass of that arp's current constructed result into Melody.
- Transfer length follows the arp's Rate-derived first-pass length: 8/16/32/64/128/256 Melody cells for 1/32 through 1/1.
- Source includes current Pattern, Motion and visible manual arp edits. Rests overwrite Melody cells as rests.
- Transfer continues across M1-M4 and wraps. A full 256-cell pass protects the original insertion cell from the final wrapped overwrite.

### Melody audition
- B1 and B3 center Audition play the full M1→M2→M3→M4 linear Melody loop.
- Use global Root and Tempo.
- Arp Tone On uses the internal arp tone; Off routes through current synthPhace patch.

### Melody chooser geometry
- The Melody entry chooser must overlay the existing B1 Melody grid tracks; do not create a floating mini-grid with independent pixel dimensions.
- Chooser buttons reuse `.stepBtn` and real logical row/column positions.
- Prefer placement below the selected row; place above when the chooser would exceed the 16-row grid.
- Native Melody text inputs must obey the same grid placement and box-model contract as standard step buttons.

### Melody selector fixed layout
- Use four grid rows: eight scale offsets across rows 1-2, A1-A4 across row 3, and +/− / Up / Down / Close across row 4.
- Scale paging is eight choices per page, maximum two octaves (`±24`), and clamps at each end.
- Sign mode persists; switching sign returns the selector to its first page.
- Selector overlay buttons must obscure underlying Melody content using the established cell background token.

### Melody chooser write ownership
- A chooser action is authoritative over the currently focused Melody input.
- Before applying a chooser note or arp transfer, suppress the outgoing input's blur commit so stale input text cannot overwrite the new state during redraw.

### Manufactured grid-button rule
- DrumPhace establishes the canonical physical grid button (`.stepBtn`).
- Any control described as the same physical grid button must use that actual class/physical contract, not a visually similar reconstruction.
- Phaces may vary identity color, displayed content, and behavior only.
- arpPhace B1 Melody and B2 Pattern cells use the canonical `.stepBtn` physical button.

### Editable canonical grid buttons
- If a canonical `.stepBtn` must also accept text input, the editable element still uses `.stepBtn` as the sole physical geometry contract.
- Input-specific CSS may control text alignment, caret, validation state, and identity color only.
- Do not restate or override width, height, padding, margin, radius, background, box sizing, or other manufactured-button geometry.

### Disabled overlay controls
- Overlay selector buttons must remain fully opaque even when disabled.
- Never dim the entire button with opacity because that reveals the underlying grid.
- Disabled state may dim only the foreground glyph/text while preserving the canonical button background and border.

### Mixer — Arp trigger
- interPhace B2 Mixer exposes an `Arp` toggle for the Synth part.
- Off: synthPhace is sequenced by its normal Global Trigger Interval.
- On: the Global Trigger Interval is bypassed for global audition and the current arpPhace B2 arp pattern sequences the synthPhace patch instead.
- This is a trigger-source selector, not an additional mixer channel.
- In Mixer Arp mode, synthPhace remains the sound source and the Synth mixer channel remains the level/mute owner.
- Use the current arp's constructed event stream (Pattern, Motion, Rate-derived timing, Gate) and repeat its complete contour through the global project loop.

### Melody selector Clear
- The selector's fifth row is a four-column-spanning `CLEAR` control.
- CLEAR affects only the current M1-M4 Melody page, never the entire 256-step sequence.
- It uses the canonical grid-button component and does not participate in Tab navigation.

### Melody drag editing
- Melody cells support optional vertical drag editing for single semitone values.
- Walk only through offsets allowed by the current global scale, clamped to `±24`.
- Normal click still opens the selector; a recognized drag consumes that click.
- Comma-pair cells are not drag-edited unless a later interaction rule explicitly defines which substep is being edited.


### Build 221 — drumPhace B2 isolated audition
- On drumPhace B2 Synth pages, the shell Audition button renders and loops only the currently active drum instrument's visible pattern.
- Kick B2 auditions Kick only; Snare B2 auditions Snare only; Hat B2 auditions Closed Hat only.
- The render is frozen once playback begins. B2 slider edits do not alter the playing loop, but they also do not stop it; Stop and Audition again when you want to hear the newly edited render.
- Other drumPhace pages retain the existing full-kit audition behavior.

### Build 270 — per-Phace documentation ownership

Beginning with Build 270, each Phace package owns two canonical Markdown documents: `BUTTON-MAP.md` and `PLAN.md`. `BUTTON-MAP.md` describes the implemented/current button and page structure. `PLAN.md` describes current status, agreed direction, next work and intentionally open items. interPhace itself keeps these documents in the root-level `interPhace/` documentation folder. The root `APP-BUTTON-PAGE-PLAN.md` is an index only. Shared cross-Phace rules continue to belong in this handbook.


### Build 271 — drumPhace explicit bar copy/paste state

On drumPhace B1 Pattern pages, long-pressing a row-1 bar step retains the existing full-column copy behavior but now exposes the state directly in row 1: the source cell reads `Copied` and every other row-1 bar cell reads `Paste`. Tapping the source or another non-paste control cancels copy mode and restores the normal grid. Tapping a `Paste` cell performs the existing paste operation and then restores the normal grid. No copy payload semantics changed.


## Build 333 — arpPhace B2 controls locked

arpPhace B2 target controls are now locked as: Sparse = Variation / Space / Repetition / Movement; Motif = Complexity / Space / Repetition / Movement; Arp = Rate / Gate / Pattern / Motion; Phrase = Complexity / Space / Resolution / Movement. These are musical bias controls; Style owns low-level event count, placement, pitch/range/interval and rhythm tendencies. Gate behavior is generator-specific: Sparse mostly long/open, Motif varying gate as part of the repeating motif, Arp steady global Gate, Phrase varying contextual gate. B3 remains the per-note Chance/Volume/Gate override layer. Implementation remains for a later build.


## Build 486 — Unified Slider Geometry
- Slider-bearing pages across all active Phaces now use one shared visual layout.
- The page title has a reserved row; the remaining control area is divided into eight equal vertical slots.
- Pages with fewer than eight sliders occupy the upper slots without changing slider-to-slider spacing.
- arpPhace B2's four sliders therefore occupy exactly the upper half of the standard control area.
- Slider panels use a 12 px left/right touch-safe inset on iPhone while background grids remain full-width.
- Per-Phace legacy spacing rules remain in their historical CSS but are superseded by the shared shell rule.
