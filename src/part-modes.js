
/* =====================================================================
   酒GO!!プレミアム: 王様ゲームモード・恋バナ/暴露モード・新作ミニゲーム
   - カード104枚・カード編集・ミニゲーム14種は、ずっと無料のまま
   - PLUS_SALE が false のあいだは「先行体験」: プレミアムの中身も全部無料で、制限なし
   - true にすると、無料の人は「お試し」（王様・恋バナは1日 PLUS_TRY ラウンドずつ、新作ミニゲームは1日1回ずつ）。
     お支払い（Google Play の課金 / Stripe）をつないだら、購入の結果を PLUS_KEY に { plan, until } で入れる。
     true にするときは、build-app.js の説明文・shareApp の文の「無料」を「基本無料」に直し、特定商取引法の表示ページを用意する
   ===================================================================== */
const PLUS_SALE = false;
/* アプリ版（ホーム画面・shugodensetsu.github.io）では、まだ遊べない（ボタンはグレーで Coming soon）。claude.ai 版だけで先行体験。
   アプリ版でも出すときは true にする */
const PLUS_OPEN = !IS_APP;
const PLUS_KEY = 'sakego-plus', TRY_KEY = 'sakego-try', PLUS_TRY = 5;
const PLUS_PLANS = [
  { k: 'year', name: '年額プラン', price: '2,980円', per: '/年', note: '月あたり約248円', best: true },
  { k: 'month', name: '月額プラン', price: '480円', per: '/月', note: 'いつでも解約できる' },
  { k: 'pass', name: '24時間パス', price: '240円', per: '', note: '今夜だけ。自動で更新されない' },
];
const PM_MODES = ['king', 'koi'];
/* the party modes after 王様・恋バナ (part-party.js): each one is PMX[mode] = { stage, dock, act, norm, turn, … } */
const PMX = {};
const PLUS_MG = ['cut', 'n21', 'memo'];
function plusState() {
  try { const s = JSON.parse(localStorage.getItem(PLUS_KEY) || 'null'); return s && typeof s === 'object' && Number.isFinite(s.until) ? s : null; } catch (_) { return null; }
}
const plusOn = () => { const s = plusState(); return !!s && s.until > Date.now(); };
const plusFree = () => !PLUS_SALE || plusOn();   /* premium content plays without limits */
function tryLoad() {
  const day = dayKey(Date.now());
  let s = null;
  try { s = JSON.parse(localStorage.getItem(TRY_KEY) || 'null'); } catch (_) { s = null; }
  if (!s || typeof s !== 'object' || s.day !== day) s = { day };
  const o = { day, mg: Array.isArray(s.mg) ? s.mg.filter(k => PLUS_MG.includes(k)) : [] };
  PM_MODES.forEach(m => { o[m] = clampInt(s[m], 0, 999); });
  return o;
}
const trySave = s => lsSet(TRY_KEY, JSON.stringify(s));
const tryLeft = mode => (plusFree() ? Infinity : Math.max(0, PLUS_TRY - tryLoad()[mode]));
function tryUse(mode) { if (plusFree()) return; const s = tryLoad(); s[mode]++; trySave(s); }
/* a new mini game, for someone without premium once sales start: once a day each */
const mgLocked = k => PLUS_MG.includes(k) && !plusFree() && tryLoad().mg.includes(k);
function mgTry(k) { if (!PLUS_MG.includes(k) || plusFree()) return; const s = tryLoad(); if (!s.mg.includes(k)) { s.mg.push(k); trySave(s); } }
function isPM() { return !!(G && PM_MODES.includes(G.mode)); }
const mgSoon = k => PLUS_MG.includes(k) && !PLUS_OPEN;

const CROWN_SVG = '<svg class="ic-crown" viewBox="0 0 32 26" aria-hidden="true"><path d="M3 21 L1.5 6.5 L9.5 12.5 L16 2.5 L22.5 12.5 L30.5 6.5 L29 21 Z" fill="#ffd83d" stroke="#150733" stroke-width="2.4" stroke-linejoin="round"/><rect x="3" y="20" width="26" height="4.5" rx="1.5" fill="#e0a400" stroke="#150733" stroke-width="2.2"/><circle cx="16" cy="14" r="2.6" fill="#ff4fa3" stroke="#150733" stroke-width="1.6"/><circle cx="8.5" cy="16" r="1.7" fill="#35e0ff" stroke="#150733" stroke-width="1.3"/><circle cx="23.5" cy="16" r="1.7" fill="#35e0ff" stroke="#150733" stroke-width="1.3"/></svg>';
const HEART_SVG = '<svg class="ic-heart" viewBox="0 0 32 28" aria-hidden="true"><path d="M16 26 C 6 19, 1.5 13.5, 1.5 8.5 C 1.5 4.5, 4.6 1.6, 8.5 1.6 C 11.6 1.6, 14.2 3.4, 16 6.2 C 17.8 3.4, 20.4 1.6, 23.5 1.6 C 27.4 1.6, 30.5 4.5, 30.5 8.5 C 30.5 13.5, 26 19, 16 26 Z" fill="#ff4fa3" stroke="#150733" stroke-width="2.4" stroke-linejoin="round"/><path d="M7 7.5 Q8.5 5 11 5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".8"/></svg>';
const MEDAL_SVG = '<svg class="ic-medal" viewBox="0 0 24 30" aria-hidden="true"><path d="M6 1h5l2 9H8z" fill="#35e0ff" stroke="#150733" stroke-width="1.8" stroke-linejoin="round"/><path d="M18 1h-5l-2 9h5z" fill="#ff4fa3" stroke="#150733" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="19.5" r="8.5" fill="#ffd83d" stroke="#150733" stroke-width="2"/><path d="M12 14.5l1.5 3.1 3.4.4-2.5 2.3.7 3.4-3.1-1.7-3.1 1.7.7-3.4-2.5-2.3 3.4-.4z" fill="#fff3b8" stroke="#b07a00" stroke-width="1"/></svg>';
const DICE_SVG = '<svg class="ic-dice" viewBox="0 0 30 30" aria-hidden="true"><rect x="2.5" y="2.5" width="25" height="25" rx="6" fill="#fff" stroke="#150733" stroke-width="2.4"/><circle cx="9.5" cy="9.5" r="2.4" fill="#150733"/><circle cx="15" cy="15" r="2.4" fill="#e8233f"/><circle cx="20.5" cy="20.5" r="2.4" fill="#150733"/></svg>';
/* the 王様ゲーム lots: chopsticks in a paper cup, one with a red tip */
const KUJI_SVG = '<svg class="kg-kuji" viewBox="0 0 200 210" aria-hidden="true">' +
  '<ellipse cx="100" cy="198" rx="62" ry="8" fill="rgba(0,0,0,.25)"/>' +
  '<g class="kg-sticks">' + [[-26, 0], [-15, 1], [-5, 2], [6, 3], [16, 4], [27, 5]].map(([a, i]) =>
    '<g transform="rotate(' + a + ' 100 170)"><g class="kg-st' + (i === 3 ? ' red' : '') + '" style="--i:' + i + '"><rect x="95" y="' + (24 + (i % 3) * 7) + '" width="10" height="150" rx="3" fill="#f3d9a4" stroke="#150733" stroke-width="2.2"/>' +
    (i === 3 ? '<rect x="95" y="' + (24 + (i % 3) * 7) + '" width="10" height="24" rx="3" fill="#e8233f" stroke="#150733" stroke-width="2.2"/>' : '') + '</g></g>').join('') + '</g>' +
  '<path d="M52 92 L148 92 L136 196 Q135 202 128 202 L72 202 Q65 202 64 196 Z" fill="#fffaf0" stroke="#150733" stroke-width="3" stroke-linejoin="round"/>' +
  '<path d="M56 118 L144 118 M60 150 L140 150" stroke="#ff4fa3" stroke-width="7"/><path d="M58 134 L142 134" stroke="#35e0ff" stroke-width="5"/>' +
  '<ellipse cx="100" cy="92" rx="48" ry="9" fill="#2a1266" stroke="#150733" stroke-width="3"/>' +
  '<text x="100" y="185" class="kg-kuji-t">くじ</text></svg>';

/* ---------- 王様ゲームの命令. {A}{B}{C} = 番号（ランダム）、{K} = 王様. lv 1 = ふつう、lv 2 = 盛り上げ（「盛り上げ」で両方出る）.
   d: 命令そのものが飲むもの（その杯数。対象の人が最初から選ばれている）。p: 飲む人を後から選ぶ（勝負の負けなど）。
   d がない命令は「できなかった・パスした人が1杯」。体にふれる命令・性的な命令は入れない ---------- */
