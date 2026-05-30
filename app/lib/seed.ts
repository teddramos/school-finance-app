// lib/seed.ts
import { User, Cuenta, Config, Padre, Factura, Pago, Movimiento } from './db';

// Datos de usuarios de demostración
export const seedUsers: User[] = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' },
  { id: 2, username: 'asistente', password: 'asist123', role: 'asistente', name: 'María López' },
  { id: 3, username: 'empleado', password: 'empl123', role: 'empleado', name: 'Carlos Ruiz' },
];

// Datos de cuentas contables
export const seedCuentas: Cuenta[] = [
  { id: 1, nombre: 'Mensualidades Escolares', tipo: 'ingreso', descripcion: 'Cobros de mensualidad por alumno' },
  { id: 2, nombre: 'Inscripciones', tipo: 'ingreso', descripcion: 'Cobros de inscripción' },
  { id: 3, nombre: 'Actividades Extracurriculares', tipo: 'ingreso', descripcion: 'Ingresos por actividades' },
  { id: 4, nombre: 'Nómina Docente', tipo: 'gasto', descripcion: 'Pago a profesores' },
  { id: 5, nombre: 'Servicios Públicos', tipo: 'gasto', descripcion: 'Agua, luz, gas' },
  { id: 6, nombre: 'Mantenimiento', tipo: 'gasto', descripcion: 'Reparaciones' },
  { id: 7, nombre: 'Material Escolar', tipo: 'gasto', descripcion: 'Útiles y materiales' },
  { id: 8, nombre: 'Administración', tipo: 'gasto', descripcion: 'Gastos administrativos' },
];

// Configuración del colegio
export const seedConfig: Config = {
  nombre: 'Colegio Las Palmas',
  rif: '001-23456-7',
  direccion: 'Carretera Las Palmas, Bonao, Monseñor Nouel',
  telefono: '809-832-9405',
  email: 'admin@colegiolaspalmas.edu',
  director: 'Prof. Ana Martínez',
  tarifa: 1500,
};

// Datos de padres con hijos y descuentos
export const seedPadres: Padre[] = [
  {
    id: 101,
    nombre: 'Juan Pérez García',
    cedula: '001-1234567-8',
    telefono: '829-555-1001',
    email: 'juan.perez@email.com',
    direccion: 'Calle 5, Bonao',
    hijos: [
      { id: 1001, nombre: 'Luis Pérez', grado: '3ro Primaria' },
      { id: 1002, nombre: 'Ana Pérez', grado: '1ro Primaria' },
    ],
    descuentos: [{ id: 9001, nombre: 'Beca Académica', tipo: 'porcentaje', valor: 10, activo: true }],
    activo: true,
  },
  {
    id: 102,
    nombre: 'María Santos Rosario',
    cedula: '001-2345678-9',
    telefono: '849-555-2002',
    email: 'maria.santos@email.com',
    direccion: 'Av. Las Flores #12, Bonao',
    hijos: [{ id: 1003, nombre: 'Carlos Santos', grado: '5to Primaria' }],
    descuentos: [],
    activo: true,
  },
  {
    id: 103,
    nombre: 'Roberto Familia Núñez',
    cedula: '001-3456789-0',
    telefono: '809-555-3003',
    email: 'roberto.familia@email.com',
    direccion: 'Los Jardines, Bonao',
    hijos: [
      { id: 1004, nombre: 'Sofía Familia', grado: '2do Primaria' },
      { id: 1005, nombre: 'Miguel Familia', grado: '4to Primaria' },
      { id: 1006, nombre: 'Paula Familia', grado: 'Kinder' },
    ],
    descuentos: [{ id: 9002, nombre: 'Descuento 3 Hijos', tipo: 'porcentaje', valor: 15, activo: true }],
    activo: true,
  },
  {
    id: 104,
    nombre: 'Carmen Díaz Marte',
    cedula: '001-4567890-1',
    telefono: '829-555-4004',
    email: 'carmen.diaz@email.com',
    direccion: 'Villa Sonador, Bonao',
    hijos: [{ id: 1007, nombre: 'Diego Díaz', grado: '6to Primaria' }],
    descuentos: [{ id: 9003, nombre: 'Empleado Colegio', tipo: 'fijo', valor: 300, activo: true }],
    activo: true,
  },
  {
    id: 105,
    nombre: 'Pedro Reyes Castillo',
    cedula: '001-5678901-2',
    telefono: '849-555-5005',
    email: 'pedro.reyes@email.com',
    direccion: 'Urb. Palmas, Bonao',
    hijos: [
      { id: 1008, nombre: 'Valentina Reyes', grado: 'Kinder' },
      { id: 1009, nombre: 'Sebastián Reyes', grado: '1ro Primaria' },
    ],
    descuentos: [],
    activo: true,
  },
];

