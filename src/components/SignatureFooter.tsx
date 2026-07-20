import { BadgeCheck } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { signatureLine, type Signature } from '@/lib/signature'

interface Props {
  signature: Signature
  onChange: (patch: Partial<Signature>) => void
}

// 文末署名区块：固定在编辑区末尾，不可删除、不可拖动
// 数据存 localStorage 全局 key，不随每日素材清空
export default function SignatureFooter({ signature, onChange }: Props) {
  const inputCls =
    'w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30'

  return (
    <div className="rounded-lg border border-blue-100 border-t-2 border-t-blue-600 bg-blue-50/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <BadgeCheck className="h-4 w-4 text-blue-700" />
        <span className="text-[13px] font-semibold text-foreground">署名（固定于文末，全局保存）</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[11px] text-muted-foreground">投顾姓名</span>
          <input
            className={inputCls}
            value={signature.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="张三"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-muted-foreground">执业编号</span>
          <input
            className={inputCls}
            value={signature.licenseId}
            onChange={(e) => onChange({ licenseId: e.target.value })}
            placeholder="S1234567890"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-muted-foreground">所属机构</span>
          <input
            className={inputCls}
            value={signature.org}
            onChange={(e) => onChange({ org: e.target.value })}
            placeholder="XX证券股份有限公司"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Switch
          checked={signature.showDisclaimer}
          onCheckedChange={(v) => onChange({ showDisclaimer: v })}
          id="disclaimer-switch"
        />
        <label htmlFor="disclaimer-switch" className="text-[13px] text-foreground">
          附加免责声明
        </label>
      </div>
      {signature.showDisclaimer && (
        <textarea
          className={inputCls + ' mt-2 min-h-[56px] resize-y leading-relaxed'}
          value={signature.disclaimer}
          onChange={(e) => onChange({ disclaimer: e.target.value })}
        />
      )}

      {/* 文末效果预览 */}
      <Separator className="my-3 bg-blue-200/70" />
      <p className="text-[13px] text-slate-600">
        {signatureLine(signature) || '（待填写姓名）｜执业编号：（待填写）｜机构：（待填写）'}
      </p>
      {signature.showDisclaimer && signature.disclaimer.trim() && (
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {signature.disclaimer}
        </p>
      )}
    </div>
  )
}
