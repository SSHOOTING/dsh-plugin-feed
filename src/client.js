window.__ModuleLoader__.load({
  id: 'dsh-plugin-feed',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require('react')
    const h = React.createElement
    const name = 'plugin-feed-client'
    const inject = ['slots']

    const FEED_ENDPOINT = '/dsh-plugin-feed/feed'
    const FEEDBACK_ENDPOINT = '/dsh-plugin-feed/feedback'

    const CATEGORY_COLORS = {
      agi: '#7556d8',
      ui: '#2878d0',
      usage: '#c26b18',
      theme: '#bd4f87',
      model: '#2d7d68',
      identity: '#6c6f8f',
      session: '#3a78a8',
      memory: '#8b5bb5',
      tools: '#2c7a7b',
      wsl: '#4f6fa8',
      browser: '#2d78c4',
      vision: '#ba5b38',
      voice: '#8f5aa8',
      docs: '#a06a24',
      skill: '#5c7a32',
      workflow: '#26745a',
      git: '#6b6260',
      notify: '#b05a30',
      dev: '#3e6f9d',
      security: '#a44444',
      remote: '#4c6c90',
      market: '#6d5ca8',
      fun: '#c08522',
    }

    function ensureStyles() {
      if (typeof document === 'undefined') return
      if (document.querySelector('style[data-dsh-plugin-feed-css]') !== null) return
      const style = document.createElement('style')
      style.dataset.dshPluginFeedCss = 'true'
      style.textContent = `
[data-plugin-feed-page]{box-sizing:border-box;max-width:1080px;padding:4px 2px 32px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
[data-plugin-feed-page] *{box-sizing:border-box}
[data-plugin-feed-page] .pf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
[data-plugin-feed-page] .pf-eyebrow{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:16px;letter-spacing:.12em;text-transform:uppercase}
[data-plugin-feed-page] .pf-title{color:var(--dsw-alias-label-primary);font-size:23px;line-height:31px;font-weight:650;letter-spacing:-.02em}
[data-plugin-feed-page] .pf-sub{color:var(--dsw-alias-label-tertiary);font-size:12px;margin-top:3px}
[data-plugin-feed-page] .pf-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
[data-plugin-feed-page] .pf-btn{box-sizing:border-box;height:30px;padding:0 13px;border:.5px solid var(--dsw-alias-border-l2);border-radius:999px;background:0 0;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
[data-plugin-feed-page] .pf-btn:hover:enabled{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
[data-plugin-feed-page] .pf-btn:disabled{cursor:default;opacity:.55}
[data-plugin-feed-page] .pf-btn-primary{background:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base,#fff)}
[data-plugin-feed-page] .pf-btn-primary:hover:enabled{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base,#fff);opacity:.9}
[data-plugin-feed-page] .pf-btn-icon{width:30px;padding:0;justify-content:center}
[data-plugin-feed-page] .pf-btn svg{width:14px;height:14px;flex:none}
[data-plugin-feed-page] .pf-strip{margin-top:12px;padding:9px 12px;border-radius:9px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
[data-plugin-feed-page] .pf-strip-error{color:#c0392b;border:.5px solid rgba(192,57,43,.25);background:rgba(192,57,43,.06)}
[data-plugin-feed-page] .pf-profile{margin-top:17px;border:.5px solid var(--dsw-alias-border-l1);border-radius:16px;background:linear-gradient(135deg,var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2)),var(--dsw-alias-bg-layer-1,transparent));padding:17px 18px;overflow:hidden;position:relative}
[data-plugin-feed-page] .pf-profile:after{content:"";pointer-events:none;position:absolute;width:240px;height:240px;border-radius:50%;right:-95px;top:-145px;background:radial-gradient(circle,rgba(76,121,192,.13),transparent 68%)}
[data-plugin-feed-page] .pf-profile-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
[data-plugin-feed-page] .pf-profile-name{display:flex;align-items:center;gap:9px;color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600}
[data-plugin-feed-page] .pf-avatar{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#3a6ea5,#7257a8);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:650;box-shadow:0 5px 15px rgba(58,110,165,.18)}
[data-plugin-feed-page] .pf-profile-copy{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:19px;margin-top:5px;max-width:620px}
[data-plugin-feed-page] .pf-kpis{display:flex;gap:22px;flex:none;padding-top:2px}
[data-plugin-feed-page] .pf-kpi{min-width:58px}
[data-plugin-feed-page] .pf-kpi-value{color:var(--dsw-alias-label-primary);font-size:18px;line-height:23px;font-weight:600;font-variant-numeric:tabular-nums}
[data-plugin-feed-page] .pf-kpi-label{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px}
[data-plugin-feed-page] .pf-insight{margin-top:12px;padding-top:12px;border-top:.5px solid var(--dsw-alias-border-l1);display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:18px}
[data-plugin-feed-page] .pf-insight-label{color:var(--dsw-alias-label-tertiary);font-size:10px;margin-bottom:6px;letter-spacing:.05em}
[data-plugin-feed-page] .pf-chips{display:flex;flex-wrap:wrap;gap:6px}
[data-plugin-feed-page] .pf-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 9px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}
[data-plugin-feed-page] .pf-chip strong{color:var(--dsw-alias-label-primary);font-weight:550}
[data-plugin-feed-page] .pf-chip-dot{width:6px;height:6px;border-radius:50%;flex:none}
[data-plugin-feed-page] .pf-chip-pain{background:rgba(181,104,41,.1);color:#9b5a24}
[data-plugin-feed-page] .pf-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;flex-wrap:wrap}
[data-plugin-feed-page] .pf-segments{display:inline-flex;align-items:center;padding:2px;border:.5px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-interactive-bg-hover)}
[data-plugin-feed-page] .pf-segment{border:0;background:0 0;border-radius:999px;height:25px;padding:0 11px;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;cursor:pointer}
[data-plugin-feed-page] .pf-segment:hover{color:var(--dsw-alias-label-primary)}
[data-plugin-feed-page] .pf-segment[data-active=true]{background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-base));color:var(--dsw-alias-label-primary);box-shadow:0 1px 4px rgba(0,0,0,.07)}
[data-plugin-feed-page] .pf-toolbar-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
[data-plugin-feed-page] .pf-meta{color:var(--dsw-alias-label-tertiary);font-size:11px}
[data-plugin-feed-page] .pf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:11px}
[data-plugin-feed-page] .pf-card{--pf-accent:#4c79b8;position:relative;min-width:0;border:.5px solid var(--dsw-alias-border-l1);border-radius:15px;background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2));padding:15px 15px 13px;display:flex;flex-direction:column;min-height:264px;overflow:hidden}
[data-plugin-feed-page] .pf-card:before{content:"";position:absolute;inset:0 0 auto;height:2px;background:linear-gradient(90deg,var(--pf-accent),transparent 72%);opacity:.72}
[data-plugin-feed-page] .pf-card:hover{border-color:var(--dsw-alias-border-l2);box-shadow:0 8px 24px rgba(20,30,45,.055)}
[data-plugin-feed-page] .pf-card-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
[data-plugin-feed-page] .pf-rank{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-tertiary);font-size:10px;font-variant-numeric:tabular-nums}
[data-plugin-feed-page] .pf-rank-num{color:var(--dsw-alias-label-primary);font-size:11px;font-weight:600}
[data-plugin-feed-page] .pf-category{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:2px 8px;font-size:10px;line-height:16px;color:var(--pf-accent);background:color-mix(in srgb,var(--pf-accent) 10%,transparent)}
[data-plugin-feed-page] .pf-category-dot{width:5px;height:5px;border-radius:50%;background:var(--pf-accent)}
[data-plugin-feed-page] .pf-score{font-size:10px;color:#23724e;background:rgba(35,114,78,.09);border-radius:999px;padding:2px 7px;white-space:nowrap;font-variant-numeric:tabular-nums}
[data-plugin-feed-page] .pf-card-head{display:flex;align-items:flex-start;gap:10px;margin-top:12px}
[data-plugin-feed-page] .pf-plugin-icon{width:35px;height:35px;border-radius:10px;background:color-mix(in srgb,var(--pf-accent) 12%,var(--dsw-alias-bg-base,#fff));color:var(--pf-accent);display:flex;align-items:center;justify-content:center;flex:none;font-size:12px;font-weight:700;text-transform:uppercase;border:.5px solid color-mix(in srgb,var(--pf-accent) 18%,transparent)}
[data-plugin-feed-page] .pf-card-titlewrap{min-width:0;flex:1}
[data-plugin-feed-page] .pf-card-title{color:var(--dsw-alias-label-primary);font-size:14px;line-height:20px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-plugin-feed-page] .pf-card-owner{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-plugin-feed-page] .pf-card-desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:19px;margin-top:10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;min-height:57px}
[data-plugin-feed-page] .pf-reasons{display:flex;flex-direction:column;gap:4px;margin-top:10px}
[data-plugin-feed-page] .pf-reason{display:flex;align-items:flex-start;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:10.5px;line-height:16px}
[data-plugin-feed-page] .pf-reason-dot{width:5px;height:5px;border-radius:50%;background:var(--pf-accent);margin-top:5.5px;flex:none;opacity:.72}
[data-plugin-feed-page] .pf-card-footer{margin-top:auto;padding-top:11px}
[data-plugin-feed-page] .pf-install{height:28px;display:flex;align-items:center;gap:7px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover);padding:0 8px;color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,monospace);font-size:9.5px;overflow:hidden}
[data-plugin-feed-page] .pf-install code{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;background:0 0;color:inherit;font:inherit;padding:0}
[data-plugin-feed-page] .pf-install button{width:21px;height:21px;padding:0;border:0;border-radius:5px;background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer;display:flex;align-items:center;justify-content:center}
[data-plugin-feed-page] .pf-install button:hover{background:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}
[data-plugin-feed-page] .pf-card-actions{display:flex;align-items:center;gap:5px;margin-top:8px;flex-wrap:wrap}
[data-plugin-feed-page] .pf-link{color:var(--dsw-alias-label-tertiary);font-size:10px;text-decoration:none;margin-right:auto;white-space:nowrap}
[data-plugin-feed-page] .pf-link:hover{color:var(--dsw-alias-label-primary)}
[data-plugin-feed-page] .pf-card-action{height:24px;padding:0 8px;border:0;border-radius:6px;background:0 0;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:10px;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
[data-plugin-feed-page] .pf-card-action:hover:enabled{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
[data-plugin-feed-page] .pf-card-action[data-active=true]{color:var(--pf-accent)}
[data-plugin-feed-page] .pf-card-action:disabled{opacity:.5;cursor:default}
[data-plugin-feed-page] .pf-card-action svg{width:12px;height:12px}
[data-plugin-feed-page] .pf-empty{border:.5px dashed var(--dsw-alias-border-l2);border-radius:14px;padding:36px 20px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px;margin-top:12px}
[data-plugin-feed-page] .pf-loading{display:flex;align-items:center;justify-content:center;gap:9px;min-height:180px;color:var(--dsw-alias-label-tertiary);font-size:12px}
[data-plugin-feed-page] .pf-spinner{width:15px;height:15px;border-radius:50%;border:1.5px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-label-secondary);animation:pf-spin .8s linear infinite}
[data-plugin-feed-page] .pf-note{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:16px;margin-top:16px;padding-top:12px;border-top:.5px solid var(--dsw-alias-border-l1)}
@keyframes pf-spin{to{transform:rotate(360deg)}}
@media (max-width:860px){
  [data-plugin-feed-page] .pf-profile-top{align-items:flex-start;flex-direction:column}
  [data-plugin-feed-page] .pf-kpis{gap:18px}
  [data-plugin-feed-page] .pf-insight{grid-template-columns:1fr}
  [data-plugin-feed-page] .pf-grid{grid-template-columns:1fr}
}
@media (max-width:540px){
  [data-plugin-feed-page] .pf-head{flex-direction:column}
  [data-plugin-feed-page] .pf-actions{justify-content:flex-start}
  [data-plugin-feed-page] .pf-kpis{width:100%;justify-content:space-between}
  [data-plugin-feed-page] .pf-toolbar{align-items:flex-start;flex-direction:column}
}
`
      document.head.appendChild(style)
    }

    function apiUrl(endpoint, params) {
      const query = new URLSearchParams(params || {})
      if (typeof window !== 'undefined') {
        const token = new URLSearchParams(window.location.search).get('token')
        if (token !== null) query.set('token', token)
      }
      const text = query.toString()
      return text === '' ? endpoint : `${endpoint}?${text}`
    }

    function compactNumber(value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '0'
      if (number >= 100000000) return `${(number / 100000000).toFixed(1)}亿`
      if (number >= 10000) return `${(number / 10000).toFixed(1)}万`
      return Math.round(number).toLocaleString('zh-CN')
    }

    function relativeTime(ms) {
      if (!Number.isFinite(ms) || ms <= 0) return '时间未知'
      const diff = Date.now() - ms
      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
      if (diff < 86400000 * 30) return `${Math.floor(diff / 86400000)} 天前`
      return new Date(ms).toLocaleDateString('zh-CN')
    }

    async function copyText(text) {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText !== undefined) {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch {
        // fall through
      }
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(area)
        return ok
      } catch {
        return false
      }
    }

    function IconRefresh() {
      return h('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M13.3 6.2A5.6 5.6 0 1 0 13 10.3' }),
        h('path', { d: 'M13.2 2.8v3.7H9.5' }),
      )
    }

    function IconBookmark({ filled }) {
      return h('svg', { viewBox: '0 0 16 16', fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.35, strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M4.2 2.8h7.6v10.4L8 10.8l-3.8 2.4V2.8Z' }),
      )
    }

    function IconCopy() {
      return h('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round', 'aria-hidden': true },
        h('rect', { x: 5.2, y: 5.2, width: 7.5, height: 7.5, rx: 1.2 }),
        h('path', { d: 'M10.8 5.2V3.8c0-.6-.5-1.1-1.1-1.1H3.8c-.6 0-1.1.5-1.1 1.1v5.9c0 .6.5 1.1 1.1 1.1h1.4' }),
      )
    }

    function IconHide() {
      return h('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', 'aria-hidden': true },
        h('path', { d: 'M3 3l10 10M6.2 4.2A6.5 6.5 0 0 1 8 4c3.3 0 5.8 2.8 6.5 4a7.6 7.6 0 0 1-2 2.4M9.9 11.8A6.2 6.2 0 0 1 8 12c-3.3 0-5.8-2.8-6.5-4a7.3 7.3 0 0 1 2.2-2.6' }),
      )
    }

    function IconSpark() {
      return h('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.25, strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M8 1.8l1.1 3.5L12.6 6.4l-3.5 1.1L8 11l-1.1-3.5-3.5-1.1 3.5-1.1L8 1.8Z' }),
        h('path', { d: 'M12.5 10.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5Z' }),
      )
    }

    function ProfilePanel({ data }) {
      const signals = data?.signals ?? {}
      const scan = data?.scan ?? {}
      const interests = Array.isArray(data?.interests) ? data.interests : []
      const pains = Array.isArray(data?.painPoints) ? data.painPoints : []
      const windowLabel = Number(data?.windowDays) > 0 ? `近 ${data.windowDays} 天` : '全部历史'
      return h('section', { className: 'pf-profile' },
        h('div', { className: 'pf-profile-top' },
          h('div', null,
            h('div', { className: 'pf-profile-name' },
              h('span', { className: 'pf-avatar' }, '我'),
              '你的插件口味画像',
            ),
            h('div', { className: 'pf-profile-copy' },
              `${windowLabel} · 已扫描 ${compactNumber(signals.sessions ?? scan.sessions ?? 0)} 个会话、`
              + `${compactNumber(signals.userMessages ?? 0)} 条你亲手发的消息、${compactNumber(signals.projects ?? 0)} 个工作目录。`
              + ' 页面不上传会话正文，只在本机提取类别、关键词和失败类型。'),
          ),
          h('div', { className: 'pf-kpis' },
            h('div', { className: 'pf-kpi' }, h('div', { className: 'pf-kpi-value' }, compactNumber(signals.sessions ?? 0)), h('div', { className: 'pf-kpi-label' }, '会话')),
            h('div', { className: 'pf-kpi' }, h('div', { className: 'pf-kpi-value' }, compactNumber(signals.userMessages ?? 0)), h('div', { className: 'pf-kpi-label' }, '你的消息')),
            h('div', { className: 'pf-kpi' }, h('div', { className: 'pf-kpi-value' }, compactNumber(signals.toolCalls ?? 0)), h('div', { className: 'pf-kpi-label' }, '工具调用')),
            h('div', { className: 'pf-kpi' }, h('div', { className: 'pf-kpi-value' }, compactNumber(signals.toolErrors ?? 0)), h('div', { className: 'pf-kpi-label' }, '失败记录')),
          ),
        ),
        h('div', { className: 'pf-insight' },
          h('div', null,
            h('div', { className: 'pf-insight-label' }, '高频方向'),
            h('div', { className: 'pf-chips' },
              ...interests.slice(0, 5).map(item => h('span', { className: 'pf-chip', key: item.id, title: `${item.mentions} 次文本命中` },
                h('span', { className: 'pf-chip-dot', style: { background: CATEGORY_COLORS[item.id] ?? '#789' } }),
                h('strong', null, item.label),
                `${compactNumber(item.mentions)} 次`,
              )),
              interests.length === 0 ? h('span', { className: 'pf-meta' }, '等待更多历史信号') : null,
            ),
          ),
          h('div', null,
            h('div', { className: 'pf-insight-label' }, '正在帮你避开的问题'),
            h('div', { className: 'pf-chips' },
              ...pains.slice(0, 3).map(item => h('span', { className: 'pf-chip pf-chip-pain', key: item.id, title: item.example || item.label },
                `${item.label} × ${item.count}`,
              )),
              pains.length === 0 ? h('span', { className: 'pf-meta' }, '暂无明确失败样本') : null,
            ),
          ),
        ),
      )
    }

    function PluginCard({ item, busy, copied, onCopy, onFeedback }) {
      const color = CATEGORY_COLORS[item.category] ?? '#4c79b8'
      const initials = String(item.name ?? '?').replace(/^@/u, '').split(/[/-]/u).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
      const disabled = busy === item.name
      return h('article', { className: 'pf-card', style: { '--pf-accent': color } },
        h('div', { className: 'pf-card-top' },
          h('div', { className: 'pf-rank' },
            h('span', { className: 'pf-rank-num' }, `#${item.rank}`),
            h('span', { className: 'pf-category' },
              h('span', { className: 'pf-category-dot' }),
              item.categoryLabel,
            ),
            item.saved ? h('span', { className: 'pf-score' }, '已收藏') : null,
          ),
          h('span', { className: 'pf-score', title: '按历史吻合度相对排序，不是安装成功率' }, `吻合度 ${item.match}`),
        ),
        h('div', { className: 'pf-card-head' },
          h('span', { className: 'pf-plugin-icon' }, initials || 'P'),
          h('div', { className: 'pf-card-titlewrap' },
            h('div', { className: 'pf-card-title', title: item.name }, item.name),
            h('div', { className: 'pf-card-owner' },
              [item.owner ? `作者 ${item.owner}` : '', item.version ? `v${item.version}` : '', item.publishedAt ? relativeTime(item.publishedAt) : '']
                .filter(Boolean)
                .join(' · '),
            ),
          ),
        ),
        h('p', { className: 'pf-card-desc' }, item.description || '这个插件还没有中文简介。'),
        h('div', { className: 'pf-reasons' },
          ...(item.reasons ?? []).slice(0, 3).map((reason, index) => h('div', { className: 'pf-reason', key: `${reason.kind}-${index}` },
            h('span', { className: 'pf-reason-dot' }),
            h('span', null, reason.text),
          )),
        ),
        h('div', { className: 'pf-card-footer' },
          h('div', { className: 'pf-install' },
            h('code', { title: item.install }, item.install),
            h('button', { type: 'button', title: copied ? '已复制' : '复制安装命令', onClick: () => onCopy(item) },
              copied ? h('span', { style: { fontSize: 9 } }, '✓') : h(IconCopy),
            ),
          ),
          h('div', { className: 'pf-card-actions' },
            item.homepage
              ? h('a', { className: 'pf-link', href: item.homepage, target: '_blank', rel: 'noreferrer' }, '插件详情 ↗')
              : h('span', { className: 'pf-link' }, '目录暂无详情页'),
            h('button', {
              type: 'button',
              className: 'pf-card-action',
              'data-active': item.saved ? 'true' : 'false',
              disabled,
              onClick: () => onFeedback(item, item.saved ? 'unsave' : 'save'),
              title: item.saved ? '取消收藏' : '收藏',
            }, h(IconBookmark, { filled: item.saved }), item.saved ? '已收藏' : '收藏'),
            h('button', {
              type: 'button',
              className: 'pf-card-action',
              disabled,
              onClick: () => onFeedback(item, 'dismiss'),
              title: '从推荐流中移除，并尽量不再推荐',
            }, h(IconHide), '不感兴趣'),
          ),
        ),
      )
    }

    function FeedPage() {
      const [data, setData] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [loading, setLoading] = React.useState(true)
      const [busy, setBusy] = React.useState(null)
      const [days, setDays] = React.useState(0)
      const [onlySaved, setOnlySaved] = React.useState(false)
      const [copied, setCopied] = React.useState('')
      const alive = React.useRef(true)

      const load = React.useCallback(async (force = false) => {
        setLoading(true)
        try {
          const response = await fetch(apiUrl(FEED_ENDPOINT, {
            days: String(days),
            limit: '30',
            ...(force ? { refresh: '1', seed: String(Date.now()) } : {}),
          }), {
            headers: { accept: 'application/json' },
            credentials: 'same-origin',
          })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const json = await response.json()
          if (!alive.current) return
          setData(json)
          setError(null)
        } catch (failure) {
          if (!alive.current) return
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          if (alive.current) setLoading(false)
        }
      }, [days])

      React.useEffect(() => {
        alive.current = true
        void load(false)
        return () => {
          alive.current = false
        }
      }, [load])

      const refresh = () => {
        setBusy('refresh')
        void load(true).finally(() => setBusy(null))
      }

      const copy = async item => {
        const ok = await copyText(item.install)
        if (!ok) return
        setCopied(item.name)
        setTimeout(() => {
          if (alive.current) setCopied('')
        }, 2600)
      }

      const feedback = async (item, action) => {
        setBusy(item.name)
        try {
          const response = await fetch(apiUrl(FEEDBACK_ENDPOINT), {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ name: item.name, action }),
          })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const state = await response.json()
          if (!alive.current) return
          setData(previous => {
            if (previous === null) return previous
            const nextItems = action === 'dismiss'
              ? previous.items.filter(candidate => candidate.name !== item.name)
              : previous.items.map(candidate => candidate.name === item.name
                ? { ...candidate, saved: action === 'save' }
                : candidate)
            return {
              ...previous,
              items: nextItems,
              feedback: state,
            }
          })
        } catch (failure) {
          if (alive.current) setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          if (alive.current) setBusy(null)
        }
      }

      const items = onlySaved
        ? (data?.items ?? []).filter(item => item.saved)
        : (data?.items ?? [])
      const savedCount = (data?.items ?? []).filter(item => item.saved).length
      const catalogSource = data?.catalog?.source === 'bundled'
        ? '内置目录快照'
        : data?.catalog?.source === 'cache'
          ? '本机目录缓存'
          : data?.catalog?.source === 'unknown'
            ? '目录状态未知'
            : '线上插件目录'

      return h('div', { 'data-plugin-feed-page': true },
        h('div', { className: 'pf-head' },
          h('div', null,
            h('div', { className: 'pf-eyebrow' }, '本机个性化插件推荐'),
            h('div', { className: 'pf-title' }, '猜你喜欢'),
            h('div', { className: 'pf-sub' }, '把本机 DSH 历史当作你的用户画像，即时重排插件目录'),
          ),
          h('div', { className: 'pf-actions' },
            h('button', {
              type: 'button',
              className: 'pf-btn pf-btn-primary',
              disabled: busy === 'refresh',
              onClick: refresh,
            }, h(IconRefresh), busy === 'refresh' ? '分析中…' : '重新分析'),
            h('button', {
              type: 'button',
              className: 'pf-btn',
              'data-active': onlySaved ? 'true' : 'false',
              onClick: () => setOnlySaved(value => !value),
            }, h(IconBookmark, { filled: onlySaved }), onlySaved ? `只看收藏 ${savedCount}` : `收藏 ${savedCount}`),
          ),
        ),

        error === null ? null : h('div', { className: 'pf-strip pf-strip-error' },
          error === 'HTTP 404'
            ? '读取 Feed 失败：HTTP 404。宿主侧路由尚未加载，安装或修改 Host 代码后需要重启一次 DSH。'
            : `读取 Feed 失败：${error}`),

        data === null && loading
          ? h('div', { className: 'pf-loading' }, h('span', { className: 'pf-spinner' }), '正在读取本机历史并重排插件…')
          : data === null
            ? null
            : h('div', null,
                h(ProfilePanel, { data }),
                h('div', { className: 'pf-toolbar' },
                  h('div', { className: 'pf-segments' },
                    ...[
                      { value: 0, label: '全部历史' },
                      { value: 365, label: '近一年' },
                      { value: 90, label: '近 90 天' },
                      { value: 30, label: '近 30 天' },
                    ].map(option => h('button', {
                      type: 'button',
                      key: option.value,
                      className: 'pf-segment',
                      'data-active': days === option.value ? 'true' : 'false',
                      onClick: () => setDays(option.value),
                    }, option.label)),
                  ),
                  h('div', { className: 'pf-toolbar-right' },
                    h('span', { className: 'pf-meta' },
                      `候选 ${compactNumber(data.catalog?.count ?? 0)} 个 · 已装 ${compactNumber(data.installedCount ?? 0)} 个自动排除 · ${catalogSource}`),
                    data.catalog?.refreshError
                      ? h('span', { className: 'pf-meta', title: data.catalog.refreshError }, '· 线上更新失败，继续使用本地目录')
                      : null,
                  ),
                ),
                onlySaved && items.length === 0
                  ? h('div', { className: 'pf-empty' }, '还没有收藏。关掉「只看收藏」继续逛，卡片底部可以收藏。')
                  : items.length === 0
                    ? h('div', { className: 'pf-empty' }, '当前筛选下没有可推荐的插件。试试重新分析或放宽时间范围。')
                    : h('div', { className: 'pf-grid' },
                        ...items.map(item => h(PluginCard, {
                          key: item.name,
                          item,
                          busy,
                          copied: copied === item.name,
                          onCopy: copy,
                          onFeedback: feedback,
                        })),
                      ),
                loading ? h('div', { className: 'pf-strip' }, '正在按新的时间范围重排…') : null,
                h('div', { className: 'pf-note' },
                  `推荐方式：免训练的内容匹配。类别偏好、词面重合、失败类型与新鲜度在本机计算，再按类别和作者做多样性重排；`
                  + ` 「吻合度」只表示与你历史的相对匹配，不代表插件质量或安全性。安装前仍应查看源码和权限。`
                  + ` 本次构建 ${Number(data.buildMs ?? 0)} ms，扫描 ${compactNumber(data.scan?.records ?? 0)} 条会话事件。`),
              ),
      )
    }

    function apply(ctx) {
      ensureStyles()
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'plugin-feed',
        order: 45,
        label: '猜你喜欢',
      }, FeedPage))
    }

    Object.assign(exports, { name, inject, apply, FeedPage })
    return module.exports
  },
})
