// ============================================================
//  EFFECTS ENGINE — MUSICAL, LEVEL-SAFE, DETERMINISTIC
// ============================================================

window.EffectsEngine = {};
let cachedReverbImpulses = {};

const DELAY_PRESETS = [
  { name:'Off', time:0, feedback:0, mix:0, pingPong:false, lp:20000 },

  // Core clocked delays. 1/16 is intentionally well represented because it
  // creates useful rhythmic motion without requiring a dense source pattern.
  { name:'Slap 1/16', time:'1/16', feedback:.06, mix:.08, pingPong:false, lp:9000 },
  { name:'Pulse 1/16', time:'1/16', feedback:.22, mix:.18, pingPong:false, lp:14000 },
  { name:'Fade 1/16', time:'1/16', feedback:.34, mix:.22, pingPong:false, lp:9000 },
  { name:'Ping 1/16', time:'1/16', feedback:.28, mix:.21, pingPong:true, lp:12000 },
  { name:'Dark 1/16', time:'1/16', feedback:.40, mix:.24, pingPong:false, lp:4800 },
  { name:'Slap 1/8', time:'1/8', feedback:.10, mix:.10, pingPong:false, lp:8500 },
  { name:'Pulse 1/8', time:'1/8', feedback:.24, mix:.19, pingPong:false, lp:13000 },
  { name:'Dotted 1/8', time:'1/8d', feedback:.30, mix:.23, pingPong:false, lp:12000 },
  { name:'Triplet 1/8', time:'1/8t', feedback:.28, mix:.22, pingPong:true, lp:11000 },
  { name:'Quarter', time:'1/4', feedback:.28, mix:.22, pingPong:false, lp:11000 },
  { name:'Quarter PP', time:'1/4', feedback:.34, mix:.25, pingPong:true, lp:10000 },
  { name:'Half Note', time:'1/2', feedback:.38, mix:.27, pingPong:false, lp:7000 },

  // Pattern delays: two musical clocks create a secondary rhythmic layer.
  { name:'16 + 8', mode:'stereo', timeL:'1/16', timeR:'1/8', feedback:.26, mix:.22, cross:.18, lp:12500 },
  { name:'16 + 8D', mode:'stereo', timeL:'1/16', timeR:'1/8d', feedback:.30, mix:.24, cross:.24, lp:11500 },
  { name:'16 + 4', mode:'stereo', timeL:'1/16', timeR:'1/4', feedback:.32, mix:.24, cross:.22, lp:10500 },
  { name:'16 + 4T', mode:'stereo', timeL:'1/16', timeR:'1/4t', feedback:.31, mix:.24, cross:.34, lp:10500 },
  { name:'8 + 8D', mode:'stereo', timeL:'1/8', timeR:'1/8d', feedback:.32, mix:.25, cross:.30, lp:11000 },
  { name:'8 + 4T', mode:'stereo', timeL:'1/8', timeR:'1/4t', feedback:.34, mix:.26, cross:.36, lp:10000 },
  { name:'Straight Triplet', mode:'stereo', timeL:'1/4', timeR:'1/4t', feedback:.35, mix:.27, cross:.40, lp:9500 },
  { name:'Dotted Triplet', mode:'stereo', timeL:'1/8d', timeR:'1/4t', feedback:.38, mix:.28, cross:.54, lp:9000 },
  { name:'Call Response', mode:'stereo', timeL:'1/4', timeR:'1/2', feedback:.38, mix:.28, cross:.36, lp:9000 },
  { name:'Broken Steps', mode:'stereo', timeL:'1/8d', timeR:'1/2', feedback:.40, mix:.29, cross:.46, lp:8200 },
  { name:'Cascade', mode:'stereo', timeL:'1/16', timeR:'1/8d', feedback:.43, mix:.30, cross:.62, lp:7600 },
  { name:'Cross Rhythm', mode:'stereo', timeL:'1/8d', timeR:'1/4t', feedback:.44, mix:.31, cross:.72, lp:7200 },

  // Character delays retain the useful tonal families while varying their clocks.
  { name:'Dark Echo', mode:'character', time:'1/8', feedback:.38, mix:.29, lp:4200, hp:140, drive:1.05, sat:.04 },
  { name:'Tape 1/16', mode:'character', time:'1/16', feedback:.38, mix:.28, lp:5200, hp:120, drive:1.18, sat:.10 },
  { name:'Tape Echo', mode:'character', time:'1/4', feedback:.46, mix:.34, lp:5200, hp:120, drive:1.18, sat:.10 },
  { name:'Dusty Repeats', mode:'character', time:'1/8d', feedback:.43, mix:.32, lp:3800, hp:180, drive:1.24, sat:.14 },
  { name:'Dub 1/8', mode:'character', time:'1/8', feedback:.54, mix:.35, lp:3200, hp:180, drive:1.28, sat:.16 },
  { name:'Dub PP', mode:'character', time:'1/4', feedback:.60, mix:.40, lp:3000, hp:200, drive:1.32, sat:.18, pingPong:true },
  { name:'Old Echo', mode:'character', time:'1/2', feedback:.50, mix:.36, lp:2800, hp:220, drive:1.22, sat:.12 },

  // Layer / space delays. These are deliberately fewer and occupy the far end.
  { name:'Long Ping-Pong', time:'1/2', feedback:.56, mix:.37, pingPong:true, lp:5000 },
  { name:'Bloom', mode:'stereo', timeL:'1/4', timeR:'1/2', feedback:.58, mix:.38, cross:.62, lp:4400 },
  { name:'Dream Trails', mode:'stereo', timeL:'1/2', timeR:'1/1', feedback:.62, mix:.41, cross:.72, lp:3600 },
  { name:'Orbit', mode:'stereo', timeL:'1/4t', timeR:'1/8d', feedback:.66, mix:.42, cross:.84, lp:3600 },
  { name:'Deep Space', mode:'stereo', timeL:'1/1', timeR:'1/2', feedback:.74, mix:.48, cross:.92, lp:2800 },

  // Fixed-time body echoes. These do not follow project tempo; they act more
  // like a delayed resonant response from the instrument body than a rhythmic echo.
  { name:'Body 45ms', fixedMs:45, feedback:.04, mix:.10, lp:7200 },
  { name:'Body 65ms', fixedMs:65, feedback:.05, mix:.12, lp:6800 },
  { name:'Body Bloom 85ms', fixedMs:85, feedback:.06, mix:.15, lp:6200 },
  { name:'Body 105ms', fixedMs:105, feedback:.07, mix:.17, lp:5800 },
  { name:'Body 130ms', fixedMs:130, feedback:.08, mix:.19, lp:5400 }
];

const DETUNE_PRESETS = [
{name:'Off', base:0, depth:0, rate:0, mix:0},
  {name:'Micro', base:.0025, depth:.00035, rate:.16, mix:.08},
  {name:'Tight', base:.0030, depth:.00050, rate:.20, mix:.10},
  {name:'Natural', base:.0038, depth:.00065, rate:.24, mix:.12},
  {name:'Wide', base:.0046, depth:.00080, rate:.28, mix:.15},
  {name:'Airy', base:.0054, depth:.00100, rate:.32, mix:.18},
  {name:'Shimmer', base:.0060, depth:.00120, rate:.38, mix:.21},
  {name:'Float', base:.0068, depth:.00145, rate:.45, mix:.24},
  {name:'Drift', base:.0076, depth:.00170, rate:.30, mix:.27},
  {name:'Wobble', base:.0083, depth:.00200, rate:.56, mix:.30},
  {name:'Sway', base:.0090, depth:.00230, rate:.40, mix:.33},
  {name:'Warble', base:.0100, depth:.00280, rate:.68, mix:.36},
  {name:'Chorus-ish', base:.0110, depth:.00330, rate:.76, mix:.39},
  {name:'Underwater', base:.0120, depth:.00400, rate:.48, mix:.42},
  {name:'Drunk', base:.0130, depth:.00480, rate:.82, mix:.45},
  {name:'Chaos', base:.0140, depth:.00600, rate:1.0, mix:.48},
  {name:'Static ±2', mode:'static', centsL:-2, centsR:2, mix:.24},
  {name:'Static ±4', mode:'static', centsL:-4, centsR:4, mix:.32},
  {name:'Asymmetric', mode:'static', centsL:-2, centsR:5, mix:.34},
  {name:'Slightly Flat', mode:'static', centsL:-3, centsR:-1, mix:.28},
  {name:'Slightly Sharp', mode:'static', centsL:1, centsR:3, mix:.28},
  {name:'Slow Drift', mode:'drift', depth:.0012, rateL:.075, rateR:.061, mix:.30},
  {name:'Loose', mode:'drift', depth:.0020, rateL:.13, rateR:.087, mix:.38},
  {name:'Independent', mode:'drift', depth:.0028, rateL:.19, rateR:.113, mix:.42},
  {name:'Unstable', mode:'drift', depth:.0042, rateL:.31, rateR:.173, mix:.48}

];

