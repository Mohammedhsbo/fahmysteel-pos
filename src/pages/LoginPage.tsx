import { FormEvent, useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import type { AuthState, SessionUser } from '../../shared/api';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

interface LoginPageProps {
  authState: AuthState;
  onAuthenticated: (session: SessionUser) => void;
}

export function LoginPage({ authState, onAuthenticated }: LoginPageProps) {
  const { t } = useI18n();
  const { showError } = useToast();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSetup = authState.requiresSetup;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const session = isSetup
        ? await window.api.auth.bootstrapAdmin(username, displayName, password)
        : await window.api.auth.login(username, password);
      onAuthenticated(session);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : 'Unable to authenticate.';
      setError(message);
      showError(message, 'Unable to authenticate.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand"><span>FS</span><strong>Fahmy Steel</strong></div>
        <div className="auth-heading">
          <div className="auth-icon"><LockKeyhole size={21} /></div>
          <p className="eyebrow">{t('secureLocalAccess')}</p>
          <h1>{isSetup ? t('createAdministrator') : t('welcomeBack')}</h1>
          <p>{isSetup ? t('setupAdmin') : t('signInContinue')}</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>{t('username')}<input className="fs-input" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} /></label>
          {isSetup && <label>{t('displayName')}<input className="fs-input" autoComplete="name" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
          <label>{t('password')}<input className="fs-input" type="password" autoComplete={isSetup ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="fs-btn-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? t('checking') : isSetup ? t('createAccount') : t('signIn')}</button>
        </form>
        <div className="auth-note"><ShieldCheck size={15} /><span>{t('credentialsLocal')}</span></div>
      </section>
    </main>
  );
}
