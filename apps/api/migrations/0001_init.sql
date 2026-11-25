-- A person, found by the verified email their Google or GitHub account gave.
-- `seq` counts every record write, and orders records for sync.
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- A signed-in device. Only the SHA-256 of its token is stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE INDEX sessions_user ON sessions (user_id);

-- A sign-in in progress. It starts with the provider handshake and the app's
-- PKCE challenge. The callback adds the user and the hash of a one-time code,
-- and the app trades that code for a session.
CREATE TABLE logins (
  state TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  verifier TEXT NOT NULL,
  challenge TEXT NOT NULL,
  code_hash TEXT UNIQUE,
  user_id TEXT REFERENCES users (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

-- One synced record. `data` is the record as the app sent it; the server reads
-- only its id and `updatedAt`.
CREATE TABLE records (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (user_id, kind, id)
);

CREATE INDEX records_seq ON records (user_id, seq);