const CHORUS_PRESETS = [
{name:'Off', voices:0, depth:0, rate:0, mix:0},
  {name:'Gentle', voices:2, depth:.0015, rate:.20, mix:.10},
  {name:'Soft', voices:2, depth:.0020, rate:.24, mix:.13},
  {name:'Natural', voices:3, depth:.0023, rate:.27, mix:.16},
  {name:'Warm', voices:3, depth:.0027, rate:.23, mix:.19},
  {name:'Rich', voices:4, depth:.0030, rate:.28, mix:.22},
  {name:'Lush', voices:4, depth:.0035, rate:.25, mix:.25},
  {name:'Wide', voices:5, depth:.0040, rate:.32, mix:.28},
  {name:'Shimmer', voices:5, depth:.0045, rate:.38, mix:.31},
  {name:'Sparkle', voices:6, depth:.0050, rate:.44, mix:.34},
  {name:'Dream', voices:6, depth:.0055, rate:.28, mix:.37},
  {name:'Thick', voices:7, depth:.0060, rate:.34, mix:.40},
  {name:'Ensemble', voices:8, depth:.0068, rate:.38, mix:.43},
  {name:'Wash', voices:8, depth:.0075, rate:.42, mix:.46},
  {name:'Ocean', voices:9, depth:.0085, rate:.30, mix:.49},
  {name:'Infinite', voices:10, depth:.0100, rate:.48, mix:.52},
  {name:'Double', mode:'ensemble', voices:1, mix:.18, baseMs:11, spreadMs:2.2, depthMs:1.1, rate:.23, hp:120, lp:12000, stereo:.35},
  {name:'Triple', mode:'ensemble', voices:2, mix:.24, baseMs:13, spreadMs:3.5, depthMs:1.4, rate:.27, hp:140, lp:11500, stereo:.48},
  {name:'Small Ensemble', mode:'ensemble', voices:4, mix:.30, baseMs:15, spreadMs:5.0, depthMs:1.7, rate:.21, hp:160, lp:10500, stereo:.62},
  {name:'String Ensemble', mode:'ensemble', voices:6, mix:.36, baseMs:17, spreadMs:6.5, depthMs:1.3, rate:.17, hp:180, lp:9800, stereo:.72},
  {name:'Dimension', mode:'ensemble', voices:4, mix:.26, baseMs:10, spreadMs:4.0, depthMs:.75, rate:.14, hp:220, lp:13000, stereo:.90},
  {name:'Vintage', mode:'ensemble', voices:4, mix:.34, baseMs:18, spreadMs:5.5, depthMs:1.8, rate:.19, hp:170, lp:7600, stereo:.58},
  {name:'Liquid', mode:'ensemble', voices:5, mix:.42, baseMs:16, spreadMs:7.0, depthMs:2.6, rate:.25, hp:150, lp:11000, stereo:.68},
  {name:'Wide Ensemble', mode:'ensemble', voices:6, mix:.40, baseMs:14, spreadMs:8.0, depthMs:1.8, rate:.22, hp:200, lp:11500, stereo:1.00},
  {name:'Cloud', mode:'ensemble', voices:8, mix:.38, baseMs:20, spreadMs:10.0, depthMs:1.25, rate:.12, hp:240, lp:9000, stereo:.92},
  {name:'Swim', mode:'ensemble', voices:6, mix:.52, baseMs:19, spreadMs:9.0, depthMs:3.2, rate:.31, hp:160, lp:10000, stereo:.82},
  {name:'Seasick', mode:'ensemble', voices:7, mix:.62, baseMs:22, spreadMs:11.0, depthMs:4.5, rate:.38, hp:140, lp:8500, stereo:.90},
  {name:'Melt', mode:'ensemble', voices:8, mix:.72, baseMs:25, spreadMs:13.0, depthMs:6.0, rate:.46, hp:120, lp:7200, stereo:1.00}

];

const REVERB_PRESETS = [
{name:'Off', length:0, decay:0, mix:0, predelay:0, damping:.5},
  {name:'Tiny Room', length:.55, decay:1.6, mix:.10, predelay:.004, damping:.72},
  {name:'Small Room', length:.85, decay:1.8, mix:.13, predelay:.008, damping:.68},
  {name:'Bedroom', length:1.15, decay:2.0, mix:.16, predelay:.012, damping:.64},
  {name:'Living Room', length:1.55, decay:2.2, mix:.19, predelay:.017, damping:.60},
  {name:'Studio', length:2.0, decay:2.4, mix:.22, predelay:.022, damping:.56},
  {name:'Small Hall', length:2.6, decay:2.7, mix:.26, predelay:.028, damping:.52},
  {name:'Concert Hall', length:3.3, decay:3.0, mix:.30, predelay:.036, damping:.48},
  {name:'Cathedral', length:4.2, decay:3.3, mix:.34, predelay:.046, damping:.44},
  {name:'Church', length:5.0, decay:3.6, mix:.38, predelay:.058, damping:.40},
  {name:'Arena', length:6.0, decay:3.9, mix:.42, predelay:.070, damping:.36},
  {name:'Ambient', length:7.0, decay:4.2, mix:.46, predelay:.082, damping:.32},
  {name:'Dream Space', length:8.0, decay:4.5, mix:.50, predelay:.10, damping:.28},
  {name:'Infinite', length:9.0, decay:4.8, mix:.54, predelay:.12, damping:.24},
  {name:'Cosmic', length:10.5, decay:5.2, mix:.58, predelay:.15, damping:.20},
  {name:'Void', length:12.0, decay:5.6, mix:.62, predelay:.18, damping:.16},
  {name:'Dry Room', mode:'room', length:.45, decay:1.45, mix:.08, predelay:.002, damping:.74, hp:180, lp:9000, early:.40, width:.34},
  {name:'Tight Room', mode:'room', length:.70, decay:1.65, mix:.11, predelay:.006, damping:.68, hp:160, lp:9800, early:.46, width:.42},
  {name:'Wood Room', mode:'room', length:1.25, decay:2.0, mix:.16, predelay:.012, damping:.72, hp:140, lp:7600, early:.52, width:.48},
  {name:'Bright Room', mode:'room', length:1.50, decay:1.9, mix:.18, predelay:.010, damping:.42, hp:150, lp:13500, early:.48, width:.55},

  {name:'Plate', mode:'plate', length:2.2, decay:2.5, mix:.22, predelay:.018, damping:.36, hp:180, lp:12000, diffusion:.78, width:.68},
  {name:'Dark Plate', mode:'plate', length:2.8, decay:2.8, mix:.25, predelay:.024, damping:.70, hp:160, lp:7200, diffusion:.82, width:.64},
  {name:'Bright Plate', mode:'plate', length:2.6, decay:2.6, mix:.24, predelay:.022, damping:.28, hp:200, lp:15000, diffusion:.80, width:.72},

  {name:'Vocal Hall', mode:'hall', length:3.4, decay:3.1, mix:.28, predelay:.045, damping:.50, hp:180, lp:9800, early:.24, width:.74},
  {name:'Dark Hall', mode:'hall', length:4.5, decay:3.7, mix:.32, predelay:.055, damping:.76, hp:160, lp:6200, early:.20, width:.78},
  {name:'Bright Hall', mode:'hall', length:4.0, decay:3.3, mix:.31, predelay:.050, damping:.30, hp:200, lp:14500, early:.22, width:.82},

  {name:'Bloom', mode:'ambient', length:5.5, decay:4.1, mix:.36, predelay:.075, damping:.48, hp:180, lp:10000, swell:.45, width:.86},
  {name:'Cloud', mode:'ambient', length:7.0, decay:4.6, mix:.40, predelay:.095, damping:.55, hp:220, lp:8800, swell:.62, width:.92},
  {name:'Dream Hall', mode:'ambient', length:8.5, decay:5.0, mix:.45, predelay:.120, damping:.42, hp:200, lp:10500, swell:.70, width:.95},
  {name:'Shimmer Space', mode:'bright', length:7.5, decay:4.5, mix:.43, predelay:.090, damping:.20, hp:260, lp:16000, width:.96},
  {name:'Black Space', mode:'ambient', length:10.0, decay:5.4, mix:.50, predelay:.150, damping:.84, hp:180, lp:4800, swell:.76, width:.98},
  {name:'Endless Air', mode:'ambient', length:12.0, decay:5.8, mix:.56, predelay:.180, damping:.34, hp:300, lp:13500, swell:.84, width:1.00}

];



