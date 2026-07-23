import { useMemo, useRef, useState, useEffect, type ReactNode } from 'react'
import {
  MagnifyingGlass, ChatCircleDots, Check, Checks, PushPin, BellSlash, Smiley,
  Microphone, PaperPlaneRight, ArrowLeft, Phone, X, Sparkle, CalendarPlus, Plus, Lightning, Camera,
  FileText, Image as ImageIcon, Waveform, Lock, Star, Heartbeat, Wallet, CaretDown, SlidersHorizontal, DotsSixVertical,
  Archive, Trash, Copy, ArrowBendUpLeft, ArrowBendUpRight, Info, Funnel, DeviceMobile,
  Robot, PencilSimple, DotsThree, Snowflake, GraduationCap, ArrowsLeftRight, Prohibit, VideoCamera, Alarm,
  Crown, Tag, UserCircle, CaretRight, CaretLeft, GitBranch, type Icon,
} from '@phosphor-icons/react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent, type DraggableAttributes } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatPhone, initials, pickAvatar } from '@/lib/format'
import { STAGE_CATALOG, PIPELINES, OWNERS, lifecycleOf, type Lead } from '@/lib/funil-data'
import { useLeads } from '@/store/leads'
import { useImplantacao } from '@/store/implantacao'
import { VendaGanhaModal, type VendaGanhaData } from '@/components/leads/VendaGanhaModal'
import { VendaProcessando } from '@/components/leads/VendaProcessando'
import { TierPill, StatusDot } from '@/components/leads/LeadBadges'
import { StageCell, OwnerCell, FollowupInlineCell, PipelineCell, InlineText } from '@/components/leads/InlineCell'
import { useCustomFields } from '@/store/customFields'
import { CustomFieldInline, ManageFieldsModal } from '@/components/leads/CustomFields'
import { TagsEditor } from '@/components/leads/TagsEditor'
import { TagChip } from '@/lib/tags'
import { useContextMenu, ContextMenu, type MenuItem } from '@/components/leads/Bulk'
import { XiaSummary } from '@/components/leads/XiaSummary'
import { WA_CONVERSATIONS, type WaConv, type WaMsg } from '@/lib/whatsapp-data'

/* ---------- paleta WhatsApp (light + dark) ---------- */
const wa = {
  panel: 'bg-white dark:bg-[#111b21]',
  header: 'bg-[#f0f2f5] dark:bg-[#202c33]',
  field: 'bg-[#f0f2f5] dark:bg-[#2a3942]',
  hover: 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]',
  active: 'bg-[#f0f2f5] dark:bg-[#2a3942]',
  wall: 'bg-[#efeae2] dark:bg-[#0b141a]',
  bubbleIn: 'bg-white dark:bg-[#202c33]',
  bubbleOut: 'bg-[#d9fdd3] dark:bg-[#005c4b]',
  sub: 'text-[#667781] dark:text-[#8696a0]',
  border: 'border-black/[0.08] dark:border-[#222d34]',
}
const DOODLE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.035' stroke-width='1.6'%3E%3Cpath d='M12 14h9M16.5 9.5v9'/%3E%3Ccircle cx='54' cy='22' r='6'/%3E%3Cpath d='M9 52c4-5 9-5 13 0'/%3E%3Cpath d='M48 54l7 7M55 54l-7 7'/%3E%3Cpath d='M34 34h10v10'/%3E%3C/g%3E%3C/svg%3E\")"

const STAGE_COLOR: Record<string, string> = {
  novo: '--stage-1', atendimento: '--stage-2', qualificado: '--stage-3', proposta: '--stage-4',
  negociacao: '--stage-5', ganho: '--stage-6', perdido: '--stage-7',
}
const nowHM = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/* formatação básica do WhatsApp: *negrito* _itálico_ ~tachado~ */
function fmt(text: string): ReactNode {
  const parts = text.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~)/g)
  return parts.map((p, i) => {
    if (/^\*[^*]+\*$/.test(p)) return <strong key={i}>{p.slice(1, -1)}</strong>
    if (/^_[^_]+_$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>
    if (/^~[^~]+~$/.test(p)) return <s key={i}>{p.slice(1, -1)}</s>
    return p
  })
}

function Avatar({ url, name, size = 'h-12 w-12' }: { url?: string; name: string; size?: string }) {
  const [err, setErr] = useState(false)
  if (url && !err) return <img src={url} alt="" onError={() => setErr(true)} className={cn('shrink-0 rounded-full object-cover', size)} />
  return <span className={cn('grid shrink-0 place-items-center rounded-full text-[13px] font-bold', size, pickAvatar(name))}>{initials(name)}</span>
}

function Ticks({ status }: { status?: WaMsg['status'] }) {
  if (!status) return null
  if (status === 'sent') return <Check className="h-3.5 w-3.5 shrink-0 opacity-60" />
  return <Checks className={cn('h-3.5 w-3.5 shrink-0', status === 'read' ? 'text-[#53bdeb]' : 'opacity-60')} />
}

const mediaIcon = (t?: WaMsg['type']) =>
  t === 'image' ? <ImageIcon className="h-3.5 w-3.5" /> : t === 'audio' ? <Waveform className="h-3.5 w-3.5" /> : t === 'doc' ? <FileText className="h-3.5 w-3.5" /> : null

/** Stamp da lista (estilo WhatsApp): hoje→hora, ontem→"Ontem", antes→dia/data. */
const convStamp = (day: string, t: string) => {
  const d = day.trim().toLowerCase()
  return d === 'hoje' ? t : d === 'ontem' ? 'Ontem' : day
}

const MENU_SHADOW = 'shadow-[0_1px_2px_-1px_rgba(0,0,0,0.06),0_8px_16px_-6px_rgba(0,0,0,0.10),0_24px_48px_-16px_rgba(0,0,0,0.14)] dark:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]'

/** Nível de SLA: só alerta quando a ÚLTIMA msg é do cliente (aguardando nossa resposta) e está velha. */
const slaLevel = (c: WaConv): 'medium' | 'high' | null => {
  const last = c.messages[c.messages.length - 1]
  if (!last || last.fromMe) return null
  const d = last.day.trim().toLowerCase()
  if (d === 'hoje') return null
  return d === 'ontem' ? 'medium' : 'high'
}
const ATTACH = [{ icon: FileText, label: 'Documento' }, { icon: ImageIcon, label: 'Fotos e vídeos' }, { icon: Camera, label: 'Câmera' }]
const QUICK_MSGS = [
  'Olá! 😊 Sou corretor(a) de planos de saúde. Como posso te ajudar?',
  'Consigo uma condição especial pra você. Posso montar e te enviar a proposta?',
  'Qual a melhor forma de falar: por aqui mesmo ou ligação?',
  'Segue a proposta! Qualquer dúvida, estou à disposição. 🙌',
]
const EMOJIS = '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😋 😎 🤩 🥳 🤔 🤗 🫡 😐 😴 😢 😭 😤 😅 👍 👎 👏 🙌 🙏 💪 👌 ✌️ 🤞 👋 🤝 💚 ❤️ 🧡 💛 💙 💜 🔥 ✨ ⭐ 🎉 🎊 ✅ ❌ ⚠️ 📄 📎 📅 💰 💵 🏥 💊 🩺 📈 🚀 😀'.split(' ')

