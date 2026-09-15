import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { AppInfo, AuthState, SessionUser, SupportedLocale } from '../shared/api';
import { ToastProvider } from './components/ToastProvider';
import { I18nProvider } from './i18n';
import { AccountManagementPage } from './pages/AccountManagementPage';
import { AppShell } from './layouts/AppShell';
import { CatalogPage } from './pages/CatalogPage';
import { CustomersPage } from './pages/CustomersPage';
import { InventoryAdjustmentsPage } from './pages/InventoryAdjustmentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { OperationsPage } from './pages/OperationsPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { PurchaseReturnsPage } from './pages/PurchaseReturnsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { SalesPage } from './pages/SalesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { TreasuryPage } from './pages/TreasuryPage';

export default function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [locale, setLocale] = useState<SupportedLocale>(() => localStorage.getItem('fahmy-steel-locale') === 'ar' ? 'ar' : 'en');

  useEffect(() => {
    void Promise.all([window.api.getAppInfo(), window.api.auth.getState()]).then(([info, state]) => {
      setAppInfo(info);
      setAuthState(state);
      if (!localStorage.getItem('fahmy-steel-locale')) setLocale(info.locale);
    });
  }, []);

  function handleAuthenticated(session: SessionUser) {
    setAuthState({ session, requiresSetup: false });
  }

  function handleLocaleChange(nextLocale: SupportedLocale) {
    setLocale(nextLocale);
    localStorage.setItem('fahmy-steel-locale', nextLocale);
  }

  async function refreshAppInfo() {
    setAppInfo(await window.api.getAppInfo());
  }

  function handleLogout() {
    void window.api.auth.logout().then(() => {
      setAuthState((current) => current ? { ...current, session: null } : current);
    });
  }

  const isAdmin = authState?.session?.role === 'ADMIN';

  const content = (() => {
    if (!authState) return <div className="auth-loading">Loading secure workspace...</div>;
    if (!authState.session) return <LoginPage authState={authState} onAuthenticated={handleAuthenticated} />;

    return (
      <div className="app-root" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <HashRouter>
          <AppShell
            appName={appInfo?.name ?? 'Fahmy Steel'}
            logoDataUrl={appInfo?.logoDataUrl ?? null}
            session={authState.session}
            locale={locale}
            onLocaleChange={handleLocaleChange}
            onLogout={handleLogout}
          >
            <Routes>
              {isAdmin && <Route path="/" element={<DashboardPage />} />}
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              {isAdmin && <>
                <Route path="/purchases" element={<PurchasesPage />} />
                <Route path="/purchase-returns" element={<PurchaseReturnsPage />} />
                <Route path="/inventory" element={<CatalogPage />} />
                <Route path="/inventory-adjustments" element={<InventoryAdjustmentsPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/treasury" element={<TreasuryPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/operations" element={<OperationsPage />} />
                <Route path="/accounts" element={<AccountManagementPage />} />
                <Route path="/settings" element={<SettingsPage onBrandingSaved={refreshAppInfo} />} />
              </>}
              <Route path="*" element={<Navigate to={isAdmin ? '/' : '/sales'} replace />} />
            </Routes>
          </AppShell>
        </HashRouter>
      </div>
    );
  })();

  return (
    <I18nProvider locale={locale}>
      <ToastProvider>
        {content}
      </ToastProvider>
    </I18nProvider>
  );
}
