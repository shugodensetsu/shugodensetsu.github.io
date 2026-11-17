-- DON!!でんプレミアム: devices that handed premium on may not take it back (src/plus.js).
-- goneh: JSON array of SHA-256 hashes of the device keys that held this purchase before (newest last, at most 50).
ALTER TABLE plus ADD COLUMN goneh TEXT;
