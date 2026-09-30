/* =====================================================================
   DECK EDITOR
   ===================================================================== */
const saved = normalize(parseEmbedded());
const SAVED_STR = serialize(saved);
const clone = d => normalize(JSON.parse(serialize(d)));
let deck = clone(saved);
const ui = { filter: 'all', players: 4, mode: 'tag' };
let editing = null;          // { id, isNew, card?, draft?, err?, confirmDelete? }
let lastField = 'ed-text';
let lastAction = '';
let saving = false, savingText = '', saveNote = '', readOnly = false;
let discardArmed = false, discardTimer = 0;
let pendingRestore = null;

const artifactP = (window.claude && typeof window.claude.use === 'function')
  ? Promise.resolve().then(() => window.claude.use('artifact')).catch(() => null)
  : Promise.resolve(null);

const catOf = key => deck.categories.find(c => c.key === key);
const catName = c => (c ? (c.name.trim() || '（名前なし）') : '（系統なし）');
const catMark = c => (c ? (c.mark.trim() || catName(c).slice(0, 1)) : '？');
function reasonKind(card) {
  const cat = catOf(card.cat);
  if (!card.on) return 'off';
  if (!cat || !cat.on) return 'cat';
  if (card.min > ui.players) return 'short';
  return null;
}
function namesFor(id, n) {
  const d = (id * 3) % n;
  const r = (d + 1 + ((id * 7) % (n - 1))) % n;
  return { '引いた人': SAMPLE[d], '左隣': SAMPLE[(d + 1) % n], '右隣': SAMPLE[(d - 1 + n) % n], 'ランダム': SAMPLE[r] };
}
function fill(text, card) {
  const safe = esc(text);
  if (ui.mode === 'tag') return safe.replace(TAG_RE, '<span class="tag">{$1}</span>');
  const map = namesFor(card.id, ui.players);
  return safe.replace(TAG_RE, (_, k) => '<span class="nm">' + map[k] + '</span>');
}
function cupsHTML(card) {
  if (!card.cups.length) return card.cat === 'safe' ? '<span class="cups">SAFE</span>' : '<span class="cups fx">効果カード</span>';
  const label = card.cups.length > 1 ? card.cups[0] + '–' + card.cups[1] : card.cups[0];
  return '<span class="cups">' + label + '<small>杯</small></span>';
}
function changeCount() {
  let n = 0;
  const diff = (a, b, keyOf, keys) => {
    const A = new Map(a.map(x => [keyOf(x), JSON.stringify(pick(x, keys))]));
    const B = new Map(b.map(x => [keyOf(x), JSON.stringify(pick(x, keys))]));
    for (const [k, v] of B) if (A.get(k) !== v) n++;
    for (const k of A.keys()) if (!B.has(k)) n++;
  };
  diff(saved.categories, deck.categories, c => c.key, CAT_KEYS);
  diff(saved.cards, deck.cards, c => c.id, CARD_KEYS);
  if (n === 0 && serialize(deck) !== SAVED_STR) n = 1;
  return n;
}
function nextId() {
  let m = 0;
  for (const c of deck.cards) m = Math.max(m, c.id);
  for (const c of saved.cards) m = Math.max(m, c.id);
  return m + 1;
}
function stashDraft() {
  try {
    const s = serialize(deck);
    if (s !== SAVED_STR) sessionStorage.setItem(DRAFT_KEY, s); else sessionStorage.removeItem(DRAFT_KEY);
  } catch (_) { /* storage unavailable */ }
}

