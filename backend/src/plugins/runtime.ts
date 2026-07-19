/**
 * SIP Server — Universal Plugin Runtime
 * The Runtime executes tools through their manifests.
 * Scanner knows nothing about specific tools — it works only through this Runtime.
 *
 * Flow: select tool → form command → spawn process → capture stdout/stderr →
 *       track progress → save log → return exit code → pass to parser.
 */

import { spawn, ChildProcess } from "child_process";
import { MANIFESTS_BY_ID, BUILTIN_TOOL_IDS } from "./manifests";
import type { PluginManifest, SourceType } from "../types";

// ─── Runtime types ────────────────────────────────────────────────────────

export interface RuntimeResult {
  toolId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number; // ms
  command: string;
  error?: string;
}

export interface RuntimeCallbacks {
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
  onProgress?: (percent: number) => void;
}

// ─── Active processes tracking ────────────────────────────────────────────

const activeProcesses = new Map<string, ChildProcess>();

/** Kill a running process by scan ID + tool ID */
export function killProcess(scanId: string, toolId: string): boolean {
  const key = `${scanId}:${toolId}`;
  const proc = activeProcesses.get(key);
  if (proc) {
    proc.kill("SIGTERM");
    activeProcesses.delete(key);
    return true;
  }
  return false;
}

/** Kill all processes for a scan */
export function killAllScanProcesses(scanId: string): number {
  let killed = 0;
  for (const [key, proc] of activeProcesses.entries()) {
    if (key.startsWith(`${scanId}:`)) {
      proc.kill("SIGTERM");
      activeProcesses.delete(key);
      killed++;
    }
  }
  return killed;
}

// ─── Build command from manifest + target ─────────────────────────────────

export function buildCommand(manifest: PluginManifest, sourceType: SourceType, sourceValue: string): string {
  let command = manifest.run.command;

  // Replace {target} placeholder
  command = command.replace(/\{target\}/g, sourceValue);

  // Tool-specific command adjustments based on source type
  if (manifest.id === "nmap") {
    // nmap needs a hostname/IP, not a git repo
    if (sourceType === "git" || sourceType === "folder") {
      // For code sources, try to extract domain from sourceValue or scan localhost
      command = command.replace(sourceValue, "127.0.0.1");
    }
  } else if (manifest.id === "trivy") {
    // trivy fs for filesystem, trivy image for docker
    if (sourceType === "docker") {
      command = command.replace("trivy fs", "trivy image");
    } else if (sourceType === "website" || sourceType === "api") {
      // Trivy doesn't scan URLs directly, skip
      return "";
    }
  } else if (manifest.id === "semgrep") {
    // semgrep needs a local path
    if (sourceType === "website" || sourceType === "api") {
      return ""; // semgrep can't scan URLs
    }
  } else if (manifest.id === "nuclei") {
    // nuclei needs a URL
    if (sourceType === "git" || sourceType === "folder") {
      return ""; // nuclei can't scan local files directly
    }
    // Ensure URL has scheme
    if (!sourceValue.startsWith("http")) {
      command = command.replace(sourceValue, `https://${sourceValue}`);
    }
  } else if (manifest.id === "owasp-zap") {
    // ZAP needs a URL
    if (sourceType === "git" || sourceType === "folder") {
      return "";
    }
    if (!sourceValue.startsWith("http")) {
      command = command.replace(sourceValue, `https://${sourceValue}`);
    }
  } else if (manifest.id === "nikto") {
    // nikto needs a URL or host
    if (sourceType === "git" || sourceType === "folder") {
      return "";
    }
    if (!sourceValue.startsWith("http")) {
      command = command.replace(sourceValue, `https://${sourceValue}`);
    }
  }

  return command;
}

// ─── Get applicable tools for a source type ───────────────────────────────

export function getApplicableTools(sourceType: SourceType, installedToolIds: string[]): PluginManifest[] {
  const allTools = [...BUILTIN_TOOL_IDS, ...installedToolIds]
    .map((id) => MANIFESTS_BY_ID[id])
    .filter(Boolean);

  return allTools.filter((manifest) => {
    const cmd = buildCommand(manifest, sourceType, "test-target");
    return cmd !== ""; // tool can handle this source type
  });
}

// ─── Execute a tool via CLI ───────────────────────────────────────────────

