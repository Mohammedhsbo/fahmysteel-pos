export type PaymentMethodCode = 'CASH' | 'VODAFONE_CASH' | 'INSTAPAY' | 'VISA';

export type PaymentMethodSettings = {
  vodafoneCashNumber: string | null;
  vodafoneCashEnabled: boolean;
  instaPayNumber: string | null;
  instaPayEnabled: boolean;
  visaEnabled: boolean;
  updatedAt: string;
  updatedBy: number | null;
};

export type PaymentMethodOption = {
  id: number;
  code: PaymentMethodCode;
  name: string;
  number: string | null;
};

export type PaymentMethodSettingsInput = {
  vodafoneCashNumber: string;
  vodafoneCashEnabled: boolean;
  instaPayNumber: string;
  instaPayEnabled: boolean;
  visaEnabled: boolean;
};

export interface PaymentMethodsApi {
  getSettings: () => Promise<PaymentMethodSettings>;
  updateSettings: (input: PaymentMethodSettingsInput) => Promise<PaymentMethodSettings>;
  listSalesOptions: () => Promise<PaymentMethodOption[]>;
}