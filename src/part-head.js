(() => {
'use strict';

/* ---------- page source, captured before anything renders (used to republish the page) ---------- */
const SKELETON = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>';
const SRC = Array.from(document.querySelectorAll('[data-src]'), el => ({ id: el.id, html: el.outerHTML }));

const $ = id => document.getElementById(id);
const DRAFT_KEY = 'nomige-deck-draft';
const TAGS = ['引いた人', 'ランダム', '左隣', '右隣'];
const TAG_RE = /\{(引いた人|ランダム|左隣|右隣)\}/g;
const CAT_KEYS = ['key', 'name', 'mark', 'color', 'on'];
const CARD_KEYS = ['id', 'cat', 'text', 'cups', 'min', 'dur', 'note', 'on', 'fx', 'drink'];
const COLORS = 12;
const SAMPLE = ['ユウキ', 'サキ', 'ケンタ', 'ミオ', 'ダイチ', 'アヤ', 'ショウ', 'ナナ'];
const RO_CODES = ['not_writer', 'not_granted', 'consent_required', 'capability_disabled', 'capability_removed', 'not_declared'];
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* app-linked effects a card can carry (chosen in the card editor; the game reacts to card.fx) */
const CH_STAKE = '。クリアで回避、失敗でカードの杯数（範囲なら多い方・杯数なしなら1杯）';
const FX_GROUPS = [
  ['チャレンジ（クリアで回避）', [
    ['ch_random', 'チャレンジ（ランダム）', 'アプリが7種類のミニゲームから1つ選ぶ' + CH_STAKE],
    ['ch_stop', 'ピタリストップ', 'カウントダウンのあと動き出し、1.5秒で見えなくなるタイマーを、目標の秒数ぴったり（誤差0.3秒以内）で止める' + CH_STAKE],
    ['ch_gauge', 'ジャストゲージ', '左右に動く針を、緑のゾーンで止める（ゾーンの幅は毎回ランダム・1回勝負）' + CH_STAKE],
    ['ch_mash', '連打チャレンジ', '5秒以内に30〜70回（10回刻みで毎回ランダム）タップ' + CH_STAKE],
    ['ch_circle', 'まんまるチャレンジ', '指で一筆のまるを描いて80点以上' + CH_STAKE],
    ['ch_color', '色当てチャレンジ', '書いてある言葉ではなく文字の色を、5問連続で答える（1問1.8秒）' + CH_STAKE],
    ['ch_order', '数字タッチ', 'バラバラの1〜9を、5秒以内に順番どおりタッチ（間違えたらその場でアウト）' + CH_STAKE],
    ['ch_hilo', 'ハイ&ロー', '次のトランプが今より上か下かを3連続で当てる（同じ数はやり直し）' + CH_STAKE],
  ]],
  ['みんなで遊ぶ', [
    ['bomb', '爆弾パス回し', 'お題に答えながらスマホを左隣へパス。爆発したときに持っていた人がカードの杯数（杯数なしなら1杯）'],
  ]],
  ['アプリの演出', [
    ['pick', '名前ルーレット', 'アプリのルーレットで1人を選び、その人の記録画面を開く'],
    ['tap', '早押し対決', '引いた人とランダムの人で、合図のあと画面タップの早押し'],
    ['hh', '天国と地獄（無料）', '引いた人が、特殊ルールの回数を使わずに天国と地獄を回せる'],
    ['least', '一番少ない人に目印', '今いちばん飲んでいない人の席に目印を出す'],
    ['last', '直前に飲んだ人に目印', '直前に記録された人の席に目印を出す'],
  ]],
  ['道具をアプリで（本物の道具で遊んでもOK）', [
    ['chinchiro', 'チンチロ', '全員が順番にお椀へサイコロ3個を振り、いちばん弱い役の人がカードの杯数（同じなら全員）。シゴロかヒフミが出たら×2、両方なら×4'],
    ['dice', 'サイコロ勝負', '名前の出てくる2人がお椀にサイコロを1個ずつ振り、小さい目の方がカードの杯数（同じなら両方）'],
    ['cards', 'トランプ勝負', '名前の出てくる2人がトランプを1枚ずつ引き、低い方（A=1）がカードの杯数（同じなら両方）'],
    ['indian', 'インディアンポーカー', '2人にトランプを配り、せーので開いて低い方がカードの杯数。JOKERが出たら2人とも'],
    ['darts', 'ダーツ勝負', '動く狙いを見て「投げる！」。得点の低い方がカードの杯数（同点なら両方）'],
  ]],
  ['手札に入る券', [
    ['safe', 'セーフ券', '引いた人の手札へ。飲む対象になったとき1回だけ回避'],
    ['givesafe', 'セーフ券を渡す', '引いた人が選んだ人の手札にセーフ券を入れる'],
    ['push', '押し付け券', '引いた人の手札へ。飲む量をランダムの人に押し付けられる'],
    ['heavenpass', '天国パス', '天国と地獄で地獄マスを1回だけ天国にできる'],
    ['freecospa', 'コスパ無料券', '次のコスパの前払い1杯が不要になる'],
    ['rest', '休憩券（最多の人へ）', '今いちばん飲んでいる人の手札に休憩券（1回回避）'],
  ]],
  ['次に飲む人への効果', [
    ['x2next', '次の人2倍', '次に飲む人の量を2倍にする'],
    ['halfnext', '次の人半分', '次に飲む人の量を半分にする'],
  ]],
  ['継続中の効果（「継続」の入力が必要）', [
    ['half', '飲む量半分', '継続しているあいだ、引いた人の飲む量が半分'],
    ['nodouble', '倍倍無効', '継続しているあいだ、引いた人は倍倍FIGHT！で倍にされない'],
    ['mate', 'インシュメイト（一緒に飲む）', '引いた人が1人を指名。継続しているあいだ、どちらかが飲むと、もう片方にも同じ量を自動で記録'],
  ]],
  ['その他', [
    ['swap', '記録の入れ替え', '引いた人と、選んだ人の杯数を入れ替える'],
    ['endrule', 'ルールを終わらせる', '場に残っている継続カードを1枚終わらせる'],
  ]],
];
const FX_INFO = {};
FX_GROUPS.forEach(([group, list]) => list.forEach(([k, name, desc]) => { FX_INFO[k] = { name, desc, group }; }));
const fxName = k => (FX_INFO[k] ? FX_INFO[k].name : 'アプリ連動');

/* cards that name a time ("30秒", "10秒で", "1分") get an on-screen timer; "N秒ストップ" gets a hidden-stopwatch duel.
   Cards whose own mini game already keeps time (challenges, bomb, tap duel) are left alone. */
function timerOf(c) {
  if (!c || /^ch_/.test(c.fx || '') || c.fx === 'bomb' || c.fx === 'tap') return null;
  const s = String(c.text || '') + ' ' + String(c.note || '');
  const m = /(\d+(?:\.\d+)?)\s*(秒|分)/.exec(s);
  if (!m) return null;
  const sec = Math.round(Number(m[1]) * (m[2] === '分' ? 60 : 1));
  if (!(sec >= 3 && sec <= 600)) return null;
  return { sec, stop: m[2] === '秒' && /^\s*ストップ/.test(s.slice(m.index + m[0].length)) };
}
function fmtSec(s) { return s >= 60 && s % 60 === 0 ? s / 60 + '分' : s + '秒'; }

/* who drinks when a card is drawn. Picked in the card editor (「飲む人の決め方」); empty = worked out from the text.
   auto / all / others / least / last: the app knows who, and records it by itself when the card is closed.
   pick: someone names people (指名画面). judge: decided by playing (「誰が飲む？」画面). app: the app's mini game decides. none: nobody now. */
const DRINK_OPTS = [
  ['auto', '書かれた人が飲む（自動で記録）'],
  ['all', '全員が飲む（自動で記録）'],
  ['others', '引いた人以外の全員（自動で記録）'],
  ['pick', '指名して決める（指名画面が出る）'],
  ['judge', '遊んだ結果で決まる（「誰が飲む？」画面が出る）'],
  ['none', 'このカードでは飲まない'],
];
const DRINK_INFO = Object.fromEntries(DRINK_OPTS);
const DRINK_SHORT = { auto: '自動で記録', all: '全員を自動で記録', others: '引いた人以外を自動で記録', least: '少ない人を自動で記録', last: '直前の人を自動で記録',
  pick: '指名画面', judge: '誰が飲む？画面', app: 'ミニゲームの結果で記録', none: '飲まない' };
const D_TAG = '\\{(?:引いた人|ランダム|左隣|右隣)\\}';
const D_END = '(?:グイ|飲む|飲み)?[。！!]*$';
function guessDrink(text) {
  const t = String(text || '').replace(/\s+/g, '');
  if (new RegExp('^全員で?(?:\\d+杯)?(?:ずつ)?' + D_END).test(t) && /(グイ|飲)/.test(t)) return 'all';
  if (new RegExp('^' + D_TAG + '以外の全員[がは]?(?:\\d+杯)?(?:ずつ)?' + D_END).test(t)) return 'others';
  if (new RegExp('^' + D_TAG + 'が[1-3１-３]人を指名(?:。その(?:[1-3１-３]人|人)[がは]\\d+杯(?:ずつ)?|し、一緒に\\d+杯ずつ)' + D_END).test(t)) return 'pick';
  if (new RegExp('^' + D_TAG + '(?:と' + D_TAG + ')*(?:は|が|で乾杯して|で)\\d+杯(?:ずつ)?' + D_END).test(t) && /(グイ|飲)/.test(t)) return 'auto';
  return 'judge';
}
/* app versions of real-world tools (dice, cards …): set as an app effect, or read from the text of a card left on 「自動で判定」 */
const TOOL_FX = ['chinchiro', 'dice', 'cards', 'indian', 'darts'];
function toolOf(c) {
  if (!c) return null;
  if (TOOL_FX.includes(c.fx)) return c.fx;
  if (c.fx || c.drink || !c.cups || !c.cups.length || c.dur) return null;
  const t = String(c.text || '');
  if (/チンチロ/.test(t)) return 'chinchiro';
  if (/インディアンポーカー/.test(t)) return 'indian';
  if (/ダーツ/.test(t)) return 'darts';
  if (/サイコロ/.test(t)) return 'dice';
  if (/トランプを?1枚ずつ引/.test(t)) return 'cards';
  return null;
}
/* continuing cards that name someone (「インシュメイト」「執事」…); インシュメイト also links the two people's drinks */
const durPickCard = c => !!(c && c.dur && /指名/.test(String(c.text || '')));
const mateCard = c => !!(c && c.dur && (c.fx === 'mate' || (!c.fx && /インシュメイト|もう片方も同じ量/.test(String(c.text || '')))));
const ruleTitle = text => { const m = /「([^」]{1,12})」/.exec(String(text || '')); return m ? m[1] : ''; };
/* the mode the game uses: app-linked effects first, then the editor choice, then the text */
function drinkOf(c) {
  const fx = (c && c.fx) || '';
  if (/^ch_/.test(fx) || fx === 'bomb' || fx === 'tap' || fx === 'pick' || fx === 'hh') return 'app';
  if (fx === 'least' || fx === 'last') return fx;
  if (!c || !c.cups || !c.cups.length) return 'none';
  if (c.drink && DRINK_INFO[c.drink]) return c.drink;
  if (c.dur) return 'none';
  const tm = timerOf(c);
  if (tm && tm.stop) return 'app';
  return guessDrink(c.text);
}
/* 指名 details from the text: who names, how many, and whether the namer drinks too */
function pickInfo(c) {
  const t = String(c.text || '');
  const m = /\{(引いた人|ランダム|左隣|右隣)\}が\s*([1-3１-３])\s*人を指名/.exec(t);
  const n = m ? Number(String(m[2]).replace(/[１-３]/, d => '１２３'.indexOf(d) + 1)) : 1;
  return { by: m ? m[1] : '引いた人', n, self: /一緒に/.test(t) };
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k] === undefined ? null : o[k]]));
const fmtNo = id => 'No.' + String(id).padStart(3, '0');
const colorVar = n => 'var(--c' + (Number(n) || 6) + ')';

