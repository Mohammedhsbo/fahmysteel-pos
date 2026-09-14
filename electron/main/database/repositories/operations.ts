import type Database from 'better-sqlite3';
import type { AuditLogRecord, CashierShiftRecord } from '../../../../shared/operations.js';
import { getSession } from '../../auth.js';

function normalizeSearch(search?: string): string {
  return `%${(search ?? '').trim()}%`;
}

export function listAuditLogs(database: Database.Database, search?: string): AuditLogRecord[] {
  const term = normalizeSearch(search);
  return database.prepare(`
    SELECT
      al.id,
      al.user_id AS userId,
      al.action,
      al.entity,
      al.entity_id AS entityId,
      al.details,
      al.created_at AS createdAt,
      u.display_name AS displayName
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.action LIKE ?
      OR al.entity LIKE ?
      OR COALESCE(al.details, '') LIKE ?
      OR COALESCE(u.display_name, '') LIKE ?
    ORDER BY al.created_at DESC
    LIMIT 200
  `).all(term, term, term, term) as AuditLogRecord[];
}

export function listShifts(database: Database.Database, search?: string): CashierShiftRecord[] {
  const term = normalizeSearch(search);
  return database.prepare(`
    SELECT
      cs.id,
      cs.cashier_id AS cashierId,
      u.display_name AS cashierName,
      cs.opening_cash_cents AS openingCashCents,
      cs.closing_cash_cents AS closingCashCents,
      cs.expected_cash_cents AS expectedCashCents,
      cs.difference_cents AS differenceCents,
      cs.status,
      cs.opened_at AS openedAt,
      cs.closed_at AS closedAt,
      cs.closing_notes AS closingNotes
    FROM cashier_shifts cs
    INNER JOIN users u ON u.id = cs.cashier_id
    WHERE u.display_name LIKE ?
      OR cs.status LIKE ?
    ORDER BY cs.opened_at DESC
    LIMIT 200
  `).all(term, term) as CashierShiftRecord[];
}

export function openShift(database: Database.Database, input: { openingCashCents: number }): CashierShiftRecord {
  const session = getSession();
  if (!session) throw new Error('Authentication required.');
  if (!Number.isFinite(input.openingCashCents) || input.openingCashCents < 0) {
    throw new Error('Opening cash must be a valid non-negative amount.');
  }

  const activeShift = database.prepare('SELECT id FROM cashier_shifts WHERE cashier_id = ? AND status = ?').get(session.id, 'OPEN') as { id: number } | undefined;
  if (activeShift) throw new Error('A cashier shift is already open for this user.');

  const now = new Date().toISOString();
  const result = database.prepare(`
    INSERT INTO cashier_shifts (cashier_id, opening_cash_cents, status, opened_at)
    VALUES (?, ?, 'OPEN', ?)
  `).run(session.id, input.openingCashCents, now);

  return getShiftById(database, Number(result.lastInsertRowid))!;
}

export function getShiftById(database: Database.Database, shiftId: number): CashierShiftRecord | null {
  const row = database.prepare(`
    SELECT
      cs.id,
      cs.cashier_id AS cashierId,
      u.display_name AS cashierName,
      cs.opening_cash_cents AS openingCashCents,
      cs.closing_cash_cents AS closingCashCents,
      cs.expected_cash_cents AS expectedCashCents,
      cs.difference_cents AS differenceCents,
      cs.status,
      cs.opened_at AS openedAt,
      cs.closed_at AS closedAt,
      cs.closing_notes AS closingNotes
    FROM cashier_shifts cs
    INNER JOIN users u ON u.id = cs.cashier_id
    WHERE cs.id = ?
  `).get(shiftId) as CashierShiftRecord | undefined;

  return row ?? null;
}

export function closeShift(
  database: Database.Database,
  shiftId: number,
  input: { closingCashCents: number; expectedCashCents: number; closingNotes?: string | null },
): CashierShiftRecord {
  const session = getSession();
  if (!session) throw new Error('Authentication required.');

  const shift = getShiftById(database, shiftId);
  if (!shift) throw new Error('Cashier shift not found.');
  if (shift.cashierId !== session.id && session.role !== 'ADMIN') throw new Error('You do not have permission to close this shift.');
  if (shift.status === 'CLOSED') throw new Error('This shift is already closed.');

  const closingCashCents = Math.max(0, Math.floor(input.closingCashCents));
  const expectedCashCents = Math.max(0, Math.floor(input.expectedCashCents));
  const differenceCents = closingCashCents - expectedCashCents;
  const closedAt = new Date().toISOString();

  database.prepare(`
    UPDATE cashier_shifts
    SET closing_cash_cents = ?, expected_cash_cents = ?, difference_cents = ?, status = 'CLOSED', closed_at = ?, closing_notes = ?
    WHERE id = ?
  `).run(closingCashCents, expectedCashCents, differenceCents, closedAt, input.closingNotes?.trim() || null, shiftId);

  return getShiftById(database, shiftId)!;
}
