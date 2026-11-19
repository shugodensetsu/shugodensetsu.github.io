
/* =====================================================================
   みんなのスマホで参加（部屋）: ニセ画伯・大喜利グランプリ・しれっとミッション・ウソかホントか
   - 親（プレミアムの人）のスマホがゲームを進める。参加した人のスマホには、その人だけの画面（お題・ミッション・回答の入力・投票）が出る
   - 部屋はサーバー（server/src/room.js）が中継するだけ。作れるのはプレミアムが有効な端末だけ（サーバーで確認）。参加は無料
   - 親が送るのは決まった形のデータだけ。参加した側はそれを自分の画面の部品で描く（文字は全部 esc）。届いたものは全部たしかめてから使う
   - スマホを持っていない人は、今までどおり親のスマホを回して遊ぶ（roomLocal に残る）
   ===================================================================== */
const ROOM_ON = IS_APP;
const ROOM_API = 'https://sakego.shugodensetsu.workers.dev/v1/room/';
const ROOM_WS = 'wss://sakego.shugodensetsu.workers.dev/v1/room/ws';
const ROOM_KEY = 'sakego-room', GUEST_KEY = 'sakego-guest';
const ROOM_MODES = ['gaka', 'reply', 'mission', 'uso'];
const ROOM_RE = /^[2-9ACDEFGHJKMNPQRTUVWXY]{4}$/;
const ROOM_URL = r => 'https://shugodensetsu.github.io/?r=' + r;
const PHONE_SVG = '<svg class="rm-ph" viewBox="0 0 20 28" aria-hidden="true"><rect x="2" y="1.5" width="16" height="25" rx="3.5" fill="#fff" stroke="#150733" stroke-width="2.2"/><rect x="5" y="5" width="10" height="15" rx="1.5" fill="#35e0ff"/><circle cx="10" cy="23" r="1.4" fill="#150733"/></svg>';
const roomMode = () => !!(G && !G.done && ROOM_MODES.includes(G.mode));
const okInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;

/* ---------- 親（部屋を作った人） ---------- */
/* room = { code, t, exp, gs: { g: { on, p, nm } }, gid, open, ws, sent: { g: json }, fails, busy, err } */
let room = null;
function roomLoad() {
  if (!ROOM_ON) return;
  try {
    const s = JSON.parse(localStorage.getItem(ROOM_KEY) || 'null');
    if (s && ROOM_RE.test(s.code) && typeof s.t === 'string' && s.exp > Date.now()) {
      const gs = {};
      Object.keys(s.gs || {}).forEach(g => { const x = s.gs[g]; if (okInt(Number(g), 1, 99) && x) gs[g] = { on: false, p: okInt(x.p, 0, 7) ? x.p : null, nm: typeof x.nm === 'string' ? x.nm : '' }; });
      room = { code: s.code, t: s.t, exp: s.exp, gs, gid: s.gid || 0, open: false, ws: null, sent: {}, fails: 0 };
    }
  } catch (_) { room = null; }
}
function roomSave() {
  if (room && room.demo) return;
  if (!room) { try { localStorage.removeItem(ROOM_KEY); } catch (_) { /* ignore */ } return; }
  const gs = {};
  Object.keys(room.gs).forEach(g => { gs[g] = { p: room.gs[g].p, nm: room.gs[g].nm }; });
  lsSet(ROOM_KEY, JSON.stringify({ code: room.code, t: room.t, exp: room.exp, gid: room.gid, gs }));
}
const roomLive = () => !!room && room.exp > Date.now();
/* the seats belong to one game: a new game keeps the guests whose names are still among the players */
function roomSeats() {
  if (!roomLive() || !G || room.gid === G.gid) return;
  room.gid = G.gid;
  Object.values(room.gs).forEach(x => { const p = G.players.findIndex(pl => pl.name === x.nm); x.p = p >= 0 ? p : null; });
  Object.values(room.gs).forEach((x, i, all) => { if (x.p != null && all.findIndex(y => y.p === x.p) !== i) x.p = null; });
  roomSave();
}
function roomGuestOf(p) {
  if (!roomLive() || !roomMode()) return null;
  roomSeats();
  const g = Object.keys(room.gs).find(k => room.gs[k].p === p);
  return g == null ? null : Number(g);
}
/* this player plays on their own phone (online or for a moment out of signal) */
const roomHas = p => roomGuestOf(p) != null;
const roomOnline = p => { const g = roomGuestOf(p); return g != null && !!room.gs[g].on; };
const roomLocal = ps => ps.filter(p => !roomHas(p));

