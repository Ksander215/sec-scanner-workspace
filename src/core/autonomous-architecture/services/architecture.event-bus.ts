/**
 * Autonomous Architecture Runtime — Architecture EventBus
 * TASK-AIS-012A.020
 *
 * Minimal, independent, extensible synchronous event bus.
 * No Runtime. No Graph. No Workspace. No async.
 */

export interface ArchitectureEvent {
  readonly type: string;
  readonly payload: unknown;
}

export type ArchitectureEventHandler = (event: ArchitectureEvent) => void;

export interface ArchitectureEventSubscription {
  unsubscribe(): void;
}

export class ArchitectureEventBus {
  private readonly subscribers: Map<string, Set<ArchitectureEventHandler>>;

  constructor() {
    this.subscribers = new Map();
  }

  subscribe(
    type: string,
    handler: ArchitectureEventHandler,
  ): ArchitectureEventSubscription {
    let handlers = this.subscribers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.subscribers.set(type, handlers);
    }
    handlers.add(handler);

    return {
      unsubscribe: (): void => {
        const h = this.subscribers.get(type);
        if (h) {
          h.delete(handler);
          if (h.size === 0) {
            this.subscribers.delete(type);
          }
        }
      },
    };
  }

  publish(event: ArchitectureEvent): void {
    const handlers = this.subscribers.get(event.type);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(event);
    }
  }

  hasSubscribers(type: string): boolean {
    const handlers = this.subscribers.get(type);
    return handlers !== undefined && handlers.size > 0;
  }

  getSubscriberCount(type: string): number {
    const handlers = this.subscribers.get(type);
    return handlers ? handlers.size : 0;
  }
}
