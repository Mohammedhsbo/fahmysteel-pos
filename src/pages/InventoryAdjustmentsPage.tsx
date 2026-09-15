import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Hash, Save, Plus, ArrowRightLeft, PenTool, Database, History } from 'lucide-react';
import type { CatalogProduct } from '../../shared/catalog';
import type { InventoryAdjustmentRecord } from '../../shared/inventory';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

export function InventoryAdjustmentsPage() {
  const { t } = useI18n();
  const { showError, showSuccess } = useToast();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustmentRecord[]>([]);
  const [productId, setProductId] = useState('');
  const [quantityDelta, setQuantityDelta] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function loadData() {
    const [productRows, adjustmentRows] = await Promise.all([
      window.api.catalog.listProducts(),
      window.api.inventory.listAdjustments(),
    ]);
    setProducts(productRows as CatalogProduct[]);
    setAdjustments(adjustmentRows);
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const requestedProductId = searchParams.get('productId');
    if (requestedProductId) {
      setProductId(requestedProductId);
      setShowForm(true);
    }
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await window.api.inventory.adjustStock({
        productId: Number(productId),
        quantityDelta: Number(quantityDelta),
        reason,
      });
      setProductId('');
      setQuantityDelta('');
      setReason('');
      setShowForm(false);
      showSuccess('تم تحديث المخزون بنجاح');
      await loadData();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to adjust stock.';
      setError(message);
      showError(message, 'Unable to adjust stock.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-content pos-container">
      <style>{`
        .pos-container { max-width: 1200px; margin: 0 auto; padding-bottom: 60px; }
        .pos-header-flex { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 0; gap: 6px; }
        .pos-action-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 99px; font-weight: 700; font-size: 14.5px; transition: all 0.2s; cursor: pointer; border: 0; }
        .pos-btn-primary { background: var(--fs-blue); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
        .pos-btn-primary:hover:not(:disabled) { background: var(--fs-blue-hover); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35); }
        .pos-btn-secondary { background: #fff; color: var(--fs-text-main); border: 1px solid var(--fs-border); box-shadow: var(--shadow-sm); }
        .pos-btn-secondary:hover:not(:disabled) { background: var(--fs-bg); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

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
        .pos-input-group { display: flex; flex-direction: column; gap: 8px; }
        .pos-input-group label { font-size: 13.5px; font-weight: 600; color: var(--fs-text-main); display: flex; align-items: center; gap: 6px; }
        
        .pos-table-card {
          background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--fs-border);
          box-shadow: 0 4px 15px -3px rgba(0,0,0,0.05); overflow: hidden;
        }
        .pos-cart-table th { background: #f8fafc; font-weight: 700; color: var(--fs-text-muted); padding: 16px 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--fs-border-soft); }
        .pos-cart-table td { padding: 16px 20px; font-size: 14.5px; font-weight: 600; border-bottom: 1px solid var(--fs-border-soft); }
        .pos-cart-table tr:last-child td { border-bottom: none; }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Inventory Control</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={24} color="var(--fs-blue)" />
            تسويات المخزون (Adjustments)
          </h1>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px' }}>تعديل الأرصدة الفعلية للمخزون مع تسجيل سبب التعديل للمراجعة</p>
        </div>
        <button className="pos-action-btn pos-btn-primary" type="button" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'إلغاء' : <><Plus size={18} /> تسوية جديدة</>}
        </button>
      </div>

      {showForm && (
        <form className="pos-form-card" onSubmit={handleSubmit}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><PenTool color="var(--fs-blue)"/> تنفيذ جرد أو تسوية</h2>
          
          <div className="pos-form-grid" style={{ marginBottom: 32, paddingBottom: 32, borderBottom: '1px dashed var(--fs-border)' }}>
            <div className="pos-input-group">
              <label><Package size={16} color="var(--fs-text-muted)"/> المنتج (Product)</label>
              <select className="fs-select" value={productId} onChange={(event) => setProductId(event.target.value)} required>
                <option value="">-- اختر المنتج --</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name} (المخزون الحالي: {product.currentStockQuantity})</option>)}
              </select>
            </div>
            
            <div className="pos-input-group">
              <label><ArrowRightLeft size={16} color="var(--fs-text-muted)"/> مقدار التغيير (الفرق)</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <input className="fs-input" type="number" step="0.01" value={quantityDelta} onChange={(event) => setQuantityDelta(event.target.value)} placeholder="مثال: 5 للإضافة، -3 للخصم" required style={{ flex: 1 }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--fs-text-muted)' }}>استخدم القيمة السالبة للخصم من المخزون</span>
            </div>
            
            <div className="pos-input-group" style={{ gridColumn: '1 / -1' }}>
              <label>سبب التسوية (البيان)</label>
              <textarea className="fs-input" value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="مثال: تسوية جرد، تالف، هالك..." required />
            </div>
          </div>

          {error && <div style={{ background: 'var(--fs-danger-bg)', color: 'var(--fs-danger-text)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontWeight: 600 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 16 }}>
            <button className="pos-action-btn pos-btn-primary" type="submit" disabled={saving || !productId || !quantityDelta} style={{ padding: '14px 32px' }}>
              <Save size={18} /> {saving ? 'جاري الحفظ...' : 'تطبيق التسوية'}
            </button>
            <button className="pos-action-btn pos-btn-secondary" type="button" onClick={() => setShowForm(false)} style={{ padding: '14px 32px', boxShadow: 'none' }}>إلغاء</button>
          </div>
        </form>
      )}

      <div className="pos-table-card">
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
          <History size={20} color="var(--fs-text-muted)" />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>سجل التسويات (Adjustment History)</h3>
        </div>
        <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>المنتج</th>
              <th style={{ textAlign: 'right' }}>التغيير</th>
              <th style={{ textAlign: 'right' }}>السبب</th>
              <th style={{ textAlign: 'right' }}>المستخدم</th>
              <th style={{ textAlign: 'left' }}>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#7a8691', padding: '60px 0' }}>لا توجد تسويات مسجلة</td></tr>
            ) : adjustments.map((adjustment) => (
              <tr key={adjustment.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--fs-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ color: 'var(--fs-navy)', fontWeight: 700 }}>{adjustment.productName}</td>
                <td>
                  <span style={{ 
                    background: adjustment.quantityDelta > 0 ? '#dcfce7' : '#fee2e2', 
                    color: adjustment.quantityDelta > 0 ? '#166534' : '#991b1b',
                    padding: '4px 10px', borderRadius: 6, fontWeight: 800, fontFamily: 'monospace'
                  }}>
                    {adjustment.quantityDelta > 0 ? '+' : ''}{adjustment.quantityDelta}
                  </span>
                </td>
                <td>{adjustment.reason}</td>
                <td>{adjustment.createdByName}</td>
                <td style={{ textAlign: 'left', color: 'var(--fs-text-muted)' }}>{new Date(adjustment.createdAt).toLocaleString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
