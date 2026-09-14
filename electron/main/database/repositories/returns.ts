import type Database from 'better-sqlite3';
import type { SalesReturnInput, SalesReturnItem, SalesReturnRecord } from '../../../../shared/returns.js';
import { getSession } from '../../auth.js';

function normalizeSearch(search?: string): string {
  return `%${(search ?? '').trim()}%`;
}

function listReturnItems(database: Database.Database, returnId: number): SalesReturnItem[] {
  return database.prepare(`
    SELECT
      sri.id,
      sri.return_id AS returnId,
      sri.original_item_id AS originalItemId,
      sri.product_id AS productId,
      sri.product_name AS productName,
      sri.quantity,
      sri.refund_cents AS refundCents
    FROM sales_return_items sri
    WHERE sri.return_id = ?
  `).all(returnId) as SalesReturnItem[];
}

export function listSalesReturns(database: Database.Database, search?: string): SalesReturnRecord[] {
  const term = normalizeSearch(search);
  const rows = database.prepare(`
    SELECT
      sr.id,
      sr.return_number AS returnNumber,
      sr.original_invoice_id AS originalInvoiceId,
      sr.customer_id AS customerId,
      c.name AS customerName,
      sr.created_by AS createdBy,
      u.display_name AS createdByName,
      sr.refund_cents AS refundCents,
      sr.status,
      sr.reason,
      sr.returned_at AS returnedAt,
      sr.created_at AS createdAt
    FROM sales_returns sr
    LEFT JOIN customers c ON c.id = sr.customer_id
    INNER JOIN users u ON u.id = sr.created_by
    WHERE sr.status = 'COMPLETED'
      AND (
        sr.return_number LIKE ?
        OR COALESCE(c.name, '') LIKE ?
        OR COALESCE(sr.reason, '') LIKE ?
      )
    ORDER BY sr.returned_at DESC
    LIMIT 200
  `).all(term, term, term) as Array<{
    id: number;
    returnNumber: string;
    originalInvoiceId: number;
    customerId: number | null;
    customerName: string | null;
    createdBy: number;
    createdByName: string;
    refundCents: number;
    status: 'COMPLETED' | 'CANCELLED';
    reason: string | null;
    returnedAt: string;
    createdAt: string;
  }>;

  return rows.map((row) => ({ ...row, items: listReturnItems(database, row.id) }));
}

function makeReturnNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `RET-${stamp}-${Math.floor(Math.random() * 900000 + 100000)}`;
}

export function createSalesReturn(database: Database.Database, input: SalesReturnInput): SalesReturnRecord {
  const session = getSession();
  if (!session) throw new Error('Authentication required.');
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('At least one return item is required.');

  const originalInvoice = database.prepare(`
    SELECT id, customer_id AS customerId, total_cents AS totalCents
    FROM sales_invoices
    WHERE id = ?
  `).get(input.originalInvoiceId) as { id: number; customerId: number | null; totalCents: number } | undefined;

  if (!originalInvoice) throw new Error('Original sales invoice not found.');

  const returnNumber = makeReturnNumber();
  const returnedAt = new Date().toISOString();
  let refundCents = 0;

  for (const item of input.items) {
    const originalLine = database.prepare(`
      SELECT id, product_id AS productId, product_name AS productName, quantity, line_total_cents AS lineTotalCents
      FROM sales_invoice_items
      WHERE id = ? AND invoice_id = ?
    `).get(item.originalItemId, input.originalInvoiceId) as {
      id: number;
      productId: number;
      productName: string;
      quantity: number;
      lineTotalCents: number;
    } | undefined;

    if (!originalLine) throw new Error('One or more return items do not belong to the selected invoice.');
    if (item.quantity <= 0 || item.quantity > originalLine.quantity) {
      throw new Error(`Return quantity exceeds the original quantity for ${originalLine.productName}.`);
    }
    if (item.refundCents < 0) throw new Error('Refund amount cannot be negative.');

    refundCents += Math.max(0, item.refundCents);
  }

  const result = database.prepare(`
    INSERT INTO sales_returns (
      return_number,
      original_invoice_id,
      customer_id,
      created_by,
      refund_cents,
      status,
      reason,
      returned_at,
      created_at
    ) VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?)
  `).run(
    returnNumber,
    input.originalInvoiceId,
    input.customerId ?? originalInvoice.customerId,
    session.id,
    refundCents,
    input.reason?.trim() || null,
    returnedAt,
    returnedAt,
  );

  const returnId = Number(result.lastInsertRowid);

  for (const item of input.items) {
    const originalLine = database.prepare(`
      SELECT id, product_id AS productId, product_name AS productName, quantity, line_total_cents AS lineTotalCents
      FROM sales_invoice_items
      WHERE id = ? AND invoice_id = ?
    `).get(item.originalItemId, input.originalInvoiceId) as {
      id: number;
      productId: number;
      productName: string;
      quantity: number;
      lineTotalCents: number;
    };

    database.prepare(`
      INSERT INTO sales_return_items (
        return_id,
        original_item_id,
        product_id,
        quantity,
        refund_cents
      ) VALUES (?, ?, ?, ?, ?)
    `).run(returnId, item.originalItemId, originalLine.productId, item.quantity, item.refundCents);

    database.prepare(`
      UPDATE products
      SET current_stock_quantity = current_stock_quantity + ?, updated_at = ?
      WHERE id = ?
    `).run(item.quantity, returnedAt, originalLine.productId);

    database.prepare(`
      INSERT INTO inventory_movements (
        product_id,
        movement_type,
        quantity_delta,
        source_type,
        source_id,
        reason,
        created_by,
        created_at
      ) VALUES (?, 'SALE_RETURN', ?, 'sales_return', ?, 'Customer sales return', ?, ?)
    `).run(originalLine.productId, item.quantity, returnId, session.id, returnedAt);
  }

  database.prepare(`
    UPDATE sales_returns
    SET refund_cents = ?
    WHERE id = ?
  `).run(refundCents, returnId);

  return listSalesReturns(database).find((entry) => entry.id === returnId)!;
}
