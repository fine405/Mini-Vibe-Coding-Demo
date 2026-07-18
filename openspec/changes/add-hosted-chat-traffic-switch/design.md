## Context

当前服务端已经通过 `process.env` 读取本地 `.env.local` 或托管平台 Secret，页面 BYOK 只作为 DeepSeek/Tavily 的请求级覆盖。线上操作者希望通过 Vercel 环境变量快速暂停或恢复 Chat 流量，并让 Chat 设置页显示托管配置状态。

Vercel 环境变量变更只应用到新 deployment，因此本方案的操作模型是“更新变量 → Redeploy → 验证”。它不是无需部署的实时 feature flag，也不会在浏览器中调用 Vercel 管理 API。

实现前基线（Node `v24.14.0`、pnpm `9.9.0`）：目标测试 3 个文件共 36 个测试通过，`pnpm typecheck`、`pnpm lint` 和 `pnpm build` 全部通过。测试输出仅包含既有的 React `act(...)` 警告。

## Goals / Non-Goals

### Goals

- 使用一个服务端布尔环境变量统一控制所有新的 Chat 与 Research 流量。
- 关闭时同时阻断托管密钥和页面 BYOK，并在任何付费调用之前返回。
- 让 UI 安全地区分托管配置、本页配置、未配置和部署禁用状态。
- 要求本地 `.env.local` 和所有托管环境显式配置 `CHAT_ENABLED=true`，避免缺省部署意外开放 Chat。
- 提供可复制的 Vercel CLI 与 Dashboard 切换、Redeploy 和验证步骤。

### Non-Goals

- 不在应用中保存或使用 Vercel 管理 Token。
- 不从浏览器修改 Vercel 项目环境变量或触发 deployment。
- 不引入 Vercel Flags、Edge Config 或新的运行时外部依赖。
- 不终止已经到达旧 deployment 或已经发往上游的请求。
- 不把 Provider/Tavily Key、长度、片段或环境变量原值返回给浏览器。

## Decisions

### 1. 使用通用的 `CHAT_ENABLED`，不绑定 Vercel SDK

`CHAT_ENABLED` 是服务端变量，适用于 Vercel、本地和其他 Node 托管平台：

- 精确值 `true`：启用。
- 未配置、`false`、空值、大小写或空白不匹配以及其他值：禁用，缺失或错误配置时 fail closed。

`.env.example` 记录 `CHAT_ENABLED=true`，本地用户可以显式覆盖；Key 仍使用现有 `DEEPSEEK_API_KEY` 与 `TAVILY_API_KEY`，不增加 Vercel 专用副本。

### 2. 在服务端建立一个小而深的运行时配置 seam

新增纯解析函数，把允许的环境输入映射为不可变公开状态：

```ts
interface HostedChatStatus {
  enabled: boolean;
  tavilyConfigured: boolean;
}
```

生产 adapter 从 `process.env` 构造状态，测试 adapter 直接注入状态。调用方不需要知道字符串解析、空白处理或 fail-closed 规则。

DeepSeek 是否由托管环境配置继续来自 `ProviderCatalog.listPublic()` 中 `deepseek.configured`，避免重复状态源。

### 3. 总开关必须在 Chat body 与第三方 adapter 之前短路

`/api/chat` 的 gate 位于 route body-limit/handler 之前。关闭时固定返回：

```json
{
  "error": {
    "code": "CHAT_DISABLED",
    "message": "Chat is disabled by the deployment configuration"
  }
}
```

状态为 `503`，并沿用 `Cache-Control: no-store`。测试使用畸形/超大 body、Provider resolver 和 Research factory canary，证明禁用响应不读取 Chat payload，也不创建任何付费 adapter。

同源校验仍先执行，避免改变现有安全边界。

### 4. `/api/providers` 只公开布尔运行状态

响应在现有 `providers` 旁增加：

```ts
hostedChat: {
  enabled: boolean;
  tavilyConfigured: boolean;
}
```

不返回环境名称、平台项目、Key 来源、Key 长度或值。该状态仅用于禁用 UI 和显示“Configured by hosted environment”。

### 5. 页面状态以“禁用 → 本页 → 托管 → 未配置”为优先级

当 `hostedChat.enabled` 为 `false`：

- Chat composer、建议、Provider 发送和 Demo credential inputs/save 全部禁用。
- Dialog 保留可访问入口，两个服务显示 “Disabled by deployment”。
- 页面提示修改 `CHAT_ENABLED` 并重新部署。

当启用时：

- 本页 Key 存在则显示 “Configured for this page”。
- 否则服务端 DeepSeek/Tavily 状态为真则显示 “Configured by hosted environment”。
- 两者都没有则显示 “Not configured”。

UI 只消费公开布尔值，不尝试推断 Vercel、读取 Secret 或验证第三方 Key。

### 6. Vercel 快速切换仍需要新 deployment

README 同时提供：

- Dashboard：更新 Production 的 `CHAT_ENABLED`，保存后 Redeploy 当前 production deployment。
- CLI：`vercel env update CHAT_ENABLED production --yes`，随后 `vercel redeploy <deployment-url>`。
- 验证：检查 `/api/providers` 的 `hostedChat.enabled`，关闭时确认 `/api/chat` 返回 `503 CHAT_DISABLED`，开启时完成一次受控 Chat。

旧 deployment URL 仍保留创建时的环境变量。Production domain 切换到新 deployment 并不等于关闭所有旧 URL；高风险情况下应启用 Deployment Protection 或吊销 Key。

## Risks / Trade-offs

- 环境变量不是实时开关 → 文档明确要求 Redeploy，并提供最短 CLI/Dashboard 路径。
- `CHAT_ENABLED` 缺省禁用 → 现有部署升级后需要显式配置精确值 `true`；README 在本地和托管配置中都明确该迁移要求。
- 旧 deployment URL 仍可能可访问 → 文档提示 Deployment Protection 与紧急吊销 Key。
- 切换时已有请求可能完成 → gate 只保证新 deployment 接收的新请求；不声称撤回上游调用。
- 公开布尔状态可被匿名读取 → 只暴露运行可用性，不增加 Secret 信息；这与现有 Provider `configured` 状态一致。

## Migration Plan

1. 部署新代码前，在需要 Chat 的本地或托管环境显式添加 `CHAT_ENABLED=true`。
2. 在 Vercel Production 添加或确认 `CHAT_ENABLED=true` 并 Redeploy；未配置的新 deployment 会保持 Chat 关闭。
3. 需要暂停时更新为 `false` 并 Redeploy；验证 Production domain 的公开状态和 `503`。
4. 回滚代码时删除新增 UI/公开字段/gate；现有 Provider Key 环境变量不变。

## Open Questions

- 无。用户已确认关闭时同时禁用 BYOK，并接受环境变量修改后需要 Redeploy。
