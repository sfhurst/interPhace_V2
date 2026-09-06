class LiveNoiseProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.state = options.processorOptions?.state || { values: {} };
    this.seed = (Date.now() & 0xffffffff) >>> 0 || 1;
    this.fastL = this.fastR = this.midL = this.midR = this.slowL = this.slowR = 0;
    this.delayL = new Float32Array(Math.ceil(sampleRate * 0.7));
    this.delayR = new Float32Array(Math.ceil(sampleRate * 0.7));
    this.delayIndex = 0;
    this.events = Array.from({ length: 40 }, () => ({ remaining: 0, length: 0, amp: 0, pan: 0, pop: false, low: 0, previous: 0, polarity: 1 }));
    this.active = true;
    this.port.onmessage = event => { if (event.data?.type === "shutdown") this.active = false; else if (event.data?.type === "state") this.state = event.data.state || this.state; };
  }

  random() { this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0; return this.seed / 4294967296; }
  value(id, fallback = 0) { return Math.max(0, Math.min(100, Number(this.state?.values?.[id] ?? fallback) || 0)) / 100; }
  motionAt(t) {
    const speed = this.value("app5_b3_p1_c5", 50);
    const rate = (slow, fast) => slow * Math.pow(fast / slow, speed);
    const wave = (a, b, r1, r2, p1, p2) => Math.max(0, Math.min(1, .5 + a * Math.sin(2*Math.PI*r1*t+p1) + b * Math.sin(2*Math.PI*r2*t+p2)));
    const volume = wave(.31,.19,rate(.0028,.105),rate(.0017,.071),.8,2.2);
    const density = wave(.34,.16,rate(.0035,.137),rate(.0035,.137)*.61,1.7,4);
    const timbre = wave(.30,.20,rate(.0022,.089),rate(.0041,.151),2.7,.2);
    const stereo = Math.max(-1, Math.min(1, .64*Math.sin(2*Math.PI*rate(.0026,.123)*t+.35)+.36*Math.sin(2*Math.PI*rate(.0019,.081)*t+3.3)));
    this.motionVolume = 1 - this.value("app5_b3_p1_c1")*.82*Math.pow(1-volume,1.65); this.motionDensity = density; this.motionTimbre = timbre; this.motionStereo = stereo;
  }
  spawnArtifact(motion) {
    const density = this.value("app5_b2_p1_c2", 50), amount = this.value("app5_b2_p1_c5", 50)*.50;
    if (amount <= 0 || this.random() > density) return;
    const event = this.events.find(item => item.remaining <= 0); if (!event) return;
    const character = this.value("app5_b2_p1_c1", 50), size = this.value("app5_b2_p1_c3", 50);
    const pop = this.random() < .04 + size*.22 + Math.max(0,character-.72)*.16;
    event.length = Math.max(2, Math.round(sampleRate * ((pop ? 6+size*46 : .6+size*7.5) * (.55+this.random()*1.1))/1000));
    event.remaining = event.length; event.amp = (.20+this.random()*.80)*(pop ? (.55+size*.75) : (.24+(.22+character*.78)*.42))*amount;
    event.pan = Math.max(-.96, Math.min(.96, this.motionStereo*this.value("app5_b3_p1_c4")*.82 + (this.random()*2-1)*(.25+character*.55)*(1-this.value("app5_b3_p1_c4")*.35)));
    event.pop = pop; event.low = event.previous = 0; event.polarity = this.random()<.5?-1:1;
  }
  artifact() {
    const density = this.value("app5_b2_p1_c2", 50);
    if (this.random() < (.10 + Math.pow(density,1.75)*42) / sampleRate) this.spawnArtifact();
    let l=0,r=0, character=this.value("app5_b2_p1_c1",50), size=this.value("app5_b2_p1_c3",50), tone=this.value("app5_b2_p1_c4",50);
    for (const e of this.events) { if (e.remaining <= 0) continue; const j=e.length-e.remaining, x=j/Math.max(1,e.length-1); const env=e.pop?Math.exp(-x*(3+(1-size)*5.5)):Math.exp(-x*(8+(.22+character*.78)*15)); const n=this.random()*2-1; const coeff=.025+(1-Math.max(0,Math.min(1,tone+(this.motionTimbre-.5)*2*this.value("app5_b3_p1_c3")*.42)))*.16; e.low+=coeff*(n-e.low); const high=n-e.low; let s; if(character<.33)s=e.low*(.72+tone*.28); else if(character<.72)s=(j===0?e.polarity*(.7+this.random()*.3)*.65:0)+high*(.25+tone*.45)+e.low*.24; else { const d=high-e.previous; e.previous=high; s=d*(.55+tone*.55)+high*.18; } s=Math.tanh(s*e.amp*(e.pop?1.4:1))*env; const gl=Math.sqrt((1-e.pan)*.5),gr=Math.sqrt((1+e.pan)*.5); l+=s*gl;r+=s*gr;e.remaining--; }
    this.artifactL = l; this.artifactR = r;
  }
  process(_, outputs) {
    if (!this.active) return false;
    const out=outputs[0]; if(!out?.[0]||!out?.[1]) return true; const L=out[0],R=out[1];
    const color=this.value("app5_b1_p1_c1",50),tone=this.value("app5_b1_p1_c2",50),body=this.value("app5_b1_p1_c3",50),air=this.value("app5_b1_p1_c4",50),amount=this.value("app5_b1_p1_c5",50)*.2;
    const fast=.045+tone*.18, mid=.010+.035*(.25+tone*.75), slow=.0012+body*.0085, lowW=.24+(1-color)*.78+body*.34, midW=.38+(1-Math.abs(color-.48)*1.35)*.28+body*.16, highW=.10+color*.70+tone*.18, airW=air*(.08+tone*.18); const width=this.value("app5_b4_p1_c1",50), delay=this.value("app5_b4_p1_c2"), reverb=this.value("app5_b4_p1_c3"), distance=this.value("app5_b4_p1_c5"), motionDepth=this.value("app5_b4_p1_c4");
    for(let i=0;i<L.length;i++){ const t=(currentFrame+i)/sampleRate; this.motionAt(t); const wl=this.random()*2-1,wr=this.random()*2-1; this.fastL+=fast*(wl-this.fastL);this.fastR+=fast*(wr-this.fastR);this.midL+=mid*(wl-this.midL);this.midR+=mid*(wr-this.midR);this.slowL+=slow*(wl-this.slowL);this.slowR+=slow*(wr-this.slowR); const movingTone=Math.max(0,Math.min(1,tone+(this.motionTimbre-.5)*2*this.value("app5_b3_p1_c3")*.30)), movingColor=Math.max(0,Math.min(1,color+(this.motionTimbre-.5)*2*this.value("app5_b3_p1_c3")*.24)), open=.65+movingTone*.55, breath=.78+.1175*Math.sin(2*Math.PI*.075*t-.5)+.065*Math.sin(2*Math.PI*.029*t+1.1); let l=this.slowL*lowW+(this.midL-this.slowL)*midW+(this.fastL-this.midL)*(.16+movingTone*.34)+(wl-this.fastL)*highW*(.72+movingColor*.56)*open+(wl-this.fastL)*airW; let r=this.slowR*lowW+(this.midR-this.slowR)*midW+(this.fastR-this.midR)*(.16+movingTone*.34)+(wr-this.fastR)*highW*(.72+movingColor*.56)*open+(wr-this.fastR)*airW; l=Math.tanh(l*breath*(.78+body*.18))*amount*this.motionVolume;r=Math.tanh(r*breath*(.78+body*.18))*amount*this.motionVolume; this.artifact();l+=this.artifactL;r+=this.artifactR; const di=this.delayIndex, d1=(di-Math.floor((.071+.061*delay)*sampleRate)+this.delayL.length)%this.delayL.length,d2=(di-Math.floor((.143+.097*delay)*sampleRate)+this.delayL.length)%this.delayL.length; l+=this.delayR[d1]*(.10+.16*delay)+this.delayR[d2]*(.07+.12*delay);r+=this.delayL[d1]*(.10+.16*delay)+this.delayL[d2]*(.07+.12*delay); this.delayL[di]=l+this.delayL[di]*reverb*.08;this.delayR[di]=r+this.delayR[di]*reverb*.08;this.delayIndex=(di+1)%this.delayL.length; const direct=1-distance*.42; l*=direct;r*=direct; const pan=Math.max(-.97,Math.min(.97,this.motionStereo*this.value("app5_b3_p1_c4")*.72+Math.sin(2*Math.PI*(.010+.045*motionDepth)*t)*motionDepth*.5)); const pl=Math.sqrt((1-pan)*.5)*Math.SQRT2,pr=Math.sqrt((1+pan)*.5)*Math.SQRT2; const m=(l+r)*.5,s=(l-r)*.5*(.15+width*1.45);L[i]=Math.tanh((m+s)*pl);R[i]=Math.tanh((m-s)*pr); }
    return true;
  }
}
registerProcessor("interphace-live-noise", LiveNoiseProcessor);