function roomSend(o) { if (room && room.ws && room.ws.readyState === 1) { try { room.ws.send(JSON.stringify(o)); return true; } catch (_) { /* ignore */ } } return false; }
function roomConnect() {
  if (!roomLive() || room.ws || room.demo) return;
  let ws;
  try { ws = new WebSocket(ROOM_WS + '?r=' + room.code + '&t=' + encodeURIComponent(room.t)); } catch (_) { return; }
  room.ws = ws; room.err = '';
  ws.onmessage = e => { let o; try { o = JSON.parse(e.data); } catch (_) { return; } if (room && room.ws === ws && o && typeof o === 'object') roomHostMsg(o); };
  ws.onclose = () => {
    if (!room || room.ws !== ws) return;
    room.ws = null;
    Object.values(room.gs).forEach(x => { x.on = false; });
    roomPanel(); roomBadge();
    if (!roomLive()) { roomEnd(); return; }
    room.fails++;
    if (room.fails > 6 && navigator.onLine !== false) { room.err = 'つながりません。電波を確かめて「つなぎ直す」を押してね'; roomPanel(); return; }
    setTimeout(() => { if (room && !room.ws) roomConnect(); }, Math.min(15000, 800 * 2 ** Math.min(room.fails, 5)));
  };
}
function roomHostMsg(o) {
  if (o.t === 'hi') {
    room.fails = 0; room.err = '';
    const live = new Set();
    (Array.isArray(o.guests) ? o.guests : []).forEach(x => {
      if (!x || !okInt(x.g, 1, 99)) return;
      live.add(String(x.g));
      if (!room.gs[x.g]) room.gs[x.g] = { on: false, p: null, nm: '' };
      room.gs[x.g].on = !!x.on;
    });
    Object.keys(room.gs).forEach(g => { if (!live.has(g)) delete room.gs[g]; });
    room.sent = {};
    if (!$('roomOv').hidden) roomSend({ t: 'open', v: true });
    roomSave(); roomPanel(); roomBadge(); roomSync();
    return;
  }
  if (o.t === 'join' || o.t === 'on') {
    if (!okInt(o.g, 1, 99)) return;
    if (!room.gs[o.g]) room.gs[o.g] = { on: true, p: null, nm: '' };
    room.gs[o.g].on = true;
    delete room.sent[o.g];
    if (o.t === 'join') SE.play('pop');
    roomSave(); roomPanel(); roomBadge(); roomSync();
    if (screen === 'game' && isPM()) renderPM('keep');
    return;
  }
  if (o.t === 'off') {
    if (!okInt(o.g, 1, 99) || !room.gs[o.g]) return;
    if (o.gone) delete room.gs[o.g]; else room.gs[o.g].on = false;
    delete room.sent[o.g];
    roomSave(); roomPanel(); roomBadge();
    if (screen === 'game' && isPM()) renderPM('keep');
    return;
  }
  if (o.t === 'm' && okInt(o.g, 1, 99) && room.gs[o.g]) { roomFromGuest(o.g, o.m); return; }
  if (o.t === 'bye') roomEnd(o.why === 'closed' ? '' : '部屋の時間が終わりました');
}
function roomFromGuest(g, m) {
  if (!m || typeof m !== 'object') return;
  const x = room.gs[g];
  if (m.k === 'pick') {
    if (!roomMode() || !okInt(m.p, 0, G.players.length - 1)) return;
    roomSeats();
    const other = Object.keys(room.gs).find(k => Number(k) !== g && room.gs[k].p === m.p);
    if (other != null) { delete room.sent[g]; roomSync(); return; }
    x.p = m.p; x.nm = pname(m.p);
    delete room.sent[g];
    SE.play('select');
    roomSave(); roomPanel(); roomSync();
    if (screen === 'game') renderPM('keep');
    return;
  }
  if (m.k === 'unpick') { x.p = null; x.nm = ''; delete room.sent[g]; roomSave(); roomPanel(); roomSync(); if (screen === 'game' && isPM()) renderPM('keep'); return; }
  if (m.k === 'act' && typeof m.a === 'string' && m.a.length <= 12 && roomMode() && screen === 'game' && x.p != null) {
    roomSeats();
    if (x.p == null || x.p >= G.players.length) return;
    const X = PMX[G.mode];
    if (X && X.ract && !pxBusy) X.ract(x.p, m);
  }
}
/* what each guest's phone shows: sent when it changes (cheap to call after every render) */
function roomViewFor(g) {
  const x = room.gs[g];
  if (!roomMode() || screen !== 'game') return { k: 'idle', done: !!(G && G.done && G.mode && ROOM_MODES.includes(G.mode)) };
  roomSeats();
  if (x.p == null || x.p >= G.players.length) {
    const taken = Object.keys(room.gs).filter(k => Number(k) !== g && room.gs[k].p != null).map(k => room.gs[k].p);
    return { k: 'who', ps: G.players.map(pl => pl.name), taken };
  }
  const X = PMX[G.mode];
  return { k: 'view', p: x.p, nm: pname(x.p), mode: G.mode, title: PM[G.mode].title, r: G.turn + 1, b: X && X.remote ? X.remote(x.p) : { v: 'watch' } };
}
function roomSync() {
  if (room && room.demo) { ogdSync(); return; }
  if (!roomLive() || !room.ws || room.ws.readyState !== 1) return;
  Object.keys(room.gs).forEach(g => {
    if (!room.gs[g].on) return;
    const v = roomViewFor(Number(g)), j = JSON.stringify(v);
    if (room.sent[g] === j) return;
    if (roomSend({ t: 'to', g: [Number(g)], m: v })) room.sent[g] = j;
  });
}
function roomEnd(msg) {
  if (room && room.ws) { const ws = room.ws; room.ws = null; try { ws.close(); } catch (_) { /* ignore */ } }
  room = null; roomSave();
  if (!$('roomOv').hidden) closeOv('roomOv');
  roomBadge();
  if (msg) telop(msg, 'white sm', 1600);
  if (screen === 'game' && isPM()) renderPM('keep');
}
async function roomMake() {
  const st = plusState();
  if (!st || !st.code || !st.dev || !plusOn()) { room = null; roomPanelErr('部屋を作れるのは、プレミアムが有効なスマホだけです'); return; }
  roomPanelErr('', true);
  let res, j = null;
  try {
    res = await fetch(ROOM_API + 'new', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ code: st.code, dev: st.dev }) });
    j = await res.json().catch(() => null);
  } catch (_) { roomPanelErr('つながりません。電波を確かめてね'); return; }
  if (!res.ok || !j || !ROOM_RE.test(j.room) || typeof j.t !== 'string') {
    roomPanelErr(res.status === 403 ? 'プレミアムを確認できませんでした。プレミアム画面を開いて確かめてね' : res.status === 429 ? '少し待ってから、もう一度ためしてね' : '部屋を作れませんでした。少し待ってから、もう一度ためしてね');
    return;
  }
  room = { code: j.room, t: j.t, exp: Date.now() + (Number(j.life) || 6 * 3600e3) - 60e3, gs: {}, gid: G ? G.gid : 0, open: true, ws: null, sent: {}, fails: 0 };
  roomSave(); roomConnect(); roomPanel(); roomBadge();
  SE.play('ticket');
}
/* the panel: QR + 合言葉, who joined as whom */
let roomMsg = '', roomWait = false;
function roomPanelErr(msg, wait) { roomMsg = msg; roomWait = !!wait; roomPanel(); }
function openRoom() {
  if (!ROOM_ON) return;
  if (room && room.demo) { SE.play('tap'); ogdView('guest', true); return; }
  roomMsg = ''; roomWait = false;
  openOv('roomOv'); SE.play('pop');
  if (!roomLive()) roomMake(); else { roomConnect(); roomSend({ t: 'open', v: true }); }
  roomPanel();
}
function closeRoom() {
  roomSend({ t: 'open', v: false });
  closeOv('roomOv'); SE.play('tap');
  if (screen === 'game' && isPM()) renderPM('keep');
}
function roomPanel() {
  const box = $('roomBox');
  if (!box || $('roomOv').hidden) return;
  if (!roomLive()) {
    box.innerHTML = '<h2 id="roomTitle">' + PHONE_SVG + 'みんなのスマホで参加</h2>' +
      '<p class="rm-lead">' + (roomWait ? '部屋を作っています…' : esc(roomMsg || '')) + '</p>' +
      '<div class="dialog-acts">' + (roomWait ? '' : '<button type="button" class="pbtn cyan" data-rm="make">もう一度ためす</button>') + '<button type="button" class="pbtn white" data-rm="close">閉じる</button></div>';
    return;
  }
  const n = G && roomMode() ? G.players.length : 0;
  const rows = [];
  for (let p = 0; p < n; p++) {
    const g = roomGuestOf(p), x = g != null ? room.gs[g] : null;
    rows.push('<li style="--p:' + pc(p) + '"><b>' + esc(pname(p)) + '</b><span class="rm-st' + (x ? (x.on ? ' on' : ' off') : '') + '">' + (x ? (x.on ? '自分のスマホ' : '電波なし') : '親のスマホ') + '</span>' +
      (x ? '<button type="button" class="rm-x" data-rm="unseat" data-g="' + g + '" aria-label="' + esc(pname(p)) + 'を親のスマホにもどす">×</button>' : '') + '</li>');
  }
  const loose = Object.keys(room.gs).filter(g => room.gs[g].p == null || (G && room.gs[g].p >= n));
  const lose = loose.length ? '<p class="rm-loose">名前を選んでいる人：' + loose.length + '人' + loose.map(g => '<button type="button" class="rm-x" data-rm="kick" data-g="' + g + '" aria-label="この人を部屋から外す">×</button>').join('') + '</p>' : '';
  box.innerHTML = '<h2 id="roomTitle">' + PHONE_SVG + 'みんなのスマホで参加</h2>' +
    '<div class="rm-join"><div class="rm-qr">' + qrSVG(ROOM_URL(room.code)) + '</div><div class="rm-code"><small>合言葉</small><b>' + esc(room.code) + '</b>' +
    '<small>カメラでQRを読むか、タイトル画面の「参加」で合言葉を入れてね。参加は無料</small></div></div>' +
    (room.err ? '<p class="rm-err">' + esc(room.err) + '</p>' : !room.ws || room.ws.readyState !== 1 ? '<p class="rm-err">つないでいます…</p>' : '') +
    (n ? '<ul class="rm-list' + (n > 4 ? ' two' : '') + '">' + rows.join('') + '</ul>' : '<p class="rm-lead">ゲーム中に、参加した人が自分の名前を選びます</p>') + lose +
    '<div class="dialog-acts">' + (room.err ? '<button type="button" class="pbtn cyan small" data-rm="retry">つなぎ直す</button>' : '<button type="button" class="pbtn white small" data-rm="end">部屋を終わる</button>') +
    '<button type="button" class="pbtn grow" data-rm="close">OK</button></div>';
}
function roomAct(a, el) {
  if (a === 'close') { closeRoom(); return; }
  if (a === 'make') { roomMake(); return; }
  if (a === 'retry') { if (room) { room.fails = 0; room.err = ''; roomConnect(); roomPanel(); } return; }
  if (a === 'end') { roomSend({ t: 'close' }); SE.play('tap'); roomEnd(); return; }
  const g = Number(el && el.dataset.g);
  if (!room || !room.gs[g]) return;
  if (a === 'unseat') { room.gs[g].p = null; room.gs[g].nm = ''; delete room.sent[g]; roomSave(); roomPanel(); roomSync(); SE.play('tap'); return; }
  if (a === 'kick') { roomSend({ t: 'kick', g }); delete room.gs[g]; roomSave(); roomPanel(); SE.play('tap'); }
}
/* before each round starts, the dock offers the room as big as the round's own button: playing on everyone's phone is the better game */
function roomDock(html) {
  if (!ROOM_ON || !roomMode() || !(plusOn() || roomLive()) || !G.cur || G.cur.phase !== 'before' || pmLocked()) return html;
  const n = roomLive() ? Object.values(room.gs).filter(x => x.on && x.p != null).length : 0;
  const btn = '<button type="button" class="pbtn big ' + (n ? 'white' : 'cyan') + ' rm-dock" data-g="roomopen">' + PHONE_SVG +
    (n ? n + '人参加中<span class="sub">参加をふやす</span>' : 'スマホで参加<span class="sub">QRを読むだけ</span>') + '</button>';
  return html.replace('<div class="dock-row">', '<div class="dock-row">' + btn);
}
/* the button in the game's top bar: only in the four modes, for a phone with premium (or a room already made) */
function roomBadge() {
  const b = $('roomBtn');
  if (!b) return;
  const show = ROOM_ON && screen === 'game' && roomMode() && (plusOn() || roomLive());
  b.hidden = !show;
  if (!show) return;
  const on = roomLive() ? Object.values(room.gs).filter(x => x.on && x.p != null).length : 0;
  b.innerHTML = PHONE_SVG + (room && room.demo ? '子機' : on ? '<b>' + on + '</b>' : '参加');
  b.setAttribute('aria-label', room && room.demo ? 'あなたのスマホの画面にもどる' : 'みんなのスマホで参加' + (on ? '（' + on + '人）' : ''));
}

