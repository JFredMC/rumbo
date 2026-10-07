import { forward, getRoute, NETWORK, type Network, type NetRoute } from './network';
import { Rng } from './rng';
import type {
  Bus,
  EventLevel,
  FleetEvent,
  FleetState,
  Incident,
  Speed,
  VehicleKind,
} from './types';

/** Velocidad programada (m/s): ~28 km/h. */
export const SCHEDULED_SPEED = 7.8;
export const STOP_DWELL = 25;
export const TERMINAL_LAYOVER = 90;
export const LATE_S = 180;
export const EARLY_S = -120;
export const BUNCH_M = 300;
export const UNBUNCH_M = 700;
export const EVENT_LIMIT = 60;
export const MAX_SUBSTEP_S = 1;

const DRIVERS = [
  'Ana P.',
  'Bruno C.',
  'Carla M.',
  'Diego R.',
  'Elena V.',
  'Fabián T.',
  'Gloria S.',
  'Héctor L.',
  'Irene G.',
  'Jorge A.',
  'Karen D.',
  'Luis F.',
  'Marta O.',
  'Nelson B.',
  'Olga Q.',
  'Pablo E.',
  'Rosa N.',
  'Samuel I.',
  'Tatiana U.',
  'Víctor H.',
  'Wilson J.',
  'Ximena K.',
  'Yesid Z.',
  'Zoe W.',
];

function event(
  s: FleetState,
  level: EventLevel,
  message: string,
  extra: Partial<FleetEvent> = {},
): FleetState {
  const ev: FleetEvent = { id: `ev-${s.seq}`, at: s.now, level, message, ...extra };
  return { ...s, seq: s.seq + 1, events: [ev, ...s.events].slice(0, EVENT_LIMIT) };
}

/** Flota inicial: buses repartidos a lo largo de cada ruta según su frecuencia. */
export function createFleet(now: number, seed = 20261007, net: Network = NETWORK): FleetState {
  const rng = new Rng(seed);
  const buses: Bus[] = [];
  let d = 0;
  [...net.values()].forEach((route, ri) => {
    const cycleMin = route.cycle / SCHEDULED_SPEED / 60;
    const count = Math.max(3, Math.min(7, Math.round(cycleMin / route.def.headwayMin)));
    for (let i = 0; i < count; i++) {
      const kind: VehicleKind = (i + ri) % 3 === 0 ? 'electrico' : 'bus';
      buses.push({
        id: `rb-${ri + 1}${String(i + 1).padStart(2, '0')}`,
        code: `RB-${ri + 1}${String(i + 1).padStart(2, '0')}`,
        routeId: route.def.id,
        kind,
        driver: DRIVERS[d++ % DRIVERS.length] as string,
        pos: (route.cycle * i) / count + rng.between(-120, 120),
        cruise: rng.between(7.4, 9.2),
        traffic: rng.between(0.8, 1.05),
        delayS: Math.round(rng.between(-60, 150)),
        occupancy: Math.round(rng.between(25, 70)),
        battery: kind === 'electrico' ? Math.round(rng.between(45, 95)) : 100,
        dwellLeft: 0,
        lastStop: 0,
        outOfService: false,
        late: false,
        lowBattery: false,
        bunchedWith: null,
      });
    }
  });
  // Cada bus arranca con la última parada que dejó atrás.
  for (const b of buses) {
    const route = getRoute(net, b.routeId);
    b.pos = ((b.pos % route.cycle) + route.cycle) % route.cycle;
    b.lastStop = lastStopBefore(route, b.pos);
  }
  let s: FleetState = {
    version: 1,
    now,
    running: true,
    speed: 1,
    seed: rng.seed,
    seq: 1,
    buses,
    incidents: [],
    events: [],
  };
  s = event(s, 'info', `Turno iniciado: ${buses.length} buses en ${net.size} rutas.`);
  return s;
}

function lastStopBefore(route: NetRoute, pos: number): number {
  let idx = 0;
  route.stops.forEach((st, i) => {
    if (st.pos <= pos) idx = i;
  });
  return idx;
}

function incidentFactor(s: FleetState, route: NetRoute, pos: number): number {
  let f = 1;
  for (const inc of s.incidents) {
    if (inc.routeId !== route.def.id) continue;
    const inside =
      inc.from <= inc.to ? pos >= inc.from && pos <= inc.to : pos >= inc.from || pos <= inc.to;
    if (inside) f = Math.min(f, inc.factor);
  }
  return f;
}

/** Velocidad actual de un bus en m/s (0 si está detenido o fuera de servicio). */
export function currentSpeed(s: FleetState, b: Bus, net: Network = NETWORK): number {
  if (b.outOfService || b.dwellLeft > 0) return 0;
  return b.cruise * b.traffic * incidentFactor(s, getRoute(net, b.routeId), b.pos);
}

