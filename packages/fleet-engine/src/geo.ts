import type { LngLat } from './types';

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversine(a: LngLat, b: LngLat): number {
  const h =
    Math.sin(rad(b[1] - a[1]) / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rumbo inicial de a hacia b, en grados (0 = norte, sentido horario). */
export function bearing(a: LngLat, b: LngLat): number {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x =
    Math.cos(rad(a[1])) * Math.sin(rad(b[1])) -
    Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export interface Path {
  coords: readonly LngLat[];
  cumulative: number[];
  total: number;
}

export function buildPath(coords: readonly LngLat[]): Path {
  const cumulative = [0];
  for (let i = 1; i < coords.length; i++) {
    cumulative.push(
      (cumulative[i - 1] ?? 0) + haversine(coords[i - 1] as LngLat, coords[i] as LngLat),
    );
  }
  return { coords, cumulative, total: cumulative[cumulative.length - 1] || 1 };
}

/** Punto y rumbo a `meters` del inicio del trazado (búsqueda binaria). */
export function pointAt(path: Path, meters: number): { lng: number; lat: number; bearing: number } {
  const target = Math.max(0, Math.min(path.total, meters));
  let lo = 1;
  let hi = path.cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((path.cumulative[mid] ?? 0) < target) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const start = path.cumulative[i - 1] ?? 0;
  const end = path.cumulative[i] ?? start;
  const t = end === start ? 0 : (target - start) / (end - start);
  const a = path.coords[i - 1] as LngLat;
  const b = path.coords[i] as LngLat;
  return { lng: a[0] + (b[0] - a[0]) * t, lat: a[1] + (b[1] - a[1]) * t, bearing: bearing(a, b) };
}
