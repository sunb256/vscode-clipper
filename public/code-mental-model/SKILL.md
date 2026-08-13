---
name: code-mental-model
description: Trace a repository feature from real code and create a concise Japanese mental-model document containing an abstract Mermaid flow plus feature-level one-line explanations with short lists of relevant code locations. Use when the user wants a repository feature overview, an implementation map, a code-reading guide, or a compact explanation of where each part is implemented without line-by-line commentary or a full architecture report.
---

# Code Mental Model

Create a compact, code-grounded guide that shows:

1. the feature's overall flow at a useful abstraction level
2. what each major part does in one sentence
3. where each part is implemented

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

### 4. Draw the Mermaid flow

Create one abstract diagram for the main flow. Add another diagram only for a materially separate flow.

- Use `flowchart TD` by default.
- Use `sequenceDiagram` only when interaction order between components is the main point.
- Use 5–10 short Japanese nodes as a guideline.
- Describe responsibilities and state transitions, not every function call.
- Put important data or event names on edges when useful.
- Keep code paths and symbol names out of the diagram unless they are essential to understanding it.
- Use dashed edges only for materially inferred relationships.
- Keep Mermaid compatible with Obsidian and draw.io.
- Do not use custom styling, icons, decorative detail, or line numbers.

### 5. Write the implementation map

Read `assets/category-template.md` and follow its structure.

For each responsibility represented by the flow, write exactly this shape:

```markdown
- **選択内容を取得する**：VS Codeの選択範囲、ファイル情報、言語IDを処理用データへまとめる。
  - `src/extension.ts [20-35]` — `captureSelection`
  - `src/extension.ts [120-130]` — `createClipItem`
```

Apply these rules:

- Keep the explanation to one sentence.
- List 1–3 code locations that best represent the responsibility.
- Use repository-relative paths and code position plus symbol names.
- Order entries in the same direction as the Mermaid flow.
- Explain the role of the code, not its statements line by line.
- Do not include code snippets, numbered walkthroughs, evidence tables, exhaustive error cases, or reading-order sections unless requested.
- Merge entries that would repeat the same explanation or code locations.

### 6. Write the document

Use the default output path:

```text
docs/mental-models/<feature>.md
```

Use a readable Unicode filename and replace path separators, control characters, and filesystem-reserved characters with `-`. Respect a user-specified output path.

If the document exists, replace stale generated content while preserving clearly handwritten notes.

### 7. Validate

Before finishing, confirm:

- the diagram shows the end-to-end flow at a higher abstraction level than the implementation map
- every implementation-map entry corresponds to a meaningful part of the flow
- every path and symbol was verified in the repository
- explanations are one sentence each
- code-location lists contain only the most relevant locations
- paths are repository-relative and no stale line numbers are used
- the Markdown file exists at the reported path

