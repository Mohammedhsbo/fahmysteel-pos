import type Database from 'better-sqlite3';
import type {
  CatalogCategory,
  CatalogCategoryInput,
  CatalogProduct,
  CatalogProductInput,
  CatalogUnit,
} from '../../../../shared/catalog.js';
import { recordAudit } from '../audit.js';

function normalizeSearch(search?: string): string {
  return `%${(search ?? '').trim()}%`;
}

export function listUnits(database: Database.Database): CatalogUnit[] {
  return database.prepare(`
    SELECT id, code, name, name_ar AS nameAr, is_active AS isActive
    FROM units
    WHERE is_active = 1
    ORDER BY name ASC
  `).all() as CatalogUnit[];
}

export function listCategories(database: Database.Database): CatalogCategory[] {
  return database.prepare(`
    SELECT id, name, name_ar AS nameAr, description, is_active AS isActive
    FROM categories
    WHERE is_active = 1 AND archived_at IS NULL
    ORDER BY name ASC
  `).all() as CatalogCategory[];
}

export function listProducts(database: Database.Database, search?: string): CatalogProduct[] {
  const term = normalizeSearch(search);
  return database.prepare(`
    SELECT
      p.id,
      p.sku,
      p.barcode,
      p.name,
      p.name_ar AS nameAr,
      p.description,
      p.category_id AS categoryId,
      c.name AS categoryName,
      p.unit_id AS unitId,
      u.name AS unitName,
      p.default_supplier_id AS defaultSupplierId,
      p.purchase_price_cents AS purchasePriceCents,
      p.selling_price_cents AS sellingPriceCents,
      p.minimum_stock_quantity AS minimumStockQuantity,
      p.current_stock_quantity AS currentStockQuantity,
      p.is_active AS isActive,
      p.archived_at AS archivedAt
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN units u ON u.id = p.unit_id
    WHERE p.is_active = 1
      AND p.archived_at IS NULL
      AND (
        p.name LIKE ?
        OR p.name_ar LIKE ?
        OR p.sku LIKE ?
        OR COALESCE(p.barcode, '') LIKE ?
      )
    ORDER BY p.name COLLATE NOCASE
    LIMIT 200
  `).all(term, term, term, term) as CatalogProduct[];
}

export function getProductById(database: Database.Database, productId: number): CatalogProduct | null {
  const row = database.prepare(`
    SELECT
      p.id,
      p.sku,
      p.barcode,
      p.name,
      p.name_ar AS nameAr,
      p.description,
      p.category_id AS categoryId,
      c.name AS categoryName,
      p.unit_id AS unitId,
      u.name AS unitName,
      p.default_supplier_id AS defaultSupplierId,
      p.purchase_price_cents AS purchasePriceCents,
      p.selling_price_cents AS sellingPriceCents,
      p.minimum_stock_quantity AS minimumStockQuantity,
      p.current_stock_quantity AS currentStockQuantity,
      p.is_active AS isActive,
      p.archived_at AS archivedAt
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN units u ON u.id = p.unit_id
    WHERE p.id = ?
  `).get(productId) as CatalogProduct | undefined;

  return row ?? null;
}

export function createProduct(database: Database.Database, input: CatalogProductInput): CatalogProduct {
  const now = new Date().toISOString();
  const result = database.prepare(`
    INSERT INTO products (
      sku,
      barcode,
      name,
      name_ar,
      description,
      category_id,
      unit_id,
      default_supplier_id,
      purchase_price_cents,
      selling_price_cents,
      minimum_stock_quantity,
      current_stock_quantity,
      is_active,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)
  `).run(
    input.sku.trim(),
    input.barcode?.trim() || null,
    input.name.trim(),
    input.nameAr.trim(),
    input.description?.trim() || null,
    input.categoryId ?? null,
    input.unitId,
    input.defaultSupplierId ?? null,
    Math.max(0, input.purchasePriceCents),
    Math.max(0, input.sellingPriceCents),
    Math.max(0, input.minimumStockQuantity),
    now,
    now,
  );

  const productId = Number(result.lastInsertRowid);
  return getProductById(database, productId)!;
}

