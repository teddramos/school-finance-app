-- ============================================================
-- school-app-db · Esquema de base de datos (PostgreSQL)
-- Sistema Financiero Escolar multi-colegio
--
-- Ejecutar:  psql "host=... port=... dbname=school-app-db user=..." -f db/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- COLEGIOS (tenant raíz)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS colegios (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL UNIQUE,
  rif         VARCHAR(30)  NOT NULL DEFAULT '',
  telefono    VARCHAR(40)  NOT NULL DEFAULT '',
  email       VARCHAR(120) NOT NULL DEFAULT '',
  direccion   VARCHAR(250) NOT NULL DEFAULT '',
  director    VARCHAR(150) NOT NULL DEFAULT '',
  tarifa      NUMERIC(12,2) NOT NULL DEFAULT 1500 CHECK (tarifa >= 0),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  logo_url    TEXT NOT NULL DEFAULT '',
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- USUARIOS (N-1 con colegios; superadmin sin colegio)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  colegio_id  INT REFERENCES colegios(id) ON DELETE CASCADE,
  username    VARCHAR(60) NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('superadmin','admin','asistente','empleado')),
  name        VARCHAR(150) NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_colegio_req_chk CHECK (role = 'superadmin' OR colegio_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_usuarios_colegio ON usuarios(colegio_id);

-- ------------------------------------------------------------
-- CUENTAS CONTABLES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cuentas (
  id          SERIAL PRIMARY KEY,
  colegio_id  INT NOT NULL REFERENCES colegios(id) ON DELETE CASCADE,
  nombre      VARCHAR(150) NOT NULL,
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso','gasto')),
  descripcion VARCHAR(250) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_cuentas_colegio ON cuentas(colegio_id);

-- ------------------------------------------------------------
-- PADRES / TUTORES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS padres (
  id          SERIAL PRIMARY KEY,
  colegio_id  INT NOT NULL REFERENCES colegios(id) ON DELETE CASCADE,
  nombre      VARCHAR(150) NOT NULL,
  cedula      VARCHAR(30) NOT NULL,
  telefono    VARCHAR(40) NOT NULL DEFAULT '',
  email       VARCHAR(120) NOT NULL DEFAULT '',
  direccion   VARCHAR(250) NOT NULL DEFAULT '',
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (colegio_id, cedula)
);
CREATE INDEX IF NOT EXISTS idx_padres_colegio ON padres(colegio_id);

-- HIJOS (un padre tiene muchos hijos)
CREATE TABLE IF NOT EXISTS hijos (
  id          SERIAL PRIMARY KEY,
  colegio_id  INT NOT NULL REFERENCES colegios(id) ON DELETE CASCADE,
  padre_id    INT NOT NULL REFERENCES padres(id) ON DELETE CASCADE,
  nombre      VARCHAR(150) NOT NULL,
  grado       VARCHAR(50) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_hijos_padre ON hijos(padre_id);

-- DESCUENTOS DEL PERFIL DEL PADRE
CREATE TABLE IF NOT EXISTS descuentos (
  id          SERIAL PRIMARY KEY,
  padre_id    INT NOT NULL REFERENCES padres(id) ON DELETE CASCADE,
  nombre      VARCHAR(150) NOT NULL,
  tipo        VARCHAR(12) NOT NULL CHECK (tipo IN ('porcentaje','fijo')),
  valor       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  activo      BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_descuentos_padre ON descuentos(padre_id);

-- ------------------------------------------------------------
-- FACTURAS (mensualidades por padre y período)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturas (
  id          SERIAL PRIMARY KEY,
  colegio_id  INT NOT NULL REFERENCES colegios(id) ON DELETE CASCADE,
  padre_id    INT NOT NULL REFERENCES padres(id) ON DELETE CASCADE,
  periodo     CHAR(7) NOT NULL,               -- YYYY-MM
  monto       NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  pagado      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (pagado >= 0),
  fecha       DATE NOT NULL,
  estado      VARCHAR(10) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pagado','parcial','pendiente')),
  UNIQUE (colegio_id, padre_id, periodo),
  CONSTRAINT facturas_pagado_chk CHECK (pagado <= monto)
);
CREATE INDEX IF NOT EXISTS idx_facturas_colegio_periodo ON facturas(colegio_id, periodo);
CREATE INDEX IF NOT EXISTS idx_facturas_padre ON facturas(padre_id);

-- ------------------------------------------------------------
-- PAGOS (recibos de caja)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
  id             SERIAL PRIMARY KEY,
  colegio_id     INT NOT NULL REFERENCES colegios(id) ON DELETE CASCADE,
  num_recibo     VARCHAR(40) NOT NULL,
  padre_id       INT NOT NULL REFERENCES padres(id) ON DELETE CASCADE,
  monto          NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  monto_base     NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuentos_perfil NUMERIC(12,2) NOT NULL DEFAULT 0,
  fecha          DATE NOT NULL,
  forma          VARCHAR(30) NOT NULL DEFAULT 'efectivo',
  ref            VARCHAR(80),
  card_digits    VARCHAR(4),
  obs            TEXT,
  usuario        VARCHAR(150),
  cargos         JSONB NOT NULL DEFAULT '[]'::jsonb,            -- [{nombre, monto}]
  descuentos_adicionales JSONB NOT NULL DEFAULT '[]'::jsonb     -- [{nombre, tipo, valor}]
);
CREATE INDEX IF NOT EXISTS idx_pagos_colegio ON pagos(colegio_id);
CREATE INDEX IF NOT EXISTS idx_pagos_padre ON pagos(padre_id);

-- PAGO ↔ FACTURA (muchos a muchos: un pago cubre varias facturas;
-- una factura puede recibir abonos de varios pagos)
CREATE TABLE IF NOT EXISTS pago_facturas (
  pago_id     INT NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
  factura_id  INT NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  abono       NUMERIC(12,2) NOT NULL CHECK (abono > 0),
  PRIMARY KEY (pago_id, factura_id)
);
CREATE INDEX IF NOT EXISTS idx_pago_facturas_factura ON pago_facturas(factura_id);

-- ------------------------------------------------------------
-- MOVIMIENTOS CONTABLES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos (
  id          SERIAL PRIMARY KEY,
  colegio_id  INT NOT NULL REFERENCES colegios(id) ON DELETE CASCADE,
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso','gasto')),
  cuenta_id   INT NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  pago_id     INT REFERENCES pagos(id) ON DELETE SET NULL,
  monto       NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha       DATE NOT NULL,
  descripcion VARCHAR(250) NOT NULL DEFAULT '',
  periodo     CHAR(7) NOT NULL,               -- YYYY-MM
  usuario     VARCHAR(150),
  origen      VARCHAR(20)                     -- 'manual' | 'cobro'
);
CREATE INDEX IF NOT EXISTS idx_movimientos_colegio_periodo ON movimientos(colegio_id, periodo);
CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta ON movimientos(cuenta_id);