function serialize(d) {
  return '{"version":1,\n"categories":[\n' + d.categories.map(c => JSON.stringify(pick(c, CAT_KEYS))).join(',\n') +
    '\n],\n"cards":[\n' + d.cards.map(c => JSON.stringify(pick(c, CARD_KEYS))).join(',\n') + '\n]}';
}
function normalize(d) {
  const cats = d && Array.isArray(d.categories) ? d.categories : [];
  const cards = d && Array.isArray(d.cards) ? d.cards : [];
  return {
    version: 1,
    categories: cats.map(c => ({
      key: String(c.key), name: String(c.name == null ? '' : c.name), mark: String(c.mark == null ? '' : c.mark),
      color: Math.min(COLORS, Math.max(1, Number(c.color) || 1)), on: c.on !== false,
    })),
    cards: cards.map(c => ({
      id: Number(c.id), cat: String(c.cat), text: String(c.text == null ? '' : c.text),
      cups: Array.isArray(c.cups) ? c.cups.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 99).slice(0, 2) : [],
      min: Math.min(8, Math.max(2, Number(c.min) || 2)),
      dur: c.dur ? String(c.dur) : null, note: c.note ? String(c.note) : null, on: c.on !== false,
      fx: c.fx ? String(c.fx) : null,
      drink: DRINK_INFO[c.drink] ? String(c.drink) : null,
    })),
  };
}
/* the home-screen app (PWA) build sets window.SAKEGO_APP before this script: card edits are then kept on this device
   (localStorage) instead of being republished into the page, and the deck built into the page is only the starting set */
const IS_APP = !!window.SAKEGO_APP;
const APP_DECK_KEY = 'sakego-deck';
function appDeck() {
  if (!IS_APP) return null;
  try { const d = JSON.parse(localStorage.getItem(APP_DECK_KEY) || 'null'); return d && Array.isArray(d.cards) && Array.isArray(d.categories) ? d : null; } catch (_) { return null; }
}
function parseEmbedded() {
  const own = appDeck();
  if (own) return own;
  try { return JSON.parse($('deck-data').textContent); } catch (_) { return { categories: [], cards: [] }; }
}

