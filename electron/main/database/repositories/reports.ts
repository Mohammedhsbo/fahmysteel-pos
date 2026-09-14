import type Database from 'better-sqlite3';
import type { DashboardSummary, SalesByDayPoint, TopProductPoint } from '../../../../shared/reports.js';

export function getDashboardSummary(database: Database.Database): DashboardSummary {
  const salesRow = database.prepare(`
    SELECT COALESCE(SUM(total_cents), 0) AS salesTotalCents
    FROM sales_invoices
    WHERE status != 'CANCELLED'
  `).get() as { salesTotalCents: number };

  const purchasesRow = database.prepare(`
    SELECT COALESCE(SUM(total_cents), 0) AS purchasesTotalCents
    FROM purchase_invoices
    WHERE status != 'CANCELLED'
  `).get() as { purchasesTotalCents: number };

  const expensesRow = database.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) AS expensesTotalCents
    FROM expenses
    WHERE status = 'ACTIVE'
  `).get() as { expensesTotalCents: number };

  const inventoryRow = database.prepare(`
    SELECT COALESCE(SUM(current_stock_quantity * purchase_price_cents), 0) AS inventoryValueCents
    FROM products
    WHERE is_active = 1
  `).get() as { inventoryValueCents: number };

  const customersRow = database.prepare(`
    SELECT COUNT(*) AS activeCustomers
    FROM customers
    WHERE is_active = 1 AND archived_at IS NULL
  `).get() as { activeCustomers: number };

  const suppliersRow = database.prepare(`
    SELECT COUNT(*) AS activeSuppliers
    FROM suppliers
    WHERE is_active = 1 AND archived_at IS NULL
  `).get() as { activeSuppliers: number };

  const productsRow = database.prepare(`
    SELECT COUNT(*) AS totalProducts
    FROM products
    WHERE is_active = 1 AND archived_at IS NULL
  `).get() as { totalProducts: number };

  return {
    salesTotalCents: Number(salesRow.salesTotalCents ?? 0),
    purchasesTotalCents: Number(purchasesRow.purchasesTotalCents ?? 0),
    expensesTotalCents: Number(expensesRow.expensesTotalCents ?? 0),
    inventoryValueCents: Number(inventoryRow.inventoryValueCents ?? 0),
    activeCustomers: Number(customersRow.activeCustomers ?? 0),
    activeSuppliers: Number(suppliersRow.activeSuppliers ?? 0),
    totalProducts: Number(productsRow.totalProducts ?? 0),
  };
}

export function getSalesByDay(database: Database.Database, days = 7): SalesByDayPoint[] {
  return database.prepare(`
    SELECT
      date(issued_at) AS date,
      SUM(total_cents) AS totalCents
    FROM sales_invoices
    WHERE issued_at >= datetime('now', '-' || ? || ' days')
      AND status != 'CANCELLED'
    GROUP BY date(issued_at)
    ORDER BY date ASC
  `).all(days) as SalesByDayPoint[];
}

export function getTopProducts(database: Database.Database, limit = 5): TopProductPoint[] {
  return database.prepare(`
    SELECT
      p.name AS productName,
      SUM(sii.quantity) AS totalQuantity,
      SUM(sii.line_total_cents) AS salesCents
    FROM sales_invoice_items sii
    INNER JOIN products p ON p.id = sii.product_id
    GROUP BY sii.product_id, p.name
    ORDER BY totalQuantity DESC, salesCents DESC
    LIMIT ?
  `).all(limit) as TopProductPoint[];
}
