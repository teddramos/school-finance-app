// types/index.ts - Type definitions

export interface User {
  id: number;
  username: string;
  password: string;
  role: 'superadmin' | 'admin' | 'asistente' | 'empleado';
  name: string;
  colegioId?: number | null;
}

export interface Colegio {
  id: number;
  nombre: string;
  rif: string;
  direccion: string;
  telefono: string;
  email: string;
  director: string;
  tarifa: number;
  activo: boolean;
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

export interface JWTPayload {
  id: number;
  username: string;
  role: string;
  name: string;
  colegioId?: number | null;
}