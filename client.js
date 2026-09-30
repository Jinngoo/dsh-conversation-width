/**
 * Client half of @jinngoo/dsh-conversation-width.
 *
 * Mechanism
 * ---------
 * The Harness centers the transcript, the composer card, takeover cards and
 * the question / approval / plan panels on ONE axis: the custom property
 * `--dsh-chat-content-width`. The Conversation body element declares it
 * (ui-conversation `skeleton/ConversationRoot.module.css`, rule `.body`) as
 *
 *   --dsh-chat-content-width: var(--dsh-chat-user-width,
 *                               clamp(680px, column * 0.64, 920px))
 *
 * That declaration lives on the element that also carries the stable
 * `data-conversation-content` attribute, and it is that element's OWN
 * declaration — an inherited value from `:root` or `body` can never override
 * it. The two supported overrides are therefore:
 *
 *   1. an inline `--dsh-chat-content-width` on that element, or
 *   2. a stylesheet declaration on that element with higher specificity.
 *
 * This plugin uses (2): `html [data-conversation-content]` is 0-1-1 against the
 * host's `.body` at 0-1-0, so it wins on specificity alone. No `!important`, no
 * DOM writing outside this component, and the host's own inline
 * `--dsh-chat-user-width` (which it writes on the body's PARENT while dragging)
 * is left untouched.
 *
 * Why the value is `min(<px>, 100%)`: the property is consumed in several
 * contexts (the transcript column, the composer card capped at
 * `content + 32px`, the user bubble at `content * 0.702`, the ≥4-column table
 * breakout), and each resolves `100%` against its own containing block. A
 * pinned width larger than the available room therefore degrades to "fill the
 * room" instead of overflowing any of them. The transcript column itself
 * already carries `width: 100%`, so an oversized pin is visually identical to
 * "fill".
 *
 * The rule exists only while the preference is pinned; auto mode removes it and
 * the Harness default — including its hover-revealed drag handles — returns.
 * Those handles are hidden while pinned, because they would otherwise look
 * draggable while writing `--dsh-chat-user-width`, which this rule overrides.
 */
