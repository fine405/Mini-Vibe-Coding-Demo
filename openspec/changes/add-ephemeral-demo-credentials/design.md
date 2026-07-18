## Context

Provider catalog 当前按请求从服务端环境读取模型密钥，Tavily gateway 则由服务端 `TAVILY_API_KEY` 构造。公开 Provider API 不返回密钥，聊天日志只记录请求 ID、Provider/模型、时长和错误类别。

线上演示有两种不同需求：演示者使用部署方密钥，或访问者临时使用自己的密钥。前者应继续使用托管平台 Secret、访问控制、限流和低额度 Key；本变更只为后者提供受限的页面级 BYOK 兜底。

批准后的实现基线（2026-07-18）：Node.js `v24.14.0`、pnpm `9.9.0`；`pnpm typecheck`、`pnpm lint`、`pnpm build` 以及 Provider/API/Agent/ChatPane 的 40 个定向测试均通过。ChatPane 的既有 CodeBlock 测试仍输出一条 React `act(...)` warning，本变更不得新增 warning。

## Goals / Non-Goals

### Goals

- 允许当前页面临时配置 DeepSeek 与 Tavily，不需要修改部署环境或重启服务。
- 保证密钥不会进入任何浏览器持久化、URL、响应正文、日志、项目文件或导出。
- 保持 Provider/model allowlist、Tavily 固定上游、请求取消和错误脱敏边界不变。
- 刷新、关闭、导航离开或卸载 Chat Agent 后不恢复密钥。
- 无临时密钥时保持现有服务端环境变量行为完全兼容。

### Non-Goals

- 不提供通用环境变量、Base URL、模型 ID 或任意第三方服务编辑器。
- 不把密钥发送到浏览器端 Provider SDK，也不把它们写入 `process.env`。
- 不实现跨刷新会话、多人共享、服务端密钥保险库或长期 BYOK 账户。
- 不声称可以从 JavaScript 堆或浏览器 DevTools 中物理抹除已经使用过的字符串。
- 不在保存设置时调用 DeepSeek/Tavily 验证密钥或消耗额度。
- 不以此功能替代公开部署所需的认证、限流、配额和滥用防护。

## Decisions

### 1. 服务端 Secret 仍是推荐路径，BYOK 只允许两个固定字段

设置入口明确标注为 “Demo credentials”。请求 schema 只接受：

```ts
interface EphemeralCredentials {
  deepseekApiKey?: string;
  tavilyApiKey?: string;
}
```

两个值都要 trim、限制长度且空字符串按未提供处理。未知字段由严格 schema 拒绝。DeepSeek 仍只能选择内置 allowlist 中的模型；Tavily 仍只能访问现有固定 search endpoint。客户端不能配置 Provider Base URL、任意模型或任意网络目标。

### 2. 密钥只保存在页面内存，不使用任何持久化 API

Coding Agent 顶部的设置按钮打开 Dialog。编辑草稿只在 Dialog 存活期间存在，提交后清空草稿；供请求使用的值保存在 Chat Agent 页面级内存引用中，渲染状态只保留 `deepseekConfigured` / `tavilyConfigured` 布尔值。

代码不得为这些值调用 `localStorage`、`sessionStorage`、IndexedDB、Cookie、URL 参数、History state 或项目持久化。密钥不进入 Zustand persist、AI SDK message history或 React key。刷新/导航由浏览器自然销毁页面上下文；不依赖不可靠的 `beforeunload` 网络清理。

这种方式只能避免应用主动持久化，不能抵御同源 XSS、恶意浏览器扩展、DevTools、被篡改的前端资源或宿主级抓包。因此 UI 必须提示仅使用低额度、可撤销的演示 Key。

### 3. `/api/providers` 不接收临时密钥，DeepSeek 可用状态在客户端合并

临时密钥不会通过 query string、GET body 或自定义 Header 发送给 `/api/providers`。Provider catalog 仍展示服务端配置状态；当页面内存中存在 DeepSeek Key 时，客户端只把目录中的 `deepseek` 项合并为本页可用，从而允许选择既有的 DeepSeek allowlist 模型。

