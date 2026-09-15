import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { SupplierRecord } from '../../shared/contacts';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

const emptySupplier = {
  name: '',
  phone: '',
  address: '',
  notes: '',
};

export function SuppliersPage() {
  const { t } = useI18n();
  const { showError } = useToast();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState(emptySupplier);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void loadSuppliers();
  }, []);

  async function loadSuppliers() {
    const results = await window.api.suppliers.listSuppliers(search);
    setSuppliers(results);
  }

  const sortedSuppliers = useMemo(
    () => [...suppliers].sort((lhs, rhs) => lhs.name.localeCompare(rhs.name)),
    [suppliers],
  );

  async function handleSearch(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setSearch(nextValue);
    const results = await window.api.suppliers.listSuppliers(nextValue);
    setSuppliers(results);
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
      if (editingSupplierId === null) {
        await window.api.suppliers.createSupplier(payload);
      } else {
        await window.api.suppliers.updateSupplier(editingSupplierId, payload);
      }
      setPending(emptySupplier);
      setEditingSupplierId(null);
      setShowForm(false);
      await loadSuppliers();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save supplier.';
      setError(message);
      showError(message, 'Unable to save supplier.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(supplierId: number) {
    if (!window.confirm('هل أنت متأكد من أرشفة هذا المورد؟')) return;
    try {
      await window.api.suppliers.archiveSupplier(supplierId);
      await loadSuppliers();
    } catch (archiveError) {
      const message = archiveError instanceof Error ? archiveError.message : 'Unable to archive supplier.';
      setError(message);
      showError(message, 'Unable to archive supplier.');
    }
  }

  function handleEdit(supplier: SupplierRecord) {
    setEditingSupplierId(supplier.id);
    setPending({
      name: supplier.name,
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      notes: supplier.notes ?? '',
    });
    setShowForm(true);
    setError('');
  }

  function handleCancelEdit() {
    setEditingSupplierId(null);
    setPending(emptySupplier);
    setShowForm(false);
    setError('');
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div className="page-title">
          <h1>الموردين</h1>
          <p className="subtitle">{suppliers.length} مورد مسجل</p>
        </div>
        <button className="fs-btn-primary" type="button" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'إلغاء' : 'إضافة مورد'}
        </button>
      </div>

      {showForm && (
        <form className="panel-form" onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
          <h3 style={{ marginTop: 0, marginBottom: 20 }}>{editingSupplierId ? 'تعديل بيانات المورد' : 'تسجيل مورد جديد'}</h3>
          <div className="form-grid">
            <label>اسم المورد<input className="fs-input" value={pending.name} onChange={(event) => setPending({ ...pending, name: event.target.value })} required /></label>
            <label>رقم الهاتف<input className="fs-input" value={pending.phone} onChange={(event) => setPending({ ...pending, phone: event.target.value })} /></label>
            <label className="full-width">العنوان<textarea className="fs-input" rows={2} value={pending.address} onChange={(event) => setPending({ ...pending, address: event.target.value })} /></label>
            <label className="full-width">ملاحظات<textarea className="fs-input" rows={2} value={pending.notes} onChange={(event) => setPending({ ...pending, notes: event.target.value })} /></label>
          </div>
          {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="fs-btn-primary" type="submit" disabled={saving}>{saving ? 'جاري الحفظ...' : editingSupplierId === null ? 'إنشاء حساب المورد' : 'حفظ التعديلات'}</button>
            {editingSupplierId !== null && <button className="fs-btn-secondary" type="button" onClick={handleCancelEdit}>إلغاء التعديل</button>}
          </div>
        </form>
      )}

      <div className="fs-table-container">
        <div className="table-toolbar">
          <input className="fs-input" style={{ maxWidth: 300 }} value={search} onChange={handleSearch} placeholder="ابحث باسم المورد أو الهاتف..." />
        </div>
        <table>
          <thead>
            <tr>
              <th>اسم المورد</th>
              <th>الهاتف</th>
              <th>العنوان</th>
              <th>ملاحظات</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {sortedSuppliers.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا يوجد موردين مسجلين</td></tr>
            ) : sortedSuppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td style={{ fontWeight: 600 }}>{supplier.name}</td>
                <td dir="ltr" style={{ textAlign: 'right' }}>{supplier.phone ?? '—'}</td>
                <td>{supplier.address ?? '—'}</td>
                <td>{supplier.notes ?? '—'}</td>
                <td>
                  <button type="button" className="quiet-button" onClick={() => handleEdit(supplier)} style={{ marginInlineEnd: 8 }}>تعديل</button>
                  <button type="button" className="quiet-button" style={{ color: 'var(--fs-danger-text)' }} onClick={() => void handleArchive(supplier.id)}>أرشفة</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
