/* =====================================================================
   SOUND (synthesized with Web Audio — no audio files; reverb + compressor for punch)
   ===================================================================== */
const SE_KEY = 'nomige-se';
function impulse(ctx, dur, decay) {
  const len = Math.floor(ctx.sampleRate * dur);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
function sendOut(A, g, rv) {
  g.connect(A.o);
  if (rv) { const s = A.c.createGain(); s.gain.value = rv; g.connect(s); s.connect(A.r); }
}
function tone(A, t, o) {
  const c = A.c, osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.bend || o.d));
  if (o.det) osc.detune.value = o.det;
  let node = osc;
  if (o.lp) {
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = o.q || 1;
    fl.frequency.setValueAtTime(o.lp, t);
    if (o.lp2) fl.frequency.exponentialRampToValueAtTime(o.lp2, t + o.d);
    osc.connect(fl); node = fl;
  }
  const a = o.a || 0.005, peak = o.g || 0.2, d = o.d;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  if (o.sus) { const rel = Math.min(o.rel || 0.15, d - a - 0.01); g.gain.setValueAtTime(peak, t + d - rel); }
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  node.connect(g); sendOut(A, g, o.rv);
  if (o.vib) {
    const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibD || 6;
    l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + d + 0.05);
  }
  osc.start(t); osc.stop(t + d + 0.05);
}
function noise(A, t, o) {
  const c = A.c, src = c.createBufferSource();
  src.buffer = A.nb;
  const fl = c.createBiquadFilter(); fl.type = o.type || 'bandpass'; fl.Q.value = o.q || 1;
  fl.frequency.setValueAtTime(o.f || 1000, t);
  if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + o.d);
  const g = c.createGain(), a = o.a || 0.008;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.g || 0.2, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
  src.connect(fl); fl.connect(g); sendOut(A, g, o.rv);
  src.start(t, Math.random() * 1.5); src.stop(t + o.d + 0.05);
}
const kick = (A, t, g) => { tone(A, t, { type: 'sine', f: 165, f2: 42, bend: 0.2, d: 0.38, g: g || 0.9 }); noise(A, t, { d: 0.03, g: (g || 0.9) * 0.35, type: 'highpass', f: 3000 }); };
const snare = (A, t, g) => { noise(A, t, { d: 0.2, g: g || 0.45, type: 'bandpass', f: 1900, q: 0.7, rv: 0.15 }); tone(A, t, { type: 'triangle', f: 220, f2: 150, d: 0.12, g: (g || 0.45) * 0.5 }); };
const crash = (A, t, g) => noise(A, t, { d: 1.7, g: g || 0.3, type: 'highpass', f: 4500, rv: 0.5 });
const brass = (A, t, freqs, d, g, o) => { o = o || {}; freqs.forEach(f => [-9, 9].forEach(det => tone(A, t, { type: 'sawtooth', f, det, d, g: g || 0.08, a: 0.02, lp: o.lp || 900, lp2: o.lp2 || 2800, q: 1.3, sus: 1, rel: 0.14, rv: 0.25 }))); };
const sparkle = (A, t, n) => { const P = [2093, 2349.3, 2637, 3136, 3520, 4186, 4698.6]; for (let i = 0; i < n; i++) tone(A, t + i * 0.055 + Math.random() * 0.02, { type: 'triangle', f: P[Math.floor(Math.random() * P.length)], d: 0.35, g: 0.05, rv: 0.6 }); };
const harp = (A, t) => [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093].forEach((f, i) => tone(A, t + i * 0.045, { type: 'triangle', f, d: 0.7, g: 0.07, rv: 0.55 }));
const choir = (A, t, freqs, d, g) => freqs.forEach(f => [-11, 0, 11].forEach(det => tone(A, t, { type: 'sawtooth', f, det, d, g, a: 0.35, sus: 1, rel: 0.5, lp: 1900, lp2: 1100, q: 2, rv: 0.7, vib: 5, vibD: 3 })));
/* orchestral shock hit ("ガーン"): detuned saw + square cluster, driven, bright-to-dark filter sweep, long reverb tail */
function stab(A, t, freqs, d, g, o) {
  o = o || {};
  const c = A.c, fl = c.createBiquadFilter(), gg = c.createGain();
  fl.type = 'lowpass'; fl.Q.value = 1.4;
  fl.frequency.setValueAtTime(o.lp || 5000, t); fl.frequency.exponentialRampToValueAtTime(o.lp2 || 400, t + d);
  gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(g, t + 0.006);
  gg.gain.exponentialRampToValueAtTime(g * 0.4, t + Math.min(0.2, d * 0.5)); gg.gain.exponentialRampToValueAtTime(0.0001, t + d);
  let node = fl;
  if (o.drive) { const ws = c.createWaveShaper(); ws.curve = distCurve(o.drive); fl.connect(ws); node = ws; }
  node.connect(gg); sendOut(A, gg, o.rv == null ? 0.5 : o.rv);
  const per = 1 / (freqs.length * 2.5);
  freqs.forEach(f => [['sawtooth', -14, 1], ['sawtooth', 14, 1], ['square', 7, 0.5]].forEach(([type, det, lv]) => {
    const os = c.createOscillator(), og = c.createGain();
    os.type = type; os.frequency.value = f; os.detune.value = det; og.gain.value = per * lv;
    os.connect(og); og.connect(fl); os.start(t); os.stop(t + d + 0.05);
  }));
}
const timpani = (A, t, f, g) => { tone(A, t, { type: 'sine', f: f * 1.5, f2: f, bend: 0.05, d: 1.3, g: g || 0.9, rv: 0.4 }); noise(A, t, { d: 0.18, g: (g || 0.9) * 0.45, type: 'lowpass', f: 500, rv: 0.3 }); };
const thunder = (A, t) => { noise(A, t, { d: 0.14, g: 0.7, type: 'highpass', f: 1400 }); noise(A, t + 0.02, { d: 2.4, g: 0.6, type: 'lowpass', f: 1400, f2: 70, q: 0.3, rv: 0.4 }); kick(A, t, 1); };
/* demonic "ha-ha-ha": a sawtooth voice through vowel formants, pitched down each syllable, doubled an octave below */
function laugh(A, t) {
  const c = A.c;
  for (let i = 0; i < 5; i++) {
    const tt = t + i * 0.19, f = 190 - i * 14;
    [[1, 1], [0.5, 0.8]].forEach(([mul, lv]) => {
      [[750, 6, 3.8], [1200, 7, 2.5], [2500, 9, 1.0]].forEach(([ff, q, g]) => {
        const o = c.createOscillator(), bp = c.createBiquadFilter(), gg = c.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f * mul * 1.18, tt); o.frequency.exponentialRampToValueAtTime(f * mul, tt + 0.1);
        bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q;
        gg.gain.setValueAtTime(0.0001, tt); gg.gain.exponentialRampToValueAtTime(g * lv, tt + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.16);
        o.connect(bp); bp.connect(gg); sendOut(A, gg, 0.45);
        o.start(tt); o.stop(tt + 0.2);
      });
    });
    noise(A, tt, { d: 0.05, g: 0.12, type: 'bandpass', f: 1700, q: 0.8 });
  }
}
const heart = (A, t, g) => { tone(A, t, { type: 'sine', f: 78, f2: 40, bend: 0.09, d: 0.2, g: g || 1 }); tone(A, t + 0.17, { type: 'sine', f: 66, f2: 36, bend: 0.09, d: 0.24, g: (g || 1) * 0.75 }); };
const bellHit = (A, t, f, d, g) => { tone(A, t, { type: 'sine', f, d, g, rv: 0.6 }); tone(A, t, { type: 'sine', f: f * 2.76, d: d * 0.5, g: g * 0.45, rv: 0.6 }); tone(A, t, { type: 'sine', f: f * 5.4, d: d * 0.25, g: g * 0.25, rv: 0.6 }); };
const SOUNDS = {
  tap: (A, t) => tone(A, t, { type: 'sine', f: 520, f2: 1150, bend: 0.06, d: 0.1, g: 0.2 }),
  pop: (A, t) => tone(A, t, { type: 'sine', f: 700, f2: 1500, bend: 0.05, d: 0.08, g: 0.2 }),
  draw: (A, t) => { noise(A, t, { d: 0.32, g: 0.3, type: 'bandpass', f: 400, f2: 5200, q: 0.9 }); kick(A, t + 0.26, 0.7); brass(A, t + 0.26, [392, 523.25, 659.25], 0.32, 0.06, { lp: 1500, lp2: 3800 }); },
  cat_hit: (A, t) => { kick(A, t, 1); tone(A, t, { type: 'sawtooth', f: 98, d: 0.6, g: 0.2, lp: 700, lp2: 160 }); crash(A, t, 0.22); },
  cat_duel: (A, t) => [1, 1.48, 2.02, 2.74, 3.6].forEach((m, i) => tone(A, t, { type: 'sine', f: 175 * m, d: 2.4 - i * 0.3, g: 0.2 / (i + 1) + 0.03, rv: 0.5 })),
  cat_name: (A, t) => { brass(A, t, [293.66, 369.99, 440], 0.16, 0.08); brass(A, t + 0.19, [392, 493.88, 587.33], 0.5, 0.08); kick(A, t, 0.6); kick(A, t + 0.19, 0.8); },
  cat_all: (A, t) => { noise(A, t, { d: 1.4, g: 0.22, type: 'bandpass', f: 950, q: 0.4, a: 0.25, rv: 0.4 }); brass(A, t + 0.05, [261.63, 329.63, 392, 523.25], 0.8, 0.05); crash(A, t, 0.25); },
  cat_topic: (A, t) => { tone(A, t, { type: 'sine', f: 1318.5, d: 0.35, g: 0.28, rv: 0.3 }); tone(A, t + 0.28, { type: 'sine', f: 1046.5, d: 0.8, g: 0.28, rv: 0.3 }); },
  cat_rule: (A, t) => [0, 0.2].forEach(dt => { tone(A, t + dt, { type: 'sine', f: 100, f2: 46, bend: 0.3, d: 0.55, g: 0.9 }); noise(A, t + dt, { d: 0.14, g: 0.3, type: 'lowpass', f: 900 }); }),
  cat_app: (A, t) => [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => tone(A, t + i * 0.055, { type: 'square', f, d: 0.1, g: 0.07 })),
  cat_chal: (A, t) => { [0, 0.07, 0.14].forEach(dt => snare(A, t + dt, 0.28)); kick(A, t + 0.24, 1); crash(A, t + 0.24, 0.3); brass(A, t + 0.24, [523.25, 659.25, 783.99, 1046.5], 0.55, 0.07, { lp: 1600, lp2: 4200 }); },
  cat_safe: (A, t) => { sparkle(A, t, 10); tone(A, t, { type: 'triangle', f: 1568, d: 1, g: 0.12, rv: 0.6 }); tone(A, t + 0.1, { type: 'triangle', f: 2093, d: 1.1, g: 0.1, rv: 0.6 }); },
  tick: (A, t) => { tone(A, t, { type: 'square', f: 1900, d: 0.02, g: 0.11 }); noise(A, t, { d: 0.015, g: 0.14, type: 'highpass', f: 4000 }); },
  spin: (A, t) => { noise(A, t, { d: 1.1, g: 0.25, type: 'bandpass', f: 300, f2: 6000, q: 1.2, a: 0.6 }); tone(A, t, { type: 'sawtooth', f: 110, f2: 440, d: 1.1, g: 0.06, lp: 600, lp2: 3000 }); },
  devil: (A, t) => {
    thunder(A, t); brass(A, t + 0.05, [73.42, 77.78, 110, 146.83], 1.7, 0.12, { lp: 260, lp2: 1700 });
    choir(A, t + 0.1, [146.83, 174.61, 207.65], 2.4, 0.035); crash(A, t, 0.4);
    kick(A, t + 0.62, 1.1); kick(A, t + 0.8, 1.1); laugh(A, t + 0.95);
  },
  strike: (A, t) => { noise(A, t, { d: 0.09, g: 0.9, type: 'highpass', f: 2200 }); noise(A, t + 0.01, { d: 1.2, g: 0.45, type: 'lowpass', f: 1800, f2: 90, q: 0.4, rv: 0.3 }); kick(A, t, 0.9); },
  bats: (A, t) => { for (let i = 0; i < 14; i++) noise(A, t + i * 0.045 + Math.random() * 0.015, { d: 0.035, g: 0.1, type: 'bandpass', f: 900 + Math.random() * 900, q: 1.5 }); },
  angel: (A, t) => {
    crash(A, t, 0.3); bellHit(A, t, 1046.5, 2.4, 0.16); bellHit(A, t + 0.12, 1568, 2.2, 0.1);
    choir(A, t, [523.25, 659.25, 783.99, 1046.5], 3, 0.036); choir(A, t, [261.63], 3, 0.05);
    harp(A, t + 0.15); harp(A, t + 0.7); sparkle(A, t + 0.4, 18);
    noise(A, t, { d: 2.2, g: 0.16, type: 'bandpass', f: 600, f2: 5000, q: 0.5, a: 1.2, rv: 0.5 });
  },
  wings: (A, t) => [0, 0.34].forEach(dt => noise(A, t + dt, { d: 0.34, g: 0.2, type: 'bandpass', f: 500, f2: 1900, q: 0.7, a: 0.14, rv: 0.3 })),
  omen: (A, t) => { tone(A, t, { type: 'sawtooth', f: 520, f2: 38, bend: 0.42, d: 0.46, g: 0.2, lp: 2400, lp2: 160 }); noise(A, t, { d: 0.4, g: 0.25, type: 'lowpass', f: 3000, f2: 120 }); heart(A, t + 0.12, 0.9); },
  scratch: (A, t) => { noise(A, t, { d: 0.16, g: 1.2, type: 'bandpass', f: 3500, f2: 350, q: 2.2 }); tone(A, t, { type: 'sawtooth', f: 700, f2: 110, bend: 0.14, d: 0.16, g: 0.3, lp: 3000 }); noise(A, t + 0.18, { d: 0.12, g: 1, type: 'bandpass', f: 400, f2: 2800, q: 2.2 }); },
  twist: (A, t) => { noise(A, t, { d: 0.7, g: 0.35, type: 'lowpass', f: 300, f2: 2400, a: 0.6 }); tone(A, t + 0.6, { type: 'sawtooth', f: 116.5, d: 1.1, g: 0.14, lp: 900, lp2: 200 }); tone(A, t + 0.6, { type: 'sawtooth', f: 123.5, d: 1.1, g: 0.14, lp: 900, lp2: 200 }); kick(A, t + 0.6, 1); },
  heart: (A, t) => heart(A, t, 1),
  heaven: (A, t) => {
    brass(A, t, [523.25, 659.25, 783.99], 0.18, 0.08, { lp: 1800, lp2: 4000 }); brass(A, t + 0.2, [698.46, 880, 1046.5], 0.9, 0.08, { lp: 1800, lp2: 4000 });
    choir(A, t + 0.2, [698.46, 880, 1046.5], 1.4, 0.022); bellHit(A, t + 0.2, 2093, 1.4, 0.07); sparkle(A, t + 0.15, 14); kick(A, t + 0.2, 0.8); crash(A, t + 0.2, 0.25);
  },
  bigheaven: (A, t) => { SOUNDS.heaven(A, t); crash(A, t + 0.2, 0.4); noise(A, t + 0.2, { d: 1.6, g: 0.22, type: 'bandpass', f: 1200, q: 0.4, a: 0.1, rv: 0.4 }); harp(A, t + 0.5); SOUNDS.fanfare(A, t + 1.1); },
  /* 地獄「ガガーン！」: short hit, then the full hit 0.2 s later */
  hell: (A, t) => {
    const CH = [65.41, 98, 130.81, 155.56, 185, 261.63];
    stab(A, t, CH.slice(0, 5), 0.17, 0.55, { lp: 4500, lp2: 1400, drive: 3, rv: 0.3 });
    kick(A, t, 1); noise(A, t, { d: 0.1, g: 0.5, type: 'highpass', f: 1800 });
    const t2 = t + 0.2;
    stab(A, t2, CH, 2, 0.7, { lp: 6500, lp2: 280, drive: 3, rv: 0.75 });
    kick(A, t2, 1.3); timpani(A, t2, 55, 1); crash(A, t2, 0.5);
    noise(A, t2, { d: 0.3, g: 0.55, type: 'bandpass', f: 900, q: 0.6 });
    [32.7, 34.65, 49, 51.91].forEach(f => tone(A, t2, { type: 'triangle', f, d: 2.2, g: 0.22, rv: 0.5 }));
  },
  /* 大地獄「ガ・ガ・ガーーン！！」: two short hits, then a lower, heavier hit with thunder rumble */
  bighell: (A, t) => {
    const CH = [41.2, 55, 77.78, 110, 130.81, 155.56, 233.08];
    [0, 0.17].forEach(dt => { stab(A, t + dt, CH.slice(1, 6), 0.15, 0.55, { lp: 4200, lp2: 1200, drive: 4, rv: 0.3 }); kick(A, t + dt, 1.1); });
    const t2 = t + 0.36;
    stab(A, t2, CH, 3.2, 0.75, { lp: 7000, lp2: 170, drive: 5, rv: 0.85 });
    kick(A, t2, 1.4); timpani(A, t2, 41, 1.1); timpani(A, t2 + 0.5, 41, 0.6);
    tone(A, t2, { type: 'sine', f: 72, f2: 30, bend: 1.6, d: 2.6, g: 0.9 });
    crash(A, t2, 0.6); crash(A, t2 + 0.03, 0.4);
    noise(A, t2, { d: 3, g: 0.45, type: 'lowpass', f: 1600, f2: 60, q: 0.4, rv: 0.4 });
    [27.5, 29.14, 41.2, 43.65].forEach(f => tone(A, t2, { type: 'triangle', f, d: 3, g: 0.26, rv: 0.6 }));
    laugh(A, t + 2.9);
  },
  gulp: (A, t) => { [0, 0.13, 0.26].forEach((dt, i) => tone(A, t + dt, { type: 'sine', f: 480 - i * 40, f2: 170, d: 0.12, g: 0.3 })); tone(A, t + 0.45, { type: 'sine', f: 600, f2: 1300, bend: 0.05, d: 0.1, g: 0.22 }); },
  double: (A, t) => { kick(A, t, 1); snare(A, t, 0.5); crash(A, t, 0.3); brass(A, t, [196, 392, 587.33], 0.5, 0.09, { lp: 1200, lp2: 3500 }); },
  coin: (A, t) => { tone(A, t, { type: 'square', f: 988, d: 0.08, g: 0.12 }); tone(A, t + 0.08, { type: 'square', f: 1319, d: 0.4, g: 0.12, rv: 0.2 }); },
  ticket: (A, t) => { tone(A, t, { type: 'sine', f: 600, f2: 2000, bend: 0.3, d: 0.4, g: 0.15, rv: 0.4 }); sparkle(A, t + 0.2, 7); },
  poof: (A, t) => { noise(A, t, { d: 0.35, g: 0.25, type: 'bandpass', f: 2500, f2: 300, q: 0.8 }); tone(A, t, { type: 'sine', f: 900, f2: 300, d: 0.25, g: 0.12 }); },
  turn: (A, t) => { noise(A, t, { d: 0.3, g: 0.18, type: 'bandpass', f: 600, f2: 4000, q: 1 }); tone(A, t + 0.18, { type: 'sine', f: 880, d: 0.3, g: 0.18, rv: 0.35 }); tone(A, t + 0.32, { type: 'sine', f: 1318.5, d: 0.6, g: 0.18, rv: 0.35 }); snare(A, t + 0.18, 0.2); },
  select: (A, t) => { tone(A, t, { type: 'square', f: 660, d: 0.06, g: 0.08 }); tone(A, t + 0.07, { type: 'square', f: 990, d: 0.08, g: 0.08 }); },
  beep: (A, t) => tone(A, t, { type: 'sine', f: 880, d: 0.14, g: 0.28 }),
  go: (A, t) => { tone(A, t, { type: 'square', f: 1320, d: 0.35, g: 0.16 }); crash(A, t, 0.25); },
  buzz: (A, t) => tone(A, t, { type: 'sawtooth', f: 110, d: 0.6, g: 0.2, lp: 1200 }),
  drumroll: (A, t) => { const n = 44; for (let i = 0; i < n; i++) snare(A, t + i * 0.034, 0.08 + 0.32 * i / n); crash(A, t + n * 0.034, 0.4); kick(A, t + n * 0.034, 1); },
  fanfare: (A, t) => {
    [0, 0.13, 0.26].forEach(dt => brass(A, t + dt, [261.63, 329.63, 392], 0.11, 0.07, { lp: 1400, lp2: 3500 }));
    brass(A, t + 0.42, [349.23, 440, 523.25], 0.3, 0.07, { lp: 1400, lp2: 3500 });
    brass(A, t + 0.74, [392, 493.88, 587.33], 0.3, 0.07, { lp: 1400, lp2: 3500 });
    brass(A, t + 1.06, [523.25, 659.25, 783.99, 1046.5], 1.4, 0.07, { lp: 1600, lp2: 4200 });
    kick(A, t, 0.8); snare(A, t + 0.42, 0.4); snare(A, t + 0.74, 0.4); kick(A, t + 1.06, 1); crash(A, t + 1.06, 0.4); sparkle(A, t + 1.1, 12);
  },
  start: (A, t) => { SOUNDS.fanfare(A, t); },
  swoosh: (A, t) => noise(A, t, { d: 0.24, g: 0.22, type: 'bandpass', f: 3200, f2: 450, q: 0.9 }),
  bubuu: (A, t) => [0, 0.2].forEach((dt, i) => [196, 207.65].forEach(f => tone(A, t + dt, { type: 'square', f, d: i ? 0.6 : 0.16, g: 0.14, lp: 2400, sus: 1, rel: 0.05 }))),
  /* hi-lo */
  flip: (A, t) => { noise(A, t, { d: 0.09, g: 0.35, type: 'bandpass', f: 2200, f2: 6000, q: 0.9 }); noise(A, t + 0.07, { d: 0.04, g: 0.35, type: 'highpass', f: 2500 }); },
  deal: (A, t) => noise(A, t, { d: 0.18, g: 0.25, type: 'bandpass', f: 900, f2: 4200, q: 0.8 }),
  ding: (A, t) => { bellHit(A, t, 1318.5, 1.1, 0.16); bellHit(A, t + 0.09, 1975.5, 1.1, 0.12); sparkle(A, t + 0.05, 6); },
  roll: (A, t) => { for (let i = 0; i < 22; i++) snare(A, t + i * 0.034, 0.05 + 0.22 * i / 22); },
  /* bomb */
  tick2: (A, t) => { tone(A, t, { type: 'square', f: 2200, d: 0.03, g: 0.09 }); noise(A, t, { d: 0.03, g: 0.14, type: 'bandpass', f: 3000, q: 2 }); },
  tock: (A, t) => { tone(A, t, { type: 'square', f: 1500, d: 0.035, g: 0.09 }); noise(A, t, { d: 0.03, g: 0.12, type: 'bandpass', f: 1800, q: 2 }); },
  hiss: (A, t) => { noise(A, t, { d: 0.5, g: 0.4, type: 'highpass', f: 4000, a: 0.03 }); noise(A, t, { d: 0.35, g: 0.25, type: 'bandpass', f: 2500, q: 3 }); },
  ignite: (A, t) => { noise(A, t, { d: 0.1, g: 0.55, type: 'bandpass', f: 3500, q: 1.5 }); noise(A, t + 0.08, { d: 0.9, g: 0.32, type: 'highpass', f: 3000, a: 0.15 }); tone(A, t + 0.05, { type: 'sine', f: 200, f2: 900, d: 0.4, g: 0.14 }); },
  pass: (A, t) => { noise(A, t, { d: 0.18, g: 0.25, type: 'bandpass', f: 800, f2: 4000, q: 1 }); tone(A, t + 0.06, { type: 'sine', f: 660, f2: 1320, bend: 0.08, d: 0.12, g: 0.16 }); },
  /* card timer */
  hurry: (A, t) => { tone(A, t, { type: 'square', f: 1568, d: 0.08, g: 0.1 }); tone(A, t, { type: 'sine', f: 784, d: 0.14, g: 0.12 }); },
  timeup: (A, t) => {
    [0, 0.15, 0.3].forEach(dt => tone(A, t + dt, { type: 'square', f: 988, d: 0.1, g: 0.1 }));
    const t2 = t + 0.48;
    [196, 207.65, 98].forEach(f => tone(A, t2, { type: 'sawtooth', f, d: 1.1, g: 0.14, lp: 1600, lp2: 420, sus: 1, rel: 0.2 }));
    kick(A, t2, 1.1); snare(A, t2, 0.45); crash(A, t2, 0.45);
  },
  boom: (A, t) => {
    noise(A, t, { d: 0.12, g: 1, type: 'highpass', f: 1500 }); noise(A, t, { d: 2.8, g: 0.9, type: 'lowpass', f: 4000, f2: 50, q: 0.5, rv: 0.4 });
    kick(A, t, 1.4); tone(A, t, { type: 'sine', f: 80, f2: 22, bend: 1.5, d: 2, g: 0.9 }); crash(A, t, 0.6);
    for (let i = 0; i < 14; i++) noise(A, t + 0.15 + Math.random() * 1.4, { d: 0.05, g: 0.1 + Math.random() * 0.25, type: 'bandpass', f: 800 + Math.random() * 2500, q: 2 });
  },
};
const NO_DUCK = new Set(['tick', 'tap', 'pop', 'select', 'beep', 'heart', 'swoosh', 'coin', 'tick2', 'tock', 'deal', 'flip', 'pass', 'hiss', 'hurry']);
const SE = {
  on: true, A: null,
  init() { try { if (localStorage.getItem(SE_KEY) === '0') this.on = false; } catch (_) { /* ignore */ } },
  ensure() {
    if (!this.A) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        const c = new AC();
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.18;
        const lim = c.createDynamicsCompressor();
        lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
        const o = c.createGain(); o.gain.value = 0.95; o.connect(comp); comp.connect(lim); lim.connect(c.destination);
        const r = c.createConvolver(); r.buffer = impulse(c, 2.2, 2.8);
        const rg = c.createGain(); rg.gain.value = 0.32; r.connect(rg); rg.connect(o);
        const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.A = { c, o, r, nb };
      } catch (_) { this.A = null; return null; }
      BGM.sync();
    }
    if (this.A.c.state === 'suspended' && document.visibilityState !== 'hidden') { try { this.A.c.resume(); } catch (_) { /* ignore */ } }
    return this.A;
  },
  play(name, delay) {
    if (!this.on) return;
    const A = this.ensure(); if (!A) return;
    const f = SOUNDS[name]; if (!f) return;
    try { f(A, A.c.currentTime + 0.01 + (delay || 0)); } catch (_) { /* ignore */ }
    if (!NO_DUCK.has(name)) BGM.duck(delay || 0);
  },
  toggle() {
    this.on = !this.on;
    try { localStorage.setItem(SE_KEY, this.on ? '1' : '0'); } catch (_) { /* ignore */ }
    if (this.on) this.play('coin');
  },
};
function renderSE() {
  $('seBtn').setAttribute('aria-pressed', String(SE.on));
  $('seLabel').textContent = SE.on ? '効果音 ON' : '効果音 OFF';
  $('bgmBtn').setAttribute('aria-pressed', String(BGM.on));
  $('bgmLabel').textContent = BGM.on ? 'BGM ON' : 'BGM OFF';
}

/* =====================================================================
   BGM: a small step sequencer (16th-note steps, scheduled ~0.3 s ahead).
   Tracks: party (table), tension (roulette / tap duel), devil, angel. Crossfades on switch, ducks under loud SE.
   ===================================================================== */
