import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LineChart, BarChart, PieChart as PieChartIcon, Download, DollarSign, ShoppingCart, Activity, Package, Users, Store } from 'lucide-react';
import type { DashboardSummary, SalesByDayPoint, TopProductPoint } from '../../shared/reports';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';

const COLORS = ['#2563eb', '#1D2730', '#7a8691', '#e2e8f0', '#cbd5e1'];

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
  return `${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

export function ReportsPage() {
  const { t } = useI18n();
  const { showError, showSuccess } = useToast();
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
      const message = reportError instanceof Error ? reportError.message : 'Unable to load reports.';
      setError(message);
      showError(message, 'Unable to load reports.');
    }
  }

  async function handleExport() {
    setError('');
    setExporting(true);
    try {
      await window.api.reports.exportCsv();
      showSuccess('تم التصدير بنجاح (CSV Exported)');
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : 'Unable to export reports.';
      setError(message);
      showError(message, 'Unable to export reports.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="page-content pos-container">
      <style>{`
        .pos-container { max-width: 1200px; margin: 0 auto; padding-bottom: 60px; }
        .pos-header-flex { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 0; gap: 6px; }
        .pos-action-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 99px; font-weight: 700; font-size: 14.5px; transition: all 0.2s; cursor: pointer; border: 0; }
        .pos-btn-secondary { background: #fff; color: var(--fs-text-main); border: 1px solid var(--fs-border); box-shadow: var(--shadow-sm); }
        .pos-btn-secondary:hover:not(:disabled) { background: var(--fs-bg); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        
        .metric-cards-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 24px; }
        .dashboard-metric {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.06);
          padding: 32px;
          display: flex;
          align-items: flex-start;
          gap: 24px;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dashboard-metric:hover { transform: translateY(-4px); }
        .metric-icon-wrap { padding: 18px; border-radius: 24px; display: flex; align-items: center; justify-content: center; }
        .metric-icon-wrap.sky { background: #f0f9ff; color: #0ea5e9; }
        .metric-icon-wrap.blue { background: #eff6ff; color: #2563eb; }
        .metric-icon-wrap.red { background: #fef2f2; color: #dc2626; }
        .metric-icon-wrap.green { background: #f0fdf4; color: #16a34a; }
        .metric-icon-wrap.purple { background: #faf5ff; color: #9333ea; }
        .metric-icon-wrap.slate { background: #f8fafc; color: #475569; }
        .metric-content p { margin: 0 0 8px 0; color: var(--fs-text-muted); font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .metric-content h2 { margin: 0 0 8px 0; font-size: 30px; font-weight: 800; color: var(--fs-navy); letter-spacing: -0.02em; }
        .metric-content span { font-size: 13px; color: var(--fs-text-muted); }

        .pos-table-card {
          background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--fs-border);
          box-shadow: 0 4px 15px -3px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column;
        }
        .pos-cart-table th { background: #f8fafc; font-weight: 700; color: var(--fs-text-muted); padding: 16px 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--fs-border-soft); }
        .pos-cart-table td { padding: 16px 20px; font-size: 14.5px; font-weight: 600; border-bottom: 1px solid var(--fs-border-soft); }
        .pos-cart-table tr:last-child td { border-bottom: none; }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Analytics & Reports</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LineChart size={24} color="var(--fs-blue)" />
            التقارير (Reports)
          </h1>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px' }}>تحليل شامل لأداء النظام المالي وحركة المخزون</p>
        </div>
        <button className="pos-action-btn pos-btn-secondary" type="button" onClick={() => void handleExport()} disabled={exporting}>
          <Download size={18} /> {exporting ? 'جاري التصدير...' : 'تصدير البيانات (CSV)'}
        </button>
      </div>

      {error && <div style={{ background: 'var(--fs-danger-bg)', color: 'var(--fs-danger-text)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontWeight: 600 }}>{error}</div>}

      <div className="metric-cards-container">
        <article className="dashboard-metric">
          <div className="metric-icon-wrap sky"><DollarSign size={32} /></div>
          <div className="metric-content">
            <p>إجمالي المبيعات (Sales)</p>
            <h2>{formatMoney(summary.salesTotalCents)}</h2>
            <span>مبيعات مسجلة في النظام</span>
          </div>
        </article>
        <article className="dashboard-metric">
          <div className="metric-icon-wrap blue"><ShoppingCart size={32} /></div>
          <div className="metric-content">
            <p>إجمالي المشتريات (Purchases)</p>
            <h2>{formatMoney(summary.purchasesTotalCents)}</h2>
            <span>تكلفة المخزون المشترى</span>
          </div>
        </article>
        <article className="dashboard-metric">
          <div className="metric-icon-wrap red"><Activity size={32} /></div>
          <div className="metric-content">
            <p>إجمالي المصروفات (Expenses)</p>
            <h2>{formatMoney(summary.expensesTotalCents)}</h2>
            <span>مصروفات تشغيلية مسجلة</span>
          </div>
        </article>
      </div>

      <div className="metric-cards-container">
        <article className="dashboard-metric">
          <div className="metric-icon-wrap green"><Package size={32} /></div>
          <div className="metric-content">
            <p>قيمة المخزون (Inventory Value)</p>
            <h2>{formatMoney(summary.inventoryValueCents)}</h2>
            <span>قيمة المخزون المتاح ({summary.totalProducts} صنف)</span>
          </div>
        </article>
        <article className="dashboard-metric">
          <div className="metric-icon-wrap purple"><Users size={32} /></div>
          <div className="metric-content">
            <p>العملاء (Customers)</p>
            <h2>{summary.activeCustomers}</h2>
            <span>عملاء مسجلين بنشاط</span>
          </div>
        </article>
        <article className="dashboard-metric">
          <div className="metric-icon-wrap slate"><Store size={32} /></div>
          <div className="metric-content">
            <p>الموردين (Suppliers)</p>
            <h2>{summary.activeSuppliers}</h2>
            <span>موردين مسجلين بنشاط</span>
          </div>
        </article>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginTop: 8 }}>
        <div className="pos-table-card">
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
            <BarChart size={20} color="var(--fs-text-muted)" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>المبيعات حسب اليوم (آخر 7 أيام)</h3>
          </div>
          <div style={{ flex: 1, padding: '16px 0' }}>
            <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr><th style={{ textAlign: 'right' }}>التاريخ</th><th style={{ textAlign: 'left' }}>الإجمالي</th></tr>
              </thead>
              <tbody>
                {salesByDay.length === 0 ? (<tr><td colSpan={2} style={{ textAlign: 'center', color: '#7a8691', padding: '40px 0' }}>لا توجد مبيعات مسجلة بعد</td></tr>) : salesByDay.map((point) => (
                  <tr key={point.date} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--fs-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ fontWeight: 700, color: 'var(--fs-navy)' }}>{point.date}</td>
                    <td style={{ textAlign: 'left', fontWeight: 800 }}>{formatMoney(point.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pos-table-card">
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--fs-border-soft)', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
            <PieChartIcon size={20} color="var(--fs-text-muted)" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--fs-text-main)' }}>أكثر المنتجات مبيعاً (Top Products)</h3>
          </div>
          <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {topProducts.length === 0 ? (
                <p style={{ color: 'var(--fs-text-muted)', fontSize: 13 }}>لا توجد بيانات متاحة للمخطط</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topProducts}
                      dataKey="salesCents"
                      nameKey="productName"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={5}
                      stroke="none"
                    >
                      {topProducts.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [formatMoney(Number(value)), 'قيمة المبيعات']}
                      contentStyle={{ borderRadius: 12, border: '1px solid var(--fs-border)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} 
                      itemStyle={{ fontWeight: 700 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 13, fontWeight: 600, color: 'var(--fs-text-main)', marginTop: 20 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <div style={{ marginTop: 'auto' }}>
              <table className="pos-cart-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', marginTop: 24 }}>
                <thead>
                  <tr><th style={{ textAlign: 'right', padding: '12px' }}>المنتج</th><th style={{ textAlign: 'center', padding: '12px' }}>الكمية</th><th style={{ textAlign: 'left', padding: '12px' }}>المبيعات</th></tr>
                </thead>
                <tbody>
                  {topProducts.length === 0 ? (<tr><td colSpan={3} style={{ textAlign: 'center' }}>لا توجد أصناف مباعة.</td></tr>) : topProducts.map((product) => (
                    <tr key={product.productName}>
                      <td style={{ padding: '12px' }}>{product.productName}</td>
                      <td style={{ textAlign: 'center', padding: '12px' }}><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 99, fontSize: 12 }}>{product.totalQuantity}</span></td>
                      <td style={{ textAlign: 'left', padding: '12px', fontWeight: 700, color: 'var(--fs-blue)' }}>{formatMoney(product.salesCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
