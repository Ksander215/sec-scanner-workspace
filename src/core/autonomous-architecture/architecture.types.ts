/**
 * Autonomous Architecture Runtime — Fundamental Types
 * TASK-AIS-012A.001
 */

import type { Identifier } from '../types/common.js';

export type ArchitectureRuntimeId = Identifier & { readonly __brand: 'ArchitectureRuntimeId' };
