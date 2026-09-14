export type SalesInvoiceStatus = 'PAID' | 'PARTIALLY_PAID' | 'CREDIT' | 'CANCELLED' | 'RETURNED';

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

export type SalesInvoice = {
  id: number;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string | null;
  cashierId: number;
  shiftId: number | null;
  status: SalesInvoiceStatus;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
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
  notes?: string | null;
  items: SalesInvoiceLineInput[];
};

export interface SalesApi {
  listSalesInvoices: (search?: string) => Promise<SalesInvoice[]>;
  getSalesInvoice: (invoiceId: number) => Promise<SalesInvoice | null>;
  createSalesInvoice: (input: SalesInvoiceInput) => Promise<SalesInvoice>;
  printSalesInvoice: (invoiceId: number) => Promise<void>;
}
