-- The sign-in code last emailed to an address. Only its SHA-256 is stored.
-- `attempts_left` bounds the guesses at one code; `window_start` and `sends`
-- count the codes sent to the address in the current hour.
CREATE TABLE email_codes (
  email TEXT PRIMARY KEY NOT NULL,
  code_hash TEXT NOT NULL,
  attempts_left INTEGER NOT NULL,
  sent_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  window_start INTEGER NOT NULL,
  sends INTEGER NOT NULL
);
