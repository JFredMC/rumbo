import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import { CORRIDORS } from './corridors.data';
import { Corridor, FleetSnapshot, OpsEvent, Vehicle, VehicleStatus } from './fleet.types';

interface SimBus {
  id: string;
  code: string;
  corridorId: string;
  type: 'padron' | 'articulado';
  progress: number;
  metersPerSec: number;
  delayBias: number;
  occupancy: number;
  driver: string;
  dwellUntil: number;
  outOfService: boolean;
}

interface Path {
  coords: [number, number][];
  cumulative: number[];
  total: number;
}

const DRIVERS = [
  'Andrés M.',
  'Camila R.',
  'Julián P.',
  'Laura G.',
  'Mateo S.',
  'Valentina C.',
  'Santiago H.',
  'Daniela V.',
  'Esteban L.',
  'Mariana T.',
  'Nicolás A.',
  'Sara Q.',
];

@Injectable()
export class FleetService implements OnModuleInit, OnModuleDestroy {
  private readonly ticks = new Subject<FleetSnapshot>();
  readonly ticks$ = this.ticks.asObservable();
  private timer?: NodeJS.Timeout;
  private buses: SimBus[] = [];
  private events: OpsEvent[] = [];
  private paths = new Map<string, Path>();
  private seq = 1;

