import type Database from 'better-sqlite3';
import { getSession } from '../auth.js';

export function recordAudit(
  database: Database.Database,
  action: string,
  entity: string,
  entityId?: number | string | null,
  details?: string | null,
): void {
  const session = getSession();
  database.prepare(`
    INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(session?.id ?? null, action, entity, entityId === null || entityId === undefined ? null : String(entityId), details ?? null, new Date().toISOString());
}
