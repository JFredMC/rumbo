import { Corridor } from './fleet.types';

/**
 * Corredores de demostración. Geometría aproximada sobre cartografía pública,
 * nombres y paradas inventados. No corresponden a ninguna ruta comercial.
 */
export const CORRIDORS: Corridor[] = [
  {
    id: 'nv-01',
    name: 'Corredor Robledal',
    color: '#d7f25a',
    headwayMin: 8,
    stops: ['Portal Robledal', 'Nodo Palmas', 'Cruce 70', 'Intercambiador Centro'],
    coordinates: [
      [-75.612, 6.272],
      [-75.598, 6.266],
      [-75.584, 6.259],
      [-75.571, 6.253],
      [-75.558, 6.248],
      [-75.546, 6.244],
      [-75.534, 6.239],
    ],
  },
  {
    id: 'nv-02',
    name: 'Corredor Laureles',
    color: '#3ecfb2',
    headwayMin: 7,
    stops: ['Terminal Oeste', 'Parada Estadio', 'Nodo 33', 'Portal Sur-Oeste'],
    coordinates: [
      [-75.604, 6.268],
      [-75.592, 6.256],
      [-75.581, 6.247],
      [-75.573, 6.236],
      [-75.566, 6.224],
      [-75.558, 6.214],
      [-75.549, 6.206],
    ],
  },
  {
    id: 'nv-03',
    name: 'Corredor Centro',
    color: '#f0a35e',
    headwayMin: 6,
    stops: ['Nodo Norte', 'Parada Prado', 'Intercambiador Centro', 'Nodo Guayabal'],
    coordinates: [
      [-75.568, 6.292],
      [-75.566, 6.276],
      [-75.564, 6.26],
      [-75.563, 6.247],
      [-75.561, 6.232],
      [-75.558, 6.218],
      [-75.554, 6.204],
    ],
  },
  {
    id: 'nv-04',
    name: 'Corredor Belén',
    color: '#7eb6ff',
    headwayMin: 9,
    stops: ['Portal Belén', 'Cruce 30', 'Nodo Nutibara', 'Terminal Sur'],
    coordinates: [
      [-75.603, 6.228],
      [-75.589, 6.222],
      [-75.576, 6.214],
      [-75.564, 6.208],
      [-75.551, 6.202],
      [-75.539, 6.198],
      [-75.528, 6.193],
    ],
  },
];
