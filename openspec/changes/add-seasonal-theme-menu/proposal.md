# Change: 增加季节主题菜单与 Summer 叶影环境效果

## Why

当前 Header 只有一个在 Day/Night 之间切换的图标按钮，无法承载更多带名称的氛围主题，也没有可发现的单字母快捷键。Demo 需要把主题切换变成一个独立、可录屏展示的入口，并先为后续天气效果稳定主题状态模型。

## What Changes

- 将 Header 中现有单按钮 Theme Toggle 替换为独立的仅图标 `Theme` 下拉菜单，保持在 Header 一级，与 `More` 菜单分离。
- 菜单提供 `Day`、`Night`、`Summer`、`Drizzle`、`Breeze` 五项，并在每项右侧以弱化样式显示 `D`、`N`、`S`、`R`、`B` 快捷键。
- 仅当焦点不在 `input`、`textarea`、`select`、Monaco 隐藏输入区或 `contenteditable` 元素中，且没有按下 Meta/Ctrl/Alt 时，单字母快捷键才切换主题。
- 保持现有浅色/深色视觉不变，并将面向用户的名称统一为 Day/Night；Monaco 与 Preview 继续只消费解析后的 light/dark color scheme。
- Summer 复用 dany.works 的完整氛围方式：在 Day 配色上叠加全屏循环叶影视频，并同步循环播放森林环境声；视频使用 `object-fit: cover`、`mix-blend-mode: multiply`、pointer-events none 与淡入淡出。
- Summer 暂时直接使用 [dany.works/leaves.mp4](https://dany.works/leaves.mp4) 与 [dany.works/forest.mp3](https://dany.works/forest.mp3)：视频为 12 秒纯叶影循环，音频为约 196 秒森林环境声；实现时复制为本地 Demo 资源，不热链也不二次转码。
- `Drizzle` 和 `Breeze` 本阶段作为可选择、可持久化的入口，暂时解析为 Day 配色并显示弱化的 `Soon` 状态，不增加雨滴、黄色枫叶或风场效果。
- 当本地没有主题偏好时，从五个主题中随机选择并持久化一个初始主题；已有偏好继续稳定恢复。
- 更新主题与快捷键文档，并为状态迁移、菜单位置、快捷键输入保护和 Summer 视频/音频生命周期增加测试。

## Impact

- Affected specs: `theme`。
- Affected code: `src/modules/theme/`、`src/components/ThemeToggle.tsx`（替换为菜单组件）、`src/components/ThemeMenu.tsx`、`src/modules/layout/WorkbenchHeader.tsx`、`docs/KEYBOARD_SHORTCUTS.md` 及相关测试。
- Assets: 新增来自 dany.works 的临时 Summer 背景 MP4、森林环境声 MP3 与来源记录；原站未声明可复用许可，因此仅用于当前本地 Demo，公开部署前必须取得许可或替换素材。
- Persistence: 继续使用 `mini-lovable-theme`；旧值 `light`、`dark`、`auto` 在读取时迁移为新 mode，不清空用户本地存储。
- Dependencies: 不新增运行时依赖。
- Non-breaking: Workspace、Agent、Editor、Preview 数据模型和现有 More 菜单动作均不变。

## Approval

用户已于 2026-07-18 指定 Summer 暂时直接使用 dany.works 的叶影视频，并补充要求保留原站森林环境声；随后明确批准开始实现本 proposal。同日用户将 Theme trigger 改为仅图标，并要求首次无偏好时随机初始化主题。
