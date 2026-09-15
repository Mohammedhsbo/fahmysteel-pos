import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SalesInvoice } from '../../shared/sales';
import { useToast } from '../components/ToastProvider';

function formatMoney(amountCents: number): string {
  return `${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

export function InvoicePage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { showError } = useToast();
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = Number(invoiceId);
    if (!Number.isInteger(id) || id <= 0) {
      setLoading(false);
      return;
    }
    void window.api.sales.getSalesInvoice(id)
      .then(setInvoice)
      .catch((error: unknown) => showError(error instanceof Error ? error.message : 'Unable to load invoice.'))
      .finally(() => setLoading(false));
  }, [invoiceId, showError]);

  if (loading) return <section className="catalog-page"><p>جاري تحميل الفاتورة...</p></section>;
  if (!invoice) return <section className="catalog-page"><p className="auth-error">لم يتم العثور على الفاتورة.</p><button className="fs-btn-secondary" type="button" onClick={() => navigate('/sales')}>العودة للمبيعات</button></section>;

  return (
    <section className="catalog-page invoice-page">
      <div className="page-heading no-print">
        <div className="page-title"><p className="eyebrow">Sales</p><h1>فاتورة {invoice.invoiceNumber}</h1><p className="subtitle">معاينة الفاتورة والطباعة</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="fs-btn-secondary" type="button" onClick={() => navigate('/sales')}><ArrowLeft size={17} /> العودة</button>
          <button className="fs-btn-primary" type="button" onClick={() => window.print()}><Printer size={17} /> طباعة الفاتورة</button>
        </div>
      </div>

      <article className="invoice-preview invoice-template">
        <div className="invoice-field invoice-number">{invoice.invoiceNumber}</div>
        <div className="invoice-field invoice-date">{new Date(invoice.issuedAt).toLocaleDateString('en-GB')}</div>
        <div className="invoice-field invoice-customer-name">{invoice.customerName ?? 'عميل نقدي'}</div>
        <div className="invoice-field invoice-customer-phone">{invoice.customerPhone ?? ''}</div>
        <div className="invoice-field invoice-customer-address">{invoice.customerAddress ?? ''}</div>
        <div className="invoice-field invoice-payment">{invoice.paymentMethodName ?? invoice.paymentMethodCode ?? 'Cash'}</div>

        {invoice.items.slice(0, 10).map((item, index) => {
          const top = 630 + (index * 41.3) + 9;
          return <div className="invoice-row" key={item.id} style={{ top }}>
            <span className="invoice-product">{item.productName}</span>
            <span className="invoice-quantity">{item.quantity}</span>
            <span className="invoice-unit-price">{formatMoney(item.unitPriceCents)}</span>
            <span className="invoice-line-total">{formatMoney(item.lineTotalCents)}</span>
          </div>;
        })}

        <div className="invoice-field invoice-summary invoice-summary-items">{formatMoney(invoice.subtotalCents)}</div>
        <div className="invoice-field invoice-summary invoice-summary-discount">{formatMoney(invoice.discountCents)}</div>
        <div className="invoice-field invoice-summary invoice-summary-subtotal">{formatMoney(Math.max(0, invoice.subtotalCents - invoice.discountCents))}</div>
        <div className="invoice-field invoice-summary invoice-summary-tax">{invoice.taxEnabled ? formatMoney(invoice.taxCents) : 'غير مفعلة'}</div>
        <div className="invoice-field invoice-summary invoice-summary-expenses">{formatMoney(invoice.cashExpensesCents ?? 0)}</div>
        <div className="invoice-field invoice-summary invoice-summary-total">{formatMoney(invoice.totalCents)}</div>
      </article>
    </section>
  );
}