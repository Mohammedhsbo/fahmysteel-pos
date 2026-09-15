import { useEffect, useMemo, useState } from 'react';
import { Shield, UserPlus, KeyRound, UserCog, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
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
  const { showError, showSuccess } = useToast();
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
      showSuccess('تم إنشاء المستخدم بنجاح');
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
      showSuccess(`تم ${!user.isActive ? 'تفعيل' : 'إيقاف'} حساب ${user.displayName}`);
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
      showSuccess('تم إعادة تعيين كلمة المرور بنجاح');
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : 'Unable to reset password.';
      setError(message);
      showError(message, 'Unable to reset password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-content pos-container">
      <style>{`
        .pos-container { max-width: 1200px; margin: 0 auto; padding-bottom: 60px; }
        .pos-header-flex { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 0; gap: 6px; }
        .pos-action-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border-radius: var(--radius-md); font-weight: 700; font-size: 14px; transition: all 0.2s; cursor: pointer; border: 0; }
        
        .pos-btn-primary { background: var(--fs-navy); color: white; box-shadow: 0 4px 12px rgba(29, 39, 48, 0.25); }
        .pos-btn-primary:hover:not(:disabled) { background: var(--fs-navy-hover); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(29, 39, 48, 0.35); }
        .pos-btn-secondary { background: #fff; color: var(--fs-text-main); border: 1px solid var(--fs-border); box-shadow: var(--shadow-sm); }
        .pos-btn-secondary:hover:not(:disabled) { background: var(--fs-bg); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        .pos-form-card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
          padding: 32px;
          margin-bottom: 32px;
          flex: 1;
        }
        .pos-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .pos-input-group { display: flex; flex-direction: column; gap: 8px; }
        .pos-input-group label { font-size: 13.5px; font-weight: 600; color: var(--fs-text-main); }
        
        .pos-table-card {
          background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--fs-border);
          box-shadow: 0 4px 15px -3px rgba(0,0,0,0.05); overflow: hidden;
        }
        .pos-cart-table th { background: #f8fafc; font-weight: 700; color: var(--fs-text-muted); padding: 16px 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--fs-border-soft); }
        .pos-cart-table td { padding: 16px 20px; font-size: 14.5px; font-weight: 600; border-bottom: 1px solid var(--fs-border-soft); }
        .pos-cart-table tr:last-child td { border-bottom: none; }
        
        .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 700; }
        .status-badge.active { background: #dcfce7; color: #166534; }
        .status-badge.disabled { background: #fee2e2; color: #991b1b; }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Control Panel</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={24} color="var(--fs-blue)" />
            إدارة الحسابات (Accounts)
          </h1>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px' }}>إنشاء وإدارة حسابات الكاشير وصلاحيات الوصول للنظام</p>
        </div>
      </div>

      {error && <div style={{ background: 'var(--fs-danger-bg)', color: 'var(--fs-danger-text)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={18}/> {error}</div>}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
        <form className="pos-form-card" onSubmit={handleSubmit}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><UserPlus color="var(--fs-blue)"/> تسجيل مستخدم جديد</h2>
          <div className="pos-form-grid" style={{ marginBottom: 24 }}>
            <div className="pos-input-group">
              <label>اسم المستخدم (للدخول)</label>
              <input className="fs-input" value={pending.username} onChange={(event) => setPending({ ...pending, username: event.target.value })} required />
            </div>
            <div className="pos-input-group">
              <label>الاسم الظاهر</label>
              <input className="fs-input" value={pending.displayName} onChange={(event) => setPending({ ...pending, displayName: event.target.value })} required />
            </div>
            <div className="pos-input-group">
              <label>كلمة المرور</label>
              <input className="fs-input" type="password" value={pending.password} onChange={(event) => setPending({ ...pending, password: event.target.value })} required />
            </div>
            <div className="pos-input-group">
              <label>الصلاحية (Role)</label>
              <select className="fs-select" value={pending.role} onChange={(event) => setPending({ ...pending, role: event.target.value as 'ADMIN' | 'CASHIER' })}>
                <option value="CASHIER">كاشير (Cashier)</option>
                <option value="ADMIN">مدير (Administrator)</option>
              </select>
            </div>
          </div>
          <button className="pos-action-btn pos-btn-primary" type="submit" disabled={saving || !pending.username || !pending.password} style={{ width: '100%' }}>
            {saving ? 'جاري الحفظ...' : 'إنشاء حساب مستخدم'}
          </button>
        </form>

        <form className="pos-form-card" onSubmit={handlePasswordReset}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><KeyRound color="var(--fs-blue)"/> إعادة تعيين كلمة المرور</h2>
          <div className="pos-form-grid" style={{ marginBottom: 24 }}>
            <div className="pos-input-group">
              <label>اختر المستخدم</label>
              <select className="fs-select" value={resetUserId} onChange={(event) => setResetUserId(Number(event.target.value))}>
                <option value={0}>-- حدد المستخدم --</option>
                {sortedUsers.map((user) => <option key={user.id} value={user.id}>{user.displayName} ({user.username})</option>)}
              </select>
            </div>
            <div className="pos-input-group">
              <label>كلمة المرور الجديدة</label>
              <input className="fs-input" type="password" minLength={8} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} required />
            </div>
          </div>
          <button className="pos-action-btn pos-btn-primary" type="submit" disabled={saving || !resetUserId || !resetPassword} style={{ width: '100%', marginTop: 'auto' }}>
            {saving ? 'جاري الحفظ...' : 'تأكيد تغيير كلمة المرور'}
          </button>
        </form>
      </div>

      <div className="pos-table-card">
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
          <UserCog size={20} color="var(--fs-text-muted)" />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>حسابات المستخدمين (User Accounts)</h3>
        </div>
        <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>اسم الدخول</th>
              <th style={{ textAlign: 'right' }}>الاسم الظاهر</th>
              <th style={{ textAlign: 'right' }}>الصلاحية</th>
              <th style={{ textAlign: 'center' }}>الحالة</th>
              <th style={{ textAlign: 'right' }}>آخر تسجيل دخول</th>
              <th style={{ textAlign: 'right' }}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا يوجد مستخدمين مسجلين</td></tr>
            ) : sortedUsers.map((user) => (
              <tr key={user.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--fs-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ color: 'var(--fs-text-muted)' }}>{user.username}</td>
                <td style={{ color: 'var(--fs-navy)' }}>{user.displayName}</td>
                <td><span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: '12px' }}>{user.role}</span></td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`status-badge ${user.isActive ? 'active' : 'disabled'}`}>
                    {user.isActive ? <CheckCircle2 size={14}/> : <XCircle size={14}/>} {user.isActive ? 'نشط' : 'معطل'}
                  </span>
                </td>
                <td style={{ color: 'var(--fs-text-muted)' }}>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-GB') : 'لم يسجل الدخول'}</td>
                <td>
                  <button 
                    type="button" 
                    onClick={() => void handleToggleActivation(user)}
                    style={{ 
                      background: 'transparent', border: '1px solid var(--fs-border)', padding: '6px 12px', borderRadius: 99, 
                      fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      color: user.isActive ? 'var(--fs-danger-text)' : 'var(--fs-success-text)'
                    }}
                  >
                    {user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
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
