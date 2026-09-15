import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CatalogProduct } from '../../shared/catalog';
import type { SupplierRecord } from '../../shared/contacts';
import type { PurchaseInvoice } from '../../shared/purchases';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

function formatMoney(amountCents: number): string {
  return `${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

export function PurchasesPage() {
  const { t } = useI18n();
  const { showError } = useToast();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [paymentMethodId, setPaymentMethodId] = useState(0);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [lineProductId, setLineProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [items, setItems] = useState<Array<{ productId: number; quantity: number; unitPriceCents: number; productName: string }>>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void Promise.all([loadInvoices(), loadProducts(), loadSuppliers(), loadPaymentMethods()]);
  }, []);

  async function loadInvoices() {
    const results = await window.api.purchases.listPurchaseInvoices();
    setInvoices(results);
  }

  async function loadProducts() {
    const results = await window.api.catalog.listProducts();
    setProducts(results as CatalogProduct[]);
  }

  async function loadSuppliers() {
    setSuppliers(await window.api.suppliers.listSuppliers());
  }

  async function loadPaymentMethods() {
    const methods = await window.api.treasury.listPaymentMethods();
    setPaymentMethods(methods);
    if (methods[0]) setPaymentMethodId(methods[0].id);
  }

  const totals = useMemo(() => items.reduce((accumulator, item) => {
    const subtotal = item.quantity * item.unitPriceCents;
    return { subtotal: accumulator.subtotal + subtotal, total: accumulator.total + subtotal };
  }, { subtotal: 0, total: 0 }), [items]);

  function addLine() {
    if (!lineProductId) {
      const message = 'Select a product first.';
      setError(message);
      showError(message, 'Select a product first.');
      return;
    }
    const selectedProduct = products.find((product) => product.id === lineProductId);
    if (!selectedProduct) {
      const message = 'Selected product was not found.';
      setError(message);
      showError(message, 'Selected product was not found.');
      return;
    }
    if (quantity <= 0) {
      const message = 'Quantity must be greater than zero.';
      setError(message);
      showError(message, 'Quantity must be greater than zero.');
      return;
    }
    const existing = items.find((item) => item.productId === selectedProduct.id);
    if (existing) {
      setItems((previous) => previous.map((item) => item.productId === selectedProduct.id ? { ...item, quantity: item.quantity + quantity } : item));
    } else {
      setItems((previous) => [...previous, {
        productId: selectedProduct.id,
        quantity,
        unitPriceCents: selectedProduct.purchasePriceCents,
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
      const message = 'Add at least one product to the purchase.';
      setError(message);
      showError(message, 'Add at least one product to the purchase.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const session = await window.api.auth.getSession();
      if (!session) throw new Error('No active user session found.');
      await window.api.purchases.createPurchaseInvoice({
        supplierId,
        createdBy: session.id,
        paymentMethodId,
        notes: notes || null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
        })),
      });
      setItems([]);
      setSupplierId(null);
      setNotes('');
      setLineProductId(0);
      setQuantity(1);
      setShowForm(false);
      await loadInvoices();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to record purchase.';
      setError(message);
      showError(message, 'Unable to record purchase.');
    } finally {
      setSaving(false);
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
          <h1>المشتريات</h1>
          <p className="subtitle">توريدات الحديد من الموردين</p>
        </div>
        <button className="fs-btn-primary" type="button" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'إلغاء' : 'فاتورة شراء'}
        </button>
      </div>

      {showForm && (
        <form className="panel-form" onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
          <h3 style={{ marginTop: 0, marginBottom: 20 }}>تسجيل فاتورة مشتريات</h3>
          <div className="form-grid">
            <label>المورد
              <select className="fs-select" value={supplierId ?? ''} onChange={(event) => setSupplierId(Number(event.target.value) || null)}>
                <option value="">شراء مباشر</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <label>المنتج
              <select className="fs-select" value={lineProductId} onChange={(event) => setLineProductId(Number(event.target.value))}>
                <option value={0}>-- اختر المنتج --</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
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
                    <th>تكلفة الوحدة</th>
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
              <th>الفاتورة</th>
              <th>المورد</th>
              <th>التاريخ</th>
              <th>الإجمالي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا توجد فواتير مشتريات</td></tr>
            ) : invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoiceNumber}</td>
                <td style={{ fontWeight: 600 }}>{invoice.supplierName ?? 'شراء مباشر'}</td>
                <td>{new Date(invoice.createdAt || Date.now()).toISOString().split('T')[0]}</td>
                <td style={{ fontWeight: 700 }}>{formatMoney(invoice.totalCents)}</td>
                <td>{getStatusBadge(invoice.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