// Función para generar facturas de demostración (últimos 3 meses)
export function generateSeedFacturas(tarifa: number = 1500): Factura[] {
  const facturas: Factura[] = [];
  const now = new Date();
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    for (const padre of seedPadres) {
      const monto = padre.hijos.length * tarifa;
      facturas.push({
        id: Date.now() + Math.random() * 1000 + padre.id * (i + 1),
        padreId: padre.id,
        periodo,
        monto,
        pagado: 0,
        fecha: periodo + '-01',
        estado: 'pendiente',
      });
    }
  }
  return facturas;
}

// Función para generar pagos de demostración (algunas facturas pagadas total o parcialmente)
export function generateSeedPagos(facturas: Factura[]): Pago[] {
  const pagos: Pago[] = [];
  let reciboCounter = 1;
  for (const factura of facturas) {
    const r = Math.random();
    if (r > 0.35) {
      const monto = r > 0.7 ? factura.monto : Math.floor(factura.monto * 0.5);
      factura.pagado = monto;
      factura.estado = monto >= factura.monto ? 'pagado' : 'parcial';
      pagos.push({
        id: Date.now() + Math.random() * 1000 + factura.id,
        numRecibo: `REC-DEMO-${reciboCounter++}`,
        facturaId: factura.id,
        padreId: factura.padreId,
        monto,
        fecha: factura.periodo + '-10',
        forma: 'efectivo',
        obs: 'Pago de demostración',
        facturasCubiertas: [{ id: factura.id, periodo: factura.periodo, monto: factura.monto, abono: monto }],
        usuario: 'Sistema',
        cargos: [],
        descuentosPerfil: 0,
        descuentosAdicionales: [],
        montoBase: factura.monto,
      });
    }
  }
  return pagos;
}

// Función para generar movimientos a partir de los pagos
export function generateSeedMovimientos(pagos: Pago[], cuentas: Cuenta[]): Movimiento[] {
  const movimientos: Movimiento[] = [];
  const cuentaMensualidad = cuentas.find(c => c.nombre.includes('Mensualidades')) || cuentas.find(c => c.tipo === 'ingreso');
  if (cuentaMensualidad) {
    for (const pago of pagos) {
      const periodo = pago.fecha.slice(0, 7);
      movimientos.push({
        id: pago.id + 1000000,
        tipo: 'ingreso',
        cuentaId: cuentaMensualidad.id,
        monto: pago.monto,
        fecha: pago.fecha,
        descripcion: `Mensualidad · ${pago.numRecibo}`,
        periodo,
        usuario: pago.usuario,
        origen: 'cobro',
        pagoId: pago.id,
      });
    }
  }
  return movimientos;
}

// Objeto que agrupa todos los datos de semilla (útil para inicialización)
export const seedData = {
  users: seedUsers,
  cuentas: seedCuentas,
  config: seedConfig,
  padres: seedPadres,
  facturas: generateSeedFacturas(seedConfig.tarifa),
  pagos: [] as Pago[], // se generarán después de facturas
  movimientos: [] as Movimiento[],
};

// Inicialización completa (se puede llamar desde db.ts)
export function initializeSeedData() {
  const facturas = generateSeedFacturas(seedConfig.tarifa);
  const pagos = generateSeedPagos(facturas);
  const cuentas = seedCuentas;
  const movimientos = generateSeedMovimientos(pagos, cuentas);
  return {
    users: seedUsers,
    cuentas: seedCuentas,
    config: seedConfig,
    padres: seedPadres,
    facturas,
    pagos,
    movimientos,
  };
}