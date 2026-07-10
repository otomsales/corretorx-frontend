import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OWNERS, PIPELINES, STAGE_CATALOG, lifecycleOf, type Lead } from '@/lib/funil-data'
import { brl } from '@/lib/format'
import { TIER, STATUS, TierPill, StageChip, StatusDot, OwnerTag, FollowupCell } from './LeadBadges'

const centsToReais = (c?: number | null) => (c ? (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
const reaisToCents = (v: string) => Math.round((parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0) * 100)
export const money = { toInput: centsToReais, toCents: reaisToCents, fmt: brl }

const SHADOW =
  'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]'

type Opt<T extends string> = { value: T; label: string; node?: ReactNode }

/** Editor inline genérico: trigger (badge) → popover em portal (escapa o overflow da tabela). */
function InlinePick<T extends string>({
  trigger, options, value, onPick, width = 176,
}: {
  trigger: ReactNode
  options: Opt<T>[]
  value?: T
  onPick: (v: T) => void
  width?: number
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  const open = (e: React.MouseEvent) => {
    e.stopPropagation()
    const r = btnRef.current!.getBoundingClientRect()
    setPos({ left: r.left, top: r.bottom + 4 })
  }

  // reposiciona se estourar a viewport (abre pra cima / encosta na borda)
  useLayoutEffect(() => {
    if (!pos || !panelRef.current) return
    const p = panelRef.current.getBoundingClientRect()
    let { left, top } = pos
    const margin = 8
    if (top + p.height > window.innerHeight - margin) {
      const r = btnRef.current!.getBoundingClientRect()
      top = Math.max(margin, r.top - p.height - 4)
    }
    if (left + p.width > window.innerWidth - margin) left = window.innerWidth - p.width - margin
    if (left !== pos.left || top !== pos.top) setPos({ left, top })
  }, [pos])

  return (
    <>
      <button
        ref={btnRef} onClick={open} title="Clique para editar"
        className="group/ie -mx-1 inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1 py-0.5 text-left align-middle transition-colors hover:bg-foreground/[0.06]"
      >
        {trigger}
        <ChevronDown className="h-3 w-3 shrink-0 text-transparent transition-colors group-hover/ie:text-muted-foreground/60" />
      </button>
      {pos != null && createPortal(
        <>
          <button type="button" className="fixed inset-0 z-[80] cursor-default" onClick={(e) => { e.stopPropagation(); setPos(null) }} aria-hidden />
          <div
            ref={panelRef} style={{ left: pos.left, top: pos.top, width }}
            className={cn('dropdown-in fixed z-[90] max-h-72 overflow-auto rounded-lg border border-white/10 bg-card p-1', SHADOW)}
          >
            {options.map((o) => (
              <button
                key={o.value}
                onClick={(e) => { e.stopPropagation(); setPos(null); if (o.value !== value) onPick(o.value) }}
                className={cn('flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-foreground/[0.05]', value === o.value && 'bg-foreground/[0.06]')}
              >
                <span className="flex min-w-0 items-center gap-2 truncate">{o.node ?? o.label}</span>
                {value === o.value && <Check className="h-3.5 w-3.5 shrink-0 text-teal" />}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

/* ---------- células especializadas ---------- */

const TIER_ORDER = ['bronze', 'prata', 'ouro', 'diamante'] as const

export function TierCell({ lead, onPick }: { lead: Lead; onPick: (t: NonNullable<Lead['tier']>) => void }) {
  return (
    <InlinePick
      value={lead.tier} onPick={onPick} width={150}
      trigger={<TierPill t={lead.tier} />}
      options={TIER_ORDER.map((t) => ({ value: t, label: TIER[t].label, node: <TierPill t={t} /> }))}
    />
  )
}

const OPEN_STATUS = ['potencial', 'ativo', 'frio'] as const

export function StatusCell({ lead, onPick }: { lead: Lead; onPick: (s: NonNullable<Lead['lifecycle']>) => void }) {
  const kind = STAGE_CATALOG[lead.stage]?.kind
  // ganho/perdido = derivado da etapa → não duplica coluna nem edita aqui
  if (kind !== 'open') return <span className="text-[13px] text-muted-foreground/40">—</span>
  const current = lifecycleOf(lead) // etapa open ⇒ potencial | ativo | frio
  return (
    <InlinePick
      value={current} onPick={onPick} width={160}
      trigger={<StatusDot s={current} />}
      options={OPEN_STATUS.map((s) => ({ value: s, label: STATUS[s].label, node: <StatusDot s={s} /> }))}
    />
  )
}

const STAGE_INLINE = ['novo', 'atendimento', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido']

export function StageCell({ lead, onPick }: { lead: Lead; onPick: (s: string) => void }) {
  return (
    <InlinePick
      value={lead.stage} onPick={onPick} width={188}
      trigger={<StageChip id={lead.stage} />}
      options={STAGE_INLINE.map((s) => ({ value: s, label: STAGE_CATALOG[s].label, node: <StageChip id={s} /> }))}
    />
  )
}

export function OwnerCell({ lead, onPick }: { lead: Lead; onPick: (id: string) => void }) {
  return (
    <InlinePick
      value={lead.ownerId ?? undefined} onPick={onPick} width={208}
      trigger={<OwnerTag id={lead.ownerId} />}
      options={OWNERS.map((o) => ({
        value: o.id, label: o.name,
        node: <><img src={o.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" /><span className="truncate">{o.name}</span></>,
      }))}
    />
  )
}

const FOLLOW_OPTS: Opt<string>[] = [
  { value: '0', label: 'Hoje' },
  { value: '1', label: 'Em 1 dia' },
  { value: '3', label: 'Em 3 dias' },
  { value: '7', label: 'Em 7 dias' },
  { value: '15', label: 'Em 15 dias' },
  { value: 'none', label: 'Sem retorno' },
]

export function FollowupInlineCell({ lead, onPick }: { lead: Lead; onPick: (days: number | null) => void }) {
  const value = lead.followupInDays == null ? 'none' : String(lead.followupInDays)
  return (
    <InlinePick
      value={value} width={160}
      onPick={(v) => onPick(v === 'none' ? null : Number(v))}
      trigger={<FollowupCell days={lead.followupInDays} />}
      options={FOLLOW_OPTS}
    />
  )
}

export function PipelineCell({ value, onPick }: { value?: string; onPick: (id: string) => void }) {
  const cur = PIPELINES.find((p) => p.id === value)
  return (
    <InlinePick
      value={value} onPick={onPick} width={180}
      trigger={<span className="text-[13.5px] font-medium text-foreground">{cur?.name ?? '—'}</span>}
      options={PIPELINES.map((p) => ({ value: p.id, label: p.name }))}
    />
  )
}

/** Edição inline de texto/número/moeda no lugar (sem portal) — p/ campos livres. */
export function InlineText({ value, display, onCommit, type = 'text', placeholder = '—' }: {
  value: string
  display?: ReactNode
  onCommit: (v: string) => void
  type?: 'text' | 'number' | 'currency'
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const start = () => { setVal(value); setEditing(true) }
  const commit = () => { setEditing(false); if (val !== value) onCommit(val) }
  const numeric = type === 'currency' || type === 'number'
  if (editing) {
    return (
      <input
        autoFocus value={val}
        inputMode={type === 'number' ? 'numeric' : type === 'currency' ? 'decimal' : undefined}
        onChange={(e) => setVal(type === 'number' ? e.target.value.replace(/\D/g, '') : e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } else if (e.key === 'Escape') setEditing(false) }}
        className={cn('h-7 w-36 rounded-md border border-teal bg-background px-2 text-right text-[13px] outline-none focus:ring-[2.5px] focus:ring-teal/20', numeric && 'font-mono tabular-nums')}
      />
    )
  }
  return (
    <button
      onClick={start} title="Clique para editar"
      className={cn('-mr-1 max-w-[180px] truncate rounded-md px-1.5 py-0.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-foreground/[0.06]', numeric && 'font-mono tabular-nums')}
    >
      {display ?? (value || <span className="text-muted-foreground/50">{placeholder}</span>)}
    </button>
  )
}
