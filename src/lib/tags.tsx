import { createContext, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Paleta sólida de cores de etiqueta (sem translúcido). */
export const TAG_PALETTE = [
  'bg-emerald-600 text-white',
  'bg-sky-600 text-white',
  'bg-violet-600 text-white',
  'bg-amber-500 text-amber-950',
  'bg-rose-600 text-white',
  'bg-cyan-600 text-white',
  'bg-indigo-600 text-white',
  'bg-fuchsia-600 text-white',
  'bg-orange-500 text-orange-950',
  'bg-teal-600 text-white',
]

/** Cor estável por nome (hash) — fallback quando não há cor escolhida. */
export function tagTint(tag: string): string {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = tag.charCodeAt(i) + ((h << 5) - h)
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length]
}

interface TagColorsCtx {
  colorOf: (tag: string) => string
  setColor: (tag: string, cls: string) => void
}
const Ctx = createContext<TagColorsCtx>({ colorOf: tagTint, setColor: () => {} })
export const useTagColors = () => useContext(Ctx)

export function TagColorsProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<Record<string, string>>({})
  const colorOf = (tag: string) => colors[tag] ?? tagTint(tag)
  const setColor = (tag: string, cls: string) => setColors((p) => ({ ...p, [tag]: cls }))
  return <Ctx.Provider value={{ colorOf, setColor }}>{children}</Ctx.Provider>
}

export function TagChip({ tag, className, cls }: { tag: string; className?: string; cls?: string }) {
  const { colorOf } = useTagColors()
  return <span className={cn('inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium', cls ?? colorOf(tag), className)}>{tag}</span>
}
