# 集計サーバー（Cloudflare Workers + D1）

アプリの利用状況を数えるための、自前の小さなサーバーです。広告ブロッカーのリストに載っている外部の解析サービスを使わないので、ブロッカーを入れている人のぶんも数えられます。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/shugodensetsu/shugodensetsu.github.io/tree/main/server)

上のボタンから、Worker とデータベース（D1）がまとめて作られます（Worker の名前は作成画面の初期値。いま動いているのは shugodensetsu-github-io）。集計ページのパスワードは、作成のあと Worker の「設定 ＞ 変数とシークレット」でシークレット `STATS_PASSWORD`（16文字以上）として入れます（作成画面で聞かれた場合はそこで入れても同じ）。

## しくみ

- `POST /v1/p` — 受け口（`src/collector.js`）。アプリから届く報告を確かめて保存する
- `GET /` — 集計ページ（`src/stats.js`）。パスワードか Cloudflare Access が通ったときだけ表示する
- `migrations/0001_init.sql` — データベースの表。デプロイのたびに `wrangler d1 migrations apply DB --remote` が未適用のぶんだけ流す
- `tools/stats.src.js` — 集計ページの元。編集したら `node server/tools/build-stats.js` で `src/stats.js` を作り直す（カードの文章とゲーム名を埋め込む）

## 送るもの・送らないもの

アプリは1ゲームにつき「始まった」「終わった（または途中でしまった）」の報告を送ります。中身は数だけです（人数、ラウンド数、ターン数、杯数の合計、遊んだ時間、出た組み込みカードの番号と回数、ミニゲーム・特殊ルールの種類と回数など）。プレイヤー名、カードの文章、端末を見分けるIDは送りません。IPアドレスは保存せず、連続送信を止めるために1分だけメモリに置きます。Workers のログ（observability）も切ってあります。

## 守り

- 受け口：アプリのオリジン（https://shugodensetsu.github.io）以外からの報告は受け付けない。大きさ・形・値の範囲をすべて確かめ、合わないものは捨てる。1分30件/送信元まで
- 集計ページ：パスワード（Secret `STATS_PASSWORD`、16文字以上）か Cloudflare Access のどちらかが通らないと何も見せない。パスワードの間違いは1分10回/送信元まで
- 無料枠を超えたときは記録されないだけで、料金はかからない。ゲームにも影響しない

## 設定のあと

受け口の URL（いまは `https://shugodensetsu-github-io.shugodensetsu.workers.dev/v1/p`）を `src/part-game.js` の `STAT_URL` に入れて `node src/build-app.js` を実行する。ページの CSP（connect-src）には、その URL のオリジンだけが自動で入る。

ローカルで試すとき：`STAT_TEST=http://localhost:8787/v1/p node src/build-app.js test`

注意：Deploy to Cloudflare は、このフォルダを利用者の GitHub に別のリポジトリとして写し、そちらへの push で自動デプロイする。ここ（server/）を直しても、動いている Worker には自動では入らない。直したら写し先のリポジトリにも同じ変更を入れる。
