## Context

每次 `/api/chat` 请求都会从浏览器快照创建服务端 `RunWorkspace`。Agent 工具在该副本中执行，`finalize_changes` 才返回结构化 `WorkspaceChangeSet`。客户端目前会流式渲染工具状态，但只有 finalize 结果会进入 `ChangeSetReview`；`EditorPane` 只读取权威浏览器工作区。

AI SDK 的成功工具部件已经包含实现实时投影所需的数据：

- `write_file` 的 input 包含完整 `path` 与 `content`，output 包含规范化 path、hash 和 bytes；
- `delete_file` 的 input 包含 path，成功 output 明确标识删除；
- `finalize_changes` output 是经过 schema 校验的完整 ChangeSet。

Monaco 0.55 已支持 unified diff、折叠未变化区域和 diff 导航，因此不需要新增编辑器依赖。

## Goals / Non-Goals

### Goals

- 每次 Agent 文件写入成功后立即在编辑器中给出可信、稳定的 diff 反馈。
- 保持浏览器工作区、持久化和 Preview 在人工确认前完全不变。
- 让编辑器 toolbar 与聊天 ChangeSet 审核共享放弃/选择语义。
- 正确处理重复写入、新建、删除、停止、错误、重新生成和应用冲突。

### Non-Goals

- 不展示尚在 `input-streaming` 阶段的半截文件内容。
- 不让用户直接编辑 Agent draft 的 modified 一侧。
- 不实时执行 Agent draft，也不把它传给 Sandpack Preview。
- 不新增跨请求或刷新后的 draft 持久化。
- 不新增 hunk 级 inline 接受/拒绝按钮；现有聊天 hunk 审核继续承担细粒度选择。

## Decisions

### 1. 使用客户端临时投影，而不是乐观写入 Workspace

新增一个聚焦的 Agent change session store，保存：

```ts
interface AgentChangeSession {
  runId: string
  phase: "running" | "finalized"
  baseRevision: string
  baseFiles: WorkspaceFiles
  changesByPath: Record<string, ProjectedAgentChange>
  orderedPaths: string[]
  activePath: string | null
  discardedPaths: Set<string>
  changeSet: WorkspaceChangeSet | null
  selections: Map<number, Set<number>> | null
}
```

该 store 是 UI session state，不是第二个 Workspace。它不能写 IndexedDB，也不能向 Preview 提供文件 map。唯一权威写入仍是 `browserWorkspace.apply()`。

直接把每次 Agent 写入应用到浏览器工作区虽然能复用现有 modified/revert 状态，却会导致未审核代码持久化和执行、finalize ChangeSet hash 冲突、Stop 后遗留部分修改，因此不采用。

### 2. 只消费成功完成且可校验的工具结果

客户端投影 hook 扫描 AI SDK UI messages，并以 `toolCallId` 去重。只有工具部件进入 `output-available` 后才处理：

- `write_file`：校验 input/output 结构、规范化 path，并验证 output hash 与 input content 一致，然后更新对应草稿；
- `delete_file`：校验成功 output 后记录删除草稿；
- `finalize_changes`：使用现有 schema 解析，并以返回 ChangeSet 重新校准整个 session。

`input-streaming`、`input-available`、`output-error` 和无法验证的数据不会改变编辑器投影。这样 UI 不会显示模型尚未成功写入 shadow workspace 的内容。

### 3. 请求快照是 diff 的 original 一侧

`prepareSendMessagesRequest` 取得快照后立即开始新的 draft session。更新操作的 original 内容来自该快照，而不是之后可能变化的浏览器文件；这与服务端 Agent 实际检查的基准一致。

投影规则：

- update：`snapshot content → latest write content`；
- create：`empty → latest write content`；
- delete：`snapshot content → empty`；
- 写回原始内容：从修改列表移除该路径。

同一路径多次写入只保留最新内容，`orderedPaths` 保留该路径首次成功变更时的位置。

### 4. 编辑器显示只读 unified diff

