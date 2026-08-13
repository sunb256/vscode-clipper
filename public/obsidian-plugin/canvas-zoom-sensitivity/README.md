# Canvas Zoom Sensitivity

An Obsidian desktop plugin that makes Canvas wheel and trackpad zoom more gradual without changing scrolling elsewhere in Obsidian. It is intended for Obsidian's **Mouse wheel behavior: Zoom** mode.

## How it works

The public Obsidian API does not expose a Canvas zoom method. The plugin therefore intercepts wheel events only inside roots obtained from Canvas workspace leaves and redispatches the same event with scaled deltas. Obsidian's own Canvas handler still performs the operation, preserving its cursor-centered zoom behavior and modifier keys. At sensitivity `1.00`, events are passed through unchanged.

The listener is registered through Obsidian's plugin lifecycle and is removed immediately when the plugin is disabled. No undocumented Canvas API is used.

## Install from source

```bash
npm install
npm run build
```

Copy `manifest.json`, `main.js`, and `versions.json` to:

```text
<vault>/.obsidian/plugins/canvas-zoom-sensitivity/
```

Enable **Canvas Zoom Sensitivity** under **Settings → Community plugins**.

## Setting

**Zoom sensitivity** ranges from `0.05` to `1.00` in steps of `0.05`. The default is `0.25`.

## Compatibility and manual testing

This plugin targets Obsidian Desktop 1.0.0 or newer. Obsidian does not expose Canvas internals publicly, so verify behavior after major Obsidian Canvas updates.

- Test zoom in and out at `1.00`, `0.50`, `0.25`, and `0.10`.
- Confirm the cursor remains the zoom center over nodes and empty space.
- Confirm Canvas pan, node dragging, selection, and edge creation still work.
- Confirm Markdown, sidebars, File Explorer, and Settings scroll normally.
- Disable the plugin and confirm standard Canvas behavior returns immediately.
- Restart Obsidian and confirm the saved sensitivity remains selected.

## Development note

A live Obsidian runtime is required to inspect the Canvas root, wheel target, and standard zoom center in DevTools. The implementation deliberately avoids guessed internal property names and confines the DOM interception to `src/zoom-controller.ts`.
