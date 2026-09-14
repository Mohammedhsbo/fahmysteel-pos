import { BrowserWindow } from 'electron';
import type { SalesInvoice } from '../../shared/sales.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function invoiceHtml(invoice: SalesInvoice): string {
  const itemRows = invoice.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.productName)}</td>
      <td>${item.quantity}</td>
      <td>${(item.unitPriceCents / 100).toFixed(2)}</td>
      <td>${(item.lineTotalCents / 100).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html><head><meta charset="UTF-8"><title>${escapeHtml(invoice.invoiceNumber)}</title>
<style>
  @page { margin: 12mm; }
  body { color: #171716; font-family: Arial, sans-serif; font-size: 12px; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p { margin: 4px 0; }
  header { border-bottom: 2px solid #c89a3d; margin-bottom: 18px; padding-bottom: 10px; }
  table { border-collapse: collapse; margin-top: 18px; width: 100%; }
  th, td { border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left; }
  th { background: #f7f7f5; }
  .total { font-size: 16px; font-weight: bold; margin-top: 16px; text-align: right; }
  .muted { color: #666; }
</style></head><body>
<header><h1>Fahmy Steel</h1><p>Sales invoice: ${escapeHtml(invoice.invoiceNumber)}</p><p class="muted">Issued: ${escapeHtml(invoice.issuedAt)}</p></header>
<p>Customer: ${escapeHtml(invoice.customerName ?? 'Walk-in customer')}</p>
<table><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table>
<p class="total">Total: ${(invoice.totalCents / 100).toFixed(2)}</p>
${invoice.notes ? `<p>Notes: ${escapeHtml(invoice.notes)}</p>` : ''}
</body></html>`;
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
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(invoiceHtml(invoice))}`);
    await new Promise<void>((resolve, reject) => {
      printWindow.webContents.print({ printBackground: true }, (success, reason) => {
        if (success) resolve();
        else reject(new Error(reason || 'Print was cancelled.'));
      });
    });
  } finally {
    if (!printWindow.isDestroyed()) printWindow.close();
  }
}
