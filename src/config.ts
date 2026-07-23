// 数据源配置：每日自动生成的标准素材文件
// 以后新增每日文件时，在这里追加一项即可
export interface DataSource {
  key: string
  tabName: string
  url: string
}

export const DATA_SOURCES: DataSource[] = [
  {
    key: 'morning',
    tabName: '标准早盘素材',
    url: 'data/standard_morning.md',
  },
  {
    key: 'live_events',
    tabName: '事件池解读',
    url: 'data/standard_live_events.md',
  },
  // ── 收评素材 ──
  {
    key: 'close_market',
    tabName: '收评数据',
    url: 'data/close_market_data.md',
  },
  {
    key: 'close_commentary',
    tabName: '收盘点评',
    url: 'data/close_commentary.md',
  },
  {
    key: 'close_industry',
    tabName: '行业观点',
    url: 'data/close_industry_views.md',
  },
]

// 合规敏感词自检词表（命中仅提示，不阻断导出），按需维护
export const SENSITIVE_WORDS: string[] = [
  '稳赚',
  '保本',
  '必涨',
  '零风险',
  '承诺收益',
  '翻倍',
  '内幕',
]

// 默认免责声明（可在署名区编辑）
export const DEFAULT_DISCLAIMER =
  '风险提示：以上内容仅供参考，不构成投资建议。市场有风险，投资需谨慎。'
