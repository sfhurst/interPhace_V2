window.InterPhaceData = window.InterPhaceData || {};

(function () {
  const ENV = Object.freeze({
    tick: { attack1: 0.002, hold1: 0.006, decay1: 0.110, decay1Target: 0.00, hold2: 0.000, decay2: 0.160, envMult: 0.50 },
    arp: { attack1: 0.008, hold1: 0.024, decay1: 0.190, decay1Target: 0.32, hold2: 0.290, decay2: 0.520, envMult: 0.50 },
    pluck: { attack1: 0.006, hold1: 0.006, decay1: 0.160, decay1Target: 0.14, hold2: 0.220, decay2: 0.420, envMult: 1.00 },
    strike: { attack1: 0.020, hold1: 0.012, decay1: 0.200, decay1Target: 0.26, hold2: 0.434, decay2: 1.200, envMult: 1.00 },
    short: { attack1: 0.070, hold1: 0.036, decay1: 0.640, decay1Target: 0.34, hold2: 1.100, decay2: 1.500, envMult: 0.50 },
    medium: { attack1: 0.090, hold1: 0.060, decay1: 0.550, decay1Target: 0.48, hold2: 1.100, decay2: 1.500, envMult: 1.00 },
    long: { attack1: 0.090, hold1: 0.050, decay1: 0.450, decay1Target: 0.58, hold2: 1.200, decay2: 1.500, envMult: 2.00 },
    pad: { attack1: 0.300, hold1: 0.072, decay1: 0.560, decay1Target: 0.64, hold2: 1.280, decay2: 1.680, envMult: 2.50 },
    drone: { attack1: 0.450, hold1: 0.100, decay1: 0.600, decay1Target: 0.78, hold2: 1.250, decay2: 1.500, envMult: 4.00 },
    wash: { attack1: 0.750, hold1: 0.200, decay1: 0.900, decay1Target: 0.52, hold2: 1.200, decay2: 2.000, envMult: 4.00 },
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function merge(base, overrides) {
    const out = clone(base);
    (function apply(target, source) {
      Object.entries(source || {}).forEach(([key, value]) => {
        if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
          apply(target[key], value);
        } else target[key] = clone(value);
      });
    })(out, overrides || {});
    return out;
  }
  function env(name, instrumentBehavior = 0, character = 0, extra = {}) {
    const raw = Object.assign({}, ENV[name] || ENV.medium, extra);
    // Preserve the authored absolute envelope while keeping every base-stage
    // slider inside its visible UI range. Long shapes use envMult rather than
    // hiding values beyond a slider's maximum.
    const limits = { attack1:2, hold1:6, decay1:2, hold2:6, decay2:2 };
    let scale = 1;
    Object.entries(limits).forEach(([key, limit]) => {
      scale = Math.max(scale, Number(raw[key] || 0) / limit);
    });
    scale = Math.min(10, Math.max(1, scale));
    const normalized = Object.assign({}, raw);
    if (scale > 1) {
      Object.keys(limits).forEach(key => { normalized[key] = Number(raw[key] || 0) / scale; });
      normalized.envMult = Number(raw.envMult || 1) * scale;
    }
    return Object.assign(normalized, { instrumentBehavior, character });
  }
  function voice(shape = 0, motion = 0, chance = 0, rate = "1/8") { return { shape, motion, chance, rate }; }
  function arp(sequence = "", A = voice(), B = voice(), C = voice(), D = voice()) { return { sequence, voices: { A, B, C, D } }; }
  function eq(range, freq, gain = 0, q = 1) { return { range, freq, gain, q }; }
  function fx(bitCrush=0, width=0, detune=0, chorus=0, delay=0, reverb=0, saturation=0, wet=70) {
    return {
      bitCrush: { preset: bitCrush }, stereoWidth: { preset: width }, detune: { preset: detune },
      chorus: { preset: chorus }, delay: { preset: delay }, reverb: { preset: reverb },
      saturation: { preset: saturation }, wetDryMix: wet,
    };
  }
  function fm(carrier=100, m1=0, r1=1, w1="sine", m2=0, r2=2, w2="sine", shape=0, h1g=0, h1o=0, h2g=0, h2o=0, harmonics=0) {
    return {
      carrierVolume: carrier, harmonics,
      modulators: [{ gain:m1, ratio:r1, wave:w1 }, { gain:m2, ratio:r2, wave:w2 }],
      fmDepthPreset: shape, ratioPreset: 0,
      harmonic1: { gain:h1g, noteOffset:h1o }, harmonic2: { gain:h2g, noteOffset:h2o },
    };
  }
  function filter(lp=25, hp=0, e1=eq("low",18,0,1), e2=eq("mid",9,0,1), e3=eq("high",12,0,1)) {
    return { preset:0, lpFreq:lp, hpFreq:hp, eq1:e1, eq2:e2, eq3:e3, activeEQ:"eq1" };
  }

  const INIT = {
    midiNote:60, tempo:70, sampleRate:48000, scale:"major",
    arp: arp(),
    synth:{ fm: fm() },
    envelope:{ ahdhd: env("strike") },
    texture:{ preset:0, amount:10 },
    transient:{ preset:0, volume:35 },
    filter: filter(),
    fx: fx(),
  };

  const P = (name, description, overrides={}) => ({ name, description, patch: merge(INIT, overrides) });

  const presets = [
    P("Init", "Neutral sine starting point"),

    // Build 405: pretty starting points. Existing presets remain untouched.
    P("Rhodes Warm", "Warm rounded electric piano with a short tine and strong body", { midiNote:60, synth:{fm:fm(104,24,1,"sine",0,2,"sine",3,24,12,7,24,23)}, envelope:{ahdhd:env("strike",2,4,{attack1:0.008,hold1:0.012,decay1:0.34,decay1Target:0.46,hold2:0.82,decay2:1.35})}, transient:{preset:1,volume:7}, filter:filter(24,0,eq("low",36,1.5,0.8),eq("mid",17,-1,1),eq("high",10,-2,0.8)), fx:fx(0,2,0,1,39,2,13,38) }),
    P("Rhodes Soft", "Soft mellow electric piano with a subdued tine and long warm body", { midiNote:60, synth:{fm:fm(106,18,1,"sine",0,2,"sine",3,20,12,5,24)}, envelope:{ahdhd:env("strike",2,0,{attack1:0.012,hold1:0.01,decay1:0.42,decay1Target:0.5,hold2:1,decay2:1.5})}, transient:{preset:2,volume:8}, filter:filter(22,0,eq("low",36,2,0.8),eq("mid",15,-1,1),eq("high",8,-3,0.8)), fx:fx(0,2,0,1,1,3,13,34) }),
    P("Suitcase EP", "Dark electric piano with tine attack, tremolo personality and soft cabinet tone", { midiNote:60, synth:{fm:fm(103,27,1,"sine",0,2,"sine",3,22,12,6,24)}, envelope:{ahdhd:env("strike",2,5,{attack1:0.008,hold1:0.014,decay1:0.32,decay1Target:0.44,hold2:0.92,decay2:1.45})}, transient:{preset:1,volume:8}, filter:filter(21,1,eq("low",35,2,0.9),eq("mid",14,-1.5,1),eq("high",9,-3,0.8)), fx:fx(0,3,1,2,3,3,13,42) }),
    P("Chorus EP", "Clear electric piano with restrained tine and ensemble width", { midiNote:60, synth:{fm:fm(102,25,1,"sine",0,2,"sine",3,23,12,7,24)}, envelope:{ahdhd:env("strike",2,0,{attack1:0.008,hold1:0.012,decay1:0.3,decay1Target:0.45,hold2:0.86,decay2:1.3})}, transient:{preset:1,volume:6}, filter:filter(24,0,eq("low",36,1,0.8),eq("mid",18,-1,1),eq("high",12,-1,0.8)), fx:fx(0,3,1,18,2,3,13,42) }),
    P("Felt Keys", "Soft hammer keys with a dark body and very little synthetic edge", { midiNote:60, synth:{fm:fm(108,8,1,"sine",0,2,"sine",1,14,12,3,24)}, envelope:{ahdhd:env("strike",1,0,{attack1:0.01,hold1:0.01,decay1:0.28,decay1Target:0.38,hold2:0.7,decay2:1.1})}, transient:{preset:2,volume:24}, filter:filter(20,0,eq("low",35,2.5,0.9),eq("mid",13,-1.5,1),eq("high",6,-5,0.8)), fx:fx(0,1,0,0,0,2,12,28) }),
    P("Amber Keys", "Warm glowing keys with evolving octave companions and gentle analog color", { midiNote:60, synth:{fm:fm(104,16,1,"sine",0,2,"sine",3,28,12,9,24)}, envelope:{ahdhd:env("strike",2,1,{attack1:0.01,hold1:0.012,decay1:0.36,decay1Target:0.48,hold2:0.95,decay2:1.45})}, transient:{preset:1,volume:5}, filter:filter(23,0,eq("low",36,2,0.8),eq("mid",18,0.5,0.9),eq("high",11,-2,0.8)), fx:fx(0,2,1,2,2,4,13,38) }),
    P("Glass Keys Soft", "Soft luminous keys with a glass edge that decays into a clean body", { midiNote:60, synth:{fm:fm(100,22,1,"sine",0,2,"sine",5,18,12,6,24)}, envelope:{ahdhd:env("strike",2,4,{attack1:0.006,hold1:0.01,decay1:0.26,decay1Target:0.38,hold2:0.68,decay2:1.15})}, transient:{preset:6,volume:6}, filter:filter(25,0,eq("low",36,0,0.8),eq("mid",20,1,1),eq("high",13,1,0.8)), fx:fx(0,3,1,2,4,5,12,38) }),
    P("Tape Dream Keys", "Warm electric keys with subtle tape drift and a rhythmic 1/16 echo", { midiNote:60, synth:{fm:fm(104,20,1,"sine",0,2,"sine",3,22,12,6,24)}, envelope:{ahdhd:env("strike",2,2,{attack1:0.01,hold1:0.012,decay1:0.36,decay1Target:0.46,hold2:0.92,decay2:1.4})}, transient:{preset:2,volume:8}, texture:{preset:1,amount:4}, filter:filter(22,0,eq("low",36,2,0.8),eq("mid",15,-1,1),eq("high",8,-3,0.8)), fx:fx(2,2,1,1,26,3,2,38) }),
    P("Pearl Mallet", "Rounded mallet with a clear fundamental, short harmonic bloom and soft strike", { midiNote:67, synth:{fm:fm(102,20,1,"sine",0,2,"sine",1,18,12,5,24)}, envelope:{ahdhd:env("pluck",4,0,{attack1:0.004,hold1:0.004,decay1:0.16,decay1Target:0.18,hold2:0.24,decay2:0.55})}, transient:{preset:6,volume:14}, filter:filter(24,0,eq("low",39,1,0.8),eq("mid",20,1,1),eq("high",11,-2,0.8)), fx:fx(0,2,0,1,2,3,12,32) }),
    P("Velvet Pad", "Warm floating pad with gently evolving octave layers and very soft FM color", { midiNote:60, synth:{fm:fm(102,10,1,"sine",0,2,"sine",1,30,12,12,24)}, envelope:{ahdhd:env("pad",9,18,{envMult:0.75,attack1:0.26,decay1:0.52,decay1Target:0.66,hold2:1.2,decay2:1.55})}, filter:filter(23,0,eq("low",36,2,0.8),eq("mid",17,-1,0.9),eq("high",10,-2,0.8)), fx:fx(0,5,1,4,17,6,13,42) }),
    P("Pure Sine", "Pure dry sine with a soft musical envelope", { midiNote:60, synth:{fm:fm(100)}, envelope:{ahdhd:env("short")}, fx:fx(0,0,0,0,0,0,0,0) }),
    P("Soft Piano", "Rounded piano-like strike with subtle body", { synth:{fm:fm(102,24,1,"sine",5,2,"sine",1,18,12,5,24)}, envelope:{ahdhd:env("strike",1,0)}, transient:{preset:2,volume:22}, filter:filter(22,0,eq("low",24,1.5,.9),eq("mid",13,-1,.9),eq("high",13,-2,.8)), fx:fx(0,2,0,0,0,3,12,40) }),
    P("Tape Piano", "Soft piano with tape movement and room", { synth:{fm:fm(100,28,1,"sine",6,2,"sine",1,20,12,7,24)}, envelope:{ahdhd:env("strike",1,2)}, texture:{preset:1,amount:8}, transient:{preset:2,volume:20}, filter:filter(21,0,eq("low",25,2,.8),eq("mid",14,-1.5,.9),eq("high",10,-3,.8)), fx:fx(2,3,2,1,0,3,2,46) }),
    P("Electric Glow", "Warm tine-like electric keys", { synth:{fm:fm(98,42,2,"sine",16,3,"sine",3,22,12,8,24)}, envelope:{ahdhd:env("medium",2,1)}, transient:{preset:1,volume:12}, filter:filter(24,1,eq("low",22,1,.9),eq("mid",18,-1,.9),eq("high",18,2,1)), fx:fx(0,4,1,4,0,4,13,52) }),
    P("Cassette Keys", "Wobbly compact electric keys", { synth:{fm:fm(96,36,2,"sine",9,1.5,"sine",3,10,12,0,0)}, envelope:{ahdhd:env("medium",2,3)}, texture:{preset:2,amount:13}, filter:filter(20,4,eq("low",25,1.5,.9),eq("mid",17,-2,.9),eq("high",8,-3,.8)), fx:fx(4,3,8,2,27,3,14,50) }),
    P("Tiny Tine", "Small bright electric-piano ping", { midiNote:60, synth:{fm:fm(88,52,2,"sine",18,3,"sine",4,10,12,0,0)}, envelope:{ahdhd:env("pluck",2,0,{envMult:.75})}, filter:filter(25,4,eq("low",26,-2,.9),eq("mid",22,1.5,1),eq("high",24,3,.9)), fx:fx(0,2,0,1,1,2,0,38) }),
    P("Clear Bell", "Clean sustained bell with controlled FM decay", { midiNote:60, synth:{fm:fm(92,68,1,"sine",30,3,"sine",5,22,12,10,24)}, envelope:{ahdhd:env("long",3,0)}, filter:filter(25,4,eq("low",28,-2,.9),eq("mid",24,1,.9),eq("high",23,2.5,.9)), fx:fx(0,5,0,0,0,7,0,56) }),
    P("Shimmer Bell", "Wide animated bell with a luminous tail", { midiNote:60, synth:{fm:fm(90,76,1,"sine",34,3,"sine",6,25,12,12,24)}, envelope:{ahdhd:env("long",3,4)}, filter:filter(25,5,eq("low",30,-3,.8),eq("mid",25,1,.9),eq("high",27,4,.8)), fx:fx(0,6,0,2,19,29,0,64) }),
    P("Glass Chime", "Delicate inharmonic glass chime", { midiNote:60, synth:{fm:fm(86,80,1.414,"sine",28,2,"sine",7,18,24,8,12)}, envelope:{ahdhd:env("long",3,4,{envMult:.8})}, transient:{preset:6,volume:12}, filter:filter(25,7,eq("low",28,-3,.9),eq("mid",26,1.5,1.1),eq("high",28,4,.8)), fx:fx(0,19,0,1,0,22,0,62) }),
    P("Music Box", "Small mechanical bell with a woody click", { midiNote:60, synth:{fm:fm(82,62,2,"sine",12,5,"sine",2,12,12,0,0)}, envelope:{ahdhd:env("pluck",4,0,{envMult:.65})}, transient:{preset:3,volume:24}, filter:filter(24,5,eq("low",24,-2,.9),eq("mid",20,1,.9),eq("high",23,2.5,.9)), fx:fx(1,2,0,0,0,2,0,34) }),
    P("Breathy Flute", "Airy soft flute with gentle breath", { midiNote:60, synth:{fm:fm(96,16,1,"sine",5,2,"sine",0,7,12,0,0)}, envelope:{ahdhd:env("medium",7,1,{attack1:.18})}, texture:{preset:6,amount:5}, transient:{preset:5,volume:20}, filter:filter(23,2,eq("low",28,-1,.9),eq("mid",23,1.5,1),eq("high",19,-1,.9)), fx:fx(0,3,1,1,0,6,0,48) }),
    P("Worn Clarinet", "Dark reed tone with aged movement", { midiNote:60, synth:{fm:fm(98,22,1,"square",6,2,"sine",0,14,12,5,24)}, envelope:{ahdhd:env("medium",7,18)}, texture:{preset:4,amount:9}, transient:{preset:5,volume:10}, filter:filter(19,1,eq("low",24,1,.9),eq("mid",17,2,1.1),eq("high",8,-3,.8)), fx:fx(2,2,3,0,0,4,13,42) }),
    P("Hollow Reed", "Simple woody hollow reed", { midiNote:60, synth:{fm:fm(96,15,.5,"square",0,1,"sine",0,10,12,0,0)}, envelope:{ahdhd:env("medium",7,0)}, filter:filter(18,2,eq("low",24,1.5,.9),eq("mid",15,2.5,1.2),eq("high",8,-4,.8)), fx:fx(0,1,0,0,0,2,0,28) }),
    P("Soft Brass", "Rounded brass swell with restrained bite", { midiNote:60, synth:{fm:fm(100,30,1,"saw",8,2,"sine",9,18,12,8,24)}, envelope:{ahdhd:env("short",6,20,{attack1:.12,decay2:1.1})}, transient:{preset:4,volume:16}, filter:filter(21,1,eq("low",22,2,.9),eq("mid",20,2,1),eq("high",14,-2,.9)), fx:fx(0,2,0,1,0,5,3,46) }),
    P("Brass Stab", "Compact bright brass hit", { midiNote:60, synth:{fm:fm(104,40,1,"saw",12,2,"square",11,16,12,7,24)}, envelope:{ahdhd:env("short",6,0,{attack1:.012,hold2:.28,decay2:.45})}, transient:{preset:4,volume:25}, filter:filter(22,2,eq("low",22,1,.9),eq("mid",23,3,1.1),eq("high",17,1,.9)), fx:fx(0,3,0,1,1,3,5,42) }),
    P("Analog Choir", "Smooth vocal-like ensemble", { midiNote:60, synth:{fm:fm(94,18,.5,"sine",5,1.5,"sine",10,20,12,14,24)}, envelope:{ahdhd:env("pad",9,1)}, filter:filter(22,1,eq("low",25,1,.9),eq("mid",22,2,1.1),eq("high",13,-1.5,.9)), fx:fx(0,8,2,12,0,7,1,58) }),
    P("Dusty Choir", "Old soft choir under a layer of dust", { midiNote:60, synth:{fm:fm(92,15,.5,"sine",4,1.5,"sine",10,18,12,12,24)}, envelope:{ahdhd:env("pad",9,18)}, texture:{preset:5,amount:10}, filter:filter(19,2,eq("low",25,2,.9),eq("mid",20,1.5,1),eq("high",9,-3,.8)), fx:fx(5,7,3,19,28,24,14,60) }),
    P("Warm Strings", "Soft bowed-string cloud", { midiNote:60, synth:{fm:fm(96,20,1,"saw",5,2,"sine",8,28,12,18,24)}, envelope:{ahdhd:env("long",8,1,{attack1:.45})}, filter:filter(22,1,eq("low",24,1.5,.9),eq("mid",18,1,.9),eq("high",12,-1,.9)), fx:fx(0,8,1,19,0,7,2,58) }),
    P("Slow Strings", "Wide slow strings with a blooming entrance", { midiNote:60, synth:{fm:fm(94,18,1,"saw",4,2,"sine",10,32,12,20,24)}, envelope:{ahdhd:env("pad",8,20,{attack1:1.2})}, filter:filter(21,0,eq("low",24,2,.9),eq("mid",18,-1,.9),eq("high",13,-2,.8)), fx:fx(0,9,2,23,0,28,13,65) }),
    P("Vinyl Pad", "Warm pad with vinyl surface and drift", { midiNote:60, synth:{fm:fm(92,20,.5,"sine",6,1.5,"sine",10,24,12,15,24)}, envelope:{ahdhd:env("pad",9,2)}, texture:{preset:3,amount:9}, filter:filter(20,1,eq("low",25,2,.8),eq("mid",17,-1,.9),eq("high",9,-2.5,.8)), fx:fx(4,8,3,13,13,12,14,64) }),
    P("Shimmer Pad", "Luminous pad that opens into the tail", { midiNote:60, synth:{fm:fm(90,28,1,"sine",10,3,"sine",10,26,12,18,24)}, envelope:{ahdhd:env("pad",9,4)}, filter:filter(25,3,eq("low",28,-1,.9),eq("mid",24,1,.9),eq("high",27,3.5,.8)), fx:fx(0,6,0,24,33,29,0,72) }),
    P("Cloud Pad", "Huge slow suspended cloud", { midiNote:60, synth:{fm:fm(88,22,.5,"sine",8,1.5,"sine",10,30,12,24,24)}, envelope:{ahdhd:env("wash",9,18,{envMult:.75})}, texture:{preset:6,amount:4}, filter:filter(23,0,eq("low",26,1,.8),eq("mid",22,-1,.9),eq("high",25,2,.8)), fx:fx(0,24,2,24,34,27,13,76) }),
    P("Dark Pad", "Heavy low-passed pad with distant motion", { midiNote:60, synth:{fm:fm(96,26,.5,"square",7,1,"sine",10,24,12,18,24)}, envelope:{ahdhd:env("pad",9,19)}, texture:{preset:4,amount:7}, filter:filter(16,0,eq("low",22,3,.9),eq("mid",14,-2,.9),eq("high",5,-5,.8)), fx:fx(3,7,5,13,26,24,14,66) }),
    P("Glass Pad", "Glassy harmonic pad with floating upper motion", { midiNote:60, synth:{fm:fm(88,45,1.414,"sine",20,2,"sine",10,24,12,16,24)}, envelope:{ahdhd:env("pad",9,4)}, filter:filter(25,5,eq("low",30,-2,.9),eq("mid",26,1,.9),eq("high",27,4,.8)), fx:fx(0,19,0,24,36,29,0,74) }),
    P("Tape Organ", "Sustained organ-like tone with tape instability", { midiNote:60, synth:{fm:fm(96,12,1,"square",0,2,"sine",0,30,12,20,24)}, envelope:{ahdhd:env("long",9,2,{attack1:.04,decay1:.2,decay1Target:.9,hold2:4})}, texture:{preset:1,amount:7}, filter:filter(21,1,eq("low",24,1,.9),eq("mid",19,1.5,1),eq("high",10,-2,.8)), fx:fx(0,5,2,12,0,5,2,48) }),
    P("Wood Mallet", "Dry woody tuned percussion", { midiNote:60, synth:{fm:fm(96,36,2,"sine",8,3,"sine",11,12,12,0,0)}, envelope:{ahdhd:env("pluck",4,0,{envMult:.8})}, transient:{preset:6,volume:28}, filter:filter(21,2,eq("low",22,2,.9),eq("mid",18,1.5,1.2),eq("high",9,-3,.8)), fx:fx(0,1,0,0,0,2,1,30) }),
    P("Dusty Mallet", "Worn sampled mallet with dusty attack", { midiNote:60, synth:{fm:fm(94,38,2,"sine",10,3,"sine",11,14,12,0,0)}, envelope:{ahdhd:env("pluck",4,1)}, texture:{preset:5,amount:10}, transient:{preset:6,volume:30}, filter:filter(18,3,eq("low",24,2,.9),eq("mid",17,-1,.9),eq("high",8,-4,.8)), fx:fx(12,2,1,0,0,3,14,46) }),
    P("Rubber Mallet", "Rounded soft mallet with a rubbery body", { midiNote:60, synth:{fm:fm(98,24,.5,"sine",6,1.5,"sine",1,10,12,0,0)}, envelope:{ahdhd:env("pluck",4,0,{decay1:.22,hold2:.32})}, transient:{preset:2,volume:18}, filter:filter(17,0,eq("low",22,3,.9),eq("mid",15,-1,.9),eq("high",7,-4,.8)), fx:fx(0,1,0,0,0,1,13,28) }),
    P("Bass Pluck", "Clean compact low pluck", { midiNote:60, synth:{fm:fm(108,24,.5,"sine",4,1,"sine",1,18,12,8,24)}, envelope:{ahdhd:env("pluck",5,0,{envMult:.75})}, filter:filter(18,0,eq("low",17,4,1.1),eq("mid",10,-2,.9),eq("high",5,-4,.8)), fx:fx(0,1,0,0,0,1,3,24) }),
    P("Tape Pluck", "Short pluck with tape echo and wobble", { midiNote:60, synth:{fm:fm(102,28,1,"sine",7,2,"sine",2,16,12,6,24)}, envelope:{ahdhd:env("pluck",5,3)}, texture:{preset:1,amount:7}, filter:filter(20,1,eq("low",23,2,.9),eq("mid",16,-1,.9),eq("high",9,-2,.8)), fx:fx(3,3,8,1,27,3,14,48) }),
    P("Muted Key", "Small muted keyboard tone with almost no decoration", { midiNote:60, synth:{fm:fm(88,12,1,"sine",0,2,"sine",0,7,12,0,0)}, envelope:{ahdhd:env("short",11,0,{envMult:.7})}, filter:filter(18,1,eq("low",21,1,.9),eq("mid",16,1,1),eq("high",7,-3,.8)), fx:fx(0,0,0,0,0,1,0,18) }),
    P("Low Drone", "Stable dark low drone", { midiNote:60, synth:{fm:fm(96,22,.5,"sine",8,1,"sine",8,32,12,24,24)}, envelope:{ahdhd:env("drone",10,18)}, filter:filter(16,0,eq("low",18,4,1),eq("mid",12,-2,.9),eq("high",5,-5,.8)), fx:fx(0,7,2,13,0,24,13,62) }),
    P("Worn Drone", "Degraded mechanical drone", { midiNote:60, synth:{fm:fm(98,32,.5,"square",12,1.5,"saw",8,30,12,20,24)}, envelope:{ahdhd:env("drone",10,7)}, texture:{preset:4,amount:13}, filter:filter(15,1,eq("low",18,4,.9),eq("mid",14,-2,1),eq("high",4,-5,.8)), fx:fx(8,7,14,13,31,30,25,70) }),
    P("Unstable Wash", "Long unstable atmospheric wash", { midiNote:60, synth:{fm:fm(88,36,1.414,"sine",15,2.5,"saw",10,28,12,20,24)}, envelope:{ahdhd:env("wash",9,7)}, texture:{preset:6,amount:8}, filter:filter(22,2,eq("low",25,1,.8),eq("mid",20,-2,.9),eq("high",21,2,.8)), fx:fx(5,12,15,27,35,31,29,80) }),
    P("Air Pipe", "Sparse breathy pipe with a plain center tone", { midiNote:60, synth:{fm:fm(92,8,1,"sine",0,2,"sine",0,0,0,0,0)}, envelope:{ahdhd:env("medium",7,18,{attack1:.3})}, texture:{preset:6,amount:3}, transient:{preset:5,volume:18}, filter:filter(23,5,eq("low",30,-2,.9),eq("mid",23,1.5,1),eq("high",19,-1,.9)), fx:fx(0,2,1,0,0,6,0,44) }),
    P("Sub Bell", "Low bell with a deep clean fundamental", { midiNote:60, synth:{fm:fm(106,54,.5,"sine",18,1.5,"sine",5,12,12,6,24)}, envelope:{ahdhd:env("long",3,0,{envMult:.8})}, filter:filter(20,0,eq("low",18,4,1),eq("mid",15,-1,.9),eq("high",8,-3,.8)), fx:fx(0,4,0,0,6,7,1,52) }),
    P("Metal Hit", "Hard metallic FM percussion", { midiNote:60, synth:{fm:fm(84,82,3.5,"square",58,2.5,"saw",11,6,12,0,0)}, envelope:{ahdhd:env("strike",4,0,{envMult:.55})}, transient:{preset:6,volume:20}, filter:filter(24,6,eq("low",26,-2,.9),eq("mid",24,2.5,1.4),eq("high",23,3,1)), fx:fx(6,4,0,1,0,5,5,52) }),
    P("FM Knock", "Short low FM knock with minimal tail", { midiNote:60, synth:{fm:fm(108,72,.75,"sine",22,1.5,"sine",11,0,0,0,0)}, envelope:{ahdhd:env("tick",4,0,{envMult:1.5})}, filter:filter(18,0,eq("low",18,4,1.2),eq("mid",13,-2,.9),eq("high",4,-5,.8)), fx:fx(0,0,0,0,0,1,3,18) }),
    P("FM Burst", "Explosive short FM gesture", { midiNote:60, synth:{fm:fm(88,66,2.5,"saw",38,3.5,"square",17,8,12,0,0)}, envelope:{ahdhd:env("short",5,0,{envMult:.65})}, filter:filter(23,4,eq("low",24,-1,.9),eq("mid",22,2,1.1),eq("high",20,2,.9)), fx:fx(5,7,0,2,8,11,7,58) }),
    P("Broken Radio", "Narrow crushed radio-like keyboard", { midiNote:60, synth:{fm:fm(92,28,1,"square",9,2,"saw",12,8,12,0,0)}, envelope:{ahdhd:env("short",0,7)}, texture:{preset:2,amount:11}, transient:{preset:3,volume:12}, filter:filter(17,13,eq("all",28,-2,.9),eq("mid",23,4,1.2),eq("high",3,2,1)), fx:fx(11,1,11,0,31,16,25,54) }),
    P("Sampler Keys", "Crunchy early-sampler style keys", { midiNote:60, synth:{fm:fm(96,22,1,"sine",4,2,"sine",1,14,12,0,0)}, envelope:{ahdhd:env("short",2,1)}, texture:{preset:5,amount:5}, transient:{preset:3,volume:14}, filter:filter(19,5,eq("low",28,1,.9),eq("mid",17,-1,.9),eq("high",9,-2,.8)), fx:fx(12,2,1,1,0,3,18,44) }),
    P("Orbit Arp", "Two-voice orbiting arp arrangement", { tempo:92, scale:"major", arp:arp("A,B,A,B", voice(30,6,1,"1/16"), voice(19,13,5,"1/8")), synth:{fm:fm(90,34,1.5,"sine",10,2,"sine",3,16,12,8,24)}, envelope:{ahdhd:env("arp",5,1)}, filter:filter(23,2,eq("low",24,1,.9),eq("mid",21,-1,.9),eq("high",20,2,.9)), fx:fx(0,5,1,2,19,11,1,58) }),
    P("Night Arp", "Sparse dark three-voice arp with blank space", { midiNote:60, tempo:74, scale:"major", arp:arp("A,-,B,C", voice(21,14,1,"1/8"), voice(22,23,2,"1/4"), voice(31,34,5,"1/16")), synth:{fm:fm(94,24,.5,"sine",8,1.5,"sine",2,20,12,12,24)}, envelope:{ahdhd:env("arp",5,18,{envMult:1.2})}, texture:{preset:3,amount:4}, filter:filter(18,1,eq("low",24,2,.9),eq("mid",16,-2,.9),eq("high",7,-3,.8)), fx:fx(2,7,3,13,27,24,14,66) }),
    P("Glass Circuit", "Four-part bright evolving arp machine", { midiNote:60, tempo:110, scale:"major", arp:arp("A,B,C,D,A,C,B,A", voice(12,26,1,"1/16"), voice(29,7,4,"1/8"), voice(17,31,6,"1/16"), voice(32,24,2,"1/4")), synth:{fm:fm(86,58,1.414,"sine",22,2,"sine",6,14,12,8,24)}, envelope:{ahdhd:env("arp",3,4,{envMult:.85})}, filter:filter(25,5,eq("low",30,-2,.9),eq("mid",25,1,.9),eq("high",27,4,.8)), fx:fx(0,19,0,4,22,29,0,68) }),
    P("Slow Conversation", "Four contrasting arp bars answering each other", { midiNote:60, tempo:66, scale:"major", arp:arp("A,A,B,A,A,C,B,D", voice(23,2,1,"1/8"), voice(24,20,5,"1/4"), voice(26,13,2,"1/8"), voice(30,31,6,"1/2")), synth:{fm:fm(92,22,1,"sine",6,2,"sine",10,18,12,10,24)}, envelope:{ahdhd:env("arp",5,18,{envMult:1.5})}, filter:filter(21,1,eq("low",24,1.5,.9),eq("mid",18,-1,.9),eq("high",12,-1.5,.8)), fx:fx(0,8,2,12,33,28,13,66) }),
    P("Pulse Machine", "Fast articulated two-voice rhythmic FM arp", { midiNote:60, tempo:128, scale:"major", arp:arp("A,B,A,B,A,A,B,A", voice(15,28,5,"1/16"), voice(18,30,7,"1/16")), synth:{fm:fm(92,46,2,"square",18,3,"sine",15,10,12,0,0)}, envelope:{ahdhd:env("arp",5,8,{envMult:.7})}, filter:filter(22,3,eq("low",24,1,.9),eq("mid",20,-1,.9),eq("high",20,2,.9)), fx:fx(3,4,0,1,21,5,5,52) }),
    P("Clean Vinyl", "Init reference with tonal voices muted for clean vinyl texture and needle-drop audition", { synth:{fm:fm(0,0,1,"sine",0,2,"sine",0,0,0,0,0,0)}, texture:{preset:3,amount:25}, transient:{preset:7,volume:25} }),

  ];

  const AUTHORED_PATCH_ENVELOPES = Object.freeze({
    "Glass Chime": Object.freeze({ attack1:0.072, hold1:0.04, decay1:0.36, decay1Target:0.58, hold2:0.96, decay2:1.2, envMult:1, instrumentBehavior:3, character:4 }),
    "Music Box": Object.freeze({ attack1:0.016, hold1:0.016, decay1:0.416, decay1Target:0.14, hold2:0.572, decay2:1.092, envMult:0.25, instrumentBehavior:4, character:0 }),
    "Wood Mallet": Object.freeze({ attack1:0.02, hold1:0.02, decay1:0.512, decay1Target:0.14, hold2:0.704, decay2:1.344, envMult:0.25, instrumentBehavior:4, character:0 }),
    "Muted Key": Object.freeze({ attack1:0.028, hold1:0.014, decay1:0.256, decay1Target:0.34, hold2:0.44, decay2:0.6, envMult:1.75, instrumentBehavior:11, character:0 }),
    "Sub Bell": Object.freeze({ attack1:0.072, hold1:0.04, decay1:0.36, decay1Target:0.58, hold2:0.96, decay2:1.2, envMult:1, instrumentBehavior:3, character:0 }),
    "Metal Hit": Object.freeze({ attack1:0.022, hold1:0.014, decay1:0.22, decay1Target:0.26, hold2:0.478, decay2:1.32, envMult:0.5, instrumentBehavior:4, character:0 }),
    "FM Burst": Object.freeze({ attack1:0.092, hold1:0.046, decay1:0.832, decay1Target:0.34, hold2:1.43, decay2:1.95, envMult:0.5, instrumentBehavior:5, character:0 }),
    "Night Arp": Object.freeze({ attack1:0.02, hold1:0.058, decay1:0.456, decay1Target:0.32, hold2:0.696, decay2:1.248, envMult:0.5, instrumentBehavior:5, character:18 }),
    "Glass Circuit": Object.freeze({ attack1:0.028, hold1:0.082, decay1:0.646, decay1Target:0.32, hold2:0.986, decay2:1.768, envMult:0.25, instrumentBehavior:3, character:4 }),
    "Pulse Machine": Object.freeze({ attack1:0.022, hold1:0.068, decay1:0.532, decay1Target:0.32, hold2:0.812, decay2:1.456, envMult:0.25, instrumentBehavior:5, character:8 }),
    "Clean Vinyl": Object.freeze({ attack1:0.006, hold1:0.000, decay1:0.100, decay1Target:0.80, hold2:6.000, decay2:2.000, envMult:1, instrumentBehavior:0, character:0 }),
  });
  for (const entry of presets) {
    if (AUTHORED_PATCH_ENVELOPES[entry.name]) entry.patch.envelope.ahdhd = { ...AUTHORED_PATCH_ENVELOPES[entry.name] };
  }
  window.InterPhaceData.PRESET_LIBRARY = presets.map((preset, index) => ({
    name: preset.name,
    description: preset.description,
    data: { patch: preset.patch, bankVersion: 2, index },
  }));
})();
