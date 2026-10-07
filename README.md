# FlotaViva

Consola de operación de flota en vivo, hecha como pieza de portafolio.

Buses simulados se mueven sobre corredores inventados. El backend NestJS publica la telemetría por WebSocket y el frontend Angular la pinta con MapLibre.

No usa marcas, patentes, rutas, contratos ni sistemas de ningún operador real. La geometría es aproximada sobre cartografía pública y los nombres son ficticios.

## Qué demuestra

- Seguimiento de unidades en mapa, con estado operativo y bitácora.
- Canal en vivo: NestJS Gateway + Socket.IO, snapshot inicial y tick cada segundo.
- UI de consola: KPIs, filtro por corredor, ficha de unidad y ocupación.
- Stack de producto: Angular 19 (signals) y NestJS 11.

## Cómo correrlo

```bash
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm start
```

- API: http://localhost:3000/api/fleet
- Consola: http://localhost:4200

Socket.IO y MapLibre ya están en los `package.json`.

## Límites a propósito

La simulación no consulta GPS, SAE, GTFS ni bases operativas. Sirve para mostrar el tipo de consola —mapa, estado de flota, desvío y retraso— sin exponer operación real.
