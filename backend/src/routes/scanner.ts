/**
 * SIP Server — Scanner API Routes
 * POST /api/scans         — Start a new scan
 * GET  /api/scans         — List scan results
 * GET  /api/scans/:id     — Get scan result
 * POST /api/scans/:id/cancel — Cancel a running scan
 * GET  /api/scans/stream/:id — SSE stream for scan progress
 */

import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { executeScanPipeline, cancelScan, isScanActive } from "../services/scanner";
import { saveScanResult, getScanResults, getScanResult, getProject } from "../services/store";
import { MANIFESTS_BY_ID } from "../plugins/manifests";
import type { ScanConfig } from "../types";

export const scannerRouter = Router();

// ─── Start a new scan ─────────────────────────────────────────────────────

scannerRouter.post("/", async (req: Request, res: Response) => {
  const { projectId, projectName, sourceType, sourceValue, toolIds } = req.body as ScanConfig;

  // Validate
  if (!sourceType || !sourceValue || !toolIds || toolIds.length === 0) {
    res.status(400).json({ error: "Missing required fields: sourceType, sourceValue, toolIds" });
    return;
  }

  // Validate tool IDs
  const validToolIds = toolIds.filter((id: string) => MANIFESTS_BY_ID[id]);
  if (validToolIds.length === 0) {
    res.status(400).json({ error: "No valid tool IDs provided" });
    return;
  }

  const scanId = `SCAN-${uuidv4().slice(0, 8)}`;
  const config: ScanConfig = {
    projectId: projectId || "PRJ-001",
    projectName: projectName || "Default Project",
    sourceType,
    sourceValue,
    toolIds: validToolIds,
  };

  // Check if request wants SSE stream
  const acceptSSE = req.headers.accept?.includes("text/event-stream");

  if (acceptSSE) {
    // SSE response — stream progress events
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Send scan ID first
    res.write(`event: init\ndata: ${JSON.stringify({ scanId })}\n\n`);

    // Execute scan pipeline with SSE progress
    try {
      const result = await executeScanPipeline(config, scanId, res);
      saveScanResult(result);
    } catch (err) {
      console.error("[SIP Scanner] Pipeline error:", err);
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  } else {
    // Regular JSON response — start scan and return scan ID
    // The client will poll for progress via SSE endpoint
    res.json({ scanId, status: "queued", config });

    // Execute in background
    try {
      // We need a fake response object to capture SSE events
      // For non-SSE mode, we'll still run the pipeline and save results
      const fakeRes = {
        writableEnded: false,
        write: () => {},
        end: () => {},
      } as unknown as Response;

      const result = await executeScanPipeline(config, scanId, fakeRes);
      saveScanResult(result);
    } catch (err) {
      console.error("[SIP Scanner] Pipeline error:", err);
    }
  }
});

// ─── List scan results ────────────────────────────────────────────────────

scannerRouter.get("/", (_req: Request, res: Response) => {
  const scans = getScanResults();
  // Return summaries without full findings
  const summaries = scans.map((s) => ({
    id: s.id,
    projectId: s.projectId,
    projectName: s.projectName,
    sourceType: s.sourceType,
    sourceValue: s.sourceValue,
    tools: s.tools,
    status: s.status,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    findingsCount: s.findings.length,
    riskScore: s.riskScore,
    exitCode: s.exitCode,
  }));
  res.json(summaries);
});

// ─── Get scan result ──────────────────────────────────────────────────────

scannerRouter.get("/:id", (req: Request, res: Response) => {
  const scan = getScanResult(req.params.id);
  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }
  res.json(scan);
});

// ─── Cancel a scan ────────────────────────────────────────────────────────

scannerRouter.post("/:id/cancel", (req: Request, res: Response) => {
  const cancelled = cancelScan(req.params.id);
  if (cancelled) {
    res.json({ message: "Scan cancelled", scanId: req.params.id });
  } else {
    res.status(404).json({ error: "Scan not found or not active" });
  }
});

// ─── SSE stream for scan progress ─────────────────────────────────────────

scannerRouter.get("/stream/:id", (req: Request, res: Response) => {
  if (!isScanActive(req.params.id)) {
    res.status(404).json({ error: "No active scan with this ID" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // For now, just keep the connection open.
  // The actual SSE events are sent during scan execution in the POST / handler.
  // This endpoint exists for reconnecting to an ongoing scan.

  req.on("close", () => {
    // Client disconnected
  });
});
