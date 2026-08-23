# dronePhace Plan

## Current position — Build 291

dronePhace now has its first complete DSP-authoritative audition engine. The 20 macros are wired to Voice, Tone, Movement and Space behavior, and the declared defaults recreate the project's airy consonant reference drone: scale-aware add9-style voicing, sine-dominant harmonics, asynchronous breathing, subtle pitch life, air, stereo width, quiet cross-delay, restrained reverb and soft saturation.

## DSP development order

1. Voice: source, harmony, voice count, register and spread.
2. Tone: harmonic balance, brightness/filtering, resonance, air/texture and saturation.
3. Movement: slow volume, pitch, timbre and stereo motion with musically useful speed ranges.
4. Space: width, delay, reverb, space motion and final drone level.
5. Generate: currently randomizes only the five macros on the visible B1–B4 page. After listening tests, page-specific weighting can be added only where it improves results.

## Integration

DronePhace inherits project Root/Scale and appears in the interPhace mixer as a bed. Local Audition fully renders 30 seconds, then the shared bed transport overlaps successive copies by 3 seconds until Stop. The renderer no longer bakes a pronounced full-buffer fade into every 30-second segment. Global Play calls the same child renderer through `DronePhaceRenderAPI` and uses the same bed transport independently of Drum and Synth/Arp musical loop lengths.

## Preserve

Simple macro control, restrained movement, render-first audio, independent child-package state, and canonical dronePhace identity styling.

## Voice preset bank — Build 275

B1 Voice now has a sixth Preset control with 12 curated page-level starting identities: INIT, Open Fifth, Open Triad, Add9, Suspended, Low Bed, High Air, Octaves, Wide Fifth, Choral, Luminous, and Foundation. INIT exactly restores the established default Voice values `[0, 50, 50, 50, 58]`. Presets affect Voice only. B2–B4 now reserve the same sixth Preset control at INIT while their curated banks are developed. Generate remains unchanged and still randomizes only the five non-preset controls on the visible page.

## Tone preset bank — Build 276

B2 Tone now has 12 curated page-level materials: INIT, Pure, Warm, Airy, Luminous, Glass, Hollow, Dusty, Worn, Soft Analog, Breath, and Dark. INIT exactly restores the established default Tone values `[22, 42, 8, 28, 18]`. Presets affect Tone only. Manual slider changes retain the preset name only on an exact match. Generate remains unchanged and randomizes only the five non-preset controls on the visible page.

## Movement preset bank — Build 277

B3 Movement now has 12 curated evolution behaviors: INIT, Still, Slow Breath, Deep Breath, Glacial, Drift, Tide, Stereo Wander, Bloom, Uneasy, Float, and Restless. INIT exactly restores the established default Movement values `[55, 18, 38, 34, 24]`. The bank is intentionally more audible than Tone while remaining suitable for evolving beds: movement is slow/asynchronous rather than tempo-LFO behavior. Presets affect Movement only. Generate remains unchanged.

## Space preset bank — Build 278

B4 Space now has 12 curated environments: INIT, Close, Wide, Deep, Long Hall, Wash, Echo Field, Distant, Floating, Huge, Narrow Dark, and Expansive. INIT exactly restores the established default Space values `[72, 34, 58, 26, 72]`. The bank intentionally separates width, depth, delay, spatial movement, and output level rather than treating Space as a reverb-amount selector. Presets affect Space only. Generate remains unchanged.

With 12 curated presets on each of Voice, Tone, Movement, and Space, dronePhace now has 20,736 page-preset combinations before manual slider changes or Generate.

## Voice engine remap — Build 279

B1 Voice now owns drone register and harmonic spacing explicitly. interPhace Root remains unchanged for the project, but dronePhace consumes only its pitch class; the octave portion of a global root such as C4 does not force the drone register. Register selects one of five musically useful octave regions around the drone's own neutral register. Notes/Harmony selects one of 12 curated target-interval families that snap to the active global Scale. Spread now changes octave placement of chord tones (compact through very wide) rather than adding stereo detune. Stereo width remains a Space responsibility.

Voice amplitudes remain intentionally weighted so the foundation is strongest and upper/color tones become progressively lighter. Voice INIT was remapped to `[0, 18, 100, 50, 50]`; under C Major this resolves to the original reference pitch stack C3–G3–E4–D4–G4 with the original weighted hierarchy. The numeric slider positions changed, but INIT's musical target did not.

## Tone engine expansion — Build 280

B2 Tone was widened substantially while keeping INIT as the sonic anchor. Harmonics now moves from near-pure sine into a richer controlled upper-harmonic material; Brightness now also drives a broad musical low-pass/tone response; Resonance adds restrained 5th/7th spectral emphasis rather than a token single harmonic; Texture/Air ranges from pristine through the original subtle air to clearly breathy/grainy surfaces; Saturation expands from clean through warm compression into worn/dense coloration without hard distortion.

