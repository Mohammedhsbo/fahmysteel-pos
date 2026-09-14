import type Database from 'better-sqlite3';
import { getProductById } from './catalog.js';
import type { SalesInvoice, SalesInvoiceInput, SalesInvoiceItem, SalesInvoiceLineInput } from '../../../../shared/sales.js';

function normalizeSearch(search?: string): string {
  return `%${(search ?? '').trim()}%`;
}

function listInvoiceItems(database: Database.Database, invoiceId: number): SalesInvoiceItem[] {
  return database.prepare(`
    SELECT
      id,
      invoice_id AS invoiceId,
      product_id AS productId,
      product_name AS productName,
      quantity,
      unit_price_cents AS unitPriceCents,
      unit_cost_cents AS unitCostCents,
      discount_cents AS discountCents,
      line_total_cents AS lineTotalCents
    FROM sales_invoice_items
    WHERE invoice_id = ?
    ORDER BY id ASC
  `).all(invoiceId) as SalesInvoiceItem[];
}

export function listSalesInvoices(database: Database.Database, search?: string): SalesInvoice[] {
  const term = normalizeSearch(search);
  const rows = database.prepare(`
    SELECT
      si.id,
      si.invoice_number AS invoiceNumber,
      si.customer_id AS customerId,
      c.name AS customerName,
      si.cashier_id AS cashierId,
      si.shift_id AS shiftId,
      si.status,
      si.subtotal_cents AS subtotalCents,
      si.discount_cents AS discountCents,
      si.tax_cents AS taxCents,
      si.total_cents AS totalCents,
      si.paid_cents AS paidCents,
      si.notes,
      si.issued_at AS issuedAt,
      si.created_at AS createdAt,
      si.updated_at AS updatedAt
    FROM sales_invoices si
    LEFT JOIN customers c ON c.id = si.customer_id
    WHERE si.status != 'CANCELLED'
      AND (
        si.invoice_number LIKE ?
        OR COALESCE(c.name, '') LIKE ?
        OR COALESCE(si.notes, '') LIKE ?
      )
    ORDER BY si.issued_at DESC
    LIMIT 200
  `).all(term, term, term) as Array<{
    id: number;
    invoiceNumber: string;
    customerId: number | null;
    customerName: string | null;
    cashierId: number;
    shiftId: number | null;
    status: SalesInvoice['status'];
    subtotalCents: number;
    discountCents: number;
    taxCents: number;
    totalCents: number;
    paidCents: number;
    notes: string | null;
    issuedAt: string;
    createdAt: string;
    updatedAt: string;
  }>;

  return rows.map((invoice) => ({ ...invoice, items: listInvoiceItems(database, invoice.id) }));
}

export function getSalesInvoiceById(database: Database.Database, invoiceId: number): SalesInvoice | null {
  const row = database.prepare(`
    SELECT
      si.id,
      si.invoice_number AS invoiceNumber,
      si.customer_id AS customerId,
      c.name AS customerName,
      si.cashier_id AS cashierId,
      si.shift_id AS shiftId,
      si.status,
      si.subtotal_cents AS subtotalCents,
      si.discount_cents AS discountCents,
      si.tax_cents AS taxCents,
      si.total_cents AS totalCents,
      si.paid_cents AS paidCents,
      si.notes,
      si.issued_at AS issuedAt,
      si.created_at AS createdAt,
      si.updated_at AS updatedAt
    FROM sales_invoices si
    LEFT JOIN customers c ON c.id = si.customer_id
    WHERE si.id = ?
  `).get(invoiceId) as SalesInvoice | undefined;

  if (!row) return null;

  return { ...row, items: listInvoiceItems(database, invoiceId) };
}

function makeInvoiceNumber(): string {
  const today = new Date();
  const stamp = today.toISOString().slice(0, 10).replace(/-/g, '');
  return `SAL-${stamp}-${Math.floor(Math.random() * 900000 + 100000)}`;
}

