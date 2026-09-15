import type Database from 'better-sqlite3';
import { recordAudit } from '../audit.js';
import { getProductById } from './catalog.js';
import { calculateSalesInvoiceFinancials, type SalesInvoice, type SalesInvoiceInput, type SalesInvoiceItem, type SalesInvoiceLineInput } from '../../../../shared/sales.js';

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

function coalesceSalesInvoiceRecord(row: any): SalesInvoice {
  const discountType = row.discountType === 'PERCENT' ? 'PERCENT' : 'FIXED';
  const discountValueCents = Number(row.discountValueCents ?? 0);
  const discountPercentage = Number(row.discountPercentage ?? 0);
  const taxEnabled = Boolean(Number(row.taxEnabled ?? 0));
  const taxRatePercent = Number(row.taxRatePercent ?? 0);
  const cashExpensesCents = Number(row.cashExpensesCents ?? 0);
  const discountAmountCents = Number(row.discountAmountCents ?? row.discountCents ?? 0);
  const taxAmountCents = Number(row.taxAmountCents ?? row.taxCents ?? 0);

  return {
    ...row,
    discountType,
    discountValueCents,
    discountPercentage,
    discountAmountCents,
    discountCents: Number(row.discountCents ?? discountAmountCents),
    taxEnabled,
    taxRatePercent,
    taxCents: Number(row.taxCents ?? taxAmountCents),
    cashExpensesCents,
    totalCents: Number(row.totalCents ?? row.finalTotalCents ?? 0),
    paidCents: Number(row.paidCents ?? 0),
  } as SalesInvoice;
}

export function listSalesInvoices(database: Database.Database, search?: string): SalesInvoice[] {
  const term = normalizeSearch(search);
  const rows = database.prepare(`
    SELECT
      si.id,
      si.invoice_number AS invoiceNumber,
      si.customer_id AS customerId,
      c.name AS customerName,
      c.phone AS customerPhone,
      c.address AS customerAddress,
      si.cashier_id AS cashierId,
      si.shift_id AS shiftId,
      si.status,
      si.subtotal_cents AS subtotalCents,
      si.discount_type AS discountType,
      si.discount_value_cents AS discountValueCents,
      si.discount_percentage AS discountPercentage,
      si.discount_amount_cents AS discountAmountCents,
      si.discount_cents AS discountCents,
      si.tax_enabled AS taxEnabled,
      si.tax_rate_percent AS taxRatePercent,
      si.tax_cents AS taxCents,
      si.tax_amount_cents AS taxAmountCents,
      si.cash_expenses_cents AS cashExpensesCents,
      si.total_cents AS totalCents,
      si.paid_cents AS paidCents,
      pm.code AS paymentMethodCode,
      pm.name AS paymentMethodName,
      si.card_last4 AS cardLast4,
      si.notes,
      si.issued_at AS issuedAt,
      si.created_at AS createdAt,
      si.updated_at AS updatedAt
    FROM sales_invoices si
    LEFT JOIN customers c ON c.id = si.customer_id
    LEFT JOIN payment_methods pm ON pm.id = si.payment_method_id
    WHERE si.status != 'CANCELLED'
      AND (
        si.invoice_number LIKE ?
        OR COALESCE(c.name, '') LIKE ?
        OR COALESCE(si.notes, '') LIKE ?
      )
    ORDER BY si.issued_at DESC
    LIMIT 200
  `).all(term, term, term) as Array<any>;

  return rows.map((invoice) => ({ ...coalesceSalesInvoiceRecord(invoice), items: listInvoiceItems(database, invoice.id) }));
}

