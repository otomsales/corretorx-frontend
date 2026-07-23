import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarBlank, CaretLeft, CaretRight, VideoCamera, PhoneCall, CheckSquare, Check, Plus, X, Clock,
  GoogleLogo, LinkSimple, Envelope, Users, TextAlignLeft, List, CaretDown, Trash, type Icon,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLeads } from '@/store/leads'
import { STAGE_CATALOG } from '@/lib/funil-data'
import { LeadAvatar } from '@/components/leads/LeadBadges'

type EvType = 'reuniao' | 'retorno' | 'tarefa'
type AgEvent = { id: string; type: EvType; title: string; leadName?: string; date: string; time?: string; durationMin?: number; meetLink?: string; guests?: string[] }

const meetCode = () => { const s = 'abcdefghijklmnopqrstuvwxyz'; const seg = (n: number) => Array.from({ length: n }, () => s[Math.floor(Math.random() * 26)]).join(''); return `${seg(3)}-${seg(4)}-${seg(3)}` }
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
/** busca sem acento: "cli" acha "Clínica" */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const TYPE: Record<EvType, { label: string; icon: Icon; dot: string; text: string; bar: string; soft: string }> = {
  reuniao: { label: 'Reunião', icon: VideoCamera, dot: 'bg-teal', text: 'text-teal', bar: 'bg-teal text-white', soft: 'bg-teal/12' },
  retorno: { label: 'Retorno', icon: PhoneCall, dot: 'bg-amber-500', text: 'text-amber-500', bar: 'bg-amber-500 text-amber-950', soft: 'bg-amber-500/12' },
  tarefa: { label: 'Tarefa', icon: CheckSquare, dot: 'bg-violet-500', text: 'text-violet-500', bar: 'bg-violet-500 text-white', soft: 'bg-violet-500/12' },
}
const TYPE_ORDER: EvType[] = ['reuniao', 'retorno', 'tarefa']
const WEEK_SHORT = ['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.']
const WEEK_MINI = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const HOUR_H = 48 // px por hora

const pad = (n: number) => String(n).padStart(2, '0')
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const startOfWeek = (d: Date) => addDays(d, -d.getDay())
const minutesOf = (t?: string) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m }
const fmtHour = (h: number) => `${pad(h)}:00`

type Placed = { e: AgEvent; start: number; end: number; col: number; total: number }
/** distribui eventos que se sobrepõem em colunas lado a lado (igual Google Agenda) */
function layoutDay(evs: AgEvent[]): Placed[] {
  const items = evs.map((e) => ({ e, start: minutesOf(e.time), end: minutesOf(e.time) + (e.durationMin ?? 30), col: 0, total: 1 }))
  items.sort((a, b) => a.start - b.start || a.end - b.end)
  const out: Placed[] = []
  let cluster: typeof items = []
  let clusterEnd = -1
  const flush = () => {
    if (!cluster.length) return
    const cols: (typeof items)[] = []
    cluster.forEach((it) => {
      let ci = cols.findIndex((col) => col[col.length - 1].end <= it.start)
      if (ci === -1) { cols.push([it]); ci = cols.length - 1 } else cols[ci].push(it)
      it.col = ci
    })
    cluster.forEach((it) => out.push({ ...it, total: cols.length }))
    cluster = []; clusterEnd = -1
  }
  items.forEach((it) => {
    if (cluster.length && it.start >= clusterEnd) flush()
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, it.end)
  })
  flush()
  return out
}

