import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { VehicleView } from '@rumbo/fleet-engine';
import { ConsoleStore, routeOf } from '../core/console.store';
import {
  DelayPipe,
  EtaPipe,
  KindPipe,
  RouteColorPipe,
  RoutePipe,
  StatusPipe,
} from '../shared/pipes';

@Component({
  selector: 'app-vehicle-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, DelayPipe, EtaPipe, KindPipe, RoutePipe, RouteColorPipe, StatusPipe],
  host: { class: 'detail' },
  template: `
    @let v = bus();
    <header class="detail-head">
      <span class="route-tag lg" [style.background]="v.routeId | routeColor">{{ v.routeId }}</span>
      <div class="detail-title">
        <h2 data-testid="detail-code">{{ v.code }}</h2>
        <span class="muted">{{ v.routeId | route: true }}</span>
      </div>
      <button
        type="button"
        class="icon-btn"
        aria-label="Cerrar detalle"
        (click)="store.clearSelection()"
      >
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>
    </header>

    <div class="detail-status">
      <span class="pill" [attr.data-status]="v.status" data-testid="detail-status">{{
        v.status | status
      }}</span>
      <span class="muted">{{ v.kind | kind }} · {{ v.driver }}</span>
    </div>

    @if (v.status !== 'fuera_de_servicio') {
      <div class="next-stop">
        <span class="muted"
          >{{ v.direction === 'ida' ? 'Ida' : 'Vuelta' }} hacia {{ towards() }}</span
        >
        <div class="next-line">
          <i class="bi bi-geo-alt-fill" aria-hidden="true"></i>
          <strong>{{ v.nextStop }}</strong>
          <span class="eta" data-testid="detail-eta">{{ v.nextStopEtaMin | eta }}</span>
        </div>
        <div class="leg" aria-hidden="true"><span [style.width.%]="legPct()"></span></div>
      </div>

      <dl class="facts">
        <div>
          <dt>Velocidad</dt>
          <dd>{{ v.speedKmh }} km/h</dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd [class.late]="v.delayMin >= 3" [class.early]="v.delayMin <= -2">
            {{ v.delayMin | delay }}
          </dd>
        </div>
        <div>
          <dt>Ocupación</dt>
          <dd>
            <span class="meter" [class.hot]="v.occupancy >= 85"
              ><span [style.width.%]="v.occupancy"></span
            ></span>
            {{ v.occupancy }}%
          </dd>
        </div>
        @if (v.kind === 'electrico') {
          <div>
            <dt>Batería</dt>
            <dd>
              <span class="meter batt" [class.low]="v.battery < 25"
                ><span [style.width.%]="v.battery"></span
              ></span>
              {{ v.battery | number: '1.0-0' }}%
            </dd>
          </div>
        }
      </dl>
    } @else {
      <p class="muted oos">
        Fuera de servicio: no aparece en el mapa ni cuenta en los indicadores.
      </p>
    }

    <div class="actions">
      @if (v.status !== 'fuera_de_servicio') {
        <button
          type="button"
          class="btn"
          [class.on]="store.follow()"
          [attr.aria-pressed]="store.follow()"
          (click)="store.follow.set(!store.follow())"
        >
          <i
            class="bi"
            [class]="store.follow() ? 'bi-crosshair2' : 'bi-crosshair'"
            aria-hidden="true"
          ></i>
          {{ store.follow() ? 'Siguiendo' : 'Seguir en el mapa' }}
        </button>
        <button type="button" class="btn danger" (click)="store.fleet.setOutOfService(v.id, true)">
          <i class="bi bi-slash-circle" aria-hidden="true"></i> Sacar de servicio
        </button>
      } @else {
        <button
          type="button"
          class="btn primary"
          (click)="store.fleet.setOutOfService(v.id, false)"
        >
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reintegrar
        </button>
      }
      <button type="button" class="btn ghost" (click)="store.showOnlyRoute(v.routeId)">
        <i class="bi bi-funnel" aria-hidden="true"></i> Sólo {{ v.routeId | route }}
      </button>
    </div>
  `,
})
export class VehicleDetail {
  readonly store = inject(ConsoleStore);
  readonly bus = input.required<VehicleView>();

  readonly towards = computed(() => {
    const b = this.bus();
    const stops = routeOf(b.routeId)?.stops ?? [];
    return (b.direction === 'ida' ? stops.at(-1) : stops[0])?.name ?? '';
  });

  /** Avance dentro del sentido actual (0-100). */
  readonly legPct = computed(() => {
    const p = this.bus().progress;
    return Math.round((p < 0.5 ? p * 2 : (p - 0.5) * 2) * 100);
  });
}
