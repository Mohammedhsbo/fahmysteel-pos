export type PurchaseReturnItem = {
  id: number;
  returnId: number;
  originalItemId: number;
  productId: number;
  productName: string;
  quantity: number;
  refundCents: number;
};

export type PurchaseReturnRecord = {
  id: number;
  returnNumber: string;
  originalInvoiceId: number;
  supplierId: number | null;
  supplierName: string | null;
  createdBy: number;
  createdByName: string;
  refundCents: number;
  status: 'COMPLETED' | 'CANCELLED';
  reason: string | null;
  returnedAt: string;
  createdAt: string;
  items: PurchaseReturnItem[];
};

export type PurchaseReturnInput = {
  originalInvoiceId: number;
  supplierId?: number | null;
  reason?: string | null;
  items: Array<{ originalItemId: number; quantity: number; refundCents: number }>;
};

export interface PurchaseReturnsApi {
  listPurchaseReturns: (search?: string) => Promise<PurchaseReturnRecord[]>;
  createPurchaseReturn: (input: PurchaseReturnInput) => Promise<PurchaseReturnRecord>;
}
