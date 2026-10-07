export type LngLat = [number, number];
export type VehicleStatus =
  'en_ruta' | 'retraso' | 'adelantado' | 'en_parada' | 'terminal' | 'fuera_de_servicio';
export type VehicleKind = 'bus' | 'electrico';
export type EventLevel = 'info' | 'warn' | 'alert';
export type Speed = 1 | 5 | 20;

export interface StopDef {
  name: string;
  /** Posición a lo largo del trazado de ida, de 0 a 1. */
  at: number;
}

export interface RouteDef {
  id: string;
  name: string;
  color: string;
  /** Frecuencia programada en minutos. */
  headwayMin: number;
  lengthM: number;
  stops: StopDef[];
  coordinates: LngLat[];
}

/** Estado de un bus en la simulación (serializable). */
export interface Bus {
  id: string;
  code: string;
  routeId: string;
  kind: VehicleKind;
  driver: string;
  /** Distancia recorrida en el ciclo ida+vuelta, en metros. */
  pos: number;
  /** Velocidad de crucero en m/s. */
  cruise: number;
  /** Factor de tráfico actual (0.4-1.15). */
  traffic: number;
  /** Retraso acumulado frente al horario, en segundos (negativo = adelantado). */
  delayS: number;
  occupancy: number;
  battery: number;
  /** Segundos que le quedan detenido en parada o terminal. 0 = en movimiento. */
  dwellLeft: number;
  /** Índice de la última parada atendida en el ciclo. */
  lastStop: number;
  outOfService: boolean;
  /** Banderas para no repetir eventos. */
  late: boolean;
  lowBattery: boolean;
  bunchedWith: string | null;
}

export interface Incident {
  id: string;
  routeId: string;
  /** Tramo afectado en el ciclo ida+vuelta, en metros. */
  from: number;
  to: number;
  /** Segundos simulados que le quedan. */
  left: number;
  /** Factor de velocidad dentro del tramo. */
  factor: number;
  label: string;
}

export interface FleetEvent {
  id: string;
  at: number;
  level: EventLevel;
  busId?: string;
  routeId?: string;
  message: string;
}

export interface FleetState {
  version: 1;
  /** Reloj simulado (ms epoch). */
  now: number;
  running: boolean;
  speed: Speed;
  seed: number;
  seq: number;
  buses: Bus[];
  incidents: Incident[];
  events: FleetEvent[];
}

/** Vista calculada de un bus, lista para pintar. */
export interface VehicleView {
  id: string;
  code: string;
  routeId: string;
  kind: VehicleKind;
  driver: string;
  status: VehicleStatus;
  lng: number;
  lat: number;
  bearing: number;
  speedKmh: number;
  delayMin: number;
  occupancy: number;
  battery: number;
  direction: 'ida' | 'vuelta';
  nextStop: string;
  nextStopEtaMin: number;
  /** Progreso en el ciclo ida+vuelta (0-1). */
  progress: number;
}

export interface Kpis {
  active: number;
  onTimePct: number;
  avgDelayMin: number;
  avgOccupancy: number;
  outOfService: number;
  incidents: number;
}
