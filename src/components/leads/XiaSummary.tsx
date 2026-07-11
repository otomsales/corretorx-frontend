import { useState } from 'react'
import { Sparkles, Flame, TrendingUp, Snowflake, ShieldAlert, ArrowRight, Copy, RefreshCw, Loader2, HeartPulse } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Lead } from '@/lib/funil-data'

const TIER_SCORE: Record<string, number> = { bronze: 42, prata: 56, ouro: 72, diamante: 88 }

function analyze(lead: Lead) {
  let score = TIER_SCORE[lead.tier ?? ''] ?? 50
  if (lead.followupInDays != null) { if (lead.followupInDays < 0) score -= 12; else if (lead.followupInDays === 0) score += 6 }
  if ((lead.noContactHours ?? 0) >= 72) score -= 10
  if (lead.value && lead.value >= 1500000) score += 6
  score = Math.max(8, Math.min(97, Math.round(score)))
  const temp = score >= 70
    ? { label: 'Quente', cls: 'bg-rose-600 text-white', icon: Flame }
    : score >= 50
      ? { label: 'Morno', cls: 'bg-amber-500 text-amber-950', icon: TrendingUp }
      : { label: 'Frio', cls: 'bg-sky-600 text-white', icon: Snowflake }

  const ctx = (lead.contexto ?? '').toLowerCase()
  const objs: string[] = []
  if (/pre[çc]o|caro|or[çc]amento/.test(ctx)) objs.push('Preço')
  if (/concorr|compar|outro corretor|outra operadora|sulam|amil|unimed|bradesco/.test(ctx)) objs.push('Comparando operadoras')
  if (/rede|credenciad|hospital/.test(ctx)) objs.push('Rede credenciada')
  if (/caren|prazo/.test(ctx)) objs.push('Carência')
  if (!objs.length) objs.push('Preço', 'Decisão em análise')

  const first = lead.name.split(' ')[0]
  const op = lead.operadora !== '—' ? lead.operadora : 'operadora ideal'
  const plano = lead.produtoSugerido ?? `${op}${lead.plano ? ` · ${lead.plano}` : ''}`
  const resumo = `${lead.name} busca plano ${lead.plano || 'de saúde'}${lead.cnpj ? ' (PME)' : ''} para ${lead.vidas} vida${lead.vidas > 1 ? 's' : ''}${lead.city ? ` em ${lead.city}` : ''}. Ponto de atenção: ${objs[0].toLowerCase()}.`
  const proxima = lead.proximaAcao ?? (lead.followupInDays != null && lead.followupInDays < 0 ? 'Retornar hoje — retorno atrasado' : 'Enviar proposta e agendar retorno')
  const rascunho = `Oi ${first}! Sobre o ${plano}: consigo uma condição especial para ${lead.vidas} vida${lead.vidas > 1 ? 's' : ''} e te envio a proposta ainda hoje. Posso te ligar mais tarde para alinhar os detalhes? 😊`
  return { score, temp, objs, resumo, proxima, plano, rascunho }
}

export function XiaSummary({ lead }: { lead: Lead }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const gen = () => { setState('loading'); setTimeout(() => setState('done'), 850) }

  if (state === 'idle') {
    return (
      <div className="border-l-2 border-teal/40 pl-4">
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          A X IA analisa a conversa e o histórico para te dar: resumo, temperatura do lead, objeções, plano ideal e a próxima melhor ação.
        </p>
        <button onClick={gen} className="mt-3 flex items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 text-[13px] font-bold text-primary-foreground transition hover:brightness-110">
          <Sparkles className="h-4 w-4" /> Gerar resumo
        </button>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center gap-2.5 border-l-2 border-teal/40 pl-4 py-2 text-[13.5px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-teal" /> Analisando conversa e histórico…
      </div>
    )
  }

  const a = analyze(lead)
  const copy = () => { navigator.clipboard?.writeText(a.rascunho); toast.success('Resposta copiada') }
  const Temp = a.temp.icon

  return (
    <div className="space-y-3.5">
      {/* resumo + regenerar */}
      <div className="flex items-start gap-2">
        <p className="flex-1 text-[14px] leading-relaxed text-foreground/90">{a.resumo}</p>
        <button onClick={gen} title="Atualizar" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-teal"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>

      {/* temperatura + score */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold', a.temp.cls)}><Temp className="h-3.5 w-3.5" /> {a.temp.label}</span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.05] px-2 py-1 text-[12px] font-medium text-muted-foreground">
          Score <span className="font-mono font-bold text-foreground">{a.score}</span>/100
        </span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]">
          <span className="block h-full rounded-full bg-gradient-to-r from-[#2DD4BF] to-[#22D3EE]" style={{ width: `${a.score}%` }} />
        </span>
      </div>

      {/* objeções */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70"><ShieldAlert className="h-3.5 w-3.5" /> Objeções</p>
        <div className="flex flex-wrap gap-1.5">
          {a.objs.map((o) => <span key={o} className="rounded-md bg-amber-500/12 px-1.5 py-0.5 text-[11px] font-medium text-amber-400">{o}</span>)}
        </div>
      </div>

      {/* plano sugerido */}
      <div className="flex items-center gap-2 rounded-lg bg-foreground/[0.03] px-3 py-2">
        <HeartPulse className="h-4 w-4 shrink-0 text-teal" />
        <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Plano sugerido</p><p className="truncate text-[13.5px] font-medium text-foreground">{a.plano}</p></div>
      </div>

      {/* próxima ação */}
      <div className="flex items-start gap-2 rounded-lg border border-teal/25 bg-teal/[0.06] px-3 py-2.5">
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
        <div><p className="text-[10px] font-semibold uppercase tracking-wide text-teal/80">Próxima melhor ação</p><p className="mt-0.5 text-[13.5px] font-medium text-foreground">{a.proxima}</p></div>
      </div>

      {/* rascunho de resposta */}
      <div>
        <p className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
          Rascunho de resposta
          <button onClick={copy} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-teal transition-colors hover:bg-teal/10"><Copy className="h-3 w-3" /> Copiar</button>
        </p>
        <p className="rounded-lg border border-border/60 bg-background px-3 py-2.5 text-[13.5px] leading-relaxed text-foreground/90">{a.rascunho}</p>
      </div>

      <p className="text-[10px] text-muted-foreground/50">Gerado pela X IA · revise antes de enviar</p>
    </div>
  )
}
