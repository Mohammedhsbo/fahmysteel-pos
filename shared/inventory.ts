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
  reason: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
};

export interface InventoryApi {
  adjustStock: (input: InventoryAdjustmentInput) => Promise<InventoryAdjustmentRecord>;
  listAdjustments: () => Promise<InventoryAdjustmentRecord[]>;
}
