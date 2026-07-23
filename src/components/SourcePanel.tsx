import { useState, useRef, useCallback } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DATA_SOURCES } from '@/config'
import { groupModules, type Module } from '@/lib/parseModules'

export const MODULE_MIME = 'application/x-advisor-module'

interface Props {
  modulesBySource: Record<string, Module[]>
  loading: boolean
  addedIds: Set<string>
  onAdd: (m: Module) => void
}

function summary(md: string, n = 60): string {
  const text = md
    .replace(/[#>*`|[\]-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > n ? text.slice(0, n) + '…' : text
}

export default function SourcePanel({ modulesBySource, loading, addedIds, onAdd }: Props) {
  const [active, setActive] = useState(DATA_SOURCES[0]?.key ?? '')
  const modules = modulesBySource[active] ?? []
  const groups = groupModules(modules)

  // ── 左右滑动切换 Tab ──
  const touchStart = useRef<{ x: number }>({ x: 0 })
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX }
  }, [])
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    if (Math.abs(dx) < 50) return // 滑动距离不够
    const keys = DATA_SOURCES.map((s) => s.key)
    const idx = keys.indexOf(active)
    if (dx < 0 && idx < keys.length - 1) setActive(keys[idx + 1])
    else if (dx > 0 && idx > 0) setActive(keys[idx - 1])
  }, [active])

  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="border-b border-border px-4 pb-3 pt-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">标准素材库</h2>
        <Tabs value={active} onValueChange={setActive} className="w-full">
          <TabsList className="w-full flex-wrap">
            {DATA_SOURCES.map((s) => (
              <TabsTrigger key={s.key} value={s.key} className="flex-1 min-w-fit text-[11px] px-2">
                {s.tabName}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="min-h-0 flex-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="space-y-4 px-3 py-3">
          {loading && (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">素材加载中…</p>
          )}
          {!loading && modules.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              未解析到模块，请检查素材文件
            </p>
          )}
          {groups.map((g) => (
            <div key={g.group}>
              <p className="mb-2 px-1 text-[11px] font-medium tracking-wide text-muted-foreground">
                {g.group}
              </p>
              <div className="space-y-2">
                {g.items.map((m) => (
                  <ModuleCard key={m.id} module={m} added={addedIds.has(m.id)} onAdd={() => onAdd(m)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function ModuleCard({
  module,
  added,
  onAdd,
}: {
  module: Module
  added: boolean
  onAdd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(MODULE_MIME, JSON.stringify(module))
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="group cursor-grab rounded-lg border border-border bg-card p-3 shadow-xs transition hover:border-primary/40 hover:shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium leading-snug text-foreground">{module.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {summary(module.markdown)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {added && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">已添加</span>
          )}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onAdd}
                  className="flex items-center gap-0.5 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  添加
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">添加到编辑区末尾（也可直接拖拽）</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}
