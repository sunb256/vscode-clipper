---
name: code-mental-model
description: "Trace repository features from real code and create independent Japanese mental-model Markdown documents and standalone Obsidian Canvases. Support one named category, category discovery only, or an end-to-end batch that discovers categories and writes a numbered specification pair for every category. Include an abstract Mermaid flowchart, a component interaction sequence diagram, and feature-level one-line explanations with short lists of relevant code locations. Use when the user wants a repository feature overview, implementation map, code-reading guide, a complete set of categorized specifications, or portable Obsidian Canvas files without line-by-line commentary or a full architecture report."
---

# Code Mental Model

Create a compact, code-grounded guide that shows:

1. the feature's overall flow at a useful abstraction level
2. the interaction order between the major participants
3. what each major part does in one sentence
4. where each part is implemented
5. the same complete guide available independently as Markdown and a sectioned Obsidian Canvas

## Workflow

### 1. Inspect repository context

Read applicable `AGENTS.md` files and only the repository files needed to trace the requested feature. Follow commands, routes, callbacks, events, state changes, file writes, and external integrations from a concrete entry point to a meaningful outcome.

Do not infer behavior from directory or file names alone. Preserve unrelated changes and do not modify application code.

### 2. Select the execution mode

Choose one of these modes from the request:

- **Single category**: If the user names a category, use it immediately and generate one output pair.
- **Discovery only**: If the user asks only for candidates, inspect the repository and present 3–10 user-meaningful categories. Give each category a one-line description and one or two supporting code locations. Do not generate documents.
- **All categories**: If the user asks to extract categories and document each one, discover 3–10 categories and generate every output pair in the same run. Do not pause for category selection or confirmation.
- **Interactive selection**: If no category or mode is stated, present the candidates and ask the user to choose. Do not generate documents before a category is selected.

For discovery, choose categories that represent distinct user-visible capabilities or meaningful operational flows. Do not use directories, layers, or generic technical concerns as categories unless they are independently understandable features. Verify each category from a concrete entry point and outcome.

In all-categories mode, order categories deterministically: primary user flows first, secondary flows next, and supporting or administrative flows last. Record the ordered category list before writing any document, then keep that order and numbering across Markdown and Canvas outputs.

### 3. Build each mental model

Identify 4–10 major responsibilities. Combine helpers that serve the same purpose and omit incidental details such as DTOs, trivial validation, formatting utilities, and generic error wrappers unless they materially change the flow.

Split into multiple flows only when entry points or outcomes are genuinely different. Reuse shared processing instead of explaining it twice.

Classify findings internally as verified, inferred, or unknown. Mention uncertainty only when it changes the reader's understanding. In all-categories mode, trace shared code once but explain it from each category's perspective; do not merge distinct category documents merely because they share an implementation.

### 4. Draw the Mermaid flowchart

Create one abstract flowchart for the main flow. Add another flowchart only for a materially separate flow.

- Use `flowchart TD`.
- Use 5–10 short Japanese nodes as a guideline.
- Describe responsibilities and state transitions, not every function call.
- Put important data or event names on edges when useful.
- Keep code paths and symbol names out of the diagram unless they are essential to understanding it.
- Use dashed edges only for materially inferred relationships.
- Keep Mermaid compatible with Obsidian and draw.io.
- Write Mermaid configuration with the legacy `%%{init: {...}}%%` directive. Do not use
  YAML frontmatter inside Mermaid code blocks because VS Code Markdown Preview does not
  support it consistently.
- Do not use custom styling, icons, decorative detail, or line numbers.

### 5. Draw the Mermaid sequence diagram

Create one `sequenceDiagram` that complements the flowchart by showing the main code symbols and their interaction order from the same entry point to the same meaningful outcome. The diagram is a code-reading aid, so a reader must be able to search for each participant in the repository.

- Use 3–7 participants whose displayed names are exact, verified code symbols such as class names, module names, exported object names, or top-level function names.
- Prefer class names when the implementation uses classes. Otherwise use the narrowest stable symbol that actually owns the behavior; do not invent role names such as `主要処理`, `操作受付`, or `保存先`.
- Declare participants with a short Mermaid-safe ID and the exact symbol as its display label, for example `participant Controller as ClipController`.
- External actors that have no repository symbol may use a concrete role name such as `User`, `VS Code`, or an external service name.
- Order messages chronologically and label code calls with exact verified method, function, command, or event names whenever one exists. Use a concise data/response description only when no named call exists.
- Keep code paths and incidental internal calls out of the diagram unless essential to understanding the interaction.
- Use `alt` / `else` only for branches that materially change the outcome, and `opt` only for meaningful optional behavior.
- Keep message labels short; use `<br/>` only when a label must wrap.
- Do not duplicate the flowchart node-for-node. The flowchart explains responsibilities and state transitions; the sequence diagram explains who interacts with whom and in what order.
- If the feature is entirely local and has no meaningful participant interaction, omit the sequence diagram and state the reason briefly under `補足`.
- Keep Mermaid compatible with Obsidian and draw.io. Do not use custom styling, icons, decorative detail, or line numbers.

