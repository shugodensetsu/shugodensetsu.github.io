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
  clink: (A, t) => { const f = 2300 + Math.random() * 1500; bellHit(A, t, f, 0.16, 0.09); noise(A, t, { d: 0.025, g: 0.12, type: 'highpass', f: 3500 }); },
  clinks: (A, t) => { const f = 2600 + Math.random() * 1600; bellHit(A, t, f, 0.1, 0.04); noise(A, t, { d: 0.018, g: 0.06, type: 'highpass', f: 4000 }); },
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
const NO_DUCK = new Set(['clink', 'clinks', 'tick', 'tap', 'pop', 'select', 'beep', 'heart', 'swoosh', 'coin', 'tick2', 'tock', 'deal', 'flip', 'pass', 'hiss', 'hurry']);
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
let sheet = null, decide = null, wheel = null, tap = null, picking = null, zoom = null;
let wakeLock = null, lastFocus = null, spotRot = 0;

const pc = i => 'var(--p' + ((i % 8) + 1) + ')';
const fmtAmt = x => String(Math.round(x * 10) / 10);
const halfOf = x => (x <= 0.5 ? x : Math.ceil(x) / 2);
const freshPending = () => ({ mult: 1, half: false, from: null, src: '' });
const pname = i => G.players[i].name;
const hasDur = (p, fx) => G.players[p].hand.some(h => h.kind === 'dur' && h.fx === fx);
const ticketsOf = (p, fx) => G.players[p].hand.filter(h => h.kind === 'ticket' && (!fx || h.fx === fx));
/* NEXT ×2 / 半分: P is a pending effect (normally G.pending; a re-record of an auto entry passes the one that entry used) */
const pendOn = P => !!P && (P.mult !== 1 || !!P.half);
const immuneP = (P, p) => !!P && P.from != null && hasDur(p, 'nodouble');
const pendHits = (P, p) => pendOn(P) && P.from !== p && !immuneP(P, p);
const pendFor = s => (s.pend !== undefined ? s.pend : G.pending);
const pendingActive = () => pendOn(G.pending);
const immuneTo = p => immuneP(G.pending, p);
const pendingApplies = p => pendHits(G.pending, p);
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
  if (c.autoDone === undefined) c.autoDone = c.phase === 'drawn';   /* saved before auto-recording existed: never record that card again */
  c.decided = !!c.decided;
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
const FULL_OV = ['wheelOv', 'chalOv', 'bombOv', 'tapOv', 'timerOv', 'toolOv', 'howOv'];
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
  if (tool) { tool.timers.forEach(clearTimeout); if (tool.raf) cancelAnimationFrame(tool.raf); if (tool.bowl) tool.bowl.dispose(); }
  wheel = null; sheet = null; decide = null; zoom = null; chal = null; bomb = null; timer = null; tool = null; ask = null;
  document.querySelectorAll('.ov').forEach(o => { o.hidden = true; });
  syncCover();
}
function showScreen(name) {
  screen = SCREENS.includes(name) ? name : 'title';
  for (const s of SCREENS) $('scr-' + s).hidden = s !== screen;
  if (screen === 'title') renderTitle();
  else if (screen === 'setup') renderSetup(true);
  else if (screen === 'game') { renderGame(); resumeDraw(); }
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
  G.cur = { drawer: G.turn % n, phase: 'before', card: null, names: null, cospa: false, used: [], drinks: [], hhFreeDone: false, swapDone: false, giveDone: false, pickDone: null, chalDone: false, bombDone: false, select: null,
    autoDone: false, decided: false };
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
    cur: { used: c.used, cospa: c.cospa, hhFreeDone: c.hhFreeDone, swapDone: c.swapDone, giveDone: c.giveDone, pickDone: c.pickDone, chalDone: !!c.chalDone, bombDone: !!c.bombDone, decided: !!c.decided } });
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
  if (card.dur) {
    /* a continuing card goes to the drawer's hand and shows in the 「継続中」 strip; cups = what breaking the rule costs */
    const item = { kind: 'dur', fx: fx === 'half' || fx === 'nodouble' ? fx : null, label: '継続', text: plainFill(card.text), left: ruleTurns(card.dur, n), mark: cur.card.mark, color: cur.card.color,
      cups: card.cups.slice(), turn: G.turn };
    if (durPickCard(card)) Object.assign(item, { pick: true, who: null, title: ruleTitle(card.text) || '指名', mate: mateCard(card) });
    else G.players.forEach(pl => { pl.hand = pl.hand.filter(h => !(h.kind === 'dur' && !h.pick && h.text === item.text)); });   /* the same rule again = it starts over */
    gifts.push([d, giveItem(d, item)]);
  }
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
  afterZoom(afterDraw);
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
  if (isChal(fx) && !cur.chalDone && cur.card.cups.length > 1) acts.push(['plain', '素直に' + cur.card.cups[0] + '杯飲む', 'white']);
  if (fx === 'pick' && cur.pickDone == null) acts.push(['pick', 'ルーレットで決める！', 'cyan']);
  if (fx === 'tap') acts.push(['tap', '早押し対決スタート！', 'cyan']);
  if (fx === 'hh' && !cur.hhFreeDone) acts.push(['hhfree', '天国と地獄を回す！', 'cyan']);
  if (fx === 'swap' && !cur.swapDone) acts.push(['swap', '入れ替える相手を選ぶ', 'cyan']);
  if (fx === 'givesafe' && !cur.giveDone) acts.push(['give', 'セーフ券を渡す', 'lime']);
  if (fx === 'endrule' && anyDur()) acts.push(['endrule', 'ルールを終わらせる', 'lime']);
  const tk = cur.phase === 'drawn' ? toolOf(cur.card) : null;
  if (tk && !recordedThisTurn()) acts.push(['tool', TOOL_INFO[tk].act, 'cyan']);
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
  const zh = zoomHint();
  $('zHint').className = 'z-hint' + (zh.auto ? ' auto' : '');
  $('zHint').innerHTML = zh.html;
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
      if (k === gifts.length - 1) telop(item.kind === 'ticket' ? esc(item.label) + ' GET！' : item.kind === 'dur' ? (item.pick ? '指名カード！' : ruleCups(item) ? 'ルール追加！' : '効果スタート！') : '手札に追加！', 'lime sm', 1100);
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
  const mx = mateExtras([{ p: d, amt }]);
  mx.forEach(x => addDrink(x.p, x.amt));
  cur.drinks.push({ kind: 'cospa', snap: s, items: [{ p: d, amt }].concat(mx), note: free ? 'コスパ無料券' : 'コスパ前払い' });
  saveGame();
  renderGame();
  if (mx.length) mateFx(mx, 900);
  SE.play(free ? 'ticket' : 'coin');
  telop((free ? 'コスパ無料！' : 'コスパ発動！') + '<small>このターン、' + esc(pname(d)) + 'が飲む量は半分</small>', 'lime', 1700);
  floatAt(d, amt ? '+1杯' : 'FREE', !amt);
}
function nextTurn(force) {
  if (!G || G.cur.phase !== 'drawn' || picking) return;
  /* 「次へ」 with nobody recorded on a card that needs a choice (or a mini game not played yet) asks first */
  if (!force) { const t = turnTask(); if (t) { openNextAsk(t); return; } }
  const n = G.players.length;
  pushHist();
  G.turn++;
  /* the last tip (where help lives) comes once a turn has been finished with a record, or after 3 turns at the latest */
  if (coach.on) { coach.turns = (coach.turns || 0) + 1; if (coach.seen.has('next') || coach.cur === 'next' || coach.turns >= 3) coach.moved = true; }
  const expired = [];
  G.players.forEach((pl, i) => { pl.hand = pl.hand.filter(h => { if (h.kind !== 'dur') return true; h.left--; if (h.left <= 0) { expired.push(ruleLabel(i, h)); return false; } return true; }); });
  if (G.rounds && G.turn >= G.rounds * n) { finishGame(); return; }
  startTurn();
  saveGame();
  renderGame();
  turnFx();
  if (expired.length) setTimeout(() => {
    const one = expired[0].length > 15 ? expired[0].slice(0, 14) + '…' : expired[0];
    telop((expired.length > 1 ? expired.length + 'つのルールが終了！' : 'ルール終了！') + '<small>' + esc(expired.length > 1 ? one + ' など' : one) + '</small>', 'cyan sm', 1500);
    SE.play('poof');
  }, 1300);
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
  const p = s.p, cur = G.cur, n = G.players.length, P = pendFor(s);
  let a = s.base; const steps = [s.base + '杯'], pushes = [];
  if (pendHits(P, p)) {
    if (P.mult !== 1) { a *= P.mult; steps.push('×' + P.mult + '（' + P.src + '）'); }
    if (P.half) { a = halfOf(a); steps.push('半分（カードの効果）'); }
  } else if (pendOn(P) && P.from !== p && immuneP(P, p)) steps.push('倍倍を無効化（手札）');
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
/* opts.replace: index of an auto entry — re-record that person's drink with a special rule / ticket (やめる = keep the auto record)
   opts.batch: opened from 「誰が飲む？」 — {others, back}: the others are recorded together, やめる goes back to the choosing screen
   opts.owed: a mini game's loser — やめる (「使わずに記録」) records the drink as it is */
function openSheet(p, opts) {
  makeSheet(p, opts);
  renderSheet();
  openOv('sheetOv');
  SE.play('pop');
  const b = $('sheetRecord'); if (b) b.focus({ preventScroll: true });
}
function makeSheet(p, opts) {
  opts = opts || {};
  const cur = G.cur, c = cur.card;
  const def = c && c.cups.length ? c.cups[0] : 1;
  sheet = { p, base: Math.max(1, Math.min(99, opts.base || def)), dbl: false, hh: null, hhFree: false, mode: null, locked: false, ticket: null, pass: null,
    replace: null, batch: opts.batch || null, owed: !!opts.owed, src: opts.src || '' };
  const e = opts.replace != null ? cur.drinks[opts.replace] : null;
  if (e && e.kind === 'auto') {
    const it = e.items.find(x => x.p === p);
    sheet.replace = opts.replace; sheet.base = Math.max(1, Math.min(99, e.base || def)); sheet.pend = e.pend || null; sheet.was = it ? it.amt : 0;
  }
}
function renderSheet() {
  const s = sheet, p = s.p, cur = G.cur, n = G.players.length, pl = G.players[p];
  const used = cur.used.includes(p);
  const c = cur.card;
  const freeAvail = c && c.fx === 'hh' && p === cur.drawer && !cur.hhFreeDone && !s.hh;
  const calc = computeAmount(s);
  const cardAmt = c && c.cups.length ? (c.cups.length > 1 ? c.cups[0] + '–' + c.cups[1] + '杯' : c.cups[0] + '杯') : 'なし';
  const mods = [], P = pendFor(s);
  if (pendHits(P, p)) mods.push((P.mult !== 1 ? '×' + P.mult : '') + (P.half ? (P.mult !== 1 ? '・' : '') + '半分' : '') + '（' + P.src + '）');
  if (cur.cospa && p === cur.drawer) mods.push('コスパ中：この人が飲む量は半分');
  if (hasDur(p, 'half')) mods.push('手札：飲む量半分');
  if (immuneP(P, p) && pendOn(P)) mods.push('手札：倍倍無効');
  const withOthers = s.batch && s.batch.others ? s.batch.others : [];
  const ctx = s.replace != null ? '<p class="sh-ctx">自動で記録した <b>' + fmtAmt(s.was) + '杯</b> を、特殊ルール・券を使って記録し直します' +
      '<button type="button" class="sh-link" data-s="asnew">別の記録として追加する</button></p>'
    : withOthers.length ? '<p class="sh-ctx">' + withOthers.map(q => '<span class="sh-mini" style="--p:' + pc(q) + '">' + esc(pname(q)) + '</span>').join('') + 'も「記録する！」で一緒に記録します</p>'
    : s.owed ? '<p class="sh-ctx">特殊ルール・券を使わないなら「使わずに記録」</p>' : '';
  const cancel = s.owed ? '使わずに記録' : s.batch ? 'もどる' : 'やめる';
  const hhLabel = { heaven: '天国！ 回避', hell: '地獄… 2倍', bigheaven: '大天国！ 次の人に押し付け', bighell: '大地獄…… 3倍' };
  const modeLabel = s.mode === 'devil' ? '（デビルモード）' : s.mode === 'angel' ? '（大天使降臨）' : '';
  const dblDis = used || (s.hh && !s.hhFree);
  const hhDis = used || s.dbl || !!s.hh;
  const usable = pl.hand.filter(h => h.kind === 'ticket' && (h.fx === 'avoid' || h.fx === 'push'));
  const others = pl.hand.filter(h => !(h.kind === 'ticket' && (h.fx === 'avoid' || h.fx === 'push')));
  $('sheetBox').innerHTML =
    '<div class="sh-head"><h2 id="sheetTitle"><span class="sh-name" style="--p:' + pc(p) + '">' + esc(pl.name) + '</span>が飲む</h2><span class="sh-card">カード：' + cardAmt + '</span></div>' + ctx +
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
    '<div class="sh-actions"><button type="button" class="pbtn white small" data-s="close"' + (s.locked ? ' disabled' : '') + '>' + cancel + '</button>' +
      '<button type="button" class="pbtn main" id="sheetRecord" data-s="record">記録する！</button></div>';
}
/* a line under the cups: always for range cards ("1〜3杯"), and for the first few records otherwise */
function sheetHint(c, s) {
  if (s.locked || s.replace != null || s.batch || s.owed) return '';
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
function closeSheet() {
  if (sheet && sheet.locked) return;
  const s = sheet;
  sheet = null; closeOv('sheetOv');
  if (!s || !G) return;
  if (s.owed) autoRecord([s.p], s.base, { src: s.src || 'game', ask: false });
  else if (s.batch && s.batch.back) reopenDecide(s.batch.back);
}
function recordSheet() {
  const s = sheet, p = s.p, cur = G.cur;
  /* from 「誰が飲む？」 with several people: the others drink the plain amount, recorded first (NEXT ×2 hits them too) */
  let extra = [], fix = null;
  if (s.batch && s.batch.others && s.batch.others.length) {
    const r = autoRecord(s.batch.others, s.base, { src: s.batch.src || 'decide', quiet: true, keepPending: true, mateSkip: [p] });
    extra = r.e.items; s.batchUsed = r.used;
  }
  const sn = snap();
  /* re-recording an auto record: take that person out of it (undo puts them back) */
  if (s.replace != null && cur.drinks[s.replace]) {
    const e = cur.drinks[s.replace];
    fix = { i: s.replace, items: e.items.map(x => Object.assign({}, x)) };
    /* that person's drink and the インシュメイト drink that followed it */
    e.items.filter(x => x.p === p || x.mf === p).forEach(x => { if (x.amt) { G.players[x.p].total = Math.max(0, G.players[x.p].total - x.amt); G.players[x.p].times = Math.max(0, G.players[x.p].times - 1); } });
    e.items = e.items.filter(x => !(x.p === p || x.mf === p));
    s.together = e.items.map(x => x.p);
  }
  const calc = computeAmount(s);
  lsSet(RECS_KEY, String((Number(lsGet(RECS_KEY)) || 0) + 1));
  const P = pendFor(s);
  const applied = pendHits(P, p);
  const incoming = applied ? P.mult : 1;
  if ((applied && s.pend === undefined) || s.batchUsed) G.pending = freshPending();
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
  const own = [{ p, amt: calc.amt }].concat(calc.pushes.map(x => ({ p: x.to, amt: x.amt })));
  const mx = mateExtras(own, (s.together || []).concat(s.batch && s.batch.others ? s.batch.others : []));
  mx.forEach(x => addDrink(x.p, x.amt));
  const items = own.concat(mx);
  const entry = { kind: 'drink', snap: sn, items, note: calc.steps.slice(1).join(' → ') };
  if (fix) entry.fix = fix;
  if (s.batch && s.batch.src) entry.src = s.batch.src; else if (s.owed && s.src) entry.src = s.src;
  cur.drinks.push(entry);
  if (s.batch) cur.decided = true;
  sheet = null;
  closeOv('sheetOv');
  saveGame();
  renderGame();
  own.concat(extra).forEach((it, k) => setTimeout(() => floatAt(it.p, !it.amt ? 'SAFE!' : fix && it.p === p ? fmtAmt(it.amt) + '杯に！' : '+' + fmtAmt(it.amt) + '杯', !it.amt), k * 250));
  if (mx.length) mateFx(mx, 700);
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
  if (e.fix && cur.drinks[e.fix.i]) cur.drinks[e.fix.i].items = e.fix.items;
  saveGame();
  renderGame();
  SE.play('poof');
}
/* ---------- auto-record: the app records whoever the card names, and asks only when it can't know ----------
   drinkOf(card) (part-head) says how: auto / all / others / least / last = recorded when the card is closed;
   pick / judge = the 「誰を指名する？」「誰が飲む？」 screen; app = the mini game's result; none = nothing now */
const AUTO_MODES = ['auto', 'all', 'others', 'least', 'last'];
const BEER = ['#ffd83d', '#ffb627', '#fff3b8', '#ffffff'];
const pcHex = i => getComputedStyle(document.documentElement).getPropertyValue('--p' + ((i % 8) + 1)).trim() || '#ffd83d';
function cardPeople(c) {
  const out = [];
  (String(c.text).match(TAG_RE) || []).forEach(t => { const i = G.cur.names[t.slice(1, -1)]; if (i != null && !out.includes(i)) out.push(i); });
  return out;
}
function drinkPlan() {
  const cur = G.cur, c = cur.card;
  if (!c) return { mode: 'none' };
  const mode = drinkOf(c), base = c.cups.length ? c.cups[0] : 1, all = G.players.map((_, i) => i);
  if (mode === 'auto') { const ps = cardPeople(c); return { mode, ps: ps.length ? ps : [cur.drawer], base }; }
  if (mode === 'all') return { mode, ps: all, base };
  if (mode === 'others') return { mode, ps: all.filter(i => i !== cur.drawer), base };
  if (mode === 'least') { const v = G.players.map(p => p.total), mn = Math.min.apply(null, v); return { mode, ps: all.filter(i => v[i] === mn), base }; }
  if (mode === 'last') return { mode, ps: G.last != null && G.players[G.last] ? [G.last] : [], base };
  if (mode === 'pick') { const pi = pickInfo(c); return { mode, by: cur.names[pi.by], n: Math.min(pi.n, G.players.length - (pi.self ? 1 : 0)), self: pi.self, base }; }
  if (mode === 'judge') return { mode, cands: cardPeople(c), base };
  return { mode };
}
/* the line under the card zoom: what the app will do when it is closed */
function zoomHint() {
  const cur = G.cur, c = cur.card, n = G.players.length;
  const plain = { html: 'どこをタップしてもテーブルに戻ります' };
  if (!c || cur.autoDone) return plain;
  if (c.dur) return { auto: true, html: durPickCard(c) ? '閉じると、指名する人を選びます' : '閉じると、上の<b>「継続中」</b>に表示されます（' + esc(c.dur) + '）' };
  const pl = drinkPlan();
  if (AUTO_MODES.includes(pl.mode)) {
    if (!pl.ps.length) return { auto: true, html: '該当する人がいないので、今回はセーフ' };
    const who = pl.ps.length === n && n > 2 ? '<b>全員</b>' : pl.mode === 'others' ? '<b>' + esc(pname(cur.drawer)) + '以外の全員</b>'
      : pl.ps.length > 2 ? '<b>' + pl.ps.length + '人</b>' : pl.ps.map(p => '<b>' + esc(pname(p)) + '</b>').join('と');
    return { auto: true, html: '閉じると ' + who + ' に' + pl.base + '杯' + (pl.ps.length > 1 ? 'ずつ' : '') + '、自動で記録します' };
  }
  if (pl.mode === 'pick') return { auto: true, html: '閉じると「誰を指名する？」画面になります' };
  if (pl.mode === 'judge' && toolOf(c)) return { auto: true, html: '下のボタンならアプリで遊んで、負けた人を自動で記録。<br>本物の道具で遊ぶなら、閉じると「誰が飲む？」画面' };
  if (pl.mode === 'judge') return { auto: true, html: timerOf(c) ? 'タイマーのあと「誰が飲む？」画面になります' : '閉じると「誰が飲む？」画面になります' };
  if (pl.mode === 'app') {
    const fx = c.fx || '';
    if (fx === 'hh') return { auto: true, html: '下のボタンから天国と地獄を回そう' };
    if (fx === 'pick') return { auto: true, html: 'ルーレットで当たった人を、自動で記録します' };
    return { auto: true, html: '下のボタンからスタート！ ' + (isChal(fx) ? '失敗したら' : fx === 'bomb' ? '爆発した人を' : '負けた人を') + '自動で記録します' };
  }
  return plain;
}
/* runs once per drawn card, when its zoom closes */
function afterDraw() {
  if (!G || screen !== 'game') return;
  const cur = G.cur;
  if (cur.phase !== 'drawn' || cur.autoDone) return;
  cur.autoDone = true;
  const pl = drinkPlan();
  if (AUTO_MODES.includes(pl.mode)) {
    if (pl.ps.length) { autoRecord(pl.ps, pl.base, { src: 'card' }); return; }
    saveGame(); renderGame();
    telop('該当者なし！<small>今回はセーフ</small>', 'lime sm', 1400); SE.play('ticket');
    return;
  }
  saveGame();
  renderGame();
  if (durWaiting(true)) { setTimeout(() => { if (screen === 'game' && G && G.cur === cur && durWaiting(true) && noOv()) openDecide('durpick'); }, 380); return; }
  if (durNew()) ruleHint();
  if ((pl.mode === 'pick' || pl.mode === 'judge') && !timerOf(cur.card) && !timer && !chal && !bomb && !tap && !tool) {
    setTimeout(() => { if (screen === 'game' && G && G.cur === cur && needsPick() && noOv()) openDecide(); }, 380);
  }
}
/* the app was closed while a fresh card was up: show it again, and record when it's closed */
function resumeDraw() {
  const cur = G && G.cur;
  if (!cur || cur.phase !== 'drawn' || cur.autoDone || zoom) return;
  setTimeout(() => { if (screen === 'game' && G && G.cur === cur && !cur.autoDone && !zoom && noOv()) { openZoom(false); afterZoom(afterDraw); } }, 400);
}
/* record the same base amount for several people at once (NEXT ×2 / コスパ / 手札の半分 are worked out per person) */
function autoRecord(ps, base, o) {
  o = o || {};
  const cur = G.cur, sn = snap();
  if (o.mark) cur[o.mark] = true;
  const P0 = o.pend !== undefined ? o.pend : G.pending;
  const used0 = pendOn(P0) ? Object.assign({}, P0) : null;
  const main = ps.map(p => ({ p, amt: computeAmount({ p, base, pend: o.pend }).amt }));
  const items = main.concat(mateExtras(main, o.mateSkip));
  const before = items.map(it => G.players[it.p].total);
  let used = false;
  items.forEach(it => { if (it.mf == null && pendHits(P0, it.p)) used = true; addDrink(it.p, it.amt); });
  if (used && !o.keepPending && o.pend === undefined) G.pending = freshPending();
  const e = { kind: 'auto', snap: sn, items, base, src: o.src || 'card', pend: used ? used0 : null };
  cur.drinks.push(e);
  if (o.decided) cur.decided = true;
  if (!o.quiet) {
    saveGame(); renderGame(); drinkFx(items, before, o);
    if (o.ask !== false) {
      const m = main.length, mates = items.length - m;
      scheduleAsk(e, reduceMotion ? 400 : 1000 + Math.min(m - 1, 4) * 150 + (mates ? 1800 : 500));
    }
  }
  return { e, used };
}
/* "+1杯" tokens fly from the card to each seat; the seat's total counts up as each one lands.
   Drinks that follow an インシュメイト fly afterwards, from the partner's seat */
function flyDrink(it, src, delay, from0, cls) {
  const seatOf = p => document.querySelector('.seat[data-seat="' + p + '"]');
  const seat = seatOf(it.p);
  if (!seat) return;
  const tot = seat.querySelector('.seat-total');
  if (tot && !reduceMotion) tot.innerHTML = fmtAmt(from0) + '<small>杯</small>';
  let landed = false;
  const land = () => {
    if (landed) return;
    landed = true;
    const s2 = seatOf(it.p);
    if (!s2) return;
    countUp(s2, from0, from0 + it.amt);
    s2.classList.remove('bump'); void s2.offsetWidth; s2.classList.add('bump');
    const q = relPos(s2);
    if (!reduceMotion) {
      const r = document.createElement('div');
      r.className = 'gulp-ring';
      r.style.left = q.x + 'px'; r.style.top = q.y + 'px'; r.style.width = (q.w + 10) + 'px'; r.style.height = (q.h + 10) + 'px';
      r.style.borderColor = cls === 'mate' ? 'var(--pink)' : it.amt ? 'var(--yellow)' : 'var(--mint)';
      $('shell').appendChild(r);
      setTimeout(() => r.remove(), 700);
    }
    FXC.burst(q.x, q.y - 4, it.amt ? 26 : 18, { colors: cls === 'mate' ? ['#ff4fa3', '#ff7cbd', '#ffffff'] : it.amt ? BEER : ['#3df5b5', '#ffffff', '#a8f03a'], speed: 7, star: !it.amt || cls === 'mate' });
    SE.play(it.amt ? 'coin' : 'ticket');
    vibrate(it.amt >= 5 ? [80, 40, 120] : 30);
  };
  if (reduceMotion) { setTimeout(land, 80 + delay / 10); return; }
  const to = relPos(seat);
  const el = document.createElement('div');
  el.className = 'gulp-tok' + (it.amt ? '' : ' safe') + (cls ? ' ' + cls : '');
  el.innerHTML = it.amt ? '+' + fmtAmt(it.amt) + '<small>杯</small>' : 'SAFE';
  el.style.opacity = '0';
  $('shell').appendChild(el);
  const w = el.offsetWidth, h = el.offsetHeight, x0 = src.x - w / 2, y0 = src.y - h / 2;
  const dx = to.x - src.x, dy = to.y - src.y, lift = Math.min(130, 50 + Math.hypot(dx, dy) * 0.3);
  const T = (x, y, sc) => 'translate(' + (x0 + x).toFixed(1) + 'px,' + (y0 + y).toFixed(1) + 'px) scale(' + sc + ')';
  el.style.transform = T(0, 0, 0.3);
  const an = el.animate([
    { transform: T(0, 0, 0.3), opacity: 0 },
    { transform: T(0, -12, 1.35), opacity: 1, offset: 0.2 },
    { transform: T(dx * 0.5, dy * 0.5 - lift, 1.12), opacity: 1, offset: 0.6 },
    { transform: T(dx, dy, 0.6), opacity: 1 },
  ], { duration: 880, delay, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'both' });
  const done = () => { el.remove(); land(); };
  an.onfinish = done;
  setTimeout(() => { if (!landed) done(); }, delay + 880 + 600);
}
function drinkFx(items, before, o) {
  o = o || {};
  const fromEl = (o.from && document.querySelector(o.from)) || document.querySelector('#center .gcard') || $('center');
  const src = relPos(fromEl);
  const main = [], mates = [];
  items.forEach((it, k) => (it.mf != null ? mates : main).push([it, before[k]]));
  main.forEach(([it, b], k) => flyDrink(it, src, 120 + k * 150, b, ''));
  if (!reduceMotion) SE.play('swoosh');
  const t1 = reduceMotion ? 120 : 1000 + Math.min(main.length - 1, 4) * 150;
  setTimeout(() => { if (screen === 'game') autoTelop(main.map(x => x[0]), o); }, t1);
  if (mates.length) mateFx(mates.map(x => x[0]), t1 + 500, mates.map(x => x[1]));
}
function mateFx(extra, delay, befores) {
  if (!extra.length) return;
  extra.forEach((it, k) => {
    const from = document.querySelector('.seat[data-seat="' + it.from + '"]');
    flyDrink(it, relPos(from || $('center')), delay + k * 150, befores ? befores[k] : G.players[it.p].total - it.amt, 'mate');
  });
  const names = extra.map(it => pname(it.p)).join('・'), amts = extra.map(it => it.amt);
  setTimeout(() => {
    if (screen !== 'game') return;
    telop('インシュメイト！<small>' + esc(names) + 'も' + (amts.every(a => a === amts[0]) ? fmtAmt(amts[0]) + '杯' : '一緒に') + '</small>', 'pink sm', 1400);
    SE.play('double');
  }, (reduceMotion ? 200 : delay + 900));
}
function countUp(seat, from, to) {
  const t = seat.querySelector('.seat-total');
  if (!t) return;
  const show = v => { t.innerHTML = fmtAmt(v) + '<small>杯</small>'; };
  if (reduceMotion || to <= from) { show(to); return; }
  const unit = Number.isInteger(to - from) ? 1 : 0.5;
  const steps = Math.min(12, Math.max(1, Math.round((to - from) / unit)));
  for (let i = 1; i <= steps; i++) setTimeout(() => { if (t.isConnected) show(i === steps ? to : from + unit * Math.round((to - from) * i / steps / unit)); }, i * Math.min(110, 480 / steps));
}
function autoTelop(items, o) {
  const head = o && o.src === 'rule' ? '違反！ ' : '';
  const n = G.players.length, drink = items.filter(it => it.amt > 0);
  if (!drink.length) { telop('SAFE！', 'lime sm', 1200); return; }
  const amts = drink.map(it => it.amt), same = amts.every(a => a === amts[0]), max = Math.max.apply(null, amts);
  const nm = p => '<span style="color:' + pc(p) + '">' + esc(pname(p)) + '</span>';
  let html;
  if (drink.length === n && n > 2) { html = '全員' + (same ? fmtAmt(amts[0]) + '杯！' : 'グイ！') + '<small>カンパーイ！</small>'; FXC.rain(70); SE.play('cat_all', 0.05); }
  else if (drink.length === 1) html = '<small>' + head + nm(drink[0].p) + '</small>' + fmtAmt(amts[0]) + '杯！';
  else html = '<small>' + head + (drink.length <= 3 ? drink.map(it => nm(it.p)).join('・') : drink.length + '人') + '</small>' + (same ? fmtAmt(amts[0]) + '杯ずつ！' : 'グイ！');
  if (max >= 5) { SE.play('hell'); shake(true); telop(html, 'red sm', 1500); }
  else { SE.play('gulp'); telop(html, 'sm', 1300); }
}
/* people recorded automatically this turn who can still re-record with a special rule (latest record per person) */
function replaceList() {
  const out = [], es = G.cur.drinks;
  for (let k = es.length - 1; k >= 0; k--) {
    const e = es[k];
    if (e.kind === 'auto') e.items.forEach(it => { if (it.amt > 0 && it.mf == null && !out.some(x => x.p === it.p)) out.push({ p: it.p, i: k }); });
  }
  return out.sort((a, b) => a.p - b.p);
}
function openSpecial() {
  const list = replaceList();
  if (!list.length) return;
  if (list.length === 1) openSheet(list[0].p, { replace: list[0].i });
  else openDecide('who', { list });
}
/* a drink for the card itself (not コスパ, not naming someone, not a rule break) */
const recordedThisTurn = () => G.cur.drinks.some(e => e.kind !== 'cospa' && e.kind !== 'name' && e.src !== 'rule');
/* the card's drinkers still have to be chosen */
function needsPick() {
  const cur = G && G.cur;
  if (!cur || cur.phase !== 'drawn' || !cur.card || cur.decided || recordedThisTurn()) return false;
  const m = drinkOf(cur.card);
  return m === 'pick' || m === 'judge';
}
/* 「次へ」 check: nobody chosen yet, or the card's mini game not played */
const GAME_NAMES = { chal: 'チャレンジ', bomb: '爆弾パス回し', pick: 'ルーレット', tap: '早押し対決', hhfree: '天国と地獄', timer: 'ストップ対決' };  /* 道具ゲーム are optional, so not asked for */
function turnTask() {
  const cur = G.cur;
  const dw = durWaiting(true);
  if (dw) return { title: 'まだ「' + (dw[1].title || '指名') + '」を指名していません', text: '指名しないで次の人へ進む？（あとで上の帯からも選べます）', go: 'durpick', goLabel: '指名する', skip: '指名しないで次へ' };
  if (!cur.card || recordedThisTurn()) return null;
  if (needsPick()) return { title: 'まだ飲む人を記録していません', text: 'このカードで飲んだ人は、いなかった？', go: 'decide', goLabel: '飲む人を選ぶ', skip: '誰も飲まなかった' };
  if (drinkOf(cur.card) === 'app') {
    const a = cardActs().find(x => GAME_NAMES[x[0]]);
    if (a) return { title: 'まだ「' + (a[0] === 'chal' && CHAL[cur.card.fx] ? CHAL[cur.card.fx].title : GAME_NAMES[a[0]]) + '」をやっていません', text: 'やらずに次の人へ進む？', go: a[0], goLabel: 'やる！', skip: 'やらずに次へ' };
  }
  return null;
}
function openNextAsk(t) {
  $('nextBox').innerHTML = '<h2 id="nextTitle">' + esc(t.title) + '</h2><p>' + esc(t.text) + '</p>' +
    '<div class="dialog-acts"><button type="button" class="pbtn white small" data-nx="skip">' + esc(t.skip) + '</button>' +
    '<button type="button" class="pbtn small" data-nx="go" data-go="' + t.go + '">' + esc(t.goLabel) + '</button></div>';
  openOv('nextOv');
  SE.play('pop');
  const b = $('nextBox').querySelector('[data-nx="go"]'); if (b) b.focus({ preventScroll: true });
}

/* ---------- 「誰を指名する？」「誰が飲む？」: choose people, then [飲む！] or [特殊ルール・券] ----------
   kind pick: exactly N people (the namer is shown; 「一緒に」 cards keep the namer in). judge: anyone, or 誰も飲まなかった.
   free: 追加で記録 (rule breaks …). who: one person out of a list, for 特殊ルール・券 */
function openDecide(kind, o) {
  if (!G) return;
  o = o || {};
  const cur = G.cur, c = cur.card, pl = drinkPlan();
  kind = kind || (pl.mode === 'pick' ? 'pick' : pl.mode === 'judge' ? 'judge' : 'free');
  const d = { kind, base: c && c.cups.length ? c.cups[0] : 1, sel: [], lock: [], step: null };
  if (kind === 'pick') Object.assign(d, { by: pl.by, need: Math.max(1, pl.n || 1), self: !!pl.self, sel: pl.self ? [pl.by] : [], lock: pl.self ? [pl.by] : [] });
  if (kind === 'judge') d.cands = pl.cands || [];
  if (kind === 'free' && Array.isArray(o.sel)) d.sel = o.sel.slice();
  if (kind === 'who') { d.list = o.list || []; d.step = 'who'; }
  if (kind === 'rule' || kind === 'durpick') {
    const row = o.uid != null ? durRows().find(([, h]) => h.uid === o.uid) : durWaiting(false);
    if (!row) return;
    d.owner = row[0]; d.item = row[1];
    if (kind === 'rule') { d.base = ruleCups(d.item) || 1; d.cands = d.item.who != null ? [d.item.who] : []; }
    else { d.need = 1; d.by = row[0]; }
  }
  decide = d;
  renderDecide();
  if ($('decideOv').hidden) openOv('decideOv');
  SE.play('pop');
}
function reopenDecide(st) {
  if (!G || G.cur.phase !== 'drawn') return;
  decide = st; decide.step = null;
  renderDecide();
  openOv('decideOv');
}
function closeDecide() {
  decide = null;
  closeOv('decideOv');
  if (G && screen === 'game') { renderDock(); renderLog(); }
}
const decidePicks = d => d.sel.filter(p => !d.lock.includes(p)).length;
const decideReady = d => (d.kind === 'pick' || d.kind === 'durpick' ? decidePicks(d) === d.need : d.sel.length > 0);
function renderDecide() {
  const d = decide, cur = G.cur, c = cur.card;
  const who = d.step === 'who';
  const list = who ? (d.kind === 'who' ? d.list.map(x => x.p) : d.sel.slice().sort((a, b) => a - b)) : G.players.map((_, i) => i);
  const ready = decideReady(d), picks = decidePicks(d);
  let title, sub;
  if (who) { title = '特殊ルール・券を使うのは？'; sub = d.kind === 'who' ? 'タップすると、その人の記録画面が開きます' : 'ほかの人は、そのまま一緒に記録されます'; }
  else if (d.kind === 'pick') {
    title = '誰を指名する？';
    sub = '<b>' + esc(pname(d.by)) + '</b> が指名した人をタップ' + (d.need > 1 ? '（' + d.need + '人）' : '') + (d.self ? '<br>' + esc(pname(d.by)) + 'も一緒に飲みます' : '');
  } else if (d.kind === 'judge') { title = '誰が飲む？'; sub = '負けた人・当てはまった人をタップ（何人でもOK）'; }
  else if (d.kind === 'rule') { title = '違反したのは？'; sub = '違反した人をタップ（何人でもOK） ・ このルールはあと<b>' + d.item.left + '</b>ターン'; }
  else if (d.kind === 'durpick') { title = '誰を指名する？'; sub = '<b>' + esc(pname(d.by)) + '</b> が「' + esc(d.item.title || '指名') + '」に指名した人をタップ'; }
  else { title = '追加で記録'; sub = 'ルール違反などで飲む人をタップ（何人でもOK）'; }
  const roleOf = i => (c && cur.names ? ROLE_ORDER.filter(k => cur.names[k] === i) : []);
  const btn = i => {
    const on = !who && d.sel.includes(i), r = roleOf(i);
    const isBy = !who && (d.kind === 'pick' || d.kind === 'durpick') && i === d.by;
    const off = d.kind === 'durpick' && i === d.by;
    const tag = isBy ? '<span class="dc-role by">指名する人</span>' : r.length ? '<span class="dc-role">' + r.join('・') + '</span>' : '';
    const amt = on ? computeAmount({ p: i, base: d.base }).amt : null;
    const tk = ticketsOf(i).some(h => h.fx === 'avoid' || h.fx === 'push') ? '<span class="dc-tk">券あり</span>' : '';
    const cand = !who && (d.kind === 'judge' || d.kind === 'rule') && (d.cands || []).includes(i);
    return '<button type="button" class="dc-p' + (cand ? ' cand' : '') + (d.lock.includes(i) ? ' locked' : '') + '" data-d="' + (who ? 'who' : 'sel') + '" data-i="' + i + '" aria-pressed="' + on + '" style="--p:' + pc(i) + '"' + (off ? ' disabled' : '') + '>' + tag +
      '<span class="dot"></span><span class="dc-nm">' + esc(pname(i)) + '</span>' + tk +
      (on && d.kind !== 'durpick' ? '<span class="dc-amt">' + (amt ? fmtAmt(amt) + '<small>杯</small>' : 'SAFE') + '</span>' : '') +
      (on && (d.kind === 'pick' || d.kind === 'durpick') && !d.lock.includes(i) ? '<span class="dc-stamp">指名！</span>' : on && d.kind === 'rule' ? '<span class="dc-stamp">違反！</span>' : '') + '</button>';
  };
  const pend = !who && pendingActive() ? '<p class="dc-note">NEXT ' + (G.pending.mult !== 1 ? '×' + G.pending.mult : '') + (G.pending.half ? (G.pending.mult !== 1 ? '・' : '') + '半分' : '') + ' は、選んだ人全員にかかります</p>' : '';
  const naming = d.kind === 'durpick';
  const amtRow = who || naming ? '' : '<div class="amt-row"><button type="button" class="stepper" data-d="minus" aria-label="1杯減らす"' + (d.base <= 1 ? ' disabled' : '') + '>−</button>' +
    '<span class="amt-base"><b>' + d.base + '</b><small>1人あたりの杯数</small></span>' +
    '<button type="button" class="stepper" data-d="plus" aria-label="1杯増やす"' + (d.base >= 99 ? ' disabled' : '') + '>＋</button></div>';
  const range = !who && c && c.cups.length > 1 && (d.kind === 'pick' || d.kind === 'judge') ? '<p class="sh-hint">このカードは<b>' + c.cups[0] + '〜' + c.cups[1] + '杯</b>。−／＋で合わせてね</p>' : '';
  const names = d.sel.slice().sort((a, b) => a - b).map(i => pname(i)).join('・');
  const acts = who ? '<div class="dc-acts"><button type="button" class="pbtn white small" data-d="back">' + (d.kind === 'who' ? 'とじる' : 'もどる') + '</button></div>'
    : naming ? '<div class="dc-acts"><button type="button" class="pbtn main" id="decideGo" data-d="go"' + (ready ? '' : ' disabled') + '>' + (ready ? '決定！<span class="sub">' + esc(names) + '</span>' : '指名してね') + '</button></div>'
    : '<div class="dc-acts">' +
      '<button type="button" class="pbtn main" id="decideGo" data-d="go"' + (ready ? '' : ' disabled') + '>' + (ready ? '飲む！<span class="sub">' + esc(names) + '</span>' : d.kind === 'pick' ? '指名してね' : '飲む人をタップ') + '</button></div>';
  const none = !who && d.kind === 'judge' ? '<button type="button" class="dc-none" data-d="none">誰も飲まなかった</button>' : '';
  $('decideBox').innerHTML = '<div class="dc-head"><h2 id="decideTitle">' + title + '</h2><button type="button" class="dc-later" data-d="later">' + (who && d.kind !== 'who' ? 'もどる' : who ? 'とじる' : 'あとで') + '</button></div>' +
    (d.item && !who ? '<p class="dc-card">' + esc(d.item.text) + '</p>' : c && !who && d.kind !== 'free' ? '<p class="dc-card">' + fillGame(c.text) + '</p>' : '') +
    '<p class="dc-sub">' + sub + '</p><div class="dc-players">' + list.map(btn).join('') + '</div>' + pend + amtRow + range + acts + none;
}
function decideSel(i) {
  const d = decide;
  if (d.lock.includes(i)) { SE.play('tap'); return; }
  const k = d.sel.indexOf(i);
  if (k >= 0) { d.sel.splice(k, 1); SE.play('tap'); renderDecide(); const x = $('decideBox').querySelector('[data-d="sel"][data-i="' + i + '"]'); if (x) x.focus({ preventScroll: true }); return; }
  if (d.kind === 'pick' || d.kind === 'durpick') {
    const picks = d.sel.filter(p => !d.lock.includes(p));
    if (picks.length >= d.need) d.sel.splice(d.sel.indexOf(picks[0]), 1);
  }
  d.sel.push(i);
  renderDecide();
  const el = $('decideBox').querySelector('[data-d="sel"][data-i="' + i + '"]');
  if (el) {
    el.focus({ preventScroll: true });
    const big = d.kind === 'pick' || d.kind === 'durpick';
    if (!reduceMotion) { el.classList.add('pop'); const q = relPos(el); FXC.burst(q.x, q.y - 6, big ? 34 : 14, { colors: [pcHex(i), '#ffffff', '#ffd83d'], speed: big ? 10 : 6, star: big }); }
  }
  const naming = d.kind === 'pick' || d.kind === 'durpick';
  SE.play(naming ? 'select' : 'pop');
  if (naming && decideReady(d)) { SE.play('ding', 0.12); vibrate(40); } else vibrate(15);
}
function decideGo() {
  const d = decide;
  if (!d || !decideReady(d)) return;
  const ps = d.sel.slice().sort((a, b) => a - b);
  decide = null;
  closeOv('decideOv');
  if (d.kind === 'durpick') { setDurPick(d.owner, d.item, ps[0]); return; }
  if (d.kind === 'rule') { autoRecord(ps, d.base, { src: 'rule', from: '#gRules [data-rule="' + d.item.uid + '"]' }); return; }
  autoRecord(ps, d.base, { src: d.kind === 'free' ? 'add' : d.kind, decided: d.kind !== 'free' });
}
function decideSpecial() {
  const d = decide;
  if (!d || !decideReady(d)) return;
  if (d.sel.length === 1) { decide = null; closeOv('decideOv'); openSheet(d.sel[0], { base: d.base, batch: { others: [], back: d, src: d.kind } }); return; }
  d.step = 'who';
  renderDecide();
  SE.play('pop');
}
function decideWho(p) {
  const d = decide;
  if (!d) return;
  decide = null;
  closeOv('decideOv');
  if (d.kind === 'who') { const x = d.list.find(y => y.p === p); if (x) openSheet(p, { replace: x.i }); return; }
  d.step = null;
  openSheet(p, { base: d.base, batch: { others: d.sel.filter(q => q !== p), back: d, src: d.kind } });
}
function decideNone() {
  const cur = G.cur, sn = snap();
  cur.decided = true;
  cur.drinks.push({ kind: 'safe', snap: sn, items: [] });
  decide = null;
  closeOv('decideOv');
  saveGame();
  renderGame();
  SE.play('ticket');
  telop('セーフ！<small>誰も飲まなかった</small>', 'lime sm', 1300);
}

/* ---------- 「特殊ルールを使う？」: right after a drink is counted, the drinker chooses 倍倍FIGHT！ / 天国と地獄 / a ticket, or just drinks.
   Several drinkers: first pick who uses one; two or more go in a random order, and a 倍倍FIGHT！ hits the next one in line ---------- */
let ask = null, askWait = 0;   /* askWait: prompts scheduled but not shown yet (the coach waits for them) */
const usableTickets = p => G.players[p].hand.filter(h => h.kind === 'ticket' && (h.fx === 'avoid' || h.fx === 'push'));
const canSpecial = p => !G.cur.used.includes(p) || usableTickets(p).length > 0;
function scheduleAsk(e, delay) {
  const cur = G.cur;
  const ps = e.items.filter(it => it.amt > 0 && it.mf == null).map(it => it.p).filter(canSpecial);
  if (!ps.length) return;
  let tries = 0, waiting = true;
  askWait++;
  const done = () => { if (waiting) { waiting = false; askWait = Math.max(0, askWait - 1); coachQueue(); } };
  const go = () => {
    if (!G || G.cur !== cur || screen !== 'game' || !cur.drinks.includes(e)) { done(); return; }
    if (!noOv() || picking || ask || zoom) { if (++tries < 20) setTimeout(go, 400); else done(); return; }
    const live = ps.filter(p => e.items.some(it => it.p === p && it.mf == null && it.amt > 0) && canSpecial(p));
    done();
    if (!live.length) return;
    ask = { e, ps: live, sel: [], order: live.length > 1 ? null : live.slice(), k: 0, step: live.length > 1 ? 'choose' : 'person' };
    renderAsk();
    openOv('askOv');
    SE.play('pop');
  };
  setTimeout(go, delay);
}
const askAmt = p => { const it = ask.e.items.find(x => x.p === p && x.mf == null); return it ? it.amt : 0; };
/* the NEXT effect for the k-th person in line: a 倍倍FIGHT！ by someone earlier in line (undefined = use G.pending), else the one the record used */
function askPend(k) {
  if (pendOn(G.pending) && ask.order.slice(0, k).includes(G.pending.from)) return undefined;
  return ask.e.pend || null;
}
const askChained = (k, p) => askPend(k) === undefined && pendHits(G.pending, p);
function renderAsk() {
  const A = ask, box = $('askBox');
  if (A.step === 'choose') {
    const btn = p => {
      const on = A.sel.includes(p);
      return '<button type="button" class="dc-p" data-a="sel" data-i="' + p + '" aria-pressed="' + on + '" style="--p:' + pc(p) + '"><span class="dot"></span><span class="dc-nm">' + esc(pname(p)) + '</span>' +
        (usableTickets(p).length ? '<span class="dc-tk">券あり</span>' : '') + '<span class="dc-amt">' + fmtAmt(askAmt(p)) + '<small>杯</small></span>' +
        (on ? '<span class="dc-stamp">使う！</span>' : '') + '</button>';
    };
    box.innerHTML = '<div class="dc-head"><h2 id="askTitle">特殊ルールを使う人はいる？</h2></div>' +
      '<p class="dc-sub">倍倍FIGHT！・天国と地獄・券を使う人をタップ<br>2人以上なら、使う順番はランダムで決めます</p>' +
      '<div class="dc-players">' + A.ps.map(btn).join('') + '</div>' +
      (A.sel.length
        ? '<div class="dc-acts"><button type="button" class="pbtn white small" data-a="none">いない！<span class="sub">全員素直に飲む</span></button><button type="button" class="pbtn main" data-a="use">' + A.sel.length + '人が使う！</button></div>'
        : '<div class="dc-acts"><button type="button" class="pbtn main" data-a="none">いない！ 全員素直に飲む</button></div>');
    return;
  }
  if (A.step === 'order') {
    box.innerHTML = '<div class="dc-head"><h2 id="askTitle">順番をランダムで決定！</h2></div><p class="dc-sub">倍倍FIGHT！は、次の順番の人に×2がかかります</p><div class="ask-order" id="askOrder"></div>';
    return;
  }
  const p = A.order[A.k], used = G.cur.used.includes(p), amt = askAmt(p), P = askPend(A.k);
  const calc = o => computeAmount(Object.assign({ p, base: A.e.base, pend: P }, o)).amt;
  const chained = askChained(A.k, p), plain = chained ? calc({}) : amt;
  const tks = usableTickets(p);
  box.innerHTML = '<div class="dc-head"><h2 id="askTitle">特殊ルールを使う？</h2>' + (A.order.length > 1 ? '<span class="ask-step">' + (A.k + 1) + ' / ' + A.order.length + '人目</span>' : '') + '</div>' +
    '<p class="ask-who"><span class="sh-name" style="--p:' + pc(p) + '">' + esc(pname(p)) + '</span>は<b>' + fmtAmt(amt) + '<small>杯</small></b></p>' +
    (chained ? '<p class="dc-note">' + esc(pname(G.pending.from)) + 'の倍倍FIGHT！で ×' + G.pending.mult + ' がかかります</p>' : '') +
    '<div class="specials ask-sp">' +
      '<button type="button" class="sp sp-dbl" data-a="dbl"' + (used ? ' disabled' : '') + '><span class="sp-t">倍倍FIGHT！</span><span class="sp-d">自分は ' + fmtAmt(calc({ dbl: true })) + '杯、次に飲む人も×2</span></button>' +
      '<button type="button" class="sp sp-hh" data-a="hh"' + (used ? ' disabled' : '') + '><span class="sp-t">天国と地獄</span><span class="sp-d">回避か2倍か、ルーレットで勝負</span></button></div>' +
    (used ? '<p class="note-s">このターンは特殊ルールを使用済み（券は使えます）</p>' : '') +
    (tks.length ? '<div class="pick-players ask-tk">' + tks.map(h => '<button type="button" class="tk" data-a="tk" data-uid="' + h.uid + '">' + esc(h.text) + 'を使う</button>').join('') + '</div>' : '') +
    '<button type="button" class="pbtn big main ask-none" data-a="none">使わない！ 素直に' + fmtAmt(plain) + '杯</button>';
  const b = box.querySelector('.ask-none'); if (b) b.focus({ preventScroll: true });
}
function askShuffle() {
  const A = ask;
  A.step = 'order';
  A.order = shuffle(A.sel.slice());
  renderAsk();
  const box = $('askOrder');
  const show = (arr, fin) => { box.innerHTML = arr.map((p, j) => '<span class="ask-o' + (fin ? ' fin' : '') + '" style="--p:' + pc(p) + (fin ? ';--d:' + (j * 0.12) + 's' : '') + '"><b>' + (j + 1) + '</b>' + esc(pname(p)) + '</span>').join(''); };
  let n = 0;
  const N = reduceMotion ? 1 : 14;
  const step = () => {
    if (ask !== A) return;
    if (++n < N) { show(shuffle(A.sel.slice()), false); SE.play('tick'); setTimeout(step, 60 + n * 12); return; }
    show(A.order, true);
    SE.play('ding'); vibrate(40);
    setTimeout(() => { if (ask !== A) return; A.step = 'person'; A.k = 0; renderAsk(); SE.play('pop'); }, 1500);
  };
  step();
}
/* re-record the person's drink straight away (no sheet on screen), with 倍倍FIGHT！ / a ticket / the chained ×2 */
function specialRecord(p, o) {
  const A = ask, idx = G.cur.drinks.indexOf(A.e);
  if (idx < 0) return false;
  makeSheet(p, { replace: idx });
  if (sheet.replace == null) { sheet = null; return false; }
  if (askPend(A.k) === undefined) delete sheet.pend;
  sheet.direct = true;
  Object.assign(sheet, o || {});
  recordSheet();
  return true;
}
function askNext() {
  const A = ask;
  if (!A) return;
  A.k++;
  if (A.k >= A.order.length) { endAsk(); return; }
  renderAsk();
  if ($('askOv').hidden) openOv('askOv');
  SE.play('pop');
  telop('次は <span style="color:' + pc(A.order[A.k]) + '">' + esc(pname(A.order[A.k])) + '</span>！', 'white sm', 1000);
}
function askNextLater(ms) { const A = ask; setTimeout(() => { if (ask === A) askNext(); }, ms); }
function endAsk() { ask = null; if (!$('askOv').hidden) closeOv('askOv'); }
function askAct(a, el) {
  const A = ask;
  if (!A) return;
  if (A.step === 'choose') {
    if (a === 'sel') {
      const p = Number(el.dataset.i), k = A.sel.indexOf(p);
      if (k >= 0) A.sel.splice(k, 1); else A.sel.push(p);
      renderAsk();
      const x = $('askBox').querySelector('[data-a="sel"][data-i="' + p + '"]');
      if (x && k < 0 && !reduceMotion) { x.classList.add('pop'); const q = relPos(x); FXC.burst(q.x, q.y - 6, 20, { colors: [pcHex(p), '#ffffff', '#ffd83d'], speed: 7 }); }
      SE.play(k >= 0 ? 'tap' : 'select');
    } else if (a === 'none') { SE.play('gulp'); endAsk(); }
    else if (a === 'use' && A.sel.length) {
      if (A.sel.length === 1) { A.order = A.sel.slice(); A.k = 0; A.step = 'person'; renderAsk(); SE.play('pop'); }
      else askShuffle();
    }
    return;
  }
  if (A.step !== 'person') return;
  const p = A.order[A.k];
  if (a === 'none') {
    if (askChained(A.k, p)) { closeOv('askOv'); specialRecord(p, {}); askNextLater(1300); }
    else { SE.play('gulp'); askNext(); }
  } else if (a === 'dbl') { closeOv('askOv'); specialRecord(p, { dbl: true }); askNextLater(1700); }
  else if (a === 'tk') { closeOv('askOv'); specialRecord(p, { ticket: Number(el.dataset.uid) }); askNextLater(1300); }
  else if (a === 'hh') {
    const idx = G.cur.drinks.indexOf(A.e);
    if (idx < 0) return;
    closeOv('askOv');
    makeSheet(p, { replace: idx });
    if (askPend(A.k) === undefined) delete sheet.pend;
    sheet.direct = true;
    openWheel(false);
  }
}

/* ---------- 継続中: continuing cards in a strip under the top bar. Tap one to record who broke it (「違反したのは？」),
   or to see what it does. Cards that name someone (インシュメイト・執事) ask for that person first ---------- */
const RULE_HINT_KEY = 'sakego-rule-hint';
const rulesShown = new Set();
function durRows() {
  const rows = [];
  if (G) G.players.forEach((pl, i) => pl.hand.forEach(h => { if (h.kind === 'dur') rows.push([i, h]); }));
  return rows;
}
const ruleCups = h => (Array.isArray(h.cups) && h.cups.length ? h.cups[0] : 0);
function ruleLabel(i, h) {
  if (h.pick) {
    if (h.who == null) return (h.title || '指名') + '：まだ選んでいません';
    return (h.title || '指名') + '：' + (h.mate ? pname(i) + '⇄' + pname(h.who) : pname(h.who));
  }
  return String(h.text).split('。')[0].trim() || String(h.text);
}
/* a naming card that still needs its person (thisTurn: only the one drawn this turn) */
function durWaiting(thisTurn) {
  const r = durRows().find(([, h]) => h.pick && h.who == null && (!thisTurn || h.turn === G.turn));
  return r || null;
}
const durNew = () => durRows().some(([, h]) => h.turn === G.turn);
function ruleHint() {
  if (coach.on || (Number(lsGet(RULE_HINT_KEY)) || 0) >= 3) return;
  lsSet(RULE_HINT_KEY, String((Number(lsGet(RULE_HINT_KEY)) || 0) + 1));
  setTimeout(() => { if (screen === 'game') telop('続くルールは<b>上の帯</b>に表示！<br>違反した人がいたら、帯をタップ', 'hint', 3000); }, 1500);
}
function renderRules() {
  const el = $('gRules'), rows = durRows();
  el.hidden = !rows.length;
  if (!rows.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<span class="gr-l">継続中</span>' + rows.map(([i, h]) => {
    const cls = ['gr-chip'];
    if (h.left <= 1) cls.push('last');
    if (h.pick && h.who == null) cls.push('wait');
    if (!rulesShown.has(h.uid)) { cls.push('in'); rulesShown.add(h.uid); }
    const cups = ruleCups(h);
    return '<button type="button" class="' + cls.join(' ') + '" data-rule="' + h.uid + '" style="--c:' + colorVar(h.color) + ';--p:' + pc(i) + '" aria-label="' + esc(ruleLabel(i, h)) + '（あと' + h.left + 'ターン）' + (cups ? '。タップで違反を記録' : '') + '">' +
      '<span class="gr-mk">' + esc(h.mark || '継') + '</span><span class="gr-t">' + esc(ruleLabel(i, h)) + '</span>' +
      (cups ? '<span class="gr-cup">' + cups + '杯</span>' : '') +
      '<span class="gr-left">' + (h.left <= 1 ? 'ラスト' : 'あと' + h.left) + '</span></button>';
  }).join('');
}
function ruleTap(uid) {
  if (!G || picking || G.cur.select) return;
  const row = durRows().find(([, h]) => h.uid === uid);
  if (!row) return;
  const [i, h] = row;
  if (h.pick && h.who == null) openDecide('durpick', { uid });
  else if (ruleCups(h)) openDecide('rule', { uid });
  else openRuleInfo(i, h);
}
function openRuleInfo(i, h) {
  const extra = h.mate ? 'どちらかが飲むと、もう片方にも<b>同じ量が自動で記録</b>されます。'
    : h.fx === 'half' ? '<b>' + esc(pname(i)) + '</b>の飲む量は、記録するとき自動で半分になります。'
    : h.fx === 'nodouble' ? '<b>' + esc(pname(i)) + '</b>は、倍倍FIGHT！の「次の人×2」がかかりません（自動）。'
    : h.pick && h.who != null ? '「' + esc(h.title) + '」は <b>' + esc(pname(h.who)) + '</b>。' : '';
  $('infoBox').innerHTML = '<h2 id="infoTitle">継続中のルール</h2><p class="back-card">' + esc(h.text) + '</p>' +
    (extra ? '<p class="note-s">' + extra + '</p>' : '') +
    '<p class="note-s"><span class="sh-mini" style="--p:' + pc(i) + '">' + esc(pname(i)) + '</span>が引いたカード ・ あと<b>' + h.left + '</b>ターン</p>' +
    '<div class="dialog-acts"><button type="button" class="pbtn small" data-if="close">閉じる</button></div>';
  openOv('infoOv');
  SE.play('pop');
}
function setDurPick(i, h, p) {
  const cur = G.cur, sn = snap();
  h.who = p;
  if (h.mate) h.text = h.text + '（' + pname(i) + '⇄' + pname(p) + '）';
  cur.drinks.push({ kind: 'name', snap: sn, p, label: h.title || '指名' });
  saveGame();
  renderGame();
  [i, p].forEach((q, k) => { const seat = document.querySelector('.seat[data-seat="' + q + '"]'); if (seat) { const r = relPos(seat); setTimeout(() => FXC.burst(r.x, r.y, 40, { colors: [pcHex(q), '#ffffff', '#ff4fa3'], star: true, speed: 10 }), k * 160); } });
  SE.play('bigheaven');
  if (h.mate) telop('<small>' + esc(pname(i)) + ' ⇄ ' + esc(pname(p)) + '</small>' + esc(h.title) + '結成！', 'pink sm', 1600);
  else telop('<small>' + esc(pname(p)) + '</small>「' + esc(h.title) + '」に決定！', 'pink sm', 1500);
  if (h.mate) setTimeout(() => { if (screen === 'game') telop('どちらかが飲むと<br><b>もう片方にも自動で記録</b>されます', 'hint', 2600); }, 1700);
}

/* ---------- インシュメイト: whenever one of a linked pair drinks, the other gets the same amount (once per record; chains follow) ---------- */
function mateLinks() {
  const out = [];
  durRows().forEach(([i, h]) => { if (h.mate && h.who != null && h.who !== i) out.push([i, h.who]); });
  return out;
}
function mateExtras(items, also) {
  const links = mateLinks();
  if (!links.length) return [];
  const has = new Set(items.map(it => it.p).concat(also || [])), extra = [];
  const queue = items.filter(it => it.amt > 0).map(it => ({ p: it.p, amt: it.amt, root: it.mf != null ? it.mf : it.p }));
  while (queue.length) {
    const x = queue.shift();
    links.forEach(([a, b]) => {
      const o = x.p === a ? b : x.p === b ? a : null;
      if (o == null || has.has(o)) return;
      has.add(o);
      extra.push({ p: o, amt: x.amt, mf: x.root, from: x.p });
      queue.push({ p: o, amt: x.amt, root: x.root });
    });
  }
  return extra;
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
  if (cur.phase !== 'drawn') { openHand(i); return; }
  const r = replaceList().find(x => x.p === i);
  if (r) openSheet(i, { replace: r.i }); else openSheet(i);
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
      setTimeout(() => {
        renderGame();
        if (screen === 'game' && G && G.cur === cur) autoRecord([target], cur.card && cur.card.cups.length ? cur.card.cups[0] : 1, { src: 'game' });
      }, 1100);
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
  if (sheet.direct) { recordSheet(); if (ask) askNextLater(1500); return; }
  renderSheet();
  const b = $('sheetRecord'); if (b) b.focus({ preventScroll: true });
}
function cancelWheel() {
  if (!wheel || wheel.spinning || wheel.done) return;
  leaveWheel();
  if (sheet && sheet.direct) { sheet = null; if (ask) { renderAsk(); openOv('askOv'); } }
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
    : '<button type="button" class="pbtn big main" data-c="rec">OK！ ' + c.cups + '杯を記録</button>';
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
  if (c.ok) { floatAt(c.p, 'SAFE!', true); telop('回避成功！', 'lime', 1200); return; }
  /* a failed challenge is always recorded: as it is, or through the sheet with a special rule / ticket */
  if (rec === 'special') openSheet(c.p, { base: c.cups, owed: true, src: 'chal' });
  else autoRecord([c.p], c.cups, { src: 'chal' });
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
    $('bombBottom').innerHTML = '<div class="bm-acts"><button type="button" class="pbtn big main" data-b="rec">OK！ ' + b.cups + '杯を記録</button></div>';
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
  if (rec === 'special') openSheet(b.holder, { base: b.cups, owed: true, src: 'bomb' });
  else autoRecord([b.holder], b.cups, { src: 'bomb' });
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
  const ran = T.mode === 'count' && (T.state === 'over' || T.state === 'stopped');
  stopTimerWork(T);
  timer = null;
  closeOv('timerOv');
  BGM.play('party'); BGM.level(1, 0.3);
  if (ran && needsPick()) setTimeout(() => { if (screen === 'game' && needsPick() && noOv()) openDecide(); }, 300);
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
    tmActs('<button type="button" class="pbtn big main" data-tm="multi">OK！ 2人に' + T.cups + '杯ずつ記録</button>');
    return;
  }
  const lose = d0 > d1 ? 0 : 1, win = 1 - lose;
  T.loser = T.ps[lose];
  $('swP' + lose).classList.add('lose'); $('swP' + win).classList.add('win');
  $('tmSub').innerHTML = '<b>' + esc(pname(T.loser)) + '</b> の負け！ ' + T.cups + '杯';
  SE.play('bigheaven'); vibrate([60, 40, 60]);
  const q = relPos($('swP' + win)); FXC.burst(q.x, q.y, 60, { colors: GOLD, star: true, speed: 11 });
  tmActs('<button type="button" class="pbtn big main" data-tm="rec">OK！ ' + T.cups + '杯を記録</button>');
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
  const cups = G.cur.card && G.cur.card.cups.length ? G.cur.card.cups[0] : 1;
  $('tapCenter').innerHTML = '<p class="tap-res"><b>' + esc(pname(tap.loser)) + '</b> の負け！ ' + cups + '杯</p><div class="tap-acts">' +
    '<button type="button" class="pbtn small" data-t="rec">OK！ 記録する</button>' +
    '<button type="button" class="pbtn white tiny" data-t="again">もう一回</button></div>';
  const b = $('tapCenter').querySelector('[data-t="rec"]'); if (b) b.focus({ preventScroll: true });
}
function closeTap(rec) {
  if (!tap) return;
  tap.timers.forEach(clearTimeout);
  const loser = tap.loser;
  tap = null;
  closeOv('tapOv');
  BGM.play('party');
  if (loser == null || rec === 'again') return;
  const cups = G.cur.card && G.cur.card.cups.length ? G.cur.card.cups[0] : 1;
  if (rec === 'special') openSheet(loser, { base: cups, owed: true, src: 'tap' });
  else autoRecord([loser], cups, { src: 'tap' });
}