/* ---------- 参加した人のスマホ ---------- */
/* guest = { r, k, g, ws, st: 'conn'|'on'|'end'|'no', host, msg, v (the last thing the host sent), tries, was } */
let guest = null;
function guestSave() {
  if (guest && guest.demo) return;
  if (!guest || !guest.k) { try { localStorage.removeItem(GUEST_KEY); } catch (_) { /* ignore */ } return; }
  lsSet(GUEST_KEY, JSON.stringify({ r: guest.r, k: guest.k, exp: guest.exp || Date.now() + 6 * 3600e3 }));
}
function guestSaved() {
  try { const s = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null'); return s && ROOM_RE.test(s.r) && typeof s.k === 'string' && s.exp > Date.now() ? s : null; } catch (_) { return null; }
}
function guestStart(r) {
  if (!ROOM_ON || !ROOM_RE.test(r)) return;
  const s = guestSaved();
  guest = { r, k: s && s.r === r ? s.k : '', exp: s && s.r === r ? s.exp : 0, g: 0, ws: null, st: 'conn', host: true, v: null, tries: 0, was: false };
  closeAllOverlays();
  showScreen('guest');
  guestConnect();
}
function guestConnect() {
  if (!guest || guest.ws || guest.demo) return;
  let ws;
  try { ws = new WebSocket(ROOM_WS + '?r=' + guest.r + (guest.k ? '&t=' + encodeURIComponent(guest.k) : '')); } catch (_) { guest.st = 'no'; renderGuest(); return; }
  guest.ws = ws;
  ws.onmessage = e => { let o; try { o = JSON.parse(e.data); } catch (_) { return; } if (guest && guest.ws === ws && o && typeof o === 'object') guestMsg(o); };
  ws.onclose = () => {
    if (!guest || guest.ws !== ws) return;
    guest.ws = null;
    if (guest.st === 'end') return;
    if (!guest.was) {
      /* never got in: a key from an earlier visit may be stale (kicked, room over); try once more without it */
      if (guest.k && guest.tries < 1) { guest.tries++; guest.k = ''; guestSave(); guestConnect(); return; }
      guest.st = 'no'; renderGuest(); return;
    }
    guest.st = 'conn'; renderGuest();
    guest.tries++;
    setTimeout(() => { if (guest && !guest.ws && guest.st !== 'end') guestConnect(); }, Math.min(15000, 800 * 2 ** Math.min(guest.tries, 5)));
  };
}
function guestMsg(o) {
  if (o.t === 'hi') {
    guest.was = true; guest.tries = 0; guest.st = 'on'; guest.host = !!o.host;
    if (okInt(o.g, 1, 99)) guest.g = o.g;
    if (typeof o.k === 'string' && o.k.length < 64) guest.k = o.k;
    if (Number.isFinite(o.exp)) guest.exp = Math.min(o.exp, Date.now() + 6 * 3600e3);
    guestSave(); renderGuest();
    return;
  }
  if (o.t === 'host') { guest.host = !!o.on; renderGuest(); return; }
  if (o.t === 'bye') {
    guest.st = 'end'; guest.msg = o.why === 'kicked' ? '親のスマホで部屋から外されました' : o.why === 'closed' ? '親が部屋を終わりにしました' : '部屋の時間が終わりました';
    guest.k = ''; guestSave(); renderGuest();
    return;
  }
  if (o.t === 'm' && o.m && typeof o.m === 'object') {
    const old = guest.v;
    guest.v = o.m;
    guestNotice(old, o.m);
    gsOgFx(old && old.k === 'view' ? old.b : null, o.m.k === 'view' && o.m.b && typeof o.m.b === 'object' ? o.m.b : null);
    renderGuest();
  }
}
function guestSend(m) {
  if (guest && guest.demo) { const c = JSON.parse(JSON.stringify(m)); setTimeout(() => { if (room && room.demo) roomFromGuest(1, c); }, 60); return true; }
  if (guest && guest.ws && guest.ws.readyState === 1) { try { guest.ws.send(JSON.stringify({ t: 'm', m })); return true; } catch (_) { /* ignore */ } } return false; }
function guestLeave() {
  if (guest && guest.demo) { showScreen('title'); return; }
  if (guest && guest.ws) { const ws = guest.ws; guest.ws = null; try { ws.close(); } catch (_) { /* ignore */ } }
  guest = null; try { localStorage.removeItem(GUEST_KEY); } catch (_) { /* ignore */ }
  showScreen('title');
}
/* a buzz when something new is for this phone (a secret, a turn, a question) */
function guestNotice(old, v) {
  const b = v.k === 'view' && v.b && typeof v.b === 'object' ? v.b : null, ob = old && old.k === 'view' && old.b ? old.b : null;
  if (!b || guest.demo) return;
  const sig = x => (x ? [x.v, x.ph, x.w, x.f, x.t, x.turn, x.ask && 1, x.st, x.role, x.a && typeof x.a === 'object' ? x.a.id : ''].join('|') : '');
  if (sig(b) !== sig(ob)) { vibrate(20); SE.play('pop'); }
}
const gStr = (s, max) => (typeof s === 'string' ? s.slice(0, max || 200) : '');
function renderGuest() {
  const box = $('gsBox');
  if (!box || !guest) return;
  const v = guest.v && typeof guest.v === 'object' ? guest.v : null;
  const me = v && v.k === 'view' && okInt(v.p, 0, 7) ? v : null;
  const top = '<div class="gs-top' + (guest.demo ? ' ogd' : '') + '"><span class="gs-room">' + PHONE_SVG + (guest.demo ? '<b>試験版</b>' : '部屋 <b>' + esc(guest.r) + '</b>') + '</span>' +
    (me ? '<span class="gs-me" style="--p:' + pc(me.p) + '">' + esc(gStr(me.nm, 24)) + '</span>' : '') +
    (guest.demo ? '<button type="button" class="pbtn cyan tiny" data-gs="ogdhost">親の画面</button>' : '') +
    '<button type="button" class="pbtn white tiny" data-gs="leave">' + (guest.demo ? 'やめる' : '抜ける') + '</button></div>';
  let body;
  if (guest.st === 'no') body = gsMsg('入れませんでした', '合言葉が合っているか、親の画面で「参加」の画面が開いているか確かめてね', '<button type="button" class="pbtn big main" data-gs="again">もう一度ためす</button>');
  else if (guest.st === 'end') body = gsMsg('おしまい', esc(guest.msg || ''), '<button type="button" class="pbtn big main" data-gs="leave">タイトルへ</button>');
  else if (guest.st === 'conn' || !v) body = gsMsg('つないでいます…', '親のスマホとつないでいます');
  else if (!guest.host) body = gsMsg('親のスマホを待っています', '親のスマホの電波がもどると、つづきから遊べます');
  else if (v.k === 'idle') body = gsMsg(v.done ? '結果発表！' : 'ゲームを待っています', v.done ? '結果は親のスマホで見てね。次のゲームも、このまま参加できます' : '親のスマホで、ニセ画伯・大喜利グランプリ・しれっとミッション・ウソかホントかを始めると、ここに出ます');
  else if (v.k === 'who') {
    const ps = Array.isArray(v.ps) ? v.ps.slice(0, 8) : [], taken = Array.isArray(v.taken) ? v.taken : [];
    body = '<div class="gs-body"><p class="pm-lead ol">あなたはだれ？</p><p class="pm-note">自分の名前をタップ</p><div class="pm-chips' + (ps.length > 4 ? ' two' : '') + '">' +
      ps.map((nm, i) => '<button type="button" class="pm-chip" data-gs="pick" data-p="' + i + '" style="--p:' + pc(i) + '"' + (taken.includes(i) ? ' disabled' : '') + '>' + esc(gStr(nm, 24)) + '</button>').join('') + '</div>' +
      '<p class="pm-note sm">スマホを持っていない人は、親のスマホで遊べます</p></div>';
  } else if (me) body = '<div class="gs-head"><span>' + esc(gStr(me.title, 20)) + '</span><small>' + (okInt(me.r, 1, 999) ? me.r + '回目' : '') + '</small></div>' + gsView(me.b && typeof me.b === 'object' ? me.b : {}, me.p);
  else body = gsMsg('つないでいます…', '');
  box.innerHTML = top + body;
  guestMount();
  fitScreen();   /* the last resort for an odd screen: zoomed out a little, never scrolled */
}
const gsMsg = (h, note, btn) => '<div class="gs-body"><p class="pm-lead ol">' + h + '</p>' + (note ? '<p class="pm-note">' + note + '</p>' : '') + (btn || '') + '</div>';
const gsBtn = (a, label, cls, extra) => '<button type="button" class="pbtn ' + (cls || 'big main') + '" data-gs="' + a + '"' + (extra || '') + '>' + label + '</button>';
/* the strokes the host sends: points 0-1000, a player's colour */
function gsStrokes(s) {
  if (!Array.isArray(s)) return [];
  return s.slice(0, 40).filter(x => x && okInt(x.p, 0, 7) && Array.isArray(x.d) && x.d.length >= 2 && x.d.length <= 2000 && x.d.length % 2 === 0 && x.d.every(n => okInt(n, 0, 1000))).map(x => ({ p: x.p, d: x.d }));
}
/* 大喜利グランプリ on this phone: the お題 and a box to answer in, or the answer on stage with the IPPON meter and the 面白い！ button */
let gsDraft = '', gsSeen = { k: '', lv: 0 }, gsEnd = 0;   /* gsEnd: when the answer on stage stops taking points, by this phone's clock */
function gsOg(b) {
  const odai = gStr(b.m, 80), a = b.a && typeof b.a === 'object' && okInt(b.a.p, 0, 7) ? b.a : null;
  if (b.ph === 'before' || !odai) return gsMsg('大喜利グランプリ', b.ready === false ? 'みんなが自分のスマホで参加すると、お題が出せます' : 'お題が出るのを待っています');
  if (b.ph === 'end') return gsMsg('このお題はおしまい！', '結果は親のスマホで見てね' + (okInt(b.cnt, 1, 99) ? '<br>あなたの回答 ' + b.cnt + ' ・ IPPON ' + (okInt(b.ip, 0, 99) ? b.ip : 0) : ''));
  const wait = okInt(b.wait, 1, 99) ? '<p class="og-wait">あなたの回答は <b>' + b.wait + '番目</b> に発表</p>' : '';   /* one line, the same height as og-say */
  if ((b.ph === 'judge' || b.ph === 'res') && a) {
    const lv = okInt(a.lv, 0, 10) ? a.lv : 0, r = a.r === 'ippon' || okInt(a.r, 0, 9) ? a.r : null, key = guest.r + '|' + b.m + '|' + a.id;
    const same = gsSeen.k === key, from = same ? Math.min(gsSeen.lv, lv) : 0;
    gsSeen = { k: key, lv };
    const per = okInt(b.per, 1, 5) ? b.per : 3, my = okInt(a.my, 0, 5) ? a.my : 0, judge = b.ph === 'judge' && r == null, vote = judge && !a.me && !a.done;
    const st = r === 'ippon' ? '<b>IPPON！</b>' : r != null ? '<b>' + r + '</b>点' + (r === 0 ? ' ・ スベった… <b>1DON</b>' : '')
      : '<b>' + lv + '</b> / 10点 ・ ' + ogLeftHTML(gsEnd);
    /* one line under the stage and the button row stay put from judging to the result, so the meter does not move */
    const say = wait ? wait : '<p class="og-say">' + (a.me ? (judge ? 'あなたの回答を判定中…' : 'あなたの回答の結果！') : judge ? (a.done ? '持ち点を使い切りました' : '6秒以内に「面白い！」で点を入れよう') : my ? 'あなたは ' + my + '点 入れました' : '結果発表！') + '</p>';
    return '<div class="gs-body rp-gs og-gs">' + ogStage({ m: odai, p: a.p, nm: gStr(a.nm, 24), t: gStr(a.t, 60), r, lv, from, fresh: !same, st, left: judge ? Math.max(0, gsEnd - Date.now()) : null }) + say +
      (a.me ? '' : '<div class="dock-row">' + gsBtn('ogpt', '面白い！ +1<span class="sub">のこり' + Math.max(0, per - my) + '点</span>', 'big main pink grow', vote ? '' : ' disabled') + '</div>') + '</div>';
  }
  if (b.busy || wait) return '<div class="gs-body rp-gs"><p class="px-for">回答しました！ 発表を待っています</p>' + rpChat(null, '', 'grow big', odai) + wait + '</div>';
  return '<div class="gs-body rp-gs"><p class="px-for">書けたら「回答する」。押した順に発表！</p>' + rpChat(null, ogInput('gsIn'), 'grow write', odai) +
    '<div class="dock-row">' + gsBtn('ogsend', '回答する', 'big main grow') + '</div></div>';
}
/* the meter filling, an IPPON, a new answer on stage: heard on every phone */
function gsOgFx(ob, b) {
  if (!b || b.v !== 'og') return;
  const a = b.a && typeof b.a === 'object' ? b.a : null, oa = ob && ob.v === 'og' && ob.a && typeof ob.a === 'object' ? ob.a : null;
  if (a && (a.me || b.wait)) gsDraft = '';
  if (b.wait || b.busy) gsDraft = '';
  if (a && Number.isFinite(a.left)) gsEnd = Date.now() + Math.max(0, Math.min(6000, a.left));
  if (!a || guest.demo) return;   /* 試験版: the host's own sounds and cut-in already played on this phone */
  const same = oa && oa.id === a.id && ob.m === b.m;
  if (a.r === 'ippon' && !(same && oa.r === 'ippon')) { SE.play('ippon'); vibrate([40, 30, 140]); flash('#ffd83d'); ogCut(gStr(a.nm, 24)); return; }
  if (same && okInt(a.lv, 1, 9) && okInt(oa.lv, 0, 10) && a.lv > oa.lv) SE.play('ogPt' + a.lv);
  if (same && a.r === 0 && oa.r !== 0) SE.play('bubuu');
}
function gsView(b, p) {
  const watch = (h, note) => gsMsg(h, note);
  if (b.v === 'gk') {
    const top = b.f ? '<p class="gk-fake ol">あなたは <b>ニセ画伯</b>！</p><p class="gk-genre">ジャンル：<b>' + esc(gStr(b.g, 20)) + '</b>（お題はヒミツ）</p>'
      : '<p class="gk-genre">ジャンル：<b>' + esc(gStr(b.g, 20)) + '</b></p><p class="gk-word sm">' + esc(gStr(b.w, 20)) + '</p>';
    const end = b.ph === 'end' ? '<p class="gk-genre">お題は <b>' + esc(gStr(b.w, 20)) + '</b></p>' : '';
    const say = b.ph === 'draw' ? (b.turn ? '<b>あなたの番！</b> 1筆描いてね（指を離したら交代）' : esc(gStr(b.who, 24)) + ' が描く番') : b.ph === 'vote' ? 'せーので、ニセ画伯だと思う人を指さし！' : b.ph === 'guess' ? 'ニセ画伯の逆転チャンス！' : b.ph === 'end' ? '結果は親のスマホで！' : 'みんながお題を見ています';
    return '<div class="gs-body gk-gs">' + (b.ph === 'end' ? end : top) + '<div class="gk-wrap gs-cv" id="gsWrap"><canvas class="gk-cv' + (b.turn ? ' live' : '') + '" id="gsCv" aria-label="みんなの絵"></canvas></div><p class="gs-say">' + say + '</p></div>';
  }
  if (b.v === 'og') return gsOg(b);
  if (b.v === 'ms') {
    if (b.ask) return '<div class="gs-body"><p class="px-for">' + esc(gStr(b.ask, 24)) + ' があなたのミッションを予想したよ</p><p class="ms-card">' + esc(gStr(b.t, 80)) + '</p><p class="pm-lead ol">予想は当たってた？</p><p class="pm-note">正直に答えてね</p>' +
      '<div class="dock-row">' + gsBtn('msng', 'ハズレ', 'white big') + gsBtn('msok', '当たってた', 'big main pink grow') + '</div></div>';
    return '<div class="gs-body"><p class="px-for">あなたのミッション</p><p class="ms-card">' + esc(gStr(b.t, 80)) + '</p>' +
      '<p class="pm-note">' + (b.ph === 'claim' ? 'みんなが判定中…' : 'ふつうに飲んで話しながら、<b>しれっと</b>達成しよう。<br>達成したら、親のスマホで「達成した！」') + '</p>' +
      '</div>';
  }
  if (b.v === 'us') {
    const topic = '<p class="us-topic">' + esc(gStr(b.t, 60)) + '</p>';
    if (b.role === 'talk') {
      if (b.ph === 'secret') return '<div class="gs-body"><p class="px-for">あなたの番！ お題は</p>' + topic + '<p class="us-order ' + (b.tr ? 'true' : 'lie') + ' ol">' + (b.tr ? 'ホントの話をして！' : 'ウソの話をして！') + '</p>' +
        '<p class="pm-note">' + (b.tr ? '本当にあったことを、そのまま話そう' : '本当っぽい作り話で、みんなをだまそう') + '</p><div class="dock-row">' + (b.tr ? gsBtn('usre', '別の<span class="sub">お題</span>', 'white small') : '') + gsBtn('ustalk', '話す！', 'big main grow') + '</div></div>';
      if (b.ph === 'talk') return '<div class="gs-body"><p class="px-for">話して！（' + (b.tr ? 'ホント' : 'ウソ') + 'の話）</p>' + topic + '<p class="us-clock" id="gsClock">' + (okInt(b.left, 0, 99) ? b.left : '') + '</p><p class="pm-note">話し終わったら、親のスマホで「話し終わった！」</p></div>';
      return '<div class="gs-body">' + topic + '<p class="pm-lead ol">' + (b.ph === 'ans' ? '答え合わせ！' : 'みんなが投票中…') + '</p></div>';
    }
    const voted = b.vote === true ? 'up' : b.vote === false ? 'down' : '';
    if (b.ph === 'ans') return '<div class="gs-body">' + topic + '<p class="us-ans ' + (b.tr ? 'true' : 'lie') + ' ol">' + (b.tr ? 'ホント！' : 'ウソ！') + '</p><p class="pm-lead ol">' + (voted ? (b.hit ? '当たり！' : 'ハズレ… 1DON') : '投票しなかった') + '</p></div>';
    return '<div class="gs-body">' + (b.who ? '<p class="px-for">' + esc(gStr(b.who, 24)) + ' のお話</p>' : '') + topic + (b.ph === 'talk' && okInt(b.left, 0, 99) ? '<p class="us-clock sm" id="gsClock">' + b.left + '</p>' : '') +
      '<p class="pm-lead ol">' + (b.ph === 'secret' ? 'お題を見ています…' : 'その話、ホント？ ウソ？') + '</p>' +
      (b.ph === 'secret' ? '' : '<div class="us-thumbs big gs-vote"><button type="button" class="' + (voted === 'up' ? 'sel' : '') + '" data-gs="usup" aria-pressed="' + (voted === 'up') + '">' + THUMB(true) + '<b>ホント</b></button><button type="button" class="' + (voted === 'down' ? 'sel' : '') + '" data-gs="usdown" aria-pressed="' + (voted === 'down') + '">' + THUMB(false) + '<b>ウソ</b></button></div>' +
        '<p class="pm-note">' + (voted ? '投票しました。答え合わせまで変えられます' : '話を聞いたら、こっそり投票') + '</p>') + '</div>';
  }
  if (b.v === 'local') return watch('親のスマホで', '今は親のスマホが回ってくるのを待ってね');
  return watch('親のスマホを見てね', b.say ? esc(gStr(b.say, 60)) : '');
}
let gsTimer = 0;
function guestMount() {
  clearInterval(gsTimer);
  const v = guest && guest.v && guest.v.k === 'view' ? guest.v : null, b = v && v.b ? v.b : {};
  if (b.v === 'gk') gsCanvas(b);
  if (b.v === 'us' && b.ph === 'talk' && okInt(b.left, 0, 99)) {
    const end = Date.now() + b.left * 1000;
    gsTimer = setInterval(() => { const el = $('gsClock'); if (!el) { clearInterval(gsTimer); return; } const l = Math.max(0, Math.ceil((end - Date.now()) / 1000)); el.textContent = l || '時間！'; if (!l) clearInterval(gsTimer); }, 250);
  }
  const inp = $('gsIn');
  if (inp) {
    inp.value = gsDraft;
    inp.addEventListener('input', () => { gsDraft = inp.value; });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); guestAct('ogsend'); } });
  }
}
function gsCanvas(b) {
  const wrap = $('gsWrap'), cv = $('gsCv');
  if (!wrap || !cv) return;
  const strokes = gsStrokes(b.s);
  requestAnimationFrame(() => {
    const size = Math.max(120, Math.floor(Math.min(wrap.clientWidth, wrap.clientHeight)));
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.style.width = cv.style.height = size + 'px';
    cv.width = cv.height = Math.round(size * dpr);
    gkPaint(cv, strokes);
    if (!b.turn) return;
    let live = null;
    const at = e => { const r = cv.getBoundingClientRect(); return [Math.round(Math.max(0, Math.min(1000, (e.clientX - r.left) / r.width * 1000))), Math.round(Math.max(0, Math.min(1000, (e.clientY - r.top) / r.height * 1000)))]; };
    cv.addEventListener('pointerdown', e => {
      if (live || cv.dataset.sent) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      live = { p: guest.v.p, d: at(e), id: e.pointerId };
      gkPaint(cv, strokes, live);
    });
    cv.addEventListener('pointermove', e => {
      if (!live || e.pointerId !== live.id) return;
      e.preventDefault();
      const [px, py] = at(e), d = live.d;
      if (Math.hypot(px - d[d.length - 2], py - d[d.length - 1]) < 5 || d.length >= 1000) return;
      d.push(px, py); gkPaint(cv, strokes, live);
    });
    const end = e => {
      if (!live || e.pointerId !== live.id) return;
      const d = live.d; let len = 0;
      for (let i = 2; i < d.length; i += 2) len += Math.hypot(d[i] - d[i - 2], d[i + 1] - d[i - 1]);
      const st = live; live = null;
      if (len < 14) { gkPaint(cv, strokes); telop('もう少し長く描いてね', 'white sm', 900); return; }
      if (guestSend({ k: 'act', a: 'stroke', d: d.slice() })) { cv.dataset.sent = '1'; gkPaint(cv, strokes, st); SE.play('pop'); vibrate(12); }
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  });
}
function guestAct(a, el) {
  if (!guest) return;
  if (a === 'leave') { SE.play('tap'); guestLeave(); return; }
  if (a === 'ogdhost') { SE.play('tap'); ogdView('host', true); return; }
  if (a === 'again') { guest.st = 'conn'; guest.tries = 0; renderGuest(); guestConnect(); return; }
  if (a === 'pick') { const p = Number(el && el.dataset.p); if (okInt(p, 0, 7)) { guestSend({ k: 'pick', p }); SE.play('select'); } return; }
  const act = (x, extra) => { if (guestSend(Object.assign({ k: 'act', a: x }, extra || {}))) SE.play('tap'); else telop('つながっていません', 'white sm', 1000); };
  if (a === 'ogsend') {
    const inp = $('gsIn'), txt = ogText(inp ? inp.value : '');
    if (!txt) { if (inp) { inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); inp.focus(); } SE.play('boing'); return; }
    act('ans', { txt });   /* the box keeps the words until the host says the answer arrived */
    return;
  }
  if (a === 'ogpt') { if (guestSend({ k: 'act', a: 'pt' })) vibrate(8); else telop('つながっていません', 'white sm', 1000); return; }
  if (a === 'msok' || a === 'msng') { act('ans', { ok: a === 'msok' }); return; }
  if (a === 'usre') { act('re'); return; }
  if (a === 'ustalk') { act('talk'); return; }
  if (a === 'usup' || a === 'usdown') act('vote', { up: a === 'usup' });
}

