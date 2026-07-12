## Context

### 当前形态

项目目前是 React 19 + Vite 的单页应用，约 10,673 行前端源码：

- `src/App.tsx`（498 行）同时负责应用壳、项目生命周期、快捷键和多个 Dialog。
- `src/modules/chat/ChatPane.tsx`（675 行）同时负责模拟流、trigger 匹配、消息渲染、补丁应用、回滚和 diff review 入口。
- `src/modules/fs/store.tsx`（385 行）把工作区状态、IndexedDB 副作用、checkpoint/revert 语义放在同一个 Zustand store 中。
- `ChatPane` 和 `EditorPane` 各自实现了一套 patch apply 路径，range patch、hunk selection 和状态更新的语义并不一致。
- `ChatMessage`、`PendingChange`、`VirtualFile.originalContent` 互相引用，聊天模块与编辑器、文件系统、补丁模块之间形成循环知识。
- 服务端、真实模型、Agent 运行上下文、Provider 配置、鉴权和密钥边界均不存在。

### 当前质量基线

- `pnpm exec vitest run`：14 个测试文件、102 个测试全部通过，但存在 React `act(...)` 警告。
- `pnpm build`：通过。
- `pnpm lint`：失败，当前有 13 个 error 和 2 个 warning；主要是 effect 中同步 setState、Fast Refresh 导出约束和测试未使用参数。
- 当前构建的主要原始 chunk：Sandpack 约 962 KB、应用主 chunk 约 493 KB、Radix 约 108 KB、vendor 约 133 KB。

### 外部约束

- Mastra 1.x 要求 Node.js >= 22.13.0。
- TanStack Start 支持 SPA 模式与 Server Routes，因此 IDE 可以保持 client-only，同时保留同一应用内的服务端能力。
- Mastra 当前 `chatRoute()` / `handleChatStream()` 官方接口提供 AI SDK v5 与 v6 输出，尚未声明 v7 输出。
- AI Elements 依赖 shadcn/ui 的 Radix 基座，必须按需安装，不能安装全量 registry。
- Provider key 必须留在服务端；TanStack Start 的服务端环境变量应在请求处理期间读取，避免模块初始化时泄漏或在 edge runtime 下读到空值。

## Goals / Non-Goals

### Goals

- 将当前静态模拟应用迁移为单进程、同源的 TanStack Start 全栈应用。
- 建立真实的 Mastra coding Agent：支持多步工具调用、请求取消、动态模型选择和结构化 ChangeSet 输出。
- 默认显示多个 Provider；缺 key 的 Provider 可见但不可选。
- 让 Agent 只操作请求级隔离副本，用户工作区必须经 diff/hunk review 后才改变。
- 以少量深模块接口隐藏 Provider、Agent、工作区事务和持久化复杂度。
- 保留现有 Monaco、文件树、Sandpack preview、console、import/export、主题和快捷键能力。
- 把 AI 消息、工具调用、推理、错误和流式状态统一迁移到 AI SDK UI + AI Elements。
- 建立可在没有真实 API key 时运行的确定性测试架构。

### Non-Goals

- 第一阶段不实现多用户登录、计费、配额或团队权限。
- 第一阶段不把浏览器项目迁移到服务端数据库，也不提供跨设备同步。
- 第一阶段不授予 Agent shell、任意网络、宿主真实文件系统或部署权限。
- 第一阶段不引入多 Agent network；先把单 coding Agent 的接口和安全模型做深。
- 第一阶段不引入 RAG、向量数据库或长期 observational memory。
- 第一阶段不追求全站 SSR；这是开发者工具，IDE 主界面继续 client-only。
- 第一阶段不升级 AI SDK v7；待 Mastra 官方 v7 stream contract 可用后单独评估。

## Target Architecture

