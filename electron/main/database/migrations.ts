import type Database from 'better-sqlite3';

const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        is_system INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL REFERENCES roles(id),
        permission_id INTEGER NOT NULL REFERENCES permissions(id),
        PRIMARY KEY (role_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role_id INTEGER NOT NULL REFERENCES roles(id),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        is_system INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT NOT NULL UNIQUE,
        barcode TEXT UNIQUE,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        description TEXT,
        category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
        unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
        default_supplier_id INTEGER REFERENCES suppliers(id) ON DELETE RESTRICT,
        purchase_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (purchase_price_cents >= 0),
        selling_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (selling_price_cents >= 0),
        minimum_stock_quantity REAL NOT NULL DEFAULT 0 CHECK (minimum_stock_quantity >= 0),
        current_stock_quantity REAL NOT NULL DEFAULT 0 CHECK (current_stock_quantity >= 0),
        is_active INTEGER NOT NULL DEFAULT 1,
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        is_system INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cashier_shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cashier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        opening_cash_cents INTEGER NOT NULL CHECK (opening_cash_cents >= 0),
        closing_cash_cents INTEGER CHECK (closing_cash_cents >= 0),
        expected_cash_cents INTEGER CHECK (expected_cash_cents >= 0),
        difference_cents INTEGER,
        status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        closing_notes TEXT
      );

      CREATE TABLE IF NOT EXISTS sales_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
        cashier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        shift_id INTEGER,
        status TEXT NOT NULL CHECK (status IN ('PAID', 'PARTIALLY_PAID', 'CREDIT', 'CANCELLED', 'RETURNED')),
        subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
        discount_type TEXT NOT NULL DEFAULT 'FIXED' CHECK (discount_type IN ('FIXED', 'PERCENT')),
        discount_value_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_value_cents >= 0),
        discount_percentage REAL NOT NULL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
        discount_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount_cents >= 0),
        discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
        tax_enabled INTEGER NOT NULL DEFAULT 0 CHECK (tax_enabled IN (0, 1)),
        tax_rate_percent REAL NOT NULL DEFAULT 0 CHECK (tax_rate_percent >= 0 AND tax_rate_percent <= 100),
        tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
        tax_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount_cents >= 0),
        cash_expenses_cents INTEGER NOT NULL DEFAULT 0 CHECK (cash_expenses_cents >= 0),
        total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
        paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (paid_cents >= 0 AND paid_cents <= total_cents),
        notes TEXT,
        issued_at TEXT NOT NULL,
        cancelled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sales_invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
        unit_cost_cents INTEGER NOT NULL CHECK (unit_cost_cents >= 0),
        discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
        line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0)
      );

      CREATE TABLE IF NOT EXISTS purchase_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('PAID', 'PARTIALLY_PAID', 'CREDIT', 'CANCELLED')),
        subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
        discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
        total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
        paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (paid_cents >= 0 AND paid_cents <= total_cents),
        notes TEXT,
        issued_at TEXT NOT NULL,
        cancelled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchase_invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE RESTRICT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
        line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0)
      );

      CREATE TABLE IF NOT EXISTS inventory_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        movement_type TEXT NOT NULL CHECK (movement_type IN ('PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT')),
        quantity_delta REAL NOT NULL CHECK (quantity_delta != 0),
        source_type TEXT NOT NULL,
        source_id INTEGER,
        reason TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS treasury_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('SALE_PAYMENT', 'PURCHASE_PAYMENT', 'CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT', 'EXPENSE', 'OTHER_INCOME', 'REFUND', 'ADJUSTMENT')),
        direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
        reference_type TEXT,
        reference_id INTEGER,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        description TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
        treasury_transaction_id INTEGER UNIQUE REFERENCES treasury_transactions(id) ON DELETE RESTRICT,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'CANCELLED')),
        description TEXT,
        expense_date TEXT NOT NULL,
        cancelled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sales_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_number TEXT NOT NULL UNIQUE,
        original_invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
        customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        refund_cents INTEGER NOT NULL CHECK (refund_cents >= 0),
        status TEXT NOT NULL CHECK (status IN ('COMPLETED', 'CANCELLED')),
        reason TEXT,
        returned_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sales_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE RESTRICT,
        original_item_id INTEGER NOT NULL REFERENCES sales_invoice_items(id) ON DELETE RESTRICT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity REAL NOT NULL CHECK (quantity > 0),
        refund_cents INTEGER NOT NULL CHECK (refund_cents >= 0)
      );

      CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
      CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
      CREATE INDEX IF NOT EXISTS idx_sales_invoices_issued_at ON sales_invoices(issued_at);
      CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer_id ON sales_invoices(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_product_id ON sales_invoice_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_invoices_issued_at ON purchase_invoices(issued_at);
      CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier_id ON purchase_invoices(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);
      CREATE INDEX IF NOT EXISTS idx_treasury_transactions_created_at ON treasury_transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_treasury_transactions_reference ON treasury_transactions(reference_type, reference_id);
      CREATE INDEX IF NOT EXISTS idx_cashier_shifts_cashier_status ON cashier_shifts(cashier_id, status);
    `,
  },
  {
    version: 3,
    sql: `
      ALTER TABLE users ADD COLUMN last_login_at TEXT;
      ALTER TABLE users ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    version: 4,
    sql: `
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_number TEXT NOT NULL UNIQUE,
        original_invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE RESTRICT,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE RESTRICT,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        refund_cents INTEGER NOT NULL CHECK (refund_cents >= 0),
        status TEXT NOT NULL CHECK (status IN ('COMPLETED', 'CANCELLED')),
        reason TEXT,
        returned_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchase_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE RESTRICT,
        original_item_id INTEGER NOT NULL REFERENCES purchase_invoice_items(id) ON DELETE RESTRICT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        refund_cents INTEGER NOT NULL CHECK (refund_cents >= 0)
      );

      CREATE INDEX IF NOT EXISTS idx_purchase_returns_returned_at ON purchase_returns(returned_at);
      CREATE INDEX IF NOT EXISTS idx_purchase_return_items_product_id ON purchase_return_items(product_id);
    `,
  },
  {
    version: 5,
    sql: `
      ALTER TABLE sales_invoices ADD COLUMN payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE RESTRICT;
      ALTER TABLE sales_invoices ADD COLUMN card_last4 TEXT;

      CREATE TABLE IF NOT EXISTS payment_method_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        vodafone_cash_number TEXT,
        vodafone_cash_enabled INTEGER NOT NULL DEFAULT 0 CHECK (vodafone_cash_enabled IN (0, 1)),
        instapay_number TEXT,
        instapay_enabled INTEGER NOT NULL DEFAULT 0 CHECK (instapay_enabled IN (0, 1)),
        visa_enabled INTEGER NOT NULL DEFAULT 0 CHECK (visa_enabled IN (0, 1)),
        updated_at TEXT NOT NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
    `,
  },
  {
    version: 6,
    sql: `
      CREATE TABLE IF NOT EXISTS payment_method_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        vodafone_cash_number TEXT,
        vodafone_cash_enabled INTEGER NOT NULL DEFAULT 0 CHECK (vodafone_cash_enabled IN (0, 1)),
        instapay_number TEXT,
        instapay_enabled INTEGER NOT NULL DEFAULT 0 CHECK (instapay_enabled IN (0, 1)),
        visa_enabled INTEGER NOT NULL DEFAULT 0 CHECK (visa_enabled IN (0, 1)),
        updated_at TEXT NOT NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
    `,
  },
  {
    version: 7,
    sql: `
      CREATE TABLE IF NOT EXISTS payment_method_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        vodafone_cash_number TEXT,
        vodafone_cash_enabled INTEGER NOT NULL DEFAULT 0 CHECK (vodafone_cash_enabled IN (0, 1)),
        instapay_number TEXT,
        instapay_enabled INTEGER NOT NULL DEFAULT 0 CHECK (instapay_enabled IN (0, 1)),
        visa_enabled INTEGER NOT NULL DEFAULT 0 CHECK (visa_enabled IN (0, 1)),
        updated_at TEXT NOT NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
    `,
  },
  {
    version: 8,
    sql: `
      ALTER TABLE products ADD COLUMN steel_type TEXT;
      ALTER TABLE products ADD COLUMN shape TEXT;
      ALTER TABLE products ADD COLUMN width_mm REAL;
      ALTER TABLE products ADD COLUMN height_mm REAL;
      ALTER TABLE products ADD COLUMN thickness_mm REAL;
      ALTER TABLE products ADD COLUMN length_m REAL;
      ALTER TABLE products ADD COLUMN weight_per_piece_kg REAL;
      ALTER TABLE products ADD COLUMN weight_per_meter_kg REAL;
      ALTER TABLE products ADD COLUMN selling_price_per_kg_cents INTEGER;
      ALTER TABLE products ADD COLUMN selling_price_per_piece_cents INTEGER;
      ALTER TABLE products ADD COLUMN selling_price_per_meter_cents INTEGER;
      ALTER TABLE inventory_movements ADD COLUMN previous_quantity REAL;
      ALTER TABLE inventory_movements ADD COLUMN new_quantity REAL;
      ALTER TABLE inventory_movements ADD COLUMN previous_weight_kg REAL;
      ALTER TABLE inventory_movements ADD COLUMN new_weight_kg REAL;
    `,
  },
  {
    version: 9,
    sql: `
      ALTER TABLE sales_invoices ADD COLUMN discount_type TEXT DEFAULT 'FIXED';
      ALTER TABLE sales_invoices ADD COLUMN discount_value_cents INTEGER DEFAULT 0;
      ALTER TABLE sales_invoices ADD COLUMN discount_percentage REAL DEFAULT 0;
      ALTER TABLE sales_invoices ADD COLUMN discount_amount_cents INTEGER DEFAULT 0;
      ALTER TABLE sales_invoices ADD COLUMN tax_enabled INTEGER DEFAULT 0;
      ALTER TABLE sales_invoices ADD COLUMN tax_rate_percent REAL DEFAULT 0;
      ALTER TABLE sales_invoices ADD COLUMN tax_amount_cents INTEGER DEFAULT 0;
      ALTER TABLE sales_invoices ADD COLUMN cash_expenses_cents INTEGER DEFAULT 0;
      UPDATE sales_invoices SET discount_type = 'FIXED' WHERE discount_type IS NULL OR discount_type NOT IN ('FIXED', 'PERCENT');
      UPDATE sales_invoices SET discount_value_cents = 0 WHERE discount_value_cents IS NULL;
      UPDATE sales_invoices SET discount_percentage = 0 WHERE discount_percentage IS NULL;
      UPDATE sales_invoices SET discount_amount_cents = COALESCE(discount_cents, 0) WHERE discount_amount_cents IS NULL;
      UPDATE sales_invoices SET tax_enabled = 0 WHERE tax_enabled IS NULL;
      UPDATE sales_invoices SET tax_rate_percent = 0 WHERE tax_rate_percent IS NULL;
      UPDATE sales_invoices SET tax_amount_cents = COALESCE(tax_cents, 0) WHERE tax_amount_cents IS NULL;
      UPDATE sales_invoices SET cash_expenses_cents = 0 WHERE cash_expenses_cents IS NULL;
    `,
  },
  {
    version: 10,
    sql: `
      ALTER TABLE products ADD COLUMN weight_per_sheet_kg REAL;
    `,
  },
  {
    version: 11,
    sql: `
      INSERT INTO categories (name, name_ar, description, is_active, created_at, updated_at)
      SELECT 'Boxes', 'علب', 'Steel box sections', 1, datetime('now'), datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name_ar = 'علب');
      INSERT INTO categories (name, name_ar, description, is_active, created_at, updated_at)
      SELECT 'Angles', 'زوايا', 'Steel angles', 1, datetime('now'), datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name_ar = 'زوايا');
      INSERT INTO categories (name, name_ar, description, is_active, created_at, updated_at)
      SELECT 'Sheets', 'صاج', 'Steel sheets', 1, datetime('now'), datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name_ar = 'صاج');
      INSERT INTO categories (name, name_ar, description, is_active, created_at, updated_at)
      SELECT 'Pipes', 'مواسير', 'Steel pipes', 1, datetime('now'), datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name_ar = 'مواسير');
    `,
  },
] as const;