/* 合言葉で参加（タイトル画面の「参加」） */
function openJoin() {
  if (!ROOM_ON) return;
  const box = $('joinBox');
  box.innerHTML = '<h2 id="joinTitle">' + PHONE_SVG + '友だちの部屋に参加</h2><p>親のスマホに出ている<b>4文字の合言葉</b>を入れてね。参加は無料です</p>' +
    '<input id="joinIn" class="rm-in" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" enterkeyhint="go" aria-label="合言葉" placeholder="K7QP">' +
    '<p class="rm-err" id="joinErr"></p><div class="dialog-acts"><button type="button" class="pbtn white" data-jn="close">やめる</button><button type="button" class="pbtn grow" data-jn="go">参加する</button></div>';
  openOv('joinOv'); SE.play('pop');
  const i = $('joinIn');
  i.addEventListener('input', () => { i.value = i.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 4); });
  i.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) joinAct('go'); });
  i.focus();
}
function joinAct(a) {
  if (a === 'close') { closeOv('joinOv'); SE.play('tap'); return; }
  const v = ($('joinIn') || {}).value || '';
  if (!ROOM_RE.test(v)) { $('joinErr').textContent = '4文字の合言葉を入れてね（O と I は使っていません）'; SE.play('boing'); return; }
  closeOv('joinOv'); SE.play('tap');
  guestStart(v);
}

