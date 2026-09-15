import { useEffect, useState } from 'react';
import { ArrowUpRight, CircleDollarSign, FileText, PackageSearch, Users, Briefcase, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import type { DashboardSummary, SalesByDayPoint, TopProductPoint } from '../../shared/reports';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

export function DashboardPage() {
  const { t } = useI18n();
  const { showError } = useToast();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [salesByDay, setSalesByDay] = useState<SalesByDayPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductPoint[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.all([
      window.api.reports.getDashboardSummary(),
      window.api.reports.getSalesByDay(7),
      window.api.reports.getTopProducts(5)
    ]).then(([dashboardSummary, salesHistory, top]) => {
      setSummary(dashboardSummary);
      setSalesByDay(salesHistory);
      setTopProducts(top);
    }).catch((loadError) => {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load dashboard.';
      setError(message);
      showError(message, 'Unable to load dashboard.');
    });
  }, [showError]);

  const today = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full' }).format(new Date());

  const maxProductQty = Math.max(...topProducts.map(p => p.totalQuantity), 1);

  return (
    <section className="page-content pos-container dashboard-page">
      <style>{`
        .pos-container { max-width: 1200px; margin: 0 auto; padding-bottom: 60px; }
        .pos-header-flex { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 0; gap: 6px; }
        .pos-action-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border-radius: 99px; font-weight: 700; font-size: 14.5px; transition: all 0.2s; cursor: pointer; border: 0; }
        .pos-btn-secondary { background: #fff; color: var(--fs-text-main); border: 1px solid var(--fs-border); box-shadow: var(--shadow-sm); }
        .pos-btn-secondary:hover:not(:disabled) { background: var(--fs-bg); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        .metric-cards-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; margin-bottom: 24px; }
        .dashboard-metric {
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--fs-border);
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.06);
          padding: 32px 24px;
          display: flex;
          align-items: flex-start;
          gap: 20px;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dashboard-metric:hover { transform: translateY(-4px); }
        .metric-icon-wrap { padding: 16px; border-radius: 20px; display: flex; align-items: center; justify-content: center; }
        .metric-icon-wrap.sky { background: #f0f9ff; color: #0ea5e9; }
        .metric-icon-wrap.blue { background: #eff6ff; color: #2563eb; }
        .metric-icon-wrap.green { background: #f0fdf4; color: #16a34a; }
        .metric-icon-wrap.purple { background: #faf5ff; color: #9333ea; }
        
        .metric-content { display: flex; flex-direction: column; }
        .metric-content p { margin: 0 0 6px 0; color: var(--fs-text-muted); font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .metric-content h2 { margin: 0 0 6px 0; font-size: 26px; font-weight: 800; color: var(--fs-navy); letter-spacing: -0.02em; }
        .metric-content span { font-size: 13px; color: var(--fs-text-muted); line-height: 1.4; }

        .dashboard-charts-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        .chart-card {
          background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--fs-border);
          box-shadow: 0 4px 15px -3px rgba(0,0,0,0.05); overflow: hidden;
          padding: 32px;
          display: flex; flex-direction: column;
        }

        .top-products-list { display: flex; flex-direction: column; gap: 20px; flex: 1; justify-content: center; }
        .top-product-item { display: flex; flex-direction: column; gap: 8px; }
        .top-product-header { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: var(--fs-navy); }
        .progress-bar-bg { background: var(--fs-border-soft); height: 8px; border-radius: 99px; overflow: hidden; }
        .progress-bar-fill { background: var(--fs-blue); height: 100%; border-radius: 99px; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1); }

        @media (max-width: 900px) {
          .dashboard-charts-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="pos-header-flex">
        <div>
          <p className="eyebrow" style={{ color: 'var(--fs-blue)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Dashboard Overview</p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={24} color="var(--fs-blue)" />
            مرحباً بك في فهمي ستيل
          </h1>
          <p style={{ marginTop: '4px', color: 'var(--fs-text-muted)', fontSize: '14px' }}>ملخص حركة العمل اليوم — {today}</p>
        </div>
        <button className="pos-action-btn pos-btn-secondary" type="button" onClick={() => window.location.reload()}>
          <ArrowUpRight size={18} /> تحديث البيانات
        </button>
      </div>
      
      {error && <div style={{ background: 'var(--fs-danger-bg)', color: 'var(--fs-danger-text)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={18}/> {error}</div>}
      
      <div className="metric-cards-container">
        <article className="dashboard-metric">
          <div className="metric-icon-wrap sky"><CircleDollarSign size={28} /></div>
          <div className="metric-content">
            <p>مبيعات اليوم</p>
            <h2>{formatMoney(summary.salesTotalCents)}</h2>
            <span>إجمالي فواتير اليوم</span>
          </div>
        </article>

        <article className="dashboard-metric">
          <div className="metric-icon-wrap green"><TrendingUp size={28} /></div>
          <div className="metric-content">
            <p>التحصيلات</p>
            <h2>{formatMoney(summary.purchasesTotalCents)}</h2>
            <span>تم تحصيله نقدياً أو بنكياً</span>
          </div>
        </article>

        <article className="dashboard-metric">
          <div className="metric-icon-wrap blue"><PackageSearch size={28} /></div>
          <div className="metric-content">
            <p>قيمة المخزون</p>
            <h2>{formatMoney(summary.inventoryValueCents)}</h2>
            <span>{summary.totalProducts} منتج متاح</span>
          </div>
        </article>

        <article className="dashboard-metric">
          <div className="metric-icon-wrap purple"><Users size={28} /></div>
          <div className="metric-content">
            <p>العملاء الآجل</p>
            <h2>{summary.activeCustomers}</h2>
            <span>عملاء لديهم مديونية</span>
          </div>
        </article>
      </div>

      <div className="dashboard-charts-grid">
        <div className="chart-card">
          <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 800, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={20} color="var(--fs-text-muted)" /> حركة المبيعات (أسبوع)
          </h3>
          <div style={{ width: '100%', height: 350, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--fs-border-soft)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fill: '#7a8691', fontSize: 13, fontWeight: 600}} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 100}k`} tick={{fill: '#7a8691', fontSize: 13, fontWeight: 600}} width={60} />
                <Tooltip 
                  formatter={(value) => [formatMoney(Number(value ?? 0)), 'المبيعات']}
                  labelStyle={{ color: 'var(--fs-navy)', fontWeight: 'bold' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--fs-border)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="totalCents" stroke="var(--fs-blue)" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 800, color: 'var(--fs-text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20} color="var(--fs-text-muted)" /> أكثر المنتجات مبيعاً
          </h3>
          <div className="top-products-list">
            {topProducts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--fs-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <PackageSearch size={32} opacity={0.5} />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>لا توجد بيانات مبيعات كافية لعرضها الآن.</p>
              </div>
            ) : (
              topProducts.map((product, idx) => {
                const percentage = Math.round((product.totalQuantity / maxProductQty) * 100);
                return (
                  <div key={idx} className="top-product-item">
                    <div className="top-product-header">
                      <span style={{ fontSize: 14 }}>{product.productName}</span>
                      <span style={{ color: 'var(--fs-blue)' }}>{percentage}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fs-text-muted)', marginTop: -2 }}>الكمية: {product.totalQuantity} قطعة</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
