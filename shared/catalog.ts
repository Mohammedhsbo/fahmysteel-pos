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
  isActive: boolean;
  archivedAt: string | null;
};

export type CatalogProductInput = {
  sku: string;
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