/* the host's pages: a stroke list a little lighter to send (every second point past 250) */
const roomStrokes = ss => ss.map(s => ({ p: s.p, d: s.d.length > 500 ? s.d.filter((_, i) => (i >> 1) % 2 === 0 || i >= s.d.length - 2) : s.d }));

function roomBoot() {
  if (!ROOM_ON) return;
  $('roomBox').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) roomAct(b.dataset.rm, b); });
  $('joinBox').addEventListener('click', e => { const b = e.target.closest('[data-jn]'); if (b) joinAct(b.dataset.jn); });
  $('gsBox').addEventListener('click', e => { const b = e.target.closest('[data-gs]'); if (b && !b.disabled) guestAct(b.dataset.gs, b); });
  $('roomBtn').addEventListener('click', () => openRoom());
  $('joinBtn').hidden = !PLUS_OPEN;   /* before premium is on sale nobody can make a room; a link from a QR code still works */
  $('joinBtn').addEventListener('click', () => openJoin());
  window.addEventListener('online', () => { if (room && !room.ws) { room.fails = 0; roomConnect(); } if (guest && !guest.ws && guest.st !== 'end' && guest.st !== 'no') guestConnect(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) return; if (room && !room.ws) roomConnect(); if (guest && !guest.ws && guest.st === 'conn') guestConnect(); });
  roomLoad();
  if (roomLive()) roomConnect(); else if (room) { room = null; roomSave(); }
  /* a link from the host's QR code: ?r=K7QP ・ the 試験版: ?demo=ogiri */
  let r = null, demo = '';
  try { const q = new URLSearchParams(location.search); r = (q.get('r') || '').toUpperCase(); demo = q.get('demo') || ''; } catch (_) { r = null; }
  if (r || demo) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (_) { /* ignore */ } }
  if (demo === 'ogiri' && ogdStart()) return true;
  if (r && ROOM_RE.test(r)) { guestStart(r); return true; }
  const s = guestSaved();
  if (s) { guestStart(s.r); return true; }
  return false;
}

