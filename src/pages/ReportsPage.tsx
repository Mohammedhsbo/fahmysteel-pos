import { useEffect, useState } from 'react';
import type { DashboardSummary, SalesByDayPoint, TopProductPoint } from '../../shared/reports';
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

export function ReportsPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [salesByDay, setSalesByDay] = useState<SalesByDayPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductPoint[]>([]);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void loadReports();
  }, []);

  async function loadReports() {
    try {
      const [dashboardSummary, byDay, products] = await Promise.all([
        window.api.reports.getDashboardSummary(),
        window.api.reports.getSalesByDay(7),
        window.api.reports.getTopProducts(5),
      ]);
      setSummary(dashboardSummary);
      setSalesByDay(byDay);
      setTopProducts(products);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Unable to load reports.');
    }
  }

  async function handleExport() {
    setError('');
    setExporting(true);
    try {
      await window.api.reports.exportCsv();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export reports.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>{t('reports')}</h1>
        </div>
        <button className="quiet-button" type="button" onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <div className="metric-grid">
        <article className="metric-card"><div className="metric-icon">$</div><div><p>Sales</p><strong>{summary.salesTotalCents}</strong><span>Total invoiced</span></div></article>
        <article className="metric-card"><div className="metric-icon">P</div><div><p>Purchases</p><strong>{summary.purchasesTotalCents}</strong><span>Inventory bought</span></div></article>
        <article className="metric-card"><div className="metric-icon">E</div><div><p>Expenses</p><strong>{summary.expensesTotalCents}</strong><span>Operational costs</span></div></article>
      </div>

      <div className="metric-grid" style={{ marginTop: 16 }}>
        <article className="metric-card"><div className="metric-icon">I</div><div><p>Inventory value</p><strong>{summary.inventoryValueCents}</strong><span>Stock on hand</span></div></article>
        <article className="metric-card"><div className="metric-icon">C</div><div><p>Customers</p><strong>{summary.activeCustomers}</strong><span>Active records</span></div></article>
        <article className="metric-card"><div className="metric-icon">S</div><div><p>Suppliers</p><strong>{summary.activeSuppliers}</strong><span>Active records</span></div></article>
      </div>

      <div className="table-panel" style={{ marginTop: 18 }}>
        <div className="table-toolbar"><strong>Sales by day (last 7 days)</strong></div>
        <table>
          <thead>
            <tr><th>Date</th><th>Total</th></tr>
          </thead>
          <tbody>
            {salesByDay.length === 0 ? (<tr><td colSpan={2}>No sales recorded yet.</td></tr>) : salesByDay.map((point) => (
              <tr key={point.date}><td>{point.date}</td><td>{point.totalCents}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-panel" style={{ marginTop: 18 }}>
        <div className="table-toolbar"><strong>Top selling products</strong></div>
        <table>
          <thead>
            <tr><th>Product</th><th>Qty</th><th>Sales</th></tr>
          </thead>
          <tbody>
            {topProducts.length === 0 ? (<tr><td colSpan={3}>No sales items available.</td></tr>) : topProducts.map((product) => (
              <tr key={product.productName}><td>{product.productName}</td><td>{product.totalQuantity}</td><td>{product.salesCents}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
