# 集計サーバーのデプロイ結果

- 日時: 2026-11-06 11:53:21 (JST)
- コミット: fab5fdb
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

added 38 packages in 6s
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

 ⛅️ wrangler 4.136.1 (update available 4.158.0)
───────────────────────────────────────────────
🌀 Creating the secret for the Worker "sakego"
✨ Success! Uploaded secret STATS_PASSWORD
```

## 5-deploy
```

 ⛅️ wrangler 4.136.1 (update available 4.158.0)
───────────────────────────────────────────────
Total Upload: 92.84 KiB / gzip: 35.60 KiB
Your Worker has access to the following bindings:
Binding              Resource         
env.DB (sakego)      D1 Database      

Uploaded sakego (1.87 sec)
Deployed sakego triggers (0.69 sec)
  https://sakego.shugodensetsu.workers.dev
Current Version ID: 5f173e1b-fc6e-4cbd-9f14-1691db2e1a72
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
