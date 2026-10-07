import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { StopView } from '@rumbo/fleet-engine';
import { ConsoleStore } from '../core/console.store';
import { EtaPipe, RouteColorPipe, RoutePipe } from '../shared/pipes';

@Component({
  selector: 'app-stop-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EtaPipe, RoutePipe, RouteColorPipe],
  host: { class: 'detail' },
  template: `
    @let s = stop();
    <header class="detail-head">
      <span class="stop-icon" aria-hidden="true"
        ><i class="bi" [class]="s.terminal ? 'bi-building' : 'bi-signpost-2'"></i
      ></span>
      <div class="detail-title">
        <h2 data-testid="stop-name">{{ s.name }}</h2>
        <span class="muted"
          >{{ s.terminal ? 'Terminal' : 'Parada' }} ·
          @for (r of s.routes; track r) {
            <span class="mini-tag" [style.background]="r | routeColor">{{ r }}</span>
          }
        </span>
      </div>
      <button
        type="button"
        class="icon-btn"
        aria-label="Cerrar parada"
        (click)="store.clearSelection()"
      >
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>
    </header>
    <h3 class="board-title">Próximas llegadas</h3>
    <ol class="board" aria-label="Próximas llegadas" data-testid="arrivals">
      @for (a of store.arrivals(); track a.busId + a.direction) {
        <li>
          <button type="button" class="board-row" (click)="store.selectBus(a.busId)">
            <span class="route-tag" [style.background]="a.routeId | routeColor">{{
              a.routeId
            }}</span>
            <span class="bus-code">{{ a.code }}</span>
            <span class="muted dir"
              >{{ a.direction === 'ida' ? 'Ida' : 'Vuelta' }} · {{ a.routeId | route }}</span
            >
            <strong class="eta">{{ a.etaMin | eta }}</strong>
          </button>
        </li>
      } @empty {
        <li class="empty">Sin buses en camino a esta parada.</li>
      }
    </ol>
  `,
})
export class StopBoard {
  readonly store = inject(ConsoleStore);
  readonly stop = input.required<StopView>();
}
