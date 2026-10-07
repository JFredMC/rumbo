# @rumbo/fleet-engine

Motor de simulación de Rumbo. TypeScript puro, sin dependencias y **determinista** (misma semilla ⇒ misma flota), así que corre igual en el navegador (modo demo) y en el API NestJS.

## Qué simula

- **Red**: 5 rutas ficticias de ida y vuelta, con paradas y terminales (`src/data/routes.ts`).
- **Buses**: diésel y eléctricos, con velocidad de crucero, tráfico (paseo aleatorio), paradas de 15–40 s, descanso en terminal, ocupación y batería.
- **Horario**: el retraso se acumula cuando el bus va más lento que la velocidad programada; en terminal acorta o alarga el descanso para volver al horario, y si va adelantado espera en la parada.
- **Alertas**: retraso > 5 min, recuperación, batería baja, agrupamiento (dos buses de la misma ruta a < 300 m) e incidentes de tráfico inyectados por ruta.
- **Vistas**: posición y rumbo, próxima parada y ETA, KPI de la flota y próximas llegadas por parada.

Todo el estado (`FleetState`) es JSON plano con tiempos relativos, así que se guarda en `localStorage` y se retoma tras recargar.

```ts
import { advance, createFleet, kpis, vehicleViews } from '@rumbo/fleet-engine';

let s = createFleet(Date.now());
s = advance(s, 60); // un minuto simulado
console.log(kpis(s), vehicleViews(s)[0]);
```

## Datos de las rutas

Los nombres de rutas y paradas son **inventados**. Los trazados se generaron una sola vez con `scripts/gen-routes.mjs`, que pide al router público de OSRM el recorrido por calles entre puntos elegidos a mano sobre la cartografía pública de Barranquilla (datos © colaboradores de OpenStreetMap, ODbL). No vienen de ningún operador de transporte.

```bash
pnpm test       # Vitest
pnpm build      # ESM + CJS en dist/
node scripts/gen-routes.mjs   # regenera src/data/routes.ts (necesita red)
```
