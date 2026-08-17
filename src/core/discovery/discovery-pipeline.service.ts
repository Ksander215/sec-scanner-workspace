/**
 * Wave 1 TD-3 — Discovery Pipeline Service
 * TASK-MVP-PROTOTYPE-IMPLEMENTATION-001
 *
 * Implements the Service interface.
 * Heuristic-based file system walking that produces:
 *   1. DiscoveryResult (raw scan data)
 *   2. ArchitectureGraph (via ArchitectureGraphBuilder)
 *
 * Uses only Node.js fs APIs. No external dependencies.
 *
 * Conforms to: ARC-001.001, project-discovery-specification.md
 */

import type { Service } from '../services/service.js';
import { ArchitectureGraphBuilder } from '../autonomous-architecture/services/architecture.graph-builder.js';
import { ArchitectureGraph } from '../autonomous-architecture/architecture.graph.js';
import {
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
} from '../autonomous-architecture/architecture.model.js';
import type {
  ArchitectureNode,
  ArchitectureEdge,
  ArchitectureLayer,
  ArchitectureLayerId,
  ArchitectureNodeId,
  ArchitectureEdgeId,
} from '../autonomous-architecture/architecture.model.js';

function brandLayerId(id: string): ArchitectureLayerId { return id as ArchitectureLayerId; }
function brandNodeId(id: string): ArchitectureNodeId { return id as ArchitectureNodeId; }
function brandEdgeId(id: string): ArchitectureEdgeId { return id as ArchitectureEdgeId; }
function asNodeId(id: string): ArchitectureNodeId { return id as ArchitectureNodeId; }
import type {
  DiscoveryResult,
  DiscoveryConfig,
  DiscoveredFile,
  ModuleBoundary,
  DependencyRelation,
  TechDetection,
} from './discovery-types.js';
import { DefaultDiscoveryConfig } from './discovery-types.js';

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, extname, basename, dirname } from 'node:path';

/**
 * DiscoveryPipelineService — scans a project directory and builds
 * an ArchitectureGraph using heuristic file-system analysis.
 */
export class DiscoveryPipelineService implements Service {
  readonly name = 'discovery-pipeline';
  private _config: DiscoveryConfig;
  private _started = false;

  constructor(config?: Partial<DiscoveryConfig>) {
    this._config = { ...DefaultDiscoveryConfig, ...config };
  }

  async initialize(): Promise<void> {
    // Validate root path exists
    try {
      statSync(this._config.rootPath);
    } catch {
      throw new Error(`DiscoveryPipeline: root path does not exist: ${this._config.rootPath}`);
    }
  }

  async start(): Promise<void> {
    this._started = true;
  }

  async stop(): Promise<void> {
    this._started = false;
  }

  async shutdown(): Promise<void> {
    this._started = false;
  }

  // ─── Public API ─────────────────────────────────────────────

  /**
   * Run the full discovery pipeline on the configured project.
   * Returns both the raw discovery result and the architecture graph.
   */
  async discover(projectId?: string): Promise<{
    discovery: DiscoveryResult;
    architectureGraph: ArchitectureGraph;
  }> {
    if (!this._started) {
      throw new Error('DiscoveryPipeline: not started. Call start() first.');
    }

    const rootPath = this._config.rootPath;
    const pid = projectId ?? basename(rootPath);

    // Phase 1: Scan files
    const files = this.scanFiles(rootPath);

    // Phase 2: Detect modules
    const modules = this.detectModules(files, rootPath);

    // Phase 3: Extract dependencies
    const dependencies = this.extractDependencies(files);

    // Phase 4: Find entry points
    const entryPoints = this.findEntryPoints(files);

    // Phase 5: Detect config files
    const configFiles = this.detectConfigFiles(files);

    // Phase 6: Detect tech stack
    const techStack = this.detectTechStack(files);

    const discovery: DiscoveryResult = Object.freeze({
      projectId: pid,
      rootPath,
      files: Object.freeze(files),
      modules: Object.freeze(modules),
      dependencies: Object.freeze(dependencies),
      entryPoints: Object.freeze(entryPoints),
      configFiles: Object.freeze(configFiles),
      techStack: Object.freeze(techStack),
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      scannedAt: new Date().toISOString(),
      metadata: Object.freeze({}),
    });

    // Phase 7: Build ArchitectureGraph
    const architectureGraph = this.buildArchitectureGraph(discovery);

    return { discovery, architectureGraph };
  }

  // ─── File Scanning ──────────────────────────────────────────

  private scanFiles(rootPath: string): DiscoveredFile[] {
    const files: DiscoveredFile[] = [];
    this.walkDirectory(rootPath, rootPath, files, 0);
    return files;
  }

