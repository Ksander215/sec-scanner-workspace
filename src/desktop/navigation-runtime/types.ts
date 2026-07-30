/**
 * Navigation Runtime — Types
 */
import type { Identifier } from '../../core/types/common.js';

export type ScreenId = Identifier & { readonly __brand: 'ScreenId' };
export type RouteId = Identifier & { readonly __brand: 'RouteId' };

export enum ScreenName {
  Home = 'Home',
  Conversation = 'Conversation',
  Projects = 'Projects',
  Memory = 'Memory',
  Knowledge = 'Knowledge',
  Workflows = 'Workflows',
  Marketplace = 'Marketplace',
  Settings = 'Settings',
  Diagnostics = 'Diagnostics',
}

export interface ScreenDefinition {
  readonly id: ScreenId;
  readonly name: ScreenName;
  readonly path: string;
  readonly title: string;
  readonly icon?: string;
  readonly order: number;
}

export interface NavigationEntry {
  readonly screenId: ScreenId;
  readonly path: string;
  readonly timestamp: number;
  readonly params?: Record<string, string>;
}

export interface NavigationState {
  readonly current: ScreenDefinition | null;
  readonly history: readonly NavigationEntry[];
  readonly historyIndex: number;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
}
