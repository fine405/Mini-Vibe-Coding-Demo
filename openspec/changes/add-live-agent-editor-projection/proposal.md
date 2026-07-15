# Change: 实时投影 Agent 文件变更到编辑器

## Why

当前 Agent 的 `write_file` / `delete_file` 只修改服务端请求级 shadow workspace。用户在 Agent 执行期间只能看到工具状态，必须等到 `finalize_changes` 后才能在聊天审核卡片中看到完整差异，编辑器没有即时反馈。

本变更在不削弱人工审核边界的前提下，把已成功执行的 Agent 文件操作投影成浏览器内的临时草稿，并在 Monaco 编辑器中实时展示统一 diff。浏览器工作区、IndexedDB 和 Sandpack Preview 仍只在用户明确应用 ChangeSet 后更新。

## What Changes

- 新增请求级、仅内存的 Agent draft session；在聊天请求开始时保存基准快照，并只镜像成功完成的 `write_file` / `delete_file` 工具结果。
- Agent 首次修改文件后，在编辑器中自动打开只读 unified diff；同一文件后续写入实时刷新 modified 一侧，后续其他文件修改不抢占用户焦点。
- 新增编辑器底部悬浮 toolbar，支持放弃当前文件、放弃全部、切换上一个/下一个修改文件及显示当前位置。
- 支持 update/create/delete 草稿；新建文件无需先写入浏览器工作区也能在编辑器中审核。
- `finalize_changes` 到达后，以服务端返回的 ChangeSet 作为最终权威结果，并把 toolbar 的放弃选择同步到聊天中的文件/hunk 审核状态。
- Stop、未完成错误、重新生成、清空会话、拒绝或成功应用时按明确生命周期清理草稿；应用冲突时保留草稿供用户恢复或重新生成。
- 不把未审核草稿写入 `Workspace`、IndexedDB 或 Sandpack，不改变现有原子应用、hash 冲突检测和 Undo 语义。

## Impact

- Affected specs: `chat`、`editor`
- Affected code: `src/modules/chat/ChatPane.tsx`、`src/modules/agent-chat/`、`src/modules/editor/EditorPane.tsx`、`src/modules/editor/EditorDiffView.tsx` 及相关测试
- Runtime/API: 不新增服务端 API；复用 AI SDK v6 已有工具输入/输出消息部件
- Security: 浏览器权威工作区和 Preview 不接收未审核 Agent 内容，现有 shadow workspace 安全边界保持不变

## Approval Gate

本 proposal、design、spec deltas 和 tasks 经用户确认后方可开始实现。
