-- Initial schema. Add a new numbered file for every change (`npm run db:new -w @app/api -- <name>`);
-- never edit a migration that has already run on production.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT,              -- NULL for accounts that only use Google/Apple sign-in (add later)
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- One row per signed-in browser or device. `id` is the SHA-256 of the token, never the token itself.
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client     TEXT NOT NULL DEFAULT 'web',  -- 'web' | 'ios' | 'android'
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Fixed-window counters for sign-in attempts (see src/lib/rate-limit.ts).
CREATE TABLE rate_limits (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start TEXT NOT NULL,
  locked_until TEXT
);

-- Example resource. Replace with your own tables.
CREATE TABLE notes (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  done       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_notes_user ON notes(user_id, created_at DESC);
