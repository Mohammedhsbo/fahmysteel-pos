import type Database from 'better-sqlite3';
import type {
  CatalogCategory,
  CatalogCategoryInput,
  CatalogProduct,
  CatalogProductInput,
  CatalogUnit,
} from '../../../../shared/catalog.js';
import { recordAudit } from '../audit.js';
import { calculateStockValueCents, calculateTotalWeightKg, calculateWeightValues } from '../../../../shared/steel.js';

function normalizeSearch(search?: string): string {
  return `%${(search ?? '').trim()}%`;
}

function generateNextSku(database: Database.Database): string {
  const rows = database.prepare('SELECT sku FROM products').all() as Array<{ sku: string }>;
  const highestNumber = rows.reduce((highest, row) => {
    const match = /^SKU-(\d+)$/.exec(row.sku);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `SKU-${String(highestNumber + 1).padStart(6, '0')}`;
}

const productFields = `
      p.id, p.sku, p.barcode, p.name, p.name_ar AS nameAr, p.description,
      p.category_id AS categoryId, c.name AS categoryName, p.unit_id AS unitId, u.name AS unitName,
      p.default_supplier_id AS defaultSupplierId, p.purchase_price_cents AS purchasePriceCents,
      p.selling_price_cents AS sellingPriceCents, p.minimum_stock_quantity AS minimumStockQuantity,
      p.current_stock_quantity AS currentStockQuantity, p.steel_type AS steelType, p.shape,
      p.width_mm AS widthMm, p.height_mm AS heightMm, p.thickness_mm AS thicknessMm, p.length_m AS lengthM,
      p.weight_per_piece_kg AS weightPerPieceKg, p.weight_per_meter_kg AS weightPerMeterKg,
      p.weight_per_sheet_kg AS weightPerSheetKg,
      p.selling_price_per_kg_cents AS sellingPricePerKgCents,
      p.selling_price_per_piece_cents AS sellingPricePerPieceCents,
      p.selling_price_per_meter_cents AS sellingPricePerMeterCents,
      p.is_active AS isActive, p.archived_at AS archivedAt`;

function withCalculatedFields(product: CatalogProduct): CatalogProduct & { totalWeightKg: number; stockValueCents: number } {
  const measurements = {
    currentStockQuantity: product.currentStockQuantity,
    lengthM: product.lengthM,
    weightPerPieceKg: product.weightPerPieceKg,
    weightPerMeterKg: product.weightPerMeterKg,
    weightPerSheetKg: product.weightPerSheetKg,
    sellingPricePerKgCents: product.sellingPricePerKgCents ?? product.sellingPriceCents,
  };
  return {
    ...product,
    totalWeightKg: calculateTotalWeightKg(measurements),
    stockValueCents: calculateStockValueCents(measurements),
  };
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
    SELECT ${productFields}
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
  `).all(term, term, term, term).map((product) => withCalculatedFields(product as CatalogProduct));
}

export function getProductById(database: Database.Database, productId: number): CatalogProduct | null {
  const row = database.prepare(`
    SELECT ${productFields}
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN units u ON u.id = p.unit_id
    WHERE p.id = ?
  `).get(productId) as CatalogProduct | undefined;

  return row ? withCalculatedFields(row) : null;
}

export function createProduct(database: Database.Database, input: CatalogProductInput): CatalogProduct {
  const sku = generateNextSku(database);
  validateProductInput({ ...input, sku });
  const weights = calculateWeightValues(input);
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
      steel_type,
      shape,
      width_mm,
      height_mm,
      thickness_mm,
      length_m,
      weight_per_piece_kg,
      weight_per_meter_kg,
      weight_per_sheet_kg,
      selling_price_per_kg_cents,
      selling_price_per_piece_cents,
      selling_price_per_meter_cents,
      minimum_stock_quantity,
      current_stock_quantity,
      is_active,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    sku,
    input.barcode?.trim() || null,
    input.name.trim(),
    input.nameAr.trim(),
    input.description?.trim() || null,
    input.categoryId ?? null,
    input.unitId,
    input.defaultSupplierId ?? null,
    Math.max(0, input.purchasePriceCents),
    Math.max(0, input.sellingPriceCents),
    input.steelType?.trim() || null,
    input.shape?.trim() || null,
    input.widthMm ?? null,
    input.heightMm ?? null,
    input.thicknessMm ?? null,
    input.lengthM ?? null,
    weights.weightPerPieceKg,
    weights.weightPerMeterKg,
    input.weightPerSheetKg ?? null,
    input.sellingPricePerKgCents ?? input.sellingPriceCents,
    input.sellingPricePerPieceCents ?? null,
    input.sellingPricePerMeterCents ?? null,
    Math.max(0, input.minimumStockQuantity),
    Math.max(0, input.currentStockQuantity ?? 0),
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
    currentStockQuantity: input.currentStockQuantity ?? existing.currentStockQuantity,
    steelType: input.steelType ?? existing.steelType,
    shape: input.shape ?? existing.shape,
    widthMm: input.widthMm ?? existing.widthMm,
    heightMm: input.heightMm ?? existing.heightMm,
    thicknessMm: input.thicknessMm ?? existing.thicknessMm,
    lengthM: input.lengthM ?? existing.lengthM,
    weightPerPieceKg: input.weightPerPieceKg ?? existing.weightPerPieceKg,
    weightPerMeterKg: input.weightPerMeterKg ?? existing.weightPerMeterKg,
    weightPerSheetKg: input.weightPerSheetKg ?? existing.weightPerSheetKg,
    sellingPricePerKgCents: input.sellingPricePerKgCents ?? existing.sellingPricePerKgCents,
    sellingPricePerPieceCents: input.sellingPricePerPieceCents ?? existing.sellingPricePerPieceCents,
    sellingPricePerMeterCents: input.sellingPricePerMeterCents ?? existing.sellingPricePerMeterCents,
  };
  validateProductInput(updatePayload);
  const weights = calculateWeightValues(updatePayload);

  database.prepare(`
    UPDATE products
    SET sku = ?, barcode = ?, name = ?, name_ar = ?, description = ?, category_id = ?, unit_id = ?, default_supplier_id = ?,
        purchase_price_cents = ?, selling_price_cents = ?, minimum_stock_quantity = ?,
        steel_type = ?, shape = ?, width_mm = ?, height_mm = ?, thickness_mm = ?, length_m = ?,
        weight_per_piece_kg = ?, weight_per_meter_kg = ?, weight_per_sheet_kg = ?, selling_price_per_kg_cents = ?,
        selling_price_per_piece_cents = ?, selling_price_per_meter_cents = ?, updated_at = ?
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
    updatePayload.steelType?.trim() || null,
    updatePayload.shape?.trim() || null,
    updatePayload.widthMm ?? null,
    updatePayload.heightMm ?? null,
    updatePayload.thicknessMm ?? null,
    updatePayload.lengthM ?? null,
    weights.weightPerPieceKg,
    weights.weightPerMeterKg,
    updatePayload.weightPerSheetKg ?? null,
    updatePayload.sellingPricePerKgCents ?? null,
    updatePayload.sellingPricePerPieceCents ?? null,
    updatePayload.sellingPricePerMeterCents ?? null,
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

function validateProductInput(input: CatalogProductInput | Partial<CatalogProductInput>): void {
  const requiredText = [input.sku, input.name, input.nameAr];
  if (requiredText.some((value) => typeof value !== 'string' || !value.trim())) throw new Error('اسم الصنف ورمز SKU والاسم العربي حقول مطلوبة.');
  const numericValues = [
    input.purchasePriceCents, input.sellingPriceCents, input.minimumStockQuantity, input.currentStockQuantity,
    input.widthMm, input.heightMm, input.thicknessMm, input.lengthM, input.weightPerPieceKg,
    input.weightPerMeterKg, input.weightPerSheetKg, input.sellingPricePerKgCents,
    input.sellingPricePerPieceCents, input.sellingPricePerMeterCents,
  ];
  if (numericValues.some((value) => value != null && (!Number.isFinite(value) || value < 0))) throw new Error('لا يمكن استخدام قيم رقمية سالبة أو غير صحيحة.');
  if (input.currentStockQuantity != null && input.currentStockQuantity < 0) throw new Error('كمية المخزون لا يمكن أن تكون سالبة.');
}

export function listAllProducts(database: Database.Database): CatalogProduct[] {
  return database.prepare(`
    SELECT ${productFields}
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN units u ON u.id = p.unit_id
    WHERE p.is_active = 1
      AND p.archived_at IS NULL
    ORDER BY p.name COLLATE NOCASE
  `).all().map((product) => withCalculatedFields(product as CatalogProduct));
}