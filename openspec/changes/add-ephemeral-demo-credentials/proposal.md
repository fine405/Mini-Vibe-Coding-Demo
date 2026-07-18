# Change: 为 Chat Agent 增加一次性演示密钥设置

## Why

当前 DeepSeek 与 Tavily 只能通过部署环境变量配置。线上演示时临时修改部署配置、重启服务并不方便；直接把长期密钥写入浏览器存储又会扩大泄漏风险。

本变更增加一个范围严格受限的 BYOK 演示入口：用户可在当前页面临时填写 `DEEPSEEK_API_KEY` 与 `TAVILY_API_KEY`。密钥只存在于页面内存和使用它的单次请求中，刷新、关闭或离开页面后不恢复。服务端环境变量仍是推荐且默认的配置方式。

## What Changes

- 在 Coding Agent 标题栏增加设置入口，使用带安全说明的 Dialog 填写、替换或清除 DeepSeek/Tavily 演示密钥。
- 输入框默认遮罩并关闭自动完成；UI 只显示“本页已配置”状态，不显示任何密钥值、长度或可逆片段。
- 密钥仅保存在当前页面的内存中，不写入 `localStorage`、`sessionStorage`、IndexedDB、Cookie、URL、日志或项目导出。
- 不调用浏览器端 Provider SDK，也不修改服务端 `process.env`；`/api/providers` 继续只返回服务端公开配置状态。
- 客户端在本地把已填写 DeepSeek Key 的 Provider 标记为本页可用，并只在 `/api/chat` 请求体中附带有长度上限的可选演示密钥。
- 服务端只允许这两个命名密钥：DeepSeek Key 作为本次 Agent 模型解析的请求级覆盖，Tavily Key 作为本次 Research gateway 的请求级覆盖；未提供时继续使用服务端环境变量。
- Chat 响应和相关错误不得回显密钥，并使用 `Cache-Control: no-store`；现有结构化日志继续禁止记录请求正文、prompt、文件内容或密钥。
- 保存设置不发起第三方验证请求，避免意外计费；清除设置时先停止当前 Agent 请求，再清除供后续请求使用的内存值。
- 增加针对生命周期、请求边界、Provider 覆盖、Tavily 覆盖、脱敏和 UI 可访问性的确定性测试。

## Impact

- Affected specs: `provider-configuration`、`web-research`。
- Affected code: `src/modules/chat/`、`src/modules/agent-chat/`、`src/server/agent/chat.ts`、`src/server/providers/`、`src/server/api.ts` 及对应测试。
- API: `POST /api/chat` 增加可选的 `ephemeralCredentials` 请求字段；现有客户端和仅服务端环境变量的部署保持兼容。
- Security: 浏览器持有的密钥会出现在本机内存和 DevTools Network 中，JavaScript 字符串也无法保证物理清零。因此该模式仅适合可信演示页面和低额度、可撤销、可轮换的演示 Key，不替代认证、限流、配额或平台 Secret 管理。

## Dependencies and Archive Order

- `provider-configuration` 的基础规范目前位于已完成但尚未归档的 `refactor-real-agent-platform` 变更中。
- `web-research` 的基础规范目前位于已完成但尚未归档的 `add-agent-web-research` 变更中。
- 归档时必须先归档上述两个基础变更，再归档本变更，使这里的 `MODIFIED` requirements 有已发布的目标规范。若不能按此顺序归档，应先把本变更的 delta 合并到对应基础变更，不能把缺少基础规范的 delta 单独归档。

## Approval Gate

该变更只定义方案和验收标准。实现必须在本 proposal、design 和 tasks 经用户确认后开始。
