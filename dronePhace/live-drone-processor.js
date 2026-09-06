class LiveDroneProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.s = options.processorOptions?.state || {};
    this.phL = new Float64Array(5); this.phR = new Float64Array(5);
    this.dL = new Float32Array(sampleRate * 4); this.dR = new Float32Array(sampleRate * 4);
    this.hist = new Float32Array(160); this.di = this.hi = 0; this.seed = 42;
    this.lpL = this.lpR = this.satL = this.satR = 0; this.active = true; this.refresh();
    this.port.onmessage = event => { if (event.data?.type === "shutdown") this.active = false; else if (event.data?.state) { this.s = event.data.state; this.refresh(); } };
  }
  v(id, fallback = 0) { return Math.max(0, Math.min(100, Number(this.s.values?.[id] ?? fallback) || 0)) / 100; }
  rnd() { this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0; return this.seed / 4294967296 * 2 - 1; }
  macro(x, key) { if (x <= .7) return x / .7; return 1 + Math.pow((x - .7) / .3, 1.45) * ({ v: .34, p: .55, t: .65, s: .8, m: 2.2 }[key] || .5); }
  dip(t, center, down, hold, up) { const start = center - down - hold * .5, downEnd = center - hold * .5, upStart = center + hold * .5, end = upStart + up; if (t <= start || t >= end) return 0; const smooth = x => x * x * (3 - 2 * x); return t < downEnd ? smooth((t - start) / down) : t <= upStart ? 1 : 1 - smooth((t - upStart) / up); }
  refresh() {
    const scale = [[0,2,4,5,7,9,11],[0,2,3,5,7,8,10],[0,2,3,5,7,9,10],[0,2,4,7,9],[0,3,5,7,10],[0,2,3,7,8]][Math.max(0, Math.min(5, Math.round(Number(this.s.project?.scale) || 0)))] || [0,2,4,5,7,9,11];
    const family = [[0,7,12,19,24],[0,7,16,12,19],[0,7,16,14,19],[0,7,17,14,19],[0,7,16,21,19],[0,7,16,22,19],[0,12,24,36,48],[0,12,16,19,26],[0,2,7,12,14],[0,7,16,24,31],[0,7,14,19,26],[0,12,19,28,38]][Math.round(this.v("app6_b1_p1_c2", 18) * 11)] || [0,7,16,14,19];
    const shifts = [[0,0,-12,-12,-12],[0,0,0,-12,0],[0,0,0,0,0],[0,0,0,12,12],[0,0,12,12,24]][Math.round(this.v("app6_b1_p1_c5", 50) * 4)] || [0,0,0,0,0];
    const n = 1 + Math.round(this.v("app6_b1_p1_c3", 100) * 4), register = [-24,-12,0,12,24][Math.round(this.v("app6_b1_p1_c4", 50) * 4)] || 0, root = 48 + ((Number(this.s.project?.root) || 60) % 12) + register;
    this.freq = new Float64Array(5);
    for (let j = 0; j < n; j++) { let best = scale[0], distance = Infinity; for (let octave = -1; octave < 3; octave++) for (const degree of scale) { const candidate = degree + octave * 12, nextDistance = Math.abs(candidate - family[j]); if (nextDistance < distance) { distance = nextDistance; best = candidate; } } this.freq[j] = 440 * Math.pow(2, (root + best + shifts[j] - 69) / 12); }
    const h = this.v("app6_b2_p1_c1", 22), brightness = this.v("app6_b2_p1_c2", 42), resonance = this.v("app6_b2_p1_c3", 8), air = this.v("app6_b2_p1_c4", 28), saturation = this.v("app6_b2_p1_c5", 18);
    const voiceMotion = this.macro(this.v("app6_b3_p1_c1", 48), "v"), pitchDrift = this.macro(this.v("app6_b3_p1_c2", 18), "p"), timbreMotion = this.macro(this.v("app6_b3_p1_c3", 10), "t"), stereoMotion = this.macro(this.v("app6_b3_p1_c4", 32), "s"), motionSpeed = this.macro(this.v("app6_b3_p1_c5", 28), "m");
    const width = this.v("app6_b4_p1_c1", 58), delay = this.v("app6_b4_p1_c2", 42), reverb = this.v("app6_b4_p1_c3", 24), space = this.v("app6_b4_p1_c4", 18), distance = this.v("app6_b4_p1_c5", 20);
    this.p = { n, h2: Math.min(.34, .075 * Math.pow(h / .22, .82) * (brightness >= .42 ? 1 + (brightness - .42) / .58 * 1.15 : 1 + (brightness - .42) / .42 * .72)), h3: Math.min(.16, .022 * Math.pow(h / .22, 1.05)), h5: Math.min(.11, resonance * (.01 + .1 * brightness)), h7: Math.min(.065, Math.pow(resonance, 1.35) * (.012 + .055 * h)), alpha: 1 - Math.exp(-2 * Math.PI * (700 * Math.pow(26, brightness)) / sampleRate), air, saturation, voiceMotion, pitchDrift, timbreMotion, stereoMotion, motionSpeed, width, delay, reverb, space, distance };
  }
  process(_, outputs) {
    if (!this.active) return false;
    const left = outputs[0][0], right = outputs[0][1]; if (!left || !right) return true;
    const p = this.p, weights = [.32,.25,.20,.13,.08], speed = .42 + p.motionSpeed * 1.35, drift = .0001 + p.pitchDrift * .00315;
    for (let i = 0; i < left.length; i++) {
      const time = (currentFrame + i) / sampleRate, dip = this.dip(time, 34, 8, 3, 8); let l = 0, r = 0;
      for (let j = 0; j < p.n; j++) {
        const f = this.freq[j], movement = Math.max(.015, 1 - (.05 + p.voiceMotion * .38) * (.5 + .5 * Math.sin(2 * Math.PI * (.012 + j * .0037) * speed * time + j)) * .7 - dip * .25);
        this.phL[j] += 2 * Math.PI * f * (1 + drift * Math.sin(2 * Math.PI * (.021 + j * .0042) * speed * time + j)) / sampleRate; this.phR[j] += 2 * Math.PI * f * (1 + drift * Math.sin(2 * Math.PI * (.018 + j * .0048) * speed * time + j + 1.2)) / sampleRate;
        const timbre = 1 - Math.min(.96, p.timbreMotion * (.26 + .46 * (.5 + .5 * Math.sin(2 * Math.PI * (.01 + j * .0028) * speed * time + j)) + .48 * dip));
        const sl = Math.sin(this.phL[j]) + p.h2 * timbre * Math.sin(2 * this.phL[j]) + p.h3 * timbre * Math.sin(3 * this.phL[j]) + p.h5 * Math.sin(5 * this.phL[j]) + p.h7 * Math.sin(7 * this.phL[j]), sr = Math.sin(this.phR[j]) + p.h2 * timbre * Math.sin(2 * this.phR[j]) + p.h3 * timbre * Math.sin(3 * this.phR[j]) + p.h5 * Math.sin(5 * this.phR[j]) + p.h7 * Math.sin(7 * this.phR[j]), pan = Math.max(-.96, Math.min(.96, p.stereoMotion * .8 * Math.sin(2 * Math.PI * (.01 + j * .0024) * speed * time + j)));
        l += weights[j] * movement * sl * Math.sqrt((1 - pan) * .5) * Math.SQRT2; r += weights[j] * movement * sr * Math.sqrt((1 + pan) * .5) * Math.SQRT2;
      }
      this.lpL += p.alpha * (l - this.lpL); this.lpR += p.alpha * (r - this.lpR);
      const noise = this.rnd(), slot = this.hi++ % 160, average = this.hist[slot], high = noise - average; this.hist[slot] = noise; this.lpL += high * (.0005 + Math.pow(p.air, 1.15) * .026); this.lpR += high * (.0005 + Math.pow(p.air, 1.15) * .026);
      const read = (this.di - Math.floor((.19 * (.82 + p.delay * .36)) * sampleRate) + this.dL.length) % this.dL.length, dl = this.dL[read], dr = this.dR[read]; this.dL[this.di] = this.lpL + dr * (.04 + p.reverb * .12); this.dR[this.di] = this.lpR + dl * (.04 + p.reverb * .12); this.di = (this.di + 1) % this.dL.length;
      const mid = (this.lpL + this.lpR) * .5, side = (this.lpL - this.lpR) * .5 * (.04 + Math.pow(p.width, 1.15) * 2.05), angle = 2 * Math.PI * (.01 + .045 * p.space) * time, pan = Math.sin(angle) * p.space * .6, outL = (mid + side + dr * p.delay * .16) * (1 - p.distance * .42), outR = (mid - side + dl * p.delay * .16) * (1 - p.distance * .42);
      this.satL += .035 * (outL - this.satL); this.satR += .035 * (outR - this.satR); const drive = .64 + p.saturation + p.saturation * p.saturation * 1.1;
      left[i] = Math.tanh((outL + this.satL * Math.pow(p.saturation, 1.4) * .08) * drive) * Math.sqrt((1 - pan) * .5) * Math.SQRT2 * .8; right[i] = Math.tanh((outR + this.satR * Math.pow(p.saturation, 1.4) * .08) * drive) * Math.sqrt((1 + pan) * .5) * Math.SQRT2 * .8;
    }
    return true;
  }
}
registerProcessor("interphace-live-drone", LiveDroneProcessor);
