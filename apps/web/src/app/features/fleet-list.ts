import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConsoleStore } from '../core/console.store';
import { DelayPipe, EtaPipe, RouteColorPipe, StatusPipe } from '../shared/pipes';

@Component({
  selector: 'app-fleet-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DelayPipe, EtaPipe, StatusPipe, RouteColorPipe],
  host: { class: 'fleet-list' },
  template: `
    <header class="panel-head">
      <h2>Flota</h2>
      <span class="count" aria-live="polite">{{ store.filtered().length }} buses</span>
    </header>
    <div class="chips" role="group" aria-label="Filtrar por ruta">
      @for (r of store.routes; track r.id) {
        <button
          type="button"
          class="chip"
          [class.on]="store.routeFilter().includes(r.id)"
          [attr.aria-pressed]="store.routeFilter().includes(r.id)"
          [style.--c]="r.color"
          [title]="r.name"
          (click)="store.toggleRoute(r.id)"
        >
          <span class="dot" aria-hidden="true"></span>{{ r.id }}
        </button>
      }
      @if (store.routeFilter().length) {
        <button type="button" class="chip ghost" (click)="store.routeFilter.set([])">Todas</button>
      }
    </div>
    <label class="search">
      <i class="bi bi-search" aria-hidden="true"></i>
      <span class="sr-only">Buscar bus</span>
      <input
        type="search"
        placeholder="Buscar código, conductor o parada"
        [value]="store.search()"
        (input)="store.search.set($any($event.target).value)"
      />
    </label>
    <ul class="bus-list" aria-label="Buses">
      @for (v of store.filtered(); track v.id) {
        <li>
          <button
            type="button"
            class="bus-row"
            [class.selected]="store.selectedBus()?.id === v.id"
            [attr.aria-current]="store.selectedBus()?.id === v.id ? 'true' : null"
            [attr.data-testid]="'bus-' + v.code"
            (click)="store.selectBus(v.id)"
          >
            <span class="route-tag" [style.background]="v.routeId | routeColor">{{
              v.routeId
            }}</span>
            <span class="bus-main">
              <span class="bus-code">
                {{ v.code }}
                @if (v.kind === 'electrico') {
                  <i
                    class="bi bi-lightning-charge-fill elec"
                    title="Eléctrico"
                    aria-label="eléctrico"
                  ></i>
                }
              </span>
              <span class="bus-next">→ {{ v.nextStop }} · {{ v.nextStopEtaMin | eta }}</span>
            </span>
            <span class="bus-side">
              <span class="pill" [attr.data-status]="v.status">{{ v.status | status }}</span>
              @if (v.status !== 'fuera_de_servicio') {
                <span
                  class="delay"
                  [class.late]="v.delayMin >= 3"
                  [class.early]="v.delayMin <= -2"
                  >{{ v.delayMin | delay }}</span
                >
              }
            </span>
          </button>
        </li>
      } @empty {
        <li class="empty">Ningún bus coincide con el filtro.</li>
      }
    </ul>
  `,
})
export class FleetList {
  readonly store = inject(ConsoleStore);
}
