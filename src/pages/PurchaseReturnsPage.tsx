import { useEffect, useMemo, useState } from 'react';
import type { PurchaseReturnRecord } from '../../shared/purchase-returns';
import { useI18n } from '../i18n';

export function PurchaseReturnsPage() {
  const { t } = useI18n();
  const [returns, setReturns] = useState<PurchaseReturnRecord[]>([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [originalItemId, setOriginalItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [refund, setRefund] = useState('0');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadReturns() {
    setReturns(await window.api.purchaseReturns.listPurchaseReturns());
  }

  useEffect(() => {
    void loadReturns();
  }, []);

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
      await loadReturns();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create purchase return.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Procurement</p>
          <h1>{t('purchaseReturns')}</h1>
          <p className="heading-copy">Return supplier goods and reduce local stock with an auditable inventory movement.</p>
        </div>
      </div>

      <form className="panel-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Original invoice ID<input type="number" min="1" value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} /></label>
          <label>Supplier ID<input type="number" min="1" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} /></label>
          <label>Original item ID<input type="number" min="1" value={originalItemId} onChange={(event) => setOriginalItemId(event.target.value)} /></label>
          <label>Quantity<input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label>Refund amount (EGP)<input type="number" min="0" step="0.01" value={refund} onChange={(event) => setRefund(event.target.value)} /></label>
          <label className="full-width">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create purchase return'}</button>
      </form>

      <div className="table-panel">
        <div className="table-toolbar"><strong>Supplier returns</strong></div>
        <table>
          <thead><tr><th>Return #</th><th>Invoice</th><th>Supplier</th><th>Created by</th><th>Refund</th><th>Returned</th></tr></thead>
          <tbody>
            {sortedReturns.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.returnNumber}</td>
                <td>{entry.originalInvoiceId}</td>
                <td>{entry.supplierName ?? '—'}</td>
                <td>{entry.createdByName}</td>
                <td>{(entry.refundCents / 100).toFixed(2)} EGP</td>
                <td>{entry.returnedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
