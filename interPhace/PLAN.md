# interPhace Plan

## Current position — Build 291

The shell is established and functional. Global project context, mixer, import/export, child settings, Phace navigation, and render-first global audition exist. Build 273 wires the Mixer into audition: muted channels are skipped before render; active channel dB values affect playback. Drum and Synth/Arp retain their musical loop lengths while Drone and Noise run as independent 30-second bed renders from their child engines, with the shared transport overlapping successive copies by 3 seconds to hide the seam.

## Next major work

1. Extend B2 so it cycles **Mixer ⇄ Sequencer**.
2. Keep the Sequencer intentionally small: M1–M4, bar-level participation, empty-melody skipping, and cohesive audition rather than song arrangement.
3. Make arpPhace the note/articulation source for synthPhace during sequenced global audition.
4. Preserve drumPhace as its own rhythmic playback source.
5. Preserve noisePhace and dronePhace as level-controlled beds rather than forcing them into the melody sequencer.
6. Keep the render-first / luxury-of-latency architecture. Do not introduce realtime DSP requirements merely to make the shell feel DAW-like.

## Project data ownership

Project JSON should continue to own global Root, Scale, Tempo and interPhace settings while child package state remains serializable independently. Patch export remains synthPhace-owned; pattern/melody data remains owned by the relevant child.

## UI constraints

Phone portrait remains a primary target with four visible grid columns; laptop uses eight. No design work should require scrolling to reach the main grid. Columns are structurally stable; row placement may adapt only where explicitly designed.

## Do not expand into

A full timeline, piano roll, automation lane system, realtime mixer engine, or general-purpose DAW. interPhace is an audition/export coordinator for the Phaces.

## Opposed bed orbit experiment — Build 285

During interPhace Global Play only, dronePhace and noisePhace now share one whole-field orbit signal at opposite polarity: when Drone is left, Noise is right, and vice versa. dronePhace's baked Space Motion orbit is suppressed only for the global render so interPhace can apply the shared orbit once rather than double-moving the drone. Local dronePhace and noisePhace auditions remain unchanged and independent. This is an intentionally temporary relationship experiment, not yet a permanent Bed Relationship feature.

## Authoritative Patch contract — Build 288

Patch export/import is now defined by one rule: a Patch must contain every persistent parameter required to recreate the selected engine or performance object. Actual parameter values are authoritative. Preset selector values may be stored for UI restoration but must not replace the underlying values.

Patch schema exports are now version 2. Import remains compatible with existing schema-version-1 Patch files.

Current Patch meanings:

- SYNTH — complete canonical synthPhace sound state from the SynthPhace Patch Adapter: carrier/harmonies, FM, behavior/character, texture/transient, envelope, filters/EQ, and effects. Project Root/Scale/Tempo remain project context rather than duplicated sound state.
- DRUMS — complete drumPhace state: all eight current synth-control values for Kick/Snare/Hat, all patterns, Chance/Volume/Repeats variation grids, styles, and variation-page state.
- KIT — all eight current synth-control values for Kick/Snare/Hat only; no pattern/performance data.
- KICK / SNARE / HAT — complete single-instrument state: all eight synth values plus that instrument's pattern, Chance/Volume/Repeats grids, and style.
- DRONE — all twenty authoritative B1–B4 sound sliders: five Voice, five Tone, five Movement, five Space. The four Preset selector indices are included as UI metadata.
- NOISE — remains the current legacy/prototype noisePhace state until the Build 287 redesign is implemented; its contract must be replaced alongside the new engine.
- ARP — all A1–A4 macro values plus arp pattern encoding, actual pattern data, and custom-pattern flags required to reproduce playback.
- MELODY — all M1–M4 melody data plus the complete Chance object, which contains Chance, Volume, and Gate grids.

Project export embeds these complete available Patch objects inside project.json. Project import restores global context/mixer/settings first, then applies child patches. A full DRUMS patch wins over partial KIT/KICK/SNARE/HAT representations when both are present.

Known compatibility behavior:
- Legacy four-value drum synth patches import without failure; missing newer controls fall back to current INIT values.
- Existing version-1 interPhace Patch documents remain accepted.

## Shared audition-state contract — Build 289

The shell now owns three explicit audition visual states across interPhace and child Phaces: idle, rendering, and playing. Rendering shows a dim stop square so users can distinguish render latency from active playback and can cancel before playback begins. Playing shows a full stop square. This is a visual/state API cleanup only; each Phace retains its established audition scope and audio path.
