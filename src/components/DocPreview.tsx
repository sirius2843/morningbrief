import { renderMarkdown, type AssembleBlock } from '@/lib/markdown'
import { signatureLine, type Signature } from '@/lib/signature'

interface Props {
  docTitle: string
  blocks: AssembleBlock[]
  signature: Signature
}

// A4 纸面文档预览：蓝色商务风格，完整渲染章节标题、模块、表格与署名
export default function DocPreview({ docTitle, blocks, signature }: Props) {
  const sigLine = signatureLine(signature)
  const showSig = sigLine || (signature.showDisclaimer && signature.disclaimer.trim())

  return (
    <div className="print-paper mx-auto w-full max-w-[820px] bg-white px-[64px] py-[56px] shadow-[0_2px_24px_rgba(30,64,175,0.10)]">
      {/* 文档大标题：深蓝加粗 + 蓝色渐变分隔线 */}
      <header className="print-keep">
        <h1 className="text-center text-[24px] font-bold tracking-tight text-blue-900">
          {docTitle.trim() || '未命名文档'}
        </h1>
        <div className="mx-auto mt-4 h-[3px] w-full rounded-full bg-gradient-to-r from-transparent via-blue-700 to-transparent" />
      </header>

      <div className="mt-7 space-y-1">
        {blocks.map((b, i) =>
          b.type === 'section' ? (
            // 章节标题条：蓝色左边框 + 浅蓝底 + 深蓝字
            <h2
              key={i}
              className="print-keep mb-3 mt-7 rounded-r-md border-l-4 border-blue-700 bg-blue-50 px-3 py-1.5 text-[17px] font-bold tracking-tight text-blue-900 first:mt-0"
            >
              {b.title}
            </h2>
          ) : (
            <section key={i} className="print-keep mb-5">
              {/* 模块标题：深蓝文字 + 浅蓝下划线 */}
              <h3 className="mb-2 border-b border-blue-100 pb-1 text-[15px] font-semibold text-blue-900">
                {b.title}
              </h3>
              <div
                className="md-preview doc-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(b.markdown) }}
              />
            </section>
          ),
        )}
        {blocks.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">（文档暂无内容）</p>
        )}
      </div>

      {/* 署名：顶部蓝色细线 + 灰蓝小字 */}
      {showSig && (
        <footer className="print-keep mt-10 border-t-2 border-blue-700/70 pt-4">
          {sigLine && <p className="text-[13px] font-medium text-slate-600">{sigLine}</p>}
          {signature.showDisclaimer && signature.disclaimer.trim() && (
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              {signature.disclaimer}
            </p>
          )}
        </footer>
      )}
    </div>
  )
}
