import type { PropsWithChildren } from 'react';
import { BarChart3, Bell, Boxes, ClipboardList, CreditCard, LayoutDashboard, LogOut, PackageSearch, Search, Settings, ShoppingCart, Users, WalletCards } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { SessionUser, SupportedLocale } from '../../shared/api';
import { useI18n } from '../i18n';

interface AppShellProps extends PropsWithChildren {
  appName: string;
  logoDataUrl: string | null;
  session: SessionUser;
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  onLogout: () => void;
}

const navigation = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/' },
  { key: 'sales', icon: ShoppingCart, path: '/sales' },
  { key: 'returns', icon: ClipboardList, path: '/returns' },
  { key: 'inventory', icon: Boxes, path: '/inventory' },
  { key: 'stockAdjustments', icon: Boxes, path: '/inventory-adjustments' },
  { key: 'purchases', icon: ClipboardList, path: '/purchases' },
  { key: 'purchaseReturns', icon: ClipboardList, path: '/purchase-returns' },
  { key: 'customers', icon: Users, path: '/customers' },
  { key: 'suppliers', icon: PackageSearch, path: '/suppliers' },
  { key: 'treasury', icon: WalletCards, path: '/treasury' },
  { key: 'reports', icon: BarChart3, path: '/reports' },
  { key: 'operations', icon: ClipboardList, path: '/operations' },
];

export function AppShell({ appName, logoDataUrl, session, locale, onLocaleChange, onLogout, children }: AppShellProps) {
  const { t } = useI18n();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          {logoDataUrl ? <img className="brand-logo" src={logoDataUrl} alt="Company logo" /> : <div className="brand-mark">ف</div>}
          <div><p className="brand-name">{appName}</p><p className="brand-caption">FAHMY STEEL</p></div>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">{t('workspace')}</p>
          {navigation.filter(({ path }) => session.role === 'ADMIN' || ['/sales', '/returns', '/customers'].includes(path)).map(({ key, icon: Icon, path }) => (
            <NavLink key={path} to={path} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{t(key as Parameters<typeof t>[0])}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          
          {session.role === 'ADMIN' && <>
            <NavLink to="/accounts" className="nav-item"><Users size={18} strokeWidth={1.8} /><span>{t('accounts')}</span></NavLink>
            <NavLink to="/settings" className="nav-item"><Settings size={18} strokeWidth={1.8} /><span>{t('settings')}</span></NavLink>
            <NavLink to="/payment-methods" className="nav-item"><CreditCard size={18} strokeWidth={1.8} /><span>{t('paymentMethods')}</span></NavLink>
          </>}
          <button type="button" className="nav-item sidebar-logout" onClick={onLogout}><LogOut size={18} strokeWidth={1.8} /><span>{t('logout')}</span></button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>{t('workspace')}</span><span className="breadcrumb-separator">/</span><strong>{t('overview')}</strong></div>
          <div className="topbar-center">
            <div className="search-bar">
              <Search size={18} strokeWidth={2} />
              <input type="text" placeholder={locale === 'ar' ? 'بحث سريع عن فاتورة أو عميل أو صنف...' : 'Quick search...'} />
            </div>
          </div>
          <div className="topbar-actions">
            <div className="lang-switch">
              <button type="button" className={locale === 'en' ? 'active' : ''} onClick={() => onLocaleChange('en')}>EN</button>
              <button type="button" className={locale === 'ar' ? 'active' : ''} onClick={() => onLocaleChange('ar')}>عربي</button>
            </div>
            <button className="icon-btn" aria-label="Notifications" type="button">
              <Bell size={18} />
            </button>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}