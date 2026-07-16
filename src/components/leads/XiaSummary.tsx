import { useState } from 'react'
import { Sparkle, Fire, TrendUp, Snowflake, ShieldWarning, ArrowRight, Copy, ArrowsClockwise, CircleNotch, Heartbeat, SealCheck, ListChecks } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { brl } from '@/lib/format'
import { useCustomFields } from '@/store/customFields'
import { customDisplay } from './CustomFields'
import type { Lead } from '@/lib/funil-data'

const TIER_SCORE: Record<string, number> = { bronze: 42, prata: 56, ouro: 72, diamante: 88 }

const MODES = [
  { key: 'vendas', label: 'Vendas' },
  { key: 'geral', label: 'Geral' },
  { key: 'implantacao', label: 'Implantação' },
] as const
type Mode = (typeof MODES)[number]['key']

function analyze(lead: Lead, mode: Mode, customFilled: { k: string; v: string }[]) {
  const first = lead.name.split(' ')[0]
  const op = lead.operadora !== '—' ? lead.operadora : 'operadora ideal'
  const plano = lead.produtoSugerido ?? `${op}${lead.plano ? ` · ${lead.plano}` : ''}`
  const ctx = (lead.contexto ?? '').toLowerCase()

  if (mode === 'geral') {
    const resumo = `${lead.name} — ${lead.plano || 'plano de saúde'}${lead.cnpj ? ' (PME)' : ''}, ${lead.vidas} vida${lead.vidas > 1 ? 's' : ''}${lead.city ? `, ${lead.city}` : ''}. Origem ${lead.source ?? '—'}.`
    const dados = [
      { k: 'Operadora', v: lead.operadora !== '—' ? lead.operadora : '—' },
      { k: 'Vidas', v: String(lead.vidas) },
      { k: 'Valor / mês', v: lead.value ? brl(lead.value) : '—' },
      { k: 'Etapa', v: lead.stage },
      { k: 'Próximo retorno', v: lead.followupInDays == null ? 'sem retorno' : lead.followupInDays === 0 ? 'hoje' : `em ${lead.followupInDays}d` },
    ]
    return { kind: 'geral' as const, resumo, dados, custom: customFilled }
  }

  if (mode === 'implantacao') {
    const resumo = `Implantação de ${lead.name}: ${op}${lead.plano ? ` · ${lead.plano}` : ''} para ${lead.vidas} vida${lead.vidas > 1 ? 's' : ''}${lead.value ? ` a ${brl(lead.value)}/mês` : ''}.`
    const checklist = [
      lead.cnpj ? 'Cartão CNPJ + contrato social' : 'RG/CPF do titular',
      'Comprovante de residência',
      lead.vidas > 1 ? `Documentos das ${lead.vidas} vidas (dependentes)` : 'Documentos do titular',
      'Ficha de adesão assinada',
      'Comprovante de vínculo (PME)',
    ].filter(Boolean) as string[]
    const proximos = ['Conferir documentos recebidos', 'Enviar proposta para a operadora', 'Agendar entrevista médica (se houver carência)', 'Confirmar data de vigência']
    return { kind: 'implantacao' as const, resumo, checklist, proximos, custom: customFilled }
  }

  // vendas
  let score = TIER_SCORE[lead.tier ?? ''] ?? 50
  if (lead.followupInDays != null) { if (lead.followupInDays < 0) score -= 12; else if (lead.followupInDays === 0) score += 6 }
  if ((lead.noContactHours ?? 0) >= 72) score -= 10
  if (lead.value && lead.value >= 1500000) score += 6
  score = Math.max(8, Math.min(97, Math.round(score)))
  const temp = score >= 70
    ? { label: 'Quente', cls: 'bg-rose-600 text-white', icon: Fire }
    : score >= 50 ? { label: 'Morno', cls: 'bg-amber-500 text-amber-950', icon: TrendUp }
      : { label: 'Frio', cls: 'bg-sky-600 text-white', icon: Snowflake }
  const objs: string[] = []
  if (/pre[çc]o|caro|or[çc]amento/.test(ctx)) objs.push('Preço')
  if (/concorr|compar|outro corretor|outra operadora|sulam|amil|unimed|bradesco/.test(ctx)) objs.push('Comparando operadoras')
  if (/rede|credenciad|hospital/.test(ctx)) objs.push('Rede credenciada')
  if (/caren|prazo/.test(ctx)) objs.push('Carência')
  if (!objs.length) objs.push('Preço', 'Decisão em análise')
  const resumo = `${lead.name} busca plano ${lead.plano || 'de saúde'}${lead.cnpj ? ' (PME)' : ''} para ${lead.vidas} vida${lead.vidas > 1 ? 's' : ''}${lead.city ? ` em ${lead.city}` : ''}. Ponto de atenção: ${objs[0].toLowerCase()}.`
  const proxima = lead.proximaAcao ?? (lead.followupInDays != null && lead.followupInDays < 0 ? 'Retornar hoje — retorno atrasado' : 'Enviar proposta e agendar retorno')
  const rascunho = `Oi ${first}! Sobre o ${plano}: consigo uma condição especial para ${lead.vidas} vida${lead.vidas > 1 ? 's' : ''} e te envio a proposta ainda hoje. Posso te ligar mais tarde para alinhar os detalhes? 😊`
  return { kind: 'vendas' as const, score, temp, objs, resumo, proxima, plano, rascunho, custom: customFilled }
}

