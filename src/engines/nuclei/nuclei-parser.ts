/**
 * Nuclei Engine — JSONL Parser
 *
 * Parses Nuclei's JSON output (one JSON object per line) into
 * ScanEngineFinding[] for the Scan Platform.
 *
 * Design:
 * - Stream-compatible: parseLine() processes one line at a time.
 * - Resilient: malformed lines are skipped, not fatal.
 * - Deduplication: identical template-id + matched-at combinations
 *   within the same scan are deduplicated.
 * - Normalization: Nuclei severity → Scan Platform severity.
 */

import type { ScanEngineFinding } from '../../domain/scan-platform/plugin-api/scan-engine-plugin.ts';
import type { NucleiOutputRow } from './nuclei-types.ts';

// ─── Severity Mapping ──────────────────────────────────────

/**
 * Maps Nuclei severity strings to Scan Platform severity.
 * Nuclei uses: info, low, medium, high, critical, unknown.
 * Some community templates use: warning, moderate.
 */
const SEVERITY_MAP: Record<string, string> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  moderate: 'medium',
  warning: 'medium',
  low: 'low',
  info: 'info',
  informational: 'info',
  unknown: 'low',
};

function normalizeSeverity(nucleiSeverity: string): string {
  const lower = (nucleiSeverity ?? 'info').toLowerCase().trim();
  return SEVERITY_MAP[lower] ?? 'low';
}

// ─── Extracted Results Evidence ────────────────────────────

/**
 * Builds evidence items from Nuclei's extracted-results and request/response.
 */
function buildEvidence(row: NucleiOutputRow): ScanEngineFinding['evidence'] {
  const evidence: ScanEngineFinding['evidence'] = [];

  // Extracted results — the matched payload/pattern.
  if (row['extracted-results']?.length) {
    for (const result of row['extracted-results']) {
      if (result && result.trim()) {
        evidence.push({
          type: 'proof_of_concept',
          content: result,
          description: 'Extracted match from response',
        });
      }
    }
  }

  // Request/Response pair — the most valuable evidence.
  if (row.request || row.response) {
    const parts: string[] = [];
    if (row.request) parts.push(`--- REQUEST ---\n${row.request}`);
    if (row.response) parts.push(`--- RESPONSE ---\n${row.response}`);
    evidence.push({
      type: 'request_response_pair',
      content: parts.join('\n\n'),
      description: 'Full HTTP request/response that triggered the finding',
    });
  }

  // cURL reproduction command.
  if (row['curl-command']) {
    evidence.push({
      type: 'log',
      content: row['curl-command'],
      description: 'cURL reproduction command',
    });
  }

  // Interaction data (OAST/interactsh).
  if (row.interaction) {
    const intParts: string[] = [];
    if (row.interaction.protocol) intParts.push(`Protocol: ${row.interaction.protocol}`);
    if (row.interaction['interaction-id']) intParts.push(`Interaction ID: ${row.interaction['interaction-id']}`);
    if (row.interaction.request) intParts.push(`Request: ${row.interaction.request}`);
    if (row.interaction.response) intParts.push(`Response: ${row.interaction.response}`);
    if (intParts.length > 0) {
      evidence.push({
        type: 'log',
        content: intParts.join('\n'),
        description: 'Out-of-band interaction details',
      });
    }
  }

  return evidence;
}

// ─── Description Builder ────────────────────────────────────

/**
 * Builds a description from available Nuclei data.
 * Falls back gracefully when fields are missing.
 */
function buildDescription(row: NucleiOutputRow, info: NucleiOutputRow['info']): string {
  const parts: string[] = [];

  // Use template description if available.
  if (info?.description) {
    parts.push(info.description);
  }

  // Add type context.
  if (row.type) {
    parts.push(`Detection method: ${row.type}`);
  }

  // Add IP if available.
  if (row.ip) {
    parts.push(`Resolved IP: ${row.ip}`);
  }

  return parts.join('\n\n');
}

// ─── Reference Extraction ──────────────────────────────────

/**
 * Extracts reference URLs from all available sources.
 */
function extractReferences(row: NucleiOutputRow): string[] {
  const refs = new Set<string>();

  // Template info references.
  const info = row.info ?? row['template-info'];
  if (info?.reference) {
    for (const ref of info.reference) {
      if (ref) refs.add(ref);
    }
  }

  // CVE reference.
  if (row['cve-id']) {
    refs.add(`https://nvd.nist.gov/vuln/detail/${row['cve-id']}`);
  }

  // CWE reference.
  if (row['cwe-id']) {
    refs.add(`https://cwe.mitre.org/data/definitions/${row['cwe-id'].replace('CWE-', '')}.html`);
  }

  // CWE from classification.
  const classification = info?.classification;
  if (classification?.['cwe-id']) {
    for (const cwe of classification['cwe-id']) {
      const num = cwe.replace('CWE-', '');
      refs.add(`https://cwe.mitre.org/data/definitions/${num}.html`);
    }
  }

  return Array.from(refs);
}

