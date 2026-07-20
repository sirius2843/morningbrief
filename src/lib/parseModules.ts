// 稳健的标准素材 markdown 解析器
// 结构约定（不依赖具体标题文字）：
//   # 一级标题 + 首个 ## 之前的内容  -> 「文档信息」组下的文档头模块
//   每个 ## 大章节 = 一个 group
//   章节内每个 ### = 一个模块（内容为该 ### 到下一个 ###/## 之间）
//   某 ## 在第一个 ### 之前的正文 -> 一个模块（title 用 ## 标题）
//   某 ## 完全没有 ### -> 整个章节作为一个模块
//   模块内的 --- 分隔线行会被剔除

export interface Module {
  id: string
  source: string
  group: string
  title: string
  markdown: string
}

export const DOC_INFO_GROUP = '文档信息'

function stripSeparators(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*---+\s*$/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function parseModules(markdown: string, source: string): Module[] {
  const modules: Module[] = []
  // 按行扫描，收集二级/三级标题节点
  const lines = markdown.split('\n')

  type H2 = { title: string; start: number } // start = 标题行索引
  const h2s: H2[] = []
  let h1Title = ''
  let firstH2Index = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^#\s+/.test(line) && !h1Title) {
      h1Title = line.replace(/^#\s+/, '').trim()
    } else if (/^##\s+/.test(line)) {
      h2s.push({ title: line.replace(/^##\s+/, '').trim(), start: i })
      if (firstH2Index === -1) firstH2Index = i
    }
  }

  // 文档头模块：# 标题 + 首个 ## 之前的内容
  const headerEnd = firstH2Index === -1 ? lines.length : firstH2Index
  const headerBody = stripSeparators(lines.slice(0, headerEnd).join('\n'))
  if (headerBody) {
    modules.push({
      id: `${source}::header`,
      source,
      group: DOC_INFO_GROUP,
      title: h1Title || '文档信息',
      markdown: headerBody,
    })
  }

  // 各 ## 章节
  for (let s = 0; s < h2s.length; s++) {
    const h2 = h2s[s]
    const sectionEnd = s + 1 < h2s.length ? h2s[s + 1].start : lines.length
    const sectionLines = lines.slice(h2.start + 1, sectionEnd)

    // 找章节内的 ### 标题（注意排除 #### 等更深层级）
    const h3Idx: number[] = []
    for (let i = 0; i < sectionLines.length; i++) {
      if (/^###\s+/.test(sectionLines[i])) h3Idx.push(i)
    }

    const push = (title: string, body: string, tag: string) => {
      const cleaned = stripSeparators(body)
      if (!cleaned) return
      modules.push({
        id: `${source}::s${s}::${tag}`,
        source,
        group: h2.title,
        title,
        markdown: cleaned,
      })
    }

    if (h3Idx.length === 0) {
      // 整章无 ###：整章作为一个模块
      push(h2.title, sectionLines.join('\n'), 'all')
    } else {
      // 第一个 ### 之前的正文
      if (h3Idx[0] > 0) {
        push(h2.title, sectionLines.slice(0, h3Idx[0]).join('\n'), 'lead')
      }
      for (let m = 0; m < h3Idx.length; m++) {
        const start = h3Idx[m]
        const end = m + 1 < h3Idx.length ? h3Idx[m + 1] : sectionLines.length
        const title = sectionLines[start].replace(/^###\s+/, '').trim()
        push(title, sectionLines.slice(start + 1, end).join('\n'), `m${m}`)
      }
    }
  }

  return modules
}

export function groupModules(modules: Module[]): { group: string; items: Module[] }[] {
  const map = new Map<string, Module[]>()
  for (const m of modules) {
    if (!map.has(m.group)) map.set(m.group, [])
    map.get(m.group)!.push(m)
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }))
}
