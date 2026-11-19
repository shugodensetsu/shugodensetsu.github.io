
/* =====================================================================
   新しいパーティーモード（プレミアム）: ニセ画伯・大喜利グランプリ・しれっとミッション・ウソかホントか
   どれもスマホ1台。PM_MODES の仲間として、暴露トークと同じ画面（mgBoard + mgStage + dock）で動く。
   ボタンは data-g="x-…" → PMX[mode].act('…')
   ===================================================================== */
PM_MODES.push('gaka', 'reply', 'mission', 'uso');
Object.assign(PM, {
  gaka: { title: 'ニセ画伯', word: '回', opt: 'gaka', optHead: 'お題のむずかしさ', min: 3, flat: true,
    opts: [['easy', 'かんたん', '描きやすいお題'], ['all', 'ミックス', 'ひねったお題も']] },
  reply: { title: '大喜利グランプリ', word: '問', opt: 'reply', optHead: 'お題のジャンル', min: 4, flat: true,
    opts: [['all', 'ミックス', 'いろんなお題'], ['safe', 'ふつう', '恋愛ネタなし'], ['koi', '恋愛', '恋のお題だけ']] },
  mission: { title: 'しれっとミッション', word: '回', opt: 'mission', optHead: 'ミッションのむずかしさ', min: 3,
    opts: [['easy', 'かんたん', 'はじめての人むけ'], ['all', 'ミックス', 'むずかしいのも']] },
  uso: { title: 'ウソかホントか', word: '話', opt: 'uso', optHead: 'お題のジャンル', min: 2,
    opts: [['mix', 'ミックス', 'いろいろ'], ['light', 'かるめ', '初対面でもOK'], ['deep', 'ふかめ', '恥ずかしい話も']] },
});

/* ---------- shared pieces ---------- */
const pxHead = () => '<p class="mg-head ol">' + pmRound() + '</p>';
const pxSave = anim => { saveGame(); renderPM(anim); };
const pxBtn = (a, label, cls, extra) => '<button type="button" class="pbtn ' + (cls || 'big main') + '" data-g="x-' + a + '"' + (extra || '') + '>' + label + '</button>';
const pxRow = h => '<div class="dock-row">' + h + '</div>';
const pxChips = (ps, sel, act, label) => '<div class="pm-chips' + (ps.length > 4 ? ' two' : '') + '">' + ps.map(i => {
  const on = Array.isArray(sel) ? sel.includes(i) : sel === i;
  return '<button type="button" class="pm-chip' + (on ? ' sel' : '') + '" data-g="x-' + act + '" data-p="' + i + '" aria-pressed="' + on + '" style="--p:' + pc(i) + '">' + esc(pname(i)) + (on && label ? '<i>' + label + '</i>' : '') + '</button>';
}).join('') + '</div>';
const pxAll = () => G.players.map((_, i) => i);
const pxOthers = p => pxAll().filter(i => i !== p);
const pxP = el => { const p = Number(el && el.dataset.p); return Number.isInteger(p) && p >= 0 && p < G.players.length ? p : null; };
const pxLock = () => (pmLocked() ? pmLockHTML() : '');
const pxCups = ps => ps.map(p => ({ p, amt: 1 }));
let pxBusy = false;
const pxLater = (fn, ms) => { pxBusy = true; const g = G; setTimeout(() => { pxBusy = false; if (G === g && screen === 'game') fn(); }, reduceMotion ? Math.min(ms, 200) : ms); };

/* こっそり見る: the phone goes round, one person at a time. cur.peek = { ps: [players], at, open } */
function pxPeekStart(ps) { G.cur.peek = { ps: ps.slice(), at: 0, open: false }; }
const pxPeekWho = () => { const k = G.cur.peek; return k ? k.ps[k.at] : null; };
function pxPeekCover(note) {
  const k = G.cur.peek, p = pxPeekWho();
  return '<div class="pm-big px-pass"><p class="px-step">' + (k.ps.length > 1 ? (k.at + 1) + ' / ' + k.ps.length + '人目' : 'ひとりだけ見る') + '</p>' +
    '<p class="px-to"><span class="px-phone" aria-hidden="true"></span>' + pmName(p) + ' に<br>スマホを渡して</p>' +
    '<p class="pm-note">' + (note || 'ほかの人は画面を見ないでね') + '</p></div>';
}
const pxPeekOpenBtn = () => pxRow(pxBtn('peekopen', esc(pname(pxPeekWho())) + 'です。見る！', 'big main pulse'));
/* returns true when the action was the peek's */
function pxPeekAct(a, done, anim) {
  const cur = G.cur, k = cur.peek;
  if (!k) return false;
  if (a === 'peekopen') { if (k.open) return true; k.open = true; SE.play('flip'); vibrate(15); pxSave(anim || 'peek'); return true; }
  if (a === 'peeknext') {
    if (!k.open) return true;
    k.open = false; k.at++;
    if (k.at >= k.ps.length) { delete cur.peek; done(); return true; }
    SE.play('swoosh'); pxSave('pass');
    return true;
  }
  return false;
}
const pxPeekNextBtn = (last, label) => pxBtn('peeknext', label || (G.cur.peek.at + 1 >= G.cur.peek.ps.length ? last : '見た！ 次の人へ ▶'), 'big main');

/* a countdown drawn from cur.t0 (so it survives a reload) */
let pxTimer = 0;
function pxClock(secs, onTick) {
  clearInterval(pxTimer);
  const cur = G.cur;
  const step = () => {
    if (!G || G.cur !== cur || !cur.t0 || screen !== 'game') { clearInterval(pxTimer); return; }
    const left = Math.max(0, Math.ceil(secs - (Date.now() - cur.t0) / 1000));
    onTick(left);
    if (left <= 0) clearInterval(pxTimer);
  };
  step();
  pxTimer = setInterval(step, 250);
}

/* =====================================================================
   ニセ画伯: 1人だけお題を知らない。1人1筆ずつ2周描いて、せーのでニセ画伯を指さし
   ===================================================================== */
