-- ============================================================
-- school-app-db · Carga de datos DEMO (Colegio Las Palmas)
--
-- Reproduce exactamente los datos del demo en memoria:
--  · Colegio "Colegio Las Palmas" (configuración del demo)
--  · Usuarios: superadmin/super123, admin/admin123, asistente/asist123, empleado/empl123
--  · 8 cuentas contables, 12 padres con sus hijos y descuentos
--  · Facturas de los últimos 3 meses (hijos × tarifa 1500)
--  · Pagos de demostración (~67%) con recibos REC-DEMO-n y sus movimientos
--
-- ATENCIÓN: este script VACÍA las tablas antes de cargar (recarga limpia del demo).
-- Ejecutar DESPUÉS de db/schema.sql.
-- ============================================================

BEGIN;

TRUNCATE TABLE pago_facturas, movimientos, pagos, facturas, descuentos, hijos, padres,
               cuentas, usuarios, colegios RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------
-- Colegio principal (por defecto en el login)
-- ------------------------------------------------------------
INSERT INTO colegios (id, nombre, rif, telefono, email, direccion, director, tarifa) VALUES
(1, 'Colegio Las Palmas', '001-23456-7', '809-832-9405', 'admin@colegiolaspalmas.edu',
 'Carretera Las Palmas, Bonao, Monseñor Nouel', 'Prof. Ana Martínez', 1500);
SELECT setval(pg_get_serial_sequence('colegios','id'), (SELECT MAX(id) FROM colegios));

-- ------------------------------------------------------------
-- Usuarios (contraseñas cifradas con bcrypt/pgcrypto)
-- ------------------------------------------------------------
INSERT INTO usuarios (colegio_id, username, password, role, name) VALUES
(NULL,       'superadmin', crypt('super123',   gen_salt('bf', 10)), 'superadmin', 'Super Administrador'),
(1,          'admin',      crypt('admin123',   gen_salt('bf', 10)), 'admin',      'Administrador'),
(1,          'asistente',  crypt('asist123',   gen_salt('bf', 10)), 'asistente',  'María López'),
(1,          'empleado',   crypt('empl123',    gen_salt('bf', 10)), 'empleado',   'Carlos Ruiz');
SELECT setval(pg_get_serial_sequence('usuarios','id'), (SELECT MAX(id) FROM usuarios));

-- ------------------------------------------------------------
-- Cuentas contables
-- ------------------------------------------------------------
INSERT INTO cuentas (id, colegio_id, nombre, tipo, descripcion) VALUES
(1, 1, 'Mensualidades Escolares',        'ingreso', 'Cobros de mensualidad por alumno'),
(2, 1, 'Inscripciones',                  'ingreso', 'Cobros de inscripción'),
(3, 1, 'Actividades Extracurriculares',  'ingreso', 'Ingresos por actividades'),
(4, 1, 'Nómina Docente',                 'gasto',   'Pago a profesores'),
(5, 1, 'Servicios Públicos',             'gasto',   'Agua, luz, gas'),
(6, 1, 'Mantenimiento',                  'gasto',   'Reparaciones'),
(7, 1, 'Material Escolar',               'gasto',   'Útiles y materiales'),
(8, 1, 'Administración',                 'gasto',   'Gastos administrativos');
SELECT setval(pg_get_serial_sequence('cuentas','id'), (SELECT MAX(id) FROM cuentas));

