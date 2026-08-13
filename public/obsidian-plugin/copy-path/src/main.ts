import { FileSystemAdapter, Notice, Plugin } from "obsidian";

const CANVAS_EXTENSION = "canvas";

export default class CopyPathPlugin extends Plugin {
  onload(): void {
    this.registerObsidianProtocolHandler("copy-path", () => {
      this.copyCanvasPath(false);
    });
    this.addCommand({
      id: "copy-active-canvas-path",
      name: "Copy active Canvas path",
      hotkeys: [{ modifiers: ["Ctrl", "Alt", "Shift"], key: "C" }],
      checkCallback: (checking) => this.copyCanvasPath(checking),
    });
  }

  private copyCanvasPath(checking: boolean): boolean {
    const file = this.app.workspace.getActiveFile();
    const adapter = this.app.vault.adapter;
    const available = file?.extension === CANVAS_EXTENSION
      && adapter instanceof FileSystemAdapter;
    if (!available || !file) {
      if (!checking) {
        new Notice("Open a Canvas before copying its path.");
      }
      return false;
    }
    if (checking) {
      return true;
    }

    const fullPath = adapter.getFullPath(file.path);
    void navigator.clipboard.writeText(fullPath).then(
      () => new Notice("Canvas path copied."),
      () => new Notice("Could not copy the Canvas path."),
    );
    return true;
  }
}