const KG_CMDS = [
  { id: 1, lv: 1, t: '{A}番が{B}番のいいところを3つ言う' },
  { id: 2, lv: 1, t: '{A}番と{B}番で乾杯して、1杯', d: 1 },
  { id: 3, lv: 1, t: '{A}番が{B}番にあだ名をつける。今夜はその名前で呼ぶこと' },
  { id: 4, lv: 1, t: '{A}番が、好きな芸能人のモノマネをする' },
  { id: 5, lv: 1, t: '{A}番と{B}番でジャンケン。負けた方が1杯', d: 1, p: 1 },
  { id: 6, lv: 1, t: '{A}番が王様を10秒間ほめちぎる' },
  { id: 7, lv: 1, t: '{A}番と{B}番が10秒見つめ合う。先に笑った方が1杯', d: 1, p: 1 },
  { id: 8, lv: 1, t: '{A}番が、最近あった面白い話をする。スベったら1杯' },
  { id: 9, lv: 1, t: '{A}番が{B}番の第一印象を正直に言う' },
  { id: 10, lv: 1, t: '{A}番が全力で一発ギャグ' },
  { id: 11, lv: 1, t: '{A}番が、子どものころの夢を語る' },
  { id: 12, lv: 1, t: '{A}番と{B}番でハイタッチして、2人で1杯', d: 1 },
  { id: 13, lv: 1, t: '{A}番が「生麦生米生卵」を3回。かんだら1杯' },
  { id: 14, lv: 1, t: '{A}番は次のラウンドまで、語尾に「にゃん」をつけて話す' },
  { id: 15, lv: 1, t: '{A}番が、今の気持ちを俳句（5・7・5）で詠む' },
  { id: 16, lv: 1, t: '{A}番が{B}番に、感謝していることを1つ伝える' },
  { id: 17, lv: 1, t: '{A}番と{B}番で指相撲。負けた方が1杯', d: 1, p: 1 },
  { id: 18, lv: 1, t: '{A}番が、自分の自慢話を30秒する' },
  { id: 19, lv: 1, t: '{A}番が{B}番のモノマネをする' },
  { id: 20, lv: 1, t: '{A}番が、好きな食べ物ベスト3を発表' },
  { id: 21, lv: 1, t: '{A}番が、今日いちばん楽しかったことを言う' },
  { id: 22, lv: 1, t: '{A}番と{B}番が「せーの」で好きな季節を言う。そろわなかったら2人とも1杯', d: 1, p: 1 },
  { id: 23, lv: 1, t: '{A}番が王様のいいところを5つ言う' },
  { id: 24, lv: 1, t: '{A}番が、エア楽器で10秒演奏する' },
  { id: 25, lv: 1, t: '{A}番が{B}番の名前で、あいうえお作文' },
  { id: 26, lv: 1, t: '{A}番が、最近ハマっているものをプレゼンする' },
  { id: 27, lv: 1, t: '{A}番と{B}番が、次のラウンドまで席を入れかわる' },
  { id: 28, lv: 1, t: '{A}番は次のラウンドまで、語尾を「〜でござる」にする' },
  { id: 29, lv: 1, t: '{A}番が王様に飲み物をついで、王様と乾杯。2人で1杯', d: 1 },
  { id: 30, lv: 1, t: '{A}番が、10秒以内に動物の名前を5つ言う' },
  { id: 31, lv: 1, t: '{A}番・{B}番・{C}番で「せーの」で好きな色を言う。かぶった人が1杯', d: 1, p: 1 },
  { id: 32, lv: 1, t: '{A}番が{B}番に、ニックネームの由来を聞いてリアクションする' },
  { id: 33, lv: 1, t: '{A}番と{B}番で、しりとり対決。先につまった方が1杯', d: 1, p: 1 },
  { id: 34, lv: 1, t: '{A}番が、10秒間 変顔をキープ。笑った人がいたらその人が1杯', d: 1, p: 1, any: 1 },
  { id: 35, lv: 1, t: '{A}番が、最近あった「ちょっと幸せだったこと」を話す' },
  { id: 36, lv: 1, t: '{A}番が王様の肩書きを考えて、全員の前で発表する（例：宴会大臣）' },
  { id: 37, lv: 1, t: '{A}番が、好きな歌のサビを10秒歌う' },
  { id: 38, lv: 1, t: '{A}番と{B}番が「あっち向いてホイ」。負けた方が1杯', d: 1, p: 1 },
  { id: 39, lv: 1, t: '{A}番が、この中のだれかに「いつもありがとう」を言う' },
  { id: 40, lv: 1, t: '{A}番が、アナウンサー風に今の飲み会を実況する（15秒）' },
  { id: 101, lv: 2, t: '{A}番が{B}番に、告白っぽいセリフを10秒で言う' },
  { id: 102, lv: 2, t: '{A}番が、スマホの写真フォルダの最新1枚を見せる（見せられなければ1杯）' },
  { id: 103, lv: 2, t: '{A}番が{B}番の好きなところを、目を見て3つ言う' },
  { id: 104, lv: 2, t: '{A}番が、初恋の話をする' },
  { id: 105, lv: 2, t: '{A}番が、今までいちばん恥ずかしかった話をする' },
  { id: 106, lv: 2, t: '{A}番が、LINEのトーク一覧のいちばん上の人を発表（言えなければ1杯）' },
  { id: 107, lv: 2, t: '{A}番が、この中でいちばんタイプの人を指さす（言えなければ1杯）' },
  { id: 108, lv: 2, t: '{A}番が{B}番を、30秒全力でほめ倒す' },
  { id: 109, lv: 2, t: '{A}番が、カラオケの十八番をサビだけ歌う' },
  { id: 110, lv: 2, t: '{A}番が、最近ついたウソを白状する' },
  { id: 111, lv: 2, t: '{A}番が、イケメン（美女）風に自己紹介をやり直す' },
  { id: 112, lv: 2, t: '{A}番が、恋人にしたいタイプを3つ言う' },
  { id: 113, lv: 2, t: '{A}番と{B}番が、おたがいの第一印象と今の印象を言い合う' },
  { id: 114, lv: 2, t: '{A}番が、親にも言えない秘密を1つ（言えなければ1杯）' },
  { id: 115, lv: 2, t: '{A}番がアイドル風の決めポーズ。{B}番がカメラマン役で盛り上げる' },
  { id: 116, lv: 2, t: '{A}番は次のラウンドまで、王様の執事（メイド）になる' },
  { id: 117, lv: 2, t: '{A}番が、元恋人のいいところを1つ言う（言えなければ1杯）' },
  { id: 118, lv: 2, t: '{A}番が、学生時代の黒歴史を1つ話す' },
  { id: 119, lv: 2, t: '{A}番が、スマホの検索履歴の最新1件を読み上げる（できなければ1杯）' },
  { id: 120, lv: 2, t: '{A}番が{B}番に、プロポーズのセリフを考えて言う' },
  { id: 121, lv: 2, t: '{A}番が、自分のチャームポイントを3つ言う' },
  { id: 122, lv: 2, t: '{A}番が{B}番の恋愛相談に乗る（{B}番は何か1つ相談する）' },
  { id: 123, lv: 2, t: '{A}番が、最近いちばんドキッとしたことを話す' },
  { id: 124, lv: 2, t: '{A}番が、今いちばん会いたい人を発表' },
  { id: 125, lv: 2, t: '{A}番が{B}番のために、10秒でラブソングを作って歌う' },
  { id: 126, lv: 2, t: '{A}番が、最近キュンとした瞬間を話す' },
  { id: 127, lv: 2, t: '{A}番・{B}番・{C}番が、王様への「愛のメッセージ」を1人ずつ言う' },
  { id: 128, lv: 2, t: '{A}番が、2杯分の勇気で、王様に本音を1つ言う（言えなければ2杯）', d: 2, p: 1 },
];
/* ---------- 恋バナ・暴露の質問. g: koi（恋バナ）/ bare（暴露）. t: ask（番の人が答える）/ point（全員で指さし）/ all（全員で答える） ---------- */
const KO_QS = [
  { id: 1, g: 'koi', t: 'ask', q: '初恋はいつ？ どんな人だった？' },
  { id: 2, g: 'koi', t: 'ask', q: '好きなタイプを3つ挙げると？' },
  { id: 3, g: 'koi', t: 'ask', q: '告白したこと・されたことはある？ どんなセリフだった？' },
  { id: 4, g: 'koi', t: 'ask', q: '今までいちばんキュンとした瞬間は？' },
  { id: 5, g: 'koi', t: 'ask', q: '理想のデートプランを教えて' },
  { id: 6, g: 'koi', t: 'ask', q: '恋人にされたら、うれしいことは？' },
  { id: 7, g: 'koi', t: 'ask', q: '恋人にされたら、イヤなことは？' },
  { id: 8, g: 'koi', t: 'ask', q: 'どこからが浮気だと思う？' },
  { id: 9, g: 'koi', t: 'ask', q: '一目ぼれしたことはある？ そのあとどうなった？' },
  { id: 10, g: 'koi', t: 'ask', q: '付き合う前に、ここだけは確認したいってところは？' },
  { id: 11, g: 'koi', t: 'ask', q: '片思いで、いちばん長かったのはどれくらい？' },
  { id: 12, g: 'koi', t: 'ask', q: '好きな人ができたら、自分から行く？ 待つ？' },
  { id: 13, g: 'koi', t: 'ask', q: '恋愛でいちばんの失敗談は？' },
  { id: 14, g: 'koi', t: 'ask', q: '元恋人と友達に戻れる派？ 戻れない派？' },
  { id: 15, g: 'koi', t: 'ask', q: '好きな人の前でだけ、やっちゃうことは？' },
  { id: 16, g: 'koi', t: 'ask', q: 'プロポーズするなら（されるなら）どんなシチュエーション？' },
  { id: 17, g: 'koi', t: 'ask', q: '恋人に求める条件、1つだけ選ぶなら？' },
  { id: 18, g: 'koi', t: 'ask', q: '学生時代の、いちばんの恋の思い出は？' },
  { id: 19, g: 'koi', t: 'ask', q: '結婚するなら何歳くらいがいい？ 理由も' },
  { id: 20, g: 'koi', t: 'ask', q: '最近キュンとしたのはいつ？' },
  { id: 21, g: 'koi', t: 'ask', q: '好きな人にされたら一発でオチる、っていうしぐさは？' },
  { id: 22, g: 'koi', t: 'ask', q: '恋人とケンカしたら、先に謝る派？' },
  { id: 23, g: 'koi', t: 'ask', q: '今までもらった、いちばんうれしいプレゼントは？' },
  { id: 24, g: 'koi', t: 'ask', q: '芸能人と付き合えるなら、だれ？' },
  { id: 40, g: 'koi', t: 'point', q: 'この中で、いちばんモテそうな人は？' },
  { id: 41, g: 'koi', t: 'point', q: 'この中で、いちばん最初に結婚しそうな人は？' },
  { id: 42, g: 'koi', t: 'point', q: 'この中で、いちばん恋人に尽くしそうな人は？' },
  { id: 43, g: 'koi', t: 'point', q: 'この中で、いちばんデートが上手そうな人は？' },
  { id: 44, g: 'koi', t: 'point', q: 'この中で、いちばんヤキモチをやきそうな人は？' },
  { id: 45, g: 'koi', t: 'point', q: 'この中で、いちばん恋に不器用そうな人は？' },
  { id: 46, g: 'koi', t: 'point', q: 'この中で、いちばん告白されたことが多そうな人は？' },
  { id: 47, g: 'koi', t: 'point', q: 'この中で、いちばん一途そうな人は？' },
  { id: 60, g: 'koi', t: 'all', q: '理想のタイプを、芸能人で1人ずつ' },
  { id: 61, g: 'koi', t: 'all', q: '初恋の年齢を、1人ずつ' },
  { id: 62, g: 'koi', t: 'all', q: '「恋人にするなら絶対これ」を、1人1つずつ' },
  { id: 63, g: 'koi', t: 'all', q: '今までのデートで、いちばん楽しかった場所を1人ずつ' },
  { id: 101, g: 'bare', t: 'ask', q: '最近ついたウソは？' },
  { id: 102, g: 'bare', t: 'ask', q: '人に言えない趣味はある？' },
  { id: 103, g: 'bare', t: 'ask', q: 'スマホの検索履歴の、最新1件は？' },
  { id: 104, g: 'bare', t: 'ask', q: '今までいちばん恥ずかしかった失敗は？' },
  { id: 105, g: 'bare', t: 'ask', q: 'ここだけの話、最近ムカッとしたことは？' },
  { id: 106, g: 'bare', t: 'ask', q: '学生時代の黒歴史を1つ' },
  { id: 107, g: 'bare', t: 'ask', q: '親に言えない秘密を1つ' },
  { id: 108, g: 'bare', t: 'ask', q: 'いちばん最近泣いたのはいつ？ なんで？' },
  { id: 109, g: 'bare', t: 'ask', q: '自分の性格で、直したいところは？' },
  { id: 110, g: 'bare', t: 'ask', q: '実はちょっと自慢したいことは？' },
  { id: 111, g: 'bare', t: 'ask', q: 'お金をいちばん使っているものは？' },
  { id: 112, g: 'bare', t: 'ask', q: '今までいちばん高い買い物は？' },
  { id: 113, g: 'bare', t: 'ask', q: '正直、今日来るのめんどくさかった？' },
  { id: 114, g: 'bare', t: 'ask', q: '自分の顔で、いちばん好きなパーツは？' },
  { id: 115, g: 'bare', t: 'ask', q: 'このメンバーに、今まで言えなかった本音を1つ' },
  { id: 116, g: 'bare', t: 'ask', q: 'ついやってしまうクセは？' },
  { id: 117, g: 'bare', t: 'ask', q: '人生でいちばん怒られたことは？' },
  { id: 118, g: 'bare', t: 'ask', q: '学生時代のあだ名は？ 由来も' },
  { id: 119, g: 'bare', t: 'ask', q: '今までに見た、いちばん変な夢は？' },
  { id: 120, g: 'bare', t: 'ask', q: '寝坊の言いわけで、いちばんひどかったのは？' },
  { id: 121, g: 'bare', t: 'ask', q: '実は苦手な食べ物は？' },
  { id: 122, g: 'bare', t: 'ask', q: '最近、ひとりでこっそりやったことは？' },
  { id: 123, g: 'bare', t: 'ask', q: '人生でいちばん「やらかした」と思った日は？' },
  { id: 124, g: 'bare', t: 'ask', q: 'もし今日1日だれかと入れかわれるなら、だれ？ なにする？' },
  { id: 140, g: 'bare', t: 'point', q: 'この中で、いちばんウソがうまそうな人は？' },
  { id: 141, g: 'bare', t: 'point', q: 'この中で、いちばん秘密が多そうな人は？' },
  { id: 142, g: 'bare', t: 'point', q: 'この中で、いちばん酒グセが悪そうな人は？' },
  { id: 143, g: 'bare', t: 'point', q: 'この中で、いちばんお金持ちになりそうな人は？' },
  { id: 144, g: 'bare', t: 'point', q: 'この中で、いちばん寝坊しそうな人は？' },
  { id: 145, g: 'bare', t: 'point', q: 'この中で、怒らせたらいちばんこわい人は？' },
  { id: 146, g: 'bare', t: 'point', q: 'この中で、いちばん天然な人は？' },
  { id: 147, g: 'bare', t: 'point', q: 'この中で、無人島でいちばん生き残りそうな人は？' },
  { id: 160, g: 'bare', t: 'all', q: 'スマホのスクリーンタイム（1日平均）を見せ合う。いちばん長い人も1杯' },
  { id: 161, g: 'bare', t: 'all', q: '今日いちばんのハイライトを、ひと言ずつ' },
  { id: 162, g: 'bare', t: 'all', q: '最近いちばん笑ったことを、1人ずつ' },
  { id: 163, g: 'bare', t: 'all', q: '「実は〇〇できない」を、1人1つずつ' },
];
const KG_BY_ID = new Map(KG_CMDS.map(c => [c.id, c])), KO_BY_ID = new Map(KO_QS.map(q => [q.id, q]));
const kgNeed = c => (c.t.match(/\{[ABC]\}/g) || []).filter((v, i, a) => a.indexOf(v) === i).length;
const KO_GENRE = { koi: '恋バナ', bare: '暴露' };
const KO_TYPE = { ask: '', point: '全員で指さし！', all: '全員で答える' };
const PM = {
  king: { title: '王様ゲーム', word: '回', opt: 'king', optHead: '命令のレベル', min: 3,
    opts: [['mild', 'ふつう', 'みんなで楽しく'], ['hot', '盛り上げ', '恥ずかしいのも']] },
  koi: { title: '恋バナ・暴露', word: '問', opt: 'koi', optHead: '質問のジャンル', min: 2,
    opts: [['mix', 'ミックス', '両方から'], ['koi', '恋バナ', '恋の話だけ'], ['bare', '暴露', '秘密・本音']] },
};
const pmOpt = mode => { const o = PM[mode].opts.map(x => x[0]); return o.includes(setup[mode]) ? setup[mode] : o[0]; };
const kgPool = lvl => KG_CMDS.filter(c => c.lv === 1 || lvl === 'hot');
const koPool = g => KO_QS.filter(q => g === 'mix' || q.g === g);

