## Context

应用已使用 Mastra `handleChatStream({ version: "v6" })` 产生 AI SDK UI message stream，客户端 `ChatPane` 按 part 顺序渲染 text、reasoning 和 Tool。`json-render` inline mode 正好在这条流上工作：模型在普通文本中输出 fenced JSONL patches，`pipeJsonRender` 将它们拆成 `data-spec` parts，非文本 part 原样通过。

项目已有 React 19.2、Tailwind 4、shadcn/AI Elements 和 `@streamdown/mermaid`，因此不需要 iframe、morphdom、自定义 HTML runtime 或 `@json-render/shadcn` 全量组件。项目根依赖目前是 Zod 3.25，而 json-render core 0.19 的 peer contract 是 Zod 4；AI SDK 6 与 Mastra 1 的当前 peer ranges 同时接受 Zod 4。

## Goals / Non-Goals

### Goals

- 在同一 Assistant 消息中保持 text、reasoning、Tool 和生成式 UI 的真实流顺序。
- 使用十个小而可组合的组件覆盖布局、指标、表格、图表、流程和基础本地交互。
- 复用现有 UI tokens、AI message rendering 和 Mermaid plugin，避免平行设计系统。
- 让无效或不完整 spec 局部失败，不能吞掉普通文本或破坏 ChangeSet review。
- 保持生成式 UI 与 Workspace、IndexedDB、Sandpack Preview 完全隔离。

### Non-Goals

- 不运行模型生成的 HTML、CSS、JavaScript、React code 或远程组件。
- 不用生成式 UI 代替工作区应用预览、ChangeSet 审核或现有 Research citations。
- 不开放表单提交、任意 fetch、任意 URL 导航、文件写入、部署或宿主操作。
- 第一阶段不提供 Pie/Area/Scatter、Tabs、Select、3D、图片或任意 CSS props。
- 不保证复刻 `pi-generative-ui` 的任意 Canvas/WebGL 表达自由度。

## Decisions

### 1. 使用 json-render inline mode，不新增 `show_widget` Tool

Agent instructions 追加 `catalog.prompt({ mode: "inline" })`，并规定只有当结构化 UI 明显提升表达时才输出 spec。服务端在现有 Mastra stream 转成当前 AI SDK chunk 后调用 `pipeJsonRender`：

```text
Mastra v6 stream
  -> toCurrentAiStream
  -> pipeJsonRender
  -> withIncompleteRunState
  -> createUIMessageStreamResponse
```

`pipeJsonRender` 只转换 fenced JSONL 文本；Tool、reasoning、metadata 和结束状态继续通过。相比把 JSONL 再包进 Tool string 参数，这避免双重转义、额外协议和 partial tool input 修复逻辑。

Coding 请求仍以 `finalize_changes` 为终点。Catalog prompt 明确要求：文件修改任务依赖现有 ChangeSet/Sandpack 表面，不额外生成 spec；生成式 UI 主要服务于 read-only 解释和 Research 结果。

### 2. Catalog 是唯一输出边界

Catalog 固定提供：

| Component | Scope |
|---|---|
| `Stack` | horizontal/vertical、固定 gap/align |
| `Grid` | 1–4 列、固定 gap，窄屏自动单列 |
| `Card` | title/description/tone 与 default slot |
| `Text` | plain text 与受限 typography variant/tone |
| `Metric` | label/value/detail/trend |
| `DataTable` | 最多 10 列、100 行、primitive cell |
| `Chart` | bar/line、最多 100 点和 4 个 series |
| `Button` | label/variant/disabled 与 press event |
| `Timeline` | 最多 30 个垂直节点与受限 status |
| `MermaidDiagram` | 受限 diagram source 与可选 title |

所有 props schema 都拒绝 `className`、`style`、raw HTML、formatter function 和任意 component name。布局响应式、颜色、图表 palette 和空状态由 Registry 决定。

### 3. 复用本地组件，按需引入 Recharts

Registry 使用项目现有 `Button`、`Badge`、AI message typography 和 Tailwind theme tokens。Stack/Grid/Card/Table/Metric/Timeline 都是薄的语义 React renderer，不引入第二份 shadcn registry。

Chart 使用 Recharts 的 accessible SVG primitives。一个 `Chart` Catalog 类型通过 `type: "bar" | "line"` 选择两个固定 renderer，共享数据清洗、palette、tooltip 和坐标轴策略。数据超过上限时在渲染前截断，模型不能注入 formatter 或 CSS。

### 4. Mermaid 复用 Streamdown plugin 并加输入策略

`MermaidDiagram` 复用现有 `@streamdown/mermaid`，其默认配置已使用 Mermaid `securityLevel: "strict"`。Registry 通过现有 `MessageResponse`/Streamdown diagram path 渲染 fenced Mermaid source，不自行维护 SVG sanitizer。

