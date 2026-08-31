# interPhace App / Button / Page Documentation Index

As of **Build 332**, the former monolithic app/button/page plan has been split into canonical documentation stored with each Phace package. This prevents one root document from drifting behind the code while individual Phaces evolve at different speeds.

## Canonical button maps

- [interPhace/BUTTON-MAP.md](interPhace/BUTTON-MAP.md)
- [synthPhace/BUTTON-MAP.md](synthPhace/BUTTON-MAP.md)
- [arpPhace/BUTTON-MAP.md](arpPhace/BUTTON-MAP.md)
- [drumPhace/BUTTON-MAP.md](drumPhace/BUTTON-MAP.md)
- [noisePhace/BUTTON-MAP.md](noisePhace/BUTTON-MAP.md)
- [dronePhace/BUTTON-MAP.md](dronePhace/BUTTON-MAP.md)

## Canonical plans

- [interPhace/PLAN.md](interPhace/PLAN.md)
- [synthPhace/PLAN.md](synthPhace/PLAN.md)
- [arpPhace/PLAN.md](arpPhace/PLAN.md)
- [drumPhace/PLAN.md](drumPhace/PLAN.md)
- [noisePhace/PLAN.md](noisePhace/PLAN.md)
- [dronePhace/PLAN.md](dronePhace/PLAN.md)

## Shared authority

[`EMPLOYEE-HANDBOOK.md`](EMPLOYEE-HANDBOOK.md) remains the cross-project authority for shared shell rules, visual standards, build discipline, render-first audio rules, naming, packaging and other conventions that apply to more than one Phace.

## Documentation rule

When a build changes a Phace's button/page structure or establishes a new target page architecture, update that Phace's `BUTTON-MAP.md` and clearly distinguish planned architecture from code that is still awaiting migration. When a decision changes intended future behavior or development order, update that Phace's `PLAN.md`. Shared rules belong in the handbook rather than being duplicated across every plan.


## Build 333 — arpPhace B2 controls locked

arpPhace B2 target controls are now locked as: Sparse = Variation / Space / Repetition / Movement; Motif = Complexity / Space / Repetition / Movement; Arp = Rate / Gate / Pattern / Motion; Phrase = Complexity / Space / Resolution / Movement. These are musical bias controls; Style owns low-level event count, placement, pitch/range/interval and rhythm tendencies. Gate behavior is generator-specific: Sparse mostly long/open, Motif varying gate as part of the repeating motif, Arp steady global Gate, Phrase varying contextual gate. B3 remains the per-note Chance/Volume/Gate override layer. Implementation remains for a later build.

- B2 A1-A4 melody transfer: copy each stored workspace grid from step 1 through its final non-empty step, preserving internal rests. Transfer is grid-only for all four workspaces; no Rate/Gate/engine-specific reinterpretation.

- B2 grid architecture: all four pages are 32 real steps (two bars). Display steps 33-64 mirror 1-32; editing either half edits the same real step. Sliders/generation/transfer operate on 1-32 only.
- interPhace Phace Settings: synthPhace and arpPhace Effects Release range is 10-4000 ms; display switches to seconds at 1000 ms.

- Arp B2 control order: Pattern / Rate / Gate / Motion. Persisted arp slot format remains [Rate, Gate, Pattern, Motion] for backward compatibility.
- Arp behavior: Pattern is the only control that populates a fresh 32-step grid; Rate retimes the current grid mathematically (including 32nd-note pairs); Gate is articulation only; Motion rearranges the current grid.
- B2 audition: every Arp/Sparse/Motif/Phrase workspace always loops exactly the 32 real steps. Steps 33-64 remain display/edit mirrors only. A1-A4 melody transfer remains trimmed from step 1 through the last used real step.

- B2 Gate ownership: Arp/Sparse/Motif/Phrase store notes only and audition using the shared Arp Gate slider. B3 Gate remains Melody-only.
- B2 Motion normalization: after any Motion transform, first active B2 step is shifted to step 1; trailing space absorbs the shift.
- B2->B1 transfer: notes copy through last used real step. Current shared Arp Gate is translated into B3 while preserving the source Rate/Gate relationship; 32nd pairs use one Gate value applied to both half-steps.
- Manual B1 note entry seeds/updates B3 Gate from the current shared Arp Rate+Gate relationship.

- Arp deterministic slider state: while arpPatternCustom=false, Pattern/Rate/Motion are parameters of one equation (Pattern -> Motion -> normalize -> Rate). Slider order cannot change the resulting grid. Manual edits and Generate set custom=true; thereafter Rate/Motion transform the current grid instead of regenerating from Pattern.