const BGM_KEY = 'nomige-bgm';
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
function distCurve(k) { const n = 1024, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; cv[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return cv; }
const BI = {
  kick: (B, t, g) => tone(B, t, { type: 'sine', f: 150, f2: 44, bend: 0.11, d: 0.26, g }),
  hat: (B, t, g, open) => noise(B, t, { d: open ? 0.13 : 0.035, g, type: 'highpass', f: 7600 }),
  clap: (B, t, g) => { [0, 0.011, 0.022].forEach(dt => noise(B, t + dt, { d: 0.018, g: g * 0.7, type: 'bandpass', f: 1300, q: 0.9 })); noise(B, t + 0.03, { d: 0.14, g, type: 'bandpass', f: 1250, q: 0.7, rv: 0.25 }); },
  snare: (B, t, g) => { noise(B, t, { d: 0.14, g, type: 'bandpass', f: 1900, q: 0.6, rv: 0.12 }); tone(B, t, { type: 'triangle', f: 200, f2: 140, d: 0.08, g: g * 0.5 }); },
  bass: (B, t, m, d, g) => { tone(B, t, { type: 'sawtooth', f: mf(m), d, g, lp: 1100, lp2: 240, q: 4 }); tone(B, t, { type: 'sine', f: mf(m), d, g: g * 0.9 }); },
  pluck: (B, t, m, d, g) => tone(B, t, { type: 'square', f: mf(m), d, g, lp: 3400, lp2: 520, q: 1.2 }),
  lead: (B, t, m, d, g) => { tone(B, t, { type: 'square', f: mf(m), d, g, a: 0.01, lp: 4200, lp2: 1800, sus: 1, rel: 0.06, vib: 5.5, vibD: 5, rv: 0.22 }); tone(B, t, { type: 'triangle', f: mf(m + 12), d, g: g * 0.4, a: 0.01, sus: 1, rel: 0.06, rv: 0.22 }); },
  arp: (B, t, m, d, g) => tone(B, t, { type: 'triangle', f: mf(m), d, g, rv: 0.35 }),
  pad: (B, t, ms, d, g) => ms.forEach(m => [-9, 9].forEach(det => tone(B, t, { type: 'sawtooth', f: mf(m), det, d, g, a: Math.min(0.6, d * 0.3), sus: 1, rel: d * 0.25, lp: 1700, lp2: 900, q: 1, rv: 0.55 }))),
  bell: (B, t, m, d, g) => bellHit(B, t, mf(m), d, g),
  mallet: (B, t, m, g) => { tone(B, t, { type: 'sine', f: mf(m), d: 0.5, g, rv: 0.3 }); tone(B, t, { type: 'triangle', f: mf(m) * 2, d: 0.16, g: g * 0.3 }); tone(B, t, { type: 'sine', f: mf(m) * 4, d: 0.05, g: g * 0.3 }); },
  shaker: (B, t, g) => noise(B, t, { d: 0.05, g, type: 'bandpass', f: 9000, q: 1.2 }),
};
const PARTY_CH = [[41, [57, 60, 64]], [43, [55, 59, 62]], [40, [55, 59, 64]], [45, [57, 60, 64]]]; /* 王道進行 F-G-Em-Am */
const PARTY_MEL = [
  [[0, 72, 2], [2, 69, 2], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 74, 2], [14, 72, 2]],
  [[0, 74, 2], [2, 71, 2], [4, 74, 2], [6, 76, 2], [8, 77, 4], [12, 76, 2], [14, 74, 2]],
  [[0, 76, 3], [4, 71, 2], [6, 67, 2], [8, 71, 2], [10, 74, 2], [12, 76, 4]],
  [[0, 72, 2], [2, 76, 2], [4, 81, 4], [8, 79, 2], [10, 76, 2], [12, 74, 2], [14, 76, 2]],
];
const DEVIL_ROOT = [38, 39, 38, 37];
const DEVIL_PAD = [[50, 53, 57], [51, 55, 58], [50, 53, 57], [49, 52, 55]];
const ANGEL_CH = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
/* menu (title / setup / editor): G-D-Em-C, bouncy marimba hook */
const MENU_CH = [[43, [59, 62, 67]], [38, [57, 62, 66]], [40, [59, 64, 67]], [36, [60, 64, 67]]];
const MENU_MEL = [
  [[0, 74], [2, 79], [4, 74], [6, 71], [8, 74], [10, 76], [12, 74]],
  [[0, 69], [2, 74], [4, 78], [6, 76], [8, 74], [12, 69]],
  [[0, 71], [2, 76], [4, 79], [6, 78], [8, 76], [10, 74], [12, 71]],
  [[0, 72], [2, 76], [4, 79], [6, 81], [8, 79], [10, 76], [12, 74], [14, 71]],
];
const TRACKS = {
  party: { bpm: 128, steps: 128, vol: 0.85, fn(B, t, s, sd) {
    const bar = (s >> 4) & 3, st = s & 15, sec = (s >> 6) & 1, [root, ch] = PARTY_CH[bar];
    if (st % 4 === 0) BI.kick(B, t, 0.62);
    if (st === 4 || st === 12) BI.clap(B, t, 0.3);
    BI.hat(B, t, st % 4 === 2 ? 0.1 : 0.035, st % 4 === 2);
    if (st % 2 === 0) BI.bass(B, t, root + (st % 4 === 2 ? 12 : 0), sd * 1.7, 0.12);
    if (st === 2 || st === 6 || st === 10 || st === 14 || (st === 15 && bar === 3)) ch.forEach(m => BI.pluck(B, t, m, sd * 1.4, 0.034));
    if (sec === 0) { const n = PARTY_MEL[bar].find(x => x[0] === st); if (n) BI.lead(B, t, n[1], n[2] * sd * 0.9, 0.06); }
    else if (st % 2 === 0) BI.arp(B, t, ch[(st >> 1) % 3] + 12 + (st >= 8 ? 12 : 0), sd * 2.4, 0.05);
    if (s % 64 === 0) crash(B, t, 0.1);
  } },
  tension: { bpm: 150, steps: 32, vol: 0.85, fn(B, t, s, sd) {
    const bar = (s >> 4) & 1, st = s & 15;
    BI.bass(B, t, (bar ? 34 : 33) + (st % 4 === 0 ? 0 : 12), sd * 0.9, st % 4 === 0 ? 0.13 : 0.07);
    if (st % 4 === 0) BI.kick(B, t, 0.6);
    BI.hat(B, t, st % 2 ? 0.025 : 0.05, false);
    if (st === 4 || st === 12) BI.snare(B, t, 0.2);
    if (bar === 1 && st >= 12) BI.snare(B, t, 0.08 + (st - 12) * 0.05);
    if (st === 0 || st === 6 || st === 12) (bar ? [70, 74, 77] : [69, 72, 76]).forEach(m => BI.pluck(B, t, m, sd * 1.2, 0.028));
    if (s === 0) noise(B, t, { d: 32 * sd, g: 0.07, type: 'bandpass', f: 300, f2: 5000, q: 2, a: 30 * sd });
  } },
  devil: { bpm: 140, steps: 64, vol: 0.72, dist: 6, fn(B, t, s, sd) {
    const bar = (s >> 4) & 3, st = s & 15, r = DEVIL_ROOT[bar];
    if ([0, 3, 6, 8, 10, 11, 14].includes(st)) BI.bass(B.d, t, r + (st === 14 ? 12 : 0), sd * 1.4, 0.2);
    if ([0, 3, 8, 11].includes(st) || (bar === 3 && st >= 12)) BI.kick(B, t, 0.8);
    if (st === 4 || st === 12) BI.snare(B, t, 0.32);
    BI.hat(B, t, st % 2 ? 0.02 : 0.05, false);
    if (st === 0) { BI.pad(B, t, DEVIL_PAD[bar], sd * 16, 0.022); BI.bell(B, t, 74, 1.4, 0.05); BI.bell(B, t, 80, 1.4, 0.04); }
    if (st === 8 && bar % 2) BI.bell(B, t, 75, 0.9, 0.04);
  } },
  menu: { bpm: 116, steps: 128, vol: 0.8, fn(B, t, s, sd) {
    const bar = (s >> 4) & 3, st = s & 15, sec = (s >> 6) & 1, [root, ch] = MENU_CH[bar];
    if (st === 0 || st === 8 || (bar === 3 && st === 14)) BI.kick(B, t, 0.55);
    if (st === 4 || st === 12) BI.clap(B, t, 0.22);
    BI.shaker(B, t, st % 2 ? 0.03 : 0.05);
    if (st % 4 === 2) BI.hat(B, t, 0.06, true);
    if (st === 0 || st === 10) BI.bass(B, t, root + 12, sd * 3, 0.12);
    if (st === 6 || st === 14) BI.bass(B, t, root + 24, sd * 1.5, 0.09);
    if (st === 3 || st === 6 || st === 11 || st === 14) ch.forEach(m => BI.pluck(B, t, m, sd * 1.2, 0.026));
    if (sec === 0) { const n = MENU_MEL[bar].find(x => x[0] === st); if (n) BI.mallet(B, t, n[1], 0.09); }
    else if (st % 2 === 0) BI.mallet(B, t, ch[(st >> 1) % 3] + 12 + (st >= 8 ? 12 : 0), 0.06);
    if (s % 64 === 0) crash(B, t, 0.08);
  } },
  angel: { bpm: 84, steps: 64, vol: 0.9, fn(B, t, s, sd) {
    const bar = (s >> 4) & 3, st = s & 15, ch = ANGEL_CH[bar];
    if (st === 0) { BI.pad(B, t, ch, sd * 16.5, 0.024); BI.bell(B, t, ch[0] + 24, 2.2, 0.05); tone(B, t, { type: 'sine', f: mf(ch[0] - 24), d: sd * 16, g: 0.16, a: 0.3, sus: 1, rel: 0.6 }); }
    const seq = ch.concat(ch.map(m => m + 12), [ch[0] + 24]);
    BI.arp(B, t, seq[st % seq.length] + 12, sd * 3, 0.04);
    if (st % 4 === 2) BI.hat(B, t, 0.015, false);
  } },
};
const BGM = {
  on: true, want: null, cur: null, timer: 0, bus: null, busR: null, base: 1,
  init() { try { if (localStorage.getItem(BGM_KEY) === '0') this.on = false; } catch (_) { /* ignore */ } },
  play(name, delay) { this.want = name; this.delay = delay || 0; this.sync(); },
  stop() { this.want = null; this.sync(); },
  sync() {
    const A = SE.A; if (!A) return;
    const name = this.on && TRACKS[this.want] ? this.want : null;
    if ((this.cur ? this.cur.name : null) === name) return;
    if (this.cur) this.fade(this.cur);
    this.cur = null;
    if (!name) { clearInterval(this.timer); this.timer = 0; return; }
    const c = A.c, tr = TRACKS[name], now = c.currentTime;
    if (!this.bus) {
      this.bus = c.createGain(); this.bus.connect(A.o);
      this.busR = c.createGain(); this.busR.connect(A.r);
    }
    const g = c.createGain(), rg = c.createGain();
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(tr.vol * 0.62, now + 0.3);
    g.connect(this.bus); rg.connect(this.busR);
    const B = { c, o: g, r: rg, nb: A.nb };
    B.d = B;
    if (tr.dist) {
      const ws = c.createWaveShaper(), post = c.createGain();
      ws.curve = distCurve(tr.dist); ws.oversample = '2x'; post.gain.value = 0.42;
      ws.connect(post); post.connect(g);
      B.d = { c, o: ws, r: rg, nb: A.nb };
    }
    this.cur = { name, tr, B, g, rg, step: 0, next: now + 0.05 + (this.delay || 0), sd: 60 / tr.bpm / 4 };
    this.delay = 0;
    if (!this.timer) this.timer = setInterval(() => this.pump(), 50);
    this.pump();
  },
  fade(cur) {
    const t = SE.A.c.currentTime;
    try {
      cur.g.gain.cancelScheduledValues(t); cur.g.gain.setValueAtTime(cur.g.gain.value, t); cur.g.gain.linearRampToValueAtTime(0, t + 0.45);
      cur.rg.gain.setTargetAtTime(0, t + 0.3, 0.3);
    } catch (_) { /* ignore */ }
    setTimeout(() => { try { cur.g.disconnect(); cur.rg.disconnect(); } catch (_) { /* ignore */ } }, 3500);
  },
  pump() {
    const cur = this.cur, A = SE.A;
    if (!cur || !A || A.c.state !== 'running') return;
    const now = A.c.currentTime;
    if (cur.next < now - 0.1) cur.next = now + 0.03;
    while (cur.next < now + 0.3) {
      try { cur.tr.fn(cur.B, cur.next, cur.step % cur.tr.steps, cur.sd); } catch (_) { /* ignore */ }
      cur.next += cur.sd; cur.step++;
    }
  },
  level(v, tc) {
    this.base = v;
    if (!this.bus) return;
    const t = SE.A.c.currentTime;
    [this.bus, this.busR].forEach(n => { n.gain.cancelScheduledValues(t); n.gain.setTargetAtTime(v, t, tc || 0.08); });
  },
  duck(delay) {
    if (!this.bus || !this.cur) return;
    const t = SE.A.c.currentTime + (delay || 0), n = this.bus.gain;
    n.cancelScheduledValues(t); n.setTargetAtTime(this.base * 0.38, t, 0.03); n.setTargetAtTime(this.base, t + 0.9, 0.4);
  },
  toggle() {
    this.on = !this.on;
    try { localStorage.setItem(BGM_KEY, this.on ? '1' : '0'); } catch (_) { /* ignore */ }
    if (this.on) SE.ensure();
    this.sync();
  },
};
let bgmDelay = 0, resultIntro = false;
/* every screen has music: menu on title / setup / editor, party at the table, results start silent under the drumroll (party after the fanfare) */
function sceneBGM() {
  BGM.level(1);
  if (screen === 'game') BGM.play(wheel ? BGM.want : tap ? 'tension' : 'party', bgmDelay);
  else if (screen === 'result') { if (resultIntro) BGM.stop(); else BGM.play('party'); }
  else BGM.play('menu', bgmDelay);
  bgmDelay = 0; resultIntro = false;
}

/* =====================================================================
   FX: confetti, telop, flash, shake
   ===================================================================== */
const CONF = ['#ff4fa3', '#35e0ff', '#ffd83d', '#a8f03a', '#ff8b2b', '#b17cff', '#ffffff'];
const GOLD = ['#ffd83d', '#fff3b8', '#ffffff', '#ffb627'];
const FXC = {
  cv: null, cx: null, parts: [], raf: 0, w: 0, h: 0, dpr: 1,
  size() {
    if (!this.cv) { this.cv = $('fxCanvas'); this.cx = this.cv.getContext('2d'); }
    const r = $('shell').getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1); this.w = r.width; this.h = r.height;
    this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
  },
  add(p) { this.parts.push(p); if (!this.raf) this.raf = requestAnimationFrame(() => this.loop()); },
  burst(x, y, n, o) {
    o = o || {}; if (!this.w) this.size();
    if (reduceMotion) n = Math.min(n, 10);
    const cols = o.colors || CONF;
    for (let i = 0; i < n; i++) {
      const a = (o.angle == null ? -Math.PI / 2 : o.angle) + (Math.random() - 0.5) * (o.spread == null ? Math.PI * 1.7 : o.spread);
      const v = (o.speed || 10) * (0.4 + Math.random() * 0.8);
      this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g == null ? 0.3 : o.g, w: 6 + Math.random() * 7, h: 4 + Math.random() * 6,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.45, c: cols[i % cols.length], life: 1, decay: 0.006 + Math.random() * 0.008, star: !!o.star && Math.random() < 0.6 });
    }
  },
  rain(n, cols) {
    if (!this.w) this.size();
    if (reduceMotion) n = Math.min(n, 16);
    for (let i = 0; i < n; i++) this.add({ x: Math.random() * this.w, y: -20 - Math.random() * this.h * 0.5, vx: (Math.random() - 0.5) * 2.5, vy: 2 + Math.random() * 3, g: 0.07,
      w: 6 + Math.random() * 7, h: 4 + Math.random() * 6, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, c: (cols || CONF)[i % (cols || CONF).length], life: 1, decay: 0.003, star: false });
  },
  loop() {
    const cx = this.cx, P = this.parts;
    cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    cx.clearRect(0, 0, this.w, this.h);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.vx *= 0.985; p.vy = p.vy * 0.985 + p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= p.decay;
      if (p.life <= 0 || p.y > this.h + 40) { P.splice(i, 1); continue; }
      cx.save(); cx.globalAlpha = Math.min(1, p.life * 1.6); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      if (p.star) {
        cx.beginPath();
        for (let k = 0; k < 10; k++) { const rr = k % 2 ? p.w * 0.45 : p.w; const a = k * Math.PI / 5; cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        cx.closePath(); cx.fill();
      } else cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 1.3)) + 1);
      cx.restore();
    }
    if (P.length) this.raf = requestAnimationFrame(() => this.loop());
    else { this.raf = 0; cx.clearRect(0, 0, this.w, this.h); }
  },
};
function relPos(el) {
  const a = $('shell').getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2, w: r.width, h: r.height };
}
function telop(html, cls, ms) {
  const el = document.createElement('div');
  el.className = 'telop ' + (cls || '');
  el.innerHTML = html;
  if (ms) el.style.setProperty('--t', ms + 'ms');
  $('telopLayer').appendChild(el);
  setTimeout(() => el.remove(), (ms || 1500) + 60);
}
function flash(color) {
  if (reduceMotion) return;
  const f = $('flash'); f.style.setProperty('--fl', color || '#ffffff');
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}
function shake(big) {
  if (reduceMotion) return;
  const a = $('shell');
  a.classList.remove('shake', 'shake-big'); void a.offsetWidth; a.classList.add(big ? 'shake-big' : 'shake');
  setTimeout(() => a.classList.remove('shake', 'shake-big'), big ? 1050 : 500);
}
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) { /* ignore */ } }

/* =====================================================================
   GAME
   ===================================================================== */
const GAME_KEY = 'nomige-game', NAMES_KEY = 'nomige-names', RETURN_KEY = 'nomige-return';
const ROLE_ORDER = ['引いた人', 'ランダム', '左隣', '右隣'];
const ROUND_OPTS = [3, 5, 10, 0];
const SCREENS = ['title', 'setup', 'game', 'result', 'editor'];
const CAT_SOUND = { hit: 'cat_hit', duel: 'cat_duel', name: 'cat_name', all: 'cat_all', topic: 'cat_topic', rule: 'cat_rule', app: 'cat_app', safe: 'cat_safe', chal: 'cat_chal' };
let screen = 'title';
let G = null;
const setup = { count: 4, names: [], rounds: 3, loaded: false, coach: null };
let sheet = null, multi = null, wheel = null, tap = null, picking = null, zoom = null;
let wakeLock = null, lastFocus = null, spotRot = 0;

