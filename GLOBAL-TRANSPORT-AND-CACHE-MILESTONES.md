# Global Transport and Cache Milestones

Status is recorded here as each build is accepted. A checked item needs an accepted build number and an observed playback test.

## Goal

One root audio clock owns musical time. Reuse deterministic sounds from bounded RAM caches while retaining live editing. Filters/effects and the continuous nP/dnP beds remain realtime.

## Milestone 1 — One authoritative global clock

### 1.1 — Root transport contract — Build 600, implemented; acceptance test pending

- [x] Establish one root `AudioContext` transport contract: tempo, swing, future musical zero, bar, step, and Stop.
- [x] Define the shared scheduled-event payload: `bar`, `step`, `time`, and session generation.
- [x] Do not change any audible source path, grid style, cache behavior, or controls.
- [x] Add no second scheduler or follower clock.

**Acceptance test:** Start/Stop establishes and ends one future musical zero without changing current sound behavior. This is the next build.

### 1.2 — Root-driven grid followers

- [ ] Build 601 diagnostic acceptance: capture a cold first-start report before changing timing behavior.
- [ ] Build 602 preparation barrier: verify first-start engines are prepared before root transport begins.
- [ ] Build 603 iP melody-state handoff: verify iP Arp starts from and updates from the visible aP Melody grid.
- [ ] dP B1/B3 and aP B1/B3 consume root transport events.
- [ ] Remove child-owned visual timing.
- [ ] Verify 4- and 8-column views, navigation, tempo, and swing.

### 1.3 — dP on the root clock

- [ ] Root transport schedules dP; existing dP sound functions remain unchanged.
- [ ] Remove dP's independent audio scheduler/context from the live route.
- [ ] Verify sound and grid remain locked over extended playback.

### 1.4 — sP and aP Tone-off on the root clock — accepted through Build 615

- [x] Root transport schedules sP and aP Tone-off events.
- [x] aP produces events; sP produces the complete established sP sound.
- [x] B1/B3 edits a few bars ahead affect the next applicable bar.

### 1.5 — aP Tone-on on the root clock — Build 615 accepted

- [x] iP honors Arp Tone: Tone-on uses the established aP voice on the same root B1/B3 event timing and follower as Tone-off.
- [x] Tone-off continues to use the established sP voice; only the voice source differs.

### 1.5b — solo dP and aP root scheduling

- [ ] Solo dP uses root scheduling while retaining its local page-led source rules and local mixer behavior.
- [ ] Solo aP uses root scheduling while retaining its local source rules and local mixer behavior.
- [ ] Verify solo grid lock after idle time, navigation, and Stop.

### 1.5c — solo sP root scheduling

- [ ] Solo sP uses root loop scheduling while retaining its complete established graph and local mixer behavior.
- [ ] Verify solo sP grid lock after idle time, navigation, loop-boundary edits, and Stop.

**Milestone 1 completion:** no child-owned playback clock remains.

## Milestone 2 — Stop and idle lifecycle

- [ ] One Stop path cancels future events, fades active voices, clears timers, and resets followers.
- [ ] Retain only deliberately persistent resources.
- [ ] Repeated Play/Stop tests confirm idle CPU recovery and no surviving audio/playhead activity.

## Milestone 3 — dP RAM cache

- [ ] Cache built-in kick, snare, and hat as `AudioBuffer`s when that instrument's synth controls change.
- [ ] Use cached buffers for live dP hits; uploaded samples retain their existing buffer path.
- [ ] Preserve the next four steps after an edit; refill stale cache from step 5 forward.

## Milestone 4 — sP source-cache foundation

- [ ] Split sP into a deterministic source renderer and a downstream realtime chain.
- [ ] Cache separate versioned Pretty and FM source banks by required pitch.
- [ ] Keep gate, filter, texture, effects, and mixer live.
- [ ] When a cache entry is late, use the prior valid entry rather than delay or glitch.

## Milestone 5 — aP shared sP cache

- [ ] Arp Tone-off uses the sP note cache; no duplicate arp synth cache.
- [ ] B1/B3 and B2 use the same transport and cache contract.
- [ ] Regression-test iP mix, navigation, tempo, swing, Stop, and export parity.
