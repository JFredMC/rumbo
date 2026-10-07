import { describe, expect, it } from 'vitest';
import { bearing, buildPath, haversine, pointAt } from './geo';

describe('geo', () => {
  it('haversine: 0,01° de longitud en el trópico ≈ 1,09 km', () => {
    expect(haversine([-74.8, 11], [-74.79, 11])).toBeCloseTo(1092, -1);
  });
  it('bearing: este = 90°, norte = 0°', () => {
    expect(bearing([0, 0], [1, 0])).toBeCloseTo(90);
    expect(bearing([0, 0], [0, 1])).toBeCloseTo(0);
    expect(bearing([0, 1], [0, 0])).toBeCloseTo(180);
  });
  it('pointAt interpola y se queda dentro del trazado', () => {
    const p = buildPath([
      [0, 0],
      [0.01, 0],
      [0.02, 0],
    ]);
    const mid = pointAt(p, p.total / 2);
    expect(mid.lng).toBeCloseTo(0.01, 5);
    expect(pointAt(p, -10).lng).toBe(0);
    expect(pointAt(p, p.total * 2).lng).toBeCloseTo(0.02, 6);
  });
});
