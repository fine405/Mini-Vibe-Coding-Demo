# Design QA

- Source visual truth: `/Users/boqingyun/.codex/generated_images/019f667a-b678-7663-ad86-f246daba37da/exec-66c9e74c-5e0f-4881-b813-92abcb717d6a.png`
- Implementation screenshot: unavailable; no in-app browser or Chrome instance is available in this session.
- Intended viewport: 1235 × 1274, matching the selected source image.
- State: dark theme, configured provider, empty-to-active conversation transition.

**Findings**

- [P0] Browser-rendered comparison evidence is unavailable.
  Location: Coding Agent empty state and composer transition to the active conversation.
  Evidence: the selected source image is available, but the browser runtime reports no available browser backends, so the local implementation cannot be captured at the matching viewport.
  Impact: layout, wrapping, responsive behavior, focus styling, and visual fidelity cannot be signed off from code or automated tests alone.
  Fix: connect an in-app browser or Chrome instance, capture the local app at the matching viewport and state, and run the full-view and focused comparisons below.

**Open Questions**

- None about the selected direction. Visual acceptance remains pending only because browser capture is unavailable.

**Full-view Comparison Evidence**

- Source image opened successfully and measures 1235 × 1274.
- No implementation screenshot could be captured, so no side-by-side full-view comparison was performed.

**Focused Region Comparison Evidence**

- Not performed. The composer, starter rows, and header require a browser-rendered capture before focused comparison.

**Required Fidelity Surfaces**

- Fonts and typography: implemented with the project's existing Geist variable font; visual weight, wrapping, and optical balance remain unverified.
- Spacing and layout rhythm: the selected centered hierarchy, composer-first ordering, and 420ms shared-layout transition are implemented; rendered motion and narrow-panel resilience remain unverified.
- Colors and visual tokens: implemented with existing neutral theme tokens plus the selected restrained blue accent. The ready-state submit button remains blue in both composer positions; rendered contrast remains unverified.
- Image quality and asset fidelity: the selected design contains no raster assets. Existing Lucide icons are used consistently with the product's icon system; rendered alignment remains unverified.
- Copy and content: title, description, composer placeholder, and all three starter prompts match the selected direction.

**Primary Interactions Tested**

- Automated tests verify that the empty-state heading is present and disappears after submission while the conversation continues.
- Automated tests verify that exactly one shared composer exists before and after submission and that the ready-state submit button remains blue after returning to the bottom.
- The shared-layout transition respects the user's reduced-motion preference.
- Existing submission, stop, provider selection, and ChangeSet tests pass.
- Browser hover, focus, keyboard traversal, responsive layout, and console-error checks could not be performed.

**Implementation Checklist**

1. Connect a supported browser backend.
2. Capture the empty chat pane at 1235 × 1274 in dark mode with a configured provider.
3. Compare the source and implementation in one side-by-side image.
4. Inspect the header, hero composer, and starter rows at full and narrow panel widths.
5. Fix any P0/P1/P2 differences and repeat until the result passes.

**Follow-up Polish**

- Defer P3 polish decisions until the first browser-rendered comparison exists.

**Comparison History**

- Pass 1: blocked before comparison because no browser backend or implementation screenshot was available. No visual fixes were claimed from this pass.
- Pass 2: the composer transition and persistent blue ready-state button were implemented and covered by automated tests; browser capture remained unavailable, so visual comparison is still blocked.

final result: blocked

---

# Agent Draft Editor Design QA

- Source visual truth: `/Users/boqingyun/Library/Mobile Documents/.Trash/截屏2026-07-16 00.35.07.png`
- Implementation screenshot: `/tmp/mini-lovable-agent-draft-final.png`
- Full-view comparison: `/tmp/mini-lovable-agent-draft-comparison.png`（左侧参考，右侧实现）
- Focused diff comparison: `/tmp/mini-lovable-agent-draft-focused-comparison.png`（左侧参考，右侧实现）
- Responsive captures: `/tmp/mini-lovable-agent-draft-448.png`, `/tmp/mini-lovable-agent-draft-256.png`
- Viewport: implementation 1280 × 720; source crop 2064 × 712，比较图按同宽缩放参考图。
- State: dark theme, two projected Agent file changes, first file active, unified diff collapsed around a 46-line unchanged region.

## Full-view comparison evidence

实现保留了参考图的核心视觉结构：单列 unified diff、原/新行号、整行红绿语义背景、深色代码表面和折叠的未变化区域。参考图没有定义 toolbar，因此 toolbar 按现有 Mini Lovable 的 Geist、颜色 token、圆角、边框和 Lucide 图标体系实现，并固定在编辑器底部中央。

## Focused region comparison evidence

代码区域的行号、语法高亮、删除/新增颜色和折叠分隔都清晰可辨。实现使用 Monaco 自带的可展开折叠提示，比参考图中的省略号更明确。无需额外的局部裁切：focused comparison 已覆盖 diff 行、折叠区和编辑器密度；完整截图覆盖 toolbar、底部安全区和总体布局。

## Required fidelity surfaces

- Fonts and typography: 代码继续使用 Monaco 等宽字体；toolbar 使用项目现有 Geist。字号、行高、截断和小号状态文本在 1280、448、256 像素宽度下均可读。
- Spacing and layout rhythm: diff 占满编辑表面，toolbar 保留底部安全区；正常编辑器宽度显示文件名，窄容器自动收起操作文字和文件名，所有控制仍在可视范围内。
- Colors and visual tokens: 新增/删除继续使用 Monaco 语义红绿；toolbar 完全复用现有背景、前景、边框和阴影 token。与参考图的深色底色存在轻微色值差异，这是沿用产品主题的预期差异。
- Image quality and asset fidelity: 参考图没有独立 raster 资产、品牌图或插画。实现未引入占位图、CSS 图形或手写 SVG；操作图标复用项目现有 Lucide 图标库。
- Copy and content: 宽容器显示 `Discard file`、`Discard all` 和 `current of total`；窄容器隐藏文字时仍保留完整 aria-label 与 title。

## Primary interactions and console

- Previous / Next 在两处修改间切换，边界按钮正确禁用。
- Discard file 移除当前修改并转到剩余文件。
- Discard all 清空 toolbar 和投影。
- 448 px 默认编辑器宽度与 256 px 最小宽度均无 toolbar 截断。
- 最终交互流程检查 console：无 error 或 warning。

## Comparison history

### Iteration 1

- [P2] Diff 卸载时 Monaco 报 `TextModel got disposed before DiffEditorWidget model got reset`。
  - Fix: 让 React wrapper 保留当前 model，待 diff editor 完成卸载后再在 microtask 中释放 model。
  - Post-fix evidence: 在干净页面重复 Next、Discard file、Discard all 后 console 为空。
- [P2] 原 toolbar 在 448 px 宽度勉强贴边，并会在 256 px 最小面板宽度溢出。
  - Fix: 加入 editor container query；窄宽度隐藏重复文字/文件名、收紧间距，并限制 toolbar 最大宽度。
  - Post-fix evidence: 448 px 和 256 px captures 中所有五个控制都完整可用。

## Findings

无剩余 P0、P1 或 P2 问题。

### Follow-up polish

- [P3] 参考图和产品现有 Monaco dark theme 的背景与 diff 饱和度略有差异；为保持项目主题一致，本次不覆盖 Monaco 全局配色。

final result: passed
