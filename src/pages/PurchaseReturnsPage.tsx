import { useEffect, useMemo, useState } from 'react';
import { PackageMinus, Store, FileText, Box, Save, Plus, Undo2, Hash, Banknote } from 'lucide-react';
import type { SupplierRecord } from '../../shared/contacts';
import type { PurchaseReturnRecord } from '../../shared/purchase-returns';
import type { PurchaseInvoice } from '../../shared/purchases';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

export function PurchaseReturnsPage() {
  const { t } = useI18n();
  const { showError, showSuccess } = useToast();
  const [returns, setReturns] = useState<PurchaseReturnRecord[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [originalItemId, setOriginalItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [refund, setRefund] = useState('0');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function loadReturns() {
    setReturns(await window.api.purchaseReturns.listPurchaseReturns());
  }

  async function loadFormOptions() {
    const [invoiceRows, supplierRows] = await Promise.all([
      window.api.purchases.listPurchaseInvoices(),
      window.api.suppliers.listSuppliers(),
    ]);
    setInvoices(invoiceRows);
    setSuppliers(supplierRows);
  }

  useEffect(() => {
    void Promise.all([loadReturns(), loadFormOptions()]);
  }, []);

  const selectedInvoice = invoices.find((invoice) => invoice.id === Number(invoiceId));

  const sortedReturns = useMemo(
    () => [...returns].sort((left, right) => right.returnedAt.localeCompare(left.returnedAt)),
    [returns],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await window.api.purchaseReturns.createPurchaseReturn({
        originalInvoiceId: Number(invoiceId),
        supplierId: supplierId ? Number(supplierId) : null,
        reason: reason || null,
        items: [{
          originalItemId: Number(originalItemId),
          quantity: Number(quantity),
          refundCents: Number(refund) * 100,
        }],
      });
      setInvoiceId('');
      setSupplierId('');
      setOriginalItemId('');
      setQuantity('1');
      setRefund('0');
      setReason('');
      setShowForm(false);
      showSuccess('Purchase return created successfully.');
      await loadReturns();
      await loadFormOptions();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to create purchase return.';
      setError(message);
      showError(message, 'Unable to create purchase return.');
    } finally {
      setSaving(false);
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
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }
        .pos-input-group {
          display: flex; flex-direction: column; gap: 8px;
        }
        .pos-input-group label {
          font-size: 13.5px; font-weight: 600; color: var(--fs-text-main); display: flex; align-items: center; gap: 6px;
        }
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
        
        .pos-cart-table th { background: #f8fafc; font-weight: 700; color: var(--fs-text-muted); padding: 16px 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--fs-border-soft); }
        .pos-cart-table td { padding: 16px 20px; font-size: 14.5px; font-weight: 600; border-bottom: 1px solid var(--fs-border-soft); }
        .pos-cart-table tr:last-child td { border-bottom: none; }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Procurement</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PackageMinus size={24} color="var(--fs-blue)" />
            مرتجعات المشتريات (Purchase Returns)
          </h1>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px' }}>Return supplier goods and reduce local stock with an auditable inventory movement.</p>
        </div>
        <button className="pos-action-btn pos-btn-primary" type="button" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'إلغاء النافذة' : 'تسجيل مرتجع مورد'}
        </button>
      </div>

      {showForm && (
        <form className="pos-form-card" onSubmit={handleSubmit}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Undo2 color="var(--fs-blue)"/> تفاصيل المرتجع للمورد
          </h2>

          <div className="pos-form-grid" style={{ marginBottom: 32, paddingBottom: 32, borderBottom: '1px dashed var(--fs-border)' }}>
            <div className="pos-input-group">
              <label><FileText size={16} color="var(--fs-text-muted)"/> الفاتورة الأصلية (Purchase Invoice)</label>
              <select className="fs-select" value={invoiceId} onChange={(event) => { setInvoiceId(event.target.value); setOriginalItemId(''); }} required>
                <option value="">-- اختر الفاتورة --</option>
                {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} - {invoice.supplierName ?? 'شراء مباشر'}</option>)}
              </select>
            </div>
            <div className="pos-input-group">
              <label><Store size={16} color="var(--fs-text-muted)"/> المورد (Supplier)</label>
              <select className="fs-select" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                <option value="">شراء مباشر بدون مورد</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </div>
            
            <div className="pos-input-group" style={{ gridColumn: '1 / -1', background: '#fafafa', padding: 24, borderRadius: 'var(--radius-md)', border: '1px solid var(--fs-border-soft)' }}>
              <div className="pos-form-grid">
                <div className="pos-input-group">
                  <label><Box size={16} color="var(--fs-text-muted)"/> الصنف المرتجع (Item)</label>
                  <select className="fs-select" value={originalItemId} onChange={(event) => setOriginalItemId(event.target.value)} required disabled={!selectedInvoice}>
                    <option value="">-- اختر الصنف --</option>
                    {selectedInvoice?.items.map((item) => <option key={item.id} value={item.id}>{item.productName} (الكمية المشترات: {item.quantity})</option>)}
                  </select>
                </div>
                <div className="pos-input-group">
                  <label><Hash size={16} color="var(--fs-text-muted)"/> الكمية المرتجعة (Quantity)</label>
                  <input className="fs-input" type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                </div>
                <div className="pos-input-group">
                  <label><Banknote size={16} color="var(--fs-text-muted)"/> مبلغ الاسترداد (Refund in EGP)</label>
                  <input className="fs-input" type="number" min="0" step="0.01" value={refund} onChange={(event) => setRefund(event.target.value)} />
                </div>
              </div>
            </div>

            <div className="pos-input-group" style={{ gridColumn: '1 / -1' }}>
              <label>سبب الارتجاع (Reason)</label>
              <textarea className="fs-input" value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="سبب الارتجاع للمورد (اختياري)..." />
            </div>
          </div>

          {error && <div style={{ background: 'var(--fs-danger-bg)', color: 'var(--fs-danger-text)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontWeight: 600 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 16 }}>
            <button className="pos-action-btn pos-btn-primary" type="submit" disabled={saving || !invoiceId || !originalItemId} style={{ padding: '14px 32px' }}>
              <Save size={18} /> {saving ? 'جاري الحفظ...' : 'تأكيد مرتجع المشتريات'}
            </button>
            <button className="pos-action-btn pos-btn-secondary" type="button" onClick={() => setShowForm(false)} style={{ padding: '14px 32px' }}>إلغاء</button>
          </div>
        </form>
      )}

      <div className="pos-table-card">
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
          <PackageMinus size={20} color="var(--fs-text-muted)" />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>سجل مرتجعات المشتريات (Supplier Returns)</h3>
        </div>
        <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>رقم المرتجع</th>
              <th style={{ textAlign: 'right' }}>الفاتورة الأصلية</th>
              <th style={{ textAlign: 'right' }}>المورد</th>
              <th style={{ textAlign: 'right' }}>المستخدم</th>
              <th style={{ textAlign: 'right' }}>قيمة الاسترداد</th>
              <th style={{ textAlign: 'left' }}>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {sortedReturns.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#7a8691', padding: '60px 0' }}>لا توجد مرتجعات للموردين</td></tr>
            ) : sortedReturns.map((entry) => (
              <tr key={entry.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--fs-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ color: 'var(--fs-navy)' }}>{entry.returnNumber}</td>
                <td><span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: '13px', fontFamily: 'monospace' }}>{entry.originalInvoiceId}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Store size={14} color="var(--fs-text-muted)" />
                    {entry.supplierName ?? <span style={{ color: 'var(--fs-text-muted)' }}>شراء مباشر</span>}
                  </div>
                </td>
                <td>{entry.createdByName}</td>
                <td style={{ color: 'var(--fs-danger-text)', fontWeight: 800 }}>{(entry.refundCents / 100).toFixed(2)} EGP</td>
                <td style={{ textAlign: 'left', color: 'var(--fs-text-muted)' }}>{new Date(entry.returnedAt).toLocaleString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
