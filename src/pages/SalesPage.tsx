import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CatalogProduct } from '../../shared/catalog';
import type { CustomerRecord } from '../../shared/contacts';
import type { SalesInvoice } from '../../shared/sales';
import { useI18n } from '../i18n';

function formatMoney(amountCents: number): string {
  return `${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

export function SalesPage() {
  const { t } = useI18n();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [paymentMethodId, setPaymentMethodId] = useState(0);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [lineProductId, setLineProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [items, setItems] = useState<Array<{ productId: number; quantity: number; unitPriceCents: number; productName: string }>>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void Promise.all([loadInvoices(), loadProducts(), loadCustomers(), loadPaymentMethods()]);
  }, []);

  async function loadInvoices() {
    const results = await window.api.sales.listSalesInvoices();
    setInvoices(results);
  }

  async function loadProducts() {
    const results = await window.api.catalog.listProducts();
    setProducts(results as CatalogProduct[]);
  }

  async function loadCustomers() {
    setCustomers(await window.api.customers.listCustomers());
  }

  async function loadPaymentMethods() {
    const methods = await window.api.treasury.listPaymentMethods();
    setPaymentMethods(methods);
    if (methods[0]) setPaymentMethodId(methods[0].id);
  }

  const totals = useMemo(() => {
    return items.reduce(
      (accumulator, item) => {
        const subtotal = item.quantity * item.unitPriceCents;
        return {
          subtotal: accumulator.subtotal + subtotal,
          total: accumulator.total + subtotal,
        };
      },
      { subtotal: 0, total: 0 },
    );
  }, [items]);

  function addLine() {
    if (!lineProductId) {
      setError('Select a product first.');
      return;
    }
    const selectedProduct = products.find((product) => product.id === lineProductId);
    if (!selectedProduct) {
      setError('Selected product was not found.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    const existing = items.find((item) => item.productId === selectedProduct.id);
    if (existing) {
      setItems((previous) => previous.map((item) =>
        item.productId === selectedProduct.id
          ? { ...item, quantity: item.quantity + quantity }
          : item,
      ));
    } else {
      setItems((previous) => [...previous, {
        productId: selectedProduct.id,
        quantity,
        unitPriceCents: selectedProduct.sellingPriceCents,
        productName: selectedProduct.name,
      }]);
    }
    setError('');
    setLineProductId(0);
    setQuantity(1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0) {
      setError('Add at least one product to the sale.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const session = await window.api.auth.getSession();
      if (!session) throw new Error('No active cashier session found.');
      await window.api.sales.createSalesInvoice({
        customerId,
        cashierId: session.id,
        paymentMethodId,
        notes: notes || null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: 0,
        })),
      });
      setItems([]);
      setCustomerId(null);
      setNotes('');
      setLineProductId(0);
      setQuantity(1);
      setShowForm(false);
      await loadInvoices();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to record sale.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePrint(invoiceId: number) {
    setError('');
    setPrintingId(invoiceId);
    try {
      await window.api.sales.printSalesInvoice(invoiceId);
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : 'Unable to print invoice.');
    } finally {
      setPrintingId(null);
    }
  }

  function getStatusBadge(status: string) {
    switch(status?.toLowerCase()) {
      case 'paid':
      case 'مدفوعة':
        return <span className="fs-badge success">مدفوعة</span>;
      case 'unpaid':
      case 'غير مدفوعة':
        return <span className="fs-badge danger">غير مدفوعة</span>;
      case 'partial':
      case 'جزئي':
        return <span className="fs-badge warning">جزئي</span>;
      default:
        return <span className="fs-badge gray">{status}</span>;
    }
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div className="page-title">
          <h1>المبيعات</h1>
          <p className="subtitle">{invoices.length} فاتورة</p>
        </div>
        <button className="fs-btn-primary" type="button" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> فاتورة جديدة
        </button>
      </div>

      {showForm && (
        <form className="panel-form" onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
          <div className="form-grid">
            <label>العميل
              <select className="fs-select" value={customerId ?? ''} onChange={(event) => setCustomerId(Number(event.target.value) || null)}>
                <option value="">عميل نقدي</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
            <label>المنتج
              <select className="fs-select" value={lineProductId} onChange={(event) => setLineProductId(Number(event.target.value))}>
                <option value={0}>-- اختر المنتج --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </label>
            <label>الكمية<input className="fs-input" type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 1)} /></label>
            <label>طريقة الدفع<select className="fs-select" value={paymentMethodId} onChange={(event) => setPaymentMethodId(Number(event.target.value))}>
              {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
            </select></label>
            <button type="button" className="fs-btn-secondary" style={{ marginTop: 22 }} onClick={addLine}>إضافة صنف</button>
            <label className="full-width">ملاحظات<textarea className="fs-input" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} /></label>
          </div>

          {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}

          {items.length > 0 && (
            <div className="fs-table-container" style={{ marginTop: 24 }}>
              <div className="table-toolbar"><strong>الأصناف المضافة</strong></div>
              <table>
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>سعر الوحدة</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{formatMoney(item.unitPriceCents)}</td>
                      <td>{formatMoney(item.quantity * item.unitPriceCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, fontSize: 16, fontWeight: 700, padding: '16px 0', borderTop: '1px solid var(--fs-border-soft)' }}>
            <span>الإجمالي الكلي:</span>
            <span>{formatMoney(totals.total)}</span>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="fs-btn-primary" type="submit" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}</button>
            <button className="fs-btn-secondary" type="button" onClick={() => setShowForm(false)}>إلغاء</button>
          </div>
        </form>
      )}

      <div className="fs-table-container">
        <table>
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>العميل</th>
              <th>التاريخ</th>
              <th>الإجمالي</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا توجد فواتير</td></tr>
            ) : invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoiceNumber}</td>
                <td>{invoice.customerName ?? 'عميل نقدي'}</td>
                <td>{new Date(invoice.createdAt || Date.now()).toISOString().split('T')[0]}</td>
                <td style={{ fontWeight: 700 }}>{formatMoney(invoice.totalCents)}</td>
                <td>{getStatusBadge(invoice.status)}</td>
                <td>
                  <button type="button" className="quiet-button" onClick={() => void handlePrint(invoice.id)} disabled={printingId === invoice.id}>
                    {printingId === invoice.id ? '...' : 'طباعة'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