const pc = i => 'var(--p' + ((i % 8) + 1) + ')';
const fmtAmt = x => String(Math.round(x * 10) / 10);
const halfOf = x => (x <= 0.5 ? x : Math.ceil(x) / 2);
const freshPending = () => ({ mult: 1, half: false, from: null, src: '' });
const pname = i => G.players[i].name;
const hasDur = (p, fx) => G.players[p].hand.some(h => h.kind === 'dur' && h.fx === fx);
const ticketsOf = (p, fx) => G.players[p].hand.filter(h => h.kind === 'ticket' && (!fx || h.fx === fx));
const pendingActive = () => G.pending.mult !== 1 || G.pending.half;
const immuneTo = p => G.pending.from != null && hasDur(p, 'nodouble');
const pendingApplies = p => pendingActive() && G.pending.from !== p && !immuneTo(p);
const anyDur = () => G.players.some(pl => pl.hand.some(h => h.kind === 'dur'));

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function eligibleCards(n) { return deck.cards.filter(c => { const cat = catOf(c.cat); return c.on && cat && cat.on && c.min <= n && c.text.trim(); }); }
function saveGame() { try { if (G && !G.done) sessionStorage.setItem(GAME_KEY, JSON.stringify(G)); else sessionStorage.removeItem(GAME_KEY); } catch (_) { /* ignore */ } }
function loadGame() { try { const s = sessionStorage.getItem(GAME_KEY); return s ? JSON.parse(s) : null; } catch (_) { return null; } }
const validGame = g => !!(g && Array.isArray(g.players) && g.players.length >= 2 && g.cur && typeof g.turn === 'number' && g.pending);
function normalizeGame(g) {
  if (!validGame(g)) return null;
  g.players.forEach(p => { p.hand = Array.isArray(p.hand) ? p.hand : []; p.hand.forEach(h => { delete h.fresh; }); ['total', 'times', 'dbl', 'hh', 'cospa'].forEach(k => { p[k] = Number(p[k]) || 0; }); });
  g.uid = g.uid || 1;
  g.stats = Object.assign({ cards: 0, devil: 0, angel: 0, hh: 0 }, g.stats || {});
  const c = g.cur;
  c.select = null;
  c.used = Array.isArray(c.used) ? c.used : [];
  c.drinks = Array.isArray(c.drinks) && c.drinks.every(e => typeof e.snap === 'string' && e.kind) ? c.drinks : [];
  if (c.pickDone === undefined) c.pickDone = null;
  g.hist = Array.isArray(g.hist) ? g.hist.filter(h => typeof h === 'string').slice(-HIST_MAX) : [];
  g.pile = Array.isArray(g.pile) ? g.pile : [];
  g.recent = Array.isArray(g.recent) ? g.recent : [];
  delete g.rules;
  return g;
}
async function requestWake() {
  try {
    if (navigator.wakeLock && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      if (wakeLock && wakeLock.addEventListener) wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (_) { wakeLock = null; }
}
function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch (_) { /* ignore */ } wakeLock = null; }

/* opaque full-screen overlays: while one is up, the screen and the spinning background under it stop being drawn (see .app.covered) */
const FULL_OV = ['wheelOv', 'chalOv', 'bombOv', 'tapOv', 'timerOv', 'howOv'];
let coverTimer = 0;
function syncCover() {
  const on = FULL_OV.some(id => !$(id).hidden);
  clearTimeout(coverTimer);
  if (on) coverTimer = setTimeout(() => { if (FULL_OV.some(id => !$(id).hidden)) $('shell').classList.add('covered'); }, 260);
  else $('shell').classList.remove('covered');
}
function openOv(id) {
  if (!document.querySelector('.ov:not([hidden])')) lastFocus = document.activeElement;
  $(id).hidden = false;
  syncCover();
  coachQueue();
}
function closeOv(id) {
  $(id).hidden = true;
  syncCover();
  coachQueue();
  if (!document.querySelector('.ov:not([hidden])') && lastFocus && document.contains(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch (_) { /* ignore */ } }
}
function closeAllOverlays() {
  if (picking) { clearTimeout(picking.timer); picking = null; }
  if (tap) { tap.timers.forEach(clearTimeout); tap = null; }
  if (wheel) { if (wheel.raf) cancelAnimationFrame(wheel.raf); (wheel.timers || []).forEach(clearTimeout); }
  if (chal) { if (chal.raf) cancelAnimationFrame(chal.raf); chal.timers.forEach(clearTimeout); }
  if (bomb) { if (bomb.raf) cancelAnimationFrame(bomb.raf); bomb.timers.forEach(clearTimeout); }
  if (timer) stopTimerWork(timer);
  wheel = null; sheet = null; multi = null; zoom = null; chal = null; bomb = null; timer = null;
  document.querySelectorAll('.ov').forEach(o => { o.hidden = true; });
  syncCover();
}
function showScreen(name) {
  screen = SCREENS.includes(name) ? name : 'title';
  for (const s of SCREENS) $('scr-' + s).hidden = s !== screen;
  if (screen === 'title') renderTitle();
  else if (screen === 'setup') renderSetup(true);
  else if (screen === 'game') renderGame();
  else if (screen === 'result') renderResult();
  else if (screen === 'editor') renderAll(true);
  if (coach.on) coachQueue();
  sceneBGM();
}

/* ---------- title & setup ---------- */
function renderTitle() {
  $('resumeBtn').hidden = !(validGame(G) && !G.done);
  $('howBtn').classList.toggle('first', !lsGet(GUIDE_SEEN_KEY));
}
function loadSetup() {
  if (setup.loaded) return;
  setup.loaded = true;
  try {
    const s = JSON.parse(localStorage.getItem(NAMES_KEY) || 'null');
    if (s && Array.isArray(s.names)) {
      setup.names = s.names.slice(0, 8).map(String);
      if (s.count >= 2 && s.count <= 8) setup.count = s.count;
      if (ROUND_OPTS.includes(s.rounds)) setup.rounds = s.rounds;
    }
  } catch (_) { /* ignore */ }
}
function renderSetup(full) {
  let h = '';
  for (let n = 2; n <= 8; n++) h += '<button type="button" id="cnt-' + n + '" data-cnt="' + n + '" aria-pressed="' + (setup.count === n) + '" aria-label="' + n + '人">' + n + '</button>';
  $('countGrid').innerHTML = h;
  $('roundGrid').innerHTML = ROUND_OPTS.map(r => '<button type="button" id="rnd-' + r + '" data-rnd="' + r + '" aria-pressed="' + (setup.rounds === r) + '">' + (r ? r + '周' : '∞') + '</button>').join('');
  if (full) {
    $('nameList').innerHTML = Array.from({ length: setup.count }, (_, i) =>
      '<label class="nm-row" style="--p:' + pc(i) + '"><span class="nm-idx" aria-hidden="true">' + (i + 1) + '</span>' +
      '<input class="nm-in" id="pname-' + i + '" data-i="' + i + '" maxlength="8" autocomplete="off" enterkeyhint="next" placeholder="プレイヤー' + (i + 1) + '" value="' + esc(setup.names[i] || '') + '" aria-label="' + (i + 1) + '人目の名前"></label>').join('');
  }
  if (setup.coach == null) setup.coach = lsGet(COACH_KEY) !== 'done';
  $('coachOpt').checked = !!setup.coach;
  const pool = eligibleCards(setup.count).length;
  const info = $('setupInfo');
  info.classList.toggle('bad', pool === 0);
  info.innerHTML = pool
    ? '使えるカード <b>' + pool + '</b> 枚 ・ ' + (setup.rounds ? setup.rounds + '周で <b>' + setup.rounds * setup.count + '</b> ターン' : '「終了」を押すまで続く（カードは毎回ランダム）')
    : 'この人数で使えるカードがありません。カード編集でONにしてね';
  $('startGame').disabled = pool === 0;
}
function beginGame() {
  const n = setup.count;
  if (!eligibleCards(n).length) { renderSetup(false); return; }
  const names = Array.from({ length: n }, (_, i) => String(setup.names[i] || '').trim() || 'プレイヤー' + (i + 1));
  try { localStorage.setItem(NAMES_KEY, JSON.stringify({ count: n, names: setup.names.slice(0, 8), rounds: setup.rounds })); } catch (_) { /* ignore */ }
  G = {
    v: 2, rounds: setup.rounds, turn: 0, pile: [], cur: null, pending: freshPending(), last: null, done: false, uid: 1, hist: [],
    stats: { cards: 0, devil: 0, angel: 0, hh: 0 },
    players: names.map(name => ({ name, total: 0, times: 0, dbl: 0, hh: 0, cospa: 0, hand: [] })),
  };
  startTurn();
  saveGame();
  if (setup.coach) coachStart(); else coachEnd(false);
  bgmDelay = 2.6;
  showScreen('game');
  SE.play('start');
  telop('ゲームスタート！', '', 1600);
  FXC.rain(90);
  requestWake();
  setTimeout(() => { if (screen === 'game') turnFx(); }, 1500);
}

/* ---------- turn flow ---------- */
function startTurn() {
  const n = G.players.length;
  G.cur = { drawer: G.turn % n, phase: 'before', card: null, names: null, cospa: false, used: [], drinks: [], hhFreeDone: false, swapDone: false, giveDone: false, pickDone: null, chalDone: false, bombDone: false, select: null };
}
function turnFx() {
  const d = G.cur.drawer;
  telop('<span style="color:' + pc(d) + '">' + esc(pname(d)) + '</span>のターン！', 'white sm', 1300);
  SE.play('turn');
}
function ruleTurns(dur, n) {
  const m = /(\d+)\s*周/.exec(dur);
  if (m) return Math.max(1, Number(m[1])) * n;
  const t = /(\d+)\s*ターン/.exec(dur);
  if (t) return Math.max(1, Number(t[1]));
  return n;
}
const fillGame = text => esc(text).replace(TAG_RE, (_, k) => { const i = G.cur.names[k]; return '<span class="pn" style="--p:' + pc(i) + '">' + esc(pname(i)) + '</span>'; });
const plainFill = text => text.replace(TAG_RE, (_, k) => pname(G.cur.names[k]));
function snap() {
  const c = G.cur;
  return JSON.stringify({ players: G.players, pending: G.pending, last: G.last, stats: G.stats, uid: G.uid,
    cur: { used: c.used, cospa: c.cospa, hhFreeDone: c.hhFreeDone, swapDone: c.swapDone, giveDone: c.giveDone, pickDone: c.pickDone, chalDone: !!c.chalDone, bombDone: !!c.bombDone } });
}
function restoreSnap(s) { const o = JSON.parse(s); G.players = o.players; G.pending = o.pending; G.last = o.last; G.stats = o.stats; G.uid = o.uid; Object.assign(G.cur, o.cur); }
function giveItem(p, item) { item.uid = G.uid++; item.fresh = true; G.players[p].hand.push(item); return item; }
function ticket(fx, label, extra) { return Object.assign({ kind: 'ticket', fx, label, text: label, left: 0, mark: label.slice(0, 1), color: 11 }, extra || {}); }

function drawCard() {
  const cur = G.cur;
  if (cur.phase !== 'before' || picking) return;
  const n = G.players.length;
  const pool = eligibleCards(n);
  if (!pool.length) return;
  let card = null;
  if (!G.rounds) {
    /* ∞: every card goes back into the deck, so each draw is random from the whole deck —
       only the last few cards drawn are kept out, so the same card never comes twice in a row */
    const recent = Array.isArray(G.recent) ? G.recent : [];
    const keep = Math.min(3, Math.floor((pool.length - 1) / 2));
    const out = new Set(keep ? recent.slice(-keep) : []);
    const cand = pool.filter(c => !out.has(c.id));
    const from = cand.length ? cand : pool;
    card = from[Math.floor(Math.random() * from.length)];
    G.recent = recent.concat(card.id).slice(-3);
  } else {
    /* a set number of rounds: go through a shuffled deck, so no card repeats until it runs out */
    const byId = new Map(pool.map(c => [c.id, c]));
    while (!card && G.pile.length) card = byId.get(G.pile.pop()) || null;
    if (!card) { G.pile = shuffle(pool.map(c => c.id)); card = byId.get(G.pile.pop()); }
  }
  const d = cur.drawer;
  let r = Math.floor(Math.random() * (n - 1)); if (r >= d) r++;
  const cat = catOf(card.cat);
  cur.card = { id: card.id, cat: card.cat, text: card.text, cups: card.cups.slice(), dur: card.dur, note: card.note, fx: card.fx || null, catName: catName(cat), mark: catMark(cat), color: cat ? cat.color : 6 };
  cur.names = { '引いた人': d, '左隣': (d + 1) % n, '右隣': (d - 1 + n) % n, 'ランダム': r };
  cur.phase = 'drawn';
  G.stats.cards++;
  const fx = card.fx, gifts = [];
  if (fx === 'x2next') { G.pending.mult = Math.min(64, G.pending.mult * 2); G.pending.from = null; G.pending.src = 'カードの効果'; }
  if (fx === 'halfnext') { G.pending.half = true; if (!G.pending.src) G.pending.src = 'カードの効果'; }
  if (card.dur) gifts.push([d, giveItem(d, { kind: 'dur', fx: fx === 'half' || fx === 'nodouble' ? fx : null, label: '継続', text: plainFill(card.text), left: ruleTurns(card.dur, n), mark: cur.card.mark, color: cur.card.color })]);
  if (fx === 'safe') gifts.push([d, giveItem(d, ticket('avoid', 'セーフ券'))]);
  if (fx === 'push') gifts.push([d, giveItem(d, ticket('push', '押し付け券', { target: r, text: '押し付け券（→' + pname(r) + '）' }))]);
  if (fx === 'heavenpass') gifts.push([d, giveItem(d, ticket('heavenpass', '天国パス'))]);
  if (fx === 'freecospa') gifts.push([d, giveItem(d, ticket('freecospa', 'コスパ無料券'))]);
  let restNote = '';
  if (fx === 'rest') {
    const vals = G.players.map(p => p.total), mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
    if (mx > mn) G.players.forEach((p, i) => { if (p.total === mx) gifts.push([i, giveItem(i, ticket('avoid', '休憩券'))]); });
    else restNote = '全員同じ杯数なので該当なし';
  }
  saveGame();
  renderGame();
  openZoom(true);
  SE.play('draw');
  SE.play(CAT_SOUND[card.cat] || 'cat_name', 0.42);
  vibrate(40);
  const cCol = getComputedStyle($('zoomOv')).getPropertyValue('--cc').trim() || '#ffd83d';
  setTimeout(() => {
    if (!zoom) return;
    const p = relPos($('zCard'));
    if (card.cat === 'safe') FXC.burst(p.x, p.y, 80, { colors: GOLD, star: true, speed: 14 });
    else FXC.burst(p.x, p.y - p.h * 0.2, 46, { colors: [cCol, '#ffffff', '#ffd83d', cCol], speed: 12 });
  }, 420);
  if (gifts.length) afterZoom(() => setTimeout(() => flyGifts(gifts), 120));
  if (restNote) afterZoom(() => setTimeout(() => telop(restNote, 'white sm', 1400), 200));
}

/* ---------- card zoom (full-screen view of the drawn card) ---------- */
function cardInner(c) {
  return '<div class="gc-band"><span class="gc-mark">' + esc(c.mark) + '</span><span class="gc-cat">' + esc(c.catName) + '</span><span class="gc-no">' + fmtNo(c.id) + '</span></div>' +
    '<div class="gc-body"><p class="gc-text">' + fillGame(c.text) + '</p>' + (c.note ? '<p class="gc-note">' + fillGame(c.note) + '</p>' : '') + '</div>' +
    '<div class="gc-foot"><span>' + (c.dur ? '<span class="gc-dur">継続 ' + esc(c.dur) + '</span>' : isChal(c.fx) ? '<span class="gc-dur ch">チャレンジ</span>' : timerTag(c)) + '</span>' + gameCups(c) + '</div>';
}
function cardActs() {
  const cur = G.cur, fx = cur.card && cur.card.fx, acts = [];
  if (fx === 'bomb' && !cur.bombDone) acts.push(['bomb', '爆弾パス回しスタート！', 'pink']);
  if (isChal(fx) && !cur.chalDone) acts.push(['chal', CHAL[fx] ? CHAL[fx].title + 'に挑戦！' : 'チャレンジ抽選！', 'cyan']);
  if (fx === 'pick' && cur.pickDone == null) acts.push(['pick', 'ルーレットで決める！', 'cyan']);
  if (fx === 'tap') acts.push(['tap', '早押し対決スタート！', 'cyan']);
  if (fx === 'hh' && !cur.hhFreeDone) acts.push(['hhfree', '天国と地獄を回す！', 'cyan']);
  if (fx === 'swap' && !cur.swapDone) acts.push(['swap', '入れ替える相手を選ぶ', 'cyan']);
  if (fx === 'givesafe' && !cur.giveDone) acts.push(['give', 'セーフ券を渡す', 'lime']);
  if (fx === 'endrule' && anyDur()) acts.push(['endrule', 'ルールを終わらせる', 'lime']);
  const tm = timerOf(cur.card);
  if (tm) acts.push(['timer', tm.stop ? fmtSec(tm.sec) + 'ストップ対決！' : fmtSec(tm.sec) + 'タイマー スタート！', 'cyan']);
  return acts;
}
function afterZoom(fn) { if (zoom) zoom.after.push(fn); else fn(); }
function openZoom(entry) {
  if (!G || G.cur.phase !== 'drawn' || !G.cur.card || zoom) return;
  const c = G.cur.card, ov = $('zoomOv'), card = $('zCard');
  zoom = { after: [] };
  ov.style.setProperty('--c', colorVar(c.color));
  ov.style.setProperty('--cc', getComputedStyle(document.documentElement).getPropertyValue('--c' + (Number(c.color) || 6)).trim());
  ov.classList.remove('closing');
  ov.classList.toggle('entry', !!entry);
  $('zStamp').innerHTML = '<span class="z-mark">' + esc(c.mark) + '</span>' + esc(c.catName) + (entry ? '！' : '');
  card.innerHTML = cardInner(c);
  card.className = 'gcard zcard' + (entry && !reduceMotion ? ' zin' : '');
  const acts = cardActs();
  $('zActs').innerHTML = acts.map(a => '<button type="button" class="pbtn ' + a[2] + ' small" data-z="' + a[0] + '">' + a[1] + '</button>').join('') +
    '<button type="button" class="pbtn ' + (acts.length ? 'white small' : 'big') + ' z-ok" data-z="ok">OK！ テーブルへ</button>';
  openOv('zoomOv');
  sizeZoom();
  if (!entry && !reduceMotion) {
    const from = document.querySelector('#center .gcard');
    if (from) {
      const a = card.getBoundingClientRect(), b = from.getBoundingClientRect();
      card.animate([{ transform: 'translate(' + ((b.left + b.width / 2) - (a.left + a.width / 2)) + 'px,' + ((b.top + b.height / 2) - (a.top + a.height / 2)) + 'px) scale(' + (b.width / a.width) + ')' }, { transform: 'none' }],
        { duration: 300, easing: 'cubic-bezier(.2,1.3,.4,1)' });
    }
    SE.play('swoosh');
  }
  const ok = ov.querySelector('.z-ok'); if (ok) ok.focus({ preventScroll: true });
}
function sizeZoom() {
  if (!zoom) return;
  const ov = $('zoomOv'), card = $('zCard');
  const W = ov.clientWidth, H = ov.clientHeight;
  if (!W || !H) return;
  const avail = H - $('zStamp').offsetHeight - $('zActs').offsetHeight - $('zHint').offsetHeight - 58;
  const cw = Math.max(140, Math.min(W - 36, avail * 0.72, 560));
  card.style.setProperty('--cw', cw.toFixed(1) + 'px');
  card.style.setProperty('--ch', (cw / 0.72).toFixed(1) + 'px');
  fitText(card.querySelector('.gc-body'), cw, Math.min(46, cw * 0.105));
}
function closeZoom(then) {
  if (!zoom) return;
  const z = zoom; zoom = null;
  if (then) z.after.unshift(then);
  const ov = $('zoomOv'), card = $('zCard');
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    closeOv('zoomOv'); ov.classList.remove('closing');
    z.after.forEach(f => { try { f(); } catch (_) { /* ignore */ } });
  };
  const to = document.querySelector('#center .gcard');
  if (reduceMotion || !to) { done(); return; }
  const a = card.getBoundingClientRect(), b = to.getBoundingClientRect();
  card.classList.remove('zin');
  ov.classList.add('closing');
  SE.play('swoosh');
  const an = card.animate([{ transform: 'none' }, { transform: 'translate(' + ((b.left + b.width / 2) - (a.left + a.width / 2)) + 'px,' + ((b.top + b.height / 2) - (a.top + a.height / 2)) + 'px) scale(' + (b.width / a.width) + ')' }],
    { duration: 300, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
  an.onfinish = () => { done(); an.cancel(); };
  setTimeout(() => { if (!finished) { try { an.cancel(); } catch (_) { /* ignore */ } done(); } }, 700);
}
function flyGifts(gifts) {
  const gc = document.querySelector('#center .gcard') || $('center');
  const from = relPos(gc);
  gifts.forEach(([p, item], k) => {
    const seat = document.querySelector('.seat[data-seat="' + p + '"]');
    if (!seat) { delete item.fresh; return; }
    const to = relPos(seat);
    const el = document.createElement('div');
    el.className = 'flyer';
    el.style.setProperty('--c', item.kind === 'ticket' ? 'var(--yellow)' : colorVar(item.color));
    el.textContent = item.mark;
    el.style.left = (from.x - 17) + 'px'; el.style.top = (from.y - 23) + 'px';
    $('shell').appendChild(el);
    const dx = to.x - from.x + 20, dy = to.y - from.y - 20;
    const anim = el.animate([
      { transform: 'translate(0,0) scale(1.6) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 70) + 'px) scale(1.3) rotate(200deg)', opacity: 1, offset: 0.5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.5) rotate(380deg)', opacity: 1 },
    ], { duration: reduceMotion ? 200 : 750, delay: k * 150, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    SE.play('pop', k * 0.15);
    anim.onfinish = () => {
      el.remove();
      delete item.fresh;
      saveGame();
      renderSeats();
      layoutTable();
      const s2 = document.querySelector('.seat[data-seat="' + p + '"]');
      if (s2) { s2.classList.add('bump'); const q = relPos(s2); FXC.burst(q.x, q.y, 18, { colors: GOLD, speed: 6, star: true }); }
      SE.play('ticket');
      if (k === gifts.length - 1) telop(item.kind === 'ticket' ? esc(item.label) + ' GET！' : '手札に追加！', 'lime sm', 1100);
    };
  });
}
function useCospa() {
  const cur = G.cur, d = cur.drawer;
  if (cur.phase !== 'before' || cur.cospa || picking) return;
  const s = snap();
  const free = ticketsOf(d, 'freecospa')[0];
  cur.cospa = true;
  if (!cur.used.includes(d)) cur.used.push(d);
  G.players[d].cospa++;
  let amt = 1;
  if (free) { G.players[d].hand = G.players[d].hand.filter(h => h !== free); amt = 0; }
  addDrink(d, amt);
  cur.drinks.push({ kind: 'cospa', snap: s, items: [{ p: d, amt }], note: free ? 'コスパ無料券' : 'コスパ前払い' });
  saveGame();
  renderGame();
  SE.play(free ? 'ticket' : 'coin');
  telop((free ? 'コスパ無料！' : 'コスパ発動！') + '<small>このターン、' + esc(pname(d)) + 'が飲む量は半分</small>', 'lime', 1700);
  floatAt(d, amt ? '+1杯' : 'FREE', !amt);
}
function nextTurn() {
  if (!G || G.cur.phase !== 'drawn' || picking) return;
  const n = G.players.length;
  pushHist();
  G.turn++;
  /* the last tip (where help lives) comes once someone has been recorded, or after 3 turns at the latest */
  if (coach.on) { coach.turns = (coach.turns || 0) + 1; if (coach.seen.has('sheet') || coach.turns >= 3) coach.moved = true; }
  let expired = 0;
  G.players.forEach(pl => { pl.hand = pl.hand.filter(h => { if (h.kind !== 'dur') return true; h.left--; if (h.left <= 0) { expired++; return false; } return true; }); });
  if (G.rounds && G.turn >= G.rounds * n) { finishGame(); return; }
  startTurn();
  saveGame();
  renderGame();
  turnFx();
  if (expired) setTimeout(() => { telop('継続カードの効果が切れた！', 'cyan sm', 1200); SE.play('poof'); }, 1200);
}
/* ---------- going back: 「取り消す」 undoes the last record in this turn; 「◀ 前のターンに戻る」 restores the game exactly as it was
   when 「次へ」 was pressed (card, records, special rules used, hands, NEXT ×2 …), so a forgotten record can still be made ---------- */
const HIST_MAX = 8;
function pushHist() {
  const copy = Object.assign({}, G, { cur: Object.assign({}, G.cur, { select: null }) });
  delete copy.hist;
  G.hist = (G.hist || []).concat(JSON.stringify(copy)).slice(-HIST_MAX);
}
function canBack() { return !!(G && Array.isArray(G.hist) && G.hist.length); }
function openBack() {
  if (!canBack()) return;
  const prev = JSON.parse(G.hist[G.hist.length - 1]), pc0 = prev.cur, cur = G.cur;
  const who = prev.players[pc0.drawer] ? prev.players[pc0.drawer].name : '';
  const cardText = pc0.card ? String(pc0.card.text).replace(TAG_RE, (_, k) => (prev.players[pc0.names[k]] || {}).name || k) : '';
  const lost = [];
  if (!G.done && cur.phase === 'drawn' && cur.card) lost.push('いま引いたカードは山札に戻ります');
  if (!G.done && cur.drinks.length) lost.push('このターンの記録は消えます');
  $('backBox').innerHTML = '<h2 id="backTitle">前のターンに戻る？</h2>' +
    '<p><span class="sh-name" style="--p:' + pc(pc0.drawer) + '">' + esc(who) + '</span> のターンに戻ります。</p>' +
    (cardText ? '<p class="back-card">' + esc(cardText) + '</p>' : '') +
    '<p class="note-s">記録の続きや、特殊ルールの使い直しができます。' + (lost.length ? lost.join('。') + '。' : '') + '</p>' +
    '<div class="dialog-acts"><button type="button" class="pbtn white small" data-back="no">やめる</button><button type="button" class="pbtn small" data-back="yes">戻る</button></div>';
  openOv('backOv');
  SE.play('pop');
  const b = $('backBox').querySelector('[data-back="yes"]'); if (b) b.focus({ preventScroll: true });
}
function goBack() {
  if (!canBack()) return;
  const hist = G.hist.slice(), prev = JSON.parse(hist.pop());
  prev.hist = hist;
  const fromResult = screen === 'result';
  closeAllOverlays();
  G = normalizeGame(prev);
  if (!G) return;
  G.done = false;
  saveGame();
  if (fromResult) { showScreen('game'); requestWake(); } else renderGame();
  SE.play('poof');
  telop('◀ 前のターンに戻った', 'white sm', 1300);
}
function finishGame() {
  if (coach.on) coachEnd(true);
  closeAllOverlays();
  G.done = true;
  saveGame();
  releaseWake();
  resultIntro = true;
  showScreen('result');
  playResultFx();
}

/* ---------- drinks ---------- */
function addDrink(p, amt) { if (!amt) return; G.players[p].total += amt; G.players[p].times++; G.last = p; }
function floatAt(p, text, safe) {
  const seat = document.querySelector('.seat[data-seat="' + p + '"]');
  if (!seat) return;
  const pos = relPos(seat);
  const el = document.createElement('div');
  el.className = 'floaty ol' + (safe ? ' safe' : '');
  el.textContent = text;
  el.style.left = pos.x + 'px'; el.style.top = (pos.y - 10) + 'px';
  $('shell').appendChild(el);
  setTimeout(() => el.remove(), 1300);
  seat.classList.remove('bump'); void seat.offsetWidth; seat.classList.add('bump');
}
function computeAmount(s) {
  const p = s.p, cur = G.cur, n = G.players.length;
  let a = s.base; const steps = [s.base + '杯'], pushes = [];
  if (pendingApplies(p)) {
    if (G.pending.mult !== 1) { a *= G.pending.mult; steps.push('×' + G.pending.mult + '（' + G.pending.src + '）'); }
    if (G.pending.half) { a = halfOf(a); steps.push('半分（カードの効果）'); }
  } else if (pendingActive() && G.pending.from !== p && immuneTo(p)) steps.push('倍倍を無効化（手札）');
  if (s.dbl) { a *= 2; steps.push('×2（倍倍FIGHT！）'); }
  if (s.hh === 'heaven') { a = 0; steps.push(s.pass ? '天国パスで回避' : '天国で回避'); }
  else if (s.hh === 'hell') { a *= 2; steps.push('×2（地獄）'); }
  else if (s.hh === 'bighell') { a *= 3; steps.push('×3（大地獄）'); }
  else if (s.hh === 'bigheaven') { pushes.push({ to: (p + 1) % n, amt: a }); a = 0; steps.push('大天国で押し付け'); }
  if (cur.cospa && p === cur.drawer && a > 0) { a = halfOf(a); steps.push('半分（コスパ）'); }
  if (hasDur(p, 'half') && a > 0) { a = halfOf(a); steps.push('半分（手札）'); }
  let ticketUsed = false;
  if (s.ticket) {
    const t = G.players[p].hand.find(h => h.uid === s.ticket);
    if (t && a > 0) {
      ticketUsed = true;
      if (t.fx === 'avoid') { steps.push(t.label + 'で回避'); a = 0; }
      else if (t.fx === 'push') { pushes.push({ to: t.target, amt: a }); steps.push(t.label + 'で押し付け'); a = 0; }
    }
  }
  return { amt: Math.min(99, a), pushes: pushes.map(x => ({ to: x.to, amt: Math.min(99, x.amt) })), steps, ticketUsed };
}
function openSheet(p, opts) {
  opts = opts || {};
  const c = G.cur.card;
  const def = c && c.cups.length ? c.cups[0] : 1;
  sheet = { p, base: Math.max(1, Math.min(99, opts.base || def)), dbl: false, hh: null, hhFree: false, mode: null, locked: false, ticket: null, pass: null };
  renderSheet();
  openOv('sheetOv');
  SE.play('pop');
  const b = $('sheetRecord'); if (b) b.focus({ preventScroll: true });
}
function renderSheet() {
  const s = sheet, p = s.p, cur = G.cur, n = G.players.length, pl = G.players[p];
  const used = cur.used.includes(p);
  const c = cur.card;
  const freeAvail = c && c.fx === 'hh' && p === cur.drawer && !cur.hhFreeDone && !s.hh;
  const calc = computeAmount(s);
  const cardAmt = c && c.cups.length ? (c.cups.length > 1 ? c.cups[0] + '–' + c.cups[1] + '杯' : c.cups[0] + '杯') : 'なし';
  const mods = [];
  if (pendingApplies(p)) mods.push((G.pending.mult !== 1 ? '×' + G.pending.mult : '') + (G.pending.half ? (G.pending.mult !== 1 ? '・' : '') + '半分' : '') + '（' + G.pending.src + '）');
  if (cur.cospa && p === cur.drawer) mods.push('コスパ中：この人が飲む量は半分');
  if (hasDur(p, 'half')) mods.push('手札：飲む量半分');
  if (immuneTo(p) && pendingActive()) mods.push('手札：倍倍無効');
  const hhLabel = { heaven: '天国！ 回避', hell: '地獄… 2倍', bigheaven: '大天国！ 次の人に押し付け', bighell: '大地獄…… 3倍' };
  const modeLabel = s.mode === 'devil' ? '（デビルモード）' : s.mode === 'angel' ? '（大天使降臨）' : '';
  const dblDis = used || (s.hh && !s.hhFree);
  const hhDis = used || s.dbl || !!s.hh;
  const usable = pl.hand.filter(h => h.kind === 'ticket' && (h.fx === 'avoid' || h.fx === 'push'));
  const others = pl.hand.filter(h => !(h.kind === 'ticket' && (h.fx === 'avoid' || h.fx === 'push')));
  $('sheetBox').innerHTML =
    '<div class="sh-head"><h2 id="sheetTitle"><span class="sh-name" style="--p:' + pc(p) + '">' + esc(pl.name) + '</span>が飲む</h2><span class="sh-card">カード：' + cardAmt + '</span></div>' +
    '<div class="amt-row"><button type="button" class="stepper" data-s="minus" aria-label="1杯減らす"' + (s.locked || s.base <= 1 ? ' disabled' : '') + '>−</button>' +
      '<span class="amt-base"><b>' + s.base + '</b><small>もとの杯数</small></span>' +
      '<button type="button" class="stepper" data-s="plus" aria-label="1杯増やす"' + (s.locked || s.base >= 99 ? ' disabled' : '') + '>＋</button></div>' +
    sheetHint(c, s) +
    (mods.length ? '<ul class="mods">' + mods.map(m => '<li>' + esc(m) + '</li>').join('') + '</ul>' : '') +
    '<p class="sp-h">特殊ルール ' + (used ? '<span class="used">このターンは使用済み</span>' : '<span>1ターンに1つまで</span>') + '<button type="button" class="sp-help" data-s="help">？ 特殊ルールって？</button></p>' +
    '<div class="specials">' +
      '<button type="button" class="sp sp-dbl" data-s="dbl" aria-pressed="' + s.dbl + '"' + (dblDis ? ' disabled' : '') + '><span class="sp-t">倍倍FIGHT！</span><span class="sp-d">自分×2、次に飲む人も×2</span></button>' +
      '<button type="button" class="sp sp-hh" data-s="hh"' + (hhDis ? ' disabled' : '') + '><span class="sp-t">天国と地獄</span><span class="sp-d">回避か2倍か。回したら戻せない</span></button>' +
      (freeAvail ? '<button type="button" class="sp sp-free" data-s="hhfree"><span class="sp-t">天国と地獄（カードの効果）</span><span class="sp-d">特殊ルールの回数には数えない</span></button>' : '') +
    '</div>' +
    (s.hh ? '<p class="hh-res ' + s.hh + '">' + hhLabel[s.hh] + modeLabel + (s.pass ? '（天国パス）' : '') + '</p>' : '') +
    (usable.length ? '<div class="pick-players" role="group" aria-label="券を使う">' + usable.map(h =>
      '<button type="button" class="tk" data-s="ticket" data-uid="' + h.uid + '" aria-pressed="' + (s.ticket === h.uid) + '">' + esc(h.text) + 'を使う</button>').join('') + '</div>' : '') +
    (others.length ? '<div class="hand-list">' + others.map(h => handRow(h)).join('') + '</div>' : '') +
    '<div class="final"><span class="final-l">飲む量</span><span class="final-v' + (calc.amt ? '' : ' zero') + '">' + (calc.amt ? fmtAmt(calc.amt) + '<small>杯</small>' : 'SAFE') + '</span>' +
      calc.pushes.map(x => '<span class="push">' + esc(pname(x.to)) + 'に' + fmtAmt(x.amt) + '杯を押し付け！</span>').join('') +
      '<span class="steps">' + esc(calc.steps.join(' → ')) + '</span></div>' +
    '<div class="sh-actions"><button type="button" class="pbtn white small" data-s="close"' + (s.locked ? ' disabled' : '') + '>やめる</button>' +
      '<button type="button" class="pbtn main" id="sheetRecord" data-s="record">記録する！</button></div>';
}
/* a line under the cups: always for range cards ("1〜3杯"), and for the first few records otherwise */
function sheetHint(c, s) {
  if (s.locked) return '';
  if (c && c.cups.length > 1) return '<p class="sh-hint">このカードは<b>' + c.cups[0] + '〜' + c.cups[1] + '杯</b>。−／＋で実際の杯数に合わせてね</p>';
  if ((Number(lsGet(RECS_KEY)) || 0) < 5) return '<p class="sh-hint">' + (c && c.cups.length ? 'カードの杯数が入っています。' : '') + 'ちがうときは −／＋ で直してから「記録する！」</p>';
  return '';
}
function handRow(h) {
  const detail = h.kind === 'dur' ? 'あと' + h.left + 'ターン'
    : h.fx === 'heavenpass' ? 'ルーレットで地獄のとき使える'
    : h.fx === 'freecospa' ? 'コスパを使うと自動で使う'
    : '記録のときに使える';
  return '<div class="hand-item"><span class="mini' + (h.kind === 'ticket' ? ' ticket' : '') + '" style="--c:' + colorVar(h.color) + '">' + esc(h.mark) + '</span>' +
    '<span class="hi-t">' + esc(h.text) + '</span><span class="hi-left">' + detail + '</span></div>';
}
function closeSheet() { if (sheet && sheet.locked) return; sheet = null; closeOv('sheetOv'); }
function recordSheet() {
  const s = sheet, p = s.p, cur = G.cur;
  const calc = computeAmount(s);
  const sn = snap();
  lsSet(RECS_KEY, String((Number(lsGet(RECS_KEY)) || 0) + 1));
  const applied = pendingApplies(p);
  const incoming = applied ? G.pending.mult : 1;
  if (applied) G.pending = freshPending();
  if (s.dbl) { G.pending = { mult: Math.min(64, 2 * Math.max(1, incoming)), half: false, from: p, src: pname(p) + 'の倍倍FIGHT！' }; G.players[p].dbl++; }
  const hhCounted = !!(s.hh && !s.hhFree);
  if ((s.dbl || hhCounted) && !cur.used.includes(p)) cur.used.push(p);
  if (hhCounted) G.players[p].hh++;
  if (s.hh) G.stats.hh++;
  if (s.hh && s.hhFree) cur.hhFreeDone = true;
  if (s.mode === 'devil') G.stats.devil++;
  if (s.mode === 'angel') G.stats.angel++;
  const hand = G.players[p].hand;
  if (calc.ticketUsed) G.players[p].hand = hand.filter(h => h.uid !== s.ticket);
  if (s.pass) G.players[p].hand = G.players[p].hand.filter(h => h.uid !== s.pass);
  addDrink(p, calc.amt);
  calc.pushes.forEach(x => addDrink(x.to, x.amt));
  const items = [{ p, amt: calc.amt }].concat(calc.pushes.map(x => ({ p: x.to, amt: x.amt })));
  cur.drinks.push({ kind: 'drink', snap: sn, items, note: calc.steps.slice(1).join(' → ') });
  sheet = null;
  closeOv('sheetOv');
  saveGame();
  renderGame();
  items.forEach((it, k) => setTimeout(() => floatAt(it.p, it.amt ? '+' + fmtAmt(it.amt) + '杯' : 'SAFE!', !it.amt), k * 250));
  if (s.dbl) {
    SE.play('double'); flash('#ff8b2b'); shake(false);
    telop('倍倍FIGHT！<small>次の人は×' + G.pending.mult + '</small>', 'pink', 1600);
  } else if (calc.pushes.length) { SE.play('ticket'); telop('押し付け！', 'cyan', 1200); }
  else if (!calc.amt) SE.play('ticket');
  else if (calc.amt >= 5) { SE.play('hell'); shake(true); telop(fmtAmt(calc.amt) + '杯！！', 'red', 1500); vibrate([80, 40, 120]); }
  else SE.play('gulp');
}
function undoLast() {
  const cur = G.cur, e = cur.drinks[cur.drinks.length - 1];
  if (!e || (e.kind === 'cospa' && cur.phase === 'drawn')) return;
  cur.drinks.pop();
  restoreSnap(e.snap);
  saveGame();
  renderGame();
  SE.play('poof');
}
function openMulti(only) {
  const cur = G.cur, c = cur.card;
  const excludeDrawer = c && /以外の全員/.test(c.text);
  multi = { base: c && c.cups.length ? c.cups[0] : 1, sel: G.players.map((_, i) => (Array.isArray(only) ? only.includes(i) : !(excludeDrawer && i === cur.drawer))) };
  renderMulti();
  openOv('multiOv');
  SE.play('pop');
  const b = $('multiRecord'); if (b) b.focus({ preventScroll: true });
}
const multiAmt = i => (G.cur.cospa && i === G.cur.drawer ? halfOf(multi.base) : multi.base);
function renderMulti() {
  const m = multi, count = m.sel.filter(Boolean).length;
  $('multiBox').innerHTML =
    '<div class="sh-head"><h2 id="multiTitle">まとめて記録</h2><span class="sh-card">同じ量を飲む人をまとめて</span></div>' +
    '<div class="pick-players" role="group" aria-label="飲む人">' + G.players.map((pl, i) =>
      '<button type="button" data-m="sel" data-i="' + i + '" aria-pressed="' + m.sel[i] + '" style="--p:' + pc(i) + '"><span class="dot"></span>' + esc(pl.name) + '</button>').join('') + '</div>' +
    '<div class="amt-row"><button type="button" class="stepper" data-m="minus" aria-label="1杯減らす"' + (m.base <= 1 ? ' disabled' : '') + '>−</button>' +
      '<span class="amt-base"><b>' + m.base + '</b><small>1人あたり</small></span>' +
      '<button type="button" class="stepper" data-m="plus" aria-label="1杯増やす"' + (m.base >= 99 ? ' disabled' : '') + '>＋</button></div>' +
    '<p class="note-s">特殊ルールや券を使う人は、その人の席から1人ずつ記録してね。</p>' +
    '<div class="sh-actions"><button type="button" class="pbtn white small" data-m="close">やめる</button>' +
      '<button type="button" class="pbtn main" id="multiRecord" data-m="record"' + (count ? '' : ' disabled') + '>' + count + '人に記録！</button></div>';
}
function recordMulti() {
  const items = [];
  multi.sel.forEach((on, i) => { if (on) items.push({ p: i, amt: multiAmt(i) }); });
  if (!items.length) return;
  const s = snap();
  items.forEach(x => addDrink(x.p, x.amt));
  G.cur.drinks.push({ kind: 'multi', snap: s, items, note: '' });
  multi = null;
  closeOv('multiOv');
  saveGame();
  renderGame();
  items.forEach((it, k) => setTimeout(() => floatAt(it.p, '+' + fmtAmt(it.amt) + '杯'), k * 120));
  SE.play('gulp');
  if (items.length === G.players.length) { telop('全員カンパーイ！', '', 1400); FXC.rain(60); SE.play('cat_all', 0.1); }
}

/* ---------- selection actions (swap / give) and rule ending ---------- */
function startSelect(kind) {
  G.cur.select = kind;
  renderGame();
  SE.play('select');
  telop(kind === 'swap' ? '入れ替える相手をタップ！' : 'セーフ券を渡す相手をタップ！', 'cyan sm', 1300);
}
function doSwap(i) {
  const cur = G.cur, d = cur.drawer, s = snap();
  const t = G.players[d].total; G.players[d].total = G.players[i].total; G.players[i].total = t;
  cur.swapDone = true; cur.select = null;
  cur.drinks.push({ kind: 'swap', snap: s, a: d, b: i });
  saveGame(); renderGame();
  SE.play('coin'); SE.play('double', 0.05);
  telop('記録チェンジ！', 'cyan', 1300);
  floatAt(d, fmtAmt(G.players[d].total) + '杯'); floatAt(i, fmtAmt(G.players[i].total) + '杯');
}
function doGive(i) {
  const cur = G.cur, s = snap();
  cur.giveDone = true; cur.select = null;
  const item = giveItem(i, ticket('avoid', 'セーフ券'));
  cur.drinks.push({ kind: 'give', snap: s, to: i });
  saveGame(); renderGame();
  flyGifts([[i, item]]);
}
function openEnd() {
  const rows = [];
  G.players.forEach((pl, i) => pl.hand.forEach(h => { if (h.kind === 'dur') rows.push([i, h]); }));
  if (!rows.length) { closeOv('endOv'); return; }
  $('endBox').innerHTML = '<h2 id="endTitle">ルールを終わらせる</h2><p>終わらせたい継続カードを1枚選んでね。</p>' +
    rows.map(([i, h]) => '<div class="end-item"><span class="dot" style="--p:' + pc(i) + '"></span><span>' + esc(pname(i)) + '：' + esc(h.text) + '（あと' + h.left + '）</span>' +
      '<button type="button" class="pbtn pink tiny" data-end="' + h.uid + '" data-p="' + i + '">終了</button></div>').join('') +
    '<div class="dialog-acts"><button type="button" class="pbtn white small" data-end="close">閉じる</button></div>';
  if ($('endOv').hidden) openOv('endOv');
}
function endRule(p, uid) {
  const s = snap();
  G.players[p].hand = G.players[p].hand.filter(h => h.uid !== uid);
  G.cur.drinks.push({ kind: 'end', snap: s });
  saveGame();
  closeOv('endOv');
  renderGame();
  SE.play('poof');
  telop('ルール終了！', 'lime sm', 1200);
}
function openHand(i) {
  const pl = G.players[i];
  $('handBox').innerHTML = '<h2 id="handTitle"><span class="sh-name" style="--p:' + pc(i) + '">' + esc(pl.name) + '</span> の手札</h2>' +
    (pl.hand.length ? '<div class="hand-list">' + pl.hand.map(h => handRow(h)).join('') + '</div>' : '<p>手札はありません。</p>') +
    '<p class="note-s">' + fmtAmt(pl.total) + '杯 ・ 倍倍FIGHT！' + pl.dbl + '回 ・ 天国と地獄' + pl.hh + '回 ・ コスパ' + pl.cospa + '回</p>' +
    '<div class="dialog-acts"><button type="button" class="pbtn small" data-hand="close">閉じる</button></div>';
  openOv('handOv');
  SE.play('pop');
}
function seatTap(i) {
  const cur = G.cur;
  if (picking) return;
  if (cur.select) { if (i === cur.drawer) return; if (cur.select === 'swap') doSwap(i); else doGive(i); return; }
  if (cur.phase === 'drawn') openSheet(i); else openHand(i);
}

/* ---------- name roulette on the table ---------- */
function runPick() {
  const cur = G.cur;
  if (picking || cur.pickDone != null) return;
  const n = G.players.length, target = Math.floor(Math.random() * n);
  const S = reduceMotion ? 6 : Math.max(18, n * 3 + 7);
  const start = (((target - (S - 1)) % n) + n) % n;
  let j = 0;
  picking = { timer: 0 };
  renderDock();
  telop('ルーレット！', 'cyan sm', 900);
  const P = picking;
  const step = () => {
    if (picking !== P) return;
    const idx = (start + j) % n;
    document.querySelectorAll('.seat').forEach(el => el.classList.toggle('pickon', Number(el.dataset.seat) === idx));
    if (j >= S - 1) {
      picking = null;
      cur.pickDone = target;
      saveGame();
      const seat = document.querySelector('.seat[data-seat="' + target + '"]');
      if (seat) { const q = relPos(seat); FXC.burst(q.x, q.y, 70, { speed: 12 }); }
      SE.play('bigheaven'); vibrate(120);
      telop(esc(pname(target)) + '！', 'pink', 1300);
      setTimeout(() => { renderGame(); if (screen === 'game') openSheet(target); }, 1100);
      return;
    }
    SE.play('tick');
    j++;
    P.timer = setTimeout(step, 55 + 380 * Math.pow(j / (S - 1), 2.4));
  };
  step();
}

/* ---------- 天国と地獄 (10 s spin; omen at 4.55 s, devil / angel switch at 5 s, angel twist at 6.1 s, heartbeat for the last 3 s) ---------- */
const SLOT_LABEL = { heaven: '天国', hell: '地獄', bigheaven: '大天国', bighell: '大地獄' };
const HUB_RES = { heaven: '天', hell: '獄', bigheaven: '大天', bighell: '大獄' };
const rnd = (a, b) => a + Math.random() * (b - a);
const BAT_SVG = '<svg viewBox="0 0 64 32"><path d="M32 11C29 5 25 5 23 9 19 3 11 2 2 8c6 2 8 6 8 10 4-4 8-4 10 0 2-4 6-4 8 2l4 6 4-6c2-6 6-6 8-2 2-4 6-4 10 0 0-4 2-8 8-10-9-6-17-5-21 1-2-4-6-4-9 2z"/></svg>';
function layoutFor(mode) {
  if (mode === 'angel') {
    const L = Array(16).fill('heaven');
    const a = Math.floor(Math.random() * 16); let b; do { b = Math.floor(Math.random() * 16); } while (b === a);
    L[a] = 'bighell'; L[b] = 'bighell';
    return L;
  }
  if (mode === 'devil') return Array.from({ length: 16 }, (_, i) => ([1, 6, 11].includes(i) ? 'bighell' : 'hell'));
  return Array.from({ length: 16 }, (_, i) => (i === 0 ? 'bigheaven' : i === 9 ? 'bighell' : (i % 2 ? 'hell' : 'heaven')));
}
function slotText(i, k) {
  const chars = Array.from(SLOT_LABEL[k]);
  const top = chars.length === 3 ? -86 : -80;
  return chars.map((ch, j) => '<text class="tx tx-' + k + '" x="0" y="' + (top + j * 12.5) + '" text-anchor="middle" dominant-baseline="central">' + ch + '</text>').join('');
}
function wheelSVG(layout) {
  const R = 100;
  let h = '';
  for (let i = 0; i < 16; i++) {
    const a0 = (i * 22.5 - 90) * Math.PI / 180, a1 = ((i + 1) * 22.5 - 90) * Math.PI / 180;
    h += '<path id="sl-' + i + '" class="sl sl-' + layout[i] + '" d="M0 0L' + (R * Math.cos(a0)).toFixed(2) + ' ' + (R * Math.sin(a0)).toFixed(2) +
      'A' + R + ' ' + R + ' 0 0 1 ' + (R * Math.cos(a1)).toFixed(2) + ' ' + (R * Math.sin(a1)).toFixed(2) + 'Z"/>';
    h += '<g id="tg-' + i + '" transform="rotate(' + (i * 22.5 + 11.25) + ')">' + slotText(i, layout[i]) + '</g>';
  }
  return h;
}
function setSlot(i, k, anim) {
  const p = $('sl-' + i), g = $('tg-' + i);
  if (p) p.setAttribute('class', 'sl sl-' + k + (anim ? ' flip' : ''));
  if (g) g.innerHTML = slotText(i, k);
}
function buildBulbs() {
  let h = '';
  for (let i = 0; i < 24; i++) { const a = i * 15 * Math.PI / 180; h += '<circle cx="' + (112 * Math.sin(a)).toFixed(2) + '" cy="' + (-112 * Math.cos(a)).toFixed(2) + '" r="5.2"/>'; }
  $('wheelBulbs').innerHTML = h;
}
function lightBulbs(k) {
  const cs = $('wheelBulbs').children;
  for (let i = 0; i < cs.length; i++) cs[i].classList.toggle('on', (i + k) % 3 === 0);
}
function setHub(text, cls) {
  const h = $('wHub');
  $('wHubT').textContent = text;
  h.className = 'w-hub' + (cls ? ' ' + cls : '');
  void h.offsetWidth; h.classList.add('pop');
}
function spawnParts(kind) {
  if (reduceMotion) return;
  let h = '';
  if (kind === 'embers') for (let i = 0; i < 30; i++) h += '<i class="ember" style="left:' + rnd(0, 100).toFixed(1) + '%;--s:' + rnd(3, 8).toFixed(1) + 'px;--d:' + rnd(2, 4.2).toFixed(2) + 's;--dl:-' + rnd(0, 4).toFixed(2) + 's;--dx:' + rnd(-70, 70).toFixed(0) + 'px"></i>';
  if (kind === 'bats') for (let i = 0; i < 9; i++) { const a = rnd(0, Math.PI * 2); h += '<i class="bat" style="--tx:' + (Math.cos(a) * 62).toFixed(1) + 'vw;--ty:' + (Math.sin(a) * 52).toFixed(1) + 'vh;--dl:' + (i * 0.08).toFixed(2) + 's;--sc:' + rnd(1.6, 2.8).toFixed(2) + '">' + BAT_SVG + '</i>'; }
  if (kind === 'feathers') for (let i = 0; i < 24; i++) h += '<i class="feather" style="left:' + rnd(0, 100).toFixed(1) + '%;--d:' + rnd(4, 7.5).toFixed(2) + 's;--dl:-' + rnd(0, 7).toFixed(2) + 's;--dx:' + rnd(-90, 90).toFixed(0) + 'px;--rot:' + rnd(-240, 240).toFixed(0) + 'deg;--s:' + rnd(0.7, 1.3).toFixed(2) + '"></i>';
  $('wParts').insertAdjacentHTML('beforeend', h);
}
function stageBox(svg) {
  const r = $('wheelOv').getBoundingClientRect(), W = Math.max(1, r.width), H = Math.max(1, r.height);
  svg.setAttribute('viewBox', '0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0));
  const q = $('wheelWrap').getBoundingClientRect();
  return { W, H, cx: q.left - r.left + q.width / 2, cy: q.top - r.top + q.height / 2, R: q.width / 2 };
}
function strike() {
  if (reduceMotion) return;
  const svg = $('wBolt'), b = stageBox(svg);
  const bolt = (x0, y1) => { let x = x0, y = 0; const pts = [[x, y]]; while (y < y1) { y = Math.min(y1, y + rnd(0.04, 0.09) * b.H); x += rnd(-0.07, 0.07) * b.W; pts.push([x, y]); } return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L'); };
  svg.innerHTML = [bolt(rnd(0.12, 0.88) * b.W, b.cy - b.R * rnd(0.1, 0.6)), bolt(rnd(0.04, 0.96) * b.W, rnd(0.22, 0.4) * b.H)].map(d => '<path class="bg" d="' + d + '"/><path class="fg" d="' + d + '"/>').join('');
  svg.classList.remove('go'); void svg.getBoundingClientRect(); svg.classList.add('go');
}
function crack() {
  if (reduceMotion) return;
  const svg = $('wCrack'), b = stageBox(svg), n = 12, far = Math.hypot(b.W, b.H), u = far / 100;
  let h = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(-0.2, 0.2);
    let r = b.R * rnd(0.15, 0.3), d = 'M' + (b.cx + Math.cos(a) * r).toFixed(1) + ' ' + (b.cy + Math.sin(a) * r).toFixed(1);
    while (r < far) { r += rnd(5, 11) * u; const aa = a + rnd(-0.22, 0.22); d += 'L' + (b.cx + Math.cos(aa) * r).toFixed(1) + ' ' + (b.cy + Math.sin(aa) * r).toFixed(1); }
    h += '<path class="bg" pathLength="1" d="' + d + '"/><path class="fg" pathLength="1" d="' + d + '"/>';
  }
  svg.innerHTML = h;
  svg.classList.remove('go'); void svg.getBoundingClientRect(); svg.classList.add('go');
}
function openWheel(free) {
  if (wheel) return;
  wheel = { free, spinning: false, done: false, mode: 'normal', kind: null, raf: 0, passUid: null, timers: [] };
  const ov = $('wheelOv');
  ov.className = 'ov wheel-ov';
  $('wParts').innerHTML = ''; $('wBolt').innerHTML = ''; $('wCrack').innerHTML = '';
  $('wBlur').style.opacity = '0';
  $('wheelWho').textContent = pname(sheet.p) + ' の天国と地獄' + (free ? '（カードの効果）' : '');
  if (!$('wheelBulbs').children.length) buildBulbs();
  lightBulbs(0);
  const svg = $('wheelSvg');
  svg.innerHTML = wheelSVG(layoutFor('normal'));
  svg.style.transform = 'rotate(0deg)';
  setHub('運命');
  const md = $('wheelMode'); md.textContent = '天国か？ 地獄か？'; md.classList.remove('go');
  const res = $('wheelResult'); res.textContent = ''; res.className = 'wheel-result ol';
  $('wheelLegend').textContent = '天国：回避 ／ 地獄：2倍 ／ 大天国：次の人に押し付け ／ 大地獄：3倍';
  $('wheelSpin').hidden = false; $('wheelSpin').disabled = false;
  $('wheelCancel').hidden = false;
  $('wheelPass').hidden = true;
  $('wheelOk').hidden = true;
  openOv('wheelOv');
  SE.play('pop');
  BGM.play('tension'); BGM.level(1);
  $('wheelSpin').focus({ preventScroll: true });
}
function modeText(el, text) { el.textContent = text; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }
function spinWheel() {
  if (!wheel || wheel.spinning || wheel.done) return;
  const w = wheel, ov = $('wheelOv');
  w.spinning = true;
  $('wheelSpin').disabled = true;
  $('wheelCancel').hidden = true;
  const r = Math.random();
  w.mode = r < 0.10 ? 'devil' : r < 0.15 ? 'angel' : 'normal';
  const finalLayout = layoutFor(w.mode);
  const k = Math.floor(Math.random() * 16);
  const c = k * 22.5 + 11.25 + (Math.random() * 2 - 1) * 7;
  const TA = 0.4, T1 = 5, T = w.mode === 'normal' ? 10 : T1 + 8;
  const eff = TA / 2 + (T1 - TA) + (T - T1) / 3;
  const total = Math.ceil((560 * eff + c) / 360) * 360 - c;
  const vmax = total / eff;
  const ang = t => (t < TA ? vmax * t * t / (2 * TA)
    : t < T1 ? vmax * (TA / 2 + (t - TA))
    : vmax * (TA / 2 + (T1 - TA) + (T - T1) * (1 - Math.pow(1 - (t - T1) / (T - T1), 3)) / 3));
  const svg = $('wheelSvg'), ptr = $('wheelPtr'), blur = $('wBlur');
  ov.classList.add('spinning');
  setHub('？', 'q');
  modeText($('wheelMode'), 'スタート！');
  SE.play('spin');
  const f = $('wheelFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  const t0 = performance.now();
  let lastSlot = -1, lastTick = 0, lastR = 0, lastT = 0;
  const ev = { omen: w.mode === 'normal', sw: w.mode === 'normal', tw: w.mode !== 'angel', fin: false };
  const frame = now => {
    if (wheel !== w) return;
    const t = Math.min(T, (now - t0) / 1000);
    const R = ang(t);
    svg.style.transform = 'rotate(' + R.toFixed(2) + 'deg)';
    if (t > lastT) { blur.style.opacity = Math.min(0.9, (R - lastR) / (t - lastT) / vmax).toFixed(2); lastR = R; lastT = t; }
    lightBulbs(Math.floor(R / 14));
    const slot = Math.floor((((360 - (R % 360)) % 360)) / 22.5);
    if (slot !== lastSlot) {
      lastSlot = slot;
      if (now - lastTick > 38) { SE.play('tick'); lastTick = now; ptr.classList.add('flap'); setTimeout(() => ptr.classList.remove('flap'), 45); }
    }
    if (!ev.omen && t >= T1 - 0.45) { ev.omen = true; omen(); }
    if (!ev.sw && t >= T1) { ev.sw = true; applyWheelMode(w, finalLayout); }
    if (!ev.tw && t >= T1 + 1.1) { ev.tw = true; angelTwist(w, finalLayout); }
    if (!ev.fin && t >= T - 3) { ev.fin = true; finalStretch(w); }
    if (t < T) w.raf = requestAnimationFrame(frame);
    else finishWheel(k, finalLayout);
  };
  w.raf = requestAnimationFrame(frame);
}
function omen() {
  $('wheelOv').classList.add('omen');
  modeText($('wheelMode'), '……！？');
  SE.play('omen'); BGM.level(0, 0.04); vibrate(60);
}
function finalStretch(w) {
  $('wheelOv').classList.add('final');
  if (w.mode === 'normal') modeText($('wheelMode'), '天国か… 地獄か…');
  for (let i = 0; i < 5; i++) SE.play('heart', i * 0.58);
  BGM.level(0.4, 0.3);
}
function applyWheelMode(w, finalLayout) {
  const ov = $('wheelOv');
  ov.classList.remove('omen');
  ov.classList.add(w.mode, 'mode-in');
  w.timers.push(setTimeout(() => ov.classList.remove('mode-in'), 1500));
  const f = $('wheelFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  const shown = w.mode === 'angel' ? Array(16).fill('heaven') : finalLayout;
  for (let i = 0; i < 16; i++) w.timers.push(setTimeout(() => { if (wheel === w) setSlot(i, shown[i], true); }, 120 + i * 40));
  BGM.play(w.mode); BGM.level(1, 0.05);
  if (w.mode === 'devil') {
    setHub('魔', 'devil');
    modeText($('wheelMode'), 'デビルモード');
    $('wheelLegend').textContent = '地獄13マス・大地獄3マスに変化！';
    SE.play('devil'); SE.play('bats', 0.45);
    flash('#ff1a3c'); shake(true); vibrate([200, 80, 200, 80, 300]);
    strike();
    w.timers.push(setTimeout(() => { if (wheel === w) { strike(); SE.play('strike'); flash('#ffffff'); } }, 420));
    spawnParts('embers'); spawnParts('bats');
    telop('デビルモード<br>突入！！', 'devil', 1900);
  } else {
    setHub('聖', 'angel');
    modeText($('wheelMode'), '大天使降臨');
    $('wheelLegend').textContent = '全マスが天国に……？';
    SE.play('angel'); SE.play('wings', 0.35);
    flash('#ffffff'); vibrate(120);
    spawnParts('feathers'); FXC.rain(80, GOLD);
    telop('大天使<br>降臨！！', 'angel', 1050);
  }
}
function angelTwist(w, finalLayout) {
  const ov = $('wheelOv');
  ov.classList.add('twist', 'twisted');
  w.timers.push(setTimeout(() => ov.classList.remove('twist'), 1000));
  finalLayout.forEach((k, i) => { if (k === 'bighell') setSlot(i, k, true); });
  modeText($('wheelMode'), '…でも大地獄が2マス！');
  $('wheelLegend').textContent = '天国14マス・大地獄2マス';
  SE.play('scratch'); SE.play('twist', 0.12);
  flash('#ff1a3c'); shake(false); vibrate(150);
  BGM.play('tension');
}
function finishWheel(k, layout) {
  const w = wheel, ov = $('wheelOv');
  w.spinning = false; w.done = true; w.kind = layout[k];
  layout.forEach((kk, i) => setSlot(i, kk));
  const hit = $('sl-' + k); if (hit) hit.setAttribute('class', 'sl sl-' + layout[k] + ' hit');
  $('wBlur').style.opacity = '0';
  ov.classList.remove('spinning', 'final', 'omen');
  ov.classList.add('done', 'res-' + w.kind);
  setHub(HUB_RES[w.kind], 'res ' + w.kind);
  const text = { heaven: '天国！ 回避！', hell: '地獄… 2倍！', bigheaven: '大天国！押し付け！', bighell: '大地獄…3倍！！' }[w.kind];
  const res = $('wheelResult'); res.textContent = text; res.className = 'wheel-result ol go ' + w.kind;
  BGM.level(0.12, 0.05);
  const wp = relPos($('wheelWrap'));
  if (w.kind === 'heaven') {
    SE.play('heaven'); flash('#ffffff'); vibrate(80);
    FXC.burst(wp.x, wp.y, 100, { colors: GOLD, star: true, speed: 14 }); FXC.rain(40, GOLD);
  } else if (w.kind === 'bigheaven') {
    SE.play('bigheaven'); flash('#ffffff'); vibrate([80, 60, 80]);
    FXC.burst(wp.x, wp.y, 150, { speed: 16, star: true }); FXC.rain(110);
    telop('大天国！！', 'angel', 1600);
  } else if (w.kind === 'hell') {
    SE.play('hell'); flash('#e8233f'); vibrate([60, 140, 300]);
    w.timers.push(setTimeout(() => { if (wheel === w) { flash('#ff1a3c'); shake(true); } }, 200));
    if (w.mode === 'normal') spawnParts('embers');
  } else {
    ov.classList.add('black');
    SE.play('bighell'); vibrate([300, 100, 300, 100, 500]);
    w.timers.push(setTimeout(() => {
      if (wheel !== w) return;
      ov.classList.remove('black');
      crack(); strike(); flash('#ff1a3c'); shake(true);
      if (w.mode === 'normal') spawnParts('embers');
      telop('大地獄！！', 'devil', 1700);
    }, 360));
  }
  $('wheelSpin').hidden = true;
  const pass = ticketsOf(sheet.p, 'heavenpass')[0];
  $('wheelPass').hidden = !(w.kind === 'hell' && w.mode === 'normal' && pass);
  $('wheelOk').hidden = false;
  $('wheelOk').focus({ preventScroll: true });
}
function usePass() {
  const w = wheel;
  const pass = w && ticketsOf(sheet.p, 'heavenpass')[0];
  if (!pass || w.kind !== 'hell') return;
  w.kind = 'heaven'; w.passUid = pass.uid;
  const ov = $('wheelOv');
  ov.classList.remove('res-hell'); ov.classList.add('res-heaven');
  $('wParts').innerHTML = '';
  setHub('天', 'res heaven');
  const res = $('wheelResult'); res.textContent = '天国パスで回避！'; res.className = 'wheel-result ol go heaven';
  $('wheelPass').hidden = true;
  SE.play('ticket'); SE.play('heaven', 0.2); flash('#ffffff');
  const wp = relPos($('wheelWrap')); FXC.burst(wp.x, wp.y, 90, { colors: GOLD, star: true, speed: 14 });
}
function leaveWheel() {
  if (wheel) { if (wheel.raf) cancelAnimationFrame(wheel.raf); wheel.timers.forEach(clearTimeout); }
  wheel = null;
  closeOv('wheelOv');
  BGM.play('party'); BGM.level(1, 0.3);
}
function confirmWheel() {
  if (!wheel || !wheel.done) return;
  sheet.hh = wheel.kind; sheet.hhFree = wheel.free; sheet.mode = wheel.mode === 'normal' ? null : wheel.mode; sheet.locked = true; sheet.pass = wheel.passUid;
  leaveWheel();
  renderSheet();
  const b = $('sheetRecord'); if (b) b.focus({ preventScroll: true });
}
function cancelWheel() {
  if (!wheel || wheel.spinning || wheel.done) return;
  leaveWheel();
}

/* ---------- challenges: app-judged mini games — clear = avoid the drink, fail = the card's cups ---------- */
const CHAL_KINDS = ['ch_stop', 'ch_gauge', 'ch_mash', 'ch_circle', 'ch_color', 'ch_order', 'ch_hilo'];
const CHAL = {
  ch_stop: { title: 'ピタリストップ', setup: () => ({ target: (8 + Math.floor(Math.random() * 7)) / 2 }),
    rule: q => '今回の目標は <b>' + q.target.toFixed(2) + '秒</b>！<br>カウントダウンのあとタイマーが動き、<br><b>1.5秒で見えなくなる</b>。<br>誤差<b>0.3秒以内</b>で止めたらクリア', play: playStop },
  ch_gauge: { title: 'ジャストゲージ', setup: () => ({ W: 6 + Math.floor(Math.random() * 13) }),
    rule: q => '左右に動く針を<br><b>緑のゾーン</b>で止めたらクリア！<br>今回のゾーン幅は <b>' + zoneLabel(q.W) + '</b><br>チャンスは1回だけ', play: playGauge },
  ch_mash: { title: '連打チャレンジ', setup: () => ({ need: [30, 40, 50, 60, 70][Math.floor(Math.random() * 5)] }),
    rule: q => '<b>5秒</b>以内に<br><b>' + q.need + '回</b>タップしたらクリア！<br>両手の指を使ってもOK', play: playMash },
  ch_circle: { title: 'まんまるチャレンジ', rule: '指で一筆の<b>まる</b>を描く。<br>きれいさを採点して<br><b>80点以上</b>でクリア！', play: playCircle },
  ch_color: { title: '色当てチャレンジ', rule: '書いてある言葉じゃなく<br><b>文字の色</b>をタップ！<br><b>5問連続</b>正解でクリア（1問1.8秒）', play: playColor },
  ch_order: { title: '数字タッチ', rule: 'バラバラの1〜9を<br><b>順番に</b>タッチ！<br><b>5秒以内</b>でクリア<br><small>1回でも間違えたら、その場で<b>お手つき</b>アウト</small>', play: playOrder },
  ch_hilo: { title: 'ハイ&ロー', rule: 'つぎのトランプが今より<br><b>上（ハイ）</b>か<b>下（ロー）</b>か当てる！<br><b>3連続</b>正解でクリア<br><small>Aがいちばん下、Kがいちばん上。同じ数はやり直し</small>', play: c => playHilo(c) },
};
const zoneLabel = W => (W <= 8 ? 'せまい' : W <= 13 ? 'ふつう' : 'ひろい');
const INKS = [['あか', '#ff3d4f'], ['あお', '#2f8cff'], ['きいろ', '#ffd83d'], ['みどり', '#30d158']];
let chal = null;
const isChal = fx => /^ch_/.test(fx || '');
function chalTimer(fn, ms) { const c = chal; const id = setTimeout(() => { if (chal === c) fn(); }, ms); c.timers.push(id); return id; }
function chalLoop(fn) {
  const c = chal;
  const step = now => { if (chal !== c || c.state !== 'play') return; if (fn(now) !== false) c.raf = requestAnimationFrame(step); };
  c.raf = requestAnimationFrame(step);
}
function onPress(el, fn) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); fn(e); });
  el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); fn(e); } });
}
const playing = () => !!(chal && chal.state === 'play');