const SATURATION_PRESETS = [
{name:'Off', drive:1.00, mix:0.00, tone:20000, bias:0.00, asymmetry:0.00},
  {name:'Warm', drive:1.18, mix:0.18, tone:18000, bias:0.00, asymmetry:0.05},
  {name:'Soft Tape', drive:1.35, mix:0.24, tone:15500, bias:0.01, asymmetry:0.08},
  {name:'Tube', drive:1.55, mix:0.30, tone:16500, bias:0.02, asymmetry:0.12},
  {name:'Console', drive:1.80, mix:0.36, tone:14500, bias:0.01, asymmetry:0.10},
  {name:'Driven', drive:2.20, mix:0.44, tone:13000, bias:0.02, asymmetry:0.14},
  {name:'Hot', drive:2.75, mix:0.52, tone:11500, bias:0.03, asymmetry:0.18},
  {name:'Overdrive', drive:3.50, mix:0.62, tone:10000, bias:0.04, asymmetry:0.22},
  {name:'Crunch', drive:4.50, mix:0.72, tone:8500, bias:0.05, asymmetry:0.28},
  {name:'Burn', drive:6.00, mix:0.82, tone:7000, bias:0.06, asymmetry:0.34},
  {name:'Fuzzed', drive:8.00, mix:0.90, tone:5600, bias:0.08, asymmetry:0.42},
  {name:'Melt', drive:11.00, mix:0.96, tone:4400, bias:0.10, asymmetry:0.50},
  {name:'Barely Warm', mode:'soft', drive:1.12, mix:.12, tone:19000, curve:.55, makeup:.98},
  {name:'Velvet', mode:'soft', drive:1.35, mix:.22, tone:17000, curve:.72, makeup:.95},
  {name:'Tape Low', mode:'tape', drive:1.45, mix:.28, tone:14500, bias:.015, hysteresis:.10, makeup:.92},
  {name:'Tape Hot', mode:'tape', drive:2.10, mix:.40, tone:11800, bias:.025, hysteresis:.18, makeup:.86},
  {name:'Tube Soft', mode:'tube', drive:1.60, mix:.30, tone:16500, asymmetry:.18, makeup:.91},
  {name:'Tube Push', mode:'tube', drive:2.60, mix:.46, tone:13500, asymmetry:.30, makeup:.82},
  {name:'Console Clean', mode:'console', drive:1.45, mix:.26, tone:18000, knee:.75, makeup:.94},
  {name:'Console Push', mode:'console', drive:2.40, mix:.42, tone:15000, knee:.58, makeup:.85},
  {name:'Transformer', mode:'transformer', drive:2.00, mix:.36, tone:12500, asymmetry:.12, lowShelf:1.2, makeup:.88},
  {name:'Diode', mode:'diode', drive:2.80, mix:.50, tone:12000, threshold:.42, makeup:.78},
  {name:'Soft Clip', mode:'clip', drive:2.20, mix:.44, tone:15500, threshold:.72, softness:.34, makeup:.84},
  {name:'Hard Clip', mode:'clip', drive:4.00, mix:.62, tone:12000, threshold:.48, softness:.08, makeup:.68},
  {name:'Rectified', mode:'rectify', drive:2.20, mix:.42, tone:11000, amount:.22, makeup:.82},
  {name:'Broken Tube', mode:'tube', drive:4.60, mix:.68, tone:9000, asymmetry:.52, makeup:.67},
  {name:'Smashed Console', mode:'console', drive:5.20, mix:.74, tone:8200, knee:.35, makeup:.62},
  {name:'Fuzz', mode:'fuzz', drive:6.50, mix:.82, tone:7200, threshold:.30, makeup:.55},
  {name:'Velcro', mode:'fuzz', drive:9.00, mix:.90, tone:5600, threshold:.20, gate:.08, makeup:.46},
  {name:'Destroyed Analog', mode:'fuzz', drive:12.0, mix:.96, tone:4300, threshold:.14, gate:.14, makeup:.38}

];

const BIT_CRUSH_PRESETS = [
  {name:'Off',          bits:16, hold:1, mix:0.00, preLP:20000, postLP:20000, drive:1.00, sat:0.00, headroomDb:0},
  {name:'Sheen',        bits:15, hold:1, mix:0.10, preLP:19000, postLP:18000, drive:1.02, sat:0.03, headroomDb:0},
  {name:'Dust',         bits:14, hold:1, mix:0.16, preLP:17500, postLP:16000, drive:1.05, sat:0.05, headroomDb:0},

  // Diagnostic / traditional crusher presets.
  // These deliberately isolate one variable so a plain sine wave clearly
  // reveals what the crusher itself is contributing.
  {name:'14-Bit',       bits:14, hold:1, mix:1.00, preLP:20000, postLP:20000, drive:1.00, sat:0.00, headroomDb:0},
  {name:'12-Bit',       bits:12, hold:1, mix:1.00, preLP:20000, postLP:20000, drive:1.00, sat:0.00, headroomDb:0},
  {name:'10-Bit',       bits:10, hold:1, mix:1.00, preLP:20000, postLP:20000, drive:1.00, sat:0.00, headroomDb:0},
  {name:'8-Bit',        bits:8,  hold:1, mix:1.00, preLP:20000, postLP:20000, drive:1.00, sat:0.00, headroomDb:0},
  {name:'6-Bit',        bits:6,  hold:1, mix:1.00, preLP:20000, postLP:20000, drive:1.00, sat:0.00, headroomDb:0},

  {name:'SR 1/2',       bits:16, hold:2, mix:1.00, preLP:20000, postLP:20000, drive:1.00, sat:0.00, headroomDb:0},
  {name:'SR 1/4',       bits:16, hold:4, mix:1.00, preLP:20000, postLP:20000, drive:1.00, sat:0.00, headroomDb:0},
  {name:'SR 1/8',       bits:16, hold:8, mix:1.00, preLP:20000, postLP:20000, drive:1.00, sat:0.00, headroomDb:0},
  {name:'8-Bit + SR',   bits:8,  hold:4, mix:1.00, preLP:20000, postLP:20000, drive:1.00, sat:0.00, headroomDb:0},

  // Character territory. These are complete internal degradation recipes,
  // not claims of exact hardware emulation.
  {name:'Sampler',      bits:12, hold:2,  mix:0.40, preLP:13500, postLP:12000, drive:1.16, sat:0.10, headroomDb:0},
  {name:'90s Rack',     bits:16, hold:2,  mix:0.34, preLP:15500, postLP:14000, drive:1.12, sat:0.08, headroomDb:0},
  {name:'Boom Bap',     bits:12, hold:3,  mix:0.52, preLP:11500, postLP:9000,  drive:1.30, sat:0.16, headroomDb:0},
  {name:'Chopped',      bits:11, hold:4,  mix:0.58, preLP:10500, postLP:8000,  drive:1.38, sat:0.18, headroomDb:0},
  {name:'Lo-Fi Drum',   bits:10, hold:4,  mix:0.62, preLP:12000, postLP:7600,  drive:1.48, sat:0.22, headroomDb:0},
  {name:'Basement',     bits:9,  hold:5,  mix:0.68, preLP:9000,  postLP:6200,  drive:1.60, sat:0.26, headroomDb:0},
  {name:'Crushed',      bits:7,  hold:7,  mix:0.76, preLP:7600,  postLP:5000,  drive:1.75, sat:0.30, headroomDb:0},
  {name:'Destroyed',    bits:5,  hold:10, mix:0.86, preLP:6200,  postLP:3900,  drive:2.00, sat:0.36, headroomDb:0},
  {name:'Obliterated',  bits:3,  hold:14, mix:0.96, preLP:4800,  postLP:2800,  drive:2.35, sat:0.44, headroomDb:0}
];

// Build 54: local headroom is now a per-preset Bit Crush parameter.
// headroomDb = 0 preserves the Build 51 wet path. Negative values insert a
// deliberate hard ceiling immediately before quantization, while the rest of
// the synth remains in the safe 32-bit float render domain.

const WIDTH_PRESETS = [
  {name:'Off',          mix:0.00, side:0.00, delayA:0.0,  delayB:0.0,  hp:180,  tilt:0.0},
  {name:'Touch',        mix:0.18, side:0.16, delayA:1.3,  delayB:2.6,  hp:180,  tilt:0.0},
  {name:'Natural',      mix:0.24, side:0.24, delayA:1.8,  delayB:3.8,  hp:180,  tilt:0.2},
  {name:'Open',         mix:0.30, side:0.32, delayA:2.3,  delayB:5.0,  hp:190,  tilt:0.4},
  {name:'Wide',         mix:0.38, side:0.42, delayA:2.8,  delayB:6.4,  hp:200,  tilt:0.6},
  {name:'Spacious',     mix:0.44, side:0.50, delayA:3.4,  delayB:8.0,  hp:210,  tilt:0.8},
  {name:'Airy',         mix:0.46, side:0.54, delayA:3.8,  delayB:9.2,  hp:420,  tilt:1.6},
  {name:'High Wide',    mix:0.48, side:0.60, delayA:4.2,  delayB:10.5, hp:750,  tilt:2.4},
  {name:'Soft Double',  mix:0.50, side:0.58, delayA:5.0,  delayB:12.0, hp:200,  tilt:0.5, mod:0.20},
  {name:'Double',       mix:0.56, side:0.68, delayA:6.0,  delayB:14.5, hp:210,  tilt:0.7, mod:0.35},
  {name:'Lush',         mix:0.58, side:0.72, delayA:6.8,  delayB:16.0, hp:230,  tilt:1.0, mod:0.45},
  {name:'Haas',         mix:0.60, side:0.78, delayA:4.5,  delayB:15.0, hp:240,  tilt:0.5},
  {name:'Extra Wide',   mix:0.64, side:0.86, delayA:5.5,  delayB:18.5, hp:250,  tilt:0.8},
  {name:'Huge',         mix:0.68, side:0.96, delayA:7.0,  delayB:22.0, hp:270,  tilt:1.0},
  {name:'Massive',      mix:0.72, side:1.06, delayA:8.5,  delayB:26.0, hp:300,  tilt:1.2},
  {name:'Ultra Wide',   mix:0.76, side:1.18, delayA:10.0, delayB:31.0, hp:330,  tilt:1.5},
  {name:'Hyper',        mix:0.78, side:1.30, delayA:11.5, delayB:35.0, hp:420,  tilt:2.2},
  {name:'Surround',     mix:0.82, side:1.42, delayA:13.0, delayB:39.0, hp:360,  tilt:1.8},
  {name:'Insane',       mix:0.86, side:1.55, delayA:15.0, delayB:44.0, hp:400,  tilt:2.4}
];

