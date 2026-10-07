export type VehicleStatus = 'en_ruta' | 'retraso' | 'terminal' | 'fuera_de_servicio';
export type VehicleType = 'padron' | 'articulado';

export interface Corridor {
  id: string;
  name: string;
  color: string;
  headwayMin: number;
  stops: string[];
  coordinates: [number, number][];
}

export interface Vehicle {
  id: string;
  code: string;
  corridorId: string;
  type: VehicleType;
  status: VehicleStatus;
  occupancy: number;
  delayMin: number;
  speedKmh: number;
  progress: number;
  lng: number;
  lat: number;
  bearing: number;
  nextStop: string;
  driver: string;
}

export interface OpsEvent {
  id: string;
  ts: string;
  level: 'info' | 'warn';
  message: string;
}

export interface FleetSnapshot {
  updatedAt: string;
  operator: string;
  city: string;
  disclaimer: string;
  kpis: {
    active: number;
    onTimePct: number;
    avgDelayMin: number;
    avgOccupancy: number;
    inTerminal: number;
  };
  corridors: Corridor[];
  vehicles: Vehicle[];
  events: OpsEvent[];
}