function openChallenge() {
  const cur = G.cur, c = cur.card;
  if (chal || !c || cur.chalDone || !isChal(c.fx)) return;
  const rolled = !CHAL[c.fx];
  chal = { p: cur.drawer, kind: rolled ? CHAL_KINDS[Math.floor(Math.random() * CHAL_KINDS.length)] : c.fx, cups: c.cups.length ? c.cups[c.cups.length - 1] : 1, state: 'intro', timers: [], raf: 0, ok: null };
  chal.q = CHAL[chal.kind].setup ? CHAL[chal.kind].setup() : {};
  $('chalWho').innerHTML = '<span class="sh-name" style="--p:' + pc(chal.p) + '">' + esc(pname(chal.p)) + '</span> の挑戦！';
  $('chalStake').innerHTML = '<span>クリア → <b class="ok">回避</b></span><span>失敗 → <b class="ng">' + chal.cups + '杯</b></span>';
  $('chalOv').className = 'ov chal-ov';
  $('chalActs').innerHTML = '';
  openOv('chalOv');
  BGM.play('tension');
  if (rolled && !reduceMotion) rollChallenge(); else chalIntro();
}
function rollChallenge() {
  const t = $('chalTitle');
  $('chalStage').innerHTML = '<p class="cg-roll">チャレンジ抽選中…</p>';
  let i = Math.floor(Math.random() * CHAL_KINDS.length);
  const n = 16;
  let k = 0;
  const step = () => {
    t.textContent = CHAL[CHAL_KINDS[i++ % CHAL_KINDS.length]].title;
    SE.play('tick');
    if (++k < n) chalTimer(step, 55 + k * 9);
    else { chalIntro(); SE.play('go'); flash('#35e0ff'); }
  };
  step();
}
function chalIntro() {
  $('chalOv').classList.toggle('casino', chal.kind === 'ch_hilo');
  modeText($('chalTitle'), CHAL[chal.kind].title);
  const rule = CHAL[chal.kind].rule;
  $('chalStage').innerHTML = '<div class="cg-rule">' + (typeof rule === 'function' ? rule(chal.q) : rule) + '</div>';
  $('chalActs').innerHTML = '<button type="button" class="pbtn white small" data-c="cancel">やめる</button><button type="button" class="pbtn big main pulse" data-c="start">スタート！</button>';
  $('chalActs').querySelector('[data-c="start"]').focus({ preventScroll: true });
}
function startChallenge() {
  if (!chal || chal.state !== 'intro') return;
  chal.state = 'play';
  $('chalActs').innerHTML = '';
  SE.play('pop');
  CHAL[chal.kind].play($('chalStage'), chal.q);
}
function chalCountdown(then, head) {
  const st = $('chalStage');
  ['3', '2', '1', 'GO!'].forEach((s, i) => chalTimer(() => {
    st.innerHTML = (head || '') + '<div class="cg-count">' + s + '</div>';
    SE.play(s === 'GO!' ? 'go' : 'beep');
    if (s === 'GO!') chalTimer(then, 380);
  }, i * 620));
}
function chalEnd(ok, detail) {
  const c = chal;
  if (!c || c.state !== 'play') return;
  c.state = 'done'; c.ok = ok;
  if (c.raf) cancelAnimationFrame(c.raf);
  c.timers.forEach(clearTimeout); c.timers = [];
  const cur = G.cur, s = snap();
  cur.chalDone = true;
  cur.drinks.push({ kind: 'chal', snap: s, p: c.p, ok, items: ok ? [{ p: c.p, amt: 0 }] : [] });
  saveGame();
  $('chalStage').insertAdjacentHTML('beforeend', '<div class="cg-result ' + (ok ? 'ok' : 'ng') + '"><p class="cg-stamp ol">' + (ok ? 'クリア！' : '失敗…') + '</p>' +
    '<p class="cg-detail">' + esc(detail || '') + '</p><p class="cg-verdict">' + (ok ? '回避成功！ 飲まなくてOK' : esc(pname(c.p)) + 'は ' + c.cups + '杯！') + '</p></div>');
  $('chalOv').classList.add(ok ? 'win' : 'lose');
  $('chalActs').innerHTML = ok ? '<button type="button" class="pbtn big main" data-c="close">OK！</button>'
    : '<button type="button" class="pbtn white small" data-c="close">閉じる</button><button type="button" class="pbtn big main" data-c="rec">' + esc(pname(c.p)) + 'の記録へ</button>';
  BGM.level(0.15, 0.05);
  if (ok) {
    SE.play('bigheaven'); flash('#ffffff'); vibrate([60, 40, 60]);
    const q = relPos($('chalStage')); FXC.burst(q.x, q.y, 110, { speed: 15, star: true }); FXC.rain(50, GOLD);
  } else {
    SE.play('hell'); flash('#e8233f'); vibrate([60, 140, 300]);
    setTimeout(() => { flash('#ff1a3c'); shake(true); }, 200);
  }
  const b = $('chalActs').querySelector('.main'); if (b) b.focus({ preventScroll: true });
}
function closeChallenge(rec) {
  const c = chal;
  if (!c || c.state === 'play') return;
  if (c.raf) cancelAnimationFrame(c.raf);
  c.timers.forEach(clearTimeout);
  chal = null;
  closeOv('chalOv');
  BGM.play('party'); BGM.level(1, 0.3);
  if (c.state !== 'done') return;
  renderGame();
  if (c.ok) { floatAt(c.p, 'SAFE!', true); telop('回避成功！', 'lime', 1200); }
  if (rec) openSheet(c.p, { base: c.cups });
}