-- ------------------------------------------------------------
-- Padres
-- ------------------------------------------------------------
INSERT INTO padres (id, colegio_id, nombre, cedula, telefono, email, direccion, activo) VALUES
(101, 1, 'Juan Pérez García',        '001-1234567-8', '829-555-1001', 'juan.perez@email.com',      'Calle 5, Bonao',                        TRUE),
(102, 1, 'María Santos Rosario',     '001-2345678-9', '849-555-2002', 'maria.santos@email.com',    'Av. Las Flores #12, Bonao',             TRUE),
(103, 1, 'Roberto Familia Núñez',    '001-3456789-0', '809-555-3003', 'roberto.familia@email.com', 'Los Jardines, Bonao',                   TRUE),
(104, 1, 'Carmen Díaz Marte',        '001-4567890-1', '829-555-4004', 'carmen.diaz@email.com',     'Villa Sonador, Bonao',                  TRUE),
(105, 1, 'Pedro Reyes Castillo',     '001-5678901-2', '849-555-5005', 'pedro.reyes@email.com',     'Urb. Palmas, Bonao',                    TRUE),
(106, 1, 'Luisa Fernanda Matos',     '001-6789012-3', '809-555-6006', 'luisa.matos@email.com',     'Residencial El Parque #8, Bonao',       TRUE),
(107, 1, 'Francisco Jiménez Cruz',   '001-7890123-4', '829-555-7007', 'francisco.jimenez@email.com','Calle Duarte #45, Bonao',              TRUE),
(108, 1, 'Rosa Elena Corporán',      '001-8901234-5', '849-555-8008', 'rosa.corporan@email.com',   'Los Almendros, Bonao',                  TRUE),
(109, 1, 'Ángel Ramírez Novas',      '001-9012345-6', '809-555-9009', 'angel.ramirez@email.com',   'Villa Nueva, Bonao',                    TRUE),
(110, 1, 'Yolanda Almonte Tejeda',   '001-0123456-7', '829-555-1010', 'yolanda.almonte@email.com', 'Urb. Los Pinos #3, Bonao',              TRUE),
(111, 1, 'Héctor Manuel Guerrero',   '002-1234567-8', '849-555-1111', 'hector.guerrero@email.com', 'Calle Sánchez #22, Bonao',              TRUE),
(112, 1, 'Patricia Núñez Báez',      '002-2345678-9', '809-555-1212', 'patricia.nunez@email.com',  'Residencial Las Palmas #17, Bonao',     TRUE);
SELECT setval(pg_get_serial_sequence('padres','id'), (SELECT MAX(id) FROM padres));

-- Hijos
INSERT INTO hijos (id, colegio_id, padre_id, nombre, grado) VALUES
(1001, 1, 101, 'Luis Pérez',        '3ro Primaria'),
(1002, 1, 101, 'Ana Pérez',         '1ro Primaria'),
(1003, 1, 102, 'Carlos Santos',     '5to Primaria'),
(1004, 1, 103, 'Sofía Familia',     '2do Primaria'),
(1005, 1, 103, 'Miguel Familia',    '4to Primaria'),
(1006, 1, 103, 'Paula Familia',     'Kinder'),
(1007, 1, 104, 'Diego Díaz',        '6to Primaria'),
(1008, 1, 105, 'Valentina Reyes',   'Kinder'),
(1009, 1, 105, 'Sebastián Reyes',   '1ro Primaria'),
(1010, 1, 106, 'Isabella Matos',    '2do Primaria'),
(1011, 1, 106, 'Andrés Matos',      '4to Primaria'),
(1012, 1, 107, 'Gabriel Jiménez',   '3ro Primaria'),
(1013, 1, 108, 'Camila Corporán',   'Kinder'),
(1014, 1, 108, 'Emilio Corporán',   '1ro Primaria'),
(1015, 1, 108, 'Natalia Corporán',  '3ro Primaria'),
(1016, 1, 109, 'Daniela Ramírez',   '5to Primaria'),
(1017, 1, 109, 'Marcos Ramírez',    '6to Primaria'),
(1018, 1, 110, 'Samuel Almonte',    '2do Primaria'),
(1019, 1, 111, 'Valeria Guerrero',  '4to Primaria'),
(1020, 1, 111, 'Tomás Guerrero',    'Kinder'),
(1021, 1, 112, 'Mateo Núñez',       '1ro Primaria'),
(1022, 1, 112, 'Lucía Núñez',       '3ro Primaria'),
(1023, 1, 112, 'Pablo Núñez',       '5to Primaria');
SELECT setval(pg_get_serial_sequence('hijos','id'), (SELECT MAX(id) FROM hijos));

-- Descuentos del perfil del padre
INSERT INTO descuentos (id, padre_id, nombre, tipo, valor, activo) VALUES
(9001, 101, 'Beca Académica',    'porcentaje', 10,  TRUE),
(9002, 103, 'Descuento 3 Hijos', 'porcentaje', 15,  TRUE),
(9003, 104, 'Empleado Colegio',  'fijo',       300, TRUE),
(9004, 106, 'Beca Excelencia',   'porcentaje', 20,  TRUE),
(9005, 108, 'Descuento 3 Hijos', 'porcentaje', 15,  TRUE),
(9006, 110, 'Empleado Colegio',  'fijo',       300, TRUE),
(9007, 112, 'Descuento 3 Hijos', 'porcentaje', 15,  TRUE),
(9008, 112, 'Beca Académica',    'porcentaje', 5,   TRUE);
SELECT setval(pg_get_serial_sequence('descuentos','id'), (SELECT MAX(id) FROM descuentos));

