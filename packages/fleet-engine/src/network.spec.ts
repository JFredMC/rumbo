import { describe, expect, it } from 'vitest';
import { ROUTES } from './data/routes';
import { buildNetwork, forward, NETWORK, positionOnCycle } from './network';
import { LINE } from './test-helpers';

describe('network', () => {
  const net = buildNetwork([LINE]);
  const r = net.get('T')!;

  it('ciclo = ida + vuelta; terminales en 0 y en la mitad', () => {
    expect(r.cycle).toBeCloseTo(2 * r.path.total);
    expect(r.stops.map((s) => [s.name, s.direction])).toEqual([
      ['Inicio', 'ida'],
      ['Medio', 'ida'],
      ['Fin', 'ida'],
      ['Medio', 'vuelta'],
    ]);
    expect(r.stops.filter((s) => s.terminal).map((s) => s.name)).toEqual(['Inicio', 'Fin']);
    expect(r.stops[3]!.pos).toBeCloseTo(1.5 * r.path.total);
  });

  it('en la vuelta el bus mira al revés', () => {
    expect(positionOnCycle(r, 100).bearing).toBeCloseTo(90, 0);
    expect(positionOnCycle(r, r.cycle - 100).bearing).toBeCloseTo(270, 0);
  });

  it('forward da la vuelta al ciclo', () => {
    expect(forward(r, 100, 300)).toBe(200);
    expect(forward(r, 300, 100)).toBeCloseTo(r.cycle - 200);
  });

  it('las rutas reales del demo tienen 5 líneas con paradas ordenadas', () => {
    expect(ROUTES).toHaveLength(5);
    for (const def of ROUTES) {
      const ats = def.stops.map((s) => s.at);
      expect(ats[0]).toBe(0);
      expect(ats.at(-1)).toBe(1);
      expect([...ats].sort((a, b) => a - b)).toEqual(ats);
      expect(NETWORK.get(def.id)!.path.total).toBeGreaterThan(3000);
    }
  });

  it('ruta desconocida lanza', async () => {
    const { getRoute } = await import('./network');
    expect(() => getRoute(net, 'Z')).toThrow(/desconocida/);
  });
});
