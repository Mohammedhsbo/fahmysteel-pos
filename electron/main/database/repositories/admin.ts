import type Database from 'better-sqlite3';
import { hashPassword } from '../../auth.js';
import { recordAudit } from '../audit.js';
import type { AppSetting, UserRecord } from '../../../../shared/admin.js';

export function listUsers(database: Database.Database): UserRecord[] {
  return database.prepare(`
    SELECT
      users.id,
      users.username,
      users.display_name AS displayName,
      roles.code AS role,
      users.is_active AS isActive,
      users.created_at AS createdAt,
      users.last_login_at AS lastLoginAt,
      users.failed_login_count AS failedLoginCount
    FROM users
    INNER JOIN roles ON roles.id = users.role_id
    ORDER BY users.id ASC
  `).all() as UserRecord[];
}

export function createUser(database: Database.Database, input: { username: string; displayName: string; password: string; role: 'ADMIN' | 'CASHIER' }): UserRecord {
  const username = input.username.trim();
  const displayName = input.displayName.trim();
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) throw new Error('Username must be 3-64 characters and use letters, numbers, dots, underscores, or hyphens.');
  if (displayName.length < 2 || displayName.length > 100) throw new Error('Display name must be between 2 and 100 characters.');
  if (input.password.length < 8 || input.password.length > 128) throw new Error('Password must be between 8 and 128 characters.');

  const role = database.prepare('SELECT id FROM roles WHERE code = ?').get(input.role) as { id: number } | undefined;
  if (!role) throw new Error('Selected role is not configured.');

  const existing = database.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (existing) throw new Error('Username already exists.');

  const now = new Date().toISOString();
  const result = database.prepare(`
    INSERT INTO users (username, display_name, password_hash, role_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(username, displayName, hashPassword(input.password), role.id, now, now);

  const user = getUserById(database, Number(result.lastInsertRowid))!;
  recordAudit(database, 'CREATE', 'USER', user.id, `Created ${user.username}`);
  return user;
}

export function getUserById(database: Database.Database, userId: number): UserRecord | null {
  const row = database.prepare(`
    SELECT
      users.id,
      users.username,
      users.display_name AS displayName,
      roles.code AS role,
      users.is_active AS isActive,
      users.created_at AS createdAt,
      users.last_login_at AS lastLoginAt,
      users.failed_login_count AS failedLoginCount
    FROM users
    INNER JOIN roles ON roles.id = users.role_id
    WHERE users.id = ?
  `).get(userId) as UserRecord | undefined;

  return row ?? null;
}

export function updateUser(database: Database.Database, userId: number, input: { displayName?: string; role?: 'ADMIN' | 'CASHIER'; isActive?: boolean }): UserRecord {
  const existing = getUserById(database, userId);
  if (!existing) throw new Error('User not found.');

  const displayName = input.displayName?.trim() ?? existing.displayName;
  if (displayName.length < 2 || displayName.length > 100) throw new Error('Display name must be between 2 and 100 characters.');

  const role = input.role ? database.prepare('SELECT id FROM roles WHERE code = ?').get(input.role) as { id: number } | undefined : null;
  if (input.role && !role) throw new Error('Selected role is not configured.');

  database.prepare(`
    UPDATE users
    SET display_name = ?, role_id = COALESCE(?, role_id), is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(displayName, role?.id ?? null, input.isActive !== undefined ? Number(input.isActive) : existing.isActive ? 1 : 0, new Date().toISOString(), userId);

  const user = getUserById(database, userId)!;
  recordAudit(database, 'UPDATE', 'USER', userId, 'Updated user profile or status');
  return user;
}

export function resetPassword(database: Database.Database, userId: number, password: string): void {
  if (password.length < 8 || password.length > 128) throw new Error('Password must be between 8 and 128 characters.');
  const user = getUserById(database, userId);
  if (!user) throw new Error('User not found.');

  database.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hashPassword(password), new Date().toISOString(), userId);
  recordAudit(database, 'RESET_PASSWORD', 'USER', userId, 'Password reset by administrator');
}

export function listSettings(database: Database.Database): AppSetting[] {
  return database.prepare('SELECT key, value, updated_at AS updatedAt FROM app_settings ORDER BY key ASC').all() as AppSetting[];
}

export function setSetting(database: Database.Database, key: string, value: string): AppSetting {
  const normalizedKey = key.trim();
  if (!normalizedKey) throw new Error('Setting key is required.');

  database.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(normalizedKey, value, new Date().toISOString());

  const setting = database.prepare('SELECT key, value, updated_at AS updatedAt FROM app_settings WHERE key = ?').get(normalizedKey) as AppSetting;
  recordAudit(database, 'UPDATE', 'SETTING', normalizedKey, 'Application setting updated');
  return setting;
}
