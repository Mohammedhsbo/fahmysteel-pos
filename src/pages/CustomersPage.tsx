import { useEffect, useMemo, useState } from 'react';
import { Plus, Users, Clock, Wallet, Search, MapPin, Phone, StickyNote, AlertCircle } from 'lucide-react';
import type { CustomerRecord } from '../../shared/contacts';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

const emptyCustomer = {
  name: '',
  phone: '',
  address: '',
  notes: '',
};

export function CustomersPage() {
  const { t } = useI18n();
  const { showError, showSuccess } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState(emptyCustomer);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void window.api.auth.getSession().then((session) => setIsAdmin(session?.role === 'ADMIN'));
    void loadCustomers();
  }, []);

  async function loadCustomers() {
    const results = await window.api.customers.listCustomers(search);
    setCustomers(results);
  }

  const sortedCustomers = useMemo(
    () => [...customers].sort((lhs, rhs) => lhs.name.localeCompare(rhs.name)),
    [customers],
  );

  async function handleSearch(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setSearch(nextValue);
    const results = await window.api.customers.listCustomers(nextValue);
    setCustomers(results);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        ...pending,
        phone: pending.phone || null,
        address: pending.address || null,
        notes: pending.notes || null,
      };
      if (editingCustomerId === null) {
        await window.api.customers.createCustomer(payload);
        showSuccess('تمت إضافة العميل بنجاح');
      } else {
        await window.api.customers.updateCustomer(editingCustomerId, payload);
        showSuccess('تم تحديث بيانات العميل');
      }
      setPending(emptyCustomer);
      setEditingCustomerId(null);
      setShowForm(false);
      await loadCustomers();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save customer.';
      setError(message);
      showError(message, 'Unable to save customer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(customerId: number) {
    if (!window.confirm('هل أنت متأكد من أرشفة هذا العميل؟')) return;
    try {
      await window.api.customers.archiveCustomer(customerId);
      showSuccess('تم أرشفة العميل بنجاح');
      await loadCustomers();
    } catch (archiveError) {
      const message = archiveError instanceof Error ? archiveError.message : 'Unable to archive customer.';
      setError(message);
      showError(message, 'Unable to archive customer.');
    }
  }

  function handleEdit(customer: CustomerRecord) {
    setEditingCustomerId(customer.id);
    setPending({
      name: customer.name,
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      notes: customer.notes ?? '',
    });
    setShowForm(true);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingCustomerId(null);
    setPending(emptyCustomer);
    setShowForm(false);
    setError('');
  }

  return (
    <section className="page-content pos-container">
      <style>{`
        .pos-container { max-width: 1200px; margin: 0 auto; padding-bottom: 60px; }
        .pos-header-flex { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 0; gap: 6px; }
        .pos-action-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border-radius: 99px; font-weight: 700; font-size: 14.5px; transition: all 0.2s; cursor: pointer; border: 0; }
        
        .pos-btn-primary { background: var(--fs-blue); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
        .pos-btn-primary:hover:not(:disabled) { background: var(--fs-blue-hover); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35); }
        .pos-btn-secondary { background: #fff; color: var(--fs-text-main); border: 1px solid var(--fs-border); box-shadow: var(--shadow-sm); }
        .pos-btn-secondary:hover:not(:disabled) { background: var(--fs-bg); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        .metric-cards-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 24px; }
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
        .metric-icon-wrap.blue { background: #eff6ff; color: #2563eb; }
        .metric-icon-wrap.slate { background: #f1f5f9; color: #475569; }
        .metric-icon-wrap.amber { background: #fffbeb; color: #d97706; }
        
        .metric-content p { margin: 0 0 8px 0; color: var(--fs-text-muted); font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .metric-content h2 { margin: 0 0 8px 0; font-size: 30px; font-weight: 800; color: var(--fs-navy); letter-spacing: -0.02em; }
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
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
        
        .search-bar-wrap { position: relative; width: 100%; max-width: 400px; }
        .search-bar-wrap input { width: 100%; padding: 12px 16px 12px 42px; border-radius: 99px; border: 1px solid var(--fs-border); background: #f8fafc; transition: all 0.2s; font-family: inherit; font-size: 14px; }
        .search-bar-wrap input:focus { background: #fff; border-color: var(--fs-blue); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); outline: none; }
        .search-bar-wrap svg { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--fs-text-muted); pointer-events: none; }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>CRM & Contacts</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={28} color="var(--fs-blue)" />
            دليل العملاء (Customers)
          </h1>
          <p style={{ marginTop: '8px', color: 'var(--fs-text-muted)', fontSize: '15px' }}>إدارة بيانات العملاء ومتابعة أرصدتهم ومديونياتهم</p>
        </div>
        {isAdmin && (
          <button className={`pos-action-btn ${showForm ? 'pos-btn-secondary' : 'pos-btn-primary'}`} type="button" onClick={() => { setShowForm(!showForm); if (!showForm) { setPending(emptyCustomer); setEditingCustomerId(null); } }}>
            {showForm ? 'إلغاء' : <><Plus size={18} /> تسجيل عميل جديد</>}
          </button>
        )}
      </div>

      <div className="metric-cards-container">
        <article className="dashboard-metric">
          <div className="metric-icon-wrap blue"><Users size={32} /></div>
          <div className="metric-content">
            <p>إجمالي العملاء (Total Customers)</p>
            <h2>{customers.length}</h2>
            <span>مسجل بقاعدة البيانات</span>
          </div>
        </article>

        <article className="dashboard-metric">
          <div className="metric-icon-wrap slate"><Clock size={32} /></div>
          <div className="metric-content">
            <p>عملاء الآجل (Credit Customers)</p>
            <h2>0</h2>
            <span>عملاء مسموح لهم بالشراء الآجل</span>
          </div>
        </article>

        <article className="dashboard-metric">
          <div className="metric-icon-wrap amber"><Wallet size={32} /></div>
          <div className="metric-content">
            <p>إجمالي المديونية (Total Debt)</p>
            <h2>0 ج.م</h2>
            <span>مستحقات آجلة لدى العملاء</span>
          </div>
        </article>
      </div>

      {showForm && isAdmin && (
        <form className="pos-form-card" onSubmit={handleSubmit}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Plus color="var(--fs-blue)"/> {editingCustomerId ? 'تعديل بيانات العميل' : 'إضافة ملف عميل جديد'}
          </h2>
          
          <div className="pos-form-grid" style={{ marginBottom: 32 }}>
            <div className="pos-input-group">
              <label><Users size={16} color="var(--fs-text-muted)"/> اسم العميل أو الشركة</label>
              <input className="fs-input" value={pending.name} onChange={(event) => setPending({ ...pending, name: event.target.value })} required />
            </div>
            <div className="pos-input-group">
              <label><Phone size={16} color="var(--fs-text-muted)"/> رقم الهاتف (موبايل)</label>
              <input className="fs-input" value={pending.phone} onChange={(event) => setPending({ ...pending, phone: event.target.value })} />
            </div>
            <div className="pos-input-group" style={{ gridColumn: '1 / -1' }}>
              <label><MapPin size={16} color="var(--fs-text-muted)"/> العنوان بالتفصيل</label>
              <textarea className="fs-input" rows={2} value={pending.address} onChange={(event) => setPending({ ...pending, address: event.target.value })} />
            </div>
            <div className="pos-input-group" style={{ gridColumn: '1 / -1' }}>
              <label><StickyNote size={16} color="var(--fs-text-muted)"/> ملاحظات عامة أو شروط تعامل</label>
              <textarea className="fs-input" rows={2} value={pending.notes} onChange={(event) => setPending({ ...pending, notes: event.target.value })} />
            </div>
          </div>
          
          {error && <div style={{ background: 'var(--fs-danger-bg)', color: 'var(--fs-danger-text)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={18}/> {error}</div>}

          <div style={{ display: 'flex', gap: 16 }}>
            <button className="pos-action-btn pos-btn-primary" type="submit" disabled={saving || !pending.name} style={{ padding: '14px 32px' }}>
              {saving ? 'جاري الحفظ...' : editingCustomerId === null ? 'إنشاء حساب العميل' : 'حفظ التعديلات'}
            </button>
            {editingCustomerId !== null && (
              <button className="pos-action-btn pos-btn-secondary" type="button" onClick={handleCancelEdit} style={{ padding: '14px 32px' }}>إلغاء التعديل</button>
            )}
          </div>
        </form>
      )}

      <div className="pos-table-card">
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>سجل العملاء</h3>
          <div className="search-bar-wrap">
            <Search size={18} />
            <input 
              type="text" 
              value={search} 
              onChange={handleSearch} 
              placeholder="ابحث باسم العميل أو رقم الهاتف..." 
            />
          </div>
        </div>
        <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>العميل</th>
              <th style={{ textAlign: 'center' }}>الهاتف</th>
              <th style={{ textAlign: 'right' }}>العنوان</th>
              <th style={{ textAlign: 'right', width: '25%' }}>ملاحظات</th>
              {isAdmin && <th style={{ textAlign: 'center' }}>إجراء</th>}
            </tr>
          </thead>
          <tbody>
            {sortedCustomers.length === 0 ? (
              <tr><td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', color: '#7a8691', padding: '60px 0' }}>لا يوجد عملاء مسجلين</td></tr>
            ) : sortedCustomers.map((customer) => (
              <tr key={customer.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--fs-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ color: 'var(--fs-navy)', fontWeight: 800 }}>{customer.name}</td>
                <td style={{ textAlign: 'center', fontWeight: 600, letterSpacing: '1px' }}>{customer.phone ?? '—'}</td>
                <td style={{ color: 'var(--fs-text-muted)' }}>{customer.address ?? '—'}</td>
                <td style={{ color: 'var(--fs-text-muted)', fontSize: 13 }}>{customer.notes ?? '—'}</td>
                {isAdmin && (
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button type="button" onClick={() => handleEdit(customer)} style={{ background: '#f1f5f9', border: 'none', color: '#0f172a', padding: '6px 12px', borderRadius: 99, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'} onMouseLeave={e=>e.currentTarget.style.background='#f1f5f9'}>تعديل</button>
                      <button type="button" onClick={() => void handleArchive(customer.id)} style={{ background: '#fee2e2', border: 'none', color: '#991b1b', padding: '6px 12px', borderRadius: 99, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#fecaca'} onMouseLeave={e=>e.currentTarget.style.background='#fee2e2'}>أرشفة</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
