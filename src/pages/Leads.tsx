import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ChevronDown, ChevronUp, ChevronsUpDown, Check, X, Plus, MessageCircle, Activity, ArrowRightLeft, Pencil, Trash2, Eye, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatPhone } from '@/lib/format'
import { OWNERS, STAGE_CATALOG, lifecycleOf, type Lead } from '@/lib/funil-data'
import { useLeads } from '@/store/leads'
import { TierPill, StatusDot, StageChip, FollowupCell, LeadAvatar, OwnerTag } from '@/components/leads/LeadBadges'
import { LeadFormModal, LogContactModal, MoveStageModal, ConfirmDeleteModal } from '@/components/leads/LeadModals'
import { MultiFilterDropdown } from '@/components/ui/MultiFilterDropdown'

/* ---------- opções de filtro ---------- */
const TIER_OPTS = [
  { value: 'bronze', label: 'Bronze' }, { value: 'prata', label: 'Prata' },
  { value: 'ouro', label: 'Ouro' }, { value: 'diamante', label: 'Diamante' },
]
const STATUS_OPTS = [
  { value: 'ativo', label: 'Ativo' }, { value: 'frio', label: 'Frio' },
  { value: 'ganho', label: 'Ganho' }, { value: 'perdido', label: 'Perdido' },
]
const STAGE_OPTS = [
  'novo', 'atendimento', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido',
].map((id) => ({ value: id, label: STAGE_CATALOG[id].label }))
const OWNER_OPTS = OWNERS.map((o) => ({ value: o.id, label: o.name }))

