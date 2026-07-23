import { useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CaretLeft, CaretRight, CaretUp, CaretDown, CaretUpDown, Check, Users, X, CaretRight as Chevron } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { brl } from '@/lib/format'
import { OWNERS, STAGE_CATALOG, type Lead } from '@/lib/funil-data'
import { useLeads } from '@/store/leads'
import { useImplantacao, IMPL_STAGES, type ImplProcess } from '@/store/implantacao'

const MODAL_SHADOW = 'shadow-[0_1px_2px_-1px_rgba(0,0,0,0.06),0_8px_16px_-6px_rgba(0,0,0,0.10),0_24px_48px_-16px_rgba(0,0,0,0.14)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]'

/* ---------- regras de comissão (faixa progressiva marginal, ciclo 15→15) ---------- */
const META_1 = 1_200_000 // R$ 12.000 → acima disso, 40%
const META_2 = 2_400_000 // R$ 24.000 → acima disso, 50%
const FAIXAS = [
  { ate: META_1, pct: 0.30, label: '30%' },
  { ate: META_2, pct: 0.40, label: '40%' },
  { ate: Infinity, pct: 0.50, label: '50%' },
]
function comissaoDe(receita: number) {
  const t1 = Math.min(receita, META_1) * 0.30
  const t2 = Math.min(Math.max(receita - META_1, 0), META_2 - META_1) * 0.40
  const t3 = Math.max(receita - META_2, 0) * 0.50
  return Math.round(t1 + t2 + t3)
}
const faixaAtual = (receita: number) => (receita >= META_2 ? FAIXAS[2] : receita >= META_1 ? FAIXAS[1] : FAIXAS[0])

/* ---------- ciclo de apuração 15 → 14 ---------- */
const CICLO_MIN = -12 // até 12 ciclos atrás
function cicloDe(offset: number) {
  const hoje = new Date()
  const base = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1)
  const inicio = hoje.getDate() >= 15 || offset !== 0
    ? new Date(base.getFullYear(), base.getMonth() + (hoje.getDate() >= 15 ? 0 : -1), 15)
    : new Date(base.getFullYear(), base.getMonth() - 1, 15)
  const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 14)
  return { inicio, fim }
}
const fmtDia = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/* ---------- período do dashboard (ciclo é o default; presets deslocáveis por ‹ ›) ---------- */
type PeriodoTipo = 'ciclo' | 'hoje' | 'semana' | 'mes' | 'custom'
const PERIODO_OPTS: { value: PeriodoTipo; label: string }[] = [
  { value: 'ciclo', label: 'Ciclo de apuração' },
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Essa semana' },
  { value: 'mes', label: 'Esse mês' },
  { value: 'custom', label: 'Personalizado…' },
]
const atMidnight = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
/** Range [inicio, fim] para o tipo escolhido, deslocado por `offset` unidades (dia/semana/mês/ciclo). */
function rangeDe(tipo: PeriodoTipo, offset: number, custom: { from: string; to: string }): { inicio: Date; fim: Date; navegavel: boolean } {
  const hoje = atMidnight(new Date())
  if (tipo === 'ciclo') { const c = cicloDe(offset); return { inicio: c.inicio, fim: c.fim, navegavel: true } }
  if (tipo === 'hoje') { const d = new Date(hoje); d.setDate(d.getDate() + offset); return { inicio: d, fim: d, navegavel: true } }
  if (tipo === 'semana') {
    const seg = new Date(hoje); const dow = (seg.getDay() + 6) % 7; seg.setDate(seg.getDate() - dow + offset * 7)
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6); return { inicio: seg, fim: dom, navegavel: true }
  }
  if (tipo === 'mes') {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + offset + 1, 0); return { inicio: ini, fim, navegavel: true }
  }
  // custom
  const ini = custom.from ? new Date(custom.from + 'T00:00:00') : hoje
  const fim = custom.to ? new Date(custom.to + 'T00:00:00') : ini
  return { inicio: ini, fim, navegavel: false }
}
const rotuloPeriodo = (tipo: PeriodoTipo, inicio: Date, fim: Date) =>
  tipo === 'hoje' ? fmtDia(inicio) : `${fmtDia(inicio)} – ${fmtDia(fim)}`

/** Etapas abertas na ordem do funil (etapas sem lead continuam visíveis — o zero é informação). */
const ETAPAS_ABERTAS = ['novo', 'atendimento', 'qualificado', 'proposta', 'negociacao']
/** Esteira em andamento: já é venda, mas ainda não virou dinheiro confirmado. */
const IMPL_ATIVAS = ['venda_recebida', 'documento_solicitado', 'em_cadastro', 'ds', 'em_analise', 'pendencia']
const IMPL_PAGAS = ['pago', 'implantado']
const STALE_H = 168 // 7 dias sem contato
const POR_PAGINA = 10

/** Vidro fosco — mesmo tratamento dos cards do funil (translúcido + blur + sombra por tema). */
export const GLASS =
  'border border-border/40 bg-[hsl(var(--card)/0.9)] backdrop-blur-xl backdrop-saturate-150 dark:bg-[hsl(var(--card)/0.55)] ' +
  'shadow-[0_4px_16px_-6px_rgba(15,23,42,0.16)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_10px_30px_-10px_rgba(0,0,0,0.7)]'

/** Micro-rótulo do sistema: 11px, caixa alta, tracking 0.08em. */
const MICRO = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'
const TITULO = 'text-[13px] font-bold uppercase tracking-[0.08em] text-foreground/80'

function Kpi({ label, valor, hint, destaque }: { label: string; valor: string; hint?: ReactNode; destaque?: boolean }) {
  return (
    <div className={cn('flex flex-col rounded-xl px-4 py-3.5', GLASS, destaque && 'ring-1 ring-inset ring-teal/30')}>
      <span className={cn('truncate', MICRO)}>{label}</span>
      <p className={cn('mt-2 font-mono text-[21px] font-bold leading-none tabular-nums', destaque ? 'text-teal' : 'text-foreground')}>{valor}</p>
      <p className="mt-auto truncate pt-2 text-[12px] leading-none text-muted-foreground">{hint ?? ' '}</p>
    </div>
  )
}

