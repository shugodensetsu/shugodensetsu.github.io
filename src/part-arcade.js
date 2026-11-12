
/* =====================================================================
   プレミアムのミニゲーム: 酒スロ・指ツイスター・黄金比チャレンジ
   どれも「スマホでしかできない」遊び。ミニゲームモードのルーレットに入り、一覧からタップで直接えらべる。
   画面は toolOv を使い、TOOLX[kind] = { setup, act, close } でつなぐ
   ===================================================================== */
Object.assign(MG, {
  slot: { short: 'スロ', title: '酒スロ', text: '{引いた人}から順番にスロットを回す。出た枚数がいちばん少ない人の負け（「酒」が3つそろったら、その人以外の全員が負け）' },
  pour: { short: '黄金比', title: '黄金比チャレンジ', text: '{引いた人}から1人ずつ、スマホをグラスにしてビールを注ぐ。かたむけて注ぐと泡は少なく、まっすぐ注ぐと泡だらけ。ビール7：泡3でフチまで注げた人ほど高得点。いちばん点数が低い人の負け' },
  twist: { short: '指', title: '指ツイスター', text: 'スマホをテーブルに置いて、全員が自分の色の丸に指を1本置く。丸は動く・入れかわる・ワープする。最初に指がはなれた人の負け（6人からは2組に分かれて、負けた2人で決勝）' },
});
Object.assign(TOOL_INFO, {
  slot: { title: '酒スロ', act: '酒スロ スタート！', cls: 'slot', stake: '出た枚数がいちばん少ない人が' },
  twist: { title: '指ツイスター', act: '指ツイスター スタート！', cls: 'twist', stake: '最初に指がはなれた人が' },
  pour: { title: '黄金比チャレンジ', act: '黄金比チャレンジ スタート！', cls: 'pour', stake: 'いちばん点数が低い人が' },
});
Object.assign(LOSE_SE, { slot: 'loseCards', twist: 'loseReact', pour: 'loseChamp' });
/* the list: free games, then the three arcade games, then the older premium ones */
['slot', 'twist', 'pour'].filter(k => MG[k]).forEach(k => { const at = MG_ORDER.indexOf(k); if (at >= 0) MG_ORDER.splice(at, 1); MG_ORDER.splice(MG_ORDER.indexOf('cut'), 0, k); });
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

/* =====================================================================
   指ツイスター: スマホをテーブルに置いて、全員が自分の色の丸に指を1本ずつ置く。
   丸は動き、ときどきイベント（入れかえ・ワープ・ぐるぐる…）が起きる。丸から指がはなれたまま、まわりのゲージが空になった人の負け。
   同時に置ける指は5本まで（iPhone の上限）。6人からは2組に分けて、それぞれの負けどうしで決勝
   ===================================================================== */
const TW_EV = { swap: '入れかえ！', speed: 'スピードアップ！', shrink: 'ちぢむ！', warp: 'ワープ！', spin: 'ぐるぐる！', pick: 'ねらいうち！' };
const TW_TOP = 26, TW_PAD = 6;   /* room at the top of the arena for the name tags and the clock; the gap to the other walls */
Object.assign(SOUNDS, {
  twOn: (A, t) => tone(A, t, { type: 'triangle', f: 660, f2: 990, d: 0.12, g: 0.16 }),
  twTick: (A, t) => tone(A, t, { type: 'square', f: 1046.5, d: 0.03, g: 0.045, lp: 2600 }),
  twTock: (A, t) => tone(A, t, { type: 'square', f: 783.99, d: 0.03, g: 0.04, lp: 2200 }),
  twEv: (A, t) => { noise(A, t, { d: 0.22, g: 0.2, type: 'bandpass', f: 600, f2: 4200, q: 0.9 }); [587.33, 880, 1174.7].forEach((f, i) => tone(A, t + 0.08 + i * 0.08, { type: 'square', f, d: 0.11, g: 0.12, lp: 3200 })); },
  twWarn: (A, t) => tone(A, t, { type: 'square', f: 1480, f2: 1245, d: 0.06, g: 0.11, lp: 4000 }),
  twWarp: (A, t) => { tone(A, t, { type: 'sine', f: 300, f2: 2400, d: 0.2, g: 0.16 }); noise(A, t + 0.05, { d: 0.18, g: 0.12, type: 'highpass', f: 3000 }); },
  twOut: (A, t) => { noise(A, t, { d: 0.6, g: 0.5, type: 'lowpass', f: 1800, f2: 120, rv: 0.4 }); kick(A, t, 1); tone(A, t, { type: 'sawtooth', f: 330, f2: 55, d: 0.6, g: 0.18, lp: 1600, lp2: 200 }); },
});
['twTick', 'twTock', 'twWarn', 'twOn'].forEach(k => NO_DUCK.add(k));

