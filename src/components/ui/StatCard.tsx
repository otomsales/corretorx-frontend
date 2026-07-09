import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Sparkline } from './Sparkline'
import { cn } from '@/lib/utils'

export function StatCard({
  label, value, sub, trend, history, icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  trend?: number
  history?: number[]
  icon?: LucideIcon
}) {
  const up = (trend ?? 0) >= 0
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1.5 font-mono text-[26px] font-bold leading-none tracking-tight tabular-nums text-foreground">{value}</p>
          {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        {Icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      {(trend != null || history) && (
        <div className="mt-3 flex items-end justify-between gap-3">
          {trend != null && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                up ? 'bg-success text-success-foreground' : 'bg-danger text-white',
              )}
            >
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
            </span>
          )}
          {history && (
            <Sparkline
              data={history}
              className="ml-auto"
              stroke={up ? 'hsl(var(--teal))' : 'hsl(var(--danger))'}
              width={104}
              height={34}
            />
          )}
        </div>
      )}
    </div>
  )
}
