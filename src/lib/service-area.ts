import { serviceCoverage } from "../data/isolation.ts";

export type Coverage = { validated: boolean; cities: readonly string[] };
export type CoverageStatus = "pending" | "inside" | "outside" | "invalid";
export const normalizePostalCode = (value: string) =>
  value.replace(/\s/g, "").toUpperCase();
export const validPostalCode = (value: string) =>
  /^[ABCEGHJ-NPRSTVXY][0-9][ABCEGHJ-NPRSTV-Z]\s?[0-9][ABCEGHJ-NPRSTV-Z][0-9]$/i.test(
    value.trim(),
  );

export function normalizeCity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[-\u2010-\u2015]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bst\.?\s/g, "saint ")
    .replace(/\bste\.?\s/g, "sainte ");
}

export function coverageStatus(
  city: string,
  postalCode: string,
  coverage: Coverage = serviceCoverage,
): CoverageStatus {
  if (!validPostalCode(postalCode)) return "invalid";
  if (!coverage.validated || normalizeCity(city).length < 2) return "pending";
  if (
    coverage.cities.some(
      (approved) => normalizeCity(approved) === normalizeCity(city),
    )
  )
    return "inside";
  // G/H/J identify Québec, not an approved service area. They ONLY leave an
  // unlisted municipality pending; no postal prefix grants qualification.
  // Without municipality/geocoding evidence, do not infer distance within Québec.
  return /^[GHJ]/.test(normalizePostalCode(postalCode)) ? "pending" : "outside";
}
