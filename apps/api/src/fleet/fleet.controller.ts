import { BadRequestException, Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  parseFleetAction,
  type FleetState,
  type Kpis,
  type VehicleView,
} from '@rumbo/fleet-engine';
import { FleetService } from './fleet.service';

@Controller('fleet')
export class FleetController {
  constructor(private readonly fleet: FleetService) {}

  @Get()
  state(): FleetState {
    return this.fleet.snapshot();
  }

  @Get('vehicles')
  vehicles(): VehicleView[] {
    return this.fleet.vehicles();
  }

  @Get('kpis')
  kpis(): Kpis {
    return this.fleet.kpis();
  }

  @Post('actions')
  @HttpCode(202)
  act(@Body() body: unknown): { ok: true } {
    const action = parseFleetAction(body);
    if (!action) throw new BadRequestException('Acción no válida.');
    this.fleet.apply(action);
    return { ok: true };
  }
}
