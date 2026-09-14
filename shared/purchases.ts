export type PurchaseInvoiceStatus = 'PAID' | 'PARTIALLY_PAID' | 'CREDIT' | 'CANCELLED';

export type PurchaseInvoiceItem = {
  id: number;
  invoiceId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type PurchaseInvoice = {
  id: number;
  invoiceNumber: string;
  supplierId: number | null;
  supplierName: string | null;
  createdBy: number;
  status: PurchaseInvoiceStatus;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paidCents: number;
  notes: string | null;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseInvoiceItem[];
};

export type PurchaseInvoiceLineInput = {
  productId: number;
  quantity: number;
  unitPriceCents: number;
};

export type PurchaseInvoiceInput = {
  supplierId: number | null;
  createdBy: number;
  paymentMethodId?: number | null;
  notes?: string | null;
  items: PurchaseInvoiceLineInput[];
};

export interface PurchasesApi {
  listPurchaseInvoices: (search?: string) => Promise<PurchaseInvoice[]>;
  getPurchaseInvoice: (invoiceId: number) => Promise<PurchaseInvoice | null>;
  createPurchaseInvoice: (input: PurchaseInvoiceInput) => Promise<PurchaseInvoice>;
}
