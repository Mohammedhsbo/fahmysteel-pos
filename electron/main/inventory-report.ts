import { BrowserWindow, dialog } from 'electron';
import { writeFile } from 'node:fs/promises';
import type { InventoryStocktakingReport } from '../../shared/inventory.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatNumber(value: number): string {
  return value.toLocaleString('ar-EG', { maximumFractionDigits: 3 });
}

function formatDateTime(value: string): { date: string; time: string; fileDate: string } {
  const date = new Date(value);
  const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  return {
    date: new Intl.DateTimeFormat('ar-EG', dateOptions).format(date),
    time: new Intl.DateTimeFormat('ar-EG', timeOptions).format(date),
    fileDate: date.toISOString().slice(0, 10),
  };
}

function hasWeightData(report: InventoryStocktakingReport): boolean {
  return report.items.some((item) => item.weightPerPieceKg != null || item.weightPerMeterKg != null || item.weightPerSheetKg != null);
}

export function inventoryStocktakingHtml(report: InventoryStocktakingReport): string {
  const generated = formatDateTime(report.generatedAt);
  const showWeight = hasWeightData(report);
  const rows = report.items.map((item, index) => {
    const status = item.currentStockQuantity <= 0
      ? 'نافد'
      : item.minimumStockQuantity > 0 && item.currentStockQuantity < item.minimumStockQuantity
        ? 'منخفض'
        : 'متوفر';
    const weight = item.totalWeightKg > 0 ? `${formatNumber(item.totalWeightKg)} كجم` : '—';
    return `<tr>
      <td class="number">${index + 1}</td>
      <td class="product">${escapeHtml(item.nameAr || item.name)}</td>
      <td class="code">${escapeHtml(item.sku || '—')}</td>
      <td>${escapeHtml(item.categoryName || '—')}</td>
      <td>${escapeHtml(item.unitName || '—')}</td>
      <td class="number">${formatNumber(item.currentStockQuantity)}</td>
      ${showWeight ? `<td class="number">${weight}</td>` : ''}
      <td><span class="status ${status === 'متوفر' ? 'available' : status === 'منخفض' ? 'low' : 'empty'}">${status}</span></td>
    </tr>`;
  }).join('');
  const weightHeader = showWeight ? '<th>الوزن</th>' : '';
  const totalWeight = report.totalWeightKg == null ? '' : `<div><span>إجمالي الوزن</span><strong>${formatNumber(report.totalWeightKg)} كجم</strong></div>`;
  const empty = report.items.length === 0 ? '<div class="empty-report">لا توجد أصناف في المخزن</div>' : '';

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير جرد المخزن</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #14232b; font-family: Tahoma, Arial, sans-serif; }
  body { direction: rtl; font-size: 11px; }
  .report { width: 100%; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 14px; }
  .brand { direction: ltr; text-align: left; color: #1e3a8a; font-size: 20px; font-weight: 800; letter-spacing: 1px; }
  h1 { margin: 0 0 2px; color: #1e3a8a; font-size: 23px; }
  .subtitle { color: #64748b; font-size: 12px; }
  .meta { display: grid; grid-template-columns: repeat(3, auto); gap: 6px 20px; margin-bottom: 12px; color: #475569; }
  .meta strong { color: #14232b; margin-right: 4px; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
  .summary > div { border: 1px solid #dbe2e8; border-radius: 5px; padding: 8px 12px; background: #f8fafc; display: flex; justify-content: space-between; gap: 8px; }
  .summary span { color: #64748b; }
  .summary strong { color: #1e3a8a; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  th { background: #1e3a8a; color: #fff; font-weight: 700; padding: 8px 6px; border: 1px solid #1e3a8a; }
  td { padding: 7px 6px; border: 1px solid #dbe2e8; vertical-align: middle; overflow-wrap: anywhere; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  th:nth-child(1), td:nth-child(1) { width: 5%; }
  th:nth-child(2), td:nth-child(2) { width: 22%; }
  th:nth-child(3), td:nth-child(3) { width: 14%; }
  th:nth-child(4), td:nth-child(4) { width: 14%; }
  th:nth-child(5), td:nth-child(5) { width: 12%; }
  th:nth-child(6), td:nth-child(6) { width: 12%; }
  .product { font-weight: 700; }
  .code { direction: ltr; text-align: center; font-family: monospace; }
  .number { text-align: center; direction: ltr; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 12px; font-weight: 700; white-space: nowrap; }
  .available { color: #166534; background: #dcfce7; }
  .low { color: #92400e; background: #fef3c7; }
  .empty { color: #991b1b; background: #fee2e2; }
  .empty-report { border: 1px dashed #cbd5e1; padding: 50px; text-align: center; color: #64748b; font-size: 17px; }
  .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #dbe2e8; color: #64748b; display: flex; justify-content: space-between; font-size: 10px; }
  @media print { .report { break-inside: auto; } tr { break-inside: avoid; } }
</style></head><body><main class="report">
  <header class="header"><div><h1>تقرير جرد المخزن</h1><div class="subtitle">Inventory Stocktaking Report</div></div><div class="brand">FAHMY STEEL</div></header>
  <section class="meta"><div><strong>التاريخ:</strong>${escapeHtml(generated.date)}</div><div><strong>الوقت:</strong>${escapeHtml(generated.time)}</div><div><strong>المستخدم:</strong>${escapeHtml(report.userDisplayName)}</div></section>
  <section class="summary"><div><span>إجمالي الأصناف</span><strong>${formatNumber(report.items.length)}</strong></div><div><span>إجمالي الكميات</span><strong>${formatNumber(report.totalQuantity)}</strong></div>${totalWeight}</section>
  ${empty}
  ${report.items.length > 0 ? `<table><thead><tr><th>#</th><th>الصنف</th><th>الكود / SKU</th><th>التصنيف</th><th>الوحدة</th><th>الكمية</th>${weightHeader}<th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
  <footer class="footer"><span>تم إنشاء التقرير بواسطة Fahmy Steel POS</span><span>${escapeHtml(generated.date)} - ${escapeHtml(generated.time)}</span></footer>
</main></body></html>`;
}

async function openReportWindow(report: InventoryStocktakingReport): Promise<BrowserWindow> {
  const reportWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 850,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  await reportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(inventoryStocktakingHtml(report))}`);
  return reportWindow;
}

export async function printInventoryStocktakingReport(report: InventoryStocktakingReport): Promise<void> {
  const reportWindow = await openReportWindow(report);
  try {
    await new Promise<void>((resolve, reject) => {
      reportWindow.webContents.print({
        silent: false,
        printBackground: true,
        landscape: true,
        margins: { marginType: 'default' },
        pageSize: { width: 297000, height: 210000 },
      }, (success, reason) => success ? resolve() : reject(new Error(reason || 'Print was cancelled.')));
    });
  } finally {
    if (!reportWindow.isDestroyed()) reportWindow.close();
  }
}

export async function saveInventoryStocktakingReportPdf(report: InventoryStocktakingReport): Promise<string | null> {
  const generated = formatDateTime(report.generatedAt);
  const result = await dialog.showSaveDialog({
    title: 'حفظ تقرير جرد المخزن',
    defaultPath: `Fahmy-Steel-Inventory-Report-${generated.fileDate}.pdf`,
    filters: [{ name: 'PDF files', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return null;

  const reportWindow = await openReportWindow(report);
  try {
    const pdf = await reportWindow.webContents.printToPDF({
      printBackground: true,
      landscape: true,
      pageSize: 'A4',
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
    });
    await writeFile(result.filePath, pdf);
    return result.filePath;
  } finally {
    if (!reportWindow.isDestroyed()) reportWindow.close();
  }
}

