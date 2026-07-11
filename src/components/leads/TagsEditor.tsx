import { useState } from 'react'
import { X, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TagChip, TAG_PALETTE, useTagColors } from '@/lib/tags'

/** Editor inline de etiquetas: chips removíveis + adicionar (livre ou sugestão) com escolha de cor. */
export function TagsEditor({ tags, onChange, suggestions = [] }: {
  tags: string[]; onChange: (tags: string[]) => void; suggestions?: string[]
}) {
  const { colorOf, setColor } = useTagColors()
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')
  const [color, setColorSel] = useState<string | null>(null)

  const reset = () => { setVal(''); setColorSel(null); setAdding(false) }
  const add = (t: string, cls?: string) => {
    const tag = t.trim()
    if (!tag) { reset(); return }
    if (cls ?? color) setColor(tag, (cls ?? color)!)
    if (!tags.includes(tag)) onChange([...tags, tag])
    reset()
  }
  const remove = (t: string) => onChange(tags.filter((x) => x !== t))
  const term = val.trim().toLowerCase()
  const sugg = suggestions.filter((s) => !tags.includes(s) && (!term || s.toLowerCase().includes(term)))
  const canCreate = !!term && !suggestions.some((s) => s.toLowerCase() === term)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span key={t} className="group/tag relative inline-flex items-center">
          <TagChip tag={t} />
          <button onClick={() => remove(t)} title="Remover" className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-border transition-colors hover:text-danger group-hover/tag:grid">
            <X className="h-2.5 w-2.5" strokeWidth={2.5} />
          </button>
        </span>
      ))}

      {adding ? (
        <div className="relative">
          <input
            autoFocus value={val} onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(val) } else if (e.key === 'Escape') reset() }}
            onBlur={() => { if (!val.trim()) reset() }}
            placeholder="Nova etiqueta…"
            className="h-[22px] w-32 rounded-md border border-teal bg-background px-2 text-[11px] outline-none focus:ring-[2.5px] focus:ring-teal/20"
          />
          <div className="absolute left-0 top-full z-[70] mt-1 w-48 rounded-lg border border-white/10 bg-card p-2 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]">
            {/* swatches de cor */}
            <div className="mb-2 flex flex-wrap gap-1.5">
              {TAG_PALETTE.map((cls) => {
                const sel = (color ?? (term ? colorOf(val.trim()) : null)) === cls
                return (
                  <button key={cls} type="button" onMouseDown={(e) => { e.preventDefault(); setColorSel(cls) }} title="Cor da etiqueta"
                    className={cn('grid h-5 w-5 place-items-center rounded-md ring-1 ring-inset ring-white/10 transition', cls.split(' ')[0], sel ? 'scale-110 ring-2 ring-white/60' : 'hover:scale-105')}>
                    {sel && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
            {canCreate && (
              <button onMouseDown={(e) => { e.preventDefault(); add(val) }} className="mb-1 flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[12px] font-medium text-teal transition-colors hover:bg-teal/[0.08]">
                <Plus className="h-3 w-3" /> Criar “{val.trim()}”
              </button>
            )}
            {sugg.length > 0 && (
              <div className="max-h-40 overflow-auto border-t border-border/50 pt-1">
                {sugg.slice(0, 8).map((s) => (
                  <button key={s} onMouseDown={(e) => { e.preventDefault(); add(s, colorOf(s)) }} className="flex w-full items-center rounded px-1.5 py-1 text-left transition-colors hover:bg-foreground/[0.05]">
                    <TagChip tag={s} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-teal hover:text-teal">
          <Plus className="h-3 w-3" /> tag
        </button>
      )}
    </div>
  )
}
