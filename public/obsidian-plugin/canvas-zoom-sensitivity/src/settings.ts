import { App, PluginSettingTab, Setting } from "obsidian";
import type CanvasZoomSensitivityPlugin from "./main";

export interface CanvasZoomSettings {
  sensitivity: number;
}

export const DEFAULT_SETTINGS: CanvasZoomSettings = {
  sensitivity: 0.25,
};

export function normalizeSensitivity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_SETTINGS.sensitivity;
  }

  return Math.min(1, Math.max(0.05, value));
}

export class CanvasZoomSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: CanvasZoomSensitivityPlugin) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName("Zoom sensitivity")
      .setDesc(
        "Smaller values make Canvas zoom more gradually. 1.00 approximates the default Obsidian behavior.",
      )
      .addSlider((slider) => {
        slider
          .setLimits(0.05, 1, 0.05)
          .setValue(this.plugin.settings.sensitivity)
          .setDynamicTooltip()
          .onChange(async (value) => {
            await this.plugin.updateSensitivity(value);
          });
      });
  }
}
