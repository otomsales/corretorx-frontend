import { useMemo, useRef, useState, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, PointerSensor,
  closestCorners, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CalendarPlus, ChevronDown, ChevronUp, MessageCircle, PencilLine, TrendingUp, Plus,
  SlidersHorizontal, Trash2, Check, X, GitBranch, Clock, Zap, MapPin, Calendar, Briefcase,
  Layers, Wallet, Target, Ticket, Search, ArrowRightLeft, Tag, UserRound, Eye, type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { brl, pct, initials } from '@/lib/format'
import { FUNIL_LEADS, OWNERS, LOSS_REASONS, type Lead } from '@/lib/funil-data'
import { MultiFilterDropdown } from '@/components/ui/MultiFilterDropdown'
import {
  useContextMenu, ContextMenu, SelectionToolbar, Checkbox,
  PickStageModal, PickOwnerModal, PickPipelineModal, AddTagModal, BulkDeleteModal, type MenuItem,
} from '@/components/leads/Bulk'

type Kind = 'open' | 'won' | 'lost'
interface Stage { id: string; label: string; color: string; kind: Kind }
interface Pipeline { id: string; name: string; stages: Stage[] }
interface MoveCtx {
  stages: Stage[]
  pipelines: Pipeline[]
  currentId: string
  onMoveStage: (leadId: string, to: string) => void
  onMovePipeline: (leadId: string, pid: string) => void
}

type SelCtxType = { selected: Set<string>; toggle: (id: string) => void; selectMany: (ids: string[], on: boolean) => void; onCtx: (e: React.MouseEvent, lead: Lead) => void }
const SelCtx = createContext<SelCtxType | null>(null)

const COMERCIAL_STAGES: Stage[] = [
  { id: 'novo', label: 'Novo', color: 'hsl(var(--stage-1))', kind: 'open' },
  { id: 'atendimento', label: 'Em atendimento', color: 'hsl(var(--stage-2))', kind: 'open' },
  { id: 'qualificado', label: 'Qualificado', color: 'hsl(var(--stage-3))', kind: 'open' },
  { id: 'proposta', label: 'Proposta', color: 'hsl(var(--stage-4))', kind: 'open' },
  { id: 'negociacao', label: 'Negociação', color: 'hsl(var(--stage-5))', kind: 'open' },
  { id: 'ganho', label: 'Ganho', color: 'hsl(var(--stage-6))', kind: 'won' },
  { id: 'perdido', label: 'Perdido', color: 'hsl(var(--stage-7))', kind: 'lost' },
]

const IA_STAGES: Stage[] = [
  { id: 'ia-novo', label: 'Novo lead', color: 'hsl(var(--stage-1))', kind: 'open' },
  { id: 'ia-qualif', label: 'Qualificando', color: 'hsl(var(--stage-2))', kind: 'open' },
  { id: 'ia-agendou', label: 'Agendou', color: 'hsl(var(--stage-4))', kind: 'open' },
  { id: 'ia-ok', label: 'Qualificado', color: 'hsl(var(--stage-6))', kind: 'won' },
  { id: 'ia-descartado', label: 'Descartado', color: 'hsl(var(--stage-7))', kind: 'lost' },
]

const INITIAL_PIPELINES: Pipeline[] = [
  { id: 'p-comercial', name: 'Comercial', stages: COMERCIAL_STAGES },
  { id: 'p-ia', name: 'Atendimento IA', stages: IA_STAGES },
]

const IA_LEADS: Lead[] = [
  { id: 'ia1', name: 'Lead Meta · Camila R.', phone: '11988112233', operadora: '—', plano: 'A qualificar', vidas: 4, value: 0, source: 'Meta Ads', ownerId: 'u1', stage: 'ia-novo', lossReason: null, pipelineId: 'p-ia', tier: 'prata', city: 'São Paulo, SP', slaMinutes: 4, entryDaysAgo: 0, noContactHours: 5, avatarUrl: 'https://i.pravatar.cc/100?img=20' },
  { id: 'ia2', name: 'Lead Meta · João P.', phone: '11977223344', operadora: '—', plano: 'A qualificar', vidas: 1, value: 0, source: 'Meta Ads', ownerId: 'u2', stage: 'ia-novo', lossReason: null, pipelineId: 'p-ia', tier: 'bronze', city: 'Osasco, SP', slaMinutes: 35, entryDaysAgo: 1, noContactHours: 30 },
  { id: 'ia3', name: 'Lead Site · Ateliê Bella', phone: '11966334455', operadora: '—', plano: 'PME (interesse)', vidas: 8, value: 0, source: 'Site', ownerId: 'u3', stage: 'ia-qualif', lossReason: null, pipelineId: 'p-ia', tier: 'ouro', city: 'Rio de Janeiro, RJ', tags: ['PME'], entryDaysAgo: 2, cnpj: true, noContactHours: 10, avatarUrl: 'https://i.pravatar.cc/100?img=40' },
  { id: 'ia4', name: 'Lead Meta · Sr. Antônio', phone: '11955445566', operadora: '—', plano: 'Individual', vidas: 2, value: 0, source: 'Meta Ads', ownerId: 'u4', stage: 'ia-agendou', lossReason: null, pipelineId: 'p-ia', tier: 'prata', city: 'Guarulhos, SP', tags: ['Agendou'], entryDaysAgo: 3, noContactHours: 1 },
]

const PALETTE = [
  'hsl(var(--stage-1))', 'hsl(var(--stage-2))', 'hsl(var(--stage-3))', 'hsl(var(--stage-4))',
  'hsl(var(--stage-5))', 'hsl(var(--stage-6))', 'hsl(var(--stage-7))',
  'hsl(280 72% 62%)', 'hsl(322 72% 58%)', 'hsl(24 85% 56%)',
]

const makeDefaultStages = (pid: string): Stage[] => [
  { id: `${pid}-s1`, label: 'Novo', color: 'hsl(var(--stage-1))', kind: 'open' },
  { id: `${pid}-s2`, label: 'Em contato', color: 'hsl(var(--stage-2))', kind: 'open' },
  { id: `${pid}-s3`, label: 'Proposta', color: 'hsl(var(--stage-4))', kind: 'open' },
  { id: `${pid}-won`, label: 'Ganho', color: 'hsl(var(--stage-6))', kind: 'won' },
  { id: `${pid}-lost`, label: 'Perdido', color: 'hsl(var(--stage-7))', kind: 'lost' },
]

const sumValues = (leads: Lead[]) => leads.reduce((a, l) => a + (l.value ?? 0), 0)

interface PendingLoss { lead: Lead; overId: string | null; snapshot: Lead[] }

export default function Funil() {
  const [pipelines, setPipelines] = useState<Pipeline[]>(INITIAL_PIPELINES)
  const [pipelineId, setPipelineId] = useState(INITIAL_PIPELINES[0].id)
  const [leads, setLeads] = useState<Lead[]>([...FUNIL_LEADS, ...IA_LEADS])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingLoss, setPendingLoss] = useState<PendingLoss | null>(null)
  const [reportOpen, setReportOpen] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)

  const current = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0]
  const stages = current.stages
  const boardLeads = useMemo(
    () => leads.filter((l) => (l.pipelineId ?? INITIAL_PIPELINES[0].id) === current.id),
    [leads, current.id],
  )

  // Filtros (aplicados antes de byStage/métricas)
  const [q, setQ] = useState('')
  const [fOwner, setFOwner] = useState<string[]>([])
  const [fSource, setFSource] = useState<string[]>([])
  const [fTier, setFTier] = useState<string[]>([])
  const [fPeriod, setFPeriod] = useState('')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const anyFilter = !!(q || fOwner.length || fSource.length || fTier.length || fPeriod)
  const clearFilters = () => { setQ(''); setFOwner([]); setFSource([]); setFTier([]); setFPeriod(''); setFFrom(''); setFTo('') }
  const sources = useMemo(() => [...new Set(boardLeads.map((l) => l.source).filter(Boolean))] as string[], [boardLeads])
  const filtered = useMemo(() => {
    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const daysSinceMonday = (now.getDay() + 6) % 7 // 0 = segunda
    const createdOf = (l: Lead) => {
      const d = new Date(startToday); d.setDate(d.getDate() - (l.entryDaysAgo ?? 9999)); return d
    }
    const fromD = fFrom ? new Date(fFrom + 'T00:00:00') : null
    const toD = fTo ? new Date(fTo + 'T23:59:59') : null
    return boardLeads.filter((l) => {
      if (q) { const s = q.toLowerCase(); if (!l.name.toLowerCase().includes(s) && !l.operadora.toLowerCase().includes(s)) return false }
      if (fOwner.length && !fOwner.includes(l.ownerId ?? '')) return false
      if (fSource.length && !fSource.includes(l.source ?? '')) return false
      if (fTier.length && !(l.tier && fTier.includes(l.tier))) return false
      if (fPeriod === 'custom') {
        const c = createdOf(l)
        if (fromD && c < fromD) return false
        if (toD && c > toD) return false
      } else if (fPeriod) {
        const days = fPeriod === 'week' ? daysSinceMonday : Number(fPeriod)
        if ((l.entryDaysAgo ?? 9999) > days) return false
      }
      return true
    })
  }, [boardLeads, q, fOwner, fSource, fTier, fPeriod, fFrom, fTo])

  const stageColor = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s.color])), [stages])
  const stageLabel = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s.label])), [stages])
  const stageIds = useMemo(() => new Set(stages.map((s) => s.id)), [stages])
  const lostId = stages.find((s) => s.kind === 'lost')?.id ?? null
  const wonId = stages.find((s) => s.kind === 'won')?.id ?? null
  const firstOpenId = stages.find((s) => s.kind === 'open')?.id ?? stages[0]?.id

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const byStage = useMemo(() => {
    const map = new Map<string, Lead[]>()
    for (const s of stages) map.set(s.id, [])
    for (const l of filtered) (map.get(l.stage) ?? map.get(firstOpenId!)!)?.push(l)
    return map
  }, [filtered, stages, firstOpenId])

  const metrics = useMemo(() => {
    const openStages = stages.filter((s) => s.kind === 'open')
    const probOf = (s: Stage) =>
      s.kind === 'won' ? 1 : s.kind === 'lost' ? 0 : (openStages.findIndex((o) => o.id === s.id) + 1) / (openStages.length + 1)
    const open = filtered.filter((l) => openStages.some((s) => s.id === l.stage))
    const won = filtered.filter((l) => l.stage === wonId)
    const active = stages.filter((s) => s.kind !== 'lost')
    const countAt = (id: string) => filtered.filter((l) => l.stage === id).length
    const funnel = active.map((s, i) => ({ ...s, reached: active.slice(i).reduce((a, x) => a + countAt(x.id), 0) }))
    const base = funnel[0]?.reached ?? 0
    const conversion = base > 0 ? (funnel[funnel.length - 1].reached / base) * 100 : 0
    const forecast = filtered.reduce((a, l) => {
      const s = stages.find((x) => x.id === l.stage)
      return a + (l.value ?? 0) * (s ? probOf(s) : 0)
    }, 0)
    return {
      funnel, base, conversion, forecast,
      funnelTotal: sumValues(open), openCount: open.length,
      ticket: won.length > 0 ? sumValues(won) / won.length : 0,
    }
  }, [filtered, stages, wonId])

  const activeLead = activeId ? (leads.find((l) => l.id === activeId) ?? null) : null
  const stageOf = (id: string): string | null =>
    stageIds.has(id) ? id : (leads.find((l) => l.id === id)?.stage ?? null)

  const reorderWithin = (stage: string, activeLeadId: string, overLeadId: string) => {
    setLeads((prev) => {
      const positions: number[] = []
      prev.forEach((l, i) => { if (l.stage === stage) positions.push(i) })
      const column = positions.map((i) => prev[i])
      const oldIndex = column.findIndex((l) => l.id === activeLeadId)
      const newIndex = column.findIndex((l) => l.id === overLeadId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev
      const reordered = arrayMove(column, oldIndex, newIndex)
      const next = [...prev]
      positions.forEach((pos, k) => { next[pos] = reordered[k] })
      return next
    })
  }

  const commitMove = (leadId: string, to: string, overId: string | null, lossReason: string | null) => {
    setLeads((prev) => {
      const current = prev.find((l) => l.id === leadId)
      if (!current) return prev
      const moved: Lead = { ...current, stage: to, lossReason: to === lostId ? lossReason : null }
      const without = prev.filter((l) => l.id !== leadId)
      const anchor = overId && overId !== leadId ? without.findIndex((l) => l.id === overId) : -1
      if (anchor >= 0) { const next = [...without]; next.splice(anchor, 0, moved); return next }
      return [...without, moved]
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const activeLeadId = String(active.id)
    const overId = String(over.id)
    if (activeLeadId === overId) return
    const from = stageOf(activeLeadId)
    const to = stageOf(overId)
    if (!from || !to) return
    const lead = leads.find((l) => l.id === activeLeadId)
    if (!lead) return
    if (from === to) { if (!stageIds.has(overId)) reorderWithin(from, activeLeadId, overId); return }
    if (to === lostId) { setPendingLoss({ lead, overId: stageIds.has(overId) ? null : overId, snapshot: leads }); return }
    const snapshot = leads
    commitMove(activeLeadId, to, stageIds.has(overId) ? null : overId, null)
    const msg = `${lead.name} → ${stageLabel[to]}`
    const opts = { action: { label: 'Desfazer', onClick: () => setLeads(snapshot) } }
    if (to === wonId) toast.success(msg, opts); else toast(msg, opts)
  }

  const confirmLoss = (reason: string) => {
    if (!pendingLoss) return
    const { lead, overId, snapshot } = pendingLoss
    commitMove(lead.id, lostId!, overId, reason)
    setPendingLoss(null)
    toast(`${lead.name} → Perdido`, { description: reason, action: { label: 'Desfazer', onClick: () => setLeads(snapshot) } })
  }

  const moveLeadToStage = (leadId: string, to: string) => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.stage === to) return
    if (to === lostId) { setPendingLoss({ lead, overId: null, snapshot: leads }); return }
    const snapshot = leads
    commitMove(leadId, to, null, null)
    const msg = `${lead.name} → ${stageLabel[to]}`
    const opts = { action: { label: 'Desfazer', onClick: () => setLeads(snapshot) } }
    if (to === wonId) toast.success(msg, opts); else toast(msg, opts)
  }

  const moveLeadToPipeline = (leadId: string, pid: string) => {
    const target = pipelines.find((p) => p.id === pid)
    const lead = leads.find((l) => l.id === leadId)
    if (!target || !lead) return
    const firstOpen = target.stages.find((s) => s.kind === 'open')?.id ?? target.stages[0]?.id
    const snapshot = leads
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, pipelineId: pid, stage: firstOpen!, lossReason: null } : l)))
    toast.success(`${lead.name} → funil "${target.name}"`, { action: { label: 'Desfazer', onClick: () => setLeads(snapshot) } })
  }

  const move: MoveCtx = { stages, pipelines, currentId: current.id, onMoveStage: moveLeadToStage, onMovePipeline: moveLeadToPipeline }

  // seleção múltipla + ações em massa + menu de contexto
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulk, setBulk] = useState<null | 'stage' | 'owner' | 'tag' | 'pipeline' | 'delete'>(null)
  const [target, setTarget] = useState<string[]>([])
  const { menu, open: openMenu, close: closeMenu } = useContextMenu()
  const toggleSel = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectMany = (ids: string[], on: boolean) => setSelected((p) => { const n = new Set(p); ids.forEach((id) => on ? n.add(id) : n.delete(id)); return n })
  const clearSel = () => setSelected(new Set())
  const openBulk = (kind: typeof bulk, ids: string[]) => { setTarget(ids); setBulk(kind) }
  const doneBulk = (msg: string) => { setBulk(null); clearSel(); toast.success(msg) }
  const bulkStage = (stage: string) => { setLeads((prev) => prev.map((l) => (target.includes(l.id) ? { ...l, stage } : l))); doneBulk(`Etapa alterada (${target.length})`) }
  const bulkOwner = (ownerId: string) => { setLeads((prev) => prev.map((l) => (target.includes(l.id) ? { ...l, ownerId } : l))); doneBulk(`Responsável alterado (${target.length})`) }
  const bulkTag = (tag: string) => { setLeads((prev) => prev.map((l) => (target.includes(l.id) && !(l.tags ?? []).includes(tag) ? { ...l, tags: [...(l.tags ?? []), tag] } : l))); doneBulk(`Etiqueta "${tag}" aplicada (${target.length})`) }
  const bulkPipeline = (pid: string) => { const p = pipelines.find((x) => x.id === pid); const first = p?.stages.find((s) => s.kind === 'open')?.id ?? p?.stages[0]?.id; setLeads((prev) => prev.map((l) => (target.includes(l.id) ? { ...l, pipelineId: pid, stage: first ?? l.stage } : l))); doneBulk(`Funil alterado (${target.length})`) }
  const bulkDelete = () => { const n = target.length; setLeads((prev) => prev.filter((l) => !target.includes(l.id))); doneBulk(`${n} excluído${n > 1 ? 's' : ''}`) }
  const allTags = useMemo(() => [...new Set(leads.flatMap((l) => l.tags ?? []))], [leads])
  const boardIds = filtered.map((l) => l.id)
  const selCount = boardIds.filter((id) => selected.has(id)).length
  const allSelected = boardIds.length > 0 && selCount === boardIds.length
  const selectAll = () => setSelected(new Set(boardIds))
  const cardMenu = (lead: Lead): MenuItem[] => [
    { label: 'Conversar', icon: MessageCircle, onClick: () => navigate('/app/chat') },
    { label: 'Ver detalhe', icon: Eye, onClick: () => navigate(`/app/leads/${lead.id}`) },
    { divider: true, label: '' },
    { label: 'Mudar etapa', icon: ArrowRightLeft, onClick: () => openBulk('stage', [lead.id]) },
    { label: 'Mudar funil', icon: GitBranch, onClick: () => openBulk('pipeline', [lead.id]) },
    { label: 'Etiquetar', icon: Tag, onClick: () => openBulk('tag', [lead.id]) },
    { label: 'Responsável', icon: UserRound, onClick: () => openBulk('owner', [lead.id]) },
    { divider: true, label: '' },
    { label: 'Excluir', icon: Trash2, danger: true, onClick: () => openBulk('delete', [lead.id]) },
  ]
  const selValue: SelCtxType = { selected, toggle: toggleSel, selectMany, onCtx: (e, lead) => openMenu(e, cardMenu(lead)) }

  const createLead = (d: Partial<Lead> & { name: string }) => {
    const newLead: Lead = {
      id: `lead-${Date.now()}`, name: d.name, phone: d.phone ?? null,
      operadora: d.operadora || '—', plano: d.plano || '—', vidas: d.vidas ?? 1, value: d.value ?? 0,
      source: d.source ?? null, ownerId: d.ownerId ?? null, stage: firstOpenId!, lossReason: null,
      pipelineId: current.id, tier: d.tier, city: d.city, cnpj: d.cnpj, tags: [],
      entryDaysAgo: 0, slaMinutes: 0, noContactHours: 0,
    }
    setLeads((prev) => [newLead, ...prev])
    setNewOpen(false)
    toast.success(`Lead "${d.name}" criado`)
  }

  const applyEdit = (name: string, nextStages: Stage[]) => {
    const ids = new Set(nextStages.map((s) => s.id))
    const fallback = nextStages.find((s) => s.kind === 'open')?.id ?? nextStages[0]?.id
    setLeads((prev) => prev.map((l) =>
      (l.pipelineId ?? INITIAL_PIPELINES[0].id) === current.id && !ids.has(l.stage)
        ? { ...l, stage: fallback } : l))
    setPipelines((prev) => prev.map((p) => (p.id === current.id ? { ...p, name, stages: nextStages } : p)))
    setEditOpen(false)
    toast.success('Funil atualizado')
  }

  const createPipeline = (name: string) => {
    const id = `p-${Date.now()}`
    setPipelines((prev) => [...prev, { id, name, stages: makeDefaultStages(id) }])
    setPipelineId(id)
    setCreateOpen(false)
    toast.success(`Funil "${name}" criado`)
  }

  const deletePipeline = () => {
    if (pipelines.length <= 1) return
    const removed = current.id
    const rest = pipelines.filter((p) => p.id !== removed)
    setLeads((prev) => prev.filter((l) => (l.pipelineId ?? INITIAL_PIPELINES[0].id) !== removed))
    setPipelines(rest)
    setPipelineId(rest[0].id)
    setEditOpen(false)
    toast(`Funil "${current.name}" excluído`)
  }

  return (
    <SelCtx.Provider value={selValue}>
    <div className="flex h-full flex-col gap-4 p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-xl font-bold tracking-tight transition-colors hover:text-teal"
            >
              <GitBranch className="h-5 w-5 text-teal" />
              {current.name}
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', menuOpen && 'rotate-180')} />
            </button>
            {menuOpen && (
              <>
                <button className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} aria-hidden />
                <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-white/10 bg-card p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Funis</p>
                  {pipelines.map((p) => {
                    const count = leads.filter((l) => (l.pipelineId ?? INITIAL_PIPELINES[0].id) === p.id).length
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setPipelineId(p.id); setMenuOpen(false) }}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
                          p.id === current.id ? 'bg-foreground/[0.06] font-semibold' : 'hover:bg-foreground/[0.04]',
                        )}
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">{count}</span>
                          {p.id === current.id && <Check className="h-3.5 w-3.5 text-teal" />}
                        </span>
                      </button>
                    )
                  })}
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={() => { setMenuOpen(false); setCreateOpen(true) }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-teal transition-colors hover:bg-teal/[0.08]"
                  >
                    <Plus className="h-4 w-4" /> Criar funil
                  </button>
                </div>
              </>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">Arraste os cards entre as etapas. Marcar como perdido exige o motivo.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <SlidersHorizontal className="h-4 w-4" /> Editar funil
          </button>
          <button
            onClick={() => setReportOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            {reportOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {reportOpen ? 'Ocultar relatório' : 'Mostrar relatório'}
          </button>
          <div className="relative">
            <button
              onClick={() => setNewOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE] px-3.5 py-2 text-[13px] font-bold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(34,211,238,.5)] transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" /> Novo lead
            </button>
            {newOpen && <QuickAddLead pipelineName={current.name} onCancel={() => setNewOpen(false)} onCreate={createLead} />}
          </div>
        </div>
      </div>

      {/* Filtros — toolbar única */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1.5">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar lead ou operadora…"
            className="h-8 w-56 rounded-lg bg-transparent pl-8 pr-2 text-[13px] outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <MultiFilterDropdown values={fOwner} onChange={setFOwner} allLabel="Todos vendedores" options={OWNERS.map((o) => ({ value: o.id, label: o.name }))} />
        <MultiFilterDropdown values={fSource} onChange={setFSource} allLabel="Todas origens" options={sources.map((s) => ({ value: s, label: s }))} />
        <MultiFilterDropdown values={fTier} onChange={setFTier} allLabel="Todos tiers" options={TIER_OPTS} />
        <FilterDropdown value={fPeriod} onChange={setFPeriod} allLabel="Todo período" options={PERIOD_OPTS} />
        {fPeriod === 'custom' && (
          <div className="flex items-center gap-1.5 pl-1">
            <input
              type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="h-8 rounded-lg border border-border bg-background px-2 text-[12.5px] text-foreground outline-none focus:border-teal"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <input
              type="date" value={fTo} onChange={(e) => setFTo(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="h-8 rounded-lg border border-border bg-background px-2 text-[12.5px] text-foreground outline-none focus:border-teal"
            />
          </div>
        )}
        {anyFilter && (
          <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-danger">
            <X className="h-3.5 w-3.5" /> Limpar
          </button>
        )}
        <span className="ml-auto pr-1.5 text-[12px] tabular-nums text-muted-foreground">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {reportOpen && (
        <div className="grid shrink-0 gap-2.5 lg:grid-cols-[220px_1fr]">
          <div className="flex flex-col gap-2">
            <MiniKpi label="Leads" value={String(metrics.openCount)} icon={Layers} />
            <MiniKpi label="Conversão" value={pct(metrics.conversion, 0)} icon={Target} />
            <MiniKpi label="Valor" value={brl(metrics.funnelTotal)} icon={Wallet} />
            <MiniKpi label="Ticket" value={brl(metrics.ticket)} icon={Ticket} />
            <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-3.5 py-2.5">
              <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#2DD4BF] to-[#22D3EE]" aria-hidden />
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal/15 text-teal">
                <TrendingUp className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Previsão ponderada</div>
                <div className="mt-0.5 truncate font-mono text-[17px] font-bold leading-none tabular-nums text-teal">{brl(metrics.forecast)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Funil de conversão</span>
              <span className="text-xs text-muted-foreground">
                conversão total <span className="font-semibold text-foreground">{pct(metrics.conversion, 0)}</span>
              </span>
            </div>
            <div className="flex flex-col">
              {metrics.funnel.map((s, i) => {
                const width = metrics.base > 0 ? (s.reached / metrics.base) * 100 : 0
                const prev = metrics.funnel[i - 1]?.reached ?? 0
                const step = i > 0 && prev > 0 ? Math.round((s.reached / prev) * 100) : null
                return (
                  <div key={s.id}>
                    {i > 0 && (
                      <div className="flex items-center justify-center py-px">
                        <span className="inline-flex items-center gap-0.5 rounded-full px-1 text-[9px] font-semibold leading-none text-muted-foreground/80">
                          <ChevronDown className="h-2.5 w-2.5" />{step}%
                        </span>
                      </div>
                    )}
                    <div
                      className="mx-auto flex h-[24px] items-center justify-between rounded-md pl-2.5 pr-1 text-[11px] text-white"
                      style={{ width: `${Math.max(width, 24)}%`, background: `color-mix(in srgb, ${s.color}, #0b1220 14%)` }}
                      title={`${s.reached} alcançaram ${s.label}`}
                    >
                      <span className="truncate font-semibold" style={{ textShadow: '0 1px 1px rgba(4,20,30,.4)' }}>{s.label}</span>
                      <span
                        className="grid h-4 min-w-[18px] shrink-0 place-items-center rounded px-1 text-[10px] font-bold tabular-nums"
                        style={{ background: `color-mix(in srgb, ${s.color}, #0b1220 38%)` }}
                      >{s.reached}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {selCount > 0 && (
        <SelectionToolbar
          count={selCount} total={boardIds.length} allSelected={allSelected} onSelectAll={selectAll} onClear={clearSel} hideSelectAll
          actions={[
            { label: 'Mover etapa', icon: ArrowRightLeft, onClick: () => openBulk('stage', [...selected]) },
            { label: 'Etiquetar', icon: Tag, onClick: () => openBulk('tag', [...selected]) },
            { label: 'Responsável', icon: UserRound, onClick: () => openBulk('owner', [...selected]) },
            { label: 'Mudar funil', icon: GitBranch, onClick: () => openBulk('pipeline', [...selected]) },
            { label: 'Excluir', icon: Trash2, danger: true, onClick: () => openBulk('delete', [...selected]) },
          ]}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        autoScroll={{ threshold: { x: 0.2, y: 0.25 }, acceleration: 14 }}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1">
          {stages.map((stage) => (
            <StageColumn key={stage.id} stage={stage} leads={byStage.get(stage.id) ?? []} draggingId={activeId} stageColor={stageColor} move={move} />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
          {activeLead ? <LeadCardBody lead={activeLead} stageColor={stageColor} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {pendingLoss && (
        <LossReasonModal lead={pendingLoss.lead} onCancel={() => setPendingLoss(null)} onConfirm={confirmLoss} />
      )}
      {editOpen && (
        <FunilEditor
          pipeline={current} canDelete={pipelines.length > 1}
          onCancel={() => setEditOpen(false)} onSave={applyEdit} onDelete={deletePipeline}
        />
      )}
      {createOpen && <NewPipelineModal onCancel={() => setCreateOpen(false)} onCreate={createPipeline} />}

      {/* ações em massa / botão direito */}
      {bulk === 'stage' && <PickStageModal subtitle={`${target.length} lead${target.length > 1 ? 's' : ''}`} onPick={bulkStage} onClose={() => setBulk(null)} />}
      {bulk === 'owner' && <PickOwnerModal subtitle={`${target.length} lead${target.length > 1 ? 's' : ''}`} onPick={bulkOwner} onClose={() => setBulk(null)} />}
      {bulk === 'pipeline' && <PickPipelineModal subtitle={`${target.length} lead${target.length > 1 ? 's' : ''}`} pipelines={pipelines} onPick={bulkPipeline} onClose={() => setBulk(null)} />}
      {bulk === 'tag' && <AddTagModal subtitle={`${target.length} lead${target.length > 1 ? 's' : ''}`} suggestions={allTags} onApply={bulkTag} onClose={() => setBulk(null)} />}
      {bulk === 'delete' && <BulkDeleteModal count={target.length} onConfirm={bulkDelete} onClose={() => setBulk(null)} />}
      <ContextMenu menu={menu} onClose={closeMenu} />
    </div>
    </SelCtx.Provider>
  )
}

const TIER_OPTS = [
  { value: 'bronze', label: 'Bronze' }, { value: 'prata', label: 'Prata' },
  { value: 'ouro', label: 'Ouro' }, { value: 'diamante', label: 'Diamante' },
]
const PERIOD_OPTS = [
  { value: '0', label: 'Criados hoje' }, { value: 'week', label: 'Essa semana' },
  { value: '7', label: 'Últimos 7 dias' }, { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' }, { value: 'custom', label: 'Personalizado…' },
]

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
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-colors hover:bg-muted/60',
          active ? 'font-medium text-teal' : 'text-muted-foreground',
        )}
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
              const isReal = sel && o.value !== '' // teal só p/ filtro real (não p/ "Todos")
              return (
                <button
                  key={o.value || 'all'} type="button"
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors',
                    sel ? 'bg-foreground/[0.06] font-medium' : 'hover:bg-foreground/[0.05]',
                    isReal ? 'text-teal' : 'text-foreground',
                  )}
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

function MiniKpi({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
      <span className="flex items-center gap-2 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        {label}
      </span>
      <span className="shrink-0 font-mono text-[15px] font-bold tabular-nums">{value}</span>
    </div>
  )
}

function StageColumn({ stage, leads, draggingId, stageColor, move }: {
  stage: Stage; leads: Lead[]; draggingId: string | null; stageColor: Record<string, string>; move: MoveCtx
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const ids = leads.map((l) => l.id)
  const sel = useContext(SelCtx)
  const stageOn = ids.filter((id) => sel?.selected.has(id)).length
  const allOn = ids.length > 0 && stageOn === ids.length
  const someOn = stageOn > 0
  const anySel = (sel?.selected.size ?? 0) > 0
  return (
    <section className="group/col flex w-[300px] min-w-[288px] shrink-0 flex-col rounded-2xl border border-border bg-muted/25">
      <header className="relative shrink-0 px-3 pt-3.5">
        {sel && ids.length > 0 && (
          <div className={cn('absolute left-3 top-3 transition-opacity', someOn || anySel ? 'opacity-100' : 'opacity-0 group-hover/col:opacity-100')} title="Selecionar etapa">
            <Checkbox checked={allOn} indeterminate={someOn && !allOn} onChange={() => sel.selectMany(ids, !allOn)} />
          </div>
        )}
        <h2 className="text-center text-[12px] font-bold uppercase tracking-[0.08em] text-foreground">{stage.label}</h2>
        <div className="mt-2 h-[2.5px] w-full rounded-full" style={{ background: stage.color }} aria-hidden />
        <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{leads.length}</span> {leads.length === 1 ? 'lead' : 'leads'}
          <span className="mx-1 opacity-40">·</span>
          <span className="font-mono tabular-nums">{brl(sumValues(leads))}</span>
        </p>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          'col-scroll m-1.5 flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto rounded-xl p-1.5 transition-colors',
          isOver && 'bg-teal/[0.06] ring-2 ring-teal/30',
        )}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => <SortableLeadCard key={lead.id} lead={lead} dragging={draggingId === lead.id} stageColor={stageColor} move={move} />)}
        </SortableContext>
        {leads.length === 0 && (
          <p className="flex flex-1 items-center justify-center px-3 text-center text-xs text-muted-foreground">Arraste um lead para cá</p>
        )}
      </div>
    </section>
  )
}

function SortableLeadCard({ lead, dragging, stageColor, move }: { lead: Lead; dragging: boolean; stageColor: Record<string, string>; move: MoveCtx }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lead.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes} {...listeners}
      className={cn('cursor-grab rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal active:cursor-grabbing', dragging && 'opacity-40')}
    >
      <LeadCardBody lead={lead} stageColor={stageColor} interactive move={move} />
    </div>
  )
}

function IconAction({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <button
      type="button" title={title}
      onClick={(e) => { e.stopPropagation(); toast(`${title} — em breve`) }}
      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >{children}</button>
  )
}

const TIER: Record<NonNullable<Lead['tier']>, { label: string; cls: string }> = {
  bronze: { label: 'Bronze', cls: 'bg-amber-700 text-white' },
  prata: { label: 'Prata', cls: 'bg-slate-400 text-slate-950' },
  ouro: { label: 'Ouro', cls: 'bg-yellow-500 text-yellow-950' },
  diamante: { label: 'Diamante', cls: 'bg-sky-500 text-white' },
}
function TierBadge({ t }: { t: NonNullable<Lead['tier']> }) {
  const m = TIER[t]
  return <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold', m.cls)}>{m.label}</span>
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="flex shrink-0 items-center gap-1 truncate rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{children}</span>
}
function SlaTimer({ minutes }: { minutes: number }) {
  const tone = minutes < 10 ? 'ok' : minutes < 30 ? 'warn' : 'danger'
  const label = minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}m` : ''}` : `${Math.floor(minutes / 1440)}d`
  const cls = tone === 'danger' ? 'bg-danger text-white' : tone === 'warn' ? 'bg-warning text-warning-foreground' : 'bg-success text-success-foreground'
  return (
    <span className={cn('flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums', cls)} title="SLA de 1º atendimento">
      <Zap className="h-2.5 w-2.5" /> {label}
    </span>
  )
}
function LeadAvatar({ name, url, color }: { name: string; url?: string; color: string }) {
  const [err, setErr] = useState(false)
  if (url && !err) {
    return <img src={url} alt={name} onError={() => setErr(true)} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: color }}>
      {initials(name)}
    </span>
  )
}
const ABANDON_HOURS = 360 // 15 dias
const actLabel = (h: number) => (h < 24 ? `${h}h` : `${Math.round(h / 24)}d`)
const entryLabel = (d: number) => (d <= 0 ? 'hoje' : `há ${d}d`)

function MoveMenu({ lead, move }: { lead: Lead; move: MoveCtx }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.right - 208, window.innerWidth - 216)) })
    }
    setOpen((v) => !v)
  }
  const others = move.pipelines.filter((p) => p.id !== move.currentId)
  return (
    <>
      <button
        ref={btnRef} onClick={toggle} onPointerDown={(e) => e.stopPropagation()} title="Mover"
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      ><ArrowRightLeft className="h-4 w-4" /></button>
      {open && createPortal(
        <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} onPointerDown={(e) => e.stopPropagation()}>
          <div className="absolute w-52 rounded-xl border border-white/10 bg-card p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Mudar etapa</p>
            {move.stages.map((s) => (
              <button
                key={s.id} disabled={s.id === lead.stage}
                onClick={() => { move.onMoveStage(lead.id, s.id); setOpen(false) }}
                className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors', s.id === lead.stage ? 'text-muted-foreground/50' : 'hover:bg-foreground/[0.05]')}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate">{s.label}</span>
                {s.id === lead.stage && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-teal" />}
              </button>
            ))}
            {others.length > 0 && (
              <>
                <div className="my-1 h-px bg-border" />
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Mudar funil</p>
                {others.map((p) => (
                  <button
                    key={p.id} onClick={() => { move.onMovePipeline(lead.id, p.id); setOpen(false) }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-foreground/[0.05]"
                  >
                    <GitBranch className="h-3.5 w-3.5 shrink-0 text-teal" />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function LeadCardBody({ lead, stageColor, overlay = false, interactive = false, move }: {
  lead: Lead; stageColor: Record<string, string>; overlay?: boolean; interactive?: boolean; move?: MoveCtx
}) {
  const sel = useContext(SelCtx)
  const on = !!sel?.selected.has(lead.id)
  const anySel = (sel?.selected.size ?? 0) > 0
  const owner = OWNERS.find((p) => p.id === lead.ownerId) ?? null
  const color = stageColor[lead.stage] ?? 'hsl(var(--muted-foreground))'
  const abandoned = (lead.noContactHours ?? 0) >= ABANDON_HOURS
  const stripe = abandoned ? 'hsl(var(--danger))' : color
  // Dedupe: tag não repete o que a origem/CNPJ já dizem (evita "carnaval" redundante)
  const tags = (lead.tags ?? []).filter((t) => {
    const low = t.toLowerCase()
    if (lead.cnpj && low === 'pme') return false
    if (lead.source && low === lead.source.toLowerCase()) return false
    return true
  })

  // Rodapé em linha única: quantas tags cabem (estimativa por largura); resto vira +N.
  const chipW = (s: string) => Math.round(s.length * 6.1) + 16
  const BUDGET = 236
  let used = (lead.source ? chipW(lead.source) + 6 : 0) + (lead.tier ? chipW(TIER[lead.tier].label) + 6 : 0) + (lead.cnpj ? 42 : 0)
  const shownTags: string[] = []
  for (const t of tags) { const need = chipW(t) + 6; if (used + need <= BUDGET) { shownTags.push(t); used += need } else break }
  let hiddenTags = tags.slice(shownTags.length)
  if (hiddenTags.length > 0 && shownTags.length > 0 && used + 30 > BUDGET) { shownTags.pop(); hiddenTags = tags.slice(shownTags.length) }
  return (
    <article
      onContextMenu={interactive && sel ? (e) => sel.onCtx(e, lead) : undefined}
      className={cn(
        'group relative flex min-h-[172px] flex-col overflow-hidden rounded-xl border p-3.5 pl-4 transition',
        'border-black/[0.07] dark:border-white/[0.05]',
        on && 'ring-2 ring-teal',
        overlay
          ? 'w-[280px] rotate-2 cursor-grabbing bg-card shadow-[0_18px_40px_-10px_rgba(0,0,0,0.28)] dark:shadow-[0_22px_48px_-10px_rgba(0,0,0,0.8)]'
          : 'bg-[hsl(var(--card)/0.9)] backdrop-blur-xl backdrop-saturate-150 dark:bg-[hsl(var(--card)/0.55)] shadow-[0_4px_16px_-6px_rgba(15,23,42,0.16)] hover:border-teal/40 hover:shadow-[0_10px_26px_-8px_rgba(15,23,42,0.22)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_10px_30px_-10px_rgba(0,0,0,0.7)] dark:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_18px_42px_-12px_rgba(0,0,0,0.8)]',
      )}
      style={{
        backgroundImage: `linear-gradient(125deg, color-mix(in srgb, ${color}, transparent ${overlay ? 88 : 90}%), transparent 55%)`,
      }}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: stripe }} aria-hidden />
      {interactive && sel && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className={cn('absolute left-1.5 top-1.5 z-20 grid place-items-center rounded-[5px] bg-white shadow-sm transition-opacity', on || anySel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
        >
          <Checkbox checked={on} onChange={() => sel.toggle(lead.id)} />
        </div>
      )}

      {/* Topo: avatar (foto WhatsApp) + nome + valor verde + ações no hover */}
      <div className="flex items-start gap-2.5">
        <LeadAvatar name={lead.name} url={lead.avatarUrl} color={color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-tight">{lead.name}</p>
          {(lead.value ?? 0) > 0 && (
            <p className="mt-0.5 font-mono text-[13px] font-bold leading-tight tabular-nums text-success">
              {brl(lead.value ?? 0)}<span className="text-[10px] font-normal text-muted-foreground">/mês</span>
            </p>
          )}
        </div>
      </div>

      {/* Ações — coluna vertical à direita, no hover (não corta o nome) */}
      {interactive && !overlay && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-1.5 top-1.5 z-10 flex flex-col gap-0.5 rounded-lg bg-card/80 p-0.5 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100"
        >
          <IconAction title="Conversar"><MessageCircle className="h-4 w-4" /></IconAction>
          <IconAction title="Agendar"><CalendarPlus className="h-4 w-4" /></IconAction>
          <IconAction title="Editar"><PencilLine className="h-4 w-4" /></IconAction>
          {move && <MoveMenu lead={lead} move={move} />}
        </div>
      )}

      {owner && <p className="mt-1.5 truncate text-[11px] text-muted-foreground">Resp.: <span className="font-medium text-foreground">{owner.name}</span></p>}

      <p className="mt-2 truncate text-[12px] text-muted-foreground">
        {lead.operadora} · {lead.plano} · <span className="font-medium text-foreground">{lead.vidas} vida{lead.vidas > 1 ? 's' : ''}</span>
      </p>

      {/* Um só indicador de tempo: SLA na etapa de entrada, senão última atividade */}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        {lead.slaMinutes != null ? (
          <SlaTimer minutes={lead.slaMinutes} />
        ) : (
          <span className={cn('flex items-center gap-1', abandoned && 'font-semibold text-danger')}>
            <Clock className="h-3 w-3 shrink-0" />
            {abandoned ? 'Abandonado' : lead.noContactHours != null ? `sem contato há ${actLabel(lead.noContactHours)}` : 'sem atividade'}
          </span>
        )}
      </div>

      {/* Entrada + cidade */}
      {(lead.entryDaysAgo != null || lead.city) && (
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          {lead.entryDaysAgo != null && <span className="flex shrink-0 items-center gap-1"><Calendar className="h-3 w-3" />entrou {entryLabel(lead.entryDaysAgo)}</span>}
          {lead.city && <span className="flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{lead.city}</span></span>}
        </div>
      )}

      {lead.lossReason && <p className="mt-2 text-xs leading-snug text-danger">{lead.lossReason}</p>}

      {/* Rodapé: origem + tier + CNPJ + tags — linha única; overflow vira +N (hover mostra) */}
      <div className="mt-auto flex items-center gap-1.5 overflow-hidden border-t border-border pt-2">
        {lead.source && <Chip>{lead.source}</Chip>}
        {lead.tier && <TierBadge t={lead.tier} />}
        {lead.cnpj && <Chip><Briefcase className="h-2.5 w-2.5" />PME</Chip>}
        {shownTags.map((t) => <Chip key={t}>{t}</Chip>)}
        {hiddenTags.length > 0 && (
          <span
            title={hiddenTags.join(', ')}
            className="shrink-0 cursor-default rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >+{hiddenTags.length}</span>
        )}
      </div>
    </article>
  )
}

const KIND_LABEL: Record<Kind, string> = { open: 'Aberta', won: 'Ganho', lost: 'Perdido' }

function NewPipelineModal({ onCancel, onCreate }: { onCancel: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState('')
  const valid = name.trim().length >= 2
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <h3 className="text-lg font-bold tracking-tight">Criar funil</h3>
        <p className="mt-1 text-sm text-muted-foreground">Um novo funil começa com etapas padrão que você pode editar depois.</p>
        <input
          autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && valid) onCreate(name.trim()) }}
          placeholder="Ex: Renovações, Indicações, Pós-venda…"
          className="mt-4 h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/20"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/60">Cancelar</button>
          <button
            onClick={() => onCreate(name.trim())} disabled={!valid}
            className={cn('flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE] px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-105', !valid && 'cursor-not-allowed opacity-50')}
          ><Plus className="h-4 w-4" /> Criar</button>
        </div>
      </div>
    </div>
  )
}

function FunilEditor({ pipeline, canDelete, onCancel, onSave, onDelete }: {
  pipeline: Pipeline; canDelete: boolean; onCancel: () => void; onSave: (name: string, s: Stage[]) => void; onDelete: () => void
}) {
  const [name, setName] = useState(pipeline.name)
  const [draft, setDraft] = useState<Stage[]>(pipeline.stages)
  const [colorFor, setColorFor] = useState<string | null>(null)
  const openCount = draft.filter((s) => s.kind === 'open').length

  const patch = (id: string, p: Partial<Stage>) => setDraft((d) => d.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const move = (i: number, dir: -1 | 1) => setDraft((d) => {
    const j = i + dir
    if (j < 0 || j >= d.length) return d
    const next = [...d]; ;[next[i], next[j]] = [next[j], next[i]]; return next
  })
  const remove = (id: string) => setDraft((d) => d.filter((s) => s.id !== id))
  const add = () => setDraft((d) => {
    const stage: Stage = { id: `stage-${Date.now()}`, label: 'Nova etapa', color: PALETTE[7], kind: 'open' }
    const firstOutcome = d.findIndex((s) => s.kind !== 'open')
    if (firstOutcome < 0) return [...d, stage]
    const next = [...d]; next.splice(firstOutcome, 0, stage); return next
  })

  const valid = name.trim().length > 0 && draft.every((s) => s.label.trim().length > 0) && draft.some((s) => s.kind === 'open')

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome do funil</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/20"
            />
          </div>
          <button onClick={onCancel} className="mt-5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Etapas</p>
          {draft.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-border bg-muted/25 p-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="grid h-4 w-5 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === draft.length - 1} className="grid h-4 w-5 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                </div>
                <button
                  onClick={() => setColorFor(colorFor === s.id ? null : s.id)}
                  className="h-6 w-6 shrink-0 rounded-full border-2 border-white/20"
                  style={{ background: s.color }} title="Cor da etapa"
                />
                <input
                  value={s.label}
                  onChange={(e) => patch(s.id, { label: e.target.value })}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/20"
                />
                {s.kind === 'open' ? (
                  <button
                    onClick={() => remove(s.id)} disabled={openCount <= 1}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-danger disabled:opacity-30"
                    title="Remover etapa"
                  ><Trash2 className="h-4 w-4" /></button>
                ) : (
                  <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{KIND_LABEL[s.kind]}</span>
                )}
              </div>
              {colorFor === s.id && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-9">
                  {PALETTE.map((c) => (
                    <button
                      key={c} onClick={() => { patch(s.id, { color: c }); setColorFor(null) }}
                      className={cn('h-6 w-6 rounded-full border-2 transition', s.color === c ? 'border-foreground' : 'border-transparent')}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          <button onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-teal hover:text-foreground">
            <Plus className="h-4 w-4" /> Adicionar etapa
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onDelete} disabled={!canDelete}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
            title={canDelete ? 'Excluir este funil' : 'Precisa de ao menos 1 funil'}
          ><Trash2 className="h-4 w-4" /> Excluir funil</button>
          <div className="flex gap-2">
            <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/60">Cancelar</button>
            <button
              onClick={() => onSave(name.trim(), draft)} disabled={!valid}
              className={cn('flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE] px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-105', !valid && 'cursor-not-allowed opacity-50')}
            ><Check className="h-4 w-4" /> Salvar funil</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const OPERADORA_OPTS = ['Amil', 'Bradesco Saúde', 'SulAmérica', 'Hapvida', 'Unimed', 'NotreDame'].map((o) => ({ value: o, label: o }))
const PLANO_OPTS = ['PME', 'PME Adesão', 'Individual', 'Empresarial'].map((p) => ({ value: p, label: p }))
const SOURCE_OPTS = ['Meta Ads', 'Indicação', 'Site', 'WhatsApp', 'Prospecção'].map((s) => ({ value: s, label: s }))

function FormSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)?.label
  return (
    <div className="relative">
      <button
        type="button" onClick={() => setOpen((v) => !v)}
        className={cn('flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-background px-3.5 text-sm outline-none transition-colors', open ? 'border-teal' : 'border-input hover:border-teal/50')}
      >
        <span className={cn('truncate', current ? 'text-foreground' : 'text-muted-foreground/60')}>{current ?? placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} aria-hidden />
          <div className="dropdown-in absolute left-0 top-full z-[70] mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/10 bg-card p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]">
            {options.map((o) => {
              const sel = value === o.value
              return (
                <button
                  key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                  className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors', sel ? 'bg-foreground/[0.06] font-medium text-teal' : 'text-foreground hover:bg-foreground/[0.05]')}
                >
                  <span className="truncate">{o.label}</span>
                  {sel && <Check className="h-3.5 w-3.5 shrink-0 text-teal" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const qaInput = 'h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-teal focus:ring-[2.5px] focus:ring-teal/20'

/** Rótulo curto acima do campo, denso (para o quick-add). */
function QaField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-[11px] font-medium text-muted-foreground">{label}</label>{children}</div>
}

/** Quick-add ancorado no botão — preenchimento rápido, sem modal de tela cheia. */
function QuickAddLead({ pipelineName, onCancel, onCreate }: {
  pipelineName: string; onCancel: () => void; onCreate: (d: Partial<Lead> & { name: string }) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [operadora, setOperadora] = useState('')
  const [vidas, setVidas] = useState('')
  const [valor, setValor] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [more, setMore] = useState(false)
  const [city, setCity] = useState('')
  const [plano, setPlano] = useState('')
  const [tier, setTier] = useState('')
  const [source, setSource] = useState('')
  const [cnpj, setCnpj] = useState(false)
  const valid = name.trim().length >= 2

  const submit = () => {
    if (!valid) return
    const value = Math.round((parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0) * 100)
    onCreate({
      name: name.trim(), phone: phone.replace(/\D/g, '') || null, city: city.trim() || undefined,
      operadora, plano, vidas: Math.max(1, Number(vidas) || 1), value,
      tier: (tier || undefined) as Lead['tier'], source: source || null, ownerId: ownerId || null, cnpj,
    })
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
    else if (e.key === 'Enter' && valid && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); submit() }
  }

  const ownerOpts = OWNERS.map((o) => ({ value: o.id, label: o.name }))

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onCancel} aria-hidden />
      <div
        role="dialog" aria-label="Novo lead" onKeyDown={onKey}
        className="dropdown-in absolute right-0 top-full z-50 mt-2 w-[380px] origin-top-right overflow-hidden rounded-xl border border-white/10 bg-card shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold tracking-tight">Novo lead</span>
            <span className="text-[11px] text-muted-foreground">em {pipelineName}</span>
          </div>
          <button onClick={onCancel} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
        </div>

        <div className="max-h-[62vh] space-y-2.5 overflow-y-auto px-4 pb-1">
          <QaField label="Nome do lead / empresa">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Construtora Aurora" className={qaInput} />
          </QaField>
          <QaField label="WhatsApp">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="(11) 98888-7777" className={qaInput} />
          </QaField>
          <div className="grid grid-cols-2 gap-2.5">
            <QaField label="Operadora"><FormSelect value={operadora} onChange={setOperadora} options={OPERADORA_OPTS} placeholder="Selecionar" /></QaField>
            <QaField label="Vidas"><input value={vidas} onChange={(e) => setVidas(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="1" className={qaInput} /></QaField>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <QaField label="Valor/mês (R$)"><input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="1.846,00" className={qaInput} /></QaField>
            <QaField label="Responsável"><FormSelect value={ownerId} onChange={setOwnerId} options={ownerOpts} placeholder="Selecionar" /></QaField>
          </div>

          {more && (
            <div className="space-y-2.5 border-t border-border/60 pt-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <QaField label="Cidade"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo, SP" className={qaInput} /></QaField>
                <QaField label="Plano"><FormSelect value={plano} onChange={setPlano} options={PLANO_OPTS} placeholder="Selecionar" /></QaField>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <QaField label="Origem"><FormSelect value={source} onChange={setSource} options={SOURCE_OPTS} placeholder="Selecionar" /></QaField>
                <QaField label="Tier"><FormSelect value={tier} onChange={setTier} options={TIER_OPTS} placeholder="—" /></QaField>
              </div>
              <label className="flex cursor-pointer select-none items-center gap-2.5 text-[12px] text-muted-foreground">
                <button
                  type="button" role="checkbox" aria-checked={cnpj} onClick={() => setCnpj((v) => !v)}
                  className={cn('grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-all', cnpj ? 'border-transparent bg-teal' : 'border-input')}
                >
                  {cnpj && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3.5} />}
                </button>
                É PME (tem CNPJ)
              </label>
            </div>
          )}

          <button
            type="button" onClick={() => setMore((v) => !v)}
            className="flex items-center gap-1 py-0.5 text-[12px] font-medium text-teal transition-opacity hover:opacity-80"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', more && 'rotate-180')} />
            {more ? 'Menos detalhes' : 'Mais detalhes'}
          </button>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-4 py-2.5">
          <span className="text-[11px] text-muted-foreground">
            <kbd className="rounded border border-border bg-card px-1 py-px font-mono text-[10px]">Enter</kbd> cria
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Cancelar</button>
            <button
              onClick={submit} disabled={!valid}
              className={cn('flex items-center gap-1.5 rounded-lg bg-teal px-3.5 py-1.5 text-[13px] font-bold text-primary-foreground transition hover:brightness-110', !valid && 'cursor-not-allowed opacity-45')}
            ><Plus className="h-3.5 w-3.5" /> Criar</button>
          </div>
        </div>
      </div>
    </>
  )
}

function LossReasonModal({ lead, onCancel, onConfirm }: { lead: Lead; onCancel: () => void; onConfirm: (r: string) => void }) {
  const [choice, setChoice] = useState<string>(LOSS_REASONS[0])
  const [other, setOther] = useState('')
  const isOther = choice === 'outro'
  const reason = isOther ? other.trim() : choice
  const valid = reason.length >= 3

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <h3 className="text-lg font-bold tracking-tight">Por que este lead foi perdido?</h3>
        <p className="mt-1 text-sm text-muted-foreground">O motivo fica registrado em {lead.name} e alimenta o relatório de conversão.</p>

        <div className="mt-4 flex flex-col gap-2">
          {[...LOSS_REASONS, 'outro'].map((r) => {
            const label = r === 'outro' ? 'Outro motivo' : r
            const active = choice === r
            return (
              <button
                key={r} type="button" onClick={() => setChoice(r)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                  active ? 'border-teal bg-teal/[0.06]' : 'border-border hover:bg-muted/60',
                )}
              >
                <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border-2', active ? 'border-teal' : 'border-input')}>
                  {active && <span className="h-2 w-2 rounded-full bg-teal" />}
                </span>
                {label}
              </button>
            )
          })}
        </div>

        {isOther && (
          <textarea
            value={other} onChange={(e) => setOther(e.target.value)} autoFocus
            placeholder="Descreva o motivo da perda…"
            className="mt-2 min-h-[80px] w-full resize-none rounded-lg border border-input bg-muted/40 p-3 text-sm outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/20"
          />
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/60">Cancelar</button>
          <button
            onClick={() => onConfirm(reason)} disabled={!valid}
            className={cn('rounded-lg bg-danger px-4 py-2 text-sm font-bold text-white transition', !valid && 'cursor-not-allowed opacity-50')}
          >Marcar como perdido</button>
        </div>
      </div>
    </div>
  )
}
