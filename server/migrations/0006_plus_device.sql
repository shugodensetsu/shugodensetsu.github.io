-- DON!!でんプレミアム: premium is on for one device at a time (src/plus.js).
-- devh: SHA-256 hash of the random key held by the device that has premium now (the key itself is kept only on that device).
-- dev_at: when that device took premium (paid or 引き継ぎ).
ALTER TABLE plus ADD COLUMN devh TEXT;
ALTER TABLE plus ADD COLUMN dev_at INTEGER;
