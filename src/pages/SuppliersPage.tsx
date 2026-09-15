import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Building2, PackageSearch, AlertCircle, Edit2, Trash2 } from 'lucide-react';
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
  const { showError, showSuccess } = useToast();
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
        showSuccess('تمت إضافة المورد بنجاح.');
      } else {
        await window.api.suppliers.updateSupplier(editingSupplierId, payload);
        showSuccess('تم تحديث بيانات المورد.');
      }
      setPending(emptySupplier);
      setEditingSupplierId(null);
      setShowForm(false);
      await loadSuppliers();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save supplier.';
      setError(message);
      showError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(supplierId: number) {
    if (!window.confirm('هل أنت متأكد من أرشفة هذا المورد؟')) return;
    try {
      await window.api.suppliers.archiveSupplier(supplierId);
      showSuccess('تم أرشفة المورد بنجاح.');
      await loadSuppliers();
    } catch (archiveError) {
      const message = archiveError instanceof Error ? archiveError.message : 'Unable to archive supplier.';
      setError(message);
      showError(message);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingSupplierId(null);
    setPending(emptySupplier);
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
        .pos-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .pos-btn-secondary { background: #fff; color: var(--fs-text-main); border: 1px solid var(--fs-border); box-shadow: var(--shadow-sm); }
        .pos-btn-secondary:hover:not(:disabled) { background: var(--fs-bg); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        .pos-form-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid var(--fs-border);
          border-radius: var(--radius-lg);
          padding: 32px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
          margin-bottom: 32px;
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pos-table-card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.06);
          overflow: hidden;
        }

        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { font-size: 14px; font-weight: 700; color: var(--fs-text-main); }
        
        .fs-input { padding: 14px 16px; border: 1px solid var(--fs-border); background: #fafafa; border-radius: var(--radius-sm); font-size: 15px; outline: none; transition: all 0.2s; width: 100%; }
        .fs-input:focus { border-color: var(--fs-blue); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); background: #fff; }
        
        .search-wrapper { position: relative; width: 100%; max-width: 400px; }
        .search-wrapper svg { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--fs-text-muted); }
        .search-wrapper input { width: 100%; padding: 12px 16px 12px 40px; border: 1px solid var(--fs-border); border-radius: 99px; background: #fafafa; outline: none; transition: all 0.2s; }
        .search-wrapper input:focus { background: #fff; border-color: var(--fs-blue); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
        [dir='rtl'] .search-wrapper input { padding: 12px 40px 12px 16px; }

        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 16px 24px; text-align: right; }
        th { font-size: 13px; font-weight: 700; color: var(--fs-text-muted); text-transform: uppercase; letter-spacing: 0.05em; background: #fafafa; border-bottom: 1px solid var(--fs-border-soft); }
        td { font-size: 14.5px; font-weight: 600; color: var(--fs-text-main); border-bottom: 1px solid var(--fs-border-soft); }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background-color: #f8fafc; }
        
        .action-btn { background: transparent; border: 0; color: var(--fs-text-muted); padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .action-btn:hover { background: var(--fs-bg); color: var(--fs-blue); }
        .action-btn.danger:hover { background: var(--fs-danger-bg); color: var(--fs-danger-text); }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Procurement & Supplies</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PackageSearch size={24} color="var(--fs-blue)" />
            دليل الموردين
          </h1>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px' }}>{suppliers.length} مورد مسجل في النظام.</p>
        </div>
        <button className="pos-action-btn pos-btn-primary" type="button" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'إلغاء' : 'إضافة مورد جديد'}
        </button>
      </div>

      {showForm && (
        <div className="pos-form-card">
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 color="var(--fs-blue)"/> {editingSupplierId ? 'تعديل بيانات المورد' : 'تسجيل مورد جديد'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>اسم المورد</label>
                <input className="fs-input" value={pending.name} onChange={(event) => setPending({ ...pending, name: event.target.value })} placeholder="مثال: مصنع الأمل للحديد" required />
              </div>
              <div className="form-group">
                <label>رقم الهاتف</label>
                <input className="fs-input" dir="ltr" value={pending.phone} onChange={(event) => setPending({ ...pending, phone: event.target.value })} placeholder="+20 100 000 0000" />
              </div>
              <div className="form-group full-width">
                <label>العنوان</label>
                <textarea className="fs-input" rows={2} value={pending.address} onChange={(event) => setPending({ ...pending, address: event.target.value })} placeholder="عنوان مقر الشركة أو المصنع..." />
              </div>
              <div className="form-group full-width">
                <label>ملاحظات</label>
                <textarea className="fs-input" rows={2} value={pending.notes} onChange={(event) => setPending({ ...pending, notes: event.target.value })} placeholder="أي ملاحظات إضافية بخصوص المورد..." />
              </div>
            </div>
            
            {error && (
              <div style={{ background: 'var(--fs-danger-bg)', color: 'var(--fs-danger-text)', padding: '16px', borderRadius: 'var(--radius-sm)', marginTop: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18}/> {error}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'flex-end', paddingTop: 24, borderTop: '1px solid var(--fs-border-soft)' }}>
              {editingSupplierId !== null && (
                <button className="pos-action-btn pos-btn-secondary" type="button" onClick={handleCancelEdit}>
                  إلغاء التعديل
                </button>
              )}
              <button className="pos-action-btn pos-btn-primary" type="submit" disabled={saving}>
                {saving ? 'جاري الحفظ...' : editingSupplierId === null ? 'إنشاء حساب المورد' : 'حفظ التعديلات'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="pos-table-card">
        <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>قائمة الموردين</h3>
          <div className="search-wrapper">
            <Search size={18} />
            <input 
              value={search} 
              onChange={handleSearch} 
              placeholder="ابحث باسم المورد أو الهاتف..." 
            />
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>اسم المورد</th>
              <th style={{ textAlign: 'left' }}>الهاتف</th>
              <th>العنوان</th>
              <th>ملاحظات</th>
              <th style={{ textAlign: 'left', width: 100 }}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {sortedSuppliers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fs-text-muted)' }}>
                  <Building2 size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto', display: 'block' }} />
                  لا يوجد موردين مسجلين في النظام.
                </td>
              </tr>
            ) : sortedSuppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td style={{ fontWeight: 700, color: 'var(--fs-navy)' }}>{supplier.name}</td>
                <td dir="ltr" style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: 14, color: 'var(--fs-text-muted)' }}>{supplier.phone ?? '—'}</td>
                <td>{supplier.address ?? '—'}</td>
                <td>{supplier.notes ?? '—'}</td>
                <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                  <button type="button" className="action-btn" title="تعديل" onClick={() => handleEdit(supplier)}>
                    <Edit2 size={18} />
                  </button>
                  <button type="button" className="action-btn danger" title="أرشفة" onClick={() => void handleArchive(supplier.id)}>
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
