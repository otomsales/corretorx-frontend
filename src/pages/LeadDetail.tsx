import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Phone, PhoneCall, MessageCircle, User, HeartPulse, Clock, History, FileText,
  MapPin, Zap, GitBranch, UserPlus, ChevronDown, Check, Plus, Paperclip, Mail, Target, Users, Megaphone, type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { brl, formatPhone } from '@/lib/format'
import { OWNERS, STAGE_CATALOG, DISC_OPTS, REL_OPTS, lifecycleOf, type Lead } from '@/lib/funil-data'
import { useLeads } from '@/store/leads'
import { StatusDot, FollowupCell, LeadAvatar } from '@/components/leads/LeadBadges'
import { TagChip } from '@/lib/tags'

const SHADOW = 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_16px_32px_-10px_rgba(0,0,0,0.55),0_44px_72px_-16px_rgba(0,0,0,0.7)]'
const OPERADORA_OPTS = ['Amil', 'Bradesco Saúde', 'SulAmérica', 'Hapvida', 'Unimed', 'NotreDame'].map((o) => ({ value: o, label: o }))
const PLANO_OPTS = ['PME', 'PME Adesão', 'Individual', 'Empresarial'].map((p) => ({ value: p, label: p }))
const SOURCE_OPTS = ['Meta Ads', 'Indicação', 'Site', 'WhatsApp', 'Prospecção'].map((s) => ({ value: s, label: s }))
const TIPO_OPTS = [{ value: 'pme', label: 'PME (CNPJ)' }, { value: 'pf', label: 'Pessoa física' }]
const TIERS = ['bronze', 'prata', 'ouro', 'diamante'] as const
const STAGE_COLOR: Record<string, string> = {
  novo: '--stage-1', atendimento: '--stage-2', qualificado: '--stage-3', proposta: '--stage-4',
  negociacao: '--stage-5', ganho: '--stage-6', perdido: '--stage-7',
}
const relH = (h?: number) => h == null ? '—' : h < 1 ? 'agora' : h < 24 ? `há ${h}h` : `há ${Math.round(h / 24)}d`
const relD = (d?: number) => d == null ? '—' : d === 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`
const centsToReais = (c?: number | null) => c ? (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''
const reaisToCents = (v: string) => Math.round((parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0) * 100)
const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`

type Opt = { value: string; label: string }
function useCreatable(base: Opt[]) {
  const [extra, setExtra] = useState<Opt[]>([])
  const all = [...base, ...extra]
  const options = (current?: string | null) => current && !all.some((o) => o.value === current) ? [...all, { value: current, label: current }] : all
  const remember = (v: string) => { const t = v.trim(); if (t && !all.some((o) => o.value === t)) setExtra((prev) => [...prev, { value: t, label: t }]) }
  return { options, remember }
}

function Section({ icon: Icon, title, accent, children }: { icon: LucideIcon; title: string; accent?: boolean; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Icon className={cn('h-[15px] w-[15px] shrink-0', accent ? 'text-teal' : 'text-muted-foreground')} />
        <h3 className={cn('text-[13px] font-semibold leading-none tracking-[-0.01em]', accent ? 'text-teal' : 'text-foreground')}>{title}</h3>
        <div className={cn('h-px flex-1', accent ? 'bg-teal/20' : 'bg-border/50')} />
      </div>
      {children}
    </section>
  )
}

