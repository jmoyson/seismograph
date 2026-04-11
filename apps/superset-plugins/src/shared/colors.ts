// Generic metric → color/size helpers, copied (not imported) from
// apps/web/src/shared/utils/formatting.ts and apps/web/src/features/globe/globe.utils.ts.
//
// We deliberately avoid importing from apps/web because the Superset plugin
// package is built and shipped independently — keeping a local copy ensures
// the plugin has zero dependency on the rest of the monorepo at runtime.
//
// The thresholds are tuned for earthquake magnitudes (0–9 scale) but the API
// is generic on purpose: any metric works as long as the values are roughly
// in the same range. Datasets with different scales should normalize first.

export function getColorByMetric(value: number): string {
  if (value < 3) return '#43a047';
  if (value < 4) return '#fdd835';
  if (value < 5) return '#fb8c00';
  if (value < 6) return '#e53935';
  if (value < 7) return '#b71c1c';
  return '#4a148c';
}

export function getSizeByMetric(value: number): number {
  return Math.pow(1.5, value) * 0.3;
}

export function getAltitudeByMetric(value: number): number {
  return Math.max(0.01, value / 30);
}
