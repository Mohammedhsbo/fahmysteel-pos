export type SalesReturnItem = {
  id: number;
  returnId: number;
  originalItemId: number;
  productId: number;
  productName: string;
  quantity: number;
  refundCents: number;
};

export type SalesReturnRecord = {
  id: number;
  returnNumber: string;
  originalInvoiceId: number;
  customerId: number | null;
  customerName: string | null;
  createdBy: number;
  createdByName: string;
  refundCents: number;
  status: 'COMPLETED' | 'CANCELLED';
  reason: string | null;
  returnedAt: string;
  createdAt: string;
  items: SalesReturnItem[];
};

export type SalesReturnLineInput = {
  originalItemId: number;
  quantity: number;
  refundCents: number;
};

export type SalesReturnInput = {
  originalInvoiceId: number;
  customerId?: number | null;
  reason?: string | null;
  items: SalesReturnLineInput[];
};

export interface ReturnsApi {
  listSalesReturns: (search?: string) => Promise<SalesReturnRecord[]>;
  createSalesReturn: (input: SalesReturnInput) => Promise<SalesReturnRecord>;
}
