import { Component, ElementRef, OnDestroy, OnInit, ViewChild, effect, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import maplibregl, { GeoJSONSource, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { FleetService } from './fleet.service';
import { Corridor, Vehicle } from './fleet.models';

@Component({
  selector: 'app-root',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;
  readonly fleet = inject(FleetService);
  private map?: Map;
  private follow = true;
  filter: 'todas' | string = 'todas';

  constructor() {
    effect(() => {
      const snap = this.fleet.snapshot();
      if (!snap || !this.map) return;
      this.paint(snap.corridors, snap.vehicles);
    });
  }

  ngOnInit() {
    this.fleet.connect();
    this.map = new maplibregl.Map({
      container: this.mapHost.nativeElement,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [-75.572, 6.244],
      zoom: 12.1,
      attributionControl: {},
    });
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    this.map.on('load', () => {
      const snap = this.fleet.snapshot();
      if (snap) this.paint(snap.corridors, snap.vehicles);
      this.map?.on('click', 'buses', (event) => {
        const id = event.features?.[0]?.properties?.['id'];
        if (typeof id === 'string') this.fleet.select(id);
      });
      this.map?.on('mouseenter', 'buses', () => {
        if (this.map) this.map.getCanvas().style.cursor = 'pointer';
      });
      this.map?.on('mouseleave', 'buses', () => {
        if (this.map) this.map.getCanvas().style.cursor = '';
      });
    });
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  corridorName(id: string) {
    return this.fleet.snapshot()?.corridors.find((c) => c.id === id)?.name ?? id;
  }

  corridorColor(id: string) {
    return this.fleet.snapshot()?.corridors.find((c) => c.id === id)?.color ?? '#d7f25a';
  }

  visibleVehicles() {
    const vehicles = this.fleet.snapshot()?.vehicles ?? [];
    return this.filter === 'todas'
      ? vehicles
      : vehicles.filter((v) => v.corridorId === this.filter);
  }

  selected() {
    const id = this.fleet.selectedId();
    return this.fleet.snapshot()?.vehicles.find((v) => v.id === id) ?? null;
  }

  pick(vehicle: Vehicle) {
    this.fleet.select(vehicle.id);
    this.follow = true;
    this.map?.easeTo({ center: [vehicle.lng, vehicle.lat], zoom: 13.4, duration: 600 });
  }

  statusLabel(status: Vehicle['status']) {
    return {
      en_ruta: 'En ruta',
      retraso: 'Retraso',
      terminal: 'En terminal',
      fuera_de_servicio: 'Fuera de servicio',
    }[status];
  }

  private paint(corridors: Corridor[], vehicles: Vehicle[]) {
    if (!this.map?.isStyleLoaded()) return;
    const routes = {
      type: 'FeatureCollection' as const,
      features: corridors.map((c) => ({
        type: 'Feature' as const,
        properties: { color: c.color, name: c.name },
        geometry: { type: 'LineString' as const, coordinates: c.coordinates },
      })),
    };
    const buses = {
      type: 'FeatureCollection' as const,
      features: vehicles
        .filter((v) => v.status !== 'fuera_de_servicio')
        .map((v) => ({
          type: 'Feature' as const,
          properties: {
            id: v.id,
            code: v.code,
            color: this.corridorColor(v.corridorId),
            bearing: v.bearing,
            selected: v.id === this.fleet.selectedId(),
          },
          geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
        })),
    };
    this.upsert('routes', routes, () => {
      this.map?.addLayer({
        id: 'routes-line',
        type: 'line',
        source: 'routes',
        paint: { 'line-color': ['get', 'color'], 'line-width': 3.5, 'line-opacity': 0.8 },
      });
    });
    this.upsert('vehicles', buses, () => {
      this.map?.addLayer({
        id: 'buses',
        type: 'circle',
        source: 'vehicles',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'selected'], 1], 9, 6.5],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0c1210',
        },
      });
    });
    const selected = vehicles.find((v) => v.id === this.fleet.selectedId());
    if (selected && this.follow) {
      this.map.easeTo({ center: [selected.lng, selected.lat], duration: 700 });
    }
  }

  private upsert(id: string, data: FeatureCollection, add: () => void) {
    const source = this.map?.getSource(id) as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      this.map?.addSource(id, { type: 'geojson', data });
      add();
    }
  }
}
