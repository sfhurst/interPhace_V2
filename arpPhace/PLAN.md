# arpPhace Plan

## Current direction — Build 333

arpPhace is no longer being designed primarily as an arpeggiator. Its job is to solve the musical-idea/melody bottleneck by generating small, useful, personal musical fragments that can replace the role external loop packs currently play in the workflow.

The central design question is:

> What is the smallest useful motif, and how should it repeat and change?

Sparse repetition, intentional silence, controlled mutation, and room for delay/effects are first-class composition decisions.

## B1 — Melody workspace

Keep M1–M4 as permanent/experimental melody space. The four melody slots remain useful and do not need to be removed.

The expected workflow, however, changes:

1. Generate material on B2.
2. Audition it.
3. Mutate/regenerate through trial and error.
4. Keep/paste useful material into B1 Melody.
5. Return to B2 and start over or mutate toward another idea.

M1–M4 should usually become related versions of one musical idea rather than four unrelated melodies:

- **M1 — Main:** primary motif/phrase.
- **M2 — Variation:** M1 with a small removal, displacement, pitch change, or articulation change.
- **M3 — Alternate:** related response, ending, or alternate phrase.
- **M4 — Sparse:** stripped form, often anchor plus one response.

The B1 melody space remains open enough for manual experimentation and is not restricted to generated material.

## B2 — Temporary pattern generators

Replace the intended A1–A4 linked-arp architecture with four temporary pattern-generator pages:

1. **Sparse** — one/few events with large intentional spaces.
2. **Motif** — short repeating musical cell.
3. **Arp** — denser ordered chord/scale movement; arpeggiation is one technique, not the foundation of arpPhace.
4. **Phrase** — somewhat more conventional melodic statement.

These pages are source-material workspaces, not four persistent parts permanently linked to M1–M4.

The intended loop is:

**Generate → Audition → Mutate → Keep/Paste → Generate again**

A generator result may be extremely simple. One note at the beginning of a bar followed by intentional silence is a valid and desirable result.


## Locked B2 control model — Build 333

The four B2 generator pages retain the existing physical pattern-page layout: **four sliders above the editable grid**. Do not add low-level controls merely because the generator internally uses those decisions.

| Page | Slider 1 | Slider 2 | Slider 3 | Slider 4 |
|---|---|---|---|---|
| **Sparse** | **Variation** | **Space** | **Repetition** | **Movement** |
| **Motif** | **Complexity** | **Space** | **Repetition** | **Movement** |
| **Arp** | **Rate** | **Gate** | **Pattern** | **Space** |
| **Phrase** | **Complexity** | **Space** | **Resolution** | **Movement** |

These sliders are **musical biases**, not direct construction instructions. Style owns the underlying compositional tendencies such as event count, early/late placement, pitch/range tendencies, interval weighting, rhythmic tendencies, and other profile-specific probabilities. The sliders push the active style toward a useful musical result without requiring the user to understand or manually author the style tables.

**Space is a fundamental arpPhace concept.** It should influence intentional rests and protected breathing room rather than simply lowering a generic density percentage.

### Sparse controls

- **Space** — how much empty time the generated idea deliberately protects. Sparse event count itself is generated (typically 1–4), not selected by the user.
- **Repetition** — biases repeated pitch/gesture behavior versus changing material.
- **Movement** — biases stationary/nearby pitch behavior versus greater melodic travel; exact range and interval choices remain style decisions.
- **Variation** — biases literal repetition versus controlled mutation when the sparse idea recurs.

### Motif controls

- **Complexity** — biases the motif from extremely simple toward more involved without directly selecting a note count.
- **Space** — controls breathing room within/around the cell; rests are authored as part of the motif.
- **Repetition** — biases literal recurrence of the recognizable cell versus internal evolution.
- **Movement** — biases repeated/neighboring pitches versus more melodic travel while retaining motif identity.

### Arp controls

- **Rate** — retains the explicit rhythmic subdivision control appropriate to a steady arpeggiator.
- **Gate** — retains a global steady gate control because consistent articulation is part of arp behavior.
- **Pattern** — retains the existing ordered/rest-pattern concept and pattern library foundation.
- **Space** — replaces Motion as a primary target control; it allows the arp to breathe and intentionally inserts/protects rests instead of assuming continuous notes. Existing Motion transformations remain useful implementation material and may be style/generated behavior rather than occupying a primary slider.

