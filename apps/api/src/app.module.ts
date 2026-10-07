import { DynamicModule, Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from './config';
import { FleetController } from './fleet/fleet.controller';
import { FleetGateway } from './fleet/fleet.gateway';
import { FleetService } from './fleet/fleet.service';
import { HealthController } from './health.controller';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, FleetController],
      providers: [{ provide: APP_CONFIG, useValue: config }, FleetService, FleetGateway],
    };
  }
}
