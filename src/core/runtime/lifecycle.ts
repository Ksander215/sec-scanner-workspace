/**
 * Lifecycle hooks for the Runtime.
 * Engine lifecycle: initialize → start → [execute] → stop → shutdown.
 */
export type LifecycleHook = 'beforeInitialize' | 'afterInitialize'
  | 'beforeStart' | 'afterStart'
  | 'beforeStop' | 'afterStop'
  | 'beforeShutdown' | 'afterShutdown';

export interface LifecycleHooks {
  on(hook: LifecycleHook, callback: () => Promise<void> | void): void;
  off(hook: LifecycleHook, callback: () => Promise<void> | void): void;
  run(hook: LifecycleHook): Promise<void>;
}

export class DefaultLifecycleHooks implements LifecycleHooks {
  private hooks = new Map<LifecycleHook, Set<() => Promise<void> | void>>();

  on(hook: LifecycleHook, callback: () => Promise<void> | void): void {
    if (!this.hooks.has(hook)) {
      this.hooks.set(hook, new Set());
    }
    this.hooks.get(hook)!.add(callback);
  }

  off(hook: LifecycleHook, callback: () => Promise<void> | void): void {
    this.hooks.get(hook)?.delete(callback);
  }

  async run(hook: LifecycleHook): Promise<void> {
    const callbacks = this.hooks.get(hook);
    if (!callbacks) return;
    for (const cb of callbacks) {
      await cb();
    }
  }
}
