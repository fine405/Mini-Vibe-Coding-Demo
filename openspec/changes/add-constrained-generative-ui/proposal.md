# Change: 增加受约束的流式 Generative UI

## Why

当前聊天只能显示 Markdown、reasoning、工具状态和 ChangeSet 审核。对于数据对比、研究结果、流程说明和交互式解释，模型只能退化为长文本，无法在同一条消息中选择合适的结构化界面。

本变更使用 Vercel Labs `json-render` 的 Catalog、JSONL SpecStream 和 React renderer，让模型只组合应用批准的组件与本地动作。它不执行模型生成的 HTML/JavaScript，也不替代 Sandpack：聊天内的临时结构化界面使用 json-render，真正的任意应用代码仍写入工作区并由现有 Preview 执行。

## What Changes

- 固定引入 `@json-render/core@0.19.0` 和 `@json-render/react@0.19.0`，以 AI SDK v6 inline mode 将 fenced JSONL patch 转为 `data-spec` message parts。
- 新增 10 个受控组件的 Catalog 与 React Registry：`Stack`、`Grid`、`Card`、`Text`、`Metric`、`DataTable`、`Chart`、`Button`、`Timeline`、`MermaidDiagram`。
- Catalog 自动生成模型输出协议；模型仅在结构化界面明显优于文本时生成 spec，文本-only 回答、reasoning 和现有 Tool parts 保持原行为。
- 复用项目现有 shadcn/AI Elements 组件与 Tailwind tokens；图表复用 Recharts；Mermaid 复用现有 `@streamdown/mermaid` 严格模式。
- 只开放本地 `setState` 和 `toggleState` action，不开放任意网络、导航、HTML、脚本或工作区写入。
- Mermaid 只允许批准的图类型，拒绝 init directive、click/link callback、HTML label 和超长源码；无效图表降级为可读错误而不影响消息其余内容。
- 将根依赖迁移到 Zod 4，以满足 json-render peer contract；同步调整现有少量 Zod 3 record schema 并运行完整兼容性验证。
- 增加 Catalog 校验、Mermaid 输入策略、stream transform、Renderer 和 ChatPane 消息排序测试。
- 在空对话 Suggestions 区增加 `Starter` / `Generative UI` Tab、可轮换的典型 Prompt，以及只填充 Composer、不自动发送的选择行为。

## Impact

- Affected specs: `generative-ui`（新增）。
- Affected code: `package.json`、`pnpm-lock.yaml`、`src/server/agent/`、`src/modules/chat/ChatPane.tsx`、Chat suggestions UI、新增 `src/modules/generative-ui/` 及相关测试。
- Dependencies: 新增 `@json-render/core`、`@json-render/react`、`recharts`；Zod 从 3.x 升至 4.x；不引入 `@json-render/shadcn` 全量组件包。
- Runtime: 继续使用现有 AI SDK v6 `UIMessage` stream，无新 API route、数据库、iframe 或代码执行 runtime。
- Security: 模型输出只能引用 Catalog 中的类型、props 和 action；生成式 UI 不能读取或修改浏览器 Workspace，也不能发起网络请求。

## Approval

用户于 2026-07-16 在确认初始组件集并追加 `Timeline`、`MermaidDiagram` 后明确要求“开始实现”，并要求优先复用 Vercel json-render 或其他开源能力。本 proposal 按该已批准范围执行。

用户随后于 2026-07-16 明确要求在 Chat Suggestions 增加 Starter / Generative UI Tab、典型 Prompt、刷新入口，并规定点击 Suggestion 只能填充输入框并将光标聚焦到末尾，不得触发发送。本 follow-up 按该已批准范围继续执行。
