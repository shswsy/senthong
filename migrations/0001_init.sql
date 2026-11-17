-- Times are epoch milliseconds (UTC); the UI renders them in Asia/Bangkok.

CREATE TABLE categories (
  id    INTEGER PRIMARY KEY,
  name  TEXT    NOT NULL,
  sort  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id   INTEGER NOT NULL REFERENCES categories (id),
  name          TEXT    NOT NULL,
  desc          TEXT    NOT NULL DEFAULT '',
  price         INTEGER NOT NULL CHECK (price >= 0),
  art           TEXT    NOT NULL DEFAULT 'soup',
  presets       TEXT    NOT NULL DEFAULT '[]',     -- JSON array of option preset ids (shared/menu.ts PRESETS)
  available     INTEGER NOT NULL DEFAULT 1,
  sort          INTEGER NOT NULL DEFAULT 0
);

-- Each table gets a random token: the QR code links to /t/<token>, so nobody can order "for" another table.
CREATE TABLE tables (
  id     INTEGER PRIMARY KEY,
  label  TEXT    NOT NULL,
  token  TEXT    NOT NULL UNIQUE
);

-- One sitting at a table, from first order until staff takes payment.
CREATE TABLE sessions (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id           INTEGER NOT NULL REFERENCES tables (id),
  opened_at          INTEGER NOT NULL,
  closed_at          INTEGER,
  paid_total         INTEGER,
  bill_requested_at  INTEGER
);
-- at most one open sitting per table
CREATE UNIQUE INDEX one_open_session ON sessions (table_id) WHERE closed_at IS NULL;
CREATE INDEX idx_sessions_closed ON sessions (closed_at);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES sessions (id),
  table_id    INTEGER NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'cooking', 'ready', 'served', 'cancelled')),
  total       INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_orders_session ON orders (session_id);
CREATE INDEX idx_orders_status ON orders (status, created_at);

-- name/price are snapshots so later menu edits never change an old bill
CREATE TABLE order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders (id),
  item_id     INTEGER NOT NULL,
  name        TEXT    NOT NULL,
  qty         INTEGER NOT NULL,
  unit_price  INTEGER NOT NULL,
  options     TEXT    NOT NULL DEFAULT '',
  note        TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX idx_order_items_order ON order_items (order_id);

CREATE TABLE calls (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id     INTEGER NOT NULL,
  kind         TEXT    NOT NULL CHECK (kind IN ('waiter', 'bill')),
  created_at   INTEGER NOT NULL,
  resolved_at  INTEGER
);
CREATE INDEX idx_calls_open ON calls (resolved_at);

-- small key/value store (demo freshness timestamps)
CREATE TABLE meta (
  key    TEXT PRIMARY KEY,
  value  INTEGER NOT NULL
);