const GK_LAPS = 2;
const GK_WORDS = [
  ['食べ物', 1, 'ラーメン おにぎり たこ焼き ハンバーガー ソフトクリーム すし ピザ ショートケーキ 目玉焼き バナナ スイカ ぎょうざ カレーライス ドーナツ えだまめ'],
  ['動物', 1, 'ネコ ゾウ キリン ペンギン ウサギ タコ カメ パンダ ライオン ヘビ ニワトリ イルカ カタツムリ クマ'],
  ['乗り物', 1, '自転車 新幹線 飛行機 船 救急車 ロケット 気球 パトカー'],
  ['身の回りのもの', 1, 'スマホ 傘 めがね 時計 ハサミ くつ 歯ブラシ 電球 鍵 ドライヤー'],
  ['場所・建物', 1, '東京タワー 富士山 学校 コンビニ 観覧車 神社 お城'],
  ['季節・行事', 1, '雪だるま 花火 クリスマスツリー こいのぼり お月見 サンタクロース'],
  ['自然', 1, '虹 雷 火山 太陽 ヤシの木 キノコ'],
  ['スポーツ・遊び', 1, 'サッカー ボウリング 野球 スキー けん玉 すべり台'],
  ['職業', 2, '美容師 消防士 漫画家 寿司職人 宇宙飛行士 警察官 マジシャン 歯医者さん'],
  ['世界の名所', 2, '自由の女神 ピラミッド モアイ 大仏 エッフェル塔 万里の長城'],
  ['気持ち・できごと', 2, '寝坊 くしゃみ 筋トレ 二日酔い 失恋 合格 迷子 満員電車'],
  ['飲み会', 2, '乾杯 生ビール 焼き鳥 カラオケ 終電 割り勘 二次会 お通し'],
  ['昔話・物語', 2, '桃太郎 浦島太郎 かぐや姫 シンデレラ 人魚姫 赤ずきん'],
  ['家電', 2, '洗濯機 冷蔵庫 掃除機 電子レンジ エアコン 扇風機'],
].flatMap(([g, lv, ws], gi) => ws.split(' ').map((w, j) => ({ id: (gi + 1) * 100 + j, g, lv, w })));
const GK_BY_ID = new Map(GK_WORDS.map(w => [w.id, w]));
const gkPool = o => GK_WORDS.filter(w => w.lv === 1 || o === 'all');
const PALETTE_SVG = '<svg class="gk-art" viewBox="0 0 120 100" aria-hidden="true"><path d="M60 8C30 8 8 27 8 52s19 40 38 40c9 0 11-7 9-14-2-8 3-14 11-14h15c18 0 31-12 31-29C112 20 89 8 60 8Z" fill="#fff3d6" stroke="#150733" stroke-width="4" stroke-linejoin="round"/><circle cx="34" cy="46" r="8" fill="#ff4fa3" stroke="#150733" stroke-width="2.5"/><circle cx="52" cy="26" r="8" fill="#35e0ff" stroke="#150733" stroke-width="2.5"/><circle cx="78" cy="26" r="8" fill="#ffd83d" stroke="#150733" stroke-width="2.5"/><circle cx="92" cy="46" r="7" fill="#a8f03a" stroke="#150733" stroke-width="2.5"/><path d="M96 60l18-42" stroke="#150733" stroke-width="6" stroke-linecap="round"/><path d="M96 60l18-42" stroke="#e0a400" stroke-width="3" stroke-linecap="round"/></svg>';
const gkWord = () => GK_BY_ID.get(G.cur.w) || GK_WORDS[0];
const gkDrawer = () => { const c = G.cur; return c.order[c.strokes.length % c.order.length]; };
const gkLap = () => Math.floor(G.cur.strokes.length / G.cur.order.length) + 1;
const gkDone = () => G.cur.strokes.length >= G.cur.order.length * GK_LAPS;
function gkPaint(cv, strokes, live) {
  const W = cv.width, s = W / 1000, x = cv.getContext('2d');
  x.fillStyle = '#fffdf6'; x.fillRect(0, 0, W, W);
  x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 11 * s;
  strokes.concat(live ? [live] : []).forEach(st => {
    const d = st.d;
    x.strokeStyle = pcHex(st.p);
    x.beginPath(); x.moveTo(d[0] * s, d[1] * s);
    if (d.length === 2) x.lineTo(d[0] * s + 0.1, d[1] * s);
    for (let i = 2; i < d.length; i += 2) x.lineTo(d[i] * s, d[i + 1] * s);
    x.stroke();
  });
}
function gkMount() {
  const cur = G.cur, wrap = $('gkWrap'), cv = $('gkCv');
  if (!wrap || !cv) return;
  const size = Math.max(140, Math.floor(Math.min(wrap.clientWidth, wrap.clientHeight)));
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.style.width = cv.style.height = size + 'px';
  cv.width = cv.height = Math.round(size * dpr);
  gkPaint(cv, cur.strokes);
  if (cur.phase !== 'draw') return;
  let live = null;
  const at = e => { const r = cv.getBoundingClientRect(); return [Math.round(Math.max(0, Math.min(1000, (e.clientX - r.left) / r.width * 1000))), Math.round(Math.max(0, Math.min(1000, (e.clientY - r.top) / r.height * 1000)))]; };
  cv.addEventListener('pointerdown', e => {
    if (live || pxBusy || G.cur !== cur || cur.phase !== 'draw' || gkDone()) return;
    if (roomOnline(gkDrawer())) { telop(esc(pname(gkDrawer())) + 'は自分のスマホで描く番', 'white sm', 1100); return; }
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    live = { p: gkDrawer(), d: at(e), id: e.pointerId };
    gkPaint(cv, cur.strokes, live);
  });
  cv.addEventListener('pointermove', e => {
    if (!live || e.pointerId !== live.id) return;
    e.preventDefault();
    const [px, py] = at(e), d = live.d;
    if (Math.hypot(px - d[d.length - 2], py - d[d.length - 1]) < 5) return;
    d.push(px, py);
    gkPaint(cv, cur.strokes, live);
  });
  const end = e => {
    if (!live || e.pointerId !== live.id) return;
    const d = live.d; let len = 0;
    for (let i = 2; i < d.length; i += 2) len += Math.hypot(d[i] - d[i - 2], d[i + 1] - d[i - 1]);
    const st = { p: live.p, d: d.slice() };
    live = null;
    if (len < 14) { gkPaint(cv, cur.strokes); telop('もう少し長く描いてね', 'white sm', 900); return; }
    gkCommit(st);
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
}
/* one stroke more (from this phone, or from the drawer's own phone) */
function gkCommit(st) {
  const cur = G.cur, cv = $('gkCv');
  cur.strokes.push(st);
  saveGame();
  SE.play('pop'); vibrate(12);
  if (cv) gkPaint(cv, cur.strokes);
  if (gkDone()) {
    pxLater(() => { cur.phase = 'vote'; cur.acc = null; pxSave('vote'); SE.play('fanfare'); telop('完成！<small>ニセ画伯はだれだ？</small>', '', 1400); }, 700);
    if ($('gkWho')) $('gkWho').innerHTML = '完成！';
    $('dock').innerHTML = pxRow('<div class="dock-note">完成…！</div>');
    roomSync();
    return;
  }
  if ($('gkWho')) $('gkWho').innerHTML = gkWhoLine();
  $('dock').innerHTML = PMX.gaka.dock();
  $('mgBoard').innerHTML = pmBoard();
  roomSync();
}
const gkWhoLine = () => pmName(gkDrawer()) + (roomOnline(gkDrawer()) ? ' が自分のスマホで描く番' : ' の番') + ' <small>' + gkLap() + '周目 ・ ' + (G.cur.strokes.length + 1) + '/' + G.cur.order.length * GK_LAPS + '筆</small>';
function gkSaveImage() {
  const cur = G.cur, w = gkWord(), W = 1080, H = 1350, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#2a1266'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#ffd83d'; x.font = '900 64px "Dela Gothic One","Hiragino Sans",sans-serif'; x.textAlign = 'center';
  x.fillText('ニセ画伯', W / 2, 100);
  x.fillStyle = '#ffffff'; x.font = '800 44px "M PLUS Rounded 1c","Hiragino Sans",sans-serif';
  x.fillText('お題：' + w.w + '（' + w.g + '）', W / 2, 170);
  const art = document.createElement('canvas'); art.width = art.height = 960;
  gkPaint(art, cur.strokes);
  x.fillStyle = '#150733'; x.fillRect(54, 214, 972, 972);
  x.drawImage(art, 60, 220);
  x.font = '800 34px "M PLUS Rounded 1c","Hiragino Sans",sans-serif';
  x.fillStyle = '#c7b8f5';
  x.fillText('ニセ画伯は ' + pname(cur.f) + (cur.res === 'caught' ? '（見破られた）' : '（逃げ切り）') + '　・　' + APP_NAME, W / 2, 1260);
  c.toBlob(async b => {
    if (!b) return;
    const name = 'nisegahaku-' + Date.now() + '.png';
    try {
      const f = new File([b], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'ニセ画伯' }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    /* the claude.ai page can't download through a link: it asks the viewer instead */
    try {
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (dl) { await dl.save({ filename: name, data: b }); return; }
    } catch (_) { return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    telop('絵を保存しました', 'white sm', 1200);
  }, 'image/png');
}
PMX.gaka = {
  tag: '描く', hint: '1人だけお題を知らない<b>ニセ画伯</b>を見つけよう', intro: '<span class="tl-ic">' + PALETTE_SVG + '</span>ニセ画伯！<small>1人だけ、お題を知らない</small>',
  poolWord: 'お題', poolUnit: '個', resCount: '枚の絵',
  pool: o => gkPool(o).length,
  stats: () => ({ fake: 0, esc: 0 }),
  mark: () => (G.cur.phase === 'draw' ? gkDrawer() : null),
  who: () => G.cur.f, logPre: () => 'ニセ ', logTag: () => G.cur.w,
  norm(g) {
    const c = g.cur, n = g.players.length, okP = p => Number.isInteger(p) && p >= 0 && p < n;
    const ok = GK_BY_ID.has(c.w) && okP(c.f) && Array.isArray(c.order) && c.order.length === n && Array.isArray(c.strokes);
    if (!ok || !['peek', 'draw', 'vote', 'guess', 'end'].includes(c.phase)) { c.phase = 'before'; delete c.peek; return; }
    c.strokes = c.strokes.filter(s => s && okP(s.p) && Array.isArray(s.d) && s.d.length >= 2);
    if (c.phase === 'peek' && !(c.peek && Array.isArray(c.peek.ps))) c.phase = 'draw';
    if (c.phase === 'draw' && c.strokes.length >= c.order.length * GK_LAPS) c.phase = 'vote';
  },
  stage(anim) {
    const cur = G.cur, head = pxHead();
    if (cur.phase === 'before') return head + (pxLock() || '<div class="pm-big">' + PALETTE_SVG + '<p class="pm-lead ol">お題を配ろう！</p><p class="pm-note">1人だけ、お題を知らない<b>ニセ画伯</b>がまぎれこむ。<br>みんなで1筆ずつ描いて、ニセ画伯を見つけよう</p>' + pmTryNote() + '</div>');
    const w = gkWord();
    if (cur.phase === 'peek') {
      if (!cur.peek.open) return head + pxPeekCover();
      const p = pxPeekWho(), fake = p === cur.f;
      return head + '<div class="pm-big px-secret' + (fake ? ' fake' : '') + '"><p class="px-for">' + pmName(p) + ' だけに見せる</p>' +
        (fake ? '<p class="gk-fake ol">あなたは<br><b>ニセ画伯</b>！</p><p class="gk-genre">ジャンル：<b>' + esc(w.g) + '</b></p><p class="pm-note">お題はわからない。みんなの絵に合わせて、<br>バレないように描こう</p>'
          : '<p class="gk-genre">ジャンル：<b>' + esc(w.g) + '</b></p><p class="gk-word">' + esc(w.w) + '</p><p class="pm-note">ニセ画伯にお題がバレないように、<br>でも仲間には伝わるように描こう</p>') + '</div>';
    }
    const canvas = '<div class="gk-wrap" id="gkWrap"><canvas class="gk-cv' + (cur.phase === 'draw' ? ' live' : '') + '" id="gkCv" aria-label="みんなの絵"></canvas></div>';
    if (cur.phase === 'draw') return head + '<p class="gk-top">ジャンル：<b>' + esc(w.g) + '</b> ・ 1人1筆ずつ（指を離したら交代）</p>' + canvas + '<p class="gk-who" id="gkWho">' + gkWhoLine() + '</p>';
    if (cur.phase === 'vote') return head + '<p class="gk-top"><b>せーので、ニセ画伯だと思う人を指さし！</b></p>' + canvas + '<p class="pm-ask">いちばん指された人をタップ</p>' + pxChips(pxAll(), cur.acc, 'acc');
    if (cur.phase === 'guess') return head + '<div class="pm-body"><p class="gk-res ok ol">正解！ ニセ画伯は ' + pmName(cur.f) + '</p><p class="pm-lead ol">逆転チャンス！</p><p class="pm-note">ニセ画伯は、お題を当ててね。<br>当たったら逃げ切り！</p></div>';
    const caught = cur.res === 'caught';
    return head + '<div class="gk-end"><p class="gk-res ' + (caught ? 'ok' : 'ng') + ' ol">' + (caught ? '見破った！' : cur.res === 'guess' ? 'お題を当てて逆転！' : 'ニセ画伯の逃げ切り！') + '</p>' +
      '<p class="gk-ans">お題は <b>' + esc(w.w) + '</b> ・ ニセ画伯は ' + pmName(cur.f) + '</p></div>' + canvas +
      '<p class="pm-ask">' + (caught ? esc(pname(cur.f)) + ' が1DON' : 'ニセ画伯以外の全員が1DON') + '</p>';
  },
  dock() {
    const cur = G.cur;
    if (cur.phase === 'before') return pmLocked() ? pxRow(pxBtn('end', '結果発表へ')) : pxRow(pxBtn('deal', 'お題を配る！', 'big main pulse'));
    if (cur.phase === 'peek') return pxRow(cur.peek.open ? pxPeekNextBtn('見た！ 描きはじめる ▶') : pxPeekOpenBtn());
    if (cur.phase === 'draw') return pxRow(pxBtn('undo', '1筆<span class="sub">もどす</span>', 'white small', cur.strokes.length ? '' : ' disabled') + '<div class="dock-note grow">' + esc(pname(gkDrawer())) + ' が描く番</div>');
    if (cur.phase === 'vote') return pxRow(pxBtn('accuse', cur.acc == null ? '指された人をタップ' : esc(pname(cur.acc)) + ' で決定！', 'big main pink', cur.acc == null ? ' disabled' : ''));
    if (cur.phase === 'guess') return pxRow(pxBtn('gng', 'はずれ', 'white small') + pxBtn('gok', '当たった！', 'big main'));
    return pxRow(pxBtn('save', '絵を保存', 'cyan small') + pxBtn('next', pmLast() ? '結果発表へ！' : '次の絵へ ▶', 'big main grow'));
  },
  mounted() { if (['draw', 'vote', 'end'].includes(G.cur.phase)) requestAnimationFrame(gkMount); },
  remote(p) {
    const cur = G.cur;
    if (cur.phase === 'before') return { v: 'watch', say: 'お題が配られるのを待っています' };
    const w = gkWord(), fake = p === cur.f, end = cur.phase === 'end';
    const local = cur.phase === 'peek' && cur.peek && cur.peek.ps.includes(p);
    if (local) return { v: 'local' };
    return { v: 'gk', ph: cur.phase, g: w.g, f: fake && !end, w: fake && !end ? '' : w.w, s: cur.phase === 'peek' ? [] : roomStrokes(cur.strokes),
      turn: cur.phase === 'draw' && !gkDone() && gkDrawer() === p && !pxBusy, who: cur.phase === 'draw' ? pname(gkDrawer()) : '' };
  },
  ract(p, m) {
    const cur = G.cur;
    if (m.a !== 'stroke' || cur.phase !== 'draw' || gkDone() || gkDrawer() !== p) return;
    const d = m.d;
    if (!Array.isArray(d) || d.length < 4 || d.length > 1000 || d.length % 2 || !d.every(n => Number.isInteger(n) && n >= 0 && n <= 1000)) return;
    let len = 0;
    for (let i = 2; i < d.length; i += 2) len += Math.hypot(d[i] - d[i - 2], d[i + 1] - d[i - 1]);
    if (len < 14) return;
    gkCommit({ p, d: d.slice() });
  },
  act(a, el) {
    const cur = G.cur;
    if (pxBusy) return;
    if (a === 'end') { finishGame(); return; }
    if (cur.phase === 'peek' && pxPeekAct(a, () => { cur.phase = 'draw'; pxSave('draw'); SE.play('go'); telop('お絵描きスタート！<small>' + esc(pname(gkDrawer())) + ' から</small>', '', 1300); })) return;
    if (a === 'deal' && cur.phase === 'before' && !pmLocked()) {
      const n = G.players.length, w = pmDraw(gkPool(G.lvl), 1)[0];
      pmUse(w.id);
      cur.w = w.id; cur.f = rint(0, n - 1); cur.strokes = []; cur.acc = null; cur.res = null;
      let s = rint(0, n - 1); if (s === cur.f) s = (s + 1) % n;
      cur.order = Array.from({ length: n }, (_, i) => (s + i) % n);
      G.players[cur.f].fake++;
      tryUse('gaka');
      const local = roomLocal(pxAll());
      if (!local.length) { cur.phase = 'draw'; SE.play('deal'); pxSave('draw'); telop('お題を配った！<small>' + esc(pname(gkDrawer())) + ' から描こう</small>', '', 1500); return; }
      pxPeekStart(local);
      cur.phase = 'peek';
      SE.play('deal');
      pxSave('pass');
      return;
    }
    if (a === 'undo' && cur.phase === 'draw' && cur.strokes.length) { cur.strokes.pop(); SE.play('tap'); pxSave(); return; }
    if (a === 'acc' && cur.phase === 'vote') { const p = pxP(el); if (p == null) return; cur.acc = cur.acc === p ? null : p; SE.play('select'); pxSave(); return; }
    if (a === 'accuse' && cur.phase === 'vote' && cur.acc != null) {
      SE.play('swDrum');
      $('dock').innerHTML = pxRow('<div class="dock-note">ニセ画伯は…</div>');
      pxLater(() => {
        if (cur.acc === cur.f) { cur.phase = 'guess'; pxSave('guess'); SE.play('swShow'); telop('正解！<small>ニセ画伯は ' + esc(pname(cur.f)) + '</small>', '', 1500); }
        else { cur.res = 'escape'; cur.phase = 'end'; G.players[cur.f].esc++; G.players[cur.f].medal++; pxSave('end'); SE.play('bubuu'); telop('ハズレ！<small>ニセ画伯は ' + esc(pname(cur.f)) + '</small>', 'red', 1600); }
      }, 1300);
      return;
    }
    if ((a === 'gok' || a === 'gng') && cur.phase === 'guess') {
      cur.phase = 'end';
      if (a === 'gok') { cur.res = 'guess'; G.players[cur.f].esc++; G.players[cur.f].medal++; SE.play('fanfare'); }
      else { cur.res = 'caught'; SE.play('ding'); }
      pxSave('end');
      return;
    }
    if (a === 'save' && cur.phase === 'end') { gkSaveImage(); SE.play('tap'); return; }
    if (a === 'next' && cur.phase === 'end') pmNext(cur.res === 'caught' ? pxCups([cur.f]) : pxCups(pxOthers(cur.f)), cur.res !== 'caught');
  },
};

/* =====================================================================
   大喜利グランプリ（内部の名前は reply）: 全員が自分のスマホで参加。書けた人から回答 → みんなが点を入れる → 10点で IPPON
   ===================================================================== */
const RP_MSGS = [
  // 0 = ふつう, 1 = 恋愛
  ['絶対に売れない新しいお菓子の名前とは？', 0], ['校長先生の話が長すぎて起きたこととは？', 0],
  ['「この人、ドラえもんの道具を持ってるな」と思った瞬間とは？', 0], ['最近の桃太郎、どこが変わった？', 0],
  ['まったく役に立たない新しい家電とは？', 0], ['閻魔大王が最近始めた新サービスとは？', 0],
  ['天才ハッカーの意外な弱点とは？', 0], ['「このパン屋、もうダメだな」と思った瞬間とは？', 0],
  ['十二支に13番目が追加。何の動物？', 0], ['こんな結婚式はイヤだ', 0],
  ['こんな救急車はイヤだ', 0], ['こんなヒーローはイヤだ', 0],
  ['こんな回転寿司はイヤだ', 0], ['こんなAIアシスタントはイヤだ', 0],
  ['こんな美容院はイヤだ', 0], ['こんなコンビニはイヤだ', 0],
  ['こんなお化け屋敷はイヤだ', 0], ['宝くじで1等を当てた忍者の第一声', 0],
  ['300年ぶりに目覚めたロボットの第一声', 0], ['優勝インタビューで絶対に言ってはいけない一言', 0],
  ['初めて人間に捕まった宇宙人のひと言', 0], ['卒業式で先生に言われたくない一言', 0],
  ['「この人、異世界から来たな」と気づいたきっかけとは？', 0], ['「この会議、今日中に終わらないな」と思った瞬間とは？', 0],
  ['サンタクロースが今年の仕事をサボった理由とは？', 0], ['新しくできた学校の、ちょっとおかしな校則とは？', 0],
  ['犬が人間についていちばん不思議に思っていることとは？', 0], ['新しいことわざを作って。意味も教えて', 0],
  ['ニュース速報。いったい何が発表された？', 0], ['新しく追加されたオリンピック競技とは？', 0],
  ['「このお医者さん、ヤブだな」と思った一言とは？', 0], ['RPGの勇者がこっそり悩んでいることとは？', 0],
  ['引退したスーパーヒーローの今の仕事とは？', 0], ['カップラーメンを待つ3分間に人生が変わった。何があった？', 0],
  ['タイムマシンで未来に行って、いちばんがっかりしたこととは？', 0], ['「この旅館、何かおかしい」と思った瞬間とは？', 0],
  ['新発売の、ちょっと残念な目覚まし時計とは？', 0], ['忍者の正体がバレた意外な理由とは？', 0],
  ['名探偵が事件の解決をあきらめた理由とは？', 0], ['100歳のおばあちゃんが始めた新しい趣味とは？', 0],
  ['ヒーローショーで子どもが泣き出した理由とは？', 0], ['絶対に当たらない占いの結果とは？', 0],
  ['カラオケで入れると場が凍る曲名とは？', 0], ['新しい祝日「○○の日」。何をする日？', 0],
  ['魔王が勇者に送った、ちょっと優しいメールとは？', 0], ['ペットの猫が書いた日記、最初の一行とは？', 0],
  ['こんなキャンプ場はイヤだ', 0], ['こんな初デートはイヤだ', 1],
  ['こんなプロポーズはイヤだ', 1], ['こんな婚活パーティーはイヤだ', 1],
  ['恋人を「重いな」と思った瞬間とは？', 1], ['一瞬で冷める告白のセリフとは？', 1],
  ['「この人、モテないな」と思った自己紹介とは？', 1], ['絶対に会いたくないマッチングアプリのプロフィールとは？', 1],
  ['元恋人から届いた、意味がわからないLINEとは？', 1], ['デート中に「この人とは無理」と思った瞬間とは？', 1],
  ['キューピッドが最近スランプな理由とは？', 1], ['バレンタインにもらって、いちばん困ったものとは？', 1],
  ['合コンで絶対に言ってはいけない自己紹介とは？', 1], ['こんな誓いの言葉はイヤだ', 1],
  ['恋人の親へのあいさつ。言ってはいけない第一声とは？', 1], ['片思いの相手に送ってしまった、最悪の誤送信とは？', 1],
  ['倦怠期のカップルが始めた、ちょっと変な習慣とは？', 1], ['運命の赤い糸の先にいた、意外なものとは？', 1],
  ['「この人、私のこと好きだな」と勘違いした瞬間とは？', 1], ['こんな胸キュンはイヤだ', 1],
  ['浮気がバレたときの、最悪の言い訳とは？', 1],
].map(([m, k], i) => ({ id: i + 1, m, k }));
const RP_BY_ID = new Map(RP_MSGS.map(q => [q.id, q]));
const rpPool = o => RP_MSGS.filter(q => o === 'all' || (o === 'koi' ? q.k : !q.k));
let rpRO = null, rpCutH = 0;
const rpMsg = () => RP_BY_ID.get(G.cur.q) || RP_MSGS[0];
/* the お題 board (IPPON style): shared with the guests' phones, so it only takes plain text */
const ogOdai = (t, cls) => '<div class="og-odai' + (cls ? ' ' + cls : '') + '"><span class="og-lbl">お題</span><b>' + esc(t) + '</b></div>';
/* the stage: お題 on top, the answer boards under it (paged, never scrolled), the input at the bottom */
function rpChat(body, foot, cls, text) {
  return '<div class="rp-chat og' + (cls ? ' ' + cls : '') + '">' + ogOdai(text != null ? text : rpMsg().m) +
    (body != null ? '<div class="rp-list" id="rpList">' + body + '</div><div class="rp-pg" id="rpPg" hidden><button type="button" id="rpPrev" aria-label="前の回答">▲ 前</button><span id="rpPgN"></span><button type="button" id="rpNext" aria-label="次の回答">次 ▼</button></div>' : '') +
    (foot || '') + '</div>';
}
const OG_GOAL = 10, OG_MAXLEN = 40, OG_MAXANS = 40, OG_JUDGE = 6000;   /* 6秒で判定が締め切られる */
const ogInput = id => '<div class="og-in"><textarea id="' + id + '" maxlength="' + OG_MAXLEN + '" rows="3" enterkeyhint="send" placeholder="ここに回答を書く" aria-label="回答を入力"></textarea></div>';
/* the answers never scroll: they are cut into pages (▲ ▼ under them); a new one shows on the last page */
function rpPages(anim) {
  const list = $('rpList');
  if (!list) return;
  const prev = PAGERS.get('rpList'), html = anim === 'again' && prev ? prev.html : list.innerHTML, nav = $('rpPg');
  const run = () => pagerSet('rpList', html, { keep: anim === 'keep' || anim === 'again', last: anim !== 'top' && anim !== 'keep' && anim !== 'again', onNav: (i, n) => {
    if (!$('rpPg')) return;
    $('rpPg').hidden = n < 2; $('rpPgN').textContent = (i + 1) + ' / ' + n; $('rpPrev').disabled = i === 0; $('rpNext').disabled = i === n - 1;
  } });
  /* cut with the ▲ ▼ row showing (it takes room); only if it all fits on one page, cut again without it */
  if (nav) nav.hidden = false;
  run();
  const st = PAGERS.get('rpList');
  if (nav && st && st.pages && st.pages.length < 2) { nav.hidden = true; run(); }
  /* the stage can still change size after this (the buttons under it are drawn next): cut again whenever it does */
  rpCutH = list.clientHeight;
  if (window.ResizeObserver) {
    rpRO = rpRO || new ResizeObserver(() => { const l = $('rpList'); if (l && PAGERS.get('rpList') && Math.abs(l.clientHeight - rpCutH) > 2) rpPages('again'); });
    rpRO.disconnect(); rpRO.observe(list);
  }
  const pv = $('rpPrev'), nx = $('rpNext');
  if (pv) pv.onclick = () => { if (pagerGo('rpList', -1)) SE.play('tap'); };
  if (nx) nx.onclick = () => { if (pagerGo('rpList', 1)) SE.play('tap'); };
}

/* ---------- IPPON 方式 ----------
   全員が自分のスマホで参加する（親のスマホで遊べるのは1人まで）。書けた人から「回答する」→ 1つずつ発表 →
   回答した人以外が持ち点（4人5点・5人4点・6〜8人3点・それ以上2点）を「面白い！」で入れる → 合計10点で IPPON。
   判定は1つの回答につき6秒：その間に「面白い！」を押した分がそのまま点になる（10点に届けばその場で IPPON）。
   cur = { q, phase: before|live|judge|res|end, ans: [{ p, t, pt: { voter: 点 }, ok: [], r: null|'ippon'|合計 }], at: 発表中の回答, until: 判定の締め切り（このスマホの時計） } */
const ogPer = n => (n <= 4 ? 5 : n === 5 ? 4 : n <= 8 ? 3 : 2);
const ogLocal = () => roomLocal(pxAll());
const ogCanRoom = () => ROOM_ON && (plusOn() || roomLive());
const ogReady = () => G.players.length >= 4 && ogCanRoom() && ogLocal().length <= 1;
const ogHostP = () => { const l = ogLocal(); return l.length === 1 ? l[0] : null; };
const ogSum = a => Object.values(a.pt).reduce((s, x) => s + x, 0);
const ogCur = () => (G.cur.at != null ? G.cur.ans[G.cur.at] || null : null);
/* who can still judge right now: a phone that is online, or the one player on this phone */
const ogLive = v => !roomHas(v) || roomOnline(v);
const ogDone = (a, v) => a.ok.includes(v) || (a.pt[v] || 0) >= ogPer(G.players.length);
const ogBusy = p => G.cur.ans.some(a => a.p === p && a.r == null);
const ogQueue = () => G.cur.ans.map((_, i) => i).filter(i => G.cur.ans[i].r == null && i !== G.cur.at);
let ogTimer = 0, ogJT = 0, ogSeen = { k: '', lv: 0 }, ogDraft = '';
/* the IPPON meter: 10 rings, lit from the outside in; the last one is the whole centre (no hole once it is full) */
function ogMeter(lv, from) {
  let s = '<svg viewBox="-100 -100 200 200" aria-hidden="true"><circle r="99" fill="#0b0918" stroke="#e3bf55" stroke-width="2.5"/>';
  for (let i = 0; i < OG_GOAL; i++) {
    const on = i < lv, fresh = on && i >= from, cls = 'og-seg' + (on ? ' on' : '') + (fresh ? ' new' : ''), dl = fresh ? ' style="animation-delay:' + (i - from) * 70 + 'ms"' : '';
    s += i < OG_GOAL - 1 ? '<circle class="' + cls + '" r="' + (90 - i * 10) + '" fill="none" stroke-width="7.6"' + dl + '/>' : '<circle class="' + cls + ' core" r="6.6"' + dl + '/>';
  }
  return s + '</svg>';
}
/* one answer on the stage, the same on every phone: plain strings only */
const ogCard = (p, nm, t, r, fresh) => '<div class="og-ans' + (fresh ? ' fresh' : '') + (r === 'ippon' ? ' ippon' : r === 0 ? ' zero' : '') + '"><span class="og-who" style="--p:' + pc(p) + '">' + esc(nm) + '</span><p class="og-t">' + esc(t) + '</p>' +
  (r === 'ippon' ? '<span class="og-ippon">IPPON</span>' : '') + '</div>';
/* o.left: ms left to judge (the bar under the status runs out), null once the result is in. The status line and the bar keep their
   height in both, so the meter never moves when the result comes */
const ogStage = o => '<div class="rp-chat og grow judge' + (o.lv >= OG_GOAL ? ' full' : '') + '">' + ogOdai(o.m, 'og-small') + '<div class="og-row">' + ogCard(o.p, o.nm, o.t, o.r, o.fresh) +
  '<div class="og-mtr" role="img" aria-label="' + o.lv + '点（10点で IPPON）">' + ogMeter(o.lv, o.from) + '</div></div><p class="og-st">' + o.st + '</p>' +
  '<div class="og-time">' + (o.left != null ? '<i style="animation-duration:' + OG_JUDGE + 'ms;animation-delay:-' + Math.max(0, OG_JUDGE - o.left) + 'ms"></i>' : '') + '</div></div>';
/* the seconds left, counted down on screen (each phone by its own clock) */
let ogTick = 0;
function ogClock() {
  if (ogTick) return;
  ogTick = setInterval(() => {
    const els = document.querySelectorAll('[data-ogend]');
    if (!els.length) { clearInterval(ogTick); ogTick = 0; return; }
    els.forEach(el => { el.textContent = String(Math.max(0, Math.ceil((Number(el.dataset.ogend) - Date.now()) / 1000))); });
  }, 200);
}
const ogLeftHTML = end => { ogClock(); return 'あと<b data-ogend="' + end + '">' + Math.max(0, Math.ceil((end - Date.now()) / 1000)) + '</b>秒'; };
/* what the meter showed last time on this phone: only the new rings light up, and a new answer flips in once */
function ogFrom(key, lv) {
  const same = ogSeen.k === key, from = same ? Math.min(ogSeen.lv, lv) : 0;
  ogSeen = { k: key, lv };
  return { from, fresh: !same };
}
const ogCut = nm => telop('<b class="og-ip">IPPON!</b><small>' + esc(nm) + '</small>', 'ippon', 2600);
function ogStatus(a, end) {
  if (a.r === 'ippon') return '<b>IPPON！</b>';
  if (a.r != null) return '<b>' + a.r + '</b>点' + (a.r === 0 ? ' ・ スベった… <b>1DON</b>' : '');
  return '<b>' + Math.min(OG_GOAL, ogSum(a)) + '</b> / 10点 ・ ' + ogLeftHTML(end);
}
function ogStart(i) { G.cur.at = i; G.cur.phase = 'judge'; G.cur.until = Date.now() + OG_JUDGE; SE.play('flip'); vibrate(15); pxSave('top'); ogArm(); }
/* the 6 seconds: when they are up, the answer gets the points it has */
function ogArm() {
  clearTimeout(ogJT);
  const c = G.cur, g = G, at = c.at;
  if (c.phase !== 'judge') return;
  ogJT = setTimeout(() => { if (G === g && G.cur === c && c.phase === 'judge' && c.at === at && screen === 'game') ogEnd(); }, Math.max(0, c.until - Date.now()) + 60);
}
function ogAdd(p, txt) {
  const c = G.cur;
  if (!['live', 'judge', 'res'].includes(c.phase) || ogBusy(p) || c.ans.length >= OG_MAXANS) return false;
  c.ans.push({ p, t: txt, pt: {}, ok: [], r: null });
  SE.play('swoosh');
  if (c.phase === 'live') ogStart(c.ans.length - 1); else pxSave('keep');
  return true;
}
const ogText = s => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, OG_MAXLEN) : '');
/* everyone who can judge has finished: the answer's result shows for a moment, then the next one in line (or the お題 again) */
function ogCheck() {
  const a = ogCur();
  if (!a || G.cur.phase !== 'judge') return false;
  if (pxOthers(a.p).filter(ogLive).every(v => ogDone(a, v))) { ogEnd(); return true; }
  return false;
}
function ogEnd() {
  const c = G.cur, a = ogCur(), g = G, at = c.at;
  if (!a || c.phase !== 'judge') return;
  const tot = Math.min(OG_GOAL, ogSum(a)), pl = G.players[a.p];
  a.r = tot >= OG_GOAL ? 'ippon' : tot;
  c.phase = 'res'; clearTimeout(ogJT);
  if (a.r === 'ippon') { pl.best++; pl.medal++; SE.play('ippon'); vibrate([40, 30, 140]); flash('#ffd83d'); ogCut(pname(a.p)); }
  else if (tot === 0) { pl.worst++; SE.play('bubuu'); }
  else SE.play('ding');
  pxSave('keep');
  clearTimeout(ogTimer);
  ogTimer = setTimeout(() => { if (G === g && G.cur === c && c.phase === 'res' && c.at === at && screen === 'game') ogNext(); }, a.r === 'ippon' ? 3000 : 2000);
}
function ogNext() {
  const c = G.cur, q = ogQueue();
  if (q.length) { ogStart(q[0]); return; }
  c.at = null; c.phase = 'live'; SE.play('pop'); pxSave('top');
}
function ogPt(v) {
  const c = G.cur, a = ogCur();
  if (c.phase !== 'judge' || !a || v === a.p || !okInt(v, 0, G.players.length - 1) || ogDone(a, v)) return;
  a.pt[v] = (a.pt[v] || 0) + 1;
  if (ogSum(a) >= OG_GOAL) { ogEnd(); return; }
  SE.play('ogPt' + Math.min(9, ogSum(a))); vibrate(8);
  if (!ogCheck()) pxSave('keep');
}
function ogOk(v) {
  const a = ogCur();
  if (G.cur.phase !== 'judge' || !a || v === a.p || ogDone(a, v)) return;
  a.ok.push(v); SE.play('tap');
  if (!ogCheck()) pxSave('keep');
}
function ogNeedHTML() {
  const n = G.players.length, miss = ogLocal();
  const why = n < 4 ? '大喜利グランプリは<b>4人から</b>遊べます'
    : !ROOM_ON ? '全員が自分のスマホで参加するモードです。アプリ版で遊んでね'
    : !ogCanRoom() ? '全員が自分のスマホで参加するモードです。部屋を作れるのはプレミアムのスマホだけ'
    : 'まだの人：<b>' + miss.map(p => esc(pname(p))).join('・') + '</b><br>親のスマホで遊べるのは1人だけ';
  return '<div class="pm-big og-need"><div class="og-odai closed"><span class="og-lbl">お題</span><b>？</b></div><p class="pm-lead ol">みんな自分のスマホで参加！</p><p class="pm-note">' + why + '</p>' +
    (n >= 4 && ROOM_ON && !ogCanRoom() ? '<button type="button" class="pbtn small" data-g="plus">プレミアムを見る</button>' : '') + '</div>';
}
function ogEndList() {
  const c = G.cur;
  if (!c.ans.length) return '<p class="og-none">回答はありませんでした</p>';
  return c.ans.map(a => '<div class="rp-out' + (a.r === 'ippon' ? ' best' : a.r === 0 ? ' worst' : '') + '"><div class="rp-pick pg-keep"><span class="og-pts">' + (a.r === 'ippon' ? 10 : a.r || 0) + '<small>点</small></span>' +
    '<span class="rp-bub">' + esc(a.t) + '</span>' + (a.r === 'ippon' ? '<span class="og-ippon">IPPON</span>' : '') + '<span class="rp-who" style="--p:' + pc(a.p) + '">' + esc(pname(a.p)) + (a.r === 0 ? '<small>スベった</small>' : '') + '</span></div></div>').join('');
}
PMX.reply = {
  tag: '回答', hint: '合計<b>10点</b>で IPPON！ 0点の回答は <b>1DON</b>', intro: '<span class="tl-ic rp-tl"></span>大喜利グランプリ！<small>お題に答えて IPPON をねらえ</small>',
  poolWord: 'お題', poolUnit: '問', resCount: 'お題',
  pool: o => rpPool(o).length,
  stats: () => ({ best: 0, worst: 0 }),
  mark: () => { const a = ogCur(); return a && (G.cur.phase === 'judge' || G.cur.phase === 'res') ? a.p : null; },
  who: () => { const a = G.cur.ans && G.cur.ans.find(x => x.r === 'ippon'); return a ? a.p : null; },
  logPre: () => '★ ', logTag: () => G.cur.q,
  quiet: false,
  norm(g) {
    const c = g.cur, n = g.players.length, okP = p => Number.isInteger(p) && p >= 0 && p < n;
    clearTimeout(ogTimer);
    if (!RP_BY_ID.has(c.q) || !['live', 'judge', 'res', 'end'].includes(c.phase)) { c.phase = 'before'; c.ans = []; c.at = null; return; }
    c.ans = (Array.isArray(c.ans) ? c.ans : []).filter(a => a && okP(a.p) && typeof a.t === 'string').slice(0, OG_MAXANS).map(a => {
      const pt = {};
      Object.keys(a.pt && typeof a.pt === 'object' ? a.pt : {}).forEach(k => { const v = Number(k), x = a.pt[k]; if (okP(v) && v !== a.p && okInt(x, 1, 5)) pt[v] = x; });
      return { p: a.p, t: a.t.slice(0, OG_MAXLEN), pt, ok: Array.isArray(a.ok) ? a.ok.filter(okP) : [], r: a.r === 'ippon' || okInt(a.r, 0, OG_GOAL - 1) ? a.r : null };
    });
    if (!(Number.isInteger(c.at) && c.ans[c.at])) c.at = null;
    if ((c.phase === 'judge' || c.phase === 'res') && c.at == null) c.phase = 'live';
    if (c.phase === 'judge' && c.ans[c.at].r != null) c.phase = 'res';
    /* a reload while a result was showing: straight on to the next answer in line */
    if (c.phase === 'res' || c.phase === 'live') {
      const q = c.ans.map((_, i) => i).filter(i => c.ans[i].r == null);
      if (q.length) { c.at = q[0]; c.phase = 'judge'; } else { c.at = null; c.phase = 'live'; }
    }
    if (c.phase === 'end') c.at = null;
    if (c.phase === 'judge') c.until = Date.now() + OG_JUDGE;   /* back after a reload: the answer gets its 6 seconds again */
  },
  stage() {
    const c = G.cur, head = pxHead();
    if (c.phase === 'before') {
      if (pmLocked()) return head + pxLock();
      if (!ogReady()) return head + ogNeedHTML();
      return head + '<div class="pm-big"><div class="og-odai closed"><span class="og-lbl">お題</span><b>？</b></div><p class="pm-lead ol">お題が出るよ！</p><p class="pm-note">書けた人から自分のスマホで「回答する」。<br>みんなで点を入れて、<b>10点で IPPON！</b></p>' + pmTryNote() + '</div>';
    }
    if (c.phase === 'live') {
      const hp = ogHostP(), ip = c.ans.filter(a => a.r === 'ippon').length;
      const top = '<p class="gk-top">書けた人から<b>「回答する」</b>！' + (c.ans.length ? '<span class="og-cnt">回答 ' + c.ans.length + ' ・ IPPON ' + ip + '</span>' : '') + '</p>';
      /* the round is in the top bar already: the お題 and the answers get the room */
      if (hp == null) return top + rpChat(null, '', 'grow big');
      return top + '<p class="px-for">' + pmName(hp) + ' の回答（このスマホ）</p>' + rpChat(null, ogInput('rpIn'), 'grow write');
    }
    if (c.phase === 'judge' || c.phase === 'res') {
      const a = ogCur(), lv = a.r === 'ippon' ? OG_GOAL : Math.min(OG_GOAL, ogSum(a));
      const f = ogFrom(c.q + '|' + c.at, lv);
      return ogStage({ m: rpMsg().m, p: a.p, nm: pname(a.p), t: a.t, r: a.r, lv, from: f.from, fresh: f.fresh, st: ogStatus(a, c.until), left: c.phase === 'judge' ? Math.max(0, c.until - Date.now()) : null });
    }
    return head + '<p class="gk-top og-ask">このお題の回答</p>' + rpChat(ogEndList(), '', 'grow show');
  },
  dock() {
    const c = G.cur;
    if (c.phase === 'before') return pmLocked() ? pxRow(pxBtn('end', '結果発表へ')) : pxRow(pxBtn('open', 'お題を出す！', 'big main' + (ogReady() ? ' pulse' : ''), ogReady() ? '' : ' disabled'));
    if (c.phase === 'live') {
      const hp = ogHostP();
      return pxRow(pxBtn('close', hp == null ? 'このお題を終わる' : 'お題を<br>終わる', hp == null ? 'white big grow' : 'white small') + (hp == null ? '' : pxBtn('send', '回答する', 'big main grow')));
    }
    if (c.phase === 'judge') {
      const a = ogCur(), hp = ogHostP(), per = ogPer(G.players.length);
      if (hp != null && hp !== a.p && !ogDone(a, hp)) {
        const left = per - (a.pt[hp] || 0);
        return pxRow(pxBtn('pt', '面白い！ +1<span class="sub">' + esc(pname(hp)) + ' のこり' + left + '点</span>', 'big main pink grow'));
      }
      return pxRow('<div class="dock-note">' + (hp === a.p ? 'みんなが判定中…' : '6秒以内に、みんなのスマホで「面白い！」') + '</div>');
    }
    if (c.phase === 'res') return pxRow('<div class="dock-note">' + (ogQueue().length ? '次の回答へ…' : 'お題にもどります…') + '</div>');
    return pxRow(pxBtn('next', pmLast() ? '結果発表へ！' : '次のお題へ ▶', 'big main'));
  },
  remote(p) {
    const c = G.cur, q = c.q && c.phase !== 'before' ? rpMsg() : null, n = G.players.length;
    const b = { v: 'og', ph: c.phase, m: q ? q.m : '', per: ogPer(n) };
    if (c.phase === 'before') { b.ready = ogReady(); return b; }
    const mine = ogQueue().findIndex(i => c.ans[i].p === p);
    if (mine >= 0) b.wait = mine + 1;
    if (c.phase === 'judge' || c.phase === 'res') {
      const a = ogCur();
      b.a = { id: c.at, p: a.p, nm: pname(a.p), t: a.t, r: a.r, lv: a.r === 'ippon' ? OG_GOAL : Math.min(OG_GOAL, ogSum(a)), me: a.p === p, my: a.pt[p] || 0, done: a.p !== p && ogDone(a, p) };
      if (c.phase === 'judge') b.a.left = Math.round(Math.max(0, Math.min(OG_JUDGE, c.until - Date.now())) / 100) * 100;
    }
    if (c.phase === 'live') b.busy = ogBusy(p);
    if (c.phase === 'end') { b.cnt = c.ans.filter(a => a.p === p).length; b.ip = c.ans.filter(a => a.p === p && a.r === 'ippon').length; }
    return b;
  },
  ract(p, m) {
    if (m.a === 'ans') { const t = ogText(m.txt); if (t) ogAdd(p, t); return; }
    if (m.a === 'pt') { ogPt(p); return; }
    if (m.a === 'ok') ogOk(p);
  },
  mounted(anim) {
    rpPages(anim);
    /* the 6 seconds run on (after a reload too); everyone who could still press has used all their points: done early */
    if (G.cur.phase === 'judge') { ogArm(); const g = G; setTimeout(() => { if (G === g && G.mode === 'reply' && screen === 'game') ogCheck(); }, 0); }
    const inp = $('rpIn');
    if (inp) {
      inp.value = ogDraft;
      inp.addEventListener('input', () => { ogDraft = inp.value; });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); PMX.reply.act('send'); } });
      if (!matchMedia('(pointer:coarse)').matches) inp.focus({ preventScroll: true });
    }
  },
  act(a) {
    const c = G.cur;
    if (pxBusy) return;
    if (a === 'end') { finishGame(); return; }
    if (a === 'open' && c.phase === 'before' && !pmLocked()) {
      if (!ogReady()) { SE.play('boing'); return; }
      const q = (G.demo && ogdOdai()) || pmDraw(rpPool(G.lvl), 1)[0];
      pmUse(q.id);
      c.q = q.id; c.ans = []; c.at = null; c.phase = 'live'; ogDraft = '';
      tryUse('reply');
      SE.play('ticket'); vibrate([30, 40, 30]);
      pxSave('top');
      return;
    }
    if (a === 'send' && c.phase === 'live') {
      const hp = ogHostP(), inp = $('rpIn'), t = ogText(inp ? inp.value : '');
      if (hp == null) return;
      if (!t) { if (inp) { inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); inp.focus(); } SE.play('boing'); return; }
      if (ogAdd(hp, t)) ogDraft = '';
      return;
    }
    if (a === 'pt') { ogPt(ogHostP()); return; }
    if (a === 'ok') { ogOk(ogHostP()); return; }
    if (a === 'cut' && c.phase === 'judge') { ogEnd(); return; }
    if (a === 'close' && c.phase === 'live') { c.phase = 'end'; SE.play('fanfare'); pxSave('top'); return; }
    if (a === 'next' && c.phase === 'end') pmNext(pxCups(c.ans.filter(x => x.r === 0).map(x => x.p)), c.ans.some(x => x.r === 'ippon'));
  },
};

