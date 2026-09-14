import type Database from 'better-sqlite3';
import { getSession } from './auth.js';

export function requireAuthenticatedUser(): NonNullable<ReturnType<typeof getSession>> {
  const session = getSession();
  if (!session) throw new Error('Authentication required.');
  return session;
}

export function requireRole(...allowedRoles: string[]): void {
  const session = requireAuthenticatedUser();
  if (!allowedRoles.includes(session.role)) throw new Error('Permission denied.');
}

export function hasPermission(
  database: Database.Database,
  permissionCode: string,
): boolean {
  const session = getSession();
  if (!session) return false;

  const permission = database.prepare(`
    SELECT 1
    FROM role_permissions
    INNER JOIN roles ON roles.id = role_permissions.role_id
    INNER JOIN permissions ON permissions.id = role_permissions.permission_id
    INNER JOIN users ON users.role_id = roles.id
    WHERE users.id = ? AND permissions.code = ?
  `).get(session.id, permissionCode);

  return permission !== undefined;
}

export function requirePermission(database: Database.Database, permissionCode: string): void {
  if (!hasPermission(database, permissionCode)) throw new Error('Permission denied.');
}
