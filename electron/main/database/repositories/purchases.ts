import type Database from 'better-sqlite3';
import { getProductById } from './catalog.js';
import type { PurchaseInvoice, PurchaseInvoiceInput, PurchaseInvoiceItem } from '../../../../shared/purchases.js';

function normalizeSearch(search?: string): string {
  return `%${(search ?? '').trim()}%`;
}

function listInvoiceItems(database: Database.Database, invoiceId: number): PurchaseInvoiceItem[] {
  return database.prepare(`
    SELECT
      id,
      invoice_id AS invoiceId,
      product_id AS productId,
      product_name AS productName,
      quantity,
      unit_price_cents AS unitPriceCents,
      line_total_cents AS lineTotalCents
    FROM purchase_invoice_items
    WHERE invoice_id = ?
    ORDER BY id ASC
  `).all(invoiceId) as PurchaseInvoiceItem[];
}

export function listPurchaseInvoices(database: Database.Database, search?: string): PurchaseInvoice[] {
  const term = normalizeSearch(search);
  const rows = database.prepare(`
    SELECT
      pi.id,
      pi.invoice_number AS invoiceNumber,
      pi.supplier_id AS supplierId,
      s.name AS supplierName,
      pi.created_by AS createdBy,
      pi.status,
      pi.subtotal_cents AS subtotalCents,
      pi.discount_cents AS discountCents,
      pi.total_cents AS totalCents,
      pi.paid_cents AS paidCents,
      pi.notes,
      pi.issued_at AS issuedAt,
      pi.created_at AS createdAt,
      pi.updated_at AS updatedAt
    FROM purchase_invoices pi
    LEFT JOIN suppliers s ON s.id = pi.supplier_id
    WHERE pi.status != 'CANCELLED'
      AND (
        pi.invoice_number LIKE ?
        OR COALESCE(s.name, '') LIKE ?
        OR COALESCE(pi.notes, '') LIKE ?
      )
    ORDER BY pi.issued_at DESC
    LIMIT 200
  `).all(term, term, term) as Array<{
    id: number;
    invoiceNumber: string;
    supplierId: number | null;
    supplierName: string | null;
    createdBy: number;
    status: PurchaseInvoice['status'];
    subtotalCents: number;
    discountCents: number;
    totalCents: number;
    paidCents: number;
    notes: string | null;
    issuedAt: string;
    createdAt: string;
    updatedAt: string;
  }>;

  return rows.map((invoice) => ({ ...invoice, items: listInvoiceItems(database, invoice.id) }));
}

export function getPurchaseInvoiceById(database: Database.Database, invoiceId: number): PurchaseInvoice | null {
  const row = database.prepare(`
    SELECT
      pi.id,
      pi.invoice_number AS invoiceNumber,
      pi.supplier_id AS supplierId,
      s.name AS supplierName,
      pi.created_by AS createdBy,
      pi.status,
      pi.subtotal_cents AS subtotalCents,
      pi.discount_cents AS discountCents,
      pi.total_cents AS totalCents,
      pi.paid_cents AS paidCents,
      pi.notes,
      pi.issued_at AS issuedAt,
      pi.created_at AS createdAt,
      pi.updated_at AS updatedAt
    FROM purchase_invoices pi
    LEFT JOIN suppliers s ON s.id = pi.supplier_id
    WHERE pi.id = ?
  `).get(invoiceId) as PurchaseInvoice | undefined;

  if (!row) return null;
  return { ...row, items: listInvoiceItems(database, invoiceId) };
}

function makeInvoiceNumber(): string {
  const today = new Date();
  const stamp = today.toISOString().slice(0, 10).replace(/-/g, '');
  return `PUR-${stamp}-${Math.floor(Math.random() * 900000 + 100000)}`;
}

export function createPurchaseInvoice(database: Database.Database, input: PurchaseInvoiceInput): PurchaseInvoice {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('At least one purchase item is required.');
  }

  if (typeof input.createdBy !== 'number') {
    throw new Error('Purchase invoice requires a creator reference.');
  }

  const paymentMethod = database.prepare(
    'SELECT id FROM payment_methods WHERE id = COALESCE(?, (SELECT id FROM payment_methods WHERE code = ?)) AND is_active = 1'
  ).get(input.paymentMethodId ?? null, 'CASH') as { id: number } | undefined;
  if (!paymentMethod) throw new Error('Invalid payment method.');

  let subtotal = 0;
  for (const item of input.items) {
    if (!item || typeof item !== 'object') throw new Error('Purchase line item is invalid.');
    if (!item.productId || item.quantity <= 0 || item.unitPriceCents < 0) {
      throw new Error('Each purchase line item must include a valid product, quantity, and price.');
    }

    const product = getProductById(database, item.productId);
    if (!product) throw new Error('One or more products were not found.');

    subtotal += item.quantity * item.unitPriceCents;
  }

  const total = Math.max(0, subtotal);
  const issuedAt = new Date().toISOString();
  const invoiceNumber = makeInvoiceNumber();
  const result = database.prepare(`
    INSERT INTO purchase_invoices (
      invoice_number,
      supplier_id,
      created_by,
      status,
      subtotal_cents,
      discount_cents,
      total_cents,
      paid_cents,
      notes,
      issued_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
  `).run(
    invoiceNumber,
    input.supplierId ?? null,
    input.createdBy,
    total > 0 ? 'PAID' : 'CANCELLED',
    subtotal,
    total,
    total,
    input.notes?.trim() || null,
    issuedAt,
    issuedAt,
    issuedAt,
  );

  const invoiceId = Number(result.lastInsertRowid);

  for (const item of input.items) {
    const product = getProductById(database, item.productId)!;
    const lineTotal = item.quantity * item.unitPriceCents;

    database.prepare(`
      INSERT INTO purchase_invoice_items (
        invoice_id,
        product_id,
        product_name,
        quantity,
        unit_price_cents,
        line_total_cents
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(invoiceId, item.productId, product.name, item.quantity, item.unitPriceCents, lineTotal);

    database.prepare(`
      UPDATE products
      SET current_stock_quantity = current_stock_quantity + ?, updated_at = ?
      WHERE id = ?
    `).run(item.quantity, issuedAt, item.productId);

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
      ) VALUES (?, 'PURCHASE', ?, 'purchase_invoice', ?, 'Supplier purchase', ?, ?)
    `).run(item.productId, item.quantity, invoiceId, input.createdBy, issuedAt);
  }

  if (total > 0) {
    database.prepare(`
      INSERT INTO treasury_transactions (
        transaction_type, direction, amount_cents, payment_method_id,
        reference_type, reference_id, user_id, description, created_at
      ) VALUES ('PURCHASE_PAYMENT', 'OUT', ?, ?, 'purchase_invoice', ?, ?, ?, ?)
    `).run(total, paymentMethod.id, invoiceId, input.createdBy, `Purchase payment for ${invoiceNumber}`, issuedAt);
  }

  return getPurchaseInvoiceById(database, invoiceId)!;
}