/* ---------- setup screen (called from renderSetup) ---------- */
function pmSetupOpts(mode) {
  const cur = pmOpt(mode);
  return PM[mode].opts.map(([k, b, s]) => '<button type="button" id="opt-' + k + '" data-opt="' + k + '" aria-pressed="' + (cur === k) + '"><b>' + b + '</b><small>' + s + '</small></button>').join('');
}
function pmSetupInfo(mode) {
  const n = setup.count, P = PM[mode], few = n < P.min;
  const pool = mode === 'king' ? kgPool(pmOpt('king')).filter(c => kgNeed(c) <= n - 1).length : mode === 'koi' ? koPool(pmOpt('koi')).length : PMX[mode].pool(pmOpt(mode));
  const left = tryLeft(mode);
  const info = $('setupInfo');
  info.classList.remove('bad', 'marquee'); info.classList.add('one');
  info.classList.toggle('bad', few);
  info.innerHTML = '<span class="si-run">' + (few ? P.title + 'は' + P.min + '人から遊べます'
    : (mode === 'king' ? '命令 <b>' + pool + '</b> 種類' : mode === 'koi' ? '質問 <b>' + pool + '</b> 問' : PMX[mode].poolWord + ' <b>' + pool + '</b> ' + PMX[mode].poolUnit) + ' ・ ' +
      (!setup.rounds ? '「終了」を押すまで続く' : P.flat ? '<b>' + setup.rounds + '</b> ' + P.word + 'あそぶ' : setup.rounds + '周で <b>' + setup.rounds * n + '</b> ' + P.word) +
      (setup.unit !== 'cup' ? ' ・ 1杯＝' + UNITS[setup.unit].long : '') +
      (left !== Infinity ? ' ・ 今日のお試し あと <b>' + left + '</b>' + P.word : '')) + '</span>';
  $('startGame').disabled = few;
  fitInfo();
}

/* ---------- a game ---------- */
function beginPM(mode) {
  const n = setup.count, P = PM[mode];
  if (!PLUS_OPEN) { showScreen('title'); return; }
  if (n < P.min) { renderSetup(false); return; }
  if (tryLeft(mode) <= 0) { openPlus('limit'); return; }
  const names = Array.from({ length: n }, (_, i) => String(setup.names[i] || '').trim() || 'プレイヤー' + (i + 1));
  saveNames();
  G = {
    v: 2, mode, gid: Date.now(), rounds: setup.rounds, unit: UNITS[setup.unit] ? setup.unit : 'cup', lvl: pmOpt(mode), turn: 0, pile: [], cur: null, pending: freshPending(), last: null, done: false, uid: 1, hist: [],
    stats: { cards: 0, devil: 0, angel: 0, hh: 0 },
    players: names.map(name => Object.assign({ name, total: 0, times: 0, dbl: 0, hh: 0, cospa: 0, hand: [], king: 0, hit: 0, ans: 0, pass: 0, medal: 0 }, PMX[mode] ? PMX[mode].stats() : {})),
    pm: { log: [], used: [] },
  };
  startTurn(); G.cur.sel = [];
  if (PMX[mode] && PMX[mode].turn) PMX[mode].turn();
  saveGame();
  useTrack('game_start', { players: n, rounds: setup.rounds || 0, mode });
  coachEnd(false);
  bgmDelay = 2.6;
  showScreen('game');
  SE.play('mgStart');
  telop(mode === 'king' ? CROWN_SVG + '王様ゲーム！<small>王様の命令は絶対！</small>' : mode === 'koi' ? HEART_SVG + '恋バナ・暴露！<small>答えるか、飲むか</small>' : PMX[mode].intro, '', 1800);
  FXC.rain(90);
  requestWake();
}
function normalizePM(g) {
  const X = PMX[g.mode];
  g.players.forEach(p => ['king', 'hit', 'ans', 'pass', 'medal'].concat(X ? Object.keys(X.stats()) : []).forEach(k => { p[k] = Number(p[k]) || 0; }));
  const m = g.pm && typeof g.pm === 'object' ? g.pm : {};
  g.pm = Object.assign({}, m, { log: Array.isArray(m.log) ? m.log.filter(e => e && Array.isArray(e.items)) : [], used: Array.isArray(m.used) ? m.used.filter(Number.isInteger).slice(-60) : [] });
  g.lvl = PM[g.mode].opts.some(o => o[0] === g.lvl) ? g.lvl : PM[g.mode].opts[0][0];
  const c = g.cur, n = g.players.length, okP = p => Number.isInteger(p) && p >= 0 && p < n;
  c.sel = Array.isArray(c.sel) ? c.sel.filter(okP) : [];
  delete c.drawing;
  if (g.mode === 'king') {
    const okNums = Array.isArray(c.nums) && c.nums.length === n - 1 && c.nums.every(okP);
    if (c.phase !== 'before' && !(okP(c.k) && okNums && Array.isArray(c.opts))) c.phase = 'before';
    if ((c.phase === 'order' || c.phase === 'open') && !(c.cmd && (c.cmd.id === 0 || KG_BY_ID.has(c.cmd.id)))) c.phase = 'king';
    if (!['before', 'king', 'order', 'open'].includes(c.phase)) c.phase = 'before';
  } else if (g.mode === 'koi') { if (c.phase !== 'before' && !(c.phase === 'q' && KO_BY_ID.has(c.q))) c.phase = 'before'; }
  else if (X) X.norm(g);
}
const pmTotal = () => (!G.rounds ? 0 : PM[G.mode].flat ? G.rounds : G.rounds * G.players.length);
const pmLast = () => !!pmTotal() && G.turn + 1 >= pmTotal();
const pmRound = () => (pmLast() ? '<span class="fin">FINAL</span>' : 'ROUND') + ' <b>' + (G.turn + 1) + '</b>' + (pmTotal() ? '<small>/' + pmTotal() + '</small>' : '');
const pmLocked = () => G.cur.phase === 'before' && tryLeft(G.mode) <= 0;
const pmName = p => '<span class="pn" style="--p:' + pc(p) + '">' + esc(pname(p)) + '</span>';
function pmTryNote() {
  const left = tryLeft(G.mode);
  return left === Infinity ? '' : '<p class="pm-try">今日のお試し あと <b>' + left + '</b>' + PM[G.mode].word + ' ・ <button type="button" class="pm-link" data-g="plus">プレミアムなら遊び放題</button></p>';
}
function pmLockHTML() {
  return '<div class="pm-big pm-lock">' + CROWN_SVG + '<h3 class="ol">今日のお試しはここまで！</h3><p>プレミアムなら、王様ゲーム・恋バナ・新作ミニゲームが<b>遊び放題</b>。お試しは明日また使えます。</p>' +
    '<button type="button" class="pbtn" data-g="plus">プレミアムを見る</button></div>';
}