export default function Agenda() {
  const { leads, openDetail } = useLeads()
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const [anchor, setAnchor] = useState<Date>(today)          // dia de referência da semana
  const [miniCursor, setMiniCursor] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }))
  const [filter, setFilter] = useState<Set<EvType>>(new Set(TYPE_ORDER))
  const [done, setDone] = useState<Set<string>>(new Set())
  const [extra, setExtra] = useState<AgEvent[]>([])
  const [novo, setNovo] = useState<EvType | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [openEv, setOpenEv] = useState<AgEvent | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // scroll inicial ~7h
  useEffect(() => { if (gridRef.current) gridRef.current.scrollTop = 7 * HOUR_H }, [])

  const retornos = useMemo<AgEvent[]>(() =>
    leads.filter((l) => l.followupInDays != null).map((l) => ({
      id: `ret-${l.id}`, type: 'retorno', title: `Retornar ${l.name}`, leadName: l.name,
      date: isoOf(addDays(today, l.followupInDays as number)), time: '09:00', durationMin: 30,
    })), [leads, today])

  const SEED: AgEvent[] = useMemo(() => [
    { id: 's1', type: 'reuniao', title: 'Apresentação de proposta', leadName: 'Construtora Aurora', date: isoOf(today), time: '10:30', durationMin: 30, meetLink: 'https://meet.google.com/abc-defg-hij' },
    { id: 's2', type: 'reuniao', title: 'Alinhamento implantação', leadName: 'Metalúrgica Silva', date: isoOf(addDays(today, 1)), time: '14:00', durationMin: 45, meetLink: 'https://meet.google.com/xyz-mnop-qrs' },
    { id: 's3', type: 'tarefa', title: 'Cobrar documentos (DS)', leadName: 'Clínica São Lucas', date: isoOf(today), time: '09:00', durationMin: 30 },
    { id: 's4', type: 'tarefa', title: 'Enviar tabela Amil PME', leadName: 'Padaria Central', date: isoOf(addDays(today, 2)), time: '11:00', durationMin: 30 },
    { id: 's5', type: 'tarefa', title: 'Revisar contrato', date: isoOf(addDays(today, 3)), time: '16:00', durationMin: 60 },
    { id: 's6', type: 'reuniao', title: 'Follow-up negociação', leadName: 'Juliana Castro', date: isoOf(addDays(today, -1)), time: '11:00', durationMin: 30 },
  ], [today])

  const events = useMemo(() => [...retornos, ...SEED, ...extra].filter((e) => filter.has(e.type)), [retornos, SEED, extra, filter])
  const byDay = useMemo(() => {
    const m: Record<string, AgEvent[]> = {}
    events.forEach((e) => { (m[e.date] ??= []).push(e) })
    Object.values(m).forEach((arr) => arr.sort((a, b) => minutesOf(a.time) - minutesOf(b.time)))
    return m
  }, [events])

  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i))
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  const weekLabel = () => {
    const a = week[0], b = week[6]
    return a.getMonth() === b.getMonth()
      ? `${MONTHS[a.getMonth()]} de ${a.getFullYear()}`
      : `${MONTHS[a.getMonth()].slice(0, 3)} – ${MONTHS[b.getMonth()].slice(0, 3)} de ${b.getFullYear()}`
  }
  const toggleFilter = (t: EvType) => setFilter((p) => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n })
  const toggleDone = (id: string) => setDone((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  // mini calendário
  const miniStart = new Date(miniCursor.y, miniCursor.m, 1)
  const miniGrid = Array.from({ length: 42 }, (_, i) => new Date(miniCursor.y, miniCursor.m, 1 - miniStart.getDay() + i))

  return (
    <div className="flex h-full min-h-0">
      {/* ---------- rail estilo Google ---------- */}
      <aside className="hidden w-[248px] shrink-0 flex-col gap-4 border-r border-border/40 px-4 py-4 lg:flex">
        <div className="relative">
          <button onClick={() => setCreateOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-2xl border border-border/50 bg-card py-3 pl-3.5 pr-4 text-[14px] font-semibold text-foreground shadow-[0_1px_2px_-1px_rgba(0,0,0,0.06),0_8px_16px_-6px_rgba(0,0,0,0.10)] transition hover:bg-foreground/[0.03] dark:shadow-none">
            <Plus className="h-5 w-5 text-teal" weight="bold" /> Criar <CaretDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {createOpen && (
            <>
              <button type="button" className="fixed inset-0 z-40" onClick={() => setCreateOpen(false)} aria-hidden />
              <div className="dropdown-in absolute left-0 top-full z-50 mt-1.5 w-48 rounded-lg border border-border bg-card p-1 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.06),0_8px_16px_-6px_rgba(0,0,0,0.10),0_24px_48px_-16px_rgba(0,0,0,0.14)] dark:border-white/10 dark:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]">
                {TYPE_ORDER.map((t) => {
                  const I = TYPE[t].icon
                  return (
                    <button key={t} onClick={() => { setNovo(t); setCreateOpen(false) }} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]">
                      <I className={cn('h-4 w-4', TYPE[t].text)} weight="duotone" /> {TYPE[t].label}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* mini calendário */}
        <div>
          <div className="mb-1.5 flex items-center gap-1">
            <span className="flex-1 text-[13px] font-semibold text-foreground">{MONTHS[miniCursor.m]} de {miniCursor.y}</span>
            <button onClick={() => setMiniCursor((c) => { const d = new Date(c.y, c.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() } })} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted"><CaretLeft className="h-3 w-3" weight="bold" /></button>
            <button onClick={() => setMiniCursor((c) => { const d = new Date(c.y, c.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() } })} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted"><CaretRight className="h-3 w-3" weight="bold" /></button>
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {WEEK_MINI.map((w, i) => <span key={i} className="grid h-6 place-items-center text-[10px] font-medium text-muted-foreground/60">{w}</span>)}
            {miniGrid.map((d) => {
              const iso = isoOf(d)
              const isToday = iso === isoOf(today)
              const inWeek = week.some((w) => isoOf(w) === iso)
              return (
                <button key={iso} onClick={() => { setAnchor(d); setMiniCursor({ y: d.getFullYear(), m: d.getMonth() }) }}
                  className={cn('grid h-6 w-6 place-items-center justify-self-center rounded-full text-[11px] tabular-nums transition-colors',
                    isToday ? 'bg-teal font-bold text-primary-foreground' : inWeek ? 'bg-teal/12 text-foreground' : d.getMonth() === miniCursor.m ? 'text-foreground hover:bg-muted' : 'text-muted-foreground/40 hover:bg-muted')}>
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>

        {/* minhas agendas */}
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-foreground">Minhas agendas</p>
          {TYPE_ORDER.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 transition-colors hover:bg-foreground/[0.03]">
              <span className={cn('grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[4px] border-[1.5px] transition-colors', filter.has(t) ? cn('border-transparent', TYPE[t].dot) : 'border-input')}>
                {filter.has(t) && <Check className="h-2.5 w-2.5 text-white" weight="bold" />}
              </span>
              <input type="checkbox" className="hidden" checked={filter.has(t)} onChange={() => toggleFilter(t)} />
              <span className="text-[13px] text-foreground">{TYPE[t].label}</span>
            </label>
          ))}
        </div>
      </aside>

      {/* ---------- calendário semanal ---------- */}
      <div className="flex min-w-0 flex-1 flex-col pb-3 pr-5">
        {/* toolbar */}
        <div className="flex shrink-0 items-center gap-2 px-4 py-3">
          <button onClick={() => setAnchor(today)} className="rounded-lg border border-border/50 px-3 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground">Hoje</button>
          <button onClick={() => setAnchor((a) => addDays(a, -7))} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"><CaretLeft className="h-4 w-4" weight="bold" /></button>
          <button onClick={() => setAnchor((a) => addDays(a, 7))} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"><CaretRight className="h-4 w-4" weight="bold" /></button>
          <h2 className="ml-1 text-[18px] font-bold tracking-tight text-foreground">{weekLabel()}</h2>
          <span className="ml-auto rounded-lg border border-border/50 px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground">Semana</span>
        </div>

        {/* cabeçalho dos dias */}
        <div className="flex shrink-0 border-b border-border/40 pr-[10px]">
          <div className="w-14 shrink-0" />
          {week.map((d) => {
            const iso = isoOf(d)
            const isToday = iso === isoOf(today)
            const allDay = (byDay[iso] ?? []).filter((e) => !e.time)
            return (
              <div key={iso} className="min-w-0 flex-1 border-l border-border/25 px-1 pb-1 pt-1.5 text-center">
                <p className={cn('text-[10px] font-semibold uppercase tracking-wide', isToday ? 'text-teal' : 'text-muted-foreground/60')}>{WEEK_SHORT[d.getDay()]}</p>
                <span className={cn('mx-auto mt-0.5 grid h-8 w-8 place-items-center rounded-full text-[17px] font-semibold tabular-nums', isToday ? 'bg-teal text-primary-foreground' : 'text-foreground')}>{d.getDate()}</span>
                <div className="mt-1 space-y-0.5">
                  {allDay.map((e) => (
                    <button key={e.id} onClick={() => setOpenEv(e)} className={cn('block w-full truncate rounded-[3px] px-1.5 py-[2px] text-left text-[11px] font-medium', TYPE[e.type].bar, done.has(e.id) && 'line-through opacity-60')}>{e.title}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* grade de horas */}
        <div ref={gridRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex" style={{ height: 24 * HOUR_H }}>
            {/* horas */}
            <div className="w-14 shrink-0">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="relative" style={{ height: HOUR_H }}>
                  {h > 0 && <span className="absolute -top-1.5 right-2 text-[10px] tabular-nums text-muted-foreground/60">{fmtHour(h)}</span>}
                </div>
              ))}
            </div>
            {/* colunas dos dias */}
            {week.map((d) => {
              const iso = isoOf(d)
              const isToday = iso === isoOf(today)
              const timed = (byDay[iso] ?? []).filter((e) => e.time)
              return (
                <div key={iso} className="relative min-w-0 flex-1 border-l border-border/25">
                  {Array.from({ length: 24 }, (_, h) => <div key={h} className="border-b border-border/20" style={{ height: HOUR_H }} />)}
                  {/* linha do agora */}
                  {isToday && (
                    <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: (nowMin / 60) * HOUR_H }}>
                      <span className="h-2.5 w-2.5 shrink-0 -translate-x-1/2 rounded-full bg-danger" />
                      <span className="h-px flex-1 bg-danger" />
                    </div>
                  )}
                  {layoutDay(timed).map(({ e, start, end, col, total }) => {
                    const top = (start / 60) * HOUR_H
                    const h = Math.max(20, ((end - start) / 60) * HOUR_H - 2)
                    const w = 100 / total
                    return (
                      <button key={e.id} onClick={() => setOpenEv(e)}
                        style={{ top, height: h, left: `calc(${col * w}% + 2px)`, width: `calc(${w}% - 4px)` }}
                        className={cn('absolute z-[5] overflow-hidden rounded-[4px] px-1.5 py-0.5 text-left ring-1 ring-black/10 transition hover:z-10 hover:brightness-110 dark:ring-black/20', TYPE[e.type].bar, done.has(e.id) && 'line-through opacity-60')}>
                        <p className="truncate text-[11px] font-semibold leading-tight">{e.title}</p>
                        {h > 28 && <p className="truncate text-[10px] leading-tight opacity-90">{e.time}{e.meetLink ? ' · Meet' : ''}</p>}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {openEv && <EventPopover ev={openEv} done={done.has(openEv.id)} onToggleDone={() => toggleDone(openEv.id)} onClose={() => setOpenEv(null)} onLead={(n) => { const l = leads.find((x) => x.name === n); if (l) { setOpenEv(null); openDetail(l.id) } }} onDelete={(id) => { setExtra((p) => p.filter((x) => x.id !== id)); setOpenEv(null); toast.success('Evento excluído') }} />}
      {novo && <EventModal type={novo} defaultDate={isoOf(anchor)} onClose={() => setNovo(null)} onSave={(ev) => { setExtra((p) => [...p, ev]); setAnchor(new Date(ev.date + 'T00:00:00')); setNovo(null); toast.success(ev.meetLink ? 'Evento salvo · link do Meet gerado' : `${TYPE[ev.type].label} salva`) }} />}
    </div>
  )
}

/* ---------- bolha do evento (clique) ---------- */
function EventPopover({ ev, done, onToggleDone, onClose, onLead, onDelete }: {
  ev: AgEvent; done: boolean; onToggleDone: () => void; onClose: () => void; onLead: (n: string) => void; onDelete: (id: string) => void
}) {
  const t = TYPE[ev.type]
  const d = new Date(ev.date + 'T00:00:00')
  const canDelete = ev.id.startsWith('x-')
  const canDone = ev.type === 'tarefa' || ev.type === 'retorno'
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="dropdown-in w-full max-w-[400px] rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.06),0_8px_16px_-6px_rgba(0,0,0,0.10),0_24px_48px_-16px_rgba(0,0,0,0.14)] dark:border-white/10 dark:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start gap-2">
          <span className={cn('mt-1.5 h-3 w-3 shrink-0 rounded-[3px]', t.dot)} />
          <div className="min-w-0 flex-1">
            <h3 className={cn('text-[17px] font-semibold leading-snug text-foreground', done && 'line-through opacity-60')}>{ev.title}</h3>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {ev.time ? ` · ${ev.time}${ev.durationMin ? `–${pad(Math.floor((minutesOf(ev.time) + ev.durationMin) / 60))}:${pad((minutesOf(ev.time) + ev.durationMin) % 60)}` : ''}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2.5 pl-5">
          {ev.meetLink && (
            <div className="flex items-center gap-2.5">
              <VideoCamera className="h-4 w-4 shrink-0 text-amber-400" weight="fill" />
              <button onClick={() => window.open(ev.meetLink, '_blank', 'noopener')} className="rounded-lg bg-teal px-3 py-1.5 text-[12.5px] font-bold text-primary-foreground transition hover:brightness-110">Entrar com Google Meet</button>
            </div>
          )}
          {ev.meetLink && (
            <button onClick={() => { navigator.clipboard?.writeText(ev.meetLink!); toast.success('Link copiado') }} className="flex items-center gap-2.5 text-left text-[12.5px] text-muted-foreground transition-colors hover:text-teal">
              <LinkSimple className="h-4 w-4 shrink-0" /> {ev.meetLink.replace('https://', '')}
            </button>
          )}
          {ev.guests && ev.guests.length > 0 && (
            <div className="flex items-start gap-2.5">
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 text-[12.5px] text-muted-foreground">{ev.guests.map((g) => <p key={g} className="truncate">{g}</p>)}</div>
            </div>
          )}
          {ev.leadName && (
            <button onClick={() => onLead(ev.leadName!)} className="flex items-center gap-2.5 text-left text-[12.5px] font-medium text-teal transition hover:brightness-110">
              <TextAlignLeft className="h-4 w-4 shrink-0 text-muted-foreground" /> {ev.leadName}
            </button>
          )}
          <div className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
            <CalendarBlank className="h-4 w-4 shrink-0" /> {t.label}
          </div>
        </div>
        {(canDelete || canDone) && (
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
            {canDelete && (
              <button onClick={() => onDelete(ev.id)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-danger"><Trash className="h-4 w-4" /> Excluir</button>
            )}
            {canDone && (
              <button onClick={() => { onToggleDone(); if (!done) toast.success('Concluído') }} className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition', done ? 'bg-muted text-muted-foreground' : 'bg-teal text-primary-foreground hover:brightness-110')}>
                <Check className="h-4 w-4" weight="bold" /> {done ? 'Reabrir' : 'Concluir'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- modal de criação (estilo Google Agenda) ---------- */
function Row({ icon: Icon, children, tint }: { icon: Icon; children: React.ReactNode; tint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={cn('mt-1.5 h-5 w-5 shrink-0', tint ?? 'text-muted-foreground')} weight={tint ? 'fill' : 'regular'} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function EventModal({ type: initial, defaultDate, onClose, onSave }: { type: EvType; defaultDate: string; onClose: () => void; onSave: (e: AgEvent) => void }) {
  const { leads } = useLeads()
  const [type, setType] = useState<EvType>(initial)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState(30)
  const [lead, setLead] = useState('')
  const [leadOpen, setLeadOpen] = useState(false)
  const leadMatches = useMemo(() => {
    const t = norm(lead.trim())
    const digits = lead.replace(/\D/g, '')
    const list = !t ? leads : leads.filter((l) => norm(l.name).includes(t) || (!!digits && (l.phone ?? '').includes(digits)))
    return list.slice(0, 6)
  }, [lead, leads])
  const leadLinked = leads.some((l) => l.name === lead.trim())
  const [gConnected, setGConnected] = useState(true)
  const [genMeet, setGenMeet] = useState(true)
  const [guests, setGuests] = useState<string[]>([])
  const [guestInput, setGuestInput] = useState('')
  const isMeeting = type === 'reuniao'

  const addGuest = () => { const e = guestInput.trim(); if (!e) return; if (!validEmail(e)) { toast.error('E-mail inválido'); return } if (!guests.includes(e)) setGuests((p) => [...p, e]); setGuestInput('') }
  const endTime = () => { const m = minutesOf(time) + duration; return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}` }
  const save = () => {
    if (!title.trim()) { toast.error('Adicione um título'); return }
    onSave({
      id: `x-${Date.now()}-${Math.round(Math.random() * 1e5)}`, type, title: title.trim(), date, time,
      durationMin: duration, leadName: lead.trim() || undefined,
      meetLink: isMeeting && gConnected && genMeet ? `https://meet.google.com/${meetCode()}` : undefined,
      guests: isMeeting && guests.length ? guests : undefined,
    })
  }
  const dLabel = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/40 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="dropdown-in max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-2xl border border-border bg-card shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_16px_32px_-12px_rgba(0,0,0,0.14)] dark:border-white/10 dark:shadow-[0_16px_32px_-10px_rgba(0,0,0,0.55),0_44px_72px_-16px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
        {/* topo */}
        <div className="flex items-center justify-between px-3 py-2">
          <List className="h-4 w-4 text-muted-foreground/60" />
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 pb-4">
          {/* título sublinhado */}
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Adicionar título"
            className="w-full border-b-2 border-border bg-transparent pb-1.5 text-[20px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-teal"
          />

          {/* abas tipo */}
          <div className="mt-3 flex gap-1">
            {TYPE_ORDER.map((t) => (
              <button key={t} onClick={() => setType(t)} className={cn('rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors', type === t ? 'bg-teal/12 font-semibold text-teal' : 'text-muted-foreground hover:bg-foreground/[0.04]')}>
                {TYPE[t].label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3.5">
            {/* data / hora */}
            <Row icon={Clock}>
              <div className="flex flex-wrap items-center gap-1.5">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg bg-foreground/[0.05] px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors hover:bg-foreground/[0.08] focus:ring-1 focus:ring-teal" />
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg bg-foreground/[0.05] px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors hover:bg-foreground/[0.08] focus:ring-1 focus:ring-teal" />
                <span className="text-[13px] text-muted-foreground">–</span>
                <span className="rounded-lg bg-foreground/[0.05] px-2.5 py-1.5 text-[13px] tabular-nums text-muted-foreground">{endTime()}</span>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="rounded-lg bg-foreground/[0.05] px-2 py-1.5 text-[13px] text-foreground outline-none focus:ring-1 focus:ring-teal">
                  {[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <p className="mt-1 text-[12px] capitalize text-muted-foreground">{dLabel} · Não se repete</p>
            </Row>

            {isMeeting && (
              <>
                {/* convidados */}
                <Row icon={Users}>
                  {guests.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1.5">
                      {guests.map((g) => (
                        <span key={g} className="inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.06] py-1 pl-2 pr-1 text-[12px] text-foreground">
                          <Envelope className="h-3 w-3 text-muted-foreground" />{g}
                          <button onClick={() => setGuests((p) => p.filter((x) => x !== g))} className="grid h-4 w-4 place-items-center rounded text-muted-foreground hover:text-danger"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input value={guestInput} onChange={(e) => setGuestInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuest() } }} placeholder="Adicionar convidados" type="email"
                    className="w-full rounded-lg bg-foreground/[0.05] px-2.5 py-2 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-teal" />
                </Row>

                {/* google meet */}
                <Row icon={VideoCamera} tint="text-amber-400">
                  {gConnected ? (
                    genMeet ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal/12 px-2.5 py-1.5 text-[12.5px] font-medium text-teal"><GoogleLogo className="h-3.5 w-3.5" weight="bold" /> Videoconferência do Google Meet será criada</span>
                        <button onClick={() => setGenMeet(false)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-danger"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setGenMeet(true)} className="text-[13px] font-medium text-teal transition hover:brightness-110">Adicionar videoconferência do Google Meet</button>
                    )
                  ) : (
                    <button onClick={() => { setGConnected(true); toast.success('Google conectado') }} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-teal"><GoogleLogo className="h-4 w-4" weight="bold" /> Conectar Google</button>
                  )}
                </Row>
              </>
            )}

            {/* lead vinculado — autocomplete dos leads */}
            <Row icon={TextAlignLeft}>
              <div className="relative">
                <div className="relative">
                  <input
                    value={lead} onChange={(e) => { setLead(e.target.value); setLeadOpen(true) }} onFocus={() => setLeadOpen(true)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setLeadOpen(false) } else if (e.key === 'Enter' && leadOpen && leadMatches.length) { e.preventDefault(); setLead(leadMatches[0].name); setLeadOpen(false) } }}
                    placeholder="Lead vinculado (opcional)"
                    className={cn('w-full rounded-lg bg-foreground/[0.05] px-2.5 py-2 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-teal', leadLinked && 'pr-8')}
                  />
                  {leadLinked && <Check className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal" weight="bold" />}
                </div>
                {leadOpen && leadMatches.length > 0 && (
                  <>
                    <button type="button" className="fixed inset-0 z-40" onClick={() => setLeadOpen(false)} aria-hidden />
                    <div className="dropdown-in absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-card p-1 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.06),0_8px_16px_-6px_rgba(0,0,0,0.10),0_24px_48px_-16px_rgba(0,0,0,0.14)] dark:border-white/10 dark:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]">
                      {leadMatches.map((l) => (
                        <button key={l.id} onClick={() => { setLead(l.name); setLeadOpen(false) }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.05]">
                          <LeadAvatar lead={l} className="h-6 w-6" textCls="text-[9px]" />
                          <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{l.name}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{STAGE_CATALOG[l.stage]?.label ?? ''}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Row>

            {/* agenda / cor */}
            <Row icon={CalendarBlank}>
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                Corretora Aurora <span className={cn('h-3 w-3 rounded-full', TYPE[type].dot)} />
                <span className="text-muted-foreground">· {TYPE[type].label}</span>
              </div>
            </Row>
          </div>
        </div>

        {/* rodapé */}
        <div className="flex items-center justify-end gap-3 border-t border-border/40 px-5 py-3">
          <button onClick={onClose} className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Cancelar</button>
          <button onClick={save} className="rounded-full bg-teal px-6 py-2 text-[13.5px] font-bold text-primary-foreground transition hover:brightness-110">Salvar</button>
        </div>
      </div>
    </div>
  )
}