/* =====================================================================
   しれっとミッション: 全員が秘密のミッションを持って、ふつうに飲んで話す。達成したら名乗り出る、あやしい人は「見破った！」
   ===================================================================== */
const MS_LIST = [
  // lv 1 = かんたん, 2 = むずかしい
  [1, 'だれかに「それな」と言わせる'], [1, '会話の中で「パイナップル」と言う'], [1, 'だれかと2回乾杯する(同じ人と)'],
  [1, 'だれかに「なんで？」と聞き返させる'], [1, 'だれかに持ち物をほめてもらう'], [1, 'だれかに「ありがとう」と言わせる'],
  [1, '3回続けて「たしかに」と相づちを打つ'], [1, 'だれかに自分の名前を呼ばせる'], [1, '会話の中で、都道府県を3つ言う'],
  [1, 'だれかに「え？」と言わせる'], [1, '会話に「昭和」という言葉を入れる'], [1, 'だれかに好きな食べ物を言わせる'],
  [1, 'だれかに今何時か聞かれる'], [1, 'だれかに、最近見た動画の話をさせる'], [1, '話の途中で、一度だけ英語を混ぜる'],
  [1, 'だれかとハイタッチする'], [1, 'だれかに「わかる」と言わせる'], [1, 'だれかに、明日の予定を聞く'],
  [1, '会話の中で、動物の名前を3つ言う'], [1, 'だれかに自分のグラスの中身を聞かれる'], [1, 'だれかに「たしかに」と言わせる'],
  [1, '話の途中で、急に立ち上がる'], [1, 'だれかに出身地を言わせる'], [1, '会話の中で「ちなみに」を3回使う'],
  [1, 'だれかに「おいしい」と言わせる'], [1, 'だれかに天気の話をさせる'], [1, 'だれかと同時に同じ言葉を言う'],
  [1, '店員さんを呼ぶ係になる'], [1, 'だれかに、自分の話で笑ってもらう'], [1, 'だれかに「すごい」と言わせる'],
  [2, 'だれかに「パイナップル」と言わせる'], [2, 'だれかに自分のモノマネをさせる'], [2, 'だれかに「天才」と言わせる'],
  [2, 'だれかに歌を歌わせる（ワンフレーズでOK）'], [2, 'だれかに英語で1文しゃべらせる'], [2, 'だれかに「ごめん」と言わせる'],
  [2, '会話の中で、ことわざを2つ使う'], [2, 'だれかに腕を組む'], [2, 'だれかに「おいしい」と3回言わせる'],
  [2, 'だれかに方言をしゃべらせる'], [2, 'だれかに初恋の話をさせる'], [2, 'だれかに、自分をあだ名で呼ばせる'],
  [2, 'だれかに手をたたいて笑わせる'], [2, '話を「ここだけの話なんだけど」から始める'], [2, 'だれかに「えー！」と驚かせる'],
  [2, 'だれかに指で数字を出させる'], [2, 'だれかに「わかる」と2回言わせる'], [2, 'だれかに「それは言いすぎ」と言わせる'],
  [2, 'だれかに、自分の誕生日を当ててもらう'], [2, 'だれかに、昔のあだ名を言わせる'], [2, 'だれかに、テーブルの上のものを取ってもらう'],
].map(([lv, t], i) => ({ id: i + 1, lv, t }));
const MS_BY_ID = new Map(MS_LIST.map(m => [m.id, m]));
const msPool = o => MS_LIST.filter(m => m.lv === 1 || o === 'all');
const EYE_SVG = '<svg class="ms-art" viewBox="0 0 120 80" aria-hidden="true"><path d="M6 40C22 15 40 4 60 4s38 11 54 36C98 65 80 76 60 76S22 65 6 40Z" fill="#fff" stroke="#150733" stroke-width="4" stroke-linejoin="round"/><circle cx="60" cy="40" r="20" fill="#35e0ff" stroke="#150733" stroke-width="4"/><circle cx="60" cy="40" r="8" fill="#150733"/><circle cx="66" cy="33" r="4" fill="#fff"/></svg>';
const MEMO_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2.5" fill="#fff3b8" stroke="#150733" stroke-width="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#150733" stroke-width="1.6" stroke-linecap="round"/></svg>';
const msOf = p => MS_BY_ID.get((G.pm.ms || {})[p]);
function msGive(ps) {
  const ms = G.pm.ms || (G.pm.ms = {}), have = Object.values(ms);
  ps.forEach(p => {
    const pool = msPool(G.lvl).filter(m => !have.includes(m.id) && m.id !== ms[p]);
    const m = pmDraw(pool.length ? pool : msPool(G.lvl), 1)[0];
    pmUse(m.id); ms[p] = m.id; have.push(m.id);
  });
}
const msBack = () => pxBtn('back', 'もどる', 'white small');
PMX.mission = {
  remote(p) {
    const cur = G.cur, m = G.pm.ms ? msOf(p) : null;
    if (!m) return { v: 'watch', say: 'ミッションが配られるのを待っています' };
    if (cur.phase === 'peek' && cur.peek && cur.peek.ps.slice(cur.peek.at).includes(p)) return { v: 'local' };
    const ask = cur.phase === 'accCheck' && cur.w === p && !cur.open ? pname(cur.by) : '';
    return { v: 'ms', t: m.t, ask, ph: cur.phase === 'claimShow' && cur.w === p ? 'claim' : '' };
  },
  ract(p, m) {
    const cur = G.cur;
    if (m.a === 'ans' && typeof m.ok === 'boolean' && cur.phase === 'accCheck' && cur.w === p && !cur.open) { cur.open = true; this.act(m.ok ? 'aok' : 'ang'); }
  },
  tag: '', hint: 'ミッションを<b>しれっと</b>達成しよう。見破られたら <b>1DON</b>', intro: '<span class="tl-ic">' + EYE_SVG + '</span>しれっとミッション！<small>バレずに達成できる？</small>',
  poolWord: 'ミッション', poolUnit: '個', resCount: '回の判定', quiet: true,
  pool: o => msPool(o).length,
  stats: () => ({ done: 0, caught: 0, spot: 0 }),
  mark: () => null,
  who: () => (G.cur.w != null ? G.cur.w : null),
  logPre: e => ({ done: '達成 ', caught: '見破り ', miss: 'ハズレ ', no: 'ダメ ' }[e.t] || ''), logTag: () => G.cur.ev,
  norm(g) {
    const c = g.cur, n = g.players.length, okP = p => Number.isInteger(p) && p >= 0 && p < n;
    const ms = g.pm.ms && typeof g.pm.ms === 'object' ? g.pm.ms : null;
    const dealt = !!ms && Array.from({ length: n }, (_, i) => i).every(p => MS_BY_ID.has(ms[p]));
    if (!dealt) { g.pm.ms = null; c.phase = 'before'; delete c.peek; return; }
    if (c.phase === 'peek' && !(c.peek && Array.isArray(c.peek.ps) && c.peek.ps.every(okP))) c.phase = 'live';
    const need = { claimShow: ['w'], accSay: ['by', 'w'], accCheck: ['by', 'w'], accRes: ['by', 'w'] }[c.phase];
    if (!['peek', 'live', 'checkWho', 'claimWho', 'claimShow', 'accBy', 'accWho', 'accSay', 'accCheck', 'accRes'].includes(c.phase) || (need && !need.every(k => okP(c[k])))) c.phase = 'live';
  },
  turn() {
    const cur = G.cur, need = G.pm.need || [];
    delete G.pm.need;
    cur.w = null; cur.by = null; cur.ev = null; cur.sel = [];
    if (!G.pm.ms) { cur.phase = 'before'; return; }
    const local = roomLocal(need);
    if (need.length) msGive(need);
    if (local.length) { pxPeekStart(local); cur.peek.newm = true; cur.phase = 'peek'; }
    else cur.phase = 'live';
  },
  stage() {
    const cur = G.cur, head = pxHead();
    if (cur.phase === 'before') return head + (pxLock() || '<div class="pm-big">' + EYE_SVG + '<p class="pm-lead ol">ミッションを配ろう！</p><p class="pm-note">全員に<b>秘密のミッション</b>が1つずつ。<br>あとはふつうに飲んで話すだけ。<br>バレないように、しれっと達成しよう<br><b>自分のスマホのメモ</b>を準備しておくと安心</p>' + pmTryNote() + '</div>');
    if (cur.phase === 'peek') {
      if (!cur.peek.open) return head + pxPeekCover(cur.peek.newm ? '<b>新しいミッション</b>を配り直すよ。ほかの人は見ないでね' : 'ほかの人は画面を見ないでね');
      const p = pxPeekWho(), m = msOf(p);
      return head + '<div class="pm-big px-secret"><p class="px-for">' + pmName(p) + ' のミッション</p><p class="ms-card">' + esc(m.t) + '</p><p class="ms-memo">' + MEMO_ICON + '<span>忘れないように、<b>自分のスマホのメモ</b>に<br>こっそり書いておこう</span></p><p class="pm-note">バレないように、しれっと達成しよう。<br>できたら「達成した！」で名乗り出てね</p>' +
        '</div>';
    }
    const board = '<div class="ms-list">' + G.players.map((pl, i) => '<span class="ms-p" style="--p:' + pc(i) + '"><b>' + esc(pl.name) + '</b><small>達成 ' + pl.done + ' ・ 見破られ ' + pl.caught + '</small></span>').join('') + '</div>';
    if (cur.phase === 'live') return head + '<div class="pm-body"><p class="pm-lead ol">ミッション進行中！</p><p class="pm-note">ふつうに飲んで話そう。<br>あやしい人がいたら「見破った！」<br>達成したら「達成した！」で名乗り出る</p><p class="ms-memo sm">' + MEMO_ICON + '<span>ミッションは自分のスマホのメモに。忘れたら「自分のミッション確認」</span></p>' + board + '</div>';
    if (cur.phase === 'checkWho') return head + '<div class="pm-body"><p class="pm-lead ol">ミッションを確認</p><p class="pm-ask">確認する人をタップ（本人だけ見てね）</p>' + pxChips(pxAll(), null, 'check') + '</div>';
    if (cur.phase === 'claimWho') return head + '<div class="pm-body"><p class="pm-lead ol">達成した人は？</p><p class="pm-ask">名乗り出た人をタップ</p>' + pxChips(pxAll(), null, 'claim') + '</div>';
    if (cur.phase === 'claimShow') return head + '<div class="pm-body"><p class="px-for">' + pmName(cur.w) + ' のミッションは…</p><p class="ms-card open">' + esc(msOf(cur.w).t) + '</p><p class="pm-lead ol">ちゃんと達成してた？</p><p class="pm-note">みんなで判定！ 認めたら、' + esc(pname(cur.w)) + ' 以外の全員が1DON</p></div>';
    if (cur.phase === 'accBy') return head + '<div class="pm-body"><p class="pm-lead ol">見破った人は？</p><p class="pm-ask">「見破った！」と言った人をタップ</p>' + pxChips(pxAll(), null, 'by') + '</div>';
    if (cur.phase === 'accWho') return head + '<div class="pm-body"><p class="px-for">' + pmName(cur.by) + ' が見破った！</p><p class="pm-lead ol">あやしいのはだれ？</p>' + pxChips(pxOthers(cur.by), null, 'who') + '</div>';
    if (cur.phase === 'accSay') return head + '<div class="pm-body"><p class="pm-lead ol">ミッションを予想して！</p><p class="pm-note">' + pmName(cur.by) + ' は、' + pmName(cur.w) + ' のミッションを<br>声に出して言ってね</p><p class="pm-note">言えたら、' + esc(pname(cur.w)) + ' だけが<br>答え合わせをする</p></div>';
    if (cur.phase === 'accCheck' && !cur.open && roomOnline(cur.w)) return head + '<div class="pm-big"><p class="px-for">' + pmName(cur.w) + ' が自分のスマホで答え合わせ中…</p><p class="pm-note">' + pmName(cur.by) + ' の予想は当たってた？</p></div>';
    if (cur.phase === 'accCheck') {
      if (!cur.open) return head + '<div class="pm-big px-pass"><p class="px-step">本人だけ見る</p><p class="px-to"><span class="px-phone" aria-hidden="true"></span>' + pmName(cur.w) + ' に<br>スマホを渡して</p><p class="pm-note">ほかの人は画面を見ないでね</p></div>';
      return head + '<div class="pm-big px-secret"><p class="px-for">' + pmName(cur.w) + ' のミッション</p><p class="ms-card">' + esc(msOf(cur.w).t) + '</p><p class="pm-lead ol">予想は当たってた？</p><p class="pm-note">正直に答えてね</p></div>';
    }
    if (cur.phase === 'accRes') {
      const hit = cur.ev === 'caught';
      return head + '<div class="pm-body"><p class="gk-res ' + (hit ? 'ok' : 'ng') + ' ol">' + (hit ? '見破った！' : 'ハズレ！') + '</p>' +
        (hit ? '<p class="px-for">' + pmName(cur.w) + ' のミッションは</p><p class="ms-card open">' + esc(msOf(cur.w).t) + '</p><p class="pm-ask">' + esc(pname(cur.w)) + ' が1DON。全員のミッションを配り直すよ</p>'
          : '<p class="pm-note">' + pmName(cur.w) + ' のミッションはまだヒミツ</p><p class="pm-ask">まちがえた ' + esc(pname(cur.by)) + ' が1DON</p>') + '</div>';
    }
    return head;
  },
  dock() {
    const cur = G.cur;
    if (cur.phase === 'before') return pmLocked() ? pxRow(pxBtn('end', '結果発表へ')) : pxRow(pxBtn('deal', 'ミッションを配る！', 'big main pulse'));
    if (cur.phase === 'peek') return pxRow(cur.peek.open ? pxPeekNextBtn('覚えた！ スタート ▶', cur.peek.check || cur.peek.newm ? '覚えた！ もどる ▶' : '') : pxPeekOpenBtn());
    if (cur.phase === 'live') return pxRow(pxBtn('checkWho', '自分の<span class="sub">ミッション確認</span>', 'white small') + pxBtn('accBy', '見破った！', 'big main pink grow') + pxBtn('claimWho', '達成<span class="sub">した！</span>', 'cyan small'));
    if (['checkWho', 'claimWho', 'accBy', 'accWho'].includes(cur.phase)) return pxRow(msBack());
    if (cur.phase === 'claimShow') return pxRow(pxBtn('cno', 'できてない<span class="sub">本人が1DON</span>', 'white small') + pxBtn('cyes', '認める！', 'big main grow'));
    if (cur.phase === 'accSay') return pxRow(msBack() + pxBtn('say', '言った！ 答え合わせ', 'big main grow'));
    if (cur.phase === 'accCheck' && !cur.open && roomOnline(cur.w)) return pxRow(msBack() + pxBtn('aopen', '親のスマホで<span class="sub">確かめる</span>', 'white small'));
    if (cur.phase === 'accCheck') return pxRow(!cur.open ? pxBtn('aopen', esc(pname(cur.w)) + 'です。見る！', 'big main pulse') : pxBtn('ang', 'ハズレ', 'white big') + pxBtn('aok', '当たってた', 'big main pink grow'));
    if (cur.phase === 'accRes') return pxRow(pxBtn('next', pmLast() ? '結果発表へ！' : 'つづける ▶', 'big main'));
    return pxRow(msBack());
  },
  act(a, el) {
    const cur = G.cur;
    if (pxBusy) return;
    if (a === 'end') { finishGame(); return; }
    if (a === 'back' && cur.phase !== 'live') { cur.phase = 'live'; cur.w = null; cur.by = null; SE.play('tap'); pxSave(); return; }
    if (cur.phase === 'peek') {
      pxPeekAct(a, () => {
        const start = !G.pm.started; G.pm.started = true;
        cur.phase = 'live'; pxSave();
        if (start) { SE.play('go'); telop('ミッション開始！<small>しれっと達成しよう</small>', '', 1500); } else SE.play('tap');
      });
      return;
    }
    if (a === 'deal' && cur.phase === 'before' && !pmLocked()) {
      G.pm.ms = {}; msGive(pxAll()); tryUse('mission');
      const local = roomLocal(pxAll());
      if (!local.length) { G.pm.started = true; cur.phase = 'live'; SE.play('go'); pxSave(); telop('ミッション開始！<small>自分のスマホでミッションを見てね</small>', '', 1600); return; }
      pxPeekStart(local); cur.phase = 'peek';
      SE.play('deal'); pxSave('pass');
      return;
    }
    if (cur.phase === 'live' && ['checkWho', 'claimWho', 'accBy'].includes(a)) { cur.phase = a; SE.play('tap'); pxSave(); return; }
    const p = pxP(el);
    if (a === 'check' && cur.phase === 'checkWho' && p != null && roomHas(p)) { telop(esc(pname(p)) + 'は自分のスマホで見られます', 'white sm', 1300); SE.play('tap'); return; }
    if (a === 'check' && cur.phase === 'checkWho' && p != null) { pxPeekStart([p]); cur.peek.check = true; cur.phase = 'peek'; SE.play('tap'); pxSave(); return; }
    if (a === 'claim' && cur.phase === 'claimWho' && p != null) { cur.w = p; cur.phase = 'claimShow'; SE.play('swShow'); pxSave(); return; }
    if ((a === 'cyes' || a === 'cno') && cur.phase === 'claimShow') {
      const w = cur.w;
      G.pm.need = a === 'cyes' ? pxAll() : [w];   /* a mission done: everyone gets a new one */
      if (a === 'cyes') { cur.ev = 'done'; G.players[w].done++; G.players[w].medal++; SE.play('fanfare'); telop('ミッション達成！<small>' + esc(pname(w)) + ' 以外の全員が1DON ・ 全員のミッションを配り直し</small>', '', 1800); pmNext(pxCups(pxOthers(w)), true); }
      else { cur.ev = 'no'; SE.play('bubuu'); telop('認められず…<small>' + esc(pname(w)) + ' が1DON</small>', 'red', 1500); pmNext(pxCups([w]), false); }
      return;
    }
    if (a === 'by' && cur.phase === 'accBy' && p != null) { cur.by = p; cur.phase = 'accWho'; SE.play('select'); pxSave(); return; }
    if (a === 'who' && cur.phase === 'accWho' && p != null && p !== cur.by) { cur.w = p; cur.phase = 'accSay'; SE.play('swDrum'); pxSave(); return; }
    if (a === 'say' && cur.phase === 'accSay') { cur.phase = 'accCheck'; cur.open = false; SE.play('tap'); pxSave(); return; }
    if (a === 'aopen' && cur.phase === 'accCheck') { cur.open = true; SE.play('flip'); pxSave(); return; }
    if ((a === 'aok' || a === 'ang') && cur.phase === 'accCheck' && cur.open) {
      cur.open = false; cur.ev = a === 'aok' ? 'caught' : 'miss';
      SE.play('swDrum');
      $('dock').innerHTML = pxRow('<div class="dock-note">判定は…</div>');
      pxLater(() => {
        cur.phase = 'accRes';
        if (cur.ev === 'caught') { G.players[cur.w].caught++; G.players[cur.by].spot++; G.players[cur.by].medal++; SE.play('swShow'); }
        else SE.play('bubuu');
        pxSave();
      }, 1100);
      return;
    }
    if (a === 'next' && cur.phase === 'accRes') {
      const hit = cur.ev === 'caught';
      if (hit) G.pm.need = pxAll();   /* seen through: everyone gets a new one */
      const who = hit ? cur.w : cur.by;
      cur.w = who;
      pmNext(pxCups([who]), false);
    }
  },
};

