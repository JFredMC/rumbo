import { advance, warmFleet } from '@rumbo/fleet-engine';
import { STORAGE_KEY, clearFleet, loadFleet, saveFleet } from './demo-storage';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

const T0 = Date.UTC(2026, 9, 7, 17);

describe('demo-storage', () => {
  it('sin nada guardado arranca una flota ya en operación', () => {
    const s = loadFleet(new MemStorage(), T0);
    expect(s.now).toBe(T0);
    expect(s.buses.length).toBeGreaterThan(10);
    expect(s.events.length).toBeGreaterThan(1);
  });

  it('guarda y recupera el estado tal cual', () => {
    const st = new MemStorage();
    const s = advance(warmFleet(T0), 90);
    saveFleet(st, s);
    expect(loadFleet(st, T0 + 999_999)).toEqual(s);
    clearFleet(st);
    expect(st.getItem(STORAGE_KEY)).toBeNull();
  });

  it('descarta datos corruptos o de otra versión', () => {
    const st = new MemStorage();
    st.setItem(STORAGE_KEY, '{nope');
    expect(loadFleet(st, T0).now).toBe(T0);
    st.setItem(STORAGE_KEY, JSON.stringify({ ...warmFleet(T0 - 5000), version: 2 }));
    expect(loadFleet(st, T0).now).toBe(T0);
    const s = warmFleet(T0 - 5000);
    st.setItem(STORAGE_KEY, JSON.stringify({ ...s, buses: [{ ...s.buses[0], routeId: 'Z' }] }));
    expect(loadFleet(st, T0).now).toBe(T0);
  });

  it('normaliza velocidad inválida y funciona sin storage', () => {
    const st = new MemStorage();
    st.setItem(STORAGE_KEY, JSON.stringify({ ...warmFleet(T0), speed: 7 }));
    expect(loadFleet(st, T0).speed).toBe(1);
    expect(loadFleet(undefined, T0).now).toBe(T0);
    expect(() => saveFleet(undefined, warmFleet(T0))).not.toThrow();
  });
});
