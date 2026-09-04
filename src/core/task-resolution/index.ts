/**
 * Task Resolution — Public surface
 * TASK-AIS-TASK-RESOLUTION-SLICE-001
 *
 * Consumers import from this barrel only. The module is deterministic,
 * provider-agnostic, and persistence-free by contract (see types.ts).
 */

export * from './types.js';
export * from './validation.js';
export * from './explanation-policy.js';
export * from './resolution-engine.js';