/* recent picks are avoided until most of the pool has come up */
function pmDraw(pool, k, w) {
  const used = G.pm.used, fresh = pool.filter(x => !used.includes(x.id));
  let list = fresh.length >= k ? fresh : pool;
  const out = [];
  for (let j = 0; j < k && list.length; j++) {
    const tot = list.reduce((a, x) => a + (w ? w(x) : 1), 0);
    let r = Math.random() * tot, at = 0;
    while (at < list.length - 1 && (r -= (w ? w(list[at]) : 1)) > 0) at++;
    out.push(list[at]);
    list = list.filter((_, i) => i !== at);
  }
  return out;
}
const pmUse = id => { G.pm.used.push(id); if (G.pm.used.length > 60) G.pm.used.splice(0, G.pm.used.length - 60); };

/* 王様ゲーム: くじ → 王様と番号が決まる → 王様が命令を選ぶ（3つから / 自分で）→ 番号オープン → 飲む人を選んで次へ */
function kgOpts() {
  const n = G.players.length, pool = kgPool(G.lvl).filter(c => kgNeed(c) <= n - 1);
  const skip = (G.cur.opts || []).map(o => o.id);
  const list = pool.filter(c => !skip.includes(c.id));
  return pmDraw(list.length >= 3 ? list : pool, 3, c => (c.lv === 2 ? 2 : 1)).map(c => {
    const nums = shuffle(Array.from({ length: n - 1 }, (_, i) => i + 1)).slice(0, kgNeed(c));
    return { id: c.id, a: nums };
  });
}
/* the command's text: {A}… become 「2番」 (and the name once the numbers are open) */
function kgText(o, open) {
  const c = KG_BY_ID.get(o.id), cur = G.cur;
  if (!c) return '';
  return esc(c.t).replace(/王様/g, '<b class="kg-k">王様</b>').replace(/\{([ABC])\}番?/g, (_, k) => {
    const num = o.a['ABC'.indexOf(k)], p = cur.nums[num - 1];
    return '<b class="kg-n" style="--p:' + pc(p) + '">' + num + '番' + (open ? '<small>' + esc(pname(p)) + '</small>' : '') + '</b>';
  });
}
/* who the command is about (players), and who may be chosen to drink */
function kgTargets() {
  const cur = G.cur, c = cur.cmd && KG_BY_ID.get(cur.cmd.id);
  if (!c) return [];
  const ps = cur.cmd.a.map(num => cur.nums[num - 1]);
  if (/王様/.test(c.t) && /王様と乾杯|2人で1杯/.test(c.t)) ps.push(cur.k);
  return ps;
}
const kgCandidates = () => { const c = G.cur.cmd && KG_BY_ID.get(G.cur.cmd.id); return c && !c.any ? kgTargets() : G.players.map((_, i) => i); };
const kgAmt = () => { const c = G.cur.cmd && KG_BY_ID.get(G.cur.cmd.id); return (c && c.d) || 1; };
function kgCards() {
  const cur = G.cur, open = cur.phase === 'open', n = G.players.length;
  const hit = cur.cmd && cur.cmd.id ? cur.cmd.a : [], cand = open ? kgCandidates() : [];
  const card = (p, label, k, j) => {
    const can = open && cand.includes(p), sel = can && cur.sel.includes(p);
    return '<button type="button" class="kg-num' + (k === 0 ? ' king' : '') + (hit.includes(k) ? ' hit' : '') + (open && !can ? ' dim' : '') + (sel ? ' sel' : '') + '" data-g="ksel" data-p="' + p + '" style="--p:' + pc(p) + ';--d:' + (j * 0.09).toFixed(2) + 's"' +
      (can ? ' aria-pressed="' + sel + '"' : ' disabled') + '>' +
      (open ? '<span class="kg-lab">' + label + '</span><span class="kg-nm">' + esc(pname(p)) + '</span>' + (sel ? '<i class="kg-drink">' + fmtAmt(kgAmt()) + '杯</i>' : '')
        : '<span class="kg-big">' + k + '<small>番</small></span>') + '</button>';
  };
  let h = '';
  for (let k = 1; k < n; k++) h += card(cur.nums[k - 1], k + '番', k, k - 1);
  if (open && cand.includes(cur.k)) h += card(cur.k, '王様', 0, n - 1);
  return h;
}
function kingStage(anim) {
  const cur = G.cur, head = '<p class="mg-head ol">' + pmRound() + '</p>';
  if (cur.phase === 'before') {
    if (pmLocked()) return head + pmLockHTML();
    return head + '<div class="pm-big kg-start' + (cur.drawing ? ' drawing' : '') + '">' + KUJI_SVG +
      '<p class="pm-lead ol">くじを引いて、王様を決めよう！</p><p class="pm-note">だれが何番かは、アプリだけが知っている。<br>王様は「〇番が〇番に〜」と番号で命令！</p>' + pmTryNote() + '</div>';
  }
  const kingLine = '<p class="kg-who' + (anim === 'king' ? ' enter' : '') + '">' + CROWN_SVG + pmName(cur.k) + ' が王様！</p>';
  if (cur.phase === 'king') {
    return head + '<div class="pm-body">' + kingLine + '<p class="pm-sub">王様、命令をえらんでね（番号の人はまだヒミツ）</p><div class="kg-opts' + (anim === 'king' || anim === 'opts' ? ' enter' : '') + '">' +
      cur.opts.map((o, i) => '<button type="button" class="kg-opt" data-g="kpick" data-i="' + i + '" style="--d:' + (i * 0.08).toFixed(2) + 's">' + kgText(o, false) + '</button>').join('') +
      '<button type="button" class="kg-opt own" data-g="kown" style="--d:.24s">自分で命令を考える</button></div></div>';
  }
  const open = cur.phase === 'open', c = cur.cmd;
  const cmd = c.id ? kgText(c, open) : open ? 'だれに命令した？' : '王様、番号で命令をどうぞ！<small class="kg-ex">例：「3番が1番の似顔絵をかく」</small>';
  const ask = !open ? '' : c.id ? (KG_BY_ID.get(c.id).d && !KG_BY_ID.get(c.id).p ? '命令どおり飲む人が選ばれています。ちがえばタップで直してね' : 'できなかった・パスした人をタップ → ' + fmtAmt(kgAmt()) + '杯')
    : '飲む人・パスした人をタップ → 1杯';
  return head + '<div class="pm-body' + (open ? ' open' : '') + '">' + kingLine + '<p class="kg-cmd' + (c.id ? '' : ' own') + (anim === 'order' ? ' enter' : '') + '"><span class="kg-cmd-h">王様の命令</span><span class="kg-cmd-t">' + cmd + '</span></p>' +
    '<div class="kg-nums' + (open ? ' open' : '') + (anim === 'open' ? ' reveal' : '') + (G.players.length > 5 ? ' many' : '') + '">' + kgCards() + '</div>' + (open ? '<p class="pm-ask">' + ask + '</p>' : '') + '</div>';
}
function kingDock() {
  const cur = G.cur;
  if (cur.phase === 'before') {
    if (pmLocked()) return '<div class="dock-row"><button type="button" class="pbtn big main" data-g="pmend">結果発表へ</button></div>';
    return '<div class="dock-row">' + (cur.drawing ? '<div class="dock-note">くじを引いています…</div>' : '<button type="button" class="pbtn big main pulse" data-g="kdraw">くじを引く！</button>') + '</div>';
  }
  if (cur.phase === 'king') return '<div class="dock-row"><button type="button" class="pbtn white grow" data-g="kre">別の命令を出す<span class="sub">3つとも入れかえ</span></button></div>';
  if (cur.phase === 'order') {
    return '<div class="dock-row"><button type="button" class="pbtn white small" data-g="kback">命令を<span class="sub">えらびなおす</span></button>' +
      '<button type="button" class="pbtn big main pulse pink" data-g="kopen">番号オープン！</button></div>';
  }
  return pmNextBtn();
}
function pmNextBtn() {
  const k = G.cur.sel.length;
  return '<div class="dock-row"><button type="button" class="pbtn big main" data-g="pmnext">' + (k ? k + '人に記録して' : '') + (pmLast() ? '結果発表へ！' : '次へ ▶') + '</button></div>';
}
function kgDraw() {
  const cur = G.cur;
  if (cur.phase !== 'before' || cur.drawing || pmLocked()) return;
  cur.drawing = true;
  renderPM();
  SE.play('cdShuffle'); vibrate(20);
  setTimeout(() => { if (G && G.cur === cur) SE.play('cdShuffle'); }, 520);
  setTimeout(() => {
    if (!G || G.cur !== cur || screen !== 'game') return;
    delete cur.drawing;
    const n = G.players.length, prev = G.pm.log.length ? G.pm.log[G.pm.log.length - 1].k : null;
    let k = rint(0, n - 1);
    if (k === prev && Math.random() < 0.7) k = (k + rint(1, n - 1)) % n;   /* the same king twice in a row is rarer */
    cur.k = k;
    cur.nums = shuffle(G.players.map((_, i) => i).filter(i => i !== k));
    cur.opts = []; cur.opts = kgOpts(); cur.cmd = null; cur.sel = [];
    cur.phase = 'king';
    G.players[k].king++;
    tryUse('king');
    saveGame();
    renderPM('king');
    SE.play('rlLand'); vibrate([40, 30, 80]);
    const el = document.querySelector('.kg-who');
    if (el && !reduceMotion) { const q = relPos(el); FXC.burst(q.x, q.y, 70, { colors: GOLD, star: true, speed: 12 }); }
    telop(CROWN_SVG + esc(pname(k)) + '<small>が王様！</small>', '', 1500);
  }, reduceMotion ? 200 : 1250);
}
function kgOpen() {
  const cur = G.cur;
  if (cur.phase !== 'order' || cur.opening) return;
  cur.opening = true;
  SE.play('swDrum');
  $('dock').innerHTML = '<div class="dock-row"><div class="dock-note">番号オープン…！</div></div>';
  const nums = $('mgStage').querySelector('.kg-nums');
  if (nums) nums.classList.add('shake');
  setTimeout(() => {
    delete cur.opening;
    if (!G || G.cur !== cur || cur.phase !== 'order') return;
    const c = cur.cmd.id && KG_BY_ID.get(cur.cmd.id);
    cur.phase = 'open';
    cur.sel = c && c.d && !c.p ? kgTargets() : [];
    saveGame();
    renderPM('open');
    SE.play('swShow'); vibrate(40);
    if (c && !reduceMotion) setTimeout(() => { document.querySelectorAll('.kg-num.hit').forEach(el => { const q = relPos(el); FXC.burst(q.x, q.y, 24, { colors: GOLD, speed: 7 }); }); }, 450);
  }, reduceMotion ? 150 : 1300);
}