### 6. Write the implementation map

Read `assets/category-template.md` and follow its structure.

For each responsibility represented by the flow, write exactly this shape:

```markdown
- **選択内容を取得する**
  - 選択範囲とファイル情報を処理用データへまとめる。
  - [`src/extension.ts [20-35]`](vscode://sunb256.vscode-clipper/open?repo=example-project&path=src%2Fextension.ts&line=20) — `captureSelection`
  - [`src/extension.ts [120-130]`](vscode://sunb256.vscode-clipper/open?repo=example-project&path=src%2Fextension.ts&line=120) — `createClipItem`
```

Apply these rules:

- Put only the bold responsibility name on the top-level bullet line.
- Never append `：`, an explanation, a code symbol, or any other prose after the closing `**` on that line.
- Put the explanation in the first indented child bullet, followed by the code-location child bullets at the same indentation.
- Keep the responsibility name short and action-oriented, preferably 8–20 Japanese characters.
- Keep the explanation to one short sentence, preferably no more than 60 Japanese characters, describing only the responsibility's purpose or outcome.
- Move command variants, branch details, implementation mechanics, and secondary effects to the diagrams or supplemental notes unless they are essential to distinguish the responsibility.
- List 1–3 code locations that best represent the responsibility.
- Use repository-relative paths and code position plus symbol names.
- Render every code location as a Markdown link whose label remains the repository-relative
  path and position. Use the repository root directory name as `repo`, the relative path as
  `path`, and the first line as `line` in this URI shape:
  `vscode://sunb256.vscode-clipper/open?repo=<encoded>&path=<encoded>&line=<number>`.
- Percent-encode every query value. Never put an absolute path in the generated document.
- Order entries in the same direction as the Mermaid flow.
- Explain the role of the code, not its statements line by line.
- Do not include code snippets, numbered walkthroughs, evidence tables, exhaustive error cases, or reading-order sections unless requested.
- Merge entries that would repeat the same explanation or code locations.

### 7. Name the outputs

Sanitize each category name by replacing path separators, control characters, and filesystem-reserved characters with `-`. Keep readable Unicode characters.

In all-categories mode, use the category's one-based position as a zero-padded two-digit prefix and give each Markdown/Canvas pair the same base name:

```text
docs/mental-models/<project-name>/01_<category-name>.md
docs/mental-models/<project-name>/01_<category-name>.canvas
docs/mental-models/<project-name>/02_<category-name>.md
docs/mental-models/<project-name>/02_<category-name>.canvas
```

Support at most 99 categories. Keep numbering stable within a run and never assign the same number to multiple categories. If regenerating an existing set, preserve numbers for categories with the same sanitized name and assign unused numbers to new categories in the established category order. Do not delete unmatched existing files automatically.

In single-category mode, use `<category-name>.md` and `<category-name>.canvas` unless the user requests numbered names. Respect a user-specified output directory or explicit output paths.

### 8. Write each Markdown document

Compose the complete document from `assets/category-template.md` and write it to:

```text
docs/mental-models/<feature>.md
```

If the document exists, replace stale generated content while preserving clearly handwritten notes.

### 9. Write each Obsidian Canvas

Create a standalone Obsidian Canvas beside the Markdown document with the same base name:

```text
docs/mental-models/<feature>.canvas
```

Read `assets/canvas-template.json` and follow its structure. Split the Markdown document into self-contained Canvas text nodes so readers can scan, move, and connect each part independently. Do not create a file node or reference an external Markdown file.

Apply these rules:

- Write valid JSON containing top-level `nodes` and `edges` arrays.
- Create one generated `text` node for each of these units:
  - title and overview
  - each flowchart
  - the sequence diagram, when present
  - the complete `実装の構成` section, including every responsibility, explanation, and code-location list
  - supplemental notes, when present
