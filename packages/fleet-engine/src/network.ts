import { ROUTES } from './data/routes';
import { buildPath, pointAt, type Path } from './geo';
import type { RouteDef } from './types';

export interface CycleStop {
  name: string;
  /** Posición en el ciclo ida+vuelta, en metros. */
  pos: number;
  terminal: boolean;
  direction: 'ida' | 'vuelta';
}

export interface NetRoute {
  def: RouteDef;
  path: Path;
  /** Longitud del ciclo completo (ida + vuelta). */
  cycle: number;
  stops: CycleStop[];
}

export type Network = ReadonlyMap<string, NetRoute>;

/**
 * Prepara las rutas para simular: el bus va por el trazado (ida) y vuelve por el mismo
 * trazado al revés (vuelta). Las terminales están en 0 y en la mitad del ciclo.
 */
export function buildNetwork(routes: readonly RouteDef[] = ROUTES): Network {
  const net = new Map<string, NetRoute>();
  for (const def of routes) {
    const path = buildPath(def.coordinates);
    const len = path.total;
    const n = def.stops.length;
    const ida: CycleStop[] = def.stops.map((s, i) => ({
      name: s.name,
      pos: s.at * len,
      terminal: i === 0 || i === n - 1,
      direction: 'ida',
    }));
    const vuelta: CycleStop[] = def.stops
      .slice(1, -1)
      .reverse()
      .map((s) => ({
        name: s.name,
        pos: 2 * len - s.at * len,
        terminal: false,
        direction: 'vuelta',
      }));
    net.set(def.id, { def, path, cycle: 2 * len, stops: [...ida, ...vuelta] });
  }
  return net;
}

export const NETWORK: Network = buildNetwork();

/** Posición geográfica para un punto del ciclo. En la vuelta el rumbo se invierte. */
export function positionOnCycle(
  route: NetRoute,
  pos: number,
): { lng: number; lat: number; bearing: number } {
  const len = route.path.total;
  const p = ((pos % route.cycle) + route.cycle) % route.cycle;
  if (p <= len) return pointAt(route.path, p);
  const pt = pointAt(route.path, route.cycle - p);
  return { ...pt, bearing: (pt.bearing + 180) % 360 };
}

/** Distancia hacia adelante en el ciclo, de `from` a `to`. */
export function forward(route: NetRoute, from: number, to: number): number {
  const d = (to - from) % route.cycle;
  return d < 0 ? d + route.cycle : d;
}

export function getRoute(net: Network, id: string): NetRoute {
  const r = net.get(id);
  if (!r) throw new Error(`Ruta desconocida: ${id}`);
  return r;
}