/* 恋バナ・暴露: 番の人が質問カードを引く → 答える or パス（1杯）。指さし・全員の質問は、飲む人をタップ */
function koDraw(again) {
  const cur = G.cur;
  if (again ? cur.phase !== 'q' : cur.phase !== 'before' || cur.drawing || pmLocked()) return;
  const pick = () => {
    const skip = again ? [cur.q] : [];
    const pool = koPool(G.lvl).filter(q => !skip.includes(q.id) && (q.t === 'ask' || G.players.length >= 3 || q.t === 'all'));
    const q = pmDraw(pool, 1)[0];
    cur.q = q.id; cur.sel = []; cur.phase = 'q';
    pmUse(q.id);
    useTrack('pm_item', { id: q.id });
  };
  if (again) { pick(); saveGame(); renderPM('card'); SE.play('flip'); return; }
  cur.drawing = true;
  renderPM();
  SE.play('deal');
  setTimeout(() => {
    if (!G || G.cur !== cur || screen !== 'game') return;
    delete cur.drawing;
    pick();
    tryUse('koi');
    saveGame();
    renderPM('card');
    SE.play('flip'); vibrate(30);
  }, reduceMotion ? 150 : 650);
}
function koiStage(anim) {
  const cur = G.cur, head = '<p class="mg-head ol">' + pmRound() + '</p>', p = cur.drawer;
  const who = '<p class="ko-who">' + pmName(p) + ' の番！</p>';
  if (cur.phase === 'before') {
    if (pmLocked()) return head + pmLockHTML();
    return head + '<div class="pm-big">' + who + '<div class="ko-card back' + (cur.drawing ? ' drawing' : '') + '"><span class="ko-back">' + HEART_SVG + '<b>Q</b></span></div>' +
      '<p class="pm-note">答えるか、飲むか。<br>答えたくない質問はパスでOK（1杯）</p>' + pmTryNote() + '</div>';
  }
  const q = KO_BY_ID.get(cur.q), many = q.t !== 'ask';
  const lead = many ? KO_TYPE[q.t] : pmName(p) + ' が答える';
  const rule = q.t === 'ask' ? '答えられなければ1杯' : q.t === 'point' ? 'せーので一斉に指さし。いちばん指された人が1杯' : '答えられなかった・パスした人が1杯';
  return head + '<div class="pm-body"><div class="ko-card face g-' + q.g + (anim === 'card' ? ' enter' : '') + '"><span class="ko-tag">' + KO_GENRE[q.g] + '</span>' +
    '<button type="button" class="ko-re" data-g="qre">別の質問</button><p class="ko-type">' + lead + '</p><p class="ko-q">' + esc(q.q) + '</p><p class="ko-rule">' + rule + '</p></div>' +
    (many ? '<p class="pm-ask">飲む人をタップ</p><div class="pm-chips' + (G.players.length > 4 ? ' two' : '') + '">' + G.players.map((pl, i) => {
      const sel = cur.sel.includes(i);
      return '<button type="button" class="pm-chip' + (sel ? ' sel' : '') + '" data-g="qsel" data-p="' + i + '" aria-pressed="' + sel + '" style="--p:' + pc(i) + '">' + esc(pl.name) + (sel ? '<i>1杯</i>' : '') + '</button>';
    }).join('') + '</div>' : '') + '</div>';
}
function koiDock() {
  const cur = G.cur;
  if (cur.phase === 'before') {
    if (pmLocked()) return '<div class="dock-row"><button type="button" class="pbtn big main" data-g="pmend">結果発表へ</button></div>';
    return '<div class="dock-row">' + (cur.drawing ? '<div class="dock-note">カードを引いています…</div>' : '<button type="button" class="pbtn big main pulse pink" data-g="qdraw">質問を引く！</button>') + '</div>';
  }
  const q = KO_BY_ID.get(cur.q);
  if (q.t === 'ask') {
    return '<div class="dock-row"><button type="button" class="pbtn white small" data-g="qpass">パス<span class="sub">1杯飲む</span></button>' +
      '<button type="button" class="pbtn big main" data-g="qok">答えた！ ' + (pmLast() ? '結果へ' : '次へ ▶') + '</button></div>';
  }
  return pmNextBtn();
}

