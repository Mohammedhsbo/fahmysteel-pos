export type SupportedLocale = 'en' | 'ar';
export type UserRole = 'ADMIN' | 'CASHIER';

export interface AppInfo {
  name: string;
  logoDataUrl: string | null;
  version: string;
  locale: SupportedLocale;
  isAuthenticated: boolean;
}

export interface SessionUser {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
}

export interface AuthState {
  session: SessionUser | null;
  requiresSetup: boolean;
}

export interface AuthApi {
  login(username: string, password: string): Promise<SessionUser>;
  bootstrapAdmin(username: string, displayName: string, password: string): Promise<SessionUser>;
  logout(): Promise<void>;
  getSession(): Promise<SessionUser | null>;
  getState(): Promise<AuthState>;
  hasPermission(permissionCode: string): Promise<boolean>;
}

import type { AdminApi } from './admin.js';
import type { BalancesApi } from './balances.js';
import type { BackupsApi } from './backups.js';
import type { CustomerApi, SupplierApi } from './contacts.js';
import type { InventoryApi } from './inventory.js';
import type { OperationsApi } from './operations.js';
import type { PaymentsApi } from './payments.js';
import type { PaymentMethodsApi } from './payment-methods.js';
import type { PurchaseReturnsApi } from './purchase-returns.js';
import type { PurchasesApi } from './purchases.js';
import type { ReportsApi } from './reports.js';
import type { ReturnsApi } from './returns.js';
import type { SalesApi } from './sales.js';
import type { TreasuryApi } from './treasury.js';

export interface DesktopApi {
  getAppInfo(): Promise<AppInfo>;
  auth: AuthApi;
  admin: AdminApi;
  balances: BalancesApi;
  backups: BackupsApi;
  inventory: InventoryApi;
  operations: OperationsApi;
  payments: PaymentsApi;
  paymentMethods: PaymentMethodsApi;
  catalog: {
    listUnits: () => Promise<unknown[]>;
    listCategories: () => Promise<unknown[]>;
    createCategory: (input: unknown) => Promise<unknown>;
    updateCategory: (categoryId: number, input: unknown) => Promise<unknown>;
    archiveCategory: (categoryId: number) => Promise<void>;
    listProducts: (search?: string) => Promise<unknown[]>;
    listLowStock: () => Promise<unknown[]>;
    createProduct: (input: unknown) => Promise<unknown>;
    updateProduct: (productId: number, input: unknown) => Promise<unknown>;
    archiveProduct: (productId: number) => Promise<void>;
  };
  customers: CustomerApi;
  suppliers: SupplierApi;
  sales: SalesApi;
  returns: ReturnsApi;
  purchaseReturns: PurchaseReturnsApi;
  purchases: PurchasesApi;
  treasury: TreasuryApi;
  reports: ReportsApi;
}

declare global {
  interface Window {
    api: DesktopApi;
  }
}
