import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  applyAction,
  kpis,
  tick,
  vehicleViews,
  warmFleet,
  type FleetAction,
  type FleetState,
  type Kpis,
  type VehicleView,
} from '@rumbo/fleet-engine';
import { Subject } from 'rxjs';
import { APP_CONFIG, type AppConfig } from '../config';

/**
 * La flota vive en el servidor: avanza cada `tickMs` y publica el estado completo en
 * `changes$`. Es el mismo motor que usa el modo demo del navegador.
 */
@Injectable()
export class FleetService implements OnModuleInit, OnModuleDestroy {
  private state: FleetState;
  private timer?: NodeJS.Timeout;
  private last = 0;
  readonly changes$ = new Subject<FleetState>();

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.state = warmFleet(Date.now());
  }

  onModuleInit(): void {
    this.last = Date.now();
    this.timer = setInterval(() => this.step(Date.now()), this.config.tickMs);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
    this.changes$.complete();
  }

  /** Avanza la simulación hasta `now` (público para tests). */
  step(now: number): void {
    this.state = tick(this.state, now - this.last);
    this.last = now;
    this.changes$.next(this.state);
  }

  snapshot(): FleetState {
    return this.state;
  }

  vehicles(): VehicleView[] {
    return vehicleViews(this.state);
  }

  kpis(): Kpis {
    return kpis(this.state);
  }

  apply(action: FleetAction): FleetState {
    this.state = applyAction(this.state, action);
    this.changes$.next(this.state);
    return this.state;
  }

  reset(): FleetState {
    const now = Date.now();
    this.state = warmFleet(now, (now % 100000) + 1);
    this.last = now;
    this.changes$.next(this.state);
    return this.state;
  }
}
