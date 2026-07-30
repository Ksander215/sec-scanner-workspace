/**
 * Desktop Runtime — Types
 */
import type { Identifier } from '../../core/types/common.js';
import type { DesktopConfig } from '../desktop-types.js';

export type DesktopRuntimeId = Identifier & { readonly __brand: 'DesktopRuntimeId' };

export enum DesktopState {
  Uninitialized = 'Uninitialized',
  Initializing = 'Initializing',
  Ready = 'Ready',
  Running = 'Running',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Error = 'Error',
}

export interface DesktopRuntimeConfig extends DesktopConfig {
  readonly autoStart: boolean;
  readonly enableCrashRecovery: boolean;
}

export const DefaultDesktopRuntimeConfig: DesktopRuntimeConfig = {
  appVersion: '1.0.0',
  environment: 'development',
  dataDir: './data',
  maxWindows: 20,
  crashRecoveryEnabled: true,
  autoStart: true,
  enableCrashRecovery: true,
};
