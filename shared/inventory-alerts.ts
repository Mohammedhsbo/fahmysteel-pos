export type LowStockProduct = {
  id: number;
  sku: string;
  name: string;
  unitName: string;
  currentStockQuantity: number;
  minimumStockQuantity: number;
  shortageQuantity: number;
};
