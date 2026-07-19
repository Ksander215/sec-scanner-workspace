/**
 * SIP Server — Plugin API Routes
 * GET    /api/plugins              — List all plugins with registry status
 * GET    /api/plugins/:id          — Get plugin manifest
 * POST   /api/plugins/:id/install  — Install a plugin
 * POST   /api/plugins/:id/remove   — Remove a plugin
 * GET    /api/plugins/:id/verify   — Verify plugin installation
 * POST   /api/plugins/:id/check    — Check if tool is installed on server
 */

import { Router, type Request, type Response } from "express";
import { ALL_MANIFESTS, MANIFESTS_BY_ID, BUILTIN_TOOL_IDS } from "../plugins/manifests";
import { installTool, verifyTool } from "../plugins/runtime";
import {
  getRegistryEntries,
  isToolInstalled,
  updateRegistryEntry,
  removeRegistryEntry,
  updateToolLastRun,
} from "../services/store";
import type { InstallStatus } from "../types";

export const pluginsRouter = Router();

// ─── List all plugins ─────────────────────────────────────────────────────

pluginsRouter.get("/", (_req: Request, res: Response) => {
  const registry = getRegistryEntries();

  const plugins = ALL_MANIFESTS.map((manifest) => {
    const entry = registry.entries[manifest.id];
    const isBuiltin = BUILTIN_TOOL_IDS.has(manifest.id);

    return {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      category: manifest.category,
      outputFormat: manifest.outputFormat,
      cliCommand: manifest.cliCommand,
      isBuiltin,
      status: isBuiltin ? "installed" : (entry?.status || "not_installed") as InstallStatus,
      installedAt: isBuiltin ? "builtin" : entry?.installedAt,
      lastRun: entry?.lastRun,
      health: isBuiltin ? "healthy" : (entry?.health || "unknown"),
      versionInstalled: isBuiltin ? manifest.version : entry?.version,
    };
  });

  res.json(plugins);
});

// ─── Get plugin manifest ──────────────────────────────────────────────────

pluginsRouter.get("/:id", (req: Request, res: Response) => {
  const manifest = MANIFESTS_BY_ID[req.params.id];
  if (!manifest) {
    res.status(404).json({ error: "Plugin not found" });
    return;
  }

  const registry = getRegistryEntries();
  const entry = registry.entries[manifest.id];
  const isBuiltin = BUILTIN_TOOL_IDS.has(manifest.id);

  res.json({
    ...manifest,
    isBuiltin,
    status: isBuiltin ? "installed" : (entry?.status || "not_installed"),
    installedAt: isBuiltin ? "builtin" : entry?.installedAt,
    lastRun: entry?.lastRun,
    health: isBuiltin ? "healthy" : (entry?.health || "unknown"),
  });
});

// ─── Install a plugin ─────────────────────────────────────────────────────

pluginsRouter.post("/:id/install", async (req: Request, res: Response) => {
  const { id } = req.params;
  const manifest = MANIFESTS_BY_ID[id];

  if (!manifest) {
    res.status(404).json({ error: "Plugin not found" });
    return;
  }

  if (BUILTIN_TOOL_IDS.has(id)) {
    res.json({ message: "Already built-in", status: "installed" });
    return;
  }

  if (isToolInstalled(id)) {
    res.json({ message: "Already installed", status: "installed" });
    return;
  }

  // Update registry: downloading
  updateRegistryEntry(id, { status: "downloading", health: "unknown" });

  // Install via runtime
  const result = await installTool(id);

  if (result.exitCode === 0) {
    // Verify installation
    const verification = await verifyTool(id);

    if (verification.installed) {
      updateRegistryEntry(id, {
        status: "installed",
        installedAt: new Date().toISOString(),
        version: verification.version || manifest.version,
        health: "healthy",
        signature: `sha256:${id}-${Date.now()}`,
      });

      res.json({
        message: "Plugin installed successfully",
        status: "installed",
        version: verification.version,
      });
    } else {
      updateRegistryEntry(id, { status: "failed", health: "error" });
      res.status(500).json({
        error: "Installation completed but verification failed",
        stdout: result.stdout,
        stderr: result.stderr,
      });
    }
  } else {
    updateRegistryEntry(id, { status: "failed", health: "error" });
    res.status(500).json({
      error: "Installation failed",
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }
});

// ─── Remove a plugin ──────────────────────────────────────────────────────

pluginsRouter.post("/:id/remove", (req: Request, res: Response) => {
  const { id } = req.params;

  if (BUILTIN_TOOL_IDS.has(id)) {
    res.status(400).json({ error: "Cannot remove built-in plugins" });
    return;
  }

  if (!isToolInstalled(id)) {
    res.status(400).json({ error: "Plugin is not installed" });
    return;
  }

  removeRegistryEntry(id);
  res.json({ message: "Plugin removed", status: "not_installed" });
});

// ─── Verify plugin installation ───────────────────────────────────────────

pluginsRouter.get("/:id/verify", async (req: Request, res: Response) => {
  const { id } = req.params;
  const manifest = MANIFESTS_BY_ID[id];

  if (!manifest) {
    res.status(404).json({ error: "Plugin not found" });
    return;
  }

  const result = await verifyTool(id);

  // Update registry
  if (result.installed) {
    updateRegistryEntry(id, {
      status: "installed",
      version: result.version,
      health: "healthy",
    });
  } else {
    updateRegistryEntry(id, { health: "error" });
  }

  res.json(result);
});

// ─── Check installed tools on server ──────────────────────────────────────

pluginsRouter.post("/check-all", async (_req: Request, res: Response) => {
  const results: Record<string, { installed: boolean; version?: string }> = {};

  for (const manifest of ALL_MANIFESTS) {
    results[manifest.id] = await verifyTool(manifest.id);
  }

  res.json(results);
});
