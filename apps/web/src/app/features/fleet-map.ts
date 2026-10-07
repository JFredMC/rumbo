import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { ConsoleStore } from '../core/console.store';
import { busesGeo, incidentsGeo, routesBounds, routesGeo, stopsGeo } from './map-data';

export const MAP_STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
} as const;

const FONT = ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'];

/** Mapa en vivo: rutas, paradas, incidentes y buses. MapLibre se carga bajo demanda. */
@Component({
  selector: 'app-fleet-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'fleet-map' },
  template: `
    <div #host class="map-host" role="region" aria-label="Mapa de la flota en vivo"></div>
    @if (unsupported()) {
      <div class="map-fallback">
        <i class="bi bi-map" aria-hidden="true"></i>
        <p>
          Este navegador no puede mostrar el mapa (WebGL desactivado). La consola sigue funcionando.
        </p>
      </div>
    }
  `,
})
export class FleetMap {
  readonly theme = input<'dark' | 'light'>('dark');
  private readonly store = inject(ConsoleStore);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  readonly unsupported = signal(false);
  private readonly ready = signal(false);
  private map?: MlMap;
  private style?: 'dark' | 'light';

  constructor() {
    afterNextRender(() => void this.init());
    inject(DestroyRef).onDestroy(() => this.map?.remove());

    effect(() => {
      if (!this.ready()) return;
      const visible = this.store.visibleRoutes();
      this.src('routes')?.setData(routesGeo(visible));
      this.src('stops')?.setData(stopsGeo(this.store.stops, visible));
    });

    effect(() => {
      if (!this.ready()) return;
      const sel = this.store.selectedBus();
      this.src('buses')?.setData(
        busesGeo(this.store.vehicles(), this.store.visibleRoutes(), sel?.id ?? null),
      );
      const route = sel?.routeId ?? '';
      this.map?.setPaintProperty('route-line', 'line-opacity', [
        'case',
        ['==', ['get', 'id'], route],
        1,
        route ? 0.3 : 0.9,
      ]);
    });

    effect(() => {
      if (!this.ready()) return;
      this.src('incidents')?.setData(incidentsGeo(this.store.state().incidents));
    });

    // Seguir al bus seleccionado. Si el usuario arrastra el mapa, se deja de seguir.
    let wasFollowing = false;
    effect(() => {
      const bus = this.store.selectedBus();
      const follow = this.store.follow();
      if (!this.ready() || !bus || !follow) {
        wasFollowing = false;
        return;
      }
      const map = this.map!;
      if (!wasFollowing) {
        map.flyTo({
          center: [bus.lng, bus.lat],
          zoom: Math.max(map.getZoom(), 14.2),
          duration: 800,
        });
        wasFollowing = true;
      } else if (!map.isMoving()) {
        map.easeTo({ center: [bus.lng, bus.lat], duration: 240, easing: (t) => t });
      }
    });

    effect(() => {
      const theme = this.theme();
      if (this.map && this.style !== theme) {
        this.style = theme;
        this.map.setStyle(MAP_STYLES[theme]);
      }
    });
  }

  private src(id: string): GeoJSONSource | undefined {
    return this.map?.getSource(id) as GeoJSONSource | undefined;
  }