  onModuleInit() {
    this.paths = new Map(CORRIDORS.map((c) => [c.id, buildPath(c.coordinates)]));
    this.buses = seedBuses();
    this.pushEvent('info', 'Consola de demostración en línea. Telemetría simulada.');
    this.timer = setInterval(() => this.step(), 1000);
    this.ticks.next(this.snapshot());
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  snapshot(): FleetSnapshot {
    const vehicles = this.buses.map((bus) => this.toVehicle(bus));
    const moving = vehicles.filter((v) => v.status !== 'fuera_de_servicio');
    const onTime = moving.filter((v) => v.delayMin <= 3).length;
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    return {
      updatedAt: new Date().toISOString(),
      operator: 'FlotaViva',
      city: 'Ciudad de demostración',
      disclaimer:
        'Simulación de portafolio. Corredores, patentes y telemetría son ficticios y no representan a ningún operador.',
      kpis: {
        active: vehicles.filter((v) => v.status === 'en_ruta' || v.status === 'retraso').length,
        onTimePct: moving.length ? Math.round((onTime / moving.length) * 100) : 100,
        avgDelayMin: Number(avg(moving.map((v) => v.delayMin)).toFixed(1)),
        avgOccupancy: Math.round(avg(moving.map((v) => v.occupancy))),
        inTerminal: vehicles.filter((v) => v.status === 'terminal').length,
      },
      corridors: CORRIDORS,
      vehicles,
      events: this.events.slice(0, 8),
    };
  }

  private step() {
    const now = Date.now();
    for (const bus of this.buses) {
      if (bus.outOfService) continue;
      if (now < bus.dwellUntil) continue;
      const path = this.paths.get(bus.corridorId);
      if (!path) continue;
      const factor = 1 - bus.delayBias * 0.35;
      bus.progress += (bus.metersPerSec * factor) / path.total;
      bus.occupancy = clamp(bus.occupancy + (Math.random() - 0.48) * 4, 18, 96);
      if (bus.progress >= 1) {
        bus.progress = 0;
        bus.dwellUntil = now + 12000 + Math.random() * 18000;
        bus.occupancy = 20 + Math.random() * 25;
        const corridor = CORRIDORS.find((c) => c.id === bus.corridorId);
        this.pushEvent('info', `${bus.code} llegó a terminal y reinicia ${corridor?.name ?? 'corredor'}.`);
      } else if (Math.random() < 0.01 && bus.delayBias > 0.35) {
        this.pushEvent('warn', `${bus.code} acumula retraso en ${this.nextStop(bus)}.`);
      }
    }
    this.ticks.next(this.snapshot());
  }

  private toVehicle(bus: SimBus): Vehicle {
    const path = this.paths.get(bus.corridorId)!;
    const pose = pointAt(path, bus.progress);
    const dwelling = Date.now() < bus.dwellUntil;
    const delayMin = bus.outOfService ? 0 : Number((bus.delayBias * 9 + (dwelling ? 0 : Math.random())).toFixed(1));
    let status: VehicleStatus = 'en_ruta';
    if (bus.outOfService) status = 'fuera_de_servicio';
    else if (dwelling) status = 'terminal';
    else if (delayMin > 3.5) status = 'retraso';
    const speedKmh = dwelling || bus.outOfService ? 0 : Math.round((bus.metersPerSec * 3.6 * (1 - bus.delayBias * 0.35)) * 10) / 10;
    return {
      id: bus.id,
      code: bus.code,
      corridorId: bus.corridorId,
      type: bus.type,
      status,
      occupancy: Math.round(bus.occupancy),
      delayMin,
      speedKmh,
      progress: Number(bus.progress.toFixed(4)),
      lng: pose.lng,
      lat: pose.lat,
      bearing: pose.bearing,
      nextStop: this.nextStop(bus),
      driver: bus.driver,
    };
  }

  private nextStop(bus: SimBus) {
    const corridor = CORRIDORS.find((c) => c.id === bus.corridorId);
    if (!corridor) return '—';
    const idx = Math.min(corridor.stops.length - 1, Math.floor(bus.progress * corridor.stops.length));
    return corridor.stops[idx];
  }

  private pushEvent(level: OpsEvent['level'], message: string) {
    this.events.unshift({
      id: `ev-${this.seq++}`,
      ts: new Date().toISOString(),
      level,
      message,
    });
    this.events = this.events.slice(0, 12);
  }
}

function seedBuses(): SimBus[] {
  const plan: Array<[string, string, 'padron' | 'articulado', number]> = [
    ['nv-01', 'FV-104', 'articulado', 0.08],
    ['nv-01', 'FV-118', 'padron', 0.41],
    ['nv-01', 'FV-121', 'padron', 0.73],
    ['nv-02', 'FV-207', 'articulado', 0.16],
    ['nv-02', 'FV-214', 'padron', 0.48],
    ['nv-02', 'FV-229', 'padron', 0.82],
    ['nv-03', 'FV-301', 'articulado', 0.12],
    ['nv-03', 'FV-318', 'articulado', 0.37],
    ['nv-03', 'FV-326', 'padron', 0.64],
    ['nv-04', 'FV-412', 'padron', 0.22],
    ['nv-04', 'FV-427', 'padron', 0.55],
    ['nv-04', 'FV-440', 'articulado', 0.88],
  ];
  return plan.map(([corridorId, code, type, progress], i) => ({
    id: code.toLowerCase(),
    code,
    corridorId,
    type,
    progress,
    metersPerSec: type === 'articulado' ? 7.4 : 8.1,
    delayBias: [0.1, 0.55, 0.2, 0.48, 0.15, 0.05, 0.62, 0.22, 0.08, 0.4, 0.12, 0.7][i],
    occupancy: 35 + ((i * 17) % 45),
    driver: DRIVERS[i],
    dwellUntil: i === 5 ? Date.now() + 20000 : 0,
    outOfService: i === 10,
  }));
}

function buildPath(coords: [number, number][]): Path {
  const cumulative = [0];
  for (let i = 1; i < coords.length; i++) {
    cumulative.push(cumulative[i - 1] + haversine(coords[i - 1], coords[i]));
  }
  return { coords, cumulative, total: cumulative[cumulative.length - 1] || 1 };
}

function pointAt(path: Path, progress: number) {
  const target = clamp(progress, 0, 0.999) * path.total;
  let i = 1;
  while (i < path.cumulative.length - 1 && path.cumulative[i] < target) i++;
  const start = path.cumulative[i - 1];
  const end = path.cumulative[i];
  const t = end === start ? 0 : (target - start) / (end - start);
  const a = path.coords[i - 1];
  const b = path.coords[i];
  return {
    lng: a[0] + (b[0] - a[0]) * t,
    lat: a[1] + (b[1] - a[1]) * t,
    bearing: bearing(a, b),
  };
}

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const φ1 = (a[1] * Math.PI) / 180;
  const φ2 = (b[1] * Math.PI) / 180;
  const dφ = ((b[1] - a[1]) * Math.PI) / 180;
  const dλ = ((b[0] - a[0]) * Math.PI) / 180;
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearing(a: [number, number], b: [number, number]) {
  const λ1 = (a[0] * Math.PI) / 180;
  const λ2 = (b[0] * Math.PI) / 180;
  const φ1 = (a[1] * Math.PI) / 180;
  const φ2 = (b[1] * Math.PI) / 180;
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