/* ---------- rendering (the mini game mode's board + stage, with a stage of its own) ---------- */
function pmBoard() {
  const cur = G.cur, X = PMX[G.mode], mark = G.mode === 'king' ? (cur.phase !== 'before' ? cur.k : null) : X ? X.mark() : cur.drawer;
  const tag = G.mode === 'king' ? '王様' : X ? X.tag : '回答';
  return G.players.map((pl, i) => '<div class="mg-p' + (i === mark ? ' start' : '') + '" data-seat="' + i + '" style="--p:' + pc(i) + '" aria-label="' + esc(pl.name) + ' ' + fmtAmt(pl.total) + '杯">' +
    (i === mark ? '<span class="mg-tag">' + tag + '</span>' : '') + (pl.medal ? '<span class="mg-medal" aria-label="勲章' + pl.medal + '個">' + MEDAL_SVG + (pl.medal > 1 ? '<b>' + pl.medal + '</b>' : '') + '</span>' : '') +
    '<span class="mg-pn">' + esc(pl.name) + '</span><span class="mg-row"><span class="mg-pc"><b>' + fmtAmt(pl.total) + '</b><small>杯</small></span></span></div>').join('');
}
function pmLog() {
  const log = G.pm.log;
  const X = PMX[G.mode];
  if (!log.length) return '<span class="lg-hint">' + (G.mode === 'king' ? '王様の命令は絶対！ できなかった人・パスした人は <b>1杯</b>' : X ? X.hint : '答えるか、飲むか。パスは <b>1杯</b>') + '</span>';
  return log.map(e => '<span class="lg mg-lg"><i class="lg-r">' + (e.r + 1) + '</i>' + (G.mode === 'king' ? '王 ' : X && X.logPre ? X.logPre(e) : '') + (e.k != null && G.players[e.k] ? esc(pname(e.k)) : '') + (e.ok ? ' ○' : '') + '</span>' +
    e.items.map(it => '<span class="lg"><span class="dot" style="--p:' + pc(it.p) + '"></span>' + esc(pname(it.p)) + '<b>' + fmtAmt(it.amt) + '杯</b></span>').join('')).join('');
}
function renderPM(anim) {
  const n = G.players.length;
  $('gRound').innerHTML = (G.turn + 1) + '<small>' + (pmTotal() ? '/' + pmTotal() + PM[G.mode].word : PM[G.mode].word + '目') + '</small>' + unitBadge(G);
  $('gPending').hidden = true; $('gPending').parentNode.classList.remove('has-pend');
  $('gRules').hidden = true;
  $('tableWrap').hidden = true;
  $('mgWrap').hidden = false;
  const board = $('mgBoard'), cols = n <= 4 ? n : n <= 6 ? 3 : 4;
  board.style.setProperty('--cols', cols);
  board.classList.toggle('c4', cols === 4);
  board.innerHTML = pmBoard();
  const st = $('mgStage');
  st.className = 'mg-stage pm-stage pm-' + G.mode;
  const X = PMX[G.mode];
  st.innerHTML = G.mode === 'king' ? kingStage(anim) : G.mode === 'koi' ? koiStage(anim) : X.stage(anim);
  $('dock').innerHTML = G.mode === 'king' ? kingDock() : G.mode === 'koi' ? koiDock() : X.dock();
  const box = $('gLog');
  box.innerHTML = pmLog();
  box.scrollLeft = G.pm.log.length ? box.scrollWidth : 0;
  if (X && X.mounted) X.mounted(anim);
}
/* the round's drinks go on the board, then the next round */
function pmNext(items, ok) {
  const cur = G.cur;
  if (cur.drawing || cur.opening) return;
  items = items || cur.sel.map(p => ({ p, amt: G.mode === 'king' ? kgAmt() : 1 }));
  items.forEach(it => addDrink(it.p, it.amt));
  if (G.mode === 'king' && cur.cmd && cur.cmd.id) kgTargets().filter(p => p !== cur.k).forEach(p => { G.players[p].hit++; });
  const X = PMX[G.mode];
  G.pm.log.push({ r: G.turn, k: G.mode === 'king' ? cur.k : X ? X.who() : cur.drawer, ok: !!ok, items, t: X && X.logTag ? X.logTag() : undefined });
  if (G.pm.log.length > 200) G.pm.log.splice(0, G.pm.log.length - 200);
  useTick();
  G.turn++;
  const end = pmTotal() && G.turn >= pmTotal();
  if (!end) { startTurn(); G.cur.sel = []; if (X && X.turn) X.turn(); }
  saveGame();
  if (end) { if (items.length) SE.play('gulp'); finishGame(); return; }
  renderPM();
  items.forEach((it, k) => setTimeout(() => { if (G && screen === 'game') floatAt(it.p, '+' + fmtAmt(it.amt) + '杯'); }, k * 200));
  if (items.length) SE.play('gulp');
  const last = pmLast();
  if (!(X && X.quiet)) { telop(last ? 'FINAL ROUND！' : 'ROUND ' + (G.turn + 1), last ? 'red' : 'white', 1000); SE.play('mgRound'); }
  waterCheck();
}
function pmAct(g, el) {
  if (!isPM() || !G.cur) return g === 'plus' ? (openPlus('mode'), true) : false;
  const cur = G.cur;
  if (PMX[G.mode] && /^x-/.test(g)) { PMX[G.mode].act(g.slice(2), el); return true; }
  switch (g) {
    case 'plus': openPlus(pmLocked() ? 'limit' : 'mode'); return true;
    case 'pmend': finishGame(); return true;
    case 'kdraw': kgDraw(); return true;
    case 'kre': if (cur.phase === 'king') { cur.opts = kgOpts(); saveGame(); renderPM('opts'); SE.play('cdShuffle'); } return true;
    case 'kpick': case 'kown': {
      if (cur.phase !== 'king') return true;
      cur.cmd = g === 'kown' ? { id: 0, a: [] } : cur.opts[Number(el && el.dataset.i)] || null;
      if (!cur.cmd) return true;
      if (cur.cmd.id) { pmUse(cur.cmd.id); useTrack('pm_item', { id: cur.cmd.id }); }
      cur.phase = 'order'; cur.sel = [];
      saveGame(); renderPM('order'); SE.play('select');
      return true;
    }
    case 'kback': if (cur.phase === 'order' && !cur.opening) { cur.phase = 'king'; cur.cmd = null; saveGame(); renderPM(); SE.play('tap'); } return true;
    case 'kopen': kgOpen(); return true;
    case 'ksel': case 'qsel': {
      const p = Number(el && el.dataset.p);
      if (!(cur.phase === 'open' || cur.phase === 'q') || !Number.isInteger(p)) return true;
      if (g === 'ksel' && !kgCandidates().includes(p)) return true;
      const at = cur.sel.indexOf(p);
      if (at >= 0) cur.sel.splice(at, 1); else cur.sel.push(p);
      saveGame(); renderPM(); SE.play(at >= 0 ? 'tap' : 'select');
      return true;
    }
    case 'pmnext': if (cur.phase === 'open' || cur.phase === 'q') pmNext(null, false); return true;
    case 'qdraw': koDraw(false); return true;
    case 'qre': koDraw(true); return true;
    case 'qok': if (cur.phase === 'q') { G.players[cur.drawer].ans++; SE.play('ding'); pmNext([], true); } return true;
    case 'qpass': if (cur.phase === 'q') { G.players[cur.drawer].pass++; pmNext([{ p: cur.drawer, amt: 1 }], false); } return true;
  }
  return false;
}
function renderPMResult() {
  const n = G.players.length;
  const order = G.players.map((p, i) => Object.assign({ i }, p)).sort((a, b) => b.total - a.total || a.i - b.i);
  const maxT = order[0].total, minT = order[order.length - 1].total, spread = maxT > minT;
  const sum = G.players.reduce((s, p) => s + p.total, 0), king = G.mode === 'king', X = PMX[G.mode];
  $('resSub').textContent = PM[G.mode].title + ' ・ ' + G.turn + PM[G.mode].word + '遊びました' + (unitNote(G) ? ' ・ ' + unitNote(G) : '');
  const unitX = t => (unitOf(G) === 'cup' ? '' : '<small class="res-unit">' + UNITS[unitOf(G)].long + '×' + fmtAmt(t) + '</small>');
  $('resList').innerHTML = order.map((p, idx) => {
    const rank = 1 + order.filter(q => q.total > p.total).length;
    const title = spread && p.total === maxT ? '不運王' : spread && p.total === minT ? 'セーフ王' : '';
    const delay = reduceMotion ? 0 : 1.5 + (n - 1 - idx) * 0.35;
    return '<li class="res-item' + (spread && rank === 1 ? ' first' : '') + '" style="--p:' + pc(p.i) + ';--d:' + delay.toFixed(2) + 's">' +
      '<span class="res-rank">' + rank + '</span>' +
      '<span class="res-mid"><span class="res-name"><span class="res-nm">' + esc(p.name) + '</span>' + (title ? '<span class="res-title">' + title + '</span>' : '') + '</span>' +
      '<span class="res-sub2">' + (king ? '王様 ' + p.king + '回 ・ 命令された ' + p.hit + '回' : X ? X.resLine(p) : '答えた ' + p.ans + '回 ・ パス ' + p.pass + '回') + '</span></span>' +
      '<span class="res-total">' + fmtAmt(p.total) + '<small>杯</small>' + unitX(p.total) + '</span></li>';
  }).join('');
  const most = k => { const m = Math.max(...G.players.map(p => p[k])); return m ? G.players.filter(p => p[k] === m).map(p => p.name).slice(0, 2).join('・') : '—'; };
  if (X) { $('resStats').innerHTML = '<div class="stat"><b>' + fmtAmt(sum) + '</b><span>合計杯数</span></div><div class="stat"><b>' + G.turn + '</b><span>' + X.resCount + '</span></div>' + X.resStats(most); return; }
  $('resStats').innerHTML = '<div class="stat"><b>' + fmtAmt(sum) + '</b><span>合計杯数</span></div><div class="stat"><b>' + G.turn + '</b><span>' + (king ? '命令' : '質問') + '</span></div>' +
    '<div class="stat wide"><b>' + esc(most(king ? 'king' : 'ans')) + '</b><span>' + (king ? 'いちばん王様' : 'いちばん答えた') + '</span></div>' +
    '<div class="stat wide"><b>' + esc(most(king ? 'hit' : 'pass')) + '</b><span>' + (king ? 'いちばん命令された' : 'いちばんパス') + '</span></div>';
}

/* ---------- プレミアムの画面 ---------- */
function renderPlus(msg) {
  const st = plusState(), on = plusOn();
  const left = m => tryLeft(m);
  const feat = (ic, b, s) => '<li>' + ic + '<span><b>' + b + '</b><small>' + s + '</small></span></li>';
  $('plusBox').innerHTML = '<button type="button" class="gd-x pl-x" data-pl="close" aria-label="閉じる">×</button>' +
    '<div class="pl-crown" aria-hidden="true">' + CROWN_SVG + '</div><h2 class="pl-title ol" id="plusTitle">酒GO!!プレミアム</h2>' +
    (on ? '<p class="pl-lead"><b>プレミアム利用中</b>（' + new Date(st.until).toLocaleDateString('ja-JP') + ' まで）</p>'
      : !PLUS_OPEN ? '<p class="pl-lead"><b>Coming soon！</b> もうすぐ遊べるようになります</p>'
      : PLUS_SALE ? '<p class="pl-lead">新しいモードとミニゲームが<b>遊び放題</b></p>'
        : '<p class="pl-lead"><b>先行体験中！</b> いまは全部<b>無料</b>で遊べます</p>') +
    '<ul class="pl-feats">' + feat(CROWN_SVG, '王様ゲームモード', '王様と番号はアプリが決める。命令もおまかせ') + feat(HEART_SVG, '恋バナ・暴露モード', '答えるか、飲むか。指さし質問も') +
      (PMX.gaka ? feat(PALETTE_SVG, 'パーティーモード4つ', 'ニセ画伯・返信選手権・しれっとミッション・ウソかホントか') : '') +
      feat(DICE_SVG, '新作ミニゲーム', PLUS_MG.map(k => MG[k].title).join('・') + '。これからも追加') + '</ul>' +
    '<p class="pl-free">カード104枚・カード編集・ミニゲーム14種は、ずっと無料</p>' +
    (PLUS_SALE && !on ? '<p class="pl-try">今日のお試し：王様ゲーム あと<b>' + left('king') + '</b>回 ・ 恋バナ あと<b>' + left('koi') + '</b>問</p>' : '') +
    (on ? '' : '<p class="pl-ph">' + (PLUS_SALE ? '料金' : '料金（予定）') + '</p><div class="pl-plans">' + PLUS_PLANS.map(p =>
      '<button type="button" class="pl-plan' + (p.best ? ' best' : '') + '" data-pl="' + p.k + '">' + (p.best ? '<i class="pl-rib">おすすめ</i>' : '') +
      '<b class="pl-nm">' + p.name + '</b><span class="pl-pr">' + p.price + '<small>' + p.per + '</small></span><small class="pl-nt">' + p.note + '</small></button>').join('') + '</div>') +
    '<p class="pl-msg" aria-live="polite">' + (msg || '') + '</p>' +
    '<p class="pl-fine">' + (PLUS_SALE ? '' : 'お支払いの受付は準備中です。始まったら、ここから申し込めます。<br>') + '<a href="' + TERMS_URL + '" target="_blank" rel="noopener">利用規約</a></p>';
}
function openPlus(from) {
  renderPlus();
  if ($('plusOv').hidden) { openOv('plusOv'); SE.play('pop'); }
  const x = $('plusBox').querySelector('.pl-plan.best') || $('plusBox').querySelector('[data-pl="close"]');
  if (x) x.focus({ preventScroll: true });
  statTrack('plus', { d: 'open_' + (['title', 'limit', 'mode', 'mg'].includes(from) ? from : 'title') });
}
function plusAct(a) {
  if (a === 'close') { closeOv('plusOv'); SE.play('tap'); if (screen === 'title') renderTitle(); else if (screen === 'setup') renderSetup(false); return; }
  const plan = PLUS_PLANS.find(p => p.k === a);
  if (!plan) return;
  SE.play('coin');
  statTrack('plus', { d: 'plan_' + plan.k });
  /* お支払いをつなぐまでは、気持ちだけ受け取る（どのプランが選ばれたかを数える） */
  renderPlus('ありがとう！ <b>' + plan.name + '</b>のお支払いは準備中です。' + (!PLUS_OPEN ? 'もうしばらくお待ちください。' : PLUS_SALE ? '' : 'いまは先行体験で、全部無料で遊べます。'));
  const b = $('plusBox').querySelector('[data-pl="' + a + '"]');
  if (b) { b.classList.add('chosen'); b.focus({ preventScroll: true }); }
}
function titleModes() {
  const tag = !PLUS_OPEN ? 'Coming soon' : PLUS_SALE ? (plusOn() ? '' : 'プレミアム') : 'NEW';
  document.querySelectorAll('.t-mode[data-pm]').forEach(el => {
    el.classList.toggle('soon', !PLUS_OPEN); el.setAttribute('aria-disabled', String(!PLUS_OPEN));
    const t = el.querySelector('.t-new'); if (t) { t.textContent = tag; t.hidden = !tag; }
  });
  const b = $('plusBtn');
  if (b) b.innerHTML = CROWN_SVG + (!PLUS_OPEN ? '<b>酒GO!!プレミアム</b><small>Coming soon ▶</small>' : plusOn() ? '<b>プレミアム利用中</b>' : PLUS_SALE ? '<b>酒GO!!プレミアム</b><small>新モードが遊び放題</small>' : '<b>プレミアム先行体験中</b><small>新モードが今だけ無料 ▶</small>');
}

