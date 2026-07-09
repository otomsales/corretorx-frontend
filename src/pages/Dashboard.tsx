import { useState } from 'react'
import { Wallet, HeartPulse, GitBranch, Trophy, ClipboardCheck } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { Sparkline } from '@/components/ui/Sparkline'
import { cn } from '@/lib/utils'
import { brl, brlFull, num, pct } from '@/lib/format'
import { kpis, funil, renovacoes, operadoras, corretores, receitaTrend } from '@/lib/mock'

const PERIODS = ['Hoje', '7 dias', '30 dias', 'Mês', 'Ano'] as const

function Card({ title, action, children, className }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <section className={cn('flex flex-col rounded-2xl border border-border bg-card', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  )
}

function Funil() {
  const max = Math.max(...funil.map((f) => f.count))
  return (
    <div className="space-y-2.5">
      {funil.map((s, i) => {
        const width = Math.max(6, (s.count / max) * 100)
        const conv = i > 0 ? (s.count / funil[i - 1].count) * 100 : null
        const won = s.code === 'ganho'
        return (
          <div key={s.code} className="grid grid-cols-[120px_1fr_92px] items-center gap-3">
            <span className="truncate text-[13px] text-muted-foreground">{s.label}</span>
            <div className="relative h-7 overflow-hidden rounded-md bg-muted/50">
              <div
                className={cn('h-full rounded-md', won ? 'bg-success' : 'bg-gradient-to-r from-[#0EA5A0] to-[#22D3EE]')}
                style={{ width: `${width}%` }}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-bold tabular-nums text-white mix-blend-plus-lighter">
                {s.count}
              </span>
              {conv != null && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-foreground/55">
                  {pct(conv, 0)}
                </span>
              )}
            </div>
            <span className="text-right text-[12px] font-medium tabular-nums text-muted-foreground">{brl(s.valueCents)}</span>
          </div>
        )
      })}
    </div>
  )
}

function Operadoras() {
  const max = Math.max(...operadoras.map((o) => o.receitaCents))
  return (
    <div className="space-y-3">
      {operadoras.map((o) => (
        <div key={o.nome} className="space-y-1">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium text-foreground">{o.nome}</span>
            <span className="tabular-nums text-muted-foreground">{o.vidas} vidas · <span className="font-semibold text-foreground">{brl(o.receitaCents)}</span></span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
            <div className="h-full rounded-full bg-gradient-to-r from-[#0EA5A0] to-[#22D3EE]" style={{ width: `${(o.receitaCents / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Renovacoes() {
  return (
    <div className="space-y-2">
      {renovacoes.map((r) => {
        const urg = r.dias <= 7 ? 'bg-danger text-white' : r.dias <= 15 ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground'
        return (
          <div key={r.cliente} className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground">{r.cliente}</p>
              <p className="truncate text-[11.5px] text-muted-foreground">{r.operadora} · {brl(r.valueCents)}/mês</p>
            </div>
            {r.tipo === 'reajuste' ? (
              <span className="shrink-0 rounded-md bg-warning px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-warning-foreground">+{pct(r.pct)}</span>
            ) : (
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Renovação</span>
            )}
            <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums', urg)}>{r.dias}d</span>
          </div>
        )
      })}
    </div>
  )
}

function Corretores() {
  const maxRec = Math.max(...corretores.map((c) => c.receitaCents))
  return (
    <div className="space-y-3">
      {corretores.map((c, i) => (
        <div key={c.nome} className="flex items-center gap-3">
          <span className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold tabular-nums',
            i === 0 ? 'bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE] text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-[13px] font-medium text-foreground">{c.nome}</span>
              <span className="text-[12px] font-semibold tabular-nums text-foreground">{brl(c.receitaCents)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
                <div className={cn('h-full rounded-full', c.metaPct >= 100 ? 'bg-success' : 'bg-teal')} style={{ width: `${Math.min(100, (c.receitaCents / maxRec) * 100)}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{c.vendas} vendas</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('30 dias')

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-5 lg:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">Panorama da corretora — comercial, carteira e renovações.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                period === p
                  ? 'bg-[hsl(var(--brand-soft))] text-[hsl(var(--brand-soft-foreground))]'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Receita recorrente" value={brl(kpis.mrrCents)} sub="MRR da carteira" trend={kpis.mrrTrend} history={kpis.mrrHistory} icon={Wallet} />
        <StatCard label="Vidas ativas" value={num(kpis.vidasAtivas)} sub="sob gestão" trend={kpis.vidasTrend} history={kpis.vidasHistory} icon={HeartPulse} />
        <StatCard label="Negociações" value={num(kpis.negociacoesAbertas)} sub={`${brl(kpis.pipelineCents)} em aberto`} trend={kpis.negociacoesTrend} history={kpis.negociacoesHistory} icon={GitBranch} />
        <StatCard label="Conversão" value={pct(kpis.conversao)} sub={`${kpis.ganhosMes} ganhos no mês`} trend={kpis.conversaoTrend} history={kpis.conversaoHistory} icon={Trophy} />
        <StatCard label="Implantações" value={num(kpis.implantacoesAndamento)} sub="em andamento" trend={kpis.implantacoesTrend} history={kpis.implantacoesHistory} icon={ClipboardCheck} />
      </div>

      {/* Funil + Receita */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Funil comercial" className="lg:col-span-2" action={<span className="text-xs text-muted-foreground">128 leads no período</span>}>
          <Funil />
        </Card>
        <Card title="Receita recorrente" action={<span className="rounded-md bg-success px-1.5 py-0.5 text-[11px] font-semibold text-success-foreground">+{pct(kpis.mrrTrend)}</span>}>
          <p className="font-mono text-[28px] font-bold leading-none tracking-tight tabular-nums">{brlFull(kpis.mrrCents)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Últimos 12 meses</p>
          <Sparkline data={receitaTrend} width={320} height={96} className="mt-4 w-full" />
        </Card>
      </div>

      {/* Renovações + Operadoras + Corretores */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Renovações & reajustes" action={<span className="text-xs font-medium text-warning">próximos 30 dias</span>}>
          <Renovacoes />
        </Card>
        <Card title="Carteira por operadora">
          <Operadoras />
        </Card>
        <Card title="Top corretores" action={<span className="text-xs text-muted-foreground">mês atual</span>}>
          <Corretores />
        </Card>
      </div>
    </div>
  )
}
