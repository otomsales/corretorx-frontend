import { useMemo, useState } from 'react'
import { Clock, UserPlus, Lightning, ArrowsClockwise, HandPointing, Sliders, BellRinging, MagnifyingGlass, Crown, CaretUp, CaretDown, CaretUpDown, MetaLogo, WhatsappLogo, Globe, Handshake, Megaphone, type Icon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatPhone } from '@/lib/format'
import { OWNERS, STAGE_CATALOG, type Lead } from '@/lib/funil-data'
import { useLeads } from '@/store/leads'
import { TierPill } from '@/components/leads/LeadBadges'
import { Checkbox, SelectionToolbar, PickOwnerModal } from '@/components/leads/Bulk'

type QueueItem = { id: string; name: string; phone: string; tier: NonNullable<Lead['tier']>; source: string; waitMin: number }
type SortKey = 'name' | 'tier' | 'source' | 'wait' | 'entry'

const SEED_QUEUE: QueueItem[] = [
  { id: 'q1', name: 'Padaria Real', phone: '11991234500', tier: 'ouro', source: 'Meta Ads', waitMin: 8 },
  { id: 'q2', name: 'Carlos Menezes', phone: '11994567810', tier: 'bronze', source: 'Indicação', waitMin: 34 },
  { id: 'q3', name: 'Transportadora Norte', phone: '41993451200', tier: 'diamante', source: 'Meta Ads', waitMin: 72 },
  { id: 'q4', name: 'Vaneza Prado', phone: '11987651234', tier: 'prata', source: 'Site', waitMin: 96 },
  { id: 'q5', name: 'Oficina do Léo', phone: '11990001122', tier: 'bronze', source: 'WhatsApp', waitMin: 138 },
  { id: 'q6', name: 'Colégio Nova Era', phone: '11993334455', tier: 'ouro', source: 'Meta Ads', waitMin: 165 },
]

const TIERS = ['bronze', 'prata', 'ouro', 'diamante'] as const
const TIER_ORDER: Record<string, number> = { bronze: 0, prata: 1, ouro: 2, diamante: 3 }
const SOURCE_ICON: Record<string, { icon: Icon; cls: string }> = {
  'Meta Ads': { icon: MetaLogo, cls: 'text-sky-500' },
  WhatsApp: { icon: WhatsappLogo, cls: 'text-emerald-500' },
  Site: { icon: Globe, cls: 'text-violet-500' },
  Indicação: { icon: Handshake, cls: 'text-amber-500' },
}

function waitInfo(min: number) {
  if (min >= 120) return { label: 'Urgente', cls: 'text-danger' }
  if (min >= 60) return { label: 'Atenção', cls: 'text-warning' }
  return { label: 'Aguardando', cls: 'text-teal' }
}
function fmtWait(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h${m}` : `${h}h`
}
function fmtEntry(waitMin: number, now: number) {
  const d = new Date(now - waitMin * 60000)
  const p = (n: number) => String(n).padStart(2, '0')
  const today = new Date(now)
  const sameDay = d.getDate() === today.getDate() && d.getMonth() === today.getMonth()
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`
  return sameDay ? `Hoje ${hm}` : `${p(d.getDate())}/${p(d.getMonth() + 1)} ${hm}`
}

