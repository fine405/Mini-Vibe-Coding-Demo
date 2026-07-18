## 0. Approval

- [x] 0.1 用户批准主题名称、快捷键、Summer 素材方向以及 Drizzle/Breeze 的占位行为后再开始实现。

## 1. Theme State and Migration

- [x] 1.1 先增加 store 测试，覆盖五个 ThemeMode 的 ResolvedTheme 映射、Night 默认值及 legacy `light`/`dark`/`auto` 迁移。
- [x] 1.2 将 ThemeMode 扩展为 `day`、`night`、`summer`、`drizzle`、`breeze`，集中实现解析与 DOM light/dark 应用逻辑。
- [x] 1.3 验证 Editor、Diff 与 Preview 继续只消费 ResolvedTheme，Day/Night 的现有颜色和 Monaco theme 不回归。

## 2. Header Menu and Keyboard Shortcuts

- [x] 2.1 先扩展 WorkbenchHeader 测试，覆盖独立 Theme trigger、五个菜单项、弱化快捷键、当前选中状态，以及 More 菜单中不存在 Theme。
- [x] 2.2 用 Theme menu 替换现有 ThemeToggle，保持 Header 顺序为 Command Palette → Theme → More。
- [x] 2.3 先增加快捷键测试，覆盖普通页面上的 `D/N/S/R/B`、输入框/textarea/select/contenteditable/Monaco textarea 忽略，以及 Meta/Ctrl/Alt 组合不触发。
- [x] 2.4 实现单字母映射并复用 store `setMode`；Drizzle 与 Breeze 可选择、可持久化并显示 `Soon`。

## 3. Summer Video and Audio Ambience

- [x] 3.1 将 `https://dany.works/leaves.mp4` 与 `https://dany.works/forest.mp3` 复制为本地 Demo 资源，并分别校验 SHA-256 为 `79adbb7e31e20085e974b278b60b52c4bb5f8132beeee6aa38a6eac682ed3d75` 和 `db189a28c237a74f071b5dfa99463daac3cfdf9decd623e2f6e32d1d35141bec`；不裁切、不交叉淡化、不二次转码。
- [x] 3.2 在两个资源旁记录来源 URL、下载日期、文件元数据与“仅限本地 Demo、公开部署前需获许可或替换”的限制。
- [x] 3.3 先增加媒体测试，覆盖仅 Summer 激活、视频和音频成对 play/pause/reset、视频 muted/loop/playsInline、音频 loop、播放 rejection 降级及 pointer-events none。
- [x] 3.4 实现全屏 multiply 视频层、700ms 淡入淡出、森林环境声与高于应用/低于菜单的层级，并在实际 Day/Summer/Night 切换中完成视听验收。

## 4. Documentation and Verification

- [x] 4.1 更新 `docs/KEYBOARD_SHORTCUTS.md`，记录五个主题键及“仅非输入区域生效”的规则。
- [x] 4.2 运行 theme、WorkbenchHeader、Editor、Preview 相关测试和 `pnpm typecheck`，修复本变更引入的问题。
- [x] 4.3 运行完整 `pnpm check`。
- [x] 4.4 在桌面宽屏实际检查 Day/Night 无视觉回归、Summer 清晰度/视频循环/环境声启停/菜单可读性，以及 Drizzle/Breeze 的 `Soon` 状态。
- [x] 4.5 对照 proposal/design/spec 完成范围 review，只在所有验证通过后勾选任务。

## 5. Day/Night Noise Texture

- [x] 5.1 核对 lab01.dev 的源码与参考图，确认 grayscale、screen blend 以及 10%/15% 透明度的视觉基线。
- [x] 5.2 先增加行为测试，覆盖不含运行时 SVG 的静态纹理层、Night/Day 透明度、pointer-events none，以及三个季节主题不显示该层。
- [x] 5.3 生成 256×256 灰度 PNG，并实现固定 z-30 平铺噪声层；Night 使用 10% opacity，Day 使用 15% opacity 与浅暖白 `#F3F2F1` 基底，保持低于 Summer 视频和 Radix 菜单。
- [x] 5.4 在实际桌面宽屏分别验收 Day/Night 的纹理强度、平铺接缝、文字/Monaco 清晰度、菜单层级和交互穿透。
- [x] 5.5 运行 OpenSpec strict validation、相关测试与完整 `pnpm check`，并完成 design QA。

## 6. Random Initial Theme

- [x] 6.1 先增加 store 行为测试，覆盖无偏好时随机选择并持久化，以及已有偏好不调用随机逻辑。
- [x] 6.2 在 hydration 中仅对缺失存储键的首次访问随机选择五个 ThemeMode 之一，并复用现有 `setMode` 应用和保存主题。
- [x] 6.3 运行相关测试、typecheck、完整 `pnpm check` 和 OpenSpec strict validation。
