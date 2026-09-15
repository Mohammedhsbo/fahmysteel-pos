import { app, ipcMain } from 'electron';
import { authenticate, bootstrapAdmin, clearSession, getSession, requiresSetup } from '../auth.js';
import { createBackup, listBackups, restoreBackup } from '../backups.js';
import { getDatabase } from '../database/connection.js';
import { listLowStock } from '../database/repositories/inventory-alerts.js';
import { listPayables, listReceivables } from '../database/repositories/balances.js';
import { adjustStock, getStocktakingReport, listAdjustments } from '../database/repositories/inventory.js';
import { createUser, listSettings, listUsers, resetPassword, setSetting, updateUser } from '../database/repositories/admin.js';
import { archiveCategory, archiveProduct, createCategory, createProduct, listCategories, listProducts, listUnits, updateCategory, updateProduct } from '../database/repositories/catalog.js';
import {
  archiveCustomer,
  archiveSupplier,
  createCustomer,
  createSupplier,
  getCustomerById,
  getSupplierById,
  listCustomers,
  listSuppliers,
  updateCustomer,
  updateSupplier,
} from '../database/repositories/contacts.js';
import { createPurchaseInvoice, getPurchaseInvoiceById, listPurchaseInvoices } from '../database/repositories/purchases.js';
import { createPurchaseReturn, listPurchaseReturns } from '../database/repositories/purchase-returns.js';
import { listAuditLogs, listShifts, openShift, closeShift } from '../database/repositories/operations.js';
import { createPayment } from '../database/repositories/payments.js';
import { getDashboardSummary, getSalesByDay, getTopProducts } from '../database/repositories/reports.js';
import { exportReportsCsv } from '../reports-export.js';
import { createSalesReturn, listSalesReturns } from '../database/repositories/returns.js';
import { createSalesInvoice, getSalesInvoiceById, listSalesInvoices } from '../database/repositories/sales.js';
import { printSalesInvoice } from '../print-invoice.js';
import { printInventoryStocktakingReport, saveInventoryStocktakingReportPdf } from '../inventory-report.js';
import { createExpense, listPaymentMethods, listTransactions } from '../database/repositories/treasury.js';
import { getPaymentMethodSettings, listSalesPaymentMethods, updatePaymentMethodSettings } from '../database/repositories/payment-methods.js';
import { hasPermission, requirePermission } from '../rbac.js';
import type { AppInfo } from '../../../shared/api.js';
import type { CatalogProductInput } from '../../../shared/catalog.js';
import type { PartyInput } from '../../../shared/contacts.js';
import type { PurchaseInvoiceInput } from '../../../shared/purchases.js';
import type { SalesInvoiceInput } from '../../../shared/sales.js';
import type { PaymentMethodSettingsInput } from '../../../shared/payment-methods.js';

