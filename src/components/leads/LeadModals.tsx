import { useState } from 'react'
import { ChevronDown, Check, X, Plus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OWNERS, STAGE_CATALOG, type Lead } from '@/lib/funil-data'
import { useCustomFields } from '@/store/customFields'
import { CustomFieldFormInput } from './CustomFields'

const SHADOW = 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]'
const inputCls = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-teal focus:ring-[2.5px] focus:ring-teal/20'

const OPERADORA_OPTS = ['Amil', 'Bradesco Saúde', 'SulAmérica', 'Hapvida', 'Unimed', 'NotreDame'].map((o) => ({ value: o, label: o }))
const PLANO_OPTS = ['PME', 'PME Adesão', 'Individual', 'Empresarial'].map((p) => ({ value: p, label: p }))
const SOURCE_OPTS = ['Meta Ads', 'Indicação', 'Site', 'WhatsApp', 'Prospecção'].map((s) => ({ value: s, label: s }))
const TIER_OPTS = [{ value: 'bronze', label: 'Bronze' }, { value: 'prata', label: 'Prata' }, { value: 'ouro', label: 'Ouro' }, { value: 'diamante', label: 'Diamante' }]
const STAGE_OPTS = ['novo', 'atendimento', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'].map((id) => ({ value: id, label: STAGE_CATALOG[id].label }))
const OWNER_OPTS = OWNERS.map((o) => ({ value: o.id, label: o.name }))
const STAGE_COLOR: Record<string, string> = {
  novo: '--stage-1', atendimento: '--stage-2', qualificado: '--stage-3', proposta: '--stage-4',
  negociacao: '--stage-5', ganho: '--stage-6', perdido: '--stage-7',
}

const centsToReais = (c?: number | null) => c ? (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''
const reaisToCents = (v: string) => Math.round((parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0) * 100)

/* ---------- primitivos ---------- */
function FormSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)?.label
  return (
    <div className="relative">
      <button
        type="button" onClick={() => setOpen((v) => !v)}
        className={cn('flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 text-[13.5px] outline-none transition-colors', open ? 'border-teal' : 'border-input hover:border-teal/50')}
      >
        <span className={cn('truncate', current ? 'text-foreground' : 'text-muted-foreground/55')}>{current ?? placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} aria-hidden />
          <div className={cn('dropdown-in absolute left-0 top-full z-[70] mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/10 bg-card p-1.5', SHADOW)}>
            {options.map((o) => {
              const sel = value === o.value
              return (
                <button
                  key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                  className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors', sel ? 'bg-foreground/[0.06] font-medium text-teal' : 'text-foreground hover:bg-foreground/[0.05]')}
                >
                  <span className="truncate">{o.label}</span>
                  {sel && <Check className="h-3.5 w-3.5 shrink-0 text-teal" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-[11px] font-semibold text-muted-foreground">{label}</label>{children}</div>
}

function Shell({ title, subtitle, onClose, children, footer, wide }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative flex max-h-[88vh] w-full flex-col rounded-2xl border border-white/10 bg-card', wide ? 'max-w-xl' : 'max-w-md', SHADOW)}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">{footer}</div>
      </div>
    </div>
  )
}

const btnGhost = 'rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
const btnTeal = 'flex items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 text-[13px] font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45'
const btnDanger = 'flex items-center gap-1.5 rounded-lg bg-danger px-3.5 py-2 text-[13px] font-bold text-white transition hover:brightness-110'

/* ---------- criar / editar ---------- */
export function LeadFormModal({ initial, onClose, onSave }: {
  initial?: Lead | null; onClose: () => void; onSave: (l: Lead) => void
}) {
  const edit = !!initial
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [operadora, setOperadora] = useState(initial && initial.operadora !== '—' ? initial.operadora : '')
  const [plano, setPlano] = useState(initial?.plano ?? '')
  const [vidas, setVidas] = useState(String(initial?.vidas ?? 1))
  const [valor, setValor] = useState(centsToReais(initial?.value))
  const [tier, setTier] = useState(initial?.tier ?? '')
  const [source, setSource] = useState(initial?.source ?? '')
  const [ownerId, setOwnerId] = useState(initial?.ownerId ?? '')
  const [stage, setStage] = useState(initial?.stage ?? 'novo')
  const [cnpj, setCnpj] = useState(initial?.cnpj ?? false)
  const { fields: customFields } = useCustomFields()
  const [custom, setCustom] = useState<Record<string, string | boolean>>(initial?.custom ?? {})
  const valid = name.trim().length >= 2

  const submit = () => {
    if (!valid) return
    const base: Lead = initial ? { ...initial } : {
      id: `l-${Date.now()}`, name: '', phone: null, operadora: '—', plano: '', vidas: 1, value: 0,
      source: null, ownerId: null, stage: 'novo', lossReason: null, pipelineId: 'p-comercial',
      tags: [], entryDaysAgo: 0, slaMinutes: 0, noContactHours: 0, followupInDays: null,
    }
    onSave({
      ...base,
      name: name.trim(), phone: phone.replace(/\D/g, '') || null, city: city.trim() || undefined,
      operadora: operadora || '—', plano, vidas: Math.max(1, Number(vidas) || 1), value: reaisToCents(valor),
      tier: (tier || undefined) as Lead['tier'], source: source || null, ownerId: ownerId || null, stage, cnpj,
      custom: Object.keys(custom).length ? custom : undefined,
    })
  }

  return (
    <Shell
      wide title={edit ? 'Editar lead' : 'Novo lead'}
      subtitle={edit ? lead_sub(initial!) : 'Cadastre um novo lead na carteira.'}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} className={btnGhost}>Cancelar</button>
        <button onClick={submit} disabled={!valid} className={btnTeal}>{edit ? 'Salvar' : <><Plus className="h-4 w-4" /> Criar lead</>}</button>
      </>}
    >
      <div className="space-y-3.5">
        <Field label="Nome do lead / empresa"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Construtora Aurora" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="WhatsApp"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="(11) 98888-7777" className={inputCls} /></Field>
          <Field label="Cidade"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo, SP" className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Operadora"><FormSelect value={operadora} onChange={setOperadora} options={OPERADORA_OPTS} placeholder="Selecionar" /></Field>
          <Field label="Plano"><FormSelect value={plano} onChange={setPlano} options={PLANO_OPTS} placeholder="Selecionar" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3.5">
          <Field label="Vidas"><input value={vidas} onChange={(e) => setVidas(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputCls} /></Field>
          <Field label="Valor/mês (R$)"><input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="1.846,00" className={inputCls} /></Field>
          <Field label="Tier"><FormSelect value={tier} onChange={setTier} options={TIER_OPTS} placeholder="—" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3.5">
          <Field label="Etapa"><FormSelect value={stage} onChange={setStage} options={STAGE_OPTS} placeholder="Selecionar" /></Field>
          <Field label="Origem"><FormSelect value={source} onChange={setSource} options={SOURCE_OPTS} placeholder="Selecionar" /></Field>
          <Field label="Responsável"><FormSelect value={ownerId} onChange={setOwnerId} options={OWNER_OPTS} placeholder="Selecionar" /></Field>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2.5 pt-1 text-[13px] text-muted-foreground">
          <button type="button" role="checkbox" aria-checked={cnpj} onClick={() => setCnpj((v) => !v)} className={cn('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border-[1.5px] transition-all', cnpj ? 'border-transparent bg-teal' : 'border-input')}>
            {cnpj && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3.5} />}
          </button>
          É PME (tem CNPJ)
        </label>
        {customFields.length > 0 && (
          <div className="border-t border-border/40 pt-3.5">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Campos personalizados</p>
            <div className="grid grid-cols-2 gap-3.5">
              {customFields.map((f) => (
                <div key={f.id} className={f.type === 'textarea' || f.type === 'boolean' ? 'col-span-2' : ''}>
                  <CustomFieldFormInput field={f} value={custom[f.id]} onChange={(v) => setCustom((c) => ({ ...c, [f.id]: v }))} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
const lead_sub = (l: Lead) => `${l.operadora !== '—' ? l.operadora : 'Sem operadora'} · ${l.vidas} ${l.vidas === 1 ? 'vida' : 'vidas'}`

/* ---------- registrar contato ---------- */
const RETURN_OPTS = [
  { value: '0', label: 'Hoje' }, { value: '1', label: 'Amanhã' }, { value: '3', label: 'Em 3 dias' },
  { value: '7', label: 'Em 7 dias' }, { value: '', label: 'Sem retorno' },
]
export function LogContactModal({ lead, onClose, onSave }: {
  lead: Lead; onClose: () => void; onSave: (followupInDays: number | null) => void
}) {
  const [tipo, setTipo] = useState('contato')
  const [resumo, setResumo] = useState('')
  const [ret, setRet] = useState('1')
  const valid = resumo.trim().length >= 3

  return (
    <Shell
      title="Registrar contato" subtitle={lead.name} onClose={onClose}
      footer={<>
        <button onClick={onClose} className={btnGhost}>Cancelar</button>
        <button onClick={() => onSave(ret === '' ? null : Number(ret))} disabled={!valid} className={btnTeal}>Registrar</button>
      </>}
    >
      <div className="space-y-3.5">
        <Field label="Tipo"><FormSelect value={tipo} onChange={setTipo} options={[{ value: 'contato', label: 'Contato / Ligação' }, { value: 'proposta', label: 'Proposta' }, { value: 'nota', label: 'Nota interna' }]} placeholder="Selecionar" /></Field>
        <Field label="Resumo"><textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={3} placeholder="O que aconteceu no contato?" className={cn(inputCls, 'h-auto resize-none py-2.5 leading-relaxed')} /></Field>
        <Field label="Próximo retorno"><FormSelect value={ret} onChange={setRet} options={RETURN_OPTS} placeholder="Selecionar" /></Field>
      </div>
    </Shell>
  )
}

/* ---------- mover etapa ---------- */
export function MoveStageModal({ lead, onClose, onMove }: {
  lead: Lead; onClose: () => void; onMove: (stageId: string) => void
}) {
  return (
    <Shell title="Mover etapa" subtitle={lead.name} onClose={onClose} footer={<button onClick={onClose} className={btnGhost}>Fechar</button>}>
      <div className="space-y-1">
        {STAGE_OPTS.map((s) => {
          const sel = lead.stage === s.value
          return (
            <button
              key={s.value} onClick={() => onMove(s.value)}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors', sel ? 'bg-foreground/[0.06] font-semibold' : 'hover:bg-foreground/[0.04]')}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: `hsl(var(${STAGE_COLOR[s.value] ?? '--muted-foreground'}))` }} />
              <span className="flex-1">{s.label}</span>
              {sel && <Check className="h-4 w-4 shrink-0 text-teal" />}
            </button>
          )
        })}
      </div>
    </Shell>
  )
}

/* ---------- excluir ---------- */
export function ConfirmDeleteModal({ lead, onClose, onConfirm }: {
  lead: Lead; onClose: () => void; onConfirm: () => void
}) {
  return (
    <Shell
      title="Excluir lead" onClose={onClose}
      footer={<>
        <button onClick={onClose} className={btnGhost}>Cancelar</button>
        <button onClick={onConfirm} className={btnDanger}>Excluir</button>
      </>}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger/12"><AlertTriangle className="h-4 w-4 text-danger" /></span>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          Excluir <span className="font-semibold text-foreground">{lead.name}</span> da carteira? Esta ação não pode ser desfeita.
        </p>
      </div>
    </Shell>
  )
}
