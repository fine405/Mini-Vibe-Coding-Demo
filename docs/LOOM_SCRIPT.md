# Generative UI Interview Demo（5 分钟）

这份脚本同时适用于现场面试和 Loom 录屏。主线只演示一个能力：模型如何在不执行生成代码的前提下，把流式回答组合成受约束、可交互的界面。

## 1. 演示前验证

> 当前验收状态（2026-07-16）：Generative UI 专项 5 个测试文件、37 个测试通过，`/api/health` 正常且已有 configured Provider。当前工作树的完整 `pnpm check` 被并行开发中的 `src/App.test.tsx` 阻塞：测试期望 `file-tree-panel` 的折叠实现，但 `App.tsx` 尚未接入该 panel。面试前必须先让这项测试通过并重新运行完整检查。

### 前一天：完整验证

```bash
pnpm install --frozen-lockfile
pnpm check
```

预期结果：typecheck、lint、全部 Vitest 测试以及 client/SSR/Nitro production build 均通过。

运行 Generative UI 的重点测试：

```bash
pnpm vitest run \
  src/modules/generative-ui/catalog.test.ts \
  src/modules/generative-ui/mermaid-policy.test.ts \
  src/modules/generative-ui/GenerativeUIRenderer.test.tsx \
  src/modules/generative-ui/stream.test.ts \
  src/modules/chat/ChatPane.test.tsx
```

这些测试分别证明：组件白名单和数据上限、Mermaid 安全策略、bar/line 与本地交互、JSONL stream 转换，以及消息中 text/Tool/spec 的顺序。

### 现场前 10 分钟：运行检查

```bash
pnpm dev
```

另开终端：

```bash
curl --fail http://localhost:3000/api/health
curl --silent http://localhost:3000/api/providers \
  | jq '[.providers[] | select(.configured) | {id, defaultModelId}]'
```

确认：

- `/api/health` 返回 `"ok": true`；
- 至少一个 Provider 显示为 configured；
- 浏览器打开 `http://localhost:3000`，页面不是空白，没有 Vite error overlay；
- DevTools Console 没有 error；
- 模型选择器中的目标模型可用；
- 屏幕共享前关闭 `.env.local`、终端历史和所有 Key 管理页面。

不要把第一次真实请求留到面试现场。提前成功运行一次下面的固定数据 Prompt，并录一段 30 秒无声备份视频。

## 2. 主演示脚本

### 0:00–0:35：问题与选择

操作：快速展示 Chat、Editor 和 Preview 三个区域。

话术：

> 这是一个浏览器内 AI 编程工作台。原本回答只能显示 Markdown 和工具状态。我要解决的问题是：研究数据、对比结果和流程说明怎样在聊天里变成真正合适的界面，同时又不执行模型生成的 React、HTML 或 JavaScript。

> 我选择了 Vercel Labs json-render。模型输出受 Catalog 约束的 JSON patch，应用只渲染自己注册过的 React 组件。任意应用代码仍然走现有 Workspace、ChangeSet 审核和 Sandpack Preview，两条边界不会混在一起。

### 0:35–1:05：解释流式链路

话术：

> 服务端保留现有 Mastra 和 AI SDK v6 流。json-render 只把 fenced JSONL spec 转成 `data-spec` parts，text、reasoning 和 Tool parts 原样通过。客户端在第一条 spec part 的真实位置挂载一次 Renderer，后续 patch 更新同一个界面。

可以口述这条链路：

```text
Mastra stream
  → AI SDK UIMessage stream
  → pipeJsonRender
  → data-spec parts
  → ChatPane 聚合
  → Catalog Registry Renderer
```

### 1:05–2:25：固定数据 Generative UI

把下面 Prompt 原样粘贴。它不依赖搜索服务，最适合现场演示：

