-- Smart Auto-Checkout Trolley Database Schema
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  icon        VARCHAR(50),
  color       VARCHAR(20),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- AISLE MAP
-- ─────────────────────────────────────────
CREATE TABLE aisle_map (
  id           SERIAL PRIMARY KEY,
  aisle_code   VARCHAR(10) UNIQUE NOT NULL,
  aisle_name   VARCHAR(100) NOT NULL,
  x_position   DECIMAL(5,2) NOT NULL DEFAULT 0,
  y_position   DECIMAL(5,2) NOT NULL DEFAULT 0,
  width        DECIMAL(5,2) NOT NULL DEFAULT 10,
  height       DECIMAL(5,2) NOT NULL DEFAULT 5,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────
CREATE TABLE products (
  id                       SERIAL PRIMARY KEY,
  sku                      VARCHAR(100) UNIQUE NOT NULL,
  barcode                  VARCHAR(100) UNIQUE,
  name                     VARCHAR(255) NOT NULL,
  description              TEXT,
  category_id              INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price                    DECIMAL(10,2) NOT NULL,
  weight_grams             DECIMAL(10,2),
  weight_tolerance_percent DECIMAL(5,2) DEFAULT 10.0,
  image_url                VARCHAR(500),
  thumbnail_url            VARCHAR(500),
  yolo_class_name          VARCHAR(100),
  aisle_id                 INTEGER REFERENCES aisle_map(id) ON DELETE SET NULL,
  shelf_position           VARCHAR(50),
  stock_quantity           INTEGER DEFAULT 0,
  is_active                BOOLEAN DEFAULT TRUE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_barcode  ON products(barcode);
CREATE INDEX idx_products_sku      ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active   ON products(is_active);

-- ─────────────────────────────────────────
-- TROLLEY SESSIONS
-- ─────────────────────────────────────────
CREATE TABLE trolley_sessions (
  id               SERIAL PRIMARY KEY,
  session_token    UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  trolley_id       VARCHAR(50),
  customer_phone   VARCHAR(20),
  status           VARCHAR(20) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','checkout','completed','abandoned')),
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  total_amount     DECIMAL(10,2) DEFAULT 0.00,
  item_count       INTEGER DEFAULT 0,
  metadata         JSONB DEFAULT '{}'
);

CREATE INDEX idx_sessions_token  ON trolley_sessions(session_token);
CREATE INDEX idx_sessions_status ON trolley_sessions(status);

-- ─────────────────────────────────────────
-- TROLLEY ITEMS
-- ─────────────────────────────────────────
CREATE TABLE trolley_items (
  id                   SERIAL PRIMARY KEY,
  session_id           INTEGER NOT NULL REFERENCES trolley_sessions(id) ON DELETE CASCADE,
  product_id           INTEGER NOT NULL REFERENCES products(id),
  quantity             INTEGER DEFAULT 1,
  unit_price           DECIMAL(10,2) NOT NULL,
  line_total           DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  vision_verified      BOOLEAN DEFAULT FALSE,
  weight_verified      BOOLEAN DEFAULT FALSE,
  status               VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','verified','flagged','removed')),
  added_at             TIMESTAMPTZ DEFAULT NOW(),
  verified_at          TIMESTAMPTZ,
  removed_at           TIMESTAMPTZ,
  vision_confidence    DECIMAL(6,4),
  detected_class       VARCHAR(100),
  weight_delta_grams   DECIMAL(10,2),
  notes                TEXT
);

CREATE INDEX idx_items_session ON trolley_items(session_id);
CREATE INDEX idx_items_status  ON trolley_items(status);

-- ─────────────────────────────────────────
-- TRANSACTIONS
-- ─────────────────────────────────────────
CREATE TABLE transactions (
  id               SERIAL PRIMARY KEY,
  session_id       INTEGER NOT NULL REFERENCES trolley_sessions(id),
  transaction_ref  VARCHAR(100) UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  customer_phone   VARCHAR(20),
  amount           DECIMAL(10,2) NOT NULL,
  payment_method   VARCHAR(20) DEFAULT 'ecocash',
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','completed','failed','refunded')),
  ecocash_ref      VARCHAR(100),
  poll_count       INTEGER DEFAULT 0,
  initiated_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  receipt_data     JSONB,
  metadata         JSONB DEFAULT '{}'
);

CREATE INDEX idx_transactions_session ON transactions(session_id);
CREATE INDEX idx_transactions_ref     ON transactions(transaction_ref);
CREATE INDEX idx_transactions_status  ON transactions(status);

-- ─────────────────────────────────────────
-- MISMATCH LOGS
-- ─────────────────────────────────────────
CREATE TABLE mismatch_logs (
  id                SERIAL PRIMARY KEY,
  session_id        INTEGER REFERENCES trolley_sessions(id),
  trolley_item_id   INTEGER REFERENCES trolley_items(id),
  scanned_sku       VARCHAR(100),
  scanned_barcode   VARCHAR(100),
  detected_class    VARCHAR(100),
  confidence        DECIMAL(6,4),
  weight_delta      DECIMAL(10,2),
  expected_weight   DECIMAL(10,2),
  mismatch_type     VARCHAR(20) CHECK (mismatch_type IN ('vision','weight','both')),
  resolved          BOOLEAN DEFAULT FALSE,
  resolved_by       VARCHAR(100),
  resolved_at       TIMESTAMPTZ,
  resolution_notes  TEXT,
  raw_payload       JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mismatch_session  ON mismatch_logs(session_id);
CREATE INDEX idx_mismatch_resolved ON mismatch_logs(resolved);

-- ─────────────────────────────────────────
-- RECIPES
-- ─────────────────────────────────────────
CREATE TABLE recipes (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) UNIQUE NOT NULL,
  description  TEXT,
  servings     INTEGER DEFAULT 4,
  prep_time    INTEGER,
  cook_time    INTEGER,
  tags         TEXT[],
  image_url    VARCHAR(500),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recipe_items (
  id           SERIAL PRIMARY KEY,
  recipe_id    INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
  ingredient   VARCHAR(255) NOT NULL,
  quantity     DECIMAL(10,2),
  unit         VARCHAR(50),
  notes        TEXT,
  sort_order   INTEGER DEFAULT 0
);

CREATE INDEX idx_recipe_items_recipe ON recipe_items(recipe_id);

-- ─────────────────────────────────────────
-- TRIGGERS — keep updated_at fresh
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────
-- TRIGGER — recalculate session total
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION recalculate_session_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE trolley_sessions
  SET
    total_amount = (
      SELECT COALESCE(SUM(line_total), 0)
      FROM trolley_items
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
        AND status != 'removed'
    ),
    item_count = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM trolley_items
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
        AND status != 'removed'
    )
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_items_update_total
  AFTER INSERT OR UPDATE OR DELETE ON trolley_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_session_total();
