// types/index.ts

export type Role = 'superadmin' | 'admin' | 'asistente' | 'empleado';

// Sesión/usuario autenticado (lo que exponen /api/auth/me y se guarda en sesión)
export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: Role;
  colegioId: number | null;
  colegioNombre: string | null;
}

// Payload del JWT (coincide con lo que firma /api/auth/login)
export interface JWTPayload {
  id: number;
  username: string;
  role: Role;
  name: string;
  colegioId: number | null;
}

// Shared domain types
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
  origen?: 'manual' | 'cobro';
  pagoId?: number;
  cuentaNombre?: string;
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

export interface FacturaCubierta {
  id: number;
  periodo: string;
  monto: number;
  pagado: number;
  abono: number;
  estado: 'pagado' | 'parcial' | 'pendiente';
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
  facturasCubiertas: FacturaCubierta[];
  usuario?: string;
  cargos: CargoAdicional[];
  descuentosPerfil: number;
  descuentosAdicionales: DescuentoAdicional[];
  montoBase: number;
}

// Configuración del colegio (la que edita /api/config y se usa en UI)
export interface ColegioConfig {
  id: number;
  nombre: string;
  rif: string;
  telefono: string;
  email: string;
  direccion: string;
  director: string;
  tarifa: number;
  activo: boolean;
  logo_url: string;
}

// Claves de toast para usar con useToast()
export type ToastType = 'success' | 'error' | 'info';
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}