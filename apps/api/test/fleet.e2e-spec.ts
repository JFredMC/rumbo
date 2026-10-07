import type { FleetState } from '@rumbo/fleet-engine';
import type { INestApplication } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { createApp } from '../src/bootstrap';
import { loadConfig } from '../src/config';

describe('API + Socket.IO (e2e)', () => {
  let app: INestApplication;
  let url: string;
  let socket: Socket | undefined;

  beforeAll(async () => {
    app = await createApp(loadConfig({ TICK_MS: '200' }));
    await app.listen(0);
    url = (await app.getUrl()).replace('[::1]', 'localhost');
  });

  afterAll(async () => {
    socket?.disconnect();
    await app.close();
  });

  it('GET /api/health', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', running: true });
  });

  it('GET /api/fleet, /vehicles y /kpis', async () => {
    const s = await request(app.getHttpServer()).get('/api/fleet').expect(200);
    expect(s.body.version).toBe(1);
    const v = await request(app.getHttpServer()).get('/api/fleet/vehicles').expect(200);
    expect(v.body[0]).toHaveProperty('nextStop');
    const k = await request(app.getHttpServer()).get('/api/fleet/kpis').expect(200);
    expect(k.body.active).toBeGreaterThan(0);
  });

  it('POST /api/fleet/actions valida la acción', async () => {
    await request(app.getHttpServer())
      .post('/api/fleet/actions')
      .send({ type: 'nope' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/fleet/actions')
      .send({ type: 'setSpeed', speed: 5 })
      .expect(202);
    const s = await request(app.getHttpServer()).get('/api/fleet').expect(200);
    expect(s.body.speed).toBe(5);
  });

  it('socket: recibe estados en vivo y aplica acciones', async () => {
    socket = io(`${url}/fleet`, { transports: ['websocket'] });
    const first = await new Promise<FleetState>((resolve) => socket!.once('state', resolve));
    expect(first.buses.length).toBeGreaterThan(0);
    const next = await new Promise<FleetState>((resolve) => socket!.once('state', resolve));
    expect(next.now).toBeGreaterThanOrEqual(first.now);

    expect(await socket.emitWithAck('action', { type: 'injectIncident', routeId: 'Z' })).toEqual({
      ok: false,
      error: 'Acción no válida.',
    });
    expect(await socket.emitWithAck('action', { type: 'injectIncident', routeId: 'D' })).toEqual({
      ok: true,
    });
    const withIncident = await new Promise<FleetState>((resolve) => {
      socket!.on('state', (s: FleetState) => s.incidents.length && resolve(s));
    });
    expect(withIncident.incidents[0]!.routeId).toBe('D');
  });
});