export default function Distribuicao() {
  const { leads } = useLeads()
  const [tab, setTab] = useState<'fila' | 'regras'>('fila')
  const [queue, setQueue] = useState<QueueItem[]>(SEED_QUEUE)
  const [, setDistributedToday] = useState(11)
  const [q, setQ] = useState('')
  const [assigning, setAssigning] = useState<string | null>(null)
  const [justAssigned, setJustAssigned] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'wait', dir: 'desc' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pickOwner, setPickOwner] = useState(false)
  const now = useMemo(() => Date.now(), [])

  // regras
  const [mode, setMode] = useState<'rodizio' | 'manual'>('rodizio')
  const [autoMeta, setAutoMeta] = useState(true)
  const [notify, setNotify] = useState(true)
  const [weights, setWeights] = useState<Record<string, number>>({ bronze: 1, prata: 2, ouro: 3, diamante: 4 })

  const loadByOwner = useMemo(() => {
    const m: Record<string, number> = {}
    OWNERS.forEach((o) => { m[o.id] = 0 })
    leads.forEach((l) => { if (l.ownerId && STAGE_CATALOG[l.stage]?.kind === 'open') m[l.ownerId] = (m[l.ownerId] ?? 0) + 1 })
    Object.values(justAssigned).forEach((oid) => { m[oid] = (m[oid] ?? 0) + 1 })
    return m
  }, [leads, justAssigned])
  const maxLoad = Math.max(1, ...OWNERS.map((o) => loadByOwner[o.id] ?? 0))
  const ranked = useMemo(() => [...OWNERS].sort((a, b) => (loadByOwner[a.id] ?? 0) - (loadByOwner[b.id] ?? 0)), [loadByOwner])

  const filtered = queue.filter((it) => !q.trim() || it.name.toLowerCase().includes(q.trim().toLowerCase()) || it.phone.includes(q.replace(/\D/g, '')))
  const rows = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let r = 0
      if (sort.key === 'name') r = a.name.localeCompare(b.name)
      else if (sort.key === 'tier') r = TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
      else if (sort.key === 'source') r = a.source.localeCompare(b.source)
      else if (sort.key === 'entry') r = b.waitMin - a.waitMin // entrada mais antiga = maior espera
      else r = a.waitMin - b.waitMin
      return sort.dir === 'asc' ? r : -r
    })
    return arr
  }, [filtered, sort])

  const toggleSort = (k: SortKey) => setSort((s) => s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: k === 'wait' ? 'desc' : 'asc' })

  // seleção
  const selCount = rows.filter((r) => selected.has(r.id)).length
  const allSelected = rows.length > 0 && selCount === rows.length
  const toggleOne = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelected(new Set(rows.map((r) => r.id)))
  const clearSel = () => setSelected(new Set())
  const bulkDistribute = () => {
    const items = queue.filter((it) => selected.has(it.id))
    if (!items.length) return
    const load: Record<string, number> = { ...loadByOwner }
    const order = [...items].sort((a, b) => (weights[b.tier] ?? 1) - (weights[a.tier] ?? 1) || b.waitMin - a.waitMin)
    const map: Record<string, string> = {}
    order.forEach((it) => { const owner = [...OWNERS].sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0))[0]; map[it.id] = owner.id; load[owner.id] = (load[owner.id] ?? 0) + 1 })
    setJustAssigned((p) => ({ ...p, ...map }))
    setDistributedToday((n) => n + items.length)
    setQueue((p) => p.filter((x) => !selected.has(x.id)))
    clearSel()
    toast.success(`${items.length} leads distribuídos por rodízio`)
  }
  const bulkAssign = (ownerId: string) => {
    const items = queue.filter((it) => selected.has(it.id))
    if (!items.length) return
    const map: Record<string, string> = {}
    items.forEach((it) => { map[it.id] = ownerId })
    setJustAssigned((p) => ({ ...p, ...map }))
    setDistributedToday((n) => n + items.length)
    setQueue((p) => p.filter((x) => !selected.has(x.id)))
    clearSel(); setPickOwner(false)
    toast.success(`${items.length} leads → ${OWNERS.find((o) => o.id === ownerId)?.name.split(' ')[0]}`)
  }

  const assign = (item: QueueItem, ownerId: string) => {
    setJustAssigned((p) => ({ ...p, [item.id]: ownerId }))
    setQueue((p) => p.filter((x) => x.id !== item.id))
    setDistributedToday((n) => n + 1)
    setAssigning(null)
    toast.success(`${item.name} → ${OWNERS.find((o) => o.id === ownerId)?.name.split(' ')[0]}`)
  }
  const autoDistribute = () => {
    if (!queue.length) return
    const load: Record<string, number> = { ...loadByOwner }
    const order = [...queue].sort((a, b) => (weights[b.tier] ?? 1) - (weights[a.tier] ?? 1) || b.waitMin - a.waitMin)
    const map: Record<string, string> = {}
    order.forEach((it) => {
      const owner = [...OWNERS].sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0))[0]
      map[it.id] = owner.id
      load[owner.id] = (load[owner.id] ?? 0) + 1
    })
    const total = queue.length
    setJustAssigned((p) => ({ ...p, ...map }))
    setDistributedToday((n) => n + total)
    setQueue([])
    toast.success(`${total} leads distribuídos por rodízio`)
  }

  const Th = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th className={cn('px-3 py-2.5', right && 'text-right')}>
      <button onClick={() => toggleSort(k)} className="group/th inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground">
        {label}
        {sort.key === k
          ? (sort.dir === 'asc' ? <CaretUp className="h-3 w-3 text-teal" /> : <CaretDown className="h-3 w-3 text-teal" />)
          : <CaretUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover/th:opacity-40" />}
      </button>
    </th>
  )

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Distribuição de leads</h1>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">Fila de novos leads e regras de roteamento para a equipe.</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'fila' && queue.length > 0 && (
            <button onClick={autoDistribute} className="inline-flex items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/10 px-3.5 py-2 text-[13px] font-bold text-teal transition-colors hover:bg-teal/15">
              <ArrowsClockwise className="h-4 w-4" weight="bold" /> Distribuir tudo
            </button>
          )}
          <div className="flex rounded-lg border border-border/50 bg-card p-0.5">
            {(['fila', 'regras'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn('rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors', tab === t ? 'bg-teal text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {t === 'fila' ? 'Fila' : 'Regras'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'fila' ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-3">
          {selCount > 0 && (
            <SelectionToolbar
              count={selCount} total={rows.length} allSelected={allSelected} onSelectAll={selectAll} onClear={clearSel}
              actions={[
                { label: 'Distribuir (rodízio)', icon: ArrowsClockwise, onClick: bulkDistribute },
                { label: 'Atribuir a…', icon: UserPlus, onClick: () => setPickOwner(true) },
              ]}
            />
          )}
          {/* fila (tabela) */}
          <div className="overflow-hidden rounded-xl border border-border/40 bg-card">
            <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-foreground/80">Leads aguardando</h2>
              <span className="grid h-5 min-w-5 place-items-center rounded-md bg-teal px-1.5 text-[11px] font-bold tabular-nums text-primary-foreground">{queue.length}</span>
              <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-2">
                <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-muted-foreground/55" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="h-8 w-40 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/50" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] table-auto border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/25 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="w-9 px-2 py-2.5 pl-4"><Checkbox checked={allSelected} indeterminate={selCount > 0 && !allSelected} onChange={() => (allSelected || selCount > 0 ? clearSel() : selectAll())} /></th>
                    <Th k="name" label="Lead" />
                    <th className="px-3 py-2.5">Telefone</th>
                    <Th k="tier" label="Tier" />
                    <Th k="source" label="Origem" />
                    <Th k="entry" label="Entrada" />
                    <Th k="wait" label="Espera" />
                    <th className="px-3 py-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rows.map((it) => {
                    const info = waitInfo(it.waitMin)
                    return (
                      <tr key={it.id} className={cn('transition-colors', selected.has(it.id) ? 'bg-teal/[0.05]' : 'hover:bg-foreground/[0.02]')}>
                        <td className="px-2 py-2.5 pl-4"><Checkbox checked={selected.has(it.id)} onChange={() => toggleOne(it.id)} /></td>
                        <td className="px-3 py-2.5">
                          <span className="truncate text-[13.5px] font-semibold text-foreground">{it.name}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[13px] tabular-nums text-muted-foreground">{formatPhone(it.phone)}</td>
                        <td className="px-3 py-2.5"><TierPill t={it.tier} /></td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          {(() => { const s = SOURCE_ICON[it.source] ?? { icon: Megaphone, cls: 'text-muted-foreground' }; const SIcon = s.icon; return (
                            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"><SIcon className={cn('h-4 w-4 shrink-0', s.cls)} weight="fill" />{it.source}</span>
                          ) })()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[13px] tabular-nums text-muted-foreground">{fmtEntry(it.waitMin, now)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-semibold', info.cls)}>
                            <Clock className="h-3.5 w-3.5 shrink-0" />{fmtWait(it.waitMin)} · {info.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="relative inline-block">
                            <button onClick={() => setAssigning(assigning === it.id ? null : it.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-[12.5px] font-bold text-primary-foreground transition hover:brightness-110">
                              <UserPlus className="h-4 w-4" weight="bold" /> Atribuir
                            </button>
                            {assigning === it.id && (
                              <>
                                <button type="button" className="fixed inset-0 z-40" onClick={() => setAssigning(null)} aria-hidden />
                                <div className="dropdown-in absolute right-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-border dark:border-white/10 bg-card p-1 text-left shadow-[0_1px_2px_-1px_rgba(0,0,0,0.06),0_8px_16px_-6px_rgba(0,0,0,0.10),0_24px_48px_-16px_rgba(0,0,0,0.14)] dark:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]">
                                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">Atribuir a</p>
                                  {ranked.map((o, i) => (
                                    <button key={o.id} onClick={() => assign(it, o.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.05]">
                                      <img src={o.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                                      <span className="flex-1 truncate text-[13px] text-foreground">{o.name}</span>
                                      {i === 0 && <span className="shrink-0 rounded bg-teal px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">próximo</span>}
                                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{loadByOwner[o.id] ?? 0}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-12 text-center text-[13px] text-muted-foreground/60">{queue.length === 0 ? 'Fila zerada — todos os leads foram distribuídos. 🎉' : 'Nada encontrado.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>

          {/* carga por vendedor */}
          <div className="rounded-xl border border-border/40 bg-card p-4">
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-foreground/80">Carga da equipe</h2>
            <div className="space-y-3.5">
              {ranked.map((o, i) => {
                const load = loadByOwner[o.id] ?? 0
                const isNext = mode === 'rodizio' && i === 0
                return (
                  <div key={o.id}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <img src={o.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                      <span className="flex-1 truncate text-[13px] font-medium text-foreground">{o.name}</span>
                      {isNext && <span className="inline-flex items-center gap-0.5 rounded bg-teal px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground"><Crown className="h-3 w-3" weight="fill" />próximo</span>}
                      <span className="shrink-0 text-[13px] font-bold tabular-nums text-foreground">{load}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                      <div className={cn('h-full rounded-full transition-all', isNext ? 'bg-teal' : 'bg-teal/45')} style={{ width: `${(load / maxLoad) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {/* modo */}
          <div className="rounded-xl border border-border/40 bg-card p-4">
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-foreground/80">Modo de distribuição</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { v: 'rodizio', l: 'Rodízio automático', d: 'Distribui igualmente entre a equipe', icon: ArrowsClockwise },
                { v: 'manual', l: 'Manual', d: 'Gestor atribui cada lead', icon: HandPointing },
              ] as const).map((opt) => (
                <button key={opt.v} onClick={() => setMode(opt.v)} className={cn('flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors', mode === opt.v ? 'border-teal bg-teal/[0.06]' : 'border-border/50 hover:bg-foreground/[0.03]')}>
                  <opt.icon className={cn('h-5 w-5', mode === opt.v ? 'text-teal' : 'text-muted-foreground')} weight="duotone" />
                  <span className="text-[13.5px] font-semibold text-foreground">{opt.l}</span>
                  <span className="text-[12px] text-muted-foreground">{opt.d}</span>
                </button>
              ))}
            </div>
          </div>

          {/* pesos por tier */}
          <div className={cn('rounded-xl border border-border/40 bg-card p-4 transition-opacity', mode === 'manual' && 'pointer-events-none opacity-50')}>
            <h2 className="mb-1 text-[13px] font-bold uppercase tracking-[0.08em] text-foreground/80">Pesos por tier</h2>
            <p className="mb-3 text-[12.5px] text-muted-foreground">Leads de tier maior recebem prioridade no rodízio.</p>
            <div className="space-y-2.5">
              {TIERS.map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="w-16 shrink-0"><TierPill t={t} /></span>
                  <input type="range" min={0} max={5} step={1} value={weights[t]} onChange={(e) => setWeights((w) => ({ ...w, [t]: Number(e.target.value) }))} className="h-1.5 flex-1 accent-teal" />
                  <span className="w-6 shrink-0 text-right text-[13px] font-semibold tabular-nums text-foreground">{weights[t]}×</span>
                </div>
              ))}
            </div>
          </div>

          {/* toggles */}
          <div className="rounded-xl border border-border/40 bg-card p-2">
            {([
              { on: autoMeta, set: setAutoMeta, icon: Lightning, l: 'Auto-distribuir leads do Meta Ads', d: 'Leads de anúncio entram no rodízio automaticamente' },
              { on: notify, set: setNotify, icon: BellRinging, l: 'Notificar vendedor ao atribuir', d: 'Dispara notificação quando um lead é encaminhado' },
            ] as const).map((row, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-foreground/[0.03]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-foreground/[0.05] text-muted-foreground"><row.icon className="h-4.5 w-4.5" weight="duotone" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-foreground">{row.l}</p>
                  <p className="text-[12px] text-muted-foreground">{row.d}</p>
                </div>
                <button type="button" onClick={() => row.set((v) => !v)} className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', row.on ? 'bg-teal' : 'bg-foreground/[0.15]')}>
                  <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', row.on ? 'left-[18px]' : 'left-0.5')} />
                </button>
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={() => toast.success('Regras de distribuição salvas')} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-[13px] font-bold text-primary-foreground transition hover:brightness-110">
              <Sliders className="h-4 w-4" weight="bold" /> Salvar regras
            </button>
          </div>
        </div>
      )}

      {pickOwner && <PickOwnerModal subtitle={`${selCount} lead${selCount > 1 ? 's' : ''}`} onPick={bulkAssign} onClose={() => setPickOwner(false)} />}
    </div>
  )
}
