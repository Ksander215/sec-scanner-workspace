/**
 * Evidence Loop — Public API
 * TASK-MVP-EVIDENCE-LOOP-001A
 */

// Types
export {
  type IntentId, type ResponseId, type ClaimId, type ClaimEvidenceId,
  type EvidenceFeedbackId, type FindingId,
  brandIntentId, brandResponseId, brandClaimId, brandClaimEvidenceId,
  brandEvidenceFeedbackId, brandFindingId,
} from './types.js';

export {
  SourceType, EvidenceSourceType,
  ClaimType, VerificationStatus,
  EvidenceFeedbackType,
  FindingCategory, FindingStatus, FindingSeverity,
} from './types.js';

export type {
  Intent, EvidenceLoopResponse, Claim, ClaimEvidence,
  EvidenceFeedback, QualityFinding, SessionTrace,
  VerificationEvent,
  StartSessionParams, RecordIntentParams, RecordResponseParams,
  CreateClaimParams, AttachEvidenceParams, RecordFeedbackParams,
  CreateFindingParams, UpdateClaimVerificationParams, UpdateFindingStatusParams,
} from './types.js';

// Errors
export {
  EvidenceLoopError, SessionNotFoundError, IntentNotFoundError,
  ResponseNotFoundError, ClaimNotFoundError, FindingNotFoundError,
  LinkageError, ImmutableEvidenceError, SourceTypeMismatchError,
} from './errors.js';

// Sanitizer
export { sanitizeSecrets, sanitizeObject } from './secret-sanitizer.js';

// Service
export { EvidenceLoopService } from './evidence-loop-service.js';
export type { EvidenceLoopConfig } from './evidence-loop-service.js';
