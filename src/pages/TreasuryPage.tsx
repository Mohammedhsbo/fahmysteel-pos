import { useEffect, useMemo, useState } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle, Wallet, Receipt, CreditCard, Users, Store, Banknote, ListPlus, Activity } from 'lucide-react';
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
  const { showError, showSuccess } = useToast();
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
        amountCents: amountCents * 100, // Handle inputs as pounds -> store as cents
        paymentMethodId,
        description: description || null,
      });
      setCategory('');
      setAmountCents(0);
      setDescription('');
      setShowExpenseForm(false);
      showSuccess('تم تسجيل المصروف بنجاح');
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
        amountCents: paymentAmountCents * 100, // Handle inputs as pounds -> store as cents
        paymentMethodId,
        description: description || null,
      });
      setPartyId(0);
      setInvoiceId(0);
      setPaymentAmountCents(0);
      setDescription('');
      setShowPaymentForm(false);
      showSuccess('تم تسجيل الدفعة بنجاح');
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
    <section className="page-content pos-container">
      <style>{`
        .pos-container { max-width: 1200px; margin: 0 auto; padding-bottom: 60px; }
        .pos-header-flex { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 0; gap: 6px; }
        .pos-action-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 99px; font-weight: 700; font-size: 14.5px; transition: all 0.2s; cursor: pointer; border: 0; }
        .pos-btn-primary { background: var(--fs-blue); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
        .pos-btn-primary:hover:not(:disabled) { background: var(--fs-blue-hover); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35); }
        .pos-btn-secondary { background: var(--fs-navy); color: white; box-shadow: 0 4px 12px rgba(29, 39, 48, 0.25); }
        .pos-btn-secondary:hover:not(:disabled) { background: var(--fs-navy-hover); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(29, 39, 48, 0.35); }
        
        .metric-cards-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 32px; }
        .dashboard-metric {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.06);
          padding: 32px;
          display: flex;
          align-items: flex-start;
          gap: 24px;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dashboard-metric:hover { transform: translateY(-4px); }
        .metric-icon-wrap { padding: 18px; border-radius: 24px; display: flex; align-items: center; justify-content: center; }
        .metric-icon-wrap.in { background: #dcfce7; color: #16a34a; }
        .metric-icon-wrap.out { background: #fee2e2; color: #dc2626; }
        .metric-content p { margin: 0 0 8px 0; color: var(--fs-text-muted); font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .metric-content h2 { margin: 0 0 8px 0; font-size: 32px; font-weight: 800; color: var(--fs-navy); letter-spacing: -0.02em; }
        .metric-content span { font-size: 13px; color: var(--fs-text-muted); }

        .pos-form-card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
          padding: 32px;
          margin-bottom: 32px;
          animation: fadeIn 0.4s ease-out;
        }
        .pos-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }
        .pos-input-group { display: flex; flex-direction: column; gap: 8px; }
        .pos-input-group label { font-size: 13.5px; font-weight: 600; color: var(--fs-text-main); display: flex; align-items: center; gap: 6px; }
        
        .pos-table-card {
          background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--fs-border);
          box-shadow: 0 4px 15px -3px rgba(0,0,0,0.05); overflow: hidden;
        }
        .pos-cart-table th { background: #f8fafc; font-weight: 700; color: var(--fs-text-muted); padding: 16px 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--fs-border-soft); }
        .pos-cart-table td { padding: 16px 20px; font-size: 14.5px; font-weight: 600; border-bottom: 1px solid var(--fs-border-soft); }
        .pos-cart-table tr:last-child td { border-bottom: none; }
        .pos-badge { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 99px; font-size: 12.5px; font-weight: 700; }
        .pos-badge.success { background: var(--fs-success-bg); color: var(--fs-success-text); }
        .pos-badge.danger { background: var(--fs-danger-bg); color: var(--fs-danger-text); }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Financials</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet size={24} color="var(--fs-blue)" />
            الخزنة (Treasury)
          </h1>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px' }}>متابعة حركة النقدية والمصروفات</p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button className="pos-action-btn pos-btn-secondary" type="button" onClick={() => { setShowPaymentForm(!showPaymentForm); setShowExpenseForm(false); }}>
            {showPaymentForm ? 'إلغاء' : <><ListPlus size={18} /> تسجيل دفعة (سداد/تحصيل)</>}
          </button>
          <button className="pos-action-btn pos-btn-primary" type="button" onClick={() => { setShowExpenseForm(!showExpenseForm); setShowPaymentForm(false); }}>
            {showExpenseForm ? 'إلغاء' : <><Plus size={18} /> تسجيل مصروف</>}
          </button>
        </div>
      </div>

      <div className="metric-cards-container">
        <article className="dashboard-metric">
          <div className="metric-icon-wrap in"><ArrowDownCircle size={32} /></div>
          <div className="metric-content">
            <p>إجمالي الوارد (Total IN)</p>
            <h2>{formatMoney(totalIn)}</h2>
            <span>تدفقات نقدية مسجلة</span>
          </div>
        </article>
        
        <article className="dashboard-metric">
          <div className="metric-icon-wrap out"><ArrowUpCircle size={32} /></div>
          <div className="metric-content">
            <p>إجمالي الصادر (Total OUT)</p>
            <h2>{formatMoney(totalOut)}</h2>
            <span>مصروفات ومدفوعات مسجلة</span>
          </div>
        </article>
      </div>

      {showExpenseForm && (
        <form className="pos-form-card" onSubmit={handleSubmit}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Receipt color="var(--fs-blue)"/> تسجيل مصروف جديد</h2>
          
          <div className="pos-form-grid">
            <div className="pos-input-group">
              <label><Activity size={16} color="var(--fs-text-muted)"/> البند / التصنيف</label>
              <input className="fs-input" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="مثال: كهرباء، نقل..." required />
            </div>
            <div className="pos-input-group">
              <label><Banknote size={16} color="var(--fs-text-muted)"/> المبلغ (بالجنيه)</label>
              <input className="fs-input" type="number" min={1} value={amountCents || ''} onChange={(event) => setAmountCents(Number(event.target.value) || 0)} required />
            </div>
            <div className="pos-input-group">
              <label><CreditCard size={16} color="var(--fs-text-muted)"/> طريقة الدفع</label>
              <select className="fs-select" value={paymentMethodId} onChange={(event) => setPaymentMethodId(Number(event.target.value))}>
                {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
            </div>
            <div className="pos-input-group" style={{ gridColumn: '1 / -1' }}>
              <label>البيان / الوصف</label>
              <textarea className="fs-input" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="تفاصيل إضافية للمصروف..." />
            </div>
          </div>
          
          {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}
          
          <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
            <button className="pos-action-btn pos-btn-primary" type="submit" disabled={saving || !amountCents || !category} style={{ padding: '14px 32px' }}>
              {saving ? 'جاري الحفظ...' : 'حفظ المصروف'}
            </button>
            <button className="pos-action-btn pos-btn-secondary" style={{ background: '#fff', color: 'var(--fs-text-main)', border: '1px solid var(--fs-border)', boxShadow: 'none' }} type="button" onClick={() => setShowExpenseForm(false)}>إلغاء</button>
          </div>
        </form>
      )}

      {showPaymentForm && (
        <form className="pos-form-card" onSubmit={handlePaymentSubmit}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><ListPlus color="var(--fs-blue)"/> تسجيل دفعة (سداد / تحصيل)</h2>
          
          <div className="pos-form-grid">
            <div className="pos-input-group">
              <label><Activity size={16} color="var(--fs-text-muted)"/> نوع الدفعة</label>
              <select className="fs-select" value={partyType} onChange={(event) => { setPartyType(event.target.value as 'CUSTOMER' | 'SUPPLIER'); setPartyId(0); setInvoiceId(0); }}>
                <option value="CUSTOMER">تحصيل من عميل (Inward)</option>
                <option value="SUPPLIER">سداد لمورد (Outward)</option>
              </select>
            </div>
            <div className="pos-input-group">
              <label>{partyType === 'CUSTOMER' ? <Users size={16} color="var(--fs-text-muted)"/> : <Store size={16} color="var(--fs-text-muted)"/>} الحساب</label>
              <select className="fs-select" value={partyId || ''} onChange={(event) => { setPartyId(Number(event.target.value) || 0); setInvoiceId(0); }} required>
                <option value="">-- اختر الحساب --</option>
                {partyOptions.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
              </select>
            </div>
            <div className="pos-input-group">
              <label><Receipt size={16} color="var(--fs-text-muted)"/> الفاتورة المرتبطة (اختياري)</label>
              <select className="fs-select" value={invoiceId || ''} onChange={(event) => setInvoiceId(Number(event.target.value) || 0)} disabled={!partyId}>
                <option value="">-- بدون فاتورة (دفعة عامة) --</option>
                {invoiceOptions.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} - {partyType === 'CUSTOMER' ? (invoice as SalesInvoice).customerName : (invoice as PurchaseInvoice).supplierName}</option>)}
              </select>
            </div>
            <div className="pos-input-group">
              <label><Banknote size={16} color="var(--fs-text-muted)"/> المبلغ (بالجنيه)</label>
              <input className="fs-input" type="number" min={1} value={paymentAmountCents || ''} onChange={(event) => setPaymentAmountCents(Number(event.target.value) || 0)} required />
            </div>
            <div className="pos-input-group">
              <label><CreditCard size={16} color="var(--fs-text-muted)"/> طريقة الدفع</label>
              <select className="fs-select" value={paymentMethodId} onChange={(event) => setPaymentMethodId(Number(event.target.value))}>
                {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
            </div>
            <div className="pos-input-group" style={{ gridColumn: '1 / -1' }}>
              <label>البيان / الوصف</label>
              <textarea className="fs-input" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="تفاصيل سداد الدفعة..." />
            </div>
          </div>
          
          {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}
          
          <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
            <button className="pos-action-btn pos-btn-primary" type="submit" disabled={paymentSaving || !paymentAmountCents || !partyId} style={{ padding: '14px 32px' }}>
              {paymentSaving ? 'جاري الحفظ...' : 'حفظ الدفعة'}
            </button>
            <button className="pos-action-btn pos-btn-secondary" style={{ background: '#fff', color: 'var(--fs-text-main)', border: '1px solid var(--fs-border)', boxShadow: 'none' }} type="button" onClick={() => setShowPaymentForm(false)}>إلغاء</button>
          </div>
        </form>
      )}

      <div className="pos-table-card" style={{ marginBottom: 32 }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity size={20} color="var(--fs-text-muted)" />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>حركة الخزنة الأخيرة (Recent Transactions)</h3>
        </div>
        <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>النوع</th>
              <th style={{ textAlign: 'right' }}>الاتجاه</th>
              <th style={{ textAlign: 'right' }}>المبلغ</th>
              <th style={{ textAlign: 'right' }}>طريقة الدفع</th>
              <th style={{ textAlign: 'right' }}>البيان</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#7a8691', padding: '60px 0' }}>لا توجد حركات مسجلة</td></tr>
            ) : transactions.map((transaction) => (
              <tr key={transaction.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--fs-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td><span style={{ fontWeight: 600, color: 'var(--fs-navy)' }}>{transaction.transactionType}</span></td>
                <td>
                  {transaction.direction === 'IN' 
                    ? <span className="pos-badge success"><ArrowDownCircle size={14}/> وارد (IN)</span> 
                    : <span className="pos-badge danger"><ArrowUpCircle size={14}/> صادر (OUT)</span>}
                </td>
                <td style={{ fontWeight: 800, color: transaction.direction === 'IN' ? 'var(--fs-success-text)' : 'var(--fs-danger-text)' }}>{formatMoney(transaction.amountCents)}</td>
                <td>
                  <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: '13px' }}>{transaction.paymentMethodName}</span>
                </td>
                <td style={{ color: 'var(--fs-text-muted)' }}>{transaction.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
        <div className="pos-table-card">
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Users size={20} color="#16a34a" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#166534' }}>مديونيات العملاء (أرصدة مستحقة لنا)</h3>
          </div>
          <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead><tr><th style={{ textAlign: 'right' }}>الفاتورة</th><th style={{ textAlign: 'right' }}>العميل</th><th style={{ textAlign: 'right' }}>الإجمالي</th><th style={{ textAlign: 'right' }}>المتبقي (المستحق)</th></tr></thead>
            <tbody>
              {receivables.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا توجد مديونيات على العملاء</td></tr> : receivables.map((entry) => (
                <tr key={entry.invoiceId} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--fs-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td><span style={{ fontWeight: 700 }}>{entry.invoiceNumber}</span></td>
                  <td>{entry.customerName}</td>
                  <td>{formatMoney(entry.totalCents)}</td>
                  <td style={{ color: '#16a34a', fontWeight: '800' }}>{formatMoney(entry.outstandingCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pos-table-card">
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Store size={20} color="#dc2626" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#991b1b' }}>مديونيات الموردين (أرصدة مستحقة علينا)</h3>
          </div>
          <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead><tr><th style={{ textAlign: 'right' }}>الفاتورة</th><th style={{ textAlign: 'right' }}>المورد</th><th style={{ textAlign: 'right' }}>الإجمالي</th><th style={{ textAlign: 'right' }}>المتبقي (المستحق)</th></tr></thead>
            <tbody>
              {payables.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا توجد مستحقات للموردين</td></tr> : payables.map((entry) => (
                <tr key={entry.invoiceId} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--fs-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td><span style={{ fontWeight: 700 }}>{entry.invoiceNumber}</span></td>
                  <td>{entry.supplierName}</td>
                  <td>{formatMoney(entry.totalCents)}</td>
                  <td style={{ color: '#dc2626', fontWeight: '800' }}>{formatMoney(entry.outstandingCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
