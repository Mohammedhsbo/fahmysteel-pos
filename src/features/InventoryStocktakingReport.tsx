import { useState } from 'react';
import { Download, LoaderCircle, Printer, X } from 'lucide-react';
import type { InventoryStocktakingReport as StocktakingReport } from '../../shared/inventory';

interface InventoryStocktakingReportProps {
  report: StocktakingReport;
  onClose: () => void;
}

function number(value: number): string {
  return value.toLocaleString('ar-EG', { maximumFractionDigits: 3 });
}

function dateTime(value: string): { date: string; time: string } {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date),
    time: new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date),
  };
}

export function InventoryStocktakingReport({ report, onClose }: InventoryStocktakingReportProps) {
  const [busy, setBusy] = useState<'print' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const generated = dateTime(report.generatedAt);
  const showWeight = report.totalWeightKg != null;

  async function print(): Promise<void> {
    setBusy('print');
    setError('');
    try {
      await window.api.inventory.printStocktakingReport(report);
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : 'تعذر طباعة التقرير.');
    } finally {
      setBusy(null);
    }
  }

  async function savePdf(): Promise<void> {
    setBusy('pdf');
    setError('');
    try {
      await window.api.inventory.saveStocktakingReportPdf(report);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : 'تعذر حفظ ملف PDF.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stocktaking-overlay" role="dialog" aria-modal="true" aria-label="تقرير جرد المخزن">
      <div className="stocktaking-modal">
        <div className="stocktaking-toolbar no-print">
          <div>
            <strong>معاينة تقرير الجرد</strong>
            <span>{report.items.length} صنف</span>
          </div>
          <div className="stocktaking-actions">
            <button className="fs-btn-secondary" type="button" onClick={() => void print()} disabled={busy !== null}>
              {busy === 'print' ? <LoaderCircle className="spin" size={18} /> : <Printer size={18} />}
              طباعة الجرد
            </button>
            <button className="fs-btn-primary" type="button" onClick={() => void savePdf()} disabled={busy !== null}>
              {busy === 'pdf' ? <LoaderCircle className="spin" size={18} /> : <Download size={18} />}
              حفظ PDF
            </button>
            <button className="icon-btn" type="button" onClick={onClose} aria-label="إغلاق التقرير" title="إغلاق التقرير">
              <X size={20} />
            </button>
          </div>
        </div>

        {error && <div className="stocktaking-error no-print">{error}</div>}

        <article className="stocktaking-document" dir="rtl">
          <header className="stocktaking-header">
            <div>
              <h1>تقرير جرد المخزن</h1>
              <p>Inventory Stocktaking Report</p>
            </div>
            <strong>FAHMY STEEL</strong>
          </header>

          <div className="stocktaking-meta">
            <span><b>التاريخ:</b> {generated.date}</span>
            <span><b>الوقت:</b> {generated.time}</span>
            <span><b>المستخدم:</b> {report.userDisplayName}</span>
          </div>

          <section className="stocktaking-summary">
            <div><span>إجمالي الأصناف</span><strong>{number(report.items.length)}</strong></div>
            <div><span>إجمالي الكميات</span><strong>{number(report.totalQuantity)}</strong></div>
            {report.totalWeightKg != null && <div><span>إجمالي الوزن</span><strong>{number(report.totalWeightKg)} كجم</strong></div>}
          </section>

          {report.items.length === 0 ? (
            <div className="stocktaking-empty">لا توجد أصناف في المخزن</div>
          ) : (
            <div className="stocktaking-table-wrap">
              <table className="stocktaking-table">
                <thead>
                  <tr>
                    <th>#</th><th>الصنف</th><th>الكود / SKU</th><th>التصنيف</th><th>الوحدة</th><th>الكمية</th>
                    {showWeight && <th>الوزن</th>}
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item, index) => {
                    const status = item.currentStockQuantity <= 0
                      ? 'نافد'
                      : item.minimumStockQuantity > 0 && item.currentStockQuantity < item.minimumStockQuantity
                        ? 'منخفض'
                        : 'متوفر';
                    return (
                      <tr key={item.id}>
                        <td className="numeric">{index + 1}</td>
                        <td className="product-name">{item.nameAr || item.name}</td>
                        <td className="code">{item.sku || '—'}</td>
                        <td>{item.categoryName || '—'}</td>
                        <td>{item.unitName || '—'}</td>
                        <td className="numeric">{number(item.currentStockQuantity)}</td>
                        {showWeight && <td className="numeric">{item.totalWeightKg > 0 ? `${number(item.totalWeightKg)} كجم` : '—'}</td>}
                        <td><span className={`stocktaking-status ${status === 'متوفر' ? 'available' : status === 'منخفض' ? 'low' : 'empty'}`}>{status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <footer className="stocktaking-footer">
            <span>تم إنشاء التقرير بواسطة Fahmy Steel POS</span>
            <span>{generated.date} - {generated.time}</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
