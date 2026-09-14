import type Database from 'better-sqlite3';
import type { PayableRecord, ReceivableRecord } from '../../../../shared/balances.js';

export function listReceivables(database: Database.Database): ReceivableRecord[] {
  return database.prepare(`
    SELECT
      si.id AS invoiceId,
      si.invoice_number AS invoiceNumber,
      si.customer_id AS customerId,
      COALESCE(c.name, 'Walk-in customer') AS customerName,
      si.total_cents AS totalCents,
      si.paid_cents AS paidCents,
      si.total_cents - si.paid_cents AS outstandingCents,
      si.issued_at AS issuedAt
    FROM sales_invoices si
    LEFT JOIN customers c ON c.id = si.customer_id
    WHERE si.status != 'CANCELLED' AND si.total_cents > si.paid_cents
    ORDER BY si.issued_at ASC
    LIMIT 200
  `).all() as ReceivableRecord[];
}

export function listPayables(database: Database.Database): PayableRecord[] {
  return database.prepare(`
    SELECT
      pi.id AS invoiceId,
      pi.invoice_number AS invoiceNumber,
      pi.supplier_id AS supplierId,
      s.name AS supplierName,
      pi.total_cents AS totalCents,
      pi.paid_cents AS paidCents,
      pi.total_cents - pi.paid_cents AS outstandingCents,
      pi.issued_at AS issuedAt
    FROM purchase_invoices pi
    INNER JOIN suppliers s ON s.id = pi.supplier_id
    WHERE pi.status != 'CANCELLED' AND pi.total_cents > pi.paid_cents
    ORDER BY pi.issued_at ASC
    LIMIT 200
  `).all() as PayableRecord[];
}