export function updateProduct(database: Database.Database, productId: number, input: Partial<CatalogProductInput>): CatalogProduct {
  const existing = getProductById(database, productId);
  if (!existing) throw new Error('Product not found.');

  const updatePayload = {
    sku: input.sku ?? existing.sku,
    barcode: input.barcode ?? existing.barcode,
    name: input.name ?? existing.name,
    nameAr: input.nameAr ?? existing.nameAr,
    description: input.description ?? existing.description,
    categoryId: input.categoryId ?? existing.categoryId,
    unitId: input.unitId ?? existing.unitId,
    defaultSupplierId: input.defaultSupplierId ?? existing.defaultSupplierId,
    purchasePriceCents: input.purchasePriceCents ?? existing.purchasePriceCents,
    sellingPriceCents: input.sellingPriceCents ?? existing.sellingPriceCents,
    minimumStockQuantity: input.minimumStockQuantity ?? existing.minimumStockQuantity,
  };

  database.prepare(`
    UPDATE products
    SET sku = ?, barcode = ?, name = ?, name_ar = ?, description = ?, category_id = ?, unit_id = ?, default_supplier_id = ?,
        purchase_price_cents = ?, selling_price_cents = ?, minimum_stock_quantity = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updatePayload.sku.trim(),
    updatePayload.barcode?.trim() || null,
    updatePayload.name.trim(),
    updatePayload.nameAr.trim(),
    updatePayload.description?.trim() || null,
    updatePayload.categoryId ?? null,
    updatePayload.unitId,
    updatePayload.defaultSupplierId ?? null,
    Math.max(0, updatePayload.purchasePriceCents),
    Math.max(0, updatePayload.sellingPriceCents),
    Math.max(0, updatePayload.minimumStockQuantity),
    new Date().toISOString(),
    productId,
  );

  return getProductById(database, productId)!;
}

export function archiveProduct(database: Database.Database, productId: number): void {
  const existing = getProductById(database, productId);
  if (!existing) throw new Error('Product not found.');

  database.prepare(`
    UPDATE products
    SET is_active = 0, archived_at = ?, updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), new Date().toISOString(), productId);
}

export function createCategory(database: Database.Database, input: CatalogCategoryInput): CatalogCategory {
  const name = input.name.trim();
  const nameAr = input.nameAr.trim();
  if (!name || !nameAr) throw new Error('Category name and Arabic name are required.');

  const now = new Date().toISOString();
  const result = database.prepare(`
    INSERT INTO categories (name, name_ar, description, is_active, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?)
  `).run(name, nameAr, input.description?.trim() || null, now, now);

  const category = database.prepare(`
    SELECT id, name, name_ar AS nameAr, description, is_active AS isActive
    FROM categories WHERE id = ?
  `).get(Number(result.lastInsertRowid)) as CatalogCategory;
  recordAudit(database, 'CREATE', 'CATEGORY', category.id, category.name);
  return category;
}

export function updateCategory(database: Database.Database, categoryId: number, input: Partial<CatalogCategoryInput>): CatalogCategory {
  const existing = database.prepare(`
    SELECT id, name, name_ar AS nameAr, description, is_active AS isActive
    FROM categories WHERE id = ? AND is_active = 1 AND archived_at IS NULL
  `).get(categoryId) as CatalogCategory | undefined;
  if (!existing) throw new Error('Category not found.');

  const name = input.name?.trim() ?? existing.name;
  const nameAr = input.nameAr?.trim() ?? existing.nameAr;
  if (!name || !nameAr) throw new Error('Category name and Arabic name are required.');
  database.prepare(`
    UPDATE categories
    SET name = ?, name_ar = ?, description = ?, updated_at = ?
    WHERE id = ?
  `).run(name, nameAr, input.description?.trim() ?? existing.description, new Date().toISOString(), categoryId);

  const category = database.prepare(`
    SELECT id, name, name_ar AS nameAr, description, is_active AS isActive
    FROM categories WHERE id = ?
  `).get(categoryId) as CatalogCategory;
  recordAudit(database, 'UPDATE', 'CATEGORY', categoryId, category.name);
  return category;
}

export function archiveCategory(database: Database.Database, categoryId: number): void {
  const category = database.prepare('SELECT id FROM categories WHERE id = ? AND is_active = 1').get(categoryId);
  if (!category) throw new Error('Category not found.');
  database.prepare(`
    UPDATE categories SET is_active = 0, archived_at = ?, updated_at = ? WHERE id = ?
  `).run(new Date().toISOString(), new Date().toISOString(), categoryId);
  recordAudit(database, 'ARCHIVE', 'CATEGORY', categoryId);
}