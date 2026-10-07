import { DestroyRef, Injectable, InjectionToken, inject, signal } from '@angular/core';
import {
  createFleet,
  parseFleetAction,
  type FleetAction,
  type FleetState,
} from '@rumbo/fleet-engine';
import type { Socket } from 'socket.io-client';
import { FleetStore } from './fleet-store';

export const API_URL = new InjectionToken<string | null>('API_URL');

/**
 * Modo API: la flota vive en el backend NestJS. Recibe el estado por Socket.IO (`/fleet`) y
 * envía las acciones por el mismo canal. socket.io-client se carga bajo demanda.
 */
@Injectable()
export class ApiFleetStore extends FleetStore {
  readonly mode = 'api' as const;
  private readonly _connected = signal(false);
  private readonly _error = signal<string | null>(null);
  // Hasta recibir el primer estado se muestra una flota quieta como marcador.
  private readonly _state = signal<FleetState>({ ...createFleet(Date.now()), running: false });
  readonly connected = this._connected.asReadonly();
  readonly error = this._error.asReadonly();
  readonly state = this._state.asReadonly();
  private socket: Socket | null = null;
  private readonly apiUrl = inject(API_URL);

  constructor() {
    super();
    void this.connect();
    inject(DestroyRef).onDestroy(() => this.socket?.disconnect());
  }

  dispatch(action: FleetAction): void {
    if (!parseFleetAction(action)) return;
    this.socket
      ?.timeout(5000)
      .emitWithAck('action', action)
      .then((ack: { ok: boolean; error?: string }) =>
        this._error.set(ack.ok ? null : (ack.error ?? 'Error')),
      )
      .catch(() => this._error.set('El servidor no respondió.'));
  }

  reset(): void {
    this.socket?.emit('reset');
  }

  private async connect(): Promise<void> {
    const { io } = await import('socket.io-client');
    const socket = io(`${this.apiUrl}/fleet`, {
      transports: ['websocket'],
      reconnectionDelayMax: 5000,
    });
    this.socket = socket;
    socket.on('connect', () => {
      this._connected.set(true);
      this._error.set(null);
    });
    socket.on('disconnect', () => this._connected.set(false));
    socket.on('connect_error', () => this._error.set(`Sin conexión con ${this.apiUrl}`));
    socket.on('state', (s: FleetState) => this._state.set(s));
  }
}
