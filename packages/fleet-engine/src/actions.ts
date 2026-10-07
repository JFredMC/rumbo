import { NETWORK } from './network';
import { clearIncidents, injectIncident, setOutOfService, setSpeed, toggleRun } from './sim';
import type { FleetState, Speed } from './types';

/** Acciones que la consola puede pedir. Las mismas en modo demo y por Socket.IO. */
export type FleetAction =
  | { type: 'toggleRun' }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'setOutOfService'; busId: string; out: boolean }
  | { type: 'injectIncident'; routeId: string }
  | { type: 'clearIncidents' };

const SPEEDS: readonly number[] = [1, 5, 20];

/** Valida una acción que llega de fuera. Devuelve `null` si no tiene la forma esperada. */
export function parseFleetAction(raw: unknown): FleetAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  switch (a['type']) {
    case 'toggleRun':
    case 'clearIncidents':
      return { type: a['type'] };
    case 'setSpeed':
      return SPEEDS.includes(a['speed'] as number)
        ? { type: 'setSpeed', speed: a['speed'] as Speed }
        : null;
    case 'setOutOfService':
      return typeof a['busId'] === 'string' &&
        a['busId'].length <= 32 &&
        typeof a['out'] === 'boolean'
        ? { type: 'setOutOfService', busId: a['busId'], out: a['out'] }
        : null;
    case 'injectIncident':
      return typeof a['routeId'] === 'string' && NETWORK.has(a['routeId'])
        ? { type: 'injectIncident', routeId: a['routeId'] }
        : null;
    default:
      return null;
  }
}

export function applyAction(s: FleetState, a: FleetAction): FleetState {
  switch (a.type) {
    case 'toggleRun':
      return toggleRun(s);
    case 'setSpeed':
      return setSpeed(s, a.speed);
    case 'setOutOfService':
      return setOutOfService(s, a.busId, a.out);
    case 'injectIncident':
      return injectIncident(s, a.routeId);
    case 'clearIncidents':
      return clearIncidents(s);
  }
}
