export type DashboardSummary = {
  salesTotalCents: number;
  purchasesTotalCents: number;
  expensesTotalCents: number;
  inventoryValueCents: number;
  activeCustomers: number;
  activeSuppliers: number;
  totalProducts: number;
};

export type SalesByDayPoint = {
  date: string;
  totalCents: number;
};

export type TopProductPoint = {
  productName: string;
  totalQuantity: number;
  salesCents: number;
};

export interface ReportsApi {
  getDashboardSummary: () => Promise<DashboardSummary>;
  getSalesByDay: (days?: number) => Promise<SalesByDayPoint[]>;
  getTopProducts: (limit?: number) => Promise<TopProductPoint[]>;
  exportCsv: () => Promise<string | null>;
}
