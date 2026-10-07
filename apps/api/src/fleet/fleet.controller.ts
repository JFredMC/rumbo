import { Controller, Get } from '@nestjs/common';
import { FleetService } from './fleet.service';

@Controller('api')
export class FleetController {
  constructor(private readonly fleet: FleetService) {}

  @Get('fleet')
  fleetSnapshot() {
    return this.fleet.snapshot();
  }

  @Get('health')
  health() {
    return { ok: true, service: 'flota-viva' };
  }
}
