import { useEffect, useState } from 'react';
import type { DashboardSummary, SalesByDayPoint, TopProductPoint } from '../../shared/reports';
import { useI18n } from '../i18n';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#c89a3d', '#171716', '#777771', '#dcdcd5', '#eadfc7'];

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

      <div className="fs-table-container" style={{ marginTop: 18 }}>
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

      <div className="form-grid" style={{ marginTop: 18 }}>
        <div className="fs-table-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="table-toolbar"><strong>Top selling products (Chart)</strong></div>
          <div style={{ flex: 1, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {topProducts.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 12 }}>No data for chart</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topProducts}
                    dataKey="salesCents"
                    nameKey="productName"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                  >
                    {topProducts.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`$${(Number(value)/100).toFixed(2)}`, 'Sales']}
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--line)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--ink)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="fs-table-container">
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
      </div>
    </section>
  );
}
