import { useState } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/** Filtro de multisseleção (checkbox, menu permanece aberto ao marcar). Compartilhado por Leads e Funil. */
export function MultiFilterDropdown({ values, onChange, options, allLabel }: {
  values: string[]; onChange: (v: string[]) => void; options: { value: string; label: string }[]; allLabel: string
}) {
  const [open, setOpen] = useState(false)
  const active = values.length > 0
  const label = !active ? allLabel : values.length === 1 ? (options.find((o) => o.value === values[0])?.label ?? allLabel) : `${values.length} selecionados`
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  return (
    <div className="relative">
      <button
        type="button" onClick={() => setOpen((v) => !v)}
        className={cn('flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-colors hover:bg-muted/60', active ? 'font-medium text-teal' : 'text-muted-foreground')}
      >
        {label}
        <CaretDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-hidden />
          <div className="dropdown-in absolute left-0 top-full z-50 mt-1.5 max-h-72 w-56 overflow-auto rounded-xl border border-white/10 bg-card p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]">
            <button
              type="button" onClick={() => onChange([])}
              className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors', !active ? 'font-medium text-teal' : 'text-foreground hover:bg-foreground/[0.05]')}
            >
              <span>{allLabel}</span>{!active && <Check className="h-3.5 w-3.5 shrink-0 text-teal" />}
            </button>
            <div className="my-1 h-px bg-border/60" />
            {options.map((o) => {
              const sel = values.includes(o.value)
              return (
                <button
                  key={o.value} type="button" onClick={() => toggle(o.value)}
                  className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors', sel ? 'font-medium text-teal' : 'text-foreground hover:bg-foreground/[0.05]')}
                >
                  <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors', sel ? 'border-transparent bg-teal' : 'border-input')}>
                    {sel && <Check className="h-3 w-3 text-primary-foreground" />}
                  </span>
                  <span className="flex-1 truncate">{o.label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
