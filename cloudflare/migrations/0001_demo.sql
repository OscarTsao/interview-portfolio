CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK(price_cents > 0),
  description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  visitor TEXT NOT NULL,
  request_key TEXT NOT NULL,
  items_json TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(visitor, request_key)
);
CREATE INDEX IF NOT EXISTS orders_visitor ON orders(visitor);
INSERT OR IGNORE INTO products VALUES
  ('keyboard', '機械鍵盤', '桌面設備', 249000, '可調整輸入手感的桌面工具。'),
  ('headphones', '監聽耳機', '桌面設備', 189000, '適合專注工作與線上會議。'),
  ('notebook', '方格筆記本', '日常工具', 18000, '記錄想法、草圖與每天的進度。'),
  ('lamp', '閱讀桌燈', '桌面設備', 99000, '讓夜晚的工作空間更舒適。'),
  ('bottle', '隨行水瓶', '日常工具', 48000, '一個簡單、可重複使用的日常物件。'),
  ('stand', '筆電支架', '桌面設備', 79000, '為工作桌留下更多空間。');
