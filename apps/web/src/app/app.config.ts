import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { environment } from '../environments/environment';
import { API_URL, ApiFleetStore } from './core/api-fleet.store';
import { DemoFleetStore } from './core/demo-fleet.store';
import { FleetStore } from './core/fleet-store';
import { resolveMode } from './core/mode';

const mode = resolveMode(
  environment.apiUrl,
  typeof localStorage === 'undefined' ? undefined : localStorage,
  typeof location === 'undefined' ? '' : location.search,
);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    { provide: API_URL, useValue: environment.apiUrl },
    { provide: FleetStore, useClass: mode === 'api' ? ApiFleetStore : DemoFleetStore },
  ],
};
