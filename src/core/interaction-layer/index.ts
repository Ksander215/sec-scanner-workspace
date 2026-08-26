/**
 * Interaction Layer — Public API
 * TASK-MVP-EVIDENCE-LOOP-001B
 */

// Service
export { InteractionService } from './interaction-service.js';
export type { InteractionServiceConfig } from './interaction-service.js';

// Types
export {
  InteractionState, isValidTransition,
} from './types.js';
export type {
  StartInteractionParams, SubmitQuestionParams, SubmitFeedbackParams,
  SessionView, AnswerView, EvidenceSourceView, ClaimView,
  FeedbackView, TraceView, FeedbackSummary, FindingSummary,
  InteractionSession,
} from './types.js';

// Errors
export {
  InteractionError, EmptyQuestionError,
  InteractionStateError, InteractionSessionNotFoundError,
  ExecutionFailedError,
} from './errors.js';