  private walkDirectory(
    dirPath: string,
    rootPath: string,
    files: DiscoveredFile[],
    depth: number,
  ): void {
    if (depth > this._config.maxDepth || files.length >= this._config.maxFiles) {
      return;
    }

    let entries: string[];
    try {
      entries = readdirSync(dirPath);
    } catch {
      return; // Permission denied or other fs error
    }

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const relPath = relative(rootPath, fullPath);

      // Check exclusions
      if (this.isExcluded(relPath)) {
        continue;
      }

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          this.walkDirectory(fullPath, rootPath, files, depth + 1);
        } else if (stat.isFile() && files.length < this._config.maxFiles) {
          files.push({
            path: fullPath,
            relativePath: relPath,
            extension: extname(entry),
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
          });
        }
      } catch {
        // Skip files that can't be stat'd
      }
    }
  }

  private isExcluded(relativePath: string): boolean {
    const parts = relativePath.split(/[/\\]/);
    return this._config.excludePatterns.some(pattern =>
      parts.some(part => part === pattern)
    );
  }

  // ─── Module Detection ────────────────────────────────────────

  private detectModules(files: DiscoveredFile[], _rootPath: string): ModuleBoundary[] {
    const moduleMap = new Map<string, { files: DiscoveredFile[]; entryPoints: string[]; exports: Set<string> }>();

    for (const file of files) {
      if (!file.extension.match(/^\.(ts|js|tsx|jsx|mjs|cjs)$/)) continue;

      // Each parent directory that has TypeScript/JavaScript files is a potential module
      const dir = dirname(file.relativePath);
      const moduleName = dir.replace(/[/\\]/g, '.');

      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, { files: [], entryPoints: [], exports: new Set() });
      }
      const mod = moduleMap.get(moduleName)!;
      mod.files.push(file);

      // Detect entry points: index files or files with the same name as directory
      const fileName = basename(file.relativePath, file.extension);
      if (fileName === 'index' || fileName === basename(dir)) {
        mod.entryPoints.push(file.relativePath);
      }
    }

    return Array.from(moduleMap.entries()).map(([name, data]) =>
      Object.freeze({
        path: name.replace(/\./g, '/'),
        name,
        fileCount: data.files.length,
        entryPoints: Object.freeze(data.entryPoints),
        exports: Object.freeze([]), // Wave 1: no export parsing
      })
    );
  }

  // ─── Dependency Extraction ──────────────────────────────────

  private extractDependencies(files: DiscoveredFile[]): readonly DependencyRelation[] {
    const deps: DependencyRelation[] = [];
    const sourceExtensions = new Set(['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs']);

    for (const file of files) {
      if (!sourceExtensions.has(file.extension)) continue;

      let content: string;
      try {
        content = readFileSync(file.path, 'utf-8');
      } catch {
        continue;
      }

      // Heuristic: extract import/require targets
      // Static imports: import ... from '...' or import '...'
      const staticImportRegex = /import\s+(?:(?:[\w*{},\s]+\s+from\s+)|)['"]([^'"]+)['"]/g;
      // Dynamic imports: import('...')
      const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
      // CommonJS: require('...')
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

      this.extractMatches(content, staticImportRegex, file.relativePath, deps, 'import');
      this.extractMatches(content, dynamicImportRegex, file.relativePath, deps, 'dynamic-import');
      this.extractMatches(content, requireRegex, file.relativePath, deps, 'require');
    }

    return Object.freeze(deps);
  }

  private extractMatches(
    content: string,
    regex: RegExp,
    source: string,
    deps: DependencyRelation[],
    type: DependencyRelation['type'],
  ): void {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const target = match[1];
      // Only capture relative (internal) dependencies, not node_modules
      if (target.startsWith('.') && deps.length < 5000) {
        deps.push(
          Object.freeze({
            from: source,
            to: target,
            type,
            source,
          }),
        );
      }
    }
  }

  // ─── Entry Point Detection ──────────────────────────────────

  private findEntryPoints(files: DiscoveredFile[]): readonly string[] {
    const entryPoints: string[] = [];

    for (const file of files) {
      const name = basename(file.relativePath, file.extension);
      const dir = dirname(file.relativePath);

      // Common entry point patterns
      if (
        (name === 'index' && dir === '.') ||
        name === 'main' ||
        name === 'app' ||
        name === 'server' ||
        (name === 'index' && (dir === 'src' || dir === 'src/core'))
      ) {
        entryPoints.push(file.relativePath);
      }
    }

    return Object.freeze(entryPoints);
  }

  // ─── Config Detection ────────────────────────────────────────

  private detectConfigFiles(files: readonly DiscoveredFile[]): readonly string[] {
    const configPatterns: readonly string[] = [
      'package.json', 'tsconfig.json', '.eslintrc', '.eslintrc.js', '.eslintrc.json',
      '.prettierrc', 'vitest.config.ts', 'jest.config.ts', '.babelrc',
      'webpack.config.js', 'vite.config.ts', 'rollup.config.js',
      '.env', '.env.example', 'Dockerfile', 'docker-compose.yml',
      '.gitignore', '.npmrc', 'nodemon.json',
    ];

    const result: string[] = files
        .filter(f => configPatterns.includes(basename(f.relativePath)))
        .map(f => f.relativePath);
    return Object.freeze(result);
  }

  // ─── Tech Stack Detection ────────────────────────────────────

  private detectTechStack(files: DiscoveredFile[]): readonly TechDetection[] {
    const tech: TechDetection[] = [];
    const seen = new Set<string>();

    const addTech = (t: TechDetection) => {
      if (!seen.has(t.name)) {
        seen.add(t.name);
        tech.push(Object.freeze(t));
      }
    };

    for (const file of files) {
      const name = basename(file.relativePath);

      if (name === 'package.json') {
        try {
          const pkg = JSON.parse(readFileSync(file.path, 'utf-8'));
          if (pkg.dependencies?.typescript) addTech({ name: 'TypeScript', category: 'language', version: null, evidence: 'package.json dependencies' });
          if (pkg.devDependencies?.typescript) addTech({ name: 'TypeScript', category: 'language', version: null, evidence: 'package.json devDependencies' });
          if (pkg.dependencies?.react) addTech({ name: 'React', category: 'framework', version: pkg.dependencies.react, evidence: 'package.json' });
          if (pkg.dependencies?.next) addTech({ name: 'Next.js', category: 'framework', version: pkg.dependencies.next, evidence: 'package.json' });
          if (pkg.dependencies?.express) addTech({ name: 'Express', category: 'framework', version: pkg.dependencies.express, evidence: 'package.json' });
          if (pkg.devDependencies?.vitest) addTech({ name: 'Vitest', category: 'test-framework', version: pkg.devDependencies.vitest, evidence: 'package.json' });
          if (pkg.devDependencies?.jest) addTech({ name: 'Jest', category: 'test-framework', version: pkg.devDependencies.jest, evidence: 'package.json' });
        } catch {
          // Skip malformed package.json
        }
      }

      if (name === 'tsconfig.json') {
        addTech({ name: 'TypeScript', category: 'language', version: null, evidence: 'tsconfig.json present' });
      }

      if (file.extension === '.ts' || file.extension === '.tsx') {
        addTech({ name: 'TypeScript', category: 'language', version: null, evidence: `${file.relativePath}` });
      }

      if (name === 'vitest.config.ts') {
        addTech({ name: 'Vitest', category: 'test-framework', version: null, evidence: name });
      }
    }

    return Object.freeze(tech);
  }

  // ─── Architecture Graph Building ─────────────────────────────

  /**
   * Build an ArchitectureGraph from the discovery result.
   * Maps modules to ArchitectureNodes, dependencies to ArchitectureEdges.
   */
  private buildArchitectureGraph(discovery: DiscoveryResult): ArchitectureGraph {
    const builder = new ArchitectureGraphBuilder();

    // Create layers
    const coreLayer: ArchitectureLayer = Object.freeze({
      id: brandLayerId(crypto.randomUUID()),
      kind: ArchitectureLayerKind.Core,
      name: 'Core',
    });
    const infraLayer: ArchitectureLayer = Object.freeze({
      id: brandLayerId(crypto.randomUUID()),
      kind: ArchitectureLayerKind.Infrastructure,
      name: 'Infrastructure',
    });
    const externalLayer: ArchitectureLayer = Object.freeze({
      id: brandLayerId(crypto.randomUUID()),
      kind: ArchitectureLayerKind.External,
      name: 'External',
    });

    builder.addLayer(coreLayer);
    builder.addLayer(infraLayer);
    builder.addLayer(externalLayer);

    // Map modules to nodes
    const nodeMap = new Map<string, string>(); // moduleName -> nodeId

    for (const mod of discovery.modules) {
      const isInfra = /config|build|dist|script|util|helper/i.test(mod.name);
      const layerId = isInfra ? infraLayer.id : coreLayer.id;

      const node: ArchitectureNode = Object.freeze({
        id: brandNodeId(crypto.randomUUID()),
        kind: ArchitectureNodeKind.Module,
        name: mod.name,
        layer: layerId,
      });

      nodeMap.set(mod.name, node.id);
      builder.addNode(node);
    }

    // Map dependencies to edges
    for (const dep of discovery.dependencies) {
      const fromModule = this.resolveModuleName(dep.from);
      const toModule = this.resolveModuleName(dep.to, dep.from);

      const fromId = nodeMap.get(fromModule) as string | undefined;
      const toId = nodeMap.get(toModule) as string | undefined;

      if (fromId && toId && fromId !== toId) {
        const edge: ArchitectureEdge = Object.freeze({
          id: brandEdgeId(crypto.randomUUID()),
          kind: ArchitectureEdgeKind.DependsOn,
          from: asNodeId(fromId),
          to: asNodeId(toId),
        });
        builder.addEdge(edge);
      }
    }

    return builder.build();
  }

  /**
   * Resolve a file path to its module name.
   */
  private resolveModuleName(filePath: string, _fromPath?: string): string {
    const dir = dirname(filePath).replace(/[/\\]/g, '.');
    return dir || filePath;
  }
}
