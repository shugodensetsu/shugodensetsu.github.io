
/* =====================================================================
   新しいパーティーモード（プレミアム）: ニセ画伯・返信選手権・しれっとミッション・ウソかホントか
   どれもスマホ1台。PM_MODES の仲間として、王様ゲーム・恋バナと同じ画面（mgBoard + mgStage + dock）で動く。
   ボタンは data-g="x-…" → PMX[mode].act('…')
   ===================================================================== */
PM_MODES.push('gaka', 'reply', 'mission', 'uso');
Object.assign(PM, {
  gaka: { title: 'ニセ画伯', word: '回', opt: 'gaka', optHead: 'お題のむずかしさ', min: 3, flat: true,
    opts: [['easy', 'かんたん', '描きやすいお題'], ['all', 'ミックス', 'ひねったお題も']] },
  reply: { title: '返信選手権', word: '回', opt: 'reply', optHead: 'メッセージの相手', min: 3, flat: true,
    opts: [['all', 'ミックス', 'いろんな人から'], ['safe', 'おだやか', '恋愛ネタなし'], ['koi', '恋愛多め', 'ドキッとする相手']] },
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
    cur.strokes.push(st);
    saveGame();
    SE.play('pop'); vibrate(12);
    gkPaint(cv, cur.strokes);
    if (gkDone()) {
      pxLater(() => { cur.phase = 'vote'; cur.acc = null; pxSave('vote'); SE.play('fanfare'); telop('完成！<small>ニセ画伯はだれだ？</small>', '', 1400); }, 700);
      $('gkWho').innerHTML = '完成！';
      $('dock').innerHTML = pxRow('<div class="dock-note">完成…！</div>');
      return;
    }
    $('gkWho').innerHTML = gkWhoLine();
    $('dock').innerHTML = PMX.gaka.dock();
    $('mgBoard').innerHTML = pmBoard();
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
}
const gkWhoLine = () => pmName(gkDrawer()) + ' の番 <small>' + gkLap() + '周目 ・ ' + (G.cur.strokes.length + 1) + '/' + G.cur.order.length * GK_LAPS + '筆</small>';
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
  x.fillText('ニセ画伯は ' + pname(cur.f) + (cur.res === 'caught' ? '（見破られた）' : '（逃げ切り）') + '　・　酒GO!!伝説', W / 2, 1260);
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
      '<p class="pm-ask">' + (caught ? esc(pname(cur.f)) + ' が1杯' : 'ニセ画伯以外の全員が1杯') + '</p>';
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
      pxPeekStart(pxAll());
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
   返信選手権: メッセージが届く → 1人ずつこっそり返信を入力 → トーク画面のように1件ずつ発表 → いちばん／スベった
   ===================================================================== */
const RP_MSGS = [
  // 0 = だれでも, 1 = 恋愛
  ['上司', '明日の朝、ちょっと時間ある？', 0], ['上司', 'この前の件、どうなってる？', 0], ['母', '元気にしてる？ ちゃんとご飯食べてる？', 0],
  ['母', 'お父さんがスマホを買ったから、使い方を教えてあげて', 0], ['父', '今度の休み、帰ってくるのか？', 0], ['大家さん', '今月の家賃が、まだ入っていないようです', 0],
  ['知らない番号', '久しぶり！ 覚えてる？', 0], ['先輩', '今夜あいてる？ 飲み行こうぜ', 0], ['後輩', '先輩、ちょっと相談があるんですけど…', 0],
  ['友達', 'ごめん、今日ドタキャンしていい？', 0], ['友達', '結婚することになった！', 0], ['友達', 'お金、少し貸してくれない？', 0],
  ['美容師さん', '次回のご予約はいかがですか？', 0], ['推し', 'みんな、今日なにしてた？', 0], ['推し', '明日、大事なお知らせがあります', 0],
  ['同窓会の幹事', '10年ぶりに同窓会やります！ 出欠お願いします', 0], ['おばあちゃん', 'お年玉、今年もあげるからね', 0], ['取引先', '至急、お電話いただけますか', 0],
  ['弟', 'ゲームのアカウント、ちょっと貸して', 0], ['担任の先生', 'タイムカプセルを開けます。来られますか？', 0], ['10年後の自分', '今のうちに、あれだけはやっておけ', 0],
  ['実家の犬', 'おなかすいた', 0], ['バイトの店長', '明日シフト入れる？', 0], ['元同僚', '最近どう？ 実はおもしろい副業があって…', 0],
  ['社長', '👍', 0], ['となりの部屋の人', '夜、少し声が響いています…', 0], ['グループの全員', '（あなた以外、全員既読）', 0],
  ['妹', 'お母さんの誕生日プレゼント、何にする？', 0], ['友達', '今日の服、どこで買ったの？', 0], ['先輩', '今日の飲み会の写真、送っといた', 0],
  ['元恋人', '元気？', 1], ['元恋人', '久しぶりに会えない？', 1], ['元恋人', 'ごめん、まちがえて送った', 1], ['好きな人', '今なにしてる？', 1],
  ['好きな人', '今度ふたりでご飯いかない？', 1], ['好きな人', 'おやすみ', 1], ['恋人', '話があるんだけど', 1], ['恋人', '昨日、だれと飲んでたの？', 1],
  ['恋人', '今日なんの日か覚えてる？', 1], ['マッチングした人', 'プロフィールの写真と、だいぶ雰囲気ちがいますね', 1], ['マッチングした人', 'はじめまして！ 趣味が合いそうでうれしいです', 1],
  ['合コンで会った人', '昨日は楽しかったです！ また会えますか？', 1], ['片思いの相手', '好きな人いるの？', 1], ['幼なじみ', '実は昔、好きだったんだよね', 1],
  ['職場の気になる人', 'この前のお礼に、今度ごちそうさせて', 1], ['告白した相手', 'ごめん、返事おそくなった', 1], ['元恋人', '結婚しました', 1],
  ['好きな人', '明日ひま？', 1], ['恋人', '今から家行っていい？', 1], ['元恋人', 'あの時はごめん', 1], ['デートした人', '今日は楽しかった。でも…', 1],
  ['好きな人', '（3時間ぶりの返信）ごめん寝てた', 1], ['恋人', '最近、なんか冷たくない？', 1], ['好きな人', 'このお店、今度いっしょに行かない？', 1],
].map(([s, m, k], i) => ({ id: i + 1, s, m, k }));
const RP_BY_ID = new Map(RP_MSGS.map(q => [q.id, q]));
const rpPool = o => RP_MSGS.filter(q => o === 'all' || (o === 'koi' ? q.k : !q.k));
const RP_ICON = ['#ff8b6b', '#6bb8ff', '#ffc94d', '#7ed97e', '#c79bff', '#ff7fb4'];
const RP_LETTERS = 'ABCDEFGH';
let rpTyping = false, rpKeep = null;
const rpHold = () => { const l = $('rpList'); rpKeep = l ? l.scrollTop : null; };
const rpMsg = () => RP_BY_ID.get(G.cur.q) || RP_MSGS[0];
const rpTime = m => { const t = (G.cur.tm || 1290) + m; return Math.floor(t / 60) % 24 + ':' + String(t % 60).padStart(2, '0'); };
function rpChat(body, foot, cls) {
  const q = rpMsg();
  return '<div class="rp-chat' + (cls ? ' ' + cls : '') + '"><div class="rp-bar"><span class="rp-back" aria-hidden="true">‹</span><b>' + esc(q.s) + '</b><span class="rp-ic" aria-hidden="true"><i></i><i></i><i></i></span></div>' +
    '<div class="rp-list" id="rpList"><p class="rp-day"><span>今日</span></p>' +
    '<div class="rp-in"><span class="rp-av" style="--c:' + RP_ICON[q.id % RP_ICON.length] + '">' + esc([...q.s][0]) + '</span><div class="rp-in-b"><span class="rp-nm">' + esc(q.s) + '</span><span class="rp-row"><span class="rp-bub">' + esc(q.m) + '</span><span class="rp-meta">' + rpTime(0) + '</span></span></div></div>' +
    (body || '') + '</div>' + (foot || '') + '</div>';
}
function rpOut(k, pick, named) {
  const cur = G.cur, p = cur.ord[k], txt = cur.rep[p], cls = (cur.best === k ? ' best' : '') + (cur.worst === k ? ' worst' : '') + (pick === k ? ' sel' : '');
  const tagged = (named || cur.best === k || cur.worst === k) ? '<span class="rp-who" style="--p:' + pc(p) + '">' + esc(pname(p)) + (cur.best === k ? ' ・ いちばん！' : cur.worst === k ? ' ・ スベった…' : '') + '</span>' : '';
  const inner = '<span class="rp-meta"><b class="rp-tag">' + RP_LETTERS[k] + '</b><span>既読<br>' + rpTime(2 + k) + '</span></span>' +
    (txt == null ? '<span class="rp-bub skip">（既読スルー）</span>' : '<span class="rp-bub">' + esc(txt) + '</span>');
  const pickable = pick !== undefined && cur.best !== k;
  return '<div class="rp-out' + cls + '">' + (pickable ? '<button type="button" class="rp-pick" data-g="x-pick" data-i="' + k + '" aria-pressed="' + (pick === k) + '" aria-label="返信' + RP_LETTERS[k] + '">' + inner + '</button>' : '<div class="rp-pick">' + inner + '</div>') + tagged + '</div>';
}
const rpTypingBub = () => '<div class="rp-out typing"><div class="rp-pick"><span class="rp-bub"><i></i><i></i><i></i></span></div></div>';
PMX.reply = {
  tag: '返信', hint: 'いちばんの返信に勲章。スベった人は <b>1杯</b>', intro: '<span class="tl-ic rp-tl"></span>返信選手権！<small>あなたなら、なんて返す？</small>',
  poolWord: 'メッセージ', poolUnit: '通', resCount: 'メッセージ',
  pool: o => rpPool(o).length,
  stats: () => ({ best: 0, worst: 0 }),
  mark: () => (G.cur.phase === 'write' && G.cur.peek ? pxPeekWho() : null),
  who: () => (G.cur.best != null ? G.cur.ord[G.cur.best] : null), logPre: () => '★ ', logTag: () => G.cur.q,
  quiet: false,
  norm(g) {
    const c = g.cur, n = g.players.length, okP = p => Number.isInteger(p) && p >= 0 && p < n;
    if (!RP_BY_ID.has(c.q) || !['msg', 'write', 'show', 'best', 'worst', 'names'].includes(c.phase)) { c.phase = 'before'; delete c.peek; return; }
    c.rep = c.rep && typeof c.rep === 'object' ? c.rep : {};
    if (c.phase === 'write' && !(c.peek && Array.isArray(c.peek.ps))) c.phase = 'msg';
    if (c.phase !== 'msg' && c.phase !== 'write' && !(Array.isArray(c.ord) && c.ord.length === n && c.ord.every(okP))) { c.phase = 'msg'; c.rep = {}; }
  },
  stage() {
    const cur = G.cur, head = pxHead();
    if (cur.phase === 'before') return head + (pxLock() || '<div class="pm-big"><div class="rp-notice"><span class="rp-av sm" style="--c:#ffc94d">?</span><span><b>新着メッセージ</b><small>タップして開いてね</small></span><i>1</i></div><p class="pm-lead ol">メッセージが届いた！</p><p class="pm-note">全員が1人ずつこっそり返信を書いて、<br>最後にトーク画面で発表。いちばんの返信はどれ？</p>' + pmTryNote() + '</div>');
    if (cur.phase === 'msg') return head + '<p class="gk-top">このメッセージに、<b>あなたならなんて返す？</b></p>' + rpChat('', '', 'grow');
    if (cur.phase === 'write') {
      if (!cur.peek.open) return head + pxPeekCover('返信はこっそり書く。だれの返信かは最後までヒミツ');
      return head + '<p class="px-for">' + pmName(pxPeekWho()) + ' の返信</p>' + rpChat('', '<div class="rp-input"><textarea id="rpIn" maxlength="80" rows="2" enterkeyhint="send" placeholder="メッセージを入力" aria-label="返信を入力"></textarea><button type="button" class="rp-send" data-g="x-send" aria-label="送信"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 20.5 4 14 21l-2.5-7.5Z" fill="currentColor"/></svg></button></div>', 'grow write');
    }
    const shown = cur.phase === 'show' ? cur.shown : cur.ord.length;
    let body = '';
    for (let k = 0; k < shown; k++) body += rpOut(k, cur.phase === 'best' || cur.phase === 'worst' ? cur.pick : undefined, cur.phase === 'names');
    if (cur.phase === 'show' && rpTyping) body += rpTypingBub();
    const ask = cur.phase === 'best' ? '<b>いちばんの返信</b>は？ せーので指さし → タップ' : cur.phase === 'worst' ? '<b>いちばんスベった返信</b>は？ → タップ' : cur.phase === 'names' ? 'だれの返信だった？' : '返信は全部で ' + cur.ord.length + '件';
    return head + '<p class="gk-top">' + ask + '</p>' + rpChat(body, '', 'grow show');
  },
  dock() {
    const cur = G.cur;
    if (cur.phase === 'before') return pmLocked() ? pxRow(pxBtn('end', '結果発表へ')) : pxRow(pxBtn('open', 'メッセージを開く', 'big main pulse'));
    if (cur.phase === 'msg') return pxRow(pxBtn('write', '返信を書く ▶', 'big main'));
    if (cur.phase === 'write') return pxRow(cur.peek.open ? pxBtn('skip', '既読<span class="sub">スルーする</span>', 'white small') + pxBtn('send', '送信', 'big main grow') : pxPeekOpenBtn());
    if (cur.phase === 'show') return pxRow(rpTyping ? '<div class="dock-note">入力中…</div>' : pxBtn('more', cur.shown ? '次の返信を見る<span class="sub">あと ' + (cur.ord.length - cur.shown) + '件</span>' : '返信を見る！', 'big main pulse'));
    if (cur.phase === 'best') return pxRow(pxBtn('best', cur.pick == null ? 'いちばんの返信をタップ' : '返信' + RP_LETTERS[cur.pick] + ' に決定！', 'big main', cur.pick == null ? ' disabled' : ''));
    if (cur.phase === 'worst') return pxRow(pxBtn('noworst', 'スベった<span class="sub">返信なし</span>', 'white small') + pxBtn('worst', cur.pick == null ? 'スベった返信をタップ' : '返信' + RP_LETTERS[cur.pick] + ' に決定', 'big main pink grow', cur.pick == null ? ' disabled' : ''));
    return pxRow(pxBtn('next', pmLast() ? '結果発表へ！' : '次のメッセージへ ▶', 'big main'));
  },
  mounted(anim) {
    const cur = G.cur, list = $('rpList');
    if (list) list.scrollTop = anim === 'top' ? 0 : anim === 'keep' && rpKeep != null ? rpKeep : list.scrollHeight;
    const inp = $('rpIn');
    if (inp) {
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); PMX.reply.act('send'); } });
      if (cur.phase === 'write' && !matchMedia('(pointer:coarse)').matches) inp.focus({ preventScroll: true });
    }
  },
  act(a, el) {
    const cur = G.cur, n = G.players.length;
    if (pxBusy) return;
    if (a === 'end') { finishGame(); return; }
    if (a === 'open' && cur.phase === 'before' && !pmLocked()) {
      const q = pmDraw(rpPool(G.lvl), 1)[0];
      pmUse(q.id);
      cur.q = q.id; cur.rep = {}; cur.tm = rint(19, 23) * 60 + rint(0, 59) - 6; cur.ord = null; cur.best = null; cur.worst = null; cur.pick = null; cur.shown = 0;
      cur.phase = 'msg';
      tryUse('reply');
      SE.play('ticket'); vibrate([30, 40, 30]);
      pxSave('top');
      return;
    }
    if (a === 'write' && cur.phase === 'msg') { pxPeekStart(Array.from({ length: n }, (_, i) => (G.turn + i) % n)); cur.phase = 'write'; SE.play('tap'); pxSave(); return; }
    if (cur.phase === 'write' && (a === 'peekopen')) { pxPeekAct(a, () => {}); return; }
    if (cur.phase === 'write' && (a === 'send' || a === 'skip') && cur.peek && cur.peek.open) {
      const inp = $('rpIn'), txt = inp ? inp.value.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
      if (a === 'send' && !txt) { if (inp) { inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); inp.focus(); } SE.play('boing'); return; }
      cur.rep[pxPeekWho()] = a === 'skip' ? null : txt;
      SE.play(a === 'skip' ? 'tap' : 'swoosh');
      pxPeekAct('peeknext', () => {
        cur.ord = shuffle(pxAll()); cur.shown = 0; cur.phase = 'show';
        pxSave('top'); SE.play('fanfare'); telop('返信がそろった！<small>トーク画面で発表</small>', '', 1300);
      });
      return;
    }
    if (a === 'more' && cur.phase === 'show' && !rpTyping) {
      rpTyping = true; renderPM(); SE.play('tick2');
      pxLater(() => {
        rpTyping = false; cur.shown++;
        if (cur.shown >= cur.ord.length) { cur.phase = 'best'; cur.pick = null; }
        pxSave(); SE.play('pop'); vibrate(15);
        if (cur.phase === 'best') setTimeout(() => { if (G && G.cur === cur) telop('いちばんの返信は？<small>せーので指さし！</small>', '', 1400); }, 700);
      }, 900);
      return;
    }
    if (a === 'pick' && (cur.phase === 'best' || cur.phase === 'worst')) {
      const k = Number(el && el.dataset.i);
      if (!Number.isInteger(k) || k < 0 || k >= cur.ord.length || k === cur.best) return;
      cur.pick = cur.pick === k ? null : k; SE.play('select'); rpHold(); pxSave('keep');
      return;
    }
    if (a === 'best' && cur.phase === 'best' && cur.pick != null) {
      cur.best = cur.pick; cur.pick = null;
      const p = cur.ord[cur.best];
      G.players[p].best++; G.players[p].medal++;
      cur.phase = n >= 3 ? 'worst' : 'names';
      rpHold(); pxSave('keep'); SE.play('fanfare'); vibrate([40, 30, 80]);
      telop(esc(pname(p)) + '<small>の返信が いちばん！</small>', '', 1600);
      return;
    }
    if ((a === 'worst' || a === 'noworst') && cur.phase === 'worst') {
      if (a === 'worst') { if (cur.pick == null) return; cur.worst = cur.pick; G.players[cur.ord[cur.worst]].worst++; SE.play('bubuu'); telop(esc(pname(cur.ord[cur.worst])) + '<small>の返信が スベった…</small>', 'red', 1500); }
      else SE.play('tap');
      cur.pick = null; cur.phase = 'names';
      rpHold(); pxSave('keep');
      return;
    }
    if (a === 'next' && cur.phase === 'names') pmNext(cur.worst != null ? pxCups([cur.ord[cur.worst]]) : [], true);
  },
};

