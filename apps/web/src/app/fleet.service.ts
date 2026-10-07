import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { API_ORIGIN, FleetSnapshot } from './fleet.models';

@Injectable({ providedIn: 'root' })
export class FleetService {
  readonly snapshot = signal<FleetSnapshot | null>(null);
  readonly connected = signal(false);
  readonly selectedId = signal<string | null>(null);
  private socket?: Socket;

  connect() {
    if (this.socket) return;
    this.socket = io(API_ORIGIN, { transports: ['websocket', 'polling'] });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('snapshot', (snap: FleetSnapshot) => this.snapshot.set(snap));
    this.socket.on('tick', (snap: FleetSnapshot) => this.snapshot.set(snap));
  }

  select(id: string | null) {
    this.selectedId.set(id);
  }
}
