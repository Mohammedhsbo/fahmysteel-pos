import { dialog } from 'electron';
import { writeFile } from 'node:fs/promises';
import { getDashboardSummary, getSalesByDay, getTopProducts } from './database/repositories/reports.js';
import { getDatabase } from './database/connection.js';

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function row(values: Array<string | number | null>): string {
  return values.map(csvCell).join(',');
}

export async function exportReportsCsv(): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    title: 'Export Fahmy Steel reports',
    defaultPath: 'fahmy-steel-reports.csv',
    filters: [{ name: 'CSV files', extensions: ['csv'] }],
  });

  if (result.canceled || !result.filePath) return null;

  const database = getDatabase();
  const summary = getDashboardSummary(database);
  const salesByDay = getSalesByDay(database, 7);
  const topProducts = getTopProducts(database, 10);
  const lines = [
    row(['Fahmy Steel report export']),
    '',
    row(['Summary metric', 'Value']),
    row(['Sales total cents', summary.salesTotalCents]),
    row(['Purchases total cents', summary.purchasesTotalCents]),
    row(['Expenses total cents', summary.expensesTotalCents]),
    row(['Inventory value cents', summary.inventoryValueCents]),
    row(['Active customers', summary.activeCustomers]),
    row(['Active suppliers', summary.activeSuppliers]),
    row(['Total products', summary.totalProducts]),
    '',
    row(['Sales by day']),
    row(['Date', 'Total cents']),
    ...salesByDay.map((point) => row([point.date, point.totalCents])),
    '',
    row(['Top products']),
    row(['Product', 'Quantity', 'Sales cents']),
    ...topProducts.map((product) => row([product.productName, product.totalQuantity, product.salesCents])),
  ];

  await writeFile(result.filePath, `${lines.join('\r\n')}\r\n`, 'utf8');
  return result.filePath;
}
