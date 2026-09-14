export type PartyRecord = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerRecord = PartyRecord;
export type SupplierRecord = PartyRecord;

export type PartyInput = {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
};

export interface CustomerApi {
  listCustomers: (search?: string) => Promise<CustomerRecord[]>;
  getCustomer: (customerId: number) => Promise<CustomerRecord | null>;
  createCustomer: (input: PartyInput) => Promise<CustomerRecord>;
  updateCustomer: (customerId: number, input: Partial<PartyInput>) => Promise<CustomerRecord>;
  archiveCustomer: (customerId: number) => Promise<void>;
}

export interface SupplierApi {
  listSuppliers: (search?: string) => Promise<SupplierRecord[]>;
  getSupplier: (supplierId: number) => Promise<SupplierRecord | null>;
  createSupplier: (input: PartyInput) => Promise<SupplierRecord>;
  updateSupplier: (supplierId: number, input: Partial<PartyInput>) => Promise<SupplierRecord>;
  archiveSupplier: (supplierId: number) => Promise<void>;
}
