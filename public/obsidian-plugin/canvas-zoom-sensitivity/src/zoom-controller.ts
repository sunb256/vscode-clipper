import type { App, Plugin, WorkspaceLeaf } from "obsidian";

const CANVAS_VIEW_TYPE = "canvas";
const DEFAULT_SENSITIVITY = 1;

export class ZoomController {
  private readonly canvasRoots = new Set<HTMLElement>();
  private readonly syntheticEvents = new WeakSet<WheelEvent>();
  private readonly observedWindows = new Set<Window>();

  constructor(
    private readonly app: App,
    private readonly plugin: Plugin,
    private readonly getSensitivity: () => number,
  ) {}

  start(): void {
    this.refreshCanvasRoots();
    this.plugin.registerEvent(
      this.app.workspace.on("layout-change", () => this.refreshCanvasRoots()),
    );
    this.plugin.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.refreshCanvasRoots()),
    );
  }

  private refreshCanvasRoots(): void {
    this.canvasRoots.clear();
    for (const leaf of this.app.workspace.getLeavesOfType(CANVAS_VIEW_TYPE)) {
      this.addCanvasLeaf(leaf);
    }
  }

  private addCanvasLeaf(leaf: WorkspaceLeaf): void {
    if (leaf.view.getViewType() !== CANVAS_VIEW_TYPE) {
      return;
    }

    const root = leaf.view.containerEl;
    this.canvasRoots.add(root);
    this.observeWindow(root.ownerDocument.defaultView);
  }

  private observeWindow(targetWindow: Window | null): void {
    if (!targetWindow || this.observedWindows.has(targetWindow)) {
      return;
    }

    this.observedWindows.add(targetWindow);
    this.plugin.registerDomEvent(
      targetWindow,
      "wheel",
      (event) => this.handleWheel(event),
      { capture: true, passive: false },
    );
  }

  private handleWheel(event: WheelEvent): void {
    if (this.syntheticEvents.has(event) || !this.shouldAdjust(event)) {
      return;
    }

    const sensitivity = this.getSensitivity();
    if (sensitivity === DEFAULT_SENSITIVITY || event.defaultPrevented) {
      return;
    }

    const target = event.target;
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    target.dispatchEvent(this.createWheelEvent(event, sensitivity));
  }

  private shouldAdjust(event: WheelEvent): boolean {
    if (!this.isCanvasEvent(event)) {
      return false;
    }

    // Leave Canvas modifier gestures to Obsidian. Ctrl is retained because
    // browsers use it for trackpad pinch-to-zoom wheel events.
    return !event.shiftKey && !event.altKey && !event.metaKey;
  }

  private isCanvasEvent(event: WheelEvent): boolean {
    for (const root of this.canvasRoots) {
      if (event.composedPath().includes(root)) {
        return true;
      }
    }

    return false;
  }

  private createWheelEvent(event: WheelEvent, sensitivity: number): WheelEvent {
    const eventWindow = event.currentTarget as Window & typeof globalThis;
    const adjusted = new eventWindow.WheelEvent(event.type, {
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      composed: event.composed,
      view: event.view,
      detail: event.detail,
      screenX: event.screenX,
      screenY: event.screenY,
      clientX: event.clientX,
      clientY: event.clientY,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      button: event.button,
      buttons: event.buttons,
      relatedTarget: event.relatedTarget,
      deltaX: event.deltaX,
      deltaY: event.deltaY * sensitivity,
      deltaZ: event.deltaZ,
      deltaMode: event.deltaMode,
    });
    this.syntheticEvents.add(adjusted);
    return adjusted;
  }
}
