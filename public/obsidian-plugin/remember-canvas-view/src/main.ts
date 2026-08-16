import { Plugin, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { RememberCanvasSettingTab } from "./settings";
import {
  type ActiveCanvas,
  type CanvasViewState,
  getCanvasView,
  isValidCanvas,
  type PluginData,
} from "./types";

const DEFAULT_DATA: PluginData = {
  version: 1,
  settings: { enabled: true },
  views: {},
};
const POLL_MS = 300;
const SAVE_DELAY_MS = 500;
const MAX_RESTORE_ATTEMPTS = 20;

export default class RememberCanvasViewPlugin extends Plugin {
  data: PluginData = structuredClone(DEFAULT_DATA);
  private activeCanvas: ActiveCanvas | null = null;
  private lastViewport: CanvasViewState | null = null;
  private pollId: number | null = null;
  private saveId: number | null = null;
  private activationId = 0;

  async onload(): Promise<void> {
    await this.loadPluginData();
    this.addSettingTab(new RememberCanvasSettingTab(this.app, this));
    this.registerEvents();
    this.registerCommands();
    this.register(() => this.stopPolling());
    this.register(() => this.cancelSave());
    this.handleWorkspaceChange();
  }

  onunload(): void {
    this.captureActiveState();
    void this.flushSave();
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.captureActiveState();
    this.data.settings.enabled = enabled;
    this.activationId += 1;
    this.stopPolling();
    this.activeCanvas = null;
    this.lastViewport = null;
    await this.saveData(this.data);
    if (enabled) this.handleWorkspaceChange();
  }

  async clearViews(): Promise<void> {
    this.data.views = {};
    await this.saveData(this.data);
  }

  private registerEvents(): void {
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      this.handleWorkspaceChange();
    }));
    this.registerEvent(this.app.workspace.on("file-open", () => {
      this.handleWorkspaceChange();
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      this.handleRename(file, oldPath);
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => this.handleDelete(file)));
    this.registerDomEvent(window, "blur", () => void this.flushSave());
  }

  private registerCommands(): void {
    this.addCommand({
      id: "forget-current",
      name: "Forget current Canvas view",
      checkCallback: (checking) => {
        const path = this.getCanvasPath();
        if (!path || !this.data.views[path]) return false;
        if (!checking) void this.forgetView(path);
        return true;
      },
    });
  }

  private handleWorkspaceChange(): void {
    this.captureActiveState();
    this.stopPolling();
    this.activeCanvas = null;
    this.lastViewport = null;
    const activationId = ++this.activationId;
    if (!this.data.settings.enabled) return;

    const leaf = this.app.workspace.activeLeaf;
    if (!leaf) return;
    this.scheduleActivation(leaf, activationId);
  }

  private scheduleActivation(
    leaf: WorkspaceLeaf,
    activationId: number,
    attempt = 0,
  ): void {
    if (attempt > MAX_RESTORE_ATTEMPTS) return;
    requestAnimationFrame(() => {
      if (activationId !== this.activationId) return;
      if (!this.activateCanvas(leaf)) {
        this.scheduleActivation(leaf, activationId, attempt + 1);
      }
    });
  }

  private activateCanvas(leaf: WorkspaceLeaf): boolean {
    const view = getCanvasView(leaf);
    if (!view?.file || !isValidCanvas(view.canvas)) return false;
    if (this.app.workspace.activeLeaf !== leaf) return true;

    const path = view.file.path;
    const state = this.data.views[path];
    try {
      if (state) view.canvas.setViewport(state.tx, state.ty, state.tZoom);
      this.activeCanvas = { path, view, canvas: view.canvas };
      this.lastViewport = this.readState(view.canvas);
      this.startPolling();
    } catch (error) {
      console.error("[Remember Canvas View] Failed to restore viewport", error);
    }
    return true;
  }

  private startPolling(): void {
    if (this.pollId !== null || !this.activeCanvas) return;
    this.pollId = window.setInterval(() => this.captureActiveState(), POLL_MS);
  }

  private stopPolling(): void {
    if (this.pollId === null) return;
    window.clearInterval(this.pollId);
    this.pollId = null;
  }

  private captureActiveState(): void {
    const active = this.activeCanvas;
    if (!active || !this.data.settings.enabled) return;
    if (!isValidCanvas(active.canvas)) return;

    const next = this.readState(active.canvas);
    if (this.sameViewport(this.lastViewport ?? undefined, next)) return;
    this.lastViewport = next;
    this.data.views[active.path] = next;
    this.scheduleSave();
  }

  private readState(canvas: ActiveCanvas["canvas"]): CanvasViewState {
    return {
      tx: canvas.tx,
      ty: canvas.ty,
      tZoom: canvas.tZoom,
      updatedAt: Date.now(),
    };
  }

  private sameViewport(
    previous: CanvasViewState | undefined,
    next: CanvasViewState,
  ): boolean {
    return previous?.tx === next.tx
      && previous.ty === next.ty
      && previous.tZoom === next.tZoom;
  }

  private scheduleSave(): void {
    this.cancelSave();
    this.saveId = window.setTimeout(() => void this.flushSave(), SAVE_DELAY_MS);
  }

  private cancelSave(): void {
    if (this.saveId === null) return;
    window.clearTimeout(this.saveId);
    this.saveId = null;
  }

  private async flushSave(): Promise<void> {
    this.cancelSave();
    try {
      await this.saveData(this.data);
    } catch (error) {
      console.error("[Remember Canvas View] Failed to save viewport", error);
    }
  }

  private handleRename(file: TAbstractFile, oldPath: string): void {
    const state = this.data.views[oldPath];
    if (!(file instanceof TFile) || file.extension !== "canvas" || !state) return;
    this.data.views[file.path] = state;
    delete this.data.views[oldPath];
    if (this.activeCanvas?.path === oldPath) this.activeCanvas.path = file.path;
    this.scheduleSave();
  }

  private handleDelete(file: TAbstractFile): void {
    if (!(file instanceof TFile) || file.extension !== "canvas") return;
    if (!this.data.views[file.path]) return;
    delete this.data.views[file.path];
    this.scheduleSave();
  }

  private getCanvasPath(): string | null {
    const file = this.app.workspace.getActiveFile();
    return file?.extension === "canvas" ? file.path : null;
  }

  private async forgetView(path: string): Promise<void> {
    delete this.data.views[path];
    await this.saveData(this.data);
  }

  private async loadPluginData(): Promise<void> {
    const saved = (await this.loadData()) as Partial<PluginData> | null;
    this.data = {
      version: 1,
      settings: { enabled: saved?.settings?.enabled ?? true },
      views: saved?.views ?? {},
    };
  }
}
