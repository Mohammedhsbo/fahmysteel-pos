import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi } from '../../shared/api.js';

const api: DesktopApi = {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  auth: {
    login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
    bootstrapAdmin: (username, displayName, password) => ipcRenderer.invoke('auth:bootstrap-admin', username, displayName, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    getState: () => ipcRenderer.invoke('auth:get-state'),
    hasPermission: (permissionCode) => ipcRenderer.invoke('auth:has-permission', permissionCode),
  },
  admin: {
    listUsers: () => ipcRenderer.invoke('admin:list-users'),
    createUser: (input) => ipcRenderer.invoke('admin:create-user', input),
    updateUser: (userId, input) => ipcRenderer.invoke('admin:update-user', userId, input),
    resetPassword: (userId, password) => ipcRenderer.invoke('admin:reset-password', userId, password),
    listSettings: () => ipcRenderer.invoke('admin:list-settings'),
    setSetting: (key, value) => ipcRenderer.invoke('admin:set-setting', key, value),
  },
  balances: {
    listReceivables: () => ipcRenderer.invoke('balances:list-receivables'),
    listPayables: () => ipcRenderer.invoke('balances:list-payables'),
  },
  backups: {
    listBackups: () => ipcRenderer.invoke('backups:list'),
    createBackup: () => ipcRenderer.invoke('backups:create'),
    restoreBackup: (backupId) => ipcRenderer.invoke('backups:restore', backupId),
  },
  inventory: {
    adjustStock: (input) => ipcRenderer.invoke('inventory:adjust-stock', input),
    listAdjustments: () => ipcRenderer.invoke('inventory:list-adjustments'),
  },
  operations: {
    listAuditLogs: (search) => ipcRenderer.invoke('operations:list-audit-logs', search),
    listShifts: (search) => ipcRenderer.invoke('operations:list-shifts', search),
    openShift: (input) => ipcRenderer.invoke('operations:open-shift', input),
    closeShift: (shiftId, input) => ipcRenderer.invoke('operations:close-shift', shiftId, input),
  },
  payments: {
    createPayment: (input) => ipcRenderer.invoke('payments:create', input),
  },
  catalog: {
    listUnits: () => ipcRenderer.invoke('catalog:list-units'),
    listCategories: () => ipcRenderer.invoke('catalog:list-categories'),
    createCategory: (input) => ipcRenderer.invoke('catalog:create-category', input),
    updateCategory: (categoryId, input) => ipcRenderer.invoke('catalog:update-category', categoryId, input),
    archiveCategory: (categoryId) => ipcRenderer.invoke('catalog:archive-category', categoryId),
    listProducts: (search) => ipcRenderer.invoke('catalog:list-products', search),
    listLowStock: () => ipcRenderer.invoke('catalog:list-low-stock'),
    createProduct: (input) => ipcRenderer.invoke('catalog:create-product', input),
    updateProduct: (productId, input) => ipcRenderer.invoke('catalog:update-product', productId, input),
    archiveProduct: (productId) => ipcRenderer.invoke('catalog:archive-product', productId),
  },
  customers: {
    listCustomers: (search) => ipcRenderer.invoke('customers:list-customers', search),
    getCustomer: (customerId) => ipcRenderer.invoke('customers:get-customer', customerId),
    createCustomer: (input) => ipcRenderer.invoke('customers:create-customer', input),
    updateCustomer: (customerId, input) => ipcRenderer.invoke('customers:update-customer', customerId, input),
    archiveCustomer: (customerId) => ipcRenderer.invoke('customers:archive-customer', customerId),
  },
  suppliers: {
    listSuppliers: (search) => ipcRenderer.invoke('suppliers:list-suppliers', search),
    getSupplier: (supplierId) => ipcRenderer.invoke('suppliers:get-supplier', supplierId),
    createSupplier: (input) => ipcRenderer.invoke('suppliers:create-supplier', input),
    updateSupplier: (supplierId, input) => ipcRenderer.invoke('suppliers:update-supplier', supplierId, input),
    archiveSupplier: (supplierId) => ipcRenderer.invoke('suppliers:archive-supplier', supplierId),
  },
  sales: {
    listSalesInvoices: (search) => ipcRenderer.invoke('sales:list-sales-invoices', search),
    getSalesInvoice: (invoiceId) => ipcRenderer.invoke('sales:get-sales-invoice', invoiceId),
    createSalesInvoice: (input) => ipcRenderer.invoke('sales:create-sales-invoice', input),
    printSalesInvoice: (invoiceId) => ipcRenderer.invoke('sales:print-sales-invoice', invoiceId),
  },
  returns: {
    listSalesReturns: (search) => ipcRenderer.invoke('returns:list-sales-returns', search),
    createSalesReturn: (input) => ipcRenderer.invoke('returns:create-sales-return', input),
  },
  purchaseReturns: {
    listPurchaseReturns: (search) => ipcRenderer.invoke('purchase-returns:list', search),
    createPurchaseReturn: (input) => ipcRenderer.invoke('purchase-returns:create', input),
  },
  purchases: {
    listPurchaseInvoices: (search) => ipcRenderer.invoke('purchases:list-purchase-invoices', search),
    getPurchaseInvoice: (invoiceId) => ipcRenderer.invoke('purchases:get-purchase-invoice', invoiceId),
    createPurchaseInvoice: (input) => ipcRenderer.invoke('purchases:create-purchase-invoice', input),
  },
  treasury: {
    listTransactions: (search) => ipcRenderer.invoke('treasury:list-transactions', search),
    createExpense: (input) => ipcRenderer.invoke('treasury:create-expense', input),
    listPaymentMethods: () => ipcRenderer.invoke('treasury:list-payment-methods'),
  },
  reports: {
    getDashboardSummary: () => ipcRenderer.invoke('reports:get-dashboard-summary'),
    getSalesByDay: (days) => ipcRenderer.invoke('reports:get-sales-by-day', days),
    getTopProducts: (limit) => ipcRenderer.invoke('reports:get-top-products', limit),
    exportCsv: () => ipcRenderer.invoke('reports:export-csv'),
  },
};

contextBridge.exposeInMainWorld('api', api);