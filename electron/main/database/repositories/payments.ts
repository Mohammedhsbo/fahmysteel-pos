import type Database from 'better-sqlite3';
import { getSession } from '../../auth.js';
import { recordAudit } from '../audit.js';
import type { PaymentInput, PaymentRecord } from '../../../../shared/payments.js';

export function createPayment(database: Database.Database, input: PaymentInput): PaymentRecord {
  const session = getSession();
  if (!session) throw new Error('Authentication required.');
  if (!Number.isInteger(input.partyId) || !Number.isInteger(input.invoiceId) || input.amountCents <= 0) {
    throw new Error('A valid party, invoice, and positive payment amount are required.');
  }

  const paymentMethod = database.prepare('SELECT id, name FROM payment_methods WHERE id = ? AND is_active = 1').get(input.paymentMethodId) as { id: number; name: string } | undefined;
  if (!paymentMethod) throw new Error('Invalid payment method.');

  const isCustomer = input.partyType === 'CUSTOMER';
  const invoice = isCustomer
    ? database.prepare(`SELECT id, customer_id AS partyId, total_cents AS totalCents, paid_cents AS paidCents, status FROM sales_invoices WHERE id = ? AND status != 'CANCELLED'`).get(input.invoiceId)
    : database.prepare(`SELECT id, supplier_id AS partyId, total_cents AS totalCents, paid_cents AS paidCents, status FROM purchase_invoices WHERE id = ? AND status != 'CANCELLED'`).get(input.invoiceId);

  const invoiceRow = invoice as { id: number; partyId: number; totalCents: number; paidCents: number; status: string } | undefined;
  if (!invoiceRow || invoiceRow.partyId !== input.partyId) throw new Error('Invoice does not belong to the selected party.');
  const outstanding = invoiceRow.totalCents - invoiceRow.paidCents;
  if (input.amountCents > outstanding) throw new Error('Payment cannot exceed the invoice balance.');

  const now = new Date().toISOString();
  const direction = isCustomer ? 'IN' : 'OUT';
  const transactionType = isCustomer ? 'CUSTOMER_PAYMENT' : 'SUPPLIER_PAYMENT';
  const nextPaid = invoiceRow.paidCents + input.amountCents;
  const nextStatus = nextPaid >= invoiceRow.totalCents ? 'PAID' : 'PARTIALLY_PAID';

  const transactionId = database.transaction(() => {
    const result = database.prepare(`
      INSERT INTO treasury_transactions (
        transaction_type, direction, amount_cents, payment_method_id,
        reference_type, reference_id, user_id, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transactionType,
      direction,
      input.amountCents,
      input.paymentMethodId,
      isCustomer ? 'sales_invoice' : 'purchase_invoice',
      input.invoiceId,
      session.id,
      input.description?.trim() || `${transactionType === 'CUSTOMER_PAYMENT' ? 'Customer' : 'Supplier'} payment for invoice ${input.invoiceId}`,
      now,
    );

    if (isCustomer) {
      database.prepare('UPDATE sales_invoices SET paid_cents = ?, status = ?, updated_at = ? WHERE id = ?').run(nextPaid, nextStatus, now, input.invoiceId);
    } else {
      database.prepare('UPDATE purchase_invoices SET paid_cents = ?, status = ?, updated_at = ? WHERE id = ?').run(nextPaid, nextStatus, now, input.invoiceId);
    }

    return Number(result.lastInsertRowid);
  })();

  recordAudit(database, 'CREATE', 'PAYMENT', transactionId, `${transactionType} for invoice ${input.invoiceId}`);

  return database.prepare(`
    SELECT
      tt.id,
      CASE WHEN tt.transaction_type = 'CUSTOMER_PAYMENT' THEN 'CUSTOMER' ELSE 'SUPPLIER' END AS partyType,
      ${isCustomer ? 'si.customer_id' : 'pi.supplier_id'} AS partyId,
      tt.reference_id AS invoiceId,
      tt.amount_cents AS amountCents,
      tt.payment_method_id AS paymentMethodId,
      pm.name AS paymentMethodName,
      tt.direction,
      tt.description,
      tt.created_at AS createdAt
    FROM treasury_transactions tt
    INNER JOIN payment_methods pm ON pm.id = tt.payment_method_id
    ${isCustomer ? 'INNER JOIN sales_invoices si ON si.id = tt.reference_id' : 'INNER JOIN purchase_invoices pi ON pi.id = tt.reference_id'}
    WHERE tt.id = ?
  `).get(transactionId) as PaymentRecord;
}