/* =====================================================================
   ウソかホントか: 話す人だけがお題と「ホント／ウソ」の指示を見る → 30秒で話す → せーので親指 → 答え合わせ
   ===================================================================== */
const US_TALK = 30;
const US_TOPICS = [
  ['l', '有名人に会ったことがある話'], ['l', '子どものころの習いごとの話'], ['l', '人生でいちばん高かった買い物'], ['l', '道に迷った話'], ['l', '旅行先でのハプニング'],
  ['l', '最近ハマっている意外なこと'], ['l', '人生でいちばん食べすぎた日'], ['l', 'アルバイトでの珍事件'], ['l', 'くじ引きや懸賞で当たったもの'], ['l', '動物にまつわる事件'],
  ['l', '落とし物・忘れ物の話'], ['l', 'テレビに映ったことがある話'], ['l', '初めて自分で作った料理'], ['l', '家族の変わった習慣'], ['l', '偶然すぎた出来事'],
  ['l', '学校の先生との思い出'], ['l', '乗り物でのハプニング'], ['l', '実はできる意外な特技'], ['l', '好きな食べ物の変わった食べ方'], ['l', '誕生日の思い出'],
  ['l', '寝坊してやらかした話'], ['l', '夢で見たことが本当になった話'], ['l', '子どものころに集めていたもの'], ['l', '人生でいちばんの大当たり'], ['l', '人に言うと驚かれる経歴'],
  ['l', 'ちょっと自慢できる記録'], ['l', '地元の変わった名物'], ['l', '人生でいちばん寒かった（暑かった）日'], ['l', 'お店でのちょっとした事件'], ['l', '見知らぬ人に助けられた話'],
  ['d', '人生でいちばん恥ずかしかったこと'], ['d', '恋人とのケンカの話'], ['d', 'フラれた話'], ['d', '告白の話'], ['d', '人に言えない失敗'],
  ['d', '酔っぱらってやらかした話'], ['d', '親にバレたらまずい話'], ['d', '学生時代の黒歴史'], ['d', '最近ついたウソ'], ['d', '元恋人の話'],
  ['d', 'デートでの事件'], ['d', '職場や学校でのやらかし'], ['d', '人生でいちばん泣いた日'], ['d', 'ドキッとした瞬間'], ['d', 'モテた話'],
  ['d', '友達とケンカした話'], ['d', 'いちばん怒られた話'], ['d', 'お金の失敗談'], ['d', '人生の大ピンチ'], ['d', 'だれにも言っていない秘密'],
].map(([d, t], i) => ({ id: i + 1, d, t }));
const US_BY_ID = new Map(US_TOPICS.map(q => [q.id, q]));
const usPool = o => US_TOPICS.filter(q => o === 'mix' || q.d === (o === 'light' ? 'l' : 'd'));
const THUMB = up => '<svg class="us-th' + (up ? '' : ' down') + '" viewBox="0 0 30 30" aria-hidden="true"><path d="M5 17h5V6.5a2.5 2.5 0 0 1 5 0V14h7.5a2.5 2.5 0 0 1 2.4 3.1l-1.9 7A3 3 0 0 1 20 26.5H10a5 5 0 0 1-5-5Z" fill="' + (up ? '#a8f03a' : '#ff4fa3') + '" stroke="#150733" stroke-width="2.2" stroke-linejoin="round"/></svg>';
const usQ = () => US_BY_ID.get(G.cur.q) || US_TOPICS[0];
function usPick() { const cur = G.cur, skip = cur.q ? [cur.q] : [], pool = usPool(G.lvl).filter(q => !skip.includes(q.id)), q = pmDraw(pool, 1)[0]; pmUse(q.id); cur.q = q.id; }
/* votes from the players' own phones: { player: true (ホント) / false (ウソ) } */
const usVotes = () => (G.cur.rv && typeof G.cur.rv === 'object' ? G.cur.rv : (G.cur.rv = {}));
const usVoteLine = () => { const ps = pxOthers(G.cur.drawer).filter(roomHas); if (!ps.length) return ''; const n = ps.filter(p => p in usVotes()).length; return '<p class="pm-note">手元で投票：<b>' + n + ' / ' + ps.length + '人</b></p>'; };
PMX.uso = {
  remote(p) {
    const cur = G.cur;
    if (cur.phase === 'before' || !cur.q) return { v: 'watch', say: cur.drawer === p ? 'あなたの番！ 親のスマホで「お題を引く！」' : pname(cur.drawer) + ' の番' };
    const t = usQ().t, left = cur.phase === 'talk' && cur.t0 ? Math.max(0, Math.ceil(US_TALK - (Date.now() - cur.t0) / 1000)) : null;
    if (cur.drawer === p) {
      if (cur.phase === 'secret' && cur.open) return { v: 'local' };
      return { v: 'us', role: 'talk', ph: cur.phase, t, tr: !!cur.truth, left };
    }
    const rv = usVotes(), vote = p in rv ? rv[p] : null;
    if (cur.phase === 'secret') return { v: 'us', role: 'vote', ph: 'secret', t: '？？？', who: pname(cur.drawer) };
    return Object.assign({ v: 'us', role: 'vote', ph: cur.phase, t, who: pname(cur.drawer), vote, left }, cur.phase === 'ans' ? { tr: !!cur.truth, hit: vote === cur.truth } : {});
  },
  ract(p, m) {
    const cur = G.cur;
    if (cur.drawer === p && cur.phase === 'secret' && !cur.open) {
      if (m.a === 're' && cur.truth) { usPick(); SE.play('cdShuffle'); pxSave(); return; }
      if (m.a === 'talk') { cur.phase = 'talk'; cur.t0 = Date.now(); G.players[cur.drawer].told++; SE.play('go'); pxSave(); }
      return;
    }
    if (m.a === 'vote' && typeof m.up === 'boolean' && cur.drawer !== p && (cur.phase === 'talk' || cur.phase === 'vote')) { usVotes()[p] = m.up; SE.play('tap'); pxSave('keep'); }
  },
  tag: '話す', hint: 'ホントかウソか、外した人は <b>1DON</b>', intro: '<span class="tl-ic">' + THUMB(true) + '</span>ウソかホントか！<small>その話、信じる？</small>',
  poolWord: 'お題', poolUnit: '個', resCount: '話',
  pool: o => usPool(o).length,
  stats: () => ({ told: 0, fool: 0, miss: 0 }),
  mark: () => G.cur.drawer,
  who: () => G.cur.drawer, logTag: () => G.cur.q,
  norm(g) {
    const c = g.cur;
    if (!US_BY_ID.has(c.q) || !['secret', 'talk', 'vote', 'ans'].includes(c.phase)) { c.phase = 'before'; return; }
    c.truth = !!c.truth;
    if (c.phase === 'talk' && !c.t0) c.t0 = Date.now();
  },
  stage() {
    const cur = G.cur, head = pxHead(), p = cur.drawer, q = cur.q ? usQ() : null;
    if (cur.phase === 'before') return head + (pxLock() || '<div class="pm-big"><p class="ko-who">' + pmName(p) + ' の番！</p><div class="us-thumbs">' + THUMB(true) + THUMB(false) + '</div><p class="pm-note">お題と「ホントの話」か「ウソの話」かの指示は、<br><b>話す人だけ</b>が見る。30秒で話して、みんなはせーので親指！</p>' + pmTryNote() + '</div>');
    if (cur.phase === 'secret' && !cur.open && roomOnline(p)) return head + '<div class="pm-big"><p class="ko-who">' + pmName(p) + ' の番！</p><p class="pm-lead ol">自分のスマホで<br>お題を見ています</p><p class="pm-note">「話す！」を押したら、30秒で話してね</p></div>';
    if (cur.phase === 'secret') {
      if (!cur.open) return head + '<div class="pm-big px-pass"><p class="px-step">話す人だけ見る</p><p class="px-to"><span class="px-phone" aria-hidden="true"></span>' + pmName(p) + ' に<br>スマホを渡して</p><p class="pm-note">ほかの人は画面を見ないでね</p></div>';
      return head + '<div class="pm-big px-secret"><p class="px-for">' + pmName(p) + ' だけに見せる</p><p class="us-topic">' + esc(q.t) + '</p>' +
        '<p class="us-order ' + (cur.truth ? 'true' : 'lie') + ' ol">' + (cur.truth ? 'ホントの話をして！' : 'ウソの話をして！') + '</p>' +
        '<p class="pm-note">' + (cur.truth ? '本当にあったことを、そのまま話そう' : '本当っぽい作り話で、みんなをだまそう') + '</p>' +
        (cur.truth ? '<p class="pm-note sm">ホントの話が思いつかなければ「別のお題」</p>' : '') + '</div>';
    }
    if (cur.phase === 'talk') return head + '<div class="pm-body"><p class="ko-who">' + pmName(p) + ' のお話</p><p class="us-topic open">' + esc(q.t) + '</p><p class="us-clock" id="usClock">' + US_TALK + '</p>' + usVoteLine() + '<p class="pm-note">ホントの話？ ウソの話？ よーく聞いて</p></div>';
    if (cur.phase === 'vote') return head + '<div class="pm-big"><p class="us-topic open">' + esc(q.t) + '</p><p class="pm-lead ol">せーので親指！</p><div class="us-thumbs big"><span>' + THUMB(true) + '<b>ホント</b></span><span>' + THUMB(false) + '<b>ウソ</b></span></div><p class="pm-note">全員そろえて出したら、答え合わせ</p>' + usVoteLine() + '</div>';
    const others = pxOthers(p), fool = cur.sel.length === others.length;
    return head + '<div class="pm-body"><p class="us-ans ' + (cur.truth ? 'true' : 'lie') + ' ol">' + (cur.truth ? 'ホント！' : 'ウソ！') + '</p><p class="us-topic open sm">' + esc(q.t) + '</p>' +
      '<p class="pm-ask">' + (cur.truth ? '「ウソ」' : '「ホント」') + 'に親指を出した人（外した人）をタップ → 1DON</p>' + pxChips(others, cur.sel, 'sel', '1DON') +
      (fool ? '<p class="pm-ask gold">全員だまされた！ ' + esc(pname(p)) + ' に勲章</p>' : '') + '</div>';
  },
  dock() {
    const cur = G.cur;
    if (cur.phase === 'before') return pmLocked() ? pxRow(pxBtn('end', '結果発表へ')) : pxRow(pxBtn('draw', 'お題を引く！', 'big main pulse'));
    if (cur.phase === 'secret' && !cur.open && roomOnline(cur.drawer)) return pxRow(pxBtn('open', '親のスマホで<span class="sub">見る</span>', 'white small') + '<div class="dock-note grow">' + esc(pname(cur.drawer)) + 'のスマホを待っています</div>');
    if (cur.phase === 'secret') return pxRow(!cur.open ? pxBtn('open', esc(pname(cur.drawer)) + 'です。見る！', 'big main pulse') : (cur.truth ? pxBtn('re', '別の<span class="sub">お題</span>', 'white small') : '') + pxBtn('talk', '話す！<span class="sub">' + US_TALK + '秒</span>', 'big main grow'));
    if (cur.phase === 'talk') return pxRow(pxBtn('done', '話し終わった！', 'big main'));
    if (cur.phase === 'vote') return pxRow(pxBtn('ans', '答え合わせ！', 'big main pink pulse'));
    const k = cur.sel.length;
    return pxRow(pxBtn('next', (k ? k + '人に記録して' : 'だれも外さず ') + (pmLast() ? '結果発表へ！' : '次へ ▶'), 'big main'));
  },
  mounted() {
    if (G.cur.phase !== 'talk') { clearInterval(pxTimer); return; }
    let last = null;
    pxClock(US_TALK, left => {
      const el = $('usClock');
      if (!el || left === last) return;
      last = left;
      el.textContent = left || '時間！';
      el.classList.toggle('hot', left <= 5);
      if (left > 0 && left <= 3) SE.play('tick');
      if (left === 0) { SE.play('timeup'); vibrate([60, 40, 60]); }
    });
  },
  act(a, el) {
    const cur = G.cur;
    if (pxBusy) return;
    if (a === 'end') { finishGame(); return; }
    const pick = usPick;
    if (a === 'draw' && cur.phase === 'before' && !pmLocked()) { pick(); cur.rv = {}; cur.truth = Math.random() < 0.5; cur.open = false; cur.phase = 'secret'; tryUse('uso'); SE.play('deal'); pxSave(); return; }
    if (a === 'open' && cur.phase === 'secret') { cur.open = true; SE.play('flip'); vibrate(15); pxSave(); return; }
    if (a === 're' && cur.phase === 'secret' && cur.open) { pick(); SE.play('cdShuffle'); pxSave(); return; }
    if (a === 'talk' && cur.phase === 'secret' && cur.open) { cur.phase = 'talk'; cur.t0 = Date.now(); G.players[cur.drawer].told++; SE.play('go'); pxSave(); return; }
    if (a === 'done' && cur.phase === 'talk') { clearInterval(pxTimer); cur.phase = 'vote'; SE.play('tap'); pxSave(); return; }
    if (a === 'ans' && cur.phase === 'vote') {
      SE.play('swDrum');
      $('dock').innerHTML = pxRow('<div class="dock-note">答えは…</div>');
      pxLater(() => {
        cur.phase = 'ans';
        const rv = usVotes();
        cur.sel = pxOthers(cur.drawer).filter(p => p in rv && rv[p] !== cur.truth);   /* who voted wrong on their own phone; the rest by the thumbs at the table */
        pxSave(); SE.play(cur.truth ? 'fanfare' : 'swShow'); vibrate(40);
      }, 1300);
      return;
    }
    if (a === 'sel' && cur.phase === 'ans') {
      const p = pxP(el); if (p == null || p === cur.drawer) return;
      const at = cur.sel.indexOf(p); if (at >= 0) cur.sel.splice(at, 1); else cur.sel.push(p);
      SE.play(at >= 0 ? 'tap' : 'select'); pxSave();
      return;
    }
    if (a === 'next' && cur.phase === 'ans') {
      const others = pxOthers(cur.drawer), fool = cur.sel.length === others.length;
      cur.sel.forEach(p => { G.players[p].miss++; });
      if (fool) { G.players[cur.drawer].fool++; G.players[cur.drawer].medal++; telop('全員だました！<small>' + esc(pname(cur.drawer)) + ' に勲章</small>', '', 1400); }
      pmNext(pxCups(cur.sel), fool);
    }
  },
};

