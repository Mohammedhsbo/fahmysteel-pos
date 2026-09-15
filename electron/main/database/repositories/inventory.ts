import type Database from 'better-sqlite3';
import { getSession } from '../../auth.js';
import { recordAudit } from '../audit.js';
import { calculateTotalWeightKg } from '../../../../shared/steel.js';
import type { InventoryAdjustmentInput, InventoryAdjustmentRecord, InventoryStocktakingReport } from '../../../../shared/inventory.js';
import { listAllProducts } from './catalog.js';

export function getStocktakingReport(database: Database.Database): InventoryStocktakingReport {
  const session = getSession();
  if (!session) throw new Error('Authentication required.');
  const items = listAllProducts(database);
  const hasWeightData = items.some((item) => item.weightPerPieceKg != null || item.weightPerMeterKg != null || item.weightPerSheetKg != null);
  return {
    generatedAt: new Date().toISOString(),
    userDisplayName: session.displayName,
    items,
    totalQuantity: items.reduce((total, item) => total + item.currentStockQuantity, 0),
    totalWeightKg: hasWeightData ? items.reduce((total, item) => total + item.totalWeightKg, 0) : null,
  };
}

export function listAdjustments(database: Database.Database): InventoryAdjustmentRecord[] {
  return database.prepare(`
    SELECT
      im.id,
      im.product_id AS productId,
      im.quantity_delta AS quantityDelta,
      COALESCE(im.previous_quantity, im.quantity_delta * 0) AS previousQuantity,
      COALESCE(im.new_quantity, im.quantity_delta * 0) AS newQuantity,
      COALESCE(im.previous_weight_kg, 0) AS previousWeightKg,
      COALESCE(im.new_weight_kg, 0) AS newWeightKg,
      im.reason,
      im.created_by AS createdBy,
      im.created_at AS createdAt,
      p.name AS productName,
      u.display_name AS createdByName
    FROM inventory_movements im
    INNER JOIN products p ON p.id = im.product_id
    INNER JOIN users u ON u.id = im.created_by
    WHERE im.movement_type = 'ADJUSTMENT'
    ORDER BY im.created_at DESC
    LIMIT 200
  `).all() as InventoryAdjustmentRecord[];
}

export function adjustStock(database: Database.Database, input: InventoryAdjustmentInput): InventoryAdjustmentRecord {
  const session = getSession();
  if (!session) throw new Error('Authentication required.');
  if (!Number.isInteger(input.productId) || !Number.isFinite(input.quantityDelta) || input.quantityDelta === 0) {
    throw new Error('A valid non-zero stock adjustment is required.');
  }
  const reason = input.reason.trim();
  if (reason.length < 2 || reason.length > 200) throw new Error('Adjustment reason must be between 2 and 200 characters.');

  const result = database.transaction(() => {
    const product = database.prepare(`
      SELECT name, current_stock_quantity AS currentStockQuantity, length_m AS lengthM,
        weight_per_piece_kg AS weightPerPieceKg, weight_per_meter_kg AS weightPerMeterKg
      FROM products WHERE id = ? AND is_active = 1
    `).get(input.productId) as { name: string; currentStockQuantity: number; lengthM: number | null; weightPerPieceKg: number | null; weightPerMeterKg: number | null } | undefined;
    if (!product) throw new Error('Product not found.');
    if (product.currentStockQuantity + input.quantityDelta < 0) throw new Error('Adjustment cannot make stock negative.');

    const now = new Date().toISOString();
    const newQuantity = product.currentStockQuantity + input.quantityDelta;
    const previousWeightKg = calculateTotalWeightKg({ ...product, currentStockQuantity: product.currentStockQuantity });
    const newWeightKg = calculateTotalWeightKg({ ...product, currentStockQuantity: newQuantity });
    database.prepare(`
      UPDATE products
      SET current_stock_quantity = current_stock_quantity + ?, updated_at = ?
      WHERE id = ?
    `).run(input.quantityDelta, now, input.productId);

    const movement = database.prepare(`
      INSERT INTO inventory_movements (
        product_id, movement_type, quantity_delta, previous_quantity, new_quantity,
        previous_weight_kg, new_weight_kg, source_type, source_id, reason, created_by, created_at
      ) VALUES (?, 'ADJUSTMENT', ?, ?, ?, ?, ?, 'manual_adjustment', NULL, ?, ?, ?)
    `).run(input.productId, input.quantityDelta, product.currentStockQuantity, newQuantity, previousWeightKg, newWeightKg, reason, session.id, now);

    return Number(movement.lastInsertRowid);
  })();

  recordAudit(database, 'ADJUST', 'INVENTORY', result, `${input.quantityDelta} units: ${input.reason.trim()}`);

  return database.prepare(`
    SELECT
      im.id,
      im.product_id AS productId,
      im.quantity_delta AS quantityDelta,
      COALESCE(im.previous_quantity, 0) AS previousQuantity,
      COALESCE(im.new_quantity, 0) AS newQuantity,
      COALESCE(im.previous_weight_kg, 0) AS previousWeightKg,
      COALESCE(im.new_weight_kg, 0) AS newWeightKg,
      im.reason,
      im.created_by AS createdBy,
      im.created_at AS createdAt,
      p.name AS productName,
      u.display_name AS createdByName
    FROM inventory_movements im
    INNER JOIN products p ON p.id = im.product_id
    INNER JOIN users u ON u.id = im.created_by
    WHERE im.id = ?
  `).get(result) as InventoryAdjustmentRecord;
}
