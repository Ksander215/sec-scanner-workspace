/**
 * Dependency Resolver — DAG-based topological sort with cycle detection
 * TASK-AIS-005A.000 — Platform Integration Foundation
 *
 * Accepts a set of runtime IDs and their dependency lists.
 * Produces a valid initialization order or reports cycles.
 */
import type { DependencyGraph, DependencyEdge, RuntimeDescriptor } from '../types.js';
import { DependencyCycleError } from '../types.js';

export class DependencyResolver {
  /**
   * Resolve the correct initialization order for a set of runtimes.
   * Throws DependencyCycleError if a cycle is detected.
   */
  resolve(runtimes: readonly RuntimeDescriptor[]): DependencyGraph {
    const nodeIds = runtimes.map((r) => r.id);
    const runtimeMap = new Map(runtimes.map((r) => [r.id, r]));
    const edges: DependencyEdge[] = [];

    for (const rt of runtimes) {
      for (const dep of rt.dependencies) {
        if (runtimeMap.has(dep)) {
          edges.push({ from: rt.id, to: dep });
        }
      }
    }

    // Detect cycles using DFS
    const cyclePath = this.detectCycle(nodeIds, edges);
    if (cyclePath) {
      throw new DependencyCycleError(
        `Dependency cycle detected: ${cyclePath.join(' → ')}`,
        cyclePath,
      );
    }

    // Topological sort (Kahn's algorithm)
    const resolvedOrder = this.topologicalSort(nodeIds, edges);

    return Object.freeze({
      nodes: Object.freeze(nodeIds),
      edges: Object.freeze(edges),
      resolvedOrder: Object.freeze(resolvedOrder),
      hasCycle: false,
      cyclePath: null,
    });
  }

  /**
   * Check for cycles without throwing. Returns the cycle path or null.
   */
  checkForCycles(
    nodes: readonly string[],
    edges: readonly DependencyEdge[],
  ): readonly string[] | null {
    return this.detectCycle(nodes, edges);
  }

  private detectCycle(
    nodes: readonly string[],
    edges: readonly DependencyEdge[],
  ): string[] | null {
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n, new Set());
    for (const e of edges) adj.get(e.from)?.add(e.to);

    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const n of nodes) color.set(n, WHITE);
    const parent = new Map<string, string | null>();
    for (const n of nodes) parent.set(n, null);

    for (const start of nodes) {
      if (color.get(start) !== WHITE) continue;
      const stack: string[] = [start];
      while (stack.length > 0) {
        const node = stack[stack.length - 1];
        if (color.get(node) === WHITE) {
          color.set(node, GRAY);
          const neighbors = adj.get(node) ?? new Set();
          let pushed = false;
          for (const nb of neighbors) {
            if (color.get(nb) === GRAY) {
              // Found cycle — reconstruct path
              const path: string[] = [nb, node];
              let cur: string | null = node;
              while (cur && cur !== nb) {
                cur = parent.get(cur) ?? null;
                if (cur) path.push(cur);
              }
              path.reverse();
              return path;
            }
            if (color.get(nb) === WHITE) {
              parent.set(nb, node);
              stack.push(nb);
              pushed = true;
              break;
            }
          }
          if (!pushed) {
            color.set(node, BLACK);
            stack.pop();
          }
        } else if (color.get(node) === GRAY) {
          color.set(node, BLACK);
          stack.pop();
        } else {
          stack.pop();
        }
      }
    }
    return null;
  }

  private topologicalSort(nodes: readonly string[], edges: readonly DependencyEdge[]): string[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) {
      inDegree.set(n, 0);
      adj.set(n, new Set());
    }
    for (const e of edges) {
      adj.get(e.to)?.add(e.from);
      inDegree.set(e.from, (inDegree.get(e.from) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const n of nodes) {
      if (inDegree.get(n) === 0) queue.push(n);
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      for (const neighbor of adj.get(node) ?? []) {
        const deg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) queue.push(neighbor);
      }
    }

    return result;
  }
}