/* ---------- 試験版：大喜利グランプリを1台で（?demo=ogiri） ----------
   あなた＋CPU 3人。4人とも自分のスマホで参加している体で、親の画面と「あなたのスマホ」の画面をこのスマホの中だけでつなぐ。
   サーバーにはつながず、何も残さない（遊びかけのゲーム・部屋・お試し回数・利用の集計のどれにも入らない） */
const OGD_Q = [
  ['こんなコンビニはイヤだ', [['「温めますか？」と聞かれ、店員さんに抱きしめられる', 2], ['24時間営業。ただし開いているのは1分だけ', 1], ['コンビニなのに遠い', 0], ['レシートが長い。ほぼ巻物', 1]]],
  ['300年ぶりに目覚めたロボットの第一声', [['「アップデートが12万件あります」', 2], ['「充電80%。あと300年いけます」', 1], ['「おはようございます」', 0], ['「起動音は自分で言うタイプです。ウィーン」', 1]]],
];
const OGD_NM = ['あなた', 'CPUたろう', 'CPUはなこ', 'CPUけんじ'];
/* ogd = { view: 'guest'|'host', tick, real (a room made before, put aside), plan: [{ p, t, k (面白さ 0-2), at, sent }], votes: { 回答: [{ v, n, at, fin }] }, auto, idle, liveT, endT } */
let ogd = null;
const ogdR = (a, b) => a + Math.random() * (b - a);
const ogdOdai = () => RP_MSGS.find(q => q.m === OGD_Q[G.turn % OGD_Q.length][0]) || null;
function ogdStart() {
  if (!ROOM_ON) return false;
  if (ogd) ogdOff();
  closeAllOverlays();
  const real = room && !room.demo ? room : null;
  if (real && real.ws) { const ws = real.ws; real.ws = null; try { ws.close(); } catch (_) { /* ignore */ } }
  if (guest && !guest.demo && guest.ws) { const ws = guest.ws; guest.ws = null; try { ws.close(); } catch (_) { /* ignore */ } }
  G = {
    v: 2, demo: true, mode: 'reply', gid: Date.now(), rounds: OGD_Q.length, unit: 'cup', lvl: 'all', turn: 0, pile: [], cur: null, pending: freshPending(), last: null, done: false, uid: 1, hist: [],
    stats: { cards: 0, devil: 0, angel: 0, hh: 0 },
    players: OGD_NM.map(name => Object.assign({ name, total: 0, times: 0, dbl: 0, hh: 0, cospa: 0, hand: [], ans: 0, pass: 0, medal: 0 }, PMX.reply.stats())),
    pm: { log: [], used: [] },
  };
  startTurn(); G.cur.sel = [];
  room = { code: 'TEST', t: '', exp: Date.now() + 6 * 3600e3, gid: G.gid, open: false, ws: null, sent: {}, fails: 0, demo: true, gs: {} };
  OGD_NM.forEach((nm, p) => { room.gs[p + 1] = { on: true, p, nm }; });
  guest = { r: 'TEST', k: '', exp: 0, g: 1, ws: null, st: 'on', host: true, v: null, tries: 0, was: true, demo: true };
  gsDraft = ''; gsSeen = { k: '', lv: 0 }; ogDraft = '';
  ogd = { view: 'host', real, plan: [], votes: {}, auto: 0, idle: 0, liveT: -1, endT: -1, tick: setInterval(ogdTick, 250) };
  coachEnd(false);
  startIntro('mgStart', '<span class="tl-ic rp-tl"></span>大喜利グランプリ 試験版<small>あなた以外の3人はCPU</small>');
  return true;
}
/* leaving the game screen ends it: the room made before (if any) comes back */
function ogdOff() {
  if (!ogd) return;
  clearInterval(ogd.tick);
  const real = ogd.real;
  ogd = null;
  if (guest && guest.demo) guest = null;
  if (room && room.demo) { room = real; if (room) roomConnect(); }
  $('scr-guest').hidden = screen !== 'guest';
  roomBadge();
}
/* which phone is on screen: the host's (the game) or yours (the guest screen, over the game) */
function ogdShow() {
  const gs = ogd.view === 'guest';
  $('scr-guest').hidden = !gs; $('scr-game').hidden = gs;
  if (gs) renderGuest();
}
function ogdView(v, say) {
  if (!ogd || ogd.view === v || screen !== 'game') return;
  ogd.view = v;
  ogdShow();
  if (v === 'host' && isPM()) renderPM('keep');
  fitScreen();
  if (say) telop(v === 'guest' ? 'あなたのスマホ' : '親のスマホ', 'white sm', 900);
}
function ogdSync() {
  if (!guest || !guest.demo || !room.gs[1]) return;
  const v = roomViewFor(1), j = JSON.stringify(v);
  if (room.sent[1] === j) return;
  room.sent[1] = j;
  guestMsg({ t: 'm', m: JSON.parse(j) });
}
const ogdSay = (p, m) => roomFromGuest(p + 1, m);
/* the CPUs' answers for this お題: three at first, one of them answers again later */
function ogdPlan(now) {
  const set = OGD_Q[G.turn % OGD_Q.length][1].slice().sort(() => Math.random() - .5), bots = [1, 2, 3].sort(() => Math.random() - .5);
  const at = [ogdR(9000, 13000), ogdR(16000, 21000), ogdR(24000, 29000), ogdR(34000, 40000)];
  ogd.plan = set.map((x, i) => ({ p: bots[i % 3], t: x[0], k: x[1], at: now + at[i], sent: false }));
  ogd.votes = {}; ogd.idle = 0;
}
/* how many points a CPU gives: your answers do well, theirs by how funny they are */
function ogdPts(a) {
  const x = ogd.plan.find(y => y.p === a.p && y.t === a.t), k = a.p === 0 ? 3 : x ? x.k : 1, per = ogPer(G.players.length);
  return Math.min(per, k === 3 ? Math.round(ogdR(3, 5)) : k === 2 ? Math.round(ogdR(4, 5)) : k === 1 ? Math.round(ogdR(1, 3)) : 0);
}
function ogdTick() {
  if (!ogd || !G || !G.demo || G.done || screen !== 'game' || G.mode !== 'reply' || introGate || pxBusy) return;
  const c = G.cur, now = Date.now();
  if (c.phase === 'before') {
    if (!ogd.auto) ogd.auto = now + 2600;
    else if (now >= ogd.auto) { ogd.auto = 0; PMX.reply.act('open'); }
    return;
  }
  if (c.phase === 'end') { if (ogd.endT !== G.turn) { ogd.endT = G.turn; ogdView('host', true); } return; }
  if (ogd.liveT !== G.turn) { ogd.liveT = G.turn; ogdPlan(now); ogdView('guest', true); }
  ogd.plan.forEach(x => {
    if (x.sent || now < x.at) return;
    if (ogBusy(x.p)) { x.at = now + 1500; return; }
    x.sent = true; ogdSay(x.p, { k: 'act', a: 'ans', txt: x.t });
  });
  if (c.phase === 'judge') {
    ogd.idle = 0;
    const a = ogCur(), key = c.at;
    if (!a) return;
    /* each CPU taps its points in within the 6 seconds */
    const vs = ogd.votes[key] = ogd.votes[key] || pxOthers(a.p).filter(v => v !== 0).map(v => ({ v, n: ogdPts(a), at: now + ogdR(500, 1800) }));
    vs.forEach(x => {
      if (now < x.at || G.cur.phase !== 'judge' || ogDone(a, x.v) || (a.pt[x.v] || 0) >= x.n) return;
      ogdSay(x.v, { k: 'act', a: 'pt' }); x.at = now + ogdR(300, 650);
    });
    return;
  }
  if (c.phase !== 'live') { ogd.idle = 0; return; }
  /* everyone has answered and nobody is waiting: the お題 closes (it waits longer for you, and while you are still writing) */
  if (!ogd.plan.every(x => x.sent) || ogQueue().length) { ogd.idle = 0; return; }
  if (!ogd.idle) ogd.idle = now;
  const wait = c.ans.some(a => a.p === 0) ? (gsDraft.trim() ? 20000 : 5000) : 60000;
  if (now - ogd.idle >= wait) { ogd.idle = 0; PMX.reply.act('close'); }
}

