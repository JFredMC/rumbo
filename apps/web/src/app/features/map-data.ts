import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import {
  NETWORK,
  ROUTES,
  positionOnCycle,
  type Incident,
  type LngLat,
  type StopView,
  type VehicleView,
} from '@rumbo/fleet-engine';

const COLOR = new Map(ROUTES.map((r) => [r.id, r.color]));
export const routeColor = (id: string): string => COLOR.get(id) ?? '#94a3b8';

export function routesGeo(visible: readonly string[]): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: ROUTES.filter((r) => visible.includes(r.id)).map((r) => ({
      type: 'Feature',
      properties: { id: r.id, color: r.color },
      geometry: { type: 'LineString', coordinates: r.coordinates },
    })),
  };
}

export function stopsGeo(
  stops: readonly StopView[],
  visible: readonly string[],
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: stops
      .filter((s) => s.routes.some((r) => visible.includes(r)))
      .map((s) => ({
        type: 'Feature',
        properties: {
          name: s.name,
          terminal: s.terminal,
          color: routeColor(s.routes.find((r) => visible.includes(r)) ?? s.routes[0]!),
        },
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      })),
  };
}

export function busesGeo(
  vehicles: readonly VehicleView[],
  visible: readonly string[],
  selectedId: string | null,
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: vehicles
      .filter((v) => visible.includes(v.routeId) || v.id === selectedId)
      .map((v): Feature<Point> => ({
        type: 'Feature',
        id: v.id,
        properties: {
          id: v.id,
          code: v.code,
          color: v.status === 'fuera_de_servicio' ? '#64748b' : routeColor(v.routeId),
          bearing: v.bearing,
          selected: v.id === selectedId ? 1 : 0,
          late: v.status === 'retraso' ? 1 : 0,
        },
        geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      }))
      // El seleccionado se pinta encima.
      .sort(
        (a, b) => (a.properties!['selected'] as number) - (b.properties!['selected'] as number),
      ),
  };
}

/** Tramo afectado por cada incidente, muestreado cada 40 m sobre el ciclo. */
export function incidentsGeo(incidents: readonly Incident[]): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = [];
  for (const inc of incidents) {
    const route = NETWORK.get(inc.routeId);
    if (!route) continue;
    const len = (inc.to - inc.from + route.cycle) % route.cycle;
    const coords: LngLat[] = [];
    for (let d = 0; d <= len; d += 40) {
      const p = positionOnCycle(route, (inc.from + d) % route.cycle);
      coords.push([p.lng, p.lat]);
    }
    if (coords.length > 1)
      features.push({
        type: 'Feature',
        properties: { id: inc.id, label: inc.label },
        geometry: { type: 'LineString', coordinates: coords },
      });
  }
  return { type: 'FeatureCollection', features };
}

export function routesBounds(): [LngLat, LngLat] {
  let [w, s, e, n] = [180, 90, -180, -90];
  for (const r of ROUTES)
    for (const [x, y] of r.coordinates) {
      w = Math.min(w, x);
      e = Math.max(e, x);
      s = Math.min(s, y);
      n = Math.max(n, y);
    }
  return [
    [w, s],
    [e, n],
  ];
}
