
/* =====================================================================
   プレミアムのミニゲーム: 酒スロ・指ツイスター・黄金比チャレンジ
   どれも「スマホでしかできない」遊び。ミニゲームモードのルーレットに入り、一覧からタップで直接えらべる。
   画面は toolOv を使い、TOOLX[kind] = { setup, act, close } でつなぐ
   ===================================================================== */
Object.assign(MG, {
  slot: { short: 'スロ', title: '酒スロ', text: '{引いた人}から順番にスロットを回す。出た枚数がいちばん少ない人の負け（「酒」が3つそろったら、その人以外の全員が負け）' },
});
Object.assign(TOOL_INFO, {
  slot: { title: '酒スロ', act: '酒スロ スタート！', cls: 'slot', stake: '出た枚数がいちばん少ない人が' },
});
Object.assign(LOSE_SE, { slot: 'loseCards' });
/* the list: free games, then the three arcade games, then the older premium ones */
['slot', 'twist', 'pour'].filter(k => MG[k]).reverse().forEach(k => { const at = MG_ORDER.indexOf(k); if (at >= 0) MG_ORDER.splice(at, 1); MG_ORDER.splice(MG_ORDER.indexOf('cut'), 0, k); });
['twist', 'pour'].filter(k => !MG[k]).forEach(k => { const at = MG_ORDER.indexOf(k); if (at >= 0) MG_ORDER.splice(at, 1); });
const pickW = list => { let r = Math.random() * list.reduce((s, x) => s + x[1], 0); for (const x of list) { r -= x[1]; if (r < 0) return x[0]; } return list[list.length - 1][0]; };

/* =====================================================================
   酒スロ: 1人1回転。レバー → 3つのボタンでリールを止める。
   役は レバーを引いた瞬間に決まっていて（パチスロと同じ）、リールはその出目まですべる。
   予告ランプ（青 < 緑 < 赤 < 虹）・リーチ・カットイン・スロー停止で、当たりの期待度を見せる
   ===================================================================== */
