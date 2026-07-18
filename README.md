# Mini Lovable Agent Studio

一个浏览器内的 AI 编程工作台：文件树、Monaco 编辑器、Sandpack 实时预览与真实 coding agent 共享同一个 TanStack Start 应用。Agent 会在请求级隔离工作区中调用工具，最终提交结构化 ChangeSet；只有用户审核并接受后，变更才会原子写入浏览器工作区。

## Demo

工作台内置 6 种主题，可从右上角主题菜单切换，也可使用 `D` / `N` / `S` / `R` / `W` / `B` 快捷键。

![Mini Lovable Day、Night、Summer、Drizzle、Snow 与 Breeze 主题演示](./docs/themes/themes.gif)

Summer 主题 fork from https://dany.works/

## 技术栈

- TanStack Start（SPA/客户端 IDE 路由与同源 Server Routes）
- Hono（`/api/*` API、校验、请求 ID、大小限制与错误边界）
- Mastra + AI SDK v6（多步 Agent、工具循环与 UI Message Stream）
- AI Elements + shadcn/ui + Tailwind CSS v4
- Zustand + IndexedDB（浏览器工作区与持久化）
- Monaco + Sandpack（编辑、diff 与实时预览）

## 快速开始

要求 Node.js `>=22.13.0` 与 pnpm。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。至少配置一个 Provider key 后才能发送消息；未配置的 Provider 仍会出现在选择列表中，但保持禁用状态。

## Provider 配置

部署配置的 Key 只在服务端读取，不使用 `VITE_` 前缀，也不会返回给浏览器；页面级 BYOK 例外见下方“一次性演示密钥”。

| Provider | 环境变量 | 默认模型 |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `openai/gpt-5.4` |
| Qwen / DashScope | `DASHSCOPE_API_KEY` | `alibaba-cn/qwen3-coder-plus` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek/deepseek-chat` |
| Anthropic | `ANTHROPIC_API_KEY` | `anthropic/claude-sonnet-4-6` |
| Google Gemini | `GOOGLE_API_KEY`、`GOOGLE_GENERATIVE_AI_API_KEY` 或 `GEMINI_API_KEY` | `google/gemini-2.5-pro` |
| Moonshot / Kimi | `MOONSHOT_API_KEY` | `moonshotai/kimi-k2.7-code` |
| xAI | `XAI_API_KEY` | `xai/grok-build-0.1` |
| OpenRouter | `OPENROUTER_API_KEY` | `openrouter/anthropic/claude-sonnet-4.6` |

每个 Provider 只开放服务端目录中审核过、支持工具调用的模型。浏览器只保存 `{ providerId, modelId }`；若已保存的选择失效，会自动回退到第一个已配置 Provider。

如需调整每个 Provider 的默认模型，可使用 `.env.example` 中的 `*_DEFAULT_MODEL` 非敏感变量；只有内置 allowlist 中的模型 ID 会生效。

### 一次性演示密钥

Coding Agent 标题栏的设置按钮允许临时填写 `DEEPSEEK_API_KEY` 和 `TAVILY_API_KEY`。这是访问者 BYOK 的演示兜底，不会修改 `process.env`：

- 值只保存在当前 Chat 页面内存中，并随需要它的 `POST /api/chat` 请求发送。
- 不写入 localStorage、sessionStorage、IndexedDB、Cookie、URL、消息历史或项目导出。
- 刷新、关闭、离开页面或卸载 Chat 面板后不会恢复；“Clear page credentials” 会先停止当前 Agent 请求。
- 临时值存在时优先于同名服务端环境变量；没有临时值时，本地 `.env.local` 和托管平台 Secret 的原路径保持不变。
- 服务端 `CHAT_ENABLED` 总开关优先级更高；关闭时页面 BYOK 也不能保存或发起 Chat。
- 保存不会主动请求 DeepSeek/Tavily 验证 Key，只有实际 Chat/Research 调用才可能产生费用。

浏览器 DevTools Network、同源脚本和浏览器扩展仍可能看到页面输入的 Key，JavaScript 字符串也无法保证物理清零。只在可信 HTTPS 演示页面使用低额度、可撤销的专用 Key，用后从 Provider 控制台轮换或吊销。

## Research Tools

Agent 可按需调用两个只读研究工具：

- `web_search`：通过 Tavily basic search 查询公开网页，每次最多返回 5 条经过校验的来源。需在服务端配置 `TAVILY_API_KEY`，不要使用 `VITE_` 前缀。
- `weather_search`：通过 Open-Meteo 地理编码与天气接口查询当前天气及 1–7 日预报，无需 key。

来源会在工具执行完成时立即出现在消息时间线中；回答末尾再按 URL 去重聚合为最多 10 条的 `N sources` 列表，可 hover、键盘聚焦或点击查看。Agent 只能引用工具实际返回的 URL；搜索结果一律视为不可信参考内容，不会作为指令执行，也不得在查询中发送密钥、完整文件或私有源码。

当前 Open-Meteo 免费接口仅按非商业、本地或受控环境使用，并在每次天气结果中展示归因。商业或公开生产部署前，请改用其 [Customer API](https://open-meteo.com/en/pricing) 或满足业务许可要求的天气服务，并遵守 [Open-Meteo 许可条款](https://open-meteo.com/en/license)。

## Agent 工作流

```text
Browser workspace snapshot
        │
        ▼