```text
┌──────────────────────── Browser / TanStack Start SPA route ────────────────────────┐
│                                                                                    │
│  AgentChat UI                  Workspace module                IDE surfaces         │
│  useChat + AI Elements  ───▶   snapshot / review / apply  ───▶ Monaco / Sandpack  │
│       │                            │         ▲                                      │
│       │ POST /api/chat            │         │ reviewed WorkspaceChangeSet           │
│       │ GET  /api/providers       │         │                                      │
└───────┼────────────────────────────┼─────────┼──────────────────────────────────────┘
        │ same-origin UI stream     │ filtered WorkspaceSnapshot
        ▼                            │
┌──────────────────── TanStack Start server route /api/$ ────────────────────────────┐
│                         delegates Request → Hono.fetch()                            │
└───────────────────────────────────┬────────────────────────────────────────────────┘
                                    ▼
┌──────────────────────────────── Hono API module ────────────────────────────────────┐
│ middleware: request id / body limit / validation / timeout / error sanitization    │
│                                                                                    │
│  /api/providers ─▶ ProviderCatalog                                                 │
│  /api/chat      ─▶ CodingAgent.stream()                                            │
│                         │                                                          │
│                         ▼                                                          │
│                  Mastra Agent + RequestContext                                      │
│                  dynamic provider/model                                             │
│                  list/read/search/write/delete/finalize tools                       │
│                         │                                                          │
│                         ▼                                                          │
│                  request-scoped RunWorkspace                                        │
│                  (never writes browser state)                                       │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## Decisions

### 1. TanStack Start owns the runtime; Hono is mounted under `/api/*`

TanStack Start remains the outer application runtime. A catch-all Server Route receives `/api/*` requests and forwards the standard Fetch `Request` to a server-only Hono app. Hono returns a standard `Response` directly.

This placement keeps one build and one deployment, while Hono provides a compact transport module and `app.request()` test surface. Making Hono the outer server would require a custom Start server entry and runtime-specific mounting; running Mastra as a separate process would add CORS, duplicated configuration and another deployment.

Initial public routes:

- `GET /api/health`
- `GET /api/providers`
- `POST /api/chat`

Generic Mastra management/Studio endpoints are not exposed in production during phase 1. The Hono chat handler calls Mastra through `handleChatStream({ version: "v6" })` and returns an AI SDK UI message stream.

### 2. The IDE route is client-only

The root document shell can be rendered by Start, but the workspace route sets `ssr: false` (or uses Start SPA mode for the application) so Monaco, Sandpack, IndexedDB, Fullscreen and Web Worker code never execute during SSR.

Server-only code lives below `src/server/**` with `.server.ts` entry files or explicit Start server-only guards. Mastra, Hono configuration and API keys must not be imported by client modules.

### 3. Pin the compatible AI stream generation

Use the following compatible major lines:

- `ai@^6`
- `@ai-sdk/react@^3`
- `@mastra/core@^1`
- `@mastra/ai-sdk@^1`
- `hono@^4`
- `@tanstack/react-start@^1`

Although the current npm `ai` latest is v7, Mastra's documented chat transformer currently accepts `version: "v5" | "v6"`. Pinning v6 avoids silently mixing incompatible `UIMessage` part contracts. The lockfile records exact patches; dependency upgrades remain isolated changes.

### 4. Browser workspace remains authoritative

The browser continues to own project files and persistence. A chat call sends a validated, filtered `WorkspaceSnapshot`; the server creates a request-scoped `RunWorkspace`, and destroys it after completion or cancellation.

This avoids adding authentication and server data ownership before the product has a multi-user requirement. It also keeps import/export and offline editing intact.

The trade-off is request payload/context size. The Agent snapshot therefore has limits independent from the IndexedDB project limit:

- maximum request body: 2 MiB by default;
- maximum text files sent to Agent: 250;
- maximum individual text file: 256 KiB;
- omit `node_modules`, `dist`, build outputs, binary files and known secret paths;
- return a clear preflight error listing omitted/oversized files.

These values are configuration constants and can be adjusted after measurement.

### 5. A deep Workspace module owns all change semantics

Callers must not directly build a new `filesByPath` object or manually maintain `originalContent`. The external interface is intentionally small:

```ts
interface Workspace {
  getSnapshot(): WorkspaceSnapshot
  preview(changeSet: WorkspaceChangeSet): ChangePreview
  apply(changeSet: WorkspaceChangeSet, selection?: ChangeSelection): ApplyResult
  undo(transactionId: string): UndoResult
}
```

The implementation hides path normalization, hashes, revisions, hunk selection, inverse changes, dirty status derivation and IndexedDB scheduling. The same pure domain functions are used by the browser adapter and Agent run workspace.

Primary contracts:

```ts
interface WorkspaceSnapshot {
  revision: string
  files: Record<string, { content: string; hash: string }>
}

type WorkspaceChange =
  | { op: "create"; path: string; beforeHash: null; content: string }
  | { op: "update"; path: string; beforeHash: string; content: string }
  | { op: "delete"; path: string; beforeHash: string }

interface WorkspaceChangeSet {
  id: string
  baseRevision: string
  summary: string
  changes: WorkspaceChange[]
}
```

`apply()` validates every selected operation before mutating anything. A changed `revision` or mismatched `beforeHash` yields a typed conflict result and leaves the workspace untouched. Accepted transactions retain an inverse ChangeSet so chat-level Undo remains possible.

`WorkspaceRepository` is an internal seam with two justified adapters: IndexedDB in production and in-memory in tests. Persistence becomes schema-versioned and debounced instead of saving the full project after every keystroke.

### 6. The Agent works in a shadow workspace and submits, never commits

Each request creates a `RunWorkspace` from the submitted snapshot. Mastra tools are thin adapters over this module:

- `list_files`: list normalized paths with optional glob/filter;
- `read_file`: require read-before-write and return bounded content;
- `search_files`: exact/regex text search with bounded results;
- `write_file`: create/update only the shadow copy;
- `delete_file`: delete only from the shadow copy;
- `finalize_changes`: compare base and shadow state, validate and return one `WorkspaceChangeSet`.

The tool loop has a finite step budget (default 12), an abort signal, per-tool schemas and bounded outputs. The Agent instructions require inspection before mutation and `finalize_changes` as the terminal action. Shell and arbitrary fetch are not registered.

The client recognizes the typed `finalize_changes` tool result, stores it as a pending review, and renders the existing file/hunk review experience. Rejecting it discards the proposal. Accepting it calls the single `Workspace.apply()` interface.

This is a real Agent loop: model decisions invoke tools and update an isolated working copy. Human approval is enforced structurally at the browser workspace seam, not merely requested in the prompt.

### 7. ProviderCatalog is the only model-selection interface

The Provider module exposes two operations:

```ts
interface ProviderCatalog {
  listPublic(): PublicProvider[]
  resolve(selection: ModelSelection): ResolvedModel
}
```

`listPublic()` never returns a key. `resolve()` validates that the provider is configured and the model is in the curated allowlist before returning a Mastra model identifier.

Recommended initial catalog:

| Provider | Environment variable | Default coding model |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `openai/gpt-5.4` |
| Qwen (Alibaba China) | `DASHSCOPE_API_KEY` | `alibaba-cn/qwen3-coder-plus` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek/deepseek-chat` |
| Anthropic | `ANTHROPIC_API_KEY` | `anthropic/claude-sonnet-4.6` |
| Google Gemini | `GOOGLE_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` | `google/gemini-2.5-pro` |
| Moonshot/Kimi | `MOONSHOT_API_KEY` | `moonshotai/kimi-k2.7-code` |
| xAI | `XAI_API_KEY` | curated tool-capable Grok model |
| OpenRouter | `OPENROUTER_API_KEY` | configurable curated model |

Model defaults live in server configuration and may be overridden by non-secret environment variables. The list remains stable and curated rather than exposing thousands of models with inconsistent tool support.

Provider availability is calculated per request from server environment values. The client persists only `{ providerId, modelId }`; if the saved selection is no longer configured, it selects the first configured entry. If none are configured, all options remain visible and chat submit is disabled with setup guidance.

`ProviderConfigSource` is an internal seam with environment and in-memory test adapters.

### 8. AI SDK owns chat state; AI Elements owns AI rendering

`useChat` replaces the custom chat message/loading/stream simulation state. A `DefaultChatTransport` posts to `/api/chat`; `prepareSendMessagesRequest` adds the provider selection and workspace snapshot.

UI composition:

- `Conversation` for auto-scroll and stream layout;
- `Message` / `MessageResponse` for all model Markdown;
- `PromptInput` for input and submit state;
- `ModelSelector` for provider/model choices and disabled reasons;
- `Tool` for generic tool states;
- a small custom renderer for `finalize_changes` that opens the existing diff review;
- `Confirmation` only for tools that are explicitly approval-gated in future phases.

Install only the AI Elements components actually used. shadcn is initialized with `--base radix`; Base UI is not used because AI Elements depends on Radix-specific behavior.

### 9. State modules are separated by ownership

- AI SDK `useChat`: messages, streaming status, stop/regenerate and tool parts.
- `Workspace` module: files, revision, pending/accepted transactions and persistence.
- `EditorSession` store: open tabs, active file and editor/diff view.
- `Layout` store: panel visibility and sizes.
- `ChangeReview` store/reducer: current ChangeSet, file/hunk selection and navigation.
- Route loader/local query: public Provider catalog.

The editor no longer imports chat store actions. Chat no longer calls `useFs.getState()` or builds file maps. Both cross the Workspace interface, which becomes the shared test surface.

### 10. shadcn migration is incremental, not a visual rewrite

Create a canonical `components.json`, use the `new-york` style with Radix and Tailwind v4, and map existing theme semantics to shadcn tokens. Replace raw controls in touched flows first: Button, Input, Select/Popover, Dialog/AlertDialog, Tooltip, Badge, ScrollArea and Tabs.

Existing IDE layout and product identity stay recognizable. The change removes duplicated ad-hoc primitives and CSS boilerplate but does not redesign every screen in the same commit.

### 11. Security and failure behavior

- API keys are never prefixed with `VITE_`, serialized, logged or returned.
- `.env*`, private keys, credentials and binary files are excluded from Agent snapshots.
- All paths are POSIX-normalized; absolute host paths, `..`, NUL and duplicate normalized paths are rejected.
- Provider/model values are server allowlisted; clients cannot inject arbitrary model URLs.
- Hono applies same-origin expectations, request/body limits, request IDs and consistent typed errors.
- Mastra stream errors are sanitized before reaching the browser; server logs retain request ID but redact keys and file contents.
- Client abort stops model generation and destroys the run workspace.
- Agent has no shell, deployment, external write or arbitrary network tool in phase 1.
- Production authentication/rate limiting is an explicit prerequisite before exposing the app publicly to untrusted users.

### 12. Observability without premature persistence

Record structured server logs for request ID, provider/model ID, duration, finish reason, steps, token usage and error category. Never log prompts, file contents or keys by default.

Mastra traces may use in-memory/local development storage initially. Durable conversation memory and production trace storage are deferred until deployment/auth requirements are known. The browser continues to send the conversation history needed for each run.

## Module Layout

Target shape (names may be adjusted mechanically during implementation):

```text
src/
├── routes/
│   ├── __root.tsx
│   ├── index.tsx                 # client-only IDE route
│   └── api.$.ts                  # delegates to Hono
├── server/
│   ├── api/
│   │   ├── app.server.ts
│   │   ├── errors.ts
│   │   └── schemas.ts
│   ├── agent/
│   │   ├── coding-agent.server.ts
│   │   ├── instructions.ts
│   │   ├── run-workspace.ts
│   │   └── tools/
│   └── providers/
│       ├── catalog.server.ts
│       └── config.ts
├── modules/
│   ├── workspace/
│   │   ├── domain.ts
│   │   ├── workspace.ts
│   │   ├── repository.ts
│   │   ├── indexeddb-repository.ts
│   │   └── store.ts
│   ├── agent-chat/
│   ├── change-review/
│   ├── editor/
│   ├── preview/
│   └── layout/
├── components/
│   ├── ui/                       # shadcn source
│   └── ai-elements/              # selected registry source
└── test/
    ├── fixtures/
    └── mock-model.ts
```

## Migration Plan

### Phase 0: Establish a green baseline

- Fix current ESLint errors and React test warnings without changing behavior.
- Record build/test/bundle baselines.
- Add Node engine and CI commands that exit non-interactively.

### Phase 1: Framework vertical slice

- Migrate entry/config to TanStack Start.
- Render the existing IDE under a client-only route.
- Add Start `/api/*` delegation, Hono health route and Hono integration test.
- Confirm Monaco, Sandpack, worker, IndexedDB and import/export still function.

### Phase 2: Workspace transaction vertical slice

- Introduce snapshot/revision/hash/ChangeSet types and the single apply/undo interface.
- Add IndexedDB schema migration and in-memory test adapter.
- Route existing mock patch review through the new interface temporarily.
- Delete the duplicate patch application path only after parity tests pass.

### Phase 3: Provider and Agent vertical slice

- Add Provider catalog endpoint and disabled selector UI.
- Build RunWorkspace and Mastra tools.
- Test a complete Hono → Mastra mock model → tool result → ChangeSet stream without real keys.
- Add one real Provider smoke script that runs only when its key exists.

### Phase 4: AI UI migration

- Install selected shadcn and AI Elements sources.
- Replace custom message/loading/stream simulation with `useChat` and AI Elements.
- Connect terminal ChangeSet tool output to existing review UI.
- Remove production trigger/JSON patch matching.

### Phase 5: Cleanup and optimization

- Split `App` and large chat/editor views by module ownership.
- Lazy-load Monaco, Sandpack and heavy review UI.
- Remove dead stores/components/dependencies and normalize design tokens.
- Update README, `.env.example`, deployment instructions and architecture docs.

Every phase ends with lint, unit tests, integration tests and build. The app must remain runnable at phase boundaries; no big-bang branch that only works at the end.

## Testing Strategy

- Pure domain tests for snapshot hashing, normalization, ChangeSet preview/apply/undo, hunk selection and stale conflicts.
- Contract tests run against both IndexedDB and in-memory repository adapters.
- Provider tests verify the full catalog is always present, missing keys disable entries, invalid selections fail, and serialized responses contain no secrets.
- Tool tests verify read-before-write, path containment, output limits and final ChangeSet generation.
- Mastra tests use an AI SDK v6 mock model; CI never requires a paid key.
- Hono integration tests use `app.request()` for health, providers, malformed chat, disabled provider and streaming success.
- React tests verify disabled model options, no-provider empty state, stream cancellation, Markdown rendering and ChangeSet review handoff.
- A browser smoke test covers: load IDE → select configured mock provider → send request → receive tool/ChangeSet → accept → preview files update.
- Preserve the existing 100KB diff apply target below 500ms.
- Bundle assertion ensures `@mastra/*`, Hono and Provider code are absent from client output and Monaco/Sandpack remain split chunks.

## Risks / Trade-offs

- **TanStack Start migration surface**: router/build conventions change many files. Mitigation: first establish a framework-only vertical slice and keep IDE code behavior unchanged.
- **TanStack Start release maturity**: official docs still describe the line as release candidate. Mitigation: pin exact lockfile versions and avoid experimental RSC.
- **AI SDK latest mismatch**: installing `latest` would pull v7 while Mastra's documented transformer supports v6. Mitigation: explicit compatible majors and a stream contract integration test.
- **Provider capability variance**: some listed models may not reliably call tools. Mitigation: curated allowlist, per-provider tests where keys are available, and actionable disabled/error states.
- **Workspace payload cost**: full snapshots do not scale to large projects. Mitigation: strict limits and filters now; server-synced or client-tool workspaces can be a later capability.
- **Concurrent local edits**: a user can edit while an Agent is running. Mitigation: base revision and before-hash checks; never force overwrite silently.
- **Agent mutation safety**: model-written files are untrusted. Mitigation: shadow workspace, no shell/network, explicit review, path and size validation.
- **Public deployment abuse**: env-based provider keys would be spendable through an unauthenticated public endpoint. Mitigation: local/private use only until auth/rate limiting is implemented, or make those a deployment prerequisite.
- **Existing persistence semantics**: current autosave and `originalContent` behavior are implicit. Mitigation: schema migration, adapter contract tests and transaction-level inverse changes.

## Alternatives Considered

### Keep Vite and run a separate Mastra server

Rejected for the target state. It creates two processes, CORS/config duplication and a less cohesive developer workflow. It may be reconsidered only if frontend and Agent need independent scaling.

### Use TanStack Start Server Routes without Hono

Technically sufficient, but rejected because Hono was requested and provides a clean, directly testable API transport module. Start remains the outer runtime while Hono owns API concerns.

### Use AI SDK `ToolLoopAgent` without Mastra

Rejected because the requested architecture includes Mastra, and Mastra adds request context, model routing, tool orchestration and an upgrade path to memory/workflows/observability. AI SDK remains the stream/UI contract rather than duplicating the Agent layer.

### Expose Mastra's complete generic server API

Deferred. It exposes a broader surface than the product needs. Phase 1 publishes only the Hono endpoints required by the UI; Studio/management endpoints can be enabled behind authentication in development or a later change.

### Persist projects and Agent workspaces on the server immediately

Deferred because it requires auth, tenancy, storage migrations and a product decision about data ownership. The browser-authoritative snapshot model is sufficient for the current single-user application.

### Let users paste API keys into browser settings

Deferred by default. It either exposes keys to browser storage or requires encrypted server persistence and authentication. Environment-only secrets are the safer first implementation.

### Install AI Elements `all.json`

Rejected. It would add dozens of unused source components and dependency conflicts. Only selected components are installed.

## Implementation Verification

Final verification on 2026-07-12:

- `pnpm check` passes: typecheck, ESLint, 22 test files / 117 tests, client build, SSR build, Nitro Node build and prerender.
- The deterministic Hono → Mastra → AI SDK v6 mock stream covers successful read/write/finalize, terminal stop, 12-step incomplete runs, tool failures and request abort; browser-surface tests cover finalized output → review → apply/undo/reject/conflict recovery → preview workspace state.
- Snapshot tests cover common credential stores plus independent server-side file-count and byte limits; Workspace tests cover both Agent/editor concurrency orderings and durable reset ordering.
- The 100KB diff parse/apply case completed in under 7ms against the 500ms target.
- The production Node server served `/`, `/api/health` and all eight public Provider descriptors from `/api/providers`.
- Production client output contains no Mastra, Hono, ProviderCatalog, structured Agent log identifiers or Provider key variable names.
- Final raw client chunks: application 904.17KB (274.31KB gzip), Sandpack 962.92KB (269.81KB gzip), Radix 162.60KB (47.95KB gzip), shared vendor 130.18KB (40.98KB gzip), CSS 96.47KB (16.68KB gzip). EditorPane, PreviewPane, EditorDiffView and Monaco remain split activation chunks.
- Compared with the baseline, Sandpack/vendor remain effectively flat; the application chunk grows because AI Elements adds streamed Markdown/reasoning/tool rendering, while heavy IDE surfaces are now independently lazy-loaded.
- `pnpm smoke:provider` is intentionally opt-in and paid; it was syntax-checked but not executed without a configured real key.

## Open Questions / Defaults Requiring Confirmation

1. **Key 管理**：默认采用服务端 `.env.local` / deployment secrets，只在 UI 展示配置状态；不提供浏览器内录入 key。若必须在 UI 配置，需要另立“认证 + 加密存储”范围。
2. **部署目标**：默认按通用 Node.js 22.13+ server output 实现。若目标是 Vercel、Cloudflare、Docker 或自建 Node，需要在实施前确定 adapter 和流式超时约束。
3. **Provider 首批目录**：默认采用本文 8 个 Provider，并只展示每家少量适合工具调用的模型。可以删减，但不建议直接展示 Mastra 的全部模型目录。

## References

- [TanStack Start SPA mode](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)
- [TanStack Start Server Routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes)
- [TanStack Start environment variables](https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables)
- [Mastra `handleChatStream()`](https://mastra.ai/reference/ai-sdk/handle-chat-stream)
- [Mastra model providers](https://mastra.ai/models)
- [Mastra Hono adapter reference](https://mastra.ai/reference/server/hono-adapter)
- [AI SDK v6 migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)
- [AI Elements](https://ai-sdk.dev/elements)
- [shadcn/ui](https://ui.shadcn.com/docs)
