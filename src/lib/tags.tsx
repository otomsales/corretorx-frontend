import { cn } from '@/lib/utils'

/** Cor estável por etiqueta (tint) — mesma identidade das tags do chat. */
const TAG_TINTS = [
  'bg-emerald-500/15 text-emerald-300',
  'bg-sky-500/15 text-sky-300',
  'bg-violet-500/15 text-violet-300',
  'bg-amber-500/15 text-amber-300',
  'bg-rose-500/15 text-rose-300',
  'bg-cyan-500/15 text-cyan-300',
  'bg-indigo-500/15 text-indigo-300',
  'bg-fuchsia-500/15 text-fuchsia-300',
  'bg-orange-500/15 text-orange-300',
  'bg-teal-500/15 text-teal-300',
]

export function tagTint(tag: string): string {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = tag.charCodeAt(i) + ((h << 5) - h)
  return TAG_TINTS[Math.abs(h) % TAG_TINTS.length]
}

export function TagChip({ tag, className }: { tag: string; className?: string }) {
  return <span className={cn('inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium', tagTint(tag), className)}>{tag}</span>
}
