/**
 * AIS Domain — Entity Identifiers
 * Typed identifier wrappers for type-safe entity references.
 * Conforms to: DOM-002.000, ADR-014 (DDD Structure)
 */

import type { Identifier } from '../types/common.js';

/** Branded type for UserProfile identity */
export type UserProfileId = Identifier & { readonly __brand: 'UserProfileId' };

/** Branded type for UserAction identity */
export type UserActionId = Identifier & { readonly __brand: 'UserActionId' };

/** Branded type for SessionContext identity */
export type SessionContextId = Identifier & { readonly __brand: 'SessionContextId' };

/** Branded type for ConfidenceResult identity */
export type ConfidenceResultId = Identifier & { readonly __brand: 'ConfidenceResultId' };

/** Branded type for AISPrediction identity */
export type AISPredictionId = Identifier & { readonly __brand: 'AISPredictionId' };

/** Branded type for AISNotification identity */
export type AISNotificationId = Identifier & { readonly __brand: 'AISNotificationId' };

/** Branded type for ProviderInfo identity */
export type ProviderInfoId = Identifier & { readonly __brand: 'ProviderInfoId' };

/** Branded type for PluginManifest identity */
export type PluginManifestId = Identifier & { readonly __brand: 'PluginManifestId' };

/** Branded type for TrustScore identity */
export type TrustScoreId = Identifier & { readonly __brand: 'TrustScoreId' };

/** Branded type for TrustFactor identity */
export type TrustFactorId = Identifier & { readonly __brand: 'TrustFactorId' };

/**
 * Identifier factory — creates typed UUIDs.
 */
export function createId<T extends Identifier>(): T {
  const uuid = crypto.randomUUID();
  return uuid as unknown as T;
}