/* ---------- QR code (model 2, byte mode, error correction M, versions 1-6: up to 106 bytes). For the join link ---------- */
const QR_M = [null, [10, 1, 16], [16, 1, 28], [26, 1, 44], [18, 2, 32], [24, 2, 43], [16, 4, 27]];   // [ec per block, blocks, data per block]
const QR_ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];
function qrEncode(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  let v = 1;
  while (v <= 6 && QR_M[v][1] * QR_M[v][2] < bytes.length + 2) v++;
  if (v > 6) return null;
  const [ecn, nb, nd] = QR_M[v], cap = nb * nd;
  /* data: mode 0100, 8-bit count, the bytes, up to 4 zero bits, then pad bytes */
  const bits = [];
  const put = (x, n) => { for (let i = n - 1; i >= 0; i--) bits.push((x >>> i) & 1); };
  put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8));
  for (let i = 0; i < 4 && bits.length < cap * 8; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => a * 2 + b, 0));
  for (let k = 0; data.length < cap; k++) data.push(k % 2 ? 0x11 : 0xec);
  /* Reed-Solomon over GF(256), polynomial 0x11d */
  const EXP = new Array(512), LOG = new Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
  let gen = [1];
  for (let i = 0; i < ecn; i++) { const g = new Array(gen.length + 1).fill(0); gen.forEach((c, j) => { g[j] ^= c; g[j + 1] ^= mul(c, EXP[i]); }); gen = g; }
  const blocks = [], ecs = [];
  for (let b = 0; b < nb; b++) {
    const d = data.slice(b * nd, (b + 1) * nd), r = d.concat(new Array(ecn).fill(0));
    for (let i = 0; i < nd; i++) { const c = r[i]; if (c) for (let j = 1; j < gen.length; j++) r[i + j] ^= mul(gen[j], c); }
    blocks.push(d); ecs.push(r.slice(nd));
  }
  const words = [];
  for (let i = 0; i < nd; i++) blocks.forEach(d => words.push(d[i]));
  for (let i = 0; i < ecn; i++) ecs.forEach(e => words.push(e[i]));
  /* the matrix */
  const n = 17 + 4 * v, M = Array.from({ length: n }, () => new Array(n).fill(0)), F = Array.from({ length: n }, () => new Array(n).fill(false));
  const set = (r, c, on) => { M[r][c] = on ? 1 : 0; F[r][c] = true; };
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const rr = r0 + r, cc = c0 + c;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      set(rr, cc, on);
    }
  };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  for (let i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const al = QR_ALIGN[v];
  al.forEach(r => al.forEach(c => {
    if (F[r][c]) return;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }));
  set(4 * v + 9, 8, true);   // the dark module
  for (let i = 0; i < 9; i++) { if (!F[8][i]) F[8][i] = true; if (!F[i][8]) F[i][8] = true; }
  for (let i = 0; i < 8; i++) { F[8][n - 1 - i] = true; F[n - 1 - i][8] = true; }
  /* data bits, two columns at a time from the bottom right, zigzag */
  const dbits = [];
  words.forEach(w => { for (let i = 7; i >= 0; i--) dbits.push((w >>> i) & 1); });
  let k = 0;
  for (let c = n - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    const up = ((n - 1 - c) >> 1) % 2 === 0;
    for (let i = 0; i < n; i++) {
      const r = up ? n - 1 - i : i;
      for (const cc of [c, c - 1]) if (!F[r][cc]) M[r][cc] = k < dbits.length ? dbits[k++] : 0;
    }
  }
  const MASK = [(r, c) => (r + c) % 2 === 0, r => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0];
  const format = mask => {   // error correction M = 00
    const d = mask; let b = d << 10;
    for (let i = 14; i >= 10; i--) if (b & (1 << i)) b ^= 0x537 << (i - 10);
    return ((d << 10) | b) ^ 0x5412;
  };
  const build = mask => {
    const G = M.map((row, r) => row.map((x, c) => (F[r][c] ? x : x ^ (MASK[mask](r, c) ? 1 : 0))));
    const f = format(mask), bit = i => (f >> i) & 1;
    for (let i = 0; i <= 5; i++) G[i][8] = bit(i);
    G[7][8] = bit(6); G[8][8] = bit(7); G[8][7] = bit(8);
    for (let i = 9; i < 15; i++) G[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) G[8][n - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) G[n - 15 + i][8] = bit(i);
    G[4 * v + 9][8] = 1;
    return G;
  };
  const penalty = G => {
    let p = 0;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
      let run = 1;
      for (let j = 1; j < n; j++) {
        const a = pass ? G[j][i] : G[i][j], b = pass ? G[j - 1][i] : G[i][j - 1];
        if (a === b) { run++; if (j === n - 1 && run >= 5) p += run - 2; } else { if (run >= 5) p += run - 2; run = 1; }
      }
    }
    for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) { const x = G[r][c]; if (x === G[r + 1][c] && x === G[r][c + 1] && x === G[r + 1][c + 1]) p += 3; }
    const pat = [1, 0, 1, 1, 1, 0, 1];
    for (let r = 0; r < n; r++) for (let c = 0; c + 6 < n; c++) {
      if (pat.every((x, i) => G[r][c + i] === x)) { const before = c >= 4 && [1, 2, 3, 4].every(i => !G[r][c - i]), after = c + 10 < n && [7, 8, 9, 10].every(i => !G[r][c + i]); if (before || after) p += 40; }
      if (pat.every((x, i) => G[c + i][r] === x)) { const before = c >= 4 && [1, 2, 3, 4].every(i => !G[c - i][r]), after = c + 10 < n && [7, 8, 9, 10].every(i => !G[c + i][r]); if (before || after) p += 40; }
    }
    const dark = G.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
    p += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10;
    return p;
  };
  let best = null, bp = Infinity;
  for (let m = 0; m < 8; m++) { const G = build(m), p = penalty(G); if (p < bp) { bp = p; best = G; } }
  return best;
}
/* an SVG of the code, with the quiet zone around it */
function qrSVG(text) {
  const G = qrEncode(text);
  if (!G) return '';
  const n = G.length, q = 4, size = n + q * 2;
  let d = '';
  G.forEach((row, r) => row.forEach((x, c) => { if (x) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z'; }));
  return '<svg class="qr" viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges" aria-hidden="true"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#150733"/></svg>';
}
