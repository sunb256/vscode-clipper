import { App, Modal, PluginSettingTab, Setting } from "obsidian";
import type RememberCanvasViewPlugin from "./main";

class ClearViewsModal extends Modal {
  constructor(app: App, private readonly plugin: RememberCanvasViewPlugin) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Clear saved Canvas views?");
    this.contentEl.createEl("p", {
      text: "This removes every saved Canvas position and zoom level.",
    });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((button) => button
        .setButtonText("Clear")
        .setWarning()
        .onClick(async () => {
          await this.plugin.clearViews();
          this.close();
        }));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class RememberCanvasSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: RememberCanvasViewPlugin) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName("Remember Canvas views")
      .setDesc("Restore the last position and zoom level for each Canvas.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.data.settings.enabled)
        .onChange((enabled) => this.plugin.setEnabled(enabled)));

    new Setting(this.containerEl)
      .setName("Reset stored views")
      .setDesc("Forget all saved Canvas positions and zoom levels.")
      .addButton((button) => button
        .setButtonText("Clear saved Canvas views")
        .setWarning()
        .onClick(() => new ClearViewsModal(this.app, this.plugin).open()));
  }
}
