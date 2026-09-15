export type SalesInvoiceStatus = 'PAID' | 'PARTIALLY_PAID' | 'CREDIT' | 'CANCELLED' | 'RETURNED';
export type SalesInvoiceDiscountType = 'FIXED' | 'PERCENT';

export type SalesInvoiceItem = {
  id: number;
  invoiceId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  unitCostCents: number;
  discountCents: number;
  lineTotalCents: number;
};

export type SalesInvoiceFinancialBreakdown = {
  subtotalCents: number;
  discountType: SalesInvoiceDiscountType;
  discountValueCents: number;
  discountPercentage: number;
  discountCents: number;
  afterDiscountCents: number;
  taxEnabled: boolean;
  taxRatePercent: number;
  taxCents: number;
  cashExpensesCents: number;
  totalCents: number;
};

export type SalesInvoice = {
  id: number;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  cashierId: number;
  shiftId: number | null;
  status: SalesInvoiceStatus;
  subtotalCents: number;
  discountType: SalesInvoiceDiscountType;
  discountValueCents: number;
  discountPercentage: number;
  discountCents: number;
  discountAmountCents: number;
  taxEnabled: boolean;
  taxRatePercent: number;
  taxCents: number;
  cashExpensesCents: number;
  totalCents: number;
  paidCents: number;
  paymentMethodCode: string | null;
  paymentMethodName: string | null;
  cardLast4: string | null;
  notes: string | null;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
  items: SalesInvoiceItem[];
};

export type SalesInvoiceLineInput = {
  productId: number;
  quantity: number;
  unitPriceCents: number;
  discountCents?: number;
};

export type SalesInvoiceInput = {
  customerId?: number | null;
  cashierId: number;
  shiftId?: number | null;
  paymentMethodId?: number | null;
  cardNumber?: string | null;
  notes?: string | null;
  discountType?: SalesInvoiceDiscountType;
  discountValueCents?: number;
  discountPercentage?: number;
  taxEnabled?: boolean;
  taxRatePercent?: number;
  cashExpensesCents?: number;
  items: SalesInvoiceLineInput[];
};

function toNonNegativeFiniteNumber(value: number, fieldName: string): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new Error(`${fieldName} must be a valid non-negative number.`);
  }
  return numericValue;
}

function toPercentage(value: number, fieldName: string): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
    throw new Error(`${fieldName} must be a valid percentage between 0 and 100.`);
  }
  return numericValue;
}

export function calculateSalesInvoiceFinancials(input: {
  subtotalCents?: number;
  discountType?: SalesInvoiceDiscountType;
  discountValueCents?: number;
  discountPercentage?: number;
  taxEnabled?: boolean;
  taxRatePercent?: number;
  cashExpensesCents?: number;
}): SalesInvoiceFinancialBreakdown {
  const subtotalCents = Math.max(0, Math.round(toNonNegativeFiniteNumber(input.subtotalCents ?? 0, 'Subtotal')));
  const discountType: SalesInvoiceDiscountType = input.discountType === 'PERCENT' ? 'PERCENT' : 'FIXED';
  const discountValueCents = Math.max(0, Math.round(toNonNegativeFiniteNumber(input.discountValueCents ?? 0, 'Discount value')));
  const discountPercentage = discountType === 'PERCENT'
    ? toPercentage(input.discountPercentage ?? 0, 'Discount percentage')
    : 0;

  let discountCents = 0;
  if (discountType === 'PERCENT') {
    discountCents = Math.round((subtotalCents * discountPercentage) / 100);
  } else {
    discountCents = Math.min(subtotalCents, discountValueCents);
  }

  const afterDiscountCents = Math.max(0, subtotalCents - discountCents);
  const taxEnabled = Boolean(input.taxEnabled);
  const taxRatePercent = taxEnabled ? toPercentage(input.taxRatePercent ?? 0, 'Tax rate') : 0;
  const taxCents = taxEnabled ? Math.round((afterDiscountCents * taxRatePercent) / 100) : 0;
  const cashExpensesCents = Math.max(0, Math.round(toNonNegativeFiniteNumber(input.cashExpensesCents ?? 0, 'Cash expenses')));
  const totalCents = afterDiscountCents + taxCents + cashExpensesCents;

  return {
    subtotalCents,
    discountType,
    discountValueCents: discountType === 'FIXED' ? discountValueCents : 0,
    discountPercentage,
    discountCents,
    afterDiscountCents,
    taxEnabled,
    taxRatePercent,
    taxCents,
    cashExpensesCents,
    totalCents,
  };
}

export interface SalesApi {
  listSalesInvoices: (search?: string) => Promise<SalesInvoice[]>;
  getSalesInvoice: (invoiceId: number) => Promise<SalesInvoice | null>;
  createSalesInvoice: (input: SalesInvoiceInput) => Promise<SalesInvoice>;
  printSalesInvoice: (invoiceId: number) => Promise<void>;
}