function renderDeckbar() {
  $('deckbar').innerHTML = deck.categories.map(cat => {
    const n = deck.cards.filter(c => c.cat === cat.key && !reasonKind(c)).length;
    return n ? '<span style="--c:' + colorVar(cat.color) + ';flex:' + n + '"></span>' : '';
  }).join('');
}
function renderChips() {
  let h = '<button type="button" class="chip" id="chip-any" data-cat="all" aria-pressed="' + (ui.filter === 'all') + '">すべて <span class="n">' + deck.cards.length + '</span></button>';
  h += deck.categories.map(cat => {
    const n = deck.cards.filter(c => c.cat === cat.key).length;
    return '<button type="button" class="chip' + (cat.on ? '' : ' is-off') + '" id="chip-' + esc(cat.key) + '" data-cat="' + esc(cat.key) +
      '" style="--c:' + colorVar(cat.color) + '" aria-pressed="' + (ui.filter === cat.key) + '"><span class="dot"></span><span class="cn">' +
      esc(catName(cat)) + '</span>' + (cat.on ? '' : '<span class="offtag">OFF</span>') + ' <span class="n">' + n + '</span></button>';
  }).join('');
  $('chips').innerHTML = h;
}
function renderPlayers() {
  let h = '';
  for (let n = 2; n <= 8; n++) h += '<button type="button" class="num" id="p-' + n + '" data-n="' + n + '" aria-pressed="' + (ui.players === n) + '" aria-label="' + n + '人">' + n + '</button>';
  $('players').innerHTML = h;
  document.querySelectorAll('#mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === ui.mode)));
}
function renderStatus() {
  let off = 0, catOff = 0, short = 0, active = 0;
  for (const c of deck.cards) {
    const k = reasonKind(c);
    if (!k) active++; else if (k === 'off') off++; else if (k === 'cat') catOff++; else short++;
  }
  const parts = [];
  if (off) parts.push('OFFのカード' + off + '枚');
  if (catOff) parts.push('OFFの系統' + catOff + '枚');
  if (short) parts.push('人数不足' + short + '枚');
  $('status').innerHTML = ui.players + '人プレイ：山札 <b>' + active + '</b>枚' + (parts.length ? '（除外：' + parts.join('・') + '）' : '');
}
function viewCard(card) {
  const cat = catOf(card.cat);
  const kind = reasonKind(card);
  const meta = [];
  if (kind === 'off') meta.push('<span class="pill warn">OFF</span>');
  else if (kind === 'cat') meta.push('<span class="pill warn">系統OFF</span>');
  if (card.min > 2) meta.push('<span class="pill' + (kind === 'short' ? ' warn' : '') + '">' + card.min + '人以上</span>');
  if (card.dur) meta.push('<span class="pill">継続：' + esc(card.dur) + '</span>');
  if (card.fx) meta.push('<span class="pill app">連動：' + esc(fxName(card.fx)) + '</span>');
  const tmr = timerOf(card);
  if (tmr) meta.push('<span class="pill app">' + (tmr.stop ? fmtSec(tmr.sec) + 'ストップ対決' : 'タイマー ' + fmtSec(tmr.sec)) + '</span>');
  return '<article class="card' + (kind ? ' off' : '') + '" id="card-' + card.id + '" style="--c:' + colorVar(cat ? cat.color : 6) + '">' +
    '<div class="idx"><span class="k">' + esc(catMark(cat)) + '</span><span class="no">' + fmtNo(card.id) + '</span><span class="cat">' + esc(catName(cat)) + '</span>' +
    '<label class="sw" title="山札に入れる"><input type="checkbox" id="on-' + card.id + '" data-act="toggle" data-id="' + card.id + '"' + (card.on ? ' checked' : '') + '>' +
    '<span class="sw-track" aria-hidden="true"></span><span class="sr">' + fmtNo(card.id) + 'を山札に入れる</span></label></div>' +
    '<p class="text">' + (card.text ? fill(card.text, card) : '（指示文なし）') + '</p>' +
    (card.note ? '<p class="note">' + fill(card.note, card) + '</p>' : '') +
    '<div class="foot"><div class="meta"><button type="button" class="edit" data-act="edit" data-id="' + card.id + '" aria-label="' + fmtNo(card.id) + 'を編集">編集</button>' + meta.join('') + '</div>' + cupsHTML(card) + '</div>' +
    '</article>';
}
function formCard(card, isNew) {
  const d = editing.draft || {
    text: card.text, cat: card.cat,
    cmin: card.cups[0] != null ? String(card.cups[0]) : '', cmax: card.cups[1] != null ? String(card.cups[1]) : '',
    min: String(card.min), dur: card.dur || '', note: card.note || '', fx: card.fx || '',
  };
  const cat = catOf(d.cat) || deck.categories[0];
  const catOpts = deck.categories.map(c => '<option value="' + esc(c.key) + '"' + (cat && c.key === cat.key ? ' selected' : '') + '>' + esc(catName(c)) + (c.on ? '' : '（OFF）') + '</option>').join('');
  const minOpts = [2, 3, 4, 5, 6, 7, 8].map(n => '<option value="' + n + '"' + (String(n) === String(d.min) ? ' selected' : '') + '>' + (n === 2 ? '制限なし（2人から）' : n + '人以上') + '</option>').join('');
  const del = isNew ? '' : (editing.confirmDelete
    ? '<span class="del-q">' + fmtNo(card.id) + 'を削除しますか？</span><button type="button" class="danger solid" data-act="del-yes">削除する</button><button type="button" class="plain" data-act="del-no" id="ed-del-no">やめる</button>'
    : '<button type="button" class="danger" data-act="del" id="ed-del">このカードを削除</button>');
  return '<article class="card editing" id="card-edit" style="--c:' + colorVar(cat ? cat.color : 6) + '">' +
    '<div class="idx"><span class="k" id="ed-mark">' + esc(catMark(cat)) + '</span><span class="no">' + fmtNo(card.id) + '</span><span class="cat">' + (isNew ? '新しいカード' : '編集中') + '</span></div>' +
    '<form class="ed" id="ed-form" novalidate>' +
      '<div class="ed-main">' +
        '<div class="fld"><label class="lbl" for="ed-text">指示文</label>' +
          '<textarea class="field" id="ed-text" rows="3" maxlength="200" placeholder="例：{引いた人}と{ランダム}でジャンケン。負けた方が1杯">' + esc(d.text) + '</textarea></div>' +
        '<div class="ins" role="group" aria-label="タグを挿入"><span class="lbl">タグを挿入</span>' +
          TAGS.map(t => '<button type="button" data-ins="{' + t + '}">{' + t + '}</button>').join('') + '</div>' +
        '<div class="fld"><label class="lbl" for="ed-note">補足（任意）</label>' +
          '<input class="field" id="ed-note" maxlength="120" value="' + esc(d.note) + '" placeholder="例：同数なら該当者全員"></div>' +
      '</div>' +
      '<div class="ed-side">' +
        '<div class="fld"><label class="lbl" for="ed-cat">系統</label><select class="field" id="ed-cat">' + catOpts + '</select></div>' +
        '<div class="fld"><span class="lbl" id="lbl-cups">杯数</span>' +
          '<div class="cups-in" role="group" aria-labelledby="lbl-cups">' +
            '<input class="field" id="ed-cmin" type="number" inputmode="numeric" min="1" max="99" step="1" value="' + esc(d.cmin) + '" aria-label="杯数">' +
            '<span>〜</span>' +
            '<input class="field" id="ed-cmax" type="number" inputmode="numeric" min="1" max="99" step="1" value="' + esc(d.cmax) + '" aria-label="杯数の上限（範囲のときだけ）">' +
            '<span>杯</span></div>' +
          '<span class="hint">1〜99の整数。範囲のときだけ右にも入力。両方空欄なら杯数なし（セーフ・効果カード）</span></div>' +
        '<div class="fld"><label class="lbl" for="ed-min">最低人数</label><select class="field" id="ed-min">' + minOpts + '</select></div>' +
        '<div class="fld"><label class="lbl" for="ed-dur">継続（任意）</label>' +
          '<input class="field" id="ed-dur" list="dur-list" maxlength="20" value="' + esc(d.dur) + '" placeholder="例：1周、次のターンまで">' +
          '<datalist id="dur-list"><option value="1周"></option><option value="2周"></option><option value="3周"></option><option value="次のターンまで"></option></datalist></div>' +
        '<div class="fld"><label class="lbl" for="ed-fx">アプリ連動</label><select class="field" id="ed-fx">' + fxOptions(d.fx) + '</select>' +
          '<span class="hint" id="ed-fx-hint">' + esc(fxHint(d.fx)) + '</span></div>' +
      '</div>' +
      '<p class="ed-err" id="ed-err" role="alert"' + (editing.err ? '' : ' hidden') + '>' + esc(editing.err || '') + '</p>' +
      '<div class="ed-actions"><button type="submit" class="btn">' + (isNew ? '追加する' : '決定') + '</button>' +
        '<button type="button" class="plain" data-act="cancel">キャンセル</button><span class="spacer"></span>' + del + '</div>' +
    '</form></article>';
}
function fxOptions(sel) {
  const known = !sel || FX_INFO[sel];
  return '<option value=""' + (sel ? '' : ' selected') + '>なし（杯数の記録だけ）</option>' +
    FX_GROUPS.map(([g, list]) => '<optgroup label="' + esc(g) + '">' +
      list.map(([k, name]) => '<option value="' + k + '"' + (sel === k ? ' selected' : '') + '>' + esc(name) + '</option>').join('') + '</optgroup>').join('') +
    (known ? '' : '<option value="' + esc(sel) + '" selected>' + esc(sel) + '（不明な効果）</option>');
}
function fxHint(k) {
  return k ? (FX_INFO[k] ? FX_INFO[k].desc : 'このアプリでは使えない効果です') : 'アプリは杯数の記録だけ行います。指示の判定はみんなで。指示文に「30秒」のような時間を書くとタイマーが、「10秒ストップ」と書くとストップ対決が使えます。';
}
function readForm() {
  return {
    text: $('ed-text').value, cat: $('ed-cat').value, cmin: $('ed-cmin').value.trim(), cmax: $('ed-cmax').value.trim(),
    min: $('ed-min').value, dur: $('ed-dur').value, note: $('ed-note').value, fx: $('ed-fx').value,
  };
}
function renderGrid() {
  if (editing && $('ed-text')) editing.draft = readForm();
  const order = new Map(deck.categories.map((c, i) => [c.key, i]));
  const editId = editing && !editing.isNew ? editing.id : null;
  const list = deck.cards
    .filter(c => ui.filter === 'all' || c.cat === ui.filter || c.id === editId)
    .sort((a, b) => (order.has(a.cat) ? order.get(a.cat) : 999) - (order.has(b.cat) ? order.get(b.cat) : 999));
  let h = editing && editing.isNew ? formCard(editing.card, true) : '';
  h += list.map(c => (c.id === editId ? formCard(c, false) : viewCard(c))).join('');
  $('grid').innerHTML = h || '<p class="empty">この系統のカードはまだありません。「＋ カードを追加」から作れます。</p>';
}
function renderCatPanel() {
  $('catRows').innerHTML = deck.categories.map(cat => {
    const k = esc(cat.key);
    return '<div class="catrow" style="--c:' + colorVar(cat.color) + '">' +
      '<button type="button" class="swatch" id="cs-' + k + '" data-act="catcolor" data-key="' + k + '" title="色を変える" aria-label="' + esc(catName(cat)) + 'の色を変える"></button>' +
      '<input class="dfield cmark" id="cm-' + k + '" data-act="catmark" data-key="' + k + '" value="' + esc(cat.mark) + '" maxlength="2" aria-label="' + esc(catName(cat)) + 'のマーク（1文字）">' +
      '<input class="dfield cname" id="cn-' + k + '" data-act="catname" data-key="' + k + '" value="' + esc(cat.name) + '" maxlength="12" aria-label="系統名">' +
      '<span class="ccount" id="cc-' + k + '"></span>' +
      '<label class="sw dark"><input type="checkbox" id="con-' + k + '" data-act="caton" data-key="' + k + '"' + (cat.on ? ' checked' : '') + '>' +
        '<span class="sw-track" aria-hidden="true"></span><span class="sw-text">使う</span></label>' +
      '<button type="button" class="plain-dark" id="cd-' + k + '" data-act="catdel" data-key="' + k + '">削除</button>' +
    '</div>';
  }).join('');
  refreshCatCounts();
}
function refreshCatCounts() {
  for (const cat of deck.categories) {
    const n = deck.cards.filter(c => c.cat === cat.key).length;
    const cc = $('cc-' + cat.key); if (cc) cc.textContent = n + '枚';
    const cd = $('cd-' + cat.key);
    if (cd) {
      const can = n === 0 && deck.categories.length > 1;
      cd.disabled = !can;
      cd.title = can ? 'この系統を削除' : 'カードが入っている系統は削除できません';
    }
  }
}
function renderSaveBar() {
  const n = changeCount();
  const bar = $('saveBar');
  bar.hidden = n === 0 && !saveNote && !saving;
  if (bar.hidden) return;
  let msg;
  if (saving) msg = '<span>' + esc(savingText) + '</span>';
  else {
    msg = saveNote ? '<span>' + esc(saveNote) + '</span>' : (lastAction ? '<span class="last">' + esc(lastAction) + '</span>' : '');
    if (n) msg += '<span>未保存の変更 <b>' + n + '</b>件</span>';
  }
  $('saveMsg').innerHTML = msg;
  $('saveBtn').hidden = readOnly;
  $('saveBtn').disabled = saving || n === 0;
  $('discardBtn').disabled = saving || n === 0;
  $('discardBtn').textContent = discardArmed ? 'もう一度押すと取り消します' : '変更を取り消す';
}
function renderAll(withPanel) {
  renderDeckbar(); renderChips(); renderPlayers(); renderStatus(); renderGrid();
  if (withPanel) renderCatPanel(); else refreshCatCounts();
  renderSaveBar();
}
function changed(withPanel) {
  saveNote = '';
  stashDraft();
  renderAll(withPanel);
}

function validate(f) {
  const text = f.text.replace(/\s*\n\s*/g, ' ').trim();
  if (!text) return { err: '指示文を入力してください。', field: 'ed-text' };
  const bad = (text + ' ' + f.note).match(/\{([^{}]*)\}/g);
  if (bad && bad.some(t => !TAGS.includes(t.slice(1, -1)))) return { err: '使えるタグは {引いた人} {ランダム} {左隣} {右隣} の4つです。', field: 'ed-text' };
  const isInt = s => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 99;
  let cups = [];
  if (f.cmin === '' && f.cmax !== '') return { err: '杯数は左の欄から入力してください。', field: 'ed-cmin' };
  if (f.cmin !== '') {
    if (!isInt(f.cmin)) return { err: '杯数は1〜99の整数で入力してください。', field: 'ed-cmin' };
    cups = [Number(f.cmin)];
    if (f.cmax !== '') {
      if (!isInt(f.cmax)) return { err: '杯数は1〜99の整数で入力してください。', field: 'ed-cmax' };
      if (Number(f.cmax) < cups[0]) return { err: '範囲は「少ない杯数〜多い杯数」の順で入力してください。', field: 'ed-cmax' };
      if (Number(f.cmax) > cups[0]) cups.push(Number(f.cmax));
    }
  }
  if (!catOf(f.cat)) return { err: '系統を選んでください。', field: 'ed-cat' };
  const fx = f.fx || null;
  if ((fx === 'half' || fx === 'nodouble') && !f.dur.trim()) return { err: '「' + fxName(fx) + '」は継続しているあいだだけ働く効果です。「継続」に期間（例：次のターンまで）を入れてください。', field: 'ed-dur' };
  return { card: { cat: f.cat, text, cups, min: Math.min(8, Math.max(2, Number(f.min) || 2)), dur: f.dur.trim() || null, note: f.note.replace(/\s+/g, ' ').trim() || null, fx } };
}
function showFormError(msg, field) {
  editing.err = msg;
  const p = $('ed-err');
  if (p) { p.textContent = msg; p.hidden = false; }
  const el = $(field); if (el) el.focus({ preventScroll: true });
}
function commitEdit() {
  if (!editing) return true;
  if (!$('ed-text')) { editing = null; return true; }
  const r = validate(readForm());
  if (r.err) { showFormError(r.err, r.field); return false; }
  if (editing.isNew) {
    const card = Object.assign({ id: editing.card.id, on: true, fx: null }, r.card);
    deck.cards.push(card);
    lastAction = fmtNo(card.id) + 'を追加しました';
  } else {
    const card = deck.cards.find(c => c.id === editing.id);
    if (card) { Object.assign(card, r.card); lastAction = fmtNo(card.id) + 'を更新しました'; }
  }
  editing = null;
  saveNote = '';
  stashDraft();
  return true;
}
function focusEditor() {
  const el = $('ed-text'), box = $('card-edit');
  if (!el || !box) return;
  el.focus({ preventScroll: true });
  box.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}
function focusCard(id) {
  const b = document.querySelector('#card-' + id + ' .edit');
  if (b) b.focus({ preventScroll: true });
}
function openEdit(id) {
  if (editing) {
    if (!editing.isNew && editing.id === id) return;
    if (!commitEdit()) return;
  }
  editing = { id, isNew: false };
  lastField = 'ed-text';
  renderAll();
  focusEditor();
}
function cancelEdit() {
  const id = editing && !editing.isNew ? editing.id : null;
  editing = null;
  renderAll();
  if (id) focusCard(id);
}
function deleteCard() {
  const id = editing.id;
  deck.cards = deck.cards.filter(c => c.id !== id);
  editing = null;
  lastAction = fmtNo(id) + 'を削除しました';
  changed();
  $('addCard').focus({ preventScroll: true });
}
function addCard() {
  if (editing && !commitEdit()) { focusEditor(); return; }
  const cat = ui.filter !== 'all' && catOf(ui.filter) ? ui.filter : (deck.categories[0] ? deck.categories[0].key : null);
  if (!cat) { addCategory(); return; }
  const id = nextId();
  editing = { id, isNew: true, card: { id, cat, text: '', cups: [1], min: 2, dur: null, note: null, on: true, fx: null } };
  lastField = 'ed-text';
  renderAll();
  focusEditor();
}
function insertTag(tag) {
  const el = $(lastField) || $('ed-text');
  if (!el) return;
  const s = el.selectionStart == null ? el.value.length : el.selectionStart;
  const e = el.selectionEnd == null ? s : el.selectionEnd;
  el.value = el.value.slice(0, s) + tag + el.value.slice(e);
  el.focus({ preventScroll: true });
  const p = s + tag.length;
  try { el.setSelectionRange(p, p); } catch (_) { /* ignore */ }
}
function addCategory() {
  const used = new Set(deck.categories.map(c => c.color));
  let color = (deck.categories.length % COLORS) + 1;
  for (let i = 1; i <= COLORS; i++) if (!used.has(i)) { color = i; break; }
  let n = 1;
  while (deck.categories.some(c => c.key === 'c' + n)) n++;
  const cat = { key: 'c' + n, name: '新しい系統', mark: '新', color, on: true };
  deck.categories.push(cat);
  lastAction = '系統を追加しました';
  if ($('catOv').hidden) openOv('catOv');
  changed(true);
  const inp = $('cn-' + cat.key);
  if (inp) { inp.focus({ preventScroll: true }); inp.select(); }
}

function buildDocument() {
  const json = serialize(deck).replace(/</g, '\\u003c');
  const parts = SRC.map(p => (p.id === 'deck-data'
    ? '<script type="application/json" id="deck-data" data-src="">\n' + json + '\n<' + '/script>'
    : p.html));
  return SKELETON + '\n' + parts.join('\n') + '\n</body></html>';
}
async function publishOnce(api, html) {
  try { return await api.publish(html); }
  catch (err) {
    if (err && err.code === 'upstream_error') {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 900));
      return api.publish(html);
    }
    throw err;
  }
}
async function save() {
  if (saving || readOnly) return;
  if (editing) {
    if (!commitEdit()) { focusEditor(); return; }
    renderAll();
  }
  if (changeCount() === 0) return;
  if (IS_APP) { saveOnDevice(); return; }
  saving = true; savingText = '保存しています…'; saveNote = '';
  stashDraft();
  renderSaveBar();
  const api = await artifactP;
  if (!api || typeof api.publish !== 'function') {
    saving = false; readOnly = true;
    saveNote = 'この画面では保存できません。「JSONをコピー」で内容を持ち出せます。';
    renderSaveBar();
    return;
  }
  try { sessionStorage.setItem(RETURN_KEY, 'editor'); } catch (_) { /* ignore */ }
  try {
    await publishOnce(api, buildDocument());
    savingText = '保存しました。最新の版を読み込んでいます…';
    renderSaveBar();
  } catch (err) {
    saving = false;
    const code = err && err.code;
    if (RO_CODES.includes(code)) { readOnly = true; saveNote = 'このページは閲覧専用のため保存できません。「JSONをコピー」で内容を持ち出せます。'; }
    else if (code === 'conflict') saveNote = '別の場所で新しい版が保存されました。最新の版を読み込みます。読み込み後、今回の編集は「復元する」で戻せます。';
    else if (code === 'rate_limited') saveNote = '保存が続いています。数秒待ってから、もう一度「保存する」を押してください。';
    else if (code === 'too_large') saveNote = 'データが大きすぎて保存できません。カードや文章を減らしてから保存してください。';
    else if (code === 'invalid_content' || code === 'transform_error') saveNote = '保存データを作れませんでした。もう一度「保存する」を押してください。';
    else saveNote = '保存できませんでした。通信状況を確認して、もう一度「保存する」を押してください。';
    renderSaveBar();
  }
}
/* app build: keep the deck on this device, then reload so every screen starts from the saved deck (as the artifact does after publishing) */
function saveOnDevice() {
  try {
    localStorage.setItem(APP_DECK_KEY, serialize(deck));
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.setItem(RETURN_KEY, 'editor');
  } catch (_) {
    saveNote = 'この端末に保存できませんでした。「JSONをコピー」で内容を持ち出せます。';
    renderSaveBar();
    return;
  }
  saving = true; savingText = '保存しました'; saveNote = '';
  renderSaveBar();
  setTimeout(() => location.reload(), 300);
}
let resetArmed = false, resetTimer = 0;
function resetDeck() {
  const b = $('resetDeck');
  if (!resetArmed) {
    resetArmed = true; b.textContent = 'もう一度押すと最初のカードに戻します';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { resetArmed = false; b.textContent = '最初のカードに戻す'; }, 4000);
    return;
  }
  try {
    localStorage.removeItem(APP_DECK_KEY);
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.setItem(RETURN_KEY, 'editor');
  } catch (_) { /* ignore */ }
  location.reload();
}
function discard() {
  if (!discardArmed) {
    discardArmed = true;
    clearTimeout(discardTimer);
    discardTimer = setTimeout(() => { discardArmed = false; renderSaveBar(); }, 4000);
    renderSaveBar();
    return;
  }
  discardArmed = false; clearTimeout(discardTimer);
  deck = clone(saved); editing = null; lastAction = ''; saveNote = '';
  if (ui.filter !== 'all' && !catOf(ui.filter)) ui.filter = 'all';
  stashDraft();
  renderAll(true);
}
function copyJson() {
  const json = serialize(deck);
  const btn = $('copyJson'), out = $('jsonOut');
  const fallback = () => { out.value = json; out.hidden = false; out.focus({ preventScroll: true }); out.select(); btn.textContent = '下の欄から選択してコピー'; };
  try {
    navigator.clipboard.writeText(json).then(() => {
      btn.textContent = 'コピーしました';
      setTimeout(() => { btn.textContent = 'JSONをコピー'; }, 1800);
    }).catch(fallback);
  } catch (_) { fallback(); }
}