- Arp custom Motion model: first manual edit snapshots the rendered 32-step grid as canonical custom state. Every Motion slider position is an absolute permutation of that same canonical source; Motion never chains from the previous Motion result. Edits made while Motion is active are inverse-mapped to the canonical source step. Moving Pattern exits custom mode and rebuilds from Pattern+Motion+Rate.
- Custom Rate transforms the canonical custom source, then the current Motion is re-rendered. Manual edits lower Rate to the coarsest legal resolution that exactly represents the occupied half-step positions without moving the grid.

- Manual B2 entry invariant: entering/changing a note never re-renders Motion or transforms grid positions. It changes only the touched real step (plus its mirror) and lowers the Rate slider to the coarsest legal resolution. Motion/Rate transformations happen only when those sliders are explicitly moved.

- Build 381 clean rebuild from 377 after 379 prototype accidentally removed shared arpPhace helpers. Reapplies expanded Pattern/Rhythm changes without replacing unrelated helper sections.

- Build 382 Rhythm rest/repeat correction: Rest bank substitutes for active canonical events only, never step 1, without changing canonical layout. Repeat bank adds clones only into empty cells immediately following an active note; repeats do not consume canonical Pattern events and do not recursively repeat themselves.

- Build 383: Rhythm right-side families separated. Repeat 1-4 add exactly N reserve repeats plus N deterministic resets; Rest 1-4 suppress exactly N active canonical notes and never add repeats. Step 1 remains protected.

- Build 384: Rhythm split into two engines. Generated mode uses Rate-aware spatial Rhythm so 1/8, 1/4, etc. preserve their base spacing. First manual edit freezes the exact visible 32-step grid. Custom mode then uses absolute deterministic 32-step permutations and normalizes the rendered result so the first active event lands on step 1 first-32nd. Pattern exits custom mode.

- Build 385: normal mode is strictly Pattern+Rate+Rhythm on every Pattern/Rate/Rhythm slider move. Generated notes stay on legal Rate positions; generated 32nds are paired and sliders never invent isolated odd 32nds. Manual grid edit alone enters custom mode, preserves exact visible layout, and quietly sets Rate to the coarsest legal value. Custom Rate transforms canonical custom data; Custom Rhythm applies absolute 32-cell canonical permutations and normalizes first active half-step to tick 0. Pattern exits custom mode.

- Build 386 core logic: Pattern remains immutable 16-step recipe. Rhythm is absolute reversible 32-position recipe, Off=1..32. Normal mode rebuilds Pattern->Rhythm->Rate on every Pattern/Rate/Rhythm slider move. Rate is pure resolution scaling from a 1/16 reference: 1/32 compresses; slower rates expand and crop beyond the visible 32 steps. Manual grid edit alone enters custom mode, freezes the exact visible 32 steps, drops unseen material, and quietly sets Rate to the coarsest legal value. Custom Rate scales canonical custom data; Custom Rhythm always remaps from canonical custom data and normalizes the first active half-step to the start. Pattern movement clears custom memory.

- Build 387 corrections: generated Pattern+Rhythm+Rate keeps its true unnormalized positions internally, but final display/playback is left-normalized so the first active half-step lands at step 1 first-32nd. Hidden offset is retained only in generated mode. First manual edit discards hidden generated offset/unseen material and freezes the normalized visible 32 steps as custom truth. Custom Rate now accordion-scales the current visible custom grid directly, crops off-grid notes, and saves that result as the new canonical custom grid without reapplying Rhythm.

- Build 388 cleanup: removed dead transitional arp helpers. Pattern bank refreshed around immutable 16-step arp-order recipes and deliberate rest variants. Rhythm bank refreshed to 29 explicit 32-position permutation recipes, all full bijections and unique. Down + 1/16 uniqueness is audited after normalization. Core 387 Pattern/Rhythm/Rate/custom architecture is unchanged.

- Build 389: Rhythm recipes redesigned as musical full-grid timing maps. Slider progression moves from compact 1-16 phrasing through 17-24 and increasingly into 25-32. Later rhythms use deliberate two-bar spacing, clusters, alternating gaps, and sparse phrase shapes rather than arbitrary scatter. A small subset also performs local note-order swaps/reversals for musical overlap with Pattern. All 29 recipes remain full reversible permutations and Down@1/16 is 29/29 unique.

- Build 390: Arp Style cycle simplified to Sparse -> Motif -> Phrase. Previous rotate/subs/octave/repeat/reverse top-level style choices are retired; those techniques are reserved for future behavior inside the three compositional Generate styles.

