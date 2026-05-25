/** Material quantity: takeoff × per unit × (1 + wastage%). */
export function computeMaterialQuantity(
  takeoffQuantity: number,
  quantityPerUnit: number,
  wastagePercent: number
): number {
  const wasteMultiplier = 1 + wastagePercent / 100;
  return takeoffQuantity * quantityPerUnit * wasteMultiplier;
}

/** Labour hours: takeoff × hours per unit. */
export function computeLabourHours(
  takeoffQuantity: number,
  quantityPerUnit: number
): number {
  return takeoffQuantity * quantityPerUnit;
}

export function computeLineCost(quantity: number, rate: number): number {
  return quantity * rate;
}
