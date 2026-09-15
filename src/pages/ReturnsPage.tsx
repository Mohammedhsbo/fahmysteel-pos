import { useEffect, useMemo, useState } from 'react';
import type { CustomerRecord } from '../../shared/contacts';
import type { SalesReturnRecord } from '../../shared/returns';
import type { SalesInvoice } from '../../shared/sales';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

export function ReturnsPage() {
  const { t } = useI18n();
  const { showError } = useToast();
  const [returns, setReturns] = useState<SalesReturnRecord[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
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

  async function loadFormOptions() {
    const [invoiceRows, customerRows] = await Promise.all([
      window.api.sales.listSalesInvoices(),
      window.api.customers.listCustomers(),
    ]);
    setInvoices(invoiceRows);
    setCustomers(customerRows);
  }

  useEffect(() => {
    void Promise.all([loadReturns(), loadFormOptions()]);
  }, []);

  const selectedInvoice = invoices.find((invoice) => invoice.id === Number(invoiceId));

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
      await loadFormOptions();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to create sales return.';
      setError(message);
      showError(message, 'Unable to create sales return.');
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
          <label>Original invoice<select className="fs-select" value={invoiceId} onChange={(event) => { setInvoiceId(event.target.value); setOriginalItemId(''); }} required>
            <option value="">-- Select invoice --</option>
            {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} - {invoice.customerName ?? 'Cash customer'}</option>)}
          </select></label>
          <label>Customer<select className="fs-select" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">Cash customer</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </select></label>
          <label>Original item<select className="fs-select" value={originalItemId} onChange={(event) => setOriginalItemId(event.target.value)} required disabled={!selectedInvoice}>
            <option value="">-- Select item --</option>
            {selectedInvoice?.items.map((item) => <option key={item.id} value={item.id}>{item.productName} ({item.quantity})</option>)}
          </select></label>
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
