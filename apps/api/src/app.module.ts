import { Module } from '@nestjs/common';
import { FleetModule } from './fleet/fleet.module';

@Module({
  imports: [FleetModule],
})
export class AppModule {}