export function XiaSummary({ lead }: { lead: Lead }) {
  const { fields } = useCustomFields()
  const [mode, setMode] = useState<Mode>('vendas')
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  const run = (ms = 850) => { setState('loading'); setTimeout(() => setState('done'), ms) }
  const gen = () => run()
  const switchMode = (m: Mode) => { setMode(m); if (state !== 'idle') run(500) }

  const customFilled = fields
    .map((f) => ({ f, raw: lead.custom?.[f.id] }))
    .filter(({ raw }) => raw !== undefined && raw !== '')
    .map(({ f, raw }) => ({ k: f.label, v: customDisplay(f, raw) }))

  const tabs = (
    <div className="mb-3 flex gap-1 rounded-lg bg-foreground/[0.05] p-0.5">
      {MODES.map((m) => (
        <button key={m.key} onClick={() => switchMode(m.key)} className={cn('flex-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors', mode === m.key ? 'bg-teal text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{m.label}</button>
      ))}
    </div>
  )

  if (state === 'idle') {
    return (
      <div>
        {tabs}
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">A X IA gera um resumo do tipo <span className="font-medium text-foreground">{MODES.find((m) => m.key === mode)?.label}</span> a partir da conversa, dos dados do lead e dos campos mapeados.</p>
        <button onClick={gen} className="mt-3 flex items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 text-[13px] font-bold text-primary-foreground transition hover:brightness-110"><Sparkle className="h-4 w-4" /> Gerar resumo</button>
      </div>
    )
  }
  if (state === 'loading') {
    return <div>{tabs}<div className="flex items-center gap-2.5 py-2 text-[13.5px] text-muted-foreground"><CircleNotch className="h-4 w-4 animate-spin text-teal" /> Analisando…</div></div>
  }

  const a = analyze(lead, mode, customFilled)
  const CustomBlock = a.custom.length > 0 ? (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Campos mapeados</p>
      <div className="space-y-0.5">{a.custom.map((c) => <div key={c.k} className="flex justify-between gap-3 text-[12.5px]"><span className="text-muted-foreground">{c.k}</span><span className="font-medium text-foreground">{c.v}</span></div>)}</div>
    </div>
  ) : null
  const refresh = <button onClick={() => run(500)} title="Atualizar" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-teal"><ArrowsClockwise className="h-3.5 w-3.5" /></button>

  return (
    <div>
      {tabs}
      <div className="space-y-3.5">
        <div className="flex items-start gap-2"><p className="flex-1 text-[14px] leading-relaxed text-foreground/90">{a.resumo}</p>{refresh}</div>

        {a.kind === 'vendas' && (() => {
          const Temp = a.temp.icon
          const copy = () => { navigator.clipboard?.writeText(a.rascunho); toast.success('Resposta copiada') }
          return (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold', a.temp.cls)}><Temp className="h-3.5 w-3.5" /> {a.temp.label}</span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.05] px-2 py-1 text-[12px] font-medium text-muted-foreground">Score <span className="font-mono font-bold text-foreground">{a.score}</span>/100</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]"><span className="block h-full rounded-full bg-gradient-to-r from-[#2DD4BF] to-[#22D3EE]" style={{ width: `${a.score}%` }} /></span>
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70"><ShieldWarning className="h-3.5 w-3.5" /> Objeções</p>
                <div className="flex flex-wrap gap-1.5">{a.objs.map((o) => <span key={o} className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[11px] font-medium text-amber-950">{o}</span>)}</div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-foreground/[0.03] px-3 py-2"><Heartbeat className="h-4 w-4 shrink-0 text-teal" /><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Plano sugerido</p><p className="truncate text-[13.5px] font-medium text-foreground">{a.plano}</p></div></div>
              <div className="flex items-start gap-2 rounded-lg border border-teal/25 bg-teal/[0.06] px-3 py-2.5"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-teal" /><div><p className="text-[10px] font-semibold uppercase tracking-wide text-teal/80">Próxima melhor ação</p><p className="mt-0.5 text-[13.5px] font-medium text-foreground">{a.proxima}</p></div></div>
              {CustomBlock}
              <div>
                <p className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Rascunho de resposta<button onClick={copy} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-teal transition-colors hover:bg-teal/10"><Copy className="h-3 w-3" /> Copiar</button></p>
                <p className="rounded-lg border border-border/60 bg-background px-3 py-2.5 text-[13.5px] leading-relaxed text-foreground/90">{a.rascunho}</p>
              </div>
            </>
          )
        })()}

        {a.kind === 'geral' && (
          <>
            <div className="space-y-0.5">{a.dados.map((d) => <div key={d.k} className="flex justify-between gap-3 text-[12.5px]"><span className="text-muted-foreground">{d.k}</span><span className="font-medium text-foreground">{d.v}</span></div>)}</div>
            {CustomBlock}
          </>
        )}

        {a.kind === 'implantacao' && (
          <>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70"><SealCheck className="h-3.5 w-3.5" /> Documentos</p>
              <ul className="space-y-1">{a.checklist.map((c) => <li key={c} className="flex items-center gap-2 text-[13px] text-foreground/90"><span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-border/70" />{c}</li>)}</ul>
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70"><ListChecks className="h-3.5 w-3.5" /> Próximos passos</p>
              <ol className="space-y-1">{a.proximos.map((p, i) => <li key={p} className="flex gap-2 text-[13px] text-foreground/90"><span className="font-mono text-teal">{i + 1}.</span>{p}</li>)}</ol>
            </div>
            {CustomBlock}
          </>
        )}

        <p className="text-[10px] text-muted-foreground/50">Gerado pela X IA · revise antes de usar</p>
      </div>
    </div>
  )
}