export function registerIpcHandlers(): void {
  ipcMain.handle('app:get-info', (): AppInfo => {
    const database = getDatabase();
    const company = database.prepare('SELECT value FROM app_settings WHERE key = ?').get('company_name') as { value: string } | undefined;
    const logo = database.prepare('SELECT value FROM app_settings WHERE key = ?').get('company_logo') as { value: string } | undefined;
    return {
      name: company?.value || 'Fahmy Steel',
      logoDataUrl: logo?.value || null,
      version: app.getVersion(),
      locale: 'en',
      isAuthenticated: getSession() !== null,
    };
  });

  ipcMain.handle('auth:login', (_event, username: unknown, password: unknown) => {
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new Error('Invalid login payload.');
    }

    return authenticate(getDatabase(), username, password);
  });

  ipcMain.handle('auth:bootstrap-admin', (_event, username: unknown, displayName: unknown, password: unknown) => {
    if (typeof username !== 'string' || typeof displayName !== 'string' || typeof password !== 'string') {
      throw new Error('Invalid administrator setup payload.');
    }
    return bootstrapAdmin(getDatabase(), username, displayName, password);
  });

  ipcMain.handle('auth:logout', () => {
    clearSession();
  });

  ipcMain.handle('auth:get-session', () => getSession());
  ipcMain.handle('auth:get-state', () => ({
    session: getSession(),
    requiresSetup: requiresSetup(getDatabase()),
  }));
  ipcMain.handle('auth:has-permission', (_event, permissionCode: unknown) => {
    if (typeof permissionCode !== 'string' || permissionCode.length > 100) return false;
    return hasPermission(getDatabase(), permissionCode);
  });

  ipcMain.handle('admin:list-users', () => {
    requirePermission(getDatabase(), 'users.manage');
    return listUsers(getDatabase());
  });

  ipcMain.handle('admin:create-user', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'users.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid user payload.');
    const payload = input as { username: string; displayName: string; password: string; role: 'ADMIN' | 'CASHIER' };
    return createUser(getDatabase(), payload);
  });

  ipcMain.handle('admin:update-user', (_event, userId: unknown, input: unknown) => {
    requirePermission(getDatabase(), 'users.manage');
    if (typeof userId !== 'number' || !input || typeof input !== 'object') {
      throw new Error('Invalid user update payload.');
    }
    return updateUser(getDatabase(), userId, input as { displayName?: string; role?: 'ADMIN' | 'CASHIER'; isActive?: boolean });
  });

  ipcMain.handle('admin:reset-password', (_event, userId: unknown, password: unknown) => {
    requirePermission(getDatabase(), 'users.manage');
    if (typeof userId !== 'number' || typeof password !== 'string') throw new Error('Invalid password reset payload.');
    resetPassword(getDatabase(), userId, password);
  });

  ipcMain.handle('admin:list-settings', () => {
    requirePermission(getDatabase(), 'settings.manage');
    return listSettings(getDatabase());
  });

  ipcMain.handle('admin:set-setting', (_event, key: unknown, value: unknown) => {
    requirePermission(getDatabase(), 'settings.manage');
    if (typeof key !== 'string' || typeof value !== 'string') throw new Error('Invalid setting payload.');
    return setSetting(getDatabase(), key, value);
  });

  ipcMain.handle('payment-methods:get-settings', () => {
    requirePermission(getDatabase(), 'sales.payment-methods.manage');
    return getPaymentMethodSettings(getDatabase());
  });

  ipcMain.handle('payment-methods:update-settings', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'sales.payment-methods.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid payment method settings payload.');
    return updatePaymentMethodSettings(getDatabase(), input as PaymentMethodSettingsInput);
  });

  ipcMain.handle('payment-methods:list-sales-options', () => {
    requirePermission(getDatabase(), 'sales.payment-methods.view');
    return listSalesPaymentMethods(getDatabase());
  });

  ipcMain.handle('balances:list-receivables', () => {
    requirePermission(getDatabase(), 'treasury.view');
    return listReceivables(getDatabase());
  });

  ipcMain.handle('balances:list-payables', () => {
    requirePermission(getDatabase(), 'treasury.view');
    return listPayables(getDatabase());
  });

  ipcMain.handle('backups:list', () => {
    requirePermission(getDatabase(), 'backup.manage');
    return listBackups();
  });

  ipcMain.handle('backups:create', () => {
    requirePermission(getDatabase(), 'backup.manage');
    return createBackup();
  });

  ipcMain.handle('backups:restore', (_event, backupId: unknown) => {
    requirePermission(getDatabase(), 'backup.manage');
    if (typeof backupId !== 'string') throw new Error('Invalid backup identifier.');
    restoreBackup(backupId);
  });

  ipcMain.handle('inventory:list-adjustments', () => {
    requirePermission(getDatabase(), 'inventory.view');
    return listAdjustments(getDatabase());
  });

  ipcMain.handle('inventory:get-stocktaking-report', () => {
    requirePermission(getDatabase(), 'inventory.view');
    return getStocktakingReport(getDatabase());
  });

  ipcMain.handle('inventory:print-stocktaking-report', async (_event, report: unknown) => {
    requirePermission(getDatabase(), 'inventory.view');
    if (!report || typeof report !== 'object') throw new Error('Invalid stocktaking report payload.');
    await printInventoryStocktakingReport(report as Parameters<typeof printInventoryStocktakingReport>[0]);
  });

  ipcMain.handle('inventory:save-stocktaking-report-pdf', async (_event, report: unknown) => {
    requirePermission(getDatabase(), 'inventory.view');
    if (!report || typeof report !== 'object') throw new Error('Invalid stocktaking report payload.');
    return saveInventoryStocktakingReportPdf(report as Parameters<typeof saveInventoryStocktakingReportPdf>[0]);
  });

  ipcMain.handle('inventory:adjust-stock', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'inventory.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid inventory adjustment payload.');
    return adjustStock(getDatabase(), input as { productId: number; quantityDelta: number; reason: string });
  });

  ipcMain.handle('catalog:list-units', () => {
    requirePermission(getDatabase(), 'inventory.view');
    return listUnits(getDatabase());
  });

  ipcMain.handle('catalog:list-categories', () => {
    requirePermission(getDatabase(), 'inventory.view');
    return listCategories(getDatabase());
  });

  ipcMain.handle('catalog:create-category', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'inventory.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid category payload.');
    return createCategory(getDatabase(), input as { name: string; nameAr: string; description?: string | null });
  });

  ipcMain.handle('catalog:update-category', (_event, categoryId: unknown, input: unknown) => {
    requirePermission(getDatabase(), 'inventory.manage');
    if (typeof categoryId !== 'number' || !input || typeof input !== 'object') throw new Error('Invalid category update payload.');
    return updateCategory(getDatabase(), categoryId, input as { name?: string; nameAr?: string; description?: string | null });
  });

  ipcMain.handle('catalog:archive-category', (_event, categoryId: unknown) => {
    requirePermission(getDatabase(), 'inventory.manage');
    if (typeof categoryId !== 'number') throw new Error('Invalid category id.');
    archiveCategory(getDatabase(), categoryId);
  });

  ipcMain.handle('catalog:list-products', (_event, search: unknown) => {
    requirePermission(getDatabase(), 'sales.products.view');
    return listProducts(getDatabase(), typeof search === 'string' ? search : undefined);
  });

  ipcMain.handle('catalog:list-low-stock', () => {
    requirePermission(getDatabase(), 'inventory.view');
    return listLowStock(getDatabase());
  });

  ipcMain.handle('catalog:create-product', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'inventory.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid product payload.');
    const payload = input as Partial<CatalogProductInput>;
    if (!payload.name || !payload.nameAr || !payload.unitId) {
      throw new Error('Product name, Arabic name, and unit are required.');
    }
    return createProduct(getDatabase(), payload as CatalogProductInput);
  });

  ipcMain.handle('catalog:update-product', (_event, productId: unknown, input: unknown) => {
    requirePermission(getDatabase(), 'inventory.manage');
    if (typeof productId !== 'number' || !input || typeof input !== 'object') {
      throw new Error('Invalid product update payload.');
    }
    return updateProduct(getDatabase(), productId, input as Partial<CatalogProductInput>);
  });

  ipcMain.handle('catalog:archive-product', (_event, productId: unknown) => {
    requirePermission(getDatabase(), 'inventory.manage');
    if (typeof productId !== 'number') throw new Error('Invalid product id.');
    archiveProduct(getDatabase(), productId);
  });

  ipcMain.handle('customers:list-customers', (_event, search: unknown) => {
    requirePermission(getDatabase(), 'sales.customers.view');
    return listCustomers(getDatabase(), typeof search === 'string' ? search : undefined);
  });

  ipcMain.handle('customers:get-customer', (_event, customerId: unknown) => {
    requirePermission(getDatabase(), 'sales.customers.view');
    if (typeof customerId !== 'number') throw new Error('Invalid customer id.');
    return getCustomerById(getDatabase(), customerId);
  });

  ipcMain.handle('customers:create-customer', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'customers.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid customer payload.');
    return createCustomer(getDatabase(), input as PartyInput);
  });

  ipcMain.handle('customers:update-customer', (_event, customerId: unknown, input: unknown) => {
    requirePermission(getDatabase(), 'customers.manage');
    if (typeof customerId !== 'number' || !input || typeof input !== 'object') {
      throw new Error('Invalid customer update payload.');
    }
    return updateCustomer(getDatabase(), customerId, input as Partial<PartyInput>);
  });

  ipcMain.handle('customers:archive-customer', (_event, customerId: unknown) => {
    requirePermission(getDatabase(), 'customers.manage');
    if (typeof customerId !== 'number') throw new Error('Invalid customer id.');
    archiveCustomer(getDatabase(), customerId);
  });

  ipcMain.handle('suppliers:list-suppliers', (_event, search: unknown) => {
    requirePermission(getDatabase(), 'suppliers.view');
    return listSuppliers(getDatabase(), typeof search === 'string' ? search : undefined);
  });

  ipcMain.handle('suppliers:get-supplier', (_event, supplierId: unknown) => {
    requirePermission(getDatabase(), 'suppliers.view');
    if (typeof supplierId !== 'number') throw new Error('Invalid supplier id.');
    return getSupplierById(getDatabase(), supplierId);
  });

  ipcMain.handle('suppliers:create-supplier', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'suppliers.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid supplier payload.');
    return createSupplier(getDatabase(), input as PartyInput);
  });

  ipcMain.handle('suppliers:update-supplier', (_event, supplierId: unknown, input: unknown) => {
    requirePermission(getDatabase(), 'suppliers.manage');
    if (typeof supplierId !== 'number' || !input || typeof input !== 'object') {
      throw new Error('Invalid supplier update payload.');
    }
    return updateSupplier(getDatabase(), supplierId, input as Partial<PartyInput>);
  });

  ipcMain.handle('suppliers:archive-supplier', (_event, supplierId: unknown) => {
    requirePermission(getDatabase(), 'suppliers.manage');
    if (typeof supplierId !== 'number') throw new Error('Invalid supplier id.');
    archiveSupplier(getDatabase(), supplierId);
  });

  ipcMain.handle('sales:list-sales-invoices', (_event, search: unknown) => {
    requirePermission(getDatabase(), 'sales.view');
    return listSalesInvoices(getDatabase(), typeof search === 'string' ? search : undefined);
  });

  ipcMain.handle('sales:get-sales-invoice', (_event, invoiceId: unknown) => {
    requirePermission(getDatabase(), 'sales.view');
    if (typeof invoiceId !== 'number') throw new Error('Invalid sales invoice id.');
    return getSalesInvoiceById(getDatabase(), invoiceId);
  });

  ipcMain.handle('sales:create-sales-invoice', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'sales.create');
    if (!input || typeof input !== 'object') throw new Error('Invalid sales invoice payload.');
    return createSalesInvoice(getDatabase(), input as SalesInvoiceInput);
  });

  ipcMain.handle('sales:print-sales-invoice', async (_event, invoiceId: unknown) => {
    requirePermission(getDatabase(), 'sales.print');
    if (typeof invoiceId !== 'number') throw new Error('Invalid sales invoice id.');
    const invoice = getSalesInvoiceById(getDatabase(), invoiceId);
    if (!invoice) throw new Error('Sales invoice not found.');
    await printSalesInvoice(invoice);
  });

  ipcMain.handle('returns:list-sales-returns', (_event, search: unknown) => {
    requirePermission(getDatabase(), 'returns.view');
    return listSalesReturns(getDatabase(), typeof search === 'string' ? search : undefined);
  });

  ipcMain.handle('returns:create-sales-return', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'returns.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid sales return payload.');
    return createSalesReturn(getDatabase(), input as {
      originalInvoiceId: number;
      customerId?: number | null;
      reason?: string | null;
      items: Array<{ originalItemId: number; quantity: number; refundCents: number }>;
    });
  });

  ipcMain.handle('purchase-returns:list', (_event, search: unknown) => {
    requirePermission(getDatabase(), 'purchases.view');
    return listPurchaseReturns(getDatabase(), typeof search === 'string' ? search : undefined);
  });

  ipcMain.handle('purchase-returns:create', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'purchases.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid purchase return payload.');
    return createPurchaseReturn(getDatabase(), input as {
      originalInvoiceId: number;
      supplierId?: number | null;
      reason?: string | null;
      items: Array<{ originalItemId: number; quantity: number; refundCents: number }>;
    });
  });

  ipcMain.handle('purchases:list-purchase-invoices', (_event, search: unknown) => {
    requirePermission(getDatabase(), 'purchases.view');
    return listPurchaseInvoices(getDatabase(), typeof search === 'string' ? search : undefined);
  });

  ipcMain.handle('purchases:get-purchase-invoice', (_event, invoiceId: unknown) => {
    requirePermission(getDatabase(), 'purchases.view');
    if (typeof invoiceId !== 'number') throw new Error('Invalid purchase invoice id.');
    return getPurchaseInvoiceById(getDatabase(), invoiceId);
  });

  ipcMain.handle('purchases:create-purchase-invoice', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'purchases.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid purchase invoice payload.');
    return createPurchaseInvoice(getDatabase(), input as PurchaseInvoiceInput);
  });

  ipcMain.handle('treasury:list-payment-methods', () => {
    requirePermission(getDatabase(), 'sales.payment-methods.view');
    return listPaymentMethods(getDatabase());
  });

  ipcMain.handle('treasury:list-transactions', (_event, search: unknown) => {
    requirePermission(getDatabase(), 'treasury.view');
    return listTransactions(getDatabase(), typeof search === 'string' ? search : undefined);
  });

  ipcMain.handle('treasury:create-expense', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'treasury.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid expense payload.');
    return createExpense(getDatabase(), input as {
      category: string;
      amountCents: number;
      paymentMethodId: number;
      description?: string | null;
      expenseDate?: string;
    });
  });

  ipcMain.handle('reports:get-dashboard-summary', () => {
    requirePermission(getDatabase(), 'reports.view');
    return getDashboardSummary(getDatabase());
  });

  ipcMain.handle('reports:get-sales-by-day', (_event, days: unknown) => {
    requirePermission(getDatabase(), 'reports.view');
    return getSalesByDay(getDatabase(), typeof days === 'number' ? days : 7);
  });

  ipcMain.handle('reports:get-top-products', (_event, limit: unknown) => {
    requirePermission(getDatabase(), 'reports.view');
    return getTopProducts(getDatabase(), typeof limit === 'number' ? limit : 5);
  });

  ipcMain.handle('reports:export-csv', async () => {
    requirePermission(getDatabase(), 'reports.view');
    return exportReportsCsv();
  });

  ipcMain.handle('operations:list-audit-logs', (_event, search: unknown) => {
    requirePermission(getDatabase(), 'audit.view');
    return listAuditLogs(getDatabase(), typeof search === 'string' ? search : undefined);
  });

  ipcMain.handle('operations:list-shifts', (_event, search: unknown) => {
    requirePermission(getDatabase(), 'audit.view');
    return listShifts(getDatabase(), typeof search === 'string' ? search : undefined);
  });

  ipcMain.handle('operations:open-shift', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'operations.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid shift payload.');
    const payload = input as { openingCashCents: number };
    return openShift(getDatabase(), payload);
  });

  ipcMain.handle('operations:close-shift', (_event, shiftId: unknown, input: unknown) => {
    requirePermission(getDatabase(), 'operations.manage');
    if (typeof shiftId !== 'number' || !input || typeof input !== 'object') {
      throw new Error('Invalid shift close payload.');
    }
    return closeShift(getDatabase(), shiftId, input as { closingCashCents: number; expectedCashCents: number; closingNotes?: string | null });
  });

  ipcMain.handle('payments:create', (_event, input: unknown) => {
    requirePermission(getDatabase(), 'treasury.manage');
    if (!input || typeof input !== 'object') throw new Error('Invalid payment payload.');
    return createPayment(getDatabase(), input as {
      partyType: 'CUSTOMER' | 'SUPPLIER';
      partyId: number;
      invoiceId: number;
      amountCents: number;
      paymentMethodId: number;
      description?: string | null;
    });
  });
}
