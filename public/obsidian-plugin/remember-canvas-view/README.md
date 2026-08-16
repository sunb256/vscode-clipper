# Remember Canvas View

An Obsidian desktop plugin that automatically remembers the last position and zoom level for every Canvas file.

## Behavior

- Saves `tx`, `ty`, and `tZoom` per Canvas path in the plugin's `data.json`.
- Restores a saved viewport when that Canvas is opened again.
- Keeps saved data across Obsidian restarts and moves it when a Canvas is renamed.
- Removes saved data when a Canvas is deleted.
- Never modifies `.canvas` files or sends data over the network.

The plugin uses Obsidian's undocumented internal Canvas viewport properties. If those properties are unavailable, it leaves the Canvas unchanged and fails safely.

## Install from source

```bash
npm install
npm run build
```

Copy `manifest.json`, `main.js`, and `versions.json` to:

```text
<vault>/.obsidian/plugins/remember-canvas-view/
```

Enable **Remember Canvas View** under **Settings → Community plugins**.

## Settings and command

- **Remember Canvas views** pauses saving and restoring without deleting existing data.
- **Clear saved Canvas views** removes every saved viewport after confirmation.
- **Forget current Canvas view** removes only the active Canvas viewport.

## Manual verification

Open two Canvas files, give each a different position and zoom level, and switch between them. Restart Obsidian and confirm both states are restored. Also verify first-time Canvas files retain Obsidian's default viewport, and rename/delete operations update stored data.