function EditField({ label, value, display, type = 'text', options, creatable, icon: Icon, onCommit }: {
  label: string; value: string; display?: ReactNode
  type?: 'text' | 'number' | 'currency' | 'select'; options?: Opt[]; creatable?: boolean; icon?: LucideIcon; onCommit: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const [val, setVal] = useState(value)
  const [search, setSearch] = useState('')
  const start = () => { setVal(value); setSearch(''); setEditing(true); if (type === 'select') setOpen(true) }
  const commit = (v = val) => { setEditing(false); setOpen(false); if (v !== value) onCommit(v) }
  const cancel = () => { setEditing(false); setOpen(false) }
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-muted-foreground/55">{label}</p>
      {!editing ? (
        <button onClick={start} title="Clique para editar" className="group/e -mx-1.5 mt-1 flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[15px] text-foreground transition-colors hover:bg-foreground/[0.05]">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
          <span className={cn('truncate', type === 'currency' || type === 'number' ? 'font-mono tabular-nums' : '')}>{display ?? (value || '—')}</span>
        </button>
      ) : type === 'select' ? (
        <div className="relative mt-1">
          <button onClick={() => setOpen((o) => !o)} className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-teal bg-background px-2 text-[14px] outline-none">
            <span className="truncate">{options?.find((o) => o.value === val)?.label ?? val ?? '—'}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
          {open && (() => {
            const term = search.trim().toLowerCase()
            const list = creatable && term ? (options ?? []).filter((o) => o.label.toLowerCase().includes(term)) : (options ?? [])
            const canCreate = !!(creatable && term && !(options ?? []).some((o) => o.label.toLowerCase() === term))
            return (
              <>
                <button type="button" className="fixed inset-0 z-[60]" onClick={cancel} aria-hidden />
                <div className={cn('dropdown-in absolute left-0 top-full z-[70] mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-card p-1', SHADOW)}>
                  {creatable && <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar ou criar…" onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) { e.preventDefault(); commit(search.trim()) } else if (e.key === 'Escape') cancel() }} className="mb-1 h-8 w-full rounded border border-input bg-background px-2 text-[13px] outline-none focus:border-teal" />}
                  <div className="max-h-52 overflow-auto">
                    {list.map((o) => (
                      <button key={o.value} onClick={() => commit(o.value)} className={cn('flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[13.5px] transition-colors', o.value === val ? 'font-medium text-teal' : 'text-foreground hover:bg-foreground/[0.05]')}>
                        <span className="truncate">{o.label}</span>{o.value === val && <Check className="h-3.5 w-3.5 shrink-0 text-teal" />}
                      </button>
                    ))}
                    {canCreate && <button onClick={() => commit(search.trim())} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13.5px] font-medium text-teal transition-colors hover:bg-teal/[0.08]"><Plus className="h-3.5 w-3.5 shrink-0" /> Criar “{search.trim()}”</button>}
                    {list.length === 0 && !canCreate && <p className="px-2 py-1.5 text-[13px] text-muted-foreground">Nada encontrado.</p>}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      ) : (
        <input autoFocus value={val} inputMode={type === 'number' ? 'numeric' : type === 'currency' ? 'decimal' : undefined}
          onChange={(e) => setVal(type === 'number' ? e.target.value.replace(/\D/g, '') : e.target.value)}
          onBlur={() => commit()} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } else if (e.key === 'Escape') cancel() }}
          className={cn('mt-1 h-8 w-full rounded-md border border-teal bg-background px-2 text-[14px] outline-none focus:ring-[2.5px] focus:ring-teal/20', (type === 'currency' || type === 'number') && 'font-mono tabular-nums')} />
      )}
    </div>
  )
}

function ChipEdit<T extends string>({ value, opts, placeholder, onChange }: {
  value?: T; opts: readonly { value: T; label: string; cls: string }[]; placeholder: string; onChange: (v?: T) => void
}) {
  const [open, setOpen] = useState(false)
  const cur = opts.find((o) => o.value === value)
  return (
    <span className="relative inline-flex">
      <button onClick={() => setOpen((o) => !o)} className="rounded-md transition hover:opacity-80">
        {cur ? <span className={cn('inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold', cur.cls)}>{cur.label}</span> : <span className="rounded-md border border-dashed border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{placeholder}</span>}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className={cn('dropdown-in absolute left-0 top-full z-50 mt-1.5 w-40 rounded-lg border border-white/10 bg-card p-1', SHADOW)}>
            {opts.map((o) => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }} className={cn('flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 transition-colors hover:bg-foreground/[0.05]', value === o.value && 'bg-foreground/[0.06]')}>
                <span className={cn('inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold', o.cls)}>{o.label}</span>{value === o.value && <Check className="h-3.5 w-3.5 text-teal" />}
              </button>
            ))}
            <div className="my-1 h-px bg-border/60" />
            <button onClick={() => { onChange(undefined); setOpen(false) }} className="w-full rounded px-2 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-foreground/[0.05]">Limpar</button>
          </div>
        </>
      )}
    </span>
  )
}

