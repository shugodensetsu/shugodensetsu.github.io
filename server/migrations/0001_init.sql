-- 酒GO!!伝説 play counts (Cloudflare D1). Only counts — no names, no card text, no IP addresses, no device IDs.
-- Applied by `wrangler d1 migrations apply DB --remote` (the predeploy script) the first time the Worker is deployed.

-- one row per game: written when it starts, updated when it ends (or when the app is put away mid-game)
CREATE TABLE IF NOT EXISTS games (
  sid       TEXT PRIMARY KEY,   -- random ID for this one game (not tied to a person or a phone)
  day       TEXT NOT NULL,      -- YYYY-MM-DD, Japan time
  started   INTEGER NOT NULL,   -- unix ms
  mode      TEXT NOT NULL,      -- 'card' | 'mini'
  players   INTEGER NOT NULL,   -- 2-8
  rounds    INTEGER,            -- 0 = until stopped
  form      TEXT,               -- 'phone' | 'tablet'
  installed INTEGER,            -- 1 = opened from the home screen
  nth       INTEGER,            -- how many games this phone has started (1 = its first)
  seq       INTEGER,            -- report number within the game (a late, older report is ignored)
  ended     INTEGER,            -- unix ms of the last update
  turns     INTEGER,
  done      INTEGER,            -- 1 = reached the result screen
  ms        INTEGER,            -- play time
  cups      INTEGER,            -- cups recorded in total
  data      TEXT                -- JSON counts: {"cards":{"55":1}, "fx":{"taru":1}, "mini":{"wani":1}, "sp":{"double":2}, "own":3}
);
CREATE INDEX IF NOT EXISTS games_day ON games(day);

-- the odd button press: 「友達に教える」, 「ホーム画面に追加」
CREATE TABLE IF NOT EXISTS events (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  day    TEXT NOT NULL,
  at     INTEGER NOT NULL,
  kind   TEXT NOT NULL,          -- 'share' | 'install'
  detail TEXT
);
CREATE INDEX IF NOT EXISTS events_day ON events(day);
