import { useEffect, useState } from 'react';
import { ArrowUpRight, CircleDollarSign, FileText, PackageSearch } from 'lucide-react';
import type { DashboardSummary } from '../../shared/reports';
import type { TreasuryTransaction } from '../../shared/treasury';
import { useI18n } from '../i18n';

const emptySummary: DashboardSummary = {
  salesTotalCents: 0,
  purchasesTotalCents: 0,
  expensesTotalCents: 0,
  inventoryValueCents: 0,
  activeCustomers: 0,
  activeSuppliers: 0,
  totalProducts: 0,
};

function formatMoney(amountCents: number): string {
  return `${(amountCents / 100).toFixed(2)} EGP`;
}

export function DashboardPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.all([
      window.api.reports.getDashboardSummary(),
      window.api.treasury.listTransactions(),
    ]).then(([dashboardSummary, recentTransactions]) => {
      setSummary(dashboardSummary);
      setTransactions(recentTransactions.slice(0, 6));
    }).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.');
    });
  }, []);

  const today = new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(new Date());

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div><p className="eyebrow">{today}</p><h1>{t('goodMorning')}</h1><p className="heading-copy">{t('liveOverview')}</p></div>
        <button className="quiet-button" type="button" onClick={() => window.location.reload()}><ArrowUpRight size={17} />{t('refresh')}</button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <div className="metric-grid">
        <article className="metric-card"><div className="metric-icon"><CircleDollarSign size={19} /></div><div><p>{t('salesTotal')}</p><strong>{formatMoney(summary.salesTotalCents)}</strong></div></article>
        <article className="metric-card"><div className="metric-icon"><PackageSearch size={19} /></div><div><p>{t('inventoryValue')}</p><strong>{formatMoney(summary.inventoryValueCents)}</strong><span>{summary.totalProducts} active products</span></div></article>
        <article className="metric-card"><div className="metric-icon"><FileText size={19} /></div><div><p>{t('treasuryFlow')}</p><strong>{transactions.length}</strong><span>{t('recentTreasuryActivity')}</span></div></article>
      </div>
      <div className="table-panel" style={{ marginTop: 18 }}>
        <div className="table-toolbar"><strong>{t('recentTreasuryActivity')}</strong></div>
        <table>
          <thead><tr><th>Type</th><th>Direction</th><th>Amount</th><th>Description</th></tr></thead>
          <tbody>
            {transactions.length === 0 ? <tr><td colSpan={4}>{t('noTreasuryActivity')}</td></tr> : transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.transactionType}</td>
                <td>{transaction.direction}</td>
                <td>{formatMoney(transaction.amountCents)}</td>
                <td>{transaction.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}