# arpPhace Button Map

**App ID:** `app3`  
**Role:** musical-idea/melody generator and editor for synthPhace. Arpeggiation remains one available technique rather than defining the whole Phace.

## Target bottom row — Build 333 plan

| Button | Function | Pages / behavior | Status |
|---|---|---|---|
| B1 | Melody | Cycles M1 → M2 → M3 → M4; durable composition/experimental space | Live foundation; retained |
| B2 | Pattern Generator | P1 Sparse → P2 Motif → P3 Arp → P4 Phrase; temporary generation/audition/mutation workspaces used to create material for B1 | **New target architecture; not yet implemented in 332** |
| B3 | Chance / Volume / Gate | Cycles selected melody's C/V/G grids; labels include melody index such as `1C`, `1V`, `1G` | Live; retained |
| B4 | Style / Mutation | Contextual style/mutation control for the active B1/B2/B3 context | Live foundation; generator/style refinement ongoing |
| B5 | Generate | Context-aware generation for the active B2 generator or other supported context | Live foundation; behavior to be refit to new B2 architecture |
| B6 | Phace | Opens shared Phace selector | Live |

## B1 melody workspace

M1–M4 remain permanent melody slots and open experimental space. They are expected to be built substantially from B2 generated material through trial and error, but manual editing remains fully valid.

Preferred relationship after generation:

- M1 = main motif/phrase.
- M2 = small variation of M1.
- M3 = alternate response/ending/phrase.
- M4 = stripped/sparse variation.

M1–M4 are not required to follow that relationship when the user is manually experimenting.

Degree-based scale-aware entry, 32nd-note support, long-press clear, and note-linked Chance/Volume/Gate cleanup remain part of the B1 foundation.

## B2 pattern-generator model

B2 no longer targets four persistent A1–A4 arps linked one-to-one with M1–M4.

Its four logical pages are temporary source-material generators:

1. **Sparse** — one/few events and large intentional spaces.
2. **Motif** — short repeating musical cell.
3. **Arp** — denser ordered chord/scale movement.
4. **Phrase** — more conventional melodic statement.

Expected workflow:

**Generate → Audition → Mutate → Keep/Paste into B1 → reuse the B2 workspace**

Rests are authored musical decisions. A one-note result followed by a long empty tail is valid.

The existing A1–A4 implementation remains code history/foundation until a dedicated migration build replaces it.

## B2 locked four-slider pages

The existing physical pattern-page layout is retained: four sliders above the editable grid.

| Page | Slider 1 | Slider 2 | Slider 3 | Slider 4 |
|---|---|---|---|---|
| Sparse | Variation | Space | Repetition | Movement |
| Motif | Complexity | Space | Repetition | Movement |
| Arp | Rate | Gate | Pattern | Space |
| Phrase | Complexity | Space | Resolution | Movement |

Style owns low-level tendencies such as generated event count, position/front-loading, pitch/range/interval weighting, and rhythm tendencies. The four sliders bias those style decisions rather than directly specifying them. Sparse event count is generated, typically 1–4, rather than exposed as an Events slider.

**Gate generation:** Sparse = mostly long/open; Motif = varying per-note gate is part of the repeating motif; Arp = steady user-set global Gate; Phrase = varying contextual per-note gate following the phrase. B3 remains the per-note override/editor.

For Arp, **Space** is the target fourth primary control. Existing Motion transformations may remain available to generation/style logic but are no longer the planned fourth B2 Arp slider.

## B3 semantics

- Chance blank = 100%; explicit values include 5, 10–90, 95 and clear.
- Volume value is interpreted as a small randomized band around the stored center (currently x ± 5).
- Gate is step-specific articulation and is allowed to release held notes.
- Chance is realized once per rendered loop pass so looping does not reroll at the seam.
- B3 is considered a solid part of the design and should not be reworked merely because B2 changes.

## B4 style direction

Primary planned style references include:

- **Smokers Delight** — sparse/medium density, early anchors, repeated notes, stable scale/chord tones, short bursts, long intentional rests, and controlled bar-four mutation.
- **Postal Service** — denser repeating cells, more ordered/arp-like motion, stronger rhythmic sequencing, while retaining deliberate space.
- **Message to Bears** — planned style profile within the same common generator architecture.

Style changes generator probabilities; it does not create a separate B2 page architecture per style.

## Audio-tail rule

arpPhace note ownership remains fundamentally monophonic, but the rendered audio must allow natural overlap:

- previous note decay/release may continue after the next note begins;
- delay/reverb/effect tails may continue substantially longer;
- do not impose an approximately 400 ms tail ceiling;
- render-first audition/export must preserve meaningful tails instead of truncating them.

This is especially important for Sparse/Motif patterns intended to create rhythm through delay and ambience.

## B2 Generator Page Order (Build 363)
- Page 1: Arp — Rate, Gate, Pattern, Motion
- Page 2: Sparse — Variation, Space, Repetition, Movement
- Page 3: Motif — Complexity, Space, Repetition, Movement
- Page 4: Phrase — Complexity, Space, Resolution, Movement

## B2 Four-Workspace Repair (Build 366)
- P1 Arp: Rate / Gate / Pattern / Motion
- P2 Sparse: Variation / Space / Repetition / Movement
- P3 Motif: Complexity / Space / Repetition / Movement
- P4 Phrase: Complexity / Space / Resolution / Movement
- Each page owns an independent 64-cell temporary Pattern grid.
