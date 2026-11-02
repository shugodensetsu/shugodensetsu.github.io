# 集計サーバー（Cloudflare Workers + D1）

アプリの利用状況を数えるための、自前の小さなサーバーです。広告ブロッカーのリストに載っている外部の解析サービスを使わないので、ブロッカーを入れている人のぶんも数えられます。

## ファイル

- `schema.sql` — データベース（D1）の表。D1 のコンソールで一度だけ実行する
- `collector.js` — 受け口（Worker「sakego-in」）。アプリから `POST /v1/p` で届く報告を確かめて保存する
- `stats.src.js` — 集計ページ（Worker「sakego-stats」）の元。編集はこちら
- `stats.js` — `node server/build-stats.js` で作る、貼り付け用の集計ページ（カードの文章とゲーム名を埋め込み済み）
- `build-stats.js` — 上の stats.js を作るスクリプト

## 送るもの・送らないもの

アプリは1ゲームにつき「始まった」「終わった（または途中でしまった）」の報告を送ります。中身は数だけです（人数、ラウンド数、ターン数、杯数の合計、遊んだ時間、出た組み込みカードの番号と回数、ミニゲーム・特殊ルールの種類と回数など）。プレイヤー名、カードの文章、端末を見分けるIDは送りません。IPアドレスは保存せず、連続送信を止めるために1分だけメモリに置きます。

## 守り

- 受け口：アプリのオリジン（https://shugodensetsu.github.io）以外からの報告は受け付けない。大きさ・形・値の範囲をすべて確かめ、合わないものは捨てる。1分30件/送信元まで
- 集計ページ：パスワード（Secret `STATS_PASSWORD`、16文字以上）か Cloudflare Access のどちらかが通らないと何も見せない。パスワードの間違いは1分10回/送信元まで
- 無料枠を超えたときは記録されないだけで、料金はかからない。ゲームにも影響しない

## 設定のあと

受け口の URL（`https://sakego-in.〈サブドメイン〉.workers.dev/v1/p`）を `src/part-game.js` の `STAT_URL` に入れて `node src/build-app.js` を実行する。ページの CSP（connect-src）には、その URL のオリジンだけが自動で入る。

ローカルで試すとき：`STAT_TEST=http://localhost:8787/v1/p node src/build-app.js test`
