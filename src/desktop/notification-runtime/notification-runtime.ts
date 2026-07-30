/**
 * Notification Runtime — Implementation
 */
import type { Timestamp } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';

export class NotificationRuntime implements Service {
  readonly name = 'NotificationRuntime';
  private notifications: Array<{id: string; title: string; body: string; type: string; priority: number; read: boolean; createdAt: Timestamp; expiresAt: string | null}> = [];
  private _unreadCount = 0;
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.notifications = []; this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  create(title: string, body: string, type?: string, priority?: number): string {
    const id = crypto.randomUUID(); const now = new Date().toISOString() as Timestamp;
    this.notifications.push({ id, title, body, type: type ?? 'info', priority: priority ?? 0, read: false, createdAt: now, expiresAt: null });
    this._unreadCount++; return id;
  }
  markRead(id: string): void { const n = this.notifications.find(n => n.id === id); if (n && !n.read) { n.read = true; this._unreadCount--; } }
  markAllRead(): void { for (const n of this.notifications) { if (!n.read) { n.read = true; } } this._unreadCount = 0; }
  getUnreadCount(): number { return this._unreadCount; }
  getAll(): Array<{id: string; title: string; body: string; type: string; priority: number; read: boolean; createdAt: Timestamp; expiresAt: string | null}> { return this.notifications; }
  getById(id: string): {id: string; title: string; body: string; type: string; priority: number; read: boolean; createdAt: Timestamp; expiresAt: string | null} | undefined { return this.notifications.find(n => n.id === id); }
  delete(id: string): void { const idx = this.notifications.findIndex(n => n.id === id); if (idx >= 0) { if (!this.notifications[idx]!.read) this._unreadCount--; this.notifications.splice(idx, 1); } }
  clear(): void { this.notifications = []; this._unreadCount = 0; }
}
