import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import * as engine from '@rumbo/fleet-engine';
import type { FleetState, Speed } from '@rumbo/fleet-engine';
import { FleetStore } from './fleet-store';
import { clearFleet, loadFleet, saveFleet } from './demo-storage';

const TICK_MS = 250;
const SAVE_MS = 3000;

const storage = (): Storage | undefined =>
  typeof localStorage === 'undefined' ? undefined : localStorage;

/** Modo demo: la simulación corre aquí mismo y se guarda en localStorage. */
@Injectable()
export class DemoFleetStore extends FleetStore {
  readonly mode = 'demo' as const;
  private readonly _state = signal<FleetState>(loadFleet(storage(), Date.now()));
  readonly state = this._state.asReadonly();

  constructor() {
    super();
    let last = performance.now();
    let lastSave = last;
    const timer = setInterval(() => {
      const t = performance.now();
      this._state.update((s) => engine.tick(s, t - last));
      last = t;
      if (t - lastSave > SAVE_MS) {
        lastSave = t;
        this.save();
      }
    }, TICK_MS);
    const onHide = () => this.save();
    addEventListener('pagehide', onHide);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      removeEventListener('pagehide', onHide);
    });
  }

  private save(): void {
    saveFleet(storage(), this._state());
  }

  private apply(fn: (s: FleetState) => FleetState): void {
    this._state.update(fn);
    this.save();
  }

  toggleRun(): void {
    this.apply(engine.toggleRun);
  }
  setSpeed(speed: Speed): void {
    this.apply((s) => engine.setSpeed(s, speed));
  }
  setOutOfService(busId: string, out: boolean): void {
    this.apply((s) => engine.setOutOfService(s, busId, out));
  }
  injectIncident(routeId: string): void {
    this.apply((s) => engine.injectIncident(s, routeId));
  }
  clearIncidents(): void {
    this.apply(engine.clearIncidents);
  }
  reset(): void {
    clearFleet(storage());
    this.apply(() => engine.warmFleet(Date.now(), (Date.now() % 100000) + 1));
  }
}
