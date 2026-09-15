import { useEffect, useMemo, useState } from 'react';
import type { AuditLogRecord, CashierShiftRecord } from '../../shared/operations';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

export function OperationsPage() {
  const { t } = useI18n();
  const { showError } = useToast();
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
      await loadData();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to open shift.';
      setError(message);
      showError(message, 'Unable to open shift.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseShift() {
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
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>{t('operations')}</h1>
          <p className="heading-copy">Track local cashier sessions and the activity trail kept in SQLite.</p>
        </div>
      </div>

      <form className="panel-form" onSubmit={handleOpenShift}>
        <div className="form-grid">
          <label>Opening cash (EGP)<input className="fs-input" type="number" min="0" step="0.01" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} /></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="fs-btn-primary" type="submit" disabled={saving || Boolean(openShift)}>{saving ? 'Saving...' : openShift ? 'Shift already open' : 'Open cashier shift'}</button>
      </form>

      <div className="panel-form">
        <div className="form-grid">
          <label>Closing cash (EGP)<input className="fs-input" type="number" min="0" step="0.01" value={closingCash} onChange={(event) => setClosingCash(event.target.value)} /></label>
          <label>Expected cash (EGP)<input className="fs-input" type="number" min="0" step="0.01" value={expectedCash} onChange={(event) => setExpectedCash(event.target.value)} /></label>
          <label className="full-width">Closing notes<textarea className="fs-input" value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} /></label>
        </div>
        <button className="fs-btn-primary" type="button" onClick={() => void handleCloseShift()} disabled={saving || !openShift}>{saving ? 'Closing...' : openShift ? 'Close cashier shift' : 'No open shift'}</button>
      </div>

      <div className="fs-table-container">
        <div className="table-toolbar"><strong>Cashier shifts</strong></div>
        <table>
          <thead>
            <tr>
              <th>Cashier</th>
              <th>Status</th>
              <th>Opened</th>
              <th>Closed</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td>{shift.cashierName}</td>
                <td>{shift.status}</td>
                <td>{shift.openedAt}</td>
                <td>{shift.closedAt ?? '—'}</td>
                <td>{shift.differenceCents !== null ? `${(shift.differenceCents / 100).toFixed(2)} EGP` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="fs-table-container">
        <div className="table-toolbar"><strong>Audit log</strong></div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.createdAt}</td>
                <td>{log.displayName ?? 'System'}</td>
                <td>{log.action}</td>
                <td>{log.entity}</td>
                <td>{log.details ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
