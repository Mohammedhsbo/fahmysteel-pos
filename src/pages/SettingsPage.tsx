import { useEffect, useState } from 'react';
import type { AppSetting } from '../../shared/admin';
import type { BackupRecord } from '../../shared/backups';
import { useI18n } from '../i18n';

export function SettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [companyName, setCompanyName] = useState('Fahmy Steel');
  const [workdayStart, setWorkdayStart] = useState('08:00');
  const [saving, setSaving] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadSettings() {
    const [records, backupRecords] = await Promise.all([
      window.api.admin.listSettings(),
      window.api.backups.listBackups(),
    ]);
    setSettings(records);
    setBackups(backupRecords);
    const company = records.find((entry) => entry.key === 'company_name');
    const workday = records.find((entry) => entry.key === 'workday_start');
    if (company) setCompanyName(company.value);
    if (workday) setWorkdayStart(workday.value);
  }

  async function handleCreateBackup() {
    setError('');
    setBackupBusy(true);
    try {
      await window.api.backups.createBackup();
      await loadSettings();
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : 'Unable to create backup.');
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleRestoreBackup(backup: BackupRecord) {
    if (!window.confirm(`Restore ${backup.fileName}? The current local database will be replaced.`)) return;
    setError('');
    setBackupBusy(true);
    try {
      await window.api.backups.restoreBackup(backup.id);
      window.location.reload();
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Unable to restore backup.');
    } finally {
      setBackupBusy(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await window.api.admin.setSetting('company_name', companyName);
      await window.api.admin.setSetting('workday_start', workdayStart);
      await loadSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>{t('settings')}</h1>
          <p className="heading-copy">Configure the local POS workspace for your steel operations.</p>
        </div>
      </div>

      <form className="panel-form" onSubmit={handleSave}>
        <div className="form-grid">
          <label>Company name<input className="fs-input" value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></label>
          <label>Workday start<input className="fs-input" value={workdayStart} onChange={(event) => setWorkdayStart(event.target.value)} /></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="fs-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button>
      </form>

      <div className="fs-table-container">
        <div className="table-toolbar"><strong>Saved values</strong></div>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.key}>
                <td>{setting.key}</td>
                <td>{setting.value}</td>
                <td>{setting.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="fs-table-container">
        <div className="table-toolbar">
          <strong>Offline backups</strong>
          <button className="fs-btn-secondary" type="button" onClick={() => void handleCreateBackup()} disabled={backupBusy}>
            {backupBusy ? 'Working...' : 'Create backup'}
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Created</th>
              <th>Size</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((backup) => (
              <tr key={backup.id}>
                <td>{backup.fileName}</td>
                <td>{backup.createdAt}</td>
                <td>{Math.ceil(backup.sizeBytes / 1024)} KB</td>
                <td>
                  <button className="fs-btn-secondary" type="button" onClick={() => void handleRestoreBackup(backup)} disabled={backupBusy}>
                    Restore
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
