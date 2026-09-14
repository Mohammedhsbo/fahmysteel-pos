export type TreasuryTransactionType = 'SALE_PAYMENT' | 'PURCHASE_PAYMENT' | 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT' | 'EXPENSE' | 'OTHER_INCOME' | 'REFUND' | 'ADJUSTMENT';
export type TreasuryDirection = 'IN' | 'OUT';

export type TreasuryTransaction = {
  id: number;
  transactionType: TreasuryTransactionType;
  direction: TreasuryDirection;
  amountCents: number;
  paymentMethodId: number;
  paymentMethodName: string;
  referenceType: string | null;
  referenceId: number | null;
  userId: number;
  description: string | null;
  createdAt: string;
};

export type ExpenseRecord = {
  id: number;
  category: string;
  amountCents: number;
  paymentMethodId: number;
  paymentMethodName: string;
  description: string | null;
  expenseDate: string;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: string;
};

export type TreasuryApi = {
  listTransactions: (search?: string) => Promise<TreasuryTransaction[]>;
  createExpense: (input: {
    category: string;
    amountCents: number;
    paymentMethodId: number;
    description?: string | null;
    expenseDate?: string;
  }) => Promise<ExpenseRecord>;
  listPaymentMethods: () => Promise<Array<{ id: number; code: string; name: string }>>;
};
