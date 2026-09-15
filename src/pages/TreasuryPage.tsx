import { useEffect, useMemo, useState } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import type { PayableRecord, ReceivableRecord } from '../../shared/balances';
import type { CustomerRecord, SupplierRecord } from '../../shared/contacts';
import type { PurchaseInvoice } from '../../shared/purchases';
import type { SalesInvoice } from '../../shared/sales';
import type { ExpenseRecord, TreasuryTransaction } from '../../shared/treasury';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

function formatMoney(amountCents: number): string {
  return `${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

export function TreasuryPage() {
  const { t } = useI18n();
  const { showError } = useToast();
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRecord[]>([]);
  const [payables, setPayables] = useState<PayableRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
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
  
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    void Promise.all([loadTransactions(), loadPaymentMethods(), loadBalances(), loadPartiesAndInvoices()]);
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

  async function loadPartiesAndInvoices() {
    const [customerRows, supplierRows, salesInvoiceRows, purchaseInvoiceRows] = await Promise.all([
      window.api.customers.listCustomers(),
      window.api.suppliers.listSuppliers(),
      window.api.sales.listSalesInvoices(),
      window.api.purchases.listPurchaseInvoices(),
    ]);
    setCustomers(customerRows);
    setSuppliers(supplierRows);
    setSalesInvoices(salesInvoiceRows);
    setPurchaseInvoices(purchaseInvoiceRows);
  }

  const partyOptions = partyType === 'CUSTOMER' ? customers : suppliers;
  const invoiceOptions = partyType === 'CUSTOMER'
    ? salesInvoices.filter((invoice) => invoice.customerId === partyId)
    : purchaseInvoices.filter((invoice) => invoice.supplierId === partyId);

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
      setShowExpenseForm(false);
      await loadTransactions();
      await loadBalances();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to save expense.';
      setError(message);
      showError(message, 'Unable to save expense.');
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
      setShowPaymentForm(false);
      await loadTransactions();
      await loadBalances();
    } catch (paymentError) {
      const message = paymentError instanceof Error ? paymentError.message : 'Unable to record payment.';
      setError(message);
      showError(message, 'Unable to record payment.');
    } finally {
      setPaymentSaving(false);
    }
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div className="page-title">
          <h1>الخزنة</h1>
          <p className="subtitle">متابعة حركة النقدية والمصروفات</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="fs-btn-secondary" type="button" onClick={() => setShowPaymentForm(!showPaymentForm)}>
            {showPaymentForm ? 'إلغاء' : '+ تسجيل دفعة'}
          </button>
          <button className="fs-btn-primary" type="button" onClick={() => setShowExpenseForm(!showExpenseForm)}>
            <Plus size={18} /> {showExpenseForm ? 'إلغاء' : 'تسجيل مصروف'}
          </button>
        </div>
      </div>

      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <article className="metric-card">
          <div className="metric-card-header">
            <p>إجمالي الوارد (IN)</p>
            <div className="metric-icon green"><ArrowDownCircle size={20} /></div>
          </div>
          <div>
            <h2>{formatMoney(totalIn)}</h2>
            <span>تدفقات نقدية مسجلة</span>
          </div>
        </article>
        
        <article className="metric-card">
          <div className="metric-card-header">
            <p>إجمالي الصادر (OUT)</p>
            <div className="metric-icon" style={{ color: '#ef4444', backgroundColor: '#fef2f2' }}><ArrowUpCircle size={20} /></div>
          </div>
          <div>
            <h2>{formatMoney(totalOut)}</h2>
            <span>مصروفات ومدفوعات مسجلة</span>
          </div>
        </article>
      </div>

      {showExpenseForm && (
        <form className="panel-form" onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
          <h3 style={{ marginTop: 0, marginBottom: 20 }}>تسجيل مصروف جديد</h3>
          <div className="form-grid">
            <label>البند / التصنيف<input className="fs-input" value={category} onChange={(event) => setCategory(event.target.value)} required /></label>
            <label>المبلغ<input className="fs-input" type="number" min={1} value={amountCents} onChange={(event) => setAmountCents(Number(event.target.value) || 0)} required /></label>
            <label>طريقة الدفع<select className="fs-select" value={paymentMethodId} onChange={(event) => setPaymentMethodId(Number(event.target.value))}>
              {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
            </select></label>
            <label className="full-width">البيان / الوصف<textarea className="fs-input" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          </div>
          {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}
          <button className="fs-btn-primary" type="submit" disabled={saving} style={{ marginTop: 24 }}>{saving ? 'جاري الحفظ...' : 'حفظ المصروف'}</button>
        </form>
      )}

      {showPaymentForm && (
        <form className="panel-form" onSubmit={handlePaymentSubmit} style={{ marginBottom: 32 }}>
          <h3 style={{ marginTop: 0, marginBottom: 20 }}>تسجيل دفعة (سداد/تحصيل)</h3>
          <div className="form-grid">
            <label>نوع الدفعة<select className="fs-select" value={partyType} onChange={(event) => setPartyType(event.target.value as 'CUSTOMER' | 'SUPPLIER')}>
              <option value="CUSTOMER">تحصيل من عميل</option>
              <option value="SUPPLIER">سداد لمورد</option>
            </select></label>
            <label>الحساب<select className="fs-select" value={partyId || ''} onChange={(event) => { setPartyId(Number(event.target.value) || 0); setInvoiceId(0); }} required>
              <option value="">-- اختر الحساب --</option>
              {partyOptions.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
            </select></label>
            <label>الفاتورة (اختياري)<select className="fs-select" value={invoiceId || ''} onChange={(event) => setInvoiceId(Number(event.target.value) || 0)}>
              <option value="">بدون فاتورة</option>
              {invoiceOptions.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} - {partyType === 'CUSTOMER' ? (invoice as SalesInvoice).customerName : (invoice as PurchaseInvoice).supplierName}</option>)}
            </select></label>
            <label>المبلغ<input className="fs-input" type="number" min={1} value={paymentAmountCents || ''} onChange={(event) => setPaymentAmountCents(Number(event.target.value) || 0)} required /></label>
            <label>طريقة الدفع<select className="fs-select" value={paymentMethodId} onChange={(event) => setPaymentMethodId(Number(event.target.value))}>
              {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
            </select></label>
            <label className="full-width">البيان / الوصف<textarea className="fs-input" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          </div>
          {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}
          <button className="fs-btn-primary" type="submit" disabled={paymentSaving} style={{ marginTop: 24 }}>{paymentSaving ? 'جاري الحفظ...' : 'حفظ الدفعة'}</button>
        </form>
      )}

      <div className="fs-table-container" style={{ marginBottom: 32 }}>
        <div className="table-toolbar"><strong>حركة الخزنة الأخيرة</strong></div>
        <table>
          <thead>
            <tr>
              <th>النوع</th>
              <th>الاتجاه</th>
              <th>المبلغ</th>
              <th>طريقة الدفع</th>
              <th>البيان</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا توجد حركات مسجلة</td></tr>
            ) : transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.transactionType}</td>
                <td>{transaction.direction === 'IN' ? <span className="fs-badge success">وارد</span> : <span className="fs-badge danger">صادر</span>}</td>
                <td style={{ fontWeight: 700 }}>{formatMoney(transaction.amountCents)}</td>
                <td>{transaction.paymentMethodName}</td>
                <td>{transaction.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="fs-table-container">
          <div className="table-toolbar"><strong>مديونيات العملاء (أرصدة مستحقة لنا)</strong></div>
          <table>
            <thead><tr><th>الفاتورة</th><th>العميل</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
            <tbody>
              {receivables.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#7a8691', padding: '20px 0' }}>لا توجد مديونيات على العملاء</td></tr> : receivables.map((entry) => (
                <tr key={entry.invoiceId}>
                  <td>{entry.invoiceNumber}</td>
                  <td>{entry.customerName}</td>
                  <td>{formatMoney(entry.totalCents)}</td>
                  <td>{formatMoney(entry.paidCents)}</td>
                  <td style={{ color: '#b91c1c', fontWeight: 'bold' }}>{formatMoney(entry.outstandingCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="fs-table-container">
          <div className="table-toolbar"><strong>مديونيات الموردين (أرصدة مستحقة علينا)</strong></div>
          <table>
            <thead><tr><th>الفاتورة</th><th>المورد</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
            <tbody>
              {payables.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#7a8691', padding: '20px 0' }}>لا توجد مستحقات للموردين</td></tr> : payables.map((entry) => (
                <tr key={entry.invoiceId}>
                  <td>{entry.invoiceNumber}</td>
                  <td>{entry.supplierName}</td>
                  <td>{formatMoney(entry.totalCents)}</td>
                  <td>{formatMoney(entry.paidCents)}</td>
                  <td style={{ color: '#b91c1c', fontWeight: 'bold' }}>{formatMoney(entry.outstandingCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
