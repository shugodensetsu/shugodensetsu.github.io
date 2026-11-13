# 集計サーバーのデプロイ結果

- 日時: 2026-11-13 12:12:43 (JST)
- コミット: 8e8019c
- 準備: success / トークン: true
- wrangler: success
- データベース: success
- 表: success
- デプロイ: success
- パスワード: success skipped
- 動作確認: success

## URL
https://sakego.shugodensetsu.workers.dev

## 0-check
```
トークンあり
```

## 1-install
```

added 38 packages in 7s
```

## 2-d1
```
D1 database "sakego" is ready
```

## 3-migrate
```

 ⛅️ wrangler 4.136.1
────────────────────
Resource location: remote 

✅ No migrations to apply!
```

## 4-secret
```

 ⛅️ wrangler 4.136.1 (update available 4.161.0)
───────────────────────────────────────────────
🌀 Creating the secret for the Worker "sakego"
✨ Success! Uploaded secret STATS_PASSWORD
```

## 5-deploy
```

 ⛅️ wrangler 4.136.1 (update available 4.161.0)
───────────────────────────────────────────────
Total Upload: 109.36 KiB / gzip: 39.02 KiB
Your Worker has access to the following bindings:
Binding              Resource         
env.DB (sakego)      D1 Database      

Uploaded sakego (1.58 sec)
Deployed sakego triggers (0.42 sec)
  https://sakego.shugodensetsu.workers.dev
Current Version ID: 046758f4-e69b-498b-a3e9-024b17f068a3
```

## 6-check
```
URL: https://sakego.shugodensetsu.workers.dev
集計ページ（ログイン前）: 401（401 なら正しい）
よそのサイトからの報告: 403（403 なら正しい）
壊れた報告: 400（400 なら正しい）
ホーム画面用の設定: 200（200 なら正しい）
ログインして集計ページを開く: できた（データベースもOK）
→ すべてOK（1 回目）
```