/* ピタリストップ: the timer hides after 1.5 s; stop within ±0.3 s of the target */
function playStop(st, q) {
  const target = q.target, goal = '<p class="cg-goal">目標 <b>' + target.toFixed(2) + '</b> 秒</p>';
  chalCountdown(() => runStop(st, target, goal), goal);
}
function runStop(st, target, goal) {
  st.innerHTML = goal + '<div class="cg-timer" id="cgTimer">0.00</div>' +
    '<p class="cg-sub" id="cgSub">1.5秒で見えなくなる！</p><button type="button" class="cg-big" id="cgBtn">ストップ！</button>';
  const el = $('cgTimer'), t0 = performance.now();
  let hidden = false;
  chalLoop(now => {
    const t = (now - t0) / 1000;
    if (t < 1.5) el.textContent = t.toFixed(2);
    else if (!hidden) { hidden = true; el.textContent = '?.??'; el.classList.add('hide'); $('cgSub').textContent = '心の中でカウント…'; SE.play('swoosh'); }
    if (t > target + 3) { chalEnd(false, '止めないまま' + (target + 3).toFixed(1) + '秒が過ぎた'); return false; }
  });
  onPress($('cgBtn'), () => {
    if (!playing()) return;
    const t = (performance.now() - t0) / 1000, diff = Math.abs(t - target);
    el.classList.remove('hide'); el.textContent = t.toFixed(2);
    chalEnd(diff <= 0.3, t.toFixed(2) + '秒（目標' + target.toFixed(2) + '秒・誤差' + diff.toFixed(2) + '秒）');
  });
}
/* ジャストゲージ: a needle sweeps back and forth; stop it inside the green zone (one shot) */
function playGauge(st, q) {
  const W = q.W, Z = 4 + Math.random() * (92 - W), P = 1.3;
  st.innerHTML = '<p class="cg-sub">緑のゾーンで止めろ！ ・ 幅 <b>' + zoneLabel(W) + '</b></p><div class="cg-gauge"><div class="cg-zone" style="left:' + Z.toFixed(1) + '%;width:' + W + '%"></div><div class="cg-needle" id="cgNeedle"></div></div>' +
    '<button type="button" class="cg-big" id="cgBtn">ストップ！</button>';
  const nd = $('cgNeedle'), t0 = performance.now();
  let pos = 0;
  chalLoop(now => {
    const t = (now - t0) / 1000, x = (t / (P / 2)) % 2;
    pos = (x < 1 ? x : 2 - x) * 100;
    nd.style.left = pos.toFixed(2) + '%';
    if (t > 10) { chalEnd(false, '10秒以内に止めなかった'); return false; }
  });
  onPress($('cgBtn'), () => {
    if (!playing()) return;
    nd.classList.add('stop');
    const ok = pos >= Z && pos <= Z + W;
    const off = Math.min(Math.abs(pos - Z), Math.abs(pos - (Z + W)));
    chalEnd(ok, ok ? (Math.abs(pos - (Z + W / 2)) < W * 0.15 ? 'ど真ん中！' : 'ゾーンに入った！') : 'ゾーンまであと' + off.toFixed(1) + '%');
  });
}
/* 連打: 40 taps within 5 s */
function playMash(st, q) {
  const need = q.need;
  chalCountdown(() => {
    const T = 5;
    st.innerHTML = '<div class="cg-num"><b id="cgN">0</b><small> / ' + need + '回</small></div><div class="cg-bar"><i id="cgBar"></i></div>' +
      '<p class="cg-sub">のこり <b id="cgLeft">5.0</b> 秒</p><button type="button" class="cg-big mash" id="cgBtn">連打！</button>';
    let n = 0;
    const t0 = performance.now();
    chalLoop(now => {
      const left = T - (now - t0) / 1000;
      $('cgLeft').textContent = Math.max(0, left).toFixed(1);
      if (left <= 0) { chalEnd(false, n + '回（あと' + (need - n) + '回）'); return false; }
    });
    onPress($('cgBtn'), () => {
      if (!playing()) return;
      n++;
      $('cgN').textContent = n; $('cgBar').style.width = Math.min(100, n / need * 100) + '%';
      if (n % 4 === 0) SE.play('tap');
      const b = $('cgBtn'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
      if (n >= need) chalEnd(true, 'のこり' + Math.max(0, T - (performance.now() - t0) / 1000).toFixed(1) + '秒でクリア');
    });
  });
}
/* まんまる: draw one closed stroke; score = roundness (radius spread) minus a penalty for a gap between the ends */
function playCircle(st) {
  st.innerHTML = '<p class="cg-sub" id="cgSub">指で一筆、まるを描いて！</p><canvas class="cg-canvas" id="cgCv" aria-label="まるを描くところ"></canvas>';
  const cv = $('cgCv'), box = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
  const cx = cv.getContext('2d');
  cx.scale(dpr, dpr); cx.lineCap = 'round'; cx.lineJoin = 'round';
  let pts = null;
  const at = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  const retry = msg => { $('cgSub').textContent = msg + ' もう一回描いて！'; SE.play('buzz'); };
  const judge = P => {
    if (P.length < 12) return retry('短すぎ！');
    let mx = 0, my = 0;
    P.forEach(p => { mx += p[0]; my += p[1]; });
    mx /= P.length; my /= P.length;
    const rs = P.map(p => Math.hypot(p[0] - mx, p[1] - my));
    const R = rs.reduce((a, b) => a + b, 0) / rs.length;
    if (R < 35) return retry('小さすぎ！');
    let sweep = 0;
    for (let i = 1; i < P.length; i++) {
      let a = Math.atan2(P[i][1] - my, P[i][0] - mx) - Math.atan2(P[i - 1][1] - my, P[i - 1][0] - mx);
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      sweep += a;
    }
    if (Math.abs(sweep) < Math.PI * 1.75) return retry('ちゃんと一周して！');
    const sd = Math.sqrt(rs.reduce((a, b) => a + (b - R) * (b - R), 0) / rs.length);
    const gap = Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) / R;
    const score = Math.max(0, Math.min(100, Math.round(100 * (1 - 3.2 * sd / R) - Math.max(0, gap - 0.35) * 25)));
    cx.setLineDash([8, 8]); cx.strokeStyle = 'rgba(21,7,51,.5)'; cx.lineWidth = 3;
    cx.beginPath(); cx.arc(mx, my, R, 0, Math.PI * 2); cx.stroke(); cx.setLineDash([]);
    chalEnd(score >= 80, score + '点（80点以上でクリア）');
  };
  cv.addEventListener('pointerdown', e => {
    if (!playing()) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    pts = [at(e)];
    cx.clearRect(0, 0, box.width, box.height);
  });
  cv.addEventListener('pointermove', e => {
    if (!pts || !playing()) return;
    const p = at(e), q = pts[pts.length - 1];
    pts.push(p);
    cx.strokeStyle = '#ff4fa3'; cx.lineWidth = 8;
    cx.beginPath(); cx.moveTo(q[0], q[1]); cx.lineTo(p[0], p[1]); cx.stroke();
  });
  const up = () => { if (!pts) return; const P = pts; pts = null; if (playing()) judge(P); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  chalTimer(() => { if (playing()) chalEnd(false, '20秒以内に描けなかった'); }, 20000);
}
/* 色当て (Stroop): answer the ink colour, not the word; 5 in a row, 1.8 s each */
function playColor(st) {
  chalCountdown(() => {
    const N = 5, LIM = 1800;
    let q = 0, ink = 0, qT = 0;
    st.innerHTML = '<p class="cg-sub"><b id="cgQ">1</b> / ' + N + '問 ・ 文字の<b>色</b>はどれ？</p><div class="cg-word" id="cgWord"></div><div class="cg-bar thin"><i id="cgT"></i></div>' +
      '<div class="cg-choices" id="cgCh">' + INKS.map((c, i) => '<button type="button" data-i="' + i + '">' + c[0] + '</button>').join('') + '</div>';
    const next = () => {
      const w = Math.floor(Math.random() * 4);
      let k; do { k = Math.floor(Math.random() * 4); } while (k === w);
      ink = k;
      $('cgQ').textContent = q + 1;
      const el = $('cgWord');
      el.textContent = INKS[w][0]; el.style.color = INKS[k][1];
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      qT = performance.now();
    };
    next();
    chalLoop(now => {
      const left = 1 - (now - qT) / LIM;
      $('cgT').style.width = Math.max(0, left * 100) + '%';
      if (left <= 0) { chalEnd(false, (q + 1) + '問目で時間切れ（正解は「' + INKS[ink][0] + '」）'); return false; }
    });
    $('cgCh').querySelectorAll('button').forEach(b => onPress(b, () => {
      if (!playing()) return;
      const i = Number(b.dataset.i);
      if (i !== ink) { chalEnd(false, (q + 1) + '問目で「' + INKS[i][0] + '」（正解は「' + INKS[ink][0] + '」）'); return; }
      q++;
      SE.play('select');
      if (q >= N) { chalEnd(true, N + '問連続正解！'); return; }
      next();
    }));
  });
}
/* 数字タッチ: tap 1..9 in order within 5 s; one wrong tap is an instant out */
function playOrder(st) {
  chalCountdown(() => {
    const T = 5, nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let want = 1;
    st.innerHTML = '<p class="cg-sub">のこり <b id="cgLeft">5.0</b> 秒 ・ 次は <b id="cgNext">1</b></p><div class="cg-grid" id="cgGrid">' +
      nums.map(n => '<button type="button" data-n="' + n + '">' + n + '</button>').join('') + '</div>';
    const t0 = performance.now();
    let out = false;
    chalLoop(now => {
      if (out) return false;
      const left = T - (now - t0) / 1000;
      $('cgLeft').textContent = Math.max(0, left).toFixed(1);
      if (left <= 0) { chalEnd(false, (want - 1) + '個まで（あと' + (10 - want) + '個）'); return false; }
    });
    $('cgGrid').querySelectorAll('button').forEach(b => onPress(b, () => {
      if (!playing() || b.disabled || out) return;
      const n = Number(b.dataset.n);
      if (n !== want) {
        out = true;
        b.classList.add('miss');
        const right = $('cgGrid').querySelector('[data-n="' + want + '"]'); if (right) right.classList.add('hint');
        st.insertAdjacentHTML('beforeend', '<div class="cg-otetsuki" id="cgOut"><span class="ol">お手つき！</span></div>');
        SE.play('bubuu'); flash('#ff1a3c'); vibrate([80, 60, 160]);
        chalTimer(() => { const o = $('cgOut'); if (o) o.remove(); chalEnd(false, '「' + n + '」を押してお手つき（正解は「' + want + '」）'); }, 1100);
        return;
      }
      b.classList.add('ok'); b.disabled = true; want++;
      SE.play('select');
      if (want > 9) { chalEnd(true, ((performance.now() - t0) / 1000).toFixed(2) + '秒でクリア'); return; }
      $('cgNext').textContent = want;
    }));
  });
}

/* ハイ&ロー: casino table, 3D card flips, three-in-a-row lamps. Equal ranks are a push (draw again). */
const SUIT_PATH = {
  s: 'M50 6C50 6 8 42 8 63c0 16 16 25 31 17-3 9-7 15-13 19h48c-6-4-10-10-13-19 15 8 31-1 31-17C92 42 50 6 50 6z',
  h: 'M50 92C50 92 7 62 7 33 7 17 19 7 32 7c9 0 15 6 18 13 3-7 9-13 18-13 13 0 25 10 25 26 0 29-43 59-43 59z',
  d: 'M50 4L87 50 50 96 13 50z',
  c: 'M32 58a18 18 0 1 1 18-26 18 18 0 1 1 18 26 18 18 0 1 1-12 20l8 18H36l8-18a18 18 0 1 1-12-20z',
};
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const suitSvg = (k, cls) => '<svg class="' + cls + '" viewBox="0 0 100 100" aria-hidden="true"><path d="' + SUIT_PATH[k] + '"/></svg>';
function pcardFace(c) {
  const r = RANKS[c.r - 1], red = c.s === 'h' || c.s === 'd';
  return '<div class="pc-face' + (red ? ' red' : '') + '"><span class="pc-i tl"><b>' + r + '</b>' + suitSvg(c.s, 'pc-s') + '</span>' +
    '<span class="pc-mid"><b>' + r + '</b>' + suitSvg(c.s, 'pc-big') + '</span><span class="pc-i br"><b>' + r + '</b>' + suitSvg(c.s, 'pc-s') + '</span></div>';
}
const pcardBack = () => '<div class="pc-back"><span>酒</span></div>';
const flipCard = (id, c, open) => '<div class="flip' + (open ? ' open' : '') + '" id="' + id + '"><div class="flip-in"><div class="flip-b">' + pcardBack() + '</div><div class="flip-f">' + (c ? pcardFace(c) : '') + '</div></div></div>';
const rankName = c => RANKS[c.r - 1];
function playHilo(st) {
  const deck52 = shuffle([].concat(...['s', 'h', 'd', 'c'].map(s => RANKS.map((_, i) => ({ r: i + 1, s })))));
  let cur = deck52.pop(), streak = 0, busy = false;
  const NEED = 3;
  st.innerHTML = '<div class="hl-wrap"><div class="hl-lamps" id="hlLamps">' + '<i></i>'.repeat(NEED) + '</div>' +
    '<div class="hl-row"><div class="hl-slot"><span class="hl-tag">いま</span><div class="hl-card" id="hlCurBox">' + flipCard('hlCur', cur, true) + '</div></div>' +
    '<div class="hl-vs">VS</div>' +
    '<div class="hl-slot"><span class="hl-tag">つぎ</span><div class="hl-card" id="hlNextBox">' + flipCard('hlNext', null, false) + '</div></div></div>' +
    '<p class="hl-msg" id="hlMsg">つぎのカードは<br><b>上</b>か<b>下</b>か？</p></div>' +
    '<div class="hl-btns"><button type="button" class="hl-btn hi" data-h="1"><span class="ar">▲</span>ハイ<small>上</small></button>' +
    '<button type="button" class="hl-btn lo" data-h="-1"><span class="ar">▼</span>ロー<small>下</small></button></div>';
  SE.play('deal');
  const msg = h => { const m = $('hlMsg'); m.innerHTML = h; m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); };
  const btns = () => st.querySelectorAll('.hl-btn');
  const lock = on => btns().forEach(b => { b.disabled = on; if (!on) b.classList.remove('picked'); });
  const advance = next => chalTimer(() => {
    cur = next;
    $('hlCurBox').innerHTML = flipCard('hlCur', cur, true);
    $('hlNextBox').innerHTML = flipCard('hlNext', null, false);
    $('hlCurBox').firstElementChild.classList.add('slide');
    $('hlNextBox').firstElementChild.classList.add('deal');
    SE.play('deal');
    msg(streak ? '<b>' + streak + '連続</b>正解中！ あと' + (NEED - streak) + '回<br>つぎは上？下？' : 'もう一回！<br>つぎは上？下？');
    busy = false; lock(false);
  }, 900);
  const guess = (dir, btn) => {
    if (!playing() || busy) return;
    busy = true; lock(true); btn.classList.add('picked');
    if (!deck52.length) deck52.push(...shuffle([].concat(...['s', 'h', 'd', 'c'].map(s => RANKS.map((_, i) => ({ r: i + 1, s }))))));
    const next = deck52.pop();
    const box = $('hlNext');
    box.classList.add('suspense');
    msg(dir > 0 ? '<b>ハイ</b>で勝負…！' : '<b>ロー</b>で勝負…！');
    SE.play('roll');
    chalTimer(() => {
      box.classList.remove('suspense');
      box.querySelector('.flip-f').innerHTML = pcardFace(next);
      box.classList.add('open');
      SE.play('flip');
      chalTimer(() => {
        if (next.r === cur.r) { box.classList.add('push'); msg('同じ <b>' + rankName(next) + '</b>！<br>引き分けでやり直し'); SE.play('poof'); advance(next); return; }
        const ok = dir > 0 ? next.r > cur.r : next.r < cur.r;
        if (!ok) {
          box.classList.add('lose'); msg('ハズレ…');
          chalTimer(() => chalEnd(false, rankName(cur) + ' → ' + rankName(next) + '（' + (dir > 0 ? 'ハイ' : 'ロー') + 'を選んだ）'), 700);
          return;
        }
        streak++;
        const lamp = $('hlLamps').children[streak - 1]; if (lamp) lamp.classList.add('on');
        box.classList.add('win'); msg('正解！');
        SE.play('ding');
        const q = relPos(box); FXC.burst(q.x, q.y, 36, { colors: GOLD, star: true, speed: 9 });
        if (streak >= NEED) { chalTimer(() => chalEnd(true, NEED + '連続正解！（最後は' + rankName(cur) + ' → ' + rankName(next) + '）'), 750); return; }
        advance(next);
      }, 520);
    }, 850);
  };
  btns().forEach(b => onPress(b, () => guess(Number(b.dataset.h), b)));
}

/* ---------- 爆弾パス回し: topic draw, ignite, pass clockwise; a hidden 12–40 s fuse; whoever holds it at the blast drinks ---------- */
const BOMB_TOPICS = ['果物の名前', '野菜の名前', '動物の名前', '魚の名前', '鳥の名前', '国の名前', '都道府県', '山手線の駅', 'お酒の種類', '居酒屋のおつまみ',
  'コンビニで買えるもの', '赤いもの', '白いもの', '丸いもの', '冷たいもの', '甘いもの', 'キッチンにあるもの', '学校にあるもの', '夏といえば', '冬といえば',
  'スポーツ', '楽器', '乗り物', 'お菓子', '寿司ネタ', 'ラーメンの具', '色の名前', '花の名前', '職業', '体の部位', '家電', '世界の首都',
  '「あ」から始まる言葉', '「か」から始まる言葉', 'カタカナ3文字の言葉', 'ゆるキャラ・マスコット'];
