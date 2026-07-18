## Context

当前 `ThemeMode` 与 `ResolvedTheme` 都只有 `light | dark`，Header 通过 `ThemeToggle` 直接翻转二者。Monaco 与 Sandpack Preview 依赖 `ResolvedTheme`，CSS 则通过根元素 `data-theme` 与 `.dark` 类切换 token。

现有 OpenSpec 仍描述已经不存在的 `auto` 模式和三态循环按钮，与实际代码不一致。本变更会在增加季节主题的同时，让 spec 与当前 Night 默认、显式配色选择及 legacy `auto` 迁移行为重新一致。

dany.works 当前 Summer 由两部分组成：全屏 fixed `leaves.mp4` 使用 `object-fit: cover`、`object-position: top`、`mix-blend-mode: multiply` 与 700ms opacity transition；同时循环播放 `forest.mp3` 森林环境声。本项目暂时直接复用这两个文件及其成对启停行为，还原完整 Demo 效果。

## Goals / Non-Goals

### Goals

- 用一个 Header 一级菜单承载五个稳定的主题 ID、名称和快捷键。
- 把用户选择的 Theme 与组件实际消费的 light/dark color scheme 分开。
- 让 Summer 在现有 UI 之上产生不阻断操作的全屏叶影与森林环境声。
- 让 Drizzle 与 Breeze 的后续效果无需再次迁移持久化状态或菜单契约。
- 保持现有 Day/Night token、Monaco theme 与 Preview theme 行为不变。

### Non-Goals

- 本阶段不实现 Drizzle 的雨滴、雾面、声音或颜色动画。
- 本阶段不实现 Breeze 的黄色枫叶粒子、风场或物理系统。
- 不复制 dany.works 的 Rain/Midnight/Chaos 模式或移动端 Logo 手势。
- 不引入 Three.js、Canvas、GSAP、新状态框架或远程视频流。
- 不把主题动作重复放入 More 菜单或 Command Palette。

## Decisions

### 1. ThemeMode 表达用户选择，ResolvedTheme 只表达配色

| ThemeMode | Menu label | Shortcut | ResolvedTheme | 本阶段效果 |
|---|---|---:|---|---|
| `day` | Day | `D` | `light` | 现有浅色主题 |
| `night` | Night | `N` | `dark` | 现有深色主题 |
| `summer` | Summer | `S` | `light` | 全屏叶影视频 + 森林环境声 |
| `drizzle` | Drizzle | `R` | `light` | Day 基线，菜单显示 `Soon` |
| `breeze` | Breeze | `B` | `light` | Day 基线，菜单显示 `Soon` |

`resolveTheme(mode)` 是唯一映射点。Editor、Diff 和 Preview 不感知季节 ThemeMode，继续通过 `ResolvedTheme` 获得 light/dark，避免把视频效果耦合进编辑器主题。

默认值继续保持当前行为：首次访问为 `night`。持久化仍只保存 `mode`。读取旧存储时，`light → day`、`dark → night`；legacy `auto` 根据当前系统配色一次性归一为 `day` 或 `night`，之后不继续监听系统变化。

### 2. Theme 是 Header 一级菜单

`WorkbenchHeader` 的右侧顺序保持为：Command Palette → Theme → More。Theme trigger 使用紧凑的图标与 `Theme` 文本，并通过 aria-label 暴露当前主题；More 菜单不出现 Theme 子项。

菜单使用现有 Radix Dropdown primitives。每行左侧显示主题图标/选中标记，中间显示 label；Drizzle 与 Breeze 带弱化 `Soon`；最右侧用现有 `DropdownMenuShortcut` 显示单字母。选择任意项后立即更新 store 并关闭菜单。

不使用 disabled placeholder：Drizzle 与 Breeze 是真实、可持久化的 ThemeMode，只是当前视觉与 Day 相同。这保证菜单、快捷键和后续效果接入使用同一状态契约。

### 3. 单字母快捷键只在非编辑上下文生效

Theme 菜单组件挂载一次 window `keydown` listener，并使用固定映射 `d/n/s/r/b`。处理前执行三层保护：

1. Meta、Ctrl 或 Alt 任一按下时忽略，避免覆盖浏览器和现有应用快捷键；Shift 仅用于允许大写字母。
2. event target 位于 `input`、`textarea`、`select` 或有效 `contenteditable` 内时忽略；这也覆盖 Monaco 的隐藏 textarea。
3. 不匹配五个字母时不调用 `preventDefault`。

命中后调用同一个 `setMode`，菜单点击与键盘不存在两套主题逻辑。

### 4. Summer 使用成对启停的视频层与环境音

由 Header 中常驻的 Theme menu 挂载一个 fixed `SummerThemeMedia`，使其覆盖 Chat、Editor、Diff 与 Preview，而不受 panel 布局影响；组件同时持有一个不可见的 `<audio>`。媒体行为：

