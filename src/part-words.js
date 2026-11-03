
/* =====================================================================
   ことばの説明: カードに「インシュメイト」「クエスチョンマスター」のような、知らないと分からない言葉が出たら説明する。
   その言葉がこの端末で初めて出たときだけ、大きく出したカードの下で「〇〇って知ってる？」と聞く（説明を見る／知ってる）。
   2回目からは、カードの下に小さな「？ 〇〇って？」ボタンだけ。遊び方ガイドの「ことば」にも全部ならべる
   ===================================================================== */
const WORDS_KEY = 'sakego-words-seen';
const WORDS = [
  { k: 'insu', w: 'インシュメイト', re: /インシュメイト/,
    d: '「飲み仲間」をつくるルール。指名した人とされた人はペアになって、<b>どちらかが飲むと、もう片方も同じ量を飲みます</b>。アプリが2人ぶん自動で記録します。ルールが消えるまで続きます。' },
  { k: 'shitsuji', w: '執事', re: /「執事」/,
    d: '指名された人は、引いた人の<b>お世話係</b>。ご主人さま（引いた人）のグラスが空いたら、すぐに飲み物を注ぎます。気づかずに放っておいたら1杯。' },
  { k: 'qm', w: 'クエスチョンマスター', re: /クエスチョンマスター/,
    d: '略して「QM」。QMに<b>質問されて、答えてしまったら1杯</b>。QMの質問には答えずに無視するか、質問で返せばセーフです。「今なんじ？」のような何気ない質問で引っかけるのがQMの腕の見せどころ。' },
  { k: 'oya', w: '親指マスター', re: /親指マスター/,
    d: '親指マスターは、好きなタイミングで<b>こっそりテーブルに親指を置きます</b>。気づいた人から同じように親指を置いていき、<b>最後に置いた人が1杯</b>。ルールが消えるまで何回でもできます。' },
  { k: 'yubisuma', w: '指スマ', re: /指スマ/,
    d: '2人とも両手をにぎって、親指を立てられるようにかまえます。番の人が「いっせーので、〇！」と<b>0〜4の数</b>を言うのと同時に、2人とも好きな数だけ親指を上げます。上がった親指の数が言った数と同じなら、言った人は片手を引っこめられます。交代で言い合って、<b>先に両手がなくなった方の勝ち</b>。' },
  { k: 'shinrai', w: '信頼ジャンケン', re: /信頼ジャンケン/,
    d: '全員で「<b>みんなでグーを出そう</b>」と約束してからジャンケン。全員グーならセーフ。約束を破って<b>グー以外を出した人が1杯</b>。信じるか、裏切るか。' },
  { k: 'yamanote', w: '山手線ゲーム', re: /山手線ゲーム/,
    d: 'お題（山手線の駅、果物など）に合うものを、<b>手拍子のリズムに合わせて</b>1人ずつ順番に言っていきます。答えられなかった人、もう出たものを言った人、リズムに遅れた人の負け。' },
  { k: 'sanbai', w: '3の倍数ゲーム', re: /3の倍数/,
    d: '順番に数を言っていくゲーム。このカードでは<b>1人が2つずつ</b>言って次の人へ（例：「1・2」→「パン・4」→「5・パン」→「7・8」…）。<b>3の倍数と3がつく数</b>（3・6・9・12・13…）は、数を言わずに手を叩きます。間違えた人・つまった人が1杯。' },
  { k: 'chinchiro', w: 'チンチロ', re: /チンチロ/,
    d: 'サイコロ3個をお椀に振って、出た目の「役」で勝負します。2個がそろったら、残りの1個の数が<b>目</b>（大きいほど強い）。もっと強いのが<b>シゴロ</b>（4・5・6）・<b>ゾロ目</b>（3個そろう）・<b>ピンゾロ</b>（1が3個）、いちばん弱いのが<b>ヒフミ</b>（1・2・3）。アプリでは全員が振って、いちばん弱い人の負け。役の判定もアプリがします。' },
  { k: 'indian', w: 'インディアンポーカー', re: /インディアンポーカー/,
    d: '<b>自分のカードは見ずに、相手のカードだけを見て</b>勝負するトランプ遊び。アプリでは順番にスマホを回して、相手のカードだけを見ます。自分のカードを引き直すか決めたら、せーので公開。数の低い方の負け（JOKERが出たら2人とも負け）。' },
  { k: 'stop10', w: '10秒ストップ', re: /10秒ストップ/,
    d: 'ストップウォッチをスタートして、<b>画面を見ずに</b>「10秒ぴったり」だと思うところで止めます。10秒から遠い方の負け。アプリのタイマーを使えば、そのまま勝負できます。' },
  { k: 'hh', w: '天国と地獄', re: /天国と地獄/,
    d: 'アプリのルーレット。止まったマスで飲む量が変わります。<b>天国</b>＝飲まなくてOK、<b>地獄</b>＝2倍、<b>大天国</b>＝自分は0杯でその量を好きな人に押し付け、<b>大地獄</b>＝3倍。たまに「デビルモード」（地獄だらけ）や「大天使降臨」（ほぼ天国、でも大地獄が2マス）が起きます。' },
  { k: 'dbl', w: '倍倍FIGHT！', re: /倍倍FIGHT/,
    d: '特殊ルールのひとつ。自分の量を<b>2倍</b>にして飲むかわりに、<b>次に飲む人も2倍</b>にできます。次の人も倍倍FIGHT！で受けて立てば、×4、×8…とどんどん大きくなります。' },
  { k: 'cospa', w: 'コストパフォーマンス', re: /コストパフォーマンス|コスパ/,
    d: '略して「コスパ」。自分の番で、カードを引く<b>前</b>に使う特殊ルール。先に1杯飲んでおくと、そのターンに自分が飲むことになったとき、量が<b>半分</b>になります。' },
  { k: 'ken', w: '手札の券', re: /セーフ券|押し付け券|休憩券|天国パス|コスパ無料券/,
    d: '券は引いた人の<b>手札</b>に入り、席の右上に小さなカードで表示されます（席をタップすると中身が見られます）。使える場面になると、アプリが「使う？」と聞いてくれます。' },
];
const WORDS_BY_K = new Map(WORDS.map(x => [x.k, x]));
const wordsIn = c => (c ? WORDS.filter(x => x.re.test(String(c.text || '') + ' ' + String(c.note || ''))) : []);
function wordsSeen() {
  try { const a = JSON.parse(localStorage.getItem(WORDS_KEY) || '[]'); return Array.isArray(a) ? a.filter(k => WORDS_BY_K.has(k)) : []; } catch (_) { return []; }
}
function wordsMark(keys) {
  const s = wordsSeen(); let add = false;
  keys.forEach(k => { if (!s.includes(k)) { s.push(k); add = true; } });
  if (add) lsSet(WORDS_KEY, JSON.stringify(s));
}
/* under the big card: ask the first time, a small button after that */
function zoomWords(c) {
  const box = $('zGloss'), ws = wordsIn(c);
  if (!box) return;
  if (!ws.length) { box.hidden = true; box.innerHTML = ''; box.className = 'z-gloss'; return; }
  const seen = wordsSeen(), fresh = ws.filter(x => !seen.includes(x.k)), keys = ws.map(x => x.k).join(',');
  box.hidden = false;
  if (fresh.length) {
    box.className = 'z-gloss ask';
    box.innerHTML = '<p>「<b>' + esc(fresh[0].w) + '</b>」' + (ws.length > 1 ? 'など' : '') + 'って知ってる？</p>' +
      '<span class="zg-acts"><button type="button" class="zg-btn main" data-gl="show" data-k="' + keys + '">説明を見る</button><button type="button" class="zg-btn" data-gl="known" data-k="' + keys + '">知ってる</button></span>';
  } else {
    box.className = 'z-gloss';
    box.innerHTML = '<button type="button" class="zg-chip" data-gl="show" data-k="' + keys + '">？ ' + esc(ws.length === 1 ? ws[0].w + 'って？' : 'ことばの説明') + '</button>';
  }
}
function openWords(keys, from) {
  const ws = keys.map(k => WORDS_BY_K.get(k)).filter(Boolean);
  if (!ws.length) return;
  wordsMark(keys);
  $('glossBox').innerHTML = '<h2 id="glossTitle">ことばの説明</h2>' +
    ws.map(x => '<section class="gl-sec"><h3>' + esc(x.w) + '</h3><p>' + x.d + '</p></section>').join('') +
    '<div class="dialog-acts"><button type="button" class="pbtn small" data-gl="close">わかった</button></div>';
  $('glossOv').dataset.from = from || '';
  openOv('glossOv');
  SE.play('pop');
  const b = $('glossBox').querySelector('[data-gl="close"]'); if (b) b.focus({ preventScroll: true });
}
function closeWords() {
  if ($('glossOv').hidden) return;
  closeOv('glossOv');
  SE.play('tap');
  if (zoom && G && G.cur && G.cur.card) zoomWords(G.cur.card);
}
/* a tap inside the zoom on the ask / button: handled here, so the zoom (tap anywhere to close) stays open */
function wordsAct(el) {
  const a = el.dataset.gl, keys = String(el.dataset.k || '').split(',').filter(k => WORDS_BY_K.has(k));
  if (a === 'show') openWords(keys, 'zoom');
  else if (a === 'known') { wordsMark(keys); SE.play('tap'); if (G && G.cur && G.cur.card) zoomWords(G.cur.card); sizeZoom(); }
  else if (a === 'close') closeWords();
}
/* a small 「？ 〇〇って？」 button for any text (the 「違反したのは？」 sheet of a continuing rule…) */
function wordsBtn(text) {
  const ws = wordsIn({ text });
  return ws.length ? '<button type="button" class="dc-word" data-gl="show" data-k="' + ws.map(x => x.k).join(',') + '">？ ' + esc(ws.length === 1 ? ws[0].w + 'って？' : 'ことばの説明') + '</button>' : '';
}
/* the rule bar's info dialog: the words in a continuing rule are explained right there */
const wordsNote = text => wordsIn({ text }).map(x => '<p class="note-s gl-inline"><b>' + esc(x.w) + 'とは：</b>' + x.d + '</p>').join('');

/* 遊び方ガイド: every word on one page */
GUIDE.splice(Math.max(0, GUIDE.findIndex(x => x.k === 'more')), 0, { k: 'words', tab: 'ことば', html: () =>
  '<p class="gd-lead">カードに出てくる、<b>知らないと分からない言葉</b>の説明です。カードに初めて出てきたときは、アプリが「知ってる？」と聞いてくれます。</p>' +
  WORDS.map(x => gCard(esc(x.w), '<p>' + x.d + '</p>')).join('')
});