POST /api/chat → Hono → Mastra coding agent
                            ├── research only → web_search / weather_search
                            │                    │
                            │                    ▼
                            │               cited answer
                            │
                            └── code change → request-scoped RunWorkspace
                                               │
                                               ▼
                                      finalize_changes
                                               │
                                               ▼
                                    file/hunk review in browser
                                      │ accept      │ reject
                                      ▼             ▼
                              Workspace.apply()   discard
```

核心约束：

- Agent 没有 shell、部署、宿主文件系统或任意网络工具；外部访问仅限服务端审核过的 Tavily 与 Open-Meteo 适配器。
- 现有文件必须先读取，才能写入或删除。
- Agent 只修改 shadow workspace，不能直接写浏览器文件。
- ChangeSet 带工作区 revision 与逐文件 hash；任何冲突都会使整次应用失败，不会部分写入。
- 接受后的事务支持一次安全 Undo；工作区若再次变化则拒绝冲突撤销。

## 工作区安全边界

发给 Agent 的快照默认最多 250 个文本文件、单文件 256 KiB、合计 2 MiB。以下内容会在浏览器预检时排除并提示：

- `.env*`、私钥、证书、凭据文件与 `.ssh`
- `node_modules`、`dist`、`.output` 等构建目录
- 二进制内容和超限文件

服务端会再次验证规范化 POSIX 路径、内容 hash、模型 allowlist 与请求结构。生产公开部署前仍应增加身份认证、用户级限流与配额；当前版本适合可信本地或受控内网环境。

## API

- `GET /api/health`：运行状态
- `GET /api/providers`：公开 Provider/模型描述、`configured` 与 `hostedChat` 布尔状态，不包含 key
- `POST /api/chat`：AI SDK v6 UI message stream

## 开发与验证

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check
```

测试覆盖 Workspace 原子事务/冲突/Undo、IndexedDB v1→v2 迁移与写入合并、Provider allowlist 与密钥脱敏、RunWorkspace 安全约束、Research Gateway 边界，以及 Hono → Mastra → 工具循环 → ChangeSet 的完整流式集成。

如需对已配置的真实 Provider 做一次付费、显式启用的端到端冒烟测试，先运行应用，再执行：

```bash
SMOKE_PROVIDER_ID=openai SMOKE_MODEL_ID=openai/gpt-5.4 pnpm smoke:provider
```

未提供 `SMOKE_PROVIDER_ID` 时会使用第一个已配置 Provider；脚本不会读取或输出 key。

## 生产运行

```bash
pnpm build
pnpm start
```

构建通过 Nitro 生成 Node server 到 `.output/server/index.mjs`，静态资源位于 `.output/public`。通过 `PORT`/`HOST` 设置监听地址；运行时同样要求 Node.js `>=22.13.0`。

### 托管平台配置与线上验证

推荐把演示者自己的 Key 配置为托管平台的加密 Secret，而不是在页面中填写：

1. 只在确实需要 Chat 的 Production/Preview 环境中添加 `DEEPSEEK_API_KEY`、可选的 `TAVILY_API_KEY`，并为每个持有 Key 的环境显式配置自己的 `CHAT_ENABLED=true`；不要添加 `VITE_` 前缀。
2. 确认变量只对服务端运行时可见，并关闭反向代理/APM 的请求正文与敏感 Header 采集。
3. 重新部署或重启 Node runtime；环境变量变更不会自动进入已经运行的实例。
4. 为演示站点增加登录或访问密码、用户级限流和额度上限；同源校验不能替代身份认证。

部署完成后按以下顺序验证：

```bash
curl -fsS https://YOUR_DEMO_HOST/api/health
curl -fsS https://YOUR_DEMO_HOST/api/providers
```

- `/api/health` 应返回 `ok: true`。
- `/api/providers` 中 DeepSeek 应为 `configured: true`、`hostedChat.enabled` 应为 `true`，配置 Tavily 时 `hostedChat.tavilyConfigured` 也应为 `true`；响应中不得出现 Key 或 Key 片段。
- 打开 Demo credentials 设置，DeepSeek/Tavily 应显示 “Configured by hosted environment”，输入框中不会出现托管 Key。
- 不打开 Demo credentials，选择 DeepSeek 发一条简单请求；成功表示托管平台 `DEEPSEEK_API_KEY` 路径有效。
- 再询问一个需要当前网页信息的问题；消息时间线应出现 `web_search` 和来源列表，表示托管平台 `TAVILY_API_KEY` 路径有效。
- 在浏览器 Network 中确认 `/api/chat` 响应包含 `Cache-Control: no-store`，且应用响应和控制台日志没有 Key。平台日志也不应采集请求 body。

