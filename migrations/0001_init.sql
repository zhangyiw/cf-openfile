CREATE TABLE IF NOT EXISTS rooms (
  key TEXT PRIMARY KEY,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  room_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  description TEXT,
  storage_key TEXT NOT NULL UNIQUE,
  content_type TEXT,
  size_bytes INTEGER NOT NULL,
  uploaded_by TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (room_key) REFERENCES rooms(key)
);

CREATE INDEX IF NOT EXISTS idx_files_room_expires ON files(room_key, expires_at);
