/**
 * Desktop Runtime — Main Orchestrator
 * TASK-AIS-004B.000 — Desktop Application Foundation
 *
 * Coordinates all 14 Desktop subsystems.
 * Conforms to: ARC-001.001, ADR-002
 */
import type { Service } from '../../core/services/service.js';
import { DesktopState } from './types.js';
import type { DesktopRuntimeConfig } from './types.js';
import { DefaultDesktopRuntimeConfig } from './types.js';
import { WindowManager } from '../window-manager/window-manager.js';
import { NavigationRuntime } from '../navigation-runtime/navigation-runtime.js';
import { WorkspaceRuntime } from '../workspace-runtime/workspace-runtime.js';
import { ProjectRuntime } from '../project-runtime/project-runtime.js';
import { SessionRuntime } from '../session-runtime/session-runtime.js';
import { LocalStorageRuntime } from '../local-storage-runtime/local-storage-runtime.js';
import { ThemeRuntime } from '../theme-runtime/theme-runtime.js';
import { NotificationRuntime } from '../notification-runtime/notification-runtime.js';
import { CommandPaletteRuntime } from '../command-palette/command-palette.js';
import { SearchRuntime } from '../search-runtime/search-runtime.js';
import { StartupRuntime } from '../startup-runtime/startup-runtime.js';
import { SettingsRuntime } from '../settings-runtime/settings-runtime.js';
import { DiagnosticsRuntime } from '../diagnostics-runtime/diagnostics-runtime.js';
import { CrashRecoveryRuntime } from '../crash-recovery-runtime/crash-recovery-runtime.js';
import { DesktopNotInitializedError, SubsystemNotFoundError } from './errors.js';

export class DesktopRuntime {
  private config: DesktopRuntimeConfig;
  private _state = DesktopState.Uninitialized;
  private subsystems = new Map<string, Service>();

  readonly windowManager: WindowManager;
  readonly navigation: NavigationRuntime;
  readonly workspace: WorkspaceRuntime;
  readonly project: ProjectRuntime;
  readonly session: SessionRuntime;
  readonly localStorage: LocalStorageRuntime;
  readonly theme: ThemeRuntime;
  readonly notification: NotificationRuntime;
  readonly commandPalette: CommandPaletteRuntime;
  readonly search: SearchRuntime;
  readonly startup: StartupRuntime;
  readonly settings: SettingsRuntime;
  readonly diagnostics: DiagnosticsRuntime;
  readonly crashRecovery: CrashRecoveryRuntime;

  constructor(config?: Partial<DesktopRuntimeConfig>) {
    this.config = { ...DefaultDesktopRuntimeConfig, ...config };
    this.windowManager = new WindowManager(this.config);
    this.navigation = new NavigationRuntime();
    this.workspace = new WorkspaceRuntime();
    this.project = new ProjectRuntime();
    this.session = new SessionRuntime();
    this.localStorage = new LocalStorageRuntime();
    this.theme = new ThemeRuntime();
    this.notification = new NotificationRuntime();
    this.commandPalette = new CommandPaletteRuntime();
    this.search = new SearchRuntime();
    this.startup = new StartupRuntime();
    this.settings = new SettingsRuntime();
    this.diagnostics = new DiagnosticsRuntime();
    this.crashRecovery = new CrashRecoveryRuntime();
    this.registerSubsystem(this.windowManager);
    this.registerSubsystem(this.navigation);
    this.registerSubsystem(this.workspace);
    this.registerSubsystem(this.project);
    this.registerSubsystem(this.session);
    this.registerSubsystem(this.localStorage);
    this.registerSubsystem(this.theme);
    this.registerSubsystem(this.notification);
    this.registerSubsystem(this.commandPalette);
    this.registerSubsystem(this.search);
    this.registerSubsystem(this.startup);
    this.registerSubsystem(this.settings);
    this.registerSubsystem(this.diagnostics);
    this.registerSubsystem(this.crashRecovery);
  }

  get state(): DesktopState { return this._state; }
  get subsystemNames(): readonly string[] { return [...this.subsystems.keys()]; }
  get subsystemCount(): number { return this.subsystems.size; }

  private registerSubsystem(svc: Service): void {
    this.subsystems.set(svc.name, svc);
  }

  getSubsystem<T extends Service>(name: string): T {
    const svc = this.subsystems.get(name);
    if (!svc) throw new SubsystemNotFoundError(name);
    return svc as T;
  }

  async initialize(): Promise<void> {
    this._state = DesktopState.Initializing;
    for (const svc of this.subsystems.values()) {
      await svc.initialize();
    }
    this._state = DesktopState.Ready;
  }

  async start(): Promise<void> {
    if (this._state !== DesktopState.Ready) throw new DesktopNotInitializedError();
    this._state = DesktopState.Running;
    for (const svc of this.subsystems.values()) {
      await svc.start();
    }
  }

  async stop(): Promise<void> {
    this._state = DesktopState.Stopping;
    const svcs = [...this.subsystems.values()].reverse();
    for (const svc of svcs) {
      await svc.stop();
    }
    this._state = DesktopState.Stopped;
  }

  async shutdown(): Promise<void> {
    const svcs = [...this.subsystems.values()].reverse();
    for (const svc of svcs) {
      await svc.shutdown();
    }
    this._state = DesktopState.Uninitialized;
  }
}
