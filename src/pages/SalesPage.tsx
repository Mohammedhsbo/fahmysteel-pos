import { useEffect, useMemo, useState } from 'react';
import { Plus, ShoppingCart, Printer, Save, CheckCircle2, Clock, Trash2, LayoutList, Check, User, Hash, Tag, CreditCard, Box, AlertCircle, Percent, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CatalogProduct } from '../../shared/catalog';
import type { CustomerRecord } from '../../shared/contacts';
import type { PaymentMethodOption } from '../../shared/payment-methods';
import { calculateSalesInvoiceFinancials, type SalesInvoice, type SalesInvoiceDiscountType } from '../../shared/sales';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

function formatMoney(amountCents: number): string {
  return `${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

function parseMonetaryInput(rawValue: string): number {
  const sanitized = rawValue.trim();
  if (!sanitized) return 0;
  const parsed = Number(sanitized);
  if (!Number.isFinite(parsed) || parsed < 0) return Number.NaN;
  return Math.round(parsed * 100);
}

export function SalesPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { showError, showSuccess } = useToast();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState(0);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [lineProductId, setLineProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [discountType, setDiscountType] = useState<SalesInvoiceDiscountType>('FIXED');
  const [discountValueCents, setDiscountValueCents] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRatePercent, setTaxRatePercent] = useState(14);
  const [cashExpensesCents, setCashExpensesCents] = useState(0);
  const [items, setItems] = useState<Array<{ productId: number; quantity: number; unitPriceCents: number; productName: string }>>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
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
    const methods = await window.api.paymentMethods.listSalesOptions();
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

  const financial = useMemo(() => calculateSalesInvoiceFinancials({
    subtotalCents: totals.subtotal,
    discountType,
    discountValueCents,
    discountPercentage,
    taxEnabled,
    taxRatePercent,
    cashExpensesCents,
  }), [totals.subtotal, discountType, discountValueCents, discountPercentage, taxEnabled, taxRatePercent, cashExpensesCents]);

  function addLine() {
    if (!lineProductId) {
      showError('Select a product first.', 'Missing Product');
      return;
    }
    const selectedProduct = products.find((product) => product.id === lineProductId);
    if (!selectedProduct) {
      showError('Selected product was not found.', 'Error');
      return;
    }
    if (quantity <= 0) {
      showError('Quantity must be greater than zero.', 'Invalid Quantity');
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
    setLineProductId(0);
    setQuantity(1);
  }

  function removeItem(productId: number) {
    setItems((previous) => previous.filter(item => item.productId !== productId));
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
      if (discountType === 'FIXED' && discountValueCents < 0) {
        throw new Error('Discount amount cannot be negative.');
      }
      if (discountType === 'PERCENT' && (discountPercentage < 0 || discountPercentage > 100)) {
        throw new Error('Discount percentage must be between 0 and 100.');
      }
      if (taxEnabled && (taxRatePercent < 0 || taxRatePercent > 100)) {
        throw new Error('Tax percentage must be between 0 and 100.');
      }
      if (cashExpensesCents < 0) {
        throw new Error('Cash expenses cannot be negative.');
      }
      if (financial.discountCents > totals.subtotal) {
        throw new Error('Discount cannot exceed the subtotal.');
      }

      await window.api.sales.createSalesInvoice({
        customerId,
        cashierId: session.id,
        paymentMethodId,
        cardNumber: paymentMethods.find((method) => method.id === paymentMethodId)?.code === 'VISA' ? cardNumber : null,
        notes: notes || null,
        discountType,
        discountValueCents: discountType === 'FIXED' ? discountValueCents : 0,
        discountPercentage: discountType === 'PERCENT' ? discountPercentage : 0,
        taxEnabled,
        taxRatePercent: taxEnabled ? taxRatePercent : 0,
        cashExpensesCents,
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
      setCardNumber('');
      setLineProductId(0);
      setQuantity(1);
      setDiscountType('FIXED');
      setDiscountValueCents(0);
      setDiscountPercentage(0);
      setTaxEnabled(false);
      setTaxRatePercent(14);
      setCashExpensesCents(0);
      setShowForm(false);
      showSuccess('Invoice created successfully.');
      await loadInvoices();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to record sale.';
      setError(message);
      showError(message, 'Unable to record sale.');
    } finally {
      setSaving(false);
    }
  }

  function handlePrint(invoiceId: number) {
    navigate(`/sales/invoices/${invoiceId}`);
  }

  function getStatusBadge(status: string) {
    switch(status?.toLowerCase()) {
      case 'paid':
      case 'مدفوعة':
        return <span className="pos-badge success"><CheckCircle2 size={14} /> مدفوعة</span>;
      case 'unpaid':
      case 'غير مدفوعة':
        return <span className="pos-badge danger"><AlertCircle size={14} /> غير مدفوعة</span>;
      case 'partial':
      case 'جزئي':
        return <span className="pos-badge warning"><Clock size={14} /> جزئي</span>;
      default:
        return <span className="pos-badge gray">{status}</span>;
    }
  }

  return (
    <section className="page-content pos-container">
      <style>{`
        .pos-container { max-width: 1200px; margin: 0 auto; }
        .pos-form-card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
          padding: 32px;
          margin-bottom: 32px;
          animation: fadeIn 0.4s ease-out;
        }
        .pos-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
        }
        .pos-input-group {
          display: flex; flex-direction: column; gap: 8px;
        }
        .pos-input-group label {
          font-size: 13.5px; font-weight: 600; color: var(--fs-text-main); display: flex; align-items: center; gap: 6px;
        }
        .pos-total-panel {
          background: linear-gradient(135deg, var(--fs-navy) 0%, #2a3744 100%);
          color: white;
          padding: 24px 32px;
          border-radius: var(--radius-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 32px;
          box-shadow: 0 8px 20px rgba(29,39,48,0.25);
        }
        .pos-total-label { font-size: 16px; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em; }
        .pos-total-value { font-size: 36px; font-weight: 800; letter-spacing: -0.02em; }
        .pos-table-card {
          background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--fs-border);
          box-shadow: 0 4px 15px -3px rgba(0,0,0,0.05); overflow: hidden;
        }
        .pos-header-flex { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 0; gap: 6px; }
        .pos-action-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 99px; font-weight: 700; font-size: 14.5px; transition: all 0.2s; cursor: pointer; border: 0; }
        .pos-btn-primary { background: var(--fs-blue); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
        .pos-btn-primary:hover:not(:disabled) { background: var(--fs-blue-hover); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35); }
        .pos-btn-secondary { background: #fff; color: var(--fs-text-main); border: 1px solid var(--fs-border); box-shadow: var(--shadow-sm); }
        .pos-btn-secondary:hover:not(:disabled) { background: var(--fs-bg); }
        .pos-btn-danger { background: #fff; color: var(--fs-danger-text); border: 1px solid #fca5a5; }
        .pos-btn-danger:hover { background: #fef2f2; }
        .pos-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; }
        .pos-badge.success { background: var(--fs-success-bg); color: var(--fs-success-text); }
        .pos-badge.danger { background: var(--fs-danger-bg); color: var(--fs-danger-text); }
        .pos-badge.warning { background: var(--fs-warning-bg); color: var(--fs-warning-text); }
        .pos-badge.gray { background: var(--fs-bg); color: var(--fs-text-muted); }
        
        .pos-cart-table th { background: #f8fafc; font-weight: 700; color: var(--fs-text-muted); padding: 16px 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--fs-border-soft); }
        .pos-cart-table td { padding: 16px 20px; font-size: 15px; font-weight: 600; border-bottom: 1px solid var(--fs-border-soft); }
        .pos-cart-table tr:last-child td { border-bottom: none; }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Point of Sale</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)' }}>المبيعات</h1>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: 6 }}><LayoutList size={16}/> {invoices.length} فاتورة مسجلة</p>
        </div>
        <button className="pos-action-btn pos-btn-primary" type="button" onClick={() => setShowForm(!showForm)}>
          {showForm ? <Check size={18} /> : <Plus size={18} />} {showForm ? 'إغلاق نافذة الفاتورة' : 'فاتورة جديدة'}
        </button>
      </div>

      {showForm && (
        <form className="pos-form-card" onSubmit={handleSubmit}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><ShoppingCart color="var(--fs-blue)"/> إنشاء فاتورة مبيعات</h2>
          
          <div className="pos-form-grid" style={{ marginBottom: 32, paddingBottom: 32, borderBottom: '1px dashed var(--fs-border)' }}>
            <div className="pos-input-group">
              <label><User size={16} color="var(--fs-text-muted)"/> العميل</label>
              <select className="fs-select" value={customerId ?? ''} onChange={(event) => setCustomerId(Number(event.target.value) || null)}>
                <option value="">عميل نقدي (بدون تسجيل)</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </div>
            <div className="pos-input-group">
              <label><CreditCard size={16} color="var(--fs-text-muted)"/> طريقة الدفع</label>
              <select className="fs-select" value={paymentMethodId} onChange={(event) => setPaymentMethodId(Number(event.target.value))}>
                {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
            </div>
            
            {paymentMethods.find((method) => method.id === paymentMethodId)?.code === 'VISA' && (
              <div className="pos-input-group">
                <label><Hash size={16} color="var(--fs-text-muted)"/> رقم البطاقة (آخر 4 أرقام)</label>
                <input className="fs-input" inputMode="numeric" autoComplete="off" value={cardNumber} onChange={(event) => setCardNumber(event.target.value.replace(/[^\d ]/g, ''))} placeholder="4111 1111 1111 1234" />
              </div>
            )}
            
            <div className="pos-input-group" style={{ gridColumn: '1 / -1' }}>
              <label><Tag size={16} color="var(--fs-text-muted)"/> ملاحظات الفاتورة</label>
              <textarea className="fs-input" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="أي تفاصيل إضافية للطلب..." />
            </div>
          </div>

          <div style={{ background: '#fafafa', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--fs-border-soft)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Box size={18} color="var(--fs-text-muted)"/> إضافة أصناف</h3>
            <div className="pos-form-grid" style={{ alignItems: 'end' }}>
              <div className="pos-input-group" style={{ flex: 2 }}>
                <label>المنتج</label>
                <select className="fs-select" value={lineProductId} onChange={(event) => setLineProductId(Number(event.target.value))}>
                  <option value={0}>-- ابحث أو اختر المنتج --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>
              <div className="pos-input-group" style={{ flex: 1 }}>
                <label>الكمية</label>
                <input className="fs-input" type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 1)} />
              </div>
              <button type="button" className="pos-action-btn pos-btn-secondary" onClick={addLine} style={{ padding: '12px 24px' }}>
                <Plus size={18} /> إضافة
              </button>
            </div>
          </div>

          {error && <div style={{ background: 'var(--fs-danger-bg)', color: 'var(--fs-danger-text)', padding: '16px', borderRadius: 'var(--radius-sm)', marginTop: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={18} /> {error}</div>}

          {items.length > 0 && (
            <div className="pos-table-card" style={{ marginTop: 24, border: '1px solid var(--fs-border)' }}>
              <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'right' }}>المنتج</th>
                    <th style={{ textAlign: 'center' }}>الكمية</th>
                    <th style={{ textAlign: 'left' }}>سعر الوحدة</th>
                    <th style={{ textAlign: 'left' }}>الإجمالي</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId} style={{ transition: 'background 0.2s' }}>
                      <td style={{ color: 'var(--fs-navy)' }}>{item.productName}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ background: 'var(--fs-bg)', padding: '4px 12px', borderRadius: 99 }}>{item.quantity}</span>
                      </td>
                      <td style={{ textAlign: 'left' }}>{formatMoney(item.unitPriceCents)}</td>
                      <td style={{ textAlign: 'left', color: 'var(--fs-blue)', fontWeight: 800 }}>{formatMoney(item.quantity * item.unitPriceCents)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button type="button" onClick={() => removeItem(item.productId)} style={{ background: 'transparent', border: 0, color: '#fca5a5', cursor: 'pointer', padding: 8 }} title="إزالة">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div style={{ marginTop: 32, background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid var(--fs-border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-navy)' }}>الفاتورة المالية</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              <div className="pos-input-group">
                <label><Wallet size={16} color="var(--fs-text-muted)" /> الإجمالي الفرعي</label>
                <input className="fs-input" readOnly value={formatMoney(totals.subtotal)} />
              </div>
              <div className="pos-input-group">
                <label><Percent size={16} color="var(--fs-text-muted)" /> الخصم</label>
                <input className="fs-input" type="number" min={0} step="0.01" value={discountType === 'FIXED' ? (discountValueCents / 100).toString() : (discountPercentage || 0)} onChange={(event) => {
                  const next = event.target.value;
                  if (discountType === 'FIXED') {
                    const parsed = parseMonetaryInput(next);
                    if (!Number.isNaN(parsed)) setDiscountValueCents(parsed);
                  } else {
                    const parsed = Number(next);
                    if (Number.isFinite(parsed) && parsed >= 0) setDiscountPercentage(parsed);
                  }
                }} />
              </div>
              <div className="pos-input-group">
                <label>نوع الخصم</label>
                <select className="fs-select" value={discountType} onChange={(event) => setDiscountType(event.target.value as SalesInvoiceDiscountType)}>
                  <option value="FIXED">مبلغ</option>
                  <option value="PERCENT">نسبة %</option>
                </select>
              </div>
              <div className="pos-input-group">
                <label>قيمة الخصم</label>
                <input className="fs-input" readOnly value={formatMoney(financial.discountCents)} />
              </div>
              <div className="pos-input-group">
                <label>الإجمالي بعد الخصم</label>
                <input className="fs-input" readOnly value={formatMoney(financial.afterDiscountCents)} />
              </div>
            </div>

            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px dashed var(--fs-border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                  <input type="checkbox" checked={taxEnabled} onChange={(event) => setTaxEnabled(event.target.checked)} />
                  تفعيل الضريبة
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                {taxEnabled && (
                  <>
                    <div className="pos-input-group">
                      <label>نسبة الضريبة %</label>
                      <input className="fs-input" type="number" min={0} max={100} step="0.01" value={taxRatePercent} onChange={(event) => {
                        const next = Number(event.target.value);
                        if (Number.isFinite(next) && next >= 0) setTaxRatePercent(next);
                      }} />
                    </div>
                    <div className="pos-input-group">
                      <label>قيمة الضريبة</label>
                      <input className="fs-input" readOnly value={formatMoney(financial.taxCents)} />
                    </div>
                  </>
                )}
                <div className="pos-input-group">
                  <label>مصاريف النقل</label>
                  <input className="fs-input" type="number" min={0} step="0.01" value={(cashExpensesCents / 100).toString()} onChange={(event) => {
                    const parsed = parseMonetaryInput(event.target.value);
                    if (!Number.isNaN(parsed)) setCashExpensesCents(parsed);
                  }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pos-total-panel">
            <span className="pos-total-label">الإجمالي النهائي</span>
            <span className="pos-total-value">{formatMoney(financial.totalCents)}</span>
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
            <button className="pos-action-btn pos-btn-primary" type="submit" disabled={saving || items.length === 0} style={{ flex: 1, padding: '16px', fontSize: '16px', justifyContent: 'center' }}>
              <Save size={20} /> {saving ? 'جاري الحفظ...' : 'تأكيد وحفظ الفاتورة'}
            </button>
            <button className="pos-action-btn pos-btn-secondary" type="button" onClick={() => setShowForm(false)} style={{ padding: '16px 32px' }}>إلغاء</button>
          </div>
        </form>
      )}

      <div className="pos-table-card">
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={20} color="var(--fs-text-muted)" />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>سجل الفواتير الأخيرة</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr>
              <th style={{ padding: '16px 24px', color: 'var(--fs-text-muted)', fontSize: '13px', borderBottom: '1px solid var(--fs-border-soft)' }}>رقم الفاتورة</th>
              <th style={{ padding: '16px 24px', color: 'var(--fs-text-muted)', fontSize: '13px', borderBottom: '1px solid var(--fs-border-soft)' }}>العميل</th>
              <th style={{ padding: '16px 24px', color: 'var(--fs-text-muted)', fontSize: '13px', borderBottom: '1px solid var(--fs-border-soft)' }}>التاريخ</th>
              <th style={{ padding: '16px 24px', color: 'var(--fs-text-muted)', fontSize: '13px', borderBottom: '1px solid var(--fs-border-soft)' }}>الإجمالي</th>
              <th style={{ padding: '16px 24px', color: 'var(--fs-text-muted)', fontSize: '13px', borderBottom: '1px solid var(--fs-border-soft)' }}>الحالة</th>
              <th style={{ padding: '16px 24px', color: 'var(--fs-text-muted)', fontSize: '13px', borderBottom: '1px solid var(--fs-border-soft)', width: 120 }}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#7a8691', padding: '60px 0' }}>لا توجد فواتير مسجلة حتى الآن</td></tr>
            ) : invoices.map((invoice) => (
              <tr key={invoice.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--fs-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ padding: '16px 24px', fontWeight: 600, borderBottom: '1px solid var(--fs-border-soft)' }}><button type="button" className="table-link" onClick={() => handlePrint(invoice.id)}>{invoice.invoiceNumber}</button></td>
                <td style={{ padding: '16px 24px', borderBottom: '1px solid var(--fs-border-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={16} color="var(--fs-text-muted)" />
                    {invoice.customerName ?? <span style={{ color: 'var(--fs-text-muted)' }}>عميل نقدي</span>}
                  </div>
                </td>
                <td style={{ padding: '16px 24px', borderBottom: '1px solid var(--fs-border-soft)' }}>{new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-GB')}</td>
                <td style={{ padding: '16px 24px', fontWeight: 800, color: 'var(--fs-navy)', borderBottom: '1px solid var(--fs-border-soft)' }}>{formatMoney(invoice.totalCents)}</td>
                <td style={{ padding: '16px 24px', borderBottom: '1px solid var(--fs-border-soft)' }}>{getStatusBadge(invoice.status)}</td>
                <td style={{ padding: '12px 24px', borderBottom: '1px solid var(--fs-border-soft)' }}>
                  <button type="button" onClick={() => handlePrint(invoice.id)} style={{ background: '#fff', border: '1px solid var(--fs-border)', padding: '8px 16px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--fs-text-main)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--fs-blue)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--fs-border)'}>
                    <Printer size={14} /> فتح وطباعة
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
