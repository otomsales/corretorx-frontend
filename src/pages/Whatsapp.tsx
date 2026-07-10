import { useMemo, useRef, useState, useEffect, type ReactNode } from 'react'
import {
  Search, MoreVertical, MessageSquarePlus, Check, CheckCheck, Pin, BellOff, Smile, Paperclip,
  Mic, SendHorizontal, ArrowLeft, Phone, X, Sparkles, CalendarPlus,
  FileText, Image as ImageIcon, AudioLines, Lock, Star, HeartPulse, Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { brl, formatPhone, initials, pickAvatar } from '@/lib/format'
import { STAGE_CATALOG, PIPELINES, lifecycleOf, type Lead } from '@/lib/funil-data'
import { useLeads } from '@/store/leads'
import { TierPill, StatusDot } from '@/components/leads/LeadBadges'
import { StageCell, OwnerCell, FollowupInlineCell, PipelineCell, InlineText, money } from '@/components/leads/InlineCell'
import { TagChip } from '@/lib/tags'
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

/* ============================ LISTA DE CONVERSAS ============================ */
const CHIPS = [
  { key: 'all', label: 'Todas' }, { key: 'unread', label: 'Não lidas' },
  { key: 'fav', label: 'Favoritas' }, { key: 'groups', label: 'Grupos' },
]

function ConversationList({ convs, selectedId, onSelect }: {
  convs: WaConv[]; selectedId: string; onSelect: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [chip, setChip] = useState('all')
  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return convs
      .filter((c) => {
        if (chip === 'unread' && c.unread === 0) return false
        if (chip === 'fav' && !c.favorite) return false
        if (chip === 'groups') return false // sem grupos no mock
        if (term && !(c.name.toLowerCase().includes(term) || c.phone.includes(term.replace(/\D/g, '')))) return false
        return true
      })
      .sort((a, b) => Number(b.pinned ?? 0) - Number(a.pinned ?? 0))
  }, [convs, q, chip])

  return (
    <aside className={cn('flex w-[360px] shrink-0 flex-col border-r', wa.panel, wa.border)}>
      {/* header */}
      <div className={cn('flex h-14 shrink-0 items-center justify-between px-4', wa.panel)}>
        <span className="text-[16px] font-bold tracking-tight">Conversas</span>
        <div className="flex items-center gap-1">
          <button title="Nova conversa" className={cn('grid h-9 w-9 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><MessageSquarePlus className="h-5 w-5" /></button>
          <button title="Menu" className={cn('grid h-9 w-9 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><MoreVertical className="h-5 w-5" /></button>
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
      <div className="flex shrink-0 gap-2 px-3 pb-2">
        {CHIPS.map((c) => (
          <button key={c.key} onClick={() => setChip(c.key)} className={cn('rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors', chip === c.key ? 'bg-[#0b3d36] text-[#00a884] dark:bg-[#103629] dark:text-[#00d9a3]' : cn(wa.sub, 'bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.07] dark:hover:bg-white/[0.08]'))}>
            {c.label}
          </button>
        ))}
      </div>

      {/* lista */}
      <div className="col-scroll flex-1 overflow-y-auto">
        {list.map((c) => {
          const last = c.messages[c.messages.length - 1]
          const active = c.id === selectedId
          return (
            <button key={c.id} onClick={() => onSelect(c.id)} className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors', active ? wa.active : wa.hover)}>
              <Avatar url={c.avatarUrl} name={c.name} />
              <div className="min-w-0 flex-1 border-b border-transparent">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold text-foreground">{c.name}</span>
                  <span className={cn('shrink-0 text-[11px]', c.unread > 0 ? 'font-semibold text-[#00a884]' : wa.sub)}>{last?.t}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className={cn('flex min-w-0 items-center gap-1 truncate text-[13px]', wa.sub)}>
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
              </div>
            </button>
          )
        })}
        {list.length === 0 && <p className={cn('px-4 py-10 text-center text-sm', wa.sub)}>Nenhuma conversa.</p>}
      </div>
    </aside>
  )
}

/* ============================ THREAD ============================ */
function Bubble({ msg, tail }: { msg: WaMsg; tail: boolean }) {
  const me = msg.fromMe
  return (
    <div className={cn('flex px-2', me ? 'justify-end' : 'justify-start')}>
      <div
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
  const mark = (stage: 'ganho' | 'perdido') => { if (conv.leadId) { moveStage(conv.leadId, stage); toast.success(stage === 'ganho' ? `${conv.name} marcado como Ganho 🎉` : `${conv.name} marcado como Perdido`) } }
  const [draft, setDraft] = useState('')
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
              {g.msgs.map((msg, i) => <Bubble key={msg.id} msg={msg} tail={i === 0 || g.msgs[i - 1].fromMe !== msg.fromMe} />)}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* input */}
      <div className={cn('flex shrink-0 items-end gap-2 px-3 py-2.5', wa.header)}>
        <button className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Smile className="h-6 w-6" /></button>
        <button className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Paperclip className="h-6 w-6 -rotate-45" /></button>
        <textarea
          value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} placeholder="Digite uma mensagem"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          className={cn('max-h-32 min-h-[42px] flex-1 resize-none rounded-lg px-4 py-2.5 text-[14px] outline-none placeholder:text-[13.5px]', wa.field, wa.sub, 'text-foreground')}
        />
        {draft.trim()
          ? <button onClick={send} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#00a884] text-[#111b21] transition hover:brightness-110"><SendHorizontal className="h-5 w-5" /></button>
          : <button className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', wa.sub, 'hover:bg-black/5 dark:hover:bg-white/10')}><Mic className="h-6 w-6" /></button>}
      </div>
    </section>
  )
}

/* ============================ PAINEL DO LEAD (refinado) ============================ */
function PanelSection({ icon: Icon, title, children }: { icon: typeof HeartPulse; title: string; children: ReactNode }) {
  return (
    <section className="px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-teal" />
        <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">{title}</span>
      </div>
      {children}
    </section>
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
  const { getLead, openDetail, saveLead, moveStage } = useLeads()
  const lead = getLead(conv.leadId)
  const patch = (p: Partial<Lead>) => { if (lead) saveLead({ ...lead, ...p }) }

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

        {/* ações rápidas */}
        <div className="grid grid-cols-2 gap-2 px-5 py-3">
          {[
            { icon: CalendarPlus, label: 'Agendar', on: () => toast('Agendar retorno — em breve') },
            { icon: Star, label: 'Favoritar', on: () => toast('Favoritado') },
          ].map((a) => (
            <button key={a.label} onClick={a.on} className="flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-card/40 py-2.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-teal/40 hover:text-foreground">
              <a.icon className="h-4 w-4 text-teal" /> {a.label}
            </button>
          ))}
        </div>

        {lead ? (
          <>
            <div className={cn('mx-5 border-t', wa.border)} />
            <PanelSection icon={HeartPulse} title="Plano de saúde">
              <ERow k="Operadora"><InlineText value={lead.operadora !== '—' ? lead.operadora : ''} display={lead.operadora !== '—' ? lead.operadora : undefined} onCommit={(v) => patch({ operadora: v.trim() || '—' })} /></ERow>
              <ERow k="Plano"><InlineText value={lead.plano} onCommit={(v) => patch({ plano: v.trim() })} /></ERow>
              <ERow k="Vidas"><InlineText type="number" value={String(lead.vidas)} onCommit={(v) => patch({ vidas: Math.max(1, Number(v) || 1) })} /></ERow>
              <ERow k="Valor / mês"><InlineText type="currency" value={money.toInput(lead.value)} display={lead.value ? brl(lead.value) : undefined} onCommit={(v) => patch({ value: money.toCents(v) })} /></ERow>
            </PanelSection>

            <div className={cn('mx-5 border-t', wa.border)} />
            <PanelSection icon={Wallet} title="Comercial">
              <ERow k="Etapa"><StageCell lead={lead} onPick={(s) => { moveStage(lead.id, s); toast.success(`Etapa: ${STAGE_CATALOG[s]?.label ?? s}`) }} /></ERow>
              <ERow k="Funil"><PipelineCell value={lead.pipelineId ?? 'p-comercial'} onPick={(id) => { patch({ pipelineId: id }); toast.success(`Funil: ${PIPELINES.find((p) => p.id === id)?.name ?? ''}`) }} /></ERow>
              <ERow k="Origem"><InlineText value={lead.source ?? ''} onCommit={(v) => patch({ source: v.trim() || null })} /></ERow>
              <ERow k="Responsável"><OwnerCell lead={lead} onPick={(id) => patch({ ownerId: id })} /></ERow>
              <ERow k="Próximo retorno"><FollowupInlineCell lead={lead} onPick={(d) => patch({ followupInDays: d })} /></ERow>
              {lead.tags && lead.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">{lead.tags.map((t) => <TagChip key={t} tag={t} />)}</div>
              )}
            </PanelSection>

            <div className={cn('mx-5 border-t', wa.border)} />
            <PanelSection icon={Sparkles} title="Resumo X IA">
              <XiaSummary lead={lead} />
            </PanelSection>

            <div className="px-5 pb-6 pt-1">
              <button onClick={() => openDetail(lead.id)} className="w-full rounded-lg bg-teal py-2.5 text-[13px] font-bold text-primary-foreground transition hover:brightness-110">
                Ver lead completo
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-[13px] text-muted-foreground">Esta conversa ainda não está vinculada a um lead.</p>
            <button onClick={() => toast('Criar lead a partir da conversa — em breve')} className="rounded-lg bg-teal px-4 py-2 text-[13px] font-bold text-primary-foreground transition hover:brightness-110">Criar lead</button>
          </div>
        )}
      </div>
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
      <ConversationList convs={convs} selectedId={selectedId} onSelect={select} />
      <ChatThread conv={conv} onSend={send} onBack={() => {}} onTogglePanel={() => setPanelOpen((v) => !v)} panelOpen={panelOpen} />
      {panelOpen && <LeadPanel conv={conv} onClose={() => setPanelOpen(false)} />}
    </div>
  )
}