EffectsEngine.register = function(patch) {
  patch.fx.bitCrush = {preset:0};
  patch.fx.stereoWidth = {preset:0};
  patch.fx.delay = {preset:0};
  patch.fx.detune = {preset:0};
  patch.fx.chorus = {preset:0};
  patch.fx.reverb = {preset:0};
  patch.fx.wetDryMix = 70;
  patch.fx.saturation = {preset:0};
  patch.tempo = patch.tempo || 70;
};

EffectsEngine.initUI = function(patch) {
  const bindPreset = (id, valueId, target, presets) => UI.bindSlider(id, valueId, v => {
    target.preset = Number(v);
    return presets[Number(v)]?.name || 'Custom';
  });
  bindPreset('bitCrushPreset','bitCrushPresetValue',patch.fx.bitCrush,BIT_CRUSH_PRESETS);
  bindPreset('stereoWidthPreset','stereoWidthPresetValue',patch.fx.stereoWidth,WIDTH_PRESETS);
  bindPreset('detunePreset','detunePresetValue',patch.fx.detune,DETUNE_PRESETS);
  bindPreset('chorusPreset','chorusPresetValue',patch.fx.chorus,CHORUS_PRESETS);
  bindPreset('delayPreset','delayPresetValue',patch.fx.delay,DELAY_PRESETS);
  bindPreset('reverbPreset','reverbPresetValue',patch.fx.reverb,REVERB_PRESETS);
  UI.bindSlider('wetDryMix','wetDryMixValue',v => { patch.fx.wetDryMix = Number(v); return `${Math.round(v)}%`; });
  bindPreset('saturationPreset','saturationPresetValue',patch.fx.saturation,SATURATION_PRESETS);
};

function tempoToDelayTime(tempo, division) {
  const beat = 60 / Math.max(30, Math.min(300, Number(tempo) || 70));
  return ({'1/32':beat/8,'1/16':beat/4,'1/8':beat/2,'1/8d':beat*.75,'1/4t':beat*2/3,
    '1/4':beat,'1/2':beat*2,'1/1':beat*4,'1/1d':beat*6})[division] || 0;
}

function delayPresetTime(tempo, preset, side = 'L') {
  if (Number.isFinite(Number(preset?.fixedMs))) {
    return Math.max(0, Number(preset.fixedMs)) / 1000;
  }
  const division = side === 'R'
    ? (preset?.timeR || preset?.time)
    : (preset?.timeL || preset?.time);
  return tempoToDelayTime(tempo, division);
}

function stereoFromMono(ctx, input) {
  const merger = ctx.createChannelMerger(2);
  input.connect(merger, 0, 0);
  input.connect(merger, 0, 1);
  return merger;
}

function mixParallel(ctx, dryNode, wetNode, mix) {
  const m = Math.max(0, Math.min(1, mix || 0));
  const dry = ctx.createGain(), wet = ctx.createGain(), out = ctx.createGain();
  // Equal-power blend keeps perceived level stable.
  dry.gain.value = Math.cos(m * Math.PI * .5);
  wet.gain.value = Math.sin(m * Math.PI * .5);
  dryNode.connect(dry).connect(out);
  wetNode.connect(wet).connect(out);
  return out;
}


function makeBitCrushCurve(bits) {
  const size = 65536;
  const curve = new Float32Array(size);
  const safeBits = Math.max(2, Math.min(16, Number(bits) || 16));
  const levels = Math.max(2, Math.pow(2, safeBits));

  // Gentle mu-law style companding gives quiet attack stages more usable
  // quantization resolution, then expands them back out. This keeps the
  // crusher perceptually attached to long envelopes instead of appearing
  // only after the signal becomes loud enough to cross coarse full-scale
  // quantization steps.
  const mu = safeBits >= 12 ? 7 : safeBits >= 8 ? 15 : 31;
  const logMu = Math.log1p(mu);

  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    const sign = x < 0 ? -1 : 1;
    const magnitude = Math.abs(x);

    const compressed = Math.log1p(mu * magnitude) / logMu;
    const quantized =
      Math.round(compressed * (levels - 1)) / (levels - 1);
    const expanded = Math.expm1(quantized * logMu) / mu;

    curve[i] = sign * expanded;
  }

  return curve;
}

function makeBitCrushHeadroomCurve(ceiling) {
  const size=32768, curve=new Float32Array(size);
  const limit=Math.max(0.01,Math.min(1,Number(ceiling)||1));
  for(let i=0;i<size;i++){
    const x=(i/(size-1))*2-1;
    curve[i]=Math.max(-limit,Math.min(limit,x));
  }
  return curve;
}

function makeBitCrushSaturationCurve(amount) {
  const size=32768, curve=new Float32Array(size);
  const drive=1+Math.max(0,Number(amount)||0)*5, norm=Math.tanh(drive);
  for(let i=0;i<size;i++){const x=(i/(size-1))*2-1; curve[i]=Math.tanh(x*drive)/norm;}
  return curve;
}

function applyBitCrush(ctx, input, index) {
  const p=BIT_CRUSH_PRESETS[index]||BIT_CRUSH_PRESETS[0];
  const headroomDb=Math.min(0,Number(p.headroomDb)||0);
  const ceiling=Math.pow(10,headroomDb/20);
  if(index<=0) return input;
  const split=ctx.createChannelSplitter(2), merge=ctx.createChannelMerger(2);
  input.connect(split);
  for(let ch=0;ch<2;ch++){
    const drive=ctx.createGain(); drive.gain.value=p.drive;
    const pre=ctx.createBiquadFilter(); pre.type='lowpass'; pre.frequency.value=p.preLP; pre.Q.value=.45;
    const crush=ctx.createWaveShaper(); crush.curve=makeBitCrushCurve(p.bits); crush.oversample='none';
    split.connect(drive,ch); drive.connect(pre);
    if(headroomDb < 0){
      const headroom=ctx.createWaveShaper(); headroom.curve=makeBitCrushHeadroomCurve(ceiling); headroom.oversample='none';
      pre.connect(headroom); headroom.connect(crush);
    } else {
      pre.connect(crush);
    }
    let node=crush;
    if(p.hold>1){
      const holder=ctx.createScriptProcessor(256,1,1);
      let held=0, remaining=0; const count=Math.max(1,Math.round(p.hold));
      holder.onaudioprocess=ev=>{
        const source=ev.inputBuffer.getChannelData(0), dest=ev.outputBuffer.getChannelData(0);
        for(let i=0;i<source.length;i++){
          if(remaining<=0){held=source[i]; remaining=count;}
          dest[i]=held; remaining--;
        }
      };
      node.connect(holder); node=holder;
    }
    if(p.sat>0){
      const sat=ctx.createWaveShaper(); sat.curve=makeBitCrushSaturationCurve(p.sat); sat.oversample='2x';
      node.connect(sat); node=sat;
    }
    const post=ctx.createBiquadFilter(); post.type='lowpass'; post.frequency.value=p.postLP; post.Q.value=.5;
    node.connect(post); post.connect(merge,0,ch);
  }
  return merge;
}

