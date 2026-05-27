export function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

export function unitsAreCompatible(
  takeoffUnit: string,
  packageUnit: string
): boolean {
  const a = normalizeUnit(takeoffUnit);
  const b = normalizeUnit(packageUnit);
  if (a === b) {
    return true;
  }
  if ((a === "m2" || a === "m²") && (b === "m2" || b === "m²")) {
    return true;
  }
  if ((a === "lm" || a === "lin.m" || a === "lin m") && b === "lm") {
    return true;
  }
  return false;
}
