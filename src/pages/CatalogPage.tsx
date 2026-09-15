import { useEffect, useMemo, useState } from 'react';
import { Archive, ClipboardList, Edit3, PackagePlus, Save, X, Search, Package, PackageSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CatalogCategory, CatalogProduct, CatalogUnit } from '../../shared/catalog';
import type { InventoryStocktakingReport } from '../../shared/inventory';
import { calculatePiecePriceCents, calculateStockValueCents, calculateTotalWeightKg, calculateWeightValues } from '../../shared/steel';
import { useToast } from '../components/ToastProvider';
import { InventoryStocktakingReport as InventoryStocktakingReportView } from '../features/InventoryStocktakingReport';

type Draft = {
  name: string; sku: string; categoryId: number | null; unitId: number;
  minimumStockQuantity: number; currentStockQuantity: number; steelType: string; shape: string;
  widthMm: number | null; heightMm: number | null; thicknessMm: number | null; lengthM: number | null;
  weightPerPieceKg: number | null; weightPerMeterKg: number | null; weightPerSheetKg: number | null;
  purchasePriceCents: number; sellingPricePerKgCents: number;
};

const empty: Draft = { 
  name: '', sku: '', categoryId: null, unitId: 0, 
  minimumStockQuantity: 0, currentStockQuantity: 0, steelType: '', shape: '', 
  widthMm: null, heightMm: null, thicknessMm: null, lengthM: null, 
  weightPerPieceKg: null, weightPerMeterKg: null, weightPerSheetKg: null, 
  purchasePriceCents: 0, sellingPricePerKgCents: 0 
};

const typeOptions: Record<string, string[]> = { 
  علب: ['علب مربع', 'علب مستطيل'], 
  زوايا: ['زاوية متساوية', 'زاوية غير متساوية'], 
  صاج: ['صاج أسود', 'صاج مجلفن', 'صاج مخرم'], 
  مواسير: ['ماسورة دائرية', 'ماسورة مربعة', 'ماسورة مستطيلة'], 
};

const supportedCategoryNames: Record<string, string> = {
  علب: 'Boxes',
  زوايا: 'Angles',
  صاج: 'Sheets',
  مواسير: 'Pipes',
};

const n = (value: string) => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
const money = (cents: number | null | undefined) => ((cents ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const decimal = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 3 });

