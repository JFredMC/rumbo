import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { levelLabel } from '@rumbo/fleet-engine';
import { ConsoleStore } from '../core/console.store';
import { ClockPipe } from '../shared/pipes';

@Component({
  selector: 'app-event-log',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClockPipe],
  host: { class: 'event-log' },
  template: `
    <header class="panel-head">
      <h2>Bitácora</h2>
      <label class="switch">
        <input
          type="checkbox"
          [checked]="store.onlyAlerts()"
          (change)="store.onlyAlerts.set(!store.onlyAlerts())"
        />
        <span>Sólo alertas</span>
      </label>
    </header>
    <ol class="log" aria-label="Eventos recientes" aria-live="polite" data-testid="event-log">
      @for (e of store.events(); track e.id) {
        <li [attr.data-level]="e.level">
          <time>{{ e.at | clock }}</time>
          <span class="lvl" [title]="label(e.level)"
            ><span class="sr-only">{{ label(e.level) }}: </span></span
          >
          @if (e.busId) {
            <button type="button" class="link" (click)="store.selectBus(e.busId)">
              {{ e.message }}
            </button>
          } @else {
            <span>{{ e.message }}</span>
          }
        </li>
      } @empty {
        <li class="empty">Sin eventos todavía.</li>
      }
    </ol>
  `,
})
export class EventLog {
  readonly store = inject(ConsoleStore);
  readonly label = levelLabel;
}
