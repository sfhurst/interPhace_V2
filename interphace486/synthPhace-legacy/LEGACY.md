# synthPhace legacy reference — Build 38

This folder is the complete synthPhace implementation retired from live interPhace in Build 39.

## Status
- Frozen reference code.
- Not loaded by the live interPhace synthPhace route.
- Preserve existing file structure, IDs, state names, controllers, DSP engines, presets, render logic, and internal wiring so they can be traced during migration.
- Do not refactor or rename legacy controls as part of the new synthPhace build.

## Migration purpose
When a new synthPhace control is ready, use this folder to trace the corresponding legacy path from old control/ID through state/controller logic into synthesis/DSP/render behavior, then map that behavior intentionally to the new control architecture.
