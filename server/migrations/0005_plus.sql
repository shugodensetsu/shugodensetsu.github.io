-- DON!!でんプレミアム: one row per restore code (src/plus.js). No names, no emails, no card details:
-- only Stripe's own IDs, so the purchase can be looked up in Stripe.
CREATE TABLE IF NOT EXISTS plus (
  code     TEXT PRIMARY KEY,   -- 復元コード, e.g. DON-7KQ4-M2XP-9HTA
  plan     TEXT NOT NULL,      -- year / month / pass
  session  TEXT,               -- Stripe Checkout Session id
  customer TEXT,               -- Stripe Customer id
  sub      TEXT,               -- Stripe Subscription id (year / month)
  until    INTEGER,            -- premium until (ms); NULL until paid
  cancel   INTEGER DEFAULT 0,  -- 1: the subscription ends at the end of the paid period
  checked  INTEGER,            -- when Stripe was last asked (ms)
  created  INTEGER NOT NULL
);
