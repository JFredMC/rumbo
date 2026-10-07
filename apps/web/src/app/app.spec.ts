import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { FleetStore } from './core/fleet-store';
import { FakeFleetStore } from './core/console.store.spec';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: FleetStore, useClass: FakeFleetStore }],
    });
  });

  function render() {
    const f = TestBed.createComponent(App);
    f.detectChanges();
    return {
      f,
      el: f.nativeElement as HTMLElement,
      fleet: TestBed.inject(FleetStore) as FakeFleetStore,
    };
  }

  it('pinta la consola en español con KPI, lista y bitácora', () => {
    const { el } = render();
    expect(el.querySelector('.logo-text')?.textContent).toContain('Rumbo');
    expect(el.querySelector('[data-testid="kpi-active"]')?.textContent?.trim()).toBe('20');
    expect(el.querySelectorAll('.bus-row').length).toBe(20);
    expect(el.querySelector('[data-testid="event-log"] li')).not.toBeNull();
    expect(el.textContent).toContain('Elige un bus');
  });

  it('sin WebGL muestra el aviso del mapa', async () => {
    const { f, el } = render();
    await f.whenStable();
    expect(el.querySelector('.map-fallback')?.textContent).toContain('WebGL');
  });

  it('elegir un bus muestra el detalle y permite sacarlo de servicio', async () => {
    const { f, el, fleet } = render();
    el.querySelector<HTMLButtonElement>('[data-testid="bus-RB-101"]')!.click();
    await f.whenStable();
    expect(el.querySelector('[data-testid="detail-code"]')?.textContent).toBe('RB-101');
    const out = [...el.querySelectorAll<HTMLButtonElement>('.actions .btn')].find((b) =>
      b.textContent?.includes('Sacar de servicio'),
    )!;
    out.click();
    await f.whenStable();
    expect(fleet.setOutOfService).toHaveBeenCalledWith('rb-101', true);
    expect(el.querySelector('[data-testid="detail-status"]')?.textContent).toBe(
      'Fuera de servicio',
    );
    expect(el.textContent).toContain('Reintegrar');
  });

  it('controles de simulación llaman al store', async () => {
    const { f, el, fleet } = render();
    el.querySelector<HTMLButtonElement>('[data-testid="toggle-run"]')!.click();
    const fast = [...el.querySelectorAll<HTMLButtonElement>('.seg button')].find((b) =>
      b.textContent?.includes('20×'),
    )!;
    fast.click();
    await f.whenStable();
    expect(fleet.toggleRun).toHaveBeenCalled();
    expect(fleet.setSpeed).toHaveBeenCalledWith(20);
  });

  it('simular incidente en una ruta', async () => {
    const { f, el, fleet } = render();
    el.querySelector<HTMLButtonElement>('[aria-controls="incident-menu"]')!.click();
    await f.whenStable();
    el.querySelectorAll<HTMLButtonElement>('.menu-item')[2]!.click();
    expect(fleet.injectIncident).toHaveBeenCalledWith('C');
  });

  it('marca JFredDev abre el portafolio en otra pestaña y el tema se alterna', async () => {
    const { f, el } = render();
    const brand = el.querySelector<HTMLAnchorElement>('[data-testid="brand"]')!;
    expect(brand.target).toBe('_blank');
    expect(brand.rel).toContain('noopener');
    expect(brand.href).toBe('https://jfredmc.github.io/portfolio/');
    const before = document.documentElement.dataset['theme'];
    el.querySelector<HTMLButtonElement>('[data-testid="theme"]')!.click();
    await f.whenStable();
    expect(document.documentElement.dataset['theme']).not.toBe(before);
  });
});
