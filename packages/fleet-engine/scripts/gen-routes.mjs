// Genera src/data/routes.ts: trazados que siguen calles reales (OSRM público sobre datos de
// © OpenStreetMap) para rutas y paradas INVENTADAS. Se corre a mano: node scripts/gen-routes.mjs
import { writeFileSync } from 'node:fs';
import { URL } from 'node:url';

const ROUTES = [
  {
    id: 'A',
    name: 'Ruta A · Norte–Centro',
    color: '#22d3ee',
    headwayMin: 8,
    via: [
      [-74.8212, 11.0153],
      [-74.8073, 11.0032],
      [-74.7968, 10.9905],
      [-74.7826, 10.979],
    ],
    stops: [
      'Terminal Norte',
      'Parque de los Almendros',
      'Clínica del Prado',
      'Plaza Mayor',
      'Mercado Central',
    ],
  },
  {
    id: 'B',
    name: 'Ruta B · Ribera',
    color: '#818cf8',
    headwayMin: 10,
    via: [
      [-74.817, 11.029],
      [-74.7985, 11.0145],
      [-74.7835, 11.001],
      [-74.7725, 10.988],
    ],
    stops: ['Mirador del Río', 'Muelle Viejo', 'Paseo Ribera', 'Puerto Seco'],
  },
  {
    id: 'C',
    name: 'Ruta C · Anillo',
    color: '#f59e0b',
    headwayMin: 12,
    via: [
      [-74.839, 10.993],
      [-74.83, 10.978],
      [-74.813, 10.964],
      [-74.793, 10.956],
    ],
    stops: ['Intercambio Oeste', 'Barrio Jardín', 'Hospital Sur', 'Estadio', 'Terminal Sur'],
  },
  {
    id: 'D',
    name: 'Ruta D · Universidades',
    color: '#34d399',
    headwayMin: 7,
    via: [
      [-74.851, 11.019],
      [-74.832, 11.006],
      [-74.812, 10.996],
      [-74.797, 10.984],
    ],
    stops: ['Campus Norte', 'Villa Ciencia', 'Biblioteca Pública', 'Parque Central', 'Plaza Mayor'],
  },
  {
    id: 'E',
    name: 'Ruta E · Centro–Sur',
    color: '#f472b6',
    headwayMin: 9,
    via: [
      [-74.78, 10.985],
      [-74.788, 10.97],
      [-74.799, 10.956],
      [-74.809, 10.944],
    ],
    stops: ['Mercado Central', 'Avenida Comercio', 'Colegio Mayor', 'Estadio', 'Portón Sur'],
  },
];

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
const dist = (a, b) => {
  const h =
    Math.sin(rad(b[1] - a[1]) / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
function simplify(pts, tol = 6) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let idx = 0,
    max = 0;
  const kx = Math.cos(rad(a[1])) * 111320,
    ky = 110540;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const x0 = (p[0] - a[0]) * kx,
      y0 = (p[1] - a[1]) * ky,
      x1 = (b[0] - a[0]) * kx,
      y1 = (b[1] - a[1]) * ky;
    const L = Math.hypot(x1, y1) || 1;
    const d = Math.abs(x0 * y1 - y0 * x1) / L;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= tol) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
}

/** Quita espuelas y bucles cortos que OSRM mete al ajustar puntos de paso (ida y vuelta por la misma calle). */
function despur(pts) {
  const res = [...pts];
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < res.length; i++) {
      let along = 0;
      for (let j = i + 1; j < res.length; j++) {
        along += dist(res[j - 1], res[j]);
        if (along > 900) break;
        if (j > i + 1 && along > 60 && dist(res[i], res[j]) < 25) {
          res.splice(i + 1, j - i);
          changed = true;
          break outer;
        }
      }
    }
  }
  return res;
}

const out = [];
for (const r of ROUTES) {
  const q = r.via.map((p) => p.join(',')).join(';');
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${q}?overview=full&geometries=geojson`,
  );
  const json = await res.json();
  if (json.code !== 'Ok') throw new Error(`${r.id}: ${json.code}`);
  const coords = simplify(despur(json.routes[0].geometry.coordinates)).map(([x, y]) => [
    +x.toFixed(5),
    +y.toFixed(5),
  ]);
  let len = 0;
  for (let i = 1; i < coords.length; i++) len += dist(coords[i - 1], coords[i]);
  const stops = r.stops.map((name, i) => ({ name, at: +(i / (r.stops.length - 1)).toFixed(3) }));
  out.push({
    id: r.id,
    name: r.name,
    color: r.color,
    headwayMin: r.headwayMin,
    lengthM: Math.round(len),
    stops,
    coordinates: coords,
  });
  console.log(r.id, coords.length, 'pts', Math.round(len), 'm');
}

const ts = `// Generado por scripts/gen-routes.mjs. No editar a mano.
// Trazado: OSRM sobre datos de © OpenStreetMap contributors (ODbL). Rutas, nombres y paradas son ficticios.
import type { RouteDef } from '../types';

export const CITY = { name: 'Barranquilla', center: [-74.805, 10.99] as [number, number], zoom: 12.3 };

export const ROUTES: readonly RouteDef[] = ${JSON.stringify(out)};
`;
writeFileSync(new URL('../src/data/routes.ts', import.meta.url), ts);
