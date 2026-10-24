# @jinngoo/dsh-conversation-width

DSH Web UI 插件：**把会话内容列加宽，并在输入框下方给出一个宽度滑杆**。
Widens the Harness Web conversation content column and adds a width slider under the composer.

## 它做什么

- 把 Harness 自己的宽度轴 `--dsh-chat-content-width` 固定为滑杆值（默认 `1600px`），
  正文列、输入框卡片、问题/审批/计划卡片一起变宽。
- 在输入框下方（`conversation.composer.dock`，即「Ambient entries below the composer card」）
  放一个扁平控件：`⇔ [滑杆] ⟨1600px / 自动⟩`（14px 图标 + 滑杆 + 当前值/模式）。
- 外观对齐宿主自己的 dock 条目规范（`ui-chat` 的耗时/用量胶囊、`ui-conversation` 的上下文计量）：
  透明底、`label-tertiary`、悬停才出 `interactive-bg-hover`、`--dsw-radius-sm`、
  `--dsh-content-font-size-secondary` 字号、等宽数字。控件名与操作说明放在滑杆的 `title` / 按钮的 `aria-label` 里。
- 模式按钮显示当前状态：固定时显示 `1600px`（`aria-pressed=true`，`label-primary`），自动时显示 `自动`。
  拖动滑杆 = 固定为该宽度；点模式按钮 = 两种模式互切。两种模式下控件都可操作，
  不存在「卡在某一态出不来」。
- `自动` 即回到 Harness 内置行为（默认 `clamp(680px, 列宽×0.64, 920px)`，正文两侧的拖拽手柄重新可用）。

## 安装

```
dsh plugin --profile web add D:\Work\GitHub\dsh-conversation-width
```

或在 DSH 会话里用 `plugin_manager`，`action: install_bundle`、`target` 用上面的绝对目录。
装完刷新页面（新 Client 包需要重新加载 Web 资产）。卸载：

```
dsh plugin --profile web remove @jinngoo/dsh-conversation-width
```

## 机制（为什么这么写）

宽度轴由 Conversation 主体元素自己声明（ui-conversation 的
`skeleton/ConversationRoot.module.css` 里 `.body` 规则）：

```css
--dsh-chat-content-width: var(--dsh-chat-user-width, clamp(680px, 列宽 * 0.64, 920px));
```

这条声明落在**同时带着 `data-conversation-content` 属性的那个元素上**，而且是该元素
自己的声明——从 `:root` / `body` 继承下来的值永远压不过它。所以只有两种覆盖方式：
往该元素写行内变量，或用更高优先级的样式表声明。

本插件用后者：

```css
html [data-conversation-content]{--dsh-chat-content-width:min(1600px,100%)}
html [data-width-handle]{display:none}
```

- `html [data-conversation-content]` 的优先级是 0-1-1，宿主 `.body` 是 0-1-0，
  **靠优先级就赢，不需要 `!important`**，也不碰宿主自己写的行内 `--dsh-chat-user-width`。
- 值是 `min(<px>, 100%)`：这个变量被多处消费（正文列、输入卡片 `content + 32px`、
  用户气泡 `content * 0.702`、≥4 列表格的破列计算），每处的 `100%` 各自对各自的容器解析。
  固定值大于可用宽度时自然退化成「铺满」，不会把任何一处撑破。正文列本身就是
  `width: 100%`，所以「铺满」与「固定一个超大值」视觉上等价。
- 规则只在「固定」模式下存在（`automatic` 模式样式文本为空），所以 `自动` 一按就完全恢复内置行为。
- 固定模式下隐藏正文两侧的内置手柄：它们仍在写 `--dsh-chat-user-width`，
  被上面的规则盖住后拖了没有反应，留着只会让人困惑。

## 边界与取舍

- 偏好存在 `localStorage`：`dsh.conversationWidth.enabled` / `dsh.conversationWidth.value`，
  **按浏览器 profile 生效**（和 Harness 自己的 `dsh.conversation.contentWidth` 同一层级）。
  换浏览器或 Desktop 版需要各自设一次。
- 只作用于 conversation 这条轴：轨迹（Trajectory）视图的 `880px` 上限、设置页的
  `760/960px` 上限是各自硬编码的，不受影响。
- 滑杆域 `720–2400px`，步长 `20px`。值超过可用宽度即等于铺满。
- 宿主 UI 改版后，若 `data-conversation-content` / `--dsh-chat-content-width` 改名，
  插件会静默失效（不会崩，只会没有效果）——改 `client.js` 顶部的 `axisCss()` 即可。

## 验证

- 安装返回 `application: applied` 且无 `warnings`。
- 刷新页面后，输入框下方出现该行控件；拖动滑杆时正文列与输入卡片同步变宽。
- 点 `自动` 后宽度回到内置默认，正文两侧手柄可拖。
- 浅色/深色主题下都读得清（只用 `--dsw-alias-*` 主题 token）。

## 变更记录

### 0.1.2

