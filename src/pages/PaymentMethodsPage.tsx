import { useEffect, useState } from 'react';
import type { PaymentMethodSettings, PaymentMethodSettingsInput, PaymentMethodOption } from '../../shared/payment-methods';
import { useToast } from '../components/ToastProvider';
import { localizeMessage, useI18n } from '../i18n';
import { CreditCard, Smartphone, CheckCircle2, Wallet, Save, Settings2, Activity, Banknote } from 'lucide-react';

export function PaymentMethodsPage() {
  const { locale } = useI18n();
  const { showError, showSuccess } = useToast();
  const tr = (text: string) => localizeMessage(locale, text);
  const [settings, setSettings] = useState<PaymentMethodSettings | null>(null);
  const [options, setOptions] = useState<PaymentMethodOption[]>([]);
  const [form, setForm] = useState<PaymentMethodSettingsInput>({
    vodafoneCashNumber: '', vodafoneCashEnabled: false, instaPayNumber: '', instaPayEnabled: false, visaEnabled: false,
  });
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      const [settingsResult, optionsResult] = await Promise.all([
        window.api.paymentMethods.getSettings(),
        window.api.paymentMethods.listSalesOptions()
      ]);
      setSettings(settingsResult);
      setOptions(optionsResult);
      setForm({
        vodafoneCashNumber: settingsResult.vodafoneCashNumber ?? '',
        vodafoneCashEnabled: settingsResult.vodafoneCashEnabled,
        instaPayNumber: settingsResult.instaPayNumber ?? '',
        instaPayEnabled: settingsResult.instaPayEnabled,
        visaEnabled: settingsResult.visaEnabled,
      });
    } catch (error) {
      showError(tr('Unable to load payment methods.'));
    }
  }

  useEffect(() => { void loadData(); }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await window.api.paymentMethods.updateSettings(form);
      setSettings(result);
      
      const optionsResult = await window.api.paymentMethods.listSalesOptions();
      setOptions(optionsResult);
      
      showSuccess(tr('Payment methods saved successfully.'));
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : tr('Unable to save payment methods.');
      showError(message, tr('Update Failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-content" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <style>{`
        .pm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }
        .pm-card {
          background: #ffffff;
          border: 1px solid var(--fs-border);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          overflow: hidden;
        }
        .pm-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
          border-color: var(--fs-border-soft);
        }
        .pm-card.active {
          border-color: var(--fs-blue);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        }
        .pm-card-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .pm-icon {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: var(--fs-bg);
          color: var(--fs-text-muted);
          transition: all 0.3s ease;
        }
        .pm-card.active .pm-icon {
          background: var(--fs-blue-soft);
          color: var(--fs-blue);
        }
        .pm-card-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--fs-text-main);
          margin: 0;
        }
        .pm-card-desc {
          font-size: 13.5px;
          color: var(--fs-text-muted);
          margin: 4px 0 0;
          line-height: 1.4;
        }
        .pm-toggle {
          margin-left: auto;
          position: relative;
          width: 48px;
          height: 26px;
          background: #cbd5e1;
          border-radius: 99px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .pm-toggle.active {
          background: var(--fs-success-text);
        }
        .pm-toggle::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .pm-toggle.active::after {
          transform: translateX(22px);
        }
        .pm-input-wrapper {
          margin-top: 8px;
          animation: fadeIn 0.3s ease-out;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pm-input-wrapper label {
          font-size: 13px;
          font-weight: 600;
          color: var(--fs-text-main);
        }
        .pm-save-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--fs-card);
          padding: 24px 32px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          margin-bottom: 40px;
          box-shadow: var(--shadow-sm);
        }
        .pm-save-bar p {
          margin: 0;
          color: var(--fs-text-muted);
          font-size: 14px;
        }
        .pm-save-bar strong {
          color: var(--fs-text-main);
        }
        .pm-table-section {
          background: var(--fs-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }
        .pm-table-header {
          padding: 24px 32px;
          border-bottom: 1px solid var(--fs-border-soft);
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fafafa;
        }
        .pm-table-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          color: var(--fs-text-main);
        }
        .pm-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 700;
          background: var(--fs-success-bg);
          color: var(--fs-success-text);
        }
      `}</style>

      <div className="page-heading">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{tr('Administration')}</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)' }}>{tr('Payment Methods')}</h1>
          <p style={{ marginTop: '8px', color: 'var(--fs-text-muted)', fontSize: '15px' }}>{tr('Configure the payment options available at checkout and view active methods.')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="pm-grid">
          {/* Vodafone Cash */}
          <div className={`pm-card ${form.vodafoneCashEnabled ? 'active' : ''}`}>
            <div className="pm-card-header">
              <div className="pm-icon"><Smartphone size={24} /></div>
              <div>
                <h3 className="pm-card-title">{tr('Vodafone Cash')}</h3>
                <p className="pm-card-desc">{tr('Accept mobile wallet payments')}</p>
              </div>
              <div 
                className={`pm-toggle ${form.vodafoneCashEnabled ? 'active' : ''}`} 
                onClick={() => setForm(curr => ({ ...curr, vodafoneCashEnabled: !curr.vodafoneCashEnabled }))}
              />
            </div>
            {form.vodafoneCashEnabled && (
              <div className="pm-input-wrapper">
                <label>{tr('Vodafone Cash Number')}</label>
                <input 
                  className="fs-input" 
                  inputMode="tel" 
                  value={form.vodafoneCashNumber} 
                  onChange={(e) => setForm(curr => ({ ...curr, vodafoneCashNumber: e.target.value }))} 
                  placeholder={tr('e.g. 010XXXXXXXX')} 
                  required 
                />
              </div>
            )}
          </div>

          {/* InstaPay */}
          <div className={`pm-card ${form.instaPayEnabled ? 'active' : ''}`}>
            <div className="pm-card-header">
              <div className="pm-icon"><Banknote size={24} /></div>
              <div>
                <h3 className="pm-card-title">{tr('InstaPay')}</h3>
                <p className="pm-card-desc">{tr('Direct bank transfers instantly')}</p>
              </div>
              <div 
                className={`pm-toggle ${form.instaPayEnabled ? 'active' : ''}`} 
                onClick={() => setForm(curr => ({ ...curr, instaPayEnabled: !curr.instaPayEnabled }))}
              />
            </div>
            {form.instaPayEnabled && (
              <div className="pm-input-wrapper">
                <label>{tr('InstaPay Account / Number')}</label>
                <input 
                  className="fs-input" 
                  value={form.instaPayNumber} 
                  onChange={(e) => setForm(curr => ({ ...curr, instaPayNumber: e.target.value }))} 
                  placeholder={tr('username@instapay or 01XXXXXXXXX')} 
                  required 
                />
              </div>
            )}
          </div>

          {/* Visa / Card */}
          <div className={`pm-card ${form.visaEnabled ? 'active' : ''}`}>
            <div className="pm-card-header">
              <div className="pm-icon"><CreditCard size={24} /></div>
              <div>
                <h3 className="pm-card-title">{tr('Visa / MasterCard')}</h3>
                <p className="pm-card-desc">{tr('Accept credit and debit cards')}</p>
              </div>
              <div 
                className={`pm-toggle ${form.visaEnabled ? 'active' : ''}`} 
                onClick={() => setForm(curr => ({ ...curr, visaEnabled: !curr.visaEnabled }))}
              />
            </div>
          </div>
        </div>

        <div className="pm-save-bar">
          <div>
            {settings && <p>{tr('Last updated')}: <strong>{settings.updatedAt}</strong></p>}
          </div>
          <button className="fs-btn-primary" type="submit" disabled={saving}>
            {saving ? <Settings2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? tr('Saving...') : tr('Save Configuration')}
          </button>
        </div>
      </form>

      <div className="pm-table-section">
        <div className="pm-table-header">
          <Activity size={22} color="var(--fs-blue)" />
          <h3 className="pm-table-title">{tr('Active Payment Methods at Checkout')}</h3>
        </div>
        <div className="table-panel" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>{tr('Method Code')}</th>
                <th>{tr('Display Name')}</th>
                <th>{tr('Associated Number / Account')}</th>
                <th>{tr('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {options.length > 0 ? (
                options.map(opt => (
                  <tr key={opt.id}>
                    <td>
                      <strong style={{ color: 'var(--fs-navy)' }}>{opt.code}</strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
                        {opt.code === 'VODAFONE_CASH' && <Smartphone size={18} color="#e60000" />}
                        {opt.code === 'INSTAPAY' && <Banknote size={18} color="#005b8f" />}
                        {opt.code === 'VISA' && <CreditCard size={18} color="#1a1f71" />}
                        {opt.code === 'CASH' && <Wallet size={18} color="var(--fs-success-text)" />}
                        {tr(opt.name)}
                      </div>
                    </td>
                    <td>
                      {opt.number ? (
                        <span style={{ fontFamily: 'monospace', fontSize: '14px', background: 'var(--fs-bg)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--fs-border-soft)' }}>
                          {opt.number}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--fs-text-muted)', fontSize: '14px', fontStyle: 'italic' }}>{tr('Not applicable')}</span>
                      )}
                    </td>
                    <td>
                      <span className="pm-badge">
                        <CheckCircle2 size={14} /> {tr('Active')}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--fs-text-muted)' }}>
                      <Settings2 size={48} opacity={0.3} />
                      <p style={{ margin: 0, fontSize: '15px' }}>{tr('No active payment methods found.')}<br/>{tr('Enable methods above to use them at checkout.')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}