const SL_N = 12, SL_V = 24;   /* stops on a reel, cells per second at full speed */
const SL_STRIPS = [
  ['seven', 'bell', 'suika', 'replay', 'bar', 'cherry', 'bell', 'sake', 'replay', 'suika', 'bell', 'bar'],
  ['bell', 'seven', 'replay', 'suika', 'bar', 'bell', 'cherry', 'replay', 'sake', 'bell', 'suika', 'bar'],
  ['suika', 'bell', 'bar', 'replay', 'seven', 'bell', 'cherry', 'suika', 'replay', 'sake', 'bell', 'bar'],
];
/* out of 1000 spins. rmiss = リーチしてハズレ */
const SL_ODDS = [['sake', 15], ['big', 50], ['reg', 85], ['replay', 90], ['suika', 110], ['bell', 220], ['cherry', 130], ['rmiss', 120], ['miss', 180]];
const SL_PAY = { sake: 1000, big: 300, reg: 100, suika: 15, bell: 8, cherry: 2 };
const SL_NAME = { suika: 'スイカ', bell: 'ベル', cherry: 'チェリー' };
const SL_CUT = { green: 'チャンス！', red: '激アツ！！', gold: '超激アツ！！', rainbow: '確定！！！' };
const SL_7 = 'M20 9H82V23L55 72H30L57 26H20Z';
const SL_SYM = {
  seven: '<path d="' + SL_7 + '" fill="none" stroke="#150733" stroke-width="13" stroke-linejoin="round"/><path d="' + SL_7 + '" fill="none" stroke="#ffd83d" stroke-width="8" stroke-linejoin="round"/>' +
    '<path d="' + SL_7 + '" fill="url(#slRed)" stroke="#150733" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 15H75" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".65"/>',
  bar: '<rect x="8" y="19" width="84" height="42" rx="9" fill="#150733"/><rect x="13" y="24" width="74" height="32" rx="5" fill="#2a1a10" stroke="url(#slGold)" stroke-width="3"/>' +
    '<text x="50" y="50.5" text-anchor="middle" font-size="27" fill="url(#slGold)" class="sl-tx">BAR</text>',
  bell: '<circle cx="50" cy="64" r="7" fill="#ff9d1c" stroke="#150733" stroke-width="4"/>' +
    '<path d="M50 9c-4 0-6.5 3-6.5 6.5C32 19.5 27 29 27 42c0 8-3 13-9 18h64c-6-5-9-10-9-18 0-13-5-22.5-16.5-26.500C56.5 12 54 9 50 9Z" fill="url(#slGold)" stroke="#150733" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M35 34c1.5-6 5-10 10-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/><path d="M24 54h52" stroke="#150733" stroke-width="3" opacity=".25"/>',
  suika: '<path d="M11 24A39 39 0 0 0 89 24Z" fill="#2fae4b" stroke="#150733" stroke-width="4" stroke-linejoin="round"/><path d="M18 24A32 32 0 0 0 82 24Z" fill="#f7ffe0"/><path d="M22 24A28 28 0 0 0 78 24Z" fill="#ff4763"/>' +
    '<g fill="#150733"><ellipse cx="36" cy="33" rx="2.3" ry="3.6" transform="rotate(-18 36 33)"/><ellipse cx="50" cy="38" rx="2.3" ry="3.6"/><ellipse cx="64" cy="33" rx="2.3" ry="3.6" transform="rotate(18 64 33)"/><ellipse cx="43" cy="45" rx="2" ry="3.2" transform="rotate(-8 43 45)"/><ellipse cx="57" cy="45" rx="2" ry="3.2" transform="rotate(8 57 45)"/></g>' +
    '<path d="M11 24H89" stroke="#150733" stroke-width="4" stroke-linecap="round"/>',
  cherry: '<path d="M52 13C44 25 35 33 31 44M52 13C57 25 64 31 70 42" fill="none" stroke="#150733" stroke-width="8" stroke-linecap="round"/><path d="M52 13C44 25 35 33 31 44M52 13C57 25 64 31 70 42" fill="none" stroke="#49b65a" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M52 13c8-9 21-9 30-3-8 9-21 10-30 3Z" fill="#6ddc77" stroke="#150733" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<circle cx="30" cy="57" r="15" fill="url(#slRed)" stroke="#150733" stroke-width="4"/><circle cx="70" cy="55" r="15" fill="url(#slRed)" stroke="#150733" stroke-width="4"/>' +
    '<circle cx="24" cy="51" r="4" fill="#fff" opacity=".85"/><circle cx="64" cy="49" r="4" fill="#fff" opacity=".85"/>',
  replay: '<circle cx="50" cy="36" r="27" fill="#2fa8ff" stroke="#150733" stroke-width="4"/><path d="M37 37a13 13 0 1 1 5.5 10.6" fill="none" stroke="#fff" stroke-width="6.5" stroke-linecap="round"/><path d="M32.5 43.500l10.5 6.5-0.5-12z" fill="#fff"/>' +
    '<text x="50" y="77" text-anchor="middle" font-size="12.5" fill="#1565c0" class="sl-tx">REPLAY</text>',
  sake: '<circle cx="50" cy="40" r="36" fill="url(#slRb)" stroke="#150733" stroke-width="4"/><circle cx="50" cy="40" r="27.5" fill="url(#slGold)" stroke="#150733" stroke-width="3"/>' +
    '<text x="50" y="54" text-anchor="middle" font-size="39" fill="#c4001d" stroke="#150733" stroke-width="1.2" paint-order="stroke" class="sl-tx">酒</text>',
};
const slSvg = k => '<svg viewBox="0 0 100 80" aria-hidden="true">' + SL_SYM[k] + '</svg>';
const slAt = (reel, i) => SL_STRIPS[reel][((i % SL_N) + SL_N) % SL_N];
const slIdx = (reel, sym) => { const a = []; SL_STRIPS[reel].forEach((s, i) => { if (s === sym) a.push(i); }); return a[rint(0, a.length - 1)]; };
/* three of a kind on any of the 5 lines (only the middle line pays, but nothing else may look like a win) */
function slotLines(st) {
  const g = r => [slAt(r, st[r] - 1), slAt(r, st[r]), slAt(r, st[r] + 1)], a = g(0), b = g(1), c = g(2);
  return [[a[1], b[1], c[1]], [a[0], b[0], c[0]], [a[2], b[2], c[2]], [a[0], b[1], c[2]], [a[2], b[1], c[0]]].some(l => l[0] === l[1] && l[1] === l[2]);
}
function slotStops(r) {
  const k = r.kind, line = { big: 'seven', reg: 'bar', sake: 'sake', suika: 'suika', bell: 'bell', replay: 'replay' }[k];
  if (line) return [slIdx(0, line), slIdx(1, line), slIdx(2, line)];
  for (let n = 0; n < 500; n++) {
    const st = k === 'rmiss' ? [slIdx(0, r.reach), slIdx(1, r.reach), slIdx(2, r.reach) + (r.end === 'short' ? 1 : -1)]
      : [k === 'cherry' ? slIdx(0, 'cherry') : rint(0, SL_N - 1), rint(0, SL_N - 1), rint(0, SL_N - 1)];
    const c = [slAt(0, st[0]), slAt(1, st[1]), slAt(2, st[2])];
    if (slotLines(st)) continue;
    if (k === 'miss' && (c[0] === 'cherry' || c[0] === c[1])) continue;   /* a plain miss: nothing pays, and no リーチ by accident */
    if (k === 'cherry' && c[1] === 'cherry') continue;
    return st;
  }
  return [1, 3, 4];
}
/* the lottery, at the pull of the lever: the role, and how loudly the machine hints at it */
function slotLot(T) {
  const rig = TOOLX.slot.rig;
  let kind = rig && rig.length ? rig.shift() : pickW(SL_ODDS);
  if (kind === 'replay' && T.sl.replays >= 2) kind = 'bell';
  const r = { kind, pay: SL_PAY[kind] || 0, lamp: '', cut: '', reach: null, slow: false, end: '' };
  if (kind === 'big') {
    r.reach = 'seven'; r.lamp = pickW([['red', 50], ['green', 22], ['rainbow', 12], ['blue', 8], ['', 8]]);
    r.cut = r.lamp === 'rainbow' ? 'rainbow' : pickW([['red', 45], ['gold', 30], ['green', 15], ['', 10]]); r.slow = Math.random() < 0.85;
  } else if (kind === 'reg') {
    r.reach = 'bar'; r.lamp = pickW([['green', 42], ['red', 26], ['blue', 22], ['', 10]]); r.cut = pickW([['green', 40], ['red', 32], ['gold', 6], ['', 22]]); r.slow = Math.random() < 0.65;
  } else if (kind === 'rmiss') {
    r.reach = Math.random() < 0.45 ? 'seven' : 'bar'; r.lamp = pickW([['', 38], ['blue', 36], ['green', 20], ['red', 6]]); r.cut = pickW([['', 58], ['green', 32], ['red', 10]]);
    r.slow = Math.random() < 0.55; r.end = Math.random() < 0.5 ? 'short' : 'over';
  } else if (kind === 'suika') r.lamp = pickW([['green', 40], ['blue', 40], ['', 20]]);
  else if (kind === 'bell' || kind === 'cherry') r.lamp = pickW([['', 72], ['blue', 28]]);
  else if (kind === 'miss') r.lamp = pickW([['', 80], ['blue', 17], ['green', 3]]);
  r.stops = slotStops(r);
  return r;
}

