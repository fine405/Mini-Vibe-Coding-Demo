# Change: 增加季节主题菜单与 Summer 叶影环境效果

## Why

当前 Header 只有一个在 Day/Night 之间切换的图标按钮，无法承载更多带名称的氛围主题，也没有可发现的单字母快捷键。Demo 需要把主题切换变成一个独立、可录屏展示的入口，并先为后续天气效果稳定主题状态模型。

## What Changes

- 将 Header 中现有单按钮 Theme Toggle 替换为独立的仅图标 `Theme` 下拉菜单，保持在 Header 一级，与 `More` 菜单分离。
- 菜单提供 `Day`、`Night`、`Summer`、`Drizzle`、`Breeze`、`Snow` 六项，并在每项右侧以弱化样式显示 `D`、`N`、`S`、`R`、`B`、`W` 快捷键。
- 仅当焦点不在 `input`、`textarea`、`select`、Monaco 隐藏输入区或 `contenteditable` 元素中，且没有按下 Meta/Ctrl/Alt 时，单字母快捷键才切换主题。
- 保留现有浅色/深色结构，并将面向用户的名称统一为 Day/Night；Day 的页面基底改为浅暖白 `#F3F2F1`；Day/Night 参考 lab01.dev 叠加不阻断交互的静态灰度噪声平铺纹理，共用 screen blend；Monaco 与 Preview 继续只消费解析后的 light/dark color scheme。
- Summer 复用 dany.works 的完整氛围方式：在 Day 配色上叠加全屏循环叶影视频，并同步循环播放森林环境声；视频使用 `object-fit: cover`、`mix-blend-mode: multiply`、pointer-events none 与淡入淡出。
- Summer 暂时直接使用 [dany.works/leaves.mp4](https://dany.works/leaves.mp4) 与 [dany.works/forest.mp3](https://dany.works/forest.mp3)：视频为 12 秒纯叶影循环，音频为约 196 秒森林环境声；实现时复制为本地 Demo 资源，不热链也不二次转码。
- `Drizzle`、`Breeze` 和 `Snow` 本阶段作为可选择、可持久化的入口，暂时解析为 Day 配色并显示弱化的 `Soon` 状态，不增加雨滴、黄色枫叶、风场或下雪效果。
- 当本地没有主题偏好时，从六个主题中随机选择一个仅用于当前加载的初始主题，不写入 localStorage；只有菜单或快捷键的主动选择才持久化，已有偏好继续稳定恢复。
- 更新主题与快捷键文档，并为状态迁移、菜单位置、快捷键输入保护和 Summer 视频/音频生命周期增加测试。

## Impact

- Affected specs: `theme`。
- Affected code: `src/modules/theme/`、`src/components/ThemeToggle.tsx`（替换为菜单组件）、`src/components/ThemeMenu.tsx`、`src/modules/layout/WorkbenchHeader.tsx`、`docs/KEYBOARD_SHORTCUTS.md` 及相关测试。
- Assets: 新增来自 dany.works 的临时 Summer 背景 MP4 与森林环境声 MP3，以及项目本地生成的 256×256 灰度噪声 PNG。原站媒体未声明可复用许可，因此仅用于当前本地 Demo，公开部署前必须取得许可或替换素材；噪声 PNG 不含第三方素材。
- Persistence: 继续使用 `mini-lovable-theme`；旧值 `light`、`dark`、`auto` 在读取时迁移为新 mode，不清空用户本地存储。
- Dependencies: 不新增运行时依赖。
- Non-breaking: Workspace、Agent、Editor、Preview 数据模型和现有 More 菜单动作均不变。

## Approval

用户已于 2026-07-18 指定 Summer 暂时直接使用 dany.works 的叶影视频，并补充要求保留原站森林环境声；随后明确批准开始实现本 proposal。同日用户要求为 Day/Night 增加 subtle noise texture，并追加 [lab01.dev](https://lab01.dev/) 为具体实现参考：Night 可保持一致，Day 改用浅暖白基底；之后又将 Theme trigger 改为仅图标，并要求首次无偏好时随机初始化主题。实际体验实时 SVG 噪声后，用户进一步明确批准直接改用预渲染的平铺纹理，以减少 Day/Night 切换时的渲染负担。

同日用户要求先为“下雪天”增加主题入口，暂不实现视觉效果；因此在同一已批准的占位主题模型中增加 `Snow`、雪花图标和未冲突的 `W` 快捷键。

同日用户进一步明确：随机初始主题不得固定在 localStorage 中，只有用户主动选择主题时才持久化。
