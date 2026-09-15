export type CatalogUnit = {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  isActive: boolean;
};

export type CatalogCategory = {
  id: number;
  name: string;
  nameAr: string;
  description: string | null;
  isActive: boolean;
};

export type CatalogCategoryInput = {
  name: string;
  nameAr: string;
  description?: string | null;
};

export type CatalogProduct = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  nameAr: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  unitId: number;
  unitName: string;
  defaultSupplierId: number | null;
  purchasePriceCents: number;
  sellingPriceCents: number;
  minimumStockQuantity: number;
  currentStockQuantity: number;
  steelType: string | null;
  shape: string | null;
  widthMm: number | null;
  heightMm: number | null;
  thicknessMm: number | null;
  lengthM: number | null;
  weightPerPieceKg: number | null;
  weightPerMeterKg: number | null;
  weightPerSheetKg: number | null;
  sellingPricePerKgCents: number | null;
  sellingPricePerPieceCents: number | null;
  sellingPricePerMeterCents: number | null;
  totalWeightKg: number;
  stockValueCents: number;
  isActive: boolean;
  archivedAt: string | null;
};

export type CatalogProductInput = {
  sku?: string;
  barcode?: string | null;
  name: string;
  nameAr: string;
  description?: string | null;
  categoryId?: number | null;
  unitId: number;
  defaultSupplierId?: number | null;
  purchasePriceCents: number;
  sellingPriceCents: number;
  minimumStockQuantity: number;
  currentStockQuantity?: number;
  steelType?: string | null;
  shape?: string | null;
  widthMm?: number | null;
  heightMm?: number | null;
  thicknessMm?: number | null;
  lengthM?: number | null;
  weightPerPieceKg?: number | null;
  weightPerMeterKg?: number | null;
  weightPerSheetKg?: number | null;
  sellingPricePerKgCents?: number | null;
  sellingPricePerPieceCents?: number | null;
  sellingPricePerMeterCents?: number | null;
};

export interface CatalogApi {
  listUnits: () => Promise<CatalogUnit[]>;
  listCategories: () => Promise<CatalogCategory[]>;
  createCategory: (input: CatalogCategoryInput) => Promise<CatalogCategory>;
  updateCategory: (categoryId: number, input: Partial<CatalogCategoryInput>) => Promise<CatalogCategory>;
  archiveCategory: (categoryId: number) => Promise<void>;
  listProducts: (search?: string) => Promise<CatalogProduct[]>;
  getProduct: (productId: number) => Promise<CatalogProduct | null>;
  createProduct: (input: CatalogProductInput) => Promise<CatalogProduct>;
  updateProduct: (productId: number, input: Partial<CatalogProductInput>) => Promise<CatalogProduct>;
  archiveProduct: (productId: number) => Promise<void>;
}
