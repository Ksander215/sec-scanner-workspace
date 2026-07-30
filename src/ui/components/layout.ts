/**
 * Layout Component — Desktop UI
 * Manages screen layout and navigation container.
 */
export class LayoutManager {
  private screens = new Map<string, {render: () => string}>();
  private activeScreen: string | null = null;

  registerScreen(id: string, screen: {render: () => string}): void {
    this.screens.set(id, screen);
  }

  setActiveScreen(id: string): void {
    if (!this.screens.has(id)) throw new Error(`Screen not found: ${id}`);
    this.activeScreen = id;
  }

  getActiveScreen(): string | null { return this.activeScreen; }
  render(): string {
    if (!this.activeScreen) return 'no-active-screen';
    return this.screens.get(this.activeScreen)?.render() ?? 'empty';
  }
  getRegisteredScreens(): readonly string[] { return [...this.screens.keys()]; }
}