/* ---------- 結果発表 ---------- */
const pxStat = (label, v) => '<div class="stat wide"><b>' + esc(v) + '</b><span>' + label + '</span></div>';
Object.assign(PMX.gaka, { resLine: p => 'ニセ画伯 ' + p.fake + '回 ・ 逃げ切り ' + p.esc + '回', resStats: most => pxStat('いちばん逃げ切った', most('esc')) + pxStat('いちばんニセ画伯', most('fake')) });
Object.assign(PMX.reply, { resLine: p => 'IPPON ' + p.best + '回 ・ スベり ' + p.worst + '回', resStats: most => pxStat('IPPON王', most('best')) + pxStat('スベり王', most('worst')) });
Object.assign(PMX.mission, { resLine: p => '達成 ' + p.done + ' ・ 見破り ' + p.spot + ' ・ 見破られ ' + p.caught, resStats: most => pxStat('ミッション王', most('done')) + pxStat('名探偵', most('spot')) });
Object.assign(PMX.uso, { resLine: p => '全員だました ' + p.fool + '回 ・ 外した ' + p.miss + '回', resStats: most => pxStat('ホラ吹き王', most('fool')) + pxStat('いちばんだまされた', most('miss')) });

/* 遊び方ガイド: a page for the four party modes, after 暴露トーク */
if (PLUS_OPEN) GUIDE.splice(Math.max(0, GUIDE.findIndex(x => x.k === 'plus') + 1), 0, { k: 'party', tab: '新モード', html: () =>
  '<p class="gd-lead">タイトル画面の下の段、<b>4つの新モード</b>です。どれもスマホ1台で遊べます。「こっそり見る」場面では、名前が出た人にスマホを渡してね。</p>' +
  gCard('ニセ画伯（3人から）', '<p>「お題を配る！」でスマホを回して、1人ずつお題を見ます。<b>1人だけお題を知らない「ニセ画伯」</b>がいます（ジャンルだけ分かる）。</p>' +
    '<p>1人1筆ずつ、2周で1枚の絵を描きます。<b>指を離したら次の人</b>。描き終わったら、せーので<b>ニセ画伯だと思う人を指さし</b>。</p>' +
    '<p>見破られたらニセ画伯が1DON。ただし、ニセ画伯がお題を当てたら逆転。逃げ切ったら<b>ニセ画伯以外の全員が1DON</b>。描いた絵は保存できます。</p>', 1) +
  gCard('大喜利グランプリ（4人から）', '<p><b>全員が自分のスマホで参加</b>します（親のスマホで遊べるのは1人だけ）。お題が出たら、<b>書けた人から「回答する」</b>。押した順に1つずつ発表されます。</p>' +
    '<p>回答した人以外が<b>「面白い！」</b>で点を入れて、合計<b>10点で IPPON</b> → 勲章。持ち点は1回答につき4人5点・5人4点・6〜8人3点。<b>0点の回答</b>は1DON。親のスマホの「お題を終わる」で次のお題へ。</p>', 2) +
  gCard('しれっとミッション（3人から）', '<p>全員が<b>秘密のミッション</b>を1つ持ちます（例：だれかに「それな」と言わせる）。あとはふつうに飲んで話すだけ。</p>' +
    '<p>達成したら<b>「達成した！」</b>で名乗り出て、みんなが認めたら本人以外の全員が1DON。達成か見破りが出たら、<b>全員のミッションを配り直し</b>ます。あやしい人がいたら<b>「見破った！」</b>→ ミッションを予想して言う → 本人だけが答え合わせ。当たりなら本人、ハズレなら見破った人が1DON。</p>' +
    '<p>ミッションを見たら、<b>自分のスマホのメモにこっそり書いておく</b>と忘れません。忘れたら「自分のミッション確認」で、本人だけ見られます。</p>', 3) +
  gCard('ウソかホントか（2人から）', '<p>番の人だけがスマホを見ます。お題と、<b>「ホントの話」か「ウソの話」かの指示</b>が出ます。</p>' +
    '<p>30秒で話したら、全員せーので<b>親指を上（ホント）か下（ウソ）</b>。答え合わせで<b>外した人が1DON</b>。全員だませたら、話した人に勲章。</p>', 4) +
  gTip('勲章は、IPPON・逃げ切り・ミッション達成などでもらえます。席の右上に出て、結果発表でも数えます。') +
  (ROOM_ON ? gCard('みんなのスマホで参加（プレミアム）', '<p>この4つのモードは、<b>友だちが自分のスマホで参加</b>できます。ゲーム画面の右上の「参加」を押すと、QRコードと4文字の合言葉が出ます。友だちはカメラで読むか、タイトル画面の「参加」で合言葉を入れて、自分の名前を選ぶだけ。<b>参加は無料</b>です。</p>' +
    '<p>お題・ミッション・回答の入力・投票が、それぞれのスマホに出ます。スマホを持っていない人は、今までどおり親のスマホを回して遊べます。</p>', 5) : '')
});

