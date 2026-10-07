import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ConsoleStore } from '../core/console.store';

/** Controles flotantes sobre el mapa: inyectar o despejar incidentes y leyenda. */
@Component({
  selector: 'app-map-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'map-toolbar' },
  template: `
    <div class="tool-group">
      <button
        type="button"
        class="btn tool"
        [attr.aria-expanded]="open()"
        aria-controls="incident-menu"
        (click)="open.set(!open())"
      >
        <i class="bi bi-cone-striped" aria-hidden="true"></i> Simular incidente
      </button>
      @if (store.state().incidents.length) {
        <button type="button" class="btn tool" (click)="store.fleet.clearIncidents()">
          <i class="bi bi-check2-circle" aria-hidden="true"></i> Despejar
        </button>
      }
    </div>
    @if (open()) {
      <div class="menu" id="incident-menu" role="menu" aria-label="Ruta afectada">
        @for (r of store.routes; track r.id) {
          <button type="button" role="menuitem" class="menu-item" (click)="raise(r.id)">
            <span class="dot" [style.background]="r.color" aria-hidden="true"></span>{{ r.name }}
          </button>
        }
      </div>
    }
    <ul class="legend" aria-label="Leyenda">
      @for (r of store.routes; track r.id) {
        <li>
          <span class="line" [style.background]="r.color" aria-hidden="true"></span>{{ r.name }}
        </li>
      }
      <li><span class="line incident" aria-hidden="true"></span>Tramo con incidente</li>
    </ul>
  `,
})
export class MapToolbar {
  readonly store = inject(ConsoleStore);
  readonly open = signal(false);

  raise(routeId: string): void {
    this.store.fleet.injectIncident(routeId);
    this.open.set(false);
  }
}
