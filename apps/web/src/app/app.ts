import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import type { Speed } from '@rumbo/fleet-engine';
import { ConsoleStore, type MobileTab } from './core/console.store';
import { EventLog } from './features/event-log';
import { FleetList } from './features/fleet-list';
import { FleetMap } from './features/fleet-map';
import { KpiStrip } from './features/kpi-strip';
import { MapToolbar } from './features/map-toolbar';
import { StopBoard } from './features/stop-board';
import { VehicleDetail } from './features/vehicle-detail';
import { ClockPipe } from './shared/pipes';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClockPipe,
    EventLog,
    FleetList,
    FleetMap,
    KpiStrip,
    MapToolbar,
    StopBoard,
    VehicleDetail,
  ],
  templateUrl: './app.html',
})
export class App {
  readonly store = inject(ConsoleStore);
  readonly fleet = this.store.fleet;
  readonly speeds: readonly Speed[] = [1, 5, 20];
  readonly tabs: readonly { id: MobileTab; label: string }[] = [
    { id: 'flota', label: 'Flota' },
    { id: 'detalle', label: 'Detalle' },
    { id: 'bitacora', label: 'Bitácora' },
  ];

  reset(): void {
    if (confirm('¿Reiniciar la demo? Se pierde el estado guardado en este navegador.')) {
      this.store.clearSelection();
      this.fleet.reset();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.store.clearSelection();
  }
}
