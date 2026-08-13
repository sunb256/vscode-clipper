---
name: code-mental-model
description: "Trace a repository feature from real code and create two independent outputs: a concise Japanese mental-model Markdown document and a standalone Obsidian Canvas containing the same complete content in a text node. Include an abstract Mermaid flowchart, a component interaction sequence diagram, and feature-level one-line explanations with short lists of relevant code locations. Use when the user wants a repository feature overview, implementation map, code-reading guide, or portable Obsidian Canvas without line-by-line commentary or a full architecture report."
---

# Code Mental Model

Create a compact, code-grounded guide that shows:

1. the feature's overall flow at a useful abstraction level
2. the interaction order between the major participants
3. what each major part does in one sentence
4. where each part is implemented
5. the same complete guide available independently as Markdown and Obsidian Canvas

## Workflow

### 1. Inspect repository context

Read applicable `AGENTS.md` files and only the repository files needed to trace the requested feature. Follow commands, routes, callbacks, events, state changes, file writes, and external integrations from a concrete entry point to a meaningful outcome.

Do not infer behavior from directory or file names alone. Preserve unrelated changes and do not modify application code.

### 2. Select the feature

If the user names a feature, use it immediately.

If no feature is named, inspect the repository and present 3–10 user-meaningful candidates. Give each candidate a one-line description and one or two supporting code locations, then ask the user to choose. Do not generate the final document before a feature is selected.

### 3. Build the mental model

Identify 4–10 major responsibilities. Combine helpers that serve the same purpose and omit incidental details such as DTOs, trivial validation, formatting utilities, and generic error wrappers unless they materially change the flow.

Split into multiple flows only when entry points or outcomes are genuinely different. Reuse shared processing instead of explaining it twice.

Classify findings internally as verified, inferred, or unknown. Mention uncertainty only when it changes the reader's understanding.

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
- **選択内容を取得する**：VS Codeの選択範囲、ファイル情報、言語IDを処理用データへまとめる。
  - [`src/extension.ts [20-35]`](vscode://sunb256.vscode-clipper/open?repo=example-project&path=src%2Fextension.ts&line=20) — `captureSelection`
  - [`src/extension.ts [120-130]`](vscode://sunb256.vscode-clipper/open?repo=example-project&path=src%2Fextension.ts&line=120) — `createClipItem`
```

Apply these rules:

- Keep the explanation to one sentence.
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

### 7. Write the Markdown document

Compose the complete document from `assets/category-template.md` and write it to:

```text
docs/mental-models/<feature>.md
```

Use a readable Unicode filename and replace path separators, control characters, and filesystem-reserved characters with `-`. Respect a user-specified Markdown output path.

If the document exists, replace stale generated content while preserving clearly handwritten notes.

### 8. Write the Obsidian Canvas

Create a standalone Obsidian Canvas beside the Markdown document with the same base name:

```text
docs/mental-models/<feature>.canvas
```

Read `assets/canvas-template.json` and follow its structure. Put the complete Markdown document into the `text` property of a Canvas text node. Do not create a file node or reference an external Markdown file.

Apply these rules:

- Write valid JSON containing top-level `nodes` and `edges` arrays.
- Use one `text` node by default with `x: 0`, `y: 0`, `width: 1000`, and `height: 1400`.
- Set `text` to the complete document, including its headings, Mermaid blocks, implementation map, and supplemental notes.
- Keep the generated text identical to the Markdown file content so the two outputs present the same guide while remaining independent.
- Serialize the Canvas with a JSON serializer so newlines, quotes, backslashes, and Unicode text are escaped correctly.
- Use a deterministic lowercase hexadecimal node ID of at least 16 characters derived from the Canvas output path.
- Keep `edges` empty unless the user explicitly requests a richer Canvas layout.
- If the Canvas already exists, preserve user-added nodes and edges. Update the generated text node by its deterministic ID rather than duplicating it.
- When migrating a Canvas created by the previous template, remove the old generated `file` node that references the same-base Markdown file and remove only edges connected to that node.
- Never use a `file` node for the generated guide. Copying the `.canvas` file alone must preserve all generated content.
- Respect a user-specified Canvas output path. If only one output path is specified, place the other output beside it with the same base name and the appropriate extension.

### 9. Validate

Before finishing, confirm:

- the flowchart shows the end-to-end flow at a higher abstraction level than the implementation map
- when present, the sequence diagram follows the same scope and shows interaction order without duplicating the flowchart
- every sequence participant uses an exact verified code symbol (except genuine external actors), and every message is grounded in verified repository behavior
- every implementation-map entry corresponds to a meaningful part of the flow
- every path and symbol was verified in the repository
- explanations are one sentence each
- code-location lists contain only the most relevant locations
- paths are repository-relative and no stale line numbers are used
- every code-location link contains the repository name, relative path, and first line
- the Markdown file exists at the reported path and contains the complete guide
- the Canvas file exists at the reported path
- the Canvas is valid JSON with `nodes` and `edges` arrays
- exactly one generated `text` node contains content identical to the Markdown file
- no generated node depends on an external file
