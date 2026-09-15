import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { localizeMessage, useI18n } from '../i18n';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  description: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (payload: { title?: string; description: string; variant?: ToastVariant }) => void;
  showError: (description: string, fallbackMessage?: string) => void;
  showSuccess: (description: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
  const { locale } = useI18n();
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((payload: { title?: string; description: string; variant?: ToastVariant }) => {
    const { title, description, variant = 'info' } = payload;
    const localizedDescription = localizeMessage(locale, description);
    const localizedTitle = title ? localizeMessage(locale, title) : variant === 'error'
      ? (locale === 'ar' ? 'خطأ' : 'Error')
      : variant === 'success'
        ? (locale === 'ar' ? 'نجاح' : 'Success')
        : (locale === 'ar' ? 'معلومة' : 'Info');

    const nextToast: ToastItem = {
      id: Date.now() + Math.random(),
      title: localizedTitle,
      description: localizedDescription,
      variant,
    };

    setItems((current) => [nextToast, ...current].slice(0, 4));
    window.setTimeout(() => dismiss(nextToast.id), 4200);
  }, [dismiss, locale]);

  const showError = useCallback((description: string, fallbackMessage?: string) => {
    const nextDescription = description || fallbackMessage || (locale === 'ar' ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.');
    showToast({ title: locale === 'ar' ? 'خطأ' : 'Error', description: nextDescription, variant: 'error' });
  }, [locale, showToast]);

  const showSuccess = useCallback((description: string) => {
    showToast({ title: locale === 'ar' ? 'نجاح' : 'Success', description, variant: 'success' });
  }, [locale, showToast]);

  const contextValue = useMemo<ToastContextValue>(() => ({ showToast, showError, showSuccess }), [showError, showSuccess, showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-root" aria-live="polite" aria-atomic="true">
        {items.map((item) => (
          <div key={item.id} className={`toast-item ${item.variant}`}>
            <div className="toast-icon" aria-hidden="true">
              {item.variant === 'success' && <CheckCircle2 size={18} />}
              {item.variant === 'error' && <AlertCircle size={18} />}
              {item.variant === 'info' && <Info size={18} />}
            </div>
            <div className="toast-copy">
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </div>
            <button type="button" className="toast-close" onClick={() => dismiss(item.id)} aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return context;
}