/* sounds (all synthesised) */
Object.assign(SOUNDS, {
  slLever: (A, t) => { noise(A, t, { d: 0.09, g: 0.3, type: 'lowpass', f: 900, f2: 200 }); tone(A, t, { type: 'square', f: 150, f2: 70, d: 0.12, g: 0.16, lp: 700 }); tone(A, t + 0.1, { type: 'triangle', f: 520, f2: 300, d: 0.07, g: 0.1 }); },
  slStart: (A, t) => noise(A, t, { d: 0.5, g: 0.08, type: 'bandpass', f: 260, f2: 1300, q: 1.2 }),
  slStop: (A, t) => { tone(A, t, { type: 'triangle', f: 196, f2: 130, d: 0.09, g: 0.3 }); noise(A, t, { d: 0.03, g: 0.22, type: 'highpass', f: 2600 }); },
  slStep: (A, t) => { tone(A, t, { type: 'square', f: 740, d: 0.07, g: 0.11, lp: 2400 }); noise(A, t, { d: 0.02, g: 0.12, type: 'highpass', f: 3000 }); },
  slBlue: (A, t) => [880, 1174.7].forEach((f, i) => tone(A, t + i * 0.09, { type: 'triangle', f, d: 0.3, g: 0.14, rv: 0.35 })),
  slGreen: (A, t) => [783.99, 987.77, 1318.5, 1568].forEach((f, i) => tone(A, t + i * 0.07, { type: 'triangle', f, d: 0.34, g: 0.15, rv: 0.4 })),
  slRed: (A, t) => { [0, 0.26].forEach(o => { tone(A, t + o, { type: 'sawtooth', f: 520, f2: 2600, d: 0.24, g: 0.14, lp: 1800, lp2: 6000, q: 3, rv: 0.3 }); tone(A, t + o, { type: 'square', f: 1040, f2: 5200, d: 0.24, g: 0.05 }); }); sparkle(A, t + 0.45, 8); kick(A, t, 0.5); },
  slRainbow: (A, t) => { harp(A, t); choir(A, t + 0.2, [523.25, 659.25, 783.99, 1046.5], 1.6, 0.03); sparkle(A, t + 0.5, 14); },
  slReach: (A, t) => { for (let i = 0; i < 6; i++) tone(A, t + i * 0.075, { type: 'square', f: i % 2 ? 1318.5 : 987.77, d: 0.075, g: 0.12, lp: 3200 }); for (let i = 0; i < 9; i++) snare(A, t + 0.45 + i * 0.05, 0.1 + i * 0.03); },
  slCut: (A, t) => { noise(A, t, { d: 0.3, g: 0.25, type: 'bandpass', f: 500, f2: 5000, q: 0.8 }); stab(A, t + 0.2, [196, 293.66, 392, 493.88], 0.9, 0.22, { lp: 5200, lp2: 600 }); kick(A, t + 0.2, 0.8); },
  slPush: (A, t) => [0, 0.14].forEach(o => tone(A, t + o, { type: 'square', f: 1568, d: 0.08, g: 0.1, lp: 3600 })),
  slWin: (A, t) => [659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(A, t + i * 0.08, { type: 'square', f, d: 0.16, g: 0.12, lp: 3000 })),
  slReg: (A, t) => { brass(A, t, [392, 493.88, 587.33], 0.22, 0.07); brass(A, t + 0.24, [440, 554.37, 659.25], 0.22, 0.07); brass(A, t + 0.48, [523.25, 659.25, 783.99], 0.6, 0.08); crash(A, t + 0.48, 0.16); },
  slBig: (A, t) => { [[392, 523.25, 659.25], [440, 587.33, 698.46], [493.88, 659.25, 783.99], [587.33, 783.99, 987.77]].forEach((ch, i) => brass(A, t + i * 0.2, ch, 0.2, 0.08)); brass(A, t + 0.8, [659.25, 783.99, 1046.5, 1318.5], 1.1, 0.09, { lp2: 4200 }); crash(A, t + 0.8, 0.26); kick(A, t + 0.8, 0.9); sparkle(A, t + 1, 18); },
  slMiss: (A, t) => { tone(A, t, { type: 'triangle', f: 330, f2: 196, d: 0.3, g: 0.12 }); tone(A, t + 0.16, { type: 'triangle', f: 247, f2: 147, d: 0.4, g: 0.1 }); },
  slOuch: (A, t) => { tone(A, t, { type: 'sawtooth', f: 392, f2: 110, d: 0.7, g: 0.13, lp: 1400, lp2: 300 }); noise(A, t, { d: 0.25, g: 0.1, type: 'lowpass', f: 500 }); },
  slDown: (A, t) => { tone(A, t, { type: 'sawtooth', f: 440, f2: 32, d: 1.1, g: 0.2, lp: 2200, lp2: 120 }); noise(A, t, { d: 0.14, g: 0.4, type: 'lowpass', f: 300 }); kick(A, t, 1); },
  slRumble: (A, t) => { noise(A, t, { d: 2.6, g: 0.22, type: 'lowpass', f: 90, f2: 900, a: 1.6 }); tone(A, t, { type: 'sawtooth', f: 41, f2: 164, d: 2.6, g: 0.12, a: 1.4, lp: 400, lp2: 1800 }); },
  slThunder: (A, t) => { noise(A, t, { d: 0.9, g: 0.5, type: 'lowpass', f: 2400, f2: 90, rv: 0.5 }); kick(A, t, 1); stab(A, t, [98, 146.83, 196, 293.66, 392], 1.2, 0.2, { lp: 6000, lp2: 300 }); },
  slGod: (A, t) => { choir(A, t, [261.63, 329.63, 392, 523.25, 659.25], 2.6, 0.04); brass(A, t, [523.25, 659.25, 783.99, 1046.5], 1.8, 0.09, { lp2: 5000 }); crash(A, t, 0.3); harp(A, t + 0.2); sparkle(A, t + 0.6, 24); },
});
['slStop', 'slStep', 'slStart', 'slLever', 'slPush'].forEach(k => NO_DUCK.add(k));