/* =====================================================================
   しれっとミッション: 全員が秘密のミッションを持って、ふつうに飲んで話す。達成したら名乗り出る、あやしい人は「見破った！」
   ===================================================================== */
const MS_LIST = [
  // lv 1 = かんたん, 2 = むずかしい
  [1, 'だれかに「それな」と言わせる'], [1, '会話の中で「パイナップル」と言う'], [1, 'だれかと2回乾杯する'], [1, 'だれかに「なんで？」と聞き返させる'],
  [1, 'だれかの持ち物をほめる'], [1, 'だれかに「ありがとう」と言わせる'], [1, '3回続けて「たしかに」と相づちを打つ'], [1, 'だれかに自分の名前を呼ばせる'],
  [1, '会話の中で、都道府県を3つ言う'], [1, 'だれかに「え？」と言わせる'], [1, '会話に「昭和」という言葉を入れる'], [1, 'だれかに好きな食べ物を言わせる'],
  [1, 'だれかに今何時か聞かれる'], [1, 'だれかに、最近見た動画の話をさせる'], [1, '話の途中で、一度だけ英語を混ぜる'], [1, 'だれかとハイタッチする'],
  [1, 'だれかに「わかる」と言わせる'], [1, 'だれかに、明日の予定を聞く'], [1, '会話の中で、動物の名前を3つ言う'], [1, 'だれかに自分のグラスの中身を聞かれる'],
  [1, 'だれかに「たしかに」と言わせる'], [1, '話の途中で、急に立ち上がる'], [1, 'だれかに出身地を言わせる'], [1, '会話の中で「ちなみに」を3回使う'],
  [1, 'だれかに「おいしい」と言わせる'], [1, 'だれかに天気の話をさせる'], [1, 'だれかと同時に同じ言葉を言う'], [1, '店員さんを呼ぶ係になる'],
  [1, 'だれかに、自分の話で笑ってもらう'], [1, 'だれかに「すごい」と言わせる'],
  [2, 'だれかに「パイナップル」と言わせる'], [2, 'だれかに自分のモノマネをさせる'], [2, 'だれかに「天才」と言わせる'], [2, 'だれかに歌を歌わせる（ワンフレーズでOK）'],
  [2, 'だれかに英語で1文しゃべらせる'], [2, 'だれかに「ごめん」と言わせる'], [2, '会話の中で、ことわざを2つ使う'], [2, 'だれかに腕を組ませる'],
  [2, 'だれかに「おいしい」と3回言わせる'], [2, 'だれかに方言をしゃべらせる'], [2, 'だれかに初恋の話をさせる'], [2, 'だれかに、自分をあだ名で呼ばせる'],
  [2, 'だれかに手をたたいて笑わせる'], [2, 'だれかに、スマホの写真を1枚見せてもらう'], [2, 'だれかに、昨日の晩ごはんを言わせる'], [2, '話を「ここだけの話なんだけど」から始める'],
  [2, 'だれかに「えー！」と驚かせる'], [2, 'だれかに自分のグラスを持たせる'], [2, 'だれかに指で数字を出させる'], [2, 'だれかに「わかる」と2回言わせる'],
  [2, 'だれかに自分の苗字を言わせる'], [2, 'だれかに好きな芸能人を言わせる'], [2, 'だれかに「それは言いすぎ」と言わせる'], [2, '2人に同時に同じ質問をして、同時に答えさせる'],
  [2, 'だれかに、自分の誕生日を当ててもらう'], [2, 'だれかに、昔のあだ名を言わせる'], [2, 'だれかに「マジで？」と3回言わせる'], [2, 'だれかに、子どものころの夢を語らせる'],
  [2, 'だれかに、あなたの席に座ってもらう'], [2, 'だれかに、テーブルの上のものを取ってもらう'],
].map(([lv, t], i) => ({ id: i + 1, lv, t }));
const MS_BY_ID = new Map(MS_LIST.map(m => [m.id, m]));
const msPool = o => MS_LIST.filter(m => m.lv === 1 || o === 'all');
const EYE_SVG = '<svg class="ms-art" viewBox="0 0 120 80" aria-hidden="true"><path d="M6 40C22 15 40 4 60 4s38 11 54 36C98 65 80 76 60 76S22 65 6 40Z" fill="#fff" stroke="#150733" stroke-width="4" stroke-linejoin="round"/><circle cx="60" cy="40" r="20" fill="#35e0ff" stroke="#150733" stroke-width="4"/><circle cx="60" cy="40" r="8" fill="#150733"/><circle cx="66" cy="33" r="4" fill="#fff"/></svg>';
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
  tag: '', hint: 'ミッションを<b>しれっと</b>達成しよう。見破られたら <b>1杯</b>', intro: '<span class="tl-ic">' + EYE_SVG + '</span>しれっとミッション！<small>バレずに達成できる？</small>',
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
    if (need.length) { msGive(need); pxPeekStart(need); cur.peek.newm = true; cur.phase = 'peek'; }
    else cur.phase = 'live';
  },
  stage() {
    const cur = G.cur, head = pxHead();
    if (cur.phase === 'before') return head + (pxLock() || '<div class="pm-big">' + EYE_SVG + '<p class="pm-lead ol">ミッションを配ろう！</p><p class="pm-note">全員に<b>秘密のミッション</b>が1つずつ。<br>あとはふつうに飲んで話すだけ。<br>バレないように、しれっと達成しよう</p>' + pmTryNote() + '</div>');
    if (cur.phase === 'peek') {
      if (!cur.peek.open) return head + pxPeekCover(cur.peek.newm ? '<b>新しいミッション</b>を渡すよ。ほかの人は見ないでね' : 'ほかの人は画面を見ないでね');
      const p = pxPeekWho(), m = msOf(p);
      return head + '<div class="pm-big px-secret"><p class="px-for">' + pmName(p) + ' のミッション</p><p class="ms-card">' + esc(m.t) + '</p><p class="pm-note">バレないように、しれっと達成しよう。<br>できたら「達成した！」で名乗り出てね</p>' +
        (cur.peek.check ? '' : '<button type="button" class="pm-link" data-g="x-reroll">ほかのミッションにする</button>') + '</div>';
    }
    const board = '<div class="ms-list">' + G.players.map((pl, i) => '<span class="ms-p" style="--p:' + pc(i) + '"><b>' + esc(pl.name) + '</b><small>達成 ' + pl.done + ' ・ 見破られ ' + pl.caught + '</small></span>').join('') + '</div>';
    if (cur.phase === 'live') return head + '<div class="pm-body"><p class="pm-lead ol">ミッション進行中！</p><p class="pm-note">ふつうに飲んで話そう。<br>あやしい人がいたら「見破った！」<br>達成したら「達成した！」で名乗り出る</p>' + board + '</div>';
    if (cur.phase === 'checkWho') return head + '<div class="pm-body"><p class="pm-lead ol">ミッションを確認</p><p class="pm-ask">確認する人をタップ（本人だけ見てね）</p>' + pxChips(pxAll(), null, 'check') + '</div>';
    if (cur.phase === 'claimWho') return head + '<div class="pm-body"><p class="pm-lead ol">達成した人は？</p><p class="pm-ask">名乗り出た人をタップ</p>' + pxChips(pxAll(), null, 'claim') + '</div>';
    if (cur.phase === 'claimShow') return head + '<div class="pm-body"><p class="px-for">' + pmName(cur.w) + ' のミッションは…</p><p class="ms-card open">' + esc(msOf(cur.w).t) + '</p><p class="pm-lead ol">ちゃんと達成してた？</p><p class="pm-note">みんなで判定！ 認めたら、' + esc(pname(cur.w)) + ' 以外の全員が1杯</p></div>';
    if (cur.phase === 'accBy') return head + '<div class="pm-body"><p class="pm-lead ol">見破った人は？</p><p class="pm-ask">「見破った！」と言った人をタップ</p>' + pxChips(pxAll(), null, 'by') + '</div>';
    if (cur.phase === 'accWho') return head + '<div class="pm-body"><p class="px-for">' + pmName(cur.by) + ' が見破った！</p><p class="pm-lead ol">あやしいのはだれ？</p>' + pxChips(pxOthers(cur.by), null, 'who') + '</div>';
    if (cur.phase === 'accSay') return head + '<div class="pm-body"><p class="pm-lead ol">ミッションを予想して！</p><p class="pm-note">' + pmName(cur.by) + ' は、' + pmName(cur.w) + ' のミッションを<br>声に出して言ってね</p><p class="pm-note">言えたら、' + esc(pname(cur.w)) + ' だけが<br>答え合わせをする</p></div>';
    if (cur.phase === 'accCheck') {
      if (!cur.open) return head + '<div class="pm-big px-pass"><p class="px-step">本人だけ見る</p><p class="px-to"><span class="px-phone" aria-hidden="true"></span>' + pmName(cur.w) + ' に<br>スマホを渡して</p><p class="pm-note">ほかの人は画面を見ないでね</p></div>';
      return head + '<div class="pm-big px-secret"><p class="px-for">' + pmName(cur.w) + ' のミッション</p><p class="ms-card">' + esc(msOf(cur.w).t) + '</p><p class="pm-lead ol">予想は当たってた？</p><p class="pm-note">正直に答えてね</p></div>';
    }
    if (cur.phase === 'accRes') {
      const hit = cur.ev === 'caught';
      return head + '<div class="pm-body"><p class="gk-res ' + (hit ? 'ok' : 'ng') + ' ol">' + (hit ? '見破った！' : 'ハズレ！') + '</p>' +
        (hit ? '<p class="px-for">' + pmName(cur.w) + ' のミッションは</p><p class="ms-card open">' + esc(msOf(cur.w).t) + '</p><p class="pm-ask">' + esc(pname(cur.w)) + ' が1杯。新しいミッションを渡すよ</p>'
          : '<p class="pm-note">' + pmName(cur.w) + ' のミッションはまだヒミツ</p><p class="pm-ask">まちがえた ' + esc(pname(cur.by)) + ' が1杯</p>') + '</div>';
    }
    return head;
  },
  dock() {
    const cur = G.cur;
    if (cur.phase === 'before') return pmLocked() ? pxRow(pxBtn('end', '結果発表へ')) : pxRow(pxBtn('deal', 'ミッションを配る！', 'big main pulse'));
    if (cur.phase === 'peek') return pxRow(cur.peek.open ? pxPeekNextBtn('覚えた！ スタート ▶', cur.peek.check || cur.peek.newm ? '覚えた！ もどる ▶' : '') : pxPeekOpenBtn());
    if (cur.phase === 'live') return pxRow(pxBtn('checkWho', '自分の<span class="sub">ミッション確認</span>', 'white small') + pxBtn('accBy', '見破った！', 'big main pink grow') + pxBtn('claimWho', '達成<span class="sub">した！</span>', 'cyan small'));
    if (['checkWho', 'claimWho', 'accBy', 'accWho'].includes(cur.phase)) return pxRow(msBack());
    if (cur.phase === 'claimShow') return pxRow(pxBtn('cno', 'できてない<span class="sub">本人が1杯</span>', 'white small') + pxBtn('cyes', '認める！', 'big main grow'));
    if (cur.phase === 'accSay') return pxRow(msBack() + pxBtn('say', '言った！ 答え合わせ', 'big main grow'));
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
      if (a === 'reroll' && cur.peek.open && !cur.peek.check) { msGive([pxPeekWho()]); SE.play('cdShuffle'); pxSave(); return; }
      pxPeekAct(a, () => {
        const start = !G.pm.started; G.pm.started = true;
        cur.phase = 'live'; pxSave();
        if (start) { SE.play('go'); telop('ミッション開始！<small>しれっと達成しよう</small>', '', 1500); } else SE.play('tap');
      });
      return;
    }
    if (a === 'deal' && cur.phase === 'before' && !pmLocked()) {
      G.pm.ms = {}; msGive(pxAll()); tryUse('mission');
      pxPeekStart(pxAll()); cur.phase = 'peek';
      SE.play('deal'); pxSave('pass');
      return;
    }
    if (cur.phase === 'live' && ['checkWho', 'claimWho', 'accBy'].includes(a)) { cur.phase = a; SE.play('tap'); pxSave(); return; }
    const p = pxP(el);
    if (a === 'check' && cur.phase === 'checkWho' && p != null) { pxPeekStart([p]); cur.peek.check = true; cur.phase = 'peek'; SE.play('tap'); pxSave(); return; }
    if (a === 'claim' && cur.phase === 'claimWho' && p != null) { cur.w = p; cur.phase = 'claimShow'; SE.play('swShow'); pxSave(); return; }
    if ((a === 'cyes' || a === 'cno') && cur.phase === 'claimShow') {
      const w = cur.w;
      G.pm.need = [w];
      if (a === 'cyes') { cur.ev = 'done'; G.players[w].done++; G.players[w].medal++; SE.play('fanfare'); telop('ミッション達成！<small>' + esc(pname(w)) + ' 以外の全員が1杯</small>', '', 1600); pmNext(pxCups(pxOthers(w)), true); }
      else { cur.ev = 'no'; SE.play('bubuu'); telop('認められず…<small>' + esc(pname(w)) + ' が1杯</small>', 'red', 1500); pmNext(pxCups([w]), false); }
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
      if (hit) G.pm.need = [cur.w];
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
PMX.uso = {
  tag: '話す', hint: 'ホントかウソか、外した人は <b>1杯</b>', intro: '<span class="tl-ic">' + THUMB(true) + '</span>ウソかホントか！<small>その話、信じる？</small>',
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
    if (cur.phase === 'secret') {
      if (!cur.open) return head + '<div class="pm-big px-pass"><p class="px-step">話す人だけ見る</p><p class="px-to"><span class="px-phone" aria-hidden="true"></span>' + pmName(p) + ' に<br>スマホを渡して</p><p class="pm-note">ほかの人は画面を見ないでね</p></div>';
      return head + '<div class="pm-big px-secret"><p class="px-for">' + pmName(p) + ' だけに見せる</p><p class="us-topic">' + esc(q.t) + '</p>' +
        '<p class="us-order ' + (cur.truth ? 'true' : 'lie') + ' ol">' + (cur.truth ? 'ホントの話をして！' : 'ウソの話をして！') + '</p>' +
        '<p class="pm-note">' + (cur.truth ? '本当にあったことを、そのまま話そう' : '本当っぽい作り話で、みんなをだまそう') + '</p>' +
        (cur.truth ? '<p class="pm-note sm">ホントの話が思いつかなければ「別のお題」</p>' : '') + '</div>';
    }
    if (cur.phase === 'talk') return head + '<div class="pm-body"><p class="ko-who">' + pmName(p) + ' のお話</p><p class="us-topic open">' + esc(q.t) + '</p><p class="us-clock" id="usClock">' + US_TALK + '</p><p class="pm-note">ホントの話？ ウソの話？ よーく聞いて</p></div>';
    if (cur.phase === 'vote') return head + '<div class="pm-big"><p class="us-topic open">' + esc(q.t) + '</p><p class="pm-lead ol">せーので親指！</p><div class="us-thumbs big"><span>' + THUMB(true) + '<b>ホント</b></span><span>' + THUMB(false) + '<b>ウソ</b></span></div><p class="pm-note">全員そろえて出したら、答え合わせ</p></div>';
    const others = pxOthers(p), fool = cur.sel.length === others.length;
    return head + '<div class="pm-body"><p class="us-ans ' + (cur.truth ? 'true' : 'lie') + ' ol">' + (cur.truth ? 'ホント！' : 'ウソ！') + '</p><p class="us-topic open sm">' + esc(q.t) + '</p>' +
      '<p class="pm-ask">' + (cur.truth ? '「ウソ」' : '「ホント」') + 'に親指を出した人（外した人）をタップ → 1杯</p>' + pxChips(others, cur.sel, 'sel', '1杯') +
      (fool ? '<p class="pm-ask gold">全員だまされた！ ' + esc(pname(p)) + ' に勲章</p>' : '') + '</div>';
  },
  dock() {
    const cur = G.cur;
    if (cur.phase === 'before') return pmLocked() ? pxRow(pxBtn('end', '結果発表へ')) : pxRow(pxBtn('draw', 'お題を引く！', 'big main pulse'));
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
    const pick = () => { const skip = cur.q ? [cur.q] : []; const pool = usPool(G.lvl).filter(q => !skip.includes(q.id)); const q = pmDraw(pool, 1)[0]; pmUse(q.id); cur.q = q.id; };
    if (a === 'draw' && cur.phase === 'before' && !pmLocked()) { pick(); cur.truth = Math.random() < 0.5; cur.open = false; cur.phase = 'secret'; tryUse('uso'); SE.play('deal'); pxSave(); return; }
    if (a === 'open' && cur.phase === 'secret') { cur.open = true; SE.play('flip'); vibrate(15); pxSave(); return; }
    if (a === 're' && cur.phase === 'secret' && cur.open) { pick(); SE.play('cdShuffle'); pxSave(); return; }
    if (a === 'talk' && cur.phase === 'secret' && cur.open) { cur.phase = 'talk'; cur.t0 = Date.now(); G.players[cur.drawer].told++; SE.play('go'); pxSave(); return; }
    if (a === 'done' && cur.phase === 'talk') { clearInterval(pxTimer); cur.phase = 'vote'; SE.play('tap'); pxSave(); return; }
    if (a === 'ans' && cur.phase === 'vote') {
      SE.play('swDrum');
      $('dock').innerHTML = pxRow('<div class="dock-note">答えは…</div>');
      pxLater(() => { cur.phase = 'ans'; cur.sel = []; pxSave(); SE.play(cur.truth ? 'fanfare' : 'swShow'); vibrate(40); }, 1300);
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
Object.assign(PMX.reply, { resLine: p => 'いちばん ' + p.best + '回 ・ スベり ' + p.worst + '回', resStats: most => pxStat('返信の達人', most('best')) + pxStat('スベり王', most('worst')) });
Object.assign(PMX.mission, { resLine: p => '達成 ' + p.done + ' ・ 見破り ' + p.spot + ' ・ 見破られ ' + p.caught, resStats: most => pxStat('ミッション王', most('done')) + pxStat('名探偵', most('spot')) });
Object.assign(PMX.uso, { resLine: p => '全員だました ' + p.fool + '回 ・ 外した ' + p.miss + '回', resStats: most => pxStat('ホラ吹き王', most('fool')) + pxStat('いちばんだまされた', most('miss')) });

/* 遊び方ガイド: a page for the four party modes, after 王様・恋バナ */
if (PLUS_OPEN) GUIDE.splice(Math.max(0, GUIDE.findIndex(x => x.k === 'plus') + 1), 0, { k: 'party', tab: '新モード', html: () =>
  '<p class="gd-lead">タイトル画面の下の段、<b>4つの新モード</b>です。どれもスマホ1台で遊べます。「こっそり見る」場面では、名前が出た人にスマホを渡してね。</p>' +
  gCard('ニセ画伯（3人から）', '<p>「お題を配る！」でスマホを回して、1人ずつお題を見ます。<b>1人だけお題を知らない「ニセ画伯」</b>がいます（ジャンルだけ分かる）。</p>' +
    '<p>1人1筆ずつ、2周で1枚の絵を描きます。<b>指を離したら次の人</b>。描き終わったら、せーので<b>ニセ画伯だと思う人を指さし</b>。</p>' +
    '<p>見破られたらニセ画伯が1杯。ただし、ニセ画伯がお題を当てたら逆転。逃げ切ったら<b>ニセ画伯以外の全員が1杯</b>。描いた絵は保存できます。</p>', 1) +
  gCard('返信選手権（3人から）', '<p>メッセージが届きます。スマホを回して、1人ずつ<b>こっそり返信を入力</b>（既読スルーもOK）。</p>' +
    '<p>全員書いたら、<b>トーク画面ふうに1件ずつ発表</b>。だれの返信かはヒミツのまま、せーので<b>いちばんの返信</b>を指さし → 勲章。<b>いちばんスベった返信</b>の人が1杯。最後に名前がわかります。</p>', 2) +
  gCard('しれっとミッション（3人から）', '<p>全員が<b>秘密のミッション</b>を1つ持ちます（例：だれかに「それな」と言わせる）。あとはふつうに飲んで話すだけ。</p>' +
    '<p>達成したら<b>「達成した！」</b>で名乗り出て、みんなが認めたら本人以外の全員が1杯。あやしい人がいたら<b>「見破った！」</b>→ ミッションを予想して言う → 本人だけが答え合わせ。当たりなら本人、ハズレなら見破った人が1杯。</p>' +
    '<p>忘れたら「自分のミッション確認」で、本人だけ見られます。</p>', 3) +
  gCard('ウソかホントか（2人から）', '<p>番の人だけがスマホを見ます。お題と、<b>「ホントの話」か「ウソの話」かの指示</b>が出ます。</p>' +
    '<p>30秒で話したら、全員せーので<b>親指を上（ホント）か下（ウソ）</b>。答え合わせで<b>外した人が1杯</b>。全員だませたら、話した人に勲章。</p>', 4) +
  gTip('勲章は、いちばんの返信・逃げ切り・ミッション達成などでもらえます。席の右上に出て、結果発表でも数えます。')
});
