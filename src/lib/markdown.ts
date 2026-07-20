import { marked } from 'marked'
import { signatureLine, type Signature } from '@/lib/signature'

marked.setOptions({ gfm: true, breaks: false })

export interface AssembleBlock {
  type: 'content' | 'section'
  title: string
  markdown: string
}

export function renderMarkdown(md: string): string {
  return marked.parse(md ?? '', { async: false }) as string
}

const TABLE_STYLE =
  'border-collapse:collapse;width:100%;margin:12px 0;font-size:14px;'
// 淡蓝灰边框；表头深蓝底白字；斑马纹浅蓝（粘贴到微信/飞书/公众号后保留）
const CELL_BORDER = 'border:1px solid #c3cfe4;'
const CELL_STYLE = CELL_BORDER + 'padding:6px 10px;text-align:left;color:#1f2937;'
const TH_STYLE =
  CELL_BORDER + 'padding:6px 10px;text-align:left;background:#1e40af;color:#ffffff;font-weight:600;'
const ZEBRA_STYLE = 'background:#eff6ff;'

// 给渲染后的 HTML 表格加内联样式，便于粘贴到微信/飞书/公众号编辑器时保留蓝色表头、边框与斑马纹
// 单次扫描完成，保证斑马纹按行号正确命中
export function styleTables(html: string): string {
  let inBody = false
  let rowIdx = -1
  return html.replace(
    /<table>|<tbody>|<\/tbody>|<tr>|<th>|<td>/g,
    (tag) => {
      switch (tag) {
        case '<table>':
          return `<table style="${TABLE_STYLE}">`
        case '<tbody>':
          inBody = true
          rowIdx = -1
          return tag
        case '</tbody>':
          inBody = false
          return tag
        case '<tr>':
          if (inBody) rowIdx += 1
          return tag
        case '<th>':
          return `<th style="${TH_STYLE}">`
        case '<td>': {
          const zebra = inBody && rowIdx % 2 === 1 ? ZEBRA_STYLE : ''
          return `<td style="${CELL_STYLE}${zebra}">`
        }
        default:
          return tag
      }
    },
  )
}

// 组装 markdown：文档标题与章节标题为一级，内容块为二级，文末附署名与免责声明
export function assembleMarkdown(
  docTitle: string,
  blocks: AssembleBlock[],
  signature: Signature,
): string {
  const parts: string[] = []
  if (docTitle.trim()) parts.push(`# ${docTitle.trim()}`)
  for (const b of blocks) {
    if (b.type === 'section') {
      parts.push(`# ${b.title.trim()}`)
    } else {
      parts.push(`## ${b.title.trim()}\n\n${b.markdown.trim()}`)
    }
  }
  let out = parts.filter((p) => p.trim()).join('\n\n')

  const sigLine = signatureLine(signature)
  const sigParts: string[] = []
  if (sigLine) sigParts.push(sigLine)
  if (signature.showDisclaimer && signature.disclaimer.trim()) {
    sigParts.push(signature.disclaimer.trim())
  }
  if (sigParts.length > 0) {
    out += `\n\n---\n\n${sigParts.join('\n\n')}`
  }
  return out
}

// 组装为带内联样式的 HTML（用于剪贴板富文本）
export function assembleHtml(
  docTitle: string,
  blocks: AssembleBlock[],
  signature: Signature,
): string {
  return styleTables(renderMarkdown(assembleMarkdown(docTitle, blocks, signature)))
}

// 合规自检的扫描文本：文档标题 + 所有块标题与正文 + 免责声明
export function assembleScanText(
  docTitle: string,
  blocks: AssembleBlock[],
  signature: Signature,
): string {
  const parts = [docTitle]
  for (const b of blocks) parts.push(b.title, b.markdown)
  if (signature.showDisclaimer) parts.push(signature.disclaimer)
  return parts.join('\n')
}

export async function copyRichText(markdown: string, html: string): Promise<'rich' | 'plain'> {
  const fullHtml = `<!DOCTYPE html><html><body>${html}</body></html>`
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      const item = new ClipboardItem({
        'text/plain': new Blob([markdown], { type: 'text/plain' }),
        'text/html': new Blob([fullHtml], { type: 'text/html' }),
      })
      await navigator.clipboard.write([item])
      return 'rich'
    } catch {
      // fall through to plain-text fallback
    }
  }
  // 降级：execCommand 复制纯文本 markdown
  const ta = document.createElement('textarea')
  ta.value = markdown
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(ta)
  }
  return 'plain'
}
