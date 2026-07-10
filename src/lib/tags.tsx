import { cn } from '@/lib/utils'

/** Cor estável por etiqueta (sólida, sem translúcido) — mesma identidade das tags do chat. */
const TAG_TINTS = [
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

export function tagTint(tag: string): string {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = tag.charCodeAt(i) + ((h << 5) - h)
  return TAG_TINTS[Math.abs(h) % TAG_TINTS.length]
}

export function TagChip({ tag, className }: { tag: string; className?: string }) {
  return <span className={cn('inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium', tagTint(tag), className)}>{tag}</span>
}
