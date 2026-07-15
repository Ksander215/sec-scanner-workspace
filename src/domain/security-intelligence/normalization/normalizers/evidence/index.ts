/**
 * Evidence Normalizer
 *
 * Normalizes various evidence formats from different scanners
 * into a unified NormalizedEvidence model.
 *
 * Evidence types:
 * - Request: HTTP request data
 * - Response: HTTP response data
 * - DOM: Document Object Model snapshot
 * - Screenshot: Visual capture
 * - Header: HTTP header data
 * - Certificate: SSL/TLS certificate data
 * - Cookie: HTTP cookie data
 * - Log: Log file entries
 * - NetworkTrace: Network packet data
 * - FileContent: File content data
 */

import type { NormalizedEvidence, EvidenceType, Metadata } from '../../types/index.ts';
import { EvidenceType as Evt } from '../../types/index.ts';
import { createNormalizedEvidence } from '../../models/index.ts';

// ─── Evidence Detection ──────────────────────────────────────

/**
 * Detect the evidence type from raw evidence data.
 * Uses heuristics based on common scanner output formats.
 */
export function detectEvidenceType(raw: unknown): EvidenceType {
  if (raw === undefined || raw === null) return Evt.Log;

  if (typeof raw === 'string') {
    return detectEvidenceTypeFromString(raw);
  }

  if (typeof raw === 'object') {
    return detectEvidenceTypeFromObject(raw as Record<string, unknown>);
  }

  return Evt.Log;
}

function detectEvidenceTypeFromString(raw: string): EvidenceType {
  const lower = raw.toLowerCase();

  // HTTP request
  if (lower.startsWith('get ') || lower.startsWith('post ') || lower.startsWith('put ') ||
      lower.startsWith('delete ') || lower.startsWith('patch ') || lower.startsWith('head ') ||
      lower.startsWith('options ')) {
    return Evt.Request;
  }

  // HTTP response
  if (lower.startsWith('http/') || lower.includes('content-type:') || lower.includes('content-length:')) {
    return Evt.Response;
  }

  // HTML/DOM
  if (lower.includes('<!doctype') || lower.includes('<html') || lower.includes('<body') ||
      lower.includes('<script') || lower.includes('<div')) {
    return Evt.DOM;
  }

  // Certificate
  if (lower.includes('certificate') || lower.includes('issuer:') || lower.includes('subject:') ||
      lower.includes('ssl') || lower.includes('tls')) {
    return Evt.Certificate;
  }

  // Cookie
  if (lower.includes('set-cookie') || lower.match(/\bsessionid?\b/i) || lower.match(/\btoken\b/i)) {
    return Evt.Cookie;
  }

  // Default
  return Evt.Log;
}

function detectEvidenceTypeFromObject(obj: Record<string, unknown>): EvidenceType {
  const keys = new Set(Object.keys(obj).map(k => k.toLowerCase()));

  // Request
  if (keys.has('method') && (keys.has('url') || keys.has('path'))) return Evt.Request;
  if (keys.has('request') && keys.has('response')) return Evt.Request;
  if (keys.has('requestbody') || keys.has('requestheaders')) return Evt.Request;

  // Response
  if (keys.has('statuscode') || keys.has('status_code') || keys.has('status')) {
    return Evt.Response; // Status code alone is sufficient to identify response evidence
  }
  if (keys.has('response') && !keys.has('request')) return Evt.Response;

  // Cookie (check before Header — cookie has name+value+domain+path)
  if (keys.has('cookies') || keys.has('cookiedata')) return Evt.Cookie;
  if (keys.has('domain') && keys.has('path') && keys.has('name') && keys.has('value')) return Evt.Cookie;

  // DOM
  if (keys.has('dom') || keys.has('html') || keys.has('innerhtml') || keys.has('outerhtml')) return Evt.DOM;

  // Screenshot
  if (keys.has('screenshot') || keys.has('image') || keys.has('base64image') ||
      keys.has('png') || keys.has('jpeg') || keys.has('imagedata')) return Evt.Screenshot;

  // Header
  if (keys.has('headers') && !keys.has('body') && !keys.has('statuscode')) return Evt.Header;
  if (keys.has('name') && keys.has('value') && keys.size <= 4) return Evt.Header;

  // Certificate
  if (keys.has('certificate') || keys.has('issuer') || keys.has('subject') ||
      keys.has('notbefore') || keys.has('notafter') || keys.has('serialnumber')) return Evt.Certificate;
  if (keys.has('ssl') || keys.has('tls') || keys.has('cipher') || keys.has('protocol')) return Evt.Certificate;

  // Network trace
  if (keys.has('packets') || keys.has('sourceip') || keys.has('destinationip') ||
      keys.has('protocol') && keys.has('port')) return Evt.NetworkTrace;

  // File content
  if (keys.has('filename') || keys.has('filepath') || keys.has('content')) return Evt.FileContent;

  // Default
  return Evt.Log;
}

// ─── Evidence Normalization ──────────────────────────────────

export interface EvidenceNormalizationResult {
  readonly evidence: NormalizedEvidence;
  readonly detectedType: EvidenceType;
  readonly wasNormalized: boolean;
}

