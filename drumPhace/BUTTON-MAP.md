# drumPhace Button Map

**App ID:** `app4`  
**Role:** drum pattern creator and drum sound editor for Kick, Snare and Closed Hat.

## Permanent bottom row

| Button | Function | Pages / behavior | Status |
|---|---|---|---|
| B1 | Instrument / Pattern | Cycles Kick → Snare → Hat pattern grids; 32 internal steps per bar-column model, 4 phone / 8 laptop columns | Live |
| B2 | Drum Synth | Instrument-specific editor; active instrument determines page/content | Live |
| B3 | Chance / Volume / Repeats | Cycles C/V/R variation grids for current instrument; labels include instrument number | Live |
| B4 | Style | Selects/gates style context used by generation | Live foundation |
| B5 | Generate | Generates the active drum instrument/pattern according to current style engine | Live |
| B6 | Phace | Opens shared Phace selector | Live |

## B1 pattern behavior

Step edit cycles normal / ghost / off. Active-step dots and instrument-colored overlap borders remain separate visual ownership systems. Long-press bar copy/paste behavior is available from the pattern grid. Removing a drum step also removes its Chance/Volume metadata.

- **Bar copy/paste:** long-press a row-1 bar step to copy its full bar column. The source displays `Copied`; every other row-1 bar displays `Paste`. Tap the source or any non-paste control to cancel; tap a `Paste` target to paste and exit copy mode.

## B2 sound editors

Kick, Snare and Hat each have eight control slots including Preset. Current engines/presets are wired for all three instruments; controls are instrument-specific and audition renders the relevant pattern rather than playing isolated clicks unless explicitly designed otherwise.

## B3 semantics

- Chance blank = 100%; explicit chance values support 5, 10–90, 95 and clear.
- Volume uses center ± small random variation; ghost scaling applies to the ghost base level rather than promoting a ghost to a full hit.
- Repeats/stutters are a reusable library available to any instrument and include flam/drag/double/stutter-style events.
- Variation metadata may only exist on active drum steps.

## Hampton generation

The current Hampton-style generator uses phrase-aware Kick/Snare/Hat generation rather than independent per-step randomization. In the eight-bar presentation, bar 5 repeats/remembers bar 1 and bar 6 repeats/remembers bar 2; the remaining bars retain more freedom.
