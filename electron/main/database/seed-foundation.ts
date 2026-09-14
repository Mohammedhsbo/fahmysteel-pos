import type Database from 'better-sqlite3';

export function seedFoundation(database: Database.Database): void {
  const now = new Date().toISOString();

  database.prepare(
    'INSERT OR IGNORE INTO roles (code, name, created_at) VALUES (?, ?, ?)'
  ).run('ADMIN', 'Administrator', now);
  database.prepare(
    'INSERT OR IGNORE INTO roles (code, name, created_at) VALUES (?, ?, ?)'
  ).run('CASHIER', 'Cashier', now);

  const insertUnit = database.prepare(`
    INSERT OR IGNORE INTO units (code, name, name_ar, is_system, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?)
  `);
  insertUnit.run('PIECE', 'Piece', 'قطعة', now, now);
  insertUnit.run('TON', 'Ton', 'طن', now, now);
  insertUnit.run('KILOGRAM', 'Kilogram', 'كيلوجرام', now, now);
  insertUnit.run('METER', 'Meter', 'متر', now, now);
  insertUnit.run('BUNDLE', 'Bundle', 'ربطة', now, now);

  const insertPaymentMethod = database.prepare(`
    INSERT OR IGNORE INTO payment_methods (code, name, is_system, created_at, updated_at)
    VALUES (?, ?, 1, ?, ?)
  `);
  insertPaymentMethod.run('CASH', 'Cash', now, now);
  insertPaymentMethod.run('CARD', 'Card', now, now);
  insertPaymentMethod.run('BANK_TRANSFER', 'Bank transfer', now, now);
  insertPaymentMethod.run('CREDIT', 'Credit', now, now);

  const permissions = [
    ['dashboard.view', 'View dashboard'],
    ['sales.view', 'View sales'],
    ['sales.create', 'Create sales'],
    ['sales.print', 'Print sales invoices'],
    ['sales.products.view', 'View products for sales'],
    ['sales.customers.view', 'View customers for sales'],
    ['sales.payment-methods.view', 'View payment methods for sales'],
    ['returns.view', 'View sales returns'],
    ['returns.manage', 'Manage sales returns'],
    ['inventory.view', 'View inventory'],
    ['inventory.manage', 'Manage inventory'],
    ['purchases.view', 'View purchases'],
    ['purchases.manage', 'Manage purchases'],
    ['customers.view', 'View customers'],
    ['customers.manage', 'Manage customers'],
    ['suppliers.view', 'View suppliers'],
    ['suppliers.manage', 'Manage suppliers'],
    ['treasury.view', 'View treasury'],
    ['treasury.manage', 'Manage treasury'],
    ['reports.view', 'View reports'],
    ['settings.manage', 'Manage settings'],
    ['users.manage', 'Manage users'],
    ['backup.manage', 'Manage backups'],
    ['audit.view', 'View audit logs'],
    ['operations.manage', 'Manage cashier shifts'],
  ] as const;
  const insertPermission = database.prepare(
    'INSERT OR IGNORE INTO permissions (code, name, created_at) VALUES (?, ?, ?)'
  );
  for (const [code, name] of permissions) insertPermission.run(code, name, now);

  const adminRole = database.prepare('SELECT id FROM roles WHERE code = ?').get('ADMIN') as { id: number };
  const cashierRole = database.prepare('SELECT id FROM roles WHERE code = ?').get('CASHIER') as { id: number };
  const permissionId = database.prepare('SELECT id FROM permissions WHERE code = ?') as Database.Statement;
  const grant = database.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
  database.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(cashierRole.id);
  for (const [code] of permissions) {
    const permission = permissionId.get(code) as { id: number };
    grant.run(adminRole.id, permission.id);
  }
  for (const code of ['sales.view', 'sales.create', 'sales.print', 'sales.products.view', 'sales.customers.view', 'sales.payment-methods.view', 'returns.view', 'returns.manage']) {
    const permission = permissionId.get(code) as { id: number };
    grant.run(cashierRole.id, permission.id);
  }
}
