import { GripVertical, ArrowUp, ArrowDown, Trash2, Pencil, Check, Heading1 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { renderMarkdown } from '@/lib/markdown'

export const BLOCK_MIME = 'application/x-advisor-block'

export type BlockType = 'content' | 'section'

export interface Block {
  uid: string
  type: BlockType
  sourceId: string | null
  title: string
  markdown: string
  editing: boolean
}

interface Props {
  block: Block
  index: number
  total: number
  onChange: (uid: string, patch: Partial<Block>) => void
  onMove: (index: number, dir: -1 | 1) => void
  onDelete: (uid: string) => void
  onDragOverBlock: (e: React.DragEvent, index: number) => void
  onDropOnBlock: (e: React.DragEvent, index: number) => void
}

function BlockControls({
  block,
  index,
  total,
  onChange,
  onMove,
  onDelete,
}: Omit<Props, 'onDragOverBlock' | 'onDropOnBlock'>) {
  return (
    <div className="flex shrink-0 items-center">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={index === 0}
        onClick={() => onMove(index, -1)}
        title="上移"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={index === total - 1}
        onClick={() => onMove(index, 1)}
        title="下移"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(block.uid)}
        title="删除"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      {block.type === 'content' && (
        <Button
          variant={block.editing ? 'default' : 'outline'}
          size="sm"
          className="ml-1 h-7 px-2 text-xs"
          onClick={() => onChange(block.uid, { editing: !block.editing })}
        >
          {block.editing ? (
            <>
              <Check className="mr-1 h-3 w-3" />
              完成
            </>
          ) : (
            <>
              <Pencil className="mr-1 h-3 w-3" />
              编辑
            </>
          )}
        </Button>
      )}
    </div>
  )
}

const dragHandle = (uid: string) => (
  <span
    draggable
    onDragStart={(e) => {
      e.dataTransfer.setData(BLOCK_MIME, uid)
      e.dataTransfer.effectAllowed = 'move'
    }}
    className="cursor-grab rounded p-1 text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
    title="拖拽调整顺序"
  >
    <GripVertical className="h-4 w-4" />
  </span>
)

export default function EditorBlock(props: Props) {
  const { block, onChange, onDragOverBlock, onDropOnBlock, index } = props

  if (block.type === 'section') {
    // 章节标题块：只有标题字段，视觉上是纸面上的大号标题
    return (
      <div
        className="rounded-md border border-blue-200 border-l-4 border-l-blue-700 bg-blue-50/70"
        onDragOver={(e) => onDragOverBlock(e, index)}
        onDrop={(e) => onDropOnBlock(e, index)}
      >
        <div className="flex items-center gap-1.5 px-2 py-2">
          {dragHandle(block.uid)}
          <Heading1 className="h-4 w-4 shrink-0 text-blue-700/70" />
          <input
            value={block.title}
            onChange={(e) => onChange(block.uid, { title: e.target.value })}
            className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-[15px] font-bold tracking-tight text-blue-900 outline-none transition hover:border-blue-300 focus:border-blue-600 focus:bg-card focus:ring-1 focus:ring-blue-600/30"
            placeholder="章节标题，如：一、市场截面"
          />
          <BlockControls {...props} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border border-border bg-card shadow-xs"
      onDragOver={(e) => onDragOverBlock(e, index)}
      onDrop={(e) => onDropOnBlock(e, index)}
    >
      {/* 标题行 */}
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        {dragHandle(block.uid)}
        <span className="text-[11px] tabular-nums text-muted-foreground/60">{index + 1}.</span>
        <input
          value={block.title}
          onChange={(e) => onChange(block.uid, { title: e.target.value })}
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-medium text-foreground outline-none transition hover:border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
          placeholder="模块标题"
        />
        <BlockControls {...props} />
      </div>

      {/* 内容区 */}
      {block.editing ? (
        <textarea
          value={block.markdown}
          onChange={(e) => onChange(block.uid, { markdown: e.target.value })}
          className="min-h-[160px] w-full resize-y rounded-b-lg bg-muted/20 p-3 font-mono text-[13px] leading-relaxed text-foreground outline-none"
          placeholder="在这里输入 Markdown 内容…"
          autoFocus
        />
      ) : (
        <div
          className="md-preview rounded-b-lg px-4 py-3"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(block.markdown) }}
        />
      )}
    </div>
  )
}
