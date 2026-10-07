import { loadConfig } from './config';

describe('loadConfig', () => {
  it('valores por defecto', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      corsOrigins: ['http://localhost:4200'],
      tickMs: 500,
      actionsPerSecond: 10,
    });
  });

  it('lee y acota las variables', () => {
    const c = loadConfig({
      PORT: '8080',
      CORS_ORIGINS: 'https://a.dev, https://b.dev ,',
      TICK_MS: '20',
      ACTIONS_PER_SECOND: '0',
    });
    expect(c).toEqual({
      port: 8080,
      corsOrigins: ['https://a.dev', 'https://b.dev'],
      tickMs: 100,
      actionsPerSecond: 10,
    });
    expect(loadConfig({ PORT: 'x', TICK_MS: '99999' })).toMatchObject({ port: 3000, tickMs: 5000 });
  });
});
