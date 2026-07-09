import { useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { initials, pickAvatar } from '@/lib/format'
import { STAGE_CATALOG, OWNERS, type Lead } from '@/lib/funil-data'

/* Tier = único metadado colorido sólido (regra vault). */
export const TIER: Record<NonNullable<Lead['tier']>, { label: string; cls: string }> = {
  bronze: { label: 'Bronze', cls: 'bg-amber-700 text-white' },
  prata: { label: 'Prata', cls: 'bg-slate-400 text-slate-950' },
  ouro: { label: 'Ouro', cls: 'bg-yellow-500 text-yellow-950' },
  diamante: { label: 'Diamante', cls: 'bg-sky-500 text-white' },
}
export function TierPill({ t }: { t: Lead['tier'] }) {
  if (!t) return <span className="text-muted-foreground/50">—</span>
  const m = TIER[t]
  return <span className={cn('inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold', m.cls)}>{m.label}</span>
}

/* Status = ponto colorido + texto neutro. */
export const STATUS: Record<NonNullable<Lead['lifecycle']>, { label: string; dot: string }> = {
  potencial: { label: 'Potencial', dot: 'bg-teal' },
  ativo: { label: 'Ativo', dot: 'bg-emerald-400' },
  frio: { label: 'Frio', dot: 'bg-sky-400' },
  ganho: { label: 'Ganho', dot: 'bg-amber-400' },
  perdido: { label: 'Perdido', dot: 'bg-rose-400' },
}
export function StatusDot({ s }: { s: NonNullable<Lead['lifecycle']> }) {
  const m = STATUS[s]
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground/85">
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', m.dot)} />{m.label}
    </span>
  )
}

export function StageChip({ id }: { id: string }) {
  return <span className="inline-block whitespace-nowrap rounded-md bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-foreground/75">{STAGE_CATALOG[id]?.label ?? '—'}</span>
}

export function FollowupCell({ days }: { days: number | null | undefined }) {
  if (days == null) {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-muted-foreground/50"><AlertTriangle className="h-3 w-3 shrink-0" />Sem retorno</span>
  }
  let cls = 'bg-muted text-muted-foreground', label = `Em ${days}d`
  if (days < 0) { cls = 'bg-danger/12 text-danger'; label = `Atrasado ${Math.abs(days)}d` }
  else if (days === 0) { cls = 'bg-warning/15 text-warning'; label = 'Hoje' }
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium', cls)}><Clock className="h-3 w-3 shrink-0" />{label}</span>
}

/** Responsável = avatar pequeno + primeiro nome (ou completo). */
export function OwnerTag({ id, full }: { id: string | null; full?: boolean }) {
  const o = OWNERS.find((x) => x.id === id)
  if (!o) return <span className="text-[13px] text-muted-foreground/50">—</span>
  return (
    <span className="flex items-center gap-2">
      <img src={o.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
      <span className="truncate text-[13px] text-foreground/85">{full ? o.name : o.name.split(' ')[0]}</span>
    </span>
  )
}

export function LeadAvatar({ lead, className = 'h-9 w-9', textCls = 'text-[12px]' }: {
  lead: Lead; className?: string; textCls?: string
}) {
  const [err, setErr] = useState(false)
  if (lead.avatarUrl && !err) {
    return <img src={lead.avatarUrl} alt="" onError={() => setErr(true)} className={cn('shrink-0 rounded-full object-cover', className)} />
  }
  return <span className={cn('grid shrink-0 place-items-center rounded-full font-bold', className, textCls, pickAvatar(lead.name))}>{initials(lead.name)}</span>
}
