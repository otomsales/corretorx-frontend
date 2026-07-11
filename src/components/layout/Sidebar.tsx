import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, Workflow, ShieldCheck, Wallet, Settings,
  ChevronDown, ChevronLeft, MessagesSquare, Maximize2, X, Paperclip, Mic, PanelLeftClose, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { to: string; label: string; badge?: number; avatars?: string[] }
type Group = { key: string; label: string; icon: LucideIcon; items: Item[] }

const pic = (n: number) => `https://i.pravatar.cc/60?img=${n}`
const HOME = { to: '/app', label: 'Visão Geral', icon: LayoutDashboard }
const TEAM_AVATARS = [pic(5), pic(15), pic(33)]

const THREAD = [
  { me: true, text: 'Oiii', at: '07/07 17:38' },
  { me: false, text: 'sabe me dizer essa informação sobre a Sami?', at: '07/07 17:41' },
  { me: true, text: 'Qual informação?', at: '07/07 17:48' },
  { me: false, text: 'Bom dia chefinha, na Sami conseguimos colocar a pessoa pelo cnpj sem necessariamente o titular do cnpj estar no plano certo? ou eu tô muito doida?', at: 'Ontem 08:52' },
]

type Contact = { id: string; name: string; avatar: string; online: boolean; last: string; at: string; unread: number }
const CONTACTS: Contact[] = [
  { id: 'c1', name: 'Janaína Betel', avatar: pic(5), online: false, last: 'Bom dia chefinha, na Sami conseguimos…', at: '08:52', unread: 2 },
  { id: 'c2', name: 'Thais Furlan', avatar: pic(15), online: true, last: 'Perfeito, já atualizei o contrato ✅', at: 'Ontem', unread: 0 },
  { id: 'c3', name: 'Nathalia Vicente', avatar: pic(33), online: true, last: 'Vou verificar o reajuste e te falo', at: 'Ter', unread: 1 },
]

const GROUPS: Group[] = [
  {
    key: 'comercial', label: 'Comercial', icon: Briefcase, items: [
      { to: '/app/funil', label: 'Funil' },
      { to: '/app/leads', label: 'Leads' },
      { to: '/app/chat', label: 'WhatsApp', badge: 7 },
      { to: '/app/agenda', label: 'Agendamentos' },
    ],
  },
  {
    key: 'operacional', label: 'Operacional', icon: Workflow, items: [
      { to: '/app/implantacao', label: 'Implantação' },
      { to: '/app/pos-venda', label: 'Pós-venda' },
    ],
  },
  {
    key: 'carteira', label: 'Carteira', icon: ShieldCheck, items: [
      { to: '/app/contratos', label: 'Contratos' },
      { to: '/app/renovacoes', label: 'Renovações & Reajustes', badge: 5 },
    ],
  },
  {
    key: 'financeiro', label: 'Financeiro', icon: Wallet, items: [
      { to: '/app/financeiro', label: 'Painel' },
      { to: '/app/faturamento', label: 'Faturamento' },
    ],
  },
  {
    key: 'config', label: 'Configurações', icon: Settings, items: [
      { to: '/app/relatorios', label: 'Relatórios' },
      { to: '/app/automacoes', label: 'Automações' },
      { to: '/app/admin', label: 'Admin' },
    ],
  },
]

function Badge({ n }: { n: number }) {
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-teal px-1.5 text-[10px] font-bold tabular-nums text-primary-foreground">
      {n}
    </span>
  )
}

function AvatarStack({ urls, active }: { urls: string[]; active?: boolean }) {
  return (
    <span className={cn('flex items-center transition-all', active ? '-space-x-1' : '-space-x-2')}>
      {urls.slice(0, 3).map((u, i) => (
        <img key={i} src={u} alt="" className={cn('h-5 w-5 rounded-full object-cover ring-2 transition-all', active ? 'ring-teal' : 'ring-[hsl(var(--card))]')} />
      ))}
      <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ring-2 transition-all', active ? 'bg-teal text-primary-foreground ring-teal' : 'bg-teal/25 text-teal ring-[hsl(var(--card))]')}>+</span>
    </span>
  )
}

