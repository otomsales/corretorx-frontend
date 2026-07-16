import { useMemo, useState } from 'react'
import { CalendarBlank, CaretLeft, CaretRight, VideoCamera, PhoneCall, CheckSquare, Check, Plus, X, Clock, ListChecks, GoogleLogo, LinkSimple, Envelope, CheckCircle, Users, type Icon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLeads } from '@/store/leads'

type EvType = 'reuniao' | 'retorno' | 'tarefa'
type AgEvent = { id: string; type: EvType; title: string; leadName?: string; date: string; time?: string; durationMin?: number; meetLink?: string; guests?: string[] }

const meetCode = () => { const s = 'abcdefghijklmnopqrstuvwxyz'; const seg = (n: number) => Array.from({ length: n }, () => s[Math.floor(Math.random() * 26)]).join(''); return `${seg(3)}-${seg(4)}-${seg(3)}` }
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

const TYPE: Record<EvType, { label: string; icon: Icon; dot: string; text: string; soft: string; bar: string }> = {
  reuniao: { label: 'Reunião', icon: VideoCamera, dot: 'bg-teal', text: 'text-teal', soft: 'bg-teal/12', bar: 'bg-teal text-white' },
  retorno: { label: 'Retorno', icon: PhoneCall, dot: 'bg-amber-500', text: 'text-amber-500', soft: 'bg-amber-500/12', bar: 'bg-amber-500 text-amber-950' },
  tarefa: { label: 'Tarefa', icon: CheckSquare, dot: 'bg-violet-500', text: 'text-violet-500', soft: 'bg-violet-500/12', bar: 'bg-violet-500 text-white' },
}
const TYPE_ORDER: EvType[] = ['reuniao', 'retorno', 'tarefa']
const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const pad = (n: number) => String(n).padStart(2, '0')
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

