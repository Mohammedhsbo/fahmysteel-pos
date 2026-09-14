import type Database from 'better-sqlite3';
import type { LowStockProduct } from '../../../../shared/inventory-alerts.js';

export function listLowStock(database: Database.Database): LowStockProduct[] {
  return database.prepare(`
    SELECT
      p.id,
      p.sku,
      p.name,
      u.name AS unitName,
      p.current_stock_quantity AS currentStockQuantity,
      p.minimum_stock_quantity AS minimumStockQuantity,
      p.minimum_stock_quantity - p.current_stock_quantity AS shortageQuantity
    FROM products p
    INNER JOIN units u ON u.id = p.unit_id
    WHERE p.is_active = 1
      AND p.archived_at IS NULL
      AND p.minimum_stock_quantity > 0
      AND p.current_stock_quantity <= p.minimum_stock_quantity
    ORDER BY shortageQuantity DESC, p.name COLLATE NOCASE
    LIMIT 200
  `).all() as LowStockProduct[];
}