function twistSetup() {
  const T = tool, n = T.ps.length, idx = T.ps.map((_, j) => j);
  let rounds;
  if (n <= 5) rounds = [{ ids: idx, label: '' }];
  else { const h = Math.ceil(n / 2); rounds = [{ ids: idx.slice(0, h), label: 'Aグループ' }, { ids: idx.slice(h), label: 'Bグループ' }, { ids: [], label: '決勝' }]; }
  const ac = new AbortController();
  const S = T.tw = { rounds, ri: 0, phase: 'idle', cs: [], ptrs: new Map(), ac, last: 0, t0: 0, W: 0, H: 0, R: 34, sp: 0, boost: 1, lv0: 0, ev: null, evAt: 0, evN: 0, lastEv: '', shr: 0, spd: 0, cnt: -1, warnAt: 0, tickAt: 0, tickK: 0, time: 0, hud: '' };
  $('toolStage').innerHTML = '<p class="tl-stake sl-stake">' + (rounds.length > 1 ? '2組に分かれて対決 → 負けた2人で決勝。決勝で負けた人が' : TOOL_INFO.twist.stake) + ' <b>' + amtTxt(T.cups) + '</b></p>' +
    '<div class="sl-ps" style="--cols:' + Math.min(4, n) + ';--n:' + n + '">' + T.ps.map((p, j) => '<div class="cc-row tl-r sl-p" id="tlP' + j + '" style="--p:' + pc(p) + '"><span class="cc-nm">' + esc(pname(p)) + '</span><b class="cc-hand tl-v" id="tlV' + j + '">--</b></div>').join('') + '</div>' +
    '<div class="tw-arena" id="twA"></div><p class="tm-sub tw-sub" id="toolSub"></p>';
  /* fingers anywhere on the overlay count (a finger may land beside the arena and slide in) */
  const ov = $('toolOv'), A = $('twA'), sig = { signal: ac.signal }, np = { signal: ac.signal, passive: false };
  ov.addEventListener('pointerdown', e => { S.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); }, sig);
  ov.addEventListener('pointermove', e => { const q = S.ptrs.get(e.pointerId); if (q) { q.x = e.clientX; q.y = e.clientY; } }, sig);
  ['pointerup', 'pointercancel'].forEach(k => ov.addEventListener(k, e => { S.ptrs.delete(e.pointerId); }, sig));
  window.addEventListener('blur', () => S.ptrs.clear(), sig);
  /* no scrolling, zooming, text selection or long-press menus under all those fingers */
  ['touchstart', 'touchmove', 'touchend', 'contextmenu', 'gesturestart', 'gesturechange', 'dblclick', 'selectstart'].forEach(k => A.addEventListener(k, e => { if (e.cancelable) e.preventDefault(); }, np));
  twistRound();
}
function twistRound() {
  const T = tool, S = T.tw, rd = S.rounds[S.ri], A = $('twA'), m = rd.ids.length, heats = S.rounds.length > 1;
  const rect = A.getBoundingClientRect(), W = S.W = rect.width, H = S.H = rect.height;
  S.R = Math.round(Math.max(30, Math.min(46, Math.min(W, H) * 0.105)));
  S.phase = 'wait'; S.boost = 1; S.ev = null; S.evN = 0; S.lastEv = ''; S.shr = 0; S.spd = 0; S.cnt = -1; S.hud = '';
  S.lv0 = S.ri === 2 ? 2 : 0;   /* the final starts faster */
  S.cs = rd.ids.map((j, k) => {
    const a = -Math.PI / 2 + k * 2 * Math.PI / m;
    return { j, x: W / 2 + Math.cos(a) * W * 0.29, y: (H + TW_TOP) / 2 + Math.sin(a) * (H - TW_TOP) * 0.3, a: Math.random() * 6.283, turn: 0, r: S.R, rt: S.R, held: false, life: 1, grace: 0, slow: 0, fast: 1, fastT: 0, mode: 'wander', warn: false, wp: null, cls: '', lf: -1, st: '' };
  });
  A.style.setProperty('--d', S.R * 2 + 'px');
  A.className = 'tw-arena wait';
  A.innerHTML = '<div class="tw-hud"><b id="twTime">0.0</b><i id="twLv">' + (rd.label || 'LV.1') + '</i></div>' +
    S.cs.map((c, k) => '<i class="tw-ghost" id="twG' + k + '" style="--p:' + pc(T.ps[c.j]) + '"></i>').join('') +
    S.cs.map((c, k) => '<div class="tw-c" id="twC' + k + '" style="--p:' + pc(T.ps[c.j]) + '"><i class="tw-ring"></i><i class="tw-disc"></i></div>').join('') +
    S.cs.map((c, k) => '<span class="tw-nm" id="twN' + k + '" style="--p:' + pc(T.ps[c.j]) + '">' + esc(pname(T.ps[c.j])) + '</span>').join('') +
    '<div class="tw-ban" id="twBan"></div><div class="tw-cnt" id="twCnt"></div>';
  S.cs.forEach((c, k) => { c.el = $('twC' + k); c.nm = $('twN' + k); c.gh = $('twG' + k); });
  T.ps.forEach((_, j) => {
    const el = $('tlP' + j), v = $('tlV' + j), on = rd.ids.includes(j);
    el.classList.toggle('now', on && heats); el.classList.toggle('wait', !on && !el.classList.contains('safe'));
    if (on) { v.textContent = 'まだ'; v.classList.remove('bad', 'great'); }
  });
  $('toolSub').innerHTML = (rd.label ? '<b>' + rd.label + '</b>： ' : '') + '自分の色の丸に 指を1本！<small>スマホはテーブルに。全員そろうと スタート</small>';
  toolActs(TOOL_CLOSE, false);
  twistPaint();
  if (!T.raf) { S.last = performance.now(); T.raf = requestAnimationFrame(twistFrame); }
}
function twBanner(html, cls) {
  const b = $('twBan');
  if (!b) return;
  b.className = 'tw-ban'; b.innerHTML = html; void b.offsetWidth; b.className = 'tw-ban show ' + (cls || '');
}
const twWho = c => '<span style="color:' + pc(tool.ps[c.j]) + '">' + esc(pname(tool.ps[c.j])) + '</span><br>';
function twCount(v) { const c = $('twCnt'); if (c) c.innerHTML = v === '' ? '' : '<b>' + v + '</b>'; }
function twistFrame(now) {
  const T = tool;
  if (!T || T.kind !== 'twist') return;
  const S = T.tw, A = $('twA');
  T.raf = 0;
  if (!A || S.phase === 'done') return;
  const dt = Math.min(0.05, Math.max(0, (now - S.last) / 1000));
  S.last = now;
  const rect = A.getBoundingClientRect();
  if (rect.width && (Math.abs(rect.width - S.W) > 0.5 || Math.abs(rect.height - S.H) > 0.5)) {
    /* the arena changed size (a rotated phone, a resized window): everything keeps its place in proportion */
    const fx = rect.width / (S.W || rect.width), fy = rect.height / (S.H || rect.height);
    S.cs.forEach(c => { c.x *= fx; c.y *= fy; if (c.wp) { c.wp.x *= fx; c.wp.y *= fy; } if (c.mode === 'arc') { c.cx *= fx; c.cy *= fy; } });
    S.W = rect.width; S.H = rect.height;
  }
  if (S.phase !== 'over') {
    S.cs.forEach(c => {
      let h = false;
      const lim = c.r + 14;
      S.ptrs.forEach(q => { const dx = q.x - rect.left - c.x, dy = q.y - rect.top - c.y; if (dx * dx + dy * dy <= lim * lim) h = true; });
      if (h && !c.held && S.phase !== 'play') { SE.play('twOn'); vibrate(10); }
      c.held = h;
    });
  }
  if (S.phase === 'wait') {
    if (S.cs.every(c => c.held)) { S.phase = 'count'; S.t0 = now; S.cnt = -1; toolActs('', false); }
  } else if (S.phase === 'count') {
    if (!S.cs.every(c => c.held)) {
      S.phase = 'wait'; twCount(''); twBanner('はなれた！ もういちど', 'ng'); SE.play('buzz');
      toolActs(TOOL_CLOSE, false);
    } else {
      const k = Math.floor((now - S.t0) / 700);
      if (k !== S.cnt) {
        S.cnt = k;
        if (k < 3) { twCount(3 - k); SE.play('beep'); vibrate(15); }
        else {
          twCount(''); twBanner('GO！', 'go'); SE.play('go'); vibrate(40);
          S.phase = 'play'; S.t0 = now; S.evAt = 3.2; S.tickAt = 0;
          A.className = 'tw-arena play';
          S.cs.forEach(c => { c.life = 1; $('tlV' + c.j).textContent = 'GO!'; });
          $('toolSub').innerHTML = '指を はなすな！<small>まわりのゲージが空になったら アウト</small>';
        }
      }
    }
  } else if (S.phase === 'play') twistStep(now, dt);
  if (S.phase === 'wait' || S.phase === 'count') S.cs.forEach(c => { const st = c.held ? 'OK!' : 'まだ'; if (st !== c.st) { c.st = st; const v = $('tlV' + c.j); v.textContent = st; v.classList.toggle('great', c.held); } });
  twistPaint();
  T.raf = requestAnimationFrame(twistFrame);
}
function twistStep(now, dt) {
  const T = tool, S = T.tw, W = S.W, H = S.H, u = Math.min(W, H), cs = S.cs;
  /* a phone is small: even a slow finger crosses it in a second, so the circles get fast (about 1.2cm/s at first, 6cm/s and more half a minute in) */
  const t = (now - S.t0) / 1000, lvl = S.lv0 + t / 3.5;
  const sp = S.sp = Math.min(u * 1.9, u * 0.22 * Math.pow(1.2, lvl) * S.boost) * Math.min(1, t / 1.2);
  const G = Math.max(0.5, 0.9 - lvl * 0.035);   /* seconds a finger may be off its circle */
  cs.forEach(c => {
    c.r += (c.rt - c.r) * Math.min(1, dt * 5);
    if (c.fastT && now > c.fastT) { c.fast = 1; c.fastT = 0; }
    if (c.wp && now >= c.wp.at) {
      c.x = c.wp.x; c.y = c.wp.y; c.wp = null; c.grace = 0.95; c.slow = now + 900; c.a = Math.random() * 6.283;
      SE.play('twWarp');
    }
    if (c.mode === 'wander') {
      c.turn = Math.max(-2.4, Math.min(2.4, (c.turn + (Math.random() - 0.5) * dt * 10) * Math.pow(0.6, dt)));
      let vx = Math.cos(c.a), vy = Math.sin(c.a);
      cs.forEach(o => {
        if (o === c) return;
        const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy) || 1, R = c.r + o.r + 70;
        if (d < R) { const k = (1 - d / R) * 2.4; vx += dx / d * k; vy += dy / d * k; }
      });
      const m = Math.min(80, 30 + sp * 0.12), l = c.x - c.r - TW_PAD, r = W - c.r - TW_PAD - c.x, tp = c.y - c.r - TW_TOP, bt = H - c.r - TW_PAD - c.y;
      if (l < m) vx += (1 - l / m) * 1.8; if (r < m) vx -= (1 - r / m) * 1.8;
      if (tp < m) vy += (1 - tp / m) * 1.8; if (bt < m) vy -= (1 - bt / m) * 1.8;
      c.a = Math.atan2(vy, vx) + c.turn * dt;
      const v = sp * c.fast * (c.slow > now ? 0.3 : 1);
      c.x += Math.cos(c.a) * v * dt; c.y += Math.sin(c.a) * v * dt;
    } else if (c.mode === 'arc') {
      /* 入れかえ: half a turn around the point between the two */
      const s = Math.max(0, Math.min(1, (now - c.m0) / c.md)), th = c.th * slEaseIO(s);
      c.x = c.cx + Math.cos(c.a0 + th) * c.cr; c.y = c.cy + Math.sin(c.a0 + th) * c.cr;
      if (s >= 1) { c.mode = 'wander'; c.a = c.a0 + c.th + Math.sign(c.th) * Math.PI / 2; c.turn = 0; }
    } else if (c.mode === 'orbit') {
      /* ぐるぐる: everyone lines up on a ring and the ring turns */
      const s = Math.max(0, Math.min(1, (now - c.m0) / c.md)), e = slEaseOut(Math.min(1, s * 3));
      const rho = c.q0 + (0.82 - c.q0) * e, ph = c.f0 + (c.f1 - c.f0) * e + c.th * slEaseIO(s);
      const ax = W / 2 - c.r - TW_PAD - 2, ay = (H - TW_TOP - TW_PAD) / 2 - c.r - 2;
      c.x = W / 2 + Math.cos(ph) * rho * ax; c.y = (H + TW_TOP - TW_PAD) / 2 + Math.sin(ph) * rho * ay;
      if (s >= 1) { c.mode = 'wander'; c.a = ph + Math.sign(c.th) * Math.PI / 2; c.turn = 0; }
    }
  });
  /* nobody overlaps, nobody leaves the arena */
  for (let i = 0; i < cs.length; i++) for (let k = i + 1; k < cs.length; k++) {
    const a = cs[i], b = cs[k];
    if (a.mode !== 'wander' && b.mode !== 'wander') continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, need = a.r + b.r + 10;
    if (d >= need) continue;
    const push = (need - d) * Math.min(1, dt * 12), fa = a.mode === 'wander' ? (b.mode === 'wander' ? 0.5 : 1) : 0, fb = b.mode === 'wander' ? (a.mode === 'wander' ? 0.5 : 1) : 0;
    a.x -= dx / d * push * fa; a.y -= dy / d * push * fa; b.x += dx / d * push * fb; b.y += dy / d * push * fb;
  }
  cs.forEach(c => {
    const x0 = c.r + TW_PAD, x1 = W - c.r - TW_PAD, y0 = c.r + TW_TOP, y1 = H - c.r - TW_PAD, w = c.mode === 'wander';
    if (c.x < x0) { c.x = x0; if (w && Math.cos(c.a) < 0) c.a = Math.PI - c.a; }
    if (c.x > x1) { c.x = x1; if (w && Math.cos(c.a) > 0) c.a = Math.PI - c.a; }
    if (c.y < y0) { c.y = y0; if (w && Math.sin(c.a) < 0) c.a = -c.a; }
    if (c.y > y1) { c.y = y1; if (w && Math.sin(c.a) > 0) c.a = -c.a; }
  });
  /* events */
  if (!S.ev && t >= S.evAt) twistEvent(now, lvl);
  else if (S.ev && now >= S.ev.end) { S.ev = null; S.evAt = t + Math.max(1.9, 3.8 - lvl * 0.2); $('twA').classList.remove('spin'); }
  /* the gauge: it drains while the finger is off, and fills again quickly when the finger is back */
  let out = null;
  cs.forEach(c => {
    if (c.grace > 0) { c.grace -= dt; if (c.held) c.grace = 0; }
    c.warn = !c.held && c.grace <= 0;
    if (c.held || c.grace > 0) c.life = Math.min(1, c.life + dt * 3);
    else { c.life -= dt / G; if (c.life <= 0 && (!out || c.life < out.life)) out = c; }
  });
  if (cs.some(c => c.warn) && now >= S.warnAt) { SE.play('twWarn'); S.warnAt = now + 170; }
  if (now >= S.tickAt) { SE.play(S.tickK++ % 2 ? 'twTock' : 'twTick'); S.tickAt = now + Math.max(190, 520 - lvl * 32); }
  const hud = t.toFixed(1);
  if (hud !== S.hud) { S.hud = hud; $('twTime').textContent = hud; const lv = S.rounds[S.ri].label ? S.rounds[S.ri].label + ' LV.' : 'LV.'; $('twLv').textContent = lv + (Math.floor(lvl - S.lv0) + 1); }
  if (out) twistOut(out, now);
}
function twistEvent(now, lvl) {
  const T = tool, S = T.tw, cs = S.cs, n = cs.length, W = S.W, H = S.H, A = $('twA');
  let pool = ['swap', 'speed', 'spin'];
  if (S.evN >= 1) pool.push('shrink', 'warp');
  if (S.evN >= 2) pool.push('pick', 'warp');
  pool = pool.filter(k => k !== S.lastEv && !(k === 'shrink' && S.shr >= 3) && !(k === 'speed' && S.spd >= 4));
  const k = S.evN === 0 ? 'swap' : pool[rint(0, pool.length - 1)];
  S.evN++; S.lastEv = k;
  let dur = 900, text = TW_EV[k];
  if (k === 'speed') { S.boost *= 1.3; S.spd++; }
  else if (k === 'shrink') { cs.forEach(c => { c.rt = Math.max(22, c.rt * 0.82); }); S.shr++; }
  else if (k === 'swap') {
    const order = shuffle(cs.filter(c => c.mode === 'wander' && !c.wp)), pairs = [];
    if (order.length >= 2) pairs.push([order[0], order[1]]);
    if (order.length >= 4 && S.evN > 1) pairs.push([order[2], order[3]]);
    pairs.forEach(([a, b]) => {
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, cr = Math.hypot(a.x - b.x, a.y - b.y) / 2, dir = Math.random() < 0.5 ? 1 : -1;
      const md = Math.max(1100, Math.min(2600, Math.PI * cr / Math.max(150, S.sp * 2.4) * 1000));
      [a, b].forEach(c => { c.mode = 'arc'; c.cx = cx; c.cy = cy; c.cr = cr; c.a0 = Math.atan2(c.y - cy, c.x - cx); c.th = dir * Math.PI; c.m0 = now + 450; c.md = md; });
      dur = Math.max(dur, md + 450);
    });
  } else if (k === 'spin') {
    const dir = Math.random() < 0.5 ? 1 : -1, md = Math.max(1800, Math.min(4200, 400000 / Math.max(1, S.sp * 1.3))), cy = (H + TW_TOP - TW_PAD) / 2;
    const list = cs.filter(c => c.mode === 'wander');
    list.forEach(c => { const ax = W / 2 - c.r - TW_PAD - 2, ay = (H - TW_TOP - TW_PAD) / 2 - c.r - 2, nx = (c.x - W / 2) / ax, ny = (c.y - cy) / ay; c.q0 = Math.min(1, Math.hypot(nx, ny)); c.f0 = Math.atan2(ny, nx); });
    list.sort((a, b) => a.f0 - b.f0);
    /* evenly spaced places on the ring, turned so that nobody has far to go */
    const step = 2 * Math.PI / list.length;
    let sx = 0, sy = 0;
    list.forEach((c, i) => { sx += Math.cos(c.f0 - i * step); sy += Math.sin(c.f0 - i * step); });
    const base = Math.atan2(sy, sx);
    list.forEach((c, i) => {
      let f1 = base + i * step;
      while (f1 - c.f0 > Math.PI) f1 -= 2 * Math.PI;
      while (f1 - c.f0 < -Math.PI) f1 += 2 * Math.PI;
      c.f1 = f1; c.th = dir * Math.PI; c.m0 = now + 450; c.md = md; c.mode = 'orbit'; c.wp = null;
    });
    A.classList.add('spin'); A.style.setProperty('--dir', dir);
    dur = md + 450;
  } else if (k === 'warp') {
    const picks = shuffle(cs.filter(c => c.mode === 'wander')).slice(0, n >= 3 && lvl >= 4 ? 2 : 1), dests = [];
    picks.forEach(c => {
      const x0 = c.r + TW_PAD + 8, x1 = W - c.r - TW_PAD - 8, y0 = c.r + TW_TOP + 8, y1 = H - c.r - TW_PAD - 8;
      let best = null, bd = -1;
      for (let i = 0; i < 40; i++) {
        const x = x0 + Math.random() * (x1 - x0), y = y0 + Math.random() * (y1 - y0);
        let d = Math.hypot(x - c.x, y - c.y) * 0.7;   /* far from where it is now, and clear of the others */
        cs.forEach(o => { if (o !== c) d = Math.min(d, Math.hypot(x - o.x, y - o.y)); });
        dests.forEach(q => { d = Math.min(d, Math.hypot(x - q.x, y - q.y)); });
        if (d > bd) { bd = d; best = { x, y }; }
      }
      dests.push(best);
      c.wp = { x: best.x, y: best.y, at: now + 1150 };
    });
    if (!picks.length) text = TW_EV.speed, S.boost *= 1.15;
    else if (picks.length === 1) text = twWho(picks[0]) + TW_EV.warp;
    dur = 2100;
  } else if (k === 'pick') {
    const c = cs[rint(0, n - 1)];
    c.fast = 1.7; c.fastT = now + 3200;
    text = twWho(c) + TW_EV.pick;
    dur = 3200;
  }
  S.ev = { k, end: now + dur };
  twBanner(text, k);
  SE.play('twEv'); vibrate(25);
}
function twistPaint() {
  const T = tool, S = T.tw, now = performance.now();
  S.cs.forEach(c => {
    const sc = c.r / S.R;
    c.el.style.transform = 'translate3d(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px,0) scale(' + sc.toFixed(3) + ')';
    c.nm.style.transform = 'translate3d(' + c.x.toFixed(1) + 'px,' + (c.y - c.r - 10).toFixed(1) + 'px,0) translate(-50%,-100%)';
    const cls = (c.held ? ' held' : '') + (c.warn && S.phase === 'play' ? ' warn' : '') + (c.grace > 0 ? ' grace' : '') + (c.fastT ? ' pick' : '') + (c.mode === 'arc' ? ' mark' : '') + (c.wp ? ' going' : '') + (c.out ? ' out' : '') + (c.safe ? ' safe' : '');
    if (cls !== c.cls) { c.cls = cls; c.el.className = 'tw-c' + cls; c.nm.className = 'tw-nm' + (c.out ? ' out' : ''); }
    const lf = Math.max(0, Math.round(c.life * 50) / 50);
    if (lf !== c.lf) { c.lf = lf; c.el.style.setProperty('--life', lf); }
    const g = c.wp ? c.wp.x.toFixed(0) + ',' + c.wp.y.toFixed(0) : '';
    if (g !== c.g) { c.g = g; c.gh.className = 'tw-ghost' + (c.wp ? ' on' : ''); if (c.wp) c.gh.style.transform = 'translate3d(' + c.wp.x.toFixed(1) + 'px,' + c.wp.y.toFixed(1) + 'px,0) scale(' + sc.toFixed(3) + ')'; }
  });
}
function twistOut(c, now) {
  const T = tool, S = T.tw, rd = S.rounds[S.ri];
  S.phase = 'over'; S.time = (now - S.t0) / 1000; S.ev = null;
  rd.loser = c.j;
  c.out = true; c.warn = false; c.life = 0;
  S.cs.forEach(o => { o.wp = null; o.fastT = 0; if (o !== c) o.safe = true; });
  const A = $('twA'); A.className = 'tw-arena over';
  SE.play('twOut'); SE.play('buzz'); flash('#e8233f'); shake(false); vibrate([120, 60, 220]);
  const q = relPos(c.el); FXC.burst(q.x, q.y, 60, { speed: 13 });
  twBanner('アウト！', 'out');
  BGM.level(0.2, 0.1);
  S.cs.forEach(o => { const v = $('tlV' + o.j); v.classList.remove('great'); v.textContent = o === c ? 'アウト' : 'セーフ'; v.classList.toggle('bad', o === c); });
  $('toolSub').innerHTML = '<b>' + esc(pname(T.ps[c.j])) + '</b> の指がはなれた！<small>' + S.time.toFixed(1) + '秒</small>';
  toolLater(twistRoundEnd, 1500);
}
function twistRoundEnd() {
  const T = tool, S = T.tw, rd = S.rounds[S.ri], j = rd.loser;
  if (S.ri === S.rounds.length - 1) {
    S.phase = 'done';
    const p = T.ps[j];
    hushBeat('toolOv', 700, () => toolFinish([p], '<b>' + esc(pname(p)) + '</b> の指がはなれた！ ' + amtTxt(T.cups), k => $('tlP' + k)));
    return;
  }
  /* a heat is over: its loser goes on to the final */
  rd.ids.forEach(k => { const el = $('tlP' + k), v = $('tlV' + k); el.classList.remove('now'); el.classList.toggle('safe', k !== j); v.textContent = k === j ? '決勝へ' : 'セーフ'; v.classList.toggle('bad', k === j); });
  S.ri++;
  if (S.ri === 2) {
    S.rounds[2].ids = [S.rounds[0].loser, S.rounds[1].loser];
    S.rounds[2].ids.forEach(k => $('tlP' + k).classList.remove('safe'));
    telop('決勝！<small>' + S.rounds[2].ids.map(k => esc(pname(T.ps[k]))).join(' vs ') + '</small>', 'red', 1700);
  } else telop('Bグループ！', 'white', 1300);
  SE.play('mgRound');
  BGM.level(0.7, 0.4);
  twistRound();
}
TOOLX.twist = {
  force: false,   /* tests: play without a multi-touch screen */
  cant() { return this.force || navigator.maxTouchPoints > 1 ? '' : 'タッチ専用'; },
  setup: twistSetup,
  act() {},
  close(T) { if (T.tw) T.tw.ac.abort(); },
};

