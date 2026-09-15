export type SteelProductMeasurements = {
  currentStockQuantity: number;
  unitCode?: string | null;
  lengthM?: number | null;
  weightPerPieceKg?: number | null;
  weightPerMeterKg?: number | null;
  weightPerSheetKg?: number | null;
  sellingPricePerKgCents?: number | null;
};

function finiteNonNegative(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

export function calculateWeightValues(measurements: Pick<SteelProductMeasurements, 'lengthM' | 'weightPerPieceKg' | 'weightPerMeterKg'>): Pick<SteelProductMeasurements, 'weightPerPieceKg' | 'weightPerMeterKg'> {
  const length = finiteNonNegative(measurements.lengthM);
  const piece = finiteNonNegative(measurements.weightPerPieceKg);
  const meter = finiteNonNegative(measurements.weightPerMeterKg);
  if (piece != null && length != null && length > 0) return { weightPerPieceKg: piece, weightPerMeterKg: piece / length };
  if (meter != null && length != null && length > 0) return { weightPerPieceKg: meter * length, weightPerMeterKg: meter };
  return { weightPerPieceKg: piece, weightPerMeterKg: meter };
}

export function calculateTotalWeightKg(measurements: SteelProductMeasurements): number {
  const quantity = finiteNonNegative(measurements.currentStockQuantity) ?? 0;
  const sheetWeight = finiteNonNegative(measurements.weightPerSheetKg);
  if (sheetWeight != null) return quantity * sheetWeight;
  const weights = calculateWeightValues(measurements);
  if (weights.weightPerPieceKg != null) return quantity * weights.weightPerPieceKg;
  if (weights.weightPerMeterKg != null) return quantity * (finiteNonNegative(measurements.lengthM) ?? 0) * weights.weightPerMeterKg;
  return 0;
}

export function calculateStockValueCents(measurements: SteelProductMeasurements): number {
  return Math.round(calculateTotalWeightKg(measurements) * (measurements.sellingPricePerKgCents ?? 0));
}

export function calculatePiecePriceCents(measurements: SteelProductMeasurements): number | null {
  const weight = calculateWeightValues(measurements).weightPerPieceKg;
  if (weight == null || measurements.sellingPricePerKgCents == null || !Number.isFinite(measurements.sellingPricePerKgCents)) return null;
  return Math.round(weight * measurements.sellingPricePerKgCents);
}