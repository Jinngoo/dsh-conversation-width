# @jinngoo/dsh-conversation-width

DSH Web UI 插件：**把会话内容列加宽，并在输入框下方给出一个宽度滑杆**。
Widens the Harness Web conversation content column and adds a width slider under the composer.

## 它做什么

- 把 Harness 自己的宽度轴 `--dsh-chat-content-width` 固定为滑杆值（默认 `1600px`），
  正文列、输入框卡片、问题/审批/计划卡片一起变宽。
- 在输入框下方（`conversation.composer.dock`，即「Ambient entries below the composer card」）
  放一行控件：`内容宽度 [滑杆] ⟨模式按钮⟩`。
- 模式按钮显示当前状态：固定时显示 `1600px`（`aria-pressed=true`），自动时显示 `自动`。
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
