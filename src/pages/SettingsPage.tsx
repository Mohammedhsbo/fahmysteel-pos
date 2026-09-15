import { useEffect, useState } from 'react';
import type { AppSetting } from '../../shared/admin';
import type { BackupRecord } from '../../shared/backups';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';
import { Settings, Save, HardDriveDownload, ArchiveRestore, AlertCircle, Database, Building2 } from 'lucide-react';

interface SettingsPageProps {
  onBrandingSaved: () => Promise<void>;
}

export function SettingsPage({ onBrandingSaved }: SettingsPageProps) {
  const { t } = useI18n();
  const { showError, showSuccess } = useToast();
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
    reader.onload = () => {
      setCompanyLogo(typeof reader.result === 'string' ? reader.result : null);
      setError('');
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateBackup() {
    setError('');
    setBackupBusy(true);
    try {
      await window.api.backups.createBackup();
      await loadSettings();
      showSuccess('Backup created successfully.');
    } catch (backupError) {
      const message = backupError instanceof Error ? backupError.message : 'Unable to create backup.';
      setError(message);
      showError(message, 'Backup Failed');
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
      showError(message, 'Restore Failed');
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
      showSuccess('Settings updated successfully.');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save settings.';
      setError(message);
      showError(message, 'Save Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-content pos-container">
      <style>{`
        .pos-container { max-width: 1000px; margin: 0 auto; padding-bottom: 60px; }
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
        }

        .pos-table-card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.06);
          overflow: hidden;
          margin-bottom: 32px;
        }

        .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-size: 14px; font-weight: 700; color: var(--fs-text-main); }
        .fs-input { padding: 14px 16px; border: 1px solid var(--fs-border); background: #fafafa; border-radius: var(--radius-sm); font-size: 15px; outline: none; transition: all 0.2s; }
        .fs-input:focus { border-color: var(--fs-blue); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); background: #fff; }

        .branding-field { display: flex; flex-direction: column; gap: 12px; }
        .branding-field > span { font-size: 14px; font-weight: 700; color: var(--fs-text-main); }
        
        .logo-picker { display: flex; align-items: center; gap: 24px; padding: 20px; border: 1px dashed var(--fs-border); border-radius: var(--radius-md); background: #fafafa; }
        .logo-preview { display: grid; place-items: center; width: 80px; height: 80px; overflow: hidden; background: #fff; border: 1px solid var(--fs-border); color: var(--fs-blue); font-size: 32px; font-weight: 800; border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); }
        .logo-preview img { width: 100%; height: 100%; object-fit: contain; }
        
        .logo-picker-actions { display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .logo-picker-buttons { display: flex; gap: 12px; }
        .logo-upload-button { position: relative; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; border-radius: 99px; background: var(--fs-text-main); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .logo-upload-button:hover { background: var(--fs-navy); transform: translateY(-1px); }
        .logo-upload-button input { position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer; opacity: 0; }
        
        .remove-logo-btn { background: transparent; border: 1px solid var(--fs-border); color: var(--fs-danger-text); padding: 10px 20px; border-radius: 99px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .remove-logo-btn:hover { background: var(--fs-danger-bg); border-color: #fecaca; }

        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 16px 24px; text-align: left; }
        th { font-size: 13px; font-weight: 700; color: var(--fs-text-muted); text-transform: uppercase; letter-spacing: 0.05em; background: #fafafa; border-bottom: 1px solid var(--fs-border-soft); }
        td { font-size: 14.5px; font-weight: 600; color: var(--fs-text-main); border-bottom: 1px solid var(--fs-border-soft); }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background-color: #f8fafc; }
        
        [dir='rtl'] th, [dir='rtl'] td { text-align: right; }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>System Configuration</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={24} color="var(--fs-blue)" />
            {t('settings')}
          </h1>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px' }}>Configure branding, system variables, and offline backups.</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--fs-danger-bg)', color: 'var(--fs-danger-text)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={18}/> {error}
        </div>
      )}

      <div className="pos-form-card">
        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building2 color="var(--fs-blue)"/> Brand Identity
        </h2>
        
        <form onSubmit={handleSave}>
          <div className="settings-grid">
            <div className="form-group">
              <label>Company Name</label>
              <input 
                className="fs-input" 
                value={companyName} 
                onChange={(event) => setCompanyName(event.target.value)} 
                placeholder="e.g. Fahmy Steel"
              />
            </div>
            
            <div className="branding-field">
              <span>Company Logo</span>
              <div className="logo-picker">
                <div className="logo-preview">
                  {companyLogo ? <img src={companyLogo} alt="Company logo preview" /> : <span>ف</span>}
                </div>
                <div className="logo-picker-actions">
                  <div className="logo-picker-buttons">
                    <label className="logo-upload-button">
                      Choose Image
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} />
                    </label>
                    {companyLogo && (
                      <button className="remove-logo-btn" type="button" onClick={() => setCompanyLogo(null)}>
                        Remove
                      </button>
                    )}
                  </div>
                  <small style={{ color: 'var(--fs-text-muted)', fontSize: 13 }}>PNG, JPG or WebP up to 2 MB</small>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', paddingTop: 24, borderTop: '1px solid var(--fs-border-soft)' }}>
            <button className="pos-action-btn pos-btn-primary" type="submit" disabled={saving}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      <div className="pos-table-card">
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Database size={20} color="var(--fs-text-muted)" />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>System Variables (Advanced)</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.key}>
                <td style={{ fontFamily: 'monospace', color: 'var(--fs-text-muted)' }}>{setting.key}</td>
                <td>{setting.value}</td>
                <td style={{ color: 'var(--fs-text-muted)' }}>{setting.updatedAt}</td>
              </tr>
            ))}
            {settings.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: 'var(--fs-text-muted)' }}>
                  No system variables found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pos-table-card">
        <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <HardDriveDownload size={20} color="var(--fs-text-muted)" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>Offline Backups</h3>
          </div>
          <button className="pos-action-btn pos-btn-secondary" style={{ padding: '8px 16px', fontSize: 14 }} type="button" onClick={() => void handleCreateBackup()} disabled={backupBusy}>
            <Save size={16} /> {backupBusy ? 'Working...' : 'Create Local Backup'}
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>File Name</th>
              <th>Created Date</th>
              <th>File Size</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((backup) => (
              <tr key={backup.id}>
                <td style={{ fontFamily: 'monospace', color: 'var(--fs-text-muted)' }}>{backup.fileName}</td>
                <td>{backup.createdAt}</td>
                <td>{Math.ceil(backup.sizeBytes / 1024)} KB</td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    className="pos-action-btn pos-btn-secondary" 
                    style={{ padding: '8px 16px', fontSize: 13, border: '1px solid #bfdbfe', color: 'var(--fs-blue)' }} 
                    type="button" 
                    onClick={() => void handleRestoreBackup(backup)} 
                    disabled={backupBusy}
                  >
                    <ArchiveRestore size={16} /> Restore Data
                  </button>
                </td>
              </tr>
            ))}
            {backups.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--fs-text-muted)' }}>
                  <HardDriveDownload size={32} style={{ marginBottom: 16, opacity: 0.5 }} />
                  <div>No local backups have been created yet.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