/* =====================================================================
   暴露トーク（もとの恋バナ・暴露。mode のキーは 'koi' のまま）:
   聞き手（答える人の左隣）が2枚から質問を選んで読む → 答えるかパス → もうひと声・♡いい話！ → 次の人。
   「この中で」は指さし（point）か、こっそり投票（vote: 3位から順に発表。だれがだれに入れたかは残さない）
   ===================================================================== */
const KO_TYPE = { ask: '答える', point: '全員で指さし', vote: 'こっそり投票', all: '全員で答える' };
const KO_GENRE = { koi: '恋バナ', bare: '暴露' };
const koLap = () => Math.floor(G.turn / G.players.length) + 1;
const koMax = () => Math.min(3, koLap());
const koAsker = () => (G.cur.drawer + 1) % G.players.length;
const koQ = id => KO_BY_ID.get(id);
const koDepth = lv => '<span class="ko-depth" aria-label="深さ' + lv + '">' + '♡♡♡'.slice(0, lv) + '<i>' + '♡♡♡'.slice(lv) + '</i></span>';
function koTwo() {
  const n = G.players.length, max = koMax(), skip = G.cur.opts || [];
  let pool = koPool(G.lvl).filter(q => q.lv <= max && (n >= 3 || q.t === 'ask' || q.t === 'all') && !skip.includes(q.id));
  if (pool.length < 2) pool = koPool(G.lvl).filter(q => q.lv <= max && (n >= 3 || q.t === 'ask' || q.t === 'all'));
  const a = pmDraw(pool, 1, q => (q.lv === max ? 2 : 1))[0];
  const rest = pool.filter(q => q.id !== a.id), diff = rest.filter(q => q.t !== a.t || q.lv !== a.lv);
  const b = pmDraw(diff.length ? diff : rest, 1)[0];
  return [a, b].filter(Boolean).map(q => q.id);
}
function koCard(q, extra, cls) {
  return '<div class="ko-card face g-' + q.g + (cls ? ' ' + cls : '') + '"><span class="ko-tag">' + KO_GENRE[q.g] + ' ・ ' + KO_TYPE[q.t] + '</span>' + koDepth(q.lv) +
    '<p class="ko-q">' + esc(q.q) + '</p>' + (extra || '') + '</div>';
}
function koTally() {
  const cur = G.cur, cnt = {};
  Object.values(cur.votes || {}).forEach(p => { cnt[p] = (cnt[p] || 0) + 1; });
  delete cur.votes;
  cur.tally = Object.keys(cnt).map(p => ({ p: Number(p), n: cnt[p] })).sort((a, b) => b.n - a.n || a.p - b.p);
  cur.shown = 0;
}
const koSplit = () => G.players.length >= 3 && G.cur.tally.length > 1 && G.cur.tally.every(t => t.n === 1);
const koTop = () => { const t = G.cur.tally, m = t.length ? t[0].n : 0; return koSplit() ? [] : t.filter(x => x.n === m).map(x => x.p); };
function koReveal() {
  const cur = G.cur, steps = Math.min(3, cur.tally.length);
  const step = () => {
    if (!G || G.cur !== cur || cur.phase !== 'tally') return;
    if (cur.shown >= steps) { saveGame(); renderPM(); return; }
    SE.play('swDrum');
    pxLater(() => {
      cur.shown++; saveGame(); renderPM('tally');
      const last = cur.shown >= steps;
      SE.play(last ? (koQ(cur.q).k === 'praise' ? 'fanfare' : 'swShow') : 'pop'); vibrate(last ? [40, 30, 80] : 20);
      if (!last) setTimeout(step, 450); else renderPM('tally');
    }, cur.shown + 1 >= steps ? 1500 : 900);
  };
  step();
}
PMX.koi = {
  tag: '答える', tag2: '聞く', icon: HEART_SVG, hint: '答えるか、DONか。いい話には <b>♡</b>', intro: HEART_SVG + '暴露トーク！<small>答えるか、DONか</small>',
  poolWord: '質問', poolUnit: '問', resCount: '問',
  pool: o => koPool(o).length,
  stats: () => ({ more: 0, votes: 0 }),
  mark: () => G.cur.drawer,
  mark2: () => (G.players.length >= 2 && G.cur.drawer !== koAsker() ? koAsker() : null),
  who: () => { const q = koQ(G.cur.q); return !q || q.t === 'ask' ? G.cur.drawer : null; }, logTag: () => G.cur.q, logH: () => G.cur.h || 0,
  logPre: e => { const q = koQ(e.t); return q && q.t !== 'ask' ? '全員' : ''; },
  norm(g) {
    const c = g.cur, n = g.players.length, okP = p => Number.isInteger(p) && p >= 0 && p < n;
    c.vsel = null;
    if (c.phase === 'pick') { if (!(Array.isArray(c.opts) && c.opts.length && c.opts.every(id => KO_BY_ID.has(id)))) c.phase = 'before'; return; }
    if (!['q', 'more', 'heart', 'vote', 'tally'].includes(c.phase) || !KO_BY_ID.has(c.q)) { c.phase = 'before'; delete c.peek; return; }
    /* a vote that was cut off: everyone votes again from the first person (the votes themselves are never saved for long) */
    if (c.phase === 'vote' || (c.phase === 'q' && KO_BY_ID.get(c.q).t === 'vote')) { c.phase = 'vote'; c.votes = {}; c.peek = { ps: Array.from({ length: n }, (_, i) => (c.drawer + i) % n), at: 0, open: false }; }
    if (c.phase === 'tally') { if (!Array.isArray(c.tally) || !c.tally.every(t => okP(t.p))) c.phase = 'before'; else c.shown = Math.min(3, c.tally.length); }
    if (c.phase === 'more' && !(Array.isArray(KO_BY_ID.get(c.q).more) && KO_BY_ID.get(c.q).more[c.mi])) c.phase = 'heart';
  },
  turn() {
    const max = G.lvl === 'light' ? Math.min(2, koMax()) : koMax();
    if (G.pm.lv && max > G.pm.lv) setTimeout(() => { if (G && screen === 'game') telop('ここから、ちょっと深め！<small>' + '♡'.repeat(max) + '</small>', 'pink', 1600); }, 1100);
    G.pm.lv = max;
  },
  stage(anim) {
    const cur = G.cur, head = pxHead(), p = cur.drawer, a = koAsker(), max = G.lvl === 'light' ? Math.min(2, koMax()) : koMax();
    const depth = '<p class="ko-now">いまの深さ ' + koDepth(max) + '</p>';
    if (cur.phase === 'before') return head + (pxLock() || '<div class="pm-big"><p class="ko-who">' + pmName(p) + ' が答える番</p>' +
      '<div class="ko-backs"><div class="ko-card back"><span class="ko-back">' + HEART_SVG + '<b>Q</b></span></div><div class="ko-card back"><span class="ko-back">' + HEART_SVG + '<b>Q</b></span></div></div>' +
      '<p class="pm-note">聞き手は ' + pmName(a) + '。2枚から質問を選んで、読み上げてね</p>' + depth + pmTryNote() + '</div>');
    if (cur.phase === 'pick') return head + '<div class="pm-body"><p class="pm-ask">' + esc(pname(a)) + '、' + esc(pname(p)) + ' に聞く質問をタップ</p><div class="ko-picks' + (anim === 'pick' ? ' enter' : '') + '">' +
      cur.opts.map((id, i) => { const q = koQ(id); return '<button type="button" class="ko-pick g-' + q.g + (cur.pk === i ? ' sel' : '') + '" data-g="x-pk" data-i="' + i + '" aria-pressed="' + (cur.pk === i) + '"><span class="ko-pt">' + KO_TYPE[q.t] + ' ' + koDepth(q.lv) + '</span><span class="ko-pq">' + esc(q.q) + '</span></button>'; }).join('') + '</div></div>';
    const q = koQ(cur.q);
    if (cur.phase === 'q' && q.t === 'ask') return head + '<div class="pm-body"><p class="ko-who">' + pmName(p) + ' が答える</p>' + koCard(q, '<p class="ko-rule">' + esc(pname(a)) + '、読み上げて！ 答えたくなければパス（1DON）</p>', anim === 'q' ? 'enter' : '') + '</div>';
    if (cur.phase === 'more') return head + '<div class="pm-body"><p class="ko-who">もうひと声！</p>' + koCard(q, '', 'small') + '<div class="ko-card face more g-' + q.g + (anim === 'more' ? ' enter' : '') + '"><span class="ko-tag">もうひと声</span><p class="ko-q">' + esc(q.more[cur.mi]) + '</p><p class="ko-rule">答えるか、0.5DONか</p></div></div>';
    if (cur.phase === 'heart') {
      const canMore = q.more && q.more.length && !cur.md;
      return head + '<div class="pm-body">' + koCard(q, '', 'small') + '<p class="pm-lead ol">いい話だった？</p><p class="pm-note">よかったら「♡いい話！」。' + (canMore ? 'もっと聞きたければ「もうひと声！」' : '') + '</p>' +
        (cur.heart || cur.mok ? '<p class="ko-hearts">' + pmName(p) + ' に ' + '♡'.repeat((cur.heart ? 1 : 0) + (cur.mok ? 1 : 0)) + '</p>' : '') + '</div>';
    }
    if (cur.phase === 'q') {
      const pt = q.t === 'point';
      return head + '<div class="pm-body">' + koCard(q, '<p class="ko-rule">' + (pt ? 'せーので一斉に指さし！ いちばん指された人が1DON。指した理由も1人ずつ' : esc(pname(p)) + ' から1人ずつ答える。答えられなかった人が1DON') + '</p>', anim === 'q' ? 'enter' : '') +
        '<p class="pm-ask">' + (pt ? 'いちばん指された人をタップ' : '答えられなかった・パスした人をタップ') + '</p>' + pxChips(pxAll(), cur.sel, 'sel', '1DON') + '</div>';
    }
    if (cur.phase === 'vote') {
      if (!cur.peek.open) return head + pxPeekCover('だれに入れたかは、だれにも分からない');
      const v = pxPeekWho();
      return head + '<div class="pm-body"><p class="px-for">' + pmName(v) + ' の投票</p>' + koCard(q, '', 'small') + '<p class="pm-ask">1人をタップ（自分には入れられない）</p>' + pxChips(pxOthers(v), cur.vsel, 'vsel') + '</div>';
    }
    /* tally */
    const steps = Math.min(3, cur.tally.length), done = cur.shown >= steps, top = koTop();
    let rows = '';
    for (let i = steps - 1; i >= 0; i--) {
      const t = cur.tally[i], on = steps - 1 - i < cur.shown;
      rows += '<li class="ko-rank' + (on ? ' on' : '') + (done && top.includes(t.p) ? ' top' : '') + '"><b>' + (1 + cur.tally.filter(x => x.n > t.n).length) + '位</b>' + (on ? pmName(t.p) + '<i>' + t.n + '票</i>' : '<span class="ko-hide">？？？</span>') + '</li>';
    }
    const res = !done ? '' : koSplit() ? '<p class="pm-ask gold">意見が割れた！ だれもくらわない</p>' : q.k === 'praise' ? '<p class="pm-ask gold">' + top.map(x => esc(pname(x))).join('・') + ' に ♡</p>' : '<p class="pm-ask">' + top.map(x => esc(pname(x))).join('・') + ' が1DON</p>';
    return head + '<div class="pm-body">' + koCard(q, '', 'small') + '<ol class="ko-ranks">' + rows + '</ol>' + res + '</div>';
  },
  dock() {
    const cur = G.cur;
    if (cur.phase === 'before') return pmLocked() ? pxRow(pxBtn('end', '結果発表へ')) : pxRow(pxBtn('flip', '質問をめくる！', 'big main pulse pink'));
    if (cur.phase === 'pick') return pxRow(pxBtn('re', '2枚とも<span class="sub">入れかえ' + (cur.re ? '済み' : '（1回）') + '</span>', 'white small', cur.re ? ' disabled' : '') + pxBtn('go', cur.pk == null ? '質問をタップ' : 'これにする！', 'big main grow', cur.pk == null ? ' disabled' : ''));
    const q = koQ(cur.q), last = pmLast() ? '結果発表へ！' : '次へ ▶';
    if (cur.phase === 'q' && q.t === 'ask') return pxRow(pxBtn('pass', 'パス<span class="sub">1DON</span>', 'white small') + pxBtn('ok', '答えた！', 'big main grow'));
    if (cur.phase === 'more') return pxRow(pxBtn('mhalf', 'パス<span class="sub">0.5DON</span>', 'white small') + pxBtn('mok', '答えた！', 'big main grow'));
    if (cur.phase === 'heart') {
      const canMore = q.more && q.more.length && !cur.md;
      return pxRow((canMore ? pxBtn('more', 'もうひと声！', 'cyan small') : '') + pxBtn('heart', (cur.heart ? '♡ 送った' : '♡いい話！'), (cur.heart ? 'pink' : 'white') + ' small', cur.heart ? ' aria-pressed="true"' : '') + pxBtn('next', last, 'big main'));
    }
    if (cur.phase === 'q') { const k = cur.sel.length; return pxRow(pxBtn('next', (k ? k + '人に記録して' : '') + last, 'big main')); }
    if (cur.phase === 'vote') return pxRow(!cur.peek.open ? pxPeekOpenBtn() : pxBtn('vote', cur.vsel == null ? '1人をタップ' : (cur.peek.at + 1 >= cur.peek.ps.length ? '投票して発表へ ▶' : '投票して次の人へ ▶'), 'big main', cur.vsel == null ? ' disabled' : ''));
    const done = cur.shown >= Math.min(3, cur.tally.length);
    return pxRow(done ? pxBtn('next', last, 'big main') : '<div class="dock-note">発表中…</div>');
  },
  act(a, el) {
    const cur = G.cur;
    if (pxBusy) return;
    if (a === 'end') { finishGame(); return; }
    if (a === 'flip' && cur.phase === 'before' && !pmLocked()) { cur.opts = koTwo(); cur.pk = null; cur.re = 0; cur.phase = 'pick'; tryUse('koi'); SE.play('deal'); pxSave('pick'); return; }
    if (cur.phase === 'pick') {
      if (a === 're' && !cur.re) { cur.opts = koTwo(); cur.pk = null; cur.re = 1; SE.play('cdShuffle'); pxSave('pick'); return; }
      if (a === 'pk') { const i = Number(el && el.dataset.i); if (i === 0 || i === 1) { cur.pk = cur.pk === i ? null : i; SE.play('select'); pxSave(); } return; }
      if (a === 'go' && cur.pk != null) {
        const q = koQ(cur.opts[cur.pk]);
        cur.q = q.id; pmUse(q.id); useTrack('pm_item', { id: q.id });
        cur.sel = []; cur.heart = false; cur.md = false; cur.mok = false; cur.half = false; cur.h = 0;
        if (q.t === 'vote') { cur.votes = {}; cur.vsel = null; pxPeekStart(Array.from({ length: G.players.length }, (_, i) => (cur.drawer + i) % G.players.length)); cur.phase = 'vote'; SE.play('swoosh'); pxSave(); telop('こっそり投票！<small>スマホを回して1人ずつ</small>', 'pink', 1300); return; }
        cur.phase = 'q'; SE.play('flip'); pxSave('q');
        return;
      }
      return;
    }
    const q = cur.q && koQ(cur.q);
    if (!q) return;
    if (cur.phase === 'q' && q.t === 'ask') {
      if (a === 'pass') { G.players[cur.drawer].pass++; SE.play('gulp'); pmNext(pxCups([cur.drawer]), false); return; }
      if (a === 'ok') { G.players[cur.drawer].ans++; cur.phase = 'heart'; SE.play('ding'); pxSave(); return; }
      return;
    }
    if (cur.phase === 'heart') {
      if (a === 'more' && q.more && q.more.length && !cur.md) { cur.mi = rint(0, q.more.length - 1); cur.md = true; cur.phase = 'more'; SE.play('swDrum'); pxSave('more'); return; }
      if (a === 'heart') { cur.heart = !cur.heart; SE.play(cur.heart ? 'ding' : 'tap'); if (cur.heart) vibrate(15); pxSave(); return; }
      if (a === 'next') {
        const h = (cur.heart ? 1 : 0) + (cur.mok ? 1 : 0);
        cur.h = h; G.players[cur.drawer].medal += h;
        if (h) telop('♡'.repeat(h) + '<small>' + esc(pname(cur.drawer)) + ' に</small>', 'pink', 1100);
        pmNext(cur.half ? [{ p: cur.drawer, amt: 0.5 }] : [], true);
      }
      return;
    }
    if (cur.phase === 'more') {
      if (a === 'mok') { cur.mok = true; G.players[cur.drawer].more++; cur.phase = 'heart'; SE.play('ding'); pxSave(); return; }
      if (a === 'mhalf') { cur.half = true; cur.phase = 'heart'; SE.play('gulp'); pxSave(); return; }
      return;
    }
    if (cur.phase === 'q') {
      if (a === 'sel') { const p = pxP(el); if (p == null) return; const at = cur.sel.indexOf(p); if (at >= 0) cur.sel.splice(at, 1); else cur.sel.push(p); SE.play(at >= 0 ? 'tap' : 'select'); pxSave(); return; }
      if (a === 'next') pmNext(null, false);
      return;
    }
    if (cur.phase === 'vote') {
      if (a === 'peekopen') { pxPeekAct(a, () => {}); return; }
      if (a === 'vsel' && cur.peek && cur.peek.open) { const p = pxP(el); if (p == null || p === pxPeekWho()) return; cur.vsel = cur.vsel === p ? null : p; SE.play('select'); pxSave(); return; }
      if (a === 'vote' && cur.peek && cur.peek.open && cur.vsel != null) {
        cur.votes = cur.votes || {}; cur.votes[pxPeekWho()] = cur.vsel; cur.vsel = null;
        SE.play('swoosh');
        pxPeekAct('peeknext', () => { koTally(); cur.phase = 'tally'; pxSave(); koReveal(); });
      }
      return;
    }
    if (cur.phase === 'tally' && a === 'next' && cur.shown >= Math.min(3, cur.tally.length)) {
      const top = koTop();
      top.forEach(p => { G.players[p].votes++; });
      if (q.k === 'praise') { top.forEach(p => { G.players[p].medal++; }); cur.h = top.length ? 1 : 0; pmNext([], true); }
      else pmNext(pxCups(top), false);
    }
  },
  resLine: p => '♡ ' + p.medal + ' ・ 答えた ' + p.ans + ' ・ パス ' + p.pass,
  resStats(most) {
    const list = G.pm.log.filter(e => koQ(e.t)).slice(-30).map(e => {
      const q = koQ(e.t), who = q.t === 'ask' && G.players[e.k] ? '<b style="--p:' + pc(e.k) + '">' + esc(pname(e.k)) + '</b>' : '<b class="all">全員</b>';
      return '<li>' + who + '<span>' + esc(q.q) + '</span>' + (e.h ? '<i>' + '♡'.repeat(e.h) + '</i>' : '') + '</li>';
    }).join('');
    return pxStat('グランプリ（♡いちばん）', most('medal')) + pxStat('もうひと声に答えた', most('more')) + (list ? '<div class="ko-log"><h3>今夜の質問</h3><ol>' + list + '</ol></div>' : '');
  },
};
