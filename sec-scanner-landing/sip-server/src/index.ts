/**
 * SIP Core Engine — Backend API Server
 *
 * Standalone Express.js server that executes real security tools,
 * parses their output, and provides REST API + SSE for the SIP frontend.
 *
 * Architecture:
 *   Frontend (Next.js) ←→ Backend API (Express) ←→ CLI Tools (nmap, nuclei, etc.)
 *
 * API Endpoints:
 *   /api/scans/*         — Scanner operations
 *   /api/plugins/*       — Plugin management
 *   /api/projects/*      — Project workspace
 *   /api/analysis/*      — KG, Attack Paths, Recommendations, Reports
 *   /api/health          — Server health check
 */

import express from "express";
import cors from "cors";
import { scannerRouter } from "./routes/scanner";
import { pluginsRouter } from "./routes/plugins";
import { projectsRouter } from "./routes/projects";
import { analysisRouter } from "./routes/analysis";
import { verifyTool } from "./plugins/runtime";
import { ALL_MANIFESTS } from "./plugins/manifests";

const app = express();
const PORT = parseInt(process.env.SIP_PORT || "3001", 10);
const CORS_ORIGIN = process.env.SIP_CORS_ORIGIN || "https://sec-scanner.pro";

// ─── Middleware ────────────────────────────────────────────────────────────

app.use(cors({
  origin: [CORS_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// ─── Request logging ──────────────────────────────────────────────────────

app.use((req, _res, next) => {
  console.log(`[SIP] ${req.method} ${req.path}`);
  next();
});

// ─── API Routes ───────────────────────────────────────────────────────────

app.use("/api/scans", scannerRouter);
app.use("/api/plugins", pluginsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/analysis", analysisRouter);

// ─── Health check ─────────────────────────────────────────────────────────

// ─── Tool status cache ────────────────────────────────────────────────────

let cachedToolStatus: Record<string, { installed: boolean; version?: string }> | null = null;
let lastToolCheck = 0;
const TOOL_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function getToolStatus(): Promise<Record<string, { installed: boolean; version?: string }>> {
  const now = Date.now();
  if (cachedToolStatus && (now - lastToolCheck) < TOOL_CHECK_INTERVAL) {
    return cachedToolStatus;
  }

  const status: Record<string, { installed: boolean; version?: string }> = {};
  // Run checks in parallel with Promise.allSettled
  const results = await Promise.allSettled(
    ALL_MANIFESTS.map(async (manifest) => {
      const result = await verifyTool(manifest.id);
      return { id: manifest.id, ...result };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      status[result.value.id] = { installed: result.value.installed, version: result.value.version };
    }
  }

  cachedToolStatus = status;
  lastToolCheck = now;
  return status;
}

app.get("/api/health", async (_req, res) => {
  const toolStatus = await getToolStatus();

  res.json({
    status: "ok",
    version: "1.0.0",
    uptime: process.uptime(),
    tools: toolStatus,
    timestamp: new Date().toISOString(),
  });
});

// ─── Error handling ───────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[SIP] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

// ─── Start server ─────────────────────────────────────────────────────────

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  SIP Core Engine — Backend API Server                    ║
║  Version: 1.0.0                                          ║
║  Port: ${PORT}                                              ║
║  CORS: ${CORS_ORIGIN}                       ║
║  Data: ${process.env.SIP_DATA_DIR || "/var/lib/sip"}                    ║
╚══════════════════════════════════════════════════════════╝
  `);
  console.log("[SIP] Server ready. Waiting for requests...");
});

export default app;
