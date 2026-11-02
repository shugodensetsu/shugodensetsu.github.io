-- カードの出かた（通常ゲームのみ）: 'even' = バランス, 'lively' = にぎやか. NULL = ミニゲームモード or before this was recorded
ALTER TABLE games ADD COLUMN mix TEXT;
