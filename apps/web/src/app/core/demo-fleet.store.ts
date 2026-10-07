import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import {
  applyAction,
  tick,
  warmFleet,
  type FleetAction,
  type FleetState,
} from '@rumbo/fleet-engine';
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
  readonly connected = signal(true).asReadonly();
  readonly error = signal<string | null>(null).asReadonly();
  private readonly _state = signal<FleetState>(loadFleet(storage(), Date.now()));
  readonly state = this._state.asReadonly();

  constructor() {
    super();
    let last = performance.now();
    let lastSave = last;
    const timer = setInterval(() => {
      const t = performance.now();
      this._state.update((s) => tick(s, t - last));
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

  dispatch(action: FleetAction): void {
    this._state.update((s) => applyAction(s, action));
    this.save();
  }

  reset(): void {
    clearFleet(storage());
    this._state.set(warmFleet(Date.now(), (Date.now() % 100000) + 1));
    this.save();
  }
}
