import { describe, expect, it } from 'vitest';
import { buildNetwork } from './network';
import {
  advance,
  clearIncidents,
  createFleet,
  currentSpeed,
  injectIncident,
  setOutOfService,
  setSpeed,
  tick,
  toggleRun,
  warmFleet,
} from './sim';
import { ROUTES } from './data/routes';
import { LINE, T0 } from './test-helpers';
import { kpis, stopArrivals, stopViews, vehicleViews } from './views';

describe('createFleet', () => {
  it('es determinista, serializable y reparte buses en todas las rutas', () => {
    const a = createFleet(T0);
    expect(createFleet(T0)).toEqual(a);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
    expect(new Set(a.buses.map((b) => b.routeId))).toEqual(new Set(['A', 'B', 'C', 'D', 'E']));
    expect(new Set(a.buses.map((b) => b.code)).size).toBe(a.buses.length);
    expect(a.buses.some((b) => b.kind === 'electrico')).toBe(true);
    expect(a.events[0]?.message).toContain('Turno iniciado');
  });

  it('otra semilla da otra flota', () => {
    expect(createFleet(T0, 1).buses[0]!.pos).not.toBe(createFleet(T0, 2).buses[0]!.pos);
  });
});

describe('advance', () => {
  it('mueve el reloj y los buses, y es determinista', () => {
    const s = createFleet(T0);
    const a = advance(s, 120);
    expect(a.now).toBe(T0 + 120_000);
    expect(advance(s, 120)).toEqual(a);
    const moved = a.buses.filter((b, i) => b.pos !== s.buses[i]!.pos);
    expect(moved.length).toBeGreaterThan(s.buses.length / 2);
  });

  it('se detiene en paradas y descansa en terminal', () => {
    const net = buildNetwork([LINE]);
    let s = createFleet(T0, 7, net);
    const seen = new Set<string>();
    for (let i = 0; i < 1200; i++) {
      s = advance(s, 1, net);
      for (const v of vehicleViews(s, net)) seen.add(v.status);
    }
    expect(seen).toContain('en_parada');
    expect(seen).toContain('terminal');
  });

  it('el bus recorre ida y vuelta', () => {
    const net = buildNetwork([LINE]);
    let s = createFleet(T0, 7, net);
    const dirs = new Set<string>();
    for (let i = 0; i < 40; i++) {
      s = advance(s, 30, net);
      dirs.add(vehicleViews(s, net)[0]!.direction);
    }
    expect(dirs).toEqual(new Set(['ida', 'vuelta']));
  });

  it('dt ≤ 0 no cambia nada', () => {
    const s = createFleet(T0);
    expect(advance(s, 0)).toBe(s);
  });

  it('la flota se mantiene razonable en 2 horas', () => {
    let s = createFleet(T0);
    for (let m = 0; m < 120; m++) s = advance(s, 60);
    const k = kpis(s);
    expect(k.onTimePct).toBeGreaterThanOrEqual(50);
    expect(k.avgOccupancy).toBeGreaterThan(20);
    expect(k.avgOccupancy).toBeLessThan(85);
    expect(s.events.length).toBeLessThanOrEqual(60);
  });
});

