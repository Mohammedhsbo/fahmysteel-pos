export type ReceivableRecord = {
  invoiceId: number;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string;
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  issuedAt: string;
};

export type PayableRecord = {
  invoiceId: number;
  invoiceNumber: string;
  supplierId: number;
  supplierName: string;
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  issuedAt: string;
};

export interface BalancesApi {
  listReceivables: () => Promise<ReceivableRecord[]>;
  listPayables: () => Promise<PayableRecord[]>;
}