export function CatalogPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  
  const [units, setUnits] = useState<CatalogUnit[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  
  const [draft, setDraft] = useState<Draft>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stocktakingLoading, setStocktakingLoading] = useState(false);
  const [stocktakingReport, setStocktakingReport] = useState<InventoryStocktakingReport | null>(null);
  const [error, setError] = useState('');

  const load = async () => { 
    const [u, c, p] = await Promise.all([
      window.api.catalog.listUnits(), 
      window.api.catalog.listCategories(), 
      window.api.catalog.listProducts(search)
    ]); 
    setUnits(u as CatalogUnit[]); 
    setCategories(c as CatalogCategory[]); 
    setProducts(p as CatalogProduct[]); 
  };
  
  useEffect(() => { void load(); }, []);

  const category = categories.find((item) => item.id === draft.categoryId)?.nameAr ?? ''; 
  const supportedCategories = categories.filter((item) => Object.prototype.hasOwnProperty.call(supportedCategoryNames, item.nameAr) || Object.values(supportedCategoryNames).includes(item.name));
  const unit = units.find((item) => item.id === draft.unitId); 
  const types = typeOptions[category] ?? []; 
  const isSheet = category === 'صاج' || unit?.code === 'SHEET';

  const weights = calculateWeightValues(draft); 
  const totalWeight = calculateTotalWeightKg({ ...draft, ...weights, weightPerSheetKg: draft.weightPerSheetKg }); 
  const piecePrice = calculatePiecePriceCents({ ...draft, ...weights }); 
  const stockValue = calculateStockValueCents({ ...draft, ...weights, sellingPricePerKgCents: draft.sellingPricePerKgCents });

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function openStocktakingReport(): Promise<void> {
    setStocktakingLoading(true);
    setError('');
    try {
      setStocktakingReport(await window.api.inventory.getStocktakingReport());
    } catch (reportError) {
      const message = reportError instanceof Error ? reportError.message : 'تعذر تحميل تقرير جرد المخزن.';
      setError(message);
      showError(message, 'تعذر تحميل تقرير جرد المخزن.');
    } finally {
      setStocktakingLoading(false);
    }
  }

  const edit = (product: CatalogProduct) => { 
    setDraft({ 
      name: product.nameAr || product.name, 
      sku: product.sku, 
      categoryId: product.categoryId, 
      unitId: product.unitId, 
      minimumStockQuantity: product.minimumStockQuantity, 
      currentStockQuantity: product.currentStockQuantity, 
      steelType: product.steelType ?? '', 
      shape: product.shape ?? '', 
      widthMm: product.widthMm, 
      heightMm: product.heightMm, 
      thicknessMm: product.thicknessMm, 
      lengthM: product.lengthM, 
      weightPerPieceKg: product.weightPerPieceKg, 
      weightPerMeterKg: product.weightPerMeterKg, 
      weightPerSheetKg: product.weightPerSheetKg, 
      purchasePriceCents: product.purchasePriceCents, 
      sellingPricePerKgCents: product.sellingPricePerKgCents ?? product.sellingPriceCents 
    }); 
    setEditingId(product.id); 
    setSelected(null); 
    setError(''); 
    setShowForm(true); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validate = () => { 
    if (!draft.name.trim()) return 'اسم الصنف مطلوب.'; 
    if (!draft.categoryId) return 'التصنيف مطلوب.'; 
    if (types.length && !draft.steelType) return 'النوع مطلوب لهذا التصنيف.'; 
    if (!draft.unitId) return 'الوحدة الأساسية مطلوبة.'; 
    const values = Object.values(draft).filter((value): value is number => typeof value === 'number'); 
    return values.some((value) => !Number.isFinite(value) || value < 0) ? 'لا يمكن استخدام قيم سالبة أو أرقام غير صحيحة.' : ''; 
  };

  async function submit(event: React.FormEvent) { 
    event.preventDefault(); 
    const message = validate(); 
    if (message) { setError(message); return; } 
    setSaving(true); 
    setError(''); 
    
    try { 
      const payload = { 
        ...draft, 
        sku: editingId == null ? undefined : draft.sku,
        name: draft.name.trim(), 
        nameAr: draft.name.trim(), 
        description: null, 
        defaultSupplierId: null, 
        sellingPriceCents: draft.sellingPricePerKgCents, 
        sellingPricePerKgCents: draft.sellingPricePerKgCents, 
        sellingPricePerPieceCents: piecePrice, 
        weightPerPieceKg: weights.weightPerPieceKg,
        weightPerMeterKg: weights.weightPerMeterKg,
        sellingPricePerMeterCents: weights.weightPerMeterKg == null ? null : Math.round(weights.weightPerMeterKg * draft.sellingPricePerKgCents) 
      }; 
      
      if (editingId == null) {
        await window.api.catalog.createProduct(payload); 
      } else {
        await window.api.catalog.updateProduct(editingId, payload); 
      }
      
      setShowForm(false); 
      setDraft(empty); 
      setEditingId(null); 
      showSuccess('تم حفظ الصنف بنجاح'); 
      await load(); 
    } catch (saveError) { 
      const text = saveError instanceof Error ? saveError.message : 'تعذر حفظ الصنف.'; 
      setError(text); 
      showError(text, 'تعذر حفظ الصنف.'); 
    } finally { 
      setSaving(false); 
    } 
  }

  const sorted = useMemo(() => [...products].sort((a, b) => (a.nameAr || a.name).localeCompare(b.nameAr || b.name)), [products]);

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

        .pos-table-card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.06);
          overflow: hidden;
        }
        
        .steel-layout { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(280px, .8fr); gap: 24px; }
        .steel-section { padding-bottom: 24px; margin-bottom: 24px; border-bottom: 1px dashed var(--fs-border-soft); }
        .steel-section:last-child { border: 0; margin: 0; padding-bottom: 0; }
        .steel-section h2 { font-size: 18px; margin: 0 0 18px; color: var(--fs-blue); display: flex; align-items: center; gap: 8px; font-weight: 700; }
        .steel-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
        
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group.full { grid-column: 1 / -1; }
        .form-group label { font-size: 14px; font-weight: 700; color: var(--fs-text-main); }
        
        .fs-input, .fs-select { padding: 12px 16px; border: 1px solid var(--fs-border); background: #fafafa; border-radius: var(--radius-sm); font-size: 15px; outline: none; transition: all 0.2s; width: 100%; }
        .fs-input:focus, .fs-select:focus { border-color: var(--fs-blue); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); background: #fff; }
        
        .steel-unit { display: flex; align-items: center; gap: 8px; }
        .steel-unit input { flex: 1; }
        .steel-unit span { color: var(--fs-text-muted); font-size: 14px; font-weight: 600; white-space: nowrap; width: 60px; }

        .steel-preview { position: sticky; top: 32px; background: #fff; padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--fs-border); box-shadow: 0 10px 40px -10px rgba(0,0,0,0.05); }
        .steel-preview h2 { margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--fs-border-soft); padding-bottom: 16px; }
        .steel-preview-title { font-size: 21px; font-weight: 800; color: var(--fs-navy); margin-bottom: 5px; }
        
        .steel-muted { color: var(--fs-text-muted); font-size: 13px; }
        .steel-stat { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed var(--fs-border-soft); font-size: 14px; }
        .steel-stat span { color: var(--fs-text-muted); font-weight: 600; }
        .steel-stat strong { color: var(--fs-text-main); font-weight: 700; text-align: left; }
        
        .steel-total { margin-top: 16px; padding: 16px; background: #eff6ff; border-radius: var(--radius-sm); color: #1d4ed8; font-weight: 600; font-size: 14px; display: flex; flex-direction: column; gap: 8px; }
        
        .search-wrapper { position: relative; width: 100%; max-width: 400px; }
        .search-wrapper svg { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--fs-text-muted); }
        .search-wrapper input { width: 100%; padding: 12px 16px 12px 40px; border: 1px solid var(--fs-border); border-radius: 99px; background: #fafafa; outline: none; transition: all 0.2s; }
        .search-wrapper input:focus { background: #fff; border-color: var(--fs-blue); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
        [dir='rtl'] .search-wrapper input { padding: 12px 40px 12px 16px; }

        .steel-table table { width: 100%; border-collapse: collapse; min-width: 1050px; }
        .steel-table th, .steel-table td { padding: 16px 20px; text-align: right; }
        .steel-table th { font-size: 13px; font-weight: 700; color: var(--fs-text-muted); text-transform: uppercase; letter-spacing: 0.05em; background: #fafafa; border-bottom: 1px solid var(--fs-border-soft); }
        .steel-table td { font-size: 14px; font-weight: 600; color: var(--fs-text-main); border-bottom: 1px solid var(--fs-border-soft); vertical-align: middle; }
        .steel-table tbody tr { cursor: pointer; transition: all 0.2s; }
        .steel-table tbody tr:hover { background: #f8fafc; }
        
        .pos-badge { display: inline-flex; align-items: center; justify-content: center; padding: 6px 16px; border-radius: 99px; font-size: 12px; font-weight: 700; }
        .pos-badge.success { background: var(--fs-success-bg); color: var(--fs-success-text); }
        .pos-badge.warning { background: var(--fs-warning-bg); color: var(--fs-warning-text); }
        .pos-badge.danger { background: var(--fs-danger-bg); color: var(--fs-danger-text); }
        
        .steel-modal-bg { position: fixed; inset: 0; z-index: 50; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: grid; place-items: center; padding: 20px; }
        .steel-modal { background: #fff; border-radius: var(--radius-lg); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 720px; width: 100%; max-height: 90vh; overflow: auto; padding: 32px; animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .steel-modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--fs-border-soft); }
        .steel-modal-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 32px; margin-bottom: 32px; }
        
        .action-btn { background: transparent; border: 0; color: var(--fs-text-muted); padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .action-btn:hover { background: var(--fs-bg); color: var(--fs-blue); }

        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        @media(max-width: 900px) { .steel-layout { grid-template-columns: 1fr; } .steel-preview { position: static; } }
        @media(max-width: 620px) { .steel-grid, .steel-modal-details { grid-template-columns: 1fr; } }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Inventory Catalog</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={24} color="var(--fs-blue)" />
            إدارة أصناف الحديد
          </h1>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px' }}>إدارة بيانات الأصناف، المواصفات، المخزون، وتسعير الحديد</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="pos-action-btn pos-btn-secondary" type="button" onClick={() => void openStocktakingReport()} disabled={stocktakingLoading}>
            <ClipboardList size={18} /> {stocktakingLoading ? 'جاري تحميل الجرد...' : 'جرد المخزن'}
          </button>
          <button className="pos-action-btn pos-btn-primary" type="button" onClick={() => { setDraft(empty); setEditingId(null); setError(''); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <PackagePlus size={18}/> إضافة صنف جديد
          </button>
        </div>
      </div>

      {showForm && (
        <form className="steel-layout" onSubmit={submit}>
          <div className="pos-form-card">
            <div className="steel-section">
              <h2>بيانات الصنف الأساسية</h2>
              <div className="steel-grid">
                <div className="form-group full">
                  <label>اسم الصنف</label>
                  <input className="fs-input" autoFocus value={draft.name} onChange={(e) => update('name', e.target.value)} placeholder="مثال: علبة مربع 4×4" />
                </div>
                <div className="form-group">
                  <label>التصنيف</label>
                  <select className="fs-select" value={draft.categoryId ?? ''} onChange={(e) => { update('categoryId', Number(e.target.value) || null); update('steelType', ''); }}>
                    <option value="">اختر التصنيف</option>
                    {supportedCategories.map((item) => <option key={item.id} value={item.id}>{Object.keys(supportedCategoryNames).find((nameAr) => supportedCategoryNames[nameAr] === item.name) ?? item.nameAr}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>النوع</label>
                  <select className="fs-select" value={draft.steelType} onChange={(e) => update('steelType', e.target.value)}>
                    <option value="">اختر النوع</option>
                    {types.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>كود الصنف (SKU)</label>
                  <input className="fs-input" value={editingId == null ? 'سيتم إنشاؤه تلقائياً' : draft.sku} readOnly />
                </div>
                <div className="form-group">
                  <label>الوحدة الأساسية</label>
                  <select className="fs-select" value={draft.unitId} onChange={(e) => update('unitId', Number(e.target.value))}>
                    <option value={0}>اختر الوحدة</option>
                    {units.map((item) => <option key={item.id} value={item.id}>{item.nameAr || item.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="steel-section">
              <h2>مواصفات وأبعاد الحديد</h2>
              <div className="steel-grid">
                {category !== 'صاج' && (
                  <div className="form-group">
                    <label>الشكل</label>
                    <input className="fs-input" value={draft.shape} onChange={(e) => update('shape', e.target.value)} placeholder="مثال: مربع" />
                  </div>
                )}
                <div className="form-group">
                  <label>العرض</label>
                  <div className="steel-unit">
                    <input className="fs-input" type="number" min="0" step="0.01" value={draft.widthMm == null ? '' : draft.widthMm / 10} onChange={(e) => { const value = n(e.target.value); update('widthMm', value == null ? null : value * 10); }} placeholder="0" />
                    <span>سم</span>
                  </div>
                </div>
                {category !== 'خوص' && category !== 'صاج' && (
                  <div className="form-group">
                    <label>الارتفاع</label>
                    <div className="steel-unit">
                      <input className="fs-input" type="number" min="0" step="0.01" value={draft.heightMm == null ? '' : draft.heightMm / 10} onChange={(e) => { const value = n(e.target.value); update('heightMm', value == null ? null : value * 10); }} placeholder="0" />
                      <span>سم</span>
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label>السمك</label>
                  <div className="steel-unit">
                    <input className="fs-input" type="number" min="0" step="0.01" value={draft.thicknessMm ?? ''} onChange={(e) => update('thicknessMm', n(e.target.value))} placeholder="0" />
                    <span>مم</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>الطول</label>
                  <div className="steel-unit">
                    <input className="fs-input" type="number" min="0" step="0.01" value={draft.lengthM ?? ''} onChange={(e) => update('lengthM', n(e.target.value))} placeholder="0" />
                    <span>م</span>
                  </div>
                </div>
                {isSheet ? (
                  <div className="form-group">
                    <label>وزن اللوح</label>
                    <div className="steel-unit">
                      <input className="fs-input" type="number" min="0" step="0.001" value={draft.weightPerSheetKg ?? ''} onChange={(e) => update('weightPerSheetKg', n(e.target.value))} placeholder="0" />
                      <span>كجم / لوح</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>وزن القطعة</label>
                      <div className="steel-unit">
                        <input className="fs-input" type="number" min="0" step="0.001" value={draft.weightPerPieceKg ?? ''} onChange={(e) => update('weightPerPieceKg', n(e.target.value))} placeholder="0" />
                        <span>كجم</span>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>وزن المتر</label>
                      <div className="steel-unit">
                        <input className="fs-input" type="text" value={weights.weightPerMeterKg == null ? '' : decimal(weights.weightPerMeterKg)} readOnly aria-readonly="true" placeholder="يُحسب تلقائياً من وزن القطعة والطول" />
                        <span>كجم</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <p className="steel-muted" style={{ marginTop: 12 }}>يُحسب الوزن المتبقي تلقائياً عند إدخال الطول وأحد الأوزان.</p>
            </div>

            <div className="steel-section">
              <h2>المخزون الفعلي</h2>
              <div className="steel-grid">
                <div className="form-group">
                  <label>الكمية الحالية</label>
                  <input className="fs-input" type="number" min="0" step="0.01" value={draft.currentStockQuantity} onChange={(e) => update('currentStockQuantity', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>الحد الأدنى للتنبيه</label>
                  <input className="fs-input" type="number" min="0" step="0.01" value={draft.minimumStockQuantity} onChange={(e) => update('minimumStockQuantity', Number(e.target.value))} />
                </div>
              </div>
              <div className="steel-total" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Package size={18} />
                <span>إجمالي المخزون بالوزن: <strong>{decimal(totalWeight)} كجم</strong></span>
              </div>
            </div>

            <div className="steel-section">
              <h2>التسعير</h2>
              <div className="steel-grid">
                <div className="form-group">
                  <label>سعر الشراء / كجم</label>
                  <div className="steel-unit">
                    <input className="fs-input" type="number" min="0" step="0.01" value={draft.purchasePriceCents / 100} onChange={(e) => update('purchasePriceCents', Math.round((Number(e.target.value) || 0) * 100))} />
                    <span>ج.م</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>سعر البيع / كجم</label>
                  <div className="steel-unit">
                    <input className="fs-input" type="number" min="0" step="0.01" value={draft.sellingPricePerKgCents / 100} onChange={(e) => update('sellingPricePerKgCents', Math.round((Number(e.target.value) || 0) * 100))} />
                    <span>ج.م</span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ background: 'var(--fs-danger-bg)', color: 'var(--fs-danger-text)', padding: '16px', borderRadius: 'var(--radius-sm)', marginTop: '24px', fontWeight: 600, fontSize: '14px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--fs-border-soft)' }}>
              <button className="pos-action-btn pos-btn-primary" type="submit" disabled={saving}>
                <Save size={18} /> {saving ? 'جاري الحفظ...' : editingId == null ? 'تسجيل الصنف' : 'حفظ التعديلات'}
              </button>
              <button className="pos-action-btn pos-btn-secondary" type="button" onClick={() => setShowForm(false)}>
                <X size={18} /> إلغاء
              </button>
            </div>
          </div>

          <aside className="steel-preview">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--fs-border-soft)', paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ background: 'var(--fs-blue-soft)', padding: 10, borderRadius: 12, color: 'var(--fs-blue)' }}>
                <PackageSearch size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: 'var(--fs-text-main)', borderBottom: 'none', paddingBottom: 0 }}>معاينة سريعة</h2>
                <div className="steel-muted" style={{ marginTop: 4 }}>ملخص بيانات الصنف والتسعير</div>
              </div>
            </div>

            <div style={{ padding: '16px', background: '#fafafa', borderRadius: 'var(--radius-sm)', border: '1px solid var(--fs-border-soft)', marginBottom: 24 }}>
              <div className="steel-preview-title" style={{ color: 'var(--fs-blue)', fontSize: 20 }}>{draft.name || 'اسم الصنف'}</div>
              <div className="steel-muted" style={{ fontWeight: 600 }}>{category || 'التصنيف'} {draft.steelType && `• ${draft.steelType}`}</div>
            </div>
            
            <div className="steel-stat"><span>المقاس</span><strong>{draft.widthMm == null ? '—' : draft.widthMm / 10}{draft.heightMm == null ? '' : ` × ${draft.heightMm / 10}`} سم</strong></div>
            <div className="steel-stat"><span>الوزن المتوقع</span><strong>{decimal(weights.weightPerPieceKg)} كجم / قطعة<br/><span style={{ color: 'var(--fs-text-muted)', fontSize: 12, fontWeight: 600 }}>{decimal(weights.weightPerMeterKg)} كجم / متر</span></strong></div>
            <div className="steel-stat"><span>إجمالي المخزون</span><strong>{draft.currentStockQuantity} {unit?.nameAr ?? ''}<br/><span style={{ color: 'var(--fs-text-muted)', fontSize: 12, fontWeight: 600 }}>{decimal(totalWeight)} كجم</span></strong></div>
            
            <div className="steel-total" style={{ marginTop: 24, padding: 20, background: 'var(--fs-blue)', color: 'white', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ opacity: 0.9 }}>سعر البيع بالكيلو</span>
                <strong style={{ fontSize: 16 }}>{money(draft.sellingPricePerKgCents)} ج.م</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ opacity: 0.9 }}>سعر بيع القطعة</span>
                <strong style={{ fontSize: 16 }}>{piecePrice == null ? '—' : `${money(piecePrice)} ج.م`}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255, 255, 255, 0.3)', paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontWeight: 700 }}>قيمة المخزون الإجمالية</span>
                <strong style={{ fontSize: 18, color: '#93c5fd' }}>{money(stockValue)} ج.م</strong>
              </div>
            </div>
          </aside>
        </form>
      )}

      {!showForm && (
        <div className="pos-table-card steel-table">
          <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>قائمة الأصناف المسجلة</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="steel-muted" style={{ fontWeight: 600 }}>إجمالي: {products.length} صنف</span>
              <div className="search-wrapper">
                <Search size={18} />
                <input 
                  value={search} 
                  onChange={(e) => { 
                    setSearch(e.target.value); 
                    void window.api.catalog.listProducts(e.target.value).then((rows) => setProducts(rows as CatalogProduct[])); 
                  }} 
                  placeholder="ابحث عن صنف أو SKU..." 
                />
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>الصنف</th>
                <th>التصنيف</th>
                <th>المقاس</th>
                <th>السمك</th>
                <th>الطول</th>
                <th>وزن القطعة</th>
                <th>المخزون</th>
                <th>إجمالي الوزن</th>
                <th>سعر البيع / كجم</th>
                <th>الحالة</th>
                <th style={{ width: 80 }}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fs-text-muted)' }}>
                    <Package size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto', display: 'block' }} />
                    لا توجد أصناف مطابقة للبحث.
                  </td>
                </tr>
              ) : sorted.map((product) => { 
                const status = product.currentStockQuantity <= 0 ? 'danger' : product.currentStockQuantity < product.minimumStockQuantity ? 'warning' : 'success'; 
                return (
                  <tr key={product.id} onClick={() => setSelected(product)}>
                    <td>
                      <strong style={{ color: 'var(--fs-navy)' }}>{product.nameAr || product.name}</strong>
                      <small style={{ display: 'block', color: 'var(--fs-text-muted)', fontFamily: 'monospace', marginTop: 4 }}>{product.sku}</small>
                    </td>
                    <td>
                      {product.categoryName ?? '—'}
                      <small style={{ display: 'block', color: 'var(--fs-text-muted)', marginTop: 4 }}>{product.steelType ?? ''}</small>
                    </td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{product.widthMm == null ? '—' : product.widthMm / 10}{product.heightMm == null ? '' : ` × ${product.heightMm / 10}`} cm</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{product.thicknessMm ?? '—'} mm</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{product.lengthM ?? '—'} m</td>
                    <td>{decimal(product.weightPerPieceKg)} كجم</td>
                    <td style={{ fontWeight: 700 }}>{product.currentStockQuantity} {product.unitName}</td>
                    <td>{decimal(product.totalWeightKg)} كجم</td>
                    <td style={{ color: 'var(--fs-blue)', fontWeight: 700 }}>{money(product.sellingPricePerKgCents ?? product.sellingPriceCents)} ج.م</td>
                    <td>
                      <span className={`pos-badge ${status}`}>
                        {status === 'danger' ? 'نفد المخزون' : status === 'warning' ? 'مخزون منخفض' : 'متوفر'}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn" type="button" onClick={(e) => { e.stopPropagation(); edit(product); }}>
                        <Edit3 size={18} />
                      </button>
                    </td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="steel-modal-bg" onMouseDown={() => setSelected(null)}>
          <div className="steel-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="steel-modal-header">
              <div>
                <div className="steel-preview-title" style={{ fontSize: 24 }}>{selected.nameAr || selected.name}</div>
                <div className="steel-muted" style={{ fontSize: 14 }}>{selected.categoryName} • {selected.steelType ?? 'مواصفة عامة'}</div>
              </div>
              <button className="action-btn" type="button" onClick={() => setSelected(null)}>
                <X size={24} />
              </button>
            </div>

            <div className="steel-modal-details">
              <div className="steel-stat"><span>كود الصنف (SKU)</span><strong style={{ fontFamily: 'monospace' }}>{selected.sku}</strong></div>
              <div className="steel-stat"><span>الأبعاد</span><strong dir="ltr">{selected.widthMm == null ? '—' : selected.widthMm / 10} × {selected.heightMm == null ? '—' : selected.heightMm / 10} cm</strong></div>
              <div className="steel-stat"><span>السمك / الطول</span><strong dir="ltr">{selected.thicknessMm ?? '—'} mm / {selected.lengthM ?? '—'} m</strong></div>
              <div className="steel-stat"><span>وزن القطعة</span><strong>{decimal(selected.weightPerPieceKg)} كجم</strong></div>
              <div className="steel-stat"><span>وزن المتر</span><strong>{decimal(selected.weightPerMeterKg)} كجم</strong></div>
              <div className="steel-stat"><span>المخزون الحالي</span><strong style={{ color: 'var(--fs-blue)' }}>{selected.currentStockQuantity} {selected.unitName}</strong></div>
              <div className="steel-stat"><span>الوزن الإجمالي</span><strong>{decimal(selected.totalWeightKg)} كجم</strong></div>
              <div className="steel-stat"><span>سعر البيع بالكيلو</span><strong>{money(selected.sellingPricePerKgCents ?? selected.sellingPriceCents)} ج.م</strong></div>
              <div className="steel-stat"><span>سعر بيع القطعة</span><strong>{selected.sellingPricePerPieceCents == null ? '—' : `${money(selected.sellingPricePerPieceCents)} ج.م`}</strong></div>
              <div className="steel-stat"><span>قيمة المخزون الإجمالية</span><strong style={{ color: 'var(--fs-success-text)' }}>{money(selected.stockValueCents)} ج.م</strong></div>
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 24, borderTop: '1px solid var(--fs-border-soft)' }}>
              <button className="pos-action-btn pos-btn-primary" type="button" onClick={() => edit(selected)}>
                <Edit3 size={18} /> تعديل البيانات
              </button>
              <button className="pos-action-btn pos-btn-secondary" type="button" onClick={() => navigate(`/inventory-adjustments?productId=${selected.id}`)}>
                تعديل الرصيد والمخزون
              </button>
              <button className="pos-action-btn" style={{ background: '#fff', color: 'var(--fs-danger-text)', border: '1px solid #fecaca', marginRight: 'auto' }} type="button" onClick={() => navigate(`/inventory/products/${selected.id}`, { state: { product: selected } })}>
                <Archive size={18} /> تفاصيل أكثر
              </button>
            </div>
          </div>
        </div>
      )}

      {stocktakingReport && <InventoryStocktakingReportView report={stocktakingReport} onClose={() => setStocktakingReport(null)} />}
    </section>
  );
}
