import { describe, expect, it } from 'vitest';
import { clock, delayLabel, etaLabel, kindLabel, statusLabel } from './format';

describe('format', () => {
  it('etiquetas en español', () => {
    expect(statusLabel('fuera_de_servicio')).toBe('Fuera de servicio');
    expect(kindLabel('electrico')).toBe('Bus eléctrico');
  });
  it('retraso y ETA', () => {
    expect(delayLabel(0.2)).toBe('a tiempo');
    expect(delayLabel(3.5)).toBe('+3,5 min');
    expect(delayLabel(-1.2)).toBe('−1,2 min');
    expect(etaLabel(0.5)).toBe('llegando');
    expect(etaLabel(4.4)).toBe('4 min');
  });
  it('reloj en hora Colombia', () => {
    expect(clock(Date.UTC(2026, 9, 7, 17, 5, 9))).toBe('12:05:09');
  });
});