function applyStereoWidth(ctx, input, index) {
  const p=WIDTH_PRESETS[index]||WIDTH_PRESETS[0];
  if(index<=0 || !p.side) return input;

  const split=ctx.createChannelSplitter(2);
  input.connect(split);

  // Utility-style core: center stays stable. Width is added only as Side.
  const midL=ctx.createGain();
  const midR=ctx.createGain();
  midL.gain.value=1;
  midR.gain.value=1;
  split.connect(midL,0);
  split.connect(midR,0);

  // Build Side from two decorrelated copies. Low frequencies stay centered.
  const hp=ctx.createBiquadFilter();
  hp.type='highpass';
  hp.frequency.value=p.hp||180;
  hp.Q.value=.42;
  split.connect(hp,0);

  const shelf=ctx.createBiquadFilter();
  shelf.type='highshelf';
  shelf.frequency.value=2400;
  shelf.gain.value=p.tilt||0;
  hp.connect(shelf);

  const delayA=ctx.createDelay(.08);
  const delayB=ctx.createDelay(.08);
  delayA.delayTime.value=Math.max(0,(p.delayA||0)/1000);
  delayB.delayTime.value=Math.max(0,(p.delayB||0)/1000);
  shelf.connect(delayA);
  shelf.connect(delayB);

  if(p.mod){
    const lfoA=ctx.createOscillator();
    const lfoB=ctx.createOscillator();
    const modA=ctx.createGain();
    const modB=ctx.createGain();
    lfoA.frequency.value=.21;
    lfoB.frequency.value=.31;
    modA.gain.value=.00045*p.mod;
    modB.gain.value=.00062*p.mod;
    lfoA.connect(modA).connect(delayA.delayTime);
    lfoB.connect(modB).connect(delayB.delayTime);
    lfoA.start();
    lfoB.start();
  }

  // Difference signal becomes Side.
  const sideA=ctx.createGain();
  const sideB=ctx.createGain();
  sideA.gain.value=.72*p.side;
  sideB.gain.value=-.72*p.side;
  delayA.connect(sideA);
  delayB.connect(sideB);

  const sideSum=ctx.createGain();
  sideA.connect(sideSum);
  sideB.connect(sideSum);

  // Mid/Side decode.
  const sideL=ctx.createGain();
  const sideR=ctx.createGain();
  sideL.gain.value=1;
  sideR.gain.value=-1;
  sideSum.connect(sideL);
  sideSum.connect(sideR);

  const merge=ctx.createChannelMerger(2);
  midL.connect(merge,0,0);
  sideL.connect(merge,0,0);
  midR.connect(merge,0,1);
  sideR.connect(merge,0,1);

  return merge;
}

function applyDetune(ctx, input, index) {
  const p = DETUNE_PRESETS[index] || DETUNE_PRESETS[0];
  if(index<=0) return input;

  // Original presets retain their established modulated-delay behavior.
  if (!p.mode) {
    if (!p.depth) return input;

    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    input.connect(split);

    for (let ch = 0; ch < 2; ch++) {
      const delay = ctx.createDelay(.05);
      const base = .006 + ch * .0013;
      delay.delayTime.value = base;

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = (p.rate || .18) * (ch ? .83 : 1);
      lfoGain.gain.value = p.depth * (ch ? .91 : 1);

      lfo.connect(lfoGain);
      lfoGain.connect(delay.delayTime);
      split.connect(delay, ch);
      delay.connect(merge, 0, ch);
      lfo.start();
    }

    return merge;
  }

  if (p.mode === 'static') {
    // A fixed delay does not create a true constant pitch offset. For offline
    // stereo audio, use a very slow ramp in delay time whose slope produces a
    // stable, subtle Doppler-style tuning bias over the note.
    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    input.connect(split);

    [p.centsL || 0, p.centsR || 0].forEach((cents, ch) => {
      const delay = ctx.createDelay(.08);
      const base = .030;
      const ratio = Math.pow(2, cents / 1200);
      const slope = 1 - ratio;
      delay.delayTime.setValueAtTime(base, 0);
      delay.delayTime.linearRampToValueAtTime(
        Math.max(.001, Math.min(.075, base + slope * 2.5)),
        2.5
      );
      split.connect(delay, ch);
      delay.connect(merge, 0, ch);
    });

    return merge;
  }

  if (p.mode === 'drift') {
    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    input.connect(split);

    for (let ch = 0; ch < 2; ch++) {
      const delay = ctx.createDelay(.08);
      delay.delayTime.value = .012 + ch * .0017;

      const slow = ctx.createOscillator();
      const slowGain = ctx.createGain();
      slow.type = ch ? 'triangle' : 'sine';
      slow.frequency.value = ch ? p.rateR : p.rateL;
      slowGain.gain.value = p.depth * (ch ? .87 : 1);

      // A second extremely slow, shallow component breaks obvious periodicity.
      const wander = ctx.createOscillator();
      const wanderGain = ctx.createGain();
      wander.type = 'sine';
      wander.frequency.value = (ch ? p.rateL : p.rateR) * .37;
      wanderGain.gain.value = p.depth * .27;

      slow.connect(slowGain);
      slowGain.connect(delay.delayTime);
      wander.connect(wanderGain);
      wanderGain.connect(delay.delayTime);

      split.connect(delay, ch);
      delay.connect(merge, 0, ch);
      slow.start();
      wander.start();
    }

    return merge;
  }

  return input;
}

function applyChorus(ctx, input, index) {
  const p = CHORUS_PRESETS[index] || CHORUS_PRESETS[0];
  if(index<=0) return input;

  // Original presets retain their existing chorus behavior.
  if (!p.mode) {
    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    input.connect(split);

    const voices = Math.max(1, p.voices || 2);
    const voiceGain = 1 / Math.sqrt(voices);

    for (let ch = 0; ch < 2; ch++) {
      for (let v = 0; v < voices; v++) {
        const delay = ctx.createDelay(.06);
        const base = .010 + v * .0021 + ch * .0007;
        delay.delayTime.value = base;

        const lfo = ctx.createOscillator();
        const mod = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = (p.rate || .25) * (1 + v * .13 + ch * .07);
        mod.gain.value = (p.depth || .0015) * (1 - Math.min(.55, v * .06));

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 9000;
        filter.Q.value = .4;

        const gain = ctx.createGain();
        gain.gain.value = voiceGain;

        lfo.connect(mod);
        mod.connect(delay.delayTime);
        split.connect(delay, ch);
        delay.connect(filter);
        filter.connect(gain);
        gain.connect(merge, 0, ch);
        lfo.start();
      }
    }

    return merge;
  }

  if (p.mode === 'ensemble') {
    if (!p.voices) return input;

    const split = ctx.createChannelSplitter(2);
    const ensemble = ctx.createChannelMerger(2);
    input.connect(split);

    const voices = Math.max(1, Math.round(p.voices));
    const voiceLevel = .72 / Math.sqrt(voices);

    // Deterministic irregularity: each generated voice gets a different
    // timing, rate, depth, phase approximation, level and stereo destination.
    for (let v = 0; v < voices; v++) {
      const sourceCh = v % 2;
      const stereoPattern = ((v * 37) % 101) / 100;
      const destCh = stereoPattern < .5 ? 0 : 1;

      const irregular = ((v * 53 + 17) % 97) / 96;
      const irregular2 = ((v * 29 + 41) % 89) / 88;

      const delay = ctx.createDelay(.08);
      const baseMs = p.baseMs + (irregular - .5) * p.spreadMs;
      delay.delayTime.value = Math.max(.001, baseMs / 1000);

      const lfo = ctx.createOscillator();
      lfo.type = (v % 3 === 0) ? 'triangle' : 'sine';
      lfo.frequency.value = p.rate * (.72 + irregular * .62);

      const mod = ctx.createGain();
      mod.gain.value = (p.depthMs / 1000) * (.68 + irregular2 * .58);

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = p.hp * (.88 + irregular * .22);
      hp.Q.value = .35;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = p.lp * (.90 + irregular2 * .16);
      lp.Q.value = .4;

      const gain = ctx.createGain();
      gain.gain.value = voiceLevel * (.82 + irregular * .28);

      lfo.connect(mod);
      mod.connect(delay.delayTime);
      split.connect(hp, sourceCh);
      hp.connect(delay);
      delay.connect(lp);
      lp.connect(gain);

      // Stereo is part of the ensemble construction, not a call into Width.
      // Lower stereo values occasionally keep voices on their source side;
      // higher values distribute them more aggressively across L/R.
      const finalDest = irregular2 < p.stereo ? destCh : sourceCh;
      gain.connect(ensemble, 0, finalDest);
      lfo.start();
    }

    return ensemble;
  }

  return input;
}

function makeDelaySaturationCurve(amount) {
  const size=32768, curve=new Float32Array(size);
  const drive=1+Math.max(0,Number(amount)||0)*4, norm=Math.tanh(drive);
  for(let i=0;i<size;i++){
    const x=(i/(size-1))*2-1;
    curve[i]=Math.tanh(x*drive)/Math.max(.0001,norm);
  }
  return curve;
}

