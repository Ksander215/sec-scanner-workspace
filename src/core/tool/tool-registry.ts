/**
 * Tool Registry — Independent registry for Tool management.
 *
 * CON-001.000 AL-002: Boundary by Contract.
 * Tool does not know about Runtime. Runtime does not know Tool implementation.
 *
 * Operations:
 *   register()    — Register a tool by its metadata.name
 *   unregister()  — Remove a tool
 *   resolve()     — Look up a tool by name
 *   list()        — List all registered tools
 *   discover()    — Find tools by capability or tag
 */
import type { Tool, ToolMetadata, ToolCapability, ToolRegistration } from './types.js';
import { ToolLifecycleState } from './types.js';

export class ToolRegistry {
  private readonly tools = new Map<string, ToolRegistration>();

  /**
   * Register a tool. The tool's metadata.name is used as the key.
   * Throws if a tool with the same name is already registered.
   */
  register(tool: Tool): void {
    const name = tool.metadata.name;
    if (this.tools.has(name)) {
      throw new Error(`Tool '${name}' is already registered`);
    }
    this.tools.set(name, {
      tool,
      registeredAt: new Date().toISOString(),
      state: ToolLifecycleState.Registered,
    });
  }

  /**
   * Unregister a tool by name.
   * Returns true if the tool was found and removed.
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Resolve a tool by name.
   * Returns undefined if not found (does not throw).
   */
  resolve(name: string): Tool | undefined {
    return this.tools.get(name)?.tool;
  }

  /**
   * Resolve a tool by name, throwing if not found.
   */
  resolveOrThrow(name: string): Tool {
    const tool = this.resolve(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found in registry`);
    }
    return tool;
  }

  /**
   * Check if a tool is registered.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * List all registered tool metadata.
   */
  list(): readonly ToolMetadata[] {
    return Array.from(this.tools.values()).map(r => r.tool.metadata);
  }

  /**
   * List all registered tool names.
   */
  listNames(): readonly string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Discover tools by capability.
   * Returns metadata of all tools that declare the given capability.
   */
  discoverByCapability(capability: ToolCapability): readonly ToolMetadata[] {
    return Array.from(this.tools.values())
      .filter(r => r.tool.metadata.capabilities.includes(capability))
      .map(r => r.tool.metadata);
  }

  /**
   * Discover tools by tag.
   * Returns metadata of all tools that have the given tag.
   */
  discoverByTag(tag: string): readonly ToolMetadata[] {
    return Array.from(this.tools.values())
      .filter(r => r.tool.metadata.tags?.includes(tag))
      .map(r => r.tool.metadata);
  }

  /**
   * Get the lifecycle state of a registered tool.
   */
  getState(name: string): ToolLifecycleState | undefined {
    return this.tools.get(name)?.state;
  }

  /**
   * Update the lifecycle state of a registered tool.
   */
  setState(name: string, state: ToolLifecycleState): void {
    const entry = this.tools.get(name);
    if (!entry) {
      throw new Error(`Tool '${name}' not found in registry`);
    }
    entry.state = state;
  }

  /**
   * Get all registrations (for internal use).
   */
  getAll(): readonly ToolRegistration[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get the count of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  /** Clear all registrations. */
  clear(): void {
    this.tools.clear();
  }
}