`EditorPane` 优先显示当前路径的 Agent draft；没有 draft 时继续使用现有 editor/diff 行为。Agent draft 使用 Monaco DiffEditor：

- `renderSideBySide: false`；
- `hideUnchangedRegions.enabled: true`；
- original 与 modified 均只读；
- 为底部悬浮 toolbar 预留滚动空间；
- update/create/delete 均可显示，即使该路径尚不存在于浏览器文件树。

首个成功变更会自动打开并激活对应文件。之后其他文件加入 session 时不自动切换，避免 Agent 连续写文件时抢焦点；用户通过 toolbar 主动导航。

### 5. Toolbar 的“回退”表示放弃待审核内容

因为权威工作区尚未改变，toolbar 使用 `Discard file` / `Discard all`，而不是暗示已经执行持久化撤销。

- Discard file：把当前路径加入 `discardedPaths`，隐藏其 draft；同一 run 后续对该路径的写入仍保持放弃，finalize 后该文件默认无选中 hunks。
- Discard all：若 Agent 仍运行，先停止请求，再清空整个 draft session。
- Previous/Next：按 `orderedPaths` 在未放弃的修改文件间移动，到达边界时禁用。
- 指示器：显示 `current / total files`。

若放弃的是一个尚未存在于浏览器工作区的新文件，离开 draft 后关闭对应临时 tab；已有文件则恢复普通编辑器内容。

### 6. Finalize 后共享一份审核选择状态

`finalize_changes` 是最终权威结果。session 用 ChangeSet 替换镜像内容，并加载 hunks；所有未放弃文件默认全选，已放弃路径默认不选。

`ChangeSetReview` 不再独占本地 selection state，而是读取和更新同一 session 的 selections。这样：

- toolbar 放弃文件会立即反映到聊天复选框；
- 聊天取消文件/hunk 后，toolbar 的可审核文件集合保持一致；
- Apply 始终把同一 selection 转换为 `Workspace.apply()` 输入。

若 ChangeSet 与当前 session 不匹配，审核组件可以初始化独立的全选状态，以保持历史聊天消息可查看，不让旧消息覆盖当前 run。

### 7. 生命周期必须显式清理

| Event | Draft behavior |
|---|---|
| 新提交或 regenerate | 清理旧 session，以新的浏览器快照开始 |
| Stop、超时或未 finalize 错误 | 清理 session；服务端 shadow 已不可继续应用 |
| Clear conversation / New project | 清理 session |
| Reject | 清理 session，浏览器工作区不变 |
| Apply success | 清理 session，编辑器自然显示新的权威工作区 |
| Apply conflict | 保留 session 和 selections，提供 regenerate |
| Undo applied transaction | 沿用现有 Workspace undo，不恢复旧 draft session |

## Risks / Trade-offs

- **客户端镜像与服务端 shadow 偏离**：只处理成功 output，并在 finalize 时用完整 ChangeSet 强制校准。
- **大文件多次写入造成渲染抖动**：沿用 256 KiB 文件上限，只在完整工具成功后更新，不处理 token 级流。
- **用户同时编辑目标文件**：draft diff 仍以请求快照为基准；最终 apply 使用现有 before-hash 冲突保护。
- **历史聊天消息与当前 session 混淆**：所有 session 操作以当前 run/changeSet ID 约束，历史 review 保持只读或独立状态。
- **旧 toolbar 代码绕过 Workspace**：只参考其视觉和快捷键，不恢复旧的直接 `setFiles` 应用逻辑。

## Migration Plan

1. 先以纯 reducer/store 测试覆盖工具事件和生命周期。
2. 接入 Chat 流，但保持 Editor UI 不消费 draft，验证不会改变 Workspace。
3. 接入 Editor unified diff 与 toolbar。
4. 迁移当前 ChangeSetReview selections 到共享 session，并补完整浏览器表面测试。
5. 无数据迁移；功能关闭或 session 清理后回到现有行为。
