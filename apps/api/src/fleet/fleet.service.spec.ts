import { loadConfig } from '../config';
import { FleetService } from './fleet.service';

describe('FleetService', () => {
  let svc: FleetService;
  beforeEach(() => {
    svc = new FleetService(loadConfig({}));
  });
  afterEach(() => svc.onModuleDestroy());

  it('arranca con una flota en operación', () => {
    expect(svc.snapshot().buses.length).toBeGreaterThan(10);
    expect(svc.vehicles()).toHaveLength(svc.snapshot().buses.length);
    expect(svc.kpis().active).toBe(svc.snapshot().buses.length);
  });

  it('step avanza el reloj y publica el estado', () => {
    const seen: number[] = [];
    svc.changes$.subscribe((s) => seen.push(s.now));
    const t0 = svc.snapshot().now;
    svc['last'] = 1000;
    svc.step(3000);
    expect(svc.snapshot().now).toBe(t0 + 2000);
    expect(seen).toEqual([t0 + 2000]);
  });

  it('aplica acciones y reinicia', () => {
    svc.apply({ type: 'injectIncident', routeId: 'B' });
    expect(svc.kpis().incidents).toBe(1);
    svc.apply({ type: 'toggleRun' });
    expect(svc.snapshot().running).toBe(false);
    svc.reset();
    expect(svc.snapshot().running).toBe(true);
    expect(svc.kpis().incidents).toBe(0);
  });
});