The 12 Tone presets were re-authored across the wider engine. INIT retains `[22, 42, 8, 28, 18]` and remains calibrated near the original reference coefficients and air/saturation behavior. The goal is no longer merely 20,736 combinations, but 20,736 combinations spanning materially different drone families.

## Movement engine expansion — Build 281

B3 Movement now uses downward-only evolution after the initial attack. Volume Motion controls independent long per-voice attenuation plus a separate slow whole-drone dip; voices return to their nominal baseline but never swell above it. Upper/color voices are allowed deeper fade-out/reappear gestures than the foundation voice. Timbre Motion independently withdraws harmonic energy toward a purer sine state and returns. Stereo Motion now pans voices independently rather than mainly moving the summed output. Pitch Drift remains subtle cents-level independent motion. Motion Speed scales the family of long asynchronous periods and remains intentionally non-rhythmic.

INIT remains `[55, 18, 38, 34, 24]` and is the reference Movement anchor. The other 11 presets were re-authored for the expanded engine.

## Long-form Movement arcs — Build 282

dronePhace local audition now renders 60 seconds so the Movement engine can expose complete long-form gestures before the bed crossfade seam. interPhace Global Play also requests a 60-second drone bed; noisePhace remains a 30-second bed.

Movement now combines local asynchronous voice fades with preset-specific macro dip events. Depending on the preset, the drone can progressively lose upper voices, then its foundation, reach a sustained low-water state, and reform at different rates. Foundation protection is no longer universal: Still/Drift/Stereo Wander retain a stable root, while Deep Breath, Glacial, Tide, Uneasy, Float, and especially Restless allow the main voice to recede much more deeply. All gain movement remains attenuation-and-return only.

## Expanded Movement headroom — Build 283

The existing Movement range was preserved sonically but compressed into approximately slider 0–70. Existing Movement presets were numerically remapped to retain their former DSP targets. Slider 70 now corresponds approximately to the former 100 setting; 70–100 is new expressive headroom.

The upper range expands controls independently rather than applying one uniform multiplier. Volume gains modest additional depth; Pitch Drift and Timbre Motion gain more range; Stereo Motion gains wider/faster independent wandering; Motion Speed receives the largest expansion. Above the former maximum, macro drift-away events occur earlier and complete faster, while per-voice/timbre/stereo processes remain asynchronous. At 100, obvious movement should begin much earlier in the 60-second render without changing the lower-value character that already worked.

## Space engine expansion — Build 284

B4 Space was rebuilt to be deliberately audible outside INIT. Level was replaced by Distance. Width now ranges from near-mono to a strongly decorrelated stereo field. Delay expands into an asynchronous five-tap cross-reflection field. Reverb now uses a denser multi-generation diffuse delay cloud with a substantially larger useful wet/room range. Space Motion owns whole-environment orbit/panning and changing field width, while B3 Stereo Motion continues to own independent per-voice wandering. Distance reduces direct presence and high-frequency detail to create actual acoustic perspective rather than merely lowering output gain.

Space INIT was remapped to `[58, 42, 24, 18, 20]` to preserve the established reference environment as closely as possible. The other Space presets were re-authored to exploit the wider engine. The design target is that every control is clearly identifiable by ear and 100 remains musically usable rather than being artificially restrained.

## Build 285 global-only orbit handoff

`DronePhaceRenderAPI.renderBed()` can temporarily suppress baked Space Motion for interPhace Global Play while still returning the current Space Motion amount. This does not change local dronePhace audition behavior; it exists only so interPhace can test a shared opposed Drone/Noise orbit without double-applying drone movement.

## Freeze / next-pass plan — Build 286

The current dronePhace DSP is a protected checkpoint. Do not casually redesign Voice, Tone, Movement, or Space. Future work should extend the instrument rather than reopen the core engine unless listening reveals a specific defect.

Planned Generate behavior for the next dronePhace pass:
- B5 Generate should return to targeting the full drone rather than the currently visible page.
- Generate should randomize by choosing one curated Preset from each of B1 Voice, B2 Tone, B3 Movement, and B4 Space.
- Generate should not directly roll the five raw sliders on each page.
- The generated result is therefore a random combination of four known-good page preset identities; manual slider editing remains available afterward.
- Do not implement this yet. Revisit after noisePhace work.

Known cleanup:
- One stale local-audition comment still says 30 seconds. The actual drone audition/render length is 60 seconds. Correct that text during the next code build rather than creating DSP churn now.

Active development focus moves to noisePhace. The Build 285 Opposed Orbit remains an interPhace relationship experiment/reference and should not be folded into dronePhace's standalone DSP.

## Patch persistence — Build 288

interPhace DRONE Patch export/import now serializes the twenty authoritative sound values from Voice, Tone, Movement, and Space. Preset selector indices ride as UI metadata. Import writes the sound values directly so manually edited drones survive even if preset tables later evolve. The stale 30-second local-audition comment was also corrected to the actual 60-second behavior.
