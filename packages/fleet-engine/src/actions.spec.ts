import { describe, expect, it } from 'vitest';
import { applyAction, parseFleetAction } from './actions';
import { createFleet } from './sim';
import { T0 } from './test-helpers';

describe('acciones', () => {
  it('acepta acciones válidas', () => {
    expect(parseFleetAction({ type: 'toggleRun', extra: 1 })).toEqual({ type: 'toggleRun' });
    expect(parseFleetAction({ type: 'setSpeed', speed: 5 })).toEqual({
      type: 'setSpeed',
      speed: 5,
    });
    expect(parseFleetAction({ type: 'injectIncident', routeId: 'C' })).toEqual({
      type: 'injectIncident',
      routeId: 'C',
    });
    expect(parseFleetAction({ type: 'setOutOfService', busId: 'rb-101', out: true })).toEqual({
      type: 'setOutOfService',
      busId: 'rb-101',
      out: true,
    });
  });

  it('rechaza basura', () => {
    for (const bad of [
      null,
      'toggleRun',
      { type: 'nope' },
      { type: 'setSpeed', speed: 3 },
      { type: 'injectIncident', routeId: 'Z' },
      { type: 'setOutOfService', busId: 'x'.repeat(40), out: true },
      { type: 'setOutOfService', busId: 'rb-101', out: 'yes' },
    ])
      expect(parseFleetAction(bad)).toBeNull();
  });

  it('applyAction delega en el motor', () => {
    const s = createFleet(T0);
    expect(applyAction(s, { type: 'toggleRun' }).running).toBe(false);
    expect(applyAction(s, { type: 'setSpeed', speed: 20 }).speed).toBe(20);
    expect(applyAction(s, { type: 'injectIncident', routeId: 'A' }).incidents).toHaveLength(1);
    expect(applyAction(s, { type: 'clearIncidents' })).toBe(s);
    expect(
      applyAction(s, { type: 'setOutOfService', busId: s.buses[0]!.id, out: true }).buses[0]!
        .outOfService,
    ).toBe(true);
  });
});
