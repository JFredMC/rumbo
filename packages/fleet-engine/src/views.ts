import { forward, getRoute, NETWORK, positionOnCycle, type Network } from './network';
import { currentSpeed, EARLY_S, LATE_S, SCHEDULED_SPEED, STOP_DWELL } from './sim';
import type { Bus, FleetState, Kpis, VehicleStatus, VehicleView } from './types';

export function statusOf(b: Bus, net: Network = NETWORK): VehicleStatus {
  if (b.outOfService) return 'fuera_de_servicio';
  if (b.dwellLeft > 0)
    return getRoute(net, b.routeId).stops[b.lastStop]?.terminal ? 'terminal' : 'en_parada';
  if (b.delayS > LATE_S) return 'retraso';
  if (b.delayS < EARLY_S) return 'adelantado';
  return 'en_ruta';
}

export function vehicleView(s: FleetState, b: Bus, net: Network = NETWORK): VehicleView {
  const route = getRoute(net, b.routeId);
  const pt = positionOnCycle(route, b.pos);
  const nextIdx = (b.lastStop + 1) % route.stops.length;
  const next = route.stops[nextIdx];
  const v = currentSpeed(s, b, net);
  const dist = next ? forward(route, b.pos, next.pos) : 0;
  const eta = b.outOfService ? 0 : (b.dwellLeft + dist / Math.max(v, SCHEDULED_SPEED * 0.6)) / 60;
  return {
    id: b.id,
    code: b.code,
    routeId: b.routeId,
    kind: b.kind,
    driver: b.driver,
    status: statusOf(b, net),
    lng: pt.lng,
    lat: pt.lat,
    bearing: pt.bearing,
    speedKmh: Math.round(v * 3.6),
    delayMin: Math.round(b.delayS / 6) / 10,
    occupancy: Math.round(b.occupancy),
    battery: Math.round(b.battery),
    direction: b.pos <= route.path.total ? 'ida' : 'vuelta',
    nextStop: next?.name ?? '—',
    nextStopEtaMin: Math.round(eta * 10) / 10,
    progress: b.pos / route.cycle,
  };
}

export function vehicleViews(s: FleetState, net: Network = NETWORK): VehicleView[] {
  return s.buses.map((b) => vehicleView(s, b, net));
}

export function kpis(s: FleetState): Kpis {
  const active = s.buses.filter((b) => !b.outOfService);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const onTime = active.filter((b) => b.delayS <= LATE_S && b.delayS >= EARLY_S).length;
  return {
    active: active.length,
    onTimePct: active.length ? Math.round((onTime / active.length) * 100) : 100,
    avgDelayMin: Math.round(avg(active.map((b) => Math.max(0, b.delayS))) / 6) / 10,
    avgOccupancy: Math.round(avg(active.map((b) => b.occupancy))),
    outOfService: s.buses.length - active.length,
    incidents: s.incidents.length,
  };
}

export interface Arrival {
  busId: string;
  code: string;
  routeId: string;
  direction: 'ida' | 'vuelta';
  etaMin: number;
}

/** Próximas llegadas a una parada (por nombre), en las dos direcciones de todas las rutas. */
export function stopArrivals(
  s: FleetState,
  stopName: string,
  limit = 6,
  net: Network = NETWORK,
): Arrival[] {
  const out: Arrival[] = [];
  for (const b of s.buses) {
    if (b.outOfService) continue;
    const route = getRoute(net, b.routeId);
    const v = Math.max(currentSpeed(s, b, net), SCHEDULED_SPEED * 0.8);
    for (const [i, st] of route.stops.entries()) {
      if (st.name !== stopName) continue;
      const dist = forward(route, b.pos, st.pos);
      // Paradas intermedias en el camino suman su detención nominal.
      const between = route.stops.filter(
        (x, j) => j !== i && forward(route, b.pos, x.pos) < dist,
      ).length;
      const etaMin = (b.dwellLeft + dist / v + between * STOP_DWELL) / 60;
      out.push({
        busId: b.id,
        code: b.code,
        routeId: b.routeId,
        direction: st.direction,
        etaMin: Math.round(etaMin * 10) / 10,
      });
    }
  }
  return out.sort((a, b) => a.etaMin - b.etaMin).slice(0, limit);
}

export interface StopView {
  name: string;
  lng: number;
  lat: number;
  routes: string[];
  terminal: boolean;
}

/** Paradas únicas (por nombre) con las rutas que las atienden. */
export function stopViews(net: Network = NETWORK): StopView[] {
  const map = new Map<string, StopView>();
  for (const r of net.values()) {
    for (const st of r.stops) {
      if (st.direction === 'vuelta') continue;
      const pt = positionOnCycle(r, st.pos);
      const prev = map.get(st.name);
      if (prev) {
        if (!prev.routes.includes(r.def.id)) prev.routes.push(r.def.id);
        prev.terminal ||= st.terminal;
      } else {
        map.set(st.name, {
          name: st.name,
          lng: pt.lng,
          lat: pt.lat,
          routes: [r.def.id],
          terminal: st.terminal,
        });
      }
    }
  }
  return [...map.values()];
}