### Phrase controls

- **Complexity** — biases a simple statement versus a more developed melodic statement.
- **Space** — controls intentional breathing room through the phrase.
- **Movement** — biases stable/repetitive movement versus greater melodic travel.
- **Resolution** — biases an open/unresolved ending versus a stronger sense of returning/landing home.

Phrase is intentionally exploratory. Unlike Sparse/Motif, which are fundamentally repetition-centered, and Arp, which is ordered-pattern-centered, Phrase can develop a **statement → continuation/response → destination** over time. Its practical value should be evaluated through use rather than assumed.

## Locked gate behavior by generator

Gate is considered by every generator, but it is not exposed the same way on every page.

- **Sparse:** generated gates should be mostly long/open. Sparse notes trigger the sound and leave room for envelope decay/release, delay, reverb, and other sound-design behavior to become part of the musical result.
- **Motif:** generate varying per-note gate values as part of the motif itself. When the motif repeats, its articulation/gate pattern repeats with it unless intentionally mutated.
- **Arp:** keep the exposed global **Gate** slider. Arp articulation is deliberately steadier and more uniform.
- **Phrase:** generate varying contextual per-note gate values similarly to Motif, but allow them to follow the developing phrase rather than requiring a repeating articulation pattern.

B3 Chance/Volume/Gate remains the per-note edit and override layer after generation.

## Hierarchical generation model

Generation should not start by independently deciding what note belongs in every available grid cell.

### 1. Choose the size of the musical idea

Examples:

- Sparse: often 1–3 events.
- Motif: small repeating cell, commonly 2–5 events.
- Arp: denser ordered movement.
- Phrase: a somewhat larger melodic statement.

### 2. Generate rhythm and rests intentionally

Rests are first-class output, not accidental leftovers from low density.

Examples of valid authored rhythmic shapes:

`1 — — 4 — — 7 — — — — — — — — —`

`1 2 — — 5 — 7 — 9 — — — — — — —`

The generator should be able to deliberately leave most of a phrase empty so the initial sound, envelope, delay, reverb, drums, Drone and Noise can occupy the space.

### 3. Choose pitches relationally

Do not choose unrelated random scale notes per step. Begin from a stable anchor and choose subsequent notes relative to it.

Typical movement order should favor:

- repeat / same pitch
- nearby scale movement
- minor/major third
- fourth/fifth
- occasional octave/register displacement
- larger unusual leaps only rarely

### 4. Generate repetition structure

A small idea is then arranged across bars using phrase relationships such as:

- `A A A A′`
- `A A B A`
- `A — A A′`
- `A A′ A A″`
- `A — — A′`

For the sparse hip-hop direction, `A A A A′` should be a major structural bias: establish something simple, repeat it, then mutate the fourth bar.

### 5. Mutate deliberately

Mutation must preserve enough of the source that the listener recognizes the relationship. It is not unrestricted regeneration.

Useful mutation operations include:

- change one pitch
- remove one note
- add one note
- move one onset
- repeat a note
- octave/register displacement
- extend or shorten gate
- replace the ending
- change the response
- occasionally create a substantially different B phrase

## Style profiles

Style changes the probabilities used by the same four B2 generators rather than requiring a separate engine for every producer reference.

### Smokers Delight reference profile

The goal is not to reproduce copyrighted loops. The goal is to learn the compositional tendencies that make that material useful and generate original material with similar structural economy.

Biases identified from the user's reference WAV set:

- very sparse to medium density
- strong first-beat / early-phrase anchor
- approximately 60–90% of note activity biased toward the first half
- high repeated-note probability
- strong preference for stable/chord-tone scale degrees
- small interval movement most of the time
- occasional third/fourth/fifth jump
- rare octave/register leap
- short bursts of two or three notes
- long intentional tail/rest after the motif
- repeat small ideas rather than continuously introduce new ones
- M2–M4 should mutate M1 rather than regenerate independently

