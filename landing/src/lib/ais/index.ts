/**
 * AIS — Adaptive Intelligence System
 * Index file — re-exports all AIS modules
 */

export { getAISMemory, type AISMemory, type UserRole, type UserAction, type AISGoal, type AISMetric } from "./memory";
export { getSoundIdentity, type SoundType } from "./sound";
export { computeConfidence, type ConfidenceResult } from "./confidence";
export { predictContext, type ContextPrediction } from "./context-predictor";