-- ------------------------------------------------------------
-- Facturas: últimos 3 meses, monto = nº hijos × tarifa del colegio
-- ------------------------------------------------------------
INSERT INTO facturas (colegio_id, padre_id, periodo, monto, pagado, fecha, estado)
SELECT p.colegio_id,
       p.id,
       to_char(m.mes, 'YYYY-MM'),
       (SELECT COUNT(*) FROM hijos h WHERE h.padre_id = p.id) * c.tarifa,
       0,
       m.mes::date,
       'pendiente'
FROM padres p
JOIN colegios c ON c.id = p.colegio_id
CROSS JOIN (
  SELECT (date_trunc('month', CURRENT_DATE) - (gs.i || ' month')::interval) AS mes
  FROM generate_series(2, 0, -1) AS gs(i)
) m;

-- ------------------------------------------------------------
-- Pagos de demostración (deterministas):
--   rn % 3 = 0 → sin pagar · rn % 3 = 1 → pago total · rn % 3 = 2 → pago parcial (50%)
-- ------------------------------------------------------------
WITH f AS (
  SELECT id, colegio_id, padre_id, periodo, monto, (periodo || '-10')::date AS fecha_pago,
         ROW_NUMBER() OVER (ORDER BY periodo, padre_id) AS rn
  FROM facturas
  WHERE colegio_id = 1
), pf AS (
  SELECT *,
         CASE WHEN rn % 3 = 1 THEN monto ELSE FLOOR(monto / 2) END AS abono,
         'REC-DEMO-' || ROW_NUMBER() OVER (ORDER BY periodo, padre_id) AS num_recibo
  FROM f
  WHERE rn % 3 <> 0
), ins AS (
  INSERT INTO pagos (colegio_id, num_recibo, padre_id, monto, monto_base, descuentos_perfil,
                     fecha, forma, ref, card_digits, obs, usuario, cargos, descuentos_adicionales)
  SELECT colegio_id, num_recibo, padre_id, abono, monto, 0,
         fecha_pago, 'efectivo', NULL, NULL, 'Pago de demostración', 'Sistema',
         '[]'::jsonb, '[]'::jsonb
  FROM pf
  RETURNING id, num_recibo
)
INSERT INTO pago_facturas (pago_id, factura_id, abono)
SELECT i.id, pf.id, pf.abono
FROM ins i JOIN pf ON pf.num_recibo = i.num_recibo;

-- Aplicar abonos a las facturas
UPDATE facturas f
SET pagado = pf.total,
    estado = CASE WHEN pf.total >= f.monto THEN 'pagado' ELSE 'parcial' END
FROM (
  SELECT factura_id, SUM(abono) AS total
  FROM pago_facturas
  GROUP BY factura_id
) pf
WHERE f.id = pf.factura_id;

-- ------------------------------------------------------------
-- Movimientos de ingreso generados por los cobros
-- ------------------------------------------------------------
INSERT INTO movimientos (colegio_id, tipo, cuenta_id, pago_id, monto, fecha, descripcion, periodo, usuario, origen)
SELECT p.colegio_id,
       'ingreso',
       (SELECT c.id FROM cuentas c
        WHERE c.colegio_id = p.colegio_id AND c.tipo = 'ingreso'
          AND c.nombre ILIKE '%mensualidad%'
        LIMIT 1),
       p.id, p.monto, p.fecha,
       'Mensualidad · ' || p.num_recibo,
       to_char(p.fecha, 'YYYY-MM'),
       p.usuario,
       'cobro'
FROM pagos p;

COMMIT;

-- Resumen de verificación
SELECT 'colegios' t, COUNT(*) n FROM colegios
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL SELECT 'cuentas', COUNT(*) FROM cuentas
UNION ALL SELECT 'padres', COUNT(*) FROM padres
UNION ALL SELECT 'hijos', COUNT(*) FROM hijos
UNION ALL SELECT 'descuentos', COUNT(*) FROM descuentos
UNION ALL SELECT 'facturas', COUNT(*) FROM facturas
UNION ALL SELECT 'pagos', COUNT(*) FROM pagos
UNION ALL SELECT 'pago_facturas', COUNT(*) FROM pago_facturas
UNION ALL SELECT 'movimientos', COUNT(*) FROM movimientos;
