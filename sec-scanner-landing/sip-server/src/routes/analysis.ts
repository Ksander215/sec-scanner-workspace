/**
 * SIP Server — Analysis API Routes
 * POST /api/analysis/knowledge-graph  — Build KG from findings
 * POST /api/analysis/attack-paths     — Build attack paths from findings
 * POST /api/analysis/recommendations  — Generate AI recommendations
 * POST /api/analysis/report           — Generate report
 * GET  /api/analysis/findings/latest  — Get latest findings
 */

import { Router, type Request, type Response } from "express";
import { buildKnowledgeGraph } from "../services/knowledge-graph";
import { buildAttackPaths } from "../services/attack-paths";
import { generateRecommendations } from "../services/recommendations";
import {
  generateReport,
  exportAsJSON,
  exportAsSARIF,
  exportAsMarkdown,
  exportAsCSV,
  exportAsHTML,
} from "../services/reports";
import { getLatestFindings, getScanResult } from "../services/store";
import type { Finding, ReportType } from "../types";

export const analysisRouter = Router();

// ─── Build Knowledge Graph ────────────────────────────────────────────────

analysisRouter.post("/knowledge-graph", (req: Request, res: Response) => {
  const { findings } = req.body as { findings?: Finding[] };

  // Use provided findings or latest from store
  const data = findings || getLatestFindings();
  if (!data || data.length === 0) {
    res.json({ nodes: [], edges: [] });
    return;
  }

  const graph = buildKnowledgeGraph(data);
  res.json(graph);
});

// ─── Build Knowledge Graph from scan ──────────────────────────────────────

analysisRouter.post("/knowledge-graph/:scanId", (req: Request, res: Response) => {
  const scan = getScanResult(req.params.scanId);
  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  const graph = buildKnowledgeGraph(scan.findings);
  res.json(graph);
});

// ─── Build Attack Paths ───────────────────────────────────────────────────

analysisRouter.post("/attack-paths", (req: Request, res: Response) => {
  const { findings } = req.body as { findings?: Finding[] };

  const data = findings || getLatestFindings();
  if (!data || data.length === 0) {
    res.json({ nodes: [], paths: [] });
    return;
  }

  const result = buildAttackPaths(data);
  res.json(result);
});

// ─── Build Attack Paths from scan ─────────────────────────────────────────

analysisRouter.post("/attack-paths/:scanId", (req: Request, res: Response) => {
  const scan = getScanResult(req.params.scanId);
  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  const result = buildAttackPaths(scan.findings);
  res.json(result);
});

// ─── Generate AI Recommendations ──────────────────────────────────────────

analysisRouter.post("/recommendations", (req: Request, res: Response) => {
  const { findings } = req.body as { findings?: Finding[] };

  const data = findings || getLatestFindings();
  if (!data || data.length === 0) {
    res.json([]);
    return;
  }

  const recommendations = generateRecommendations(data);
  res.json(recommendations);
});

// ─── Generate Recommendations from scan ────────────────────────────────────

analysisRouter.post("/recommendations/:scanId", (req: Request, res: Response) => {
  const scan = getScanResult(req.params.scanId);
  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  const recommendations = generateRecommendations(scan.findings);
  res.json(recommendations);
});

// ─── Generate Report ──────────────────────────────────────────────────────

analysisRouter.post("/report", (req: Request, res: Response) => {
  const { type, findings, riskScore, projectName, format } = req.body as {
    type?: ReportType;
    findings?: Finding[];
    riskScore?: number;
    projectName?: string;
    format?: "json" | "sarif" | "markdown" | "csv" | "html";
  };

  const data = findings || getLatestFindings();
  const score = riskScore || 0;
  const name = projectName || "SIP Scan";

  const reportType = type || "technical";
  const content = generateReport(reportType, data, score, name);

  switch (format) {
    case "sarif":
      res.setHeader("Content-Type", "application/json");
      res.send(exportAsSARIF(data));
      break;
    case "markdown":
      res.setHeader("Content-Type", "text/markdown");
      res.send(exportAsMarkdown(content, reportType, name));
      break;
    case "csv":
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="sip-report-${Date.now()}.csv"`);
      res.send(exportAsCSV(data));
      break;
    case "html":
      res.setHeader("Content-Type", "text/html");
      res.send(exportAsHTML(content, reportType, name));
      break;
    case "json":
    default:
      res.setHeader("Content-Type", "application/json");
      res.send(exportAsJSON(content));
      break;
  }
});

// ─── Generate Report from scan ────────────────────────────────────────────

analysisRouter.post("/report/:scanId", (req: Request, res: Response) => {
  const scan = getScanResult(req.params.scanId);
  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  const { type, format } = req.body as {
    type?: ReportType;
    format?: "json" | "sarif" | "markdown" | "csv" | "html";
  };

  const reportType = type || "technical";
  const content = generateReport(reportType, scan.findings, scan.riskScore, scan.projectName);

  switch (format) {
    case "sarif":
      res.setHeader("Content-Type", "application/json");
      res.send(exportAsSARIF(scan.findings));
      break;
    case "markdown":
      res.setHeader("Content-Type", "text/markdown");
      res.send(exportAsMarkdown(content, reportType, scan.projectName));
      break;
    case "csv":
      res.setHeader("Content-Type", "text/csv");
      res.send(exportAsCSV(scan.findings));
      break;
    case "html":
      res.setHeader("Content-Type", "text/html");
      res.send(exportAsHTML(content, reportType, scan.projectName));
      break;
    default:
      res.setHeader("Content-Type", "application/json");
      res.send(exportAsJSON(content));
      break;
  }
});

// ─── Get latest findings ──────────────────────────────────────────────────

analysisRouter.get("/findings/latest", (_req: Request, res: Response) => {
  const findings = getLatestFindings();
  res.json(findings);
});