export default function Agenda() {
  const { leads, openDetail } = useLeads()
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const [cursor, setCursor] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }))
  const [selected, setSelected] = useState<string>(isoOf(today))
  const [filter, setFilter] = useState<Set<EvType>>(new Set(TYPE_ORDER))
  const [done, setDone] = useState<Set<string>>(new Set())
  const [extra, setExtra] = useState<AgEvent[]>([])
  const [novo, setNovo] = useState(false)

  // retornos derivados dos leads (followupInDays)
  const retornos = useMemo<AgEvent[]>(() =>
    leads.filter((l) => l.followupInDays != null).map((l) => ({
      id: `ret-${l.id}`, type: 'retorno', title: `Retornar ${l.name}`, leadName: l.name,
      date: isoOf(addDays(today, l.followupInDays as number)),
    })), [leads, today])

  const SEED: AgEvent[] = useMemo(() => [
    { id: 's1', type: 'reuniao', title: 'Apresentação de proposta', leadName: 'Construtora Aurora', date: isoOf(today), time: '10:30', durationMin: 30, meetLink: 'https://meet.google.com/abc-defg-hij' },
    { id: 's2', type: 'reuniao', title: 'Alinhamento implantação', leadName: 'Metalúrgica Silva', date: isoOf(addDays(today, 1)), time: '14:00', durationMin: 45, meetLink: 'https://meet.google.com/xyz-mnop-qrs' },
    { id: 's3', type: 'tarefa', title: 'Cobrar documentos (DS)', leadName: 'Clínica São Lucas', date: isoOf(today), time: '09:00' },
    { id: 's4', type: 'tarefa', title: 'Enviar tabela Amil PME', leadName: 'Padaria Central', date: isoOf(addDays(today, 2)) },
    { id: 's5', type: 'tarefa', title: 'Revisar contrato', date: isoOf(addDays(today, 3)), time: '16:00' },
    { id: 's6', type: 'reuniao', title: 'Follow-up negociação', leadName: 'Juliana Castro', date: isoOf(addDays(today, -1)), time: '11:00', durationMin: 30 },
  ], [today])

  const events = useMemo(() => [...retornos, ...SEED, ...extra].filter((e) => filter.has(e.type)), [retornos, SEED, extra, filter])
  const byDay = useMemo(() => {
    const m: Record<string, AgEvent[]> = {}
    events.forEach((e) => { (m[e.date] ??= []).push(e) })
    Object.values(m).forEach((arr) => arr.sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99')))
    return m
  }, [events])

  const gridStart = new Date(cursor.y, cursor.m, 1)
  const grid = Array.from({ length: 42 }, (_, i) => new Date(cursor.y, cursor.m, 1 - gridStart.getDay() + i))
  const selDate = new Date(selected + 'T00:00:00')
  const selEvents = byDay[selected] ?? []

  const toggleFilter = (t: EvType) => setFilter((p) => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); if (!n.size) return new Set(TYPE_ORDER); return n })
  const toggleDone = (id: string) => setDone((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const goMonth = (d: number) => setCursor((c) => { const nd = new Date(c.y, c.m + d, 1); return { y: nd.getFullYear(), m: nd.getMonth() } })
  const goToday = () => { setCursor({ y: today.getFullYear(), m: today.getMonth() }); setSelected(isoOf(today)) }

  const fmtSel = () => {
    if (selected === isoOf(today)) return 'Hoje'
    if (selected === isoOf(addDays(today, 1))) return 'Amanhã'
    return `${WEEK[selDate.getDay()]}, ${selDate.getDate()} de ${MONTHS[selDate.getMonth()]}`
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Agendamentos</h1>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">Reuniões, retornos e tarefas da equipe em um só lugar.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {TYPE_ORDER.map((t) => (
              <button key={t} onClick={() => toggleFilter(t)} className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors', filter.has(t) ? 'border-border/60 text-foreground' : 'border-border/40 text-muted-foreground/50')}>
                <span className={cn('h-2 w-2 rounded-full', filter.has(t) ? TYPE[t].dot : 'bg-muted-foreground/30')} />{TYPE[t].label}
              </button>
            ))}
          </div>
          <button onClick={() => setNovo(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 text-[13px] font-bold text-primary-foreground transition hover:brightness-110">
            <Plus className="h-4 w-4" weight="bold" /> Novo
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* calendário — estilo Google Agenda (grade com linhas + barras) */}
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card">
          <div className="flex items-center gap-2 px-4 py-3">
            <h2 className="text-[15px] font-bold tracking-tight text-foreground">{MONTHS[cursor.m]} {cursor.y}</h2>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={goToday} className="rounded-lg border border-border/50 px-2.5 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground">Hoje</button>
              <button onClick={() => goMonth(-1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><CaretLeft className="h-4 w-4" weight="bold" /></button>
              <button onClick={() => goMonth(1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><CaretRight className="h-4 w-4" weight="bold" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-t border-border/40">
            {WEEK.map((w) => <div key={w} className="border-r border-border/25 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60 [&:nth-child(7n)]:border-r-0">{w}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((d) => {
              const iso = isoOf(d)
              const inMonth = d.getMonth() === cursor.m
              const isToday = iso === isoOf(today)
              const isSel = iso === selected
              const evs = byDay[iso] ?? []
              return (
                <button key={iso} onClick={() => setSelected(iso)} className={cn('flex min-h-[108px] flex-col gap-0.5 border-b border-r border-border/25 p-1.5 text-left align-top transition-colors [&:nth-child(7n)]:border-r-0', isSel ? 'bg-teal/[0.07]' : isToday ? 'bg-teal/[0.03] hover:bg-teal/[0.06]' : 'hover:bg-foreground/[0.03]', !inMonth && 'bg-foreground/[0.015] text-muted-foreground/50')}>
                  <span className={cn('grid h-[22px] w-[22px] place-items-center self-start rounded-full text-[12.5px] font-semibold tabular-nums', isToday ? 'bg-teal text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/45')}>{d.getDate()}</span>
                  <div className="flex flex-col gap-0.5">
                    {evs.slice(0, 3).map((e) => (
                      <span key={e.id} className={cn('flex items-center gap-1 truncate rounded-[3px] px-1.5 py-[2px] text-[11px] font-medium', TYPE[e.type].bar, done.has(e.id) && 'line-through opacity-60')}>
                        {e.time && <span className="shrink-0 tabular-nums opacity-90">{e.time}</span>}
                        <span className="truncate">{e.title}</span>
                      </span>
                    ))}
                    {evs.length > 3 && <span className="px-1 text-[10.5px] font-semibold text-muted-foreground">+{evs.length - 3} mais</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* dia selecionado */}
        <div className="rounded-xl border border-border/40 bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-foreground/80">{fmtSel()}</p>
              <p className="text-[12px] text-muted-foreground">{selEvents.length} {selEvents.length === 1 ? 'evento' : 'eventos'}</p>
            </div>
            <CalendarBlank className="h-5 w-5 text-muted-foreground/50" weight="duotone" />
          </div>
          <div className="max-h-[560px] space-y-2 overflow-y-auto p-3">
            {selEvents.map((e) => {
              const t = TYPE[e.type]
              const isDone = done.has(e.id)
              return (
                <div key={e.id} className={cn('rounded-lg border border-border/40 bg-foreground/[0.02] p-3 transition-opacity', isDone && 'opacity-55')}>
                  <div className="flex items-start gap-2.5">
                    <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', t.soft, t.text)}><t.icon className="h-4 w-4" weight="duotone" /></span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[13.5px] font-semibold text-foreground', isDone && 'line-through')}>{e.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
                        {e.time && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{e.time}{e.durationMin ? ` · ${e.durationMin}min` : ''}</span>}
                        <span className={cn('inline-flex items-center gap-1', t.text)}><span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />{t.label}</span>
                        {e.guests && e.guests.length > 0 && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{e.guests.length}</span>}
                        {e.meetLink && <span className="inline-flex items-center gap-1 text-emerald-500"><VideoCamera className="h-3 w-3" weight="fill" />Meet</span>}
                      </p>
                      {e.leadName && (
                        <button
                          onClick={() => { const l = leads.find((x) => x.name === e.leadName); if (l) openDetail(l.id) }}
                          className="mt-1 block truncate text-[12.5px] font-medium text-teal transition hover:brightness-110"
                        >{e.leadName}</button>
                      )}
                      {e.meetLink && (
                        <button
                          onClick={() => { navigator.clipboard?.writeText(e.meetLink!); toast.success('Link do Meet copiado') }}
                          title="Copiar link"
                          className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md bg-foreground/[0.05] px-2 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-teal"
                        >
                          <LinkSimple className="h-3.5 w-3.5 shrink-0 text-emerald-500" weight="bold" />
                          <span className="truncate">{e.meetLink.replace('https://', '')}</span>
                        </button>
                      )}
                    </div>
                    {e.type === 'reuniao' && e.meetLink ? (
                      <button onClick={() => window.open(e.meetLink, '_blank', 'noopener')} className="shrink-0 rounded-lg bg-teal px-2.5 py-1.5 text-[12px] font-bold text-primary-foreground transition hover:brightness-110">Entrar</button>
                    ) : (e.type === 'tarefa' || e.type === 'retorno') ? (
                      <button onClick={() => { toggleDone(e.id); if (!isDone) toast.success('Concluído') }} title={isDone ? 'Reabrir' : 'Concluir'} className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors', isDone ? 'border-teal bg-teal text-primary-foreground' : 'border-border/60 text-muted-foreground hover:border-teal hover:text-teal')}><Check className="h-4 w-4" weight="bold" /></button>
                    ) : null}
                  </div>
                </div>
              )
            })}
            {selEvents.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-foreground/[0.05] text-muted-foreground/60"><ListChecks className="h-5 w-5" weight="duotone" /></span>
                <p className="text-[13px] font-medium text-foreground">Nada agendado</p>
                <p className="text-[12px] text-muted-foreground">Sem eventos para {fmtSel().toLowerCase()}.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {novo && <NovoEventoModal defaultDate={selected} onClose={() => setNovo(false)} onSave={(ev) => { setExtra((p) => [...p, ev]); setSelected(ev.date); setNovo(false); toast.success(ev.meetLink ? 'Reunião criada · link do Google Meet gerado' : `${TYPE[ev.type].label} agendada`) }} />}
    </div>
  )
}

function NovoEventoModal({ defaultDate, onClose, onSave }: { defaultDate: string; onClose: () => void; onSave: (e: AgEvent) => void }) {
  const [type, setType] = useState<EvType>('reuniao')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('10:00')
  const [lead, setLead] = useState('')
  const [duration, setDuration] = useState(30)
  // Google Meet (mock — no protótipo já vem conectado)
  const [gConnected, setGConnected] = useState(true)
  const [genMeet, setGenMeet] = useState(true)
  const [guests, setGuests] = useState<string[]>([])
  const [guestInput, setGuestInput] = useState('')

  const addGuest = () => { const e = guestInput.trim(); if (!e) return; if (!validEmail(e)) { toast.error('E-mail inválido'); return } if (!guests.includes(e)) setGuests((p) => [...p, e]); setGuestInput('') }
  const isMeeting = type === 'reuniao'

  const save = () => {
    if (!title.trim() || !date) { toast.error('Preencha título e data'); return }
    if (isMeeting && !time) { toast.error('Informe o horário da reunião'); return }
    const meetLink = isMeeting && gConnected && genMeet ? `https://meet.google.com/${meetCode()}` : undefined
    onSave({
      id: `x-${date}-${title.slice(0, 6)}-${Math.round(Math.random() * 1e6)}`,
      type, title: title.trim(), date, time: time || undefined, leadName: lead.trim() || undefined,
      durationMin: isMeeting ? duration : undefined, meetLink, guests: isMeeting && guests.length ? guests : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="dropdown-in max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-bold tracking-tight text-foreground">Novo agendamento</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {TYPE_ORDER.map((t) => (
              <button key={t} onClick={() => setType(t)} className={cn('flex flex-col items-center gap-1 rounded-lg border py-2.5 text-[12px] font-semibold transition-colors', type === t ? 'border-teal bg-teal/[0.06] text-foreground' : 'border-border/50 text-muted-foreground hover:bg-foreground/[0.03]')}>
                {(() => { const I = TYPE[t].icon; return <I className={cn('h-5 w-5', type === t ? TYPE[t].text : 'text-muted-foreground')} weight="duotone" /> })()}
                {TYPE[t].label}
              </button>
            ))}
          </div>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px] outline-none transition-colors focus:border-teal" />
          <div className={cn('grid gap-2', isMeeting ? 'grid-cols-3' : 'grid-cols-2')}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ colorScheme: 'dark' }} className="h-10 rounded-lg border border-input bg-background px-3 text-[13.5px] outline-none focus:border-teal" />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ colorScheme: 'dark' }} className="h-10 rounded-lg border border-input bg-background px-3 text-[13.5px] outline-none focus:border-teal" />
            {isMeeting && (
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-10 rounded-lg border border-input bg-background px-2 text-[13.5px] outline-none focus:border-teal">
                {[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            )}
          </div>
          <input value={lead} onChange={(e) => setLead(e.target.value)} placeholder="Lead vinculado (opcional)" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[13.5px] outline-none transition-colors focus:border-teal" />

          {isMeeting && (
            <>
              {/* convidados */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground"><Users className="h-3.5 w-3.5" /> Convidados</label>
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
                <div className="flex gap-1.5">
                  <input value={guestInput} onChange={(e) => setGuestInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuest() } }} placeholder="email@convidado.com" type="email" className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-teal" />
                  <button onClick={addGuest} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-teal hover:text-teal"><Plus className="h-4 w-4" weight="bold" /></button>
                </div>
              </div>

              {/* google meet */}
              <div className="rounded-xl border border-border/50 bg-foreground/[0.02] p-3">
                {gConnected ? (
                  <>
                    <div className="flex items-center gap-2">
                      <GoogleLogo className="h-5 w-5 shrink-0 text-foreground/80" weight="bold" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 text-[13px] font-semibold text-foreground">Google Meet <CheckCircle className="h-3.5 w-3.5 text-emerald-500" weight="fill" /></p>
                        <p className="truncate text-[11.5px] text-muted-foreground">larissa@corretoraaurora.com.br</p>
                      </div>
                      <button type="button" onClick={() => setGenMeet((v) => !v)} className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', genMeet ? 'bg-teal' : 'bg-foreground/[0.15]')}>
                        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', genMeet ? 'left-[18px]' : 'left-0.5')} />
                      </button>
                    </div>
                    {genMeet && (
                      <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-teal/[0.06] px-2.5 py-1.5 text-[12px] text-teal">
                        <LinkSimple className="h-3.5 w-3.5 shrink-0" weight="bold" /> Um link do Google Meet será gerado e enviado aos convidados.
                      </p>
                    )}
                  </>
                ) : (
                  <button onClick={() => { setGConnected(true); toast.success('Google conectado') }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-foreground/[0.04]">
                    <GoogleLogo className="h-4 w-4" weight="bold" /> Conectar Google para gerar Meet
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Cancelar</button>
          <button onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-[13px] font-bold text-primary-foreground transition hover:brightness-110">
            {isMeeting && genMeet && gConnected && <VideoCamera className="h-4 w-4" weight="fill" />}
            {isMeeting ? 'Criar reunião' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}
