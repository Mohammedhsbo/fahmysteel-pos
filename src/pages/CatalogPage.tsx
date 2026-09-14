import { useEffect, useMemo, useState } from 'react';
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
    setError('');
  }

  function handleCancelEdit() {
    setEditingProductId(null);
    setPending(emptyProduct);
    setError('');
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Phase 4</p>
          <h1>{t('inventory')}</h1>
          <p className="heading-copy">Units, categories, and products are managed through the Electron Main process.</p>
        </div>
      </div>

      <form className="panel-form" onSubmit={handleCategorySubmit}>
        <div className="form-grid">
          <label>Category name<input value={pendingCategory.name} onChange={(event) => setPendingCategory({ ...pendingCategory, name: event.target.value })} /></label>
          <label>Arabic name<input value={pendingCategory.nameAr} onChange={(event) => setPendingCategory({ ...pendingCategory, nameAr: event.target.value })} /></label>
          <label className="full-width">Description<textarea value={pendingCategory.description} onChange={(event) => setPendingCategory({ ...pendingCategory, description: event.target.value })} /></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingCategoryId === null ? 'Create category' : 'Save category'}</button>
      </form>

      <div className="table-panel">
        <div className="table-toolbar"><strong>Categories</strong></div>
        <table>
          <thead><tr><th>Name</th><th>Arabic name</th><th>Description</th><th>Action</th></tr></thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{category.nameAr}</td>
                <td>{category.description ?? '—'}</td>
                <td><button type="button" className="tiny-button" onClick={() => handleEditCategory(category)}>Edit</button> <button type="button" className="tiny-button" onClick={() => void handleArchiveCategory(category.id)}>Archive</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-panel">
        <div className="table-toolbar"><strong>Low-stock alerts</strong></div>
        <table>
          <thead><tr><th>SKU</th><th>Product</th><th>Current stock</th><th>Minimum</th><th>Shortage</th></tr></thead>
          <tbody>
            {lowStock.length === 0 ? <tr><td colSpan={5}>No low-stock products.</td></tr> : lowStock.map((product) => (
              <tr key={product.id}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>{product.currentStockQuantity} {product.unitName}</td>
                <td>{product.minimumStockQuantity} {product.unitName}</td>
                <td>{product.shortageQuantity} {product.unitName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="panel-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>SKU<input value={pending.sku} onChange={(event) => setPending({ ...pending, sku: event.target.value })} /></label>
          <label>Barcode<input value={pending.barcode} onChange={(event) => setPending({ ...pending, barcode: event.target.value })} /></label>
          <label>English name<input value={pending.name} onChange={(event) => setPending({ ...pending, name: event.target.value })} /></label>
          <label>Arabic name<input value={pending.nameAr} onChange={(event) => setPending({ ...pending, nameAr: event.target.value })} /></label>
          <label>Category<select value={pending.categoryId ?? ''} onChange={(event) => setPending({ ...pending, categoryId: Number(event.target.value) || null })}>
            <option value="">-- Select category --</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select></label>
          <label>Unit<select value={pending.unitId} onChange={(event) => setPending({ ...pending, unitId: Number(event.target.value) })}>
            <option value={0}>-- Select unit --</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select></label>
          <label>Purchase price<input type="number" min={0} value={pending.purchasePriceCents} onChange={(event) => setPending({ ...pending, purchasePriceCents: Number(event.target.value) })} /></label>
          <label>Selling price<input type="number" min={0} value={pending.sellingPriceCents} onChange={(event) => setPending({ ...pending, sellingPriceCents: Number(event.target.value) })} /></label>
          <label>Minimum stock<input type="number" min={0} step="0.01" value={pending.minimumStockQuantity} onChange={(event) => setPending({ ...pending, minimumStockQuantity: Number(event.target.value) })} /></label>
          <label className="full-width">Description<textarea value={pending.description} onChange={(event) => setPending({ ...pending, description: event.target.value })} /></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingProductId === null ? 'Create product' : 'Save product'}</button>
        {editingProductId !== null && <button className="tiny-button" type="button" onClick={handleCancelEdit}>Cancel edit</button>}
      </form>

      <div className="table-panel">
        <div className="table-toolbar">
          <strong>Products</strong>
          <input value={search} onChange={handleSearch} placeholder="Search products" />
        </div>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Unit</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((product) => (
              <tr key={product.id}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>{product.unitName}</td>
                <td>{product.currentStockQuantity}</td>
                <td>{product.sellingPriceCents}</td>
                <td>
                  <button type="button" className="tiny-button" onClick={() => handleEdit(product)}>Edit</button>
                  <button type="button" className="tiny-button" onClick={() => void handleArchive(product.id)}>Archive</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
