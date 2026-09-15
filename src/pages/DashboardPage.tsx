import { useEffect, useState } from 'react';
import { ArrowUpRight, CircleDollarSign, FileText, PackageSearch, Users, Briefcase, TrendingUp } from 'lucide-react';
import type { DashboardSummary, SalesByDayPoint, TopProductPoint } from '../../shared/reports';
import type { TreasuryTransaction } from '../../shared/treasury';
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

  // Use maximum value to scale progress bars
  const maxProductQty = Math.max(...topProducts.map(p => p.totalQuantity), 1);

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div className="page-title">
          <h1>مرحباً بك في فهمي ستيل</h1>
          <p className="subtitle">ملخص حركة العمل اليوم — {today}</p>
        </div>
        <button className="fs-btn-secondary" type="button" onClick={() => window.location.reload()}>
          <ArrowUpRight size={17} /> تحديث
        </button>
      </div>
      
      {error && <p className="auth-error">{error}</p>}
      
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-card-header">
            <p>مبيعات اليوم</p>
            <div className="metric-icon"><CircleDollarSign size={20} /></div>
          </div>
          <div>
            <h2>{formatMoney(summary.salesTotalCents)}</h2>
            <span>إجمالي فواتير اليوم</span>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-card-header">
            <p>التحصيلات</p>
            <div className="metric-icon green"><TrendingUp size={20} /></div>
          </div>
          <div>
            <h2>{formatMoney(summary.purchasesTotalCents)}</h2>
            <span>تم تحصيله نقدياً أو بنكياً</span>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-card-header">
            <p>قيمة المخزون</p>
            <div className="metric-icon blue"><PackageSearch size={20} /></div>
          </div>
          <div>
            <h2>{formatMoney(summary.inventoryValueCents)}</h2>
            <span>{summary.totalProducts} منتج نشط</span>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-card-header">
            <p>العملاء الآجل</p>
            <div className="metric-icon purple"><Users size={20} /></div>
          </div>
          <div>
            <h2>{summary.activeCustomers}</h2>
            <span>عملاء لديهم مديونية نشطة</span>
          </div>
        </article>
      </div>

      <div className="dashboard-charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>حركة المبيعات</h3>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F28C00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F28C00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E1E5E8" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fill: '#7a8691', fontSize: 12}} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 100}k`} tick={{fill: '#7a8691', fontSize: 12}} />
                <Tooltip 
                  formatter={(value) => [formatMoney(Number(value ?? 0)), 'المبيعات']}
                  labelStyle={{ color: '#1D2730', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="totalCents" stroke="#F28C00" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>أكثر المنتجات مبيعاً</h3>
          </div>
          <div className="top-products-list">
            {topProducts.length === 0 ? (
              <p style={{ color: '#7a8691', fontSize: 13, textAlign: 'center', marginTop: 40 }}>لا توجد مبيعات كافية</p>
            ) : (
              topProducts.map((product, idx) => (
                <div key={idx} className="top-product-item">
                  <div className="top-product-header">
                    <span className="top-product-name">{product.productName}</span>
                    <span className="top-product-value">{Math.round((product.totalQuantity / maxProductQty) * 100)}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${Math.round((product.totalQuantity / maxProductQty) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
