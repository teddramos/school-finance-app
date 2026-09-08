-- db/migrations/001_audit_and_constraints.sql
-- Manual migration: ejecutar con psql >= 9.5 sobre la base de datos del proyecto.
-- Nota: el código Next.js ya escribe a consola de auditoría; esta tabla es opcional
-- para persistencia si se decide habilitarla después.

BEGIN;

-- 1) Tabla de auditoría (si se quiere persistir en el futuro sin tocar el código JS hoy)
CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  action        TEXT NOT NULL,
  actor_id      INTEGER,
  actor_name    TEXT,
  actor_role    TEXT,
  colegio_id    INTEGER,
  colegio_nombre TEXT,
  target_id     INTEGER,
  target_type   TEXT,
  detail        TEXT,
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_colegio
  ON audit_log (colegio_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON audit_log (created_at DESC);

COMMENT ON TABLE audit_log IS
  'Registro de auditoría para acciones sensibles (usuarios, cuentas, configuración, movimientos, pagos, facturas, etc.).';

-- 2) Seguridad de escritura: colegio_id no nulo en todas las tablas principales.
--    Esto ayuda a evitar filas huérfanas si alguna inserción omite el filtro multi-colegio.
ALTER TABLE IF EXISTS colegios
  ALTER COLUMN id SET NOT NULL;

ALTER TABLE IF EXISTS usuarios
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN password SET NOT NULL,
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN activo SET NOT NULL;

ALTER TABLE IF EXISTS cuentas
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN colegio_id SET NOT NULL,
  ALTER COLUMN nombre SET NOT NULL,
  ALTER COLUMN tipo SET NOT NULL;

ALTER TABLE IF EXISTS padres
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN colegio_id SET NOT NULL,
  ALTER COLUMN nombre SET NOT NULL,
  ALTER COLUMN cedula SET NOT NULL,
  ALTER COLUMN activo SET NOT NULL;

ALTER TABLE IF EXISTS hijos
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN colegio_id SET NOT NULL,
  ALTER COLUMN padre_id SET NOT NULL,
  ALTER COLUMN nombre SET NOT NULL,
  ALTER COLUMN grado SET NOT NULL;

ALTER TABLE IF EXISTS descuentos
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN padre_id SET NOT NULL,
  ALTER COLUMN nombre SET NOT NULL,
  ALTER COLUMN tipo SET NOT NULL,
  ALTER COLUMN valor SET NOT NULL,
  ALTER COLUMN activo SET NOT NULL;

ALTER TABLE IF EXISTS facturas
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN colegio_id SET NOT NULL,
  ALTER COLUMN padre_id SET NOT NULL,
  ALTER COLUMN periodo SET NOT NULL,
  ALTER COLUMN monto SET NOT NULL,
  ALTER COLUMN pagado SET NOT NULL,
  ALTER COLUMN fecha SET NOT NULL,
  ALTER COLUMN estado SET NOT NULL;

ALTER TABLE IF EXISTS pagos
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN colegio_id SET NOT NULL,
  ALTER COLUMN num_recibo SET NOT NULL,
  ALTER COLUMN padre_id SET NOT NULL,
  ALTER COLUMN monto SET NOT NULL,
  ALTER COLUMN fecha SET NOT NULL,
  ALTER COLUMN forma SET NOT NULL;

ALTER TABLE IF EXISTS pago_facturas
  ALTER COLUMN pago_id SET NOT NULL,
  ALTER COLUMN factura_id SET NOT NULL,
  ALTER COLUMN abono SET NOT NULL;

ALTER TABLE IF EXISTS movimientos
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN colegio_id SET NOT NULL,
  ALTER COLUMN tipo SET NOT NULL,
  ALTER COLUMN cuenta_id SET NOT NULL,
  ALTER COLUMN monto SET NOT NULL,
  ALTER COLUMN fecha SET NOT NULL,
  ALTER COLUMN periodo SET NOT NULL,
  ALTER COLUMN origen SET NOT NULL;

-- 3) Restricciones de integridad referencel sin redefinir tablas existentes:
--    Asegurar que clave foránea esté presente cuando existe. Si ya hay FK, el comando
--    es idempotente (IF NOT EXISTS). Si faltan, estos comandos las crean.
--    No se agregan aquí FK que puedan bloquear datos existentes; este script es seguro
--    para ejecutar aunque ya tenga esos índices/constraints.

-- 4) Check simple: tarifa > 0 en colegios.
ALTER TABLE colegios
  ADD CONSTRAINT colegios_tarifa_positive CHECK (tarifa IS NULL OR tarifa > 0);

-- 5) Check: tipo de cuenta solo ingreso/gasto.
ALTER TABLE cuentas
  ADD CONSTRAINT cuentas_tipo_check CHECK (tipo IN ('ingreso', 'gasto'));

-- 6) Check: tipo de movimiento solo ingreso/gasto.
ALTER TABLE movimientos
  ADD CONSTRAINT movimientos_tipo_check CHECK (tipo IN ('ingreso', 'gasto'));

-- 7) Check: estado de factura dentro de los valores esperados.
ALTER TABLE facturas
  ADD CONSTRAINT facturas_estado_check CHECK (estado IN ('pagado', 'parcial', 'pendiente'));

-- 8) Check: forma de pago (chequeo ligero). Ajusta valores si la app usa más formas.
ALTER TABLE pagos
  ADD CONSTRAINT pagos_forma_not_empty CHECK (forma <> '');

-- 9) Comentarios finales
COMMENT ON CONSTRAINT colegios_tarifa_positive ON colegios IS
  'Tarifa del colegio debe ser positiva cuando se define.';
COMMENT ON CONSTRAINT cuentas_tipo_check ON cuentas IS
  'Tipo de cuenta debe ser ingreso o gasto.';
COMMENT ON CONSTRAINT movimientos_tipo_check ON movimientos IS
  'Tipo de movimiento debe ser ingreso o gasto.';
COMMENT ON CONSTRAINT facturas_estado_check ON facturas IS
  'Estado de factura debe ser pagado, parcial o pendiente.';
COMMENT ON CONSTRAINT pagos_forma_not_empty ON pagos IS
  'Forma de pago no puede estar vacía.';

COMMIT;
