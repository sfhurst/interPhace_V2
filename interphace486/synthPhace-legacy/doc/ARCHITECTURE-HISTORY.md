# interPhace - Technical Architecture & Code Flow

**Web-based FM Synthesizer for M8 Tracker Sampling**  
By hurst.audio

---

> **2026 rebuild note:** Live audition and offline export now share one graph builder. Export uses deterministic reverb, calculated effect tails, DC correction, anti-click fading, peak normalization, and 16-bit dither. Legacy duplicate render-time FM scaling has been removed.


## Table of Contents

1. [Audio Signal Path](#1-audio-signal-path)
2. [Code Execution Path](#2-code-execution-path)
3. [Code Architecture & Editing Guide](#3-code-architecture--editing-guide)
4. [Data Flow Diagrams](#4-data-flow-diagrams)
5. [Key Concepts & Gotchas](#5-key-concepts--gotchas)

---

# 1. Audio Signal Path

## 1.1 Overview: Mono → Stereo → Effects → Output

```
[FM Synth Engine]         (MONO)
       ↓
[Amplitude Envelope]      (MONO + Personality LFOs)
       ↓
[Filter Engine]           (MONO - LP/HP + 3-band EQ)
       ↓
[Stereo Width]            (MONO → STEREO conversion)
       ↓
[Detune Effect]           (STEREO - LFO widening)
       ↓
[Chorus Effect]           (STEREO - multi-voice)
       ↓
[Delay Effect]            (STEREO - tempo-synced)
       ↓
[Reverb Effect]           (STEREO - convolution)
       ↓
[Wet/Dry Mix]             (STEREO - parallel blend)
       ↓
[Compressor]              (STEREO - dynamics)
       ↓
[Safety Limiter]          (STEREO - prevent clipping)
       ↓
[Output Gain]             (STEREO - 0.9 gain)
       ↓
[AudioContext.destination] (Your speakers!)
```

---

## 1.2 Detailed Signal Flow

### Stage 1: FM Synthesis (MONO)
**File:** `fm-engine.js`  
**Function:** `FMEngine.build()`

```
Modulator 2 (Osc)
    ↓ (frequency modulation)
Modulator 1 (Osc)
    ↓ (frequency modulation + FM Depth Envelope)
Carrier (Osc, always sine wave)
    ↓
[Optional: Helper Tone mixed in]
    ↓
Output: MONO audio node
```

**Key Details:**
- **Mod2 → Mod1 → Carrier** (series FM)
- **Mod1** has dynamic FM depth envelope (20 presets)
- **Frequency scaling** applied during render (k=0.7 curve)
- **Helper tone** adds sub-bass or harmonic reinforcement
- **Harmonics** (2 sine waves at semitone offsets) mixed with carrier

**Parameters:**
- Mod1: ratio (0.5x - 4x), gain (0-100%), wave (sine/square/saw)
- Mod2: ratio (0.5x - 4x), gain (0-100%), wave (sine/square/saw)
- FM Depth: 20 presets (attack/decay/index)
- Helper Tone: gain (0-100%), offset (-24 to +24 ST)
- Harmonic 1: gain (0-100%), offset (-36 to +36 ST)
- Harmonic 2: gain (0-100%), offset (-36 to +36 ST)

---

### Stage 2: Amplitude Envelope (MONO)
**File:** `carrier-envelope-engine.js`  
**Function:** `AmpEnvelopeEngine.apply()`

```
Input: MONO from FM engine
    ↓
AHDHD Envelope (Attack, Hold1, Decay1, Hold2, Decay2)
    ↓
[Optional: Personality Modulation]
    ├─ Gain LFO (parallel modulation per stage)
    └─ Pitch LFO (modulates carrier frequency per stage)
    ↓
Output: MONO audio node with envelope applied
```

**AHDHD Stages:**
1. **Attack** (0-2s): Ramp from 0 to 1.0
2. **Hold1** (0-6s): Sustain at 1.0
3. **Decay1** (0-2s): Ramp to decay1Target (0-100%)
4. **Hold2** (0-6s): Sustain at decay1Target
5. **Decay2** (0-2s): Ramp to silence

**Time Multiplier:** 0.25x - 10x (scales all stage times)

**Envelope Presets (12):**
- Percussive: Blip, Tick, Pluck
- Tonal: Piano, E.Piano, Bell
- Sustain: Pad, String, Choir, Brass
- Ambient: Drone, Wash

**Personality Presets (10):**
- Clean (no modulation)
- Analog Drift, Tape Wow, Tremolo, Vibrato
- Growl, Bell Shimmer, Choir Breathe
- Warble, Unstable

**Personality Behavior:**
- **Gain LFO** modulates amplitude during specific stages
- **Pitch LFO** modulates carrier frequency during specific stages
- Each stage has independent mod settings (wave, rate, depth)
- 10ms linear ramps prevent clicks when LFO depth changes

---

### Stage 3: Filter Engine (MONO)
**File:** `filter-engine.js`  
**Function:** `FilterEngine.apply()`

```
Input: MONO from envelope
    ↓
Highpass Filter (20Hz - 6.3kHz, 26 steps)
    ↓
Lowpass Filter (60Hz - 20kHz, 26 steps)
    ↓
EQ Band 1 - Low (60Hz - 16kHz, ±12dB, Q 0.5-10)
    ↓
EQ Band 2 - Mid (60Hz - 16kHz, ±12dB, Q 0.5-10)
    ↓
EQ Band 3 - High (60Hz - 16kHz, ±12dB, Q 0.5-10)
    ↓
Output: MONO filtered audio
```

**Filter Types:**
- HP/LP: Biquad filters with Q=0.7
- EQ: Peaking filters (only applied if |gain| > 0.1dB)

**Frequency Tables:**
- Logarithmic spacing (musical intervals)
- Note names shown in UI (e.g., "440Hz (A4)")

---

### Stage 4: Stereo Width (MONO → STEREO)
**File:** `effects-engine.js`  
**Function:** `applyStereoWidthEffect()`

```
Input: MONO
    ↓
Split to Left + Right channels
    ↓
Left: Direct (no delay)
Right: Haas delay + Allpass filter
    ↓
Merge to STEREO
    ↓
Output: STEREO (2 channels)
```

**16 Presets (Mono → Insane):**
- Natural: Haas delay (0.1-1ms) + micro-detune
- Enhanced: Phase offset + ratio differences
- Extreme: Heavy decorrelation (up to 20ms delay)

**Technique:**
- Haas effect: 0-20ms delay on right channel
- Allpass filter: 700-1700Hz phase shift
- Preserves mono compatibility

---

### Stage 5: Detune Effect (STEREO)
**File:** `effects-engine.js`  
**Function:** `applyDetuneEffect()`

```
Input: STEREO
    ↓
Split Left/Right channels
    ↓
Left: Delay (3-11ms) + LFO modulation
Right: Delay (6-18ms) + LFO modulation (different rate)
    ↓
Merge to STEREO
    ↓
Output: STEREO with movement
```

**16 Presets (Off → Chaos):**
- LFO rates: 0.2Hz - 1.2Hz
- Delay depths: 0.002 - 0.025
- Creates gentle pitch wobble for width

---

### Stage 6: Chorus Effect (STEREO)
**File:** `effects-engine.js`  
**Function:** `applyChorusEffect()`

```
Input: STEREO (dry signal)
    ↓
Split Left/Right channels
    ↓
Create 2-10 chorus voices per channel
Each voice: Delay + LFO pitch modulation
    ↓
Mix all voices together
    ↓
High shelf boost (+2dB @ 3kHz)
    ↓
Wet/Dry mix
    ↓
Output: STEREO with lushness
```

**16 Presets (Off → Infinite):**
- 2-10 voices (more voices = thicker)
- LFO depth: 0.004 - 0.015
- Wet mix: 35% - 88%

**Voice Spacing:**
- Delays: 15ms + (i * 5-6ms)
- LFO rates: Slightly different per voice
- Creates ensemble effect

---

### Stage 7: Delay Effect (STEREO)
**File:** `effects-engine.js`  
**Function:** `applyDelayEffect()`

```
Input: STEREO (dry signal)
    ↓
[Mode A: Mono Delay]
    Delay → Lowpass → Feedback loop
    
[Mode B: Ping-Pong Delay]
    Left → Delay → LP → Feedback → Right
    Right → Delay → LP → Feedback → Left
    ↓
Wet/Dry mix
    ↓
Output: STEREO with rhythmic space
```

**16 Presets (Off → Wash):**
- Tempo-synced: 1/32, 1/16, 1/8, 1/4, 1/2, 1/1
- Dotted/triplet divisions
- Feedback: 8% - 78%
- Lowpass filtering for softer repeats

**Tempo Sync:**
```javascript
delayTime = (60 / BPM) * division
// Example: 70 BPM, 1/4 note = 0.857s
```

---

### Stage 8: Reverb Effect (STEREO)
**File:** `effects-engine.js`  
**Function:** `applyReverbEffect()`

```
Input: STEREO (dry signal)
    ↓
Predelay (0-200ms)
    ↓
Convolver (algorithmic impulse response)
    ↓
Wet/Dry mix
    ↓
Output: STEREO with space/depth
```

**16 Presets (Off → Void):**
- Rooms: 0.8s - 3.0s decay
- Halls: 3.5s - 7.0s decay
- Ambient: 8.0s - 15.0s decay

**Impulse Generation:**
```
Early reflections (first 50ms): Dense random noise
Late reverberation: Exponential decay + damping
```

**Caching:**
- Impulses cached by preset + sample rate
- Prevents regeneration on each note
- Cleared when sample rate changes

---

### Stage 9: Wet/Dry Mix (STEREO)
**File:** `effects-engine.js`  
**Function:** `EffectsEngine.applyAll()`

```
Dry Signal (from filter, before stereo width)
    ↓
Wet Signal (after all effects)
    ↓
Mix: (dry × dryGain) + (wet × wetGain)
    ↓
Output: STEREO blended signal
```

**Wet/Dry Slider (0-100%):**
- 0%: Completely dry (no effects)
- 50%: Equal mix
- 100%: Completely wet (full effects)

---

### Stage 10: Compressor (STEREO)
**File:** `effects-engine.js`  
**Function:** Applied in `EffectsEngine.applyAll()`

```
Input: STEREO
    ↓
DynamicsCompressor Node
    ├─ Threshold: -20dB
    ├─ Ratio: 4:1
    ├─ Knee: 10dB
    ├─ Attack: 0.003s
    └─ Release: 0.25s
    ↓
Auto Makeup Gain (calculated)
    ↓
Output: STEREO with controlled dynamics
```

**Purpose:**
- Tames peaks
- Adds punch and consistency
- Prevents clipping before limiter

---

### Stage 11: Safety Limiter (STEREO)
**File:** `render-engine.js`  
**Function:** `RenderEngine.startFromPatch()`

```
Input: STEREO
    ↓
DynamicsCompressor (as limiter)
    ├─ Threshold: -3dB
    ├─ Ratio: 20:1 (hard limiting)
    ├─ Knee: 0dB
    ├─ Attack: 0.001s (1ms)
    └─ Release: 0.05s (50ms)
    ↓
Output: STEREO protected from clipping
```

**Purpose:**
- Final brick wall protection
- Catches unexpected peaks
- Ensures clean output to speakers/file

---

### Stage 12: Output Gain (STEREO)
**File:** `render-engine.js`

```
Input: STEREO from limiter
    ↓
Gain Node (0.9 = -0.9dB)
    ↓
AudioContext.destination (speakers)
```

**Purpose:**
- Headroom for safety
- Prevents digital clipping
- Accounts for inter-sample peaks

---

## 1.3 Render vs. Playback Differences

### Playback (Audition Button / Spacebar)
- **Context:** Persistent 48kHz AudioContext
- **Duration:** Envelope length + 0.1s
- **Output:** Speakers (AudioContext.destination)
- **Scaling:** None (plays root note as-is)

### Render (Render Button)
- **Context:** New OfflineAudioContext per note
- **Sample Rate:** User selected (44.1k - 192k)
- **Duration:** Envelope length + 0.5s (capped at render duration slider)
- **Output:** 25 WAV files (root ± 12 semitones)
- **Scaling:** Frequency scaling applied (k=0.7)

### Frequency Scaling (Render Only)

**Formula:**
```javascript
const scaleFactor = Math.pow(rootFreq / noteFreq, k);
// k = 0.7 (hardcoded)
```

**What Gets Scaled:**
1. **Mod1 Deviation:** `baseDeviation * scaleFactor`
2. **FM Depth:** `preset.index * scaleFactor`

**What Stays the Same:**
1. **Mod2 Gain:** Unchanged
2. **Harmonics:** Auto-transpose via semitone offsets
3. **Envelope:** Same timing for all notes
4. **Effects:** Same settings for all notes

**Example (Root = C4):**
- **C6 (2 octaves up):** scaleFactor = 0.379 → 38% modulation (gentle)
- **C5 (1 octave up):** scaleFactor = 0.616 → 62% modulation (smooth)
- **C4 (root):** scaleFactor = 1.000 → 100% modulation (as dialed)
- **C3 (1 octave down):** scaleFactor = 1.625 → 162% modulation (bright)
- **C2 (2 octaves down):** scaleFactor = 2.639 → 264% modulation (full)

**Result:** All 25 notes sound like the same instrument!

---

# 2. Code Execution Path

## 2.1 Application Boot Sequence

### File: `index.html`
```
1. Load HTML structure
2. Load CSS (style.css)
3. Load JavaScript libraries:
   ├─ JSZip (for WAV pack export)
   ├─ main.js (global state + utilities)
   ├─ carrier-engine.js (harmonics - deprecated name)
   ├─ fm-engine.js (FM synthesis)
   ├─ carrier-envelope-engine.js (AHDHD envelope)
   ├─ filter-engine.js (LP/HP + EQ)
   ├─ effects-engine.js (stereo/detune/chorus/delay/reverb)
   └─ render-engine.js (playback + WAV export)
```

### File: `main.js` - DOMContentLoaded Event
```javascript
document.addEventListener("DOMContentLoaded", () => {
  // 1. Resume AudioContext on first user click
  window.addEventListener("click", resumeAudioContext, { once: true });
  
  // 2. Register default patch values
  FMEngine.register(patch);
  AmpEnvelopeEngine.register(patch);
  FilterEngine.register(patch);
  EffectsEngine.register(patch);
  
  // 3. Initialize UI
  initAccordionUI();           // Collapsible panels
  initEngineSelectorUI();      // FM/Sub/Sampler tabs
  initCarrierUI();             // Root note slider
  initTempoUI();               // BPM slider
  initEnvelopeUI();            // AHDHD + presets
  initHarmonicsUI();           // Harmonic gains/offsets + chords
  FMEngine.initUI(patch);      // Mod1/Mod2 controls
  FilterEngine.initUI(patch);  // LP/HP/EQ controls
  RenderEngine.initRenderUI(patch);   // Sample rate + duration
  RenderEngine.initPlaybackUI(patch); // Audition button + spacebar
  
  // 4. Load saved session
  loadSession();               // Restore sliders from localStorage
  
  // 5. Enable auto-save
  setupAutoSave();             // Save on every slider/button change
  
  console.log("✅ interPhace initialized successfully");
});
```

---

## 2.2 User Interaction Flows

### A. Adjusting a Slider

```
User moves slider
    ↓
[Input Event Listener] (bound via UI.bindSlider)
    ↓
Update patch.* value (e.g., patch.synth.fm.modulators[0].gain = 65)
    ↓
Update display value (e.g., "65%")
    ↓
[Auto-save triggers] (100ms debounce)
    ↓
saveSession() writes to localStorage
```

**Example:** Mod1 Gain Slider
```javascript
// File: fm-engine.js, initUI()
UI.bindSlider("mod1Gain", "mod1GainValue", v => {
  fm.modulators[0].gain = Number(v);  // Update patch
  return Math.round(v) + "%";         // Display format
});
// Auto-save happens automatically via setupAutoSave()
```

---

### B. Clicking a Button (e.g., Ratio Button)

```
User clicks ratio button (e.g., "√2")
    ↓
[Click Event Listener] (e.g., on .ratio-row)
    ↓
Update patch value (e.g., fm.modulators[0].ratio = 1.414)
    ↓
Toggle .active class on buttons
    ↓
[Auto-save triggers]
    ↓
saveSession() writes to localStorage
```

**Example:** Mod1 Ratio Button
```javascript
// File: fm-engine.js, initFMRatioUI()
group.addEventListener("click", e => {
  const btn = e.target.closest("button");
  fm.modulators[modIndex].ratio = Number(btn.dataset.ratio);
  // Update active state visually
  group.querySelectorAll(".ratio-btn").forEach(b => 
    b.classList.toggle("active", b === btn)
  );
});
```

---

### C. Loading a Preset

```
User clicks instrument preset slider
    ↓
[Input Event Listener] in main.js
    ↓
findClosestPreset(sliderValue)
    ↓
applyPreset(preset)
    ├─ Set all mod1/mod2 values
    ├─ Set FM depth
    ├─ Set harmonics
    ├─ Click envelope preset button
    ├─ Set all effect preset sliders
    ├─ Set wet/dry mix
    ├─ Set compressor state
    └─ Set personality
    ↓
Each setter triggers display updates
    ↓
[Auto-save triggers]
    ↓
console.log("✅ Loaded preset: [name]")
```

**Flow in Detail:**
```javascript
// File: main.js, line ~700
const presetSlider = document.getElementById("instrumentPreset");
presetSlider.addEventListener("input", () => {
  const val = Number(presetSlider.value);
  const preset = findClosestPreset(val);  // Snap to nearest
  applyPreset(preset);                    // Load all settings
});

function applyPreset(preset) {
  const data = preset.data;
  
  // Set modulators
  setSlider("mod1Gain", data.mod1Gain);
  setRatioButton(0, data.mod1Ratio);
  setWaveButton(0, data.mod1Wave);
  // ... (continues for all parameters)
  
  // Trigger envelope preset
  const envBtn = document.querySelector(`[data-env="${data.envelope}"]`);
  if (envBtn) envBtn.click();
  
  console.log(`✅ Loaded preset: ${preset.name}`);
}
```

---

### D. Playing a Note (Audition / Spacebar)

```
User clicks Audition button OR presses Spacebar
    ↓
[Click/Keydown Event Listener] in render-engine.js
    ↓
Check if already playing:
  ├─ If YES: RenderEngine.stop() (fade out)
  └─ If NO: RenderEngine.startFromPatch(patch)
       ↓
updateParamsFromHTML() (sync any unbound values)
       ↓
getPlaybackContext() (reuse 48kHz context)
       ↓
AmpEnvelopeEngine.computeLength() (calculate note duration)
       ↓
FMEngine.build(ctx, baseFreq, fmParams, noteLength)
  ├─ Create oscillators (Mod2 → Mod1 → Carrier)
  ├─ Apply FM depth envelope
  ├─ Add helper tone if enabled
  └─ Return: { node, carrier }
       ↓
AmpEnvelopeEngine.apply(ctx, synthNode, envParams, carrierNode, baseFreq)
  ├─ Create AHDHD envelope
  ├─ Apply personality modulation (if not Clean)
  └─ Return: { node, noteLength }
       ↓
FilterEngine.apply(ctx, envNode, filterParams)
  ├─ HP filter (if enabled)
  ├─ LP filter (if enabled)
  ├─ EQ bands (if gain ≠ 0)
  └─ Return: { node }
       ↓
EffectsEngine.applyAll(ctx, filteredNode, fxParams, noteLength)
  ├─ Stereo Width (mono → stereo)
  ├─ Detune (if preset > 0)
  ├─ Chorus (if preset > 0)
  ├─ Delay (if preset > 0)
  ├─ Reverb (if preset > 0)
  ├─ Wet/Dry Mix
  ├─ Compressor (if enabled)
  └─ Return: { node } (STEREO)
       ↓
Create Safety Limiter (DynamicsCompressor)
       ↓
Create Output Gain (0.9)
       ↓
Connect to AudioContext.destination
       ↓
Start all oscillators/LFOs
       ↓
Schedule stop at (noteLength + 0.1s)
       ↓
Store playback handle in window.activePlayback
       ↓
Update button UI ("Stop", .playing class)
```

**Key Functions:**
```javascript
// File: render-engine.js
RenderEngine.startFromPatch(patch) {
  const ctx = getPlaybackContext();  // 48kHz persistent context
  const baseFreq = midiToFreq(patch.midiNote);
  const noteLength = AmpEnvelopeEngine.computeLength(...);
  
  // Build audio graph (see signal path above)
  const synthNode = FMEngine.build(...);
  const envNode = AmpEnvelopeEngine.apply(...);
  const filteredNode = FilterEngine.apply(...);
  const fxNode = EffectsEngine.applyAll(...);
  
  // Output chain
  limiter.connect(outGain).connect(ctx.destination);
  
  // Auto-cleanup
  setTimeout(() => { window.activePlayback = null; }, noteLength * 1000);
  
  return { ctx, outGain, noteLength };
}
```

---

### E. Rendering a 25-Note WAV Pack

```
User clicks Render button
    ↓
[Click Event Listener] in render-engine.js
    ↓
renderSamplePack(patch)
    ↓
Loop: for midi = rootMidi - 12 to rootMidi + 12
    ↓
    Calculate scaleFactor = Math.pow(rootFreq / noteFreq, 0.7)
    ↓
    createScaledPatch(originalPatch, targetMidi, scaleFactor)
      ├─ Clone patch
      ├─ Set midiNote = targetMidi
      ├─ Set modulators[0].deviationScale = scaleFactor
      ├─ Set fmDepthPresetScale = scaleFactor
      └─ Return: scaledPatch
    ↓
    renderNoteToWav(scaledPatch)
      ├─ Create OfflineAudioContext (at user's sample rate)
      ├─ Build audio graph (same as playback)
      ├─ await ctx.startRendering()
      ├─ Convert AudioBuffer to WAV (16-bit PCM)
      └─ Return: wavBuffer (ArrayBuffer)
    ↓
    Store: { name: "48_C3.wav", data: wavBuffer }
    ↓
    Console: "Rendering 1/25: C3 (scale: 1.625)"
    ↓
End Loop
    ↓
createAndDownloadZip(wavFiles, patch)
  ├─ Create JSZip instance
  ├─ Add all 25 WAV files to ZIP
  ├─ Generate ZIP blob (DEFLATE compression)
  ├─ Create download link
  ├─ Trigger download: "interPhace_C4_2026-02-18.zip"
  └─ Alert: "✅ Rendered 25 notes!"
```

**Key Details:**

**Frequency Scaling Application:**
```javascript
// File: fm-engine.js, build()
const baseDeviation = computeDeviation(mod1Freq, fmParams.modulators[0].gain);
const deviationScale = fmParams.modulators[0].deviationScale || 1.0;
const mod1Deviation = baseDeviation * deviationScale * keyScale;
```

**WAV Conversion:**
```javascript
// File: render-engine.js, audioBufferToWav()
function audioBufferToWav(buffer) {
  // Extract stereo samples
  // Convert float32 [-1, 1] to int16 PCM
  // Build WAV header (RIFF/WAVE format)
  // Return ArrayBuffer
}
```

**Rendering Time:**
- ~0.5-1s per note at 192kHz
- ~12-25s total for 25 notes
- Async/await prevents browser freeze

---

## 2.3 Session Persistence Flow

### Save Flow
```
User interacts with any slider/button
    ↓
[Auto-save listener] (setupAutoSave)
    ↓
Debounce 100ms (prevent rapid saves)
    ↓
saveSession()
  ├─ Read all patch.* values
  ├─ Read UI slider positions (for chord preset, etc.)
  ├─ Create session object (JSON)
  ├─ Add timestamp + version
  ├─ localStorage.setItem("interphace_session", JSON.stringify(session))
  └─ Console: "💾 Session saved"
```

### Load Flow
```
Page loads
    ↓
DOMContentLoaded event
    ↓
All engines register defaults
    ↓
All UI initialized
    ↓
loadSession()
  ├─ localStorage.getItem("interphace_session")
  ├─ Parse JSON
  ├─ Check if exists
  ├─ For each parameter:
  │   └─ setSlider(id, value)
  │       ├─ slider.value = value
  │       └─ slider.dispatchEvent(new Event('input'))
  ├─ Set button states (ratios, waves, envelope presets)
  └─ Console: "📂 Loading saved session from [date/time]"
```

**Special Cases:**
```javascript
// decay1Target: stored as 0-1, slider is 0-100
setSlider("decay1Target", session.decay1Target * 100);

// Envelope preset: click the button to trigger preset
const envBtn = document.querySelector(`[data-env="${session.envelope}"]`);
if (envBtn) envBtn.click();
```

---

# 3. Code Architecture & Editing Guide

## 3.1 File Organization

```
interphace-project/
├── index.html                    # HTML structure
├── style.css                     # Styling (not covered here)
├── README.md                     # User documentation
├── ARCHITECTURE.md               # This file
└── js/
    ├── main.js                   # Global state, utilities, presets, session
    ├── fm-engine.js              # FM synthesis (Mod2→Mod1→Carrier)
    ├── carrier-engine.js         # DEPRECATED (harmonics now in FM engine)
    ├── carrier-envelope-engine.js # AHDHD envelope + personalities
    ├── filter-engine.js          # LP/HP + 3-band parametric EQ
    ├── effects-engine.js         # Stereo/Detune/Chorus/Delay/Reverb
    └── render-engine.js          # Playback + WAV rendering
```

---

## 3.2 File Purposes & Editing Guide

### `main.js` - Global State & Orchestration
**Lines:** ~1500  
**Purpose:** Single source of truth for all synth parameters

**Key Sections:**
```javascript
// Lines 1-50: Global patch object
window.patch = {
  engine: "fm",
  midiNote: 60,
  sampleRate: 192000,
  synth: { fm: {}, ... },
  envelope: { ahdhd: {}, ... },
  fx: { ... },
  filter: { ... }
};

// Lines 60-150: Utilities
window.midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);
window.midiToName = m => { ... };
window.UI.bindSlider = (sliderId, valueId, formatFn) => { ... };

// Lines 200-700: 40 Instrument Presets
const PRESET_LIBRARY = [ ... ];

// Lines 750-850: Preset application
function applyPreset(preset) { ... }

// Lines 900-1000: UI initialization functions
initCarrierUI();
initTempoUI();
initHarmonicsUI();
initEnvelopeUI();

// Lines 1200-1350: Session save/load
saveSession();
loadSession();
setupAutoSave();

// Lines 1400-1500: Boot sequence
document.addEventListener("DOMContentLoaded", () => { ... });
```

**When to Edit:**
- **Add a preset:** Add to `PRESET_LIBRARY` array
- **Change default values:** Edit `patch` object at top
- **Add UI binding:** Add to relevant `init*UI()` function
- **Session storage:** Update `saveSession()` and `loadSession()`

---

### `fm-engine.js` - FM Synthesis Engine
**Lines:** ~340  
**Purpose:** Generate FM audio (Mod2→Mod1→Carrier + Harmonics)

**Key Sections:**
```javascript
// Lines 1-80: FM Depth preset table (20 presets)
const FM_DEPTH_PRESETS = [ ... ];

// Lines 90-160: Stereo width preset table (16 presets)
const STEREO_WIDTH_PRESETS = [ ... ];

// Lines 170-190: Register defaults
FMEngine.register = function(patch) { ... };

// Lines 200-260: UI bindings
FMEngine.initUI = function(patch) { ... };

// Lines 270-340: Core synthesis
FMEngine.build = function(ctx, baseFreq, fmParams, noteLength) {
  // Build Mod2 oscillator
  // Build Mod1 oscillator (modulated by Mod2)
  // Build Carrier oscillator (modulated by Mod1)
  // Apply FM depth envelope
  // Add helper tone (optional)
  // Add harmonics (optional)
  // Return { node, carrier }
};
```

**When to Edit:**
- **Add FM depth preset:** Add to `FM_DEPTH_PRESETS`
- **Change modulator routing:** Edit `build()` oscillator connections
- **Add waveform:** Add to `normalizeWave()` function
- **Adjust key scaling:** Edit `computeKeyScale()` curve

**Important Functions:**
```javascript
computeDeviation(modFreq, slider)
  // Converts slider value (0-100) to Hz deviation
  // Uses FM_INDEX_TABLE lookup

applyFMDepthEnvelope(gainParam, baseFM, t0, attack, decay, index, mod1Freq)
  // Adds dynamic FM modulation envelope
  // Peak = baseFM + (index * mod1Freq)
```

---

### `carrier-envelope-engine.js` - AHDHD Envelope + Personalities
**Lines:** ~250  
**Purpose:** Apply amplitude envelope with optional modulation

**Key Sections:**
```javascript
// Lines 1-130: Personality preset table (10 presets)
const ENVELOPE_PERSONALITY_PRESETS = [
  {
    name: "Clean",
    stages: {
      attack: { gainMod: null, pitchMod: null },
      hold1: { ... },
      // Each stage defines gainMod and pitchMod
    }
  },
  // ... 9 more personalities
];

// Lines 140-160: Register defaults
AmpEnvelopeEngine.register = function(patch) { ... };

// Lines 170-190: Compute length (no nodes)
AmpEnvelopeEngine.computeLength = function(envParams) { ... };

// Lines 200-250: Apply envelope + personality
AmpEnvelopeEngine.apply = function(ctx, inputNode, envParams, carrierNode, baseFreq) {
  // Create AHDHD envelope (5 stages)
  // If personality ≠ Clean:
  //   - Create gain LFO + depth control
  //   - Create pitch LFO + depth control
  //   - Schedule depth changes per stage
  // Return { node, noteLength }
};
```

**When to Edit:**
- **Add envelope preset:** Edit `applyPreset()` in `main.js`
- **Add personality:** Add to `ENVELOPE_PERSONALITY_PRESETS`
- **Change envelope curve:** Edit `apply()` ramp types
- **Adjust stage timing:** Edit `register()` defaults

**Personality Modulation:**
```javascript
scheduleStageModulation(ctx, lfo, depthNode, stageDef, startTime, duration, baseFreq, isPitch)
  // Sets LFO frequency
  // Ramps depth over 10ms (prevent clicks)
  // Converts semitones to Hz for pitch modulation
```

---

### `filter-engine.js` - Filters & EQ
**Lines:** ~200  
**Purpose:** LP/HP filtering + 3-band parametric EQ

**Key Sections:**
```javascript
// Lines 1-40: Frequency lookup tables
const LP_FREQ_PRESETS = [60, 80, 100, ..., 20000]; // 26 steps
const HP_FREQ_PRESETS = [20, 25, 31, ..., 6300];   // 26 steps
const EQ_FREQ_PRESETS = [60, 80, 100, ..., 16000]; // 25 steps

// Lines 50-70: Register defaults
FilterEngine.register = function(patch) { ... };

// Lines 80-130: Apply filters
FilterEngine.apply = function(ctx, inputNode, filterParams) {
  // HP filter (if freq > 0)
  // LP filter (if freq < 25)
  // EQ band 1 (if |gain| > 0.1)
  // EQ band 2 (if |gain| > 0.1)
  // EQ band 3 (if |gain| > 0.1)
  // Return { node }
};

// Lines 140-200: UI bindings
FilterEngine.initUI = function(patch) { ... };
```

**When to Edit:**
- **Add filter preset:** Add frequency to lookup tables
- **Change EQ range:** Edit `EQ_FREQ_PRESETS`
- **Adjust filter Q:** Edit `Q.value = 0.7` in `apply()`
- **Add filter type:** Add new biquad filter in `apply()`

---

### `effects-engine.js` - Effects Chain
**Lines:** ~730  
**Purpose:** Stereo width, detune, chorus, delay, reverb, compressor

**Key Sections:**
```javascript
// Lines 1-10: Reverb cache
let cachedReverbImpulses = {};

// Lines 20-90: Delay preset table (16 presets)
const DELAY_PRESETS = [ ... ];

// Lines 100-150: Detune preset table (16 presets)
const DETUNE_PRESETS = [ ... ];

// Lines 160-220: Chorus preset table (16 presets)
const CHORUS_PRESETS = [ ... ];

// Lines 230-290: Reverb preset table (16 presets)
const REVERB_PRESETS = [ ... ];

// Lines 300-320: Register defaults
EffectsEngine.register = function(patch) { ... };

// Lines 330-380: Apply all effects
EffectsEngine.applyAll = function(ctx, monoInput, fxParams, noteLength) {
  // Stereo Width (mono → stereo)
  // Detune (if preset > 0)
  // Chorus (if preset > 0)
  // Delay (if preset > 0)
  // Reverb (if preset > 0)
  // Wet/Dry Mix
  // Compressor (if enabled)
  // Return { node } (STEREO)
};

// Lines 400-730: Individual effect functions
applyStereoWidthEffect();
applyDetuneEffect();
applyChorusEffect();
applyDelayEffect();
applyReverbEffect();
generateReverbImpulse();
```

**When to Edit:**
- **Add effect preset:** Add to relevant `*_PRESETS` table
- **Change effect routing:** Edit `applyAll()` order
- **Adjust effect parameters:** Edit individual `apply*Effect()` functions
- **Add new effect:** Create new function + add to `applyAll()`

**Important:**
- Reverb cache key includes sample rate: `reverb_${preset}_${sampleRate}`
- Delay uses tempo sync: `tempoToDelayTime(tempo, division)`
- Wet/Dry mix is parallel (not serial): dry + wet signals mixed

---

### `render-engine.js` - Playback & WAV Export
**Lines:** ~420  
**Purpose:** Real-time playback + 25-note WAV rendering

**Key Sections:**
```javascript
// Lines 1-60: Playback context management
window.playbackContext = null;
getPlaybackContext();

// Lines 70-120: Render UI
initSampleRateUI();
initRenderDurationUI();
initRenderButton();

// Lines 130-180: Playback UI + spacebar
initPlaybackUI(patch);

// Lines 190-280: Main playback function
RenderEngine.startFromPatch = function(patch) {
  // Get playback context (48kHz)
  // Build audio graph (see signal path)
  // Connect to destination
  // Schedule auto-cleanup
  // Return playback handle
};

// Lines 290-310: Stop playback
RenderEngine.stop = function() { ... };

// Lines 320-390: Render 25-note pack
renderSamplePack(patch);
createScaledPatch(originalPatch, targetMidi, scaleFactor);
renderNoteToWav(scaledPatch);

// Lines 400-420: WAV conversion + ZIP
audioBufferToWav(buffer);
createAndDownloadZip(wavFiles, patch);
```

**When to Edit:**
- **Change playback sample rate:** Edit `getPlaybackContext()` (48kHz hardcoded)
- **Adjust render range:** Edit loop in `renderSamplePack()` (currently ±12 semitones)
- **Change scaling curve:** Edit `k = 0.7` in `renderSamplePack()`
- **Modify WAV format:** Edit `audioBufferToWav()` (currently 16-bit stereo)

**Frequency Scaling:**
```javascript
// In renderSamplePack():
const scaleFactor = Math.pow(rootFreq / noteFreq, 0.7);

// In createScaledPatch():
scaled.synth.fm.modulators[0].deviationScale = scaleFactor;
scaled.synth.fm.fmDepthPresetScale = scaleFactor;

// In fm-engine.js build():
const mod1Deviation = baseDeviation * deviationScale * keyScale;
```

---

## 3.3 Adding New Features

### Example 1: Add a New Modulator Ratio

**File:** `index.html`
```html
<!-- Add button to ratio row -->
<button class="ratio-btn" data-ratio="5">5</button>
```

**File:** `fm-engine.js`
```javascript
// No code changes needed!
// The ratio button handler reads data-ratio attribute
```

**File:** `main.js`
```javascript
// Update presets that should use it
{
  name: "Fifth Harmonics",
  data: {
    mod1Ratio: 5,  // New ratio
    // ...
  }
}
```

---

### Example 2: Add a New Effect

**File:** `effects-engine.js`
```javascript
// 1. Add preset table
const PHASER_PRESETS = [
  { name: "Off", stages: 0, rate: 0, depth: 0, feedback: 0 },
  { name: "Gentle", stages: 4, rate: 0.5, depth: 0.3, feedback: 0.5 },
  // ... more presets
];

// 2. Create apply function
function applyPhaserEffect(ctx, stereoInput, presetIndex) {
  const preset = PHASER_PRESETS[presetIndex];
  if (!preset || preset.stages === 0) return stereoInput;
  
  // Build phaser with allpass filters + LFO
  // Return processed node
}

// 3. Add to applyAll()
EffectsEngine.applyAll = function(ctx, monoInput, fxParams, noteLength) {
  // ... existing effects
  
  // NEW: Phaser
  if (fxParams.phaser && fxParams.phaser.preset > 0) {
    currentNode = applyPhaserEffect(ctx, currentNode, fxParams.phaser.preset);
  }
  
  // ... continue with rest
};

// 4. Register defaults
EffectsEngine.register = function(patch) {
  patch.fx.phaser = { preset: 0 };
  // ... other effects
};
```

**File:** `index.html`
```html
<!-- Add slider in effects section -->
<div class="control">
  <div class="control-top">
    <label class="control-label">Phaser</label>
    <span class="control-value" id="phaserPresetValue">Off</span>
  </div>
  <div class="control-body">
    <input id="phaserPreset" type="range" min="0" max="15" step="1" value="0" />
  </div>
</div>
```

**File:** `main.js`
```javascript
// Add UI binding (in boot sequence)
UI.bindSlider("phaserPreset", "phaserPresetValue", v => {
  patch.fx.phaser.preset = Number(v);
  const names = ["Off", "Gentle", "Moderate", ...];
  return names[v] || "Custom";
});

// Add to session save/load
saveSession() {
  // ...
  phaserPreset: patch.fx.phaser.preset,
}

loadSession() {
  setSlider("phaserPreset", session.phaserPreset);
}
```

---

### Example 3: Add a New Envelope Type

**File:** `carrier-envelope-engine.js`
```javascript
// Create new envelope function
AmpEnvelopeEngine.applyADSR = function(ctx, inputNode, envParams) {
  const env = ctx.createGain();
  
  const { attack, decay, sustain, release } = envParams;
  const t0 = ctx.currentTime;
  
  // ADSR curve
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(1.0, t0 + attack);
  env.gain.exponentialRampToValueAtTime(sustain, t0 + attack + decay);
  // Sustain indefinitely until release triggered
  
  inputNode.connect(env);
  return { node: env };
};
```

**File:** `main.js`
```javascript
// Add to patch registration
AmpEnvelopeEngine.register = function(patch) {
  patch.envelope.adsr = {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.5
  };
};

// Add UI for ADSR controls
// Add envelope type selector
```

---

## 3.4 Common Editing Patterns

### Pattern 1: Adding a Lookup Table Preset

**Use Case:** Adding preset values for any parameter

**Template:**
```javascript
const MY_PRESET_TABLE = [
  { slider: 0,  value: someValue, name: "Preset Name" },
  { slider: 10, value: otherValue, name: "Other Name" },
  // ... 16 total (for 0-15 slider range)
];

function findClosestMyPreset(sliderValue) {
  let closest = MY_PRESET_TABLE[0];
  let minDiff = Math.abs(sliderValue - closest.slider);
  
  for (const preset of MY_PRESET_TABLE) {
    const diff = Math.abs(sliderValue - preset.slider);
    if (diff < minDiff) {
      minDiff = diff;
      closest = preset;
    }
  }
  return closest;
}
```

---

### Pattern 2: Binding a Slider to Patch State

**Template:**
```javascript
// In relevant *Engine.initUI(patch):
UI.bindSlider("sliderId", "valueId", v => {
  patch.path.to.value = Number(v);
  return formatFunction(v); // e.g., v + "Hz"
});
```

**Example:**
```javascript
UI.bindSlider("mod1Gain", "mod1GainValue", v => {
  patch.synth.fm.modulators[0].gain = Number(v);
  return Math.round(v) + "%";
});
```

---

### Pattern 3: Adding Button Group (Ratios, Waves, etc.)

**HTML:**
```html
<div class="ratio-row" data-mod="1">
  <button class="ratio-btn active" data-ratio="1">1</button>
  <button class="ratio-btn" data-ratio="2">2</button>
  <button class="ratio-btn" data-ratio="3">3</button>
</div>
```

**JavaScript:**
```javascript
const group = document.querySelector('[data-mod="1"]');
group.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  
  // Update patch
  patch.synth.fm.modulators[0].ratio = Number(btn.dataset.ratio);
  
  // Update UI
  group.querySelectorAll(".ratio-btn").forEach(b => 
    b.classList.toggle("active", b === btn)
  );
});
```

---

### Pattern 4: Creating Audio Nodes in Web Audio

**Template:**
```javascript
function myAudioEffect(ctx, inputNode, params) {
  // Create nodes
  const myNode = ctx.createSomeNode();
  myNode.parameter.value = params.value;
  
  // Connect
  inputNode.connect(myNode);
  
  // Return for chaining
  return myNode;
}
```

**Example:**
```javascript
function applyLowpass(ctx, inputNode, cutoffFreq) {
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = cutoffFreq;
  lp.Q.value = 0.7;
  
  inputNode.connect(lp);
  return lp;
}
```

---

### Pattern 5: Scheduling Audio Parameter Changes

**Template:**
```javascript
const param = audioNode.someParam;
const t0 = ctx.currentTime;

// Set starting value
param.setValueAtTime(startValue, t0);

// Ramp to target
param.linearRampToValueAtTime(targetValue, t0 + duration);
// OR
param.exponentialRampToValueAtTime(targetValue, t0 + duration);

// Note: exponentialRamp can't reach 0, use 0.0001
```

**Example:**
```javascript
const gainParam = gainNode.gain;
const t0 = ctx.currentTime;

gainParam.setValueAtTime(0.0001, t0);
gainParam.exponentialRampToValueAtTime(1.0, t0 + attack);
gainParam.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
```

---

# 4. Data Flow Diagrams

## 4.1 Patch State Structure

```
window.patch
├── engine: "fm"
├── envEngine: "ahdhd"
├── midiNote: 60 (C4)
├── tempo: 70
├── sampleRate: 192000
├── renderDuration: 8.0
│
├── synth
│   └── fm
│       ├── modulators[0]
│       │   ├── ratio: 1.0
│       │   ├── gain: 0
│       │   ├── wave: "sine"
│       │   └── deviationScale: 1.0 (render only)
│       ├── modulators[1]
│       │   ├── ratio: 2.0
│       │   ├── gain: 0
│       │   └── wave: "sine"
│       ├── fmDepthPreset: 0
│       ├── fmDepthPresetScale: 1.0 (render only)
│       ├── helperTone
│       │   ├── gain: 0
│       │   └── noteOffset: 0
│       ├── harmonic1
│       │   ├── gain: 0
│       │   └── noteOffset: 0
│       └── harmonic2
│           ├── gain: 0
│           └── noteOffset: 0
│
├── envelope
│   └── ahdhd
│       ├── attack1: 0.04
│       ├── hold1: 0
│       ├── decay1: 0.8
│       ├── decay1Target: 0.1
│       ├── hold2: 1.5
│       ├── decay2: 0.9
│       ├── envMult: 1.0
│       └── personality: 0
│
├── filter
│   ├── lpFreq: 25 (index, not Hz)
│   ├── hpFreq: 0 (index, not Hz)
│   ├── eq1: { freq: 5, gain: 0, q: 1.0 }
│   ├── eq2: { freq: 12, gain: 0, q: 1.0 }
│   └── eq3: { freq: 18, gain: 0, q: 1.0 }
│
└── fx
    ├── stereoWidth: { preset: 0 }
    ├── detune: { preset: 0 }
    ├── chorus: { preset: 0 }
    ├── delay: { preset: 0 }
    ├── reverb: { preset: 0 }
    ├── wetDryMix: 80
    └── compressor: { enabled: true }
```

---

## 4.2 Audio Node Graph (Playback)

```
AudioContext (48kHz)
│
├─ Mod2 Oscillator (saw/square/sine)
│   └─ Mod2 Gain → Mod1.frequency
│
├─ Mod1 Oscillator (saw/square/sine)
│   ├─ Mod1 Gain → Carrier.frequency
│   └─ FM Depth Envelope (modulates Mod1 Gain)
│
├─ Carrier Oscillator (sine only)
│   └─ [Optional: Helper Tone Mixer]
│
├─ [Optional: Harmonic1 Oscillator]
│   └─ Harmonic1 Gain
│
├─ [Optional: Harmonic2 Oscillator]
│   └─ Harmonic2 Gain
│
├─ FM Mixer (Carrier + Harmonics) → MONO
│
├─ AHDHD Envelope Gain → MONO
│   ├─ [Optional: Gain LFO] (parallel modulation)
│   └─ [Optional: Pitch LFO] (modulates Carrier.frequency)
│
├─ HP Filter (if enabled) → MONO
│
├─ LP Filter (if enabled) → MONO
│
├─ EQ Band 1 (if gain ≠ 0) → MONO
│
├─ EQ Band 2 (if gain ≠ 0) → MONO
│
├─ EQ Band 3 (if gain ≠ 0) → MONO
│
├─ Stereo Width (MONO → STEREO)
│   ├─ Left: Direct
│   └─ Right: Haas Delay + Allpass
│
├─ Channel Splitter (STEREO → L + R)
│
├─ Detune Effect (if enabled)
│   ├─ L: Delay + LFO
│   └─ R: Delay + LFO (different rate)
│
├─ Chorus Effect (if enabled)
│   ├─ L: 2-5 voices (Delay + LFO each)
│   └─ R: 2-5 voices (Delay + LFO each)
│
├─ Delay Effect (if enabled)
│   ├─ Mono Mode: Single delay line with feedback
│   └─ Ping-Pong: Cross-feedback between L/R
│
├─ Reverb Effect (if enabled)
│   ├─ Predelay
│   └─ Convolver (algorithmic impulse)
│
├─ Wet/Dry Mixer (STEREO)
│   ├─ Dry: Original filtered signal
│   └─ Wet: After all effects
│
├─ Compressor (if enabled) → STEREO
│   └─ Makeup Gain
│
├─ Safety Limiter (always on) → STEREO
│
├─ Output Gain (0.9) → STEREO
│
└─ AudioContext.destination (speakers)
```

**Node Count:**
- Minimum: ~15 nodes (FM + envelope + output)
- Maximum: ~80 nodes (all effects + 10 chorus voices)

---

## 4.3 Render vs. Playback Context Differences

```
PLAYBACK                          RENDER
────────────────────────────────────────────────────────
AudioContext (reused)        OfflineAudioContext (new)
Sample Rate: 48kHz           User selected (44.1k-192k)
Duration: Envelope + 0.1s    Envelope + 0.5s (capped)
Output: Speakers             WAV file (16-bit PCM)
Scaling: None                Frequency scaling (k=0.7)
Count: 1 note                25 notes (±12 semitones)
Cache: Shared reverb         Per-sample-rate reverb
```

---

# 5. Key Concepts & Gotchas

## 5.1 Web Audio API Quirks

### Exponential Ramps Can't Reach Zero
```javascript
// BAD:
gainNode.gain.exponentialRampToValueAtTime(0, t);  // Error!

// GOOD:
gainNode.gain.exponentialRampToValueAtTime(0.0001, t);  // Close enough
```

### Sample Rate Must Match for Buffers
```javascript
// BAD:
const impulse = ctx48k.createBuffer(...);
ctx192k.convolver.buffer = impulse;  // Error!

// GOOD:
const cacheKey = `reverb_${preset}_${ctx.sampleRate}`;
```

### AudioContext State Management
```javascript
// Always check state before using
if (ctx.state === 'suspended') {
  await ctx.resume();
}

// Reuse contexts when possible (performance)
if (!window.playbackContext) {
  window.playbackContext = new AudioContext();
}
```

---

## 5.2 FM Synthesis Scaling

### The Core Problem
**FM synthesis changes timbre dramatically across octaves without scaling.**

- **High notes:** Modulation pushes sidebands too high → harsh, thin
- **Low notes:** Not enough modulation → muddy, dark

### The Solution
**Scale modulation depth inversely to frequency:**

```javascript
// Higher notes get LESS modulation
const scaleFactor = Math.pow(rootFreq / noteFreq, 0.7);

// Examples:
// C2 (low):  scaleFactor = 2.639 → 264% modulation
// C4 (root): scaleFactor = 1.000 → 100% modulation
// C6 (high): scaleFactor = 0.379 → 38% modulation
```

### Critical Implementation Detail
**Scale the DEVIATION (Hz), not the slider value:**

```javascript
// WRONG (causes table overflow):
const scaledGain = sliderValue * scaleFactor;  // Could be 131!
const deviation = FM_INDEX_TABLE[scaledGain];  // undefined

// RIGHT (scales Hz output):
const deviation = FM_INDEX_TABLE[sliderValue];  // Safe 0-100
const scaledDeviation = deviation * scaleFactor;  // Scale Hz
```

---

## 5.3 Envelope Personalities

### Not Envelope Shaping
**Personalities are PARALLEL modulation, not envelope morphing:**

```
AHDHD Envelope (unchanged)
    ↓
Gain Node (with AHDHD curve)
    ↓
Personality Gain LFO (parallel) ──────┐
    ↓                                  │
Carrier.frequency ← Pitch LFO ────────┘
```

### Stage-Aware Modulation
**Each AHDHD stage can have different LFO settings:**

```javascript
{
  attack: { gainMod: null, pitchMod: {...} },
  hold1:  { gainMod: {...}, pitchMod: null },
  // ... each stage independently configured
}
```

### Click Prevention
**Always ramp LFO depth over 10ms:**

```javascript
// BAD:
lfoDepth.gain.setValueAtTime(0.05, stageStart);  // Click!

// GOOD:
lfoDepth.gain.setValueAtTime(0, stageStart);
lfoDepth.gain.linearRampToValueAtTime(0.05, stageStart + 0.01);
```

---

## 5.4 Session Persistence Gotchas

### Value Scale Mismatches
```javascript
// decay1Target stored as 0-1, slider is 0-100
saveSession() {
  decay1Target: patch.envelope.ahdhd.decay1Target,  // 0.5
}

loadSession() {
  setSlider("decay1Target", session.decay1Target * 100);  // 50
}
```

### Triggering Input Events
```javascript
// Setting slider.value doesn't update display!
slider.value = 50;  // ← Display still shows old value

// Must dispatch event to trigger UI update:
slider.dispatchEvent(new Event('input'));  // ← Display updates
```

### Initialization Order
```javascript
// WRONG: Load before UI exists
loadSession();  // Error: elements don't exist yet
initUI();

// RIGHT: UI first, then load
initUI();
loadSession();  // Now sliders exist
```

---

## 5.5 Performance Considerations

### Context Reuse
```javascript
// BAD: Create new context every time (slow!)
function play() {
  const ctx = new AudioContext();
  // ...
}

// GOOD: Reuse persistent context
if (!window.playbackContext) {
  window.playbackContext = new AudioContext();
}
```

### Conditional Node Creation
```javascript
// Only create nodes if effect is enabled
if (fxParams.chorus.preset > 0) {
  currentNode = applyChorusEffect(...);
}
// Don't create bypassed nodes (saves CPU)
```

### Reverb Impulse Caching
```javascript
// Cache key includes preset + sample rate
const cacheKey = `reverb_${preset}_${sampleRate}`;
if (!cache[cacheKey]) {
  cache[cacheKey] = generateImpulse(...);  // Only once
}
```

---

## 5.6 Debugging Tips

### Console Logging Audio Values
```javascript
// Check for NaN/Infinity before setValueAtTime
console.log("Setting gain:", value);
if (!isFinite(value)) {
  console.error("Non-finite value detected!");
  return;
}
gainNode.gain.setValueAtTime(value, time);
```

### Verifying Signal Flow
```javascript
// Add gain nodes as checkpoints
const checkpoint = ctx.createGain();
checkpoint.gain.value = 1.0;
inputNode.connect(checkpoint);
console.log("Checkpoint:", checkpoint);
```

### Checking Node Connections
```javascript
// Log the audio graph structure
console.log("Node:", myNode);
console.log("Connected to:", myNode.context.destination);
console.log("Number of inputs:", myNode.numberOfInputs);
console.log("Number of outputs:", myNode.numberOfOutputs);
```

---

## 5.7 Future Expansion Points

### Easy Additions
- **More FM depth presets:** Add to `FM_DEPTH_PRESETS` array
- **More instrument presets:** Add to `PRESET_LIBRARY` array
- **More personalities:** Add to `ENVELOPE_PERSONALITY_PRESETS`
- **More effect presets:** Add to effect preset tables

### Medium Complexity
- **New effect types:** Phaser, flanger, distortion
- **Polyphony:** Multiple voices (requires voice allocation)
- **LFO system:** Global LFOs for parameter modulation
- **Filter envelope:** Dedicated filter modulation

### Complex Features
- **Subtractive engine:** Filter-based synthesis
- **Wavetable engine:** Wavetable oscillators
- **Sample playback:** Audio file loading/playback
- **MIDI input:** Web MIDI API integration
- **Modulation matrix:** Flexible routing system

---

# Appendix A: Quick Reference

## File Responsibilities
| File | Primary Purpose | Lines |
|------|----------------|-------|
| `main.js` | Global state, presets, session, orchestration | ~1500 |
| `fm-engine.js` | FM synthesis (Mod2→Mod1→Carrier) | ~340 |
| `carrier-envelope-engine.js` | AHDHD envelope + personalities | ~250 |
| `filter-engine.js` | LP/HP filters + 3-band EQ | ~200 |
| `effects-engine.js` | Stereo/Detune/Chorus/Delay/Reverb | ~730 |
| `render-engine.js` | Playback + 25-note WAV rendering | ~420 |

## Key Functions
| Function | Purpose | Returns |
|----------|---------|---------|
| `FMEngine.build()` | Generate FM audio | `{ node, carrier }` |
| `AmpEnvelopeEngine.apply()` | Apply envelope + personality | `{ node, noteLength }` |
| `FilterEngine.apply()` | Apply filters + EQ | `{ node }` |
| `EffectsEngine.applyAll()` | Apply all effects | `{ node }` |
| `RenderEngine.startFromPatch()` | Start playback | `{ ctx, outGain, noteLength }` |
| `renderSamplePack()` | Render 25 WAV files | `Promise<void>` |

## Important Constants
```javascript
// Frequency scaling
const k = 0.7;  // Render scaling curve

// Sample rates
const PLAYBACK_SR = 48000;
const RENDER_SR = patch.sampleRate;  // User selected

// Note range
const RENDER_RANGE = 25;  // ±12 semitones

// Safety values
const OUTPUT_GAIN = 0.9;
const MIN_EXPONENTIAL = 0.0001;
const RAMP_TIME = 0.01;  // 10ms click prevention
```

---

# Appendix B: Glossary

**AHDHD:** Attack, Hold1, Decay1, Hold2, Decay2 (5-stage envelope)  
**Deviation:** FM modulation depth in Hz  
**Key Scaling:** Adjusting modulation based on note frequency  
**Haas Effect:** Stereo width from small delays (0.1-30ms)  
**Convolution:** Reverb technique using impulse responses  
**Ping-Pong Delay:** Cross-feedback stereo delay  
**Offline Context:** Non-realtime rendering for WAV export  
**Personality:** Parallel LFO modulation synced to envelope stages  
**Helper Tone:** Additional sine wave for sub-bass/harmonic support  
**Wet/Dry Mix:** Blend between processed and unprocessed signal  
**Lookup Table:** Pre-computed values for slider positions  
**Session Persistence:** Saving/loading state via localStorage  

---

**End of Documentation**

For questions or contributions, see the main README.md file.

## Phase-aware personality micro-envelopes (Build 07)

Instrument Behavior and Character each use twenty continuous control points. Each profile owns a five-value phase distribution for Attack, Hold 1, Decay 1, Hold 2, and Decay 2. The distribution always resolves to twenty points. At render time, each point is placed inside its assigned AHDHD phase and stretched to the user-selected phase duration. The resulting parameter curves remain continuous across phase boundaries.

Instrument and Character profiles use the same scheduling framework but retain separate parameter ranges and purposes. Current values are migration placeholders derived from the previous curves; future work will voice each personality one at a time.
