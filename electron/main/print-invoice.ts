import { app, BrowserWindow } from 'electron';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SalesInvoice } from '../../shared/sales.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Africa/Cairo',
  }).format(date);
}

function assetPath(): string {
  return app.isPackaged
    ? path.join(app.getAppPath(), 'dist-renderer', 'invoice.png')
    : path.join(app.getAppPath(), 'public', 'invoice.png');
}

async function invoiceHtml(invoice: SalesInvoice): Promise<string> {
  const image = (await readFile(assetPath())).toString('base64');
  const rowTop = 630;
  const rowHeight = 41.3;
  const itemRows = invoice.items.slice(0, 10).map((item, index) => {
    const top = rowTop + (index * rowHeight);
    return `
      <span class="field product" style="top:${top + 9}px">${escapeHtml(item.productName)}</span>
      <span class="field quantity" style="top:${top + 9}px">${item.quantity}</span>
      <span class="field unit-price" style="top:${top + 9}px">${money(item.unitPriceCents)}</span>
      <span class="field line-total" style="top:${top + 9}px">${money(item.lineTotalCents)}</span>`;
  }).join('');

  const afterDiscount = Math.max(0, invoice.subtotalCents - invoice.discountCents);
  const taxLabel = invoice.taxEnabled ? `${money(invoice.taxCents)}${invoice.taxRatePercent ? ` (${invoice.taxRatePercent}%)` : ''}` : 'غير مفعلة';

  return `<!doctype html>
<html><head><meta charset="UTF-8"><title>${escapeHtml(invoice.invoiceNumber)}</title>
<style>
  @page { size: 270.933mm 406.4mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 1024px; height: 1536px; overflow: hidden; }
  body { color: #14232b; font-family: Arial, Tahoma, sans-serif; }
  .invoice { position: relative; width: 1024px; height: 1536px; overflow: hidden; page-break-after: avoid; background: url(data:image/png;base64,${image}) 0 0 / 1024px 1536px no-repeat; }
  .field { position: absolute; display: block; overflow: hidden; white-space: nowrap; font-size: 18px; line-height: 24px; }
  .invoice-number { left: 862px; top: 392px; width: 118px; height: 32px; text-align: center; font-size: 11px; line-height: 26px; }
  .date { left: 56px; top: 454px; width: 132px; height: 27px; text-align: center; }
  .customer-name { left: 490px; top: 455px; width: 385px; direction: rtl; text-align: right; }
  .customer-phone { left: 490px; top: 497px; width: 385px; direction: rtl; text-align: right; }
  .customer-address { left: 490px; top: 537px; width: 385px; direction: rtl; text-align: right; }
  .payment { left: 47px; top: 496px; width: 136px; height: 27px; direction: rtl; text-align: right; }
  .product { left: 560px; width: 344px; height: 26px; direction: rtl; text-align: right; font-size: 17px; }
  .quantity { left: 397px; width: 153px; height: 26px; text-align: center; }
  .unit-price { left: 233px; width: 162px; height: 26px; text-align: center; }
  .line-total { left: 47px; width: 184px; height: 26px; text-align: center; }
  .summary-value { left: 52px; width: 181px; height: 31px; text-align: center; font-size: 18px; }
  .summary-items { top: 1082px; }
  .summary-discount { top: 1123px; }
  .summary-subtotal { top: 1164px; }
  .summary-tax { top: 1205px; }
  .summary-expenses { top: 1246px; }
  .summary-total { top: 1287px; font-size: 20px; font-weight: 700; }
</style></head><body><main class="invoice">
<span class="field invoice-number">${escapeHtml(invoice.invoiceNumber)}</span>
<span class="field date">${escapeHtml(formatDate(invoice.issuedAt))}</span>
<span class="field customer-name">${escapeHtml(invoice.customerName ?? 'عميل نقدي')}</span>
<span class="field customer-phone">${escapeHtml(invoice.customerPhone ?? '')}</span>
<span class="field customer-address">${escapeHtml(invoice.customerAddress ?? '')}</span>
<span class="field payment">${escapeHtml(invoice.paymentMethodName ?? invoice.paymentMethodCode ?? '')}</span>
${itemRows}
<span class="field summary-value summary-items">${money(invoice.subtotalCents)}</span>
<span class="field summary-value summary-discount">${money(invoice.discountCents)}</span>
<span class="field summary-value summary-subtotal">${money(afterDiscount)}</span>
<span class="field summary-value summary-tax">${escapeHtml(taxLabel)}</span>
<span class="field summary-value summary-expenses">${money(invoice.cashExpensesCents ?? 0)}</span>
<span class="field summary-value summary-total">${money(invoice.totalCents)}</span>
</main></body></html>`;
}

export async function printSalesInvoice(invoice: SalesInvoice): Promise<void> {
  const printWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 1000,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(await invoiceHtml(invoice))}`);
    await new Promise<void>((resolve, reject) => {
      printWindow.webContents.print({
        printBackground: true,
        margins: { marginType: 'none' },
        pageSize: { width: 270933, height: 406400 },
      }, (success, reason) => {
        if (success) resolve();
        else reject(new Error(reason || 'Print was cancelled.'));
      });
    });
  } finally {
    if (!printWindow.isDestroyed()) printWindow.close();
  }
}