/* =====================================================================
   黄金比チャレンジ: スマホがグラス。1人ずつビールを注いで、ビール7：泡3でフチまで注げた人ほど高得点。いちばん低い人の負け。
   かたむけて注ぐ（ビールがグラスの壁をつたう）と泡は少なく、まっすぐ注ぐと泡だらけ。かたむけすぎ・注ぎすぎは こぼれる。
   かたむきは スマホのセンサー（devicemotion）で。センサーが使えないところ（claude.ai のページの中、パソコン）では、指を左右にすべらせてかたむける。
   どちらでも計算は同じ: グラスの座標で、重力の向き g = (sin a, cos a) が変わるだけ
   ===================================================================== */
const PR_TIME = 14, PR_RATE = 0.17;   /* seconds for one pour; glass volumes per second out of the tap */
let prTone = 0;                        /* how full the glass is (the pouring sound rises with it) */
Object.assign(SOUNDS, {
  prPour: (A, t) => { noise(A, t, { d: 0.17, g: 0.1, type: 'bandpass', f: 520 + 1500 * prTone, q: 2.4, a: 0.02 }); tone(A, t, { type: 'sine', f: 250 + 500 * prTone, f2: 290 + 560 * prTone, d: 0.09, g: 0.05 }); },
  prFizz: (A, t) => noise(A, t, { d: 0.3, g: 0.07, type: 'highpass', f: 5200, a: 0.05 }),
  prSpill: (A, t) => { noise(A, t, { d: 0.14, g: 0.26, type: 'bandpass', f: 900, f2: 300, q: 1 }); tone(A, t, { type: 'sine', f: 520, f2: 180, d: 0.1, g: 0.1 }); },
});
['prPour', 'prFizz', 'prSpill'].forEach(k => NO_DUCK.add(k));
/* the foam in what comes out of the tap: 85% into an upright glass, 5% down the wall of a glass tilted 32° or more */
const prFoam = a => { const d = Math.abs(a) * 180 / Math.PI; return d <= 5 ? 0.85 : d >= 32 ? 0.05 : 0.85 - (d - 5) / 27 * 0.8; };
/* the inside of the glass: origin at the middle of the rim, y down */
const prGlass = h => { const at = 0.36 * h, ab = 0.27 * h; return [[-at, 0], [at, 0], [ab, h], [-ab, h]]; };
function prClip(P, gx, gy, c) {   /* the part of a convex polygon at or below the level c (measured along gravity) */
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], da = a[0] * gx + a[1] * gy - c, db = b[0] * gx + b[1] * gy - c;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
const prArea = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
/* the level of the surface of a volume (a fraction of the glass) */
function prLevel(P, gx, gy, vol, full) {
  let lo = Infinity, hi = -Infinity;
  P.forEach(q => { const d = q[0] * gx + q[1] * gy; lo = Math.min(lo, d); hi = Math.max(hi, d); });
  if (vol <= 0) return hi;
  for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (prArea(prClip(P, gx, gy, mid)) / full > vol) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/* the stream: straight down (along g) from the point `ex` on the rim line to the surface, or onto a wall and down the wall */
function prStream(P, gx, gy, cT, ex) {
  const pts = [[ex, 0]], W = [[1, 2], [2, 3], [3, 0]], at = s => [ex + gx * s, gy * s], sT = cT - ex * gx;
  let best = null;
  W.forEach(([i, k], w) => {
    const ax = P[i][0] - ex, ay = P[i][1], dx = P[k][0] - P[i][0], dy = P[k][1] - P[i][1], D = dx * gy - dy * gx;
    if (Math.abs(D) < 1e-9) return;
    const sv = (dx * ay - dy * ax) / D, u = (gx * ay - gy * ax) / D;
    if (sv > 1e-6 && u >= -1e-6 && u <= 1 + 1e-6 && (!best || sv < best.s)) best = { s: sv, w };
  });
  if (!best || sT <= best.s) { pts.push(at(Math.max(0, best ? Math.min(sT, best.s) : sT))); return { pts, wall: false }; }
  let q = at(best.s), w = best.w;
  pts.push(q);
  for (let n = 0; n < 2; n++) {
    const a = P[W[w][0]], b = P[W[w][1]], da = a[0] * gx + a[1] * gy, db = b[0] * gx + b[1] * gy, end = da > db ? a : b, de = Math.max(da, db), dq = q[0] * gx + q[1] * gy;
    if (cT <= de + 1e-6) { const t = de - dq < 1e-6 ? 1 : Math.max(0, Math.min(1, (cT - dq) / (de - dq))); pts.push([q[0] + (end[0] - q[0]) * t, q[1] + (end[1] - q[1]) * t]); break; }
    pts.push(end); q = end;
    if (w !== 1 && (end === P[2] || end === P[3])) w = 1; else break;   /* round the corner onto the bottom */
  }
  return { pts, wall: true };
}
/* where the beer comes in: over the middle of an upright glass, close to the lower wall of a tilted one (that is how the stream gets onto the wall) */
const prEntry = (a, h) => Math.sign(a) * 0.36 * h * Math.min(0.72, Math.abs(a) / 0.6);
const prAsk = () => {   /* iOS asks before a page may read the motion sensor, and only from a tap */
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') return DeviceMotionEvent.requestPermission().then(r => r === 'granted', () => false);
  } catch (_) { return Promise.resolve(false); }
  return Promise.resolve(true);
};
function pourSetup() {
  const T = tool, n = T.ps.length, ac = new AbortController();
  T.res = [];
  const S = T.pr = { phase: 'idle', mode: '', ac, has: false, gx: 0, gy: 0, sgn: 1, a: 0, aT: 0, phi: 0, dphi: 0, B: 0, F: 0, spill: 0, pouring: false, pid: null, drag: null, t0: 0, left: PR_TIME, last: 0,
    drops: [], bubs: [], fx: [], grain: 0, fizz: 0, spAt: 0, W: 0, H: 0, dpr: 1, cv: null, cx: null, font: 'sans-serif', bar: -1, shown: false };
  $('toolStage').innerHTML = '<p class="tl-stake sl-stake">' + TOOL_INFO.pour.stake + ' <b>' + amtTxt(T.cups) + '</b><small>ビール7：泡3で、フチまで注げたら 100点</small></p>' +
    '<div class="sl-ps" style="--cols:' + Math.min(4, n) + ';--n:' + n + '">' + T.ps.map((p, j) => '<div class="cc-row tl-r sl-p" id="tlP' + j + '" style="--p:' + pc(p) + '"><span class="cc-nm">' + esc(pname(p)) + '</span><b class="cc-hand tl-v" id="tlV' + j + '">--</b></div>').join('') + '</div>' +
    '<div class="pr-arena" id="prA"><canvas id="prCv" aria-hidden="true"></canvas><div class="pr-bar" id="prBarBox" hidden><i id="prBar"></i></div>' +
    '<p class="pr-tip" id="prTip"></p><div class="pr-res" id="prRes" hidden></div><button type="button" class="pr-mode" id="prMode" data-tl="mode" hidden></button></div>' +
    '<p class="tm-sub pr-sub" id="toolSub"></p>';
  const A = $('prA'), sig = { signal: ac.signal }, np = { signal: ac.signal, passive: false };
  S.cv = $('prCv'); S.cx = S.cv.getContext('2d');
  S.font = getComputedStyle(document.documentElement).getPropertyValue('--f-display') || 'sans-serif';
  for (let i = 0; i < 16; i++) S.bubs.push({ u: Math.random(), v: Math.random(), r: 1 + Math.random() * 2.2, s: 0.25 + Math.random() * 0.5 });
  /* the motion sensor. iOS reports the opposite sign from Android, so the sign is taken from how the phone is held (upright) when the pour starts */
  window.addEventListener('devicemotion', e => {
    const g = e.accelerationIncludingGravity;
    if (!g || g.x == null || g.y == null) return;
    const o = ((screen.orientation && screen.orientation.angle) || 0) * Math.PI / 180, x = g.x * Math.cos(o) - g.y * Math.sin(o), y = g.x * Math.sin(o) + g.y * Math.cos(o);
    if (!S.has) { S.has = true; S.gx = x; S.gy = y; } else { S.gx += (x - S.gx) * 0.3; S.gy += (y - S.gy) * 0.3; }
  }, sig);
  A.addEventListener('pointerdown', e => {
    if (S.phase !== 'pour' || S.pid != null || e.target.closest('button')) return;
    S.pid = e.pointerId; S.pouring = true; S.drag = { x: e.clientX, a: S.aT };
    try { A.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  }, sig);
  A.addEventListener('pointermove', e => {
    if (e.pointerId !== S.pid || !S.drag || S.mode !== 'touch') return;
    /* the finger drags the body of the glass: to the right, the bottom of the glass swings right */
    S.aT = Math.max(-0.8, Math.min(0.8, S.drag.a - (e.clientX - S.drag.x) / Math.max(120, S.W * 0.5) * 0.95));
  }, sig);
  ['pointerup', 'pointercancel'].forEach(k => A.addEventListener(k, e => { if (e.pointerId === S.pid) { S.pid = null; S.pouring = false; S.drag = null; } }, sig));
  ['touchstart', 'touchmove', 'touchend', 'contextmenu', 'gesturestart', 'dblclick', 'selectstart'].forEach(k => A.addEventListener(k, e => { if (e.cancelable && !e.target.closest('button')) e.preventDefault(); }, np));
  pourTurn();
  S.last = performance.now(); T.raf = requestAnimationFrame(pourFrame);
}
const prTip = h => { const el = $('prTip'); if (el) { el.innerHTML = h; el.hidden = !h; } };
function pourTurn() {
  const T = tool, S = T.pr, i = T.k, p = T.ps[i];
  S.phase = 'ready'; S.B = 0; S.F = 0; S.spill = 0; S.a = 0; S.aT = 0; S.phi = 0; S.dphi = 0; S.pouring = false; S.pid = null; S.drag = null; S.drops = []; S.fx = []; S.left = PR_TIME; S.bar = -1;
  T.ps.forEach((_, j) => { const el = $('tlP' + j); el.classList.toggle('now', j === i); el.classList.toggle('wait', j > i); });
  $('prRes').hidden = true; $('prBarBox').hidden = true; $('prMode').hidden = true;
  prTip('ビールは <b>点線</b>まで、泡は <b>フチ</b>まで');
  $('toolSub').innerHTML = (i ? 'スマホを渡して… ' : '') + '<b>' + esc(pname(p)) + '</b> の番！<small>かたむけて注ぐと 泡は少ない。まっすぐ注ぐと 泡だらけ</small>';
  if (i) SE.play('pass');
  toolActs(TOOL_CLOSE + '<button type="button" class="pbtn big main pulse" data-tl="go">注ぎはじめる！</button>');
}
function pourAct(a) {
  const T = tool, S = T.pr;
  if (a === 'go' && S.phase === 'ready') {
    if (S.mode) { pourBegin(); return; }
    /* the first pour: is there a motion sensor this page may read? (no answer within 0.7s: the finger does the tilting) */
    S.phase = 'check';
    toolActs('', false);
    prTip('センサーを確認中…');
    prAsk().then(ok => {
      if (tool !== T || S.phase !== 'check') return;
      if (!ok) { S.mode = 'touch'; pourBegin(); return; }
      toolLater(() => { if (S.phase !== 'check') return; S.mode = S.has && !TOOLX.pour.touch ? 'tilt' : 'touch'; pourBegin(); }, S.has ? 0 : 700);
    });
  } else if (a === 'done' && S.phase === 'pour') pourDone();
  else if (a === 'next' && S.phase === 'shown') { T.k++; pourTurn(); }
  else if (a === 'mode' && S.has && (S.phase === 'pour' || S.phase === 'hold')) {
    S.mode = S.mode === 'tilt' ? 'touch' : 'tilt';
    S.aT = S.a;
    if (S.mode === 'tilt') S.sgn = S.gy >= 0 ? 1 : -1;
    S.phase = 'pour';
    pourHelp();
  }
}
const prUpright = S => Math.abs(S.gy) > 5.5 && Math.abs(S.gy) > Math.abs(S.gx) * 1.3;
function pourBegin() {
  const T = tool, S = T.pr;
  toolActs('', false);
  if (S.mode === 'tilt' && !prUpright(S)) {
    /* lying on the table: there is no telling which way is up yet */
    S.phase = 'hold';
    prTip('スマホを <b>立てて</b>、グラスみたいに持って！');
    $('prMode').hidden = false; $('prMode').textContent = '指でかたむける';
    return;
  }
  pourStart();
}
function pourHelp() {
  const S = tool.pr, m = $('prMode');
  prTip(S.mode === 'tilt' ? '<b>スマホをかたむけて</b>、押して 注ぐ' : '押して 注ぐ。<b>左右にすべらせて</b> かたむける');
  m.hidden = !S.has || !!TOOLX.pour.touch; m.textContent = S.mode === 'tilt' ? '指でかたむける' : 'スマホをかたむける';
}
function pourStart() {
  const T = tool, S = T.pr;
  S.phase = 'pour'; S.t0 = performance.now(); S.left = PR_TIME;
  if (S.mode === 'tilt') {
    S.sgn = S.gy >= 0 ? 1 : -1;
    /* a tilted phone should not turn the page on its side (this works in the installed app; a browser tab may refuse) */
    try { const o = screen.orientation; if (o && o.lock) { const r = o.lock('portrait'); if (r && r.catch) r.catch(() => {}); } } catch (_) { /* ignore */ }
  }
  $('prBarBox').hidden = false;
  pourHelp();
  $('toolSub').innerHTML = '<b>' + esc(pname(T.ps[T.k])) + '</b> が注いでいる…<small>できたら「完成！」。時間切れでも完成</small>';
  toolActs('<button type="button" class="pbtn big main" data-tl="done">完成！</button>', false);
  SE.play('go');
}
function pourFrame(now) {
  const T = tool;
  if (!T || T.kind !== 'pour') return;
  const S = T.pr, A = $('prA');
  T.raf = 0;
  if (!A || S.phase === 'over') return;
  const dt = Math.min(0.05, Math.max(0, (now - S.last) / 1000));
  S.last = now;
  if (S.phase === 'hold' && prUpright(S)) pourStart();
  /* the tilt */
  if (S.phase === 'judge' || S.phase === 'shown') S.a += (0 - S.a) * Math.min(1, dt * 5);
  else if (S.mode === 'tilt') { if (S.phase === 'pour' && S.gx * S.gx + S.gy * S.gy > 9) S.a += (Math.max(-1.3, Math.min(1.3, Math.atan2(-S.sgn * S.gx, S.sgn * S.gy))) - S.a) * Math.min(1, dt * 16); }
  else S.a += (S.aT - S.a) * Math.min(1, dt * 14);
  /* the surface follows with a little slosh */
  S.dphi += ((S.a - S.phi) * 90 - S.dphi * 10) * dt; S.phi += S.dphi * dt;
  const P = prGlass(1), full = prArea(P);
  if (S.phase === 'pour') {
    S.left = PR_TIME - (now - S.t0) / 1000;
    if (S.pouring) {
      const dv = PR_RATE * dt, f = prFoam(S.a);
      S.B += dv * (1 - f); S.F += dv * f;
      prTone = Math.min(1, S.B + S.F);
      if (now >= S.grain) { SE.play('prPour'); S.grain = now + 105; }
      if (f > 0.45 && now >= S.fizz) { SE.play('prFizz'); S.fizz = now + 280; }
    }
  }
  /* what does not fit under the lower corner of the rim runs over: the foam first */
  const sx = Math.sin(S.phi), sy = Math.cos(S.phi), cap = prArea(prClip(P, sx, sy, 0.36 * Math.abs(sx))) / full, over = S.B + S.F - cap;
  if (over > 1e-5) {
    const fo = Math.min(S.F, over);
    S.F -= fo; S.B = Math.max(0, S.B - (over - fo));
    if (S.phase === 'pour') {
      S.spill += over;
      const side = Math.abs(sx) < 0.03 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(sx);
      for (let k = 0; k < 2; k++) S.drops.push({ x: side * 0.36, y: 0, vx: side * (0.25 + Math.random() * 0.5), vy: -0.2 - Math.random() * 0.3, life: 1, foam: fo > 0, r: 0.012 + Math.random() * 0.016 });
      if (now >= S.spAt) { SE.play('prSpill'); vibrate(15); S.spAt = now + 260; }
    }
  }
  S.drops.forEach(d => { d.vx += Math.sin(S.a) * 3.2 * dt; d.vy += Math.cos(S.a) * 3.2 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt * 1.1; });
  S.drops = S.drops.filter(d => d.life > 0);
  if (S.phase === 'pour') {
    const k = Math.max(0, Math.round(S.left / PR_TIME * 200));
    if (k !== S.bar) { S.bar = k; const b = $('prBar'); b.style.transform = 'scaleX(' + (k / 200) + ')'; b.classList.toggle('hurry', S.left < 4); }
    if (S.left <= 0) pourDone();
  }
  pourDraw(now);
  T.raf = requestAnimationFrame(pourFrame);
}
function pourDraw(now) {
  const T = tool, S = T.pr, cv = S.cv, cx = S.cx, A = $('prA');
  const W = A.clientWidth, H = A.clientHeight, dpr = Math.min(2.5, window.devicePixelRatio || 1);
  if (!W || !H) return;
  if (W !== S.W || H !== S.H || dpr !== S.dpr) { S.W = W; S.H = H; S.dpr = dpr; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const touch = S.mode !== 'tilt', INK = '#150733';
  /* the finger tilts a glass drawn on the screen, so it needs room to swing; a tilted phone IS the glass, so the glass is as big as it can be */
  const h = Math.min((H - 50) * (touch ? 0.56 : 0.66), W * (touch ? 0.56 : 0.9)), oy = touch ? (H - 50) * 0.38 : (H - 50) * 0.27;
  const P = prGlass(h), full = prArea(P), a = S.a, gx = Math.sin(a), gy = Math.cos(a), sx = Math.sin(S.phi), sy = Math.cos(S.phi);
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.clearRect(0, 0, W, H);
  /* the tilted glass swings out to one side: the picture slides back so that glass and tap both stay on the screen */
  const ex = prEntry(a, h), ox = W / 2 - (touch ? 0.6 * (-ex * Math.cos(a) - 0.5 * h * Math.sin(a)) : 0);
  cx.translate(ox, oy);
  if (touch) { cx.rotate(a); cx.translate(-ex, 0); }
  cx.lineJoin = 'round'; cx.lineCap = 'round';
  const path = Q => { cx.beginPath(); Q.forEach((q, i) => (i ? cx.lineTo(q[0], q[1]) : cx.moveTo(q[0], q[1]))); cx.closePath(); };
  const tot = S.B + S.F, cT = prLevel(P, sx, sy, tot, full), cB = prLevel(P, sx, sy, S.B, full);
  /* the handle (behind the glass) */
  cx.beginPath(); cx.moveTo(0.33 * h, 0.2 * h); cx.bezierCurveTo(0.66 * h, 0.14 * h, 0.66 * h, 0.72 * h, 0.29 * h, 0.66 * h);
  cx.strokeStyle = INK; cx.lineWidth = h * 0.085; cx.stroke(); cx.strokeStyle = 'rgba(214,232,255,.55)'; cx.lineWidth = h * 0.045; cx.stroke();
  /* the glass, then what is in it */
  path(P); cx.fillStyle = 'rgba(255,255,255,.1)'; cx.fill();
  /* a full, level glass: the foam stands a little above the rim */
  const dome = S.F > 0.02 && tot > 0.93 && Math.abs(S.phi) < 0.14 ? Math.min(1, (tot - 0.93) / 0.05) : 0;
  if (dome) { cx.fillStyle = '#fff6dc'; for (let k = 0; k <= 8; k++) { const u = k / 8, r = h * (0.05 + 0.05 * Math.sin(Math.PI * u) + 0.008 * Math.sin(k * 2.4 + now / 420)) * dome; cx.beginPath(); cx.arc((u * 2 - 1) * 0.3 * h, h * 0.012 - r * 0.25, r, 0, 6.283); cx.fill(); } }
  cx.save(); path(P); cx.clip();
  if (tot > 0.0005) {
    path(prClip(P, sx, sy, cT)); cx.fillStyle = '#fff6dc'; cx.fill();
    if (S.F > 0.004) {
      /* the bubbly top of the foam */
      const top = prClip(P, sx, sy, cT).filter(q => Math.abs(q[0] * sx + q[1] * sy - cT) < 0.5);
      if (top.length >= 2) {
        const p0 = top[0], p1 = top[top.length - 1], len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), nb = Math.max(3, Math.round(len / (h * 0.085))), rise = Math.min(1, S.F * 14);
        cx.fillStyle = '#fff6dc';
        for (let k = 0; k <= nb; k++) { const u = k / nb, r = h * (0.034 + 0.012 * Math.sin(k * 2.4 + now / 420)) * rise; cx.beginPath(); cx.arc(p0[0] + (p1[0] - p0[0]) * u - sx * r * 0.2, p0[1] + (p1[1] - p0[1]) * u - sy * r * 0.2, r, 0, 6.283); cx.fill(); }
      }
    }
    if (S.B > 0.0005) {
      const beer = prClip(P, sx, sy, cB), lg = cx.createLinearGradient(sx * cB, sy * cB, sx * (cB + h * 0.9), sy * (cB + h * 0.9));
      lg.addColorStop(0, '#ffd04a'); lg.addColorStop(0.5, '#f9a80f'); lg.addColorStop(1, '#d97a00');
      path(beer); cx.fillStyle = lg; cx.fill();
      /* bubbles rising */
      cx.fillStyle = 'rgba(255,255,255,.75)';
      S.bubs.forEach(b => {
        b.v -= b.s * 0.011; if (b.v < 0) { b.v = 1; b.u = Math.random(); }
        const y = h * (0.12 + 0.86 * b.v), half = 0.36 * h - (0.09 * h) * (y / h) - 4, x = (b.u * 2 - 1) * half;
        if (x * sx + y * sy > cB + 3) { cx.beginPath(); cx.arc(x, y, b.r, 0, 6.283); cx.fill(); }
      });
      /* the line where the foam sits on the beer */
      if (S.F > 0.004) { const e = beer.filter(q => Math.abs(q[0] * sx + q[1] * sy - cB) < 0.5); if (e.length >= 2) { cx.beginPath(); cx.moveTo(e[0][0], e[0][1]); cx.lineTo(e[e.length - 1][0], e[e.length - 1][1]); cx.strokeStyle = 'rgba(255,246,220,.9)'; cx.lineWidth = 3; cx.stroke(); } }
    }
  }
  /* the stream */
  if (S.pouring && S.phase === 'pour') {
    const st = prStream(P, gx, gy, prLevel(P, gx, gy, tot, full), ex), wob = Math.sin(now / 38) * 0.8;
    cx.beginPath(); st.pts.forEach((q, i) => (i ? cx.lineTo(q[0] + (i === 1 ? wob : 0), q[1]) : cx.moveTo(q[0], q[1])));
    cx.strokeStyle = '#f7a50c'; cx.lineWidth = h * 0.05; cx.stroke(); cx.strokeStyle = 'rgba(255,240,190,.9)'; cx.lineWidth = h * 0.016; cx.stroke();
    const e = st.pts[st.pts.length - 1];
    if (now >= (S.fxAt || 0)) { S.fxAt = now + (st.wall ? 90 : 30); S.fx.push({ x: e[0], y: e[1], vx: (Math.random() - 0.5) * h * (st.wall ? 0.3 : 1), vy: -Math.random() * h * (st.wall ? 0.2 : 0.8), life: 1, r: h * (0.012 + Math.random() * 0.018) }); }
  }
  cx.fillStyle = '#fff6dc';
  S.fx.forEach(f => { f.vx *= 0.96; f.vy += h * 0.05; f.x += f.vx / 60; f.y += f.vy / 60; f.life -= 0.05; if (f.life > 0) { cx.globalAlpha = f.life; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.283); cx.fill(); } });
  cx.globalAlpha = 1;
  S.fx = S.fx.filter(f => f.life > 0);
  cx.restore();
  /* the marks: beer up to the dotted line, foam up to the rim */
  const y7 = prLevel(P, 0, 1, 0.7, full), half7 = 0.36 * h - 0.09 * y7;
  cx.setLineDash([h * 0.03, h * 0.03]); cx.beginPath(); cx.moveTo(-half7 + 5, y7); cx.lineTo(half7 - 5, y7); cx.strokeStyle = 'rgba(255,255,255,.85)'; cx.lineWidth = 2.5; cx.stroke(); cx.setLineDash([]);
  /* the glass itself: thick walls, a heavy bottom, a streak of light */
  cx.beginPath(); cx.moveTo(P[0][0], P[0][1]); cx.lineTo(P[3][0], P[3][1]); cx.lineTo(P[2][0], P[2][1]); cx.lineTo(P[1][0], P[1][1]);
  cx.strokeStyle = INK; cx.lineWidth = h * 0.045; cx.stroke(); cx.strokeStyle = 'rgba(226,240,255,.8)'; cx.lineWidth = h * 0.018; cx.stroke();
  cx.beginPath(); cx.moveTo(P[3][0], h + h * 0.03); cx.lineTo(P[2][0], h + h * 0.03); cx.strokeStyle = INK; cx.lineWidth = h * 0.085; cx.stroke(); cx.strokeStyle = 'rgba(226,240,255,.7)'; cx.lineWidth = h * 0.05; cx.stroke();
  cx.beginPath(); cx.moveTo(-0.27 * h, 0.1 * h); cx.lineTo(-0.2 * h, 0.82 * h); cx.strokeStyle = 'rgba(255,255,255,.3)'; cx.lineWidth = h * 0.03; cx.stroke();
  /* labels beside the marks */
  const fs = Math.max(10, Math.min(14, h * 0.05)), lab = (t, y, col) => {
    cx.font = '800 ' + fs + 'px ' + S.font; const w = cx.measureText(t).width + fs, x = -0.36 * h + 0.09 * y - h * 0.05;
    cx.fillStyle = INK; cx.beginPath(); cx.roundRect(x - w, y - fs * 0.85, w, fs * 1.7, fs * 0.85); cx.fill();
    cx.fillStyle = col; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(t, x - w / 2, y + 1);
  };
  if (S.phase !== 'judge' && S.phase !== 'shown') { lab('ビール', y7, '#ffd04a'); lab('泡', h * 0.035, '#fff6dc'); }
  /* what ran over the rim */
  S.drops.forEach(d => { cx.globalAlpha = Math.min(1, d.life * 1.6); cx.fillStyle = d.foam ? '#fff6dc' : '#f9a80f'; cx.beginPath(); cx.arc(d.x * h, d.y * h, d.r * h, 0, 6.283); cx.fill(); });
  cx.globalAlpha = 1;
  /* the tap hangs straight down over the middle of the rim, however the glass is held */
  if (S.phase === 'judge' || S.phase === 'shown') return;
  cx.translate(ex, 0); cx.rotate(-a);
  const th = h * 0.2, tw = h * 0.11, on = S.pouring && S.phase === 'pour';
  cx.fillStyle = INK; cx.beginPath(); cx.roundRect(-tw * 0.5 - 3, -th - h * 0.5, tw + 6, h * 0.5 - h * 0.02 + 3, 6); cx.fill();
  const tg = cx.createLinearGradient(-tw / 2, 0, tw / 2, 0); tg.addColorStop(0, '#8d97a8'); tg.addColorStop(0.35, '#f4f7fb'); tg.addColorStop(1, '#6d7686');
  cx.fillStyle = tg; cx.beginPath(); cx.roundRect(-tw * 0.5, -th - h * 0.5, tw, h * 0.5 - h * 0.02, 4); cx.fill();
  cx.fillStyle = INK; cx.beginPath(); cx.roundRect(-tw * 0.34 - 3, -th - h * 0.03, tw * 0.68 + 6, h * 0.075 + 3, 4); cx.fill();
  cx.fillStyle = '#c9d0db'; cx.beginPath(); cx.roundRect(-tw * 0.34, -th - h * 0.03, tw * 0.68, h * 0.075, 3); cx.fill();
  /* the lever: pulled forward while the beer runs */
  cx.save(); cx.translate(tw * 0.5, -th - h * 0.2); cx.rotate(on ? 0.9 : 0.25);
  cx.fillStyle = INK; cx.beginPath(); cx.roundRect(-3, -h * 0.02 - 3, h * 0.2 + 6, h * 0.04 + 6, 8); cx.fill();
  cx.fillStyle = on ? '#ffd83d' : '#ff4fa3'; cx.beginPath(); cx.roundRect(0, -h * 0.02, h * 0.2, h * 0.04, 6); cx.fill();
  cx.restore();
  if (on) { cx.beginPath(); cx.moveTo(0, -th + h * 0.045); cx.lineTo(0, 0); cx.strokeStyle = '#f7a50c'; cx.lineWidth = h * 0.05; cx.stroke(); cx.strokeStyle = 'rgba(255,240,190,.9)'; cx.lineWidth = h * 0.016; cx.stroke(); }
}
function pourDone() {
  const T = tool, S = T.pr;
  if (S.phase !== 'pour') return;
  S.phase = 'judge'; S.pouring = false; S.pid = null; S.drag = null;
  toolActs('', false);
  $('prBarBox').hidden = true; $('prMode').hidden = true;
  prTip('');
  $('toolSub').innerHTML = '判定中…<small>ビール7：泡3 にどれだけ近い？</small>';
  SE.play('swDrum'); BGM.level(0.25, 0.2);
  toolLater(pourScore, 1500);
}
/* 100 points for beer 7 : foam 3 up to the rim with nothing spilled */
function prScore(B, F, spill) {
  const tot = B + F, ratio = tot > 0.001 ? F / tot : 0;
  const rp = tot > 0.001 ? Math.min(60, Math.abs(ratio - 0.3) * 220) : 60, fp = Math.min(45, Math.max(0, 0.97 - tot) * 130), sp = Math.min(35, spill * 160);
  return { score: Math.max(0, Math.round((100 - rp - fp - sp) * 10) / 10), ratio, tot, rp, fp, sp };
}
function pourScore() {
  const T = tool, S = T.pr, i = T.k, R = prScore(S.B, S.F, S.spill), sc = R.score;
  const word = sc >= 95 ? '黄金比！！' : sc >= 85 ? 'プロの一杯！' : sc >= 70 ? 'うまい！' : sc >= 50 ? 'まあまあ' :
    R.tot < 0.05 ? 'からっぽ…' : R.sp >= Math.max(R.rp, R.fp) ? 'こぼしすぎ！' : R.fp >= R.rp ? '少なすぎ！' : R.ratio > 0.3 ? '泡だらけ！' : '泡がない…';
  const cls = sc >= 85 ? 'great' : sc >= 50 ? '' : 'bad';
  T.res[i] = sc;
  const res = $('prRes');
  res.className = 'pr-res ' + cls;
  res.innerHTML = '<b class="pr-pt"><span id="prPt">0</span><small>点</small></b><div class="pr-side"><em class="pr-word" id="prWord"></em>' +
    '<p class="pr-bd">ビール <b>' + ((1 - R.ratio) * 10).toFixed(1) + '</b>：泡 <b>' + (R.ratio * 10).toFixed(1) + '</b><br>量 <b>' + Math.round(Math.min(1, R.tot) * 100) + '%</b>　こぼした <b>' + Math.round(Math.min(9.99, S.spill) * 100) + '%</b></p></div>';
  res.hidden = false;
  const steps = 22;
  for (let k = 1; k <= steps; k++) toolLater(() => { const e = $('prPt'); if (e) e.textContent = (sc * k / steps).toFixed(1); if (k % 2) SE.play('coin'); }, k * 45);
  toolLater(() => {
    S.phase = 'shown';
    $('prWord').textContent = word; res.classList.add('in');
    const v = $('tlV' + i); v.textContent = sc.toFixed(1); v.classList.toggle('great', sc >= 85); v.classList.toggle('bad', sc < 50); tmPop(v);
    BGM.level(0.7, 0.4);
    const q = relPos(res);
    if (sc >= 95) { SE.play('fanfare'); flash('#ffd83d'); FXC.burst(q.x, q.y, 120, { colors: GOLD, star: true, speed: 15 }); FXC.rain(100, GOLD); vibrate([60, 40, 60, 40, 160]); }
    else if (sc >= 85) { SE.play('ding'); SE.play('heaven'); FXC.burst(q.x, q.y, 60, { colors: GOLD, star: true, speed: 12 }); }
    else if (sc >= 50) SE.play('ding');
    else { SE.play('bubuu'); shake(false); }
    $('toolSub').innerHTML = '<b>' + esc(pname(T.ps[i])) + '</b> は ' + sc.toFixed(1) + '点！<small>' + word + '</small>';
    if (i + 1 < T.ps.length) toolActs('<button type="button" class="pbtn big main" data-tl="next">つぎは ' + esc(pname(T.ps[i + 1])) + '！</button>', false);
    else toolLater(pourFinish, 2000);
  }, steps * 45 + 260);
}
function pourFinish() {
  const T = tool, S = T.pr;
  S.phase = 'over';
  T.ps.forEach((_, j) => $('tlP' + j).classList.remove('now', 'wait'));
  const min = Math.min(...T.res), losers = T.ps.filter((_, j) => T.res[j] === min);
  hushBeat('toolOv', 700, () => toolFinish(losers, loseLine(T, losers, '同じ ' + min.toFixed(1) + '点！'), j => $('tlP' + j)));
}
TOOLX.pour = {
  touch: false,   /* tests: never use the motion sensor */
  setup: pourSetup,
  act: pourAct,
  close(T) {
    if (T.pr) T.pr.ac.abort();
    try { const o = screen.orientation; if (T.pr && T.pr.mode === 'tilt' && o && o.unlock) o.unlock(); } catch (_) { /* ignore */ }
  },
};

