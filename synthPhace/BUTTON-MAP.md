# synthPhace Button Map

**App ID:** `app2`  
**Role:** pitched patch creator. synthPhace designs the sound; arpPhace determines what it plays.

## Permanent bottom row

| Button | Function | Pages | Status |
|---|---|---|---|
| B1 | Source | P1 Carrier / Harmonics; P2 FM; P3 Texture / Transient | Live |
| B2 | Effects | P1 Presets: Bit Crush, Saturation, Width, Detune, Chorus, Delay, Reverb, Convolution; P2 Amount: same eight effects | Live; Convolution UI only |
| B3 | Filter / EQ | P1 High Cut / Low Cut; P2 EQ 1; P3 EQ 2; P4 EQ 3 | Live |
| B4 | Envelope / Character | P1 Attack / Hold 1 / Decay 1 / Decay % / Hold 2 / Decay 2 / Time Mult / presets; P2 Instrument Behavior / Instrument Character | Live |
| B5 | Generate | Patch generation / randomization entry point | Foundation live; generator depth remains future work |
| B6 | Phace | Opens shared Phace selector | Live |

Repeated taps on the active B1–B4 button cycle only that button's pages. Tapping an inactive B1–B4 button returns to its last selected page.

## B1 detail

Carrier/Harmonics owns carrier level, scale-aware harmony offsets and gains, chord presets, the Harmonics 0–100 UI control, and patch presets. Harmonics is wired to DSP as clean post-FM 2nd/3rd harmonic color for Carrier, Harmony 1, and Harmony 2. Build 336 maximum blend is 25% 2nd + 8% 3rd. FM owns modulator amounts, ratios, waves and FM shape. B4 groups Behavior/Character with the envelope controls; Texture/Transient remains on B1. These controls define higher-level patch personality without changing project Root/Scale/Tempo ownership.

## Audition

Local synthPhace audition is offline/render-first. Effects are rendered as one chain and loop audition preserves release behavior. Global Trigger Interval is a synthPhace setting for direct synth audition, not a replacement for arpPhace melody sequencing.

## Ownership

synthPhace owns patch DSP and patch presets. It does not own project Root, Scale or Tempo.
