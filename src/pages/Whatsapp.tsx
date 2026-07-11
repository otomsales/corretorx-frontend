import { useMemo, useRef, useState, useEffect, type ReactNode } from 'react'
import {
  Search, MoreVertical, MessageSquarePlus, Check, CheckCheck, Pin, BellOff, Smile,
  Mic, SendHorizontal, ArrowLeft, Phone, X, Sparkles, CalendarPlus, Plus, Zap, Camera,
  FileText, Image as ImageIcon, AudioLines, Lock, Star, HeartPulse, Wallet, ChevronDown, SlidersHorizontal, GripVertical,
  Archive, Trash2, Copy, Reply, Forward, Info, ListChecks, Filter, Smartphone,
} from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { brl, formatPhone, initials, pickAvatar } from '@/lib/format'
import { STAGE_CATALOG, PIPELINES, OWNERS, lifecycleOf, type Lead } from '@/lib/funil-data'
import { useLeads } from '@/store/leads'
import { TierPill, StatusDot } from '@/components/leads/LeadBadges'
import { StageCell, OwnerCell, FollowupInlineCell, PipelineCell, InlineText, money } from '@/components/leads/InlineCell'
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
  return <CheckCheck className={cn('h-3.5 w-3.5 shrink-0', status === 'read' ? 'text-[#53bdeb]' : 'opacity-60')} />
}

const mediaIcon = (t?: WaMsg['type']) =>
  t === 'image' ? <ImageIcon className="h-3.5 w-3.5" /> : t === 'audio' ? <AudioLines className="h-3.5 w-3.5" /> : t === 'doc' ? <FileText className="h-3.5 w-3.5" /> : null

/** Stamp da lista (estilo WhatsApp): hoje→hora, ontem→"Ontem", antes→dia/data. */
const convStamp = (day: string, t: string) => {
  const d = day.trim().toLowerCase()
  return d === 'hoje' ? t : d === 'ontem' ? 'Ontem' : day
}

const MENU_SHADOW = 'shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]'
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

function FGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-border/40 py-2.5 first:border-0 first:pt-0.5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground/55">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
function FPill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors', on ? 'bg-teal text-primary-foreground shadow-sm' : 'bg-foreground/[0.04] text-muted-foreground ring-1 ring-inset ring-border/50 hover:bg-foreground/[0.08] hover:text-foreground')}>
      {on && <Check className="h-3 w-3 shrink-0" strokeWidth={3} />}{children}
    </button>
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
  const [activeConn, setActiveConn] = useState(CONNECTIONS[0].id)
  const [f, setF] = useState<{ tags: string[]; owners: string[]; tiers: string[]; stages: string[]; ai: 'all' | 'on' | 'off' }>({ tags: [], owners: [], tiers: [], stages: [], ai: 'all' })
  const allTags = [...new Set(leads.flatMap((l) => l.tags ?? []))]
  const activeCount = f.tags.length + f.owners.length + f.tiers.length + f.stages.length + (f.ai !== 'all' ? 1 : 0)
  const toggleF = (k: 'tags' | 'owners' | 'tiers' | 'stages', v: string) => setF((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }))
  const clearF = () => setF({ tags: [], owners: [], tiers: [], stages: [], ai: 'all' })

  const convMenu = (c: WaConv): MenuItem[] => [
    { label: c.pinned ? 'Desafixar' : 'Fixar', icon: Pin, onClick: () => onUpdate(c.id, { pinned: !c.pinned }) },
    { label: c.unread > 0 ? 'Marcar como lida' : 'Marcar como não lida', icon: CheckCheck, onClick: () => onUpdate(c.id, { unread: c.unread > 0 ? 0 : 1 }) },
    { label: c.muted ? 'Reativar notificações' : 'Silenciar', icon: BellOff, onClick: () => onUpdate(c.id, { muted: !c.muted }) },
    { label: c.favorite ? 'Remover dos favoritos' : 'Favoritar', icon: Star, onClick: () => onUpdate(c.id, { favorite: !c.favorite }) },
    { divider: true, label: '' },
    { label: c.archived ? 'Desarquivar conversa' : 'Arquivar conversa', icon: Archive, onClick: () => onUpdate(c.id, { archived: !c.archived }) },
    { label: 'Apagar conversa', icon: Trash2, danger: true, onClick: () => toast('Conversa apagada') },
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
            <button onClick={() => { setConnOpen((v) => !v); setFilterOpen(false) }} title="Número conectado" className={cn('grid h-9 w-9 place-items-center rounded-full', connOpen ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Smartphone className="h-[18px] w-[18px]" /></button>
            {connOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" onClick={() => setConnOpen(false)} aria-hidden />
                <div className={cn('absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-white/10 p-1', wa.panel, MENU_SHADOW)}>
                  <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Número conectado</p>
                  {CONNECTIONS.map((k) => (
                    <button key={k.id} onClick={() => { setActiveConn(k.id); setConnOpen(false); toast(`Número: ${k.label}`) }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-foreground/[0.06]">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal/12 text-teal ring-1 ring-inset ring-teal/15"><Smartphone className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-foreground">{k.label}</span>
                        <span className="block font-mono text-[11px] text-muted-foreground">{k.phone}</span>
                      </span>
                      {activeConn === k.id && <Check className="h-4 w-4 shrink-0 text-teal" strokeWidth={2.5} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button title="Nova conversa" className={cn('grid h-9 w-9 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><MessageSquarePlus className="h-5 w-5" /></button>
          <div className="relative">
            <button onClick={() => { setFilterOpen((v) => !v); setConnOpen(false) }} title="Filtros personalizados" className={cn('relative grid h-9 w-9 place-items-center rounded-full', filterOpen || activeCount ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}>
              <Filter className="h-[18px] w-[18px]" />
              {activeCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-teal px-1 text-[9px] font-bold text-primary-foreground">{activeCount}</span>}
            </button>
            {filterOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} aria-hidden />
                <div className={cn('absolute right-0 top-full z-50 mt-2 max-h-[74vh] w-[288px] overflow-auto rounded-xl border border-white/10 p-3', wa.panel, MENU_SHADOW)}>
                  <div className="mb-1 flex items-center justify-between border-b border-border/40 pb-2.5">
                    <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-foreground/80"><Filter className="h-3.5 w-3.5 text-teal" /> Filtros</span>
                    {activeCount > 0 && <button onClick={clearF} className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-teal transition-colors hover:bg-teal/10">Limpar ({activeCount})</button>}
                  </div>
                  <FGroup title="Atendimento IA">
                    {([['all', 'Todas'], ['on', 'Com IA'], ['off', 'Sem IA']] as const).map(([v, l]) => (
                      <FPill key={v} on={f.ai === v} onClick={() => setF((p) => ({ ...p, ai: v }))}>{l}</FPill>
                    ))}
                  </FGroup>
                  <FGroup title="Etapa">
                    {WA_STAGES.map((s) => <FPill key={s} on={f.stages.includes(s)} onClick={() => toggleF('stages', s)}>{STAGE_CATALOG[s]?.label ?? s}</FPill>)}
                  </FGroup>
                  <FGroup title="Tier">
                    {WA_TIERS.map((t) => <FPill key={t.v} on={f.tiers.includes(t.v)} onClick={() => toggleF('tiers', t.v)}>{t.l}</FPill>)}
                  </FGroup>
                  <FGroup title="Vendedor">
                    {OWNERS.map((o) => <FPill key={o.id} on={f.owners.includes(o.id)} onClick={() => toggleF('owners', o.id)}>{o.name.split(' ')[0]}</FPill>)}
                  </FGroup>
                  {allTags.length > 0 && (
                    <FGroup title="Etiquetas">
                      {allTags.map((t) => <FPill key={t} on={f.tags.includes(t)} onClick={() => toggleF('tags', t)}>{t}</FPill>)}
                    </FGroup>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* busca */}
      <div className="shrink-0 px-3 py-2">
        <div className={cn('flex h-9 items-center gap-3 rounded-lg px-3', wa.header)}>
          <Search className={cn('h-4 w-4', wa.sub)} />
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
          return (
            <button key={c.id} onClick={() => onSelect(c.id)} onContextMenu={(e) => openMenu(e, convMenu(c))} className={cn('flex w-full gap-3 px-3 py-2.5 text-left transition-colors', active ? wa.active : wa.hover)}>
              <span className="shrink-0 self-center"><Avatar url={c.avatarUrl} name={c.name} /></span>
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
                    {c.muted && <BellOff className={cn('h-3.5 w-3.5', wa.sub)} />}
                    {c.pinned && <Pin className={cn('h-3.5 w-3.5', wa.sub)} />}
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
function Bubble({ msg, tail, onCtx }: { msg: WaMsg; tail: boolean; onCtx?: (e: React.MouseEvent) => void }) {
  const me = msg.fromMe
  return (
    <div className={cn('flex px-2', me ? 'justify-end' : 'justify-start')}>
      <div
        onContextMenu={onCtx}
        className={cn(
          'relative max-w-[65%] rounded-lg px-2.5 py-1.5 text-[14px] leading-snug shadow-sm',
          me ? cn(wa.bubbleOut, 'text-[#111b21] dark:text-[#e9edef]') : cn(wa.bubbleIn, 'text-[#111b21] dark:text-[#e9edef]'),
          tail && (me ? 'rounded-tr-sm' : 'rounded-tl-sm'),
        )}
      >
        <span className="whitespace-pre-wrap break-words">{fmt(msg.text)}</span>
        <span className={cn('float-right ml-2 mt-1.5 flex translate-y-0.5 items-center gap-1 text-[10px]', me ? 'text-[#667781] dark:text-[#aebac1]' : wa.sub)}>
          {msg.t}{me && <Ticks status={msg.status} />}
        </span>
      </div>
    </div>
  )
}

function ChatThread({ conv, onSend, onBack, onTogglePanel, panelOpen }: {
  conv: WaConv; onSend: (t: string) => void; onBack: () => void; onTogglePanel: () => void; panelOpen: boolean
}) {
  const { moveStage } = useLeads()
  const { menu: bubMenu, open: openBub, close: closeBub } = useContextMenu()
  const mark = (stage: 'ganho' | 'perdido') => { if (conv.leadId) { moveStage(conv.leadId, stage); toast.success(stage === 'ganho' ? `${conv.name} marcado como Ganho 🎉` : `${conv.name} marcado como Perdido`) } }
  const bubbleMenu = (msg: WaMsg): MenuItem[] => [
    { label: 'Dados da mensagem', icon: Info, onClick: () => toast('Dados da mensagem — em breve') },
    { label: 'Responder', icon: Reply, onClick: () => toast('Responder — em breve') },
    { label: 'Copiar', icon: Copy, onClick: () => { navigator.clipboard?.writeText(msg.text); toast.success('Mensagem copiada') } },
    { label: 'Encaminhar', icon: Forward, onClick: () => toast('Encaminhar — em breve') },
    { label: 'Fixar', icon: Pin, onClick: () => toast('Mensagem fixada') },
    { label: 'Perguntar à X IA', icon: Sparkles, onClick: () => toast('Perguntando à X IA — em breve') },
    { label: 'Favoritar', icon: Star, onClick: () => toast('Mensagem favoritada') },
    { label: 'Selecionar', icon: ListChecks, onClick: () => toast('Selecionar — em breve') },
    { divider: true, label: '' },
    { label: 'Apagar', icon: Trash2, danger: true, onClick: () => toast('Mensagem apagada') },
  ]
  const [draft, setDraft] = useState('')
  const [attachOpen, setAttachOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [conv.id, conv.messages.length])

  // agrupa por dia
  const groups: { day: string; msgs: WaMsg[] }[] = []
  for (const msg of conv.messages) {
    const g = groups[groups.length - 1]
    if (g && g.day === msg.day) g.msgs.push(msg)
    else groups.push({ day: msg.day, msgs: [msg] })
  }

  const send = () => { if (draft.trim()) { onSend(draft.trim()); setDraft('') } }

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
            <button onClick={() => mark('ganho')} title="Marcar venda ganha" className="rounded-md bg-emerald-600 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:brightness-110">Ganho</button>
            <button onClick={() => mark('perdido')} title="Marcar venda perdida" className="rounded-md bg-rose-600 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:brightness-110">Perdido</button>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button title="Ligar" className={cn('grid h-9 w-9 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Phone className="h-[18px] w-[18px]" /></button>
          <button title="Buscar" className={cn('grid h-9 w-9 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Search className="h-[18px] w-[18px]" /></button>
          <button title="Painel do lead" onClick={onTogglePanel} className={cn('grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10', panelOpen ? 'text-teal' : wa.sub)}><MoreVertical className="h-5 w-5" /></button>
        </div>
      </div>

      {/* mensagens */}
      <div className={cn('col-scroll relative flex-1 overflow-y-auto py-4', wa.wall)} style={{ backgroundImage: DOODLE }}>
        <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
          {conv.aiOn && (
            <div className="sticky top-0 z-10 mx-auto mb-1.5 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/90 px-3 py-1 text-[11.5px] font-semibold text-primary-foreground shadow-md ring-1 ring-white/10 backdrop-blur-sm"><Sparkles className="h-3 w-3" /> X IA ativa nesta conversa</span>
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
              {g.msgs.map((msg, i) => <Bubble key={msg.id} msg={msg} tail={i === 0 || g.msgs[i - 1].fromMe !== msg.fromMe} onCtx={(e) => openBub(e, bubbleMenu(msg))} />)}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* input — pill flutuante sobre o wallpaper (estilo WhatsApp) */}
      <div className={cn('shrink-0 px-4 pb-3 pt-1', wa.wall)} style={{ backgroundImage: DOODLE }}>
        <div className="flex items-end gap-1.5">
          {/* + anexos */}
          <div className="relative shrink-0">
            <button onClick={() => { setAttachOpen((v) => !v); setQuickOpen(false) }} title="Anexar" className={cn('grid h-11 w-11 place-items-center rounded-full transition-colors', attachOpen ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}>
              <Plus className={cn('h-6 w-6 transition-transform', attachOpen && 'rotate-45')} />
            </button>
            {attachOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" onClick={() => setAttachOpen(false)} aria-hidden />
                <div className={cn('absolute bottom-full left-0 z-50 mb-2 w-52 overflow-hidden rounded-xl border border-white/10 p-1', wa.panel, MENU_SHADOW)}>
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
              <button onClick={() => { setEmojiOpen((v) => !v); setQuickOpen(false); setAttachOpen(false) }} title="Emoji" className={cn('grid h-9 w-9 place-items-center rounded-full', emojiOpen ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Smile className="h-[22px] w-[22px]" /></button>
              {emojiOpen && (
                <>
                  <button type="button" className="fixed inset-0 z-40" onClick={() => setEmojiOpen(false)} aria-hidden />
                  <div className={cn('absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-white/10 p-2', wa.panel, MENU_SHADOW)}>
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
              <button onClick={() => { setQuickOpen((v) => !v); setAttachOpen(false) }} title="Mensagens rápidas" className={cn('grid h-9 w-9 place-items-center rounded-full', quickOpen ? 'text-teal' : wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Zap className="h-[19px] w-[19px]" /></button>
              {quickOpen && (
                <>
                  <button type="button" className="fixed inset-0 z-40" onClick={() => setQuickOpen(false)} aria-hidden />
                  <div className={cn('absolute bottom-full right-0 z-50 mb-2 w-72 overflow-hidden rounded-xl border border-white/10 p-1', wa.panel, MENU_SHADOW)}>
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
            ? <button onClick={send} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#00a884] text-[#111b21] shadow-sm transition hover:brightness-110"><SendHorizontal className="h-5 w-5" /></button>
            : <button title="Áudio" className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Mic className="h-6 w-6" /></button>}
        </div>
      </div>
      <ContextMenu menu={bubMenu} onClose={closeBub} />
    </section>
  )
}

/* ============================ PAINEL DO LEAD (refinado) ============================ */
function PanelSection({ icon: Icon, title, children, defaultOpen = true, handle }: { icon: typeof HeartPulse; title: string; children: ReactNode; defaultOpen?: boolean; handle?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="px-5 py-4">
      <div className={cn('group/sec flex items-center gap-1', open && 'mb-3')}>
        {handle}
        <button onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-2 text-left">
          <Icon className="h-3.5 w-3.5 shrink-0 text-teal" />
          <span className="flex-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-foreground/85">{title}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform', !open && '-rotate-90')} />
        </button>
      </div>
      {open && children}
    </section>
  )
}

type SectionKey = 'plano' | 'comercial' | 'custom' | 'xia'

function SortableSection({ id, children }: { id: SectionKey; children: (hp: { attributes: Record<string, unknown>; listeners: Record<string, unknown> | undefined }) => ReactNode }) {
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
  const [order, setOrder] = useState<SectionKey[]>(['plano', 'comercial', 'custom', 'xia'])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const onSectionDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) setOrder((p) => arrayMove(p, p.indexOf(active.id as SectionKey), p.indexOf(over.id as SectionKey)))
  }
  const lead = getLead(conv.leadId)
  const patch = (p: Partial<Lead>) => { if (lead) saveLead({ ...lead, ...p }) }

  const renderSection = (k: SectionKey, hp: { attributes: Record<string, unknown>; listeners: Record<string, unknown> | undefined }) => {
    if (!lead) return null
    const grip = <button {...hp.attributes} {...hp.listeners} className="grid h-5 w-5 shrink-0 cursor-grab touch-none place-items-center rounded text-muted-foreground/25 transition-colors hover:text-muted-foreground active:cursor-grabbing" title="Arrastar para reordenar"><GripVertical className="h-3.5 w-3.5" /></button>
    switch (k) {
      case 'plano': return (
        <PanelSection icon={HeartPulse} title="Plano de saúde" handle={grip}>
          <ERow k="Operadora"><InlineText value={lead.operadora !== '—' ? lead.operadora : ''} display={lead.operadora !== '—' ? lead.operadora : undefined} onCommit={(v) => patch({ operadora: v.trim() || '—' })} /></ERow>
          <ERow k="Plano"><InlineText value={lead.plano} onCommit={(v) => patch({ plano: v.trim() })} /></ERow>
          <ERow k="Vidas"><InlineText type="number" value={String(lead.vidas)} onCommit={(v) => patch({ vidas: Math.max(1, Number(v) || 1) })} /></ERow>
          <ERow k="Valor / mês"><InlineText type="currency" value={money.toInput(lead.value)} display={lead.value ? brl(lead.value) : undefined} onCommit={(v) => patch({ value: money.toCents(v) })} /></ERow>
        </PanelSection>
      )
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
        <PanelSection icon={Sparkles} title="Resumo X IA" handle={grip}>
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
        <div className="grid grid-cols-2 gap-2 px-5 pt-3">
          {[
            { icon: CalendarPlus, label: 'Agendar', on: () => toast('Agendar retorno — em breve') },
            { icon: Star, label: 'Favoritar', on: () => toast('Favoritado') },
          ].map((a) => (
            <button key={a.label} onClick={a.on} className="flex flex-col items-center gap-1 rounded-lg border border-border/50 bg-card/40 py-1.5 text-[10.5px] font-medium text-muted-foreground transition-colors hover:border-teal/40 hover:text-foreground">
              <a.icon className="h-3.5 w-3.5 text-teal" /> {a.label}
            </button>
          ))}
        </div>

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
  const [convs, setConvs] = useState<WaConv[]>(WA_CONVERSATIONS)
  const [selectedId, setSelectedId] = useState(WA_CONVERSATIONS[0].id)
  const [panelOpen, setPanelOpen] = useState(true)
  const conv = convs.find((c) => c.id === selectedId)!

  const select = (id: string) => { setSelectedId(id); setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))) }
  const updateConv = (id: string, patch: Partial<WaConv>) => setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const send = (text: string) => {
    const id = `m-${Date.now()}`
    const msg: WaMsg = { id, fromMe: true, text, t: nowHM(), day: 'Hoje', status: 'sent' }
    setConvs((prev) => prev.map((c) => (c.id === selectedId ? { ...c, messages: [...c.messages, msg], unread: 0 } : c)))
    const setStatus = (s: WaMsg['status']) => setConvs((prev) => prev.map((c) => c.id === selectedId ? { ...c, messages: c.messages.map((mm) => (mm.id === id ? { ...mm, status: s } : mm)) } : c))
    setTimeout(() => setStatus('delivered'), 700)
    setTimeout(() => setStatus('read'), 1800)
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <ConversationList convs={convs} selectedId={selectedId} onSelect={select} onUpdate={updateConv} />
      <ChatThread conv={conv} onSend={send} onBack={() => {}} onTogglePanel={() => setPanelOpen((v) => !v)} panelOpen={panelOpen} />
      {panelOpen && <LeadPanel conv={conv} onClose={() => setPanelOpen(false)} />}
    </div>
  )
}