function wireEditor() {
  $('chips').addEventListener('click', e => {
    const b = e.target.closest('button[data-cat]'); if (!b) return;
    ui.filter = b.dataset.cat; renderAll();
    const again = $(b.id); if (again) again.focus({ preventScroll: true });
  });
  $('players').addEventListener('click', e => {
    const b = e.target.closest('button[data-n]'); if (!b) return;
    ui.players = Number(b.dataset.n); renderAll();
    const again = $(b.id); if (again) again.focus({ preventScroll: true });
  });
  $('mode').addEventListener('click', e => {
    const b = e.target.closest('button[data-mode]'); if (!b) return;
    ui.mode = b.dataset.mode; renderAll();
  });
  $('addCard').addEventListener('click', addCard);
  $('copyJson').addEventListener('click', copyJson);
  $('resetDeck').hidden = !(IS_APP && appDeck());
  $('resetDeck').addEventListener('click', resetDeck);
  $('saveBtn').addEventListener('click', save);
  $('discardBtn').addEventListener('click', discard);

  const grid = $('grid');
  grid.addEventListener('click', e => {
    const ins = e.target.closest('[data-ins]');
    if (ins) { insertTag(ins.dataset.ins); return; }
    const t = e.target.closest('button[data-act]'); if (!t) return;
    const act = t.dataset.act;
    if (act === 'edit') openEdit(Number(t.dataset.id));
    else if (act === 'cancel') cancelEdit();
    else if (act === 'del') { editing.confirmDelete = true; renderGrid(); const b = $('ed-del-no'); if (b) b.focus({ preventScroll: true }); }
    else if (act === 'del-no') { editing.confirmDelete = false; renderGrid(); const b = $('ed-del'); if (b) b.focus({ preventScroll: true }); }
    else if (act === 'del-yes') deleteCard();
  });
  grid.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.act === 'toggle') {
      const card = deck.cards.find(c => c.id === Number(t.dataset.id)); if (!card) return;
      card.on = t.checked;
      lastAction = fmtNo(card.id) + (card.on ? 'を山札に入れました' : 'を山札から外しました');
      changed();
      const again = $('on-' + card.id); if (again) again.focus({ preventScroll: true });
    } else if (t.id === 'ed-fx') {
      const h = $('ed-fx-hint'); if (h) h.textContent = fxHint(t.value);
    } else if (t.id === 'ed-cat') {
      const cat = catOf(t.value), box = $('card-edit');
      if (cat && box) { box.style.setProperty('--c', colorVar(cat.color)); $('ed-mark').textContent = catMark(cat); }
    }
  });
  grid.addEventListener('submit', e => {
    e.preventDefault();
    const id = editing && !editing.isNew ? editing.id : (editing ? editing.card.id : null);
    if (commitEdit()) { renderAll(); if (id) focusCard(id); }
  });
  grid.addEventListener('keydown', e => {
    if (e.key === 'Escape' && editing && e.target.closest('#card-edit')) { e.preventDefault(); cancelEdit(); }
  });
  grid.addEventListener('focusin', e => {
    if (e.target.id === 'ed-text' || e.target.id === 'ed-note') lastField = e.target.id;
  });

  const rows = $('catRows');
  rows.addEventListener('input', e => {
    const t = e.target, cat = catOf(t.dataset.key); if (!cat) return;
    if (t.dataset.act === 'catname') cat.name = t.value;
    else if (t.dataset.act === 'catmark') cat.mark = t.value;
    else return;
    lastAction = '系統を編集しました';
    changed(false);
  });
  rows.addEventListener('change', e => {
    const t = e.target; if (t.dataset.act !== 'caton') return;
    const cat = catOf(t.dataset.key); if (!cat) return;
    cat.on = t.checked;
    lastAction = catName(cat) + (cat.on ? 'を使う設定にしました' : 'を使わない設定にしました');
    changed(false);
  });
  rows.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const cat = catOf(b.dataset.key); if (!cat) return;
    if (b.dataset.act === 'catcolor') {
      cat.color = (cat.color % COLORS) + 1;
      lastAction = catName(cat) + 'の色を変えました';
      changed(true);
      const again = $('cs-' + cat.key); if (again) again.focus({ preventScroll: true });
    } else if (b.dataset.act === 'catdel') {
      if (deck.cards.some(c => c.cat === cat.key) || deck.categories.length <= 1) return;
      deck.categories = deck.categories.filter(c => c !== cat);
      if (ui.filter === cat.key) ui.filter = 'all';
      lastAction = '系統「' + catName(cat) + '」を削除しました';
      changed(true);
      $('addCat').focus({ preventScroll: true });
    }
  });
  $('addCat').addEventListener('click', addCategory);
  $('catBtn').addEventListener('click', () => { renderCatPanel(); openOv('catOv'); const f = $('catRows').querySelector('input'); if (f) f.focus({ preventScroll: true }); });
  $('catClose').addEventListener('click', () => closeOv('catOv'));

  $('restoreYes').addEventListener('click', () => {
    if (pendingRestore) {
      deck = pendingRestore; editing = null; lastAction = '保存していない編集を復元しました';
      if (ui.filter !== 'all' && !catOf(ui.filter)) ui.filter = 'all';
    }
    pendingRestore = null; $('restoreBar').hidden = true;
    changed(true);
  });
  $('restoreNo').addEventListener('click', () => {
    pendingRestore = null; $('restoreBar').hidden = true;
    stashDraft();
  });
}
function checkDraft() {
  let draft = null;
  try { draft = sessionStorage.getItem(DRAFT_KEY); } catch (_) { /* storage unavailable */ }
  if (!draft) return;
  if (draft === SAVED_STR) { try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) { /* ignore */ } return; }
  try {
    const d = normalize(JSON.parse(draft));
    if (d.categories.length) { pendingRestore = d; $('restoreBar').hidden = false; }
  } catch (_) { /* ignore broken draft */ }
}

