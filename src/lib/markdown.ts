import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: false })

export function renderMarkdown(md: string): string {
  return marked.parse(md ?? '', { async: false }) as string
}

const TABLE_STYLE =
  'border-collapse:collapse;width:100%;margin:12px 0;font-size:14px;'
const CELL_BORDER = 'border:1px solid #c3cfe4;'
const CELL_STYLE = CELL_BORDER + 'padding:6px 10px;text-align:left;color:#1f2937;'
const TH_STYLE =
  CELL_BORDER + 'padding:6px 10px;text-align:left;background:#1e40af;color:#ffffff;font-weight:600;'
const ZEBRA_STYLE = 'background:#eff6ff;'

// 给渲染后的 HTML 表格加内联样式，便于粘贴到微信/飞书/公众号编辑器时保留蓝色表头、边框与斑马纹
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
