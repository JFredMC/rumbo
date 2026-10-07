import type { EventLevel, VehicleKind, VehicleStatus } from './types';

const STATUS: Record<VehicleStatus, string> = {
  en_ruta: 'En ruta',
  retraso: 'Con retraso',
  adelantado: 'Adelantado',
  en_parada: 'En parada',
  terminal: 'En terminal',
  fuera_de_servicio: 'Fuera de servicio',
};
export const statusLabel = (s: VehicleStatus): string => STATUS[s];

export const kindLabel = (k: VehicleKind): string =>
  k === 'electrico' ? 'Bus eléctrico' : 'Bus diésel';

export const levelLabel = (l: EventLevel): string =>
  ({ info: 'Info', warn: 'Aviso', alert: 'Alerta' })[l];

const timeFmt = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Bogota',
});
export const clock = (ts: number): string => timeFmt.format(ts);

/** "ahora", "1 min", "12 min". */
export function etaLabel(min: number): string {
  if (min < 0.75) return 'llegando';
  return `${Math.round(min)} min`;
}

/** Retraso con signo: "+3,5 min", "−1,2 min", "a tiempo". */
export function delayLabel(min: number): string {
  if (Math.abs(min) < 0.5) return 'a tiempo';
  const v = Math.abs(min).toLocaleString('es-CO', { maximumFractionDigits: 1 });
  return `${min > 0 ? '+' : '−'}${v} min`;
}
