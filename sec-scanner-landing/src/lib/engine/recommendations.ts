/**
 * SIP Core Engine — AI Recommendations
 * LLM receives: Findings + CVSS + Business Context + Asset Criticality
 * Returns: risk explanation, recommendations, remediation plan, priority, business impact.
 *
 * Since we're running client-side without a real LLM, we generate
 * deterministic recommendations based on Finding attributes.
 */

import type { Finding, AIRecommendation, Severity } from "./types";

// ─── Generate AI Recommendations from Findings ────────────────────────────

export function generateRecommendations(findings: Finding[]): AIRecommendation[] {
  return findings
    .filter((f) => f.severity !== "info") // skip info findings
    .sort((a, b) => b.cvss - a.cvss)     // highest CVSS first
    .map((f) => generateSingleRecommendation(f));
}

function generateSingleRecommendation(finding: Finding): AIRecommendation {
  const priority = severityToPriority(finding.severity);

  return {
    findingId: finding.id,
    riskExplanation: buildRiskExplanation(finding),
    recommendation: finding.recommendation,
    remediationPlan: buildRemediationPlan(finding),
    priority,
    businessImpact: buildBusinessImpact(finding),
    estimatedEffort: estimateEffort(finding),
    confidence: calculateConfidence(finding),
  };
}

// ─── Risk Explanation ─────────────────────────────────────────────────────

function buildRiskExplanation(f: Finding): string {
  const parts: string[] = [];

  if (f.cve) {
    parts.push(`${f.cve} (${f.cvss}/10) affects ${f.asset}.`);
  } else {
    parts.push(`A ${f.severity}-severity issue (${f.cvss} CVSS) was identified in ${f.asset}.`);
  }

  if (f.cwe) {
    parts.push(`This is classified as CWE-${f.cwe} (${CWE_NAMES[f.cwe] || "see reference"}).`);
  }

  if (f.mitre) {
    parts.push(`Mapped to MITRE ATT&CK technique ${f.mitre}.`);
  }

  parts.push(f.description);

  if (f.severity === "critical") {
    parts.push("This vulnerability is actively exploitable and could lead to complete system compromise.");
  } else if (f.severity === "high") {
    parts.push("This vulnerability poses a significant risk and should be addressed promptly.");
  }

  return parts.join(" ");
}

// ─── Remediation Plan ─────────────────────────────────────────────────────

function buildRemediationPlan(f: Finding): string {
  const steps: string[] = [];

  steps.push("1. Immediate: " + getImmediateAction(f));
  steps.push("2. Short-term: " + f.recommendation);

  if (f.metadata?.fixedVersion) {
    steps.push(`3. Update ${f.metadata.pkgName || "dependency"} from ${f.metadata.installedVersion || "current"} to ${f.metadata.fixedVersion}.`);
  }

  steps.push("4. Verify the fix by re-scanning the affected asset.");
  steps.push("5. Monitor for regression in subsequent scans.");

  return steps.join("\n");
}

function getImmediateAction(f: Finding): string {
  if (f.severity === "critical") {
    if (f.cwe === "89") return "Block the vulnerable endpoint at the WAF. Disable the affected API endpoint if possible.";
    if (f.cwe === "798") return "Rotate the exposed credentials immediately. Revoke any sessions using the compromised key.";
    if (f.cwe === "79") return "Implement Content-Security-Policy headers. Sanitize all user input before rendering.";
  }
  if (f.severity === "high") {
    if (f.tool === "trivy") return "Apply the available security patch for the vulnerable dependency.";
    if (f.tool === "nmap") return "Close unnecessary open ports and restrict access to required services.";
  }
  return "Assess the impact and apply the recommended fix as soon as possible.";
}

// ─── Business Impact ──────────────────────────────────────────────────────

function buildBusinessImpact(f: Finding): string {
  if (f.severity === "critical") {
    if (f.cwe === "89") return "Data breach risk: customer data, PII, and financial records could be exposed. Regulatory fines under GDPR/PCI-DSS possible. Estimated cost: $500K–$5M.";
    if (f.cwe === "798") return "Full system compromise risk: attackers with hardcoded credentials can access production systems. Data exfiltration and service disruption likely. Estimated cost: $1M–$10M.";
    if (f.cwe === "79") return "Client-side attack risk: session hijacking could lead to unauthorized access. Customer trust erosion. Estimated cost: $100K–$1M.";
    return "Critical vulnerability could lead to complete system compromise, data breach, and service disruption. Regulatory implications under GDPR, PCI-DSS, and SOC 2.";
  }
  if (f.severity === "high") {
    return "High-severity issue that could enable significant unauthorized access or data exposure if exploited. May affect compliance posture.";
  }
  if (f.severity === "medium") {
    return "Moderate risk that could be exploited in combination with other vulnerabilities. Should be addressed to maintain defense-in-depth.";
  }
  return "Low-risk finding that represents a minor deviation from security best practices.";
}

// ─── Effort Estimation ────────────────────────────────────────────────────

function estimateEffort(f: Finding): string {
  if (f.metadata?.fixedVersion) return "1–2 hours (dependency update)";
  if (f.cwe === "89") return "4–8 hours (code refactoring)";
  if (f.cwe === "79") return "2–4 hours (output sanitization)";
  if (f.cwe === "798") return "2–4 hours (credential rotation + code cleanup)";
  if (f.tool === "nmap") return "1–2 hours (firewall configuration)";
  if (f.severity === "critical") return "4–8 hours";
  if (f.severity === "high") return "2–4 hours";
  return "1–2 hours";
}

// ─── Confidence Calculation ───────────────────────────────────────────────

function calculateConfidence(f: Finding): number {
  let confidence = 0.5;

  if (f.cve) confidence += 0.15;       // has CVE reference
  if (f.cwe) confidence += 0.1;        // has CWE classification
  if (f.mitre) confidence += 0.05;     // has MITRE mapping
  if (f.evidence) confidence += 0.1;   // has evidence
  if (f.cvss > 0) confidence += 0.05;  // has CVSS score
  if (f.references.length > 0) confidence += 0.05; // has references

  return Math.min(1.0, confidence);
}

// ─── Severity → Priority ──────────────────────────────────────────────────

function severityToPriority(severity: Severity): "critical" | "high" | "medium" | "low" {
  return severity === "info" ? "low" : severity;
}

// ─── CWE Name Reference ───────────────────────────────────────────────────

const CWE_NAMES: Record<string, string> = {
  "20": "Improper Input Validation",
  "79": "Cross-site Scripting (XSS)",
  "89": "SQL Injection",
  "269": "Privilege Abuse",
  "693": "Protection Mechanism Failure",
  "798": "Use of Hard-coded Credentials",
  "1004": "Sensitive Cookie Without 'HttpOnly' Flag",
  "1321": "Prototype Pollution",
};