/* =====================================================================
   新作ミニゲーム（プレミアム）: 爆弾解除・21ゲーム・メモリーリレー
   ===================================================================== */
Object.assign(MG, {
  cut: { short: '解除', title: '爆弾解除', text: '{引いた人}から順番に、爆弾のコードを1本ずつ切る。ハズレのコードを切った人の負け' },
  n21: { short: '21', title: '21ゲーム', text: '{引いた人}から順番に、数を1〜3個ずつ進める。「21」を言った人の負け' },
  memo: { short: '記憶', title: 'メモリーリレー', text: '{引いた人}から1人ずつ、光った順番どおりにタップ。1人ごとに1つずつ増える。まちがえた人の負け' },
});
PLUS_MG.forEach(k => { if (!MG_ORDER.includes(k)) MG_ORDER.push(k); });
Object.assign(TOOL_INFO, {
  cut: { title: '爆弾解除', act: '爆弾解除スタート！', cls: 'cut pg', stake: 'ハズレを切った人が', btn: 'pink' },
  n21: { title: '21ゲーム', act: '21ゲームスタート！', cls: 'n21 pg', stake: '「21」を言った人が', btn: 'pink' },
  memo: { title: 'メモリーリレー', act: 'メモリーリレー スタート！', cls: 'memo', stake: 'まちがえた人が' },
});
['cut', 'n21'].forEach(k => { if (!PARTY_FX.includes(k)) PARTY_FX.push(k); });
Object.assign(PARTY_HINT, { cut: 'コードを1本タップして切る', n21: '「+1」を1〜3回押して「次の人へ」' });
Object.assign(PARTY_LOSE, { cut: 'がハズレを切った！', n21: 'が「21」を言った！' });
Object.assign(LOSE_SE, { cut: 'loseMine', n21: 'loseSkull', memo: 'loseReact' });
Object.assign(MINI_NAMES, { cut: '爆弾解除', n21: '21ゲーム', memo: 'メモリーリレー' });

/* 爆弾解除: a time bomb with 8 wires; one hidden wire sets it off. Every safe cut makes the timer tick faster */
const CUT_COLORS = ['#ff3d4f', '#2f8cff', '#ffd83d', '#30d158', '#ffffff', '#ff8b2b', '#b17cff', '#ff6fd8'];
const CUT_N = CUT_COLORS.length;
const cutX = (i, top) => (top ? 104 + i * 16 : 34 + i * 36);
function cutWire(i, top) {
  const x1 = cutX(i, true), x2 = cutX(i, false), mx = (x1 + x2) / 2 + (i % 2 ? 14 : -14);
  return top ? 'M' + x1 + ' 132 C ' + x1 + ' 168, ' + mx + ' 176, ' + mx.toFixed(1) + ' 214' : 'M' + mx.toFixed(1) + ' 226 C ' + mx.toFixed(1) + ' 262, ' + x2 + ' 268, ' + x2 + ' 300';
}
function cutSVG() {
  const wires = CUT_COLORS.map((c, i) => '<g class="ct-w" id="ctW' + i + '"><g class="ct-top"><path d="' + cutWire(i, true) + '" class="ct-o"/><path d="' + cutWire(i, true) + '" stroke="' + c + '" class="ct-c"/></g>' +
    '<g class="ct-bot"><path d="' + cutWire(i, false) + '" class="ct-o"/><path d="' + cutWire(i, false) + '" stroke="' + c + '" class="ct-c"/></g>' +
    '<path d="M' + ((cutX(i, true) + cutX(i, false)) / 2 + (i % 2 ? 14 : -14)).toFixed(1) + ' 214 v12" stroke="' + c + '" class="ct-mid"/></g>').join('');
  const hits = CUT_COLORS.map((_, i) => '<path d="' + cutWire(i, true) + ' L' + ((cutX(i, true) + cutX(i, false)) / 2 + (i % 2 ? 14 : -14)).toFixed(1) + ' 226 ' + cutWire(i, false).replace(/^M[\d. ]+/, '') + '" class="ct-hit" data-tl="hit" data-i="' + i + '"/>').join('');
  return '<svg class="ct-svg" id="ctSvg" viewBox="0 0 320 340" role="img" aria-label="時限爆弾">' +
    '<ellipse cx="160" cy="326" rx="140" ry="10" fill="rgba(0,0,0,.25)"/>' +
    '<rect x="18" y="292" width="284" height="26" rx="8" fill="#3a3d48" stroke="#150733" stroke-width="3"/>' +
    CUT_COLORS.map((_, i) => '<circle cx="' + cutX(i, false) + '" cy="300" r="5" fill="#c9ced6" stroke="#150733" stroke-width="2"/>').join('') +
    '<g class="ct-box"><rect x="74" y="34" width="172" height="104" rx="14" fill="#2b2d33" stroke="#150733" stroke-width="3.5"/>' +
    '<path d="M86 122 h148" stroke="#ffd83d" stroke-width="9" stroke-dasharray="12 10"/>' +
    '<rect x="96" y="48" width="128" height="52" rx="8" fill="#150707" stroke="#150733" stroke-width="2.5"/>' +
    '<text x="160" y="88" class="ct-lcd" id="ctLcd">0:30</text>' +
    '<circle cx="232" cy="46" r="7" class="ct-led" fill="#ff3d4f" stroke="#150733" stroke-width="2"/>' +
    '<rect x="132" y="18" width="56" height="20" rx="6" fill="#4a4e5a" stroke="#150733" stroke-width="3"/></g>' +
    wires + '<g id="ctSnips"></g>' + hits +
    '<g class="ct-bang" id="ctBang"><path d="' + Array.from({ length: 24 }, (_, k) => { const a = k / 24 * Math.PI * 2, r = k % 2 ? 60 : 110; return (k ? 'L' : 'M') + (160 + Math.cos(a) * r).toFixed(1) + ' ' + (150 + Math.sin(a) * r * 0.8).toFixed(1); }).join(' ') + 'Z" fill="#ffe066" stroke="#150733" stroke-width="4" stroke-linejoin="round"/>' +
    '<text x="160" y="164" class="ct-bang-t">ドカーン!!</text></g></svg>';
}
PARTY.cut = {
  init(T) { T.trap = rint(0, CUT_N - 1); T.cut = []; T.secs = 30; },
  info: T => 'のこりのコード <b>' + (CUT_N - T.cut.length) + '</b>本（ハズレは1本）',
  art: () => cutSVG(),
  hit(T, i) {
    if (T.cut.includes(i)) return;
    T.busy = true; T.cut.push(i);
    const w = $('ctW' + i), svg = $('ctSvg');
    if (w) w.classList.add('snip');
    const mx = (cutX(i, true) + cutX(i, false)) / 2 + (i % 2 ? 14 : -14);
    $('ctSnips').insertAdjacentHTML('beforeend', '<g class="ct-spark" transform="translate(' + mx.toFixed(1) + ' 220)"><path d="M0 -14V14M-14 0H14M-10 -10L10 10M-10 10L10 -10" stroke="#ffe066" stroke-width="3.5" stroke-linecap="round"/></g>');
    SE.play('swClack'); vibrate(25);
    partyStake();
    if (i === T.trap) { toolLater(() => { svg.classList.add('brink'); $('ctLcd').textContent = '0:00'; SE.play('mnWarn'); hushBeat('toolOv', 900, cutBoom, null, false, [$('pgArt')]); }, 380); return; }
    T.secs = Math.max(3, T.secs - rint(3, 5));
    toolLater(() => { $('ctLcd').textContent = '0:' + String(T.secs).padStart(2, '0'); svg.style.setProperty('--tick', Math.max(0.18, T.secs / 30).toFixed(2) + 's'); SE.play('tick'); }, 260);
    toolLater(() => partyNext(420), 520);
  },
};
function cutBoom() {
  const svg = $('ctSvg'), q = relPos($('ctBang'));
  svg.classList.remove('brink'); svg.classList.add('boom');
  SE.play('mnBoom'); flash('#ffffff'); shake(true);
  FXC.burst(q.x, q.y, 90, { colors: ['#ffe066', '#ff8b2b', '#ff3d4f', '#ffffff', '#3a3d48'], star: true, speed: 16 });
  telop('ドカーン！！', 'red', 1300);
  const chip = $('pgO' + (tool.k % tool.ps.length));
  toolLater(() => { if (chip) chip.classList.add('bonk'); }, 700);
  partyLose(2200);
}

