# Project Context

## Purpose

Mini Lovable Agent Studio 是一个浏览器内的 AI 编程工作台：真实 coding Agent、文件树、Monaco 编辑器、Sandpack 实时预览与 console 运行在同一个 TanStack Start 应用中。浏览器工作区是权威数据源；Agent 只能修改请求级 shadow workspace，并通过待审核 ChangeSet 提交结果。

## Tech Stack

- TypeScript 5.9、React 19、TanStack Start、Vite 8、Nitro Node runtime
- Hono 4、Mastra 1、AI SDK 6 / `@ai-sdk/react` 3
- AI Elements、shadcn/ui Radix base、Tailwind CSS 4
- Zustand、Immer、IndexedDB
- Monaco、Sandpack、`diff`
- Vitest、Testing Library、jsdom

运行时要求 Node.js `>=22.13.0`，包管理器为 pnpm。

## Architecture

- `src/routes/`：Start 文档壳、client-only IDE 路由、`/api/*` catch-all。
- `src/server/providers/`：server-only Provider allowlist 与环境配置。
- `src/server/agent/`：Mastra coding Agent、工具和 request-scoped `RunWorkspace`。
- `src/modules/workspace/`：snapshot / preview / atomic apply / undo 深模块。
- `src/modules/agent-chat/`：Provider 选择、hunk selection 与 ChangeSet review。
- `src/modules/chat/`：AI SDK `useChat` 与 AI Elements 渲染。
- `src/modules/fs/`：浏览器虚拟文件系统和 v2 IndexedDB 持久化。

## Domain Rules

### Workspace

- 浏览器文件和 IndexedDB 是权威项目状态；服务端不持久化项目。
- Agent 快照带 deterministic revision 与逐文件 hash，并过滤 secret、binary、blocked/oversized paths。
- ChangeSet 支持 create/update/delete；应用前先验证全部选择，任何冲突都必须原子失败。
- UI 不得直接拼装替换文件 map；变更只能通过 `Workspace.apply()`，撤销通过 transaction ID。

### Agent

- 每次请求创建隔离 `RunWorkspace`。
- 工具为 list/read/search/write/delete/finalize；现有文件必须 read-before-write/delete。
- 没有 shell、任意网络、部署、宿主文件系统工具。
- `finalize_changes` 只产生待审核 ChangeSet，不能直接提交浏览器工作区。
- 默认最多 12 步，客户端停止和 120 秒超时均通过 abort signal 传入模型执行。

### Providers

- OpenAI、Qwen、DeepSeek、Anthropic、Google、Moonshot、xAI、OpenRouter 始终出现在公开目录。
- Key 默认从服务端环境按请求读取；线上访问者演示只允许 DeepSeek/Tavily Key 在当前 Chat Agent 页面内存中短暂保存，并随使用它的单次 Chat 请求传输，不得持久化或回显。
- 公开 API 只能返回 `configured`、缺少的变量名和公开模型描述；模型 ID 必须通过服务端 allowlist。
- 浏览器只持久化 Provider/模型 ID；演示 Key 刷新、离开页面或退出 Chat Agent 后不得恢复。

## Conventions

- 使用 `@/` 绝对导入；组件 PascalCase，函数/变量 camelCase。
- shadcn/AI Elements registry 源码保留在 `src/components/`，不使用 `@ts-nocheck`。
- 领域测试与源码 colocate；`pnpm check` 依次运行 typecheck、lint、test、build。
- Provider key、prompt 和文件内容默认不得写入日志；结构化日志只记录请求 ID、Provider/模型、时长、步骤、usage 和错误类别。

## Deployment and Security

- `pnpm build` 输出 Nitro Node server 到 `.output/server/index.mjs`，`pnpm start` 启动。
- 公开互联网部署前必须增加认证、用户级限流和配额；当前阶段面向本地或受控可信环境。
- 保持同源 API，拒绝显式 cross-site 请求；聊天请求和 Agent 快照有独立大小限制。
- 线上优先使用托管平台的服务端 Secret；页面演示 Key 只能通过 HTTPS 使用，并应专用、低额度、可撤销且在演示后轮换。
