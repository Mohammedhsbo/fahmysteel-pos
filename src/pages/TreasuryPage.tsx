import { useEffect, useMemo, useState } from 'react';
import type { PayableRecord, ReceivableRecord } from '../../shared/balances';
import type { ExpenseRecord, TreasuryTransaction } from '../../shared/treasury';
import { useI18n } from '../i18n';

export function TreasuryPage() {
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRecord[]>([]);
  const [payables, setPayables] = useState<PayableRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [category, setCategory] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [paymentMethodId, setPaymentMethodId] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [partyId, setPartyId] = useState(0);
  const [invoiceId, setInvoiceId] = useState(0);
  const [paymentAmountCents, setPaymentAmountCents] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);

  useEffect(() => {
    void Promise.all([loadTransactions(), loadPaymentMethods(), loadBalances()]);
  }, []);

  async function loadTransactions() {
    const results = await window.api.treasury.listTransactions();
    setTransactions(results);
  }

  async function loadPaymentMethods() {
    const methods = await window.api.treasury.listPaymentMethods();
    setPaymentMethods(methods);
    if (methods[0]) setPaymentMethodId(methods[0].id);
  }

  async function loadBalances() {
    const [receivableRows, payableRows] = await Promise.all([
      window.api.balances.listReceivables(),
      window.api.balances.listPayables(),
    ]);
    setReceivables(receivableRows);
    setPayables(payableRows);
  }

  const totalOut = useMemo(() => transactions.filter((entry) => entry.direction === 'OUT').reduce((sum, entry) => sum + entry.amountCents, 0), [transactions]);
  const totalIn = useMemo(() => transactions.filter((entry) => entry.direction === 'IN').reduce((sum, entry) => sum + entry.amountCents, 0), [transactions]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await window.api.treasury.createExpense({
        category,
        amountCents,
        paymentMethodId,
        description: description || null,
      });
      setCategory('');
      setAmountCents(0);
      setDescription('');
      await loadTransactions();
      await loadBalances();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save expense.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPaymentSaving(true);
    try {
      await window.api.payments.createPayment({
        partyType,
        partyId,
        invoiceId,
        amountCents: paymentAmountCents,
        paymentMethodId,
        description: description || null,
      });
      setPartyId(0);
      setInvoiceId(0);
      setPaymentAmountCents(0);
      setDescription('');
      await loadTransactions();
      await loadBalances();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Unable to record payment.');
    } finally {
      setPaymentSaving(false);
    }
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Treasury</p>
          <h1>{t('treasury')}</h1>
          <p className="heading-copy">Track offline treasury movement and expense entries.</p>
        </div>
      </div>

      <form className="panel-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} /></label>
          <label>Amount (cents)<input type="number" min={1} value={amountCents} onChange={(event) => setAmountCents(Number(event.target.value) || 0)} /></label>
          <label>Payment method<select value={paymentMethodId} onChange={(event) => setPaymentMethodId(Number(event.target.value))}>
            {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
          </select></label>
          <label className="full-width">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" type="submit" disabled={saving}>{saving ? 'Recording expense...' : 'Record expense'}</button>
      </form>

      <form className="panel-form" onSubmit={handlePaymentSubmit}>
        <div className="form-grid">
          <label>Payment type<select value={partyType} onChange={(event) => setPartyType(event.target.value as 'CUSTOMER' | 'SUPPLIER')}>
            <option value="CUSTOMER">Customer payment received</option>
            <option value="SUPPLIER">Supplier payment sent</option>
          </select></label>
          <label>Party ID<input type="number" min={1} value={partyId || ''} onChange={(event) => setPartyId(Number(event.target.value) || 0)} /></label>
          <label>Invoice ID<input type="number" min={1} value={invoiceId || ''} onChange={(event) => setInvoiceId(Number(event.target.value) || 0)} /></label>
          <label>Amount (cents)<input type="number" min={1} value={paymentAmountCents || ''} onChange={(event) => setPaymentAmountCents(Number(event.target.value) || 0)} /></label>
          <label>Payment method<select value={paymentMethodId} onChange={(event) => setPaymentMethodId(Number(event.target.value))}>
            {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
          </select></label>
          <label className="full-width">Payment description<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" type="submit" disabled={paymentSaving}>{paymentSaving ? 'Recording payment...' : 'Record payment'}</button>
      </form>

      <div className="metric-grid" style={{ marginTop: 20 }}>
        <article className="metric-card"><div className="metric-icon">IN</div><div><p>Cash in</p><strong>{totalIn}</strong><span>Recorded inflow</span></div></article>
        <article className="metric-card"><div className="metric-icon">OUT</div><div><p>Cash out</p><strong>{totalOut}</strong><span>Recorded expenses</span></div></article>
      </div>

      <div className="table-panel">
        <div className="table-toolbar"><strong>Recent treasury flow</strong></div>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Direction</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.transactionType}</td>
                <td>{transaction.direction}</td>
                <td>{transaction.amountCents}</td>
                <td>{transaction.paymentMethodName}</td>
                <td>{transaction.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-panel">
        <div className="table-toolbar"><strong>Customer receivables</strong></div>
        <table>
          <thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Outstanding</th></tr></thead>
          <tbody>
            {receivables.length === 0 ? <tr><td colSpan={5}>No outstanding customer balances.</td></tr> : receivables.map((entry) => (
              <tr key={entry.invoiceId}>
                <td>{entry.invoiceNumber}</td>
                <td>{entry.customerName}</td>
                <td>{entry.totalCents}</td>
                <td>{entry.paidCents}</td>
                <td>{entry.outstandingCents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-panel">
        <div className="table-toolbar"><strong>Supplier payables</strong></div>
        <table>
          <thead><tr><th>Invoice</th><th>Supplier</th><th>Total</th><th>Paid</th><th>Outstanding</th></tr></thead>
          <tbody>
            {payables.length === 0 ? <tr><td colSpan={5}>No outstanding supplier balances.</td></tr> : payables.map((entry) => (
              <tr key={entry.invoiceId}>
                <td>{entry.invoiceNumber}</td>
                <td>{entry.supplierName}</td>
                <td>{entry.totalCents}</td>
                <td>{entry.paidCents}</td>
                <td>{entry.outstandingCents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
