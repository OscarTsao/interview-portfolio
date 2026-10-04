CREATE TABLE IF NOT EXISTS demo_case_actions (
  visitor TEXT NOT NULL,
  alert_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  note TEXT NOT NULL,
  actor TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (visitor, alert_id)
);
