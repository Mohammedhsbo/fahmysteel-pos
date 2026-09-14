export type PaymentPartyType = 'CUSTOMER' | 'SUPPLIER';

export type PaymentInput = {
  partyType: PaymentPartyType;
  partyId: number;
  invoiceId: number;
  amountCents: number;
  paymentMethodId: number;
  description?: string | null;
};

export type PaymentRecord = {
  id: number;
  partyType: PaymentPartyType;
  partyId: number;
  invoiceId: number;
  amountCents: number;
  paymentMethodId: number;
  paymentMethodName: string;
  direction: 'IN' | 'OUT';
  description: string | null;
  createdAt: string;
};

export interface PaymentsApi {
  createPayment: (input: PaymentInput) => Promise<PaymentRecord>;
}
