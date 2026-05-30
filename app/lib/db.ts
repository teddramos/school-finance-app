// lib/db.ts
export interface User {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'asistente' | 'empleado';
  name: string;
}

export interface Cuenta {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto';
  descripcion?: string;
}

export interface Movimiento {
  id: number;
  tipo: 'ingreso' | 'gasto';
  cuentaId: number;
  monto: number;
  fecha: string;
  descripcion?: string;
  periodo: string;
  usuario?: string;
  origen?: string;
  pagoId?: number;
}

export interface Hijo {
  id?: number;
  nombre: string;
  grado: string;
}

export interface DescuentoPerfil {
  id?: number;
  nombre: string;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
  activo: boolean;
}

export interface Padre {
  id: number;
  nombre: string;
  cedula: string;
  telefono: string;
  email: string;
  direccion: string;
  hijos: Hijo[];
  descuentos: DescuentoPerfil[];
  activo: boolean;
}

export interface Factura {
  id: number;
  padreId: number;
  periodo: string;
  monto: number;
  pagado: number;
  fecha: string;
  estado: 'pagado' | 'parcial' | 'pendiente';
}

export interface CargoAdicional {
  nombre: string;
  monto: number;
}

export interface DescuentoAdicional {
  nombre: string;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
}

export interface Pago {
  id: number;
  numRecibo: string;
  facturaId?: number;
  padreId: number;
  monto: number;
  fecha: string;
  forma: string;
  ref?: string;
  cardDigits?: string;
  obs?: string;
  facturasCubiertas: Array<{ id: number; periodo: string; monto: number; abono: number }>;
  usuario?: string;
  cargos: CargoAdicional[];
  descuentosPerfil: number;
  descuentosAdicionales: DescuentoAdicional[];
  montoBase: number;
}

export interface Config {
  nombre: string;
  rif: string;
  telefono: string;
  email: string;
  direccion: string;
  director: string;
  tarifa: number;
}

// --- Initial data (same as demo) ---
const INIT_USERS: User[] = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' },
  { id: 2, username: 'asistente', password: 'asist123', role: 'asistente', name: 'María López' },
  { id: 3, username: 'empleado', password: 'empl123', role: 'empleado', name: 'Carlos Ruiz' },
];

const INIT_CUENTAS: Cuenta[] = [
  { id: 1, nombre: 'Mensualidades Escolares', tipo: 'ingreso', descripcion: 'Cobros de mensualidad por alumno' },
  { id: 2, nombre: 'Inscripciones', tipo: 'ingreso', descripcion: 'Cobros de inscripción' },
  { id: 3, nombre: 'Actividades Extracurriculares', tipo: 'ingreso', descripcion: 'Ingresos por actividades' },
  { id: 4, nombre: 'Nómina Docente', tipo: 'gasto', descripcion: 'Pago a profesores' },
  { id: 5, nombre: 'Servicios Públicos', tipo: 'gasto', descripcion: 'Agua, luz, gas' },
  { id: 6, nombre: 'Mantenimiento', tipo: 'gasto', descripcion: 'Reparaciones' },
  { id: 7, nombre: 'Material Escolar', tipo: 'gasto', descripcion: 'Útiles y materiales' },
  { id: 8, nombre: 'Administración', tipo: 'gasto', descripcion: 'Gastos administrativos' },
];

const INIT_CONFIG: Config = {
  nombre: 'Colegio Las Palmas',
  rif: '001-23456-7',
  direccion: 'Carretera Las Palmas, Bonao, Monseñor Nouel',
  telefono: '809-832-9405',
  email: 'admin@colegiolaspalmas.edu',
  director: 'Prof. Ana Martínez',
  tarifa: 1500,
};