function applyDelay(ctx, input, index, tempo) {
  const p=DELAY_PRESETS[index]||DELAY_PRESETS[0];
  if(index<=0) return input;
  if(!p.mix || (!p.time && !p.timeL && !p.timeR && !Number.isFinite(Number(p.fixedMs)))) return input;

  const split=ctx.createChannelSplitter(2), merge=ctx.createChannelMerger(2);
  input.connect(split);

  const timeL=delayPresetTime(tempo,p,'L');
  const timeR=delayPresetTime(tempo,p,'R');
  const delays=[ctx.createDelay(8),ctx.createDelay(8)];
  const feedback=[ctx.createGain(),ctx.createGain()];
  const returns=[ctx.createGain(),ctx.createGain()];

  delays[0].delayTime.value=timeL;
  delays[1].delayTime.value=timeR;
  feedback[0].gain.value=feedback[1].gain.value=Math.min(.88,Math.max(0,p.feedback||0));
  returns[0].gain.value=returns[1].gain.value=1;

  const feedbackNodes=[];

  for(let ch=0;ch<2;ch++){
    split.connect(delays[ch],ch);

    const hp=ctx.createBiquadFilter();
    hp.type='highpass'; hp.frequency.value=p.hp||20; hp.Q.value=.35;
    const lp=ctx.createBiquadFilter();
    lp.type='lowpass'; lp.frequency.value=p.lp||20000; lp.Q.value=.35;

    delays[ch].connect(hp).connect(lp);
    let node=lp;

    if(p.mode==='character' && (p.drive>1 || p.sat>0)){
      const drive=ctx.createGain(); drive.gain.value=p.drive||1;
      const sat=ctx.createWaveShaper();
      sat.curve=makeDelaySaturationCurve(p.sat||0);
      sat.oversample='2x';
      node.connect(drive).connect(sat);
      node=sat;
    }

    node.connect(returns[ch]).connect(merge,0,ch);

    // Character saturation is intentionally inside the audible repeat path,
    // but its small-signal gain must not secretly multiply the feedback amount.
    // Normalize the feedback send by the character drive/saturation gain so
    // the preset's feedback value remains the actual decay control.
    if(p.mode==='character' && (p.drive>1 || p.sat>0)){
      const feedbackNormalize=ctx.createGain();
      const driveGain=Math.max(1,Number(p.drive)||1);
      const satDrive=1+Math.max(0,Number(p.sat)||0)*4;
      feedbackNormalize.gain.value=1/(driveGain*satDrive);
      node.connect(feedbackNormalize);
      feedbackNodes[ch]=feedbackNormalize;
    } else {
      feedbackNodes[ch]=node;
    }
  }

  if(p.mode==='stereo'){
    const cross=Math.max(0,Math.min(1,p.cross||0));
    for(let ch=0;ch<2;ch++){
      const same=ctx.createGain(), other=ctx.createGain();
      same.gain.value=(1-cross)*(p.feedback||0);
      other.gain.value=cross*(p.feedback||0);
      feedbackNodes[ch].connect(same).connect(delays[ch]);
      feedbackNodes[ch].connect(other).connect(delays[1-ch]);
    }
  } else if(p.pingPong){
    feedbackNodes[0].connect(feedback[0]).connect(delays[1]);
    feedbackNodes[1].connect(feedback[1]).connect(delays[0]);
  } else {
    feedbackNodes[0].connect(feedback[0]).connect(delays[0]);
    feedbackNodes[1].connect(feedback[1]).connect(delays[1]);
  }

  return merge;
}


const CONVOLUTION_PRESETS = Object.freeze([
  {name:"Off"},
  {name:"Piano Body",      length:.22, decay:3.0, hp:55,  lp:9800,  body:1.00, early:.42, mix:.22},
  {name:"Rhodes Body",     length:.20, decay:3.1, hp:60,  lp:9000,  body:.95,  early:.44, mix:.24},
  {name:"Wood Box",        length:.12, decay:4.0, hp:80,  lp:7000,  body:.78,  early:.56, mix:.20},
  {name:"Large Wood Box",  length:.26, decay:3.2, hp:55,  lp:6800,  body:1.05,  early:.46, mix:.26},
  {name:"Metal Box",       length:.18, decay:3.0, hp:120, lp:12000, body:.68,  early:.62, mix:.22},
  {name:"Glass",           length:.16, decay:3.2, hp:300, lp:15000, body:.42,  early:.58, mix:.18},
  {name:"Small Speaker",   length:.07, decay:5.0, hp:260, lp:5600,  body:.50,  early:.78, mix:.24},
  {name:"Radio",           length:.06, decay:5.6, hp:420, lp:3900,  body:.44,  early:.82, mix:.28},
  {name:"Telephone",       length:.05, decay:6.2, hp:520, lp:3200,  body:.36,  early:.86, mix:.32},
  {name:"Bass Cabinet",    length:.24, decay:3.0, hp:35,  lp:4200,  body:1.18,  early:.50, mix:.26},
  {name:"Vintage Cabinet", length:.22, decay:3.0, hp:65,  lp:6200,  body:1.00,  early:.56, mix:.24},
  {name:"Drum Shell",      length:.16, decay:3.4, hp:60,  lp:10500, body:1.00,  early:.64, mix:.22},
  {name:"Mallet Body",     length:.13, decay:3.9, hp:80,  lp:11000, body:.82,  early:.62, mix:.18},
  {name:"Small Room",      length:.42, decay:2.5, hp:90,  lp:9500,  body:.56,  early:.74, mix:.18},
  {name:"Dark Room",       length:.60, decay:2.4, hp:60,  lp:5600,  body:.70,  early:.68, mix:.22},
  {name:"Bright Room",     length:.52, decay:2.2, hp:120, lp:14500, body:.52,  early:.70, mix:.20},
  {name:"Concrete",        length:.90, decay:1.7, hp:90,  lp:13000, body:.62,  early:.78, mix:.28},
  {name:"Stairwell",       length:1.35,decay:1.5, hp:100, lp:12000, body:.58,  early:.80, mix:.30},
  {name:"Tunnel",          length:1.80,decay:1.3, hp:75,  lp:9200,  body:.68,  early:.72, mix:.32},
  {name:"Short Plate",     length:.70, decay:1.8, hp:130, lp:14500, body:.40,  early:.52, mix:.24},
  {name:"Long Plate",      length:2.40,decay:1.15,hp:110, lp:13000, body:.48,  early:.46, mix:.30},
  {name:"Spring",          length:1.60,decay:1.28,hp:140, lp:10000, body:.52,  early:.56, mix:.28},
  {name:"Air Chamber",     length:1.50,decay:1.4, hp:180, lp:15500, body:.38,  early:.40, mix:.24},
  {name:"Dark Chamber",    length:2.00,decay:1.26,hp:60,  lp:6200,  body:.72,  early:.50, mix:.30},
  {name:"Stone Chamber",   length:2.50,decay:1.12,hp:80,  lp:10500, body:.70,  early:.68, mix:.32},
  {name:"Cathedral",       length:4.80,decay:.92, hp:60,  lp:11500, body:.80,  early:.56, mix:.36},
  {name:"Ghost Chamber",   length:4.00,decay:.96, hp:120, lp:15000, body:.46,  early:.36, mix:.34},
  {name:"Abyss",           length:5.80,decay:.84, hp:30,  lp:6500,  body:1.00,  early:.32, mix:.40}
]);

let cachedConvolutionImpulses={};

function convolutionImpulse(ctx,p,index){
  const key=`cv_${index}_${ctx.sampleRate}`;
  if(cachedConvolutionImpulses[key]) return cachedConvolutionImpulses[key];

  const n=Math.max(1,Math.floor(ctx.sampleRate*p.length));
  const b=ctx.createBuffer(2,n,ctx.sampleRate);

  for(let ch=0;ch<2;ch++){
    const d=b.getChannelData(ch);
    const rnd=seeded(index*65537+ch*8191+0x51a7);
    let low=0;

    for(let i=0;i<n;i++){
      const x=i/Math.max(1,n-1);
      const env=Math.pow(Math.max(0,1-x),p.decay||2);
      const white=rnd()*2-1;

      low+=.06*(white-low);
      let sample=(white*.36+low*.64)*env*.22;

      // Dense body resonances rather than sparse taps.
      const base=(p.body||.6);
      sample += Math.sin((i/ctx.sampleRate)*Math.PI*2*(120+index*7)*(ch?1.007:.993))*env*base*.08;
      sample += Math.sin((i/ctx.sampleRate)*Math.PI*2*(360+index*13)*(ch?1.011:.989))*env*base*.045;

      if(p.early && i<ctx.sampleRate*.08){
        const ex=i/(ctx.sampleRate*.08);
        if(rnd()<(.010+p.early*.018)){
          sample += (rnd()*2-1)*p.early*(1-ex)*.12;
        }
      }

      d[i]=sample;
    }
  }

  cachedConvolutionImpulses[key]=b;
  return b;
}

function applyConvolution(ctx,input,index){
  const p=CONVOLUTION_PRESETS[index]||CONVOLUTION_PRESETS[0];
  if(index<=0 || !p.length) return input;

  const conv=ctx.createConvolver();
  const hp=ctx.createBiquadFilter();
  const lp=ctx.createBiquadFilter();
  const makeup=ctx.createGain();

  conv.buffer=convolutionImpulse(ctx,p,index);
  conv.normalize=true;

  hp.type='highpass';
  hp.frequency.value=p.hp||40;
  hp.Q.value=.4;

  lp.type='lowpass';
  lp.frequency.value=p.lp||16000;
  lp.Q.value=.35;

  // Gentle compensation only. IR tone should change, not collapse level.
  makeup.gain.value=1.18;

  input.connect(conv).connect(hp).connect(lp).connect(makeup);
  return makeup;
}

function seeded(seed){ let s=seed>>>0; return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296); }

