import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CatalogCategory, CatalogProduct, CatalogUnit } from '../../shared/catalog';
import type { LowStockProduct } from '../../shared/inventory-alerts';
import { useI18n } from '../i18n';

const emptyProduct = {
  sku: '',
  name: '',
  nameAr: '',
  barcode: '',
  description: '',
  categoryId: null as number | null,
  unitId: 0,
  defaultSupplierId: null as number | null,
  purchasePriceCents: 0,
  sellingPriceCents: 0,
  minimumStockQuantity: 0,
};

const emptyCategory = {
  name: '',
  nameAr: '',
  description: '',
};

export function CatalogPage() {
  const { t } = useI18n();
  const [units, setUnits] = useState<CatalogUnit[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState(emptyProduct);
  const [pendingCategory, setPendingCategory] = useState(emptyCategory);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  useEffect(() => {
    void loadCatalog();
  }, []);

  async function loadCatalog() {
    const [unitList, categoryList, productList, lowStockList] = await Promise.all([
      window.api.catalog.listUnits(),
      window.api.catalog.listCategories(),
      window.api.catalog.listProducts(search),
      window.api.catalog.listLowStock(),
    ]);
    setUnits(unitList as CatalogUnit[]);
    setCategories(categoryList as CatalogCategory[]);
    setProducts(productList as CatalogProduct[]);
    setLowStock(lowStockList as LowStockProduct[]);
  }

  const sortedProducts = useMemo(
    () => [...products].sort((lhs, rhs) => lhs.name.localeCompare(rhs.name)),
    [products],
  );

  async function handleSearch(event: React.ChangeEvent<HTMLInputElement>) {
    const nextSearch = event.target.value;
    setSearch(nextSearch);
    const productList = await window.api.catalog.listProducts(nextSearch);
    setProducts(productList as CatalogProduct[]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const payload = {
        ...pending,
        barcode: pending.barcode || null,
        description: pending.description || null,
      };
      if (editingProductId === null) {
        await window.api.catalog.createProduct(payload);
      } else {
        await window.api.catalog.updateProduct(editingProductId, payload);
      }
      setPending(emptyProduct);
      setEditingProductId(null);
      setShowProductForm(false);
      await loadCatalog();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save product.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive(productId: number) {
    try {
      await window.api.catalog.archiveProduct(productId);
      await loadCatalog();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive product.');
    }
  }

  async function handleCategorySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      if (editingCategoryId === null) {
        await window.api.catalog.createCategory({ ...pendingCategory, description: pendingCategory.description || null });
      } else {
        await window.api.catalog.updateCategory(editingCategoryId, { ...pendingCategory, description: pendingCategory.description || null });
      }
      setPendingCategory(emptyCategory);
      setEditingCategoryId(null);
      setShowCategoryForm(false);
      await loadCatalog();
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : 'Unable to save category.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveCategory(categoryId: number) {
    try {
      await window.api.catalog.archiveCategory(categoryId);
      await loadCatalog();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive category.');
    }
  }

  function handleEditCategory(category: CatalogCategory) {
    setEditingCategoryId(category.id);
    setPendingCategory({ name: category.name, nameAr: category.nameAr, description: category.description ?? '' });
    setShowCategoryForm(true);
    setError('');
  }

  function handleEdit(product: CatalogProduct) {
    setEditingProductId(product.id);
    setPending({
      sku: product.sku,
      name: product.name,
      nameAr: product.nameAr,
      barcode: product.barcode ?? '',
      description: product.description ?? '',
      categoryId: product.categoryId,
      unitId: product.unitId,
      defaultSupplierId: product.defaultSupplierId,
      purchasePriceCents: product.purchasePriceCents,
      sellingPriceCents: product.sellingPriceCents,
      minimumStockQuantity: product.minimumStockQuantity,
    });
    setShowProductForm(true);
    setError('');
  }

  function handleCancelEdit() {
    setEditingProductId(null);
    setPending(emptyProduct);
    setShowProductForm(false);
    setError('');
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div className="page-title">
          <h1>المخزون</h1>
          <p className="subtitle">{products.length} صنف مسجل</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="fs-btn-secondary" type="button" onClick={() => setShowCategoryForm(!showCategoryForm)}>
            {showCategoryForm ? 'إلغاء' : '+ إضافة فئة'}
          </button>
          <button className="fs-btn-primary" type="button" onClick={() => setShowProductForm(!showProductForm)}>
            <Plus size={18} /> {showProductForm ? 'إلغاء' : 'إضافة صنف'}
          </button>
        </div>
      </div>

      {showCategoryForm && (
        <form className="panel-form" onSubmit={handleCategorySubmit} style={{ marginBottom: 32 }}>
          <h3 style={{ marginTop: 0, marginBottom: 20 }}>{editingCategoryId ? 'تعديل فئة' : 'فئة جديدة'}</h3>
          <div className="form-grid">
            <label>اسم الفئة (English)<input className="fs-input" value={pendingCategory.name} onChange={(event) => setPendingCategory({ ...pendingCategory, name: event.target.value })} /></label>
            <label>اسم الفئة (عربي)<input className="fs-input" value={pendingCategory.nameAr} onChange={(event) => setPendingCategory({ ...pendingCategory, nameAr: event.target.value })} /></label>
            <label className="full-width">الوصف<textarea className="fs-input" rows={2} value={pendingCategory.description} onChange={(event) => setPendingCategory({ ...pendingCategory, description: event.target.value })} /></label>
          </div>
          {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}
          <button className="fs-btn-primary" type="submit" disabled={isSaving} style={{ marginTop: 24 }}>{isSaving ? 'جاري الحفظ...' : editingCategoryId === null ? 'إنشاء فئة' : 'حفظ الفئة'}</button>
        </form>
      )}

      {showProductForm && (
        <form className="panel-form" onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
          <h3 style={{ marginTop: 0, marginBottom: 20 }}>{editingProductId ? 'تعديل صنف' : 'صنف جديد'}</h3>
          <div className="form-grid">
            <label>رقم الصنف (SKU)<input className="fs-input" value={pending.sku} onChange={(event) => setPending({ ...pending, sku: event.target.value })} /></label>
            <label>الباركود<input className="fs-input" value={pending.barcode} onChange={(event) => setPending({ ...pending, barcode: event.target.value })} /></label>
            <label>الاسم (English)<input className="fs-input" value={pending.name} onChange={(event) => setPending({ ...pending, name: event.target.value })} /></label>
            <label>الاسم (عربي)<input className="fs-input" value={pending.nameAr} onChange={(event) => setPending({ ...pending, nameAr: event.target.value })} /></label>
            <label>الفئة<select className="fs-select" value={pending.categoryId ?? ''} onChange={(event) => setPending({ ...pending, categoryId: Number(event.target.value) || null })}>
              <option value="">-- اختر الفئة --</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.nameAr || category.name}</option>)}
            </select></label>
            <label>الوحدة<select className="fs-select" value={pending.unitId} onChange={(event) => setPending({ ...pending, unitId: Number(event.target.value) })}>
              <option value={0}>-- اختر الوحدة --</option>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.nameAr || unit.name}</option>)}
            </select></label>
            <label>سعر الشراء<input className="fs-input" type="number" min={0} value={pending.purchasePriceCents} onChange={(event) => setPending({ ...pending, purchasePriceCents: Number(event.target.value) })} /></label>
            <label>سعر البيع<input className="fs-input" type="number" min={0} value={pending.sellingPriceCents} onChange={(event) => setPending({ ...pending, sellingPriceCents: Number(event.target.value) })} /></label>
            <label>الحد الأدنى للمخزون<input className="fs-input" type="number" min={0} step="0.01" value={pending.minimumStockQuantity} onChange={(event) => setPending({ ...pending, minimumStockQuantity: Number(event.target.value) })} /></label>
            <label className="full-width">الوصف<textarea className="fs-input" rows={2} value={pending.description} onChange={(event) => setPending({ ...pending, description: event.target.value })} /></label>
          </div>
          {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="fs-btn-primary" type="submit" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : editingProductId === null ? 'إنشاء الصنف' : 'حفظ الصنف'}</button>
            {editingProductId !== null && <button className="fs-btn-secondary" type="button" onClick={handleCancelEdit}>إلغاء التعديل</button>}
          </div>
        </form>
      )}

      {lowStock.length > 0 && (
        <div className="fs-table-container" style={{ marginBottom: 32, border: '1px solid #fecaca' }}>
          <div className="table-toolbar" style={{ backgroundColor: '#fef2f2' }}>
            <strong style={{ color: '#b91c1c' }}>تنبيهات نقص المخزون</strong>
          </div>
          <table>
            <thead><tr><th>SKU</th><th>المنتج</th><th>المخزون الحالي</th><th>الحد الأدنى</th><th>النقص</th></tr></thead>
            <tbody>
              {lowStock.map((product) => (
                <tr key={product.id}>
                  <td>{product.sku}</td>
                  <td>{product.name}</td>
                  <td>{product.currentStockQuantity} {product.unitName}</td>
                  <td>{product.minimumStockQuantity} {product.unitName}</td>
                  <td><span style={{ color: '#b91c1c', fontWeight: 'bold' }}>{product.shortageQuantity} {product.unitName}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="fs-table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-filters">
            <select className="fs-select" style={{ width: 150 }}>
              <option value="">الفئة: الكل</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr || c.name}</option>)}
            </select>
          </div>
          <input className="fs-input" style={{ maxWidth: 300 }} value={search} onChange={handleSearch} placeholder="ابحث عن منتج أو مقاس..." />
        </div>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>الصنف</th>
              <th>الوحدة</th>
              <th>السعر</th>
              <th>الكمية</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا توجد أصناف</td></tr>
            ) : sortedProducts.map((product) => {
              const isLowStock = product.currentStockQuantity < product.minimumStockQuantity;
              return (
                <tr key={product.id}>
                  <td>{product.sku}</td>
                  <td style={{ fontWeight: 600 }}>{product.nameAr || product.name}</td>
                  <td>{product.unitName}</td>
                  <td>{(product.sellingPriceCents / 100).toLocaleString('en-US')} ج.م</td>
                  <td style={{ fontWeight: 700 }}>{product.currentStockQuantity}</td>
                  <td>
                    {isLowStock 
                      ? <span className="fs-badge warning">منخفض</span>
                      : <span className="fs-badge success">متوفر</span>
                    }
                  </td>
                  <td>
                    <button type="button" className="quiet-button" onClick={() => handleEdit(product)}>تعديل</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
