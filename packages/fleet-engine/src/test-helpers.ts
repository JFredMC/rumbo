import type { RouteDef } from './types';

export const T0 = Date.UTC(2026, 9, 7, 17, 0, 0);

/** Ruta recta de ~2,2 km en dirección este para tests. */
export const LINE: RouteDef = {
  id: 'T',
  name: 'Ruta T · Prueba',
  color: '#000000',
  headwayMin: 5,
  lengthM: 2200,
  stops: [
    { name: 'Inicio', at: 0 },
    { name: 'Medio', at: 0.5 },
    { name: 'Fin', at: 1 },
  ],
  coordinates: [
    [-74.8, 11.0],
    [-74.79, 11.0],
    [-74.78, 11.0],
  ],
};