const BOMB_SVG = '<svg class="bm-svg" viewBox="0 0 220 230" aria-hidden="true">' +
  '<defs><radialGradient id="bmBody" cx="36%" cy="32%" r="72%"><stop offset="0" stop-color="#77739a"/><stop offset=".38" stop-color="#2c2745"/><stop offset="1" stop-color="#0b0816"/></radialGradient></defs>' +
  '<path class="bm-fuse-bg" d="M128 62C140 36 160 40 172 24S196 10 206 6"/>' +
  '<path class="bm-fuse" id="bmFuse" d="M128 62C140 36 160 40 172 24S196 10 206 6"/>' +
  '<rect x="108" y="50" width="34" height="26" rx="5" transform="rotate(32 125 63)" fill="#3d3858" stroke="#150733" stroke-width="6"/>' +
  '<ellipse cx="104" cy="222" rx="70" ry="8" fill="rgba(0,0,0,.35)"/>' +
  '<circle cx="104" cy="140" r="78" fill="url(#bmBody)" stroke="#150733" stroke-width="7"/>' +
  '<ellipse cx="74" cy="104" rx="20" ry="11" fill="#fff" opacity=".35" transform="rotate(-35 74 104)"/>' +
  '<g><path d="M62 126l30 10M146 126l-30 10" stroke="#fff" stroke-width="7" stroke-linecap="round"/>' +
  '<ellipse cx="80" cy="146" rx="12" ry="14" fill="#fff"/><ellipse cx="128" cy="146" rx="12" ry="14" fill="#fff"/>' +
  '<circle cx="83" cy="149" r="6" fill="#150733"/><circle cx="125" cy="149" r="6" fill="#150733"/>' +
  '<path d="M84 180q20-12 40 0" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/></g>' +
  '</svg>';
/* the spark rides the fuse as its own HTML layer (its flicker / spin never forces the bomb SVG to re-draw) */
const BOMB_SPARK = '<i class="bm-spk" id="bmSpk"><svg viewBox="-22 -22 44 44" aria-hidden="true"><path d="M0-20V20M-20 0H20M-14-14L14 14M-14 14L14-14"/></svg></i>';
let bomb = null;
function bombTimer(fn, ms) { const b = bomb; const id = setTimeout(() => { if (bomb === b) fn(); }, ms); b.timers.push(id); return id; }
function openBomb() {
  const cur = G.cur, c = cur.card;
  if (bomb || chal || !c || c.fx !== 'bomb' || cur.bombDone) return;
  const n = G.players.length;
  bomb = { holder: cur.drawer, n, cups: c.cups.length ? c.cups[c.cups.length - 1] : 1, state: 'intro', timers: [], raf: 0, passes: 0, topic: BOMB_TOPICS[Math.floor(Math.random() * BOMB_TOPICS.length)], lockUntil: 0 };
  const ov = $('bombOv');
  ov.className = 'ov bomb-ov';
  $('bombStage').innerHTML = '<div class="bm-hero"><i class="bm-glow"></i>' + BOMB_SVG + BOMB_SPARK + '</div>';
  $('bombTop').innerHTML = '<h2 class="bm-title ol" id="bombTitle">爆弾パス回し</h2><p class="bm-rule">お題に合うものを1つ言ってから<b>パス</b>！ 左隣へ回す<br>爆発したときに持っていた人が <b>' + bomb.cups + '杯</b></p>';
  $('bombBottom').innerHTML = '<p class="bm-topic" id="bombTopic">お題を抽選中…</p><div class="bm-acts"><button type="button" class="pbtn white small" data-b="cancel">やめる</button><button type="button" class="pbtn big main" data-b="ignite" disabled>点火！</button></div>';
  openOv('bombOv');
  BGM.play('tension');
  SE.play('pop');
  let k = 0;
  const roll = () => {
    const t = $('bombTopic');
    if (++k < 14 && !reduceMotion) { t.innerHTML = 'お題：<b>' + esc(BOMB_TOPICS[Math.floor(Math.random() * BOMB_TOPICS.length)]) + '</b>'; SE.play('tick'); bombTimer(roll, 50 + k * 10); return; }
    t.innerHTML = 'お題：<b>' + esc(bomb.topic) + '</b>'; t.classList.add('set'); SE.play('go');
    const ig = $('bombBottom').querySelector('[data-b="ignite"]'); ig.disabled = false; ig.classList.add('pulse'); ig.focus({ preventScroll: true });
  };
  roll();
}
function bombHolderHTML() {
  const h = bomb.holder, nx = (h + 1) % bomb.n;
  return '<p class="bm-now">いま持っているのは</p><p class="bm-name" style="--p:' + pc(h) + '">' + esc(pname(h)) + '</p>' +
    '<p class="bm-meta"><span class="bm-topic-s">お題：<b>' + esc(bomb.topic) + '</b></span><span>パス <b id="bombPasses">' + bomb.passes + '</b>回</span></p>';
}
function igniteBomb() {
  const b = bomb;
  if (!b || b.state !== 'intro') return;
  b.state = 'play';
  b.T = 12 + Math.floor(Math.random() * 281) / 10;
  b.t0 = performance.now();
  b.flares = [0.25, 0.55, 0.8].map(f => f * b.T + (Math.random() - 0.5) * 3).filter(x => x > 3 && x < b.T - 1.5);
  const ov = $('bombOv');
  ov.classList.add('lit');
  $('bombTop').innerHTML = '<div class="bm-holder" id="bombHolder">' + bombHolderHTML() + '</div><button type="button" class="bm-abort" data-b="abort">中断</button>';
  $('bombBottom').innerHTML = '<button type="button" class="bm-pass" id="bombPass"><span class="bm-pass-t">言えた！ パス</span><span class="bm-pass-n" id="bombNext">▶ ' + esc(pname((b.holder + 1) % b.n)) + 'へ</span><i class="bm-cool" id="bombCool"></i></button>';
  onPress($('bombPass'), passBomb);
  SE.play('ignite'); flash('#ffb13b'); vibrate(80);
  telop('点火！！', 'red', 1000);
  const fuse = $('bmFuse'), spark = $('bmSpk'), total = fuse.getTotalLength();
  const svg = ov.querySelector('.bm-svg');
  let nextTick = 0, tickN = 0, tier = -1, lastVis = 2;
  /* per frame this only reads the clock: the fuse is redrawn ~5 times a second (a step of well under 1px),
     and every other effect is a class change or a transform animation the compositor runs on its own */
  const frame = now => {
    if (bomb !== b || b.state !== 'play') return;
    const t = (now - b.t0) / 1000;
    if (t >= b.T) { explodeBomb(); return; }
    b.raf = requestAnimationFrame(frame);
    try { bombFrame(t, now); } catch (_) { /* one bad frame must never stop the fuse */ }
  };
  const bombFrame = (t, now) => {
    const nt = Math.min(5, Math.floor(t / 6));
    if (nt !== tier) { if (tier >= 0) ov.classList.remove('heat' + tier); tier = nt; ov.classList.add('heat' + tier); }
    const vis = Math.max(0.06, 1 - t / 44);
    if (lastVis - vis >= 0.004) {
      lastVis = vis;
      fuse.style.strokeDasharray = (total * vis).toFixed(1) + ' ' + total.toFixed(1);
      const pt = fuse.getPointAtLength(total * vis);
      spark.style.left = (pt.x / 2.2).toFixed(2) + '%';
      spark.style.top = (pt.y / 2.3).toFixed(2) + '%';
    }
    if (now >= nextTick) {
      const iv = Math.max(0.2, 0.72 - t * 0.014);
      nextTick = now + iv * 1000;
      SE.play(tickN++ % 2 ? 'tock' : 'tick2');
      if (!reduceMotion && svg.animate) {
        const s = tier >= 3 ? 1.11 : 1.05;
        try { b.beat = svg.animate([{ transform: 'scale(1)' }, { transform: 'scale(' + s + ')', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' }); } catch (_) { /* ignore */ }
      }
    }
    if (b.flares.length && t >= b.flares[0]) {
      b.flares.shift();
      ov.classList.add('flare');
      bombTimer(() => ov.classList.remove('flare'), 650);
      SE.play('hiss'); vibrate(40);
    }
  };
  b.raf = requestAnimationFrame(frame);
}
function passBomb() {
  const b = bomb;
  if (!b || b.state !== 'play' || performance.now() < b.lockUntil) return;
  b.holder = (b.holder + 1) % b.n; b.passes++;
  b.lockUntil = performance.now() + 700;
  const hd = $('bombHolder');
  hd.classList.add('in');           /* the freshly inserted name plays its slide-in on its own — no forced re-layout */
  hd.innerHTML = bombHolderHTML();
  $('bombNext').textContent = '▶ ' + pname((b.holder + 1) % b.n) + 'へ';
  const cool = $('bombCool');
  if (cool && cool.animate) { try { cool.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 700, easing: 'linear' }); } catch (_) { /* ignore */ } }
  SE.play('pass'); vibrate(25);
}
function explodeBomb() {
  const b = bomb;
  if (!b || b.state !== 'play') return;
  b.state = 'done';
  if (b.raf) cancelAnimationFrame(b.raf);
  if (b.beat) { try { b.beat.cancel(); } catch (_) { /* ignore */ } }
  const cur = G.cur;
  try { cur.drinks.push({ kind: 'bomb', snap: snap(), p: b.holder, items: [] }); } catch (_) { /* ignore */ }
  cur.bombDone = true;
  saveGame();
  /* the result (who drinks + the buttons) comes first, so nothing below can ever leave the screen without a way out */
  bombTimer(() => {
    $('bombTop').innerHTML = '<p class="bm-now">爆発したとき持っていたのは…</p><p class="bm-name loser" style="--p:' + pc(b.holder) + '">' + esc(pname(b.holder)) + '</p>' +
      '<p class="bm-verdict ol">' + b.cups + '杯！</p><p class="bm-meta"><span>パス ' + b.passes + '回</span><span>' + b.T.toFixed(1) + '秒で爆発</span></p>';
    $('bombBottom').innerHTML = '<div class="bm-acts"><button type="button" class="pbtn white small" data-b="close">閉じる</button><button type="button" class="pbtn big main" data-b="rec">' + esc(pname(b.holder)) + 'の記録へ</button></div>';
    b.resultAt = performance.now();
    SE.play('hell');
  }, 1400);
  const ov = $('bombOv');
  ov.classList.remove('lit', 'heat0', 'heat1', 'heat2', 'heat3', 'heat4', 'heat5', 'flare');
  ov.classList.add('boom');
  $('bombBottom').innerHTML = '';
  const fx = (name, fn) => { try { fn(); } catch (_) { /* an effect failing must never hold up the result */ } };
  fx('bgm', () => BGM.level(0, 0.02));
  const st = $('bombStage');
  fx('blast', () => st.insertAdjacentHTML('beforeend', '<div class="bm-blast" aria-hidden="true"><svg viewBox="-100 -100 200 200"><polygon class="bm-star o" points="' + starPts(16, 96, 52) + '"/><polygon class="bm-star y" points="' + starPts(12, 70, 34) + '"/><circle r="24" fill="#fff"/></svg>' +
    '<i class="bm-ring"></i><i class="bm-ring r2"></i>' + Array.from({ length: 6 }, (_, i) => '<i class="bm-smoke" style="--a:' + (i * 60 + Math.random() * 20) + 'deg;--d:' + (60 + Math.random() * 60).toFixed(0) + 'px;--s:' + (0.8 + Math.random() * 0.8).toFixed(2) + '"></i>').join('') + '</div>'));
  fx('se', () => SE.play('boom'));
  fx('flash', () => { flash('#ffffff'); bombTimer(() => flash('#ff8b2b'), 120); });
  fx('shake', () => {
    if (reduceMotion) return;
    const box = ov.querySelector('.bomb-box');
    if (box) { box.classList.remove('shk'); void box.offsetWidth; box.classList.add('shk'); bombTimer(() => box.classList.remove('shk'), 1050); }
  });
  fx('vibrate', () => vibrate([400, 100, 300]));
  fx('burst', () => { const q = relPos(st); FXC.burst(q.x, q.y, 90, { colors: ['#ff3d1f', '#ffb13b', '#ffe066', '#ffffff', '#3a3450'], speed: 22, spread: Math.PI * 2 }); });
  fx('telop', () => telop('ドカーン！！', 'devil', 1500));
}
function starPts(n, R, r) { const a = []; for (let i = 0; i < n * 2; i++) { const rr = i % 2 ? r : R * (0.8 + Math.random() * 0.25), t = i * Math.PI / n; a.push((Math.cos(t) * rr).toFixed(1) + ',' + (Math.sin(t) * rr).toFixed(1)); } return a.join(' '); }
function closeBomb(rec) {
  const b = bomb;
  if (!b) return;
  if (b.raf) cancelAnimationFrame(b.raf);
  b.timers.forEach(clearTimeout);
  bomb = null;
  closeOv('bombOv');
  BGM.play('party'); BGM.level(1, 0.3);
  if (b.state !== 'done') return;
  renderGame();
  if (rec) openSheet(b.holder, { base: b.cups });
}

/* ---------- card timer: 「30秒」「10秒で」… get a countdown; 「10秒ストップ」 gets a hidden-stopwatch duel ---------- */
let timer = null;
function tmLater(fn, ms) { const T = timer; const id = setTimeout(() => { if (timer === T) fn(); }, ms); T.timers.push(id); return id; }
function stopTimerWork(T) {
  if (T.raf) cancelAnimationFrame(T.raf);
  T.raf = 0;
  T.timers.forEach(clearTimeout); T.timers = [];
  if (T.anim) { try { T.anim.cancel(); } catch (_) { /* ignore */ } T.anim = null; }
}
function timerTag(c) {
  const tm = timerOf(c);
  return tm ? '<span class="gc-dur tm">' + (tm.stop ? 'ストップ対決' : 'タイマー ' + fmtSec(tm.sec)) + '</span>' : '';
}
/* the people the card names, in the order it names them (at most two); nobody named = the drawer */
function timerPlayers(c) {
  const out = [];
  (String(c.text).match(TAG_RE) || []).forEach(t => { const i = G.cur.names[t.slice(1, -1)]; if (i != null && !out.includes(i)) out.push(i); });
  if (!out.length) out.push(G.cur.drawer);
  return out.slice(0, 2);
}
function openTimer() {
  const c = G.cur.card, tm = timerOf(c);
  if (timer || !tm) return;
  timer = { mode: tm.stop ? 'stop' : 'count', sec: tm.sec, cups: c.cups.length ? c.cups[0] : 1, timers: [], raf: 0, anim: null, state: 'ready', guard: 0 };
  $('tmHead').innerHTML = '<h2 class="tm-title ol" id="tmTitle"><span class="tm-mark" style="--c:' + colorVar(c.color) + '">' + esc(c.mark) + '</span>' +
      (tm.stop ? fmtSec(tm.sec) + 'ストップ対決' : fmtSec(tm.sec) + 'タイマー') + '</h2>' +
    '<p class="tm-card">' + fillGame(c.text) + '</p>';
  openOv('timerOv');
  BGM.play('tension'); BGM.level(0.6, 0.3);
  SE.play('pop');
  if (timer.mode === 'stop') swSetup(); else cdReady();
}
function closeTimer() {
  const T = timer;
  if (!T) return;
  stopTimerWork(T);
  timer = null;
  closeOv('timerOv');
  BGM.play('party'); BGM.level(1, 0.3);
}
function tmState(cls) { $('timerOv').className = 'ov timer-ov' + (timer && timer.mode === 'stop' ? ' swmode' : '') + (cls ? ' ' + cls : ''); }
function tmActs(h, focus) {
  const a = $('tmActs');
  a.innerHTML = h;
  const f = focus === false ? null : a.querySelector('.main') || a.querySelector('button');
  if (f) f.focus({ preventScroll: true });
}
function tmPop(el) {
  if (!el || !el.animate || reduceMotion) return;
  try { el.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 280, easing: 'cubic-bezier(.2,1.4,.4,1)' }); } catch (_) { /* ignore */ }
}
const TM_DONE = '<button type="button" class="pbtn white small" data-tm="again">もう一回</button><button type="button" class="pbtn big main" data-tm="close">OK！</button>';

/* countdown: 3-2-1, then a ring that empties, a clock tick every second, red "hurry" for the last seconds, a buzzer at 0 */
function cdReady() {
  const T = timer;
  stopTimerWork(T);
  T.state = 'ready'; T.hurry = false;
  tmState('');
  $('tmStage').innerHTML = '<div class="tm-ring"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="tm-track" cx="100" cy="100" r="84"/><circle class="tm-arc" id="tmArc" cx="100" cy="100" r="84" pathLength="100"/></svg>' +
    '<div class="tm-center"><b class="tm-num" id="tmNum">' + T.sec + '</b><span class="tm-unit" id="tmUnit">秒</span></div></div>' +
    '<p class="tm-sub" id="tmSub">準備ができたら <b>スタート</b>！</p>';
  tmActs('<button type="button" class="pbtn white small" data-tm="close">閉じる</button><button type="button" class="pbtn big main pulse" data-tm="start">スタート！</button>');
}
function cdStart() {
  const T = timer;
  if (!T || T.state !== 'ready') return;
  T.state = 'countin';
  tmActs('<button type="button" class="pbtn white small" data-tm="cancel">やめる</button>', false);
  $('tmSub').textContent = 'よーい…';
  const num = $('tmNum');
  $('tmUnit').textContent = '';
  ['3', '2', '1'].forEach((s, i) => tmLater(() => { num.textContent = s; tmPop(num); SE.play('beep'); }, i * 650));
  tmLater(cdRun, 3 * 650);
}
function cdRun() {
  const T = timer;
  T.state = 'run';
  T.t0 = performance.now(); T.end = T.t0 + T.sec * 1000;
  T.hurryAt = Math.min(5, Math.max(3, Math.round(T.sec * 0.3)));
  tmState('run');
  const num = $('tmNum'), arc = $('tmArc');
  num.textContent = String(T.sec);
  $('tmUnit').textContent = '秒';
  $('tmSub').innerHTML = '<b>スタート！</b>';
  tmActs('<button type="button" class="pbtn big white main" data-tm="stop">ストップ</button>');
  SE.play('go'); flash('#35e0ff'); vibrate(60);
  BGM.level(0.45, 0.3);
  if (arc.animate) { try { T.anim = arc.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 100 }], { duration: T.sec * 1000, easing: 'linear', fill: 'forwards' }); } catch (_) { T.anim = null; } }
  let lastWhole = T.sec, shown = '';
  const step = now => {
    if (timer !== T || T.state !== 'run') return;
    const left = Math.max(0, (T.end - now) / 1000);
    if (left <= 0) { cdOver(); return; }
    T.raf = requestAnimationFrame(step);
    const s = left > 3 ? String(Math.ceil(left)) : left.toFixed(1);
    if (s !== shown) { shown = s; num.textContent = s; }
    if (!T.anim) arc.style.strokeDashoffset = (100 - left / T.sec * 100).toFixed(2);
    const whole = Math.ceil(left);
    if (whole < lastWhole) {
      lastWhole = whole;
      if (whole <= T.hurryAt) {
        if (!T.hurry) { T.hurry = true; tmState('run hurry'); $('tmSub').innerHTML = 'のこり <b>' + T.hurryAt + '</b> 秒！'; BGM.level(0.2, 0.2); }
        SE.play('hurry'); tmPop(num);
        if (whole <= 3) vibrate(25);
      } else SE.play(whole % 2 ? 'tock' : 'tick2');
    }
  };
  T.raf = requestAnimationFrame(step);
}
function cdOver() {
  const T = timer;
  T.state = 'over';
  if (T.raf) cancelAnimationFrame(T.raf);
  T.guard = performance.now() + 600;   /* a late tap on ストップ must not land on the new buttons */
  tmState('over');
  $('tmNum').textContent = '0';
  $('tmStage').querySelector('.tm-ring').insertAdjacentHTML('beforeend', '<p class="tm-stamp ol">タイムアップ！</p>');
  $('tmSub').innerHTML = '<b>時間切れ！</b>';
  SE.play('timeup'); flash('#ff1a3c'); vibrate([200, 80, 300]);
  BGM.level(0.12, 0.05);
  const box = $('timerOv').querySelector('.tm-box');
  if (box && !reduceMotion) { box.classList.remove('shk'); void box.offsetWidth; box.classList.add('shk'); tmLater(() => box.classList.remove('shk'), 1050); }
  tmActs(TM_DONE);
}
function cdStop() {
  const T = timer;
  if (!T || T.state !== 'run') return;
  const now = performance.now(), left = Math.max(0, (T.end - now) / 1000), used = (now - T.t0) / 1000;
  T.state = 'stopped';
  if (T.raf) cancelAnimationFrame(T.raf);
  if (T.anim) { try { T.anim.pause(); } catch (_) { /* ignore */ } }
  T.guard = now + 500;
  tmState('stopped');
  $('tmNum').textContent = left.toFixed(1);
  $('tmSub').innerHTML = 'ストップ！ <b>' + used.toFixed(1) + '</b>秒で止めた（のこり' + left.toFixed(1) + '秒）';
  SE.play('ding'); BGM.level(0.6, 0.3);
  tmActs(TM_DONE);
}

/* 「N秒ストップ」: each player starts and stops a stopwatch without seeing it; both times are revealed together, farthest from N drinks */
function swSetup() {
  const T = timer;
  stopTimerWork(T);
  T.ps = timerPlayers(G.cur.card); T.times = []; T.k = 0; T.loser = null; T.state = 'ready';
  tmState('');
  $('tmStage').innerHTML = '<div class="sw-row">' + T.ps.map((p, i) => (i ? '<span class="sw-vs ol">VS</span>' : '') +
      '<div class="sw-p" id="swP' + i + '" style="--p:' + pc(p) + '"><span class="sw-name">' + esc(pname(p)) + '</span><b class="sw-time" id="swT' + i + '">--.--</b><span class="sw-diff" id="swD' + i + '"></span></div>').join('') + '</div>' +
    '<p class="tm-sub" id="tmSub"></p><button type="button" class="cg-big sw-btn" id="swBtn">スタート</button>';
  onPress($('swBtn'), swPress);
  tmActs('<button type="button" class="pbtn white small" data-tm="close">やめる</button>', false);
  swTurn();
}
function swTurn() {
  const T = timer, i = T.k;
  T.state = 'ready';
  T.ps.forEach((_, j) => { const el = $('swP' + j); el.classList.toggle('now', j === i); el.classList.toggle('wait', j > i); });
  $('tmSub').innerHTML = '<b>' + esc(pname(T.ps[i])) + '</b> の番！<br>画面を見ずに、' + fmtSec(T.sec) + 'だと思ったらストップ';
  const b = $('swBtn');
  b.textContent = 'スタート'; b.classList.remove('run'); b.disabled = false;
  b.focus({ preventScroll: true });
}
function swPress() {
  const T = timer;
  if (!T || T.mode !== 'stop') return;
  const i = T.k, b = $('swBtn');
  if (T.state === 'ready') {
    T.state = 'run'; T.t0 = performance.now();
    b.textContent = 'ストップ！'; b.classList.add('run');
    $('swT' + i).textContent = '計測中'; $('swP' + i).classList.add('measuring');
    $('tmSub').innerHTML = '画面を見ないで！<br>心の中でカウント…';
    SE.play('select'); BGM.level(0, 0.15); vibrate(30);
    T.cap = tmLater(swPress, (T.sec * 3 + 5) * 1000);
    return;
  }
  if (T.state !== 'run') return;
  T.times[i] = (performance.now() - T.t0) / 1000;
  clearTimeout(T.cap);
  T.state = 'gap';
  $('swT' + i).textContent = '??.??';
  $('swP' + i).classList.remove('measuring');
  b.disabled = true;
  SE.play('pop'); vibrate(30);
  if (i + 1 < T.ps.length) { T.k++; $('tmSub').innerHTML = '記録OK！<br>次の人にスマホを渡して'; tmLater(swTurn, 900); }
  else tmLater(swReveal, 600);
}
function swReveal() {
  const T = timer;
  T.state = 'reveal';
  const b = $('swBtn'); if (b) b.remove();
  T.ps.forEach((_, j) => $('swP' + j).classList.remove('now', 'wait'));
  $('tmSub').innerHTML = '<b>結果発表…！</b>';
  BGM.level(0.3, 0.2);
  SE.play('roll');
  const diffs = T.times.map(t => Math.abs(t - T.sec));
  T.ps.forEach((_, j) => tmLater(() => {
    const el = $('swT' + j);
    el.textContent = T.times[j].toFixed(2); el.classList.add('show');
    $('swD' + j).textContent = fmtSec(T.sec) + 'との差 ' + diffs[j].toFixed(2) + '秒';
    SE.play('flip');
  }, 800 + j * 450));
  tmLater(() => swResult(diffs), 800 + T.ps.length * 450 + 300);
}
function swResult(diffs) {
  const T = timer;
  T.state = 'done';
  T.guard = performance.now() + 500;
  if (T.ps.length < 2) {
    $('tmSub').innerHTML = fmtSec(T.sec) + 'との差 <b>' + diffs[0].toFixed(2) + '</b>秒';
    SE.play(diffs[0] <= 0.3 ? 'bigheaven' : 'ding');
    tmActs(TM_DONE);
    return;
  }
  const d0 = Math.round(diffs[0] * 100), d1 = Math.round(diffs[1] * 100);
  if (d0 === d1) {
    T.ps.forEach((_, j) => $('swP' + j).classList.add('lose'));
    $('tmSub').innerHTML = 'まさかの同じ差！ 2人とも <b>' + T.cups + '杯</b>';
    SE.play('hell'); flash('#e8233f');
    tmActs('<button type="button" class="pbtn white small" data-tm="close">閉じる</button><button type="button" class="pbtn big main" data-tm="multi">2人を記録へ</button>');
    return;
  }
  const lose = d0 > d1 ? 0 : 1, win = 1 - lose;
  T.loser = T.ps[lose];
  $('swP' + lose).classList.add('lose'); $('swP' + win).classList.add('win');
  $('tmSub').innerHTML = '<b>' + esc(pname(T.loser)) + '</b> の負け！ ' + T.cups + '杯';
  SE.play('bigheaven'); vibrate([60, 40, 60]);
  const q = relPos($('swP' + win)); FXC.burst(q.x, q.y, 60, { colors: GOLD, star: true, speed: 11 });
  tmActs('<button type="button" class="pbtn white small" data-tm="close">閉じる</button><button type="button" class="pbtn big main" data-tm="rec">' + esc(pname(T.loser)) + 'の記録へ</button>');
}