const slEaseBack = u => { const c = 1.9, v = u - 1; return 1 + (c + 1) * v * v * v + c * v * v; };
const slEaseIO = u => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
const slEaseOut = u => 1 - Math.pow(1 - u, 3);
function slotPaint(i) {
  const R = tool.sl.reels[i], pm = ((R.p % SL_N) + SL_N) % SL_N;
  R.el.style.transform = 'translate3d(0,' + (-(SL_N + pm - 0.7) / (SL_N * 3) * 100).toFixed(3) + '%,0)';
}
function slotFrame(now) {
  const T = tool;
  if (!T || T.kind !== 'slot') return;
  const S = T.sl, dt = Math.min(0.05, Math.max(0, (now - S.last) / 1000));
  S.last = now;
  let live = false;
  S.reels.forEach((R, i) => {
    if (R.mode === 'idle') return;
    live = true;
    if (R.mode === 'spin') { R.v = Math.min(SL_V, R.v + 170 * dt); R.p -= R.v * dt; }
    else if (R.mode === 'rev') { R.v = Math.min(R.vmax, R.v + R.acc * dt); R.p += R.v * dt; }
    else if (R.mode === 'run') {
      /* full speed up to one cell before the stop, then the last cell eases in with a little bounce */
      const rem = R.p - R.to - 1.1;
      if (rem > 0) R.p -= Math.min(rem, Math.max(R.v, SL_V) * dt);
      if (R.p - R.to - 1.1 <= 1e-6) { R.mode = 'ease'; R.from = R.p; R.t0 = now; R.dur = 180; R.ez = slEaseBack; }
    } else if (R.mode === 'ease') {
      const u = Math.min(1, (now - R.t0) / R.dur);
      R.p = R.from + (R.to - R.from) * R.ez(u);
      if (u >= 1) {
        R.p = R.to; R.mode = 'idle'; R.v = 0;
        R.box.classList.remove('spin');
        slotPaint(i);
        const f = R.done; R.done = null;
        if (f) f();
        return;
      }
    }
    slotPaint(i);
  });
  T.raf = live ? requestAnimationFrame(slotFrame) : 0;
}
function slotKick() { const T = tool; if (!T.raf) { T.sl.last = performance.now(); T.raf = requestAnimationFrame(slotFrame); } }
function slotSpinUp(i, rev) {
  const R = tool.sl.reels[i];
  R.mode = rev ? 'rev' : 'spin'; R.v = 0; R.vmax = 30; R.acc = 9;
  R.box.classList.add('spin');
  R.el.querySelectorAll('.hit').forEach(c => c.classList.remove('hit'));
  slotKick();
}
/* stop on the cell `idx` (the next time it comes round, at least `lead` cells ahead) */
function slotStopAt(i, idx, done, lead) {
  const R = tool.sl.reels[i];
  R.to = idx + SL_N * Math.floor((R.p - (lead == null ? 0.9 : lead) - idx) / SL_N);
  R.mode = 'run'; R.done = done;
  slotKick();
}
function slotMove(i, to, dur, ez, done) {
  const R = tool.sl.reels[i];
  R.from = R.p; R.to = to; R.t0 = performance.now(); R.dur = reduceMotion ? Math.min(dur, 120) : dur; R.ez = ez; R.mode = 'ease'; R.done = done;
  slotKick();
}
function slotLcd(html, cls) {
  const el = $('slLcd');
  if (!el) return;
  el.className = 'sl-lcd ' + (cls || '');
  el.innerHTML = '<span>' + html + '</span>';
}
const slotLamp = c => { const m = $('slM'); if (m) m.dataset.lamp = c; };
function slotButtons() {
  const S = tool.sl, ph = S.phase, at = ph === 'stop0' ? 0 : ph === 'stop1' ? 1 : ph === 'stop2' ? 2 : -1;
  $('slLever').classList.toggle('on', ph === 'ready');
  [0, 1, 2].forEach(i => {
    const b = $('slB' + i);
    b.classList.toggle('on', at >= 0 && i >= at);
    b.classList.toggle('next', i === at);
    b.classList.toggle('push', i === at && i === 2 && !!S.res && !!S.res.reach);
    b.innerHTML = i === at && i === 2 && S.res && S.res.reach ? 'PUSH' : 'STOP';
  });
}
function slotSetup() {
  const T = tool, n = T.ps.length;
  /* few players: more spins each, so a round is never over in a blink */
  T.res = []; T.sl = { phase: 'idle', replays: 0, res: null, reels: [], last: 0, auto: 0, spins: n <= 2 ? 3 : n === 3 ? 2 : 1, left: 0, sum: 0, order: T.ps.map((_, j) => j), oi: 0, sd: 0, lastP: -1 };
  const spins = T.sl.spins;
  const strip = r => { let h = ''; for (let c = 0; c < 3; c++) SL_STRIPS[r].forEach(s => { h += '<div class="sl-cell">' + slSvg(s) + '</div>'; }); return h; };
  $('toolStage').innerHTML = '<p class="tl-stake sl-stake">' + (spins > 1 ? '1人' + spins + '回転。合計がいちばん少ない人が' : TOOL_INFO.slot.stake) + ' <b>' + amtTxt(T.cups) + '</b><small>「酒」が3つそろったら、その人以外の全員が負け</small></p>' +
    '<div class="sl-ps" style="--cols:' + Math.min(4, n) + ';--n:' + n + '">' + T.ps.map((p, j) => '<div class="cc-row tl-r sl-p" id="tlP' + j + '" style="--p:' + pc(p) + '"><span class="cc-nm">' + esc(pname(p)) + '</span><b class="cc-hand tl-v" id="tlV' + j + '">--</b></div>').join('') + '</div>' +
    '<div class="sl-wrap"><div class="sl-machine" id="slM" data-lamp="idle">' +
    '<svg class="sl-defs" width="0" height="0" aria-hidden="true"><defs>' +
    '<linearGradient id="slRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7d8a"/><stop offset=".45" stop-color="#ef1f3a"/><stop offset="1" stop-color="#a30019"/></linearGradient>' +
    '<linearGradient id="slGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c4"/><stop offset=".5" stop-color="#ffd83d"/><stop offset="1" stop-color="#e09a00"/></linearGradient>' +
    '<linearGradient id="slRb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3d4f"/><stop offset=".22" stop-color="#ffd83d"/><stop offset=".45" stop-color="#30d158"/><stop offset=".65" stop-color="#35e0ff"/><stop offset=".85" stop-color="#b17cff"/><stop offset="1" stop-color="#ff4fa3"/></linearGradient>' +
    '</defs></svg>' +
    '<div class="sl-top"><span class="sl-who" id="slWho"></span><div class="sl-lamp" id="slLamp"><b>酒スロ</b></div><span class="sl-pay"><small>PAYOUT</small><b id="slPay">0</b></span></div>' +
    '<div class="sl-lcd" id="slLcd"></div>' +
    '<div class="sl-win" id="slWin">' + [0, 1, 2].map(r => '<div class="sl-reel" id="slR' + r + '"><div class="sl-strip" id="slS' + r + '">' + strip(r) + '</div></div>').join('') +
    '<i class="sl-arrow l" aria-hidden="true"></i><i class="sl-arrow r" aria-hidden="true"></i><div class="sl-cutin" id="slCut" hidden></div></div>' +
    '<div class="sl-panel"><button type="button" class="sl-lever" id="slLever" aria-label="レバーを引く"><i class="sl-slot"></i><i class="sl-ball"></i><b>LEVER</b></button>' +
    [0, 1, 2].map(i => '<button type="button" class="sl-stop" id="slB' + i + '" aria-label="リール' + (i + 1) + 'を止める">STOP</button>').join('') + '</div></div></div>' +
    '<p class="tm-sub sl-sub" id="toolSub"></p>';
  [0, 1, 2].forEach(i => {
    const R = { el: $('slS' + i), box: $('slR' + i), p: rint(0, SL_N - 1), v: 0, mode: 'idle', to: 0, from: 0, t0: 0, dur: 0, ez: null, done: null, vmax: 30, acc: 9 };
    T.sl.reels.push(R);
    slotPaint(i);
    onPress($('slB' + i), slotPress);
    onPress(R.box, slotPress);
  });
  onPress($('slLever'), slotLever);
  toolActs(TOOL_CLOSE, false);
  slotTurn();
}
function slotTurn() {
  const T = tool, S = T.sl, i = T.k = S.order[S.oi], p = T.ps[i];
  S.replays = 0; S.left = S.spins; S.sum = 0;
  T.ps.forEach((_, j) => { const el = $('tlP' + j); el.classList.toggle('now', j === i); el.classList.toggle('wait', S.order.indexOf(j) > S.oi); });
  const who = $('slWho'); who.textContent = pname(p); who.style.setProperty('--p', pc(p));
  const pass = S.lastP >= 0 && S.lastP !== i;
  S.lastP = i;
  $('toolSub').innerHTML = (pass ? 'スマホを渡して… ' : '') + '<b>' + esc(pname(p)) + '</b> の番！<small>レバーをタップ → ボタンでリールを止める' + (S.spins > 1 ? '（' + S.spins + '回まわせる）' : '') + '</small>';
  if (pass) SE.play('pass');
  slotReady(false);
}
function slotReady(replay) {
  const T = tool, S = T.sl, i = T.k;
  S.phase = 'ready'; S.res = null;
  const m = $('slM'); m.classList.remove('reach', 'zoom', 'lost', 'won');
  slotLamp('idle');
  const done = S.order.slice(0, S.oi).map(j => T.res[j]), min = done.length ? Math.min(...done) : null;
  if (replay) slotLcd('REPLAY！ もう1回まわせる', 'win');
  else if (S.left < S.spins) slotLcd((S.left === 1 ? 'ラスト1回！' : 'あと<b>' + S.left + '回</b>！') + ' いま <b>' + S.sum + '枚</b>' + (min != null ? '（最下位 ' + min + '枚）' : ''), '');
  else if (min == null) slotLcd('レバーを たたけ！', '');
  else slotLcd(S.oi + 1 >= S.order.length && S.spins === 1 ? '<b>' + min + '枚</b>より多ければ セーフ！' : 'いまの最下位は <b>' + min + '枚</b>', '');
  $('slPay').textContent = S.sum;
  slotButtons();
}
function slotLever() {
  const T = tool;
  if (!T || T.kind !== 'slot' || T.state !== 'play') return;
  const S = T.sl;
  if (S.phase !== 'ready') return;
  const res = S.res = slotLot(T);
  S.phase = 'pre';
  const lv = $('slLever'); lv.classList.remove('pull'); void lv.offsetWidth; lv.classList.add('pull');
  SE.play('slLever'); vibrate(20);
  slotButtons();
  slotLamp('off');
  slotLcd('・・・', '');
  if (res.kind === 'sake') { slotFreeze(res); return; }
  [0, 1, 2].forEach(i => toolLater(() => slotSpinUp(i), 60 + i * 90));
  toolLater(() => SE.play('slStart'), 60);
  let wait = 520;
  if (res.lamp) {
    wait = { blue: 950, green: 1150, red: 1700, rainbow: 2100 }[res.lamp];
    toolLater(() => {
      slotLamp(res.lamp);
      slotLcd({ blue: 'チャンス…？', green: 'アツいかも！', red: '激アツ！！', rainbow: '虹ランプ！！！' }[res.lamp], res.lamp);
      SE.play({ blue: 'slBlue', green: 'slGreen', red: 'slRed', rainbow: 'slRainbow' }[res.lamp]);
      if (res.lamp === 'red') { flash('#ff2d3f'); shake(false); vibrate([40, 30, 40]); }
      if (res.lamp === 'rainbow') { flash('#ffffff'); shake(false); vibrate([40, 30, 40, 30, 80]); const q = relPos($('slLamp')); FXC.burst(q.x, q.y, 50, { star: true, speed: 11 }); }
    }, 380);
  }
  toolLater(() => slotArm('stop0'), wait);
}
function slotArm(ph) {
  const T = tool, S = T.sl;
  S.phase = ph;
  slotButtons();
  clearTimeout(S.auto);
  S.auto = toolLater(() => { if (S.phase === ph) slotPress(); }, ph === 'stop2' && S.res.reach ? 9000 : 6000);
}
function slotPress() {
  const T = tool;
  if (!T || T.kind !== 'slot' || T.state !== 'play') return;
  const S = T.sl, res = S.res, at = ['stop0', 'stop1', 'stop2'].indexOf(S.phase);
  if (at < 0) return;
  clearTimeout(S.auto);
  const b = $('slB' + at); b.classList.add('hitb'); setTimeout(() => b.classList.remove('hitb'), 160);
  vibrate(12);
  if (at === 2 && res.reach && res.slow) { S.phase = 'busy'; slotButtons(); slotCreep(res); return; }
  S.phase = 'busy';
  slotButtons();
  slotStopAt(at, res.stops[at], () => {
    SE.play('slStop');
    if (at === 0) slotArm('stop1');
    else if (at === 1) { if (res.reach) slotReach(res); else slotArm('stop2'); }
    else if (res.reach && res.kind === 'rmiss') toolLater(() => slotResult(res), 350);
    else slotResult(res);
  });
}
/* 2 reels show the same bonus symbol: リーチ. A cut-in may follow; then the last button says PUSH */
function slotReach(res) {
  const T = tool;
  $('slM').classList.add('reach');
  slotLcd('リーチ！！', 'reach');
  SE.play('slReach'); vibrate([30, 40, 30]);
  BGM.level(0.25, 0.2);
  let wait = 780;
  if (res.cut) {
    wait = 2150;
    toolLater(() => {
      const c = $('slCut');
      c.className = 'sl-cutin ' + res.cut; c.innerHTML = '<b>' + SL_CUT[res.cut] + '</b>'; c.hidden = false;
      SE.play('slCut'); vibrate(60);
      if (res.cut !== 'green') { flash(res.cut === 'red' ? '#ff2d3f' : '#ffd83d'); shake(res.cut !== 'red'); }
      if (res.cut === 'rainbow' || res.cut === 'gold') { const q = relPos($('slWin')); FXC.burst(q.x, q.y, 60, { colors: res.cut === 'gold' ? GOLD : CONF, star: true, speed: 13 }); }
      slotLcd(SL_CUT[res.cut], res.cut === 'green' ? 'green' : res.cut === 'red' ? 'red' : 'bonus');
      if (res.cut === 'red' || res.cut === 'gold' || res.cut === 'rainbow') slotLamp(res.cut === 'red' ? 'red' : 'rainbow');
      toolLater(() => { c.hidden = true; }, 1320);
    }, 620);
  }
  toolLater(() => { slotArm('stop2'); SE.play('slPush'); slotLcd('ボタンを 押せ！', 'reach'); }, wait);
}
/* the last reel in slow motion: the bonus symbol comes down one cell at a time… and lands, stops short, or slips past */
function slotCreep(res) {
  const T = tool, f = res.stops[2], hit = res.kind !== 'rmiss';
  const s = hit ? f : res.end === 'short' ? f - 1 : f + 1, K = 4;
  const m = $('slM');
  slotStopAt(2, s + K, () => {
    SE.play('slStep');
    m.classList.add('zoom');
    let k = K;
    const waits = [0, 760, 560, 400, 300];
    const step = () => {
      k--;
      slotMove(2, tool.sl.reels[2].p - 1, 230, slEaseIO, () => {
        SE.play('slStep'); vibrate(15);
        if (k > 1) { toolLater(step, waits[k]); return; }
        /* the symbol sits one cell above the line */
        SE.play('heart');
        toolLater(() => SE.play('heart'), 420);
        toolLater(() => {
          const R = tool.sl.reels[2];
          if (hit) slotMove(2, R.p - 1, 300, slEaseBack, () => { SE.play('slStop'); slotResult(res); });
          else if (res.end === 'short') slotMove(2, R.p - 0.42, 520, slEaseOut, () => toolLater(() => slotMove(2, R.p + 0.42, 200, slEaseBack, () => slotResult(res)), 260));
          else slotMove(2, R.p - 1, 210, u => u, () => slotMove(2, tool.sl.reels[2].p - 1, 260, slEaseBack, () => slotResult(res)));
        }, 900);
      });
    };
    toolLater(step, 420);
  }, 0.9);
}
function slotCount(pay, ms) {
  const T = tool, el = $('slPay'), base = T.sl.sum, steps = Math.min(pay, Math.max(4, Math.round(ms / 55)));
  for (let k = 1; k <= steps; k++) toolLater(() => { el.textContent = base + Math.round(pay * k / steps); if (k % 2 || steps < 12) SE.play('coin'); }, Math.round(ms * k / steps));
}
function slotHit(sym) {
  const S = tool.sl;
  S.reels.forEach((R, i) => { const c = ((Math.round(R.p) % SL_N) + SL_N) % SL_N; if (!sym || slAt(i, c) === sym) R.el.children[SL_N + c].classList.add('hit'); });
}
function slotScore(pay, wait) {
  const T = tool, S = T.sl, i = T.k, v = $('tlV' + i);
  S.sum += pay; S.left--;
  v.textContent = S.sum + '枚'; v.classList.toggle('great', S.sum >= 100); v.classList.toggle('bad', !S.sum && !S.left);
  tmPop(v);
  if (S.left > 0) { toolLater(() => slotReady(false), wait); return; }
  T.res[i] = S.sum;
  toolLater(slotNext, wait);
}
function slotResult(res) {
  const T = tool, S = T.sl, k = res.kind, m = $('slM');
  S.phase = 'busy';
  m.classList.remove('reach', 'zoom');
  BGM.level(0.7, 0.4);
  const q = relPos($('slWin'));
  if (k === 'replay') {
    slotHit('replay'); SE.play('slWin'); S.replays++;
    slotLcd('REPLAY！', 'win'); slotLamp('blue');
    toolLater(() => slotReady(true), 1100);
    return;
  }
  if (!res.pay) {
    m.classList.add('lost'); slotLamp('off');
    if (k === 'rmiss') { slotLcd('おしい…！ ハズレ', 'miss'); SE.play('slOuch'); shake(false); } else { slotLcd('ハズレ…', 'miss'); SE.play('slMiss'); }
    slotScore(0, k === 'rmiss' ? 1500 : 1100);
    return;
  }
  m.classList.add('won');
  if (k === 'big' || k === 'reg') {
    const big = k === 'big';
    slotHit(big ? 'seven' : 'bar');
    slotLamp('rainbow');
    slotLcd(big ? 'BIG BONUS！！ +300枚' : 'REGULAR BONUS！ +100枚', 'bonus');
    SE.play(big ? 'slBig' : 'slReg'); if (big) SE.play('fanfare');
    flash('#ffd83d'); shake(big); vibrate(big ? [80, 40, 80, 40, 200] : [60, 40, 120]);
    FXC.burst(q.x, q.y, big ? 130 : 70, { colors: GOLD, star: true, speed: big ? 17 : 13 });
    if (big) { FXC.rain(90, GOLD); telop('BIG BONUS!!<small>+300枚</small>', '', 1700); }
    slotCount(res.pay, big ? 2000 : 1300);
    slotScore(res.pay, big ? 3300 : 2300);
    return;
  }
  slotHit(k === 'cherry' ? null : k);
  if (k === 'cherry') { S.reels[1].el.querySelectorAll('.hit').forEach(c => c.classList.remove('hit')); S.reels[2].el.querySelectorAll('.hit').forEach(c => c.classList.remove('hit')); }
  slotLamp('green');
  slotLcd(SL_NAME[k] + '！ +' + res.pay + '枚', 'win');
  SE.play('slWin');
  FXC.burst(q.x, q.y, 24, { colors: GOLD, speed: 9 });
  slotCount(res.pay, 500);
  slotScore(res.pay, 1400);
}
/* 酒GO!!フリーズ: everything goes dark and still, the reels run backwards, and 酒・酒・酒 lands by itself */
function slotFreeze(res) {
  const T = tool, S = T.sl, m = $('slM');
  [0, 1, 2].forEach(i => toolLater(() => slotSpinUp(i), 60 + i * 90));
  toolLater(() => {
    S.reels.forEach((R, i) => { R.mode = 'idle'; R.box.classList.remove('spin'); R.p = Math.round(R.p); slotPaint(i); });
    m.classList.add('freeze'); $('toolOv').classList.add('sl-dark');
    slotLamp('off'); slotLcd('', '');
    BGM.level(0, 0.05);
    SE.play('slDown'); vibrate(400); shake(true);
  }, 620);
  toolLater(() => { SE.play('slRumble'); [0, 1, 2].forEach(i => slotSpinUp(i, true)); m.classList.add('god'); }, 2300);
  ['酒', '酒 GO', '酒 GO !!'].forEach((t, k) => toolLater(() => { slotLcd(t, 'bonus'); SE.play('slStep'); }, 3000 + k * 480));
  toolLater(() => { m.classList.remove('freeze'); slotLamp('rainbow'); flash('#ffffff'); }, 4500);
  [0, 1, 2].forEach(i => toolLater(() => {
    const R = S.reels[i], idx = res.stops[i];
    R.mode = 'idle';
    /* from wherever it is, slide back up onto the 酒 */
    const cur = R.p, to = idx + SL_N * Math.ceil((cur + 0.6 - idx) / SL_N);
    slotMove(i, to, 240, slEaseBack, () => { R.p = idx; slotPaint(i); R.box.classList.remove('spin'); slotHit('sake'); });
    SE.play('slThunder'); flash('#ffffff'); shake(true); vibrate(120);
  }, 4900 + i * 750));
  toolLater(() => {
    $('toolOv').classList.remove('sl-dark');
    const q = relPos($('slWin'));
    slotLcd('酒GO!!フリーズ！ +1000枚', 'bonus');
    SE.play('slGod'); SE.play('fanfare');
    telop('酒GO!!フリーズ!!<small>' + esc(pname(T.ps[T.k])) + ' 以外の全員が負け</small>', '', 2600);
    FXC.burst(q.x, q.y, 160, { star: true, speed: 18 }); FXC.rain(140);
    vibrate([100, 50, 100, 50, 300]);
    slotCount(1000, 2200);
    const i = T.k, v = $('tlV' + i);
    S.sum += 1000; T.res[i] = S.sum; v.textContent = S.sum + '枚'; v.classList.add('great'); tmPop(v);
    S.god = true;
    toolLater(slotFinish, 3600);
  }, 4900 + 3 * 750 + 250);
}
function slotNext() {
  const T = tool, S = T.sl;
  S.oi++;
  if (S.oi < S.order.length) { slotTurn(); return; }
  const min = Math.min(...S.order.map(j => T.res[j])), tied = S.order.filter(j => T.res[j] === min);
  if (tied.length < 2 || S.sd >= 2) { slotFinish(tied, min); return; }
  /* サドンデス: the people on the same lowest number spin once more (twice at most; after that they all lose) */
  S.sd++; S.order = tied; S.oi = 0; S.spins = 1;
  T.ps.forEach((_, j) => {
    const el = $('tlP' + j), v = $('tlV' + j), on = tied.includes(j);
    el.classList.remove('now', 'wait'); el.classList.toggle('safe', !on);
    v.classList.remove('great', 'bad');
    if (on) { T.res[j] = null; v.textContent = '--'; } else v.textContent = 'セーフ';
  });
  S.phase = 'busy';
  slotButtons();
  $('slM').classList.remove('lost', 'won');
  slotLamp('red'); slotLcd('サドンデス！！', 'red');
  SE.play('slCut'); flash('#ff2d3f'); shake(false); vibrate([60, 40, 60]);
  telop('サドンデス!!<small>同じ ' + min + '枚の' + tied.length + '人で もう1回転</small>', '', 1900);
  $('toolSub').innerHTML = '同じ <b>' + min + '枚</b>！ ' + tied.length + '人で もう1回転';
  toolLater(slotTurn, 2200);
}
function slotFinish(tied, min) {
  const T = tool, S = T.sl;
  S.phase = 'over';
  slotButtons();
  T.ps.forEach((_, j) => $('tlP' + j).classList.remove('now', 'wait'));
  let losers, msg;
  if (S.god) {
    const w = T.ps[T.k];
    losers = T.ps.filter(p => p !== w);
    if (losers.length > 1) T.stamp = { names: [w], word: '以外 全員の負け！！' };
    msg = '<b>' + esc(pname(w)) + '</b> の酒GO!!フリーズ！ ほかの全員が ' + amtTxt(T.cups);
  } else {
    losers = tied.map(j => T.ps[j]);
    msg = loseLine(T, losers, (S.sd ? 'サドンデスでも ' : '') + '同じ ' + min + '枚！');
  }
  toolLater(() => hushBeat('toolOv', 700, () => toolFinish(losers, msg, j => $('tlP' + j))), S.god ? 100 : 500);
}
TOOLX.slot = {
  rig: null,   /* tests: a list of roles to come up next */
  setup: slotSetup,
  act() {},
  close(T) { clearTimeout(T.sl && T.sl.auto); $('toolOv').classList.remove('sl-dark'); },
};
