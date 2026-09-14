import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import type { SessionUser, UserRole } from '../../shared/api.js';

type UserRow = {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  role_code: UserRole;
};

let activeSession: SessionUser | null = null;

function validateCredentials(username: string, password: string): void {
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username.trim())) {
    throw new Error('Username must be 3-64 characters and use letters, numbers, dots, underscores, or hyphens.');
  }
  if (password.length < 8 || password.length > 128) {
    throw new Error('Password must be between 8 and 128 characters.');
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedKey] = storedHash.split(':');
  if (!salt || !expectedKey) return false;

  const actualKey = crypto.scryptSync(password, salt, 64).toString('hex');
  if (actualKey.length !== expectedKey.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(actualKey, 'hex'),
    Buffer.from(expectedKey, 'hex'),
  );
}

export function authenticate(
  database: Database.Database,
  username: string,
  password: string,
): SessionUser {
  validateCredentials(username, password);
  const user = database.prepare(`
    SELECT users.id, users.username, users.display_name, users.password_hash,
           roles.code AS role_code
    FROM users
    INNER JOIN roles ON roles.id = users.role_id
    WHERE users.username = ? AND users.is_active = 1
  `).get(username.trim()) as UserRow | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    if (user) {
      database.prepare('UPDATE users SET failed_login_count = failed_login_count + 1 WHERE id = ?').run(user.id);
    }
    throw new Error('Invalid username or password.');
  }

  database.prepare(
    'UPDATE users SET last_login_at = ?, failed_login_count = 0 WHERE id = ?'
  ).run(new Date().toISOString(), user.id);

  activeSession = {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role_code,
  };

  return activeSession;
}

export function bootstrapAdmin(
  database: Database.Database,
  username: string,
  displayName: string,
  password: string,
): SessionUser {
  validateCredentials(username, password);
  if (displayName.trim().length < 2 || displayName.trim().length > 100) {
    throw new Error('Display name must be between 2 and 100 characters.');
  }

  const existingUser = database.prepare('SELECT 1 FROM users LIMIT 1').get();
  if (existingUser) throw new Error('Initial administrator setup has already been completed.');

  const role = database.prepare('SELECT id FROM roles WHERE code = ?').get('ADMIN') as { id: number } | undefined;
  if (!role) throw new Error('Administrator role is not configured.');

  const now = new Date().toISOString();
  const result = database.prepare(`
    INSERT INTO users (username, display_name, password_hash, role_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(username.trim(), displayName.trim(), hashPassword(password), role.id, now, now);

  activeSession = {
    id: Number(result.lastInsertRowid),
    username: username.trim(),
    displayName: displayName.trim(),
    role: 'ADMIN',
  };
  return activeSession;
}

export function requiresSetup(database: Database.Database): boolean {
  return database.prepare('SELECT 1 FROM users LIMIT 1').get() === undefined;
}

export function getSession(): SessionUser | null {
  return activeSession;
}

export function clearSession(): void {
  activeSession = null;
}
