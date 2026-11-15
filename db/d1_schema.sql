-- Cloudflare D1 Schema for POWERUP SUN NOVA Gaming Recharge Marketplace

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  wallet_balance_inr INTEGER NOT NULL DEFAULT 0,
  cashback_balance_inr INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_player_ids (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  game_slug TEXT NOT NULL,
  player_id TEXT NOT NULL,
  secondary_id TEXT,
  label TEXT,
  verified_nickname TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  is_configured INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 0,
  commission_rate_pct REAL NOT NULL DEFAULT 2.0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  kind TEXT NOT NULL,
  category TEXT NOT NULL,
  region_label TEXT NOT NULL,
  region_restriction TEXT,
  supplier_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  section_tags TEXT NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  game_slug TEXT NOT NULL,
  label TEXT NOT NULL,
  bonus_label TEXT,
  cost_price_inr INTEGER NOT NULL,
  selling_price_inr INTEGER NOT NULL,
  original_price_inr INTEGER,
  cashback_percent REAL NOT NULL DEFAULT 2.0,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (game_slug) REFERENCES games(slug)
);

CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  customer_id TEXT,
  customer_email TEXT NOT NULL,
  status TEXT NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  gateway_payment_id TEXT,
  gateway_fee_inr INTEGER NOT NULL DEFAULT 0,
  supplier_id TEXT NOT NULL,
  supplier_txn_id TEXT,
  supplier_locked INTEGER NOT NULL DEFAULT 0,
  subtotal_inr INTEGER NOT NULL,
  discount_inr INTEGER NOT NULL DEFAULT 0,
  total_inr INTEGER NOT NULL,
  total_cost_inr INTEGER NOT NULL,
  cashback_earned_inr INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
  refund_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  amount_inr INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  txn_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_inr INTEGER NOT NULL,
  reference_id TEXT,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  cta_label TEXT NOT NULL,
  target_slug TEXT,
  image_url TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);
