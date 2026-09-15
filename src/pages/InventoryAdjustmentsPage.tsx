import { useEffect, useState } from 'react';
import type { CatalogProduct } from '../../shared/catalog';
import type { InventoryAdjustmentRecord } from '../../shared/inventory';
import { useI18n } from '../i18n';

export function InventoryAdjustmentsPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustmentRecord[]>([]);
  const [productId, setProductId] = useState('');
  const [quantityDelta, setQuantityDelta] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to adjust stock.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Inventory control</p>
          <h1>{t('stockAdjustments')}</h1>
          <p className="heading-copy">Correct physical counts with a reasoned, local inventory movement.</p>
        </div>
      </div>

      <form className="panel-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Product<select className="fs-select" value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">Select product</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.currentStockQuantity})</option>)}
          </select></label>
          <label>Quantity change<input className="fs-input" type="number" step="0.01" value={quantityDelta} onChange={(event) => setQuantityDelta(event.target.value)} placeholder="Positive or negative" /></label>
          <label className="full-width">Reason<textarea className="fs-input" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="fs-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Apply adjustment'}</button>
      </form>

      <div className="fs-table-container">
        <div className="table-toolbar"><strong>Adjustment history</strong></div>
        <table>
          <thead><tr><th>Product</th><th>Change</th><th>Reason</th><th>Created by</th><th>Created</th></tr></thead>
          <tbody>
            {adjustments.map((adjustment) => (
              <tr key={adjustment.id}>
                <td>{adjustment.productName}</td>
                <td>{adjustment.quantityDelta > 0 ? '+' : ''}{adjustment.quantityDelta}</td>
                <td>{adjustment.reason}</td>
                <td>{adjustment.createdByName}</td>
                <td>{adjustment.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
