/**
 * GitHub Resolver — Tests
 * TASK-MVP-FREE-REPOSITORY-UX-001
 *
 * Tests URL parsing, validation, error codes, and limit enforcement.
 * Actual git clone is NOT tested (requires network) — only validation logic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitHubResolver, GitHubResolverError } from '../../mvp-ui/github-resolver.js';
import { resolve } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TMP_ROOT = resolve(tmpdir(), 'ais-github-resolver-test-' + process.pid);

describe('GitHubResolver — URL Parsing (GHR-01)', () => {
  let resolver: GitHubResolver;

  beforeEach(() => {
    mkdirSync(TMP_ROOT, { recursive: true });
    resolver = new GitHubResolver({ cloneRoot: TMP_ROOT });
  });

  afterEach(() => {
    rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  it('parses valid GitHub URL', () => {
    const result = resolver.parseUrl('https://github.com/facebook/react');
    expect(result.owner).toBe('facebook');
    expect(result.name).toBe('react');
  });

  it('parses URL with trailing slash', () => {
    const result = resolver.parseUrl('https://github.com/vercel/next.js/');
    expect(result.owner).toBe('vercel');
    expect(result.name).toBe('next.js');
  });

  it('parses URL with .git suffix', () => {
    const result = resolver.parseUrl('https://github.com/denoland/deno.git');
    expect(result.owner).toBe('denoland');
    expect(result.name).toBe('deno');
  });

  it('parses URL with dots in owner name', () => {
    const result = resolver.parseUrl('https://github.com/org.example/repo-name');
    expect(result.owner).toBe('org.example');
    expect(result.name).toBe('repo-name');
  });

  it('rejects empty URL', () => {
    expect(() => resolver.parseUrl('')).toThrow(GitHubResolverError);
    expect(() => resolver.parseUrl('')).toThrow('required');
  });

  it('rejects non-string URL', () => {
    expect(() => (resolver as any).parseUrl(123)).toThrow(GitHubResolverError);
  });

  it('rejects non-GitHub URL', () => {
    expect(() => resolver.parseUrl('https://gitlab.com/owner/repo'))
      .toThrow(GitHubResolverError);
    expect(() => resolver.parseUrl('https://gitlab.com/owner/repo'))
      .toThrow('Invalid GitHub URL');
  });

  it('rejects URL with subpath', () => {
    expect(() => resolver.parseUrl('https://github.com/owner/repo/tree/main'))
      .toThrow(GitHubResolverError);
  });

  it('rejects URL with extra query params', () => {
    expect(() => resolver.parseUrl('https://github.com/owner/repo?tab=repositories'))
      .toThrow(GitHubResolverError);
  });

  it('rejects http (non-https) URL', () => {
    expect(() => resolver.parseUrl('http://github.com/owner/repo'))
      .toThrow(GitHubResolverError);
  });

  it('rejects SSH URL', () => {
    expect(() => resolver.parseUrl('git@github.com:owner/repo.git'))
      .toThrow(GitHubResolverError);
  });

  it('accepts URL with surrounding whitespace (trims)', () => {
    const result = resolver.parseUrl('  https://github.com/owner/repo  ');
    expect(result.owner).toBe('owner');
    expect(result.name).toBe('repo');
  });

  it('error code is INVALID_URL for malformed URLs', () => {
    try {
      resolver.parseUrl('not-a-url');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubResolverError);
      expect((err as GitHubResolverError).code).toBe('INVALID_URL');
    }
  });
});

describe('GitHubResolver — Clone Root', () => {
  it('returns resolved clone root path', () => {
    const resolver = new GitHubResolver({ cloneRoot: '/tmp/test-clones' });
    expect(resolver.getCloneRoot()).toBe(resolve('/tmp/test-clones'));
  });

  it('uses default /tmp/ais-repos when not configured', () => {
    const resolver = new GitHubResolver();
    expect(resolver.getCloneRoot()).toContain('ais-repos');
  });
});

describe('GitHubResolver — Cleanup (GHR-08)', () => {
  let resolver: GitHubResolver;

  beforeEach(() => {
    mkdirSync(TMP_ROOT, { recursive: true });
    resolver = new GitHubResolver({ cloneRoot: TMP_ROOT });
  });

  afterEach(() => {
    rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  it('cleanupClone removes tracked directory', () => {
    // Manually track a fake clone
    const fakeDir = resolve(TMP_ROOT, 'fake-clone');
    mkdirSync(fakeDir, { recursive: true });
    writeFileSync(resolve(fakeDir, 'test.txt'), 'hello');

    // Access private map
    (resolver as any).activeClones.set('fake-id', fakeDir);
    expect(resolver.activeCloneCount).toBe(1);

    resolver.cleanupClone('fake-id');
    expect(resolver.activeCloneCount).toBe(0);
  });

  it('cleanupAll removes all tracked directories', () => {
    const dir1 = resolve(TMP_ROOT, 'clone-1');
    const dir2 = resolve(TMP_ROOT, 'clone-2');
    mkdirSync(dir1, { recursive: true });
    mkdirSync(dir2, { recursive: true });

    (resolver as any).activeClones.set('id1', dir1);
    (resolver as any).activeClones.set('id2', dir2);
    expect(resolver.activeCloneCount).toBe(2);

    resolver.cleanupAll();
    expect(resolver.activeCloneCount).toBe(0);
  });

  it('cleanupClone is no-op for unknown ID', () => {
    expect(() => resolver.cleanupClone('nonexistent')).not.toThrow();
    expect(resolver.activeCloneCount).toBe(0);
  });
});

describe('GitHubResolver — Repo Limits (GHR-06)', () => {
  let resolver: GitHubResolver;

  beforeEach(() => {
    mkdirSync(TMP_ROOT, { recursive: true });
    resolver = new GitHubResolver({
      cloneRoot: TMP_ROOT,
      maxFileCount: 5,
      maxRepoSizeBytes: 1024,
      maxFileSizeBytes: 512,
    });
  });

  afterEach(() => {
    rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  it('passes validation for small repo', () => {
    const testDir = mkdtempSync(TMP_ROOT + '/test-');
    writeFileSync(resolve(testDir, 'index.ts'), 'export {}');

    // Call private method
    expect(() => (resolver as any).validateRepoLimits(testDir)).not.toThrow();
  });

  it('rejects repo with too many files', () => {
    const testDir = mkdtempSync(TMP_ROOT + '/test-');
    for (let i = 0; i < 10; i++) {
      writeFileSync(resolve(testDir, `file${i}.txt`), `${i}`);
    }

    expect(() => (resolver as any).validateRepoLimits(testDir))
      .toThrow(GitHubResolverError);
    try {
      (resolver as any).validateRepoLimits(testDir);
    } catch (err) {
      expect((err as GitHubResolverError).code).toBe('REPO_TOO_LARGE');
    }
  });

  it('rejects repo with too large total size', () => {
    const testDir = mkdtempSync(TMP_ROOT + '/test-');
    // Write 2 files, 600 bytes each = 1200 > 1024 limit
    writeFileSync(resolve(testDir, 'big1.txt'), 'x'.repeat(600));
    writeFileSync(resolve(testDir, 'big2.txt'), 'x'.repeat(600));

    expect(() => (resolver as any).validateRepoLimits(testDir))
      .toThrow(GitHubResolverError);
  });

  it('skips generated directories in file count', () => {
    const testDir = mkdtempSync(TMP_ROOT + '/test-');
    writeFileSync(resolve(testDir, 'index.ts'), 'export {}');
    // node_modules should be skipped
    const nm = resolve(testDir, 'node_modules');
    mkdirSync(nm, { recursive: true });
    for (let i = 0; i < 20; i++) {
      writeFileSync(resolve(nm, `pkg${i}.js`), `// ${i}`);
    }

    // Should pass: only 1 file counted (node_modules skipped)
    expect(() => (resolver as any).validateRepoLimits(testDir)).not.toThrow();
  });

  it('skips .git directory in file count', () => {
    const testDir = mkdtempSync(TMP_ROOT + '/test-');
    writeFileSync(resolve(testDir, 'index.ts'), 'export {}');
    const gitDir = resolve(testDir, '.git');
    mkdirSync(gitDir, { recursive: true });
    for (let i = 0; i < 20; i++) {
      writeFileSync(resolve(gitDir, `obj${i}`), `data${i}`);
    }

    expect(() => (resolver as any).validateRepoLimits(testDir)).not.toThrow();
  });
});