- Keep every section heading in the corresponding node so each node remains understandable when viewed alone.
- Do not put the whole document into one generated node, but always keep all implementation responsibilities together in one `実装の構成` node.
- Preserve the Markdown content verbatim within its assigned nodes. Concatenating generated node text in document order with exactly one blank line between nodes must reproduce the complete Markdown document.
- Lay out generated nodes in document order from top to bottom:
  - place the title and overview at `x: 0`, `y: 0`, `width: 1000`
  - place flowcharts at `x: 0`, using `width: 1000`
  - give each flowchart node twice the normal content-based height, with a minimum height of 720 pixels, so vertically oriented flows have enough room to render legibly
  - place the sequence diagram at `x: 0`, using `width: 1400`, even though it does not align with the other 1000-pixel-wide nodes
  - give the sequence-diagram node 1.25 times its normal content-based height, rounding up to the nearest whole pixel
  - place the complete implementation section at `x: 0`, using `width: 1000`
  - place supplemental notes below the implementation section at `x: 0`, using `width: 1000`
  - leave at least 80 pixels of vertical space between rows and avoid overlapping nodes
- Estimate each node height from its content with a minimum of 220 pixels; use more height for Mermaid blocks and long code-location lists so the node is readable without internal scrolling.
- Serialize the Canvas with a JSON serializer so newlines, quotes, backslashes, and Unicode text are escaped correctly.
- Use a deterministic lowercase hexadecimal node ID of at least 16 characters derived from the Canvas output path plus a stable section key such as `overview`, `flow-1`, `sequence`, `implementation`, or `notes`.
- Keep `edges` empty unless the user explicitly requests a richer Canvas layout.
- If the Canvas already exists, preserve user-added nodes and edges. Update generated text nodes by their deterministic IDs, add missing generated nodes, and remove stale generated nodes that use the same output-path-derived ID scheme.
- When migrating a Canvas created by a previous template, merge old `responsibility-*` generated nodes into the single `implementation` node, remove the old whole-document `text` node or same-base Markdown `file` node, and remove only edges connected to removed nodes.
- Never use a `file` node for the generated guide. Copying the `.canvas` file alone must preserve all generated content.
- Respect a user-specified Canvas output path. If only one output path is specified, place the other output beside it with the same base name and the appropriate extension.

### 10. Copy Canvas files to Obsidian when requested

The Canvas files are portable deliverables: the generated text nodes collectively contain the complete guide and do not depend on the paired Markdown file.

If the user supplies an Obsidian Vault directory and asks for installation or copying, copy every generated `.canvas` file to that directory after validation. Preserve the numbered filenames and create only the requested subdirectory. Do not overwrite an existing destination file unless the user explicitly allows replacement. Copy the Markdown files too only when requested.

If no Vault directory is supplied, do not guess one or search outside the repository. Report the generated directory and state that its `.canvas` files can be copied directly into any Vault.

### 11. Validate

Before finishing, confirm:

- the flowchart shows the end-to-end flow at a higher abstraction level than the implementation map
- when present, the sequence diagram follows the same scope and shows interaction order without duplicating the flowchart
- every sequence participant uses an exact verified code symbol (except genuine external actors), and every message is grounded in verified repository behavior
- every implementation-map entry corresponds to a meaningful part of the flow
- every path and symbol was verified in the repository
- explanations are one sentence each
- every implementation responsibility uses a title-only top-level bullet followed by one short explanation child bullet
- no implementation responsibility appends `：` or explanatory prose to its bold title line
- code-location lists contain only the most relevant locations
- paths are repository-relative and no stale line numbers are used
- every code-location link contains the repository name, relative path, and first line
- the Markdown file exists at the reported path and contains the complete guide
- the Canvas file exists at the reported path
- the Canvas is valid JSON with `nodes` and `edges` arrays
- generated text nodes exist for the overview, every diagram, the complete implementation section, and supplemental notes when present
- exactly one generated text node starts with `## 実装の構成` and contains every implementation responsibility in Markdown order
- concatenating generated node text in document order with one blank line between nodes produces content identical to the Markdown file
- generated nodes have deterministic unique IDs, do not overlap, and follow the prescribed layout
- every flowchart node uses at least 720 pixels of height and approximately twice the normal content-based height
- the sequence-diagram node uses exactly 1400 pixels of width and 1.25 times its normal content-based height, rounded up
- no generated node depends on an external file

In all-categories mode, also confirm:

- every discovered category has exactly one numbered Markdown/Canvas pair
- numbers are unique, two digits, ordered, and identical within each pair
- category filenames match the recorded category list
- every Markdown document has a sectioned Canvas whose ordered generated text nodes reconstruct identical content
- no category was silently skipped after discovery

### 12. Report the result

For single-category mode, report the two generated paths. For all-categories mode, report the ordered category list and every generated pair, plus the count of completed categories. If Canvas files were copied into a Vault, report the destination; otherwise state that the generated `.canvas` files are ready to copy directly into Obsidian.