在进入渲染器前额外执行纯输入校验：

- 源码最多 20 KiB；
- 第一条有效语句必须是 `flowchart`、`sequenceDiagram`、`stateDiagram-v2`、`classDiagram` 或 `erDiagram`；
- 拒绝 `%%{...}%%` init directive；
- 拒绝 `click`、可执行 callback、显式外部 href/link 和 HTML tags；
- 失败时显示受控错误，不把未信任源码插入 DOM。

SpecStream 只在完整 JSONL patch 行解析成功后产生 `data-spec`，因此 Mermaid 不消费 token 级半截字符串。客户端更新额外 debounce 只在实际测试证明有重复 patch 抖动时添加。

### 5. Action 只修改 Renderer 内部状态

Catalog 只声明 `setState({ statePath, value })` 和 `toggleState({ statePath })`。ActionProvider handlers 只能调用 json-render 的本地 state API；它们不持有 Workspace、fetch、router 或 window navigation 能力。

Button 通过标准 `on.press` 绑定 action。未知 action、无效路径或无效参数由 Catalog validation/renderer fallback 拒绝，不能向外部系统升级权限。

### 6. 客户端按 part 顺序插入一次聚合 Renderer

`useJsonRenderMessage(message.parts)` 从同一 Assistant message 的全部 `data-spec` patches 构造当前 spec。`ChatPane` 在第一条 `data-spec` part 的位置插入一个 Renderer，后续 patch 只更新该实例；这样 spec 前后的普通文本与 Tool 仍保持真实顺序，也不会为每个 patch 重复渲染完整 UI。

历史消息只依赖其持久化 parts 重建 spec，不新增第二份生成式 UI store。Text-only message 没有 `data-spec` 时不挂载 Provider/Renderer。

### 7. 版本固定并迁移到 Zod 4

固定 `@json-render/core` 与 `@json-render/react` 为 `0.19.0`，用一层本地 `generative-ui` 模块隔离其 0.x API。根 Zod 升至兼容 AI SDK/Mastra peer range 的 4.x，并修正现有 `z.record(valueSchema)` 为 Zod 4 的显式 key/value 形式。

升级后必须运行完整 `pnpm check`；若 Mastra Tool schema 或 message validation 出现兼容问题，则停止实现并回退依赖变更，而不是使用 peer override 隐藏不兼容。

### 8. Suggestions 只负责发现和填充

空对话页的 Suggestions 使用 `Starter` 与 `Generative UI` 两个 Tab。Starter 保留现有三条 coding Prompt 并增加三条同类变体；Generative UI 提供六条典型只读 Prompt。两个 Tab 都每次显示三条，并通过刷新入口在两组之间循环。Prompt 优先组合多个 Catalog 组件，其中 Mermaid 保留独立的架构/流程用例以提高模型输出稳定性。

Suggestion click 不复用 AI Elements 文档中的直接 `sendMessage` 示例。它只更新当前 composer textarea、调用 `focus()` 并把 selection range 放到字符串末尾；提交仍必须由用户显式按 Enter 或点击 Submit 触发。刷新与 Tab 切换只改变 Suggestions，不覆盖当前 draft。

## Risks / Trade-offs

- json-render 仍是 0.x → 固定精确版本，将调用集中到 Catalog、stream adapter 和 Renderer 三处。
- Catalog prompt 增加每次请求的 system tokens → 保持十个组件与短示例，不引入全量 shadcn catalog。
- 模型可能生成 malformed patch → 依赖 SpecStream parser，UI fallback 局部失败，普通消息继续呈现。
- Recharts 增加客户端体积 → 只在实际出现 `data-spec` 时懒加载 Generative UI renderer，并在 build 中检查 chunk。
- Mermaid SVG 仍来自第三方 parser → 复用 strict mode，加前置语法 allowlist，禁止外链和 init directive。
- `finalize_changes` 会终止 coding run → 生成式 UI 不承担 coding 结果表面，避免改变现有终止语义。
- Prompt 文本较长可能挤压空状态 → 每次只显示三条，按钮允许多行截断以外的完整文本，并让容器继续滚动。

## Migration Plan

1. 升级/安装固定依赖并先跑 Zod/类型测试。
2. 实现 Catalog、输入限制和纯测试。
3. 实现 Registry/Renderer 与组件测试。
4. 接入 server stream transform 和 Agent prompt。
5. 接入 ChatPane part 渲染与真实顺序测试。
6. 运行 `pnpm check` 和 bundle inspection；失败可移除新模块和依赖，现有消息协议不需要数据迁移。