export function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const hasMigration = database.prepare(
    'SELECT 1 FROM schema_migrations WHERE version = ?'
  );
  const applyMigration = database.prepare(
    'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)'
  );

  for (const migration of migrations) {
    if (hasMigration.get(migration.version)) continue;

    database.transaction(() => {
      if (migration.version === 7 || migration.version === 9) {
        const columns = new Set(
          (database.prepare('PRAGMA table_info(sales_invoices)').all() as Array<{ name: string }>).map(({ name }) => name),
        );
        if (migration.version === 7) {
          if (!columns.has('payment_method_id')) {
            database.exec('ALTER TABLE sales_invoices ADD COLUMN payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE RESTRICT');
          }
          if (!columns.has('card_last4')) {
            database.exec('ALTER TABLE sales_invoices ADD COLUMN card_last4 TEXT');
          }
        }
        if (migration.version === 9) {
          const requiredColumns = [
            'discount_type',
            'discount_value_cents',
            'discount_percentage',
            'discount_amount_cents',
            'tax_enabled',
            'tax_rate_percent',
            'tax_amount_cents',
            'cash_expenses_cents',
          ];
          const missingColumns = requiredColumns.filter((columnName) => !columns.has(columnName));
          if (missingColumns.length === 0) {
            applyMigration.run(migration.version, new Date().toISOString());
            return;
          }
          for (const columnName of missingColumns) {
            const columnDefinitions: Record<string, string> = {
              discount_type: "TEXT DEFAULT 'FIXED'",
              discount_value_cents: 'INTEGER DEFAULT 0',
              discount_percentage: 'REAL DEFAULT 0',
              discount_amount_cents: 'INTEGER DEFAULT 0',
              tax_enabled: 'INTEGER DEFAULT 0',
              tax_rate_percent: 'REAL DEFAULT 0',
              tax_amount_cents: 'INTEGER DEFAULT 0',
              cash_expenses_cents: 'INTEGER DEFAULT 0',
            };
            database.exec(`ALTER TABLE sales_invoices ADD COLUMN ${columnName} ${columnDefinitions[columnName]};`);
          }
          database.exec(`
            UPDATE sales_invoices SET discount_type = 'FIXED' WHERE discount_type IS NULL OR discount_type NOT IN ('FIXED', 'PERCENT');
            UPDATE sales_invoices SET discount_value_cents = 0 WHERE discount_value_cents IS NULL;
            UPDATE sales_invoices SET discount_percentage = 0 WHERE discount_percentage IS NULL;
            UPDATE sales_invoices SET discount_amount_cents = COALESCE(discount_cents, 0) WHERE discount_amount_cents IS NULL;
            UPDATE sales_invoices SET tax_enabled = 0 WHERE tax_enabled IS NULL;
            UPDATE sales_invoices SET tax_rate_percent = 0 WHERE tax_rate_percent IS NULL;
            UPDATE sales_invoices SET tax_amount_cents = COALESCE(tax_cents, 0) WHERE tax_amount_cents IS NULL;
            UPDATE sales_invoices SET cash_expenses_cents = 0 WHERE cash_expenses_cents IS NULL;
          `);
        }
      }
      if (migration.version !== 7 && migration.version !== 9) {
        database.exec(migration.sql);
      }
      applyMigration.run(migration.version, new Date().toISOString());
    })();
  }
}