function impulse(ctx,p,index){
  const mode=p.mode||'legacy';
  const key=`rv_${index}_${ctx.sampleRate}_${mode}`;
  if(cachedReverbImpulses[key]) return cachedReverbImpulses[key];

  const n=Math.max(1,Math.floor(ctx.sampleRate*p.length));
  const b=ctx.createBuffer(2,n,ctx.sampleRate);

  for(let ch=0;ch<2;ch++){
    const d=b.getChannelData(ch);
    const rnd=seeded(index*104729+ch*7919+17);
    let low=0;

    for(let i=0;i<n;i++){
      const x=i/Math.max(1,n-1);
      let env=Math.pow(1-x,p.decay);

      if(mode==='plate'){
        env*=.82+.18*Math.sin(Math.PI*Math.min(1,x*3));
      } else if(mode==='room'){
        env*=x<.08 ? 1.12 : .90;
      } else if(mode==='hall'){
        env*=.96+.04*Math.sin(x*Math.PI*2);
      } else if(mode==='ambient' && p.swell){
        const swell=Math.min(1,x/Math.max(.02,p.swell*.22));
        env*=.45+.55*swell;
      } else if(mode==='bright'){
        env*=.92+.08*Math.sin(x*Math.PI*5);
      }

      const white=rnd()*2-1;
      const alpha=.12+(1-p.damping)*.35;
      low+=alpha*(white-low);

      let sample=white*(1-p.damping)+low*p.damping;

      // Dense, irregular early reflections. Avoid periodic tap spacing,
      // which reads as delay rather than reverb.
      if((mode==='room'||mode==='hall') && p.early && i<ctx.sampleRate*.095){
        const earlyX=i/(ctx.sampleRate*.095);
        const density=.010 + p.early*.022;
        if(rnd()<density){
          sample += (rnd()*2-1)*p.early*(1-earlyX)*.85;
        }
      }

      // Immediate diffuse onset for every reverb family. This fills the gap
      // between the source and the late tail without producing a discrete echo.
      if(i<ctx.sampleRate*.032){
        const onset=1-i/(ctx.sampleRate*.032);
        sample += (rnd()*2-1)*onset*.12;
      }

      // Plate-like diffusion: blend a tiny previous-sample memory.
      if(mode==='plate' && i>0){
        sample = sample*(1-(p.diffusion||.75)*.18) + d[i-1]*(p.diffusion||.75)*.18;
      }

      d[i]=sample*env*.32;
    }
  }

  cachedReverbImpulses[key]=b;
  return b;
}

function applyReverb(ctx,input,index){
  const p=REVERB_PRESETS[index]||REVERB_PRESETS[0];
  if(index<=0) return input;
  if(!p.length) return input;

  const pred=ctx.createDelay(.5);
  const conv=ctx.createConvolver();
  const hp=ctx.createBiquadFilter();
  const lp=ctx.createBiquadFilter();

  pred.delayTime.value=Math.min(.060,Math.max(0,(p.predelay||0)*.38));
  conv.buffer=impulse(ctx,p,index);
  conv.normalize=true;

  hp.type='highpass';
  hp.frequency.value=p.hp||120;
  hp.Q.value=.4;

  lp.type='lowpass';
  lp.frequency.value=p.lp || (3500+(1-p.damping)*6500);
  lp.Q.value=.3;

  input.connect(pred).connect(conv).connect(hp).connect(lp);

  let wet=lp;

  // Character presets may control reverb-only stereo width internally.
  if(p.mode && p.width!==undefined && p.width<1){
    const split=ctx.createChannelSplitter(2);
    const merge=ctx.createChannelMerger(2);
    const l=ctx.createGain(), r=ctx.createGain();
    l.gain.value=.82+.18*p.width;
    r.gain.value=.82+.18*p.width;
    wet.connect(split);
    split.connect(l,0); split.connect(r,1);
    l.connect(merge,0,0); r.connect(merge,0,1);
    wet=merge;
  }

  return wet;
}


function makeSaturationCurve(drive, bias, asymmetry) {
  const size=65536, curve=new Float32Array(size);
  const d=Math.max(1,Number(drive)||1);
  const b=Number(bias)||0;
  const a=Math.max(0,Math.min(.95,Number(asymmetry)||0));

  for(let i=0;i<size;i++){
    const x=(i/(size-1))*2-1;
    const shifted=x+b;
    const positiveDrive=d*(1+a);
    const negativeDrive=d*(1-a);
    const shaped=shifted>=0
      ? Math.tanh(shifted*positiveDrive)/Math.max(.0001,Math.tanh(positiveDrive))
      : Math.tanh(shifted*negativeDrive)/Math.max(.0001,Math.tanh(negativeDrive));
    curve[i]=Math.max(-1,Math.min(1,shaped-b*.35));
  }
  return curve;
}

function makeCharacterSaturationCurve(p) {
  const size=65536, curve=new Float32Array(size);
  const d=Math.max(1,Number(p.drive)||1);

  for(let i=0;i<size;i++){
    const x=(i/(size-1))*2-1;
    let y=x*d;

    switch(p.mode){
      case 'soft': {
        const c=Math.max(.2,Math.min(1.5,p.curve||.7));
        y=Math.tanh(y*c)/Math.tanh(c);
        break;
      }
      case 'tape': {
        const b=p.bias||0;
        const h=p.hysteresis||0;
        const z=y+b;
        y=Math.tanh(z*(1.4+h*3)) + Math.sin(z*Math.PI)*h*.08;
        y-=b*.45;
        break;
      }
      case 'tube': {
        const a=Math.max(0,Math.min(.8,p.asymmetry||.2));
        const pos=1.6*(1+a), neg=1.6*(1-a);
        y=y>=0 ? Math.tanh(y*pos)/Math.tanh(pos) : Math.tanh(y*neg)/Math.tanh(neg);
        break;
      }
      case 'console': {
        const k=Math.max(.2,Math.min(.9,p.knee||.6));
        const ay=Math.abs(y);
        y=Math.sign(y)*(ay<=k ? ay : k+(1-k)*(1-Math.exp(-(ay-k)/(1-k))));
        break;
      }
      case 'transformer': {
        const a=p.asymmetry||.1;
        y=Math.tanh(y*1.8 + a*y*y*Math.sign(y));
        break;
      }
      case 'diode': {
        const t=Math.max(.1,Math.min(.9,p.threshold||.4));
        const ay=Math.abs(y);
        const excess=Math.max(0,ay-t);
        y=Math.sign(y)*(ay<=t ? ay : t+(1-t)*Math.tanh(excess*3));
        break;
      }
      case 'clip': {
        const t=Math.max(.08,Math.min(.95,p.threshold||.6));
        const s=Math.max(.02,Math.min(.8,p.softness||.2));
        y=t*Math.tanh(y/(t*s))/Math.tanh(1/s);
        break;
      }
      case 'rectify': {
        const amt=Math.max(0,Math.min(.8,p.amount||.2));
        y=(1-amt)*Math.tanh(y) + amt*Math.abs(Math.tanh(y));
        break;
      }
      case 'fuzz': {
        const t=Math.max(.05,Math.min(.8,p.threshold||.25));
        y=Math.tanh(y*3.5);
        y=Math.max(-t,Math.min(t,y))/t;
        if(p.gate && Math.abs(x)<p.gate) y*=Math.abs(x)/p.gate;
        break;
      }
      default:
        y=Math.tanh(y);
    }

    curve[i]=Math.max(-1,Math.min(1,y));
  }
  return curve;
}

function applySaturation(ctx,input,index){
  const p=SATURATION_PRESETS[index]||SATURATION_PRESETS[0];
  if(index<=0) return input;

  const split=ctx.createChannelSplitter(2);
  const merge=ctx.createChannelMerger(2);
  input.connect(split);

  for(let ch=0;ch<2;ch++){
    const driveGain=ctx.createGain();
    driveGain.gain.value=p.mode ? 1 : p.drive;

    const shaper=ctx.createWaveShaper();
    shaper.curve=p.mode
      ? makeCharacterSaturationCurve(p)
      : makeSaturationCurve(p.drive,p.bias,p.asymmetry);
    shaper.oversample='4x';

    // Bias/asymmetry and rectification can introduce DC. Remove it inside
    // Saturation so downstream master blending/output correction never sees it.
    const dcBlock=ctx.createBiquadFilter();
    dcBlock.type='highpass';
    dcBlock.frequency.value=12;
    dcBlock.Q.value=.5;

    const tone=ctx.createBiquadFilter();
    tone.type='lowpass';
    tone.frequency.value=p.tone||20000;
    tone.Q.value=.45;

    const makeup=ctx.createGain();
    makeup.gain.value=p.mode ? (p.makeup??1) : 1;

    split.connect(driveGain,ch);
    driveGain.connect(shaper).connect(dcBlock).connect(tone).connect(makeup).connect(merge,0,ch);
  }

  return merge;
}

