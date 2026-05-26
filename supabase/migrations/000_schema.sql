-- ─────────────────────────────────────────────────────────────────────────────
-- MTS Ticketera — Schema completo
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tipos ───────────────────────────────────────────────────────────────────
CREATE TYPE event_status   AS ENUM ('draft', 'published', 'cancelled', 'finished');
CREATE TYPE order_status   AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE ticket_status  AS ENUM ('active', 'used', 'cancelled', 'pending');
CREATE TYPE scan_result    AS ENUM ('valid', 'already_used', 'invalid', 'expired');

-- ─── Tablas ──────────────────────────────────────────────────────────────────

CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  date        TIMESTAMPTZ NOT NULL,
  venue       TEXT NOT NULL,
  city        TEXT NOT NULL,
  image_url   TEXT,
  status      event_status NOT NULL DEFAULT 'draft',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ticket_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  price      NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  total_qty  INT NOT NULL CHECK (total_qty > 0),
  sold_qty   INT NOT NULL DEFAULT 0 CHECK (sold_qty >= 0),
  sale_start TIMESTAMPTZ,
  sale_end   TIMESTAMPTZ
);

CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID NOT NULL REFERENCES events(id),
  buyer_name       TEXT NOT NULL,
  buyer_email      TEXT NOT NULL,
  buyer_dni        TEXT NOT NULL,
  total_amount     NUMERIC(10,2) NOT NULL,
  service_fee      NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           order_status NOT NULL DEFAULT 'pending',
  mp_payment_id    TEXT,
  mp_preference_id TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at          TIMESTAMPTZ
);

CREATE TABLE tickets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id),
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
  event_id       UUID NOT NULL REFERENCES events(id),
  qr_token       TEXT NOT NULL UNIQUE,
  status         ticket_status NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scan_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID REFERENCES tickets(id),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_id  TEXT NOT NULL DEFAULT '',
  result     scan_result NOT NULL
);

-- ─── Índices ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_events_status          ON events(status);
CREATE INDEX idx_ticket_types_event_id  ON ticket_types(event_id);
CREATE INDEX idx_orders_status          ON orders(status);
CREATE INDEX idx_orders_mp_payment_id   ON orders(mp_payment_id);
CREATE INDEX idx_tickets_order_id       ON tickets(order_id);
CREATE INDEX idx_tickets_event_id       ON tickets(event_id);
CREATE INDEX idx_tickets_status         ON tickets(status);
CREATE INDEX idx_scan_logs_ticket_id    ON scan_logs(ticket_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs    ENABLE ROW LEVEL SECURITY;

-- events: lectura pública de eventos publicados; escritura solo service_role
CREATE POLICY "events_public_read"
  ON events FOR SELECT
  USING (status = 'published');

CREATE POLICY "events_service_all"
  ON events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ticket_types: lectura pública; escritura solo service_role
CREATE POLICY "ticket_types_public_read"
  ON ticket_types FOR SELECT
  USING (true);

CREATE POLICY "ticket_types_service_all"
  ON ticket_types FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- orders: inserción pública (durante compra); el resto solo service_role
CREATE POLICY "orders_public_insert"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "orders_service_all"
  ON orders FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- tickets: solo service_role
CREATE POLICY "tickets_service_all"
  ON tickets FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- scan_logs: solo service_role
CREATE POLICY "scan_logs_service_all"
  ON scan_logs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
