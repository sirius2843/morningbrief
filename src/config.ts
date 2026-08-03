// 数据源配置：每个 Tab 对应一个或多个 markdown 文件
export interface TabConfig {
  id: string
  label: string
  /** 数据文件列表，按顺序拼接 */
  sources: string[]
  /** 用于新鲜度检测的源文件 */
  freshnessUrl: string
}

export const TABS: TabConfig[] = [
  {
    id: 'morning',
    label: '早盘素材',
    sources: ['data/morning_commentary.md'],
    freshnessUrl: 'data/morning_commentary.md',
  },
  {
    id: 'close',
    label: '收盘素材',
    sources: ['data/close_full.md'],
    freshnessUrl: 'data/close_full.md',
  },
  {
    id: 'chain',
    label: '产业链跟踪',
    sources: [],
    freshnessUrl: '',
  },
]

// 合规敏感词自检词表（命中仅提示，不阻断导出）
export const SENSITIVE_WORDS: string[] = [
  '稳赚',
  '保本',
  '必涨',
  '零风险',
  '承诺收益',
  '翻倍',
  '内幕',
]

// 默认免责声明
export const DEFAULT_DISCLAIMER =
  '风险提示：以上内容仅供参考，不构成投资建议。市场有风险，投资需谨慎。'