/* ---------- 3D dice: thrown into a bowl and settled by real physics (three.js + cannon-es, loaded on demand from ./vendor).
   The result is whatever face ends up on top. If WebGL or the libraries are not available, the flat 2D dice are used ---------- */
const DICE_SRC = [['./vendor/three.module.min.js', './vendor/cannon-es.min.js'],
  ['https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js', 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js']];
let diceLibs = null;
function loadDiceLibs() {
  const get = k => Promise.all(DICE_SRC[k].map(u => import(u))).then(([THREE, CANNON]) => ({ THREE, CANNON }));
  if (!diceLibs) diceLibs = get(0).catch(() => get(1)).catch(e => { diceLibs = null; throw e; });
  return diceLibs;
}
/* bowl: flat bottom, then a quarter-circle wall up to the rim. Units: a die is 0.62.
   ts: the physics runs 1.5x faster than the clock (snappier, like real dice). Tuned with a node simulation of thousands of throws:
   spin after a bounce about 2-3x the old one, about 2s of clatter, settled in about 2.7s, ションベン 0.2% (one die) / 0.4% (three dice) */
const BW = { s: 0.62, R: 2.7, H: 1.75, rb: 1.25, base: 0.22, K: 7, N: 28, g: 26, thick: 0.16, ts: 1.5, rest: [0.72, 0.7] };
const DIE_FACES = [[1, 0, 0, 2], [-1, 0, 0, 5], [0, 1, 0, 1], [0, -1, 0, 6], [0, 0, 1, 3], [0, 0, -1, 4]];
function makeDiceBowl(host, L) {
  const { THREE, CANNON } = L, B = BW;
  const prof = [];
  for (let k = 0; k <= B.K; k++) { const t = k / B.K * Math.PI / 2; prof.push([B.rb + (B.R - B.rb) * Math.sin(t), B.base + B.H * (1 - Math.cos(t))]); }

  /* --- view --- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'd3-cv';
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  const camBase = new THREE.Vector3(0, 6.3, 6.5), look = new THREE.Vector3(0, 0.85, -0.35);
  camera.position.copy(camBase); camera.lookAt(look);
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x3a2030, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(2.6, 9, 3.2); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 22 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const disposables = [];
  const keep = x => { disposables.push(x); return x; };
  const table = new THREE.Mesh(keep(new THREE.CircleGeometry(7, 48)), keep(new THREE.ShadowMaterial({ opacity: 0.4 })));
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
  /* the bowl: glazed white inside, indigo outside, a red rim */
  const inner = [new THREE.Vector2(0.001, B.base)].concat(prof.map(([r, y]) => new THREE.Vector2(r, y)));
  const innerMesh = new THREE.Mesh(keep(new THREE.LatheGeometry(inner, 80)), keep(new THREE.MeshStandardMaterial({ color: 0xf7f2e8, roughness: 0.22, metalness: 0, side: THREE.DoubleSide })));
  innerMesh.receiveShadow = true; scene.add(innerMesh);
  const outer = [new THREE.Vector2(0.001, 0.01), new THREE.Vector2(B.rb * 0.86, 0.01), new THREE.Vector2(B.rb * 0.9, B.base * 0.6)]
    .concat(prof.slice(1).map(([r, y]) => new THREE.Vector2(r + 0.17, Math.max(B.base * 0.6, y - 0.04))));
  const outerMesh = new THREE.Mesh(keep(new THREE.LatheGeometry(outer, 80)), keep(new THREE.MeshStandardMaterial({ color: 0x23357e, roughness: 0.3, metalness: 0, side: THREE.DoubleSide })));
  outerMesh.castShadow = true; scene.add(outerMesh);
  const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(B.R + 0.085, 0.095, 12, 96)), keep(new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.3 })));
  rim.rotation.x = Math.PI / 2; rim.position.y = B.base + B.H; scene.add(rim);
  const band = new THREE.Mesh(keep(new THREE.TorusGeometry(B.R + 0.1, 0.035, 8, 96)), keep(new THREE.MeshStandardMaterial({ color: 0xf2e6c9, roughness: 0.4 })));
  band.rotation.x = Math.PI / 2; band.position.y = B.base + B.H - 0.32; band.scale.set(0.985, 0.985, 1); scene.add(band);

  /* dice: rounded cubes with pips (the 1 is big and red) */
  const geo = keep(new THREE.BoxGeometry(B.s, B.s, B.s, 6, 6, 6));
  {
    const pos = geo.attributes.position, nor = geo.attributes.normal, h = B.s / 2, rr = B.s * 0.15;
    const v = new THREE.Vector3(), inn = new THREE.Vector3(), d = new THREE.Vector3();
    const cl = x => Math.max(-h + rr, Math.min(h - rr, x));
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      inn.set(cl(v.x), cl(v.y), cl(v.z));
      d.copy(v).sub(inn);
      if (d.lengthSq() < 1e-12) continue;
      d.normalize();
      v.copy(inn).addScaledVector(d, rr);
      pos.setXYZ(i, v.x, v.y, v.z); nor.setXYZ(i, d.x, d.y, d.z);
    }
  }
  const faceMat = val => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#fbf8f1'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = val === 1 ? '#d40d22' : '#16161d';
    PIPS[val].forEach(([px, py]) => { x.beginPath(); x.arc(px * 1.28, py * 1.28, val === 1 ? 23 : 12.5, 0, Math.PI * 2); x.fill(); });
    const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return keep(new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0 }));
  };
  const mats = DIE_FACES.map(f => faceMat(f[3]));

  /* --- physics: the bowl as a ring of thin tilted boxes, the table as a plane --- */
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -B.g, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.solver.iterations = 14;
  const mBowl = new CANNON.Material('bowl'), mDie = new CANNON.Material('die');
  /* glazed bowl: springy, so the dice bounce and run round the wall (カラカラ) before they settle */
  const cmBowl = new CANNON.ContactMaterial(mBowl, mDie, { friction: 0.2, restitution: B.rest[0] });
  const cmDie = new CANNON.ContactMaterial(mDie, mDie, { friction: 0.2, restitution: B.rest[1] });
  world.addContactMaterial(cmBowl); world.addContactMaterial(cmDie);
  const ground = new CANNON.Body({ mass: 0, material: mBowl, shape: new CANNON.Plane() });
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(ground);
  const floor = new CANNON.Body({ mass: 0, material: mBowl });
  floor.addShape(new CANNON.Cylinder(B.rb + 0.25, B.rb + 0.25, 0.3, 24), new CANNON.Vec3(0, B.base - 0.15, 0));
  world.addBody(floor);
  const wall = new CANNON.Body({ mass: 0, material: mBowl });
  for (let k = 0; k < prof.length - 1; k++) {
    const [r1, y1] = prof[k], [r2, y2] = prof[k + 1];
    const len = Math.hypot(r2 - r1, y2 - y1), th = Math.atan2(y2 - y1, r2 - r1), rm = (r1 + r2) / 2, ym = (y1 + y2) / 2;
    const arc = 2 * Math.PI * rm / B.N * 1.12, nr = -Math.sin(th), ny = Math.cos(th);
    for (let j = 0; j < B.N; j++) {
      const ph = j / B.N * Math.PI * 2, cr = rm - nr * B.thick / 2, cy = ym - ny * B.thick / 2;
      const q = new CANNON.Quaternion().setFromEuler(0, -ph, 0).mult(new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 0, 1), th));
      wall.addShape(new CANNON.Box(new CANNON.Vec3(len / 2 + 0.02, B.thick / 2, arc / 2)), new CANNON.Vec3(cr * Math.cos(ph), cy, cr * Math.sin(ph)), q);
    }
  }
  world.addBody(wall);

  let dice = [], job = null, raf = 0, last = 0, dead = false, shakeT = 0, lastClink = 0;
  const up = new CANNON.Vec3(), tmp = new CANNON.Vec3();
  function readDie(b) {
    let best = -2, val = 0;
    DIE_FACES.forEach(([x, y, z, v]) => { tmp.set(x, y, z); b.quaternion.vmult(tmp, up); if (up.y > best) { best = up.y; val = v; } });
    const rr = Math.hypot(b.position.x, b.position.z);
    return { val, flat: best, out: (rr > B.R - 0.05 && b.position.y < B.base + B.H - 0.2) || rr > B.R + 0.12 };
  }
  function clear() { dice.forEach(d => { world.removeBody(d.body); scene.remove(d.mesh); }); dice = []; }
  /* a bounce off the bowl sets the die tumbling the way it is going, like a real die scraping the glaze.
     (the physics library's friction is far too weak during a hit, so the dice used to bounce without spinning up)
     It fades out after the first moments so the dice still come to rest */
  const kn = new CANNON.Vec3(), kt = new CANNON.Vec3(), kx = new CANNON.Vec3();
  function spinUp(e, vn) {
    const c = e.contact, die = e.target, other = c.bi === die ? c.bj : c.bi;
    if (other.type === CANNON.Body.DYNAMIC || vn < 1.5 || !job) return;
    const fade = Math.max(0, Math.min(1, 1.8 - job.time));
    if (!fade) return;
    c.ni.scale(c.bi === die ? -1 : 1, kn);
    die.velocity.vsub(kn.scale(die.velocity.dot(kn), kx), kt);
    const sp = kt.length();
    if (sp < 0.3) return;
    kn.cross(kt, kt); kt.scale(1 / sp, kt);
    const cur = die.angularVelocity.dot(kt), want = Math.min(40, Math.max(cur, 1.2 * fade * sp / (B.s / 2)));
    if (want > cur) die.angularVelocity.vadd(kt.scale(want - cur, kx), die.angularVelocity);
  }
  function clink(e) {
    const v = Math.abs(e.contact.getImpactVelocityAlongNormal()), now = performance.now();
    spinUp(e, v);
    if (v < 1.6 || now - lastClink < 45) return;
    lastClink = now;
    SE.play(v > 5 ? 'clink' : 'clinks');
  }
  /* a good throw: near the rim, a die heading out loses most of its outward speed (like the bowl's lip catching it),
     so ションベン stays rare. One die is caught fully, three dice can still now and then fly out */
  function lip(b) {
    const rr = Math.hypot(b.position.x, b.position.z);
    if (b.position.y < B.base + B.H - 0.35 || rr < B.R - 0.75) return;
    const ux = b.position.x / rr, uz = b.position.z / rr, vo = b.velocity.x * ux + b.velocity.z * uz;
    if (vo > 0) { const k = vo * (dice.length === 1 ? 1 : 0.7); b.velocity.x -= ux * k; b.velocity.z -= uz * k; }
  }
  function resize() {
    const w = host.clientWidth || 300, h = host.clientHeight || 220;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* keep the whole bowl in view on narrow / short boxes */
    camera.fov = w / h < 1.3 ? 34 * 1.3 / Math.max(0.8, w / h) : 34;
    camera.updateProjectionMatrix();
  }
  const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(host);
  resize();
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, ((now - (last || now)) / 1000) || 0);
    last = now;
    if (dice.length) { world.step(1 / 60, dt * B.ts, 6); if (job) dice.forEach(d => lip(d.body)); }
    dice.forEach(d => { d.mesh.position.copy(d.body.interpolatedPosition); d.mesh.quaternion.copy(d.body.interpolatedQuaternion); });
    if (shakeT > 0) { shakeT -= dt; const a = Math.max(0, shakeT) * 0.25; camera.position.set(camBase.x + (Math.random() - 0.5) * a, camBase.y + (Math.random() - 0.5) * a, camBase.z); camera.lookAt(look); }
    if (job) watch(dt);
    renderer.render(scene, camera);
  }
  /* settled = every die has been (nearly) still for a moment. After the lively part the bounces go dead, as real dice do,
     so dice resting against each other don't jitter forever. A die leaning on the wall or on another die gets a little tap (like knocking the bowl) */
  function watch(dt) {
    const J = job;
    J.time += dt;
    if (J.time > 2.2 && !J.late) {
      J.late = true;
      cmBowl.restitution = cmDie.restitution = 0.15;
      dice.forEach(d => { d.body.linearDamping = d.body.angularDamping = 0.4; });
    }
    dice.forEach(d => { d.rest = d.body.velocity.length() < 0.3 && d.body.angularVelocity.length() < 0.8 ? d.rest + dt : 0; });
    if (J.time < 0.6 || (Math.min.apply(null, dice.map(d => d.rest)) < 0.35 && J.time < 7)) return;
    const reads = dice.map(d => readDie(d.body));
    const bad = dice.filter((d, i) => !reads[i].out && reads[i].flat < 0.78);
    if (bad.length && J.nudges < 4 && J.time < 7) {
      J.nudges++;
      bad.forEach(d => {
        d.rest = 0;
        d.body.wakeUp();
        d.body.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * 1.6, 2.4, (Math.random() - 0.5) * 1.6), new CANNON.Vec3((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2));
        d.body.angularVelocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
      });
      shakeT = 0.25; SE.play('clink');
      return;
    }
    job = null;
    dice.forEach(d => { const b = d.body; b.sleep(); b.previousPosition.copy(b.position); b.previousQuaternion.copy(b.quaternion); });
    J.resolve({ values: reads.map(r => r.val), out: reads.map(r => r.out) });
  }
  function throwDice(n) {
    clear();
    cmBowl.restitution = B.rest[0]; cmDie.restitution = B.rest[1];
    const swirl = (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 2.2) * 1.4, spin = Math.random() < 0.5 ? -18 : 18;
    for (let i = 0; i < n; i++) {
      const body = new CANNON.Body({ mass: 1, material: mDie, shape: new CANNON.Box(new CANNON.Vec3(B.s / 2, B.s / 2, B.s / 2)), linearDamping: 0.01, angularDamping: 0.03 });
      const x = (i - (n - 1) / 2) * (B.s * 1.8) + (Math.random() - 0.5) * 0.3; /* far enough apart not to knock each other in the air */
      body.position.set(x, B.base + B.H + 0.9 + Math.random() * 0.5, B.R * 0.55 + Math.random() * 0.3);
      body.quaternion.setFromEuler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
      body.velocity.set(swirl - x * 1.2 + (Math.random() - 0.5) * 1.5, -1.5 - Math.random() * 2, -(3.6 + Math.random() * 2.4) * 1.4);
      body.angularVelocity.set((Math.random() - 0.5) * 44, (Math.random() - 0.5) * 44 + spin, (Math.random() - 0.5) * 44);
      body.previousPosition.copy(body.position); body.interpolatedPosition.copy(body.position);
      body.previousQuaternion.copy(body.quaternion); body.interpolatedQuaternion.copy(body.quaternion);
      body.addEventListener('collide', clink);
      world.addBody(body);
      const mesh = new THREE.Mesh(geo, mats);
      mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);
      dice.push({ body, mesh, rest: 0 });
    }
    return new Promise(resolve => { job = { resolve, time: 0, nudges: 0, late: false }; });
  }
  function dispose() {
    dead = true; job = null;
    cancelAnimationFrame(raf);
    if (ro) ro.disconnect();
    clear();
    disposables.forEach(x => { try { x.dispose(); } catch (_) { /* ignore */ } });
    try { renderer.dispose(); renderer.forceContextLoss(); } catch (_) { /* ignore */ }
    renderer.domElement.remove();
  }
  raf = requestAnimationFrame(frame);
  return { throwDice, clear, dispose };
}
/* the tool games' bowl: 3D when it can load (within a few seconds), the flat dice otherwise */
function toolBowl(T) {
  const host = $('tlBowl');
  host.innerHTML = '<p class="d3-load">サイコロを準備中…</p>';
  T.bowlReady = new Promise(res => {
    let settled = false;
    const flat = () => { if (settled) return; settled = true; T.flat = true; res(); };
    setTimeout(flat, 6000);
    loadDiceLibs().then(L => {
      if (settled || tool !== T) return;
      try { host.innerHTML = ''; T.bowl = makeDiceBowl(host, L); settled = true; res(); } catch (_) { host.innerHTML = ''; flat(); }
    }).catch(flat);
  });
  return T.bowlReady;
}

