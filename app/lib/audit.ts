// lib/audit.ts
// Logs de auditoría para acciones sensibles.
// Por ahora va a consola / logs del servidor (no requiere cambios en BD).
// Si se quiere persistencia, se puede escribir a la tabla audit_log que se provee en el script SQL.

import type { SessionUser } from '@/types';

type AuditAction =
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'login_success'
  | 'colegio_disabled'
  | 'colegio_enabled'
  | 'config_updated'
  | 'account_created'
  | 'account_updated'
  | 'account_deleted'
  | 'movement_created'
  | 'movement_updated'
  | 'movement_deleted'
  | 'payment_registered'
  | 'pago_registrado'
  | 'padre_creado'
  | 'padre_actualizado'
  | 'padre_eliminado'
  | 'factura_creada'
  | 'facturas_generadas_automaticas'
  | 'configuracion_actualizada'
  | 'usuario_actualizado'
  | 'usuario_eliminado'
  | 'cuenta_actualizada'
  | 'cuenta_eliminada'
  | 'movimiento_creado'
  | 'movimiento_actualizado'
  | 'movimiento_eliminado'
  | 'colegio_creado'
  | 'colegio_actualizado';

export interface AuditEntryBase {
  action: AuditAction;
  actorId: number;
  actorName: string;
  actorRole: string;
  colegioId: number | null;
  colegioNombre: string | null;
  targetId?: number;
  targetType?: string;
  detail?: string;
}

export type AuditEntryWithSession = AuditEntryBase & {
  action: AuditAction;
};

function makeEntry(
  action: AuditAction,
  actorId: number,
  actorName: string,
  actorRole: string,
  colegioId: number | null,
  colegioNombre: string | null,
  targetId?: number,
  targetType?: string,
  detail?: string
): AuditEntryWithSession {
  return {
    action,
    actorId,
    actorName,
    actorRole,
    colegioId,
    colegioNombre,
    targetId,
    targetType,
    detail,
  };
}

function buildEntry(entryWithSession: AuditEntryWithSession): AuditEntryBase {
  return {
    action: entryWithSession.action,
    actorId: entryWithSession.actorId,
    actorName: entryWithSession.actorName,
    actorRole: entryWithSession.actorRole,
    colegioId: entryWithSession.colegioId,
    colegioNombre: entryWithSession.colegioNombre,
    targetId: entryWithSession.targetId,
    targetType: entryWithSession.targetType,
    detail: typeof entryWithSession.detail === 'string' ? entryWithSession.detail : undefined,
  };
}

function sanitizeDetail(detail?: string): string {
  if (!detail) return '';
  // Evita volcar payloads sensibles por accidente.
  return detail.slice(0, 1000);
}

function writeEntry(entry: AuditEntryWithSession): void {
  const e = buildEntry(entry);
  const out = {
    ts: new Date().toISOString(),
    ...e,
    detail: sanitizeDetail(e.detail),
  };
  console.log('[audit]', JSON.stringify(out));
}

export function auditLogFromSession(
  session: SessionUser,
  action: AuditAction,
  payload?: Record<string, unknown>
): void {
  const entry = makeEntry(
    action,
    session.id,
    session.name,
    session.role,
    session.colegioId,
    session.colegioNombre ?? null,
    undefined,
    undefined,
    payload ? JSON.stringify(payload) : undefined,
  );
  writeEntry(entry);
}

export function auditLog(entry: AuditEntryWithSession): void {
  writeEntry(entry);
}

