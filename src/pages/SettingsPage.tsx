import { useEffect, useState } from 'react';
import type { AppSetting } from '../../shared/admin';
import type { BackupRecord } from '../../shared/backups';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

interface SettingsPageProps {
  onBrandingSaved: () => Promise<void>;
}

export function SettingsPage({ onBrandingSaved }: SettingsPageProps) {
  const { t } = useI18n();
  const { showError } = useToast();
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [companyName, setCompanyName] = useState('Fahmy Steel');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadSettings() {
    const [records, backupRecords] = await Promise.all([
      window.api.admin.listSettings(),
      window.api.backups.listBackups(),
    ]);
    setSettings(records.filter((entry) => entry.key !== 'workday_start'));
    setBackups(backupRecords);
    const company = records.find((entry) => entry.key === 'company_name');
    const logo = records.find((entry) => entry.key === 'company_logo');
    if (company) setCompanyName(company.value);
    setCompanyLogo(logo?.value || null);
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCompanyLogo(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function handleCreateBackup() {
    setError('');
    setBackupBusy(true);
    try {
      await window.api.backups.createBackup();
      await loadSettings();
    } catch (backupError) {
      const message = backupError instanceof Error ? backupError.message : 'Unable to create backup.';
      setError(message);
      showError(message, 'Unable to create backup.');
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
      const message = restoreError instanceof Error ? restoreError.message : 'Unable to restore backup.';
      setError(message);
      showError(message, 'Unable to restore backup.');
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
      await window.api.admin.setSetting('company_logo', companyLogo ?? '');
      await loadSettings();
      await onBrandingSaved();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save settings.';
      setError(message);
      showError(message, 'Unable to save settings.');
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
          <div className="branding-field">
            <span>Company logo</span>
            <div className="logo-picker">
              <div className="logo-preview">
                {companyLogo ? <img src={companyLogo} alt="Company logo preview" /> : <span>ف</span>}
              </div>
              <div className="logo-picker-actions">
                <label className="fs-btn-secondary logo-upload-button">Choose image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} /></label>
                {companyLogo && <button className="quiet-button" type="button" onClick={() => setCompanyLogo(null)}>Remove logo</button>}
                <small>PNG, JPG or WebP up to 2 MB</small>
              </div>
            </div>
          </div>
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
