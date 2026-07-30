/**
 * Desktop Foundation — Shared Types
 */
import type { Identifier, Timestamp } from '../core/types/common.js';
import { EventClassification } from '../core/types/common.js';
import type { Service } from '../core/services/service.js';
import type { EventBus } from '../core/events/event-bus.js';

export type { Identifier, Timestamp, Service, EventBus };
export { EventClassification };

export type DesktopService = Service;

export interface DesktopConfig {
  readonly appVersion: string;
  readonly environment: 'development' | 'staging' | 'production';
  readonly dataDir: string;
  readonly maxWindows: number;
  readonly crashRecoveryEnabled: boolean;
}

export const DefaultDesktopConfig: DesktopConfig = {
  appVersion: '1.0.0',
  environment: 'development',
  dataDir: './data',
  maxWindows: 20,
  crashRecoveryEnabled: true,
};