/**
 * Normalize raw evidence data into a NormalizedEvidence model.
 */
export function normalizeEvidence(
  raw: unknown,
  explicitType?: EvidenceType,
): EvidenceNormalizationResult {
  const detectedType = explicitType ?? detectEvidenceType(raw);
  const data = extractEvidenceData(raw, detectedType);
  const rawStr = typeof raw === 'string' ? raw : JSON.stringify(raw);

  const evidence = createNormalizedEvidence({
    type: detectedType,
    data,
    raw: rawStr,
    description: generateEvidenceDescription(detectedType, data),
  });

  return {
    evidence,
    detectedType,
    wasNormalized: true,
  };
}

/**
 * Normalize multiple evidence items.
 */
export function normalizeEvidenceList(
  items: readonly unknown[],
): NormalizedEvidence[] {
  return items.map(item => normalizeEvidence(item).evidence);
}

// ─── Data Extraction ─────────────────────────────────────────

function extractEvidenceData(raw: unknown, type: EvidenceType): Metadata {
  if (raw === undefined || raw === null) return {};

  if (typeof raw === 'string') {
    return extractFromString(raw, type);
  }

  if (typeof raw === 'object') {
    return extractFromObject(raw as Record<string, unknown>, type);
  }

  return { raw: String(raw) };
}

function extractFromString(raw: string, type: EvidenceType): Metadata {
  switch (type) {
    case Evt.Request:
      return extractRequestFromString(raw);
    case Evt.Response:
      return extractResponseFromString(raw);
    case Evt.Header:
      return extractHeadersFromString(raw);
    case Evt.Cookie:
      return extractCookieFromString(raw);
    default:
      return { raw };
  }
}

function extractFromObject(obj: Record<string, unknown>, type: EvidenceType): Metadata {
  const result: Record<string, string | number | boolean | null> = {};
  const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

  // Extract known fields based on type
  for (const [key, value] of Object.entries(obj)) {
    if (DANGEROUS_KEYS.has(key)) continue; // Prevent prototype pollution
    if (value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      result[key] = value;
    } else {
      result[key] = JSON.stringify(value);
    }
  }

  // Type-specific enrichment
  switch (type) {
    case Evt.Request:
      if (!result.method && obj.method) result.method = String(obj.method);
      if (!result.url && obj.url) result.url = String(obj.url);
      if (!result.path && obj.path) result.path = String(obj.path);
      break;
    case Evt.Response:
      if (!result.statusCode && obj.statusCode) result.statusCode = Number(obj.statusCode);
      if (!result.status_code && obj.status_code) result.status_code = Number(obj.status_code);
      break;
    case Evt.Certificate:
      if (!result.issuer && obj.issuer) result.issuer = typeof obj.issuer === 'string' ? obj.issuer : JSON.stringify(obj.issuer);
      if (!result.subject && obj.subject) result.subject = typeof obj.subject === 'string' ? obj.subject : JSON.stringify(obj.subject);
      break;
  }

  return result;
}

function extractRequestFromString(raw: string): Metadata {
  const lines = raw.split('\n');
  const firstLine = lines[0] ?? '';
  const parts = firstLine.split(' ');

  return {
    method: parts[0] ?? 'UNKNOWN',
    path: parts[1] ?? '/',
    protocol: parts[2] ?? 'HTTP/1.1',
    raw,
  };
}

function extractResponseFromString(raw: string): Metadata {
  const lines = raw.split('\n');
  const firstLine = lines[0] ?? '';
  const match = firstLine.match(/HTTP\/[\d.]+\s+(\d+)/);

  return {
    statusCode: match ? parseInt(match[1], 10) : 0,
    statusLine: firstLine,
    raw,
  };
}

function extractHeadersFromString(raw: string): Metadata {
  const headers: Record<string, string> = {};
  const lines = raw.split('\n');

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const name = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      headers[name.toLowerCase()] = value;
    }
  }

  return { ...headers, raw };
}

function extractCookieFromString(raw: string): Metadata {
  const cookies: Record<string, string> = {};
  const pairs = raw.split(';');

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx > 0) {
      const name = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      cookies[name] = value;
    }
  }

  return { ...cookies, raw };
}

function generateEvidenceDescription(type: EvidenceType, data: Metadata): string {
  switch (type) {
    case Evt.Request:
      return `HTTP ${data.method ?? 'UNKNOWN'} request to ${data.path ?? data.url ?? 'unknown'}`;
    case Evt.Response:
      return `HTTP response with status ${data.statusCode ?? data.status_code ?? 'unknown'}`;
    case Evt.DOM:
      return 'DOM snapshot evidence';
    case Evt.Screenshot:
      return 'Visual screenshot evidence';
    case Evt.Header:
      return 'HTTP header evidence';
    case Evt.Certificate:
      return `SSL/TLS certificate evidence (issuer: ${data.issuer ?? 'unknown'})`;
    case Evt.Cookie:
      return 'HTTP cookie evidence';
    case Evt.Log:
      return 'Log entry evidence';
    case Evt.NetworkTrace:
      return 'Network trace evidence';
    case Evt.FileContent:
      return 'File content evidence';
    default:
      return 'Evidence';
  }
}
