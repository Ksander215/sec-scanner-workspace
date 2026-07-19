/**
 * SIP Engine Bridge — Transparent Backend/Client Switch
 *
 * This module provides a unified API that:
 * - When backend is available: delegates to the SIP Backend API Server
 * - When backend is unavailable: falls back to the client-side engine
 *
 * All scanner pages and components should use this bridge instead of
 * directly importing from @/lib/engine or @/lib/api-client.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import {
  isBackendAvailable,
  startScanStream,
  cancelScan as cancelScanApi,
  listScans as listScansApi,
  listPlugins as listPluginsApi,
  installPluginApi,
  removePluginApi,
  type PluginInfo,
} from "./api-client";
import {
  executeScan,
  getAvailableTools as getClientAvailableTools,
  getMarketplaceAvailable as getClientMarketplaceAvailable,
  installPlugin as installPluginClient,
  removePlugin as removePluginClient,
  isInstalled as isInstalledClient,
  getRegistry as getRegistryClient,
} from "./engine";
import type {
  Finding,
  ScanResult,
  PluginManifest,
  RegistryEntry,
  Severity,
} from "./engine/types";
import type {
  ScanConfig,
  StageProgress,
} from "./engine/scanner";
import { MANIFESTS_BY_ID, BUILTIN_TOOL_IDS, ALL_MANIFESTS } from "./engine/plugins";

// ─── Hook: use real-time scan execution ───────────────────────────────────

export interface ScanExecutionState {
  isRunning: boolean;
  scanId: string | null;
  currentStage: StageProgress | null;
  stdoutLines: string[];
  result: ScanResult | null;
  error: string | null;
  useBackend: boolean;
}

export function useScanExecution() {
  const [state, setState] = useState<ScanExecutionState>({
    isRunning: false,
    scanId: null,
    currentStage: null,
    stdoutLines: [],
    result: null,
    error: null,
    useBackend: false,
  });

  const abortController = useRef<AbortController | null>(null);

  const startScan = useCallback(async (
    config: ScanConfig,
    locale: "ru" | "en",
    onProgress?: (progress: StageProgress) => void,
  ) => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      scanId: null,
      currentStage: null,
      stdoutLines: [],
      result: null,
      error: null,
    }));

    // Check if backend is available
    const backendAvailable = await isBackendAvailable();

    if (backendAvailable) {
      // ─── Backend path: real tool execution ────────────────────────────
      setState((prev) => ({ ...prev, useBackend: true }));

      const controller = startScanStream(
        config,
        // onInit
        (data) => {
          setState((prev) => ({ ...prev, scanId: data.scanId }));
        },
        // onStage
        (progress) => {
          setState((prev) => ({ ...prev, currentStage: progress }));
          onProgress?.(progress);
        },
        // onStdout
        (data) => {
          setState((prev) => ({
            ...prev,
            stdoutLines: [...prev.stdoutLines, `[${data.toolId}] ${data.line}`],
          }));
        },
        // onComplete
        (result) => {
          setState((prev) => ({
            ...prev,
            isRunning: false,
            result,
          }));
        },
        // onError
        (error) => {
          setState((prev) => ({
            ...prev,
            isRunning: false,
            error: error.message,
            result: error.result || null,
          }));
        },
      );

      abortController.current = controller;
    } else {
      // ─── Client path: simulated execution (fallback) ──────────────────
      setState((prev) => ({ ...prev, useBackend: false }));

      try {
        const result = await executeScan(config, locale, (progress) => {
          setState((prev) => ({
            ...prev,
            currentStage: progress,
            stdoutLines: progress.stdout ? [...prev.stdoutLines, ...progress.stdout] : prev.stdoutLines,
          }));
          onProgress?.(progress);
        });

        setState((prev) => ({
          ...prev,
          isRunning: false,
          result,
          scanId: result.id,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: (err as Error).message,
        }));
      }
    }
  }, []);

  const cancel = useCallback(async () => {
    if (state.useBackend && state.scanId) {
      await cancelScanApi(state.scanId);
    }
    abortController.current?.abort();
    setState((prev) => ({ ...prev, isRunning: false }));
  }, [state.useBackend, state.scanId]);

  const reset = useCallback(() => {
    setState({
      isRunning: false,
      scanId: null,
      currentStage: null,
      stdoutLines: [],
      result: null,
      error: null,
      useBackend: false,
    });
  }, []);

  return { ...state, startScan, cancel, reset };
}

// ─── Available tools (transparent) ────────────────────────────────────────

export async function getAvailableToolsHybrid(): Promise<PluginManifest[]> {
  const backendAvailable = await isBackendAvailable();

  if (backendAvailable) {
    try {
      const plugins = await listPluginsApi();
      return plugins
        .filter((p) => p.status === "installed")
        .map((p) => MANIFESTS_BY_ID[p.id])
        .filter(Boolean);
    } catch {
      // Fall through to client
    }
  }

  return getClientAvailableTools();
}

// ─── Plugin install/remove (transparent) ──────────────────────────────────

export async function installPluginHybrid(
  id: string,
  onProgress?: (status: string) => void,
): Promise<boolean> {
  const backendAvailable = await isBackendAvailable();

  if (backendAvailable) {
    try {
      onProgress?.("downloading");
      const result = await installPluginApi(id);
      return result.status === "installed";
    } catch {
      // Fall through to client
    }
  }

  return installPluginClient(id, onProgress as (status: import("./engine/types").InstallStatus) => void);
}

export async function removePluginHybrid(id: string): Promise<boolean> {
  const backendAvailable = await isBackendAvailable();

  if (backendAvailable) {
    try {
      const result = await removePluginApi(id);
      return true;
    } catch {
      // Fall through to client
    }
  }

  return removePluginClient(id);
}

// ─── Registry (transparent) ───────────────────────────────────────────────

export async function getRegistryHybrid(): Promise<RegistryEntry[]> {
  const backendAvailable = await isBackendAvailable();

  if (backendAvailable) {
    try {
      const plugins = await listPluginsApi();
      return plugins.map((p) => ({
        manifest: MANIFESTS_BY_ID[p.id]!,
        status: p.status as import("./engine/types").InstallStatus,
        installedAt: p.installedAt,
        version: p.versionInstalled,
        lastRun: p.lastRun,
        health: p.health as RegistryEntry["health"],
      }));
    } catch {
      // Fall through to client
    }
  }

  return getRegistryClient();
}

export async function isInstalledHybrid(id: string): Promise<boolean> {
  const backendAvailable = await isBackendAvailable();

  if (backendAvailable) {
    try {
      const plugins = await listPluginsApi();
      const plugin = plugins.find((p) => p.id === id);
      return plugin?.status === "installed";
    } catch {
      // Fall through
    }
  }

  return isInstalledClient(id);
}
