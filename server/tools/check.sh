#!/usr/bin/env bash
# Checks the live Worker without writing any data: login page, refusing other sites and broken reports,
# the dashboard (database) with the password, the login flow and the home-screen manifest.
# usage: STATS_PASSWORD=... server/tools/check.sh https://sakego.example.workers.dev [tries]
# A new version can take a few minutes to reach every Cloudflare location, so it retries (15 s apart).
url="$1"; tries="${2:-1}"
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$@"; }
checks() {
  out=""; ok=1
  add() { out="$out$1"$'\n'; }
  want=403; [ -n "$STATS_PASSWORD" ] && want=401
  r=$(code "$url/"); add "集計ページ（ログイン前）: $r（$want なら正しい）"; [ "$r" = "$want" ] || ok=0
  r=$(code -X POST -H 'Origin: https://evil.example' -H 'Content-Type: text/plain' --data '{}' "$url/v1/p"); add "よそのサイトからの報告: $r（403 なら正しい）"; [ "$r" = 403 ] || ok=0
  r=$(code -X POST -H 'Origin: https://shugodensetsu.github.io' -H 'Content-Type: text/plain' --data 'not json' "$url/v1/p"); add "壊れた報告: $r（400 なら正しい）"; [ "$r" = 400 ] || ok=0
  r=$(code "$url/manifest.webmanifest"); add "ホーム画面用の設定: $r（200 なら正しい）"; [ "$r" = 200 ] || ok=0
  if [ -n "$STATS_PASSWORD" ]; then
    jar=$(mktemp)
    r=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -c "$jar" --data-urlencode "password=$STATS_PASSWORD" "$url/login")
    body=$(curl -s --max-time 15 -b "$jar" "$url/?d=7")
    rm -f "$jar"
    if [ "$r" = 303 ] && printf '%s' "$body" | grep -q 'ログアウト'; then add "ログインして集計ページを開く: できた（データベースもOK）"; else add "ログインして集計ページを開く: できない（$r）"; ok=0; fi
  fi
  [ "$ok" = 1 ]
}
for n in $(seq 1 "$tries"); do
  if checks; then printf '%s' "$out"; echo "→ すべてOK（$n 回目）"; exit 0; fi
  [ "$n" -lt "$tries" ] && sleep 15
done
printf '%s' "$out"; echo "→ 失敗（$tries 回試した）"; exit 1
