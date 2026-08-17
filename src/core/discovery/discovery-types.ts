/**
 * Wave 1 TD-3 — Discovery Pipeline Types
 * TASK-MVP-PROTOTYPE-IMPLEMENTATION-001
 *
 * Types for the heuristic-based file system discovery pipeline.
 * Outputs: file tree, module boundaries, dependency graph,
 * entry points, config files, tech detection.
 *
 * Conforms to: project-discovery-specification.md
 */

import type { Timestamp } from '../types/common.js';

// ═══════════════════════════════════════════════════════════════════
// DISCOVERY OUTPUT TYPES
// ═══════════════════════════════════════════════════════════════════

/**
 * A single file discovered during project scanning.
 */
export interface DiscoveredFile {
  readonly path: string;
  readonly relativePath: string;
  readonly extension: string;
  readonly size: number;
  readonly lastModified: Timestamp;
}

/**
 * A detected module boundary (directory containing related files).
 */
export interface ModuleBoundary {
  readonly path: string;
  readonly name: string;
  readonly fileCount: number;
  readonly entryPoints: readonly string[];
  readonly exports: readonly string[];
}

/**
 * A dependency relationship between two modules.
 */
export interface DependencyRelation {
  readonly from: string;
  readonly to: string;
  readonly type: 'import' | 'require' | 'dynamic-import' | 're-export';
  readonly source: string;
}

/**
 * A detected technology/framework from config files.
 */
export interface TechDetection {
  readonly name: string;
  readonly category: 'language' | 'framework' | 'runtime' | 'build-tool' | 'package-manager' | 'test-framework' | 'linter' | 'other';
  readonly version: string | null;
  readonly evidence: string;
}

/**
 * Complete discovery output — the result of scanning a project.
 */
export interface DiscoveryResult {
  readonly projectId: string;
  readonly rootPath: string;
  readonly files: readonly DiscoveredFile[];
  readonly modules: readonly ModuleBoundary[];
  readonly dependencies: readonly DependencyRelation[];
  readonly entryPoints: readonly string[];
  readonly configFiles: readonly string[];
  readonly techStack: readonly TechDetection[];
  readonly totalFiles: number;
  readonly totalSize: number;
  readonly scannedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Configuration for the discovery pipeline.
 */
export interface DiscoveryConfig {
  readonly rootPath: string;
  readonly excludePatterns: readonly string[];
  readonly maxDepth: number;
  readonly maxFiles: number;
}

/**
 * Default discovery configuration.
 */
export const DefaultDiscoveryConfig: DiscoveryConfig = {
  rootPath: '.',
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '.cache',
    'frames',
    '__tests__',
  ],
  maxDepth: 10,
  maxFiles: 10000,
};
