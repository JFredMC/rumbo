import { NETWORK, warmFleet, type FleetState } from '@rumbo/fleet-engine';

export const STORAGE_KEY = 'rumbo:fleet:v1';

const SPEEDS = new Set([1, 5, 20]);

/**
 * Recupera la flota guardada. Si no hay nada, la forma no cuadra o las rutas cambiaron,
 * arranca una flota nueva. Los tiempos del estado son relativos, así que se retoma tal cual.
 */
export function loadFleet(storage: Storage | undefined, now: number): FleetState {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return warmFleet(now);
    const s = JSON.parse(raw) as Partial<FleetState>;
    const ok =
      s.version === 1 &&
      typeof s.now === 'number' &&
      typeof s.seq === 'number' &&
      Array.isArray(s.buses) &&
      s.buses.length > 0 &&
      s.buses.every((b) => NETWORK.has(b?.routeId) && typeof b.pos === 'number') &&
      Array.isArray(s.incidents) &&
      Array.isArray(s.events);
    if (!ok) return warmFleet(now);
    return {
      ...(s as FleetState),
      running: s.running !== false,
      speed: SPEEDS.has(s.speed as number) ? (s.speed as FleetState['speed']) : 1,
    };
  } catch {
    return warmFleet(now);
  }
}

export function saveFleet(storage: Storage | undefined, s: FleetState): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* sin cuota o modo privado: la demo sigue en memoria */
  }
}

export function clearFleet(storage: Storage | undefined): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
