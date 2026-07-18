# Change: 增加托管 Chat 流量总开关

## Why

线上演示已经可以通过 Vercel 或其他托管平台的服务端环境变量配置 DeepSeek 与 Tavily，但缺少一个集中、可审计的流量开关。仅删除 Provider Key 不够直观，也无法让页面明确展示“已配置但暂停服务”的状态。

本变更增加服务端 `CHAT_ENABLED` 开关：操作者可在 Vercel 更新一个非敏感布尔环境变量并重新部署，统一开启或关闭所有新的 Chat 请求。关闭时同时阻断托管密钥与页面 BYOK，确保不会继续产生新的模型或 Research 流量。

## What Changes

- 新增服务端环境变量 `CHAT_ENABLED`；未配置时保持现有启用行为，显式 `true` 启用，显式 `false`、空值或其他无效值安全地禁用。
- `/api/chat` 在读取 Chat body、解析 Provider、创建 Research gateway 或调用任何第三方之前检查总开关；关闭时返回脱敏的 `503 CHAT_DISABLED` 与 `Cache-Control: no-store`。
- 总开关关闭时页面 BYOK 同样不可使用，Chat 输入、建议和提交操作保持禁用。
- `/api/providers` 增加公开的 `hostedChat` 布尔状态，只返回 `enabled` 与 `tavilyConfigured`；DeepSeek 的托管配置继续使用 Provider 自身的 `configured` 状态。
- Demo credentials Dialog 区分“本页已配置”“托管环境已配置”“部署已禁用”和“未配置”，不显示 Key、长度或可逆片段。
- 设置页在总开关关闭时保留为只读状态入口，但禁用临时 Key 输入与保存，明确说明必须修改服务端环境变量并重新部署。
- `.env.example` 和 README 增加本地兼容规则、Vercel Dashboard/CLI 快速切换、Redeploy、验证和旧 deployment URL 风险说明。
- 增加环境解析、API 短路、公开状态、BYOK 阻断和 UI 状态的确定性测试。

## Impact

- Affected specs: 新增 `hosted-chat-control` capability。
- Affected code: `.env.example`、`README.md`、`src/server/api.ts`、Provider response types/hooks、`ChatPane`、`DemoCredentialSettings` 及对应测试。
- API: `GET /api/providers` 增加 `hostedChat`；现有 `providers` 数组保持不变。`POST /api/chat` 在关闭时新增 `503 CHAT_DISABLED` 响应。
- Compatibility: `CHAT_ENABLED` 缺省时继续启用，现有本地 `.env.local`、托管 Secret 和旧客户端不需要迁移。
- Security: 该开关阻断新请求，但不能撤回已发出的上游调用，也不能改变仍可直接访问的旧 Vercel deployment URL；如需紧急全局止损，仍应吊销 Provider Key 或使用平台访问控制。

## Dependencies and Archive Order

- 本变更依赖已完成但尚未归档的 `add-ephemeral-demo-credentials` 行为，因为关闭流量时必须同时禁用页面 BYOK。
- 归档时应先归档 `add-ephemeral-demo-credentials`，再归档本变更；若归档顺序不能满足，应先合并相关 requirements。

## Approval Gate

该变更只定义方案和验收标准。实现必须在本 proposal、design 和 tasks 经用户确认后开始。
