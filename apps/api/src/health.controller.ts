import { Controller, Get } from '@nestjs/common';
import { FleetService } from './fleet/fleet.service';

@Controller('health')
export class HealthController {
  constructor(private readonly fleet: FleetService) {}

  @Get()
  check(): { status: 'ok'; buses: number; running: boolean } {
    const s = this.fleet.snapshot();
    return { status: 'ok', buses: s.buses.length, running: s.running };
  }
}