```text
这是只读讲解任务，不要修改工作区。请先用一句话总结，然后使用生成式 UI 创建一个紧凑的“发布准备度”看板。

只能使用下面的数据，不得补充、推测或改写数字：
- 指标：Build 92，Tests 87，UX 76
- 模块：Editor=ready，Preview=ready，Chat=review
- 趋势：Mon=68，Tue=74，Wed=81，Thu=87
- 时间线：Inspect=completed，Implement=completed，Verify=current，Release=upcoming
- 流程：User Request → Agent → Spec Stream → Safe Renderer

界面必须包含 Metric、DataTable、bar Chart、Timeline 和 MermaidDiagram。再加入一个 Button，通过 toggleState 显示或隐藏一段 Text 详情。保持界面紧凑。
```

边等待边解释：

> 这里流出来的不是可执行 UI 代码，而是 Catalog 允许的结构。普通文本先出现，完整 JSONL patch 被转换后，界面在同一条消息中渐进更新。

预期观察：

- 原始 `spec` 代码围栏和 JSONL 不出现在聊天里；
- 一句话总结仍按普通 Markdown 显示；
- 看板包含指标、表格、柱状图、时间线和流程图；
- 点击 Button 只切换生成界面的详情，不修改文件树或 Preview；
- 消息重新渲染时，完整 spec 直接从当前 message parts 重建，不维护第二份 UI store。

### 2:25–3:05：展示本地交互边界

操作：连续点击详情 Button，再展示文件树和 Preview 没有变化。

话术：

> ActionProvider 只开放 `setState` 和 `toggleState`。handler 只拿到 Renderer 内部 state，没有 Workspace、router、fetch 或 IndexedDB 能力。即使模型请求导航、网络或文件修改，运行时 sanitizer 也会移除。

### 3:05–3:50：展示安全和失败降级

打开以下三个文件，停留在关键位置：

1. `src/modules/generative-ui/catalog.ts`：十个组件和严格 Zod schema；
2. `src/modules/generative-ui/spec-policy.ts`：只保留 Button 的本地 action；
3. `src/modules/generative-ui/mermaid-policy.ts`：允许的图类型以及 callback、外链、HTML、init directive 限制。

话术：

> 我没有把模型是否守规矩当作安全边界。Prompt 是第一层，严格 schema、spec sanitizer 和 Mermaid strict mode 才是运行时边界。未知组件和错误 props 只显示局部 fallback，不会吞掉同一消息中的文本、工具结果或 ChangeSet。

如时间允许，展示重点测试命令已经通过，而不是现场修改恶意 Prompt 碰运气。

### 3:50–4:35：解释性能和复用

话术：

> 我复用了 json-render 的 Catalog、SpecStream、State/Visibility/Action providers；Chart 用 Recharts；Mermaid 复用项目已有 Streamdown strict plugin；视觉层复用本地 Button 和 Tailwind tokens。没有引入整套 shadcn catalog。

> Renderer 使用 React lazy import。普通聊天不会加载 Recharts/json-render 的 UI chunk，服务端 Catalog prompt 也不会进入客户端产物。当前独立 Generative UI chunk 大约 379 KB raw、109 KB gzip，只在消息真正包含 spec 时加载。

### 4:35–5:00：收束

话术：

> 这不是用 JSON 复刻任意网页，而是在表达力、确定性和安全之间选了一个产品边界。十个组件足够覆盖布局、指标、表格、趋势、时间过程和架构关系；真正需要任意代码时，仍然回到可审核的 ChangeSet 与 Sandpack。

> 自动验证覆盖协议、渲染、安全策略和现有 Agent 回归；最终 `pnpm check` 会同时完成类型、Lint、全部测试和生产构建。

## 3. 可选的第二条演示

如果网络稳定，可以演示“Tool 结果 → Generative UI”，不需要 Tavily Key：

```text
不要修改工作区。查询上海未来 3 天的天气，只使用 weather_search 返回的数据。先给一句建议，再用 Metric、line Chart 和 Timeline 生成一个紧凑界面；不要补充工具没有返回的事实。
```

