-- schema-seed.sql - Seed data for school-finance-app demo

-- Insert demo school
INSERT INTO colegios (id, nombre, rif, direccion, telefono, email, director, tarifa)
VALUES (1, 'Colegio Las Palmas', '001-23456-7', 'Carretera Las Palmas, Bonao, Monseñor Nouel', '809-832-9405', 'admin@colegiolaspalmas.edu', 'Prof. Ana Martínez', 1500)
ON CONFLICT (id) DO NOTHING;

-- Insert superadmin (global, no school)
INSERT INTO usuarios (id, username, password, name, role, colegio_id)
VALUES (1, 'superadmin', 'super2025', 'Super Administrador', 'superadmin', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert admin for Colegio Las Palmas
INSERT INTO usuarios (id, username, password, name, role, colegio_id)
VALUES (2, 'admin', 'admin123', 'Administrador', 'admin', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert asistente
INSERT INTO usuarios (id, username, password, name, role, colegio_id)
VALUES (3, 'asistente', 'asist123', 'María López', 'asistente', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert empleado
INSERT INTO usuarios (id, username, password, name, role, colegio_id)
VALUES (4, 'empleado', 'empl123', 'Carlos Ruiz', 'empleado', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert demo accounts
INSERT INTO cuentas (colegio_id, nombre, tipo, descripcion) VALUES
(1, 'Mensualidades Escolares', 'ingreso', 'Cobros de mensualidad por alumno'),
(1, 'Inscripciones', 'ingreso', 'Cobros de inscripción'),
(1, 'Actividades Extracurriculares', 'ingreso', 'Ingresos por actividades'),
(1, 'Nómina Docente', 'gasto', 'Pago a profesores'),
(1, 'Servicios Públicos', 'gasto', 'Agua, luz, gas'),
(1, 'Mantenimiento', 'gasto', 'Reparaciones'),
(1, 'Material Escolar', 'gasto', 'Útiles y materiales'),
(1, 'Administración', 'gasto', 'Gastos administrativos')
ON CONFLICT (colegio_id, nombre) DO NOTHING;

-- Insert children
INSERT INTO hijos (id, nombre, grado) VALUES
(1001, 'Luis Pérez', '3ro Primaria'),
(1002, 'Ana Pérez', '1ro Primaria'),
(1003, 'Carlos Santos', '5to Primaria'),
(1004, 'Sofía Familia', '2do Primaria'),
(1005, 'Miguel Familia', '4to Primaria'),
(1006, 'Paula Familia', 'Kinder'),
(1007, 'Diego Díaz', '6to Primaria'),
(1008, 'Laura Reyes', '2do Primaria'),
(1009, 'Andrés Reyes', 'Kinder'),
(1010, 'María Ventura', '4to Primaria')
ON CONFLICT (id) DO NOTHING;

-- Insert discount profiles
INSERT INTO descuentos_perfil (id, nombre, tipo, valor) VALUES
(9001, 'Beca Académica', 'porcentaje', 10),
(9002, 'Descuento 3 Hijos', 'porcentaje', 15),
(9003, 'Empleado Colegio', 'fijo', 300)
ON CONFLICT (id) DO NOTHING;

-- Insert parents
INSERT INTO padres (id, nombre, cedula, telefono, email, direccion, colegio_id) VALUES
(101, 'Juan Pérez García', '001-1234567-8', '829-555-1001', 'juan.perez@email.com', 'Calle 5, Bonao', 1),
(102, 'María Santos Rosario', '001-2345678-9', '849-555-2002', 'maria.santos@email.com', 'Av. Las Flores #12, Bonao', 1),
(103, 'Roberto Familia Núñez', '001-3456789-0', '809-555-3003', 'roberto.familia@email.com', 'Los Jardines, Bonao', 1),
(104, 'Carmen Díaz Marte', '001-4567890-1', '829-555-4004', 'carmen.diaz@email.com', 'Villa Sonador, Bonao', 1),
(105, 'Pedro Reyes Castillo', '001-5678901-2', '849-555-5005', 'pedro.reyes@email.com', 'Sabana Grande, Bonao', 1),
(106, 'Ana Ventura Lora', '001-6789012-3', '809-555-6006', 'ana.ventura@email.com', 'Centro, Bonao', 1)
ON CONFLICT (id) DO NOTHING;

-- Parent-Children relationships
INSERT INTO padres_hijos (padre_id, hijo_id) VALUES
(101, 1001), (101, 1002),
(102, 1003),
(103, 1004), (103, 1005), (103, 1006),
(104, 1007),
(105, 1008), (105, 1009),
(106, 1010)
ON CONFLICT DO NOTHING;

-- Parent-Discount relationships
INSERT INTO padres_descuentos (padre_id, descuento_id) VALUES
(101, 9001),
(103, 9002),
(104, 9003)
ON CONFLICT DO NOTHING;

-- Generate demo facturas (last 3 months)
DO $$
DECLARE
    tarifa_val NUMERIC(12,2) := 1500;
    now_dt DATE := CURRENT_DATE;
    y INTEGER;
    m INTEGER;
    padre_row RECORD;
    monto_padre NUMERIC(12,2);
    factura_id_val INTEGER;
BEGIN
    FOR i IN 0..2 LOOP
        y := EXTRACT(YEAR FROM now_dt - (i || ' months')::INTERVAL)::INTEGER;
        m := EXTRACT(MONTH FROM now_dt - (i || ' months')::INTERVAL)::INTEGER;
        FOR padre_row IN SELECT p.id, COUNT(*) as num_hijos FROM hijos h
            JOIN padres_hijos ph ON ph.hijo_id = h.id
            JOIN padres p ON p.id = ph.padre_id
            WHERE p.colegio_id = 1 AND p.activo = TRUE AND h.activo = TRUE
            GROUP BY p.id LOOP
            monto_padre := padre_row.num_hijos * tarifa_val;
            INSERT INTO facturas (colegio_id, padre_id, periodo, monto, pagado, fecha, estado)
            VALUES (1, padre_row.id, y || '-' || LPAD(m::TEXT, 2, '0'), monto_padre, 0, y || '-' || LPAD(m::TEXT, 2, '0') || '-01', 'pendiente')
            ON CONFLICT (padre_id, periodo) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;