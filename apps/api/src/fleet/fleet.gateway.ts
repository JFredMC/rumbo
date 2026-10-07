import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FleetService } from './fleet.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class FleetGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;
  private sub?: { unsubscribe: () => void };

  constructor(private readonly fleet: FleetService) {}

  afterInit() {
    this.sub = this.fleet.ticks$.subscribe((snapshot) => {
      this.server.emit('tick', snapshot);
    });
  }

  handleConnection(client: Socket) {
    client.emit('snapshot', this.fleet.snapshot());
  }

  handleDisconnect() {
    return;
  }
}