A common result may be:

**small note burst → large amount of air → repeat → repeat → mutation**

### Postal Service reference profile

Use the same architecture with different probabilities:

- denser note bursts
- more frequent repetition
- more ordered/arp-like pitch movement
- more rhythmic sequencing
- still preserve deliberate gaps and recognizable repeating cells

A common result may be:

**6-note cell → rest → repeat → altered cell**

### Message to Bears

Retain as a planned producer/style reference and develop its own density, contour, register, repetition, and mutation biases within the same generator architecture.

## B3 — Chance / Volume / Gate

The existing B3 Chance/Volume/Gate grid concept is considered solid and should remain.

- Clearing a melody note clears its Chance, Volume and Gate metadata.
- Changing a note may preserve Chance/Volume while refreshing note/gate behavior as already designed.
- Chance/Volume/Gate provide performance variation and articulation on a composition that is already musically useful; they should not be responsible for inventing the underlying phrase.
- Generate may author these values only for active notes when stylistically useful.

## Delay and effects-aware spacing

Sparse arpPhace material is often intended to become rhythmically richer through synthPhace delay and effects. Silence in the note grid therefore does not necessarily mean silence in the rendered audio.

Future generation should be able to account for substantial rhythmic delay when deciding density. A patch with a prominent delay should generally permit or encourage even sparser note placement rather than filling the gaps already occupied by echoes.

Do not tightly couple generation to synthPhace before the required audio/render contracts are stable, but preserve this as a core design principle.

## Voice, release, and effects-tail architecture

Monophonic note triggering must not mean monophonic audio truncation.

- arpPhace remains fundamentally non-polyphonic in note ownership; do not turn it into a chord/polyphony sequencer by default.
- A newly triggered note must not unnaturally hard-cut the prior note's decay/release phase.
- Allow substantially more overlap between consecutive notes' decay/release phases where the synth envelope requires it.
- Delay, reverb, and other effect tails must be allowed to continue independently after the dry/source voice has released.
- Do not retain an artificial approximately 400 ms ceiling on effect tails. Render windows must accommodate materially longer tails when the active patch/effects require them.
- Offline/render-first architecture should inspect and preserve meaningful tails rather than truncate them merely to keep buffers short.

This overlap is especially important for Sparse and Motif material, where the decay, release, delay, and reverb are part of the perceived phrase.

## Integration target

arpPhace owns the pitched note, rhythm, articulation, and related-variation data that drives synthPhace. interPhace B2 Sequencer chooses which kept melody material participates in global playback/arrangement.

B2 pattern-generator workspaces are temporary creation tools; B1 Melody is the durable composition workspace.

## Preserve from the current implementation

Preserve useful working foundations unless a later build intentionally replaces them:

- Tone 04 as the default internal audition voice.
- degree/scale-aware note entry.
- 32nd-note flexibility where needed.
- B3 Chance/Volume/Gate semantics.
- gate-controlled note length.
- render-first/look-ahead/click-free audition philosophy.
- exact project Root/Scale/Tempo inheritance.
- global interPhace Swing is inherited by arp/melody event scheduling; 0% is straight timing.

The existing A1–A4 code may remain temporarily during migration, but it is no longer the target architecture.
- B1 Melody M1-M4 mirrors DrumPhace B1 top-row long-press column copy/paste: long-press row 1 to copy a full bar/column, paste from another row-1 column, and carry Chance/Volume/Gate with the melody.

## B2 Generator Page Order (Build 363)
- Page 1: Arp — Rate, Gate, Pattern, Motion
- Page 2: Sparse — Variation, Space, Repetition, Movement
- Page 3: Motif — Complexity, Space, Repetition, Movement
- Page 4: Phrase — Complexity, Space, Resolution, Movement

## B2 Four-Workspace Repair (Build 366)
- B2 page identity is independent of B1 Melody identity.
- Arp, Sparse, Motif, and Phrase each retain an independent 64-cell temporary Pattern workspace.
- Cycling B2 switches the active Pattern array without changing M1-M4 selection.
- Manual Pattern edits and custom flags persist per B2 page and are preserved by patch/project import-export.
