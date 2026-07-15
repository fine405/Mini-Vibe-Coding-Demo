## 1. Draft State and Tool Projection

- [x] 1.1 先写 reducer/store 测试，覆盖 update/create/delete、同文件重复写入、写回原内容、toolCall 去重和非法/失败工具输出。
- [x] 1.2 实现仅内存的 Agent change session store，保存请求快照、投影变更顺序、当前文件、放弃路径、finalized ChangeSet 和审核选择。
- [x] 1.3 实现 AI SDK message 投影 hook，只消费成功且验证通过的 `write_file`、`delete_file` 和 `finalize_changes` 结果。
- [x] 1.4 在请求开始、Stop、错误、regenerate、clear conversation 和 new project 路径中接入明确的 session lifecycle。

## 2. Editor Live Diff Surface

- [x] 2.1 先写 EditorPane/EditorDiffView 测试，覆盖首次自动打开、不抢占后续焦点、重复写入刷新及 update/create/delete 展示。
- [x] 2.2 扩展 EditorDiffView 支持只读 unified diff、折叠未变化区域和 toolbar 安全区，同时保留现有普通文件 diff 用法。
- [x] 2.3 让 EditorPane 优先显示当前 Agent draft，并支持尚不存在于浏览器工作区的新文件临时 tab。
- [x] 2.4 新增底部悬浮 toolbar：Discard file、Discard all、Previous、Next 和 `current / total files` 指示器。
- [x] 2.5 为 toolbar 补边界、键盘可访问名称、当前文件放弃和全部放弃测试。

## 3. Final Review Integration

- [x] 3.1 先写共享审核状态测试，证明 toolbar 放弃文件与聊天文件/hunk 选择双向一致。
- [x] 3.2 将当前 ChangeSetReview 的 selection state 接入 Agent change session，同时保持历史/非当前 ChangeSet 的安全回退行为。
- [x] 3.3 保持 Apply 只调用 `browserWorkspace.apply()`；成功或 Reject 后清理 session，冲突时保留并支持 regenerate。
- [x] 3.4 添加端到端组件测试：成功 `write_file` 后编辑器实时显示，但 browser workspace 与 Preview 输入不变；Apply 后才更新权威状态。

## 4. Verification and Review

- [x] 4.1 运行相关单测、typecheck 和 lint，修复本变更引入的问题。
- [x] 4.2 运行完整测试和 production build。
- [x] 4.3 对照 proposal/spec 做独立 review，重点检查未审核内容未进入 Workspace、IndexedDB 或 Preview。
- [x] 4.4 更新任务勾选、提交当前分支，并记录验证结果。