/* ============================ LISTA DE CONVERSAS ============================ */
const CHIPS = [
  { key: 'all', label: 'Todas' }, { key: 'unread', label: 'Não lidas' },
  { key: 'fav', label: 'Favoritas' }, { key: 'groups', label: 'Grupos' },
  { key: 'archived', label: 'Arquivados' },
]
const WA_TIERS = [{ v: 'bronze', l: 'Bronze' }, { v: 'prata', l: 'Prata' }, { v: 'ouro', l: 'Ouro' }, { v: 'diamante', l: 'Diamante' }]
const WA_STAGES = ['novo', 'atendimento', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido']
const CONNECTIONS = [
  { id: 'k1', label: 'Comercial', phone: '+55 11 98888-0001' },
  { id: 'k2', label: 'Suporte', phone: '+55 11 98888-0002' },
  { id: 'k3', label: 'Renovações', phone: '+55 11 98888-0003' },
]

type FState = { tags: string[]; owners: string[]; tiers: string[]; stages: string[]; ai: 'all' | 'on' | 'off' }
type FCatKey = 'ai' | 'stages' | 'tiers' | 'owners' | 'tags'

/** Menu de filtros compacto (estilo Linear): busca no topo → categorias → opções. */
function FilterMenu({ f, setF, toggleF, clearF, activeCount, allTags, panel }: {
  f: FState
  setF: React.Dispatch<React.SetStateAction<FState>>
  toggleF: (k: 'tags' | 'owners' | 'tiers' | 'stages', v: string) => void
  clearF: () => void
  activeCount: number
  allTags: string[]
  panel: string
}) {
  const [view, setView] = useState<FCatKey | null>(null)
  const [q, setQ] = useState('')

  const CATS: { key: FCatKey; label: string; icon: Icon; count: number; options: { v: string; l: string }[] }[] = [
    { key: 'ai', label: 'Atendimento IA', icon: Robot, count: f.ai !== 'all' ? 1 : 0, options: [{ v: 'all', l: 'Todas' }, { v: 'on', l: 'Com IA' }, { v: 'off', l: 'Sem IA' }] },
    { key: 'stages', label: 'Etapa', icon: GitBranch, count: f.stages.length, options: WA_STAGES.map((s) => ({ v: s, l: STAGE_CATALOG[s]?.label ?? s })) },
    { key: 'tiers', label: 'Tier', icon: Crown, count: f.tiers.length, options: WA_TIERS.map((t) => ({ v: t.v, l: t.l })) },
    { key: 'owners', label: 'Vendedor', icon: UserCircle, count: f.owners.length, options: OWNERS.map((o) => ({ v: o.id, l: o.name })) },
    { key: 'tags', label: 'Etiquetas', icon: Tag, count: f.tags.length, options: allTags.map((t) => ({ v: t, l: t })) },
  ]
  const cat = view ? CATS.find((c) => c.key === view)! : null
  const term = q.trim().toLowerCase()
  const rows = cat ? cat.options.filter((o) => !term || o.l.toLowerCase().includes(term)) : CATS.filter((c) => !term || c.label.toLowerCase().includes(term))
  const isOn = (k: FCatKey, v: string) => k === 'ai' ? f.ai === v : (f[k] as string[]).includes(v)
  const pick = (k: FCatKey, v: string) => k === 'ai' ? setF((p) => ({ ...p, ai: v as FState['ai'] })) : toggleF(k as 'tags' | 'owners' | 'tiers' | 'stages', v)

  return (
    <div className={cn('absolute right-0 top-full z-50 mt-2 w-[248px] overflow-hidden rounded-xl border border-border p-1 dark:border-white/10', panel, MENU_SHADOW)}>
      {/* busca */}
      <div className="mb-1 flex items-center gap-1.5 border-b border-border/50 px-2 pb-1.5">
        <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-muted-foreground/55" />
        <input
          autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={cat ? `Buscar ${cat.label.toLowerCase()}…` : 'Filtrar…'}
          className="h-6 w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      {cat && (
        <>
          <button onClick={() => { setView(null); setQ('') }} className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
            <CaretLeft className="h-3.5 w-3.5" weight="bold" /> {cat.label}
          </button>
          <div className="my-1 h-px bg-border/50" />
        </>
      )}

      <div className="max-h-[52vh] overflow-y-auto">
        {!cat
          ? (rows as typeof CATS).map((c) => (
            <button key={c.key} onClick={() => { setView(c.key); setQ('') }} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.05]">
              <c.icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
              <span className="flex-1 truncate text-[13px] text-foreground">{c.label}</span>
              {c.count > 0 && <span className="shrink-0 rounded bg-teal px-1.5 text-[10px] font-bold text-primary-foreground">{c.count}</span>}
              <CaretRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
            </button>
          ))
          : (rows as { v: string; l: string }[]).map((o) => {
            const on = isOn(cat.key, o.v)
            return (
              <button key={o.v} onClick={() => pick(cat.key, o.v)} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.05]">
                <span className={cn('grid h-[15px] w-[15px] shrink-0 place-items-center border-[1.5px] transition-colors', cat.key === 'ai' ? 'rounded-full' : 'rounded-[4px]', on ? 'border-transparent bg-teal' : 'border-input')}>
                  {on && <Check className="h-2.5 w-2.5 text-primary-foreground" weight="bold" />}
                </span>
                <span className="flex-1 truncate text-[13px] text-foreground">{o.l}</span>
              </button>
            )
          })}
        {rows.length === 0 && <p className="px-2 py-3 text-center text-[12.5px] text-muted-foreground/60">Nada encontrado.</p>}
      </div>

      {activeCount > 0 && (
        <>
          <div className="my-1 h-px bg-border/50" />
          <button onClick={() => { clearF(); setView(null); setQ('') }} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-danger">
            <X className="h-3.5 w-3.5 shrink-0" /> Limpar filtros ({activeCount})
          </button>
        </>
      )}
    </div>
  )
}
function ConversationList({ convs, selectedId, onSelect, onUpdate }: {
  convs: WaConv[]; selectedId: string; onSelect: (id: string) => void; onUpdate: (id: string, patch: Partial<WaConv>) => void
}) {
  const { getLead, leads } = useLeads()
  const { menu, open: openMenu, close: closeMenu } = useContextMenu()
  const [q, setQ] = useState('')
  const [chip, setChip] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [connOpen, setConnOpen] = useState(false)
  const [activeConns, setActiveConns] = useState<string[]>(CONNECTIONS.map((c) => c.id))
  const toggleConn = (id: string) => setActiveConns((p) => (p.includes(id) ? (p.length > 1 ? p.filter((x) => x !== id) : p) : [...p, id]))
  const [f, setF] = useState<{ tags: string[]; owners: string[]; tiers: string[]; stages: string[]; ai: 'all' | 'on' | 'off' }>({ tags: [], owners: [], tiers: [], stages: [], ai: 'all' })
  const allTags = [...new Set(leads.flatMap((l) => l.tags ?? []))]
  const activeCount = f.tags.length + f.owners.length + f.tiers.length + f.stages.length + (f.ai !== 'all' ? 1 : 0)
  const toggleF = (k: 'tags' | 'owners' | 'tiers' | 'stages', v: string) => setF((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }))
  const clearF = () => setF({ tags: [], owners: [], tiers: [], stages: [], ai: 'all' })

  const convMenu = (c: WaConv): MenuItem[] => [
    { label: c.pinned ? 'Desafixar' : 'Fixar', icon: PushPin, onClick: () => onUpdate(c.id, { pinned: !c.pinned }) },
    { label: c.unread > 0 ? 'Marcar como lida' : 'Marcar como não lida', icon: Checks, onClick: () => onUpdate(c.id, { unread: c.unread > 0 ? 0 : 1 }) },
    { label: c.muted ? 'Reativar notificações' : 'Silenciar', icon: BellSlash, onClick: () => onUpdate(c.id, { muted: !c.muted }) },
    { label: c.favorite ? 'Remover dos favoritos' : 'Favoritar', icon: Star, onClick: () => onUpdate(c.id, { favorite: !c.favorite }) },
    { divider: true, label: '' },
    { label: c.archived ? 'Desarquivar conversa' : 'Arquivar conversa', icon: Archive, onClick: () => onUpdate(c.id, { archived: !c.archived }) },
    { label: 'Apagar conversa', icon: Trash, danger: true, onClick: () => toast('Conversa apagada') },
  ]
  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return convs
      .filter((c) => {
        // arquivados só na aba Arquivados; escondidos nas demais
        if (chip === 'archived') { if (!c.archived) return false } else if (c.archived) return false
        if (chip === 'unread' && c.unread === 0) return false
        if (chip === 'fav' && !c.favorite) return false
        if (chip === 'groups') return false // sem grupos no mock
        if (term && !(c.name.toLowerCase().includes(term) || c.phone.includes(term.replace(/\D/g, '')))) return false
        // filtros personalizados (via lead vinculado)
        if (f.ai === 'on' && !c.aiOn) return false
        if (f.ai === 'off' && c.aiOn) return false
        if (f.tags.length || f.owners.length || f.tiers.length || f.stages.length) {
          const lead = c.leadId ? getLead(c.leadId) : undefined
          if (!lead) return false
          if (f.tags.length && !(lead.tags ?? []).some((t) => f.tags.includes(t))) return false
          if (f.owners.length && !f.owners.includes(lead.ownerId ?? '')) return false
          if (f.tiers.length && !(lead.tier && f.tiers.includes(lead.tier))) return false
          if (f.stages.length && !f.stages.includes(lead.stage)) return false
        }
        return true
      })
      .sort((a, b) => Number(b.pinned ?? 0) - Number(a.pinned ?? 0))
  }, [convs, q, chip, f, leads, getLead])

  return (
    <aside className={cn('flex w-[360px] shrink-0 flex-col border-r', wa.panel, wa.border)}>
      {/* header */}
      <div className={cn('flex h-14 shrink-0 items-center justify-between px-4', wa.panel)}>
        <span className="text-[16px] font-bold tracking-tight">Conversas</span>
        <div className="flex items-center gap-1">
          {/* seletor de conexão / número (cliente com +1 conexão) */}
          <div className="relative">
            <button onClick={() => { setConnOpen((v) => !v); setFilterOpen(false) }} title="Número conectado" className={cn('grid h-9 w-9 place-items-center rounded-full', connOpen ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><DeviceMobile className="h-[18px] w-[18px]" /></button>
            {connOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" onClick={() => setConnOpen(false)} aria-hidden />
                <div className={cn('absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-border p-1 dark:border-white/10', wa.panel, MENU_SHADOW)}>
                  <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Números conectados</p>
                  {CONNECTIONS.map((k) => {
                    const on = activeConns.includes(k.id)
                    return (
                      <button key={k.id} onClick={() => toggleConn(k.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-foreground/[0.06]">
                        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 ring-inset transition-colors', on ? 'bg-teal/12 text-teal ring-teal/15' : 'bg-foreground/[0.05] text-muted-foreground/60 ring-border/40')}><DeviceMobile className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block text-[13px] font-medium', on ? 'text-foreground' : 'text-muted-foreground')}>{k.label}</span>
                          <span className="block font-mono text-[11px] text-muted-foreground/70">{k.phone}</span>
                        </span>
                        <span className={cn('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors', on ? 'border-transparent bg-teal' : 'border-input')}>
                          {on && <Check className="h-3 w-3 text-primary-foreground" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          <button title="Nova conversa" className={cn('grid h-9 w-9 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><ChatCircleDots className="h-5 w-5" /></button>
          <div className="relative">
            <button onClick={() => { setFilterOpen((v) => !v); setConnOpen(false) }} title="Filtros personalizados" className={cn('relative grid h-9 w-9 place-items-center rounded-full', filterOpen || activeCount ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}>
              <Funnel className="h-[18px] w-[18px]" />
              {activeCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-teal px-1 text-[9px] font-bold text-primary-foreground">{activeCount}</span>}
            </button>
            {filterOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} aria-hidden />
                <FilterMenu
                  f={f} setF={setF} toggleF={toggleF} clearF={clearF} activeCount={activeCount}
                  allTags={allTags} panel={wa.panel}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* busca */}
      <div className="shrink-0 px-3 py-2">
        <div className={cn('flex h-9 items-center gap-3 rounded-lg px-3', wa.header)}>
          <MagnifyingGlass className={cn('h-4 w-4', wa.sub)} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar ou começar nova conversa" className={cn('h-full flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[13px]', wa.sub)} />
        </div>
      </div>

      {/* chips */}
      <div className="flex shrink-0 flex-nowrap gap-1 px-3 pb-2">
        {CHIPS.map((c) => (
          <button key={c.key} onClick={() => setChip(c.key)} className={cn('shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-medium transition-colors', chip === c.key ? 'bg-[#0b3d36] text-[#00a884] dark:bg-[#103629] dark:text-[#00d9a3]' : cn(wa.sub, 'bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.07] dark:hover:bg-white/[0.08]'))}>
            {c.label}
          </button>
        ))}
      </div>

      {/* lista */}
      <div className="col-scroll flex-1 overflow-y-auto">
        {list.map((c) => {
          const last = c.messages[c.messages.length - 1]
          const active = c.id === selectedId
          const lead = c.leadId ? getLead(c.leadId) : undefined
          const owner = lead ? OWNERS.find((o) => o.id === lead.ownerId)?.name : undefined
          const sla = slaLevel(c)
          return (
            <button key={c.id} onClick={() => onSelect(c.id)} onContextMenu={(e) => openMenu(e, convMenu(c))} className={cn('flex w-full gap-3 px-3 py-2.5 text-left transition-colors', active ? wa.active : wa.hover)}>
              <span className={cn('relative shrink-0 self-center rounded-full', sla === 'high' ? 'ring-2 ring-rose-500' : sla === 'medium' ? 'ring-2 ring-amber-400' : '')}>
                <Avatar url={c.avatarUrl} name={c.name} />
                {sla && <span className={cn('absolute -bottom-1 -right-1 grid h-4 place-items-center rounded-full px-1 text-[8px] font-bold text-white ring-2 ring-[#111b21]', sla === 'high' ? 'bg-rose-500' : 'bg-amber-500 text-amber-950')} title="Aguardando resposta">{convStamp(c.messages[c.messages.length - 1].day, '')}</span>}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[14.5px] font-semibold text-foreground">{c.name}</span>
                  <span className="flex shrink-0 items-baseline gap-1.5 text-[10.5px] tabular-nums">
                    <span className={wa.sub}>{formatPhone(c.phone)}</span>
                    <span className={cn(c.unread > 0 ? 'font-semibold text-[#00a884]' : wa.sub)}>{last ? convStamp(last.day, last.t) : ''}</span>
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={cn('flex min-w-0 flex-1 items-center gap-1 truncate text-[13px]', wa.sub)}>
                    {last?.fromMe && <Ticks status={last.status} />}
                    {last?.type && mediaIcon(last.type)}
                    <span className="truncate">{last?.text}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {c.muted && <BellSlash className={cn('h-3.5 w-3.5', wa.sub)} />}
                    {c.pinned && <PushPin className={cn('h-3.5 w-3.5', wa.sub)} />}
                    {c.unread > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#00a884] px-1 text-[10px] font-bold text-[#111b21]">{c.unread}</span>}
                  </span>
                </div>
                {lead && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: `hsl(var(${STAGE_COLOR[lead.stage] ?? '--muted-foreground'}))` }} />
                    <span className="shrink-0 font-medium text-foreground/70">{STAGE_CATALOG[lead.stage]?.label ?? '—'}</span>
                    {owner && <span className="truncate uppercase tracking-wide text-muted-foreground/55">· {owner}</span>}
                  </div>
                )}
                {lead?.tags && lead.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {lead.tags.slice(0, 3).map((t) => <TagChip key={t} tag={t} className="px-1 py-0 text-[10px]" />)}
                    {lead.tags.length > 3 && <span className="text-[10px] text-muted-foreground/50">+{lead.tags.length - 3}</span>}
                  </div>
                )}
              </div>
            </button>
          )
        })}
        {list.length === 0 && <p className={cn('px-4 py-10 text-center text-sm', wa.sub)}>Nenhuma conversa.</p>}
      </div>
      <ContextMenu menu={menu} onClose={closeMenu} />
    </aside>
  )
}

/* ============================ THREAD ============================ */
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

function ReactBtn({ onOpen }: { onOpen: () => void }) {
  return <button onClick={onOpen} title="Reagir" className="mb-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/10 group-hover/msg:opacity-100"><Smiley className="h-4 w-4" /></button>
}

function Bubble({ msg, tail, onCtx, replied, onReplyClick, onReact, reactOpen, setReactOpen, highlight, setRef, editing, editText, setEditText, onSaveEdit, onCancelEdit }: {
  msg: WaMsg; tail: boolean; onCtx?: (e: React.MouseEvent) => void
  replied?: WaMsg; onReplyClick: (id: string) => void
  onReact: (msgId: string, emoji: string) => void; reactOpen: boolean; setReactOpen: (v: boolean) => void
  highlight: boolean; setRef: (el: HTMLDivElement | null) => void
  editing: boolean; editText: string; setEditText: (v: string) => void; onSaveEdit: () => void; onCancelEdit: () => void
}) {
  const me = msg.fromMe
  if (msg.deleted) {
    return (
      <div ref={setRef} className={cn('flex px-2', me ? 'justify-end' : 'justify-start')}>
        <div className={cn('inline-flex max-w-[65%] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] italic text-muted-foreground shadow-sm', me ? wa.bubbleOut : wa.bubbleIn)}><Prohibit className="h-3.5 w-3.5" /> Mensagem apagada</div>
      </div>
    )
  }
  const reactions = Object.entries(msg.reactions ?? {}).filter(([, n]) => n > 0)
  return (
    <div ref={setRef} className={cn('group/msg flex items-end gap-1 px-2', me ? 'justify-end' : 'justify-start')}>
      {me && <ReactBtn onOpen={() => setReactOpen(true)} />}
      <div className="relative max-w-[65%]">
        <div onContextMenu={onCtx} className={cn('relative rounded-lg px-2.5 py-1.5 text-[14px] leading-snug shadow-sm transition-all', me ? cn(wa.bubbleOut, 'text-[#111b21] dark:text-[#e9edef]') : cn(wa.bubbleIn, 'text-[#111b21] dark:text-[#e9edef]'), tail && (me ? 'rounded-tr-sm' : 'rounded-tl-sm'), highlight && 'ring-2 ring-teal ring-offset-1 ring-offset-transparent')}>
          {replied && (
            <button onClick={() => onReplyClick(replied.id)} className="mb-1 flex w-full flex-col rounded-md border-l-[3px] border-teal bg-black/10 px-2 py-1 text-left dark:bg-white/[0.06]">
              <span className="text-[11px] font-semibold text-teal">{replied.fromMe ? 'Você' : 'Cliente'}</span>
              <span className="truncate text-[12px] text-muted-foreground">{replied.deleted ? 'Mensagem apagada' : (replied.text || 'Mídia')}</span>
            </button>
          )}
          {editing ? (
            <div className="flex w-64 flex-col gap-1.5">
              <textarea autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit() } else if (e.key === 'Escape') onCancelEdit() }} rows={2} className="w-full resize-none rounded-md border border-teal bg-background/60 px-2 py-1 text-[13.5px] text-foreground outline-none" />
              <div className="flex justify-end gap-1.5 text-[12px]"><button onClick={onCancelEdit} className="rounded px-2 py-0.5 text-muted-foreground hover:bg-foreground/10">Cancelar</button><button onClick={onSaveEdit} className="rounded bg-teal px-2 py-0.5 font-semibold text-primary-foreground">Salvar</button></div>
            </div>
          ) : (
            <>
              <span className="whitespace-pre-wrap break-words">{fmt(msg.text)}</span>
              <span className={cn('float-right ml-2 mt-1.5 flex translate-y-0.5 items-center gap-1 text-[10px]', me ? 'text-[#667781] dark:text-[#aebac1]' : wa.sub)}>
                {msg.starred && <Star className="h-3 w-3 fill-current text-amber-400" />}
                {msg.edited && <span className="italic">editada</span>}
                {msg.t}{me && <Ticks status={msg.status} />}
              </span>
            </>
          )}
          {reactOpen && (
            <>
              <button type="button" className="fixed inset-0 z-40" onClick={() => setReactOpen(false)} aria-hidden />
              <div className={cn('absolute bottom-full z-50 mb-1 flex gap-0.5 rounded-full border border-border dark:border-white/10 p-1', me ? 'right-0' : 'left-0', wa.panel, MENU_SHADOW)}>
                {QUICK_REACTIONS.map((e) => <button key={e} onClick={() => { onReact(msg.id, e); setReactOpen(false) }} className="grid h-8 w-8 place-items-center rounded-full text-[18px] transition-transform hover:scale-125">{e}</button>)}
              </div>
            </>
          )}
        </div>
        {reactions.length > 0 && (
          <div className={cn('-mt-1.5 flex flex-wrap gap-0.5 pl-1', me ? 'justify-end pr-1' : 'justify-start')}>
            {reactions.map(([e, n]) => <button key={e} onClick={() => onReact(msg.id, e)} className={cn('inline-flex items-center gap-0.5 rounded-full border border-border dark:border-white/10 px-1.5 py-px text-[11px] shadow-sm', wa.panel, msg.myReaction === e && 'ring-1 ring-teal')}>{e}{n > 1 && <span className="text-[10px] text-muted-foreground">{n}</span>}</button>)}
          </div>
        )}
      </div>
      {!me && <ReactBtn onOpen={() => setReactOpen(true)} />}
    </div>
  )
}

const randCode = (n: number) => Math.random().toString(36).replace(/[^a-z]/g, '').padEnd(n, 'x').slice(0, n)

function MeetingDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (text: string, dias: number, title: string) => void }) {
  const [title, setTitle] = useState('Reunião')
  const [date, setDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState('30')
  const [guests, setGuests] = useState<string[]>([])
  const [guestInput, setGuestInput] = useState('')
  const inputCls = 'mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-[13.5px] text-foreground outline-none transition-colors focus:border-teal'
  const labelCls = 'block text-[11px] font-medium text-muted-foreground'

  const addGuest = () => {
    const e = guestInput.trim().toLowerCase()
    if (!e) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error('E-mail inválido'); return }
    if (!guests.includes(e)) setGuests((p) => [...p, e])
    setGuestInput('')
  }

  const create = () => {
    if (!title.trim() || !date || !time) { toast.error('Preencha título, data e hora'); return }
    const start = new Date(`${date}T${time}:00`)
    const fmt = `${start.toLocaleDateString('pt-BR')} às ${start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    const meetLink = `https://meet.google.com/${randCode(3)}-${randCode(4)}-${randCode(3)}`
    const guestsLine = guests.length ? `\n👥 ${guests.join(', ')}` : ''
    const text = `📅 *${title.trim()}*\n🕐 ${fmt} (${duration} min)${guestsLine}\n🔗 ${meetLink}`
    const dias = Math.max(0, Math.round((new Date(`${date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000))
    onCreated(text, dias, title.trim())
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <h3 className="flex items-center gap-2 text-[15px] font-bold"><VideoCamera className="h-4 w-4 text-teal" /> Reunião por Google Meet</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">
          <label className="block"><span className={labelCls}>Título</span><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className={labelCls}>Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></label>
            <label className="block"><span className={labelCls}>Hora</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} /></label>
          </div>
          <label className="block"><span className={labelCls}>Duração (min)</span><input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(e.target.value)} className={cn(inputCls, 'font-mono')} /></label>
          <div>
            <span className={labelCls}>Convidados (e-mail)</span>
            {guests.length > 0 && (
              <div className="mb-1.5 mt-1 flex flex-wrap gap-1.5">
                {guests.map((g) => (
                  <span key={g} className="inline-flex items-center gap-1 rounded-md bg-foreground/[0.06] py-0.5 pl-2 pr-1 text-[12px] text-foreground">{g}<button onClick={() => setGuests((p) => p.filter((x) => x !== g))} className="grid h-4 w-4 place-items-center rounded text-muted-foreground transition-colors hover:text-danger"><X className="h-3 w-3" /></button></span>
                ))}
              </div>
            )}
            <input value={guestInput} onChange={(e) => setGuestInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addGuest() } }} onBlur={addGuest} type="email" placeholder="convidado@email.com" className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/40 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/60">Cancelar</button>
          <button onClick={create} className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110"><VideoCamera className="h-4 w-4" /> Criar e enviar link</button>
        </div>
      </div>
    </div>
  )
}

function ChatThread({ conv, convs, onSend, onPatchMsg, onReact, onForward, onUpdateConv, onBack, onTogglePanel, panelOpen }: {
  conv: WaConv; convs: WaConv[]
  onSend: (t: string, opts?: Partial<WaMsg>) => void
  onPatchMsg: (msgId: string, patch: Partial<WaMsg>) => void
  onReact: (msgId: string, emoji: string) => void
  onForward: (text: string, targetIds: string[]) => void
  onUpdateConv: (id: string, patch: Partial<WaConv>) => void
  onBack: () => void; onTogglePanel: () => void; panelOpen: boolean
}) {
  const { moveStage, getLead, saveLead } = useLeads()
  const { createProcess } = useImplantacao()
  const { menu: bubMenu, open: openBub, close: closeBub } = useContextMenu()
  const lead = conv.leadId ? getLead(conv.leadId) : undefined
  const mark = (stage: 'ganho' | 'perdido') => { if (conv.leadId) { moveStage(conv.leadId, stage); toast.success(stage === 'ganho' ? `${conv.name} marcado como Ganho 🎉` : `${conv.name} marcado como Perdido`) } }
  const [ganhaOpen, setGanhaOpen] = useState(false)
  const [processando, setProcessando] = useState<VendaGanhaData | null>(null)
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [attachOpen, setAttachOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [replyTo, setReplyTo] = useState<WaMsg | null>(null)
  const [editing, setEditing] = useState<WaMsg | null>(null)
  const [editText, setEditText] = useState('')
  const [forwardMsg, setForwardMsg] = useState<WaMsg | null>(null)
  const [fwdTargets, setFwdTargets] = useState<string[]>([])
  const [hdrMenuOpen, setHdrMenuOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [frioOpen, setFrioOpen] = useState(false)
  const [reactFor, setReactFor] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({})
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [conv.id, conv.messages.length])
  useEffect(() => { setReplyTo(null); setEditing(null) }, [conv.id])

  const scrollToMsg = (id: string) => { const el = msgRefs.current[id]; if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setHighlightId(id); setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 2000) } }
  const msgById = (id?: string) => conv.messages.find((m) => m.id === id)

  const bubbleMenu = (msg: WaMsg): MenuItem[] => [
    { label: 'Responder', icon: ArrowBendUpLeft, onClick: () => setReplyTo(msg) },
    { label: 'Copiar', icon: Copy, onClick: () => { navigator.clipboard?.writeText(msg.text); toast.success('Mensagem copiada') } },
    { label: 'Encaminhar', icon: ArrowBendUpRight, onClick: () => setForwardMsg(msg) },
    ...(msg.fromMe ? [{ label: 'Editar', icon: PencilSimple, onClick: () => { setEditing(msg); setEditText(msg.text) } }] : []),
    { label: 'Perguntar à X IA', icon: Sparkle, onClick: () => toast('Perguntando à X IA — em breve') },
    { label: msg.starred ? 'Desfavoritar' : 'Favoritar', icon: Star, onClick: () => onPatchMsg(msg.id, { starred: !msg.starred }) },
    { divider: true, label: '' },
    { label: 'Apagar', icon: Trash, danger: true, onClick: () => onPatchMsg(msg.id, { deleted: true }) },
  ]

  const transfer = (ownerId: string) => { const l = conv.leadId ? getLead(conv.leadId) : undefined; if (l) { saveLead({ ...l, ownerId }); toast.success(`Transferido para ${OWNERS.find((o) => o.id === ownerId)?.name}`) } setTransferOpen(false); setHdrMenuOpen(false) }
  const setFrio = (dias: number) => { onUpdateConv(conv.id, { cold: true, coldCadence: dias }); toast.success(`Cliente frio · recontato a cada ${dias} dias`); setFrioOpen(false); setHdrMenuOpen(false) }

  // agrupa por dia
  const groups: { day: string; msgs: WaMsg[] }[] = []
  for (const msg of conv.messages) {
    const g = groups[groups.length - 1]
    if (g && g.day === msg.day) g.msgs.push(msg)
    else groups.push({ day: msg.day, msgs: [msg] })
  }

  const send = () => { const t = draft.trim(); if (!t) return; onSend(t, replyTo ? { replyToId: replyTo.id } : {}); setDraft(''); setReplyTo(null) }
  const saveEdit = () => { if (editing) { const t = editText.trim(); onPatchMsg(editing.id, { text: t || editing.text, edited: true }); setEditing(null) } }

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      {/* header */}
      <div className={cn('flex h-14 shrink-0 items-center gap-3 px-3', wa.header)}>
        <button onClick={onBack} className={cn('grid h-9 w-9 place-items-center rounded-full lg:hidden', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><ArrowLeft className="h-5 w-5" /></button>
        <button onClick={onTogglePanel} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Avatar url={conv.avatarUrl} name={conv.name} size="h-10 w-10" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-foreground">{conv.name}</p>
            <p className={cn('truncate text-[12px]', conv.online ? 'text-[#00a884]' : wa.sub)}>{conv.online ? 'online' : `visto por último ${conv.lastSeen ?? ''}`}</p>
          </div>
        </button>
        {conv.leadId && (
          <div className="hidden shrink-0 items-center gap-1.5 md:flex">
            <button onClick={() => setGanhaOpen(true)} title="Marcar venda ganha" className="rounded-md bg-emerald-600 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:brightness-110">Ganho</button>
            <button onClick={() => mark('perdido')} title="Marcar venda perdida" className="rounded-md bg-rose-600 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:brightness-110">Perdido</button>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => setMeetingOpen(true)} title="Agendar reunião" className={cn('grid h-9 w-9 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><CalendarPlus className="h-[18px] w-[18px]" /></button>
          <button onClick={() => { onUpdateConv(conv.id, { aiOn: !conv.aiOn }); toast(conv.aiOn ? 'X IA pausada nesta conversa' : 'X IA reativada') }} title={conv.aiOn ? 'Pausar X IA' : 'Reativar X IA'} className={cn('grid h-9 w-9 place-items-center rounded-full transition-colors', conv.aiOn ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}>{conv.aiOn ? <Robot className="h-[19px] w-[19px]" weight="fill" /> : <Robot className="h-[19px] w-[19px]" />}</button>
          <button title="Ligar" className={cn('grid h-9 w-9 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Phone className="h-[18px] w-[18px]" /></button>
          <div className="relative">
            <button onClick={() => setHdrMenuOpen((v) => !v)} title="Mais" className={cn('grid h-9 w-9 place-items-center rounded-full', hdrMenuOpen ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><DotsThree className="h-5 w-5" /></button>
            {hdrMenuOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" onClick={() => setHdrMenuOpen(false)} aria-hidden />
                <div className={cn('absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border dark:border-white/10 p-1', wa.panel, MENU_SHADOW)}>
                  {conv.leadId && <button onClick={() => { setTransferOpen(true); setHdrMenuOpen(false) }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] text-foreground transition-colors hover:bg-foreground/[0.06]"><ArrowsLeftRight className="h-4 w-4 text-teal" /> Transferir atendimento</button>}
                  <button onClick={() => { setFrioOpen(true); setHdrMenuOpen(false) }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] text-foreground transition-colors hover:bg-foreground/[0.06]"><Snowflake className="h-4 w-4 text-teal" /> Marcar cliente frio</button>
                  <button onClick={() => { toast('Conversa enviada como exemplo p/ treinar a X IA'); setHdrMenuOpen(false) }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] text-foreground transition-colors hover:bg-foreground/[0.06]"><GraduationCap className="h-4 w-4 text-teal" /> Ensinar X IA</button>
                </div>
              </>
            )}
          </div>
          <button title="Painel do lead" onClick={onTogglePanel} className={cn('grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10', panelOpen ? 'text-teal' : wa.sub)}><Info className="h-[18px] w-[18px]" /></button>
        </div>
      </div>

      {/* mensagens */}
      <div className={cn('col-scroll relative flex-1 overflow-y-auto py-4', wa.wall)} style={{ backgroundImage: DOODLE }}>
        <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
          {conv.aiOn && (
            <div className="sticky top-0 z-10 mx-auto mb-1.5 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/90 px-3 py-1 text-[11.5px] font-semibold text-primary-foreground shadow-md ring-1 ring-white/10 backdrop-blur-sm"><Sparkle className="h-3 w-3" /> X IA ativa nesta conversa</span>
            </div>
          )}
          <div className="mx-auto mb-2 flex items-center gap-1.5 rounded-lg bg-[#fdf4c5] px-3 py-1.5 text-center text-[11.5px] text-[#54656f] shadow-sm dark:bg-[#182229] dark:text-[#8696a0]">
            <Lock className="h-3 w-3" /> As mensagens são protegidas com criptografia de ponta a ponta.
          </div>
          {groups.map((g) => (
            <div key={g.day} className="flex flex-col gap-1.5">
              <div className="my-1.5 flex justify-center">
                <span className="rounded-lg bg-white px-3 py-1 text-[11px] font-medium uppercase text-[#54656f] shadow-sm dark:bg-[#182229] dark:text-[#8696a0]">{g.day}</span>
              </div>
              {g.msgs.map((msg, i) => (
                <Bubble
                  key={msg.id} msg={msg}
                  tail={i === 0 || g.msgs[i - 1].fromMe !== msg.fromMe}
                  onCtx={(e) => openBub(e, bubbleMenu(msg))}
                  replied={msgById(msg.replyToId)}
                  onReplyClick={scrollToMsg}
                  onReact={onReact}
                  reactOpen={reactFor === msg.id}
                  setReactOpen={(v) => setReactFor(v ? msg.id : null)}
                  highlight={highlightId === msg.id}
                  setRef={(el) => { msgRefs.current[msg.id] = el }}
                  editing={editing?.id === msg.id}
                  editText={editText}
                  setEditText={setEditText}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditing(null)}
                />
              ))}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* input — pill flutuante sobre o wallpaper (estilo WhatsApp) */}
      <div className={cn('shrink-0 px-4 pb-3 pt-1', wa.wall)} style={{ backgroundImage: DOODLE }}>
        {replyTo && (
          <div className="mb-1.5 flex items-center gap-2 rounded-lg border-l-[3px] border-teal bg-black/10 px-2.5 py-1.5 dark:bg-white/[0.06]">
            <ArrowBendUpLeft className="h-4 w-4 shrink-0 text-teal" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-teal">{replyTo.fromMe ? 'Você' : conv.name}</p>
              <p className="truncate text-[12px] text-muted-foreground">{replyTo.text || 'Mídia'}</p>
            </div>
            <button onClick={() => setReplyTo(null)} title="Cancelar" className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          {/* + anexos */}
          <div className="relative shrink-0">
            <button onClick={() => { setAttachOpen((v) => !v); setQuickOpen(false) }} title="Anexar" className={cn('grid h-11 w-11 place-items-center rounded-full transition-colors', attachOpen ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}>
              <Plus className={cn('h-6 w-6 transition-transform', attachOpen && 'rotate-45')} />
            </button>
            {attachOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" onClick={() => setAttachOpen(false)} aria-hidden />
                <div className={cn('absolute bottom-full left-0 z-50 mb-2 w-52 overflow-hidden rounded-xl border border-border dark:border-white/10 p-1', wa.panel, MENU_SHADOW)}>
                  {ATTACH.map((a) => (
                    <button key={a.label} onClick={() => { toast(`${a.label} — em breve`); setAttachOpen(false) }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] text-foreground transition-colors hover:bg-foreground/[0.06]">
                      <a.icon className="h-[18px] w-[18px] text-teal" /> {a.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* pill */}
          <div className={cn('flex flex-1 items-end gap-0.5 rounded-[26px] px-2 py-1 shadow-sm', wa.field)}>
            <div className="relative shrink-0">
              <button onClick={() => { setEmojiOpen((v) => !v); setQuickOpen(false); setAttachOpen(false) }} title="Emoji" className={cn('grid h-9 w-9 place-items-center rounded-full', emojiOpen ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Smiley className="h-[22px] w-[22px]" /></button>
              {emojiOpen && (
                <>
                  <button type="button" className="fixed inset-0 z-40" onClick={() => setEmojiOpen(false)} aria-hidden />
                  <div className={cn('absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-border dark:border-white/10 p-2', wa.panel, MENU_SHADOW)}>
                    <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto">
                      {EMOJIS.map((e, i) => (
                        <button key={i} onClick={() => setDraft((d) => d + e)} className="grid h-8 w-8 place-items-center rounded-md text-[19px] leading-none transition-colors hover:bg-foreground/[0.08]">{e}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <textarea
              value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} placeholder="Digite uma mensagem"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              className={cn('max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-2 text-[14px] outline-none placeholder:text-[13.5px]', wa.sub, 'text-foreground')}
            />
            {/* raio — mensagens rápidas */}
            <div className="relative shrink-0">
              <button onClick={() => { setQuickOpen((v) => !v); setAttachOpen(false) }} title="Mensagens rápidas" className={cn('grid h-9 w-9 place-items-center rounded-full', quickOpen ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Lightning className="h-[19px] w-[19px]" /></button>
              {quickOpen && (
                <>
                  <button type="button" className="fixed inset-0 z-40" onClick={() => setQuickOpen(false)} aria-hidden />
                  <div className={cn('absolute bottom-full right-0 z-50 mb-2 w-72 overflow-hidden rounded-xl border border-border dark:border-white/10 p-1', wa.panel, MENU_SHADOW)}>
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Mensagens rápidas</p>
                    {QUICK_MSGS.map((q, i) => (
                      <button key={i} onClick={() => { setDraft(q); setQuickOpen(false) }} className="flex w-full rounded-lg px-3 py-2 text-left text-[12.5px] leading-snug text-foreground/90 transition-colors hover:bg-foreground/[0.06]">{q}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* enviar / áudio */}
          {draft.trim()
            ? <button onClick={send} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#00a884] text-[#111b21] shadow-sm transition hover:brightness-110"><PaperPlaneRight className="h-5 w-5" /></button>
            : <button title="Áudio" className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Microphone className="h-6 w-6" /></button>}
        </div>
      </div>
      <ContextMenu menu={bubMenu} onClose={closeBub} />

      {/* encaminhar */}
      {forwardMsg && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setForwardMsg(null)} />
          <div className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
              <h3 className="flex items-center gap-2 text-[15px] font-bold"><ArrowBendUpRight className="h-4 w-4 text-teal" /> Encaminhar</h3>
              <button onClick={() => setForwardMsg(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <p className="truncate border-b border-border/40 px-5 py-2 text-[12px] text-muted-foreground">“{forwardMsg.text || 'Mídia'}”</p>
            <div className="flex-1 overflow-y-auto p-2">
              {convs.filter((c) => c.id !== conv.id).map((c) => {
                const on = fwdTargets.includes(c.id)
                return (
                  <button key={c.id} onClick={() => setFwdTargets((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-foreground/[0.05]">
                    <Avatar url={c.avatarUrl} name={c.name} size="h-9 w-9" />
                    <span className="flex-1 truncate text-[13.5px] font-medium text-foreground">{c.name}</span>
                    <span className={cn('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px]', on ? 'border-transparent bg-teal' : 'border-input')}>{on && <Check className="h-3 w-3 text-primary-foreground" />}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end gap-2 border-t border-border/40 px-5 py-3">
              <button onClick={() => setForwardMsg(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/60">Cancelar</button>
              <button disabled={!fwdTargets.length} onClick={() => { onForward(forwardMsg.text, fwdTargets); setForwardMsg(null); setFwdTargets([]) }} className="rounded-lg bg-teal px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-40">Encaminhar ({fwdTargets.length})</button>
            </div>
          </div>
        </div>
      )}

      {/* agendar reunião (Google Meet) */}
      {meetingOpen && (
        <MeetingDialog
          onClose={() => setMeetingOpen(false)}
          onCreated={(text, dias, title) => { onSend(text); if (lead) saveLead({ ...lead, followupInDays: dias, proximaAcao: title }); setMeetingOpen(false); toast.success('Reunião criada e link enviado') }}
        />
      )}

      {/* venda ganha */}
      {ganhaOpen && lead && (
        <VendaGanhaModal
          lead={lead}
          onClose={() => setGanhaOpen(false)}
          onConfirm={(d) => { setGanhaOpen(false); setProcessando(d) }}
        />
      )}

      {/* processamento da venda: X girando + barra + confete */}
      {processando && lead && (
        <VendaProcessando
          leadName={lead.name}
          onDone={() => {
            const d = processando
            saveLead({ ...lead, operadora: d.operadora || '—', plano: d.plano || '—', vidas: d.vidas, value: d.valorMensal, contexto: d.observacoes, lives: d.lives.length ? d.lives.map((l) => ({ name: l.name, age: l.age ?? 0, rel: l.rel })) : lead.lives })
            moveStage(lead.id, 'ganho')
            createProcess({ leadId: lead.id, leadName: lead.name, ...d })
            setProcessando(null)
            toast.success('Venda registrada · processo de implantação criado 🎉')
          }}
        />
      )}

      {/* transferir atendimento */}
      {transferOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTransferOpen(false)} />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/40 bg-card p-5 shadow-2xl">
            <h3 className="mb-1 flex items-center gap-2 text-[15px] font-bold"><ArrowsLeftRight className="h-4 w-4 text-teal" /> Transferir atendimento</h3>
            <p className="mb-3 text-[12.5px] text-muted-foreground">Escolha o vendedor que assume {conv.name}.</p>
            <div className="flex flex-col gap-1">
              {OWNERS.map((o) => (
                <button key={o.id} onClick={() => transfer(o.id)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-foreground/[0.06]">
                  <img src={o.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  <span className="text-[13.5px] font-medium text-foreground">{o.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* cliente frio */}
      {frioOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFrioOpen(false)} />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/40 bg-card p-5 shadow-2xl">
            <h3 className="mb-1 flex items-center gap-2 text-[15px] font-bold"><Snowflake className="h-4 w-4 text-teal" /> Cliente frio</h3>
            <p className="mb-3 text-[12.5px] text-muted-foreground">Cadência de recontato automático para nutrir o lead.</p>
            <div className="grid grid-cols-2 gap-2">
              {[30, 60, 90, 120].map((d) => (
                <button key={d} onClick={() => setFrio(d)} className="rounded-lg border border-border/60 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-teal hover:bg-teal/[0.06]">a cada {d} dias</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/* ============================ PAINEL DO LEAD (refinado) ============================ */
function PanelSection({ icon: Icon, title, children, defaultOpen = true, handle }: { icon: typeof Heartbeat; title: string; children: ReactNode; defaultOpen?: boolean; handle?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="px-5 py-4">
      <div className={cn('group/sec flex items-center gap-1', open && 'mb-3')}>
        {handle}
        <button onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-2 text-left">
          <Icon className="h-3.5 w-3.5 shrink-0 text-teal" />
          <span className="flex-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-foreground/85">{title}</span>
          <CaretDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform', !open && '-rotate-90')} />
        </button>
      </div>
      {open && children}
    </section>
  )
}

type SectionKey = 'comercial' | 'custom' | 'xia'

function SortableSection({ id, children }: { id: SectionKey; children: (hp: { attributes: DraggableAttributes; listeners: ReturnType<typeof useSortable>['listeners'] }) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('border-t border-border/40', isDragging && 'relative z-10 bg-card opacity-80')}>
      {children({ attributes, listeners })}
    </div>
  )
}
/** linha editável: rótulo à esquerda, editor inline à direita */
function ERow({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[30px] items-center justify-between gap-3 py-0.5">
      <span className="shrink-0 text-[12.5px] text-muted-foreground">{k}</span>
      <div className="flex min-w-0 justify-end">{children}</div>
    </div>
  )
}

function LeadPanel({ conv, onClose }: { conv: WaConv; onClose: () => void }) {
  const { getLead, openDetail, saveLead, moveStage, leads } = useLeads()
  const allTags = [...new Set(leads.flatMap((l) => l.tags ?? []))]
  const { fields: customFields } = useCustomFields()
  const [manageOpen, setManageOpen] = useState(false)
  const [order, setOrder] = useState<SectionKey[]>(['comercial', 'custom', 'xia'])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const onSectionDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) setOrder((p) => arrayMove(p, p.indexOf(active.id as SectionKey), p.indexOf(over.id as SectionKey)))
  }
  const lead = getLead(conv.leadId)
  const patch = (p: Partial<Lead>) => { if (lead) saveLead({ ...lead, ...p }) }

  const renderSection = (k: SectionKey, hp: { attributes: DraggableAttributes; listeners: ReturnType<typeof useSortable>['listeners'] }) => {
    if (!lead) return null
    const grip = <button {...hp.attributes} {...hp.listeners} className="grid h-5 w-5 shrink-0 cursor-grab touch-none place-items-center rounded text-muted-foreground/25 transition-colors hover:text-muted-foreground active:cursor-grabbing" title="Arrastar para reordenar"><DotsSixVertical className="h-3.5 w-3.5" /></button>
    switch (k) {
      case 'comercial': return (
        <PanelSection icon={Wallet} title="Comercial" handle={grip}>
          <ERow k="Etapa"><StageCell lead={lead} onPick={(s) => { moveStage(lead.id, s); toast.success(`Etapa: ${STAGE_CATALOG[s]?.label ?? s}`) }} /></ERow>
          <ERow k="Funil"><PipelineCell value={lead.pipelineId ?? 'p-comercial'} onPick={(id) => { patch({ pipelineId: id }); toast.success(`Funil: ${PIPELINES.find((p) => p.id === id)?.name ?? ''}`) }} /></ERow>
          <ERow k="Origem"><InlineText value={lead.source ?? ''} onCommit={(v) => patch({ source: v.trim() || null })} /></ERow>
          <ERow k="Responsável"><OwnerCell lead={lead} onPick={(id) => patch({ ownerId: id })} /></ERow>
          <ERow k="Próximo retorno"><FollowupInlineCell lead={lead} onPick={(d) => patch({ followupInDays: d })} /></ERow>
          <div className="mt-2.5">
            <p className="mb-1.5 text-[12px] text-muted-foreground">Etiquetas</p>
            <TagsEditor tags={lead.tags ?? []} onChange={(t) => patch({ tags: t })} suggestions={allTags} />
          </div>
        </PanelSection>
      )
      case 'custom': return (
        <PanelSection icon={SlidersHorizontal} title="Personalizados" handle={grip}>
          {customFields.length > 0 ? customFields.map((f) => (
            <ERow key={f.id} k={f.label}><CustomFieldInline field={f} value={lead.custom?.[f.id]} onChange={(v) => patch({ custom: { ...(lead.custom ?? {}), [f.id]: v } })} /></ERow>
          )) : <p className="text-[12.5px] text-muted-foreground/60">Nenhum campo ainda.</p>}
          <button onClick={() => setManageOpen(true)} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-teal transition hover:brightness-110"><SlidersHorizontal className="h-3.5 w-3.5" /> Gerenciar campos</button>
        </PanelSection>
      )
      case 'xia': return (
        <PanelSection icon={Sparkle} title="Resumo X IA" handle={grip}>
          <XiaSummary lead={lead} />
        </PanelSection>
      )
    }
  }

  return (
    <aside className={cn('flex w-[340px] shrink-0 flex-col overflow-hidden border-l', wa.panel, wa.border)}>
      {/* topo */}
      <div className={cn('flex h-14 shrink-0 items-center gap-3 px-4', wa.header)}>
        <button onClick={onClose} className={cn('grid h-9 w-9 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><X className="h-5 w-5" /></button>
        <span className="text-[15px] font-bold">Dados do lead</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* identidade */}
        <div className="flex flex-col items-center gap-2 px-5 pb-2 pt-6 text-center">
          <Avatar url={conv.avatarUrl} name={conv.name} size="h-24 w-24" />
          <h3 className="mt-1 text-[19px] font-bold tracking-tight">{conv.name}</h3>
          <p className="font-mono text-[13px] text-muted-foreground">{formatPhone(conv.phone)}</p>
          {lead && (
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `hsl(var(${STAGE_COLOR[lead.stage] ?? '--muted-foreground'}))` }} />
                {STAGE_CATALOG[lead.stage]?.label ?? '—'}
              </span>
              {STAGE_CATALOG[lead.stage]?.kind === 'open' && <StatusDot s={lifecycleOf(lead)} />}
              <TierPill t={lead.tier} />
            </div>
          )}
        </div>

        {/* ações rápidas (compactas) */}
        {lead && (
          <div className="px-5 pb-2 pt-2.5">
            <button onClick={() => openDetail(lead.id)} className="w-full rounded-lg bg-teal py-2.5 text-[13px] font-bold text-primary-foreground transition hover:brightness-110">
              Ver lead completo
            </button>
          </div>
        )}

        {lead ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              {order.map((k) => <SortableSection key={k} id={k}>{(hp) => renderSection(k, hp)}</SortableSection>)}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-[13px] text-muted-foreground">Esta conversa ainda não está vinculada a um lead.</p>
            <button onClick={() => toast('Criar lead a partir da conversa — em breve')} className="rounded-lg bg-teal px-4 py-2 text-[13px] font-bold text-primary-foreground transition hover:brightness-110">Criar lead</button>
          </div>
        )}
      </div>
      {manageOpen && <ManageFieldsModal onClose={() => setManageOpen(false)} />}
    </aside>
  )
}

/* ============================ PÁGINA ============================ */
export default function Whatsapp() {
  const { getLead, saveLead } = useLeads()
  const [convs, setConvs] = useState<WaConv[]>(WA_CONVERSATIONS)
  const [selectedId, setSelectedId] = useState(WA_CONVERSATIONS[0].id)
  const [panelOpen, setPanelOpen] = useState(true)
  const [guardTarget, setGuardTarget] = useState<string | null>(null)
  const conv = convs.find((c) => c.id === selectedId)!

  const doSelect = (id: string) => { setSelectedId(id); setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))) }
  const needsReturn = (c: WaConv) => { const l = c.leadId ? getLead(c.leadId) : undefined; return !!l && ['proposta', 'negociacao'].includes(l.stage) && l.followupInDays == null }
  const select = (id: string) => { if (id !== selectedId && needsReturn(conv)) setGuardTarget(id); else doSelect(id) }
  const setGuardReturn = (dias: number | null) => { const l = conv.leadId ? getLead(conv.leadId) : undefined; if (l && dias != null) saveLead({ ...l, followupInDays: dias }); if (guardTarget) doSelect(guardTarget); setGuardTarget(null) }
  const updateConv = (id: string, patch: Partial<WaConv>) => setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const send = (text: string, opts: Partial<WaMsg> = {}) => {
    const id = `m-${Date.now()}`
    const msg: WaMsg = { id, fromMe: true, text, t: nowHM(), day: 'Hoje', status: 'sent', ...opts }
    setConvs((prev) => prev.map((c) => (c.id === selectedId ? { ...c, messages: [...c.messages, msg], unread: 0 } : c)))
    const setStatus = (s: WaMsg['status']) => setConvs((prev) => prev.map((c) => c.id === selectedId ? { ...c, messages: c.messages.map((mm) => (mm.id === id ? { ...mm, status: s } : mm)) } : c))
    setTimeout(() => setStatus('delivered'), 700)
    setTimeout(() => setStatus('read'), 1800)
  }
  const patchMsg = (msgId: string, patch: Partial<WaMsg>) => setConvs((prev) => prev.map((c) => c.id === selectedId ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) } : c))
  const react = (msgId: string, emoji: string) => setConvs((prev) => prev.map((c) => {
    if (c.id !== selectedId) return c
    return { ...c, messages: c.messages.map((m) => {
      if (m.id !== msgId) return m
      const r: Record<string, number> = { ...(m.reactions ?? {}) }
      const mine = m.myReaction
      if (mine) { r[mine] = (r[mine] ?? 1) - 1; if (r[mine] <= 0) delete r[mine] }
      let my: string | undefined
      if (mine !== emoji) { r[emoji] = (r[emoji] ?? 0) + 1; my = emoji }
      return { ...m, reactions: r, myReaction: my }
    }) }
  }))
  const forward = (text: string, targetIds: string[]) => {
    setConvs((prev) => prev.map((c) => targetIds.includes(c.id)
      ? { ...c, messages: [...c.messages, { id: `m-${Date.now()}-${c.id}`, fromMe: true, text, t: nowHM(), day: 'Hoje', status: 'sent' as const }] }
      : c))
    toast.success(`Encaminhada para ${targetIds.length} conversa${targetIds.length > 1 ? 's' : ''}`)
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <ConversationList convs={convs} selectedId={selectedId} onSelect={select} onUpdate={updateConv} />
      <ChatThread conv={conv} convs={convs} onSend={send} onPatchMsg={patchMsg} onReact={react} onForward={forward} onUpdateConv={updateConv} onBack={() => {}} onTogglePanel={() => setPanelOpen((v) => !v)} panelOpen={panelOpen} />
      {panelOpen && <LeadPanel conv={conv} onClose={() => setPanelOpen(false)} />}
      {guardTarget && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/40 bg-card p-5 shadow-2xl">
            <h3 className="mb-1 flex items-center gap-2 text-[15px] font-bold"><Alarm className="h-4 w-4 text-teal" /> Defina o próximo retorno</h3>
            <p className="mb-3.5 text-[12.5px] text-muted-foreground">{conv.name} está em etapa quente. Agende o retorno antes de sair da conversa.</p>
            <div className="grid grid-cols-2 gap-2">
              {[{ d: 0, l: 'Hoje' }, { d: 1, l: 'Amanhã' }, { d: 3, l: 'Em 3 dias' }, { d: 7, l: 'Em 1 semana' }].map((o) => (
                <button key={o.l} onClick={() => setGuardReturn(o.d)} className="rounded-lg border border-border/60 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-teal hover:bg-teal/[0.06]">{o.l}</button>
              ))}
            </div>
            <button onClick={() => setGuardReturn(null)} className="mt-3 w-full text-center text-[12px] text-muted-foreground/70 transition-colors hover:text-muted-foreground">Agora não</button>
          </div>
        </div>
      )}
    </div>
  )
}
