/**
 * AIS Controller — ARC-001.001 §5.1
 * Unified entry point. Routes requests. Enforces autonomy level.
 */
import type { Service } from './service.js';
import { AutonomyLevel } from '../types/common.js';

export interface AISController extends Service {
  setAutonomyLevel(level: AutonomyLevel): void;
  getAutonomyLevel(): AutonomyLevel;
}
