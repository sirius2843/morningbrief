import { SENSITIVE_WORDS } from '@/config'

export interface ComplianceHit {
  word: string
  count: number
}

// 扫描组装内容中的合规高危词，返回命中词及出现次数
export function scanCompliance(text: string): ComplianceHit[] {
  const hits: ComplianceHit[] = []
  for (const word of SENSITIVE_WORDS) {
    if (!word) continue
    const count = text.split(word).length - 1
    if (count > 0) hits.push({ word, count })
  }
  return hits
}
