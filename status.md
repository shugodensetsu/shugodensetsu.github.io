# 集計サーバーのデプロイ結果

- 日時: 2026-11-19 13:35:08 (JST)
- コミット: 1d38d05
- 準備: success / トークン: true
- wrangler: success
- データベース: success
- 表: success
- デプロイ: success
- パスワード: success skipped
- Stripe のキー: success
- 動作確認: success

## URL
https://sakego.shugodensetsu.workers.dev

## 0-check
```
トークンあり
```

## 1-install
```

added 38 packages in 5s
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

 ⛅️ wrangler 4.136.1 (update available 4.165.0)
───────────────────────────────────────────────
🌀 Creating the secret for the Worker "sakego"
✨ Success! Uploaded secret STATS_PASSWORD
```

## 4b-stripe
```

 ⛅️ wrangler 4.136.1 (update available 4.165.0)
───────────────────────────────────────────────
🌀 Creating the secret for the Worker "sakego"
✨ Success! Uploaded secret STRIPE_SECRET_KEY
```

## 4c-stripe-kind
```
Stripe のキー: 本番の制限付きキー
```

## 5-deploy
```

 ⛅️ wrangler 4.136.1 (update available 4.165.0)
───────────────────────────────────────────────
Total Upload: 136.12 KiB / gzip: 46.54 KiB
Your Worker has access to the following bindings:
Binding                 Resource            
env.ROOMS (Room)        Durable Object      
env.DB (sakego)         D1 Database         

Uploaded sakego (6.59 sec)
Deployed sakego triggers (1.91 sec)
  https://sakego.shugodensetsu.workers.dev
Current Version ID: a097033d-0d78-4254-80f3-7b3022603983
```

## 6-check
```
URL: https://sakego.shugodensetsu.workers.dev
集計ページ（ログイン前）: 401（401 なら正しい）
よそのサイトからの報告: 403（403 なら正しい）
壊れた報告: 400（400 なら正しい）
ホーム画面用の設定: 200（200 なら正しい）
支払いの API: 404（404 ならキーあり・503 ならキー未設定）
部屋の API: 404（404 なら正しい）
プレミアムなしで部屋を作る: 403（403 なら正しい）
ログインして集計ページを開く: できた（データベースもOK）
→ すべてOK（1 回目）
```
