import type { TFile, WorkspaceLeaf } from "obsidian";

export interface CanvasViewState {
  tx: number;
  ty: number;
  tZoom: number;
  updatedAt: number;
}

export interface PluginData {
  version: 1;
  settings: { enabled: boolean };
  views: Record<string, CanvasViewState>;
}

export interface InternalCanvas {
  tx: number;
  ty: number;
  tZoom: number;
  setViewport(tx: number, ty: number, tZoom: number): void;
}

export interface InternalCanvasView {
  file?: TFile;
  canvas?: unknown;
}

export interface ActiveCanvas {
  path: string;
  view: InternalCanvasView;
  canvas: InternalCanvas;
}

export function getCanvasView(leaf: WorkspaceLeaf): InternalCanvasView | null {
  const view = leaf.view as unknown as InternalCanvasView;
  return view.file?.extension === "canvas" ? view : null;
}

export function isValidCanvas(canvas: unknown): canvas is InternalCanvas {
  if (typeof canvas !== "object" || canvas === null) return false;

  const value = canvas as Partial<InternalCanvas>;
  return Number.isFinite(value.tx)
    && Number.isFinite(value.ty)
    && Number.isFinite(value.tZoom)
    && typeof value.setViewport === "function";
}
