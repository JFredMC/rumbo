import { Pipe, PipeTransform } from '@angular/core';
import {
  clock,
  delayLabel,
  etaLabel,
  kindLabel,
  statusLabel,
  type VehicleKind,
  type VehicleStatus,
} from '@rumbo/fleet-engine';
import { routeOf } from '../core/console.store';

@Pipe({ name: 'clock' })
export class ClockPipe implements PipeTransform {
  transform(ts: number): string {
    return clock(ts);
  }
}

@Pipe({ name: 'delay' })
export class DelayPipe implements PipeTransform {
  transform(min: number): string {
    return delayLabel(min);
  }
}

@Pipe({ name: 'eta' })
export class EtaPipe implements PipeTransform {
  transform(min: number): string {
    return etaLabel(min);
  }
}

@Pipe({ name: 'status' })
export class StatusPipe implements PipeTransform {
  transform(s: VehicleStatus): string {
    return statusLabel(s);
  }
}

@Pipe({ name: 'kind' })
export class KindPipe implements PipeTransform {
  transform(k: VehicleKind): string {
    return kindLabel(k);
  }
}

/** Nombre corto de la ruta ("Ruta A") o completo con `full`. */
@Pipe({ name: 'route' })
export class RoutePipe implements PipeTransform {
  transform(id: string, full = false): string {
    const r = routeOf(id);
    if (!r) return id;
    return full ? r.name : (r.name.split(' · ')[0] ?? r.name);
  }
}

@Pipe({ name: 'routeColor' })
export class RouteColorPipe implements PipeTransform {
  transform(id: string): string {
    return routeOf(id)?.color ?? '#94a3b8';
  }
}