const INIT_PADRES: Padre[] = [
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
  {
    id: 106,
    nombre: 'Luisa Fernanda Matos',
    cedula: '001-6789012-3',
    telefono: '809-555-6006',
    email: 'luisa.matos@email.com',
    direccion: 'Residencial El Parque #8, Bonao',
    hijos: [
      { id: 1010, nombre: 'Isabella Matos', grado: '2do Primaria' },
      { id: 1011, nombre: 'Andrés Matos', grado: '4to Primaria' },
    ],
    descuentos: [{ id: 9004, nombre: 'Beca Excelencia', tipo: 'porcentaje', valor: 20, activo: true }],
    activo: true,
  },
  {
    id: 107,
    nombre: 'Francisco Jiménez Cruz',
    cedula: '001-7890123-4',
    telefono: '829-555-7007',
    email: 'francisco.jimenez@email.com',
    direccion: 'Calle Duarte #45, Bonao',
    hijos: [{ id: 1012, nombre: 'Gabriel Jiménez', grado: '3ro Primaria' }],
    descuentos: [],
    activo: true,
  },
  {
    id: 108,
    nombre: 'Rosa Elena Corporán',
    cedula: '001-8901234-5',
    telefono: '849-555-8008',
    email: 'rosa.corporan@email.com',
    direccion: 'Los Almendros, Bonao',
    hijos: [
      { id: 1013, nombre: 'Camila Corporán', grado: 'Kinder' },
      { id: 1014, nombre: 'Emilio Corporán', grado: '1ro Primaria' },
      { id: 1015, nombre: 'Natalia Corporán', grado: '3ro Primaria' },
    ],
    descuentos: [{ id: 9005, nombre: 'Descuento 3 Hijos', tipo: 'porcentaje', valor: 15, activo: true }],
    activo: true,
  },
  {
    id: 109,
    nombre: 'Ángel Ramírez Novas',
    cedula: '001-9012345-6',
    telefono: '809-555-9009',
    email: 'angel.ramirez@email.com',
    direccion: 'Villa Nueva, Bonao',
    hijos: [
      { id: 1016, nombre: 'Daniela Ramírez', grado: '5to Primaria' },
      { id: 1017, nombre: 'Marcos Ramírez', grado: '6to Primaria' },
    ],
    descuentos: [],
    activo: true,
  },
  {
    id: 110,
    nombre: 'Yolanda Almonte Tejeda',
    cedula: '001-0123456-7',
    telefono: '829-555-1010',
    email: 'yolanda.almonte@email.com',
    direccion: 'Urb. Los Pinos #3, Bonao',
    hijos: [{ id: 1018, nombre: 'Samuel Almonte', grado: '2do Primaria' }],
    descuentos: [{ id: 9006, nombre: 'Empleado Colegio', tipo: 'fijo', valor: 300, activo: true }],
    activo: true,
  },
  {
    id: 111,
    nombre: 'Héctor Manuel Guerrero',
    cedula: '002-1234567-8',
    telefono: '849-555-1111',
    email: 'hector.guerrero@email.com',
    direccion: 'Calle Sánchez #22, Bonao',
    hijos: [
      { id: 1019, nombre: 'Valeria Guerrero', grado: '4to Primaria' },
      { id: 1020, nombre: 'Tomás Guerrero', grado: 'Kinder' },
    ],
    descuentos: [],
    activo: true,
  },
  {
    id: 112,
    nombre: 'Patricia Núñez Báez',
    cedula: '002-2345678-9',
    telefono: '809-555-1212',
    email: 'patricia.nunez@email.com',
    direccion: 'Residencial Las Palmas #17, Bonao',
    hijos: [
      { id: 1021, nombre: 'Mateo Núñez', grado: '1ro Primaria' },
      { id: 1022, nombre: 'Lucía Núñez', grado: '3ro Primaria' },
      { id: 1023, nombre: 'Pablo Núñez', grado: '5to Primaria' },
    ],
    descuentos: [
      { id: 9007, nombre: 'Descuento 3 Hijos', tipo: 'porcentaje', valor: 15, activo: true },
      { id: 9008, nombre: 'Beca Académica', tipo: 'porcentaje', valor: 5, activo: true },
    ],
    activo: true,
  },
];


function generateFacturas(): Factura[] {
  const facturas: Factura[] = [];
  const now = new Date();
  const tarifa = INIT_CONFIG.tarifa;
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    for (const padre of INIT_PADRES) {
      const monto = padre.hijos.length * tarifa;
      facturas.push({
        id: Date.now() + Math.random() * 1000 + padre.id * i,
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

function generatePagos(facturas: Factura[]): Pago[] {
  const pagos: Pago[] = [];
  let reciboCounter = 1;
  for (const factura of facturas) {
    // Simular algunos pagos aleatorios (~65% pagados, algunos parciales)
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
        obs: 'Demo',
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

// --- In-memory state ---
let users: User[] = [...INIT_USERS];
let cuentas: Cuenta[] = [...INIT_CUENTAS];
let movimientos: Movimiento[] = [];
let padres: Padre[] = [...INIT_PADRES];
let facturas: Factura[] = generateFacturas();
let pagos: Pago[] = generatePagos(facturas);
let config: Config = { ...INIT_CONFIG };

// Initialize some demo movimientos from pagos
function initMovimientos() {
  const movs: Movimiento[] = [];
  const cuentaMens = cuentas.find(c => c.nombre.includes('Mensualidades')) || cuentas.find(c => c.tipo === 'ingreso');
  if (cuentaMens) {
    for (const pago of pagos) {
      const periodo = pago.fecha.slice(0, 7);
      movs.push({
        id: pago.id + 1000000,
        tipo: 'ingreso',
        cuentaId: cuentaMens.id,
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
  movimientos = movs;
}
initMovimientos();

// --- Getters and setters ---
export function getUsers(): User[] { return users; }
export function setUsers(newUsers: User[]) { users = newUsers; }

export function getCuentas(): Cuenta[] { return cuentas; }
export function setCuentas(newCuentas: Cuenta[]) { cuentas = newCuentas; }

export function getMovimientos(): Movimiento[] { return movimientos; }
export function setMovimientos(newMovimientos: Movimiento[]) { movimientos = newMovimientos; }

export function getPadres(): Padre[] { return padres; }
export function setPadres(newPadres: Padre[]) { padres = newPadres; }

export function getFacturas(): Factura[] { return facturas; }
export function setFacturas(newFacturas: Factura[]) { facturas = newFacturas; }

export function getPagos(): Pago[] { return pagos; }
export function setPagos(newPagos: Pago[]) { pagos = newPagos; }

export function getConfig(): Config { return config; }
export function setConfig(newConfig: Config) { config = newConfig; }