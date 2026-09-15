import { useEffect, useMemo, useState } from 'react';
import { Shield, Clock, LogIn, LogOut, CheckCircle2, History, UserCheck, AlertCircle } from 'lucide-react';
import type { AuditLogRecord, CashierShiftRecord } from '../../shared/operations';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

export function OperationsPage() {
  const { t } = useI18n();
  const { showError, showSuccess } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [shifts, setShifts] = useState<CashierShiftRecord[]>([]);
  const [openingCash, setOpeningCash] = useState('0');
  const [closingCash, setClosingCash] = useState('0');
  const [expectedCash, setExpectedCash] = useState('0');
  const [closingNotes, setClosingNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    const [logs, shiftRows] = await Promise.all([
      window.api.operations.listAuditLogs(),
      window.api.operations.listShifts(),
    ]);
    setAuditLogs(logs);
    setShifts(shiftRows);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const openShift = useMemo(() => shifts.find((shift) => shift.status === 'OPEN'), [shifts]);

  async function handleOpenShift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await window.api.operations.openShift({ openingCashCents: Number(openingCash) * 100 });
      setOpeningCash('0');
      showSuccess('تم فتح الوردية بنجاح');
      await loadData();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to open shift.';
      setError(message);
      showError(message, 'Unable to open shift.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseShift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!openShift) return;
    setError('');
    setSaving(true);
    try {
      await window.api.operations.closeShift(openShift.id, {
        closingCashCents: Number(closingCash) * 100,
        expectedCashCents: Number(expectedCash) * 100,
        closingNotes: closingNotes || null,
      });
      setClosingCash('0');
      setExpectedCash('0');
      setClosingNotes('');
      showSuccess('تم إغلاق الوردية بنجاح');
      await loadData();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to close shift.';
      setError(message);
      showError(message, 'Unable to close shift.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-content pos-container">
      <style>{`
        .pos-container { max-width: 1200px; margin: 0 auto; padding-bottom: 60px; }
        .pos-header-flex { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 0; gap: 6px; }
        .pos-action-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 24px; border-radius: var(--radius-md); font-weight: 700; font-size: 15px; transition: all 0.2s; cursor: pointer; border: 0; }
        
        .pos-btn-success { background: #16a34a; color: white; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25); }
        .pos-btn-success:hover:not(:disabled) { background: #15803d; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(22, 163, 74, 0.35); }
        .pos-btn-danger { background: #dc2626; color: white; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25); }
        .pos-btn-danger:hover:not(:disabled) { background: #b91c1c; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(220, 38, 38, 0.35); }
        
        .pos-btn-disabled { background: var(--fs-bg); color: var(--fs-text-muted); cursor: not-allowed; }

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
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }
        .pos-input-group { display: flex; flex-direction: column; gap: 8px; }
        .pos-input-group label { font-size: 13.5px; font-weight: 600; color: var(--fs-text-main); }
        
        .pos-table-card {
          background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--fs-border);
          box-shadow: 0 4px 15px -3px rgba(0,0,0,0.05); overflow: hidden; margin-bottom: 32px;
        }
        .pos-cart-table th { background: #f8fafc; font-weight: 700; color: var(--fs-text-muted); padding: 16px 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--fs-border-soft); }
        .pos-cart-table td { padding: 16px 20px; font-size: 14.5px; font-weight: 600; border-bottom: 1px solid var(--fs-border-soft); }
        .pos-cart-table tr:last-child td { border-bottom: none; }
        
        .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 700; }
        .status-badge.open { background: #dcfce7; color: #166534; }
        .status-badge.closed { background: var(--fs-bg); color: var(--fs-text-muted); }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>System Operations</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={24} color="var(--fs-blue)" />
            إدارة الورديات (Operations)
          </h1>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px' }}>متابعة جلسات الكاشير وسجل النظام</p>
        </div>
      </div>

      {error && <div style={{ background: 'var(--fs-danger-bg)', color: 'var(--fs-danger-text)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={18}/> {error}</div>}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
        <form className="pos-form-card" onSubmit={handleOpenShift} style={{ opacity: openShift ? 0.5 : 1, pointerEvents: openShift ? 'none' : 'auto' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogIn color={openShift ? "var(--fs-text-muted)" : "#16a34a"}/> فتح وردية جديدة
          </h2>
          <div className="pos-form-grid" style={{ marginBottom: 24 }}>
            <div className="pos-input-group">
              <label>النقدية الافتتاحية بالدرج (EGP)</label>
              <input className="fs-input" type="number" min="0" step="0.01" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} required />
            </div>
          </div>
          <button className={`pos-action-btn ${openShift ? 'pos-btn-disabled' : 'pos-btn-success'}`} type="submit" disabled={saving || Boolean(openShift)} style={{ width: '100%' }}>
            {saving ? 'جاري الفتح...' : openShift ? 'يوجد وردية مفتوحة حالياً' : 'تأكيد فتح الوردية'}
          </button>
        </form>

        <form className="pos-form-card" onSubmit={handleCloseShift} style={{ opacity: !openShift ? 0.5 : 1, pointerEvents: !openShift ? 'none' : 'auto' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogOut color={!openShift ? "var(--fs-text-muted)" : "#dc2626"}/> إغلاق الوردية الحالية
          </h2>
          <div className="pos-form-grid" style={{ marginBottom: 24 }}>
            <div className="pos-input-group">
              <label>النقدية المتوقعة بالدرج (Expected)</label>
              <input className="fs-input" type="number" min="0" step="0.01" value={expectedCash} onChange={(event) => setExpectedCash(event.target.value)} required />
            </div>
            <div className="pos-input-group">
              <label>النقدية الفعلية بالدرج (Actual)</label>
              <input className="fs-input" type="number" min="0" step="0.01" value={closingCash} onChange={(event) => setClosingCash(event.target.value)} required />
            </div>
            <div className="pos-input-group" style={{ gridColumn: '1 / -1' }}>
              <label>ملاحظات الإغلاق (سبب العجز / الزيادة إن وجد)</label>
              <textarea className="fs-input" value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} rows={2} />
            </div>
          </div>
          <button className={`pos-action-btn ${!openShift ? 'pos-btn-disabled' : 'pos-btn-danger'}`} type="submit" disabled={saving || !openShift} style={{ width: '100%' }}>
            {saving ? 'جاري الإغلاق...' : !openShift ? 'لا توجد وردية مفتوحة' : 'تأكيد إغلاق الوردية'}
          </button>
        </form>
      </div>

      <div className="pos-table-card">
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
          <UserCheck size={20} color="var(--fs-text-muted)" />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>سجل الورديات (Cashier Shifts)</h3>
        </div>
        <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>الكاشير</th>
              <th style={{ textAlign: 'center' }}>الحالة</th>
              <th style={{ textAlign: 'right' }}>وقت الفتح</th>
              <th style={{ textAlign: 'right' }}>وقت الإغلاق</th>
              <th style={{ textAlign: 'right' }}>العجز / الزيادة</th>
            </tr>
          </thead>
          <tbody>
            {shifts.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا يوجد سجل للورديات</td></tr>
            ) : shifts.map((shift) => (
              <tr key={shift.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--fs-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ color: 'var(--fs-navy)' }}>{shift.cashierName}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`status-badge ${shift.status.toLowerCase()}`}>
                    {shift.status === 'OPEN' ? <Clock size={12} /> : <CheckCircle2 size={12} />} {shift.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}
                  </span>
                </td>
                <td style={{ color: 'var(--fs-text-muted)' }}>{new Date(shift.openedAt).toLocaleString('en-GB')}</td>
                <td style={{ color: 'var(--fs-text-muted)' }}>{shift.closedAt ? new Date(shift.closedAt).toLocaleString('en-GB') : '—'}</td>
                <td>
                  {shift.differenceCents !== null ? (
                    <span style={{ 
                      fontWeight: 800, 
                      color: shift.differenceCents === 0 ? 'var(--fs-text-muted)' : (shift.differenceCents > 0 ? '#16a34a' : '#dc2626') 
                    }}>
                      {shift.differenceCents > 0 ? '+' : ''}{(shift.differenceCents / 100).toFixed(2)} EGP
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pos-table-card">
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
          <History size={20} color="var(--fs-text-muted)" />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>سجل النظام (Audit Log)</h3>
        </div>
        <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>التوقيت</th>
              <th style={{ textAlign: 'right' }}>المستخدم</th>
              <th style={{ textAlign: 'right' }}>العملية</th>
              <th style={{ textAlign: 'right' }}>النظام</th>
              <th style={{ textAlign: 'right', width: '35%' }}>التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا يوجد سجل للعمليات</td></tr>
            ) : auditLogs.slice(0, 50).map((log) => ( // show up to 50 logs for performance
              <tr key={log.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--fs-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ color: 'var(--fs-text-muted)', fontSize: 13 }}>{new Date(log.createdAt).toLocaleString('en-GB')}</td>
                <td>{log.displayName ?? 'System'}</td>
                <td><span style={{ background: 'var(--fs-bg)', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{log.action}</span></td>
                <td>{log.entity}</td>
                <td style={{ color: 'var(--fs-text-muted)' }}>{log.details ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
