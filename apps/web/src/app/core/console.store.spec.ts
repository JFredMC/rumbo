import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { setOutOfService, warmFleet, type FleetState } from '@rumbo/fleet-engine';
import { ConsoleStore } from './console.store';
import { FleetStore } from './fleet-store';

export class FakeFleetStore extends FleetStore {
  readonly mode = 'demo' as const;
  readonly state = signal<FleetState>(warmFleet(Date.UTC(2026, 9, 7, 17)));
  override toggleRun = vi.fn();
  override setSpeed = vi.fn();
  override setOutOfService = vi.fn((id: string, out: boolean) =>
    this.state.update((s) => setOutOfService(s, id, out)),
  );
  override injectIncident = vi.fn();
  readonly connected = signal(true);
  readonly error = signal<string | null>(null);
  dispatch = vi.fn();
  override clearIncidents = vi.fn();
  reset = vi.fn();
}

describe('ConsoleStore', () => {
  let store: ConsoleStore;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: FleetStore, useClass: FakeFleetStore }],
    });
    store = TestBed.inject(ConsoleStore);
  });

  it('filtra por ruta y por texto', () => {
    const total = store.vehicles().length;
    expect(store.filtered()).toHaveLength(total);
    store.toggleRoute('B');
    expect(store.filtered().every((v) => v.routeId === 'B')).toBe(true);
    store.toggleRoute('C');
    expect(new Set(store.filtered().map((v) => v.routeId))).toEqual(new Set(['B', 'C']));
    store.toggleRoute('B');
    store.toggleRoute('C');
    store.search.set('rb-1');
    expect(store.filtered().every((v) => v.code.startsWith('RB-1'))).toBe(true);
  });

  it('seleccionar un bus activa seguir y abre el detalle; Escape limpia', () => {
    const id = store.vehicles()[2]!.id;
    store.selectBus(id);
    expect(store.selectedBus()?.id).toBe(id);
    expect(store.follow()).toBe(true);
    expect(store.mobileTab()).toBe('detalle');
    store.clearSelection();
    expect(store.selectedBus()).toBeNull();
    expect(store.follow()).toBe(false);
  });

  it('parada seleccionada muestra próximas llegadas', () => {
    store.selectStop('Plaza Mayor');
    expect(store.selectedStop()?.routes).toContain('A');
    expect(store.arrivals().length).toBeGreaterThan(0);
  });

  it('la búsqueda también encuentra paradas', () => {
    store.search.set('p');
    expect(store.stopMatches()).toEqual([]);
    store.search.set('terminal');
    expect(store.stopMatches().map((s) => s.name)).toContain('Terminal Norte');
    expect(store.stopMatches().length).toBeLessThanOrEqual(4);
  });

  it('sólo alertas oculta los eventos informativos', () => {
    store.onlyAlerts.set(true);
    expect(store.events().every((e) => e.level !== 'info')).toBe(true);
  });
});
