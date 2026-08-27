/**
 * Path Security — Unit Tests
 * TASK-MVP-FREE-UI-001 §36
 *
 * Tests S-01 (path traversal), S-02 (demo allowlist), S-03 (pattern blocking).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PathSecurityService, PathSecurityError } from '../../mvp-ui/path-security.js';
import { resolve } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

// ═══════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════

const TMP_DIR = resolve('/tmp/ais-mvp-ui-test-' + process.pid);
const DEMO_DIR = resolve(TMP_DIR, 'demo-project');
const ALLOWED_SUBDIR = resolve(TMP_DIR, 'allowed-sub');

beforeEach(() => {
  mkdirSync(DEMO_DIR, { recursive: true });
  mkdirSync(ALLOWED_SUBDIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

function createService(roots: string[], demos: string[]) {
  return new PathSecurityService({
    allowedRoots: roots,
    demoAllowlist: demos,
  });
}

// ═══════════════════════════════════════════════════════════════
// S-01: Path Traversal Protection
// ═══════════════════════════════════════════════════════════════

describe('PathSecurity — S-01 Path Traversal', () => {
  it('allows paths under allowed root', () => {
    const svc = createService([TMP_DIR], []);
    const result = svc.validateProjectPath(ALLOWED_SUBDIR);
    expect(result).toBe(ALLOWED_SUBDIR);
  });

  it('allows the root directory itself', () => {
    const svc = createService([TMP_DIR], []);
    const result = svc.validateProjectPath(TMP_DIR);
    expect(result).toBe(TMP_DIR);
  });

  it('rejects paths outside allowed roots', () => {
    const svc = createService([TMP_DIR], []);
    expect(() => svc.validateProjectPath('/etc'))
      .toThrow(PathSecurityError);
  });

  it('rejects empty path', () => {
    const svc = createService([TMP_DIR], []);
    expect(() => svc.validateProjectPath(''))
      .toThrow(PathSecurityError);
  });

  it('rejects whitespace-only path', () => {
    const svc = createService([TMP_DIR], []);
    expect(() => svc.validateProjectPath('   '))
      .toThrow(PathSecurityError);
  });

  it('rejects non-existent paths', () => {
    const svc = createService([TMP_DIR], []);
    expect(() => svc.validateProjectPath(resolve(TMP_DIR, 'nonexistent')))
      .toThrow(PathSecurityError);
  });

  it('rejects file (non-directory) paths', () => {
    const filePath = resolve(TMP_DIR, 'a-file.txt');
    writeFileSync(filePath, 'test');
    const svc = createService([TMP_DIR], []);
    expect(() => svc.validateProjectPath(filePath))
      .toThrow(PathSecurityError);
  });
});

// ═══════════════════════════════════════════════════════════════
// S-02: Demo Allowlist
// ═══════════════════════════════════════════════════════════════

describe('PathSecurity — S-02 Demo Allowlist', () => {
  it('allows demo path in allowlist', () => {
    const svc = createService([], [DEMO_DIR]);
    const result = svc.validateProjectPath(DEMO_DIR, { isDemo: true });
    expect(result).toBe(DEMO_DIR);
  });

  it('allows subdirectory of demo allowlist', () => {
    const svc = createService([], [DEMO_DIR]);
    const sub = resolve(DEMO_DIR, 'src');
    mkdirSync(sub, { recursive: true });
    const result = svc.validateProjectPath(sub, { isDemo: true });
    expect(result).toBe(sub);
  });

  it('rejects demo path not in allowlist', () => {
    const svc = createService([], [DEMO_DIR]);
    expect(() => svc.validateProjectPath(ALLOWED_SUBDIR, { isDemo: true }))
      .toThrow(PathSecurityError);
  });

  it('demo mode does not check allowedRoots', () => {
    const svc = createService([TMP_DIR], [DEMO_DIR]);
    const result = svc.validateProjectPath(DEMO_DIR, { isDemo: true });
    expect(result).toBe(DEMO_DIR);
  });

  it('non-demo mode does not check demoAllowlist', () => {
    const svc = createService([TMP_DIR], [DEMO_DIR]);
    const result = svc.validateProjectPath(ALLOWED_SUBDIR);
    expect(result).toBe(ALLOWED_SUBDIR);
  });
});

// ═══════════════════════════════════════════════════════════════
// S-03: Traversal Pattern Blocking
// ═══════════════════════════════════════════════════════════════

describe('PathSecurity — S-03 Traversal Patterns', () => {
  it('blocks .. traversal to escape allowed root', () => {
    const svc = createService([TMP_DIR], []);
    expect(() => svc.validateProjectPath(TMP_DIR + '/../etc'))
      .toThrow(PathSecurityError);
  });

  it('blocks URL-encoded traversal', () => {
    const svc = createService([TMP_DIR], []);
    expect(() => svc.validateProjectPath(TMP_DIR + '/%2e%2e/etc'))
      .toThrow(PathSecurityError);
  });
});

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

describe('PathSecurity — Helpers', () => {
  it('isDemoAllowed returns true for allowed paths', () => {
    const svc = createService([], [DEMO_DIR]);
    expect(svc.isDemoAllowed(DEMO_DIR)).toBe(true);
  });

  it('isDemoAllowed returns false for unknown paths', () => {
    const svc = createService([], [DEMO_DIR]);
    expect(svc.isDemoAllowed(ALLOWED_SUBDIR)).toBe(false);
  });

  it('getDemoProjects returns demo names', () => {
    const svc = createService([], [DEMO_DIR]);
    const names = svc.getDemoProjects();
    expect(names).toContain('demo-project');
  });
});