// ─── CWE Extraction ────────────────────────────────────────

function extractCweId(row: NucleiOutputRow): string | undefined {
  // Direct field.
  if (row['cwe-id']) return row['cwe-id'];

  // From classification.
  const info = row.info ?? row['template-info'];
  const cweIds = info?.classification?.['cwe-id'];
  if (cweIds?.length) return cweIds[0];

  return undefined;
}

// ─── CVSS Extraction ───────────────────────────────────────

function extractCvss(row: NucleiOutputRow): { score?: number; vector?: string } {
  const info = row.info ?? row['template-info'];
  const classification = info?.classification;

  return {
    score: classification?.['cvss-score'],
    vector: classification?.['cvss-metrics'],
  };
}

// ─── Tags ──────────────────────────────────────────────────

function extractTags(row: NucleiOutputRow): string[] {
  const tags: string[] = [];

  const info = row.info ?? row['template-info'];
  if (info?.tags) {
    tags.push(...info.tags);
  }

  // Add detection type as tag.
  if (row.type) {
    tags.push(`nuclei-${row.type}`);
  }

  return [...new Set(tags)]; // deduplicate
}

// ─── Line Parser (public API) ──────────────────────────────

export interface ParseLineResult {
  readonly finding: ScanEngineFinding | null;
  readonly skipped: boolean;
  readonly error?: string;
}

/**
 * Parse a single JSONL line from Nuclei's stdout.
 *
 * @param line  A single line of Nuclei JSON output.
 * @param seen  Set of seen "template-id|matched-at" keys for deduplication.
 * @param maxFindings  Stop parsing after this many unique findings (0 = unlimited).
 * @returns  ParseLineResult with finding or skip reason.
 */
export function parseLine(
  line: string,
  seen: Set<string>,
  maxFindings: number = 0,
): ParseLineResult {
  // Skip empty lines.
  const trimmed = line.trim();
  if (!trimmed) return { finding: null, skipped: true };

  // Parse JSON.
  let row: NucleiOutputRow;
  try {
    row = JSON.parse(trimmed) as NucleiOutputRow;
  } catch {
    return { finding: null, skipped: true, error: 'Invalid JSON' };
  }

  // Validate minimum required fields.
  if (!row['template-id']) {
    return { finding: null, skipped: true, error: 'Missing template-id' };
  }

  // Get template info (v3 uses 'info', v2 uses 'template-info').
  const info = row.info ?? row['template-info'];

  // Deduplication key: template-id + matched-at.
  const dedupKey = `${row['template-id']}|${row['matched-at'] ?? row.host ?? ''}`;
  if (seen.has(dedupKey)) {
    return { finding: null, skipped: true, error: 'Duplicate' };
  }
  seen.add(dedupKey);

  // Check maxFindings limit.
  if (maxFindings > 0 && seen.size > maxFindings) {
    return { finding: null, skipped: true, error: 'Max findings reached' };
  }

  // Extract CVSS.
  const cvss = extractCvss(row);

  // Build the ScanEngineFinding.
  const finding: ScanEngineFinding = {
    engineFindingId: row['template-id'],
    title: info?.name ?? row['template-id'],
    description: buildDescription(row, info),
    severity: normalizeSeverity(info?.severity ?? 'info'),
    cweId: extractCweId(row),
    cvssScore: cvss.score,
    cvssVector: cvss.vector,
    location: {
      url: row['matched-at'] ?? row.host,
      path: extractPath(row['matched-at'] ?? row.host),
    },
    evidence: buildEvidence(row),
    remediation: info?.remediation,
    references: extractReferences(row).length > 0
      ? extractReferences(row)
      : undefined,
    confidence: 0.85, // Nuclei templates are generally high-confidence.
    tags: extractTags(row).length > 0
      ? extractTags(row)
      : undefined,
    templateId: row['template-id'],
  };

  return { finding, skipped: false };
}

/**
 * Parse the full Nuclei JSONL output.
 * Convenience wrapper for testing and batch processing.
 */
export function parseNucleiOutput(
  output: string,
  maxFindings: number = 0,
): { findings: ScanEngineFinding[]; errors: number; duplicates: number } {
  const findings: ScanEngineFinding[] = [];
  const seen = new Set<string>();
  let errors = 0;
  let duplicates = 0;

  for (const line of output.split('\n')) {
    const result = parseLine(line, seen, maxFindings);
    if (result.finding) {
      findings.push(result.finding);
    }
    if (result.error === 'Invalid JSON') errors++;
    if (result.error === 'Duplicate') duplicates++;
    if (result.error === 'Max findings reached') break;
  }

  return { findings, errors, duplicates };
}

// ─── Helpers ───────────────────────────────────────────────

/**
 * Extract the path component from a URL.
 * "https://example.com/api/v1/users?q=1" → "/api/v1/users"
 */
function extractPath(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.pathname || undefined;
  } catch {
    // Not a valid URL — return as-is if it looks like a path.
    return url.startsWith('/') ? url : undefined;
  }
}