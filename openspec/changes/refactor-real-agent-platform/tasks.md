## 0. Approval and Baseline

- [x] 0.1 Confirm the three defaults in `design.md`: server-managed keys, Node.js deployment target, and initial Provider catalog.
- [x] 0.2 Do not begin implementation until the proposal is explicitly approved.
- [x] 0.3 Record the current test, lint, build and bundle baselines in the change notes.
- [x] 0.4 Fix the existing 13 ESLint errors, 2 warnings and React test `act(...)` warnings without changing product behavior.
- [x] 0.5 Add non-watch CI scripts for lint, unit tests, typecheck and build; declare Node.js >=22.13 in package metadata.

## 1. TanStack Start and Hono Runtime

- [x] 1.1 Compare the installed TanStack Start conventions and current official reference configuration before replacing the existing entry points.
- [x] 1.2 Migrate Vite entry/config to TanStack Start, including root route, router entry and route tree generation.
- [x] 1.3 Move the existing IDE shell under a client-only route and preserve all current panels and keyboard behavior.
- [x] 1.4 Add server-only import protection and verify Mastra/Hono/provider modules cannot enter the client graph.
- [x] 1.5 Create the Hono app with request ID, body limit, timeout/cancellation, validation, typed error and sanitized logging middleware.
- [x] 1.6 Add `GET /api/health` and a TanStack Start `/api/*` catch-all Server Route that delegates to `Hono.fetch()`.
- [x] 1.7 Add Hono `app.request()` integration tests and verify development/build/start commands on Node.js 22.13+.

## 2. shadcn/ui and AI Elements Foundation

- [x] 2.1 Initialize shadcn/ui non-interactively with the Radix base and create the canonical `components.json` aliases.
- [x] 2.2 Normalize Tailwind v4 theme tokens and remove duplicate/circular legacy token definitions without changing the overall IDE visual identity.
- [x] 2.3 Install only the shadcn primitives used by touched flows (Button, Input, Dialog/AlertDialog, Tooltip, Badge, ScrollArea, Tabs, Popover/Select and supporting primitives).
- [x] 2.4 Install only the AI Elements used by this phase: conversation, message, prompt-input, model-selector, tool and direct dependencies. Defer confirmation until an approval-gated tool exists.
- [x] 2.5 Add a component smoke test and typecheck; do not suppress registry type failures with `@ts-nocheck`.

## 3. Deep Workspace Module

- [x] 3.1 Define versioned `WorkspaceSnapshot`, `WorkspaceChangeSet`, `WorkspaceChange`, `ChangeSelection`, conflict and transaction schemas with Zod.
- [x] 3.2 Implement path normalization, content hashing, snapshot filtering and Agent payload limits as pure functions.
- [x] 3.3 Implement one atomic `preview/apply/undo` Workspace interface, including base revision and per-file hash conflict checks.
- [x] 3.4 Implement hunk selection as an input to the Workspace interface so UI modules never construct replacement file maps directly.
- [x] 3.5 Introduce a `WorkspaceRepository` seam with IndexedDB and in-memory adapters; add schema migration from the existing persisted shape.
- [x] 3.6 Debounce/coalesce IndexedDB writes and flush safely on explicit save/unload paths.
- [x] 3.7 Replace the obsolete mock patch fixtures with Workspace-interface parity tests and remove the production compatibility path.
- [x] 3.8 Add domain, repository contract, migration, stale conflict, atomicity, inverse change and 100KB performance tests.

## 4. Provider Configuration

- [x] 4.1 Create a server-only Provider registry with the approved built-in catalog, curated tool-capable models and environment-variable mappings.
- [x] 4.2 Read secret availability per request and expose only public descriptors (`configured`, models and disabled reason).
- [x] 4.3 Implement `ProviderCatalog.resolve()` with allowlist validation and typed missing-key/invalid-model errors.
- [x] 4.4 Add `.env.example` and documentation for Provider keys, optional default model overrides and safe local setup.
- [x] 4.5 Add `GET /api/providers` and validate that response bodies/logs never contain key values.
- [x] 4.6 Build the provider/model selector using AI Elements/shadcn: all providers visible, missing-key entries disabled, first configured fallback selected, and submit disabled when none are available.
- [x] 4.7 Persist only provider/model IDs in browser preferences and recover cleanly when configuration changes.
- [x] 4.8 Add Provider registry, API and selector tests for zero, one and multiple configured providers.

## 5. Mastra Coding Agent