window.__ModuleLoader__.load({
  id: '@jinngoo/dsh-conversation-width',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace owned by this plugin. */
    const NS = 'dsh-conversation-width'
    /** Dock entry key: a fresh id adds a cell beside the shipped ones. */
    const DOCK_ID = 'conversation-width'
    /** Slot: ambient entries below the composer card. */
    const DOCK_SLOT = 'conversation.composer.dock'
    /** Persisted preference (per browser profile, like the Harness' own width key). */
    const ENABLED_KEY = 'dsh.conversationWidth.enabled'
    const VALUE_KEY = 'dsh.conversationWidth.value'
    /** Slider domain; values above the available room simply fill it. */
    const MIN = 720
    const MAX = 2400
    const STEP = 20
    const DEFAULT_VALUE = 1600

    const DICTS = {
      zh: {
        label: '内容宽度',
        auto: '自动',
        slider: '会话内容列宽度',
        sliderTitle: '拖动即固定为该宽度，不必再拖正文两侧的手柄',
        pinnedTooltip: '当前：固定宽度。点击回到 Harness 内置宽度（正文两侧手柄恢复可用）',
        autoTooltip: '当前：Harness 内置宽度。点击固定为滑杆宽度',
      },
      en: {
        label: 'Content width',
        auto: 'Auto',
        slider: 'Conversation content column width',
        sliderTitle: 'Dragging pins this width; the handles beside the transcript are then unnecessary',
        pinnedTooltip: 'Pinned width. Click for the Harness default width (the handles beside the transcript come back)',
        autoTooltip: 'Harness default width. Click to pin the slider width',
      },
    }

    /** Component chrome; only theme-token references, so a rename degrades looks, not rendering. */
    const CHROME_CSS = [
      '.cw-dock{display:flex;align-items:center;gap:8px;flex:0 1 auto;min-width:0;height:22px;',
      'padding:0 10px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);',
      'color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);',
      'line-height:22px;white-space:nowrap}',
      '.cw-label{flex:none}',
      '.cw-range{flex:0 1 auto;width:112px;min-width:56px;height:16px;margin:0;background:transparent;',
      'accent-color:var(--dsw-alias-brand-primary);cursor:pointer}',
      '.cw-dock[data-dsh-conversation-width="auto"] .cw-range{accent-color:var(--dsw-alias-state-idle-primary);opacity:.6}',
      '.cw-mode{flex:none;min-width:52px;height:18px;padding:0 7px;border:0.5px solid var(--dsw-alias-border-l2);',
      'border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);',
      'font:inherit;font-size:12px;line-height:16px;font-variant-numeric:tabular-nums;cursor:pointer}',
      '.cw-mode[aria-pressed="true"]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}',
      '.cw-mode:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}',
    ].join('')

    /** Snap a requested width onto the slider domain. */
    function clampWidth(value) {
      if (!Number.isFinite(value)) return DEFAULT_VALUE
      return Math.min(MAX, Math.max(MIN, Math.round(value / STEP) * STEP))
    }

    /** Read the persisted preference; the default is pinned at DEFAULT_VALUE. */
    function readPreference() {
      try {
        const enabled = window.localStorage.getItem(ENABLED_KEY) !== '0'
        const raw = window.localStorage.getItem(VALUE_KEY)
        const parsed = raw === null ? Number.NaN : Number(raw)
        return { enabled, value: Number.isFinite(parsed) ? clampWidth(parsed) : DEFAULT_VALUE }
      } catch {
        return { enabled: true, value: DEFAULT_VALUE }
      }
    }

    /** Persist best-effort: a blocked storage must not break the live control. */
    function writePreference(state) {
      try {
        window.localStorage.setItem(ENABLED_KEY, state.enabled ? '1' : '0')
        window.localStorage.setItem(VALUE_KEY, String(state.value))
      } catch { /* storage unavailable (private mode): keep the in-memory state */ }
    }

    /** One preference shared by every mounted dock: the slot is resident, not a singleton guarantee. */
    function createStore() {
      let state = readPreference()
      const listeners = new Set()
      return {
        get: () => state,
        update(patch) {
          const next = { enabled: patch.enabled ?? state.enabled, value: patch.value ?? state.value }
          if (next.enabled === state.enabled && next.value === state.value) return
          state = next
          writePreference(state)
          for (const listener of [...listeners]) listener()
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
      }
    }

    /**
     * The document-wide axis rule, or nothing in auto mode.
     * @param {{enabled: boolean, value: number}} state - current preference.
     * @returns {string} CSS text for the plugin's style element.
     */
    function axisCss(state) {
      if (!state.enabled) return ''
      return 'html [data-conversation-content]{--dsh-chat-content-width:min('
        + state.value + 'px,100%)}'
        + 'html [data-width-handle]{display:none}'
    }

    /**
     * The composer-dock control: a width slider and one mode toggle.
     *
     * Both stay interactive in auto mode on purpose — dragging the slider pins a
     * width, and the mode button returns to the pinned width — so the control can
     * always leave the state it is in.
     *
     * @param {{store: object, t: (key: string) => string}} props - owner-supplied store and translate.
     * @returns {object} the dock row, with the axis style it owns.
     */
    function WidthDock(props) {
      const { store, t } = props
      const [state, setState] = React.useState(store.get)
      React.useEffect(() => store.subscribe(() => { setState(store.get()) }), [store])
      const mode = state.enabled ? 'pinned' : 'auto'

      return h(React.Fragment, null,
        h('style', null, axisCss(state)),
        h('style', null, CHROME_CSS),
        h('div', { className: 'cw-dock', 'data-dsh-conversation-width': mode },
          h('span', { className: 'cw-label' }, t('label')),
          h('input', {
            className: 'cw-range',
            type: 'range',
            min: MIN,
            max: MAX,
            step: STEP,
            value: state.value,
            'aria-label': t('slider'),
            title: t('sliderTitle'),
            onChange: (event) => {
              store.update({ enabled: true, value: clampWidth(Number(event.target.value)) })
            },
          }),
          h('button', {
            className: 'cw-mode',
            type: 'button',
            'aria-pressed': state.enabled,
            title: state.enabled ? t('pinnedTooltip') : t('autoTooltip'),
            onClick: () => { store.update({ enabled: !state.enabled }) },
          }, state.enabled ? state.value + 'px' : t('auto')),
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const store = createStore()
        const t = ctx.locale.bind(NS)

        ctx.effect(() => {
          const disposeZh = ctx.locale.register(NS, 'zh', DICTS.zh)
          const disposeEn = ctx.locale.register(NS, 'en', DICTS.en)
          return () => { disposeZh(); disposeEn() }
        }, 'conversation-width: dictionaries')

        /** Registered component: the store and translate are owned by this activation. */
        function Dock() {
          return h(WidthDock, { store, t })
        }

        ctx.slots.inject(DOCK_SLOT, () => ctx.slots.register({
          name: DOCK_SLOT,
          id: DOCK_ID,
          order: 10,
        }, Dock))
      },
    }
  },
})