/* ---------- tap duel ---------- */
function openTap() {
  const a = G.cur.names['引いた人'], b = G.cur.names['ランダム'];
  tap = { sides: [a, b], state: 'count', timers: [], goAt: 0, loser: null };
  const half = (i, id) => '<span class="tap-name">' + esc(pname(tap.sides[i])) + '</span><span class="tap-msg" id="' + id + '">合図が出たらここをタップ！</span>';
  $('tapBottom').innerHTML = half(0, 'tapMsg0');
  $('tapTop').innerHTML = half(1, 'tapMsg1');
  $('tapBottom').className = 'tap-half bottom';
  $('tapTop').className = 'tap-half top';
  $('tapCenter').innerHTML = '<span class="tap-count" id="tapCount">3</span><button type="button" class="pbtn white tiny" data-t="close">やめる</button>';
  openOv('tapOv');
  BGM.play('tension');
  const T = tap;
  const cnt = s => { const el = $('tapCount'); el.textContent = s; el.classList.remove('go', 'wait'); void el.offsetWidth; el.classList.add('go'); };
  const waitMs = (10 + Math.floor(Math.random() * 91)) * 100;
  ['3', '2', '1'].forEach((s, i) => T.timers.push(setTimeout(() => { if (tap !== T || T.state !== 'count') return; cnt(s); SE.play('beep'); }, i * 750)));
  T.timers.push(setTimeout(() => { if (tap !== T || T.state !== 'count') return; T.state = 'wait'; cnt('…'); $('tapCount').classList.add('wait'); }, 3 * 750));
  T.timers.push(setTimeout(() => {
    if (tap !== T || T.state !== 'wait') return;
    T.state = 'go'; T.goAt = performance.now();
    cnt('タップ！');
    SE.play('go'); flash('#ffd83d');
  }, 3 * 750 + waitMs));
}
function tapHit(side) {
  if (!tap || tap.state === 'done') return;
  let loser, winMsg, loseMsg;
  if (tap.state === 'go') {
    loser = 1 - side;
    winMsg = 'はやい！ ' + Math.round(performance.now() - tap.goAt) + 'ミリ秒';
    loseMsg = 'おそい…';
    SE.play('bigheaven');
  } else {
    loser = side;
    winMsg = '相手のフライング！';
    loseMsg = 'フライング！';
    SE.play('buzz');
  }
  tap.state = 'done';
  tap.timers.forEach(clearTimeout);
  tap.loser = tap.sides[loser];
  const els = [$('tapBottom'), $('tapTop')];
  els[loser].classList.add('lose'); els[1 - loser].classList.add('win');
  $('tapMsg' + loser).textContent = loseMsg; $('tapMsg' + (1 - loser)).textContent = winMsg;
  const wp = relPos(els[1 - loser]); FXC.burst(wp.x, wp.y, 50);
  $('tapCenter').innerHTML = '<p class="tap-res"><b>' + esc(pname(tap.loser)) + '</b> の負け！</p><div class="tap-acts">' +
    '<button type="button" class="pbtn small" data-t="rec">' + esc(pname(tap.loser)) + 'の記録へ</button>' +
    '<button type="button" class="pbtn white tiny" data-t="again">もう一回</button><button type="button" class="pbtn white tiny" data-t="close">閉じる</button></div>';
  const b = $('tapCenter').querySelector('[data-t="rec"]'); if (b) b.focus({ preventScroll: true });
}
function closeTap(rec) {
  if (!tap) return;
  tap.timers.forEach(clearTimeout);
  const loser = tap.loser;
  tap = null;
  closeOv('tapOv');
  BGM.play('party');
  if (rec && loser != null) openSheet(loser);
}

/* ---------- 遊び方ガイド: a full-screen manual (tabs + pages), opened from the title, the ？ button in the game and the record sheet ---------- */
const GUIDE_SEEN_KEY = 'sakego-guide-seen', COACH_KEY = 'sakego-coach', RECS_KEY = 'sakego-recs';
const lsGet = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } };
const CAT_DESC = {
  hit: '書かれた人が、そのまま飲む', duel: '2人で勝負して、負けた方が飲む', name: '引いた人が、飲む人を指名する',
  all: '全員参加。当てはまった人が飲む', topic: 'お題で遊ぶ。答えられなかった人が飲む', rule: 'しばらく続くルールが増える（継続カード）',
  app: 'アプリの集計・ルーレット・早押しを使う', chal: 'アプリのミニゲームに挑戦。クリアで回避', safe: '飲まなくていい・助かる効果',
  c1: 'サイコロ・トランプ・ダーツなど、道具を使う遊び',
};
/* look-alikes of the app's own parts, so the guide shows exactly what to look for (they are pictures, not buttons) */
const gBtn = (t, cls) => '<span class="gd-b pbtn ' + (cls || 'small') + '">' + t + '</span>';
const gSeat = (name, total, i, role, tap) => '<span class="gd-seat' + (tap ? ' tap' : '') + '" style="--p:' + pc(i) + '">' + (role ? '<span class="gd-role">' + role + '</span>' : '') + name + '<small>' + total + '杯</small></span>';
const gTip = h => '<p class="gd-tip">' + h + '</p>';
const gCard = (title, body, num) => '<section class="gd-card"><h3>' + (num ? '<span class="gd-num">' + num + '</span>' : '') + title + '</h3>' + body + '</section>';
const GUIDE = [
  { k: 'start', tab: 'はじめに', html: () =>
    '<p class="gd-lead">スマホ1台をみんなで回して遊ぶカードゲームです。アプリは<b>「カードを出す係」</b>と<b>「飲んだ量を記録する係」</b>。ジャンケンなどの勝ち負けは、みんなで判定します。</p>' +
    gCard('メンバーを登録', '<p>人数・名前・何周あそぶかを決めて「スタート！」。名前は<b>座っている順</b>に入れると、画面の席の並びが実際と同じになります。</p>', 1) +
    gCard('カードを引く', '<div class="gd-mock">' + gBtn('カードを引く！', 'big') + '</div><p>自分の番の人がタップ。カードが大きく出るので<b>声に出して読み上げ</b>、書いてあるとおりに遊びます。</p>', 2) +
    gCard('飲んだ人を記録', '<div class="gd-mock">' + gSeat('ユウキ', 0, 0, '引いた人') + gSeat('サキ', 0, 1, 'ランダム', true) + '</div><p>飲む人が決まったら、<b>その人の席をタップ</b>して「記録する！」。<b>杯数はカードの数字が最初から入っています。</b></p>', 3) +
    gCard('次の人へ', '<div class="gd-mock">' + gBtn('次へ ▶ サキ', 'big') + '</div><p>「次へ」で、登録順に次の人の番になります。これをくり返すだけ！</p>', 4) +
    gTip('誰も飲まないカード（セーフなど）は、記録しないでそのまま「次へ」でOK。')
  },
  { k: 'record', tab: '記録のしかた', html: () =>
    '<p class="gd-lead">アプリはジャンケンの結果までは分からないので、<b>飲む人だけ教えてあげて</b>ください。杯数は自動で入ります。</p>' +
    gCard('飲む人の席をタップ', '<div class="gd-mock">' + gSeat('ケンタ', 2, 2, '左隣', true) + '</div><p>記録画面が開きます。カードに名前が出てくる人の席には、「引いた人」「ランダム」などの目印が付いています。</p>', 1) +
    gCard('杯数を確かめる', '<div class="gd-mock paper"><span class="gd-amt"><span class="stepper">−</span><span class="amt-base"><b>2</b><small>もとの杯数</small></span><span class="stepper">＋</span></span></div>' +
      '<p><b>カードの杯数が最初から入っています。</b>「1〜3杯」のような幅のあるカードや、ジャンケンで負けた回数ぶん飲むときだけ、−／＋で合わせます。</p>', 2) +
    gCard('「記録する！」', '<p>下に出る<b>「飲む量」</b>が、実際に飲む量です。特殊ルールや券を使うと、ここが計算後の量（例：2杯 → ×2 → 4杯）に変わります。</p>', 3) +
    gCard('こんなときは', '<ul class="gd-list">' +
      '<li><b>何人も同じ量を飲む</b> → 画面下の「まとめて記録」で、まとめて記録</li>' +
      '<li><b>記録をまちがえた</b> → 画面下の記録欄にある「取り消す」で、1つ前に戻せる</li>' +
      '<li><b>記録しないで「次へ」を押してしまった</b> → 記録欄の「◀ 前のターンに戻る」。カード・記録・特殊ルールがその時のまま戻るので、続きから記録できる（8ターン前まで。結果発表の画面からも戻れる）</li>' +
      '<li><b>0.5杯と出た</b> → 半分の効果。半分くらい飲めばOK</li>' +
      '<li><b>ミニゲームで負けた</b> → 結果画面の「〇〇の記録へ」で、杯数入りの記録画面が開く</li></ul>') +
    gTip('記録した杯数は、最後の結果発表のランキングになります。')
  },
  { k: 'special', tab: '特殊ルール', html: () =>
    '<p class="gd-lead">飲む量を変える切り札です。<b>使うかどうかは飲む人が決めます。</b>使わなくても遊べます。</p>' +
    gTip('<b>1ターンに1人1つまで。</b>「倍倍FIGHT！」「天国と地獄」は記録画面のボタンから。「コストパフォーマンス」だけは、カードを引く前に使います。') +
    gCard('<span class="gd-sp dbl">倍倍FIGHT！</span>', '<p>自分の量が<b>2倍</b>になるかわりに、<b>次に飲む人も2倍</b>にできる勝負の一手。</p>' +
      '<div class="gd-flow"><span>2杯</span>→<span class="hot">倍倍FIGHT！で4杯</span>→<span>次に飲む人 ×2</span></div>' +
      '<p class="sub">画面の上に「NEXT ×2」と出ている間に記録された人の量が2倍になります。その人も倍倍FIGHT！で受けて立てば、次は ×4、×8…と大きくなります。</p>') +
    gCard('<span class="gd-sp hh">天国と地獄</span>', '<p>ルーレットで運命が決まる。<b>回したら取り消せません。</b></p><div class="gd-rows">' +
      '<span class="gd-chip heaven">天国</span><span>飲まなくてOK</span>' +
      '<span class="gd-chip hell">地獄</span><span>2倍</span>' +
      '<span class="gd-chip bigheaven">大天国</span><span>自分は0杯。その量を次の人（左隣）に押し付け</span>' +
      '<span class="gd-chip bighell">大地獄</span><span>3倍</span></div>' +
      '<p class="sub">ふつうは10秒で止まります。たまに<b>デビルモード</b>（地獄だらけ）や<b>大天使降臨</b>（ほぼ天国、でも大地獄が2マス）が起きます。</p>') +
    gCard('<span class="gd-sp cospa">コストパフォーマンス</span>', '<div class="gd-mock">' + gBtn('コスパ<span class="sub">先に1杯で半分に</span>', 'pink small') + '</div>' +
      '<p>自分の番で、カードを引く<b>前</b>に使います。先に<b>1杯飲んでおく</b>と、そのあと引いたカードで<b>自分が飲むことになったとき、その量が半分</b>になります。</p>' +
      '<div class="gd-flow"><span>先に1杯飲む</span>→<span>カードで「4杯」</span>→<span class="hot">自分は2杯でOK</span></div>' +
      '<ul class="gd-list">' +
      '<li>半分になるのは<b>コスパを使った本人だけ</b>。ほかの人の量はそのまま</li>' +
      '<li>効くのは<b>そのターンの間だけ</b>（ジャンケンで負けた・指名されたなど、自分が飲むことになったとき全部）</li>' +
      '<li>先払いの1杯は、押した時点で自動で記録されます</li>' +
      '<li>飲まずに済むカードが出たら、先に飲んだ1杯はそのまま。<b>きついカードが来そうなときの保険</b>です</li></ul>')
  },
  { k: 'cards', tab: 'カードと手札', html: () =>
    gCard('カードの種類', '<div class="gd-rows">' + deck.categories.map(c =>
      '<span class="gd-mk" style="--c:' + colorVar(c.color) + '">' + esc(catMark(c)) + '</span><span><span class="gd-rn">' + esc(catName(c)) + '</span>' + esc(CAT_DESC[c.key] || 'カード編集で作った系統') + '</span>').join('') + '</div>') +
    gCard('名前が入るところ', '<p>カードの <span class="tag">{引いた人}</span> などは、ゲーム中は実際の名前に変わります。</p><ul class="gd-list">' +
      '<li><b>引いた人</b>：カードを引いた人</li><li><b>ランダム</b>：引いた人以外から、アプリが選んだ人</li><li><b>左隣・右隣</b>：登録順で次の人・前の人</li></ul>') +
    gCard('継続カードと手札', '<p>「継続 2周」などと書かれたカードは<b>引いた人の手札</b>に入り、期間が終わると自動で消えます。席のすみの小さいカードが手札です。</p>' +
      '<p class="sub">カードを引く前に席をタップすると、その人の手札とここまでの記録が見られます。</p>') +
    gCard('券', '<div class="gd-rows">' +
      '<span class="gd-chip plain">セーフ券・休憩券</span><span>飲む対象になったとき、1回だけ回避</span>' +
      '<span class="gd-chip plain">押し付け券</span><span>飲む量を、書かれた人に押し付け</span>' +
      '<span class="gd-chip plain">天国パス</span><span>天国と地獄で、地獄を1回だけ天国に</span>' +
      '<span class="gd-chip plain">コスパ無料券</span><span>次のコスパの、前払い1杯が不要</span></div>' +
      '<p class="sub">券は、記録画面に「〇〇を使う」ボタンとして出てきます（天国パスはルーレットの結果画面、コスパ無料券は自動で使われます）。</p>') +
    gCard('次の人への効果', '<p>「次に飲む人は2倍」などのカードを引くと、画面の上に<b>NEXT ×2</b>と出ます。次に記録された人に自動でかかります。</p>')
  },
  { k: 'games', tab: 'ミニゲーム', html: () =>
    '<p class="gd-lead">カードによっては、アプリで遊べるボタンが出ます。カードの下のボタンをタップしてスタート。</p>' +
    gCard('チャレンジ', '<p>アプリのミニゲームに挑戦。<b>クリアすれば飲まなくてOK</b>、失敗したらカードの杯数。</p><div class="gd-rows">' +
      [['ピタリストップ', '途中で見えなくなるタイマーを、目標の秒数で止める'], ['ジャストゲージ', '左右に動く針を、緑のゾーンで止める'], ['連打チャレンジ', '5秒で、指定の回数タップする'],
        ['まんまる', '指で一筆、きれいなまるを描く'], ['色当て', '書いてある言葉ではなく、文字の色を答える'], ['数字タッチ', '1〜9を順番にタッチ。お手つきはアウト'], ['ハイ&ロー', '次のトランプが上か下かを3回連続で当てる']]
        .map(([a, b]) => '<span class="gd-chip plain">' + a + '</span><span>' + b + '</span>').join('') + '</div>') +
    gCard('爆弾パス回し', '<p>お題が決まったら「点火！」。お題に合うものを1つ言えたら「パス」を押して、スマホを左隣へ。<b>爆発したときに持っていた人</b>が飲みます。爆発までの時間は毎回ちがいます。</p>') +
    gCard('タイマー・ストップ対決', '<p>「30秒」など時間が書いてあるカードは、ボタンひとつでタイマーが動きます。「10秒ストップ」のカードは、2人が画面を見ずにストップを押して、<b>10秒に近い方の勝ち</b>。</p>') +
    gCard('早押し・名前ルーレット', '<p><b>早押し対決</b>：スマホを2人の間に置き、「タップ！」が出たら自分の側をタップ。フライングは負け。</p><p><b>名前ルーレット</b>：アプリが1人を選んで、その人の記録画面を開きます。</p>') +
    gTip('ミニゲームが終わったら「〇〇の記録へ」を押せば、そのまま記録できます。')
  },
  { k: 'more', tab: 'その他', html: () =>
    gCard('何周あそぶ？', '<p><b>3周・5周・10周</b>：全員が決まった回数カードを引いたら結果発表。山札が一巡するまで同じカードは出ません。</p><p><b>∞</b>：「終了」を押すまで続きます。引いたカードも山札に戻り、毎回ランダムに出ます。</p>') +
    gCard('途中でやめる・再開', '<p>ゲーム中の右上「終了」で結果発表へ。アプリを閉じてしまっても、タイトルの「続きから再開」で戻れます。</p>') +
    gCard('結果発表', '<p>飲んだ杯数のランキング。いちばん飲んだ人は「酒豪！」、いちばん少ない人は「セーフ王」。</p>') +
    gCard('カード編集', '<p>タイトルの「カード編集」で、カードの追加・書きかえ・ON/OFF、系統ごとのON/OFFができます。「アプリ連動」を選ぶと、チャレンジやルーレットなどアプリの効果を付けられます。指示文に「30秒」と書けばタイマーも付きます。</p>') +
    gCard('音と案内', '<p>画面右上の「BGM」「効果音」で、それぞれON/OFF。メンバー登録画面の「操作の案内を出す」にチェックを入れると、1ターン目に操作の案内がもう一度出ます。</p>') +
    (IS_APP && !(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) && !navigator.standalone
      ? gCard('ホーム画面に追加', '<p>iPhoneなら、Safariの「共有」→「ホーム画面に追加」で、アプリのように全画面で使えます。一度開けばオフラインでも遊べます。</p>') : '') +
    gTip('20歳未満の飲酒は法律で禁止されています。飲めない人はソフトドリンクで参加OK。無理に飲ませるのはやめましょう。お水もこまめに。')
  },
];
let guidePage = 0;
function openGuide(k) {
  const i = GUIDE.findIndex(p => p.k === k);
  guidePage = i >= 0 ? i : 0;
  lsSet(GUIDE_SEEN_KEY, '1');
  if (screen === 'title') renderTitle();
  renderGuide();
  if ($('howOv').hidden) { openOv('howOv'); SE.play('pop'); }
  $('howClose').focus({ preventScroll: true });
}
function renderGuide() {
  const tabs = $('gdTabs');
  tabs.innerHTML = GUIDE.map((p, i) => '<button type="button" role="tab" data-gd="' + i + '" aria-selected="' + (i === guidePage) + '">' + p.tab + '</button>').join('');
  $('gdBody').innerHTML = GUIDE[guidePage].html();
  $('gdBody').scrollTop = 0;
  $('gdDots').innerHTML = GUIDE.map((_, i) => '<i' + (i === guidePage ? ' class="on"' : '') + '></i>').join('');
  $('gdPrev').disabled = guidePage === 0;
  $('gdNext').textContent = guidePage === GUIDE.length - 1 ? 'とじる' : '次へ →';
  const t = tabs.children[guidePage];
  if (t) tabs.scrollLeft = t.offsetLeft - (tabs.clientWidth - t.offsetWidth) / 2;
}
function guideGo(d) {
  const n = guidePage + d;
  if (n < 0) return;
  if (n >= GUIDE.length) { closeOv('howOv'); return; }
  guidePage = n; renderGuide(); SE.play('tap');
}

/* ---------- はじめてガイド: step bubbles during the first game. They point at the next thing to press and never block a tap ---------- */
const coach = { on: false, seen: new Set(), cur: null, t1: 0, t2: 0, moved: false };
const noOv = () => !document.querySelector('.ov:not([hidden])');
const onlyOv = id => { const open = Array.from(document.querySelectorAll('.ov:not([hidden])')); return open.length === 1 && open[0].id === id; };
const COACH = [
  { k: 'draw', when: () => noOv() && G.cur.phase === 'before' && !picking, at: '#dock [data-g="draw"]', above: '#gLog', html: () =>
    '<span class="cb-step">はじめてガイド 1/5</span><p>自分の番の人が<b>「カードを引く！」</b>をタップ。</p>' +
    (G.cur.cospa ? '' : '<p class="sub">左の「コスパ」は、先に1杯飲んでおくと、このターンで自分が飲むことになったときの量が半分になる特殊ルール。使わなくてOK。</p>') },
  { k: 'zoom', when: () => onlyOv('zoomOv') && !!zoom, place: 'top', html: () =>
    '<span class="cb-step">2/5</span><p>カードを<b>声に出して読み上げよう！</b>書いてあるとおりに遊んだら「OK！ テーブルへ」。</p>' +
    (cardActs().length ? '<p class="sub">ボタンが付いているカードは、そこからミニゲームやルーレットを始められます。</p>' : '') },
  { k: 'seat', when: () => noOv() && G.cur.phase === 'drawn' && !G.cur.drinks.length && !G.cur.select && !picking && !!(G.cur.card && G.cur.card.cups.length),
    at: '#center', seats: () => true, html: () =>
    '<span class="cb-step">3/5</span><p>飲む人が決まったら、<b>その人の席をタップ</b>して記録しよう。</p><p class="sub">杯数はカードの数字が最初から入っています。誰も飲まなかったら、そのまま「次へ」でOK。</p>' },
  { k: 'nodrink', when: () => noOv() && G.cur.phase === 'drawn' && !G.cur.drinks.length && !G.cur.select && !picking && !!(G.cur.card && !G.cur.card.cups.length),
    at: '#dock [data-g="next"]', above: '#gLog', html: () =>
    '<span class="cb-step">はじめてガイド</span><p>このカードは飲む人がいないので、<b>記録しないで「次へ」</b>でOK。</p>' },
  { k: 'sheet', when: () => onlyOv('sheetOv') && !!sheet && !sheet.locked, at: '#sheetBox', point: '#sheetBox .amt-row', html: () =>
    '<span class="cb-step">4/5</span><p>杯数は<b>カードの数字が入っています</b>。合っていればそのまま「記録する！」。ちがうときは −／＋ で直します。</p>' +
    '<p class="sub">倍倍FIGHT！・天国と地獄は、飲む人が使いたいときだけ押す特殊ルールです。</p>', link: ['special', '特殊ルールって？'] },
  { k: 'next', when: () => noOv() && G.cur.phase === 'drawn' && G.cur.drinks.length > 0 && !picking, at: '#dock [data-g="next"]', above: '#gLog', html: () =>
    '<span class="cb-step">5/5</span><p>記録できたら<b>「次へ」</b>で次の人の番。</p><p class="sub">まちがえたら上の「取り消す」。記録し忘れて次へ進んでも、「◀ 前のターンに戻る」で戻れます。</p>' },
  { k: 'help', when: () => noOv() && coach.moved, at: '#helpBtn', last: true, html: () =>
    '<p>これで基本はOK！ わからなくなったら、いつでも<b>右上の「？ 遊び方」</b>から使い方を見られます。</p>' },
];
function coachStart() { coach.on = true; coach.seen = new Set(); coach.cur = null; coach.moved = false; coach.turns = 0; coachQueue(); }
function coachEnd(save) {
  coach.on = false;
  clearTimeout(coach.t1); clearTimeout(coach.t2);
  coachHide();
  if (save) { lsSet(COACH_KEY, 'done'); setup.coach = false; }
}
function coachHide() {
  const el = $('coach');
  el.hidden = true; el.innerHTML = '';
  coach.cur = null;
  document.querySelectorAll('.seat.coach-pick').forEach(s => s.classList.remove('coach-pick'));
}
/* positions are measured after the sheet / zoom has finished sliding in */
function coachQueue() {
  if (!coach.on) return;
  clearTimeout(coach.t1); clearTimeout(coach.t2);
  coach.t1 = setTimeout(coachSync, 60);
  coach.t2 = setTimeout(coachSync, 480);
}
function coachSync() {
  if (!coach.on) return;
  if (screen !== 'game' || !validGame(G)) { coachHide(); return; }
  if (!$('howOv').hidden) { coachHide(); return; }   /* reading the guide doesn't count as having seen the step */
  if (coach.cur) {
    const s = COACH.find(x => x.k === coach.cur);
    if (s && !s.when()) { coach.seen.add(s.k); if (s.last) { coachEnd(true); return; } }
  }
  const step = COACH.find(s => !coach.seen.has(s.k) && s.when());
  if (!step) { coachHide(); return; }
  coachShow(step);
}
function coachShow(s) {
  const el = $('coach'), shell = $('shell').getBoundingClientRect();
  const sel = typeof s.at === 'function' ? s.at() : s.at;
  const target = sel ? document.querySelector(sel) : null;
  if (sel && !target) { coachHide(); return; }
  if (coach.cur !== s.k) {
    el.innerHTML = '<div class="coach-ring" id="coachRing" hidden></div><div class="coach-bub" id="coachBub">' + s.html() +
      '<div class="cb-acts">' + (s.last ? '' : '<button type="button" class="skip" data-cb="end">案内を終わる</button>') +
      (s.link ? '<button type="button" class="link" data-cb="guide" data-p="' + s.link[0] + '">' + s.link[1] + '</button>' : '') +
      '<button type="button" data-cb="ok">' + (s.last ? 'OK！' : 'わかった') + '</button></div></div>';
    coach.cur = s.k;
  }
  el.hidden = false;
  const pick = s.seats ? s.seats() : false;
  document.querySelectorAll('#seats .seat').forEach(x => x.classList.toggle('coach-pick', pick));
  const ring = $('coachRing'), bub = $('coachBub'), H = shell.height;
  bub.classList.remove('up', 'down', 'noarrow');
  bub.style.top = ''; bub.style.bottom = '';
  ring.hidden = true;
  const atTop = () => { bub.classList.add('noarrow'); bub.style.top = '52px'; };
  if (!target || s.place === 'top') { atTop(); return; }
  const r = target.getBoundingClientRect(), y0 = r.top - shell.top;
  const ringAt = rr => {
    ring.hidden = false;
    const l = Math.max(3, rr.left - shell.left - 6), rgt = Math.min(shell.width - 3, rr.right - shell.left + 6);
    ring.style.left = l + 'px'; ring.style.top = (rr.top - shell.top - 6) + 'px';
    ring.style.width = (rgt - l) + 'px'; ring.style.height = (rr.height + 12) + 'px';
  };
  let px = r.left + r.width / 2;
  if (s.k === 'seat' && pick) {
    /* seats are outlined; the bubble sits over the card in the middle of the table (the card is only a "show bigger" button) */
    bub.classList.add('noarrow');
    bub.style.top = Math.max(52, y0 + (r.height - bub.offsetHeight) / 2) + 'px';
    return;
  }
  if (s.k === 'sheet') {
    const pt = document.querySelector(s.point);
    if (pt) { const pr = pt.getBoundingClientRect(); ringAt(pr); px = pr.left + pr.width / 2; }
    if (y0 - 12 < bub.offsetHeight + 52) { atTop(); return; }
    bub.classList.add('down'); bub.style.bottom = (H - y0 + 14) + 'px';
  } else {
    ringAt(r);
    /* dock buttons: the bubble also clears the record strip above them (its 「取り消す」 stays tappable) */
    const ab = s.above ? document.querySelector(s.above) : null;
    const edge = ab ? Math.min(y0, ab.getBoundingClientRect().top - shell.top) : y0;
    if (y0 + r.height / 2 > H / 2) { bub.classList.add('down'); bub.style.bottom = (H - edge + 12) + 'px'; }
    else { bub.classList.add('up'); bub.style.top = (y0 + r.height + 14) + 'px'; }
  }
  const br = bub.getBoundingClientRect();
  bub.style.setProperty('--ax', Math.max(22, Math.min(br.width - 22, px - br.left)) + 'px');
}

