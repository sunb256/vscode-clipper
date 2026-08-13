import { Plugin } from "obsidian";
import {
  CanvasZoomSettingTab,
  DEFAULT_SETTINGS,
  normalizeSensitivity,
  type CanvasZoomSettings,
} from "./settings";
import { ZoomController } from "./zoom-controller";

export default class CanvasZoomSensitivityPlugin extends Plugin {
  settings: CanvasZoomSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new CanvasZoomSettingTab(this.app, this));

    const controller = new ZoomController(
      this.app,
      this,
      () => this.settings.sensitivity,
    );
    controller.start();
  }

  async updateSensitivity(sensitivity: number): Promise<void> {
    this.settings.sensitivity = normalizeSensitivity(sensitivity);
    await this.saveData(this.settings);
  }

  private async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<CanvasZoomSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...saved,
      sensitivity: normalizeSensitivity(saved?.sensitivity),
    };
  }
}