export async function executeTool(
  scanId: string,
  toolId: string,
  sourceType: SourceType,
  sourceValue: string,
  callbacks?: RuntimeCallbacks,
  timeout: number = 300000, // 5 min default
): Promise<RuntimeResult> {
  const manifest = MANIFESTS_BY_ID[toolId];
  if (!manifest) {
    return {
      toolId,
      exitCode: -1,
      stdout: "",
      stderr: "",
      duration: 0,
      command: "",
      error: `Unknown tool: ${toolId}`,
    };
  }

  const command = buildCommand(manifest, sourceType, sourceValue);
  if (!command) {
    return {
      toolId,
      exitCode: -1,
      stdout: "",
      stderr: "",
      duration: 0,
      command: "",
      error: `Tool ${toolId} is not applicable for source type ${sourceType}`,
    };
  }

  const startTime = Date.now();
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];

  return new Promise((resolve) => {
    // Parse command into parts (handle quoted strings)
    const parts = parseCommand(command);
    const executable = parts[0];
    const args = parts.slice(1);

    console.log(`[SIP Runtime] Executing: ${executable} ${args.join(" ")}`);

    const proc = spawn(executable, args, {
      cwd: "/tmp",
      env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/root/go/bin` },
      timeout,
      shell: true,
    });

    const key = `${scanId}:${toolId}`;
    activeProcesses.set(key, proc);

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      const lines = text.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        stdoutLines.push(line);
        callbacks?.onStdout?.(line);
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      const lines = text.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        stderrLines.push(line);
        callbacks?.onStderr?.(line);
      }
    });

    proc.on("close", (code: number | null) => {
      const duration = Date.now() - startTime;
      activeProcesses.delete(key);
      resolve({
        toolId,
        exitCode: code ?? -1,
        stdout: stdoutLines.join("\n"),
        stderr: stderrLines.join("\n"),
        duration,
        command,
      });
    });

    proc.on("error", (err: Error) => {
      const duration = Date.now() - startTime;
      activeProcesses.delete(key);
      resolve({
        toolId,
        exitCode: -1,
        stdout: stdoutLines.join("\n"),
        stderr: stderrLines.join("\n"),
        duration,
        command,
        error: err.message,
      });
    });
  });
}

// ─── Install a tool ───────────────────────────────────────────────────────

export async function installTool(
  toolId: string,
  callbacks?: { onStdout?: (line: string) => void; onStderr?: (line: string) => void }
): Promise<RuntimeResult> {
  const manifest = MANIFESTS_BY_ID[toolId];
  if (!manifest) {
    return {
      toolId,
      exitCode: -1,
      stdout: "",
      stderr: "",
      duration: 0,
      command: "",
      error: `Unknown tool: ${toolId}`,
    };
  }

  if (BUILTIN_TOOL_IDS.has(toolId)) {
    return {
      toolId,
      exitCode: 0,
      stdout: "Already built-in",
      stderr: "",
      duration: 0,
      command: "builtin",
    };
  }

  const startTime = Date.now();
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];

  return new Promise((resolve) => {
    console.log(`[SIP Runtime] Installing: ${manifest.install.command}`);

    const proc = spawn(manifest.install.command, [], {
      cwd: "/tmp",
      env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/root/go/bin` },
      timeout: 600000, // 10 min for install
      shell: true,
    });

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      const lines = text.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        stdoutLines.push(line);
        callbacks?.onStdout?.(line);
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      const lines = text.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        stderrLines.push(line);
        callbacks?.onStderr?.(line);
      }
    });

    proc.on("close", (code: number | null) => {
      const duration = Date.now() - startTime;
      resolve({
        toolId,
        exitCode: code ?? -1,
        stdout: stdoutLines.join("\n"),
        stderr: stderrLines.join("\n"),
        duration,
        command: manifest.install.command,
      });
    });

    proc.on("error", (err: Error) => {
      const duration = Date.now() - startTime;
      resolve({
        toolId,
        exitCode: -1,
        stdout: stdoutLines.join("\n"),
        stderr: stderrLines.join("\n"),
        duration,
        command: manifest.install.command,
        error: err.message,
      });
    });
  });
}

// ─── Verify a tool installation ───────────────────────────────────────────

export async function verifyTool(toolId: string): Promise<{ installed: boolean; version?: string }> {
  const manifest = MANIFESTS_BY_ID[toolId];
  if (!manifest) return { installed: false };

  return new Promise((resolve) => {
    const proc = spawn(manifest.install.verify, [], {
      env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/root/go/bin` },
      timeout: 15000,
      shell: true,
    });

    let output = "";
    proc.stdout?.on("data", (data: Buffer) => { output += data.toString(); });
    proc.stderr?.on("data", (data: Buffer) => { output += data.toString(); });

    proc.on("close", (code: number | null) => {
      if (code === 0) {
        // Extract version from output
        const versionMatch = output.match(/(\d+\.\d+[\.\d]*)/);
        resolve({ installed: true, version: versionMatch?.[1] || "unknown" });
      } else {
        resolve({ installed: false });
      }
    });

    proc.on("error", () => {
      resolve({ installed: false });
    });
  });
}

// ─── Helper: Parse command string into parts ──────────────────────────────

function parseCommand(command: string): string[] {
  // Simple parser: handle quoted strings and && chains
  // For && chains, we use shell: true in spawn, so just return the full command
  return [command];
}
