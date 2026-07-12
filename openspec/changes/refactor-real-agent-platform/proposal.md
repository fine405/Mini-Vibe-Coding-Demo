# Change: 重构为真实的全栈 Agent 编程平台

## Why

当前应用是一个纯浏览器 Vite SPA，聊天响应、代码补丁和流式效果均为本地模拟。它没有服务端安全边界、真实模型调用、Agent 工具循环、Provider 配置状态或可靠的工作区事务；聊天、补丁审查和文件写入还分散在多个 UI 模块中，无法安全地直接接入 LLM。

本次变更将应用迁移到 TanStack Start，并以 Hono 承载同源 API、Mastra 承载 Agent 编排、AI SDK v6 承载流协议、AI Elements + shadcn/ui 承载 AI 交互界面。核心原则是：Agent 可以在隔离副本中真实地读取、搜索和修改代码，但只能提交待审查的 ChangeSet，不能绕过用户确认直接修改浏览器工作区。

## What Changes

- **BREAKING**：从静态 Vite SPA 迁移为需要 Node.js 22.13+ 的 TanStack Start 全栈应用；生产环境不再能只部署静态文件。
- **BREAKING**：移除生产聊天中的 trigger-to-patch 模拟路径，改为 Mastra 多步 Agent；本地 JSON patch 仅保留为测试夹具或显式开发模式。
- **BREAKING**：以版本化 `WorkspaceSnapshot` / `WorkspaceChangeSet` 取代散落的 `Patch`、`originalContent` 和两套补丁应用流程。
- TanStack Start 负责应用路由、客户端壳和服务端入口；IDE 主路由使用 client-only/SPA 渲染以隔离 Monaco、Sandpack 和 IndexedDB。
- TanStack Start 的 `/api/*` 通配 Server Route 将标准 `Request` 转交给 Hono，保持单进程、同源部署。
- Hono 提供 Provider 状态、Agent 流式聊天、健康检查、输入校验、请求取消、错误清洗和请求体限制。
- Mastra 提供动态模型路由、真实工具调用循环、运行级上下文和可观测性；Agent 在请求级工作区副本中操作。
- AI SDK 固定使用 v6 流协议，客户端使用 `useChat`，服务端使用 Mastra 的 AI SDK v6 transformer；暂不升级 AI SDK v7，直到 Mastra 官方流转换器支持 v7。
- AI Elements 按需引入 `conversation`、`message`、`prompt-input`、`model-selector`、`tool`、`confirmation` 等组件；所有 AI 文本均使用其 Markdown 渲染能力。
- shadcn/ui 使用 Radix 基座和 Tailwind CSS v4，建立 `components.json`、统一主题 token，并逐步替换手写基础控件。
- 内置 Provider 目录默认展示 OpenAI、Qwen（Alibaba China）、DeepSeek、Anthropic、Google Gemini、Moonshot/Kimi、xAI、OpenRouter；没有服务端 key 的 Provider 保持可见但禁用。
- API key 默认只从服务端环境变量读取；客户端只接收 `configured: boolean` 和公开模型元数据，不接收或持久化 key。
- 工作区仍由浏览器 IndexedDB 持有；聊天请求发送经过过滤和限额的文本快照，服务端只创建请求级隔离副本。
- Agent 的文件工具至少包括 list/read/search/write/delete/finalize；write/delete 只作用于运行副本，`finalize` 产生 ChangeSet。
- ChangeSet 携带 base revision 和逐文件 hash；应用时检测陈旧修改，冲突时停止而不是覆盖用户新编辑。
- 合并文件系统、补丁、diff review 的写入路径为一个深 `Workspace` 模块接口，并对接口行为做契约测试。
- 修复现有 lint 基线和 React 测试警告，增加 Provider、Hono、Agent 工具、流协议和 ChangeSet 冲突的集成测试。
- 对 Monaco、Sandpack 和重型 diff UI 做路由/组件级懒加载，确保 Mastra 和 Provider SDK 不进入客户端 bundle。

## Impact

- Affected specs: `application-runtime`（新增）、`provider-configuration`（新增）、`agent-execution`（新增）、`workspace-change`（新增）；现有 `chat`、`editor`、`file-tree`、`preview` 行为需要在迁移中保持兼容。
- Affected code: `package.json`、Vite/TanStack Start 配置、应用入口、`src/routes/`、新增 `src/server/`、`src/modules/chat/`、`src/modules/fs/`、`src/modules/patches/`、`src/modules/editor/`、UI 组件和测试。
- Runtime: Node.js 22.13+；当前开发机 Node.js 24.14.0 满足要求。
- Deployment: 需要支持流式 `Response` 的 Node 运行时；静态 CDN 只能承载客户端资源，不能独立运行 Agent API。
- Data migration: 现有 IndexedDB 文件数据继续保留，并在首次加载时迁移到版本化 workspace schema；不引入服务端项目数据库。
- Security: key 保持 server-only；Agent 无 shell/网络/真实文件系统权限；工作区路径、文件类型、数量和大小均经过服务端校验。

## Approval Gate

该变更只定义方案和验收标准。实现必须在本 proposal、design 和 tasks 经用户确认后开始。