describe('tick y controles', () => {
  it('pausa y velocidad', () => {
    const s = createFleet(T0);
    expect(tick(toggleRun(s), 1000)).toEqual(toggleRun(s));
    const fast = tick(setSpeed(s, 20), 1000);
    expect(fast.now).toBe(T0 + 20_000);
    expect(setSpeed(s, 3 as never)).toBe(s);
    // Un salto enorme (pestaña dormida) se limita a 5 s reales.
    expect(tick(s, 600_000).now).toBe(T0 + 5_000);
  });

  it('fuera de servicio: no se mueve, no cuenta como activo y genera evento', () => {
    let s = createFleet(T0);
    const id = s.buses[0]!.id;
    s = setOutOfService(s, id, true);
    expect(s.events[0]?.message).toContain('sale de servicio');
    const pos = s.buses[0]!.pos;
    s = advance(s, 60);
    expect(s.buses[0]!.pos).toBe(pos);
    expect(currentSpeed(s, s.buses[0]!)).toBe(0);
    expect(kpis(s).outOfService).toBe(1);
    expect(vehicleViews(s)[0]!.status).toBe('fuera_de_servicio');
    expect(setOutOfService(s, id, true)).toBe(s);
    s = setOutOfService(s, id, false);
    expect(s.events[0]?.message).toContain('vuelve a servicio');
    expect(setOutOfService(s, 'nope', true)).toBe(s);
  });

  it('un incidente frena el tramo, retrasa y luego se despeja', () => {
    let s = injectIncident(createFleet(T0), 'A');
    expect(s.incidents).toHaveLength(1);
    expect(s.events[0]?.level).toBe('alert');
    const base = advance(createFleet(T0), 480);
    for (let i = 0; i < 8; i++) s = advance(s, 60);
    const delay = (x: typeof s) =>
      x.buses.filter((b) => b.routeId === 'A').reduce((a, b) => a + b.delayS, 0);
    expect(delay(s)).toBeGreaterThan(delay(base));
    s = advance(s, 60);
    expect(s.incidents).toHaveLength(0);
    expect(s.events.some((e) => e.message.startsWith('Se despejó'))).toBe(true);
  });

  it('clearIncidents', () => {
    const s = injectIncident(createFleet(T0), 'B');
    expect(clearIncidents(s).incidents).toHaveLength(0);
    const clean = createFleet(T0);
    expect(clearIncidents(clean)).toBe(clean);
  });

  it('detecta agrupamiento una vez por par', () => {
    const net = buildNetwork([LINE]);
    let s = createFleet(T0, 7, net);
    s = { ...s, buses: s.buses.map((b, i) => ({ ...b, pos: 500 + i * 100, dwellLeft: 0 })) };
    s = advance(s, 1, net);
    const alerts = s.events.filter((e) => e.message.startsWith('Agrupamiento'));
    expect(alerts.length).toBeGreaterThan(0);
    const again = advance(s, 1, net).events.filter((e) => e.message.startsWith('Agrupamiento'));
    expect(again.length).toBe(alerts.length);
  });
});

describe('vistas', () => {
  it('vehicleViews trae posición, próxima parada y ETA', () => {
    const v = vehicleViews(advance(createFleet(T0), 30));
    for (const x of v) {
      expect(x.lng).toBeGreaterThan(-75);
      expect(x.lat).toBeGreaterThan(10.8);
      expect(x.nextStop).not.toBe('—');
      expect(x.nextStopEtaMin).toBeGreaterThanOrEqual(0);
      expect(x.bearing).toBeGreaterThanOrEqual(0);
      expect(x.bearing).toBeLessThan(360);
    }
  });

  it('stopViews une paradas compartidas entre rutas', () => {
    const plaza = stopViews().find((s) => s.name === 'Plaza Mayor')!;
    expect(plaza.routes.sort()).toEqual(['A', 'D']);
  });

  it('stopArrivals ordena por ETA', () => {
    const arr = stopArrivals(createFleet(T0), 'Estadio');
    expect(arr.length).toBeGreaterThan(0);
    expect(arr.map((a) => a.etaMin)).toEqual([...arr.map((a) => a.etaMin)].sort((a, b) => a - b));
    expect(new Set(arr.map((a) => a.routeId)).size).toBeGreaterThanOrEqual(1);
  });
});

describe('warmFleet', () => {
  it('termina en `now`, con eventos y determinista', () => {
    const s = warmFleet(T0);
    expect(s.now).toBe(T0);
    expect(s.events.length).toBeGreaterThan(3);
    expect(warmFleet(T0)).toEqual(s);
  });

  it('en terminal el bus ya mira a la vuelta', () => {
    let s = warmFleet(T0);
    for (let i = 0; i < 600; i++) {
      s = advance(s, 1);
      for (const v of vehicleViews(s)) {
        if (v.status === 'terminal') {
          const route = ROUTES.find((r) => r.id === v.routeId)!;
          expect(v.nextStop).not.toBe(
            v.direction === 'ida' ? route.stops[0]!.name : route.stops.at(-1)!.name,
          );
        }
      }
    }
  });
});
