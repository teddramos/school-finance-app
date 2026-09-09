// lib/audit.ts
// Logs de auditoría para acciones sensibles.
// Se persisten en la tabla audit_log (ver db/migrations/001_audit_and_constraints.sql).
// También se escriben a consola para seguimiento en tiempo real.

import type { SessionUser } from '@/types';

type AuditAction =
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'login_success'
  | 'login_failed'
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
  actorId: number | null;
  actorName: string | null;
  actorRole: string | null;
  colegioId: number | null;
  colegioNombre: string | null;
  targetId?: number | null;
  targetType?: string;
  detail?: string;
}

export type AuditEntryWithSession = AuditEntryBase & {
  action: AuditAction;
};

function makeEntry(
  action: AuditAction,
  actorId: number | null,
  actorName: string | null,
  actorRole: string | null,
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

// Usa import dinámico del pool para evitar dependencia circular con lib/db.ts
async function getPool() {
  const { pool } = await import('@/lib/db');
  return pool;
}

async function writeEntry(entry: AuditEntryWithSession): Promise<void> {
  const e = buildEntry(entry);
  const out = {
    ts: new Date().toISOString(),
    ...e,
    detail: sanitizeDetail(e.detail),
  };
  console.log('[audit]', JSON.stringify(out));

  try {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO audit_log
         (action, actor_id, actor_name, actor_role, colegio_id, colegio_nombre, target_id, target_type, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        e.action,
        e.actorId,
        e.actorName,
        e.actorRole,
        e.colegioId,
        e.colegioNombre,
        e.targetId ?? null,
        e.targetType ?? null,
        sanitizeDetail(e.detail) || null,
      ]
    );
  } catch (err) {
    // No romper la operación principal por un fallo de auditoría.
    console.error('[audit] Error al guardar audit_log:', err);
  }
}

export async function auditLogFromSession(
  session: SessionUser,
  action: AuditAction,
  payload?: Record<string, unknown>
): Promise<void> {
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
  await writeEntry(entry);
}

export async function auditLog(entry: AuditEntryWithSession): Promise<void> {
  await writeEntry(entry);
}