/** Métrica secundária da faixa compacta. */
function Mini({ label, valor, hint, tone }: { label: string; valor: string; hint?: string; tone?: string }) {
  return (
    <div className="min-w-0 px-3.5 py-3">
      <span className={cn('block truncate', MICRO)}>{label}</span>
      <p className={cn('mt-1.5 font-mono text-[15px] font-bold leading-none tabular-nums', tone ?? 'text-foreground')}>{valor}</p>
      {hint && <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Badge sólido de status da esteira — usa os tokens semânticos do tema. */
function StatusImpl({ stage }: { stage: string }) {
  const label = IMPL_STAGES.find((s) => s.id === stage)?.label ?? stage
  const cls = IMPL_PAGAS.includes(stage)
    ? 'bg-success text-success-foreground'
    : stage === 'pendencia'
      ? 'bg-danger text-white'
      : 'bg-warning text-warning-foreground'
  return <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide', cls)}>{label}</span>
}

/** Pílula de alerta (retornos, pendências). Sólida quando há o que fazer; clicável quando n>0. */
function Alerta({ n, label, tone, onClick }: { n: number; label: string; tone: 'danger' | 'warning' | 'muted'; onClick?: () => void }) {
  const ativo = n > 0
  const cls = !ativo
    ? 'bg-foreground/[0.05] text-muted-foreground'
    : tone === 'danger' ? 'bg-danger text-white'
      : tone === 'warning' ? 'bg-warning text-warning-foreground'
        : 'bg-foreground/[0.08] text-foreground'
  return (
    <button
      type="button"
      onClick={ativo ? onClick : undefined}
      disabled={!ativo}
      className={cn('inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11.5px] transition-transform', cls, ativo ? 'cursor-pointer hover:brightness-110 active:scale-[0.97]' : 'cursor-default')}
    >
      <span className="font-mono font-bold tabular-nums">{n}</span>
      <span className="font-medium opacity-90">{label}</span>
    </button>
  )
}

type AlertaLead = { lead: Lead; nota: string; valor: number }

/** Modal com a lista de leads por trás de um alerta. Clicar numa linha abre o lead. */
function AlertaModal({ titulo, itens, onOpenLead, onClose }: { titulo: string; itens: AlertaLead[]; onOpenLead: (id: string) => void; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border dark:border-white/10 bg-card', MODAL_SHADOW)}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold tracking-tight">{titulo}</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{itens.length} lead{itens.length === 1 ? '' : 's'}</p>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {itens.map(({ lead, nota, valor }) => {
            const dono = OWNERS.find((o) => o.id === lead.ownerId)
            return (
              <button
                key={lead.id}
                onClick={() => { onOpenLead(lead.id); onClose() }}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.05]"
              >
                {lead.avatarUrl
                  ? <img src={lead.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal/15 text-[12px] font-bold text-teal">{lead.name.slice(0, 2).toUpperCase()}</span>}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold text-foreground">{lead.name}</span>
                    {valor > 0 && <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">{brl(valor)}</span>}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <span className="truncate">{lead.operadora}{lead.city ? ` · ${lead.city}` : ''}</span>
                    <span className="shrink-0">· {nota}</span>
                  </span>
                </span>
                {dono && <img src={dono.avatar} alt="" title={dono.name} className="h-5 w-5 shrink-0 rounded-full object-cover" />}
                <Chevron className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-teal" />
              </button>
            )
          })}
          {itens.length === 0 && <p className="py-8 text-center text-[13px] text-muted-foreground/60">Nada aqui agora.</p>}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Seletor de período com presets (hoje / semana / mês / ciclo / personalizado) + navegação ‹ ›. */
function PeriodoSelect({ tipo, onTipo, custom, onCustom }: {
  tipo: PeriodoTipo; onTipo: (t: PeriodoTipo) => void
  custom: { from: string; to: string }; onCustom: (c: { from: string; to: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const atual = PERIODO_OPTS.find((o) => o.value === tipo)!
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-muted/60"
      >
        {atual.label}
        <CaretDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-hidden />
          <div className="dropdown-in absolute right-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-border dark:border-white/10 bg-card p-1.5 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.06),0_8px_16px_-6px_rgba(0,0,0,0.10),0_24px_48px_-16px_rgba(0,0,0,0.14)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]">
            {PERIODO_OPTS.map((o) => {
              const sel = tipo === o.value
              return (
                <button
                  key={o.value} type="button"
                  onClick={() => { onTipo(o.value); if (o.value !== 'custom') setOpen(false) }}
                  className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors', sel ? 'bg-foreground/[0.06] font-medium text-foreground' : 'text-foreground hover:bg-foreground/[0.05]')}
                >
                  <span className="truncate">{o.label}</span>
                  {sel && <Check className="h-3.5 w-3.5 shrink-0 text-teal" />}
                </button>
              )
            })}
            {tipo === 'custom' && (
              <div className="mt-1 space-y-1.5 border-t border-border/50 px-1.5 pb-1 pt-2">
                <label className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
                  De
                  <input type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => onCustom({ ...custom, from: e.target.value })} className="h-7 rounded-md border border-border/60 bg-muted/40 px-2 text-[12.5px] text-foreground outline-none focus:border-teal" />
                </label>
                <label className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
                  Até
                  <input type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => onCustom({ ...custom, to: e.target.value })} className="h-7 rounded-md border border-border/60 bg-muted/40 px-2 text-[12.5px] text-foreground outline-none focus:border-teal" />
                </label>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

type SortKey = 'cliente' | 'operadora' | 'vidas' | 'valor' | 'comissao' | 'implantacao' | 'data'

export default function Performance() {
  const { leads, openDetail } = useLeads()
  const { processes } = useImplantacao()
  const [ownerId, setOwnerId] = useState<string | 'equipe'>('equipe')
  const [tipo, setTipo] = useState<PeriodoTipo>('ciclo')
  const [offset, setOffset] = useState(0)
  const [custom, setCustom] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'data', dir: 'desc' })
  const [pagina, setPagina] = useState(0)
  const [alertaModal, setAlertaModal] = useState<{ titulo: string; itens: AlertaLead[] } | null>(null)
  const { inicio, fim, navegavel } = useMemo(() => rangeDe(tipo, offset, custom), [tipo, offset, custom])
  const trocaTipo = (t: PeriodoTipo) => {
    setOffset(0); setPagina(0)
    if (t === 'custom' && !custom.from) { const h = new Date(); setCustom({ from: toISO(new Date(h.getFullYear(), h.getMonth(), 1)), to: toISO(h) }) }
    setTipo(t)
  }
  const ehCiclo = tipo === 'ciclo'
  const escopo = ehCiclo ? 'do ciclo' : tipo === 'hoje' ? 'de hoje' : tipo === 'semana' ? 'da semana' : tipo === 'mes' ? 'do mês' : 'do período'

  const hoje = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  /* ---------- regra canônica: o processo manda no valor/data/dono; o lead é fallback ---------- */
  const procDe = (l: Lead) => processes.find((p) => p.leadId === l.id)
  const valorVenda = (l: Lead, p?: ImplProcess) => (p?.valorMensal ?? l.value ?? 0)
  const donoDe = (l: Lead, p?: ImplProcess) => (p?.vendedorId ?? l.ownerId)
  const dataVendaDe = (l: Lead, p?: ImplProcess) => {
    if (p?.dataVenda) return new Date(p.dataVenda + 'T00:00:00')
    const d = new Date(hoje); d.setDate(d.getDate() - (l.entryDaysAgo ?? 0)); return d
  }
  /** entrada do lead no funil (mock: relativo a hoje) */
  const criadoEm = (l: Lead) => { const d = new Date(hoje); d.setDate(d.getDate() - (l.entryDaysAgo ?? 0)); return d }
  const noCiclo = (d: Date) => d >= inicio && d <= fim

  const daEquipe = ownerId === 'equipe'
  const doVendedor = (l: Lead) => daEquipe || donoDe(l, procDe(l)) === ownerId

  /* ---------- vendas do ciclo + comissão marginal por linha ---------- */
  const vendas = useMemo(() => {
    const base = leads
      .filter((l) => STAGE_CATALOG[l.stage]?.kind === 'won' && doVendedor(l) && noCiclo(dataVendaDe(l, procDe(l))))
      .map((l) => {
        const proc = procDe(l)
        const idx = proc ? IMPL_STAGES.findIndex((s) => s.id === proc.stage) : -1
        return { lead: l, proc, valor: valorVenda(l, proc), implIdx: idx, confirmada: !!proc && IMPL_PAGAS.includes(proc.stage), dataVenda: dataVendaDe(l, proc) }
      })
      .sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime())
    // comissão marginal: a fatia que cada venda adiciona à comissão acumulada do ciclo
    let acc = 0
    return base.map((v) => {
      const antes = comissaoDe(acc)
      acc += v.valor
      return { ...v, comissao: comissaoDe(acc) - antes, faixaLinha: faixaAtual(acc).label }
    })
  }, [leads, processes, ownerId, tipo, offset, custom]) // eslint-disable-line react-hooks/exhaustive-deps

  const vendasOrdenadas = useMemo(() => {
    const s = sort.dir === 'asc' ? 1 : -1
    return [...vendas].sort((a, b) => {
      switch (sort.key) {
        case 'cliente': return s * a.lead.name.localeCompare(b.lead.name, 'pt-BR')
        case 'operadora': return s * a.lead.operadora.localeCompare(b.lead.operadora, 'pt-BR')
        case 'vidas': return s * ((a.lead.vidas ?? 0) - (b.lead.vidas ?? 0))
        case 'valor': return s * (a.valor - b.valor)
        case 'comissao': return s * (a.comissao - b.comissao)
        case 'implantacao': return s * (a.implIdx - b.implIdx)
        default: return s * (a.dataVenda.getTime() - b.dataVenda.getTime())
      }
    })
  }, [vendas, sort])
  const toggleSort = (k: SortKey) => { setPagina(0); setSort((p) => (p.key === k ? { key: k, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: k === 'cliente' || k === 'operadora' ? 'asc' : 'desc' })) }

  /* ---------- paginação da tabela (10 por página) ---------- */
  const totalPaginas = Math.max(1, Math.ceil(vendasOrdenadas.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas - 1)
  const vendasPagina = vendasOrdenadas.slice(paginaAtual * POR_PAGINA, paginaAtual * POR_PAGINA + POR_PAGINA)

  const receita = vendas.reduce((s, v) => s + v.valor, 0)
  const receitaConfirmada = vendas.filter((v) => v.confirmada).reduce((s, v) => s + v.valor, 0)
  const emAberto = receita - receitaConfirmada
  const vidas = vendas.reduce((s, v) => s + (v.lead.vidas ?? 0), 0)
  const ticket = vendas.length ? Math.round(receita / vendas.length) : 0
  const porVida = vidas ? Math.round(receita / vidas) : 0
  const comissao = comissaoDe(receita)
  const comissaoConfirmada = comissaoDe(receitaConfirmada)
  const faixa = faixaAtual(receita)
  const faixaConf = faixaAtual(receitaConfirmada)
  const proximaMeta = receita < META_1 ? META_1 : receita < META_2 ? META_2 : null
  const faltaMeta = proximaMeta ? proximaMeta - receita : 0

  /* ---------- perdas ---------- */
  const perdidosLeads = useMemo(() => leads.filter((l) => STAGE_CATALOG[l.stage]?.kind === 'lost' && doVendedor(l) && noCiclo(dataVendaDe(l, procDe(l)))),
    [leads, processes, ownerId, tipo, offset, custom]) // eslint-disable-line react-hooks/exhaustive-deps
  const perdidos = perdidosLeads.length
  const fechados = vendas.length + perdidos
  const conversao = fechados ? Math.round((vendas.length / fechados) * 100) : 0
  const taxaPerda = fechados ? Math.round((perdidos / fechados) * 100) : 0
  const motivos = useMemo(() => {
    const m = new Map<string, number>()
    perdidosLeads.forEach((l) => { const k = l.lossReason ?? 'Sem motivo'; m.set(k, (m.get(k) ?? 0) + 1) })
    return [...m.entries()].map(([motivo, qtd]) => ({ motivo, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 5)
  }, [perdidosLeads])

  /* ---------- esteira: dinheiro vendido que ainda não confirmou (snapshot, fora do ciclo) ---------- */
  const esteira = useMemo(() => {
    const meus = processes.filter((p) => daEquipe || p.vendedorId === ownerId)
    const ativos = meus.filter((p) => IMPL_ATIVAS.includes(p.stage))
    const pendProcs = meus.filter((p) => p.stage === 'pendencia')
    const pendLeads: AlertaLead[] = pendProcs
      .map((p) => { const l = leads.find((x) => x.id === p.leadId); return l ? { lead: l, nota: 'pendência na esteira', valor: p.valorMensal ?? 0 } : null })
      .filter((x): x is AlertaLead => x !== null)
    return { qtd: ativos.length, valor: ativos.reduce((s, p) => s + (p.valorMensal ?? 0), 0), pendencias: pendProcs.length, pendLeads }
  }, [processes, ownerId, daEquipe, leads])

  /* ---------- pipeline aberto, retornos e leads parados (snapshot) ---------- */
  const abertos = useMemo(() => leads.filter((l) => STAGE_CATALOG[l.stage]?.kind === 'open' && doVendedor(l)),
    [leads, processes, ownerId]) // eslint-disable-line react-hooks/exhaustive-deps
  const pipeline = abertos.reduce((s, l) => s + (l.valorEstimado ?? l.value ?? 0), 0)
  const cobertura = faltaMeta > 0 ? pipeline / faltaMeta : null
  const notaFunil = (l: Lead) => {
    if (l.followupInDays != null) return `retorno ${notaRetorno(l.followupInDays)}`
    const h = l.noContactHours ?? 0
    return h >= 24 ? `${Math.round(h / 24)}d sem contato` : 'sem retorno agendado'
  }
  const notaRetorno = (d: number) => d < -1 ? `há ${-d} dias` : d === -1 ? 'ontem' : d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`
  const asAlerta = (ls: Lead[], nota: (l: Lead) => string): AlertaLead[] => ls.map((l) => ({ lead: l, nota: nota(l), valor: l.valorEstimado ?? l.value ?? 0 }))
  const retornos = {
    atrasados: asAlerta(abertos.filter((l) => l.followupInDays != null && l.followupInDays < 0), (l) => `retorno ${notaRetorno(l.followupInDays!)}`),
    hoje: asAlerta(abertos.filter((l) => l.followupInDays === 0), () => 'retorno hoje'),
    proximos: asAlerta(abertos.filter((l) => l.followupInDays != null && l.followupInDays > 0 && l.followupInDays <= 3), (l) => `retorno ${notaRetorno(l.followupInDays!)}`),
    sem: asAlerta(abertos.filter((l) => l.followupInDays == null), () => 'sem retorno agendado'),
  }
  const paradosLeads = asAlerta(abertos.filter((l) => (l.noContactHours ?? 0) >= STALE_H), (l) => `${Math.round((l.noContactHours ?? 0) / 24)} dias sem contato`)
  const parados = paradosLeads.length
  const paradosPct = abertos.length ? Math.round((parados / abertos.length) * 100) : 0
  const paradoCritico = paradosPct >= 60 && abertos.length >= 5

  /* ---------- coorte do ciclo + ciclo médio de venda ---------- */
  const novos = useMemo(() => leads.filter((l) => doVendedor(l) && noCiclo(criadoEm(l))), [leads, processes, ownerId, tipo, offset, custom]) // eslint-disable-line react-hooks/exhaustive-deps
  const novosGanhos = novos.filter((l) => STAGE_CATALOG[l.stage]?.kind === 'won').length
  const convCoorte = novos.length ? Math.round((novosGanhos / novos.length) * 100) : 0
  const cicloMedio = vendas.length
    ? Math.round(vendas.reduce((s, v) => s + Math.max(0, (v.dataVenda.getTime() - criadoEm(v.lead).getTime()) / 86_400_000), 0) / vendas.length)
    : null

  /* ---------- ranking da equipe no ciclo ---------- */
  const ranking = useMemo(() => OWNERS.map((o) => {
    const vs = leads.filter((l) => {
      const p = procDe(l)
      return STAGE_CATALOG[l.stage]?.kind === 'won' && donoDe(l, p) === o.id && noCiclo(dataVendaDe(l, p))
    })
    return { owner: o, vendas: vs.length, receita: vs.reduce((s, l) => s + valorVenda(l, procDe(l)), 0) }
  }).sort((a, b) => (b.receita - a.receita) || (b.vendas - a.vendas) || a.owner.name.localeCompare(b.owner.name, 'pt-BR')),
    [leads, processes, tipo, offset, custom]) // eslint-disable-line react-hooks/exhaustive-deps
  const topReceita = Math.max(1, ...ranking.map((r) => r.receita))
  const rankingVazio = ranking.every((r) => r.receita === 0)
  const minhaPos = daEquipe ? 0 : ranking.findIndex((r) => r.owner.id === ownerId) + 1
  const gapAcima = minhaPos > 1 ? ranking[minhaPos - 2].receita - ranking[minhaPos - 1].receita : 0

  /* ---------- funil aberto: estoque por etapa, % do topo e avanço ---------- */
  const funil = useMemo(() => {
    const m = new Map<string, Lead[]>()
    abertos.forEach((l) => m.set(l.stage, [...(m.get(l.stage) ?? []), l]))
    const ordem = [...ETAPAS_ABERTAS, ...[...m.keys()].filter((k) => !ETAPAS_ABERTAS.includes(k))]
    const linhas = ordem.map((id) => {
      const ls = m.get(id) ?? []
      return { id, label: STAGE_CATALOG[id]?.label ?? id, leads: ls, qtd: ls.length, valor: ls.reduce((s, l) => s + (l.value ?? 0), 0) }
    })
    const topo = linhas[0]?.qtd ?? 0
    return linhas.map((f, i) => ({
      ...f,
      pctTopo: topo > 0 ? Math.round((f.qtd / topo) * 100) : 0,
      avanco: i > 0 && linhas[i - 1].qtd > 0 ? Math.round((f.qtd / linhas[i - 1].qtd) * 100) : null,
    }))
  }, [abertos])
  const funilTotal = funil.reduce((s, f) => s + f.qtd, 0)

  /* ---------- posição no período + projeção (só quando o período engloba hoje) ---------- */
  const periodoVigente = offset === 0 && inicio <= hoje && hoje <= fim
  const diasRestantes = Math.max(0, Math.round((fim.getTime() - hoje.getTime()) / 86_400_000))
  const pctDecorrido = Math.min(100, Math.max(0, ((hoje.getTime() - inicio.getTime()) / (fim.getTime() - inicio.getTime())) * 100))
  const projecao = ehCiclo && periodoVigente && pctDecorrido >= 10 && receita > 0 ? Math.round(receita / (pctDecorrido / 100)) : null

  /* ---------- período anterior (mesmo recorte/tipo) para o delta ---------- */
  const receitaAnterior = useMemo(() => {
    const p = rangeDe(tipo, offset - 1, custom)
    if (tipo === 'custom') return 0 // sem "anterior" definido em intervalo livre
    return leads
      .filter((l) => STAGE_CATALOG[l.stage]?.kind === 'won' && doVendedor(l))
      .filter((l) => { const d = dataVendaDe(l, procDe(l)); return d >= p.inicio && d <= p.fim })
      .reduce((s, l) => s + valorVenda(l, procDe(l)), 0)
  }, [leads, processes, ownerId, tipo, offset, custom]) // eslint-disable-line react-hooks/exhaustive-deps
  const delta = receitaAnterior > 0 ? Math.round(((receita - receitaAnterior) / receitaAnterior) * 100) : null

  /* ---------- escala da barra de meta ----------
     Sem excedente: linear até META_2. Com excedente: 0→META_2 ocupa 70% da barra e o que
     passa disso ocupa os 30% finais — o excesso aparece sem espremer os marcadores de faixa. */
  const excedeu = receita > META_2
  const posDe = (v: number) => {
    if (!excedeu) return Math.min(100, (v / META_2) * 100)
    return v <= META_2 ? (v / META_2) * 70 : 70 + ((v - META_2) / (receita - META_2)) * 30
  }
  const pctMeta = Math.round((receita / META_2) * 100)

  const Th = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th className={cn('px-2.5 py-2.5', right && 'text-right')}>
      <button onClick={() => toggleSort(k)} className={cn('group/th inline-flex items-center gap-1 font-semibold uppercase tracking-[0.08em] transition-colors hover:text-foreground', right && 'flex-row-reverse')}>
        {label}
        {sort.key === k
          ? (sort.dir === 'asc' ? <CaretUp className="h-3 w-3 text-teal" /> : <CaretDown className="h-3 w-3 text-teal" />)
          : <CaretUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover/th:opacity-40" />}
      </button>
    </th>
  )

  return (
    <div className="relative mx-auto max-w-[1400px] px-6 py-6">
      {/* Camada ambiente local — dá o que o glass (backdrop-blur) dos cards vai frostar */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[18%] top-4 h-[360px] w-[520px] rounded-full opacity-[0.10] blur-[100px] dark:opacity-[0.30]" style={{ background: 'radial-gradient(circle, #2DD4BF, transparent 60%)' }} />
        <div className="absolute right-[6%] top-[220px] h-[360px] w-[420px] rounded-full opacity-[0.08] blur-[100px] dark:opacity-[0.24]" style={{ background: 'radial-gradient(circle, #22D3EE, transparent 60%)' }} />
        <div className="absolute left-[-40px] top-[520px] h-[360px] w-[360px] rounded-full opacity-[0.06] blur-[110px] dark:opacity-[0.18]" style={{ background: 'radial-gradient(circle, #2DD4BF, transparent 60%)' }} />
      </div>

      {/* header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Performance</h1>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">Vendas, metas e comissão do período selecionado.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {ehCiclo && periodoVigente && (
            <span className="text-[12px] tabular-nums text-muted-foreground">
              {diasRestantes === 0 ? 'último dia do ciclo' : `faltam ${diasRestantes} dia${diasRestantes === 1 ? '' : 's'}`}
            </span>
          )}
          <PeriodoSelect tipo={tipo} onTipo={trocaTipo} custom={custom} onCustom={setCustom} />
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-card px-1 py-0.5">
            <button
              onClick={() => setOffset((o) => Math.max(CICLO_MIN, o - 1))}
              disabled={!navegavel || offset <= CICLO_MIN}
              aria-label="Período anterior" title="Período anterior"
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            ><CaretLeft className="h-3.5 w-3.5" weight="bold" /></button>
            <span className="min-w-[92px] px-1 text-center text-[12.5px] font-semibold tabular-nums text-foreground">{rotuloPeriodo(tipo, inicio, fim)}</span>
            <button
              onClick={() => setOffset((o) => Math.min(0, o + 1))}
              disabled={!navegavel || offset >= 0}
              aria-label="Próximo período" title="Próximo período"
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            ><CaretRight className="h-3.5 w-3.5" weight="bold" /></button>
          </div>
        </div>
      </div>

      {/* seletor de vendedor */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <button onClick={() => setOwnerId('equipe')} className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors', daEquipe ? 'border-teal bg-teal/[0.08] text-foreground' : 'border-border/50 text-muted-foreground hover:bg-foreground/[0.03]')}>
          <Users className="h-4 w-4" weight="duotone" /> Equipe
        </button>
        {OWNERS.map((o) => (
          <button key={o.id} onClick={() => setOwnerId(o.id)} className={cn('inline-flex items-center gap-2 rounded-lg border py-1.5 pl-1.5 pr-3 text-[13px] font-medium transition-colors', ownerId === o.id ? 'border-teal bg-teal/[0.08] text-foreground' : 'border-border/50 text-muted-foreground hover:bg-foreground/[0.03]')}>
            <img src={o.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />{o.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* KPIs do ciclo */}
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Receita vendida"
          valor={brl(receita)}
          hint={
            <>
              {vendas.length} venda{vendas.length === 1 ? '' : 's'}
              {delta !== null && (
                <>{' · '}<span className={cn('font-semibold tabular-nums', delta >= 0 ? 'text-success' : 'text-danger')}>{delta >= 0 ? '+' : ''}{delta}%</span></>
              )}
            </>
          }
        />
        <Kpi label="Confirmada (paga)" valor={brl(receitaConfirmada)} hint={emAberto > 0 ? `${brl(emAberto)} em aberto` : vendas.length ? 'tudo confirmado' : '—'} />
        <Kpi destaque label="Comissão projetada" valor={brl(comissao)} hint={`${brl(comissaoConfirmada)} confirmada`} />
        <Kpi label="Ticket médio" valor={vendas.length ? brl(ticket) : '—'} hint={vendas.length ? `${brl(porVida)}/vida · ${vidas} vidas` : 'sem vendas no período'} />
        <Kpi label="Conversão" valor={fechados ? `${conversao}%` : '—'} hint={fechados ? `${vendas.length} ganho${vendas.length === 1 ? '' : 's'} · ${perdidos} perdido${perdidos === 1 ? '' : 's'}` : 'nada fechado no período'} />
      </div>

      {/* métricas secundárias */}
      <div className={cn('mb-5 grid grid-cols-2 divide-x divide-y divide-border/40 overflow-hidden rounded-xl sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6', GLASS)}>
        <Mini label="Em implantação" valor={brl(esteira.valor)} hint={`${esteira.qtd} proposta${esteira.qtd === 1 ? '' : 's'} na esteira`} />
        <Mini label="No pipe" valor={brl(pipeline)} hint={cobertura !== null ? `cobre ${cobertura.toFixed(1)}× o que falta` : `${abertos.length} lead${abertos.length === 1 ? '' : 's'} em aberto`} />
        <Mini label="Novos leads" valor={String(novos.length)} hint={novos.length ? `${convCoorte}% viraram venda` : 'nenhum no período'} />
        <Mini label="Ciclo de venda" valor={cicloMedio !== null ? `${cicloMedio}d` : '—'} hint="da entrada ao ganho" />
        <Mini label="Perdidos" valor={String(perdidos)} hint={fechados ? `${taxaPerda}% dos fechados` : 'nada fechado'} tone={perdidos > 0 ? 'text-danger' : undefined} />
        <Mini label="Parados +7d" valor={String(parados)} hint={abertos.length ? `${paradosPct}% do funil aberto` : 'sem leads abertos'} tone={paradoCritico ? 'text-danger' : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0 space-y-5">
          {/* meta / faixa progressiva */}
          <div className={cn('rounded-xl p-4', GLASS)}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className={TITULO}>Meta do ciclo</h2>
                {!ehCiclo && <span className="text-[11px] text-muted-foreground/70">faixas do ciclo · progresso {escopo}</span>}
                <span className="rounded bg-teal px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-primary-foreground">projetada {faixa.label}</span>
                <span className="rounded bg-success px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-success-foreground">confirmada {faixaConf.label}</span>
              </div>
              <span className="text-[12.5px] text-muted-foreground">
                {proximaMeta
                  ? <>Faltam <strong className="font-mono tabular-nums text-teal">{brl(faltaMeta)}</strong> para a faixa de {receita < META_1 ? '40%' : '50%'}</>
                  : <>Faixa máxima · <strong className="font-mono tabular-nums text-teal">{pctMeta}%</strong> da meta</>}
              </span>
            </div>

            <div className="relative h-3 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--teal))] to-cyan-400 transition-all" style={{ width: `${posDe(receita)}%` }} />
              {/* trecho já confirmado (pago) */}
              <div className="absolute inset-y-0 left-0 rounded-full bg-success/85 transition-all" style={{ width: `${posDe(receitaConfirmada)}%` }} title={`confirmado: ${brl(receitaConfirmada)}`} />
              {/* marcadores das faixas */}
              {[META_1, META_2].map((m) => (
                <span key={m} className="absolute inset-y-0 w-px -translate-x-1/2 bg-foreground/35 dark:bg-background/80" style={{ left: `${posDe(m)}%` }} />
              ))}
              {/* ritmo esperado: fração do ciclo já decorrida projetada sobre a meta */}
              {ehCiclo && periodoVigente && receita < META_2 && (
                <span
                  title={`ritmo esperado · ${Math.round(pctDecorrido)}% do ciclo decorrido`}
                  className="absolute inset-y-0 w-[2px] -translate-x-1/2 rounded-full bg-foreground/70"
                  style={{ left: `${posDe((pctDecorrido / 100) * META_2)}%` }}
                />
              )}
            </div>

            {/* régua alinhada aos marcadores */}
            <div className="relative mt-1.5 h-4">
              <span className="absolute left-0 text-[11px] tabular-nums text-muted-foreground">R$ 0 · 30%</span>
              {[{ v: META_1, l: '40%' }, { v: META_2, l: '50%' }].map(({ v, l }) => {
                const pos = posDe(v)
                const naPonta = pos > 97 // não deixa o rótulo vazar do card
                return (
                  <span
                    key={v}
                    className={cn('absolute whitespace-nowrap text-[11px] tabular-nums', !naPonta && '-translate-x-1/2', receita >= v ? 'font-semibold text-teal' : 'text-muted-foreground')}
                    style={naPonta ? { right: 0 } : { left: `${pos}%` }}
                  >{brl(v)} · {l}</span>
                )
              })}
              {receita > META_2 && (
                <span className="absolute right-0 font-mono text-[11px] font-semibold tabular-nums text-teal">{brl(receita)}</span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/40 pt-3 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />confirmado <strong className="font-mono tabular-nums text-foreground">{brl(receitaConfirmada)}</strong></span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal" />em implantação <strong className="font-mono tabular-nums text-foreground">{brl(emAberto)}</strong></span>
              {projecao !== null && (
                <span className="ml-auto">Ritmo atual projeta <strong className="font-mono tabular-nums text-foreground">{brl(projecao)}</strong> no fim do ciclo</span>
              )}
            </div>
          </div>

          {/* vendas do ciclo */}
          <div className={cn('overflow-hidden rounded-xl', GLASS)}>
            <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
              <h2 className={TITULO}>Vendas {escopo}</h2>
              <span className="grid h-5 min-w-5 place-items-center rounded-md bg-teal px-1.5 text-[11px] font-bold tabular-nums text-primary-foreground">{vendas.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] table-auto border-collapse text-left">
                <thead>
                  <tr className={cn('border-b border-border/40 bg-muted/25', MICRO)}>
                    <Th k="cliente" label="Cliente" />
                    <Th k="operadora" label="Operadora" />
                    <Th k="data" label="Venda" />
                    <Th k="vidas" label="Vidas" right />
                    <Th k="valor" label="Valor/mês" right />
                    <Th k="comissao" label="Comissão" right />
                    <Th k="implantacao" label="Status" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {vendasPagina.map(({ lead, proc, valor, comissao: com, faixaLinha, dataVenda }) => {
                    const dono = OWNERS.find((o) => o.id === donoDe(lead, proc))
                    return (
                      <tr key={lead.id} className="transition-colors hover:bg-foreground/[0.02]">
                        <td className="px-2.5 py-2.5">
                          <span className="flex items-center gap-2">
                            {daEquipe && dono && <img src={dono.avatar} alt="" title={dono.name} className="h-5 w-5 shrink-0 rounded-full object-cover" />}
                            <button onClick={() => openDetail(lead.id)} title={lead.name} className="max-w-[150px] truncate text-[13.5px] font-semibold text-foreground transition-colors hover:text-teal">{lead.name}</button>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-2.5 text-[13px] text-muted-foreground">{lead.operadora}</td>
                        <td className="whitespace-nowrap px-2.5 py-2.5 text-[13px] tabular-nums text-muted-foreground">{fmtDia(dataVenda)}</td>
                        <td className="px-2.5 py-2.5 text-right text-[13px] tabular-nums text-muted-foreground">{lead.vidas}</td>
                        <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono text-[13px] font-semibold tabular-nums text-foreground">{brl(valor)}</td>
                        <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono text-[13px] font-semibold tabular-nums text-success" title={`comissão marginal · faixa ${faixaLinha}`}>{brl(com)}</td>
                        <td className="whitespace-nowrap px-2.5 py-2.5">
                          {proc ? <StatusImpl stage={proc.stage} /> : <span className="text-[12.5px] text-muted-foreground/50">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                  {vendas.length === 0 && (
                    <tr><td colSpan={7} className="px-2.5 py-12 text-center text-[13px] text-muted-foreground/60">Nenhuma venda registrada neste período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-2.5">
                <span className="text-[12px] tabular-nums text-muted-foreground">
                  {paginaAtual * POR_PAGINA + 1}–{Math.min((paginaAtual + 1) * POR_PAGINA, vendasOrdenadas.length)} de {vendasOrdenadas.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPagina((p) => Math.max(0, p - 1))}
                    disabled={paginaAtual === 0}
                    aria-label="Página anterior" title="Página anterior"
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  ><CaretLeft className="h-3.5 w-3.5" weight="bold" /></button>
                  <span className="px-1 text-[12px] font-semibold tabular-nums text-foreground">{paginaAtual + 1}/{totalPaginas}</span>
                  <button
                    onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                    disabled={paginaAtual >= totalPaginas - 1}
                    aria-label="Próxima página" title="Próxima página"
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  ><CaretRight className="h-3.5 w-3.5" weight="bold" /></button>
                </div>
              </div>
            )}
          </div>

          {/* funil aberto — abaixo das vendas, cada etapa abre os leads */}
          <div className={cn('rounded-xl p-4', GLASS)}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className={TITULO}>Funil aberto</h2>
              <span className="text-[11px] tabular-nums text-muted-foreground">{funilTotal} lead{funilTotal === 1 ? '' : 's'}</span>
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground/70">Estoque de agora — não muda com o período. Clique na etapa para ver os leads.</p>
            <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {funil.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={f.qtd > 0 ? () => setAlertaModal({ titulo: `Funil · ${f.label}`, itens: f.leads.map((l) => ({ lead: l, nota: notaFunil(l), valor: l.valorEstimado ?? l.value ?? 0 })) }) : undefined}
                  disabled={f.qtd === 0}
                  className={cn('group/etapa w-full rounded-lg px-2 py-1.5 text-left transition-colors', f.qtd === 0 ? 'cursor-default opacity-45' : 'hover:bg-foreground/[0.04]')}
                >
                  {i > 0 && f.avanco !== null && (
                    <p className="mb-1 text-[10.5px] tabular-nums text-muted-foreground/60">↓ {f.avanco}% da etapa anterior</p>
                  )}
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground transition-colors group-hover/etapa:text-foreground">{f.label}</span>
                    <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">{brl(f.valor)}</span>
                    <span className="w-6 shrink-0 text-right text-[13px] font-bold tabular-nums text-foreground">{f.qtd}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
                      <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${f.pctTopo}%` }} />
                    </div>
                    <span className="w-9 shrink-0 text-right text-[10.5px] tabular-nums text-muted-foreground/70">{f.pctTopo}%</span>
                  </div>
                </button>
              ))}
            </div>
            {funilTotal === 0 && <p className="py-4 text-center text-[12.5px] text-muted-foreground/60">Sem leads em aberto.</p>}
          </div>
        </div>

        {/* coluna direita */}
        <div className="space-y-5">
          {/* atenção — retornos e pendências (snapshot). Cada pílula abre a lista. */}
          <div className={cn('rounded-xl p-4', GLASS)}>
            <h2 className={cn('mb-3', TITULO)}>Precisa de atenção</h2>
            <div className="flex flex-wrap gap-1.5">
              <Alerta n={retornos.atrasados.length} label={`retorno${retornos.atrasados.length === 1 ? '' : 's'} atrasado${retornos.atrasados.length === 1 ? '' : 's'}`} tone="danger" onClick={() => setAlertaModal({ titulo: 'Retornos atrasados', itens: retornos.atrasados })} />
              <Alerta n={retornos.hoje.length} label={`retorno${retornos.hoje.length === 1 ? '' : 's'} hoje`} tone="warning" onClick={() => setAlertaModal({ titulo: 'Retornos de hoje', itens: retornos.hoje })} />
              <Alerta n={esteira.pendencias} label={`pendência${esteira.pendencias === 1 ? '' : 's'} na esteira`} tone="danger" onClick={() => setAlertaModal({ titulo: 'Pendências na esteira', itens: esteira.pendLeads })} />
              <Alerta n={retornos.proximos.length} label={`retorno${retornos.proximos.length === 1 ? '' : 's'} em 3 dias`} tone="muted" onClick={() => setAlertaModal({ titulo: 'Retornos nos próximos 3 dias', itens: retornos.proximos })} />
              <Alerta n={retornos.sem.length} label="sem retorno agendado" tone="muted" onClick={() => setAlertaModal({ titulo: 'Sem retorno agendado', itens: retornos.sem })} />
            </div>
            {paradoCritico && (
              <button
                onClick={() => setAlertaModal({ titulo: 'Leads parados há +7 dias', itens: paradosLeads })}
                className="mt-3 flex w-full items-center justify-between gap-2 rounded bg-danger px-2.5 py-1.5 text-left text-[11.5px] font-semibold text-white transition-colors hover:brightness-110"
              >
                <span>{paradosPct}% do funil aberto está sem contato há mais de 7 dias.</span>
                <Chevron className="h-3.5 w-3.5 shrink-0" weight="bold" />
              </button>
            )}
          </div>

          {/* ranking */}
          <div className={cn('rounded-xl p-4', GLASS)}>
            <h2 className={cn('mb-3', TITULO)}>Ranking {escopo}</h2>
            {rankingVazio ? (
              <p className="py-6 text-center text-[12.5px] text-muted-foreground/60">Nenhuma venda da equipe neste período.</p>
            ) : (
              <>
                {!daEquipe && minhaPos > 0 && (
                  <p className="mb-3 rounded bg-teal/[0.08] px-2.5 py-1.5 text-[12px] text-foreground ring-1 ring-inset ring-teal/25">
                    {minhaPos === 1
                      ? <>Você está em <strong>1º lugar</strong> na equipe.</>
                      : <>Você está em <strong>{minhaPos}º</strong> — faltam <strong className="font-mono tabular-nums text-teal">{brl(gapAcima)}</strong> para o {minhaPos - 1}º.</>}
                  </p>
                )}
                <div className="space-y-3">
                  {ranking.map((r, i) => {
                    const lider = i === 0 && r.receita > 0
                    return (
                      <div key={r.owner.id} className={cn('rounded-lg p-2 transition-colors', ownerId === r.owner.id && 'bg-teal/[0.06] ring-1 ring-inset ring-teal/25')}>
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded text-[11px] font-bold tabular-nums', lider ? 'bg-teal text-primary-foreground' : 'bg-foreground/[0.06] text-muted-foreground')}>{i + 1}</span>
                          <img src={r.owner.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                          <button onClick={() => setOwnerId(r.owner.id)} className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-foreground transition-colors hover:text-teal">{r.owner.name.split(' ')[0]}</button>
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{r.vendas}v</span>
                          <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-foreground">{brl(r.receita)}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                          <div className={cn('h-full rounded-full transition-all', lider ? 'bg-teal' : 'bg-teal/45')} style={{ width: `${(r.receita / topReceita) * 100}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* perdas por motivo */}
          {motivos.length > 0 && (
            <div className={cn('rounded-xl p-4', GLASS)}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className={TITULO}>Motivos de perda</h2>
                <span className="text-[11px] tabular-nums text-muted-foreground">{perdidos} no período</span>
              </div>
              <div className="space-y-2.5">
                {motivos.map((m) => (
                  <div key={m.motivo}>
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground" title={m.motivo}>{m.motivo}</span>
                      <span className="shrink-0 text-[13px] font-bold tabular-nums text-foreground">{m.qtd}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                      <div className="h-full rounded-full bg-danger/70 transition-all" style={{ width: `${(m.qtd / motivos[0].qtd) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {alertaModal && (
        <AlertaModal
          titulo={alertaModal.titulo}
          itens={alertaModal.itens}
          onOpenLead={openDetail}
          onClose={() => setAlertaModal(null)}
        />
      )}
    </div>
  )
}