- **外观改为与宿主 dock 条目同一套规范**（`ui-chat` 的 `StatsPills.module.css` / `ui-conversation` 的
  `ContextMeter.module.css`）：透明底、`--dsw-alias-label-tertiary` 文字、悬停才出
  `--dsw-alias-interactive-bg-hover`、`--dsw-radius-sm` 圆角、`--dsh-content-font-size-secondary` 字号、
  行高 `calc(20px + --dsh-content-font-delta-secondary)`、`tabular-nums`。
- **控件结构收敛为「图标 + 当前值」**：新增 14px 前置图标（⇔），去掉可见的「内容宽度」文字，
  完整名称与操作说明放在滑杆 `title` 与模式按钮 `aria-label`；模式按钮由"描边小胶囊"改为扁平文本按钮。
- **未改**：宽度轴规则、`localStorage` 键、滑杆域/步长、自动模式恢复内置行为。
- 原因：dock 里同时有宿主的两条扁平读数（耗时、用量）与上下文计量，
  两个插件原先的"填充胶囊"在其中显得突兀；统一到宿主规范后整行视觉同质。

### 0.1.1

- **新增** `engines.dsh: "^0.2.0-rc.1"`（`package.json`）。
  - 原因：DSH 0.2.1-alpha.3 起，安装与 profile 启动的插件兼容性判定改为「声明了
    `engines.dsh` 就由该范围单独决定，忽略 `@deepseek-ai/dsh*` peer」（`packages/boot/app-boot/src/plugin-compatibility.ts:57-61`；
    准入调用在 `packages/boot/app-boot/src/compatibility-preflight.ts:105`，安装在
    `packages/boot/plugin-manager/src/operations.ts:345`）。0.1.0 的 `engines` 只有 `node`、也没有
    DSH peer，因此任何 DSH 版本（包括将来的 0.3）都会被静默加载。
  - 范围按含预发布版本的判定：`semver.satisfies(v, range, { includePrerelease: true })`
    （`packages/boot/app-boot/src/plugin-compatibility.ts:51-53`），所以
    `^0.2.0-rc.1` = `>=0.2.0-rc.1 <0.3.0-0`：覆盖 `0.2.1-rc.2`，排除 `0.3.0-rc.1` 及以后。
  - 已用真实门禁函数核对（运行时 `0.2.1-rc.2`）：
    `evaluatePluginCompatibility(<本包 manifest>, {}, "0.2.1-rc.2")` → `undefined`（满足）；
    传 `"0.3.0"` → `requirements: { "engines.dsh": "^0.2.0-rc.1" }`（拒绝）。
- **未改** `client.js` / `index.js`：0.2.1-rc.2 下逐项核对 Client 契约仍全部成立，不改代码。
  - 模块装载：`window.__ModuleLoader__.load({ id, factory })` 与 `dsh.client`
    （`platform` / `immediately` / `inject`）仍是当前协议（`packages/client/modules/src/client/manifest.ts:356-368,173-193`；
    `packages/client/modules/src/index.ts:858-875` 校验声明并要求 `./client` 导出），与官方插件模板
    `packages/preset/agent-preset/skills/cordis-plugin-development/templates/decoration/` 一致。
  - 槽位：`conversation.composer.dock` 仍是 list 槽（`packages/client/ui-conversation/src/client/contract/slots.ts:274`，
    声明于 `src/client/apply.ts:460`），选项 `id`/`order`/`label`/`priority` 全兼容
    （`packages/client/ui-slots/src/index.ts:778-784`）；本包用独立 id，不与宿主条目争用同一 cell，无需 `priority`。
  - 宽度轴与优先级：`.body` 仍以 0-1-0 声明 `--dsh-chat-content-width`
    （`src/client/skeleton/ConversationRoot.module.css:374,384-387`），声明元素同时带
    `data-conversation-content`（`src/client/skeleton/ConversationContent.tsx:190-197`）；本包
    `html [data-conversation-content]` 为 0-1-1，仍压过它；`[data-width-handle]`
    （`src/client/skeleton/ConversationWidthControls.tsx:120`）与宿主行内写的
    `--dsh-chat-user-width`（同文件 `:142-143`，写在 body 的父元素上）语义未变。
  - 主题 token：`--dsw-alias-bg-layer-2`、`--dsw-alias-label-secondary`
    （`packages/client/ui-theme/src/styles/design-platform.css:172,223,290,341`）、
    `--dsh-content-font-size-secondary`（`packages/client/ui-theme/src/styles/gradient-shadow-text.css:58`）均仍在。
  - 已知范围限制（非本次升级引入）：选择器匹配所有 `[data-conversation-content]`，因此内嵌 occurrence
    （如子代理侧栏聊天，`packages/client/ui-subagent/src/client/sidebar-chat/index.tsx:145` 的
    `variant: 'embedded'`）也会被固定宽度覆盖，而不是保留其 `min(100% - 32px, 920px)`
    （`ConversationRoot.module.css:393-399`）。主会话之外的显示如需严格隔离，需要宿主提供区分主/内嵌的属性。