重点说明：Tool part 先按真实顺序显示，模型只能把工具实际返回的数据组织成 UI。

不要把它作为唯一主演示，因为外部天气接口和模型 tool calling 都会增加现场变量。

## 4. 证明 Generative UI 没有侵入 Coding Flow

如面试官追问，可以再提交一个小型代码修改请求：

```text
读取 /src/App.js，把页面标题改成 Interview Ready，并提交变更供我审核。
```

预期结果：Agent 使用工作区工具并产出 ChangeSet review，不额外生成看板。接受前 authoritative Workspace 不改变；点击接受后 Preview 才更新。这证明 Generative UI 和代码执行/审核是两条独立能力。

## 5. 现场故障兜底

| 故障 | 立即处理 | 继续讲什么 |
|---|---|---|
| Provider 请求失败 | 只重试一次，随后播放备份视频 | 展示测试与完整 stream 架构 |
| 模型只返回文字 | 使用固定 Prompt 重试，并强调“必须包含”组件 | 说明 UI 是模型可选择的表达，不是每条消息强制生成 |
| Mermaid 暂时显示 Loading | 先演示 Button、Chart、Timeline | Mermaid 本身是独立异步 chunk，不阻塞其他组件 |
| 外部天气接口失败 | 返回固定数据主演示 | Tool 测试仍能确定性证明 part 顺序 |
| 页面视觉异常 | 刷新一次；仍失败就切备份视频 | 不在面试现场调 CSS 或打开 Key 文件 |

准备以下兜底材料：

- 一段固定数据 Prompt 成功运行的 30 秒视频；
- 一张包含完整看板的截图；
- `pnpm check` 成功输出截图；
- 打开的 Catalog、stream adapter、policy 三个代码标签页。

## 6. 高频追问答案

### 为什么不用 pi-generative-ui 的自由生成方案？

pi 风格更适合追求高表达自由度和新颖视觉，但需要承担生成代码、运行隔离、依赖、样式漂移和恢复成本。本项目是编程工作台，安全边界与现有 UIMessage stream 更重要，因此聊天内选择受约束 JSON；任意代码继续交给 Sandpack。

### 为什么只有十个组件？

这是最小可组合集合：Stack/Grid 负责布局，Card/Text/Metric 负责内容，Table/Chart 负责数据，Button 负责本地交互，Timeline/Mermaid 负责时间和关系。更大的 Catalog 会增加 prompt token、选择歧义和测试面。

### Prompt 不可信，怎么保证安全？

安全不依赖 Prompt。Catalog schema 拒绝任意样式和未知 props；spec policy 移除未批准 action/watch；Mermaid 有输入 allowlist 和 strict renderer；Registry 不提供网络、导航或工作区能力。

### 流式 patch 中途不完整怎么办？

`pipeJsonRender` 只在完整 JSONL patch 可解析后产生 `data-spec`。客户端聚合已有的合法 patch；生成 UI 出错由局部 Error Boundary 接管，普通文本和 Tool parts 不受影响。

### 代价是什么？

服务端代价主要是 Catalog prompt token；客户端代价主要是按需加载的 Recharts/json-render chunk。换来的收益是可测试协议、稳定设计系统、安全能力边界和历史消息可重建。

## 7. 最终彩排清单

- [ ] `pnpm check` 最近一次通过
- [ ] `/api/health` 正常，目标 Provider configured
- [ ] 固定数据 Prompt 至少成功两次
- [ ] 页面缩放、主题和窗口布局已固定
- [ ] Console 无 error，浏览器通知和扩展弹窗已关闭
- [ ] `.env.local` 与 Key 页面已关闭
- [ ] 备份视频、截图和测试截图可以离线打开
- [ ] 主讲控制在 5 分钟，追问答案另算
- [ ] 能在 30 秒内画出 stream → data-spec → Registry 的链路
