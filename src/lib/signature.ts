import { DEFAULT_DISCLAIMER } from '@/config'

// 投顾署名：全局持久化，不随每日素材清空
export interface Signature {
  name: string
  licenseId: string
  org: string
  showDisclaimer: boolean
  disclaimer: string
}

const KEY = 'advisor-signature'

export const EMPTY_SIGNATURE: Signature = {
  name: '',
  licenseId: '',
  org: '',
  showDisclaimer: true,
  disclaimer: DEFAULT_DISCLAIMER,
}

export function loadSignature(): Signature {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY_SIGNATURE }
    return { ...EMPTY_SIGNATURE, ...(JSON.parse(raw) as Partial<Signature>) }
  } catch {
    return { ...EMPTY_SIGNATURE }
  }
}

export function saveSignature(sig: Signature): void {
  localStorage.setItem(KEY, JSON.stringify(sig))
}

export function signatureEmpty(sig: Signature): boolean {
  return !sig.name.trim() && !sig.licenseId.trim() && !sig.org.trim()
}

// 「署名：xxx｜执业编号：xxx｜机构：xxx」（跳过空字段）
export function signatureLine(sig: Signature): string {
  const parts: string[] = []
  if (sig.name.trim()) parts.push(sig.name.trim())
  if (sig.licenseId.trim()) parts.push(`执业编号：${sig.licenseId.trim()}`)
  if (sig.org.trim()) parts.push(`机构：${sig.org.trim()}`)
  return parts.join('｜')
}