export function getSalesInvoiceById(database: Database.Database, invoiceId: number): SalesInvoice | null {
  const row = database.prepare(`
    SELECT
      si.id,
      si.invoice_number AS invoiceNumber,
      si.customer_id AS customerId,
      c.name AS customerName,
      c.phone AS customerPhone,
      c.address AS customerAddress,
      si.cashier_id AS cashierId,
      si.shift_id AS shiftId,
      si.status,
      si.subtotal_cents AS subtotalCents,
      si.discount_type AS discountType,
      si.discount_value_cents AS discountValueCents,
      si.discount_percentage AS discountPercentage,
      si.discount_amount_cents AS discountAmountCents,
      si.discount_cents AS discountCents,
      si.tax_enabled AS taxEnabled,
      si.tax_rate_percent AS taxRatePercent,
      si.tax_cents AS taxCents,
      si.tax_amount_cents AS taxAmountCents,
      si.cash_expenses_cents AS cashExpensesCents,
      si.total_cents AS totalCents,
      si.paid_cents AS paidCents,
      pm.code AS paymentMethodCode,
      pm.name AS paymentMethodName,
      si.card_last4 AS cardLast4,
      si.notes,
      si.issued_at AS issuedAt,
      si.created_at AS createdAt,
      si.updated_at AS updatedAt
    FROM sales_invoices si
    LEFT JOIN customers c ON c.id = si.customer_id
    LEFT JOIN payment_methods pm ON pm.id = si.payment_method_id
    WHERE si.id = ?
  `).get(invoiceId) as any | undefined;

  if (!row) return null;

  return { ...coalesceSalesInvoiceRecord(row), items: listInvoiceItems(database, invoiceId) };
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
    'SELECT id, code FROM payment_methods WHERE id = COALESCE(?, (SELECT id FROM payment_methods WHERE code = ?)) AND is_active = 1'
  ).get(input.paymentMethodId ?? null, 'CASH') as { id: number; code: string } | undefined;
  if (!paymentMethod) throw new Error('Invalid payment method.');

  const cardNumber = input.cardNumber?.replace(/\s+/g, '') ?? '';
  let cardLast4: string | null = null;
  if (paymentMethod.code === 'VISA') {
    if (!/^\d{12,19}$/.test(cardNumber)) throw new Error('Enter a valid card number.');
    cardLast4 = cardNumber.slice(-4);
  } else if (input.cardNumber) {
    throw new Error('Card details are only valid for Visa payments.');
  }
  const settings = database.prepare(`
    SELECT vodafone_cash_enabled AS vodafoneCashEnabled, instapay_enabled AS instaPayEnabled, visa_enabled AS visaEnabled
    FROM payment_method_settings WHERE id = 1
  `).get() as { vodafoneCashEnabled: number; instaPayEnabled: number; visaEnabled: number } | undefined;
  if (paymentMethod.code === 'VODAFONE_CASH' && !settings?.vodafoneCashEnabled) throw new Error('Vodafone Cash is disabled.');
  if (paymentMethod.code === 'INSTAPAY' && !settings?.instaPayEnabled) throw new Error('InstaPay is disabled.');
  if (paymentMethod.code === 'VISA' && !settings?.visaEnabled) throw new Error('Visa / Card is disabled.');

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

  const financial = calculateSalesInvoiceFinancials({
    subtotalCents: subtotal,
    discountType: input.discountType ?? 'FIXED',
    discountValueCents: input.discountType === 'FIXED' ? (input.discountValueCents ?? 0) : 0,
    discountPercentage: input.discountType === 'PERCENT' ? (input.discountPercentage ?? 0) : 0,
    taxEnabled: Boolean(input.taxEnabled),
    taxRatePercent: input.taxRatePercent ?? 0,
    cashExpensesCents: input.cashExpensesCents ?? 0,
  });

  if (financial.discountCents > subtotal) {
    throw new Error('Discount cannot exceed the subtotal.');
  }

  if (financial.taxEnabled && financial.taxRatePercent > 100) {
    throw new Error('Tax rate cannot exceed 100%.');
  }

  const total = financial.totalCents;
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
      discount_type,
      discount_value_cents,
      discount_percentage,
      discount_amount_cents,
      discount_cents,
      tax_enabled,
      tax_rate_percent,
      tax_cents,
      tax_amount_cents,
      cash_expenses_cents,
      total_cents,
      paid_cents,
      payment_method_id,
      card_last4,
      notes,
      issued_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    invoiceNumber,
    input.customerId ?? null,
    input.cashierId,
    input.shiftId ?? null,
    total > 0 ? 'PAID' : 'CANCELLED',
    subtotal,
    financial.discountType,
    financial.discountValueCents,
    financial.discountPercentage,
    financial.discountCents,
    financial.discountCents,
    financial.taxEnabled ? 1 : 0,
    financial.taxRatePercent,
    financial.taxCents,
    financial.taxCents,
    financial.cashExpensesCents,
    total,
    total,
    paymentMethod.id,
    cardLast4,
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

  const paymentNames: Record<string, string> = {
    CASH: 'Cash',
    VODAFONE_CASH: 'Vodafone Cash',
    INSTAPAY: 'InstaPay',
    VISA: 'Visa',
  };
  const paymentLabel = paymentMethod.code === 'VISA'
    ? `Payment: Visa; Card: **** **** **** ${cardLast4}`
    : `Payment: ${paymentNames[paymentMethod.code] ?? 'Cash'}`;
  const auditText = [
    `Payment: ${paymentLabel}`,
    `Discount: ${financial.discountCents} cents`,
    `Tax enabled: ${financial.taxEnabled ? 'yes' : 'no'}`,
    `Tax rate: ${financial.taxRatePercent}%`,
    `Tax amount: ${financial.taxCents} cents`,
    `Cash expenses: ${financial.cashExpensesCents} cents`,
    `Final total: ${financial.totalCents} cents`,
  ].join('; ');
  recordAudit(database, 'CREATE', 'SALE', invoiceId, auditText);

  return getSalesInvoiceById(database, invoiceId)!;
}
