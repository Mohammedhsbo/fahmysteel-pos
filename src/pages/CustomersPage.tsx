import { useEffect, useMemo, useState } from 'react';
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
      await loadCustomers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save customer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(customerId: number) {
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
    setError('');
  }

  function handleCancelEdit() {
    setEditingCustomerId(null);
    setPending(emptyCustomer);
    setError('');
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Next phase</p>
          <h1>{t('customers')}</h1>
          <p className="heading-copy">Offline customer master records are managed in the local SQLite database.</p>
        </div>
      </div>

      {isAdmin && <form className="panel-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Name<input value={pending.name} onChange={(event) => setPending({ ...pending, name: event.target.value })} /></label>
          <label>Phone<input value={pending.phone} onChange={(event) => setPending({ ...pending, phone: event.target.value })} /></label>
          <label className="full-width">Address<textarea value={pending.address} onChange={(event) => setPending({ ...pending, address: event.target.value })} /></label>
          <label className="full-width">Notes<textarea value={pending.notes} onChange={(event) => setPending({ ...pending, notes: event.target.value })} /></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" type="submit" disabled={saving}>{saving ? 'Saving...' : editingCustomerId === null ? 'Create customer' : 'Save customer'}</button>
        {editingCustomerId !== null && <button className="tiny-button" type="button" onClick={handleCancelEdit}>Cancel edit</button>}
      </form>}

      <div className="table-panel">
        <div className="table-toolbar">
          <strong>Customer records</strong>
          <input value={search} onChange={handleSearch} placeholder="Search customers" />
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
            {sortedCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td>{customer.phone ?? '—'}</td>
                <td>{customer.address ?? '—'}</td>
                <td>{customer.notes ?? '—'}</td>
                <td>{isAdmin && <><button type="button" className="tiny-button" onClick={() => handleEdit(customer)}>Edit</button> <button type="button" className="tiny-button" onClick={() => void handleArchive(customer.id)}>Archive</button></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
