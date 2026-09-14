import type Database from 'better-sqlite3';
import { getSession } from '../../auth.js';
import type { PurchaseReturnInput, PurchaseReturnItem, PurchaseReturnRecord } from '../../../../shared/purchase-returns.js';

function normalizeSearch(search?: string): string {
  return `%${(search ?? '').trim()}%`;
}

function listItems(database: Database.Database, returnId: number): PurchaseReturnItem[] {
  return database.prepare(`
    SELECT
      id,
      return_id AS returnId,
      original_item_id AS originalItemId,
      product_id AS productId,
      product_name AS productName,
      quantity,
      refund_cents AS refundCents
    FROM purchase_return_items
    WHERE return_id = ?
    ORDER BY id ASC
  `).all(returnId) as PurchaseReturnItem[];
}

export function listPurchaseReturns(database: Database.Database, search?: string): PurchaseReturnRecord[] {
  const term = normalizeSearch(search);
  const rows = database.prepare(`
    SELECT
      pr.id,
      pr.return_number AS returnNumber,
      pr.original_invoice_id AS originalInvoiceId,
      pr.supplier_id AS supplierId,
      s.name AS supplierName,
      pr.created_by AS createdBy,
      u.display_name AS createdByName,
      pr.refund_cents AS refundCents,
      pr.status,
      pr.reason,
      pr.returned_at AS returnedAt,
      pr.created_at AS createdAt
    FROM purchase_returns pr
    LEFT JOIN suppliers s ON s.id = pr.supplier_id
    INNER JOIN users u ON u.id = pr.created_by
    WHERE pr.status = 'COMPLETED'
      AND (pr.return_number LIKE ? OR COALESCE(s.name, '') LIKE ? OR COALESCE(pr.reason, '') LIKE ?)
    ORDER BY pr.returned_at DESC
    LIMIT 200
  `).all(term, term, term) as Array<Omit<PurchaseReturnRecord, 'items'>>;

  return rows.map((entry) => ({ ...entry, items: listItems(database, entry.id) }));
}

function makeReturnNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `PRET-${stamp}-${Math.floor(Math.random() * 900000 + 100000)}`;
}

type OriginalLine = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
};

export function createPurchaseReturn(database: Database.Database, input: PurchaseReturnInput): PurchaseReturnRecord {
  const session = getSession();
  if (!session) throw new Error('Authentication required.');
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('At least one return item is required.');

  const invoice = database.prepare(`
    SELECT supplier_id AS supplierId
    FROM purchase_invoices
    WHERE id = ? AND status != 'CANCELLED'
  `).get(input.originalInvoiceId) as { supplierId: number | null } | undefined;
  if (!invoice) throw new Error('Original purchase invoice not found.');

  const lines: Array<{ input: PurchaseReturnInput['items'][number]; original: OriginalLine }> = [];
  let refundCents = 0;
  for (const item of input.items) {
    const original = database.prepare(`
      SELECT id, product_id AS productId, product_name AS productName, quantity
      FROM purchase_invoice_items
      WHERE id = ? AND invoice_id = ?
    `).get(item.originalItemId, input.originalInvoiceId) as OriginalLine | undefined;
    if (!original) throw new Error('One or more return items do not belong to the selected invoice.');
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > original.quantity) {
      throw new Error(`Return quantity exceeds the original quantity for ${original.productName}.`);
    }
    if (!Number.isFinite(item.refundCents) || item.refundCents < 0) throw new Error('Refund amount cannot be negative.');
    refundCents += item.refundCents;
    lines.push({ input: item, original });
  }

  const returnedAt = new Date().toISOString();
  database.exec('BEGIN');
  try {
    const result = database.prepare(`
    INSERT INTO purchase_returns (
      return_number, original_invoice_id, supplier_id, created_by,
      refund_cents, status, reason, returned_at, created_at
    ) VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?)
    `).run(
      makeReturnNumber(),
      input.originalInvoiceId,
      input.supplierId ?? invoice.supplierId,
      session.id,
      refundCents,
      input.reason?.trim() || null,
      returnedAt,
      returnedAt,
    );
    const returnId = Number(result.lastInsertRowid);

    for (const line of lines) {
    database.prepare(`
      INSERT INTO purchase_return_items (
        return_id, original_item_id, product_id, product_name, quantity, refund_cents
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(returnId, line.original.id, line.original.productId, line.original.productName, line.input.quantity, line.input.refundCents);

    const stockUpdate = database.prepare(`
      UPDATE products
      SET current_stock_quantity = current_stock_quantity - ?, updated_at = ?
      WHERE id = ? AND current_stock_quantity >= ?
    `).run(line.input.quantity, returnedAt, line.original.productId, line.input.quantity);
    if (stockUpdate.changes === 0) throw new Error(`Insufficient stock to return ${line.original.productName}.`);

    database.prepare(`
      INSERT INTO inventory_movements (
        product_id, movement_type, quantity_delta, source_type, source_id, reason, created_by, created_at
      ) VALUES (?, 'PURCHASE_RETURN', ?, 'purchase_return', ?, 'Supplier purchase return', ?, ?)
    `).run(line.original.productId, -line.input.quantity, returnId, session.id, returnedAt);
    }
    database.exec('COMMIT');
    return listPurchaseReturns(database).find((entry) => entry.id === returnId)!;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
