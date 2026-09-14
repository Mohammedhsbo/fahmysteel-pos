import { useEffect, useMemo, useState } from 'react';
import type { SupplierRecord } from '../../shared/contacts';
import { useI18n } from '../i18n';

const emptySupplier = {
  name: '',
  phone: '',
  address: '',
  notes: '',
};

export function SuppliersPage() {
  const { t } = useI18n();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState(emptySupplier);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      await loadSuppliers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save supplier.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(supplierId: number) {
    try {
      await window.api.suppliers.archiveSupplier(supplierId);
      await loadSuppliers();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive supplier.');
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
    setError('');
  }

  function handleCancelEdit() {
    setEditingSupplierId(null);
    setPending(emptySupplier);
    setError('');
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Next phase</p>
          <h1>{t('suppliers')}</h1>
          <p className="heading-copy">Supplier records stay local and work fully offline with the same secure IPC flow.</p>
        </div>
      </div>

      <form className="panel-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Name<input value={pending.name} onChange={(event) => setPending({ ...pending, name: event.target.value })} /></label>
          <label>Phone<input value={pending.phone} onChange={(event) => setPending({ ...pending, phone: event.target.value })} /></label>
          <label className="full-width">Address<textarea value={pending.address} onChange={(event) => setPending({ ...pending, address: event.target.value })} /></label>
          <label className="full-width">Notes<textarea value={pending.notes} onChange={(event) => setPending({ ...pending, notes: event.target.value })} /></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" type="submit" disabled={saving}>{saving ? 'Saving...' : editingSupplierId === null ? 'Create supplier' : 'Save supplier'}</button>
        {editingSupplierId !== null && <button className="tiny-button" type="button" onClick={handleCancelEdit}>Cancel edit</button>}
      </form>

      <div className="table-panel">
        <div className="table-toolbar">
          <strong>Supplier records</strong>
          <input value={search} onChange={handleSearch} placeholder="Search suppliers" />
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Notes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedSuppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td>{supplier.name}</td>
                <td>{supplier.phone ?? '—'}</td>
                <td>{supplier.address ?? '—'}</td>
                <td>{supplier.notes ?? '—'}</td>
                <td><button type="button" className="tiny-button" onClick={() => handleEdit(supplier)}>Edit</button> <button type="button" className="tiny-button" onClick={() => void handleArchive(supplier.id)}>Archive</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
