import type { Signal } from '@angular/core';
import type { FleetState, Speed } from '@rumbo/fleet-engine';

/**
 * Fuente del estado de la flota. En modo demo la simulación corre en el navegador;
 * la interfaz sólo depende de esta clase.
 */
export abstract class FleetStore {
  abstract readonly mode: 'demo' | 'api';
  abstract readonly state: Signal<FleetState>;
  abstract toggleRun(): void;
  abstract setSpeed(speed: Speed): void;
  abstract setOutOfService(busId: string, out: boolean): void;
  abstract injectIncident(routeId: string): void;
  abstract clearIncidents(): void;
  abstract reset(): void;
}