EffectsEngine.applyAll = function(ctx,inputNode,fx,noteLength,tempo=70,options={}){
  const stereoSource = stereoFromMono(ctx,inputNode);
  const dry = stereoSource;
  const bitCrushIndex = fx?.bitCrush?.preset||0;
  const bitCrushAmount = Math.max(0,Math.min(1,(Number(fx?.bitCrush?.wet ?? 0))/100));
  let wet = stereoSource;
  if(bitCrushIndex>0 && bitCrushAmount>0){
    const bitCrushWet = applyBitCrush(ctx,stereoSource,bitCrushIndex);
    wet = bitCrushAmount>=1 ? bitCrushWet : mixParallel(ctx,stereoSource,bitCrushWet,bitCrushAmount);
  }
  {
    const saturationInput = wet;
    const saturationIndex = fx?.saturation?.preset||0;
    const saturationAmount = Math.max(0,Math.min(1,(Number(fx?.saturation?.wet ?? 0))/100));
    if(saturationIndex>0 && saturationAmount>0){
      const saturationWet = applySaturation(ctx,saturationInput,saturationIndex);
      wet = saturationAmount>=1 ? saturationWet : mixParallel(ctx,saturationInput,saturationWet,saturationAmount);
    }
  }
  {
    const widthInput = wet;
    const widthIndex = fx?.stereoWidth?.preset||0;
    const widthAmount = Math.max(0,Math.min(1,(Number(fx?.stereoWidth?.wet ?? 0))/100));
    if(widthIndex>0 && widthAmount>0){
      const widthWet = applyStereoWidth(ctx,widthInput,widthIndex);
      wet = widthAmount>=1 ? widthWet : mixParallel(ctx,widthInput,widthWet,widthAmount);
    }
  }
  {
    const detuneInput = wet;
    const detuneIndex = fx?.detune?.preset||0;
    const detuneAmount = Math.max(0,Math.min(1,(Number(fx?.detune?.wet ?? 0))/100));
    if(detuneIndex>0 && detuneAmount>0){
      const detuneWet = applyDetune(ctx,detuneInput,detuneIndex);
      wet = detuneAmount>=1 ? detuneWet : mixParallel(ctx,detuneInput,detuneWet,detuneAmount);
    }
  }
  {
    const chorusInput = wet;
    const chorusIndex = fx?.chorus?.preset||0;
    const chorusAmount = Math.max(0,Math.min(1,(Number(fx?.chorus?.wet ?? 0))/100));
    if(chorusIndex>0 && chorusAmount>0){
      const chorusWet = applyChorus(ctx,chorusInput,chorusIndex);
      wet = chorusAmount>=1 ? chorusWet : mixParallel(ctx,chorusInput,chorusWet,chorusAmount);
    }
  }
  {
    const delayInput = wet;
    const delayIndex = fx?.delay?.preset||0;
    const delayAmount = Math.max(0,Math.min(1,(Number(fx?.delay?.wet ?? 0))/100));
    if(delayIndex>0 && delayAmount>0){
      const delayWet = applyDelay(ctx,delayInput,delayIndex,tempo);
      wet = delayAmount>=1 ? delayWet : mixParallel(ctx,delayInput,delayWet,delayAmount);
    }
  }
  {
    const reverbInput = wet;
    const reverbIndex = fx?.reverb?.preset||0;
    const reverbAmount = Math.max(0,Math.min(1,(Number(fx?.reverb?.wet ?? 0))/100));
    if(reverbIndex>0 && reverbAmount>0){
      const reverbWet = applyReverb(ctx,reverbInput,reverbIndex);
      wet = reverbAmount>=1 ? reverbWet : mixParallel(ctx,reverbInput,reverbWet,reverbAmount);
    }
  }
  {
    const convolutionInput = wet;
    const convolutionIndex = fx?.convolution?.preset||0;
    const convolutionAmount = Math.max(0,Math.min(1,(Number(fx?.convolution?.wet ?? 0))/100));
    if(convolutionIndex>0 && convolutionAmount>0){
      const convolutionWet = applyConvolution(ctx,convolutionInput,convolutionIndex);
      wet = convolutionAmount>=1 ? convolutionWet : mixParallel(ctx,convolutionInput,convolutionWet,convolutionAmount);
    }
  }
  // Each effect now owns its own dry/wet control.
  // Do not apply a second global dry/wet blend here.
  // When all effects are Off/0%, `wet` is already identical to the dry chain.
  return {node:wet};
};

EffectsEngine.computeTail = function(fx,tempo=70){
  let tail=.12;
  const d=DELAY_PRESETS[fx?.delay?.preset||0];
  if(Number(fx?.delay?.wet ?? 0)>0 && (d?.time || d?.timeL || d?.timeR || Number.isFinite(Number(d?.fixedMs)))){
    const t=Math.max(delayPresetTime(tempo,d,'L'),delayPresetTime(tempo,d,'R'));
    const f=Math.min(.92,Math.max(0,d.feedback));
    const reps=f>0?Math.ceil(Math.log(.001)/Math.log(f)):1;
    tail=Math.max(tail,t*Math.min(reps,18));
  }
  const r=REVERB_PRESETS[fx?.reverb?.preset||0]; if(Number(fx?.reverb?.wet ?? 0)>0 && r?.length) tail=Math.max(tail,Math.min(.060,Math.max(0,(r.predelay||0)*.38))+r.length);
  const c=CONVOLUTION_PRESETS[fx?.convolution?.preset||0]; if(Number(fx?.convolution?.wet ?? 0)>0 && c?.length) tail=Math.max(tail,c.length);
  return Math.min(20,tail+.12);
};
EffectsEngine.clearCache = function(){ cachedReverbImpulses={}; cachedConvolutionImpulses={}; };
EffectsEngine.convolutionDefaultWet = function(index){
  const i=Math.max(0,Math.min(CONVOLUTION_PRESETS.length-1,Math.round(Number(index)||0)));
  if(i===0) return 0;
  const p=CONVOLUTION_PRESETS[i]||CONVOLUTION_PRESETS[0];
  const legacyMix=Number(p.mix);
  return Number.isFinite(legacyMix)
    ? Math.round(Math.max(0,Math.min(1,legacyMix))*100)
    : 25;
};
EffectsEngine.reverbDefaultWet = function(index){
  const i=Math.max(0,Math.min(REVERB_PRESETS.length-1,Math.round(Number(index)||0)));
  if(i===0) return 0;
  const p=REVERB_PRESETS[i]||REVERB_PRESETS[0];
  const legacyMix=Number(p.mix);
  return Number.isFinite(legacyMix)
    ? Math.round(Math.max(0,Math.min(1,legacyMix))*100)
    : 30;
};
EffectsEngine.delayDefaultWet = function(index){
  const i=Math.max(0,Math.min(DELAY_PRESETS.length-1,Math.round(Number(index)||0)));
  if(i===0) return 0;
  const p=DELAY_PRESETS[i]||DELAY_PRESETS[0];
  const legacyMix=Number(p.mix);
  return Number.isFinite(legacyMix)
    ? Math.round(Math.max(0,Math.min(1,legacyMix))*100)
    : 30;
};
EffectsEngine.chorusDefaultWet = function(index){
  const i=Math.max(0,Math.min(CHORUS_PRESETS.length-1,Math.round(Number(index)||0)));
  if(i===0) return 0;
  const p=CHORUS_PRESETS[i]||CHORUS_PRESETS[0];
  const legacyMix=Number(p.mix);
  return Number.isFinite(legacyMix)
    ? Math.round(Math.max(0,Math.min(1,legacyMix))*100)
    : 40;
};
EffectsEngine.detuneDefaultWet = function(index){
  const i=Math.max(0,Math.min(DETUNE_PRESETS.length-1,Math.round(Number(index)||0)));
  if(i===0) return 0;
  const p=DETUNE_PRESETS[i]||DETUNE_PRESETS[0];
  if(!p.mode) return 100;
  const legacyMix=Number(p.mix);
  return Number.isFinite(legacyMix)
    ? Math.round(Math.max(0,Math.min(1,legacyMix))*100)
    : 35;
};
EffectsEngine.widthDefaultWet = function(index){
  const i=Math.max(0,Math.min(WIDTH_PRESETS.length-1,Math.round(Number(index)||0)));
  if(i===0) return 0;
  return Math.round(Math.max(0,Math.min(1,Number(WIDTH_PRESETS[i]?.mix)||0))*100);
};
EffectsEngine.saturationDefaultWet = function(index){
  const i=Math.max(0,Math.min(SATURATION_PRESETS.length-1,Math.round(Number(index)||0)));
  if(i===0) return 0;
  return Math.round(Math.max(0,Math.min(1,Number(SATURATION_PRESETS[i]?.mix)||0))*100);
};
EffectsEngine.bitCrushDefaultWet = function(index){
  const i=Math.max(0,Math.min(BIT_CRUSH_PRESETS.length-1,Math.round(Number(index)||0)));
  if(i===0) return 0;
  return Math.round(Math.max(0,Math.min(1,Number(BIT_CRUSH_PRESETS[i]?.mix)||0))*100);
};
window.SynthPhaceEffects = EffectsEngine;