const PERIOD_OPTS = [
  { value: '0', label: 'Criados hoje' }, { value: 'week', label: 'Essa semana' },
  { value: '7', label: 'Últimos 7 dias' }, { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' }, { value: 'custom', label: 'Personalizado…' },
]

// ordenação
type SortKey = 'lead' | 'phone' | 'tier' | 'stage' | 'status' | 'owner' | 'entrada' | 'followup'
const TIER_RANK: Record<string, number> = { bronze: 1, prata: 2, ouro: 3, diamante: 4 }
const STAGE_ORDER = ['novo', 'atendimento', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido']
const STATUS_ORDER = ['potencial', 'ativo', 'frio', 'ganho', 'perdido']
const sortValue = (key: SortKey, lead: Lead, status: string, ownerName: string): number | string => {
  switch (key) {
    case 'lead': return lead.name.toLowerCase()
    case 'phone': return lead.phone ?? ''
    case 'tier': return TIER_RANK[lead.tier ?? ''] ?? 0
    case 'stage': return STAGE_ORDER.indexOf(lead.stage)
    case 'status': return STATUS_ORDER.indexOf(status)
    case 'owner': return ownerName.toLowerCase()
    case 'entrada': return lead.entryDaysAgo ?? 99999
    case 'followup': return lead.followupInDays == null ? Infinity : lead.followupInDays
  }
}

// data de entrada (mock relativo → data real dd/MM/aa)
const entryDate = (d?: number) => {
  if (d == null) return '—'
  return new Date(Date.now() - d * 86400000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/* ---------- dropdown de filtro (mesmo padrão do Funil) ---------- */
function FilterDropdown({ value, onChange, options, allLabel }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; allLabel: string
}) {
  const [open, setOpen] = useState(false)
  const active = value !== ''
  const current = options.find((o) => o.value === value)?.label ?? allLabel
  const opts = [{ value: '', label: allLabel }, ...options]
  return (
    <div className="relative">
      <button
        type="button" onClick={() => setOpen((v) => !v)}
        className={cn('flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-colors hover:bg-muted/60', active ? 'font-medium text-teal' : 'text-muted-foreground')}
      >
        {current}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-hidden />
          <div className="dropdown-in absolute left-0 top-full z-50 mt-1.5 max-h-72 w-52 overflow-auto rounded-xl border border-white/10 bg-card p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]">
            {opts.map((o) => {
              const sel = value === o.value
              const isReal = sel && o.value !== ''
              return (
                <button
                  key={o.value || 'all'} type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                  className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors', sel ? 'bg-foreground/[0.06] font-medium' : 'hover:bg-foreground/[0.05]', isReal ? 'text-teal' : 'text-foreground')}
                >
                  <span className="truncate">{o.label}</span>
                  {sel && <Check className={cn('h-3.5 w-3.5 shrink-0', isReal ? 'text-teal' : 'text-muted-foreground')} />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function RowAction({ icon: Icon, label, onClick, tone }: {
  icon: typeof Eye; label: string; onClick: () => void; tone?: 'teal'
}) {
  return (
    <button
      title={label} onClick={(e) => { e.stopPropagation(); onClick() }}
      className={cn('grid h-7 w-6 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted', tone === 'teal' ? 'hover:text-teal' : 'hover:text-foreground')}
    ><Icon className="h-4 w-4" /></button>
  )
}

/* ---------- página ---------- */
export default function Leads() {
  const navigate = useNavigate()
  const { leads, saveLead: storeSave, removeLead: storeRemove, moveStage: storeMove, logContact: storeLog } = useLeads()
  const [q, setQ] = useState('')
  const [fTier, setFTier] = useState<string[]>([])
  const [fStatus, setFStatus] = useState<string[]>([])
  const [fStage, setFStage] = useState<string[]>([])
  const [fOwner, setFOwner] = useState<string[]>([])
  const [fPeriod, setFPeriod] = useState('')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)
  const toggleSort = (key: SortKey) => setSort((s) => s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' })

  // modais CRUD / ações
  const [formOpen, setFormOpen] = useState<{ lead: Lead | null } | null>(null)
  const [logLead, setLogLead] = useState<Lead | null>(null)
  const [moveLead, setMoveLead] = useState<Lead | null>(null)
  const [delLead, setDelLead] = useState<Lead | null>(null)

  const ownerName = (id: string | null) => OWNERS.find((o) => o.id === id)?.name ?? '—'

  // CRUD (via store compartilhado)
  const saveLead = (l: Lead) => {
    const r = storeSave(l); setFormOpen(null)
    toast.success(r === 'updated' ? `Lead "${l.name}" atualizado` : `Lead "${l.name}" criado`)
  }
  const removeLead = (l: Lead) => { storeRemove(l.id); setDelLead(null); toast.success(`Lead "${l.name}" excluído`) }
  const moveStage = (l: Lead, stage: string) => { storeMove(l.id, stage); setMoveLead(null); toast.success(`"${l.name}" → ${STAGE_CATALOG[stage]?.label ?? stage}`) }
  const logContact = (l: Lead, followupInDays: number | null) => { storeLog(l.id, followupInDays); setLogLead(null); toast.success('Contato registrado') }

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const daysSinceMonday = (now.getDay() + 6) % 7 // 0 = segunda
    const createdOf = (l: Lead) => { const d = new Date(startToday); d.setDate(d.getDate() - (l.entryDaysAgo ?? 9999)); return d }
    const fromD = fFrom ? new Date(fFrom + 'T00:00:00') : null
    const toD = fTo ? new Date(fTo + 'T23:59:59') : null
    const out = leads
      .map((l) => ({ lead: l, status: lifecycleOf(l) }))
      .filter(({ lead, status }) => {
        if (term && !(lead.name.toLowerCase().includes(term) || (lead.phone ?? '').includes(term.replace(/\D/g, '')))) return false
        if (fTier.length && !(lead.tier && fTier.includes(lead.tier))) return false
        if (fStatus.length && !fStatus.includes(status)) return false
        if (fStage.length && !fStage.includes(lead.stage)) return false
        if (fOwner.length && !fOwner.includes(lead.ownerId ?? '')) return false
        if (fPeriod === 'custom') {
          const c = createdOf(lead)
          if (fromD && c < fromD) return false
          if (toD && c > toD) return false
        } else if (fPeriod) {
          const days = fPeriod === 'week' ? daysSinceMonday : Number(fPeriod)
          if ((lead.entryDaysAgo ?? 9999) > days) return false
        }
        return true
      })
    if (sort) {
      const dir = sort.dir === 'asc' ? 1 : -1
      out.sort((a, b) => {
        const va = sortValue(sort.key, a.lead, a.status, ownerName(a.lead.ownerId))
        const vb = sortValue(sort.key, b.lead, b.status, ownerName(b.lead.ownerId))
        if (va < vb) return -1 * dir
        if (va > vb) return 1 * dir
        return 0
      })
    }
    return out
  }, [leads, q, fTier, fStatus, fStage, fOwner, fPeriod, fFrom, fTo, sort])

  const hasFilters = !!(q || fTier.length || fStatus.length || fStage.length || fOwner.length || fPeriod)
  const clear = () => { setQ(''); setFTier([]); setFStatus([]); setFStage([]); setFOwner([]); setFPeriod(''); setFFrom(''); setFTo('') }

  const th = (k: SortKey, label: string, extra = '') => (
    <th className={cn('px-2 py-3 font-semibold', extra)}>
      <button onClick={() => toggleSort(k)} className="group/th inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground">
        {label}
        {sort?.key === k
          ? (sort.dir === 'asc' ? <ChevronUp className="h-3 w-3 text-teal" /> : <ChevronDown className="h-3 w-3 text-teal" />)
          : <ChevronsUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover/th:opacity-40" />}
      </button>
    </th>
  )

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      {/* cabeçalho */}
      <div className="flex items-end justify-between gap-4">
        <p className="text-sm text-muted-foreground">Todos os leads da carteira. Priorize por retorno, tier e status.</p>
        <button
          onClick={() => setFormOpen({ lead: null })}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE] px-3.5 py-2 text-[13px] font-bold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(34,211,238,.5)] transition hover:brightness-105"
        >
          <Plus className="h-4 w-4" /> Novo lead
        </button>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1.5">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome ou telefone…"
            className="h-8 w-60 rounded-lg bg-transparent pl-8 pr-3 text-[13px] outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <span className="mx-1 h-5 w-px bg-border" />
        <MultiFilterDropdown values={fTier} onChange={setFTier} options={TIER_OPTS} allLabel="Todos tiers" />
        <MultiFilterDropdown values={fStatus} onChange={setFStatus} options={STATUS_OPTS} allLabel="Todos status" />
        <MultiFilterDropdown values={fStage} onChange={setFStage} options={STAGE_OPTS} allLabel="Todas etapas" />
        <MultiFilterDropdown values={fOwner} onChange={setFOwner} options={OWNER_OPTS} allLabel="Todos responsáveis" />
        <FilterDropdown value={fPeriod} onChange={setFPeriod} options={PERIOD_OPTS} allLabel="Todo período" />
        {fPeriod === 'custom' && (
          <div className="flex items-center gap-1.5 pl-1">
            <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} style={{ colorScheme: 'dark' }} className="h-8 rounded-lg border border-border bg-background px-2 text-[12.5px] text-foreground outline-none focus:border-teal" />
            <span className="text-xs text-muted-foreground">até</span>
            <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} style={{ colorScheme: 'dark' }} className="h-8 rounded-lg border border-border bg-background px-2 text-[12.5px] text-foreground outline-none focus:border-teal" />
          </div>
        )}
        {hasFilters && (
          <button onClick={clear} className="ml-1 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
            <X className="h-3.5 w-3.5" /> Limpar
          </button>
        )}
        <span className="ml-auto pr-2 text-[13px] tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{rows.length}</span> {rows.length === 1 ? 'lead' : 'leads'}
        </span>
      </div>

      {/* tabela */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-auto border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/25 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {th('lead', 'Lead')}
                {th('phone', 'Telefone')}
                {th('tier', 'Tier')}
                {th('stage', 'Etapa')}
                {th('status', 'Status')}
                {th('owner', 'Responsável')}
                {th('entrada', 'Entrada')}
                {th('followup', 'Próx. retorno')}
                <th className="px-2 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-10 w-10 text-muted-foreground/25" />
                      <p className="text-sm">Nenhum lead com esses filtros.</p>
                    </div>
                  </td>
                </tr>
              ) : rows.map(({ lead, status }) => (
                <tr key={lead.id} onClick={() => navigate(`/app/leads/${lead.id}`)} className="group cursor-pointer transition-colors hover:bg-foreground/[0.025]">
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-3">
                      <LeadAvatar lead={lead} />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-foreground">{lead.name}</p>
                        <p className="truncate text-[11.5px] text-muted-foreground">
                          {lead.operadora !== '—' ? lead.operadora : 'Sem operadora'} · {lead.vidas} {lead.vidas === 1 ? 'vida' : 'vidas'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-mono text-[12.5px] text-muted-foreground">{lead.phone ? formatPhone(lead.phone) : '—'}</td>
                  <td className="px-2 py-2.5"><TierPill t={lead.tier} /></td>
                  <td className="px-2 py-2.5"><StageChip id={lead.stage} /></td>
                  <td className="whitespace-nowrap px-2 py-2.5"><StatusDot s={status} /></td>
                  <td className="whitespace-nowrap px-2 py-2.5"><OwnerTag id={lead.ownerId} /></td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-mono text-[12.5px] tabular-nums text-muted-foreground">{entryDate(lead.entryDaysAgo)}</td>
                  <td className="px-2 py-2.5"><FollowupCell days={lead.followupInDays} /></td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center justify-end gap-0 opacity-70 transition-opacity group-hover:opacity-100">
                      <RowAction icon={MessageCircle} label="Conversar" tone="teal" onClick={() => navigate('/app/chat')} />
                      <RowAction icon={Activity} label="Registrar contato" onClick={() => setLogLead(lead)} />
                      <RowAction icon={ArrowRightLeft} label="Mover etapa" onClick={() => setMoveLead(lead)} />
                      <RowAction icon={Pencil} label="Editar" onClick={() => setFormOpen({ lead })} />
                      <RowAction icon={Trash2} label="Excluir" onClick={() => setDelLead(lead)} />
                      <RowAction icon={Eye} label="Ver lead" onClick={() => navigate(`/app/leads/${lead.id}`)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* modais CRUD / ações */}
      {formOpen && <LeadFormModal initial={formOpen.lead} onClose={() => setFormOpen(null)} onSave={saveLead} />}
      {logLead && <LogContactModal lead={logLead} onClose={() => setLogLead(null)} onSave={(d) => logContact(logLead, d)} />}
      {moveLead && <MoveStageModal lead={moveLead} onClose={() => setMoveLead(null)} onMove={(s) => moveStage(moveLead, s)} />}
      {delLead && <ConfirmDeleteModal lead={delLead} onClose={() => setDelLead(null)} onConfirm={() => removeLead(delLead)} />}
    </div>
  )
}
