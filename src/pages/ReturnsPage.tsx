import { useEffect, useMemo, useState } from 'react';
import type { SalesReturnRecord } from '../../shared/returns';
import { useI18n } from '../i18n';

export function ReturnsPage() {
  const { t } = useI18n();
  const [returns, setReturns] = useState<SalesReturnRecord[]>([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [reason, setReason] = useState('');
  const [originalItemId, setOriginalItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [refundCents, setRefundCents] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadReturns() {
    const records = await window.api.returns.listSalesReturns();
    setReturns(records);
  }

  useEffect(() => {
    void loadReturns();
  }, []);

  const sortedReturns = useMemo(
    () => [...returns].sort((lhs, rhs) => rhs.returnedAt.localeCompare(lhs.returnedAt)),
    [returns],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await window.api.returns.createSalesReturn({
        originalInvoiceId: Number(invoiceId),
        customerId: customerId ? Number(customerId) : null,
        reason: reason || null,
        items: [
          {
            originalItemId: Number(originalItemId),
            quantity: Number(quantity),
            refundCents: Number(refundCents) * 100,
          },
        ],
      });

      setInvoiceId('');
      setCustomerId('');
      setReason('');
      setOriginalItemId('');
      setQuantity('1');
      setRefundCents('0');
      await loadReturns();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create sales return.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sales</p>
          <h1>{t('returns')}</h1>
          <p className="heading-copy">Create offline sales returns and restock products back into inventory.</p>
        </div>
      </div>

      <form className="panel-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Original invoice ID<input className="fs-input" type="number" value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} /></label>
          <label>Customer ID<input className="fs-input" type="number" value={customerId} onChange={(event) => setCustomerId(event.target.value)} /></label>
          <label>Original item ID<input className="fs-input" type="number" value={originalItemId} onChange={(event) => setOriginalItemId(event.target.value)} /></label>
          <label>Quantity<input className="fs-input" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label>Refund amount (EGP)<input className="fs-input" type="number" min="0" step="0.01" value={refundCents} onChange={(event) => setRefundCents(event.target.value)} /></label>
          <label className="full-width">Reason<textarea className="fs-input" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="fs-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create return'}</button>
      </form>

      <div className="fs-table-container">
        <div className="table-toolbar"><strong>Sales returns</strong></div>
        <table>
          <thead>
            <tr>
              <th>Return #</th>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Created by</th>
              <th>Refund</th>
              <th>Returned</th>
            </tr>
          </thead>
          <tbody>
            {sortedReturns.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.returnNumber}</td>
                <td>{entry.originalInvoiceId}</td>
                <td>{entry.customerName ?? '—'}</td>
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