/* ---------- 道具ゲーム: チンチロ・サイコロ・トランプ・インディアンポーカー・ダーツ in the app. The loser is recorded automatically.
   (Playing with real tools still works: close the card and choose in 「誰が飲む？」) ---------- */
const TOOL_INFO = {
  chinchiro: { title: 'チンチロ', act: 'アプリでチンチロ！', cls: 'chin', stake: 'いちばん弱い役の人が' },
  dice: { title: 'サイコロ勝負', act: 'アプリでサイコロ！', cls: 'dice', stake: '小さい目の方が' },
  cards: { title: 'トランプ勝負', act: 'アプリでトランプ！', cls: 'casino', stake: '低い方（A=1）が' },
  indian: { title: 'インディアンポーカー', act: 'アプリでインディアンポーカー！', cls: 'casino', stake: '低い方が（JOKERは2人とも）' },
  darts: { title: 'ダーツ勝負', act: 'アプリでダーツ！', cls: 'darts', stake: '得点の低い方が' },
};
const TOOL_CLOSE = '<button type="button" class="pbtn white small" data-tl="close">やめる</button>';
let tool = null;
function toolLater(fn, ms) { const T = tool; const id = setTimeout(() => { if (tool === T) fn(); }, ms); T.timers.push(id); return id; }
function toolActs(h, focus) {
  const a = $('toolActs');
  a.innerHTML = h;
  const f = focus === false ? null : a.querySelector('.main') || a.querySelector('button');
  if (f) f.focus({ preventScroll: true });
}
function openTool() {
  const cur = G.cur, c = cur.card, kind = toolOf(c);
  if (tool || !kind || cur.phase !== 'drawn') return;
  const n = G.players.length;
  let ps;
  if (kind === 'chinchiro') ps = Array.from({ length: n }, (_, k) => (cur.drawer + k) % n);
  else {
    ps = cardPeople(c).slice(0, 2);
    const a = ps.length ? ps[0] : cur.drawer;
    if (ps.length < 2) { const r = cur.names['ランダム']; ps = [a, r != null && r !== a ? r : (a + 1) % n]; }
  }
  const base = c.cups.length ? c.cups[0] : 1;
  tool = { kind, ps, base, cups: base, k: 0, res: [], state: 'play', timers: [], raf: 0, guard: 0, losers: null, busy: false, bowl: null, flat: false };
  $('toolOv').className = 'ov timer-ov tool-ov ' + TOOL_INFO[kind].cls;
  $('toolHead').innerHTML = '<h2 class="tm-title ol" id="toolTitle">' + TOOL_INFO[kind].title + '</h2><p class="tm-card">' + fillGame(c.text) + '</p>';
  openOv('toolOv');
  BGM.play('tension'); BGM.level(0.7, 0.3);
  SE.play('pop');
  if (kind === 'chinchiro') chinSetup(); else if (kind === 'darts') dartsSetup(); else if (kind === 'dice') diceSetup(); else duelSetup();
}
function closeTool(mode) {
  const T = tool;
  if (!T) return;
  T.timers.forEach(clearTimeout);
  if (T.raf) cancelAnimationFrame(T.raf);
  tool = null;
  if (T.bowl) { T.bowl.dispose(); T.bowl = null; }
  closeOv('toolOv');
  BGM.play('party'); BGM.level(1, 0.3);
  if (T.state !== 'done' || !T.losers || !T.losers.length) return;
  renderGame();
  if (mode === 'special' && T.losers.length === 1) openSheet(T.losers[0], { base: T.cups, owed: true, src: 'tool' });
  else autoRecord(T.losers, T.cups, { src: 'tool', decided: true });
}
function toolAct(a) {
  const T = tool;
  if (a === 'close') { closeTool(false); return; }
  if (a === 'rec' || a === 'special') { closeTool(a); return; }
  if (T.kind === 'chinchiro') { if (a === 'go') chinRoll(); else if (a === 'next') { T.k++; chinTurn(); } }
  else if (T.kind === 'darts') { if (a === 'go') dartsThrow(); }
  else if (T.kind === 'dice') { if (a === 'go') diceThrow(); }
  else if (a === 'go') duelDraw();
  else if (a === 'open') indianOpen();
}
/* the result: losers drink the card's cups (OK), or one loser goes through the sheet for a special rule / ticket */
function toolFinish(losers, msg, panel) {
  const T = tool;
  T.state = 'done'; T.losers = losers; T.guard = performance.now() + 500;
  T.ps.forEach((p, j) => {
    const el = panel(j);
    if (!el) return;
    const lose = losers.includes(p);
    el.classList.remove('now', 'wait');
    el.classList.add(lose ? 'lose' : 'win');
    const f = el.querySelector('.flip'); if (f) f.classList.add(lose ? 'lose' : 'win');
    if (!lose && !reduceMotion) { const q = relPos(el); FXC.burst(q.x, q.y, 40, { colors: GOLD, star: true, speed: 10 }); }
  });
  $('toolSub').innerHTML = msg;
  if (losers.length === T.ps.length) { SE.play('hell'); flash('#e8233f'); shake(false); }
  else { SE.play('bigheaven'); setTimeout(() => SE.play('hell'), 350); }
  vibrate([60, 40, 120]);
  BGM.level(0.15, 0.05);
  toolActs(losers.length === 1
    ? '<button type="button" class="pbtn big main" data-tl="rec">OK！ ' + T.cups + '杯を記録</button>'
    : '<button type="button" class="pbtn big main" data-tl="rec">OK！ ' + losers.length + '人に' + T.cups + '杯ずつ記録</button>');
}
const stakeLine = T => '<p class="tl-stake">' + TOOL_INFO[T.kind].stake + ' <b>' + T.cups + '杯</b></p>';