这样既不需要新增“验证密钥”接口，也不会在保存时产生第三方调用。真正的认证错误只会在用户主动发送 Chat 请求后以脱敏错误返回。

### 4. 密钥只随 `POST /api/chat` 请求体进入请求级覆盖

AI SDK transport 在每次提交/重试时读取当前内存值，并把非空字段加入 `ephemeralCredentials`。不使用自定义 Header，因为代理和 APM 更常采集 Header；也不使用 Cookie，因为它会跨刷新存活且自动附带到无关请求。

服务端先用严格 schema 校验，再建立请求级配置：

- DeepSeek Key 只覆盖本次 `deepseek` Provider 解析；其他 Provider 忽略它。
- Tavily Key 只构造本次 Research gateway；没有临时值时复用服务端环境配置。
- 临时值优先于同名服务端环境变量，便于演示者明确使用自己的低额度 Key。
- 请求完成、失败或取消后，不把配置对象放入全局变量、缓存或长生命周期容器。

现有测试注入 seam 保持可用，测试不得因临时 Tavily Key 意外访问真实网络。

### 5. 清除会取消当前运行，但无法撤回已经发出的网络数据

用户点击 “Clear demo credentials” 时，客户端先调用现有 stop/abort 路径，再删除内存引用并更新公开状态。刷新、关闭页面或隐藏并卸载 Chat Agent 也会取消浏览器请求。

取消只能阻止继续使用，不能保证上游已经收到的请求未处理。因此 Dialog 会说明：如怀疑泄漏，应在 DeepSeek/Tavily 控制台撤销 Key；清除本页状态不是远程吊销。

### 6. 响应、错误、缓存与日志保持密钥不可见

Chat 流和 JSON 错误统一增加 `Cache-Control: no-store`。校验错误只返回字段路径和固定消息，不包含 input value；Provider/Tavily 错误继续返回脱敏文案。结构化日志不得记录请求 body、Header、prompt、workspace、上游响应正文或 Error message，只记录现有操作元数据和错误类别。

测试使用唯一 canary secret 断言它不出现在 Provider 响应、Chat 响应、错误响应和捕获的 console 输出中。生产部署还需要关闭反向代理/APM 的请求正文采集；应用代码无法替部署基础设施做出保证。

## Risks / Trade-offs

- 同源 XSS 或第三方脚本可读取页面内存 → 演示部署应减少第三方脚本、使用可信构建并配置 CSP；本次不扩大为全站 CSP 改造。
- DevTools/扩展/本机代理可看到请求 → 明示风险，只使用低额度、可撤销、用后轮换的演示 Key。
- JavaScript 字符串不能可靠清零 → 清除引用并取消请求，但不声称物理抹除。
- 每次 Chat 都会重复传输 Key → 只通过 HTTPS 同源 POST；不引入难以在 serverless 环境可靠清理的服务端 session vault。
- 代理/APM 可能记录 body → 应用禁止主动记录；部署文档要求关闭 body capture 和敏感采样。
- 临时 Key 未预验证 → 避免保存时扣费，认证错误在首次主动运行时反馈。

## Safer Demo Recommendation

如果演示者可以控制部署，优先把 Key 放在托管平台 Secret 中，并在应用前增加访问控制、用户级限流/配额，使用专用低额度 Key 且演示后轮换。页面 BYOK 适合访问者自带 Key 的短时演示，不是比服务端 Secret 更安全的替代品。

## Migration Plan

1. 新字段全部可选，未使用设置入口的现有请求和部署行为不变。
2. 设置入口默认没有任何值；不读取或迁移现有浏览器数据。
3. 回滚时删除设置 UI、客户端合并和请求级覆盖；服务端环境变量路径继续工作。

## Open Questions

- 无。首版明确限定为 DeepSeek 与 Tavily，且不增加服务端持久会话。
