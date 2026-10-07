import { Injectable, computed, inject, signal } from '@angular/core';
import {
  ROUTES,
  kpis,
  stopArrivals,
  stopViews,
  vehicleViews,
  type RouteDef,
  type VehicleView,
} from '@rumbo/fleet-engine';
import { FleetStore } from './fleet-store';

export type Selection = { kind: 'bus'; id: string } | { kind: 'stop'; name: string } | null;
export type MobileTab = 'flota' | 'detalle' | 'bitacora';

const ROUTE_BY_ID = new Map(ROUTES.map((r) => [r.id, r]));
export const routeOf = (id: string): RouteDef | undefined => ROUTE_BY_ID.get(id);

/** Estado de la consola: selección, filtros y vistas derivadas de la flota. */
@Injectable({ providedIn: 'root' })
export class ConsoleStore {
  readonly fleet = inject(FleetStore);
  readonly routes = ROUTES;
  readonly stops = stopViews();

  readonly selection = signal<Selection>(null);
  /** Rutas visibles. Vacío = todas. */
  readonly routeFilter = signal<readonly string[]>([]);
  readonly search = signal('');
  readonly follow = signal(false);
  readonly onlyAlerts = signal(false);
  readonly mobileTab = signal<MobileTab>('flota');

  readonly state = this.fleet.state;
  readonly vehicles = computed(() => vehicleViews(this.state()));
  readonly kpis = computed(() => kpis(this.state()));

  readonly visibleRoutes = computed(() => {
    const f = this.routeFilter();
    return f.length ? f : ROUTES.map((r) => r.id);
  });

  /** Buses que pasan los filtros de ruta y búsqueda. */
  readonly filtered = computed<VehicleView[]>(() => {
    const routes = new Set(this.visibleRoutes());
    const q = this.search().trim().toLowerCase();
    return this.vehicles().filter(
      (v) =>
        routes.has(v.routeId) &&
        (!q ||
          v.code.toLowerCase().includes(q) ||
          v.driver.toLowerCase().includes(q) ||
          v.nextStop.toLowerCase().includes(q)),
    );
  });

  /** Paradas cuyo nombre coincide con la búsqueda (máx. 4). */
  readonly stopMatches = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (q.length < 2) return [];
    return this.stops.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 4);
  });

  readonly selectedBus = computed(() => {
    const sel = this.selection();
    return sel?.kind === 'bus' ? (this.vehicles().find((v) => v.id === sel.id) ?? null) : null;
  });

  readonly selectedStop = computed(() => {
    const sel = this.selection();
    return sel?.kind === 'stop' ? (this.stops.find((s) => s.name === sel.name) ?? null) : null;
  });

  readonly arrivals = computed(() => {
    const stop = this.selectedStop();
    return stop ? stopArrivals(this.state(), stop.name, 8) : [];
  });

  readonly events = computed(() => {
    const evs = this.state().events;
    return this.onlyAlerts() ? evs.filter((e) => e.level !== 'info') : evs;
  });

  selectBus(id: string): void {
    const already = this.selection()?.kind === 'bus' && this.selectedBus()?.id === id;
    this.selection.set({ kind: 'bus', id });
    if (!already) this.follow.set(true);
    this.mobileTab.set('detalle');
  }

  selectStop(name: string): void {
    this.selection.set({ kind: 'stop', name });
    this.follow.set(false);
    this.mobileTab.set('detalle');
  }

  clearSelection(): void {
    this.selection.set(null);
    this.follow.set(false);
  }

  toggleRoute(id: string): void {
    this.routeFilter.update((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }

  showOnlyRoute(id: string): void {
    this.routeFilter.set([id]);
  }
}