/* dice faces */
const PIPS = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]] };
function dieSVG(v) {
  return '<svg class="die" viewBox="0 0 100 100" aria-label="' + (v ? v : '?') + '"><rect x="5" y="5" width="90" height="90" rx="18" class="die-b"/>' +
    (v ? PIPS[v].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="' + (v === 1 ? 14 : 9) + '" class="die-p' + (v === 1 ? ' red' : '') + '"/>').join('') : '<text x="50" y="66" class="die-q">?</text>') + '</svg>';
}
function rollDie(slot, v, frames, done) {
  slot.classList.add('rolling');
  let k = 0;
  const N = reduceMotion ? 1 : frames;
  const step = () => {
    if (++k < N) { slot.innerHTML = dieSVG(1 + Math.floor(Math.random() * 6)); toolLater(step, 45 + k * 9); return; }
    slot.innerHTML = dieSVG(v);
    slot.classList.remove('rolling'); slot.classList.add('land');
    toolLater(() => slot.classList.remove('land'), 460);
    done();
  };
  step();
}
const jokerFace = () => '<div class="pc-face joker"><span class="pc-mid"><svg class="jk-s" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 5l13 30 32 3-24 21 7 32-28-17-28 17 7-32L5 38l32-3z"/></svg><b class="jk">JOKER</b></span></div>';

/* トランプ・インディアンポーカー: two people, one card each, the lower one drinks (a tie = both) */
function duelSetup() {
  const T = tool;
  T.deck = shuffle([].concat(...['s', 'h', 'd', 'c'].map(s => RANKS.map((_, i) => ({ r: i + 1, s })))).concat(T.kind === 'indian' ? [{ joker: true }] : []));
  $('toolStage').innerHTML = stakeLine(T) + '<div class="sw-row tl-row">' + T.ps.map((p, i) => (i ? '<span class="sw-vs ol">VS</span>' : '') +
    '<div class="sw-p tl-p" id="tlP' + i + '" style="--p:' + pc(p) + '"><span class="sw-name">' + esc(pname(p)) + '</span>' +
    '<div class="tl-slot ' + (T.kind === 'dice' ? 'die-slot' : 'card-slot') + '" id="tlS' + i + '">' + (T.kind === 'dice' ? dieSVG(0) : flipCard('tlC' + i, null, false)) + '</div>' +
    '<b class="tl-val" id="tlV' + i + '">&nbsp;</b></div>').join('') + '</div><p class="tm-sub" id="toolSub"></p>';
  duelTurn();
}
function duelTurn() {
  const T = tool, i = T.k;
  if (T.kind === 'indian') {
    $('toolSub').innerHTML = '2人にカードを1枚ずつ配ります';
    toolActs(TOOL_CLOSE + '<button type="button" class="pbtn big main pulse" data-tl="go">カードを配る！</button>');
    return;
  }
  T.ps.forEach((_, j) => { const el = $('tlP' + j); el.classList.toggle('now', j === i); el.classList.toggle('wait', j > i); });
  $('toolSub').innerHTML = (i ? 'スマホを渡して…<br>' : '') + '<b>' + esc(pname(T.ps[i])) + '</b> の番！';
  toolActs(TOOL_CLOSE + '<button type="button" class="pbtn big main pulse" data-tl="go">' + (T.kind === 'dice' ? 'サイコロを振る！' : 'カードを引く！') + '</button>');
}
function duelDraw() {
  const T = tool;
  if (T.busy) return;
  T.busy = true;
  toolActs('', false);
  if (T.kind === 'indian') {
    T.ps.forEach((_, j) => { T.res[j] = T.deck.pop(); toolLater(() => { const box = $('tlS' + j); box.innerHTML = flipCard('tlC' + j, null, false); box.firstElementChild.classList.add('deal'); SE.play('deal'); }, j * 380); });
    toolLater(() => {
      T.busy = false;
      $('toolSub').innerHTML = 'カードは伏せたまま…<br>おでこに当てるつもりで、<b>せーので開こう！</b>';
      toolActs('<button type="button" class="pbtn big main pulse" data-tl="open">せーので オープン！</button>');
    }, 1000);
    return;
  }
  const i = T.k;
  const after = () => { T.busy = false; if (i + 1 < T.ps.length) { T.k++; toolLater(duelTurn, 700); } else toolLater(duelResult, 750); };
  if (T.kind === 'dice') {
    const v = 1 + Math.floor(Math.random() * 6);
    SE.play('roll');
    rollDie($('tlS' + i), v, 13, () => { T.res[i] = v; const el = $('tlV' + i); el.textContent = v; tmPop(el); SE.play('ding'); after(); });
    return;
  }
  const c = T.deck.pop(), box = $('tlC' + i);
  T.res[i] = c;
  box.classList.add('suspense'); SE.play('roll');
  toolLater(() => {
    box.classList.remove('suspense');
    box.querySelector('.flip-f').innerHTML = pcardFace(c);
    box.classList.add('open'); SE.play('flip');
    const el = $('tlV' + i); el.textContent = rankName(c); tmPop(el);
    after();
  }, 850);
}
function indianOpen() {
  const T = tool;
  if (T.busy || T.opened) return;
  T.opened = true; T.busy = true;
  toolActs('', false);
  $('toolSub').innerHTML = '<b>せーの…！</b>';
  SE.play('roll');
  T.ps.forEach((_, j) => $('tlC' + j).classList.add('suspense'));
  toolLater(() => {
    T.ps.forEach((_, j) => {
      const box = $('tlC' + j), c = T.res[j];
      box.classList.remove('suspense');
      box.querySelector('.flip-f').innerHTML = c.joker ? jokerFace() : pcardFace(c);
      box.classList.add('open');
      $('tlV' + j).textContent = c.joker ? 'JOKER' : rankName(c);
    });
    SE.play('flip');
    if (T.res.some(c => c.joker)) { flash('#b17cff'); telop('JOKER!!', 'devil', 1500); SE.play('devil'); }
    toolLater(duelResult, T.res.some(c => c.joker) ? 1500 : 900);
  }, 1200);
}
function duelResult() {
  const T = tool;
  let losers, msg;
  if (T.kind === 'indian' && T.res.some(c => c.joker)) { losers = T.ps.slice(); msg = 'JOKERが出た！ 2人とも <b>' + T.cups + '杯</b>'; }
  else {
    const vals = T.res.map(x => (typeof x === 'number' ? x : x.r)), mn = Math.min.apply(null, vals);
    losers = T.ps.filter((_, j) => vals[j] === mn);
    msg = losers.length > 1 ? '同じ数！ 2人とも <b>' + T.cups + '杯</b>' : '<b>' + esc(pname(losers[0])) + '</b> の負け！ ' + T.cups + '杯';
  }
  toolFinish(losers, msg, j => $('tlP' + j));
}

/* ダーツ: a soft-tip board like DARTSLIVE (black/white singles, red/blue doubles and triples, red outer bull, black inner bull,
   numbers round the edge). An aim drifts over it; 「投げる！」 lands the dart near the aim.
   Score: single = the number, double ×2, triple ×3, bull 50 (inner and outer alike), off the board = 0 */
const DART_NUMS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const DB = { ib: 4.6, ob: 11, ti: 55, to: 62, di: 92, do: 100, num: 115, vb: 120 };
function dartScore(x, y) {
  const r = Math.hypot(x, y);
  if (r > DB.do) return { score: 0, label: 'MISS', kind: 'miss' };
  if (r <= DB.ob) return { score: 50, label: 'BULL', kind: 'bull', inner: r <= DB.ib };
  let a = Math.atan2(x, -y) * 180 / Math.PI;
  if (a < 0) a += 360;
  const n = DART_NUMS[Math.floor(((a + 9) % 360) / 18)];
  if (r >= DB.di) return { score: n * 2, label: 'D' + n, kind: 'double', n };
  if (r >= DB.ti && r <= DB.to) return { score: n * 3, label: 'T' + n, kind: 'triple', n };
  return { score: n, label: 'S' + n, kind: 'single', n };
}
function dartBoardSVG() {
  const pt = (r, deg) => { const t = deg * Math.PI / 180; return (r * Math.sin(t)).toFixed(2) + ' ' + (-r * Math.cos(t)).toFixed(2); };
  const sector = (r1, r2, a0, a1, fill) => '<path d="M' + pt(r1, a0) + ' L' + pt(r2, a0) + ' A' + r2 + ' ' + r2 + ' 0 0 1 ' + pt(r2, a1) + ' L' + pt(r1, a1) + ' A' + r1 + ' ' + r1 + ' 0 0 0 ' + pt(r1, a0) + 'Z" fill="' + fill + '"/>';
  let h = '<svg class="dt-svg" viewBox="' + -DB.vb + ' ' + -DB.vb + ' ' + DB.vb * 2 + ' ' + DB.vb * 2 + '" aria-hidden="true">' +
    '<defs><pattern id="dtHoles" width="3.6" height="6.235" patternUnits="userSpaceOnUse"><circle cx="1.8" cy="1.56" r="0.95" fill="rgba(0,0,0,.42)"/><circle cx="0" cy="4.68" r="0.95" fill="rgba(0,0,0,.42)"/><circle cx="3.6" cy="4.68" r="0.95" fill="rgba(0,0,0,.42)"/></pattern>' +
    '<radialGradient id="dtShine" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
    '<circle r="' + (DB.num + 4) + '" fill="#2b2d33"/><circle r="' + DB.num + '" fill="#111114"/>';
  DART_NUMS.forEach((n, i) => {
    const a0 = i * 18 - 9, a1 = i * 18 + 9, dark = i % 2 === 0;
    const single = dark ? '#18181c' : '#ece5d3', ring = dark ? '#d61f2c' : '#1f62c4';
    h += sector(DB.ob, DB.ti, a0, a1, single) + sector(DB.ti, DB.to, a0, a1, ring) + sector(DB.to, DB.di, a0, a1, single) + sector(DB.di, DB.do, a0, a1, ring);
  });
  h += '<circle r="' + DB.ob + '" fill="#d61f2c"/><circle r="' + DB.ib + '" fill="#141416"/>';
  h += '<circle r="' + DB.do + '" fill="url(#dtHoles)"/>';
  /* the plastic spider between the segments */
  DART_NUMS.forEach((_, i) => { h += '<path d="M' + pt(DB.ob, i * 18 - 9) + ' L' + pt(DB.do, i * 18 - 9) + '" stroke="#c3c8d0" stroke-width=".55"/>'; });
  [DB.ib, DB.ob, DB.ti, DB.to, DB.di, DB.do].forEach(r => { h += '<circle r="' + r + '" fill="none" stroke="#c3c8d0" stroke-width=".55"/>'; });
  DART_NUMS.forEach((n, i) => { const t = i * 18 * Math.PI / 180, r = (DB.do + DB.num) / 2 + 0.5; h += '<text x="' + (r * Math.sin(t)).toFixed(2) + '" y="' + (-r * Math.cos(t) + 3.6).toFixed(2) + '" class="dt-n">' + n + '</text>'; });
  h += '<circle r="' + DB.do + '" fill="url(#dtShine)"/>';
  return h + '</svg>';
}
const DART_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M1 39 L9 31" stroke="#d9dde3" stroke-width="1.6" stroke-linecap="round"/><path d="M9 31 L20 20" stroke="#5b616c" stroke-width="3.6" stroke-linecap="round"/>' +
  '<path d="M9 31 L20 20" stroke="#c9ced6" stroke-width="1.2" stroke-dasharray="1.4 1.2"/><path d="M20 20 L25 15" stroke="#1d1d22" stroke-width="2"/>' +
  '<path d="M25 15 L38 3 L33 15 Z" fill="var(--p)" stroke="#150733" stroke-width="1"/><path d="M25 15 L37 2 L25 7 Z" fill="var(--p)" stroke="#150733" stroke-width="1" opacity=".8"/></svg>';
const dartPct = v => (50 + v / (DB.vb * 2) * 100).toFixed(2) + '%';
function dartsSetup() {
  const T = tool;
  $('toolStage').innerHTML = '<p class="tl-stake dt-stake">得点の低い方が <b>' + T.cups + '杯</b><small>トリプル3倍・ダブル2倍・ブル50点（インもアウトも）</small></p>' +
    '<div class="sw-row tl-row dt-row">' + T.ps.map((p, i) => (i ? '<span class="sw-vs ol">VS</span>' : '') +
    '<div class="sw-p tl-p" id="tlP' + i + '" style="--p:' + pc(p) + '"><span class="sw-name">' + esc(pname(p)) + '</span><b class="tl-val" id="tlV' + i + '">--</b></div>').join('') + '</div>' +
    '<div class="dt-wrap"><div class="dt-board" id="dtBoard"><i class="dt-led" aria-hidden="true"></i>' + dartBoardSVG() + '<div class="dt-hits" id="dtHits"></div><i class="dt-aim" id="dtAim"></i></div></div><p class="tm-sub dt-sub" id="toolSub"></p>';
  dartsTurn();
}
function dartsTurn() {
  const T = tool, i = T.k;
  T.ps.forEach((_, j) => { const el = $('tlP' + j); el.classList.toggle('now', j === i); el.classList.toggle('wait', j > i); });
  $('toolSub').innerHTML = (i ? 'スマホを渡して… ' : '') + '<b>' + esc(pname(T.ps[i])) + '</b> の番！<small>狙いが来たらボードか「投げる！」をタップ</small>';
  toolActs(TOOL_CLOSE + '<button type="button" class="pbtn big main" data-tl="go">投げる！</button>');
  const aim = $('dtAim');
  aim.hidden = false;
  T.aimOn = true;
  const t0 = performance.now(), ph = Math.random() * 6.28, sp = 0.85 + Math.random() * 0.25;
  const step = now => {
    if (tool !== T || !T.aimOn) return;
    const t = (now - t0) / 1000 * sp;
    /* drifts over the whole board, now and then just past the edge */
    T.ax = 82 * Math.sin(t * 2.2 + ph) + 18 * Math.sin(t * 5.7 + 1);
    T.ay = 82 * Math.sin(t * 2.9 + ph * 1.7) + 18 * Math.cos(t * 6.3);
    aim.style.left = dartPct(T.ax); aim.style.top = dartPct(T.ay);
    T.raf = requestAnimationFrame(step);
  };
  T.raf = requestAnimationFrame(step);
}
function dartsThrow() {
  const T = tool, i = T.k;
  if (!T.aimOn) return;
  T.aimOn = false;
  if (T.raf) cancelAnimationFrame(T.raf);
  T.raf = 0;
  toolActs('', false);
  /* the dart flies to where the aim was the moment the finger touched (not where it drifted to by the time the tap ended) */
  const at = T.snap && performance.now() - T.snap.t < 600 ? T.snap : { x: T.ax, y: T.ay };
  T.snap = null;
  const ex = at.x + (Math.random() - 0.5) * 12, ey = at.y + (Math.random() - 0.5) * 12;
  const hit = dartScore(ex, ey);
  T.res[i] = hit.score;
  SE.play('swoosh');
  $('dtAim').hidden = true;
  const x = dartPct(ex), y = dartPct(ey);
  $('dtHits').insertAdjacentHTML('beforeend', '<i class="dt-dart" style="left:' + x + ';top:' + y + ';--p:' + pc(T.ps[i]) + '">' + DART_SVG + '</i>');
  toolLater(() => {
    const big = hit.kind === 'bull' ? 'BULL!!' : hit.kind === 'miss' ? 'MISS' : hit.label + ' ' + hit.score;
    $('dtHits').insertAdjacentHTML('beforeend', '<span class="dt-pop ' + hit.kind + '" style="left:' + x + ';top:' + y + '">' + big + '</span>');
    const el = $('tlV' + i);
    el.innerHTML = hit.kind === 'miss' ? 'MISS' : hit.score + (hit.kind === 'single' ? '' : '<small>' + (hit.kind === 'bull' ? (hit.inner ? 'インブル' : 'アウターブル') : hit.label) + '</small>');
    tmPop(el);
    const board = $('dtBoard'), q = relPos(board);
    if (hit.kind === 'bull') {
      SE.play('bigheaven'); flash('#ffd83d');
      board.classList.remove('lit'); void board.offsetWidth; board.classList.add('lit');
      FXC.burst(q.x, q.y, 90, { colors: GOLD, star: true, speed: 13 });
      telop('BULL!!', 'angel', 1400);
    } else if (hit.kind === 'triple') {
      SE.play('ding'); SE.play('coin', 0.1);
      FXC.burst(q.x, q.y, 40, { colors: ['#35e0ff', '#ffffff', '#ff4fa3'], star: true, speed: 9 });
      telop('TRIPLE!<small>' + hit.label + ' ' + hit.score + '点</small>', 'cyan sm', 1200);
    } else if (hit.kind === 'double') {
      SE.play('ding');
      telop('DOUBLE!<small>' + hit.label + ' ' + hit.score + '点</small>', 'lime sm', 1200);
    } else if (hit.kind === 'miss') SE.play('buzz');
    else { SE.play('pop'); SE.play('tick', 0.05); }
    vibrate(hit.kind === 'bull' ? [60, 40, 90] : 40);
    if (i + 1 < T.ps.length) { T.k++; toolLater(dartsTurn, 1400); }
    else toolLater(() => {
      const mn = Math.min.apply(null, T.res), losers = T.ps.filter((_, j) => T.res[j] === mn);
      toolFinish(losers, losers.length > 1 ? '同点！ 2人とも <b>' + T.cups + '杯</b>' : '<b>' + esc(pname(losers[0])) + '</b> の負け！ ' + T.cups + '杯', j => $('tlP' + j));
    }, 1400);
  }, 230);
}

/* サイコロ勝負: each of the two throws one die into the bowl; the smaller number drinks (same number = both) */
function diceSetup() {
  const T = tool;
  $('toolStage').innerHTML = stakeLine(T) + '<div class="sw-row tl-row dc3-row">' + T.ps.map((p, i) => (i ? '<span class="sw-vs ol">VS</span>' : '') +
    '<div class="sw-p tl-p" id="tlP' + i + '" style="--p:' + pc(p) + '"><span class="sw-name">' + esc(pname(p)) + '</span><b class="tl-val big" id="tlV' + i + '">?</b></div>').join('') + '</div>' +
    '<div class="dice3d" id="tlBowl"></div><p class="tm-sub" id="toolSub"></p>';
  toolBowl(T).then(() => { if (tool === T && T.flat) $('tlBowl').innerHTML = '<div class="tl-slot die-slot flat-die" id="tlDie">' + dieSVG(0) + '</div>'; });
  diceTurn();
}
function diceTurn() {
  const T = tool, i = T.k;
  T.ps.forEach((_, j) => { const el = $('tlP' + j); el.classList.toggle('now', j === i); el.classList.toggle('wait', j > i); });
  $('toolSub').innerHTML = (i ? 'スマホを渡して…<br>' : '') + '<b>' + esc(pname(T.ps[i])) + '</b> の番！ お椀にサイコロを振ろう';
  toolActs(TOOL_CLOSE + '<button type="button" class="pbtn big main pulse" data-tl="go">サイコロを振る！</button>');
}
function diceThrow() {
  const T = tool, i = T.k;
  if (T.busy) return;
  T.busy = true;
  toolActs('', false);
  const done = v => {
    T.res[i] = v;
    const el = $('tlV' + i); el.textContent = v; tmPop(el);
    SE.play('ding');
    $('toolSub').innerHTML = '<b>' + esc(pname(T.ps[i])) + '</b>：<b class="big-v">' + v + '</b>！';
    T.busy = false;
    if (i + 1 < T.ps.length) { T.k++; toolLater(diceTurn, 1300); } else toolLater(diceResult, 1100);
  };
  $('toolSub').innerHTML = T.bowl || T.flat ? 'カラカラ…' : 'サイコロを準備中…';
  T.bowlReady.then(() => {
    if (tool !== T) return;
    if (T.bowl) {
      SE.play('swoosh');
      T.bowl.throwDice(1).then(res => {
        if (tool !== T) return;
        if (res.out[0]) { T.busy = false; $('toolSub').innerHTML = '<b>お椀の外に出た！</b> もう一回振ってね'; SE.play('buzz'); toolActs(TOOL_CLOSE + '<button type="button" class="pbtn big main pulse" data-tl="go">もう一回振る！</button>'); return; }
        done(res.values[0]);
      });
    } else {
      const v = 1 + Math.floor(Math.random() * 6);
      SE.play('roll');
      rollDie($('tlDie'), v, 13, () => done(v));
    }
  });
}
function diceResult() {
  const T = tool, mn = Math.min.apply(null, T.res);
  const losers = T.ps.filter((_, j) => T.res[j] === mn);
  toolFinish(losers, losers.length > 1 ? '同じ目！ 2人とも <b>' + T.cups + '杯</b>' : '<b>' + esc(pname(losers[0])) + '</b> の負け！ ' + T.cups + '杯', j => $('tlP' + j));
}

/* チンチロ: everyone throws three dice into the bowl (up to 3 tries for a hand). Strong → weak:
   ピンゾロ > ゾロ目 > シゴロ > 目（6〜1） > 目なし・ションベン（お椀の外） > ヒフミ.
   The weakest drinks (a tie = all of them). A シゴロ or a ヒフミ anywhere in the round doubles it (both = ×4) */
function chinHand(d) {
  const s = d.slice().sort((a, b) => a - b);
  if (s[0] === 1 && s[2] === 1) return { rank: 100, name: 'ピンゾロ' };
  if (s[0] === s[2]) return { rank: 90 + s[0], name: s[0] + 'のゾロ目' };
  if (s[0] === 4 && s[1] === 5 && s[2] === 6) return { rank: 80, name: 'シゴロ' };
  if (s[0] === 1 && s[1] === 2 && s[2] === 3) return { rank: -10, name: 'ヒフミ' };
  if (s[0] === s[1]) return { rank: s[2], name: s[2] + 'の目' };
  if (s[1] === s[2]) return { rank: s[0], name: s[0] + 'の目' };
  return null;
}
function chinSetup() {
  const T = tool;
  T.hands = [];
  $('toolStage').innerHTML = '<p class="tl-stake">いちばん弱い役の人が <b>' + T.base + '杯</b><small>シゴロかヒフミが出たら×2（両方なら×4）</small></p>' +
    '<div class="cc-list' + (T.ps.length > 4 ? ' two' : '') + '">' + T.ps.map((p, j) =>
    '<div class="cc-row" id="ccR' + j + '" style="--p:' + pc(p) + '"><span class="cc-nm">' + esc(pname(p)) + '</span><b class="cc-hand" id="ccH' + j + '">—</b></div>').join('') + '</div>' +
    '<div class="dice3d" id="tlBowl"></div><p class="tm-sub" id="toolSub"></p>';
  toolBowl(T).then(() => {
    if (tool !== T || !T.flat) return;
    $('tlBowl').innerHTML = '<div class="cc-bowl" id="ccBowl">' + [0, 1, 2].map(j => '<span class="cc-die" id="ccD' + j + '">' + dieSVG(0) + '</span>').join('') + '</div>';
  });
  chinTurn();
}
function chinTurn() {
  const T = tool, i = T.k;
  T.tries = 0;
  T.ps.forEach((_, j) => $('ccR' + j).classList.toggle('now', j === i));
  $('toolSub').innerHTML = (i ? 'スマホを渡して…<br>' : '') + '<b>' + esc(pname(T.ps[i])) + '</b> の番！';
  toolActs(TOOL_CLOSE + '<button type="button" class="pbtn big main pulse" data-tl="go">サイコロを振る！</button>');
}
function chinRoll() {
  const T = tool;
  if (T.busy) return;
  T.busy = true;
  T.tries++;
  toolActs('', false);
  $('toolSub').innerHTML = T.bowl || T.flat ? 'チンチロリン…' : 'サイコロを準備中…';
  T.bowlReady.then(() => {
    if (tool !== T) return;
    if (T.bowl) {
      SE.play('swoosh');
      T.bowl.throwDice(3).then(res => { if (tool === T) chinJudge(res.values, res.out); });
      return;
    }
    const d = [0, 1, 2].map(() => 1 + Math.floor(Math.random() * 6));
    SE.play('roll');
    const bowl = $('ccBowl');
    if (bowl && !reduceMotion) bowl.classList.add('shake');
    let left = 3;
    d.forEach((v, j) => rollDie($('ccD' + j), v, 10 + j * 4, () => { SE.play('tick'); if (--left === 0) { if (bowl) bowl.classList.remove('shake'); toolLater(() => chinJudge(d, null), 250); } }));
  });
}
function chinJudge(d, out) {
  const T = tool, i = T.k, p = T.ps[i];
  T.busy = false;
  const sho = !!(out && out.some(Boolean));
  const h = sho ? { rank: 0, name: 'ションベン' } : chinHand(d);
  const shown = sho ? '' : '（' + d.join('・') + '）';
  if (!h && T.tries < 3) {
    $('toolSub').innerHTML = d.join('・') + ' は<b>目なし</b>…！ あと<b>' + (3 - T.tries) + '</b>回振れる';
    SE.play('poof');
    toolActs(TOOL_CLOSE + '<button type="button" class="pbtn big main pulse" data-tl="go">もう一回振る！</button>');
    return;
  }
  const hand = h || { rank: 0, name: '目なし' };
  T.hands[i] = hand;
  const el = $('ccH' + i);
  el.textContent = hand.name + shown;
  el.className = 'cc-hand' + (hand.rank >= 80 ? ' great' : hand.rank <= 0 ? ' bad' : '');
  tmPop(el);
  $('toolSub').innerHTML = '<b>' + esc(pname(p)) + '</b>：' + (sho ? 'サイコロがお椀の外へ！ <b>ションベン</b>…' : d.join('・') + ' → <b>' + hand.name + '</b>' + (hand.rank >= 80 ? '！！' : hand.rank <= 0 ? '…' : ''));
  if (hand.rank >= 80) {
    SE.play('bigheaven');
    const q = relPos($('tlBowl')); FXC.burst(q.x, q.y, 70, { colors: GOLD, star: true, speed: 12 });
    telop(hand.rank === 100 ? 'ピンゾロ！！' : hand.name === 'シゴロ' ? 'シゴロ！<small>負けた人は×2</small>' : hand.name + '！', hand.rank === 100 ? 'angel' : 'sm', 1500);
  } else if (hand.rank <= 0) {
    SE.play('hell'); flash('#e8233f');
    if (hand.rank < 0) telop('ヒフミ……<small>負けたら×2</small>', 'devil', 1500);
    else if (sho) telop('ションベン！', 'red sm', 1300);
  } else SE.play('ding');
  if (i + 1 < T.ps.length) toolActs('<button type="button" class="pbtn big main" data-tl="next">次は ' + esc(pname(T.ps[i + 1])) + ' ▶</button>');
  else toolLater(chinResult, 1300);
}
function chinResult() {
  const T = tool, ranks = T.hands.map(x => x.rank), mn = Math.min.apply(null, ranks);
  const losers = T.ps.filter((_, j) => ranks[j] === mn);
  const shi = T.hands.some(x => x.name === 'シゴロ'), hif = T.hands.some(x => x.name === 'ヒフミ');
  const mult = (shi ? 2 : 1) * (hif ? 2 : 1);
  T.cups = T.base * mult;
  const who = losers.length > 1 ? losers.map(q => '<b>' + esc(pname(q)) + '</b>').join('・') + ' が同じ役で負け！' : '<b>' + esc(pname(losers[0])) + '</b> の負け！（' + T.hands[T.ps.indexOf(losers[0])].name + '）';
  const msg = who + (mult > 1
    ? '<br><span class="cc-mult">' + [shi ? 'シゴロ ×2' : '', hif ? 'ヒフミ ×2' : ''].filter(Boolean).join(' ・ ') + ' → ' + T.base + '杯 × ' + mult + ' = <b>' + T.cups + '杯</b></span>'
    : ' ' + T.cups + '杯' + (losers.length > 1 ? 'ずつ' : ''));
  toolFinish(losers, msg, j => $('ccR' + j));
  if (mult > 1) setTimeout(() => { if (screen === 'game') { telop('×' + mult + '！！<small>' + T.cups + '杯</small>', 'red', 1500); shake(true); } }, 450);
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
    '<p class="gd-lead">スマホ1台をみんなで回して遊ぶカードゲームです。アプリは<b>「カードを出す係」</b>と<b>「飲んだ量を記録する係」</b>。飲む人が決まっているカードは<b>アプリが自動で記録</b>、ジャンケンなどの勝ち負けはみんなで判定して、アプリに教えてあげます。</p>' +
    gCard('メンバーを登録', '<p>人数・名前・何周あそぶかを決めて「スタート！」。名前は<b>座っている順</b>に入れると、画面の席の並びが実際と同じになります。</p>', 1) +
    gCard('カードを引く', '<div class="gd-mock">' + gBtn('カードを引く！', 'big') + '</div><p>自分の番の人がタップ。カードが大きく出るので<b>声に出して読み上げ</b>、書いてあるとおりに遊びます。</p>', 2) +
    gCard('飲む人の記録', '<div class="gd-mock">' + gSeat('ユウキ', 0, 0, '引いた人') + '<span class="gd-tok">+1<small>杯</small></span>' + gSeat('サキ', 1, 1, 'ランダム') + '</div>' +
      '<p>「左隣は1杯」のように<b>飲む人が決まっているカードは、閉じると自動で記録</b>されます。</p>' +
      '<p>ジャンケンや指名のカードは<b>「誰が飲む？」画面</b>が出るので、飲む人をタップして「飲む！」。</p>' +
      '<p>記録されたら<b>「特殊ルールを使う？」</b>と聞かれるので、使うか「素直に飲む」かを選ぶだけ。</p>', 3) +
    gCard('次の人へ', '<div class="gd-mock">' + gBtn('次へ ▶ サキ', 'big') + '</div><p>「次へ」で、登録順に次の人の番になります。これをくり返すだけ！</p>', 4) +
    gTip('誰も飲まないカード（セーフなど）は、そのまま「次へ」でOK。飲む人を選ばずに「次へ」を押すと、アプリが確認してくれます。')
  },
  { k: 'record', tab: '記録のしかた', html: () =>
    '<p class="gd-lead">飲む人が分かるカードは<b>アプリが自動で記録</b>します。分からないときだけ、<b>飲む人を教えてあげて</b>ください。杯数はカードの数字が自動で入ります。</p>' +
    gCard('決まっている人は自動', '<div class="gd-mock">' + gSeat('ケンタ', 2, 2, '左隣') + '<span class="gd-tok">+1<small>杯</small></span></div>' +
      '<p>「{左隣}は1杯」「全員でグイ」などは、カードを閉じると<b>「+1杯」が席に飛んでいって</b>自動で記録されます。何もしなくてOK。</p>', 1) +
    gCard('「誰が飲む？」画面', '<div class="gd-mock paper"><span class="gd-pick on" style="--p:var(--p2)">サキ<b>1杯</b></span><span class="gd-pick" style="--p:var(--p3)">ケンタ</span></div>' +
      '<p>ジャンケン・指名・お題など、遊んでみないと分からないカードでは、この画面が出ます。<b>飲む人をタップ</b>して「飲む！」。</p>' +
      '<ul class="gd-list"><li>指名のカードは<b>「誰を指名する？」</b>。指名する人に選んでもらおう</li><li>まだ遊んでいる途中なら「あとで」。画面下の「誰が飲む？」から開き直せます</li>' +
      '<li>誰も飲まなかったら「誰も飲まなかった」</li><li>「1〜3杯」のようなカードや、負けた回数ぶん飲むときは −／＋ で杯数を合わせます</li></ul>', 2) +
    gCard('特殊ルール・券を使うとき', '<p>飲む人が記録されると、すぐに<b>「特殊ルールを使う？」</b>と聞かれます。</p><ul class="gd-list">' +
      '<li><b>1人のとき</b> → 「倍倍FIGHT！」「天国と地獄」（券を持っていれば「〇〇券を使う」）を押すか、「素直に飲む」</li>' +
      '<li><b>何人もいるとき</b> → まず使う人をタップ。2人以上なら<b>順番をランダムで決めて</b>、1人ずつ選びます。先の人の倍倍FIGHT！は、次の順番の人に×2がかかります</li>' +
      '<li><b>あとから使いたくなった</b> → その人の席をタップ（画面下の「特殊ルール」でもOK）</li></ul>' +
      '<p class="sub">倍倍FIGHT！は押した時点で2倍にして記録し直します。天国と地獄はそのままルーレットが回ります。</p>', 3) +
    gCard('こんなときは', '<ul class="gd-list">' +
      '<li><b>ルール違反などで、カード以外で飲む</b> → その人の席をタップ（何人もいるなら画面下の「追加で記録」）</li>' +
      '<li><b>記録をまちがえた</b> → 記録欄の「取り消す」で、1つ前に戻せる</li>' +
      '<li><b>記録しないで「次へ」を押してしまった</b> → 記録欄の「◀ 前のターンに戻る」。カード・記録・特殊ルールがその時のまま戻る（8ターン前まで。結果発表の画面からも戻れる）</li>' +
      '<li><b>0.5杯と出た</b> → 半分の効果。半分くらい飲めばOK</li></ul>') +
    gTip('記録した杯数は、最後の結果発表のランキングになります。')
  },
  { k: 'special', tab: '特殊ルール', html: () =>
    '<p class="gd-lead">飲む量を変える切り札です。<b>使うかどうかは飲む人が決めます。</b>使わなくても遊べます。</p>' +
    gTip('<b>1ターンに1人1つまで。</b>「倍倍FIGHT！」「天国と地獄」は、飲む人が決まったときにアプリが「使う？」と聞いてくれます。「コストパフォーマンス」だけは、カードを引く前に使います。') +
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
    gCard('継続カード（続くルール）', '<div class="gd-mock"><span class="gr-chip" style="--c:var(--c8)"><span class="gr-mk">則</span><span class="gr-t">カタカナ語禁止</span><span class="gr-cup">1杯</span><span class="gr-left">あと3</span></span></div>' +
      '<p>「継続 2周」などと書かれたカードは、<b>画面の上の「継続中」の帯</b>に並びます。あと何ターン続くかが出て、最後のターンは赤く光ります。期間が終わると自動で消えます。</p>' +
      '<ul class="gd-list"><li><b>違反した人がいたら</b> → 帯のルールをタップ →「違反したのは？」で違反した人を選ぶだけ。杯数は自動</li>' +
      '<li><b>インシュメイト</b> → カードを閉じたら相手を指名。そのあとは、どちらかが飲むと<b>もう片方にも同じ量が自動で記録</b>されます</li>' +
      '<li><b>執事</b>など人を指名するカード → 指名した人が帯に表示されます</li></ul>' +
      '<p class="sub">カードを引く前に席をタップすると、その人の手札（継続カード・券）とここまでの記録が見られます。</p>') +
    gCard('券', '<div class="gd-rows">' +
      '<span class="gd-chip plain">セーフ券・休憩券</span><span>飲む対象になったとき、1回だけ回避</span>' +
      '<span class="gd-chip plain">押し付け券</span><span>飲む量を、書かれた人に押し付け</span>' +
      '<span class="gd-chip plain">天国パス</span><span>天国と地獄で、地獄を1回だけ天国に</span>' +
      '<span class="gd-chip plain">コスパ無料券</span><span>次のコスパの、前払い1杯が不要</span></div>' +
      '<p class="sub">券は、記録画面に「〇〇を使う」ボタンとして出てきます（天国パスはルーレットの結果画面、コスパ無料券は自動で使われます）。「特殊ルールを使う？」の画面にも出ます。</p>') +
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
    gCard('道具ゲーム', '<p>チンチロ・サイコロ・トランプ・インディアンポーカー・ダーツのカードは、<b>「アプリで〇〇！」</b>ボタンでアプリの中で遊べます。負けた人は自動で記録。</p><div class="gd-rows">' +
      [['チンチロ', '全員が順番にお椀へサイコロ3個。目なしは3回まで振り直し、いちばん弱い役の人が負け。シゴロかヒフミが出たら負けた人は×2（両方なら×4）'], ['サイコロ', '2人がお椀にサイコロを1個ずつ。小さい目の方が負け（同じなら2人とも）'],
        ['トランプ', '2人が1枚ずつ。低い方が負け（A=1、同じなら2人とも）'], ['インディアン', 'インディアンポーカー。2人に伏せて配り、せーので開く。JOKERが出たら2人とも'], ['ダーツ', 'ダーツライブ風のボードに1本ずつ。動く狙いを見て、ボードか「投げる！」をタップ。トリプル3倍・ダブル2倍・ブル50点（インもアウトも）で、得点の低い方が負け']]
        .map(([a, b]) => '<span class="gd-chip plain">' + a + '</span><span>' + b + '</span>').join('') + '</div>' +
      '<p class="sub">サイコロは本物そっくりにお椀の中を転がり、止まった目で勝負します（お椀の外に出たら<b>ションベン</b>）。本物の道具で遊ぶときは、カードを閉じて「誰が飲む？」画面で負けた人を選べばOK。</p>' +
      gTip('チンチロの役（強い順）：ピンゾロ（1・1・1）→ ゾロ目 → シゴロ（4・5・6）→ 目（2つそろって残りの1個の数）→ 目なし・ションベン → ヒフミ（1・2・3）')) +
    gCard('早押し・名前ルーレット', '<p><b>早押し対決</b>：スマホを2人の間に置き、「タップ！」が出たら自分の側をタップ。フライングは負け。</p><p><b>名前ルーレット</b>：アプリが1人を選んで、自動で記録します。</p>') +
    gTip('ミニゲームで負けた人は、結果画面の「OK！」で<b>そのまま自動で記録</b>。そのあと「特殊ルールを使う？」と聞かれます。')
  },
  { k: 'more', tab: 'その他', html: () =>
    gCard('何周あそぶ？', '<p><b>3周・5周・10周</b>：全員が決まった回数カードを引いたら結果発表。山札が一巡するまで同じカードは出ません。</p><p><b>∞</b>：「終了」を押すまで続きます。引いたカードも山札に戻り、毎回ランダムに出ます。</p>') +
    gCard('途中でやめる・再開', '<p>ゲーム中の右上「終了」で結果発表へ。アプリを閉じてしまっても、タイトルの「続きから再開」で戻れます。</p>') +
    gCard('結果発表', '<p>飲んだ杯数のランキング。いちばん飲んだ人は「酒豪！」、いちばん少ない人は「セーフ王」。</p>') +
    gCard('カード編集', '<p>タイトルの「カード編集」で、カードの追加・書きかえ・ON/OFF、系統ごとのON/OFFができます。「アプリ連動」を選ぶと、チャレンジやルーレットなどアプリの効果を付けられます。指示文に「30秒」と書けばタイマーも付きます。</p>' +
      '<p class="sub">「飲む人の決め方」は、ふつうは「自動で判定」のままでOK。「{左隣}は1杯グイ」のような文章なら自動で記録、それ以外は「誰が飲む？」画面になります。</p>') +
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
    '<span class="cb-step">はじめてガイド 1/4</span><p>自分の番の人が<b>「カードを引く！」</b>をタップ。</p>' +
    (G.cur.cospa ? '' : '<p class="sub">左の「コスパ」は、先に1杯飲んでおくと、このターンで自分が飲むことになったときの量が半分になる特殊ルール。使わなくてOK。</p>') },
  { k: 'zoom', when: () => onlyOv('zoomOv') && !!zoom, place: 'top', html: () =>
    '<span class="cb-step">2/4</span><p>カードを<b>声に出して読み上げよう！</b>書いてあるとおりに遊んだら「OK！ テーブルへ」。</p>' +
    (zoomHint().auto ? '<p class="sub">下の黄色い文字は、閉じたあとアプリがすること。飲む人が決まっているカードは<b>自動で記録</b>されます。</p>' : '') +
    (cardActs().length ? '<p class="sub">ボタンが付いているカードは、そこからミニゲームやルーレットを始められます。</p>' : '') },
  { k: 'ask', when: () => onlyOv('askOv') && !!ask && ask.step !== 'order', at: '#askBox', point: '#askBox .specials, #askBox .dc-players', html: () =>
    '<span class="cb-step">はじめてガイド</span><p>飲む人が決まると、<b>特殊ルールを使うか</b>聞かれます。</p><p class="sub">倍倍FIGHT！か天国と地獄を押すと、その場で記録し直します。使わないなら「素直に飲む」。</p>',
    link: ['special', '特殊ルールって？'] },
  { k: 'decide', when: () => onlyOv('decideOv') && !!decide && decide.kind !== 'who' && !decide.step, at: '#decideBox', point: '#decideBox .dc-players', html: () =>
    '<span class="cb-step">3/4</span><p>飲む人を<b>タップして選び</b>、「飲む！」で記録。</p><p class="sub">特殊ルールを使うかは、このあと聞かれます。まだ遊んでいる途中なら「あとで」。</p>',
    link: ['special', '特殊ルールって？'] },
  { k: 'later', when: () => noOv() && !picking && needsPick(), at: '#dock [data-g="decide"]', above: '#gLog', html: () =>
    '<span class="cb-step">はじめてガイド</span><p>飲む人が決まったら<b>「誰が飲む？」</b>から選んで記録しよう。</p>' },
  { k: 'rules', when: () => noOv() && !picking && !G.cur.select && durRows().length > 0 && !durWaiting(false), at: '#gRules', html: () =>
    '<span class="cb-step">はじめてガイド</span><p>続くルールは<b>ここに表示</b>されます（あと何ターン続くかも）。</p><p class="sub">違反した人がいたら、<b>ルールをタップ</b>して選ぶだけで記録できます。</p>' },
  { k: 'nodrink', when: () => noOv() && G.cur.phase === 'drawn' && !G.cur.drinks.length && !G.cur.select && !picking && !!G.cur.card && drinkOf(G.cur.card) === 'none',
    at: '#dock [data-g="next"]', above: '#gLog', html: () =>
    '<span class="cb-step">はじめてガイド</span><p>このカードは飲む人がいないので、そのまま<b>「次へ」</b>でOK。</p>' },
  { k: 'sheet', when: () => onlyOv('sheetOv') && !!sheet && !sheet.locked, at: '#sheetBox', point: '#sheetBox .specials', html: () =>
    '<span class="cb-step">記録画面</span><p>特殊ルールは<b>使いたいときだけ</b>押す切り札。下の「飲む量」を確かめて「記録する！」。</p>' +
    '<p class="sub">券を持っている人は「〇〇を使う」ボタンも出ます。</p>', link: ['special', '特殊ルールって？'] },
  { k: 'next', when: () => noOv() && G.cur.phase === 'drawn' && recordedThisTurn() && !picking && !ask && !askWait, at: '#dock [data-g="next"]', above: '#gLog', html: () =>
    '<span class="cb-step">4/4</span><p>終わったら<b>「次へ」</b>で次の人の番。</p><p class="sub">まちがえたら上の「取り消す」。記録し忘れて次へ進んでも、「◀ 前のターンに戻る」で戻れます。</p>' },
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
  document.querySelectorAll('#seats .seat').forEach(x => x.classList.toggle('coach-pick', Array.isArray(pick) ? pick.includes(Number(x.dataset.seat)) : !!pick));
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
  if (s.mid) {
    /* over the card in the middle of the table, so no seat is covered; the button it talks about gets the ring */
    const m = document.querySelector(s.mid);
    if (m) ringAt(m.getBoundingClientRect());
    bub.classList.add('noarrow');
    bub.style.top = Math.max(52, y0 + (r.height - bub.offsetHeight) / 2) + 'px';
    return;
  }
  if (s.point) {
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
  if (cur.phase === 'drawn' && cur.card && (cur.card.fx === 'least' || cur.card.fx === 'last')) {
    const fx = cur.card.fx, vals = G.players.map(p => p.total);
    const ae = cur.drinks.find(e => e.kind === 'auto' && e.src === 'card');
    const hit = ae ? ae.items.some(it => it.p === i) : fx === 'least' ? pl.total === Math.min.apply(null, vals) : G.last === i;
    if (hit) flag = fx === 'least' ? 'いちばん少ない' : '直前に飲んだ';
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
    const dw = durWaiting(false);
    const left = needsPick() ? '<button type="button" class="pbtn pink small pulse" data-g="decide">誰が飲む？<span class="sub">タップして選ぶ</span></button>'
      : dw ? '<button type="button" class="pbtn pink small pulse" data-g="durpick">指名する<span class="sub">' + esc(dw[1].title || '') + '</span></button>'
      : replaceList().length ? '<button type="button" class="pbtn cyan small" data-g="special">特殊ルール<span class="sub">・券を使う</span></button>'
      : '<button type="button" class="pbtn white small" data-g="add">追加で記録<span class="sub">ルール違反など</span></button>';
    h += '<div class="dock-row">' + left +
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
  if (e.kind === 'safe') return '<span class="lg">誰も<b>飲まず</b></span>';
  if (e.kind === 'name') return pill(e.p, e.label);
  return (e.src === 'rule' ? '<span class="lg vio">違反</span>' : '') + (e.items || []).map(it => pill(it.p, it.amt ? fmtAmt(it.amt) + '杯' + (it.mf != null ? '♡' : '') : 'SAFE')).join('');
}
function renderLog() {
  const cur = G.cur, es = cur.drinks;
  const last = es[es.length - 1];
  const undoable = !!last && !(last.kind === 'cospa' && cur.phase === 'drawn');
  const back = !undoable && canBack() ? '<button type="button" class="lg-undo back" data-g="back">◀ 前のターンに戻る</button>' : '';
  let h = back;
  const drawnHint = () => (needsPick() ? '飲む人が決まったら「誰が飲む？」から記録' : drinkOf(cur.card) === 'app' && cardActs().length ? 'ボタンからスタート！ 結果は自動で記録されます'
    : drinkOf(cur.card) === 'none' ? '飲む人はいないので、そのまま次へ' : '席をタップすると、その人の記録画面が開きます');
  if (!es.length) h += '<span class="lg-hint">' + (cur.phase === 'drawn' ? drawnHint() : back ? '記録し忘れたら戻れます' : '席をタップするとその人の手札が見られます') + '</span>';
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
  renderRules();
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
    else if (g === 'decide') openDecide();
    else if (g === 'special') openSpecial();
    else if (g === 'add') openDecide('free');
    else if (g === 'durpick') openDecide('durpick');
    else if (g === 'tool') openTool();
    else if (g === 'plain') { if (!G.cur.chalDone && G.cur.card) autoRecord([G.cur.drawer], G.cur.card.cups[0] || 1, { src: 'card', mark: 'chalDone' }); }
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
    else if (s === 'asnew') { sheet.replace = null; delete sheet.pend; renderSheet(); SE.play('tap'); }
  });
  const decideLater = () => { if (!decide) return; if (decide.step === 'who' && decide.kind !== 'who') { decide.step = null; renderDecide(); SE.play('tap'); } else closeDecide(); };
  $('decideBox').addEventListener('click', e => {
    const b = e.target.closest('button[data-d]'); if (!b || !decide || b.disabled) return;
    const a = b.dataset.d, d = decide;
    const refocus = sel => { const x = $('decideBox').querySelector(sel); if (x && !x.disabled) x.focus({ preventScroll: true }); };
    if (a === 'sel') decideSel(Number(b.dataset.i));
    else if (a === 'minus') { d.base = Math.max(1, d.base - 1); SE.play('tap'); renderDecide(); refocus('[data-d="minus"]'); }
    else if (a === 'plus') { d.base = Math.min(99, d.base + 1); SE.play('tap'); renderDecide(); refocus('[data-d="plus"]'); }
    else if (a === 'go') decideGo();
    else if (a === 'special') decideSpecial();
    else if (a === 'who') decideWho(Number(b.dataset.i));
    else if (a === 'none') decideNone();
    else if (a === 'back') { if (d.kind === 'who') closeDecide(); else { d.step = null; renderDecide(); SE.play('tap'); } }
    else if (a === 'later') decideLater();
  });
  $('askBox').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled) askAct(b.dataset.a, b); });
  $('gRules').addEventListener('click', e => { const b = e.target.closest('[data-rule]'); if (b) ruleTap(Number(b.dataset.rule)); });
  $('infoBox').addEventListener('click', e => { if (e.target.closest('[data-if="close"]')) closeOv('infoOv'); });
  /* darts: remember the aim at the touch itself */
  $('toolOv').addEventListener('pointerdown', e => {
    if (tool && tool.kind === 'darts' && tool.aimOn && e.target.closest('#dtBoard, [data-tl="go"]')) tool.snap = { x: tool.ax, y: tool.ay, t: performance.now() };
  }, true);
  $('toolStage').addEventListener('click', e => {
    if (!tool || !e.target.closest('#tlBowl, #dtBoard')) return;
    const go = $('toolActs').querySelector('[data-tl="go"]');
    if (go && !go.disabled) toolAct('go');
  });
  $('toolActs').addEventListener('click', e => {
    const b = e.target.closest('[data-tl]'); if (!b || !tool || b.disabled) return;
    if (performance.now() < (tool.guard || 0)) return;
    toolAct(b.dataset.tl);
  });
  $('nextBox').addEventListener('click', e => {
    const b = e.target.closest('[data-nx]'); if (!b) return;
    closeOv('nextOv');
    if (b.dataset.nx === 'skip') nextTurn(true);
    else if (b.dataset.nx === 'go') gameAct(b.dataset.go);
  });
  $('handBox').addEventListener('click', e => { if (e.target.closest('[data-hand="close"]')) closeOv('handOv'); });
  $('endBox').addEventListener('click', e => {
    const b = e.target.closest('[data-end]'); if (!b) return;
    if (b.dataset.end === 'close') closeOv('endOv'); else endRule(Number(b.dataset.p), Number(b.dataset.end));
  });
  const backdrop = (id, fn) => $(id).addEventListener('click', e => { if (e.target === $(id)) fn(); });
  backdrop('sheetOv', closeSheet);
  backdrop('decideOv', decideLater);
  backdrop('nextOv', () => closeOv('nextOv'));
  backdrop('infoOv', () => closeOv('infoOv'));
  backdrop('askOv', () => { if (ask && ask.step !== 'order') askAct('none'); });
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
    else if ((a === 'rec' || a === 'special') && performance.now() - (bomb.resultAt || 0) < 600) { /* a pass-tap still landing as the result appears */ }
    else if (a === 'rec' || a === 'special') closeBomb(a);
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
    else if (a === 'rec') { const p = T.loser, cups = T.cups; closeTimer(); if (p != null) autoRecord([p], cups, { src: 'game' }); }
    else if (a === 'special') { const p = T.loser, cups = T.cups; closeTimer(); if (p != null) openSheet(p, { base: cups, owed: true, src: 'game' }); }
    else if (a === 'multi') { const ps = T.ps.slice(), cups = T.cups; closeTimer(); autoRecord(ps, cups, { src: 'game' }); }
    else closeTimer();
  });
  $('chalActs').addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b || !chal) return;
    const c = b.dataset.c;
    if (c === 'start') startChallenge();
    else if (c === 'rec' || c === 'special') closeChallenge(c);
    else closeChallenge(false);
  });
  $('tapCenter').addEventListener('click', e => {
    const b = e.target.closest('button[data-t]'); if (!b) return;
    if (b.dataset.t === 'rec' || b.dataset.t === 'special') closeTap(b.dataset.t);
    else if (b.dataset.t === 'close') closeTap(false);
    else if (b.dataset.t === 'again') { closeTap('again'); openTap(); }
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (zoom) { closeZoom(); return; }
    if (chal) { closeChallenge(false); return; }
    if (timer) { closeTimer(); return; }
    if (bomb) { if (bomb.state !== 'play') closeBomb(false); return; }
    if (!$('tapOv').hidden) { closeTap(false); return; }
    if (!$('wheelOv').hidden) { if (wheel && wheel.done) confirmWheel(); else cancelWheel(); return; }
    if (tool) { closeTool(false); return; }
    if (ask && !$('askOv').hidden) { if (ask.step !== 'order') askAct('none'); return; }
    for (const id of ['infoOv', 'nextOv', 'backOv', 'confirmOv', 'howOv', 'catOv', 'handOv', 'endOv']) if (!$(id).hidden) { closeOv(id); return; }
    if (!$('decideOv').hidden) { decideLater(); return; }
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