- [x] 5.1 Add the Mastra instance and a single code-registered coding Agent with dynamic model resolution through request context.
- [x] 5.2 Implement a request-scoped `RunWorkspace` initialized from a validated browser snapshot and destroyed on finish, error or abort.
- [x] 5.3 Implement typed `list_files`, `read_file`, `search_files`, `write_file`, `delete_file` and terminal `finalize_changes` tools.
- [x] 5.4 Enforce read-before-write, path containment, file/output limits and shadow-only mutation in tool implementations.
- [x] 5.5 Add Agent instructions, a finite step budget, terminal-tool stopping behavior and sanitized error mapping.
- [x] 5.6 Implement `POST /api/chat` in Hono using Mastra `handleChatStream({ version: "v6" })` and AI SDK `createUIMessageStreamResponse()`.
- [x] 5.7 Validate messages, provider/model selection and workspace snapshot before starting any paid model call.
- [x] 5.8 Propagate the request abort signal through Hono and Mastra and prove that stopping the client cancels the run.
- [x] 5.9 Add structured observability for request ID, provider/model, duration, steps, usage, finish reason and error category with content/key redaction.
- [x] 5.10 Test the full stream and tool loop with an AI SDK v6 mock model; add opt-in smoke scripts for configured real Providers.

## 6. Agent Chat UI Migration

- [x] 6.1 Replace custom message/loading/stream simulation state with AI SDK v6 `useChat` and `DefaultChatTransport`.
- [x] 6.2 Use `prepareSendMessagesRequest` to attach provider/model selection and the filtered workspace snapshot.
- [x] 6.3 Render all model text, reasoning and generic tool states with AI Elements; never render raw model Markdown as plain JSX.
- [x] 6.4 Add a typed renderer for `finalize_changes` that creates a pending ChangeReview without mutating files.
- [x] 6.5 Connect accept/reject/hunk actions only to `Workspace.apply()` and show a stale-change recovery path.
- [x] 6.6 Support stop, retry/regenerate, provider errors, validation errors, no-provider setup state and request cancellation.
- [x] 6.7 Replace mock-patch suggestions with provider-independent example prompts.
- [x] 6.8 Move JSON patches to test fixtures or an explicit development-only mock mode and remove trigger matching from production code.
- [x] 6.9 Delete the legacy chat message store and duplicated ChatPane/EditorPane patch application code after parity tests pass.

## 7. Module and UI Refactor

- [x] 7.1 Split the current `App` shell into route shell, project actions, command registry and dialogs with clear module ownership.
- [x] 7.2 Separate ChangeReview state/navigation from Agent chat state so the editor no longer imports chat store actions.
- [x] 7.3 Keep EditorSession and Layout stores focused on UI session state; remove file ownership from those modules.
- [x] 7.4 Update file tree, editor, diff view, preview, import/export and persistence loader to consume the Workspace interface.
- [x] 7.5 Replace raw controls in touched flows with generated shadcn primitives and preserve accessible names/keyboard shortcuts.
- [x] 7.6 Lazy-load Monaco, Sandpack and heavy diff review UI; verify route transitions and loading/error states.
- [x] 7.7 Remove unused legacy components, CSS, dependencies and remote Lovable logo coupling where no longer required.

## 8. Verification, Documentation and Handoff

- [x] 8.1 Keep all existing behavior-focused tests passing or replace implementation-coupled tests with Workspace-interface tests.
- [x] 8.2 Add React tests for Provider disabled states, AI Elements stream rendering, cancellation, tool output and ChangeReview handoff.
- [x] 8.3 Add Hono/Mastra integration coverage for malformed requests, disabled Providers, invalid models, tool errors, abort and successful ChangeSet streams.
- [x] 8.4 Add a deterministic browser-surface flow test from finalized tool output through review/apply to preview workspace state, plus an interactive IDE smoke check.
- [x] 8.5 Verify `pnpm lint`, unit/integration tests, typecheck and production build all pass without warnings introduced by the change.
- [x] 8.6 Verify the 100KB patch apply target remains under 500ms and IndexedDB writes are not performed per keystroke.
- [x] 8.7 Inspect the production client manifest and assert Mastra, Hono and Provider server code are absent; record before/after bundle sizes.
- [x] 8.8 Update README, architecture decisions, `.env.example`, local setup, deployment requirements, security limitations and troubleshooting.
- [x] 8.9 Update `openspec/project.md` to remove the obsolete mocked-AI/no-backend constraints after implementation is complete.
- [x] 8.10 Mark tasks complete only after the corresponding behavior and verification actually pass.
