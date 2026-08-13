# Copy Canvas Path

An Obsidian desktop plugin that copies the absolute path of the active Canvas.
It is intended for automation that needs to update the Canvas currently selected in Obsidian.

## Command

Run **Copy Canvas Path: Copy active Canvas path** from the command palette. The command is available only while a Canvas is active.

The default hotkey is `Ctrl+Alt+Shift+C`. VS Code Clipper invokes the command through the `obsidian://copy-path` protocol, so the hotkey can be changed without affecting automation.

## Build and install

```bash
npm install
npm run build
```

Copy `manifest.json`, `main.js`, and `versions.json` to:

```text
<vault>/.obsidian/plugins/copy-path/
```

Enable **Copy Canvas Path** under **Settings → Community plugins**.
