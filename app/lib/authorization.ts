// lib/authorization.ts
// Helpers centralizados para permisos y sesión.
import type { SessionUser, Role } from '@/types';
import { getSession } from '@/lib/auth';
import { NextResponse } from 'next/server';


export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Super Administrador',
  admin: 'Administrador',
  asistente: 'Asistente',
  empleado: 'Empleado',
};

/**
 * Distingue roles que pueden gestionar la configuración y usuarios del sistema.
 * En este proyecto eso es superadmin (global) y admin (de un colegio).
 */
export function isConfigRole(role: Role): boolean {
  return role === 'superadmin' || role === 'admin';
}

/**
 * Distingue roles que pueden operar módulos de cobro/movimientos (admin, asistente, superadmin).
 */
export function canOperateFinance(role: Role): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'asistente';
}

/**
 * Roles que pueden registrar pagos y gestionar padres/facturas.
 */
export function canManageColegioData(role: Role): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'asistente';
}

/**
 * Roles que pueden ver reportes y movimientos (empleado puede ver reportes según UI actual).
 * Este helper es conservative; ajusta según el comportamiento que quieras habilitar.
 */
export function canViewReports(role: Role): boolean {
  return role !== 'empleado' || true; // empleado sigue teniendo acceso a reportes
}

/**
 * Compara que el usuario tiene alcance sobre un colegio dado.
 * - superadmin tiene alcance global
 * - admin solo tiene alcance sobre su colegio asignado
 */
export function hasColegioScope(user: SessionUser, colegioId: number | null): boolean {
  if (user.role === 'superadmin') return true;
  return user.colegioId === colegioId;
}

/**
 * Construye un mensaje de error genérico para acciones no autorizadas.
 * Útil para responder de forma consistente desde API routes.
 */
export function unauthorized(colegioId?: number): string {
  if (colegioId) {
    return 'No autorizado para este colegio';
  }
  return 'No autorizado';
}

/**
 * Middleware helper: lee la sesión y rechaza si no tiene uno de los roles indicados.
 * Devuelve la sesión resuelta o null.
 */
export async function requireRole(
  request: Request,
  roles: Role[]
): Promise<SessionUser | null> {
  const session = await getSession(request);
  if (!session || !roles.includes(session.role)) {
    return null;
  }
  return session;
}

/**
 * Middleware helper: rechaza si no hay sesión autenticada (cualquier rol).
 */
export async function requireAuthenticated(
  request: Request
): Promise<SessionUser | null> {
  const session = await getSession(request);
  if (!session) {
    return null;
  }
  return session;
}

/**
 * Convierte JWTPayload → SessionUser.
 * Útil en handlers que reciben el payload del JWT y necesitan el shape completo.
 */
export async function sessionUserFromPayload(
  payload: JWTPayload
): Promise<SessionUser> {
  const colegio = payload.colegioId ? await getColegioNombre(payload.colegioId) : null;
  return {
    id: payload.id,
    username: payload.username,
    name: payload.name,
    role: payload.role,
    colegioId: payload.colegioId,
    colegioNombre: colegio,
  };
}

async function getColegioNombre(id: number): Promise<string | null> {
  try {
    const { getColegioById } = await import('@/lib/db');
    const colegio = await getColegioById(id);
    return colegio?.nombre ?? null;
  } catch {
    return null;
  }
}

import type { JWTPayload } from '@/lib/auth';