### Vercel Chat 流量开关

`CHAT_ENABLED` 是服务端总开关，控制托管 Key 和页面一次性 BYOK 的所有新 Chat 请求，并采用显式开启策略：

- 只有显式配置为精确值 `true` 时才启用 Chat。
- 未配置、`false`、空值、大小写或空白不匹配以及其他值都会 fail closed：`POST /api/chat` 在读取请求体和调用 DeepSeek/Tavily 前返回 `503 CHAT_DISABLED`。

该变量按 Vercel environment/deployment 生效，不是跨 Production、Preview 和 Custom Environment 的账户级总开关。为了让下面的 Production 切换成为唯一线上入口，最简单的做法是只在 Production 放 Provider Key；如果 Preview/Custom 也持有 Key，必须在各自环境中单独配置并切换 `CHAT_ENABLED`。

Vercel Dashboard 快速切换：

1. 打开 Project → Settings → Environment Variables，搜索 `CHAT_ENABLED`。
2. 编辑 Production 值为 `false`（关）或 `true`（开）；首次使用则新增该变量并只勾选 Production。
3. 打开 Deployments，找到当前 Production deployment，选择 Redeploy。
4. 等 Production 域名切换到新 deployment 后执行下方验证。

已经安装并登录 Vercel CLI 时，可以在已 `vercel link` 的项目目录运行：

```bash
# 首次添加；按提示输入 true
vercel env add CHAT_ENABLED production

# 后续切换；按提示输入 false 或 true，--yes 只跳过更新确认
vercel env update CHAT_ENABLED production --yes

# 使用 Deployments 页面中的 immutable deployment URL 或 deployment ID
vercel redeploy <production-deployment-id-or-url>
```

环境变量修改不会进入旧 deployment，必须 Redeploy。每次切换后先验证公开状态：

```bash
curl -sS https://YOUR_DEMO_HOST/api/providers

# 关闭时应返回 HTTP 503、CHAT_DISABLED 和 Cache-Control: no-store
curl -i -X POST https://YOUR_DEMO_HOST/api/chat \
  -H 'content-type: application/json' \
  --data '{}'
```

关闭后，`hostedChat.enabled` 应为 `false`，页面应提示 “Disabled by deployment”，输入、建议和一次性 Key 保存均不可用；上述 Chat 请求应为 `503`，Vercel/上游日志不应出现新的模型或 Tavily 调用。开启后，`hostedChat.enabled` 应为 `true`，再从 Production 域名发一条低成本受控 Chat，并按前述步骤验证 DeepSeek 与 Tavily。

旧 deployment URL 会保留创建时的旧环境变量，即使 Production 域名已指向新 deployment 也可能继续可访问。紧急停流时不要只依赖此开关：同时启用 Vercel Deployment Protection，必要时立即在 DeepSeek/Tavily 控制台吊销或轮换 Key。

验证一次性 BYOK 流程时，最好使用没有配置 DeepSeek/Tavily Secret 的独立 Preview 部署：

1. 用无痕窗口打开页面，确认 DeepSeek 初始不可发送。
2. 打开 Coding Agent 设置，填写低额度 DeepSeek/Tavily 测试 Key；DeepSeek 应立即变为可选，不会先产生验证请求。
3. 发起 Chat 和一次网页搜索；只有 `/api/chat` 请求体会包含 `ephemeralCredentials`，响应不得包含它们。
4. 点击 “Clear page credentials”，确认当前请求停止，后续 `/api/chat` 不再带 `ephemeralCredentials`。
5. 再次填写后刷新页面；绿色临时配置标记应消失。如果部署本身没有 DeepSeek Secret，DeepSeek 会恢复禁用；如果平台已配置 Secret，它仍可用，但走的是服务端环境变量路径。
6. 演示结束后在 DeepSeek/Tavily 控制台吊销或轮换测试 Key。

## 目录

```text
src/
├── routes/                 # TanStack Start 文档、客户端 IDE 与 Hono catch-all
├── server/
│   ├── agent/              # Mastra Agent、工具与请求级 RunWorkspace
│   └── providers/          # server-only ProviderCatalog
├── modules/
│   ├── agent-chat/         # Provider 选择与 ChangeSet review
│   ├── workspace/          # snapshot / preview / apply / undo 深模块
│   ├── chat/               # AI SDK + AI Elements 聊天界面
│   ├── fs/                 # 浏览器虚拟文件系统与 IndexedDB
│   ├── editor/             # Monaco 会话与 diff
│   └── preview/            # Sandpack 与 console bridge
└── components/
    ├── ai-elements/        # 按需安装的 AI Elements registry 源码
    └── ui/                 # shadcn/ui 组件
```

## License

MIT
