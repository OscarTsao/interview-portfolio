CREATE TABLE IF NOT EXISTS coursework_stores (
  visitor TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 0,
  state_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS coursework_stores_expiry ON coursework_stores(updated_at);