function normalizeItem(item: SalesInvoiceLineInput): SalesInvoiceLineInput {
  if (!item || typeof item !== 'object') throw new Error('Sales line item is invalid.');
  if (!item.productId || item.quantity <= 0 || item.unitPriceCents < 0) {
    throw new Error('Each sales line item must include a valid product, quantity, and price.');
  }

  return {
    productId: Number(item.productId),
    quantity: Number(item.quantity),
    unitPriceCents: Math.max(0, Number(item.unitPriceCents)),
    discountCents: Math.max(0, Number(item.discountCents ?? 0)),
  };
}

export function createSalesInvoice(database: Database.Database, input: SalesInvoiceInput): SalesInvoice {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('At least one sales item is required.');
  }

  if (typeof input.cashierId !== 'number') {
    throw new Error('Sales invoice requires a cashier reference.');
  }

  const paymentMethod = database.prepare(
    'SELECT id FROM payment_methods WHERE id = COALESCE(?, (SELECT id FROM payment_methods WHERE code = ?)) AND is_active = 1'
  ).get(input.paymentMethodId ?? null, 'CASH') as { id: number } | undefined;
  if (!paymentMethod) throw new Error('Invalid payment method.');

  const normalizedItems = input.items.map(normalizeItem);
  let subtotal = 0;
  let discount = 0;

  for (const item of normalizedItems) {
    const product = getProductById(database, item.productId);
    if (!product) throw new Error('One or more products were not found.');
    if (product.currentStockQuantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}.`);
    }

    const lineTotalBeforeDiscount = Math.max(0, item.quantity * item.unitPriceCents);
    const lineDiscount = Math.min(lineTotalBeforeDiscount, item.discountCents ?? 0);
    subtotal += lineTotalBeforeDiscount;
    discount += lineDiscount;
  }

  const tax = 0;
  const total = Math.max(0, subtotal - discount + tax);
  const invoiceNumber = makeInvoiceNumber();
  const issuedAt = new Date().toISOString();
  const result = database.prepare(`
    INSERT INTO sales_invoices (
      invoice_number,
      customer_id,
      cashier_id,
      shift_id,
      status,
      subtotal_cents,
      discount_cents,
      tax_cents,
      total_cents,
      paid_cents,
      notes,
      issued_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    invoiceNumber,
    input.customerId ?? null,
    input.cashierId,
    input.shiftId ?? null,
    total > 0 ? 'PAID' : 'CANCELLED',
    subtotal,
    discount,
    tax,
    total,
    total,
    input.notes?.trim() || null,
    issuedAt,
    issuedAt,
    issuedAt,
  );

  const invoiceId = Number(result.lastInsertRowid);

  for (const item of normalizedItems) {
    const product = getProductById(database, item.productId)!;
    const lineTotalBeforeDiscount = Math.max(0, item.quantity * item.unitPriceCents);
    const lineDiscount = Math.min(lineTotalBeforeDiscount, item.discountCents ?? 0);
    const lineTotal = Math.max(0, lineTotalBeforeDiscount - lineDiscount);

    database.prepare(`
      INSERT INTO sales_invoice_items (
        invoice_id,
        product_id,
        product_name,
        quantity,
        unit_price_cents,
        unit_cost_cents,
        discount_cents,
        line_total_cents
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
      item.productId,
      product.name,
      item.quantity,
      item.unitPriceCents,
      product.purchasePriceCents,
      lineDiscount,
      lineTotal,
    );

    database.prepare(`
      UPDATE products
      SET current_stock_quantity = current_stock_quantity - ?, updated_at = ?
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
      ) VALUES (?, 'SALE', ?, 'sales_invoice', ?, 'Point-of-sale sale', ?, ?)
    `).run(item.productId, -item.quantity, invoiceId, input.cashierId, issuedAt);
  }

  if (total > 0) {
    database.prepare(`
      INSERT INTO treasury_transactions (
        transaction_type, direction, amount_cents, payment_method_id,
        reference_type, reference_id, user_id, description, created_at
      ) VALUES ('SALE_PAYMENT', 'IN', ?, ?, 'sales_invoice', ?, ?, ?, ?)
    `).run(total, paymentMethod.id, invoiceId, input.cashierId, `Sale payment for ${invoiceNumber}`, issuedAt);
  }

  return getSalesInvoiceById(database, invoiceId)!;
}
