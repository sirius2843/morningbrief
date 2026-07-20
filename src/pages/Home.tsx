import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Copy,
  ClipboardList,
  Heading1,
  FileText,
  Eye,
  PencilLine,
  Printer,
  TriangleAlert,
} from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import SourcePanel, { MODULE_MIME } from '@/components/SourcePanel'
import EditorBlock, { BLOCK_MIME, type Block } from '@/components/EditorBlock'
import SignatureFooter from '@/components/SignatureFooter'
import DocPreview from '@/components/DocPreview'
import { DATA_SOURCES } from '@/config'
import { parseModules, type Module } from '@/lib/parseModules'
import {
  assembleMarkdown,
  assembleHtml,
  assembleScanText,
  copyRichText,
} from '@/lib/markdown'
import { loadSignature, saveSignature, type Signature } from '@/lib/signature'
import { scanCompliance } from '@/lib/compliance'

function todayKey(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const TODAY = todayKey()
const BLOCKS_KEY = `advisor-editor-blocks:${TODAY}`
const TITLE_KEY = `advisor-doc-title:${TODAY}`

type StoredBlock = Omit<Block, 'editing' | 'type'> & { type?: Block['type'] }

function loadBlocks(): Block[] {
  try {
    const raw = localStorage.getItem(BLOCKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredBlock[]
    // 兼容无 type 字段的旧数据：一律视为内容块
    return parsed.map((b) => ({ ...b, type: b.type ?? 'content', editing: false }))
  } catch {
    return []
  }
}

function loadDocTitle(): string {
  return localStorage.getItem(TITLE_KEY) ?? `${TODAY} 早盘点评`
}

let uidCounter = 0
function newUid(): string {
  uidCounter += 1
  return `b${Date.now().toString(36)}-${uidCounter}-${Math.random().toString(36).slice(2, 7)}`
}

export default function Home() {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [modulesBySource, setModulesBySource] = useState<Record<string, Module[]>>({})
  const [loading, setLoading] = useState(true)
  const [blocks, setBlocks] = useState<Block[]>(loadBlocks)
  const [docTitle, setDocTitle] = useState<string>(loadDocTitle)
  const [signature, setSignature] = useState<Signature>(loadSignature)
  const [insertIndex, setInsertIndex] = useState<number | null>(null)

  // 加载标准素材（带时间戳防缓存，文件每天更新）
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result: Record<string, Module[]> = {}
      await Promise.all(
        DATA_SOURCES.map(async (s) => {
          try {
            const res = await fetch(`${s.url}?t=${Date.now()}`)
            const text = await res.text()
            result[s.key] = parseModules(text, s.key)
          } catch {
            result[s.key] = []
          }
        }),
      )
      if (!cancelled) {
        setModulesBySource(result)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 编辑区持久化（key 带当天日期，新的一天自动重置）
  useEffect(() => {
    const stored: StoredBlock[] = blocks.map(({ uid, type, title, markdown, sourceId }) => ({
      uid,
      type,
      title,
      markdown,
      sourceId,
    }))
    localStorage.setItem(BLOCKS_KEY, JSON.stringify(stored))
  }, [blocks])

  // 文档标题按天持久化
  useEffect(() => {
    localStorage.setItem(TITLE_KEY, docTitle)
  }, [docTitle])

  // 署名全局持久化（不随日期清空）
  useEffect(() => {
    saveSignature(signature)
  }, [signature])

  const addedIds = useMemo(
    () => new Set(blocks.map((b) => b.sourceId).filter((x): x is string => !!x)),
    [blocks],
  )

  const assembleBlocks = useMemo(
    () => blocks.map(({ type, title, markdown }) => ({ type, title, markdown })),
    [blocks],
  )

  const complianceHits = useMemo(
    () => scanCompliance(assembleScanText(docTitle, assembleBlocks, signature)),
    [docTitle, assembleBlocks, signature],
  )

  const addModule = useCallback((m: Module, at?: number) => {
    setBlocks((prev) => {
      const block: Block = {
        uid: newUid(),
        type: 'content',
        sourceId: m.id,
        title: m.title,
        markdown: m.markdown,
        editing: false,
      }
      const next = [...prev]
      next.splice(at === undefined ? next.length : at, 0, block)
      return next
    })
  }, [])

  const addCustomParagraph = useCallback(() => {
    setBlocks((prev) => [
      ...prev,
      {
        uid: newUid(),
        type: 'content',
        sourceId: null,
        title: '自定义标题',
        markdown: '',
        editing: true,
      },
    ])
  }, [])

  const addSection = useCallback(() => {
    setBlocks((prev) => [
      ...prev,
      { uid: newUid(), type: 'section', sourceId: null, title: '一、章节标题', markdown: '', editing: false },
    ])
  }, [])

  const updateBlock = useCallback((uid: string, patch: Partial<Block>) => {
    setBlocks((prev) => prev.map((b) => (b.uid === uid ? { ...b, ...patch } : b)))
  }, [])

  const deleteBlock = useCallback((uid: string) => {
    setBlocks((prev) => prev.filter((b) => b.uid !== uid))
  }, [])

  const moveBlock = useCallback((index: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev]
      const j = index + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    if (blocks.length === 0) return
    if (window.confirm('确定清空编辑区的全部模块吗？（署名不受影响）')) setBlocks([])
  }, [blocks.length])

  const updateSignature = useCallback((patch: Partial<Signature>) => {
    setSignature((prev) => ({ ...prev, ...patch }))
  }, [])

  // 计算在某个块上 dragover 时的插入位置（上半 = 前，下半 = 后）
  const handleDragOverBlock = useCallback((e: React.DragEvent, index: number) => {
    if (![MODULE_MIME, BLOCK_MIME].some((t) => e.dataTransfer.types.includes(t))) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(BLOCK_MIME) ? 'move' : 'copy'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const before = e.clientY < rect.top + rect.height / 2
    setInsertIndex(before ? index : index + 1)
  }, [])

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    if (![MODULE_MIME, BLOCK_MIME].some((t) => e.dataTransfer.types.includes(t))) return
    e.preventDefault()
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(BLOCK_MIME) ? 'move' : 'copy'
  }, [])

  const insertAt = useCallback(
    (dataTransfer: DataTransfer, at: number) => {
      const moduleJson = dataTransfer.getData(MODULE_MIME)
      if (moduleJson) {
        try {
          addModule(JSON.parse(moduleJson) as Module, at)
        } catch {
          /* ignore bad payload */
        }
        return
      }
      const blockUid = dataTransfer.getData(BLOCK_MIME)
      if (blockUid) {
        setBlocks((prev) => {
          const from = prev.findIndex((b) => b.uid === blockUid)
          if (from === -1) return prev
          const next = [...prev]
          const [moved] = next.splice(from, 1)
          const to = from < at ? at - 1 : at
          next.splice(Math.max(0, Math.min(to, next.length)), 0, moved)
          return next
        })
      }
    },
    [addModule],
  )

  const handleDropOnBlock = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const before = e.clientY < rect.top + rect.height / 2
      insertAt(e.dataTransfer, before ? index : index + 1)
      setInsertIndex(null)
    },
    [insertAt],
  )

  const handleContainerDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setBlocks((prev) => {
      const moduleJson = e.dataTransfer.getData(MODULE_MIME)
      const blockUid = e.dataTransfer.getData(BLOCK_MIME)
      if (moduleJson) {
        try {
          const m = JSON.parse(moduleJson) as Module
          return [
            ...prev,
            {
              uid: newUid(),
              type: 'content',
              sourceId: m.id,
              title: m.title,
              markdown: m.markdown,
              editing: false,
            },
          ]
        } catch {
          return prev
        }
      }
      if (blockUid) {
        const from = prev.findIndex((b) => b.uid === blockUid)
        if (from === -1 || from === prev.length - 1) return prev
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.push(moved)
        return next
      }
      return prev
    })
    setInsertIndex(null)
  }, [])

  const copyAll = useCallback(async () => {
    if (blocks.length === 0) {
      toast.info('编辑区还是空的，先添加一些模块吧')
      return
    }
    const md = assembleMarkdown(docTitle, assembleBlocks, signature)
    const html = assembleHtml(docTitle, assembleBlocks, signature)
    const mode_ = await copyRichText(md, html)
    if (mode_ === 'rich') {
      toast.success('已复制，可直接粘贴', { description: '已同时写入 Markdown 与富文本格式，含署名' })
    } else {
      toast.success('已复制，可直接粘贴', { description: '当前浏览器仅支持复制纯文本 Markdown' })
    }
  }, [blocks.length, docTitle, assembleBlocks, signature])

  const exportPdf = useCallback(() => {
    window.print()
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      <Toaster position="top-center" richColors />
      {/* 顶部标题栏 */}
      <header className="no-print flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold tracking-tight text-foreground">投顾素材编辑台</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            拖拽左侧标准素材，自由组装你的今日点评
          </p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{TODAY}</span>
      </header>

      {mode === 'edit' ? (
        <div className="flex min-h-0 flex-1">
          {/* 左侧：素材库 */}
          <SourcePanel
            modulesBySource={modulesBySource}
            loading={loading}
            addedIds={addedIds}
            onAdd={(m) => addModule(m)}
          />

          {/* 右侧：编辑区（纸面风格） */}
          <div className="flex min-w-0 flex-1 flex-col bg-muted/40">
            {/* 工具条 */}
            <div className="no-print flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">我的编辑区</span>
              <span className="text-xs text-muted-foreground">
                {blocks.length > 0 ? `${blocks.length} 个模块` : ''}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={addSection}>
                  <Heading1 className="mr-1 h-3.5 w-3.5" />
                  章节标题
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={addCustomParagraph}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  自定义段落
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-muted-foreground hover:text-destructive"
                  onClick={clearAll}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  清空
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <Button variant="outline" size="sm" className="h-8" onClick={() => setMode('preview')}>
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  预览
                </Button>
                <Button size="sm" className="h-8" onClick={copyAll}>
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  一键复制
                </Button>
              </div>
            </div>

            {/* 块列表（纸面文档风格） */}
            <div className="min-h-0 flex-1" onDragOver={handleContainerDragOver} onDrop={handleContainerDrop}>
              <ScrollArea className="h-full">
                <div className="mx-auto max-w-[860px] px-4 py-5 pb-16">
                  {/* 文档标题（按天保存） */}
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <input
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-[17px] font-bold tracking-tight text-foreground outline-none"
                      placeholder="文档标题，如：2026-07-20 早盘点评"
                    />
                  </div>

                  <div className="space-y-3">
                    {blocks.length === 0 ? (
                      <div className="flex h-[40vh] items-center justify-center rounded-lg border-2 border-dashed border-border bg-card/60">
                        <p className="text-sm text-muted-foreground">
                          从左侧拖入模块，或点击 + 章节标题 / + 自定义段落
                        </p>
                      </div>
                    ) : (
                      blocks.map((b, i) => (
                        <div key={b.uid}>
                          {insertIndex === i && (
                            <div className="mb-3 h-0.5 rounded bg-primary shadow-[0_0_0_1px_hsl(var(--primary))]" />
                          )}
                          <EditorBlock
                            block={b}
                            index={i}
                            total={blocks.length}
                            onChange={updateBlock}
                            onMove={moveBlock}
                            onDelete={deleteBlock}
                            onDragOverBlock={handleDragOverBlock}
                            onDropOnBlock={handleDropOnBlock}
                          />
                        </div>
                      ))
                    )}
                    {blocks.length > 0 && insertIndex === blocks.length && (
                      <div className="h-0.5 rounded bg-primary shadow-[0_0_0_1px_hsl(var(--primary))]" />
                    )}

                    {/* 署名（固定文末，不可删除/拖动，全局保存） */}
                    <SignatureFooter signature={signature} onChange={updateSignature} />
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      ) : (
        /* 预览模式：隐藏左侧素材库，只留纸面 */
        <div className="flex min-h-0 flex-1 flex-col bg-muted/40">
          <div className="no-print flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">文档预览</span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={() => setMode('edit')}>
                <PencilLine className="mr-1 h-3.5 w-3.5" />
                返回编辑
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={copyAll}>
                <Copy className="mr-1 h-3.5 w-3.5" />
                一键复制
              </Button>
              <Button size="sm" className="h-8" onClick={exportPdf}>
                <Printer className="mr-1 h-3.5 w-3.5" />
                导出 PDF
              </Button>
            </div>
          </div>

          {/* 合规敏感词警示条 */}
          {complianceHits.length > 0 && (
            <div className="no-print flex shrink-0 items-start gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                <span className="font-semibold">合规提示：</span>
                检测到敏感词（不阻断导出，请人工复核）——
                {complianceHits.map((h) => `「${h.word}」×${h.count}`).join('、')}
              </p>
            </div>
          )}

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-4 py-8">
              <DocPreview docTitle={docTitle} blocks={assembleBlocks} signature={signature} />
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