- `position: fixed; inset: 0; width/height: 100%`；
- `object-fit: cover; object-position: top`，保持与 dany.works 相同的裁切锚点；
- `mix-blend-mode: multiply`，pointer-events none；
- inactive opacity 0，Summer opacity 1，使用与 dany 相同量级的 700ms ease-out 淡入；
- z-index 位于应用内容之上、Radix portaled menu 之下，保证切换菜单仍可读；
- 视频使用 `loop muted playsInline preload="none"`；音频使用 `loop preload="none"`，保持原文件音量且不提供额外播放控制；
- 用户通过菜单或快捷键进入 Summer 时，同时播放视频和音频；离开 Summer 时两者同时 `pause()` 并将 `currentTime` 归零；
- 如果刷新页面恢复 Summer，浏览器可能阻止有声自动播放：视频和主题视觉继续生效，音频在下一次 pointer/keyboard 用户交互时重试一次；
- 任一 `play()` rejection 静默降级，不影响主题状态和 UI 操作。

视频与音频只负责 Summer 氛围，不改变布局、焦点或 pointer hit testing；离开 Summer 后不得继续发声。

### 5. Demo 暂时直接使用 dany.works 的循环文件

指定视频为 `https://dany.works/leaves.mp4`。实测文件为 720×1280、30fps、12 秒 H.264、348,250 bytes，SHA-256 为 `79adbb7e31e20085e974b278b60b52c4bb5f8132beeee6aa38a6eac682ed3d75`。画面只有浅色背景与摇曳叶影，不出现真实树叶。

首帧与末帧的全通道 SSIM 实测为 `0.980074`，逐秒画面也显示运动围绕同一构图轻微往复，原文件已经针对原生 `loop` 做到近似连续。本阶段直接复制原 MP4 并使用 `<video loop>`，不再增加交叉淡化、ping-pong 或二次转码；二次编码只会进一步损失这个低码率文件的叶缘质量。

指定音频为 `https://dany.works/forest.mp3`。实测文件为 196.152 秒、24kHz、单声道、80kbps MP3、1,961,805 bytes，SHA-256 为 `db189a28c237a74f071b5dfa99463daac3cfdf9decd623e2f6e32d1d35141bec`。时长足够长，按原站行为直接原生循环，不做裁切或重新编码。

两个资源随应用本地托管，避免依赖原站在线状态。资源旁记录来源 URL、下载日期、文件元数据与校验值。dany.works 没有为这两个文件声明可复用许可，因此它们被明确视为本地 Demo 临时资产；任何公开部署、分发或商业使用都必须先取得原作者许可，或换成自有/已授权素材。

## Risks / Trade-offs

- multiply overlay 会降低局部对比度，尤其是 Monaco 代码区 → Summer 是 Demo 氛围主题，保留 dany 的覆盖式效果；菜单层级高于视频，始终可切回。
- Drizzle/Breeze 选择后与 Day 视觉相同，可能被误解为失效 → 菜单明确显示弱化 `Soon`，但仍保存真实 mode，为下一阶段保留稳定入口。
- 原视频只有 720×1280，桌面 `cover` 会放大并裁掉大量竖向内容 → 先忠实复刻原站 Demo，通过实际桌面验收确认模糊程度；不做无信息增益的放大转码。
- 有声自动播放在页面恢复时可能被浏览器拦截 → 显式主题切换直接播放；恢复场景保持视觉并在下一次用户交互重试音频。
- 原视频和音频没有公开复用许可 → 仅作为本地 Demo 临时资产，公开部署前设置明确替换门槛。
- 全局字母键可能与应用交互冲突 → 严格排除 editable target 和 Meta/Ctrl/Alt 组合，并用测试覆盖输入框、contenteditable 与普通页面三类场景。
- Zustand 旧存储包含 `light/dark/auto` → hydration 统一归一，避免旧值进入新 union 或产生错误闪烁。

## Migration Plan

1. 先扩展 store 类型、解析函数和 legacy mode 迁移，并用单元测试锁定五种映射。
2. 将 ThemeToggle 替换为 Theme menu，接入点击与受保护的单字母快捷键。
3. 下载并校验 dany.works Summer 视频与森林环境声，作为本地 Demo 资源记录来源与临时使用限制。
4. 挂载 Summer overlay 与 audio，验证成对播放/暂停、自动播放降级、层级、淡入和 pointer 行为。
5. 更新快捷键文档，运行主题/Header 相关测试及完整 `pnpm check`。

回滚时可移除 Overlay 与新菜单，并把已存的季节 mode 通过同一 normalize 逻辑回退为 Day/Night；Workspace 数据不受影响。

## Open Questions

无。Drizzle 与 Breeze 的具体视觉将在独立后续 proposal 中确定。