/** Avanza un bus `dt` segundos simulados. Devuelve el bus y los eventos que generó. */
function moveBus(
  s: FleetState,
  b: Bus,
  dt: number,
  rng: Rng,
  net: Network,
): { bus: Bus; events: [EventLevel, string][] } {
  const evs: [EventLevel, string][] = [];
  if (b.outOfService) return { bus: b, events: evs };
  const route = getRoute(net, b.routeId);
  const bus = { ...b };

  // Tráfico: paseo aleatorio que vuelve a ~0.92.
  bus.traffic = Math.max(
    0.5,
    Math.min(1.12, bus.traffic + (0.92 - bus.traffic) * 0.02 * dt + rng.between(-0.03, 0.03) * dt),
  );

  if (bus.dwellLeft > 0) {
    const used = Math.min(dt, bus.dwellLeft);
    bus.dwellLeft -= used;
    return { bus, events: evs };
  }

  const factor = incidentFactor(s, route, bus.pos);
  const v = bus.cruise * bus.traffic * factor;
  bus.delayS += dt * (1 - v / SCHEDULED_SPEED);
  const next = (bus.lastStop + 1) % route.stops.length;
  const stop = route.stops[next] as (typeof route.stops)[number];
  const toStop = forward(route, bus.pos, stop.pos);
  const step = v * dt;

  if (bus.kind === 'electrico') bus.battery = Math.max(0, bus.battery - step / 900);

  if (step >= toStop) {
    bus.pos = stop.pos % route.cycle;
    bus.lastStop = next;
    if (stop.terminal) {
      const min = Math.round(bus.delayS / 6) / 10;
      const when =
        Math.abs(min) < 1
          ? 'a tiempo'
          : min > 0
            ? `con ${String(min).replace('.', ',')} min de retraso`
            : `${String(-min).replace('.', ',')} min adelantado`;
      evs.push(['info', `${bus.code} llegó a ${stop.name} ${when}.`]);
      // En terminal se ajusta el descanso para volver al horario: si viene tarde lo acorta,
      // si viene adelantado espera más.
      const layover = Math.max(30, Math.min(240, TERMINAL_LAYOVER - bus.delayS));
      bus.delayS += layover - TERMINAL_LAYOVER;
      bus.dwellLeft = layover;
      bus.occupancy = Math.round(rng.between(4, 15));
      if (bus.kind === 'electrico') bus.battery = Math.min(100, bus.battery + 18);
    } else {
      // Si va adelantado, espera en la parada (hasta 1 min) para no correr el horario.
      const hold = bus.delayS < -60 ? Math.min(60, -bus.delayS) : 0;
      const dwell = Math.round(rng.between(15, 40) * (bus.occupancy > 80 ? 1.4 : 1) + hold);
      bus.delayS += dwell - STOP_DWELL;
      bus.dwellLeft = dwell;
      // Ocupación: sube hacia la mitad de cada sentido y baja al acercarse a la terminal.
      const half = route.path.total;
      const frac = (bus.pos <= half ? bus.pos : bus.pos - half) / half;
      const target = 20 + 65 * Math.sin(Math.PI * frac);
      bus.occupancy = Math.round(
        Math.max(
          3,
          Math.min(100, bus.occupancy + (target - bus.occupancy) * 0.6 + rng.between(-8, 8)),
        ),
      );
    }
  } else {
    bus.pos = (bus.pos + step) % route.cycle;
  }
  if (factor === 1 && incidentFactor(s, route, bus.pos) < 1) {
    evs.push(['warn', `${bus.code} entra al tramo afectado y avanza lento.`]);
  }

  if (!bus.late && bus.delayS > 300) {
    bus.late = true;
    evs.push(['warn', `${bus.code} va ${Math.round(bus.delayS / 60)} min tarde.`]);
  } else if (bus.late && bus.delayS < 120) {
    bus.late = false;
    evs.push(['info', `${bus.code} recuperó el horario.`]);
  }
  if (bus.kind === 'electrico' && !bus.lowBattery && bus.battery < 20) {
    bus.lowBattery = true;
    evs.push(['warn', `${bus.code} con batería baja (${Math.round(bus.battery)} %).`]);
  } else if (bus.lowBattery && bus.battery > 35) {
    bus.lowBattery = false;
  }
  return { bus, events: evs };
}

/** Detecta buses de la misma ruta pegados (agrupamiento) y avisa una vez por par. */
function checkBunching(s: FleetState, net: Network): FleetState {
  let out = s;
  const buses = s.buses.map((b) => ({ ...b }));
  const byRoute = new Map<string, Bus[]>();
  for (const b of buses)
    if (!b.outOfService) byRoute.set(b.routeId, [...(byRoute.get(b.routeId) ?? []), b]);
  const msgs: [EventLevel, string, string][] = [];
  for (const [rid, list] of byRoute) {
    const route = getRoute(net, rid);
    const sorted = [...list].sort((a, b) => a.pos - b.pos);
    sorted.forEach((b, i) => {
      const ahead = sorted[(i + 1) % sorted.length] as Bus;
      if (ahead === b) return;
      const gap = forward(route, b.pos, ahead.pos);
      if (gap < BUNCH_M && b.bunchedWith !== ahead.id) {
        b.bunchedWith = ahead.id;
        msgs.push([
          'alert',
          `Agrupamiento en ${route.def.name.split(' · ')[0]}: ${b.code} a ${Math.round(gap)} m de ${ahead.code}.`,
          rid,
        ]);
      } else if (b.bunchedWith && gap > UNBUNCH_M) {
        b.bunchedWith = null;
      }
    });
  }
  out = { ...out, buses };
  for (const [lvl, m, rid] of msgs) out = event(out, lvl, m, { routeId: rid });
  return out;
}

