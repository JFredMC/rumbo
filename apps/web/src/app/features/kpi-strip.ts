import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ConsoleStore } from '../core/console.store';

@Component({
  selector: 'app-kpi-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  host: { class: 'kpis', role: 'list', 'aria-label': 'Indicadores de la flota' },
  template: `
    <div class="kpi" role="listitem">
      <span class="kpi-label">En operación</span>
      <strong class="kpi-value" data-testid="kpi-active">{{ k().active }}</strong>
      <span class="kpi-sub">de {{ total() }} buses</span>
    </div>
    <div class="kpi" role="listitem" [class.warn]="k().onTimePct < 75">
      <span class="kpi-label">Puntualidad</span>
      <strong class="kpi-value" data-testid="kpi-ontime">{{ k().onTimePct }}%</strong>
      <span class="kpi-sub">±3 min del horario</span>
    </div>
    <div class="kpi" role="listitem" [class.warn]="k().avgDelayMin >= 3">
      <span class="kpi-label">Retraso medio</span>
      <strong class="kpi-value">{{ k().avgDelayMin | number: '1.1-1' }} min</strong>
      <span class="kpi-sub">buses en servicio</span>
    </div>
    <div class="kpi" role="listitem">
      <span class="kpi-label">Ocupación</span>
      <strong class="kpi-value">{{ k().avgOccupancy }}%</strong>
      <span class="kpi-sub">promedio</span>
    </div>
    <div class="kpi" role="listitem" [class.bad]="k().incidents > 0">
      <span class="kpi-label">Incidentes</span>
      <strong class="kpi-value" data-testid="kpi-incidents">{{ k().incidents }}</strong>
      <span class="kpi-sub">{{ k().outOfService }} fuera de servicio</span>
    </div>
  `,
})
export class KpiStrip {
  private readonly store = inject(ConsoleStore);
  readonly k = this.store.kpis;
  readonly total = computed(() => this.store.state().buses.length);
}