/* 遊び方: the premium mini games get a card on the ミニゲーム page */
if (PLUS_OPEN) {
  const g = GUIDE.find(x => x.k === 'games');
  if (g) {
    const base = g.html;
    g.html = () => base() + gCard('プレミアムのミニゲーム', '<p><b>ミニゲームモード</b>の一覧で <b>NEW</b> がついているゲームです。ルーレットで当たるか、一覧からタップして選びます。</p>' +
      '<p><b>酒スロ</b>：1人ずつスロットを回して、出た枚数がいちばん少ない人の負け。レバー → ボタン3つで止めます。ランプの色（青 → 緑 → 赤 → 虹）・リーチ・カットインが出るほど大当たりのチャンス。<b>「酒」が3つそろうと、その人以外の全員が負け</b>。2人なら3回、3人なら2回ずつ回せて、最下位が同じ枚数ならサドンデス。</p>' +
      '<p><b>指ツイスター</b>：スマホをテーブルに置いて、全員が自分の色の丸に指を1本。丸は動き、入れかわり、ワープします。指がはなれたまま、まわりのゲージが空になった人の負け。6人からは2組に分かれて、負けた2人で決勝。<span class="sub">指を同時に置くので、タッチ画面の端末だけ。</span></p>' +
      '<p><b>黄金比チャレンジ</b>：スマホがグラス。1人ずつビールを注いで、<b>ビール7：泡3</b>でフチまで注げた人ほど高得点。いちばん低い人の負け。かたむけて注ぐと泡は少なく、まっすぐ注ぐと泡だらけ。かたむけすぎ・注ぎすぎは、こぼれて減点。スマホをかたむけるか、指を左右にすべらせます。</p><div class="gd-rows">' +
      [['爆弾解除', '爆弾のコードを1本えらんで「切る！」。ハズレを切った人の負け'], ['21ゲーム', '数を1〜3個ずつ進めて、「21」を言った人の負け。ときどきイベント（リバース・パス・もう1回・ご指名・もどる・ワープ）で順番や数が変わるので、数えて誰かをはめることはできません'], ['メモリーリレー', '8つのボタンが光った順番どおりにタップ。1人ごとに1つ増えて、スピードも1.1倍ずつ速くなる。まちがえた人の負け']]
        .map(([a, b]) => '<span class="gd-chip plain">' + a + '</span><span>' + b + '</span>').join('') + '</div>' +
      gTip('酒スロの結果は、レバーを引いた瞬間に決まっています（本物のパチスロと同じ）。ボタンは好きなタイミングで押してOK。'));
  }
}
