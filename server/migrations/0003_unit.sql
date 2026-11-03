-- 1杯の量（目安）: 'one' = 一口, 'half' = 半分, 'cup' = 1杯, 'none' = お酒なし（ソフトドリンク一口）. NULL = before this was recorded
ALTER TABLE games ADD COLUMN unit TEXT;
