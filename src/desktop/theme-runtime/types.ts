/**
 * Theme Runtime — Types
 */
import type { Identifier, Timestamp } from '../../core/types/common.js';

export type ThemeId = Identifier & { readonly __brand: 'ThemeId' };

export enum ThemePreset {
  Light = 'Light',
  Dark = 'Dark',
  System = 'System',
  Custom = 'Custom',
}

export interface ThemeEntity {
  readonly id: ThemeId;
  readonly name: string;
  readonly colors: Record<string, string>;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly isDark: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface CreateThemeOptions {
  readonly name: string;
  readonly colors?: Record<string, string>;
  readonly fontFamily?: string;
  readonly fontSize?: number;
  readonly isDark?: boolean;
}
