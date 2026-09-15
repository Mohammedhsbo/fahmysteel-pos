import { useEffect, useState } from 'react';
import { ArrowRight, Package, Info, Scale, Box, DollarSign, Trash2, Edit2, Archive, AlertCircle, FileText } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { CatalogProduct } from '../../shared/catalog';

export function ProductDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { productId } = useParams();
  const [product, setProduct] = useState<CatalogProduct | null>(() => {
    const state = location.state as { product?: CatalogProduct } | null;
    return state?.product ?? null;
  });
  const [error, setError] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const id = Number(productId);
    if (!Number.isInteger(id)) {
      setError('رقم الصنف غير صحيح.');
      return;
    }
    if (product) return;
    void window.api.catalog.listProducts().then((results) => {
      const result = (results as CatalogProduct[]).find((item) => item.id === id) ?? null;
      setProduct(result);
      if (!result) setError('الصنف غير موجود.');
    }).catch(() => setError('تعذر تحميل بيانات الصنف.'));
  }, [product, productId]);

  async function handleArchive(): Promise<void> {
    if (!product) return;
    setIsDeleting(true);
    try {
      await window.api.catalog.archiveProduct(product.id);
      navigate('/inventory');
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'تعذر حذف الصنف.');
      setShowDeleteConfirmation(false);
    } finally {
      setIsDeleting(false);
    }
  }

  if (error) {
    return (
      <section className="page-content pos-container" style={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--fs-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Package size={48} opacity={0.5} />
          <h2 style={{ margin: 0 }}>{error}</h2>
          <button className="pos-action-btn pos-btn-secondary" style={{ marginTop: 16 }} type="button" onClick={() => navigate('/inventory')}>العودة للمخزون</button>
        </div>
      </section>
    );
  }

  if (!product) return <section className="page-content"><div className="auth-loading">جاري تحميل بيانات الصنف...</div></section>;

  const stockStatus = product.currentStockQuantity <= 0 ? 'نفد المخزون' : product.currentStockQuantity < product.minimumStockQuantity ? 'مخزون منخفض' : 'متوفر';
  const statusClass = product.currentStockQuantity <= 0 ? 'danger' : product.currentStockQuantity < product.minimumStockQuantity ? 'warning' : 'success';

  return (
    <section className="page-content pos-container">
      <style>{`
        .pos-container { max-width: 1200px; margin: 0 auto; padding-bottom: 60px; }
        .pos-header-flex { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 0; gap: 6px; }
        .pos-action-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border-radius: 99px; font-weight: 700; font-size: 14.5px; transition: all 0.2s; cursor: pointer; border: 0; }
        .pos-btn-primary { background: var(--fs-blue); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
        .pos-btn-primary:hover:not(:disabled) { background: var(--fs-blue-hover); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35); }
        .pos-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .pos-btn-secondary { background: #fff; color: var(--fs-text-main); border: 1px solid var(--fs-border); box-shadow: var(--shadow-sm); }
        .pos-btn-secondary:hover:not(:disabled) { background: var(--fs-bg); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        .pos-form-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid var(--fs-border);
          border-radius: var(--radius-lg);
          padding: 32px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
          margin-bottom: 32px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .detail-card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.06);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .detail-card h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--fs-text-main);
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--fs-border-soft);
        }

        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--fs-border-soft); }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: var(--fs-text-muted); font-size: 14px; font-weight: 600; }
        .detail-value { color: var(--fs-text-main); font-size: 15px; font-weight: 700; }
        .detail-value.highlight { color: var(--fs-blue); }

        .pos-badge { display: inline-flex; align-items: center; justify-content: center; padding: 6px 16px; border-radius: 99px; font-size: 13px; font-weight: 700; }
        .pos-badge.success { background: var(--fs-success-bg); color: var(--fs-success-text); }
        .pos-badge.danger { background: var(--fs-danger-bg); color: var(--fs-danger-text); }
        .pos-badge.warning { background: var(--fs-warning-bg); color: var(--fs-warning-text); }
        .pos-badge.info { background: #eff6ff; color: #1d4ed8; }

        .confirm-box { background: var(--fs-danger-bg); border: 1px solid #fecaca; border-radius: var(--radius-lg); padding: 24px; margin-top: 32px; animation: slideDown 0.3s ease; }
        .confirm-box strong { display: block; color: var(--fs-danger-text); font-size: 18px; margin-bottom: 12px; }
        .confirm-box p { color: var(--fs-danger-text); margin: 4px 0; font-size: 14px; }
        .fs-btn-danger { background: #dc2626; color: white; border: 0; padding: 12px 24px; border-radius: 99px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25); }
        .fs-btn-danger:hover:not(:disabled) { background: #b91c1c; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(220, 38, 38, 0.35); }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Inventory Management</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={24} color="var(--fs-blue)" />
              {product.nameAr || product.name}
            </h1>
            <span className={`pos-badge ${statusClass}`}>{stockStatus}</span>
          </div>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px', fontFamily: 'monospace' }}>SKU: {product.sku}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="pos-action-btn pos-btn-secondary" type="button" onClick={() => navigate('/inventory')}>
            <ArrowRight size={18} /> العودة للمخزون
          </button>
          <button className="pos-action-btn pos-btn-primary" type="button" onClick={() => navigate('/inventory', { state: { editProduct: product } })}>
            <Edit2 size={18} /> تعديل الصنف
          </button>
        </div>
      </div>

      <div className="details-grid">
        <div className="detail-card">
          <h3><Info size={20} color="var(--fs-text-muted)"/> معلومات الصنف الأساسية</h3>
          <div className="detail-row"><span className="detail-label">اسم الصنف</span><span className="detail-value">{product.nameAr || product.name}</span></div>
          <div className="detail-row"><span className="detail-label">التصنيف</span><span className="detail-value">{product.categoryName ?? '—'}</span></div>
          <div className="detail-row"><span className="detail-label">النوع</span><span className="detail-value">{product.steelType ?? '—'}</span></div>
          <div className="detail-row"><span className="detail-label">كود الصنف (SKU)</span><span className="detail-value" style={{ fontFamily: 'monospace' }}>{product.sku}</span></div>
          <div className="detail-row"><span className="detail-label">ملاحظات وصفية</span><span className="detail-value">{product.description ?? '—'}</span></div>
        </div>

        <div className="detail-card">
          <h3><Scale size={20} color="var(--fs-text-muted)"/> المواصفات الفنية والأبعاد</h3>
          <div className="detail-row"><span className="detail-label">الشكل</span><span className="detail-value">{product.shape ?? '—'}</span></div>
          <div className="detail-row"><span className="detail-label">الأبعاد</span><span className="detail-value" dir="ltr">{product.widthMm ?? '-'} × {product.heightMm ?? '-'} mm</span></div>
          <div className="detail-row"><span className="detail-label">السماكة</span><span className="detail-value" dir="ltr">{product.thicknessMm ?? '-'} mm</span></div>
          <div className="detail-row"><span className="detail-label">الطول</span><span className="detail-value" dir="ltr">{product.lengthM ?? '-'} m</span></div>
          <div className="detail-row"><span className="detail-label">الوزن / قطعة</span><span className="detail-value">{product.weightPerPieceKg ?? '-'} كجم</span></div>
          <div className="detail-row"><span className="detail-label">الوزن / متر</span><span className="detail-value">{product.weightPerMeterKg ?? '-'} كجم</span></div>
        </div>

        <div className="detail-card">
          <h3><Box size={20} color="var(--fs-text-muted)"/> تفاصيل المخزون</h3>
          <div className="detail-row"><span className="detail-label">الكمية الحالية</span><span className="detail-value highlight" style={{ fontSize: 18 }}>{product.currentStockQuantity} {product.unitName}</span></div>
          <div className="detail-row"><span className="detail-label">الوزن الإجمالي المخزن</span><span className="detail-value">{product.totalWeightKg.toLocaleString('en-US')} كجم</span></div>
          <div className="detail-row"><span className="detail-label">الحد الأدنى للمخزون</span><span className="detail-value" style={{ color: 'var(--fs-warning-text)' }}>{product.minimumStockQuantity} {product.unitName}</span></div>
          <div className="detail-row">
            <span className="detail-label">إجراءات المخزون</span>
            <button className="pos-action-btn pos-btn-secondary" style={{ padding: '6px 12px', fontSize: 12, height: 'auto' }} type="button" onClick={() => navigate(`/inventory-adjustments?productId=${product.id}`)}>
              تسوية جرد <ArrowRight size={14} style={{ marginLeft: -4, marginRight: 4 }} />
            </button>
          </div>
        </div>

        <div className="detail-card">
          <h3><DollarSign size={20} color="var(--fs-text-muted)"/> الأسعار والتقييم</h3>
          <div className="detail-row"><span className="detail-label">سعر الشراء / كجم</span><span className="detail-value">{(product.purchasePriceCents / 100).toLocaleString('en-US')} ج.م</span></div>
          <div className="detail-row"><span className="detail-label">سعر البيع / كجم</span><span className="detail-value highlight">{((product.sellingPricePerKgCents ?? product.sellingPriceCents) / 100).toLocaleString('en-US')} ج.م</span></div>
          <div className="detail-row"><span className="detail-label">سعر بيع القطعة</span><span className="detail-value">{product.sellingPricePerPieceCents ? (product.sellingPricePerPieceCents / 100).toLocaleString('en-US') + ' ج.م' : '—'}</span></div>
          <div className="detail-row"><span className="detail-label">سعر بيع المتر</span><span className="detail-value">{product.sellingPricePerMeterCents ? (product.sellingPricePerMeterCents / 100).toLocaleString('en-US') + ' ج.م' : '—'}</span></div>
          <div className="detail-row"><span className="detail-label">إجمالي قيمة المخزون</span><span className="detail-value" style={{ color: 'var(--fs-success-text)' }}>{(product.stockValueCents / 100).toLocaleString('en-US')} ج.م</span></div>
        </div>
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--fs-border-soft)', paddingTop: 32 }}>
        {!showDeleteConfirmation && (
          <button className="fs-btn-danger" style={{ background: '#fff', color: 'var(--fs-danger-text)', border: '1px solid #fecaca', boxShadow: 'none' }} type="button" onClick={() => setShowDeleteConfirmation(true)}>
            <Archive size={18} /> أرشفة الصنف
          </button>
        )}
      </div>

      {showDeleteConfirmation && (
        <div className="confirm-box">
          <strong><AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: 8, marginLeft: 8 }}/> تأكيد أرشفة الصنف</strong>
          <p>أنت على وشك أرشفة الصنف: <span style={{ fontWeight: 800 }}>{product.nameAr || product.name}</span></p>
          <p>المخزون الحالي: {product.currentStockQuantity} {product.unitName}</p>
          <p>سيتم إخفاء الصنف من قوائم البيع والشراء ولكن سيتم الاحتفاظ به في سجلات الفواتير السابقة لضمان سلامة التقارير المالية.</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className="fs-btn-danger" type="button" disabled={isDeleting} onClick={() => void handleArchive()}>
              {isDeleting ? 'جاري الأرشفة...' : 'نعم، قم بأرشفة الصنف'}
            </button>
            <button className="pos-action-btn pos-btn-secondary" type="button" disabled={isDeleting} onClick={() => setShowDeleteConfirmation(false)}>
              إلغاء التراجع
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
