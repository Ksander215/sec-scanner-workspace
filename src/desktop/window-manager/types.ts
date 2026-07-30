/**
 * Window Manager — Types
 */
import type { Identifier, Timestamp } from '../../core/types/common.js';

export type WindowId = Identifier & { readonly __brand: 'WindowId' };

export enum WindowState {
  Creating = 'Creating',
  Active = 'Active',
  Minimized = 'Minimized',
  Maximized = 'Maximized',
  Hidden = 'Hidden',
  Closed = 'Closed',
}

export enum WindowType {
  Main = 'Main',
  Conversation = 'Conversation',
  Project = 'Project',
  Settings = 'Settings',
  Diagnostics = 'Diagnostics',
  Floating = 'Floating',
}

export interface WindowBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WindowInfo {
  readonly id: WindowId;
  readonly type: WindowType;
  readonly title: string;
  readonly state: WindowState;
  readonly bounds: WindowBounds;
  readonly focused: boolean;
  readonly zIndex: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface CreateWindowOptions {
  readonly type: WindowType;
  readonly title?: string;
  readonly bounds?: Partial<WindowBounds>;
  readonly parentId?: WindowId;
}

export interface WindowLayout {
  readonly windowId: WindowId;
  readonly bounds: WindowBounds;
  readonly state: WindowState;
}