/** Item de topo (com ícone). Ativo = pill preenchido. */
function TopItem({ item, end }: { item: Item & { icon: LucideIcon }; end?: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition-colors',
          isActive
            ? 'bg-foreground/[0.07] font-semibold text-foreground'
            : 'font-medium text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-[hsl(var(--brand-soft-accent))]' : 'text-muted-foreground/70')} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.avatars ? <AvatarStack urls={item.avatars} /> : item.badge ? <Badge n={item.badge} /> : null}
        </>
      )}
    </NavLink>
  )
}

/** Card flutuante do chat interno (portal) — lista de conversas → thread. */
function ChatInternoCard({ pos, onEnter, onLeave, onClose }: {
  pos: { top: number; left: number }; onEnter: () => void; onLeave: () => void; onClose: () => void
}) {
  const navigate = useNavigate()
  const [active, setActive] = useState<Contact | null>(null)
  const openFull = () => { onClose(); navigate('/app/chat-interno') }

  return createPortal(
    <div
      style={{ top: pos.top, left: pos.left }} onMouseEnter={onEnter} onMouseLeave={onLeave}
      className="dropdown-in fixed z-[100] flex max-h-[78vh] w-[340px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_16px_32px_-10px_rgba(0,0,0,0.55),0_40px_72px_-16px_rgba(0,0,0,0.7)]"
    >
      {!active ? (
        <>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-[14px] font-bold tracking-tight">Mensagens</span>
            <button onClick={openFull} title="Abrir chat interno" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-teal"><Maximize2 className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            {CONTACTS.map((c) => (
              <button key={c.id} onClick={() => setActive(c)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-foreground/[0.05]">
                <span className="relative shrink-0">
                  <img src={c.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                  <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card', c.online ? 'bg-emerald-400' : 'bg-muted-foreground/50')} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] font-semibold text-foreground">{c.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground/70">{c.at}</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-muted-foreground">{c.last}</span>
                    {c.unread > 0 && <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-teal px-1 text-[10px] font-bold text-primary-foreground">{c.unread}</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
            <button onClick={() => setActive(null)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
            <span className="relative shrink-0">
              <img src={active.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card', active.online ? 'bg-emerald-400' : 'bg-muted-foreground/50')} />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13.5px] font-bold">{active.name}</p>
              <p className="text-[11px] text-muted-foreground">{active.online ? 'Online' : 'Offline'}</p>
            </div>
            <button onClick={openFull} title="Expandir" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Maximize2 className="h-3.5 w-3.5" /></button>
            <button onClick={onClose} title="Fechar" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
            {THREAD.map((m, i) => (
              <div key={i} className={cn('flex flex-col', m.me ? 'items-end' : 'items-start')}>
                <div className={cn('max-w-[82%] rounded-2xl px-3 py-2 text-[13px] leading-snug', m.me ? 'rounded-br-md bg-teal text-primary-foreground' : 'rounded-bl-md bg-muted text-foreground')}>{m.text}</div>
                <span className="mt-1 text-[10px] text-muted-foreground/60">{m.at}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
            <button className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Paperclip className="h-4 w-4" /></button>
            <input placeholder="Escreva uma mensagem…" className="h-9 min-w-0 flex-1 rounded-lg bg-muted/40 px-3 text-[13px] outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-teal/40" />
            <button className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-teal"><Mic className="h-4 w-4" /></button>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}

/** Item Chat interno — hover destaca avatares + abre o card. */
function ChatInternoItem() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const enter = () => {
    clearTimeout(timer.current)
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ top: Math.max(12, r.top - 40), left: r.right + 10 })
    setOpen(true)
  }
  const leave = () => { timer.current = setTimeout(() => setOpen(false), 160) }

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <NavLink
        to="/app/chat-interno"
        className={({ isActive }) => cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition-colors', isActive || open ? 'bg-foreground/[0.07] font-semibold text-foreground' : 'font-medium text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground')}
      >
        {({ isActive }) => (
          <>
            <MessagesSquare className={cn('h-[18px] w-[18px] shrink-0', isActive || open ? 'text-[hsl(var(--brand-soft-accent))]' : 'text-muted-foreground/70')} />
            <span className="flex-1 truncate">Chat interno</span>
            <AvatarStack urls={TEAM_AVATARS} active={open} />
          </>
        )}
      </NavLink>
      {open && <ChatInternoCard pos={pos} onEnter={() => clearTimeout(timer.current)} onLeave={leave} onClose={() => setOpen(false)} />}
    </div>
  )
}

/** Sub-item: SEM ícone. Ativo = pill preenchido + barra teal à esquerda. */
function SubItem({ item }: { item: Item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2 rounded-lg py-1.5 pl-9 pr-2 text-[14px] transition-colors',
          isActive
            ? 'bg-foreground/[0.06] font-semibold text-foreground'
            : 'font-medium text-foreground/55 hover:bg-foreground/[0.04] hover:text-foreground',
        )
      }
    >
      {/* elbow arredondado (linha da árvore → item) */}
      <span aria-hidden className="pointer-events-none absolute left-[15px] top-0 h-1/2 w-[13px] rounded-bl-[9px] border-b border-l border-border/45" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.avatars ? <AvatarStack urls={item.avatars} /> : item.badge ? <Badge n={item.badge} /> : null}
    </NavLink>
  )
}

export function Sidebar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => Object.fromEntries(GROUPS.map((g) => [g.key, true])),
  )
  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }))

  return (
    <aside className="relative z-20 flex h-full w-[248px] flex-col border-r border-white/[0.09] bg-[hsl(var(--card)/0.32)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.05),4px_0_22px_-12px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-[1.6]">
      {/* Marca — logo + empresa empilhados, botão recolher na mesma linha (estilo Kommo) */}
      <div className="relative flex h-16 items-center justify-between gap-2 px-4">
        <div className="min-w-0 leading-tight">
          <span className="block text-[22px] font-extrabold leading-none tracking-tight">
            CORRETOR<span className="bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE] bg-clip-text text-transparent">X</span>
          </span>
          <span className="mt-1 block text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Corretora Aurora</span>
        </div>
        <button className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Recolher menu">
          <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        {/* traço parcial centralizado */}
        <div className="absolute bottom-0 left-1/2 h-px w-28 -translate-x-1/2 bg-border/60" />
      </div>

      {/* Saudação + usuário */}
      <div className="relative flex items-center gap-2.5 px-3 py-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE] text-[14px] font-bold text-primary-foreground shadow-[0_6px_16px_-6px_rgba(34,211,238,.6)]">
          LB
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[11px] text-muted-foreground">Olá 👋</p>
          <p className="truncate text-[14px] font-bold text-foreground">Larissa Boss</p>
        </div>
        {/* traço parcial centralizado (igual ao de cima) */}
        <div className="absolute bottom-0 left-1/2 h-px w-28 -translate-x-1/2 bg-border/60" />
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        <TopItem item={HOME} end />
        <ChatInternoItem />

        {GROUPS.map((g) => {
          const hasActive = g.items.some((i) => pathname === i.to || pathname.startsWith(i.to + '/'))
          return (
            <div key={g.key} className="relative pt-4">
              {/* destaque verde da categoria ativa (meia-lua colada na borda) */}
              {hasActive && <span aria-hidden className="pointer-events-none absolute -left-3 top-[17px] h-7 w-[7px] rounded-r-full bg-emerald-400" />}
              <button
                onClick={() => toggle(g.key)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition-colors',
                  hasActive ? 'bg-foreground/[0.06] text-foreground/90' : 'text-muted-foreground/55 hover:text-muted-foreground',
                )}
              >
                <g.icon className={cn('h-3.5 w-3.5 shrink-0', hasActive ? 'text-[hsl(var(--brand-soft-accent))]' : 'opacity-60')} />
                <span className="flex-1 text-left">{g.label}</span>
                <ChevronDown className={cn('h-3 w-3 shrink-0 opacity-45 transition-transform', open[g.key] && 'rotate-180')} />
              </button>
              {open[g.key] && (
                <div className="relative mt-1 space-y-0.5">
                  {/* rail vertical da árvore */}
                  <span aria-hidden className="pointer-events-none absolute left-[15px] top-0 bottom-[18px] w-px bg-border/45" />
                  {g.items.map((it) => <SubItem key={it.to} item={it} />)}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
