/** Configuración por variables de entorno, con valores seguros para desarrollo local. */
export interface AppConfig {
  port: number;
  corsOrigins: string[];
  /** Cada cuánto avanza la simulación, en ms. */
  tickMs: number;
  /** Acciones por segundo permitidas a cada cliente. */
  actionsPerSecond: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env['PORT'] ?? 3000);
  const tick = Number(env['TICK_MS'] ?? 500);
  return {
    port: Number.isInteger(port) && port > 0 ? port : 3000,
    corsOrigins: (env['CORS_ORIGINS'] ?? 'http://localhost:4200')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    tickMs: Number.isFinite(tick) ? Math.min(5000, Math.max(100, tick)) : 500,
    actionsPerSecond: Math.max(1, Number(env['ACTIONS_PER_SECOND'] ?? 10) || 10),
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
