const INVENTORY_ALSO_KEYS = ["library", "clinic", "cafeteria", "athletics", "hostel"];

export function hasEntitlement(
  entitlements: string[] | null | undefined,
  featureKey: string | null
): boolean {
  if (!featureKey) return true;
  if (!Array.isArray(entitlements)) return true;
  if (featureKey === "core") return entitlements.includes("core");
  if (featureKey === "inventory") {
    return (
      entitlements.includes("inventory") ||
      entitlements.some((k) => INVENTORY_ALSO_KEYS.includes(k))
    );
  }
  return entitlements.includes(featureKey);
}

export function hasPlanAccess(
  entitlements: string[] | null | undefined,
  featureKey: string | null
): boolean {
  if (!Array.isArray(entitlements)) return true;
  return hasEntitlement(entitlements, featureKey);
}
