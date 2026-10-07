import { Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { parseFleetAction } from '@rumbo/fleet-engine';
import { Subscription } from 'rxjs';
import type { Server, Socket } from 'socket.io';
import { APP_CONFIG, type AppConfig } from '../config';
import { FleetService } from './fleet.service';
import { RateLimiter } from './rate-limit';

type Ack = { ok: true } | { ok: false; error: string };

/**
 * Canal en vivo `/fleet`. Al conectar, el cliente recibe el estado completo y después uno
 * nuevo en cada tick. Las acciones se validan con `parseFleetAction`.
 */
@WebSocketGateway({ namespace: '/fleet' })
export class FleetGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(FleetGateway.name);
  private readonly limiter: RateLimiter;
  private sub?: Subscription;

  constructor(
    private readonly fleet: FleetService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.limiter = new RateLimiter(config.actionsPerSecond);
  }

  afterInit(): void {
    this.sub = this.fleet.changes$.subscribe((s) => this.server.emit('state', s));
  }

  handleConnection(client: Socket): void {
    client.emit('state', this.fleet.snapshot());
  }

  handleDisconnect(client: Socket): void {
    this.limiter.forget(client.id);
  }

  onModuleDestroy(): void {
    this.sub?.unsubscribe();
  }

  @SubscribeMessage('action')
  onAction(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Ack {
    if (!this.limiter.take(client.id))
      return { ok: false, error: 'Demasiadas acciones, espera un momento.' };
    const action = parseFleetAction(body);
    if (!action) return { ok: false, error: 'Acción no válida.' };
    this.fleet.apply(action);
    return { ok: true };
  }

  @SubscribeMessage('reset')
  onReset(@ConnectedSocket() client: Socket): Ack {
    if (!this.limiter.take(client.id))
      return { ok: false, error: 'Demasiadas acciones, espera un momento.' };
    this.logger.log(`Reinicio pedido por ${client.id}`);
    this.fleet.reset();
    return { ok: true };
  }
}
