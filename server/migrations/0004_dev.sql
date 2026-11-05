-- 自分の端末（開発・テスト用）で遊んだ分の印. 1 = アプリの「自分の端末」をオンにした端末から届いた. NULL = ふつうの端末.
-- 集計ページはふだん NULL だけを数え、印のある分は「自分の端末」の別枠で見せる
ALTER TABLE games ADD COLUMN dev INTEGER;
ALTER TABLE events ADD COLUMN dev INTEGER;
