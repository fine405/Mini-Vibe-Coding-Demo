# Change: 为 Agent 增加 Web Search、Weather Search 与可审计引用

## Why

当前 Coding Agent 只能操作请求级虚拟工作区，无法查询实时网页和天气信息，也无法让用户核对外部事实的原始来源。

本变更先增加两个用途明确、只读且上游固定的 Research 工具。来源会随真实 Tool part 出现在消息时间线中，并在回答末尾聚合为可悬停、聚焦和点击查看的 citation 列表。

## What Changes

- 新增 `web_search`：通过 Tavily basic search 查询通用网页，使用服务端 `TAVILY_API_KEY`，单次最多返回 5 条结果。
- 新增 `weather_search`：通过 Open-Meteo geocoding + forecast API 返回一个地点的当前天气和最多 7 天预报，并显示 CC BY 4.0 署名。
- 两个工具返回统一、受 Zod 校验且有大小上限的 `sources`，包含标题、原始 URL、可选 favicon 和摘要。
- 复用现有 AI SDK v6 Tool parts；`web_search` 返回后立即在 Tool 卡片中展示真实来源，使来源在最终回答生成前即可审计。
- 在每条 Assistant 回答末尾聚合、规范化并去重来源，显示 “N sources” 入口；hover、键盘 focus 或点击入口时展示标题、域名、摘要和安全原文链接。
- 更新 Agent 指令：时效性和外部事实使用 Research 工具；仅引用工具真实返回的 URL；搜索内容视为不可信数据；纯研究请求不调用 `finalize_changes`。
- 增加固定上游、服务端密钥、超时、取消、输入/输出上限、无自动计费重试和脱敏错误。
- 更新 `.env.example`、README 和不依赖真实 Key/网络的确定性测试。

## Impact

- Affected specs: `web-research`（新增）。
- Affected code: `src/server/agent/`、`src/server/api.ts`、`src/modules/agent-chat/`、`src/modules/chat/`、AI Elements citation UI 和配置文档。
- External services: Tavily、Open-Meteo。
- Security: Agent 仍无任意网络能力；服务端只能访问两个固定上游，外部内容不能提升为指令。
- Licensing: Open-Meteo 免费 API 仅适用于本地/受控非商业阶段并要求 CC BY 4.0 署名；商业部署必须改用其商业 endpoint 或其他天气数据源。
- Dependencies: 使用 Node.js 原生 `fetch` 和现有 Zod/Mastra/AI SDK；citation UI 复用现有 AI Elements/shadcn 基础设施。

## Approval

用户于 2026-07-16 明确将第一阶段收窄为 `web_search` 和 `weather_search`，并要求实现流式来源展示及回答末尾 citation 聚合交互。本 proposal 按该批准范围执行。
