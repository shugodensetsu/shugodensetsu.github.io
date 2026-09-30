# 酒GO!!伝説

飲み会を盛り上げるカードゲーム。引いたが最後！ 天国か、地獄か。
スマホ1台を2〜8人で回して遊びます。

**遊ぶ：** https://tatsuyaishizukaai-hash.github.io/sakego-densetsu/

## iPhoneのホーム画面に追加する

1. 上のURLを **Safari** で開く
2. 下の「共有」ボタン →「ホーム画面に追加」
3. ホーム画面のアイコンから起動すると、全画面のアプリとして動きます

一度開けば、そのあとはオフラインでも遊べます。

## 補足

- カード編集で保存した内容は、その端末の中にだけ保存されます（端末ごとに別々）。
- 「最初のカードに戻す」で、はじめのカードに戻せます。
- 20歳未満の飲酒は法律で禁止されています。飲めない人はソフトドリンクで参加OK。無理に飲ませるのはやめましょう。

## 開発メモ

- ゲーム本体のソースは `src/` にあります（`part-*.js` と `deck-template.html`、はじめのカードは `deck.json`）。
- `node src/build-app.js` で、ルートの `index.html` / `manifest.webmanifest` / `sw.js` を作り直します。
- アイコンは `node src/icon.js` で作り直せます（Playwright と日本語フォントが必要）。
- GitHub Pages（main ブランチのルート）で公開しています。
