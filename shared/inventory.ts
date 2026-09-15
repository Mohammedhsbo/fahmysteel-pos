import type { CatalogProduct } from './catalog.js';

export type InventoryAdjustmentInput = {
  productId: number;
  quantityDelta: number;
  reason: string;
};

export type InventoryAdjustmentRecord = {
  id: number;
  productId: number;
  productName: string;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  previousWeightKg: number;
  newWeightKg: number;
  reason: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
};

export type InventoryStocktakingReport = {
  generatedAt: string;
  userDisplayName: string;
  items: CatalogProduct[];
  totalQuantity: number;
  totalWeightKg: number | null;
};

export interface InventoryApi {
  adjustStock: (input: InventoryAdjustmentInput) => Promise<InventoryAdjustmentRecord>;
  listAdjustments: () => Promise<InventoryAdjustmentRecord[]>;
  getStocktakingReport: () => Promise<InventoryStocktakingReport>;
  printStocktakingReport: (report: InventoryStocktakingReport) => Promise<void>;
  saveStocktakingReportPdf: (report: InventoryStocktakingReport) => Promise<string | null>;
}
