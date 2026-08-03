import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Printer, RefreshCw, Clock, ExternalLink } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TABS, type TabConfig } from '@/config'
import { renderMarkdown, styleTables, copyRichText } from '@/lib/markdown'

function todayKey(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function weekdayName(dateStr: string): string {
  const d = new Date(dateStr)
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return names[d.getDay()]
}

interface TabState {
  html: string
  markdown: string
  loading: boolean
  error: string | null
  updatedAt: Date | null
}

const EMPTY_TAB: TabState = { html: '', markdown: '', loading: true, error: null, updatedAt: null }

export default function Home() {
  const today = todayKey()
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const [states, setStates] = useState<Record<string, TabState>>({})

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0]
  const currentState = states[activeTab] ?? EMPTY_TAB

  // 加载单个 Tab 内容
  const loadTab = useCallback(async (tab: TabConfig) => {
    setStates((prev) => ({
      ...prev,
      [tab.id]: { ...(prev[tab.id] ?? EMPTY_TAB), loading: true, error: null },
    }))

    // 产业链跟踪 Tab 特殊处理
    if (tab.id === 'chain') {
      setStates((prev) => ({
        ...prev,
        [tab.id]: {
          html: '',
          markdown: '',
          loading: false,
          error: null,
          updatedAt: null,
        },
      }))
      return
    }

    try {
      const results = await Promise.all(
        tab.sources.map(async (src) => {
          const res = await fetch(`${src}?t=${Date.now()}`)
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
          const text = await res.text()
          return { text, updatedAt: res.headers.get('Last-Modified') }
        }),
      )

      // 合并多个源文件
      const markdown = results.map((r) => r.text).join('\n\n---\n\n')
      const html = styleTables(renderMarkdown(markdown))

      // 取最新的更新时间
      let updatedAt: Date | null = null
      for (const r of results) {
        if (r.updatedAt) {
          const d = new Date(r.updatedAt)
          if (!updatedAt || d > updatedAt) updatedAt = d
        }
      }

      setStates((prev) => ({
        ...prev,
        [tab.id]: { html, markdown, loading: false, error: null, updatedAt },
      }))
    } catch (err: any) {
      setStates((prev) => ({
        ...prev,
        [tab.id]: {
          ...EMPTY_TAB,
          loading: false,
          error: err.message ?? '加载失败',
        },
      }))
    }
  }, [])

  // 初始加载 + Tab 切换时加载
  useEffect(() => {
    if (!states[activeTab]) {
      loadTab(currentTab)
    }
  }, [activeTab, currentTab, states, loadTab])

  // 刷新当前 Tab
  const refreshTab = useCallback(() => {
    loadTab(currentTab)
  }, [currentTab, loadTab])

  // 复制当前 Tab 内容
  const copyTab = useCallback(async () => {
    if (!currentState.markdown) {
      toast.info('当前 Tab 暂无内容')
      return
    }
    const html = styleTables(renderMarkdown(currentState.markdown))
    const mode = await copyRichText(currentState.markdown, html)
    if (mode === 'rich') {
      toast.success('已复制，可直接粘贴到公众号/飞书/Word')
    } else {
      toast.success('已复制纯文本')
    }
  }, [currentState.markdown])

  // 导出 PDF
  const exportPdf = useCallback(() => {
    window.print()
  }, [])

  // 新鲜度标签
  const freshnessBadge = useMemo(() => {
    if (!currentState.updatedAt) return null
    const now = new Date()
    const diff = now.getTime() - currentState.updatedAt.getTime()
    const hours = Math.floor(diff / 3600000)

    let label: string
    let color: string
    if (hours < 1) {
      const mins = Math.floor(diff / 60000)
      label = `${mins} 分钟前更新`
      color = 'text-emerald-600 bg-emerald-50'
    } else if (hours < 6) {
      label = `${hours} 小时前更新`
      color = 'text-blue-600 bg-blue-50'
    } else if (hours < 24) {
      label = `${hours} 小时前更新`
      color = 'text-amber-600 bg-amber-50'
    } else {
      const days = Math.floor(hours / 24)
      label = `${days} 天前更新`
      color = 'text-slate-500 bg-slate-100'
    }

    return { label, color }
  }, [currentState.updatedAt])

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FB]">
      <Toaster position="top-center" richColors />

      {/* 顶部导航栏 */}
      <header className="no-print sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          {/* 品牌 */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-lg bg-[#1F4E79] px-3 py-1.5 text-[13px] font-semibold text-white tracking-wide">
              毛驴有话说
            </span>
            <span className="hidden text-xs text-slate-400 sm:inline">· 投顾素材</span>
          </div>

          {/* Tab 导航 */}
          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-4 py-1.5 text-[13px] font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-[#1F4E79] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* 日期 + 操作 */}
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-slate-400">
              {today} {weekdayName(today)}
            </span>
            <button
              onClick={refreshTab}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="刷新"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${currentState.loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {/* Tab 标题栏：标题 + 新鲜度 + 操作按钮 */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-slate-800">
              {currentTab.label}
            </h1>
            {freshnessBadge && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${freshnessBadge.color}`}
              >
                <Clock className="h-3 w-3" />
                {freshnessBadge.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentTab.id !== 'chain' && (
              <>
                <button
                  onClick={copyTab}
                  disabled={!currentState.markdown}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:border-[#1F4E79] hover:text-[#1F4E79] disabled:opacity-40"
                >
                  <Copy className="h-3.5 w-3.5" />
                  复制全文
                </button>
                <button
                  onClick={exportPdf}
                  disabled={!currentState.markdown}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F4E79] px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#1a3f63] disabled:opacity-40"
                >
                  <Printer className="h-3.5 w-3.5" />
                  下载 PDF
                </button>
              </>
            )}
            {currentTab.id === 'chain' && (
              <a
                href="./ai-chain-dashboard.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F4E79] px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#1a3f63]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                打开完整看板
              </a>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        {currentTab.id === 'chain' ? (
          /* 产业链跟踪 Tab */
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-[#F8F9FB] px-6 py-4">
              <h2 className="text-[15px] font-semibold text-slate-700">AI 产业链行情看板</h2>
              <p className="mt-1 text-[13px] text-slate-400">
                覆盖 AI 产业链核心标的的实时行情、产业链增量与关键日历
              </p>
            </div>
            <div className="relative w-full" style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }}>
              <iframe
                src="./ai-chain-dashboard.html"
                className="absolute inset-0 h-full w-full border-0"
                title="AI产业链行情看板"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        ) : (
          /* 早盘 / 收盘内容区 */
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {currentState.loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
                  <p className="text-sm text-slate-400">加载中...</p>
                </div>
              </div>
            ) : currentState.error ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="rounded-full bg-red-50 p-3">
                  <Clock className="h-5 w-5 text-red-400" />
                </div>
                <p className="mt-3 text-sm text-slate-500">加载失败</p>
                <p className="mt-1 text-xs text-slate-400">{currentState.error}</p>
                <button
                  onClick={refreshTab}
                  className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-[13px] text-slate-600 transition-colors hover:bg-slate-50"
                >
                  重新加载
                </button>
              </div>
            ) : !currentState.markdown ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm text-slate-400">暂无内容</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-220px)]">
                <article
                  className="md-preview doc-body mx-auto max-w-[780px] px-6 py-8 sm:px-10"
                  dangerouslySetInnerHTML={{ __html: currentState.html }}
                />
              </ScrollArea>
            )}
          </div>
        )}
      </main>

      {/* 底部免责 */}
      <footer className="no-print border-t border-slate-200 bg-white py-4 text-center">
        <p className="text-[11px] text-slate-400">
          以上内容仅供参考，不构成投资建议。市场有风险，投资需谨慎。数据来源：通联数据、东方财富研报中心。
        </p>
      </footer>
    </div>
  )
}