  private async init(): Promise<void> {
    if (typeof WebGLRenderingContext === 'undefined') {
      this.unsupported.set(true);
      return;
    }
    const { default: maplibregl } = await import('maplibre-gl');
    this.style = untracked(this.theme);
    let map: MlMap;
    try {
      map = new maplibregl.Map({
        container: this.host().nativeElement,
        style: MAP_STYLES[this.style],
        bounds: routesBounds(),
        fitBoundsOptions: { padding: 40 },
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      this.unsupported.set(true);
      return;
    }
    this.map = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.on('style.load', () => {
      this.installLayers(map);
      // Fuerza a los effects a volver a pintar sobre el estilo nuevo.
      this.ready.set(false);
      this.ready.set(true);
    });
    map.on('dragstart', () => this.store.follow.set(false));
    for (const layer of ['bus-circle', 'bus-arrow']) {
      map.on('click', layer, (e) => {
        const id = e.features?.[0]?.properties?.['id'] as string | undefined;
        if (id) this.store.selectBus(id);
      });
    }
    map.on('click', 'stop-circle', (e) => {
      if (map.queryRenderedFeatures(e.point, { layers: ['bus-circle'] }).length) return;
      const name = e.features?.[0]?.properties?.['name'] as string | undefined;
      if (name) this.store.selectStop(name);
    });
    for (const layer of ['bus-circle', 'stop-circle']) {
      map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
    }
  }

  private installLayers(map: MlMap): void {
    const light = this.style === 'light';
    const empty = { type: 'FeatureCollection' as const, features: [] };
    for (const id of ['routes', 'stops', 'buses', 'incidents'])
      map.addSource(id, { type: 'geojson', data: empty });
    if (!map.hasImage('rb-arrow')) map.addImage('rb-arrow', arrowImage(), { pixelRatio: 2 });

    map.addLayer({
      id: 'route-casing',
      type: 'line',
      source: 'routes',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': light ? '#ffffff' : '#050a14',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 4, 16, 11],
        'line-opacity': 0.8,
      },
    });
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'routes',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 16, 6],
        'line-opacity': 0.9,
      },
    });
    map.addLayer({
      id: 'incident-line',
      type: 'line',
      source: 'incidents',
      layout: { 'line-cap': 'round' },
      paint: {
        'line-color': '#f87171',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 12],
        'line-opacity': 0.75,
        'line-dasharray': [1, 1.2],
      },
    });
    map.addLayer({
      id: 'stop-circle',
      type: 'circle',
      source: 'stops',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          11,
          ['case', ['get', 'terminal'], 4, 2.5],
          16,
          ['case', ['get', 'terminal'], 9, 6],
        ],
        'circle-color': light ? '#ffffff' : '#0b1220',
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-width': ['case', ['get', 'terminal'], 3, 2],
      },
    });
    map.addLayer({
      id: 'stop-label',
      type: 'symbol',
      source: 'stops',
      minzoom: 13.5,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': FONT,
        'text-size': 11,
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-optional': true,
      },
      paint: {
        'text-color': light ? '#334155' : '#cbd5e1',
        'text-halo-color': light ? '#ffffff' : '#050a14',
        'text-halo-width': 1.4,
      },
    });
    map.addLayer({
      id: 'bus-halo',
      type: 'circle',
      source: 'buses',
      filter: ['==', ['get', 'selected'], 1],
      paint: {
        'circle-radius': 20,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.25,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-width': 1.5,
      },
    });
    map.addLayer({
      id: 'bus-circle',
      type: 'circle',
      source: 'buses',
      paint: {
        'circle-radius': ['case', ['==', ['get', 'selected'], 1], 11, 8],
        'circle-color': ['get', 'color'],
        'circle-stroke-color': ['case', ['==', ['get', 'late'], 1], '#f87171', '#ffffff'],
        'circle-stroke-width': ['case', ['==', ['get', 'late'], 1], 2.5, 1.5],
      },
    });
    map.addLayer({
      id: 'bus-arrow',
      type: 'symbol',
      source: 'buses',
      layout: {
        'icon-image': 'rb-arrow',
        'icon-size': ['case', ['==', ['get', 'selected'], 1], 0.95, 0.75],
        'icon-rotate': ['get', 'bearing'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });
    map.addLayer({
      id: 'bus-label',
      type: 'symbol',
      source: 'buses',
      filter: ['any', ['==', ['get', 'selected'], 1], ['>=', ['zoom'], 14]],
      layout: {
        'text-field': ['get', 'code'],
        'text-font': FONT,
        'text-size': 11,
        'text-offset': [0, -1.6],
        'text-anchor': 'bottom',
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': light ? '#0b1220' : '#eef3fb',
        'text-halo-color': light ? '#ffffff' : '#050a14',
        'text-halo-width': 1.6,
      },
    });
  }
}

/** Flecha blanca (apunta al norte) dibujada en un canvas, para rotarla con el rumbo. */
function arrowImage(): ImageData {
  const size = 32;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(16, 5);
  ctx.lineTo(25, 25);
  ctx.lineTo(16, 20);
  ctx.lineTo(7, 25);
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}