/** Un paso de simulación de `dt` segundos simulados (se parte en sub-pasos de 1 s). */
export function advance(s: FleetState, dtSeconds: number, net: Network = NETWORK): FleetState {
  if (dtSeconds <= 0) return s;
  let state = s;
  let left = dtSeconds;
  const rng = new Rng(s.seed);
  while (left > 0) {
    const dt = Math.min(MAX_SUBSTEP_S, left);
    left -= dt;
    const pending: [EventLevel, string, string, string][] = [];
    const buses = state.buses.map((b) => {
      const r = moveBus(state, b, dt, rng, net);
      for (const [lvl, msg] of r.events) pending.push([lvl, msg, r.bus.id, r.bus.routeId]);
      return r.bus;
    });
    const expired = state.incidents.filter((i) => i.left - dt <= 0);
    const incidents = state.incidents
      .map((i) => ({ ...i, left: i.left - dt }))
      .filter((i) => i.left > 0);
    state = { ...state, now: state.now + dt * 1000, buses, incidents };
    for (const [lvl, msg, busId, routeId] of pending)
      state = event(state, lvl, msg, { busId, routeId });
    for (const i of expired)
      state = event(state, 'info', `Se despejó: ${i.label}.`, { routeId: i.routeId });
    state = checkBunching(state, net);
  }
  return { ...state, seed: rng.seed };
}

/** Avance en tiempo real: aplica la velocidad de simulación y la pausa. */
export function tick(s: FleetState, realMs: number, net: Network = NETWORK): FleetState {
  if (!s.running) return s;
  return advance(s, (Math.min(realMs, 5000) / 1000) * s.speed, net);
}

export const toggleRun = (s: FleetState): FleetState => ({ ...s, running: !s.running });

export function setSpeed(s: FleetState, speed: Speed): FleetState {
  return [1, 5, 20].includes(speed) ? { ...s, speed } : s;
}

export function setOutOfService(s: FleetState, busId: string, out: boolean): FleetState {
  const bus = s.buses.find((b) => b.id === busId);
  if (!bus || bus.outOfService === out) return s;
  const next = {
    ...s,
    buses: s.buses.map((b) =>
      b.id === busId ? { ...b, outOfService: out, dwellLeft: 0, bunchedWith: null } : b,
    ),
  };
  return event(
    next,
    out ? 'warn' : 'info',
    out ? `${bus.code} sale de servicio.` : `${bus.code} vuelve a servicio.`,
    {
      busId,
      routeId: bus.routeId,
    },
  );
}

const INCIDENT_LABELS = [
  'Choque menor en la vía',
  'Obra en el carril',
  'Manifestación',
  'Semáforo dañado',
  'Vía inundada',
];

/** Crea un incidente que frena a los buses en un tramo de ~1,2 km durante 8 minutos simulados. */
export function injectIncident(s: FleetState, routeId: string, net: Network = NETWORK): FleetState {
  const route = getRoute(net, routeId);
  const rng = new Rng(s.seed);
  const from = rng.between(0.1, 0.8) * route.cycle;
  const label = `${INCIDENT_LABELS[Math.floor(rng.next() * INCIDENT_LABELS.length)]} en ${route.def.name.split(' · ')[0]}`;
  const inc: Incident = {
    id: `inc-${s.seq}`,
    routeId,
    from,
    to: (from + 1200) % route.cycle,
    left: 480,
    factor: 0.25,
    label,
  };
  return event(
    { ...s, seed: rng.seed, incidents: [...s.incidents, inc] },
    'alert',
    `Incidente: ${label}.`,
    { routeId },
  );
}

export function clearIncidents(s: FleetState): FleetState {
  return s.incidents.length
    ? event({ ...s, incidents: [] }, 'info', 'Incidentes despejados por el centro de control.')
    : s;
}

/**
 * Flota que ya lleva un rato operando: se crea `minutes` antes de `now` y se simula hasta
 * `now`, así la demo arranca con buses repartidos y una bitácora con contenido.
 */
export function warmFleet(
  now: number,
  seed = 20261007,
  minutes = 15,
  net: Network = NETWORK,
): FleetState {
  return advance(createFleet(now - minutes * 60_000, seed, net), minutes * 60, net);
}
