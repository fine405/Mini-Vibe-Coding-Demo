## 0. Approval

- [x] 0.1 用户于 2026-07-16 确认首版 Catalog，并追加 `Timeline` 和 `MermaidDiagram`。
- [x] 0.2 用户明确授权开始实现，并要求优先复用 Vercel json-render 与开源能力。

## 1. Dependencies and Catalog

- [x] 1.1 固定安装 `@json-render/core@0.19.0`、`@json-render/react@0.19.0` 和 Recharts，并将根 Zod 升至兼容的 4.x。
- [x] 1.2 修正现有 Zod 4 不兼容 schema，运行 typecheck 和现有相关测试证明迁移安全。
- [x] 1.3 先写 Catalog validation 测试，再定义十个组件、两个本地 action 及精简 inline prompt rules。
- [x] 1.4 先写 Mermaid policy 测试，再实现图类型、长度、directive、link/callback 和 HTML 限制。

## 2. Renderer

- [x] 2.1 实现 Stack、Grid、Card、Text、Metric、DataTable、Chart、Button、Timeline 和 MermaidDiagram registry renderer。
- [x] 2.2 使用 json-render State/Visibility/Action providers 包装 Renderer，确保 action 只修改实例内部状态。
- [x] 2.3 添加组件测试，覆盖组合布局、数据上限、bar/line、button state、timeline 状态、Mermaid success/fallback 和未知组件 fallback。
- [x] 2.4 将 Generative UI renderer 做客户端懒加载，避免无 spec 的普通聊天支付 Recharts/Mermaid 初始执行成本。

## 3. Stream and Chat Integration

- [x] 3.1 在 Mastra v6 stream 转换后接入 `pipeJsonRender`，保留 incomplete-run metadata 和所有非文本 parts。
- [x] 3.2 将精简 Catalog inline prompt 接入 coding Agent，限制 coding/finalize 任务不额外生成 spec。
- [x] 3.3 在 ChatPane 第一条 `data-spec` part 位置渲染聚合 spec，保持 text、reasoning、Tool、spec 和 citations 顺序。
- [x] 3.4 添加 stream/React 测试，覆盖渐进 patch、text-only、Tool 穿透、malformed spec、历史消息重建和现有 ChangeSet/Research UI 不回归。

## 4. Verification

- [x] 4.1 运行相关测试与 typecheck，修复本变更引入的问题。
- [x] 4.2 运行完整 `pnpm check`。
- [x] 4.3 检查 production client chunks，确认 server-only Agent code 未进入浏览器且 Generative UI 重依赖被懒加载。
- [x] 4.4 对照 proposal/design/spec 做安全与范围 review，只在全部验证完成后勾选任务。

## 5. Suggestion Discovery Follow-up

- [x] 5.0 用户明确批准 Starter / Generative UI Tab、Prompt 刷新和只填充不发送行为。
- [x] 5.1 添加交互测试，覆盖 Tab 切换、刷新轮换、选择后不发送、textarea focus 与末尾光标。
- [x] 5.2 实现六条覆盖 Catalog 的 Generative UI Prompt，并在 Starter 池中保留现有三条 Prompt、增加三条刷新变体。
- [x] 5.3 实现 Suggestions Tab、当前 Tab 刷新入口与 composer 填充行为。
- [x] 5.4 运行相关测试、typecheck、lint 和完整 `pnpm check`，区分并行变更导致的非本功能失败。
