import { useEffect, useMemo, useState } from 'react';
import type { UserRecord } from '../../shared/admin';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

const emptyForm = {
  username: '',
  displayName: '',
  password: '',
  role: 'CASHIER' as 'ADMIN' | 'CASHIER',
};

export function AccountManagementPage() {
  const { t } = useI18n();
  const { showError } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pending, setPending] = useState(emptyForm);
  const [resetUserId, setResetUserId] = useState(0);
  const [resetPassword, setResetPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadUsers() {
    const records = await window.api.admin.listUsers();
    setUsers(records);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const sortedUsers = useMemo(
    () => [...users].sort((lhs, rhs) => lhs.displayName.localeCompare(rhs.displayName)),
    [users],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await window.api.admin.createUser({ ...pending });
      setPending(emptyForm);
      await loadUsers();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to create user.';
      setError(message);
      showError(message, 'Unable to create user.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActivation(user: UserRecord) {
    try {
      await window.api.admin.updateUser(user.id, { isActive: !user.isActive });
      await loadUsers();
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : 'Unable to update user.';
      setError(message);
      showError(message, 'Unable to update user.');
    }
  }

  async function handlePasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (!resetUserId) throw new Error('Select a user first.');
      await window.api.admin.resetPassword(resetUserId, resetPassword);
      setResetUserId(0);
      setResetPassword('');
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : 'Unable to reset password.';
      setError(message);
      showError(message, 'Unable to reset password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Control panel</p>
          <h1>{t('accounts')}</h1>
          <p className="heading-copy">Create and maintain local users, roles, and access for the offline POS workspace.</p>
        </div>
      </div>

      <form className="panel-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Username<input className="fs-input" value={pending.username} onChange={(event) => setPending({ ...pending, username: event.target.value })} /></label>
          <label>Display name<input className="fs-input" value={pending.displayName} onChange={(event) => setPending({ ...pending, displayName: event.target.value })} /></label>
          <label>Password<input className="fs-input" type="password" value={pending.password} onChange={(event) => setPending({ ...pending, password: event.target.value })} /></label>
          <label>Role<select className="fs-select" value={pending.role} onChange={(event) => setPending({ ...pending, role: event.target.value as 'ADMIN' | 'CASHIER' })}>
            <option value="CASHIER">Cashier</option>
            <option value="ADMIN">Administrator</option>
          </select></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="fs-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create user'}</button>
      </form>

      <form className="panel-form" onSubmit={handlePasswordReset}>
        <div className="form-grid">
          <label>User<select className="fs-select" value={resetUserId} onChange={(event) => setResetUserId(Number(event.target.value))}>
            <option value={0}>Select user</option>
            {sortedUsers.map((user) => <option key={user.id} value={user.id}>{user.displayName} ({user.username})</option>)}
          </select></label>
          <label>New password<input className="fs-input" type="password" minLength={8} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} /></label>
        </div>
        <button className="fs-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Reset password'}</button>
      </form>

      <div className="fs-table-container">
        <div className="table-toolbar"><strong>User accounts</strong></div>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Display name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last login</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.displayName}</td>
                <td>{user.role}</td>
                <td>{user.isActive ? 'Active' : 'Disabled'}</td>
                <td>{user.lastLoginAt ?? 'Never'}</td>
                <td><button type="button" className="fs-btn-secondary" onClick={() => void handleToggleActivation(user)}>{user.isActive ? 'Disable' : 'Enable'}</button> <button type="button" className="fs-btn-secondary" onClick={() => setResetUserId(user.id)}>Reset password</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