/* ---------- rendering: game ---------- */
function gameCups(c) {
  if (!c.cups.length) return c.cat === 'safe' ? '<span class="gc-cups safe">SAFE</span>' : '<span class="gc-cups fx">効果カード</span>';
  return '<span class="gc-cups">' + (c.cups.length > 1 ? c.cups[0] + '–' + c.cups[1] : c.cups[0]) + '<small>杯</small></span>';
}
function renderCenter(anim) {
  const cur = G.cur, d = cur.drawer;
  const label = '<div class="turn-label ol" style="--p:' + pc(d) + '"><span class="nm">' + esc(pname(d)) + '</span> のターン</div>';
  let body;
  if (cur.phase === 'before') {
    body = '<button type="button" class="deck" data-g="draw" aria-label="カードを引く"' + (picking ? ' disabled' : '') + '>' +
      '<span class="deck-card b3"></span><span class="deck-card b2"></span><span class="deck-card b1"><span class="back-logo">飲</span></span><span class="tap-bubble">TAP!</span></button>';
  } else {
    const c = cur.card;
    body = '<div class="gcard tcard' + (anim === 'draw' ? ' enter' : '') + '" style="--c:' + colorVar(c.color) + '" data-g="zoom" role="button" tabindex="0" aria-label="カードを大きく表示">' +
      cardInner(c) + '<span class="gc-zoom" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5"/></svg></span></div>';
  }
  $('center').innerHTML = label + body;
}
function seatHTML(i) {
  const pl = G.players[i], cur = G.cur, d = cur.drawer;
  const roles = cur.phase === 'drawn' && cur.names ? ROLE_ORDER.filter(k => cur.names[k] === i) : [];
  const roleText = cur.phase === 'before' && i === d ? 'キミの番！' : roles.join('・');
  let flag = '';
  if (cur.phase === 'drawn' && cur.card) {
    const fx = cur.card.fx, vals = G.players.map(p => p.total);
    if (fx === 'least' && pl.total === Math.min.apply(null, vals)) flag = 'いちばん少ない';
    if (fx === 'last' && G.last === i) flag = '直前に飲んだ';
  }
  const cls = ['seat'];
  if (i === d) cls.push('now');
  if (cur.select) cls.push(i === d ? 'dim' : 'sel');
  const hs = pl.hand, shown = hs.slice(-3);
  const minis = shown.map((h, k) => '<span class="mini' + (h.kind === 'ticket' ? ' ticket' : '') + '" style="--c:' + colorVar(h.color) + ';--r:' + ((k - (shown.length - 1) / 2) * 12) + 'deg' + (h.fresh ? ';opacity:0' : '') + '">' + esc(h.mark) + '</span>').join('') +
    (hs.length > 3 ? '<span class="mini more">+' + (hs.length - 3) + '</span>' : '');
  return '<button type="button" class="' + cls.join(' ') + '" data-seat="' + i + '" style="--p:' + pc(i) + '" aria-label="' + esc(pl.name) + ' ' + fmtAmt(pl.total) + '杯' + (hs.length ? '・手札' + hs.length + '枚' : '') + '">' +
    (roleText ? '<span class="seat-role">' + roleText + '</span>' : '') +
    '<span class="seat-name">' + esc(pl.name) + '</span><span class="seat-total">' + fmtAmt(pl.total) + '<small>杯</small></span>' +
    (hs.length ? '<span class="hand" aria-hidden="true">' + minis + '</span>' : '') +
    (flag ? '<span class="seat-flag">' + flag + '</span>' : '') + '</button>';
}
function renderSeats() { $('seats').innerHTML = G.players.map((_, i) => seatHTML(i)).join(''); }
function renderDock() {
  const cur = G.cur, d = cur.drawer, n = G.players.length;
  let h = '';
  if (cur.select) {
    h = '<div class="dock-row"><div class="dock-note">' + (cur.select === 'swap' ? '入れ替える相手の席をタップ' : 'セーフ券を渡す相手の席をタップ') + '</div><button type="button" class="pbtn white small" data-g="unselect">やめる</button></div>';
  } else if (picking) {
    h = '<div class="dock-row"><div class="dock-note">ルーレット中…</div></div>';
  } else if (cur.phase === 'before') {
    h = '<div class="dock-row">' + (cur.cospa ? '<div class="dock-note cospa"><span>コスパ中！<small>自分の飲む量は半分</small></span></div>'
      : '<button type="button" class="pbtn pink small" data-g="cospa">コスパ<span class="sub">先に1杯で半分に</span></button>') +
      '<button type="button" class="pbtn big main pulse" data-g="draw">カードを引く！</button></div>';
  } else {
    const acts = cardActs();
    if (acts.length) h += '<div class="dock-row">' + acts.map(a => '<button type="button" class="pbtn ' + a[2] + ' small" data-g="' + a[0] + '">' + a[1] + '</button>').join('') + '</div>';
    const last = G.rounds && G.turn + 1 >= G.rounds * n;
    h += '<div class="dock-row"><button type="button" class="pbtn white small" data-g="multi">まとめて記録</button>' +
      '<button type="button" class="pbtn big main" data-g="next">' + (last ? '結果発表へ！' : '次へ ▶ ' + esc(pname((d + 1) % n))) + '</button></div>';
  }
  $('dock').innerHTML = h;
}
function entryPills(e) {
  const pill = (p, text) => '<span class="lg"><span class="dot" style="--p:' + pc(p) + '"></span>' + esc(pname(p)) + '<b>' + text + '</b></span>';
  if (e.kind === 'swap') return '<span class="lg">記録チェンジ<b>' + esc(pname(e.a)) + '⇄' + esc(pname(e.b)) + '</b></span>';
  if (e.kind === 'give') return pill(e.to, 'セーフ券GET');
  if (e.kind === 'end') return '<span class="lg">ルール<b>終了</b></span>';
  if (e.kind === 'chal') return pill(e.p, e.ok ? 'クリア' : '失敗');
  if (e.kind === 'bomb') return pill(e.p, 'ドカーン');
  return (e.items || []).map(it => pill(it.p, it.amt ? fmtAmt(it.amt) + '杯' : 'SAFE')).join('');
}
function renderLog() {
  const cur = G.cur, es = cur.drinks;
  const last = es[es.length - 1];
  const undoable = !!last && !(last.kind === 'cospa' && cur.phase === 'drawn');
  const back = !undoable && canBack() ? '<button type="button" class="lg-undo back" data-g="back">◀ 前のターンに戻る</button>' : '';
  let h = back;
  if (!es.length) h += '<span class="lg-hint">' + (cur.phase === 'drawn' ? '飲む人の席をタップして記録！ 誰も飲まないならそのまま次へ' : back ? '記録し忘れたら戻れます' : '席をタップするとその人の手札が見られます') + '</span>';
  else es.forEach((e, i) => {
    h += entryPills(e);
    if (i === es.length - 1 && undoable) h += '<button type="button" class="lg-undo" data-g="undo">取り消す</button>';
  });
  const box = $('gLog');
  box.innerHTML = h;
  box.scrollLeft = back ? 0 : box.scrollWidth;
}
function renderGame(anim) {
  if (!validGame(G)) { showScreen('title'); return; }
  const n = G.players.length, d = G.cur.drawer;
  const round = Math.floor(G.turn / n) + 1;
  $('gRound').innerHTML = round + '<small>' + (G.rounds ? '/' + G.rounds + '周' : '周目') + '</small>';
  const pe = $('gPending');
  if (pendingActive()) {
    pe.hidden = false;
    pe.textContent = 'NEXT ' + (G.pending.mult !== 1 ? '×' + G.pending.mult : '') + (G.pending.half ? (G.pending.mult !== 1 ? '・' : '') + '半分' : '');
  } else pe.hidden = true;
  renderSeats();
  renderCenter(anim);
  renderDock();
  renderLog();
  layoutTable();
  coachQueue();
  void d;
}
function layoutTable() {
  if (!validGame(G) || screen !== 'game') return;
  const wrap = $('tableWrap');
  const W = wrap.clientWidth, H = wrap.clientHeight;
  if (!W || !H) return;
  const n = G.players.length;
  const sw = Math.round(Math.max(72, Math.min(n <= 4 ? 132 : 108, W * (n <= 4 ? 0.3 : n === 5 ? 0.235 : 0.205))));
  wrap.style.setProperty('--sw', sw + 'px');
  const seats = Array.from($('seats').children);
  const sh = seats.length ? Math.max.apply(null, seats.map(s => s.offsetHeight)) : 54;
  const padTop = 16, padBot = 16, padX = 3;
  const innerH = H - padTop - padBot;
  const cy = padTop + innerH / 2;
  const rx = Math.max(10, W / 2 - sw / 2 - padX), ry = Math.max(10, innerH / 2 - sh / 2);
  const per = 4 * (rx + ry), step = per / n;
  const boxes = [], pos = [];
  seats.forEach((el, i) => {
    let s = i * step, x, y;
    if (s <= rx) { x = -s; y = ry; }
    else if ((s -= rx) <= 2 * ry) { x = -rx; y = ry - s; }
    else if ((s -= 2 * ry) <= 2 * rx) { x = -rx + s; y = -ry; }
    else if ((s -= 2 * rx) <= 2 * ry) { x = rx; y = -ry + s; }
    else { s -= 2 * ry; x = rx - s; y = ry; }
    pos.push([x, y]);
    el.style.left = (W / 2 + x).toFixed(1) + 'px'; el.style.top = (cy + y).toFixed(1) + 'px';
    boxes.push({ x0: x - sw / 2 - 8, x1: x + sw / 2 + 12, y0: y - sh / 2 - 16, y1: y + sh / 2 + 14 });
  });
  const felt = $('tblFelt');
  const fx = Math.round(sw * 0.3), fy = Math.round(sh * 0.4);
  felt.style.left = fx + 'px'; felt.style.right = fx + 'px'; felt.style.top = (padTop + fy) + 'px'; felt.style.bottom = (padBot + fy) + 'px';
  let hw = W / 2 - 10, hh = innerH / 2 - 4;
  for (const b of boxes) {
    if (b.x1 <= -hw || b.x0 >= hw || b.y1 <= -hh || b.y0 >= hh) continue;
    const nhw = b.x0 > 0 ? b.x0 - 4 : b.x1 < 0 ? -b.x1 - 4 : 0;
    const nhh = b.y0 > 0 ? b.y0 - 4 : b.y1 < 0 ? -b.y1 - 4 : 0;
    if (nhw * hh >= hw * nhh) hw = Math.max(0, Math.min(hw, nhw)); else hh = Math.max(0, Math.min(hh, nhh));
  }
  const center = $('center');
  center.style.left = (W / 2 - hw) + 'px'; center.style.top = (cy - hh) + 'px';
  center.style.width = (2 * hw) + 'px'; center.style.height = (2 * hh) + 'px';
  const tl = Math.max(14, Math.min(22, hh * 0.09));
  center.style.setProperty('--tl', tl + 'px');
  const availH = 2 * hh - tl * 1.3 - 12, availW = 2 * hw - 16;
  const cw = Math.max(108, Math.min(availW, availH * 0.72, 290));
  center.style.setProperty('--cw', cw.toFixed(1) + 'px');
  center.style.setProperty('--ch', (cw / 0.72).toFixed(1) + 'px');
  const dp = pos[G.cur.drawer] || [0, 1];
  const target = Math.atan2(dp[1], dp[0]) * 180 / Math.PI + 90;
  const delta = ((target - spotRot) % 360 + 540) % 360 - 180;
  spotRot += delta;
  $('spot').style.transform = 'rotate(' + spotRot.toFixed(1) + 'deg)';
  fitText(document.querySelector('#center .gc-body'), cw, Math.min(26, cw * 0.1));
  if (zoom) sizeZoom();
}
function fitText(body, cw, start) {
  if (!body) return;
  let fs = start;
  body.style.fontSize = fs + 'px';
  let guard = 0;
  while (body.scrollHeight > body.clientHeight + 1 && fs > 9 && guard++ < 90) { fs -= 0.5; body.style.fontSize = fs + 'px'; }
}

/* ---------- results ---------- */
function renderResult() {
  if (!validGame(G)) { showScreen('title'); return; }
  $('resBack').hidden = !canBack();
  const n = G.players.length;
  const order = G.players.map((p, i) => Object.assign({ i }, p)).sort((a, b) => b.total - a.total || a.i - b.i);
  const maxT = order[0].total, minT = order[order.length - 1].total, spread = maxT > minT;
  const sum = G.players.reduce((s, p) => s + p.total, 0);
  $('resSub').textContent = G.turn + 'ターン（' + Math.ceil(G.turn / n) + '周）遊びました';
  $('resList').innerHTML = order.map((p, idx) => {
    const rank = 1 + order.filter(q => q.total > p.total).length;
    const title = spread && p.total === maxT ? '酒豪！' : spread && p.total === minT ? 'セーフ王' : '';
    const delay = reduceMotion ? 0 : 1.5 + (n - 1 - idx) * 0.35;
    return '<li class="res-item' + (spread && rank === 1 ? ' first' : '') + '" style="--p:' + pc(p.i) + ';--d:' + delay.toFixed(2) + 's">' +
      '<span class="res-rank">' + rank + (spread && rank === 1 ? '<span class="crown"></span>' : '') + '</span>' +
      '<span class="res-mid"><span class="res-name"><span class="res-nm">' + esc(p.name) + '</span>' + (title ? '<span class="res-title">' + title + '</span>' : '') + '</span>' +
      '<span class="res-sub2">倍倍' + p.dbl + ' ・ 天国と地獄' + p.hh + ' ・ コスパ' + p.cospa + '</span></span>' +
      '<span class="res-total">' + fmtAmt(p.total) + '<small>杯</small></span></li>';
  }).join('');
  $('resStats').innerHTML = '<div class="stat"><b>' + fmtAmt(sum) + '</b><span>合計杯数</span></div><div class="stat"><b>' + G.stats.cards + '</b><span>引いたカード</span></div>' +
    '<div class="stat"><b>' + G.stats.devil + '</b><span>デビル</span></div><div class="stat"><b>' + G.stats.angel + '</b><span>大天使</span></div>';
}
function playResultFx() {
  const n = G.players.length;
  SE.play('drumroll');
  const end = reduceMotion ? 300 : (1.5 + (n - 1) * 0.35 + 0.3) * 1000;
  setTimeout(() => {
    if (screen !== 'result') return;
    SE.play('fanfare');
    BGM.play('party', 2.4);
    FXC.rain(140);
    const first = document.querySelector('.res-item.first');
    if (first) { const q = relPos(first); FXC.burst(q.x, q.y, 60, { colors: GOLD, star: true, speed: 12 }); }
  }, end);
}

/* ---------- events ---------- */
function wireGame() {
  $('brandBtn').addEventListener('click', () => { closeAllOverlays(); showScreen('title'); });
  $('seBtn').addEventListener('click', () => { SE.toggle(); renderSE(); });
  $('bgmBtn').addEventListener('click', () => { BGM.toggle(); renderSE(); });
  const unlock = () => { if (SE.ensure()) BGM.sync(); };
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
  $('goSetup').addEventListener('click', () => { loadSetup(); SE.play('tap'); showScreen('setup'); });
  $('resumeBtn').addEventListener('click', () => { if (validGame(G) && !G.done) { SE.play('tap'); showScreen('game'); requestWake(); } });
  $('goEditor').addEventListener('click', () => { SE.play('tap'); showScreen('editor'); });
  $('howBtn').addEventListener('click', () => openGuide('start'));
  $('helpBtn').addEventListener('click', () => openGuide(G && G.cur && G.cur.phase === 'drawn' ? 'record' : 'start'));
  $('gdTabs').addEventListener('click', e => { const b = e.target.closest('[data-gd]'); if (!b) return; guidePage = Number(b.dataset.gd); renderGuide(); SE.play('tap'); });
  $('gdPrev').addEventListener('click', () => guideGo(-1));
  $('gdNext').addEventListener('click', () => guideGo(1));
  {
    /* swipe left / right between pages (vertical scrolling stays normal) */
    let sx = 0, sy = 0, on = false;
    const body = $('gdBody');
    body.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; on = e.touches.length === 1; }, { passive: true });
    body.addEventListener('touchend', e => {
      if (!on) return; on = false;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) { if (dx < 0 && guidePage < GUIDE.length - 1) guideGo(1); else if (dx > 0) guideGo(-1); }
    }, { passive: true });
  }
  $('coach').addEventListener('click', e => {
    const b = e.target.closest('[data-cb]'); if (!b || !coach.on) return;
    const a = b.dataset.cb;
    if (a === 'end') { coachEnd(true); telop('「？ 遊び方」でいつでも見られます', 'white sm', 1600); }
    else if (a === 'guide') openGuide(b.dataset.p);
    else { const s = COACH.find(x => x.k === coach.cur); if (coach.cur) coach.seen.add(coach.cur); if (s && s.last) coachEnd(true); else coachSync(); }
  });
  $('coachOpt').addEventListener('change', e => { setup.coach = e.target.checked; SE.play('tap'); });
  $('howClose').addEventListener('click', () => closeOv('howOv'));
  $('editorBack').addEventListener('click', () => showScreen('title'));

  $('countGrid').addEventListener('click', e => {
    const b = e.target.closest('button[data-cnt]'); if (!b) return;
    setup.count = Number(b.dataset.cnt); renderSetup(true); SE.play('pop');
    const again = $(b.id); if (again) again.focus({ preventScroll: true });
  });
  $('roundGrid').addEventListener('click', e => {
    const b = e.target.closest('button[data-rnd]'); if (!b) return;
    setup.rounds = Number(b.dataset.rnd); renderSetup(false); SE.play('pop');
    const again = $(b.id); if (again) again.focus({ preventScroll: true });
  });
  $('nameList').addEventListener('input', e => {
    const i = Number(e.target.dataset.i); if (Number.isNaN(i)) return;
    setup.names[i] = e.target.value;
  });
  $('nameList').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const i = Number(e.target.dataset.i); if (Number.isNaN(i)) return;
    e.preventDefault();
    const nx = $('pname-' + (i + 1));
    if (nx) nx.focus({ preventScroll: true }); else e.target.blur();
  });
  $('setupBack').addEventListener('click', () => showScreen('title'));
  $('startGame').addEventListener('click', beginGame);

  const gameAct = g => {
    if (!G) return;
    if (g === 'draw') drawCard();
    else if (g === 'cospa') useCospa();
    else if (g === 'multi') openMulti();
    else if (g === 'timer') openTimer();
    else if (g === 'undo') undoLast();
    else if (g === 'back') openBack();
    else if (g === 'next') nextTurn();
    else if (g === 'pick') runPick();
    else if (g === 'tap') openTap();
    else if (g === 'hhfree') { openSheet(G.cur.drawer); openWheel(true); }
    else if (g === 'swap') startSelect('swap');
    else if (g === 'give') startSelect('give');
    else if (g === 'unselect') { G.cur.select = null; renderGame(); }
    else if (g === 'endrule') { SE.play('pop'); openEnd(); }
    else if (g === 'zoom') openZoom(false);
    else if (g === 'chal') openChallenge();
    else if (g === 'bomb') openBomb();
  };
  const onGame = e => { const b = e.target.closest('[data-g]'); if (b && !b.disabled) gameAct(b.dataset.g); };
  $('center').addEventListener('click', onGame);
  $('center').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-g="zoom"]')) { e.preventDefault(); openZoom(false); } });
  $('zoomOv').addEventListener('click', e => {
    if (!zoom) return;
    const b = e.target.closest('[data-z]');
    const z = b ? b.dataset.z : 'ok';
    closeZoom(z === 'ok' ? null : () => gameAct(z));
  });
  $('dock').addEventListener('click', onGame);
  $('gLog').addEventListener('click', onGame);
  $('seats').addEventListener('click', e => { const b = e.target.closest('[data-seat]'); if (b && G) seatTap(Number(b.dataset.seat)); });
  $('endBtn').addEventListener('click', () => { SE.play('pop'); openOv('confirmOv'); $('confirmNo').focus({ preventScroll: true }); });
  $('confirmNo').addEventListener('click', () => closeOv('confirmOv'));
  $('confirmYes').addEventListener('click', () => { closeOv('confirmOv'); finishGame(); });
  const sameMembers = () => {
    if (!validGame(G)) return;
    setup.count = G.players.length; setup.names = G.players.map(p => p.name); setup.rounds = G.rounds; setup.loaded = true;
  };
  $('againBtn').addEventListener('click', () => { sameMembers(); beginGame(); });
  $('changeBtn').addEventListener('click', () => { sameMembers(); showScreen('setup'); });
  $('titleBtn').addEventListener('click', () => showScreen('title'));
  $('resBack').addEventListener('click', openBack);
  $('backBox').addEventListener('click', e => {
    const b = e.target.closest('[data-back]'); if (!b) return;
    if (b.dataset.back === 'yes') goBack(); else closeOv('backOv');
  });

  $('sheetBox').addEventListener('click', e => {
    const b = e.target.closest('button[data-s]'); if (!b || !sheet || b.disabled) return;
    const s = b.dataset.s;
    const refocus = sel => { const x = $('sheetBox').querySelector(sel); if (x && !x.disabled) x.focus({ preventScroll: true }); };
    if (s === 'minus') { sheet.base = Math.max(1, sheet.base - 1); renderSheet(); SE.play('tap'); refocus('[data-s="minus"]'); }
    else if (s === 'plus') { sheet.base = Math.min(99, sheet.base + 1); renderSheet(); SE.play('tap'); refocus('[data-s="plus"]'); }
    else if (s === 'dbl') { sheet.dbl = !sheet.dbl; if (sheet.dbl) { SE.play('double'); flash('#ff8b2b'); } else SE.play('tap'); renderSheet(); refocus('[data-s="dbl"]'); }
    else if (s === 'hh') openWheel(false);
    else if (s === 'hhfree') openWheel(true);
    else if (s === 'ticket') { const u = Number(b.dataset.uid); sheet.ticket = sheet.ticket === u ? null : u; SE.play(sheet.ticket ? 'ticket' : 'tap'); renderSheet(); refocus('[data-uid="' + u + '"]'); }
    else if (s === 'close') closeSheet();
    else if (s === 'record') recordSheet();
    else if (s === 'help') openGuide('special');
  });
  $('multiBox').addEventListener('click', e => {
    const b = e.target.closest('button[data-m]'); if (!b || !multi || b.disabled) return;
    const m = b.dataset.m;
    if (m === 'sel') { const i = Number(b.dataset.i); multi.sel[i] = !multi.sel[i]; SE.play('tap'); renderMulti(); const x = $('multiBox').querySelector('[data-m="sel"][data-i="' + i + '"]'); if (x) x.focus({ preventScroll: true }); }
    else if (m === 'minus') { multi.base = Math.max(1, multi.base - 1); SE.play('tap'); renderMulti(); }
    else if (m === 'plus') { multi.base = Math.min(99, multi.base + 1); SE.play('tap'); renderMulti(); }
    else if (m === 'close') { multi = null; closeOv('multiOv'); }
    else if (m === 'record') recordMulti();
  });
  $('handBox').addEventListener('click', e => { if (e.target.closest('[data-hand="close"]')) closeOv('handOv'); });
  $('endBox').addEventListener('click', e => {
    const b = e.target.closest('[data-end]'); if (!b) return;
    if (b.dataset.end === 'close') closeOv('endOv'); else endRule(Number(b.dataset.p), Number(b.dataset.end));
  });
  const backdrop = (id, fn) => $(id).addEventListener('click', e => { if (e.target === $(id)) fn(); });
  backdrop('sheetOv', closeSheet);
  backdrop('multiOv', () => { multi = null; closeOv('multiOv'); });
  backdrop('handOv', () => closeOv('handOv'));
  backdrop('endOv', () => closeOv('endOv'));
  backdrop('howOv', () => closeOv('howOv'));
  backdrop('catOv', () => closeOv('catOv'));
  backdrop('confirmOv', () => closeOv('confirmOv'));
  backdrop('backOv', () => closeOv('backOv'));

  $('wheelSpin').addEventListener('click', spinWheel);
  $('wheelOk').addEventListener('click', confirmWheel);
  $('wheelPass').addEventListener('click', usePass);
  $('wheelCancel').addEventListener('click', cancelWheel);
  ['tapTop', 'tapBottom'].forEach(id => {
    $(id).addEventListener('pointerdown', e => { e.preventDefault(); tapHit(Number($(id).dataset.side)); });
    $(id).addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapHit(Number($(id).dataset.side)); } });
  });
  $('bombOv').addEventListener('click', e => {
    const b = e.target.closest('[data-b]'); if (!b || !bomb || b.disabled) return;
    const a = b.dataset.b;
    if (a === 'ignite') igniteBomb();
    else if ((a === 'rec' || a === 'close') && performance.now() - (bomb.resultAt || 0) < 600) { /* a pass-tap still landing as the result appears */ }
    else if (a === 'rec') closeBomb(true);
    else closeBomb(false);
  });
  $('timerOv').addEventListener('click', e => {
    const b = e.target.closest('[data-tm]'); if (!b || !timer || b.disabled) return;
    const a = b.dataset.tm, T = timer;
    if (a !== 'start' && a !== 'stop' && a !== 'cancel' && performance.now() < T.guard) return;
    if (a === 'start') cdStart();
    else if (a === 'stop') cdStop();
    else if (a === 'cancel') cdReady();
    else if (a === 'again') { if (T.mode === 'stop') swSetup(); else cdReady(); }
    else if (a === 'rec') { const p = T.loser, cups = T.cups; closeTimer(); if (p != null) openSheet(p, { base: cups }); }
    else if (a === 'multi') { const ps = T.ps.slice(); closeTimer(); openMulti(ps); }
    else closeTimer();
  });
  $('chalActs').addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b || !chal) return;
    const c = b.dataset.c;
    if (c === 'start') startChallenge();
    else if (c === 'rec') closeChallenge(true);
    else closeChallenge(false);
  });
  $('tapCenter').addEventListener('click', e => {
    const b = e.target.closest('button[data-t]'); if (!b) return;
    if (b.dataset.t === 'rec') closeTap(true);
    else if (b.dataset.t === 'close') closeTap(false);
    else if (b.dataset.t === 'again') { closeTap(false); openTap(); }
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (zoom) { closeZoom(); return; }
    if (chal) { closeChallenge(false); return; }
    if (timer) { closeTimer(); return; }
    if (bomb) { if (bomb.state !== 'play') closeBomb(false); return; }
    if (!$('tapOv').hidden) { closeTap(false); return; }
    if (!$('wheelOv').hidden) { if (wheel && wheel.done) confirmWheel(); else cancelWheel(); return; }
    for (const id of ['backOv', 'confirmOv', 'howOv', 'catOv', 'handOv', 'endOv']) if (!$(id).hidden) { closeOv(id); return; }
    if (!$('multiOv').hidden) { multi = null; closeOv('multiOv'); return; }
    if (!$('sheetOv').hidden) { closeSheet(); return; }
    if (G && G.cur && G.cur.select && screen === 'game') { G.cur.select = null; renderGame(); }
  });
  document.addEventListener('visibilitychange', () => {
    const A = SE.A;
    if (document.visibilityState === 'visible') { if (screen === 'game') requestWake(); if (A && A.c.state === 'suspended') { try { A.c.resume(); } catch (_) { /* ignore */ } } }
    else if (A && A.c.state === 'running') { try { A.c.suspend(); } catch (_) { /* ignore */ } }
  });
  const onResize = () => { FXC.size(); if (screen === 'game') layoutTable(); if (zoom) sizeZoom(); coachQueue(); };
  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe($('tableWrap'));
}

/* =====================================================================
   BOOT
   ===================================================================== */
let booted = false;
function boot(data) {
  if (booted) return;
  booted = true;
  data = data || {};
  try {
    const u = data.ui;
    if (u) {
      if (typeof u.players === 'number') ui.players = Math.min(8, Math.max(2, u.players));
      if (u.mode === 'tag' || u.mode === 'name') ui.mode = u.mode;
      if (typeof u.filter === 'string') ui.filter = u.filter;
    }
    const s = data.setup;
    if (s && Array.isArray(s.names)) {
      setup.names = s.names.slice(0, 8).map(String); setup.loaded = true;
      if (s.count >= 2 && s.count <= 8) setup.count = s.count;
      if (ROUND_OPTS.includes(s.rounds)) setup.rounds = s.rounds;
    }
  } catch (_) { /* ignore */ }
  if (ui.filter !== 'all' && !catOf(ui.filter)) ui.filter = 'all';
  SE.init(); BGM.init(); renderSE();
  wireEditor(); wireGame();
  checkDraft();
  G = normalizeGame(validGame(data.G) ? data.G : loadGame());
  let ret = null;
  try { ret = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY); } catch (_) { /* ignore */ }
  const want = data.screen || ret || 'title';
  if (want === 'game' && G && !G.done) showScreen('game');
  else if (want === 'result' && G && G.done) showScreen('result');
  else if (want === 'editor' || want === 'setup') showScreen(want);
  else showScreen('title');
  FXC.size();
}
const hot = window.claude && window.claude.hot;
try {
  if (hot && typeof hot.snapshot === 'function') {
    hot.snapshot(() => ({ ui: Object.assign({}, ui), setup: { count: setup.count, names: setup.names.slice(), rounds: setup.rounds }, screen, G }));
  }
} catch (_) { /* ignore */ }
if (hot && typeof hot.ready === 'function') {
  try { hot.ready(boot); } catch (_) { boot({}); }
  setTimeout(() => boot({}), 1500);
} else boot((hot && hot.data) || {});
})();
