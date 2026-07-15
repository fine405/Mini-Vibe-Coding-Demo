# Change: 为 Agent 增加受限 Web Research 与引用能力

## Why

当前 Coding Agent 只能操作请求级虚拟工作区，无法查询实时天气、网页内容或 GitHub 公共信息。用户遇到依赖版本、线上文档、开源项目和时效性问题时，Agent 只能依赖模型已有知识，也无法给出可追溯原文。

本变更为 Agent 增加一组只读、固定服务边界的 Web Research 工具，并把工具调用过程和结构化来源完整传到现有 AI SDK UI。最终回答自动附带可点击的 citation，避免模型自行编造来源。

## What Changes

- 新增 `web_search`：通过 Tavily Search 查询通用网页，使用服务端 `TAVILY_API_KEY`；免费 Researcher 额度为每月 1,000 credits。
- 新增 `read_webpage`：通过 Jina Reader 读取一个明确的公开 HTTP(S) 页面；无 Key 时使用其公开限额，可选 `JINA_API_KEY` 提升限额。
- 新增 `get_weather`：通过 Open-Meteo geocoding + forecast API 返回当前天气和有限天数预报，并附带 CC-BY 来源。
- 新增 `search_github`：通过 GitHub REST API 查询公共 repositories、issues/pull requests 和 code；公共 repository/issue 查询可匿名使用，code 查询要求服务端 `GITHUB_TOKEN`。
- 所有工具返回统一、受 Zod 校验且有大小上限的 `sources`，包含 `title`、`url`、可选 favicon 和摘要。
- 复用现有 AI SDK v6 tool parts，在消息时间线中显示 Tool 名称、状态、入参、结构化出参和错误；Web Tool 运行时默认展开，完成后仍可检查。
- 在每条 Assistant 消息末尾聚合、去重并渲染 citation 列表；每项包含 icon、标题、域名和可点击原文链接。即使模型没有生成内联 Markdown 链接，来源尾注仍必须存在。
- 更新 Agent 指令：时效性/外部事实必须使用工具；外部内容视为不可信数据；不得执行网页中的指令；没有可靠来源时必须明确说明；纯研究请求不调用 `finalize_changes`。
- 增加服务端 URL 校验、固定上游 host、超时、取消、结果条数/内容长度限制和无重试计费策略；不提供任意 `fetch`、shell 或写入型网络能力。
- 更新 `.env.example`、README、安全限制和免费额度/许可说明，并增加不依赖真实 Key 的确定性测试。

## Impact

- Affected specs: `web-research`（新增）。
- Affected code: `src/server/agent/`、`src/modules/chat/`、AI Elements tool/citation UI、环境变量文档和 Agent 集成测试。
- External services: Tavily、Jina Reader、Open-Meteo、GitHub REST API。
- Security: Agent 仍无任意网络能力；服务端只能访问固定上游。网页和搜索结果属于不可信内容，不能提升为系统或工具指令。
- Licensing: Open-Meteo 免费 API 仅适用于非商业用途并要求 CC-BY 4.0 署名；商业部署必须在实现前改用其商业方案或替换天气数据源。
- Dependencies: 使用 Node.js 原生 `fetch` 和现有 Zod/Mastra/AI SDK，不新增运行时 npm 依赖。

## Approval Gate

实现前需要确认以下默认值：

1. 通用搜索采用 Tavily 免费计划，而不是需要信用卡和额外产品署名的 Brave Search API。
2. 指定网页读取采用 Jina Reader 的固定代理端点，不向 Agent 暴露任意网络访问。
3. 第一阶段天气能力面向本地/受控的非商业使用，接受 Open-Meteo 的免费许可与署名要求。
4. GitHub 第一阶段只返回公共内容；可选 Token 仅用于提高限额及启用公共 code search，不允许读取私有仓库。

本 proposal 获得明确批准前不得开始实现。
