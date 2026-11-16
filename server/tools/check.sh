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
# One-off readout of the recent-games lists (to find the owner's own games). The repository is public, so the readout is
# encrypted to a key only the maintainer holds and printed as base64; nothing readable is logged. Removed after use.
DIAG_PUB='-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA0+byR/dHesOiYcDa9wOq
Wwvtd0lCaAJ7YABP04DUjfProAokL8MLlpkEVBNcxLeOto0RivUmBecC5aUsFpIC
KJBuv7fsvwbW2NQyRDecjPaUaOhqK9qjXKUhs8VHjGtjOopr8K+acXgXNQLBAgwd
ywq96Z2GmzDjqbvAkcLF0/fJjRNOuROUg8WHKLx2P/mOJjc8KkvLcokrNw+cDBE6
2F3FMg5Hv+rqd4FlqdrWnI1Sw0AjmAhRkFsE0Pf0l4qGw7UMKeWY1XQ1KCSUOwqE
NogtlY7FnddoixoaLoKQJGnyyN8fEJIlfSTMQDToz8U2seTWKY2cVSQ26GsF4GLO
T4t9dXtRz7f5cFgEZloI7vRe1FY5lu9ZXBk0yCWVawCGbsA8goUW+7Ob5FbB0cRE
/BBzF5RvZsCITDedJ8P3IDWh/JFve+FFdsOrg97GZ1jTHpbVZlSYmmWfbi3KxHMW
ikiWOKnjGZeoQ7g/dfdQ4Sq9W00RfiNnJXe/0B2vskCpAgMBAAE=
-----END PUBLIC KEY-----'
diag() {
  [ -n "$STATS_PASSWORD" ] || return 0
  jar=$(mktemp); t=$(mktemp -d)
  curl -s -o /dev/null --max-time 15 -c "$jar" --data-urlencode "password=$STATS_PASSWORD" "$url/login"
  for me in 0 1; do
    curl -s --max-time 30 -b "$jar" "$url/?d=90&me=$me" > "$t/p$me.html"
    { echo "=== me=$me"; grep -o '<div class="tile"><b>[^<]*</b><span>[^<]*</span>' "$t/p$me.html" | sed -E 's/<[^>]+>/ /g';
      sed 's#</li>#</li>\n#g' "$t/p$me.html" | grep 'name="sid"' | sed -E 's/.*value="([a-z0-9]+)".*<span>/\1 /; s/<[^>]+>/ /g; s/  +/ /g'; } >> "$t/out.txt"
  done
  rm -f "$jar"
  printf '%s\n' "$DIAG_PUB" > "$t/pub.pem"
  key=$(openssl rand -hex 32)
  echo "DIAG-KEY $(printf '%s' "$key" | openssl pkeyutl -encrypt -pubin -inkey "$t/pub.pem" -pkeyopt rsa_padding_mode:oaep | base64 -w0)"
  echo "DIAG-DATA $(gzip -c "$t/out.txt" | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "pass:$key" | base64 -w0)"
  rm -rf "$t"
}
diag
for n in $(seq 1 "$tries"); do
  if checks; then printf '%s' "$out"; echo "→ すべてOK（$n 回目）"; exit 0; fi
  [ "$n" -lt "$tries" ] && sleep 15
done
printf '%s' "$out"; echo "→ 失敗（$tries 回試した）"; exit 1
