import type { Signal } from '@angular/core';
import type { FleetAction, FleetState, Speed } from '@rumbo/fleet-engine';

export type FleetMode = 'demo' | 'api';

/**
 * Fuente del estado de la flota. En modo demo la simulación corre en el navegador; en modo
 * API llega del backend NestJS por Socket.IO. La interfaz sólo depende de esta clase.
 */
export abstract class FleetStore {
  abstract readonly mode: FleetMode;
  abstract readonly state: Signal<FleetState>;
  /** En modo API: hay conexión con el servidor. En demo siempre es `true`. */
  abstract readonly connected: Signal<boolean>;
  abstract readonly error: Signal<string | null>;
  abstract dispatch(action: FleetAction): void;
  abstract reset(): void;

  toggleRun(): void {
    this.dispatch({ type: 'toggleRun' });
  }
  setSpeed(speed: Speed): void {
    this.dispatch({ type: 'setSpeed', speed });
  }
  setOutOfService(busId: string, out: boolean): void {
    this.dispatch({ type: 'setOutOfService', busId, out });
  }
  injectIncident(routeId: string): void {
    this.dispatch({ type: 'injectIncident', routeId });
  }
  clearIncidents(): void {
    this.dispatch({ type: 'clearIncidents' });
  }
}
