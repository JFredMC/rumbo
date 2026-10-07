import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { DemoFleetStore } from './core/demo-fleet.store';
import { FleetStore } from './core/fleet-store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    { provide: FleetStore, useClass: DemoFleetStore },
  ],
};
