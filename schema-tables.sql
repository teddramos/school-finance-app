-- schema-tables.sql - Table definitions for school-finance-app

CREATE TABLE IF NOT EXISTS colegios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    rif VARCHAR(50),
    direccion TEXT,
    telefono VARCHAR(50),
    email VARCHAR(255),
    director VARCHAR(255),
    tarifa NUMERIC(12,2) DEFAULT 1500,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin','admin','asistente','empleado')),
    colegio_id INTEGER REFERENCES colegios(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cuentas (
    id SERIAL PRIMARY KEY,
    colegio_id INTEGER REFERENCES colegios(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso','gasto')),
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(colegio_id, nombre)
);

CREATE TABLE IF NOT EXISTS hijos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    grado VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS descuentos_perfil (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('porcentaje','fijo')),
    valor NUMERIC(12,2) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS padres (
    id SERIAL PRIMARY KEY,
    colegio_id INTEGER REFERENCES colegios(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    cedula VARCHAR(50),
    telefono VARCHAR(50),
    email VARCHAR(255),
    direccion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(colegio_id, cedula)
);

CREATE TABLE IF NOT EXISTS facturas (
    id SERIAL PRIMARY KEY,
    colegio_id INTEGER REFERENCES colegios(id) ON DELETE CASCADE,
    padre_id INTEGER REFERENCES padres(id) ON DELETE CASCADE,
    periodo VARCHAR(7) NOT NULL,
    monto NUMERIC(12,2) NOT NULL DEFAULT 0,
    pagado NUMERIC(12,2) NOT NULL DEFAULT 0,
    fecha VARCHAR(10) NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('pagado','parcial','pendiente')) DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    colegio_id INTEGER REFERENCES colegios(id) ON DELETE CASCADE,
    num_recibo VARCHAR(100) UNIQUE NOT NULL,
    padre_id INTEGER REFERENCES padres(id) ON DELETE SET NULL,
    monto NUMERIC(12,2) NOT NULL,
    fecha VARCHAR(10) NOT NULL,
    forma VARCHAR(50) NOT NULL,
    ref VARCHAR(255),
    card_digits VARCHAR(10),
    obs TEXT,
    usuario VARCHAR(255),
    monto_base NUMERIC(12,2) DEFAULT 0,
    descuento_perfil NUMERIC(12,2) DEFAULT 0,
    cargos JSONB DEFAULT '[]',
    descuentos_adicionales JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facturas_cubiertas (
    pago_id INTEGER REFERENCES pagos(id) ON DELETE CASCADE,
    factura_id INTEGER REFERENCES facturas(id) ON DELETE CASCADE,
    abono NUMERIC(12,2) NOT NULL,
    PRIMARY KEY (pago_id, factura_id)
);

CREATE TABLE IF NOT EXISTS movimientos (
    id SERIAL PRIMARY KEY,
    colegio_id INTEGER REFERENCES colegios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso','gasto')),
    cuenta_id INTEGER REFERENCES cuentas(id) ON DELETE SET NULL,
    monto NUMERIC(12,2) NOT NULL,
    fecha VARCHAR(10) NOT NULL,
    descripcion TEXT,
    periodo VARCHAR(7) NOT NULL,
    usuario VARCHAR(255),
    origen VARCHAR(50) DEFAULT 'manual',
    pago_id INTEGER REFERENCES pagos(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_usuarios_colegio ON usuarios(colegio_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_cuentas_colegio ON cuentas(colegio_id);
CREATE INDEX IF NOT EXISTS idx_padres_colegio ON padres(colegio_id);
CREATE INDEX IF NOT EXISTS idx_facturas_colegio ON facturas(colegio_id);
CREATE INDEX IF NOT EXISTS idx_facturas_padre ON facturas(padre_id);
CREATE INDEX IF NOT EXISTS idx_pagos_colegio ON pagos(colegio_id);
CREATE INDEX IF NOT EXISTS idx_pagos_padre ON pagos(padre_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_colegio ON movimientos(colegio_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_periodo ON movimientos(periodo);
CREATE TABLE IF NOT EXISTS padres_hijos (
    padre_id INTEGER REFERENCES padres(id) ON DELETE CASCADE,
    hijo_id INTEGER REFERENCES hijos(id) ON DELETE CASCADE,
    PRIMARY KEY (padre_id, hijo_id)
);

CREATE TABLE IF NOT EXISTS padres_descuentos (
    padre_id INTEGER REFERENCES padres(id) ON DELETE CASCADE,
    descuento_id INTEGER REFERENCES descuentos_perfil(id) ON DELETE CASCADE,
    PRIMARY KEY (padre_id, descuento_id)
);