function ResponsavelEdit({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const o = OWNERS.find((x) => x.id === value)
  return (
    <span className="relative inline-flex items-center text-[13px] text-muted-foreground">
      Responsável:
      <button onClick={() => setOpen((v) => !v)} title="Alterar responsável" className="ml-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium text-foreground transition-colors hover:bg-foreground/[0.06]">
        {o ? <img src={o.avatar} alt="" className="h-5 w-5 rounded-full object-cover" /> : null}{o?.name ?? '—'}<ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className={cn('dropdown-in absolute left-0 top-full z-50 mt-1.5 w-52 rounded-lg border border-white/10 bg-card p-1', SHADOW)}>
            {OWNERS.map((w) => (
              <button key={w.id} onClick={() => { onChange(w.id); setOpen(false) }} className={cn('flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.05]', value === w.id && 'bg-foreground/[0.06]')}>
                <img src={w.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" /><span className="flex-1 truncate text-[13px] text-foreground">{w.name}</span>{value === w.id && <Check className="h-3.5 w-3.5 shrink-0 text-teal" />}
              </button>
            ))}
          </div>
        </>
      )}
    </span>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex items-center justify-between py-1"><span className="text-[14px] text-muted-foreground">{label}</span>{children}</div>
}

function AddLife({ onAdd }: { onAdd: (l: { name: string; age: number; rel: string }) => void }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [rel, setRel] = useState('titular')
  const [open, setOpen] = useState(false)
  const add = () => { const a = Number(age); if (!name.trim() || !a) return; onAdd({ name: name.trim(), age: a, rel }); setName(''); setAge(''); setRel('titular'); setOpen(false) }
  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-teal hover:opacity-80"><Plus className="h-3.5 w-3.5" /> Adicionar vida</button>
  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-border/60 bg-foreground/[0.02] p-2">
      <div className="grid grid-cols-[1fr_58px] gap-1.5">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="h-8 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus:border-teal" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))} placeholder="Idade" inputMode="numeric" className="h-8 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus:border-teal" onKeyDown={(e) => e.key === 'Enter' && add()} />
      </div>
      <div className="flex items-center gap-1.5">
        <select value={rel} onChange={(e) => setRel(e.target.value)} className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-[13px] outline-none">
          {REL_OPTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button onClick={add} className="grid h-8 w-8 place-items-center rounded-md bg-teal text-primary-foreground"><Check className="h-4 w-4" /></button>
        <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

export default function LeadDetail() {
  const navigate = useNavigate()
  const { detailId, closeDetail, getLead, saveLead } = useLeads()
  const lead = getLead(detailId ?? undefined)
  const [note, setNote] = useState('')
  const [draft, setDraft] = useState(lead)
  const [dirty, setDirty] = useState(false)
  const attSeq = useRef(0)
  const org = useCreatable(SOURCE_OPTS)
  const ope = useCreatable(OPERADORA_OPTS)
  const pla = useCreatable(PLANO_OPTS)
  useEffect(() => { setDraft(lead); setDirty(false); setNote('') }, [detailId]) // eslint-disable-line react-hooks/exhaustive-deps
  // Esc fecha
  useEffect(() => {
    if (!detailId) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetail() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [detailId, closeDetail])

  if (!detailId || !lead) return null

  const cur = draft ?? lead
  const edit = (p: Partial<Lead>) => { setDraft((d) => ({ ...(d ?? lead), ...p })); setDirty(true) }
  const save = () => { if (draft) { saveLead(draft); setDirty(false); toast.success('Alterações salvas') } }
  const discard = () => { setDraft(lead); setDirty(false) }
  const addFiles = (files: File[]) => { if (!files.length) return; const atts = files.map((f) => ({ id: `att-${Date.now()}-${++attSeq.current}`, name: f.name, size: f.size, type: f.type, url: URL.createObjectURL(f) })); edit({ attachments: [...(cur.attachments ?? []), ...atts] }) }
  const removeAtt = (attId: string) => edit({ attachments: (cur.attachments ?? []).filter((a) => a.id !== attId) })
  const goChat = () => { closeDetail(); navigate('/app/chat') }

  const status = lifecycleOf(cur)
  const stage = STAGE_CATALOG[cur.stage]
  const stageColor = `hsl(var(${STAGE_COLOR[cur.stage] ?? '--muted-foreground'}))`
  const history = [
    stage?.kind === 'won' && { icon: GitBranch, text: `Movido para ${stage.label}`, when: relD(Math.max(0, (cur.entryDaysAgo ?? 0) - 1)) },
    { icon: GitBranch, text: `Entrou em ${stage?.label ?? '—'}`, when: relD(cur.entryDaysAgo) },
    { icon: UserPlus, text: `Lead criado${cur.source ? ` · ${cur.source}` : ''}`, when: relD(cur.entryDaysAgo) },
  ].filter(Boolean) as { icon: LucideIcon; text: string; when: string }[]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDetail} />
      <div className={cn('relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-background', SHADOW)}>
        {/* cabeçalho */}
        <div className="shrink-0 border-b border-border bg-background/95 px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={closeDetail} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X className="h-5 w-5" /></button>
            <LeadAvatar lead={cur} className="h-12 w-12" textCls="text-[15px]" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold tracking-tight">{cur.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: stageColor }} />{stage?.label ?? '—'}</span>
                {stage?.kind === 'open' && <StatusDot s={status} />}
                <ChipEdit value={cur.tier} opts={TIERS.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1), cls: t === 'bronze' ? 'bg-amber-700 text-white' : t === 'prata' ? 'bg-slate-400 text-slate-950' : t === 'ouro' ? 'bg-yellow-500 text-yellow-950' : 'bg-sky-500 text-white' }))} placeholder="+ tier" onChange={(t) => edit({ tier: t })} />
                <FollowupCell days={cur.followupInDays} />
                {cur.cnpj && <span className="text-muted-foreground/80">PME · CNPJ</span>}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5 pl-[52px]">
            <span className="inline-flex items-center gap-1.5 font-mono text-[15px] font-semibold tabular-nums text-foreground"><Phone className="h-4 w-4 text-teal" />{cur.phone ? formatPhone(cur.phone) : '—'}</span>
            <ResponsavelEdit value={cur.ownerId} onChange={(oid) => edit({ ownerId: oid })} />
            <div className="ml-auto flex items-center gap-2">
              {dirty && (<>
                <button onClick={discard} className="flex h-9 items-center rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Descartar</button>
                <button onClick={save} className="flex h-9 items-center gap-1.5 rounded-lg bg-teal px-4 text-[13px] font-bold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(34,211,238,.6)] transition hover:brightness-110"><Check className="h-4 w-4" /> Salvar</button>
                <span className="mx-1 h-5 w-px bg-border" />
              </>)}
              <button onClick={() => toast('Ligar — em breve')} disabled={!cur.phone} className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"><PhoneCall className="h-4 w-4" /> Ligar</button>
              <button onClick={goChat} className="flex h-9 items-center gap-1.5 rounded-lg bg-teal px-3.5 text-[13px] font-bold text-primary-foreground transition hover:brightness-110"><MessageCircle className="h-4 w-4" /> Conversar</button>
            </div>
          </div>
        </div>

        {/* corpo */}
        <div className="grid flex-1 grid-cols-1 gap-x-10 gap-y-8 overflow-y-auto px-6 py-6 lg:grid-cols-[380px_1fr]">
          {/* coluna esquerda — dados estruturados */}
          <div className="space-y-8">
            <Section icon={User} title="Dados do cliente">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <EditField label="Telefone" icon={Phone} value={cur.phone ?? ''} display={cur.phone ? formatPhone(cur.phone) : '—'} onCommit={(v) => edit({ phone: v.replace(/\D/g, '') || null })} />
                <EditField label="E-mail" icon={Mail} value={cur.email ?? ''} onCommit={(v) => edit({ email: v.trim() || undefined })} />
                <EditField label="Cidade" icon={MapPin} value={cur.city ?? ''} onCommit={(v) => edit({ city: v.trim() || undefined })} />
                <EditField label="CPF / CNPJ" value={cur.cpfCnpj ?? ''} onCommit={(v) => edit({ cpfCnpj: v.trim() || undefined })} />
                <EditField label="Tipo" type="select" options={TIPO_OPTS} value={cur.cnpj ? 'pme' : 'pf'} display={cur.cnpj ? 'PME (CNPJ)' : 'Pessoa física'} onCommit={(v) => edit({ cnpj: v === 'pme' })} />
                <EditField label="Origem" type="select" creatable options={org.options(cur.source)} value={cur.source ?? ''} display={cur.source ?? '—'} onCommit={(v) => { org.remember(v); edit({ source: v.trim() || null }) }} />
              </div>
              {cur.tags && cur.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5"><span className="mr-0.5 text-[10px] font-medium uppercase tracking-[0.07em] text-muted-foreground/55">Etiquetas</span>{cur.tags.map((t) => <TagChip key={t} tag={t} />)}</div>
              )}
            </Section>

            <Section icon={HeartPulse} title="Plano de saúde">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <EditField label="Operadora" type="select" creatable options={ope.options(cur.operadora !== '—' ? cur.operadora : '')} value={cur.operadora !== '—' ? cur.operadora : ''} display={cur.operadora !== '—' ? cur.operadora : '—'} onCommit={(v) => { ope.remember(v); edit({ operadora: v.trim() || '—' }) }} />
                <EditField label="Plano" type="select" creatable options={pla.options(cur.plano)} value={cur.plano} display={cur.plano || '—'} onCommit={(v) => { pla.remember(v); edit({ plano: v.trim() }) }} />
                <EditField label="Vidas" type="number" value={String(cur.vidas)} onCommit={(v) => edit({ vidas: Math.max(1, Number(v) || 1) })} />
                <EditField label="Valor / mês" type="currency" value={centsToReais(cur.value)} display={cur.value ? brl(cur.value) : '—'} onCommit={(v) => edit({ value: reaisToCents(v) })} />
              </div>
              <div className="mt-4 border-t border-border/50 pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.07em] text-muted-foreground/55"><Users className="h-3.5 w-3.5" /> Vidas / idades</div>
                <div className="space-y-1.5">
                  {(cur.lives ?? []).map((l, i) => (
                    <div key={i} className="group/l flex items-center gap-2 rounded-lg border-l-2 border-teal/60 bg-foreground/[0.03] px-2.5 py-1.5 text-[13px]">
                      <span className="truncate font-medium text-foreground">{l.name}</span>
                      <span className="truncate text-muted-foreground">· {REL_OPTS.find((r) => r.value === l.rel)?.label ?? l.rel}</span>
                      <span className="ml-auto shrink-0 text-muted-foreground">{l.age}a</span>
                      <button onClick={() => edit({ lives: (cur.lives ?? []).filter((_, j) => j !== i) })} className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover/l:opacity-100"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  {(cur.lives ?? []).length === 0 && <p className="text-[12.5px] italic text-muted-foreground/60">Nenhuma vida cadastrada.</p>}
                </div>
                <AddLife onAdd={(l) => edit({ lives: [...(cur.lives ?? []), l] })} />
              </div>
            </Section>

            <Section icon={Target} title="Proposta & perfil">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <EditField label="Produto sugerido" value={cur.produtoSugerido ?? ''} onCommit={(v) => edit({ produtoSugerido: v.trim() || undefined })} />
                <EditField label="Valor estimado" type="currency" value={centsToReais(cur.valorEstimado)} display={cur.valorEstimado ? brl(cur.valorEstimado) : '—'} onCommit={(v) => edit({ valorEstimado: reaisToCents(v) })} />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-muted-foreground/55">Perfil DISC</p>
                  <div className="mt-1.5"><ChipEdit value={cur.disc} opts={DISC_OPTS} placeholder="+ perfil" onChange={(d) => edit({ disc: d })} /></div>
                </div>
                <EditField label="Próxima ação" value={cur.proximaAcao ?? ''} onCommit={(v) => edit({ proximaAcao: v.trim() || undefined })} />
              </div>
              <div className="mt-3.5">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.07em] text-muted-foreground/55">Contexto da negociação</p>
                <textarea value={cur.contexto ?? ''} onChange={(e) => edit({ contexto: e.target.value })} rows={2} placeholder="Objeções, concorrência, sensibilidade a preço…" className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-[13.5px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-teal focus:ring-[2.5px] focus:ring-teal/20" />
              </div>
            </Section>

            <Section icon={Megaphone} title="Origem & marketing">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <EditField label="UTM Source" value={cur.utmSource ?? ''} onCommit={(v) => edit({ utmSource: v.trim() || undefined })} />
                <EditField label="UTM Campaign" value={cur.utmCampaign ?? ''} onCommit={(v) => edit({ utmCampaign: v.trim() || undefined })} />
                <div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-[0.07em] text-muted-foreground/55">Data de entrada</p><p className="mt-1 text-[15px] text-foreground">{relD(cur.entryDaysAgo)}</p></div>
              </div>
            </Section>

            <Section icon={Clock} title="Retorno & SLA" accent>
              <div className="divide-y divide-border/40">
                <Row label="Próximo retorno"><FollowupCell days={cur.followupInDays} /></Row>
                <Row label="SLA 1º atendimento"><span className="inline-flex items-center gap-1 font-mono text-[14px] tabular-nums text-foreground"><Zap className="h-3.5 w-3.5 text-warning" />{cur.slaMinutes != null ? `${cur.slaMinutes}min` : '—'}</span></Row>
                <Row label="Última atividade"><span className="text-[14px] text-foreground">{relH(cur.noContactHours)}</span></Row>
                <Row label="Entrada no funil"><span className="text-[14px] text-foreground">{relD(cur.entryDaysAgo)}</span></Row>
              </div>
            </Section>
          </div>

          {/* coluna direita — anotações / anexos / histórico */}
          <div className="space-y-8">
            <Section icon={FileText} title="Anotações">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Registre observações sobre este lead…" className="w-full resize-none rounded-lg border border-input bg-background p-3 text-[14.5px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-teal focus:ring-[2.5px] focus:ring-teal/20" />
              <div className="mt-2.5 flex justify-end"><button onClick={() => { if (note.trim()) { toast.success('Anotação adicionada'); setNote('') } }} disabled={!note.trim()} className="rounded-lg bg-teal px-3.5 py-1.5 text-[12px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-40">Adicionar nota</button></div>
            </Section>

            <Section icon={Paperclip} title="Anexos">
              <div className="space-y-2">
                {(cur.attachments ?? []).map((a) => {
                  const isImg = a.type.startsWith('image/')
                  return (
                    <div key={a.id} className="group/att flex items-center gap-3 rounded-lg bg-foreground/[0.03] px-2.5 py-2">
                      {isImg ? <img src={a.url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted"><FileText className="h-4 w-4 text-muted-foreground" /></span>}
                      <div className="min-w-0 flex-1"><a href={a.url} target="_blank" rel="noreferrer" className="block truncate text-[13.5px] font-medium text-foreground hover:text-teal">{a.name}</a><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{fmtSize(a.size)} · {a.type.split('/')[1] || 'arquivo'}</p></div>
                      <button onClick={() => removeAtt(a.id)} title="Remover" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-danger group-hover/att:opacity-100"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  )
                })}
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-teal/50 hover:bg-foreground/[0.02] hover:text-foreground">
                  <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
                  <Paperclip className="h-4 w-4" /> Anexar — fotos, PDF, documentos
                </label>
              </div>
            </Section>

            <Section icon={History} title="Histórico">
              <div className="space-y-3.5">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-[14px]"><h.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" /><span className="flex-1 text-foreground/85">{h.text}</span><span className="shrink-0 text-[12px] text-muted-foreground/60">{h.when}</span></div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  )
}