- Build 391: Arp Generate styles are Sparse, Repeat, Motif, Phrase. First Generate snapshots the current visible arp grid into temporary session memory. Repeated Generate presses always transform that same source. Audition/navigation do not clear it. Pattern, Rate, Rhythm, Gate, manual note entry, or Style changes clear the session source; the next Generate snapshots the then-current grid. All style outputs normalize left after transformation so their first active event lands at step 1 without treating its pitch as an anchor. Sparse uses thinning/islands/extract/answer/trail actions. Repeat uses one/two/three-note obsessive cells with controlled changes/breaks/octaves. Motif extracts 2-5 note cells from anywhere and repeats/develops them. Phrase works mainly on 8-step chunks using ABAB/AABA/AA' structures, swaps, rotations, builds, strips, and returns.

- Build 392: Added Shuffle to Arp Generate styles. Shuffle preserves the source grid's timing/rest layout exactly and rerolls active note degrees with mostly ±1 scale-degree movement, occasional ±2, neighboring repeats, and rare octave changes. Motif was rebuilt as a short inspiration seed rather than a repeated block structure: 3-6 events, entirely within displayed steps 1-10, using hand-shaped rhythmic seeds with deliberate gaps and occasional adjacent-note bop. It extracts its note material from anywhere in the memorized source and may make one restrained melodic variation. Everything after the motif is blank.

- Build 393: Motif now creates its short 3-6 note seed in the first 10 steps, then repeats the complete first 16-step half exactly in steps 17-32. B2 active-step border cascade now matches the other suite grids: the active arp border rule is applied after the row-divider rule, so an active step on a beat divider keeps the full arp-colored border over the stronger divider line.

- Build 394: B2 architecture converted from Arp/Sparse/Motif/Phrase pages to four identical independent Arp pages: Arp 1-4. Each page owns Pattern/Rate/Gate/Rhythm, grid/custom/canonical state, Generate source memory, Style, audition settings, and transfer Gate/Rate behavior. Legacy b2GeneratorState and migration logic removed. All normal/custom Pattern/Rate/Rhythm logic now uses activeB2Phrase() rather than hard-coded p1. B4 Generate styles remain Sparse/Repeat/Motif/Phrase/Shuffle and apply to the currently selected Arp page.

- Build 395: B2 long-press now provides Arp-page copy/paste. With no pending copy, long-press copies the full active Arp page state (Pattern/Rate/Gate/Rhythm, visible grid, custom/canonical state, generated true-grid/offset state, and Style). With a pending copy, long-press on any Arp 1-4 page pastes it there, including the same page. Generate-session source memory is intentionally not copied; paste starts a fresh Generate session from the pasted result. Leaving B2 for Melody/Chance or leaving arpPhace clears the pending copy, so the next B2 long-press becomes a new copy.

- Build 396: B2 copy/paste long-press feedback now matches the existing shell-button long-press fill implementation exactly: --clear-fill drives the existing #shellB2::before overlay, requestAnimationFrame updates the fill continuously through a 700 ms hold, release/cancel clears it, completion holds 100% briefly then clears after 180 ms. The completed action remains Copy when no copy is pending and Paste when one is pending.

- Build 397: Canonical B2 Arp defaults are now explicit as ARP_UI_DEFAULTS: Rate 1/16, Gate 75%, Pattern Off, Rhythm Off, applied independently to Arp 1-4. Audit also corrected the stale retired Arp Style initializer from Rotate to Sparse.

- Build 398: Fixed the actual B2 slider DOM defaults used by shared shell double-click reset. Rate value=1 (1/16), Gate value=75, Pattern value=0 (Off), Rhythm value=0 (Off). The prior 397 Style-default change was reverted because it was outside the requested slider-default scope.

- Build 399: Default B2 Arp Generate Style is Shuffle for Arp 1-4.

- Build 399 fixed: corrected the literal B2 slider HTML value attributes used by shared double-click reset. Because ARP_UI_SLOT_MAP displays Pattern/Rate/Gate/Rhythm over legacy c1/c2/c3/c4 controls, physical defaults are now c1=0 (Pattern Off), c2=1 (Rate 1/16), c3=75 (Gate 75%), c4=0 (Rhythm Off). Shuffle remains the default Arp Generate Style.

- Build 400: Mixer toggle renamed from Arp / Synth Control to Arp / Synth Pattern. Its indicator now communicates both states: unchecked/off (Synth) is synthPhace blue; checked/on (Arp) remains arpPhace orange. Toggle behavior/state logic is unchanged.
