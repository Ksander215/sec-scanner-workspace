/**
 * IC-01: AdaptiveMemory — ARC-001.001 §6
 * FP-01, Z1. Captures, stores, adapts to behavioural patterns.
 */
import type { UserProfile } from '../domain/entities/user-profile.js';
import type { UserAction } from '../domain/entities/user-action.js';
import { UserRole } from '../domain/value-objects/user-role.js';
import type { ReadingSpeed } from '../domain/value-objects/reading-speed.js';
import type { NavigationSpeed } from '../domain/value-objects/navigation-speed.js';

export interface AdaptiveMemory {
  recordAction(action: UserAction): Promise<void>;
  getProfile(): Promise<UserProfile | null>;
  getRole(): Promise<UserRole | null>;
  getDismissedTips(): Promise<string[]>;
  getFavoriteSections(): Promise<string[]>;
  getReadingSpeed(): Promise<ReadingSpeed | null>;
  getNavigationSpeed(): Promise<NavigationSpeed | null>;
}