/* 21ゲーム: count up 1–3 at a time; whoever has to say 21 loses */
const N21 = 21;
function n21Art(T) {
  let h = '<div class="n21-now"><b id="n21Now">' + T.n + '</b><small>/21</small></div><div class="n21-grid" id="n21Grid">';
  for (let k = 1; k <= N21; k++) h += '<span class="n21-c' + (k === N21 ? ' end' : '') + '" id="n21C' + k + '">' + (k === N21 ? '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4C11 4 5 10 5 18c0 5 2.5 8.5 6 10.5V34h18v-5.5c3.5-2 6-5.5 6-10.5C35 10 29 4 20 4Z" fill="#fff" stroke="#150733" stroke-width="2.6"/><circle cx="14" cy="18" r="4" fill="#150733"/><circle cx="26" cy="18" r="4" fill="#150733"/><path d="M17 34v-4M23 34v-4" stroke="#150733" stroke-width="2.4"/></svg>' : k) + '</span>';
  return h + '</div>';
}
PARTY.n21 = {
  init(T) { T.n = 0; },
  info: () => '1人1〜3個 ・ 21を言ったら負け（20まで行ったら次の人の負け）',
  art: T => n21Art(T),
  buttons: T => '<button type="button" class="pbtn big main pg-go" data-tl="go"' + (T.acts >= 3 ? ' disabled' : '') + '>+1<small>' + pips(T.acts, 3) + '</small></button>' +
    '<button type="button" class="pbtn cyan small pg-pass" data-tl="pass"' + (T.acts ? '' : ' disabled') + '>次の人へ ▶</button>',
  go(T) {
    if (T.acts >= 3 || T.n >= N21) return;
    T.acts++; T.n++;
    const c = $('n21C' + T.n), now = $('n21Now'), p = pgNow();
    if (c) { c.style.setProperty('--p', pc(p)); c.classList.add('on'); restartAnim(c, 'n21pop'); }
    if (now) { now.textContent = T.n; restartAnim(now, 'n21bump'); }
    $('pgArt').classList.toggle('hot', T.n >= 17);
    vibrate(12);
    if (T.n >= N21) { T.busy = true; toolActs('', false); SE.play('mnWarn'); toolLater(() => hushBeat('toolOv', 700, () => { $('pgArt').classList.add('boom'); SE.play('skDoom'); flash('#e8233f'); shake(true); telop('21！！', 'red', 1200); partyLose(1800); }, null, false, [$('pgArt')]), 200); return; }
    SE.play(T.n >= 18 ? 'mnWarn' : 'tick2');
    partyButtons();
    if (T.acts >= 3 || T.n === N21 - 1) { T.busy = true; toolLater(() => partyNext(300), 650); }
  },
};

/* メモリーリレー: four pads light up in an order; each player repeats it, and it grows by one for the next player */
const MEMO_F = [329.63, 440, 554.37, 659.25];
MEMO_F.forEach((f, i) => { SOUNDS['mm' + i] = (A, t) => { tone(A, t, { type: 'triangle', f, d: 0.42, g: 0.16, rv: 0.25 }); tone(A, t, { type: 'sine', f: f * 2, d: 0.2, g: 0.04 }); }; NO_DUCK.add('mm' + i); });
SOUNDS.mmBad = (A, t) => { tone(A, t, { type: 'square', f: 160, f2: 90, d: 0.45, g: 0.12, lp: 900 }); noise(A, t, { d: 0.12, g: 0.2, type: 'lowpass', f: 700 }); };
function memoSetup() {
  const T = tool;
  T.seq = [rint(0, 3), rint(0, 3), rint(0, 3)]; T.at = 0; T.mm = 'ready';
  $('toolStage').innerHTML = stakeLine(T) + tlList(T, '--') +
    '<div class="mm-pads" id="mmPads">' + [0, 1, 2, 3].map(i => '<button type="button" class="mm-pad c' + i + '" id="mmP' + i + '" aria-label="' + ['あか', 'あお', 'きいろ', 'みどり'][i] + '"></button>').join('') +
    '<b class="mm-n" id="mmN"></b></div><p class="tm-sub" id="toolSub"></p>';
  [0, 1, 2, 3].forEach(i => onPress($('mmP' + i), () => memoTap(i)));
  memoTurn();
}
function memoTurn() {
  const T = tool, i = T.k;
  T.mm = 'ready'; T.at = 0;
  T.ps.forEach((_, j) => { const el = $('tlP' + j); el.classList.toggle('now', j === i); el.classList.toggle('wait', j > i); });
  $('mmPads').className = 'mm-pads';
  $('mmN').textContent = T.seq.length;
  $('toolSub').innerHTML = (i ? 'スマホを渡して…<br>' : '') + '<b>' + esc(pname(T.ps[i])) + '</b> の番！ <small>' + T.seq.length + '個の順番を覚えてね</small>';
  toolActs(TOOL_CLOSE + '<button type="button" class="pbtn big main" data-tl="watch">見る！</button>');
}
function memoShow() {
  const T = tool;
  if (T.mm !== 'ready') return;
  T.mm = 'show';
  toolActs(TOOL_CLOSE, false);
  $('mmPads').className = 'mm-pads show';
  $('toolSub').innerHTML = '<b>よく見て…</b>';
  const gap = Math.max(330, 620 - T.seq.length * 25);
  T.seq.forEach((v, k) => toolLater(() => memoLight(v), 500 + k * gap));
  toolLater(() => {
    T.mm = 'input';
    $('mmPads').className = 'mm-pads input';
    $('toolSub').innerHTML = '<b>どうぞ！</b> 同じ順番でタップ <small id="mmLeft">のこり ' + T.seq.length + '</small>';
  }, 500 + T.seq.length * gap + 200);
}
function memoLight(v) {
  const el = $('mmP' + v);
  if (!el) return;
  el.classList.remove('lit'); void el.offsetWidth; el.classList.add('lit');
  SE.play('mm' + v);
}
function memoTap(v) {
  const T = tool;
  if (!T || T.kind !== 'memo' || T.mm !== 'input') return;
  if (v !== T.seq[T.at]) {
    T.mm = 'gap';
    const el = $('mmP' + v); if (el) el.classList.add('bad');
    const ok = $('mmP' + T.seq[T.at]); if (ok) toolLater(() => ok.classList.add('hint'), 350);
    SE.play('mmBad'); vibrate([80, 40, 80]);
    const p = T.ps[T.k], v2 = $('tlV' + T.k);
    v2.innerHTML = '<span class="rc-foul">' + T.at + '/' + T.seq.length + '</span>'; tmPop(v2);
    $('toolSub').innerHTML = '<b>ざんねん！</b>';
    toolLater(() => hushBeat('toolOv', 700, () => toolFinish([p], 'まちがえた <b>' + esc(pname(p)) + '</b> の負け！ ' + amtTxt(T.cups), j => $('tlP' + j))), 900);
    return;
  }
  memoLight(v); vibrate(10);
  T.at++;
  const left = $('mmLeft'); if (left) left.textContent = 'のこり ' + (T.seq.length - T.at);
  if (T.at < T.seq.length) return;
  T.mm = 'gap';
  const v2 = $('tlV' + T.k); v2.textContent = T.seq.length + '個 OK'; tmPop(v2);
  $('toolSub').innerHTML = '<b>クリア！</b> 次は ' + (T.seq.length + 1) + '個';
  SE.play('ding');
  T.seq.push(rint(0, 3));
  toolLater(() => { T.k = (T.k + 1) % T.ps.length; if (T.k === 0) T.ps.forEach((_, j) => { const e = $('tlV' + j); if (e) e.textContent = '--'; }); memoTurn(); }, 1200);
}
function memoAct(a) { if (a === 'watch') memoShow(); }

/* 遊び方ガイド: the new modes get a page of their own (after ミニゲーム) */
if (PLUS_OPEN) GUIDE.splice(Math.max(0, GUIDE.findIndex(x => x.k === 'games') + 1), 0, { k: 'plus', tab: '王様・恋バナ', html: () =>
  '<p class="gd-lead">タイトル画面の<b>「王様ゲーム」「恋バナ・暴露」</b>から遊べるモードです。人数・名前・何周・1杯の量はふつうのゲームと同じように決めます。</p>' +
  gCard('王様ゲーム（3人から）', '<p>「くじを引く！」で<b>王様と番号</b>が決まります。だれが何番かは<b>アプリだけが知っている</b>ので、王様は番号で命令。命令は3つの中から選ぶか、自分で考えてもOK。</p>' +
    '<p>「番号オープン！」で番号の人がわかります。<b>できなかった・パスした人をタップ</b>して「次へ」。乾杯などの命令は、飲む人が最初から選ばれています。</p>' +
    '<p>「命令のレベル」は<b>ふつう</b>（みんなで楽しく）と<b>盛り上げ</b>（恋バナ・暴露っぽいのも出る）。</p>', 1) +
  gCard('恋バナ・暴露', '<p>番の人が「質問を引く！」。答えたら「答えた！」、答えたくなければ<b>「パス」で1杯</b>。</p>' +
    '<p>「全員で指さし！」は、せーので一斉に指さして<b>いちばん指された人</b>をタップ。「全員で答える」は、答えられなかった人をタップ。</p>', 2) +
  gTip('イヤな命令・質問は、パスしてOK。無理に飲ませたり、さわったりする命令はやめましょう。')
});
