import Database from 'better-sqlite3';
import { runMigrations } from '../dist-electron/electron/main/database/migrations.js';
import { seedFoundation } from '../dist-electron/electron/main/database/seed-foundation.js';
import { authenticate, bootstrapAdmin, clearSession, getSession, requiresSetup } from '../dist-electron/electron/main/auth.js';
import { hasPermission } from '../dist-electron/electron/main/rbac.js';
import { createProduct, getProductById } from '../dist-electron/electron/main/database/repositories/catalog.js';
import { getStocktakingReport } from '../dist-electron/electron/main/database/repositories/inventory.js';
import { createSalesInvoice } from '../dist-electron/electron/main/database/repositories/sales.js';
import { createSalesReturn, listSalesReturns } from '../dist-electron/electron/main/database/repositories/returns.js';

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
runMigrations(database);
seedFoundation(database);

if (!requiresSetup(database)) throw new Error('Fresh database should require administrator setup.');
const admin = bootstrapAdmin(database, 'admin', 'Local Admin', 'phase-three-password');
if (admin.role !== 'ADMIN' || requiresSetup(database)) throw new Error('Administrator bootstrap failed.');
if (!hasPermission(database, 'users.manage')) throw new Error('Admin permission grant failed.');
if (hasPermission(database, 'unknown.permission')) throw new Error('Unknown permission was granted.');
clearSession();
try {
	authenticate(database, 'admin', 'incorrect-password');
	throw new Error('Invalid password was accepted.');
} catch (error) {
	if (!(error instanceof Error) || error.message !== 'Invalid username or password.') throw error;
}
const authenticated = authenticate(database, 'admin', 'phase-three-password');
if (getSession()?.id !== authenticated.id) throw new Error('Session was not established.');

const unit = database.prepare('SELECT id FROM units WHERE code = ?').get('PIECE');
const category = database.prepare('SELECT id FROM categories WHERE name_ar = ?').get('علب');
if (!unit || !category) throw new Error('Foundation catalog data is missing.');
const product = createProduct(database, {
	name: 'Smoke Test Product',
	nameAr: 'منتج اختبار',
	unitId: unit.id,
	categoryId: category.id,
	purchasePriceCents: 1000,
	sellingPriceCents: 1500,
	minimumStockQuantity: 2,
	currentStockQuantity: 5,
});
const storedProduct = getProductById(database, product.id);
if (!storedProduct || storedProduct.nameAr !== 'منتج اختبار' || storedProduct.currentStockQuantity !== 5) {
	throw new Error('Product creation smoke test failed.');
}
const stocktakingReport = getStocktakingReport(database);
if (stocktakingReport.items.length !== 1 || stocktakingReport.totalQuantity !== 5 || stocktakingReport.userDisplayName !== 'Local Admin') {
	throw new Error('Stocktaking report smoke test failed.');
}
const invoice = createSalesInvoice(database, {
	cashierId: admin.id,
	items: [{ productId: product.id, quantity: 1, unitPriceCents: 1500 }],
});
const salesReturn = createSalesReturn(database, {
	originalInvoiceId: invoice.id,
	items: [{ originalItemId: invoice.items[0].id, quantity: 1, refundCents: 1500 }],
});
const listedReturns = listSalesReturns(database);
if (salesReturn.items[0]?.productName !== 'Smoke Test Product' || listedReturns[0]?.items[0]?.productName !== 'Smoke Test Product') {
	throw new Error('Sales return item lookup smoke test failed.');
}

const versions = database.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
const tableCount = database.prepare("SELECT COUNT(name) AS count FROM sqlite_master WHERE type = 'table'").get();
const unitCount = database.prepare('SELECT COUNT(*) AS count FROM units').get();
const paymentMethodCount = database.prepare('SELECT COUNT(*) AS count FROM payment_methods').get();

console.log(JSON.stringify({ versions, tableCount, unitCount, paymentMethodCount, auth: 'ok', productCreation: 'ok', stocktakingReport: 'ok', salesReturns: 'ok' }));
database.close();
