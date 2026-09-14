import type Database from 'better-sqlite3';
import type { ExpenseRecord, TreasuryTransaction, TreasuryTransactionType } from '../../../../shared/treasury.js';

export function listPaymentMethods(database: Database.Database): Array<{ id: number; code: string; name: string }> {
  return database.prepare(`
    SELECT id, code, name
    FROM payment_methods
    WHERE is_active = 1
    ORDER BY name ASC
  `).all() as Array<{ id: number; code: string; name: string }>;
}

export function listTransactions(database: Database.Database, search?: string): TreasuryTransaction[] {
  const term = `%${(search ?? '').trim()}%`;
  return database.prepare(`
    SELECT
      tt.id,
      tt.transaction_type AS transactionType,
      tt.direction,
      tt.amount_cents AS amountCents,
      tt.payment_method_id AS paymentMethodId,
      pm.name AS paymentMethodName,
      tt.reference_type AS referenceType,
      tt.reference_id AS referenceId,
      tt.user_id AS userId,
      tt.description,
      tt.created_at AS createdAt
    FROM treasury_transactions tt
    LEFT JOIN payment_methods pm ON pm.id = tt.payment_method_id
    WHERE
      tt.description LIKE ?
      OR pm.name LIKE ?
      OR tt.transaction_type LIKE ?
    ORDER BY tt.created_at DESC
    LIMIT 200
  `).all(term, term, term) as TreasuryTransaction[];
}

export function createExpense(
  database: Database.Database,
  input: {
    category: string;
    amountCents: number;
    paymentMethodId: number;
    description?: string | null;
    expenseDate?: string;
  },
): ExpenseRecord {
  const category = input.category.trim();
  if (!category) throw new Error('Expense category is required.');
  if (Number(input.amountCents) <= 0) throw new Error('Expense amount must be greater than zero.');

  const paymentMethod = database.prepare('SELECT id FROM payment_methods WHERE id = ? AND is_active = 1').get(input.paymentMethodId) as { id: number } | undefined;
  if (!paymentMethod) throw new Error('Invalid payment method.');

  const createdBy = database.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get() as { id: number } | undefined;
  if (!createdBy) throw new Error('No active user is available to record the expense.');

  const expenseDate = input.expenseDate ?? new Date().toISOString();
  const now = new Date().toISOString();

  const tx = database.transaction(() => {
    const treasuryResult = database.prepare(`
      INSERT INTO treasury_transactions (
        transaction_type,
        direction,
        amount_cents,
        payment_method_id,
        reference_type,
        reference_id,
        user_id,
        description,
        created_at
      ) VALUES (?, 'OUT', ?, ?, 'expense', NULL, ?, ?, ?)
    `).run('EXPENSE', Number(input.amountCents), input.paymentMethodId, createdBy.id, `Expense: ${category}`, now);

    const expenseResult = database.prepare(`
      INSERT INTO expenses (
        category,
        amount_cents,
        payment_method_id,
        treasury_transaction_id,
        created_by,
        status,
        description,
        expense_date,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
    `).run(
      category,
      Number(input.amountCents),
      input.paymentMethodId,
      treasuryResult.lastInsertRowid,
      createdBy.id,
      input.description?.trim() || null,
      expenseDate,
      now,
      now,
    );

    return database.prepare(`
      SELECT
        e.id,
        e.category,
        e.amount_cents AS amountCents,
        e.payment_method_id AS paymentMethodId,
        pm.name AS paymentMethodName,
        e.description,
        e.expense_date AS expenseDate,
        e.status,
        e.created_at AS createdAt
      FROM expenses e
      LEFT JOIN payment_methods pm ON pm.id = e.payment_method_id
      WHERE e.id = ?
    `).get(Number(expenseResult.lastInsertRowid)) as ExpenseRecord;
  });

  return tx();
}
