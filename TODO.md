# mini-lovable 开发 TODO

## Day 1：项目骨架 & 基础功能 ✅

- [x] 初始化项目与基础结构
  - [x] 使用 Vite + React + TypeScript 创建项目
  - [x] 配置别名（如 `@modules/*`）和基础 Tailwind / 样式
  - [x] 建立基础目录结构：
    - [x] `/src/modules/fs`
    - [x] `/src/modules/patches`（待实现）
    - [x] `/src/modules/preview`
    - [x] `/src/modules/chat`（待完善）
    - [x] `/src/components`（按需）

- [x] 三栏布局与主题
  - [x] 使用 `react-resizable-panels` 实现左（Chat）/ 中（FileTree）/ 右（Preview）布局
  - [ ] 配置暗色/亮色主题切换（已有暗色主题）

- [x] 虚拟文件系统模块（/modules/fs）
  - [x] 设计 `VirtualFile` 结构（path, content, status: clean/new/modified）
  - [x] 使用 Zustand + immer 管理 FS 状态
  - [x] 提供基础操作：`setFiles` / `updateFileContent` / `createFile` / `deleteFile` / `renameFile` / `resetFs` / `setActiveFile`
  - [x] 初始化一个最小 React/Vite 示例项目到内存 FS

- [x] 文件树 + 编辑器（暂用 Sandpack 自带）
  - [x] 文件树组件：从 FS 构建树并支持点击打开文件
  - [x] 文件树 CRUD：New / Rename / Delete 操作
  - [x] 文件树与 Sandpack 联动：点击文件切换 activeFile
  - [x] 使用 Sandpack 自带编辑器（暂不接入 Monaco）
  - [x] Sandpack onChange 可通过 FS store 同步

- [x] 预览模块基础（/modules/preview）
  - [x] 使用 `@codesandbox/sandpack-react` 渲染虚拟项目
  - [x] 将 FS 映射到 Sandpack 的 `files`
  - [x] FS 变化时触发预览刷新
  - [x] Console 支持折叠/展开（Sandpack 自带）

---

## Day 2：Chat-to-Code、Patch 引擎、Diff 与状态标记

- [x] New Project 流程
  - [x] FileTree header 增加 `New Project` 按钮
  - [x] 点击后调用 `resetFs()` 重置 FS state
  - [x] 初始化为内置模板（/index.js + /App.js）
  - [ ] UI 显示当前项目名（可选）

- [ ] Patch 模块（/modules/patches）
  - [ ] 定义 patch 类型（create / update / delete + range replace）
  - [ ] 实现 `loadPatches()`：从 `/public/patches/*.json` 加载
  - [ ] 实现 `matchPatchByTrigger(input)`：根据 trigger 匹配 patch
  - [ ] 实现纯函数 `applyPatchToFs(fs, patch)`：
    - [ ] 支持 create：新增文件并标记 `new`
    - [ ] 支持 update：全量替换或范围替换，标记 `modified`
    - [ ] 支持 delete：删除文件
  - [ ] 为 `replace-range` 编写行级替换逻辑

- [ ] Chat UI（/modules/chat）
  - [ ] 基础聊天列表和输入框
  - [ ] 支持 `⌘Enter` 发送消息
  - [ ] 发送流程：
    - [ ] 尝试根据输入匹配 patch
    - [ ] 无匹配显示 friendly 提示
    - [ ] 有匹配则打开 Diff Review modal，并展示 summary

- [ ] Diff Review 模态框
  - [ ] 弹窗列出 patch 涉及的文件
  - [ ] 每个文件支持侧边-by-侧边 diff（Monaco diff 或 diff2html）
  - [ ] 支持 `Accept All` 应用整份 patch
  - [ ] 支持 `Cancel` 关闭并不修改 FS
  - [ ] （可选）支持按文件启用/关闭应用

- [ ] 文件级 Diff 视图与状态标记
  - [ ] 编辑区域添加 `Editor | Diff` 切换
  - [ ] 当文件状态为 `modified` / `new` 时允许打开 Diff 视图
  - [ ] 文件树中显示 `N` / `M` 徽标（FS 已支持 status，待 UI 展示）
  - [x] FS store 已支持 status 标记（clean/new/modified）

- [ ] 预览与接受检查联动
  - [ ] 确保接受 patch 后 Preview 渲染新 app（满足「create a react todo app」场景）
  - [ ] 确保第二次 patch（如「add filter buttons」）能基于现有代码更新
  - [ ] 确保手动编辑文件也会在 Preview 中体现

---

## Day 3：持久化、导入导出、测试与 UX 打磨

- [ ] IndexedDB 持久化（/modules/fs/persistence）
  - [ ] 使用 `idb-keyval` 封装 `saveWorkspace` / `loadWorkspace`
  - [ ] FS 变更时 debounce 持久化（如 500ms）
  - [ ] 页面加载时尝试恢复最近 workspace
  - [ ] 引入 `schemaVersion` 方便未来迁移

- [ ] Import / Export
  - [ ] 实现 JSON 导出：`{ filesByPath, meta }` → Blob → `.json` 下载
  - [ ] 实现 JSON 导入：解析文件并替换当前 FS
  - [ ] （可选）使用 JSZip 支持 zip 导出/导入
  - [ ] 添加「导出」「导入」按钮并接入 UI
  - [ ] 验证 Acceptance check：导出 → 清空存储 → 导入 → 预览正常

- [ ] Console 日志捕获（/modules/preview/console）
  - [ ] 在 Sandpack 内注入脚本，拦截 `console.log/error/warn`
  - [ ] 使用 `postMessage` 将日志发送到宿主页面
  - [ ] 宿主监听消息并写入日志 store
  - [ ] 右侧增加可折叠 Console 面板显示日志，支持清空

- [ ] 命令面板 & 快捷键
  - [ ] 实现简单 command palette（可用 `cmdk` 或自定义）
  - [ ] 提供操作：Open file / Search files / Accept all changes
  - [ ] 绑定快捷键：
    - [ ] `⌘K` 打开命令面板
    - [ ] `⌘P` 打开文件搜索模式
    - [ ] `⌘S` 触发保存（显式调用持久化）
    - [ ] `⌘Enter` 在 Chat 中发送消息

- [ ] 测试（Vitest + React Testing Library 等）
  - [ ] Patch 引擎单元测试：create / update / delete / replace-range
  - [ ] 持久化模块测试：保存与恢复 FS
  - [ ] 预览刷新测试：files 变化触发渲染更新

- [ ] UX 打磨（时间允许时）
  - [ ] 状态 toast（保存成功、导入导出结果、错误提示）
  - [ ] 错误边界，防止局部崩溃影响整体
  - [ ] 简单性能检查，大文件 patch 应用的响应时间
