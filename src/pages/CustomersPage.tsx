import { useEffect, useMemo, useState } from 'react';
import { Plus, Users, Clock, Wallet } from 'lucide-react';
import type { CustomerRecord } from '../../shared/contacts';
import { useI18n } from '../i18n';

const emptyCustomer = {
  name: '',
  phone: '',
  address: '',
  notes: '',
};

export function CustomersPage() {
  const { t } = useI18n();
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
      } else {
        await window.api.customers.updateCustomer(editingCustomerId, payload);
      }
      setPending(emptyCustomer);
      setEditingCustomerId(null);
      setShowForm(false);
      await loadCustomers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save customer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(customerId: number) {
    if (!window.confirm('هل أنت متأكد من أرشفة هذا العميل؟')) return;
    try {
      await window.api.customers.archiveCustomer(customerId);
      await loadCustomers();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive customer.');
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
  }

  function handleCancelEdit() {
    setEditingCustomerId(null);
    setPending(emptyCustomer);
    setShowForm(false);
    setError('');
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div className="page-title">
          <h1>العملاء</h1>
          <p className="subtitle">متابعة أرصدة العملاء والمديونيات</p>
        </div>
        {isAdmin && (
          <button className="fs-btn-primary" type="button" onClick={() => setShowForm(!showForm)}>
            <Plus size={18} /> {showForm ? 'إلغاء' : 'عميل جديد'}
          </button>
        )}
      </div>

      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <article className="metric-card">
          <div className="metric-card-header">
            <p>إجمالي العملاء</p>
            <div className="metric-icon blue"><Users size={20} /></div>
          </div>
          <div>
            <h2>{customers.length}</h2>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-card-header">
            <p>العملاء الآجل</p>
            <div className="metric-icon"><Clock size={20} /></div>
          </div>
          <div>
            <h2>{/* Placeholder until backend provides this */ 0}</h2>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-card-header">
            <p>إجمالي المديونية</p>
            <div className="metric-icon" style={{ color: '#f59e0b', backgroundColor: '#fef3c7' }}><Wallet size={20} /></div>
          </div>
          <div>
            <h2>0 ج.م</h2>
          </div>
        </article>
      </div>

      {showForm && isAdmin && (
        <form className="panel-form" onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
          <h3 style={{ marginTop: 0, marginBottom: 20 }}>{editingCustomerId ? 'تعديل بيانات العميل' : 'تسجيل عميل جديد'}</h3>
          <div className="form-grid">
            <label>اسم العميل<input className="fs-input" value={pending.name} onChange={(event) => setPending({ ...pending, name: event.target.value })} required /></label>
            <label>رقم الهاتف<input className="fs-input" value={pending.phone} onChange={(event) => setPending({ ...pending, phone: event.target.value })} /></label>
            <label className="full-width">العنوان<textarea className="fs-input" rows={2} value={pending.address} onChange={(event) => setPending({ ...pending, address: event.target.value })} /></label>
            <label className="full-width">ملاحظات<textarea className="fs-input" rows={2} value={pending.notes} onChange={(event) => setPending({ ...pending, notes: event.target.value })} /></label>
          </div>
          {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="fs-btn-primary" type="submit" disabled={saving}>{saving ? 'جاري الحفظ...' : editingCustomerId === null ? 'إنشاء حساب العميل' : 'حفظ التعديلات'}</button>
            {editingCustomerId !== null && <button className="fs-btn-secondary" type="button" onClick={handleCancelEdit}>إلغاء التعديل</button>}
          </div>
        </form>
      )}

      <div className="fs-table-container">
        <div className="table-toolbar">
          <input className="fs-input" style={{ maxWidth: 300 }} value={search} onChange={handleSearch} placeholder="ابحث باسم العميل أو رقم الهاتف..." />
        </div>
        <table>
          <thead>
            <tr>
              <th>اسم العميل</th>
              <th>الهاتف</th>
              <th>العنوان</th>
              <th>ملاحظات</th>
              {isAdmin && <th>إجراء</th>}
            </tr>
          </thead>
          <tbody>
            {sortedCustomers.length === 0 ? (
              <tr><td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا يوجد عملاء مسجلين</td></tr>
            ) : sortedCustomers.map((customer) => (
              <tr key={customer.id}>
                <td style={{ fontWeight: 600 }}>{customer.name}</td>
                <td dir="ltr" style={{ textAlign: 'right' }}>{customer.phone ?? '—'}</td>
                <td>{customer.address ?? '—'}</td>
                <td>{customer.notes ?? '—'}</td>
                {isAdmin && (
                  <td>
                    <button type="button" className="quiet-button" onClick={() => handleEdit(customer)} style={{ marginInlineEnd: 8 }}>تعديل</button>
                    <button type="button" className="quiet-button" style={{ color: 'var(--fs-danger-text)' }} onClick={() => void handleArchive(customer.id)}>أرشفة</button>
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
