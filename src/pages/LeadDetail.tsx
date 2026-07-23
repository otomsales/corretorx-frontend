import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  X, Phone, PhoneCall, ChatCircle, User, Clock, FileText,
  MapPin, Lightning, GitBranch, UserPlus, CaretDown, Check, Plus, Paperclip, Envelope, Target, Megaphone, SlidersHorizontal, Users,
  Image as ImageIcon, Microphone, Code, MagnifyingGlass, ArrowElbowDownRight, DownloadSimple, type Icon,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { brl, formatPhone, initials } from '@/lib/format'
import { OWNERS, PIPELINES, STAGE_CATALOG, DISC_OPTS, REL_OPTS, lifecycleOf, type Lead } from '@/lib/funil-data'
import { useLeads } from '@/store/leads'
import { useCustomFields } from '@/store/customFields'
import { StatusDot, FollowupCell, LeadAvatar } from '@/components/leads/LeadBadges'
import { CustomFieldInline, ManageFieldsModal } from '@/components/leads/CustomFields'
import { XiaSummary } from '@/components/leads/XiaSummary'
import { TagsEditor } from '@/components/leads/TagsEditor'

const SHADOW = 'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_16px_32px_-12px_rgba(0,0,0,0.12),0_44px_72px_-20px_rgba(0,0,0,0.16)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_16px_32px_-10px_rgba(0,0,0,0.55),0_44px_72px_-16px_rgba(0,0,0,0.7)]'
const SOURCE_OPTS = ['Meta Ads', 'Indicação', 'Site', 'WhatsApp', 'Prospecção'].map((s) => ({ value: s, label: s }))
const TIPO_OPTS = [{ value: 'pme', label: 'PME (CNPJ)' }, { value: 'pf', label: 'Pessoa física' }]
const TIERS = ['bronze', 'prata', 'ouro', 'diamante'] as const
const STAGE_COLOR: Record<string, string> = {
  novo: '--stage-1', atendimento: '--stage-2', qualificado: '--stage-3', proposta: '--stage-4',
  negociacao: '--stage-5', ganho: '--stage-6', perdido: '--stage-7',
}
const STAGE_TABS = ['novo', 'atendimento', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido']
const MAIN_TABS = [{ k: 'anotacoes', l: 'Anotações' }, { k: 'historico', l: 'Histórico' }, { k: 'resumo', l: 'Resumo X IA' }, { k: 'anexos', l: 'Anexos' }] as const
type MainTab = (typeof MAIN_TABS)[number]['k']

type NoteFile = { name: string; type: string; url: string }
type LeadNote = { id: string; author: string; at: string; text: string; files: NoteFile[]; replies?: LeadNote[] }
const NOTE_ATTACH: { label: string; accept: string; icon: Icon }[] = [
  { label: 'Foto', accept: 'image/*', icon: ImageIcon },
  { label: 'Áudio', accept: 'audio/*', icon: Microphone },
  { label: 'Arquivo', accept: '*', icon: Paperclip },
  { label: 'PDF', accept: 'application/pdf', icon: FileText },
  { label: 'HTML', accept: 'text/html,.html', icon: Code },
]
const SEED_NOTES: LeadNote[] = [
  { id: 'sn1', author: 'Larissa Boss', at: 'há 2h', text: 'Cliente comparou com a SulAmérica. Foco em rede credenciada em SP capital. Enviar proposta Amil PME Adesão 400.', files: [{ name: 'tabela-precos.jpg', type: 'image/jpeg', url: 'https://picsum.photos/seed/corretorx-precos/900/600' }] },
  { id: 'sn2', author: 'Rafael Nunes', at: 'ontem', text: 'Ligação: 12 vidas, titular + cônjuge + filhos. Sensível a preço, mas quer manter o hospital de referência.', files: [], replies: [{ id: 'sr1', author: 'Larissa Boss', at: 'há 3h', text: 'Perfeito, já preparo a proposta com Amil PME mantendo o Albert Einstein na rede.', files: [] }] },
]

function NoteAvatar({ name, className, textCls }: { name: string; className: string; textCls: string }) {
  const av = OWNERS.find((o) => o.name === name)?.avatar
  return av
    ? <img src={av} alt="" className={cn('shrink-0 rounded-lg object-cover ring-1 ring-border/40', className)} />
    : <span className={cn('grid shrink-0 place-items-center rounded-lg bg-teal/15 font-bold text-teal', className, textCls)}>{initials(name)}</span>
}

type PreviewFile = { url: string; name: string; type: string }
const isHtmlFile = (f: PreviewFile) => f.type.includes('html') || /\.html?$/i.test(f.name)

/** Lightbox in-app — abre imagem/pdf/áudio/vídeo/doc na mesma janela (HTML abre em aba separada, tratado antes). */
function FilePreview({ file, onClose }: { file: PreviewFile; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const t = file.type
  const isPdf = t === 'application/pdf' || /\.pdf$/i.test(file.name)
  const body = t.startsWith('image/')
    ? <img src={file.url} alt={file.name} className="max-h-[82vh] max-w-full rounded-lg object-contain shadow-2xl" />
    : t.startsWith('video/')
      ? <video src={file.url} controls autoPlay className="max-h-[82vh] max-w-full rounded-lg shadow-2xl" />
      : t.startsWith('audio/')
        ? <div className="rounded-2xl border border-border dark:border-white/10 bg-card p-8 shadow-2xl"><audio src={file.url} controls autoPlay className="w-[420px] max-w-[80vw]" /></div>
        : <iframe src={file.url} title={file.name} className={cn('h-[82vh] w-[min(92vw,1000px)] rounded-lg shadow-2xl', (isPdf) && 'bg-white')} />
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm dropdown-in" onClick={onClose}>
      {/* botões flutuando por cima do conteúdo */}
      <div className="absolute right-4 top-4 z-[130] flex items-center gap-1 rounded-xl bg-black/45 p-1 backdrop-blur-md ring-1 ring-white/10">
        <a href={file.url} download={file.name} onClick={(e) => e.stopPropagation()} title="Baixar" className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"><DownloadSimple className="h-[18px] w-[18px]" /></a>
        <button onClick={onClose} title="Fechar (Esc)" className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex min-h-0 max-h-full items-center justify-center" onClick={(e) => e.stopPropagation()}>{body}</div>
    </div>,
    document.body,
  )
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

function Section({ icon: Icon, title, accent, children, collapsible }: { icon: Icon; title: string; accent?: boolean; children: ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="border-t border-border/40 pt-4 first:border-t-0 first:pt-0">
      {collapsible ? (
        <button onClick={() => setOpen((o) => !o)} className={cn('flex w-full items-center gap-2', open && 'mb-3')}>
          <Icon className={cn('h-[15px] w-[15px] shrink-0', accent ? 'text-teal' : 'text-muted-foreground')} />
          <h3 className={cn('flex-1 text-left text-[11.5px] font-semibold uppercase leading-none tracking-[0.08em]', accent ? 'text-teal' : 'text-foreground')}>{title}</h3>
          <CaretDown className={cn('h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform', !open && '-rotate-90')} />
        </button>
      ) : (
        <div className="mb-4 flex items-center gap-2">
          <Icon className={cn('h-[15px] w-[15px] shrink-0', accent ? 'text-teal' : 'text-muted-foreground')} />
          <h3 className={cn('text-[13px] font-semibold leading-none tracking-[-0.01em]', accent ? 'text-teal' : 'text-foreground')}>{title}</h3>
          <div className={cn('h-px flex-1', accent ? 'bg-teal/20' : 'bg-border/50')} />
        </div>
      )}
      {(!collapsible || open) && children}
    </section>
  )
}

function EditField({ label, value, display, type = 'text', options, creatable, icon: Icon, onCommit }: {
  label: string; value: string; display?: ReactNode
  type?: 'text' | 'number' | 'currency' | 'select'; options?: Opt[]; creatable?: boolean; icon?: Icon; onCommit: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const [val, setVal] = useState(value)
  const [search, setSearch] = useState('')
  const start = () => { setVal(value); setSearch(''); setEditing(true); if (type === 'select') setOpen(true) }
  const commit = (v = val) => { setEditing(false); setOpen(false); if (v !== value) onCommit(v) }
  const cancel = () => { setEditing(false); setOpen(false) }
  return (
    <div className="flex min-h-[32px] items-center justify-between gap-3">
      <span className="shrink-0 text-[12.5px] text-muted-foreground">{label}</span>
      <div className="relative min-w-0 flex-1">
      {!editing ? (
        <button onClick={start} title="Clique para editar" className="group/e -mr-1 flex w-full items-center justify-end gap-1.5 rounded-md px-1.5 py-1 text-right text-[13.5px] font-medium text-foreground transition-colors hover:bg-foreground/[0.05]">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
          <span className={cn('truncate', type === 'currency' || type === 'number' ? 'font-mono tabular-nums' : '')}>{display ?? (value || '—')}</span>
        </button>
      ) : type === 'select' ? (
        <div className="relative">
          <button onClick={() => setOpen((o) => !o)} className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-teal bg-background px-2 text-[14px] outline-none">
            <span className="truncate">{options?.find((o) => o.value === val)?.label ?? val ?? '—'}</span>
            <CaretDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
          {open && (() => {
            const term = search.trim().toLowerCase()
            const list = term ? (options ?? []).filter((o) => o.label.toLowerCase().includes(term)) : (options ?? [])
            const canCreate = !!(creatable && term && !(options ?? []).some((o) => o.label.toLowerCase() === term))
            return (
              <>
                <button type="button" className="fixed inset-0 z-[60]" onClick={cancel} aria-hidden />
                <div className={cn('dropdown-in absolute left-0 top-full z-[70] mt-1 w-full overflow-hidden rounded-lg border border-border dark:border-white/10 bg-card p-1', SHADOW)}>
                  <div className="mb-1 flex items-center gap-1.5 border-b border-border/50 px-1.5 pb-1.5">
                    <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-muted-foreground/55" />
                    <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder={creatable ? 'Buscar ou criar…' : 'Buscar…'} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (canCreate) commit(search.trim()); else if (list.length) commit(list[0].value) } else if (e.key === 'Escape') cancel() }} className="h-6 w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/50" />
                  </div>
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
          className={cn('h-8 w-full rounded-md border border-teal bg-background px-2 text-right text-[14px] outline-none focus:ring-[2.5px] focus:ring-teal/20', (type === 'currency' || type === 'number') && 'font-mono tabular-nums')} />
      )}
      </div>
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
        {cur ? <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-bold', cur.cls)}>{cur.label}</span> : <span className="rounded-md border border-dashed border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{placeholder}</span>}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className={cn('dropdown-in absolute left-0 top-full z-50 mt-1.5 w-40 rounded-lg border border-border dark:border-white/10 bg-card p-1', SHADOW)}>
            {opts.map((o) => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }} className={cn('flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 transition-colors hover:bg-foreground/[0.05]', value === o.value && 'bg-foreground/[0.06]')}>
                <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-bold', o.cls)}>{o.label}</span>{value === o.value && <Check className="h-3.5 w-3.5 text-teal" />}
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

/** Seletor de funil (pipeline) — no rótulo da barra de etapas. */
function FunilSelect({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const cur = PIPELINES.find((p) => p.id === value) ?? PIPELINES[0]
  return (
    <span className="relative mr-2.5 inline-flex shrink-0">
      <button onClick={() => setOpen((o) => !o)} title="Trocar de funil" className="flex items-center gap-1 rounded-md py-0.5 pl-0 pr-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground/60 transition-colors hover:text-foreground">
        Funil: <span className="normal-case tracking-normal text-foreground/80">{cur.name}</span>
        <CaretDown className="h-3 w-3 text-muted-foreground/50" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className={cn('dropdown-in absolute left-0 top-full z-50 mt-1.5 w-48 rounded-lg border border-border dark:border-white/10 bg-card p-1', SHADOW)}>
            {PIPELINES.map((p) => (
              <button key={p.id} onClick={() => { onChange(p.id); setOpen(false) }} className={cn('flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-foreground/[0.05]', cur.id === p.id ? 'font-medium text-teal' : 'text-foreground')}>
                <span className="flex items-center gap-2"><GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />{p.name}</span>
                {cur.id === p.id && <Check className="h-3.5 w-3.5 shrink-0 text-teal" />}
              </button>
            ))}
          </div>
        </>
      )}
    </span>
  )
}

/** Editor de vidas/beneficiários (plano de saúde). */
function LivesEditor({ lives, onChange }: { lives: NonNullable<Lead['lives']>; onChange: (l: NonNullable<Lead['lives']>) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [rel, setRel] = useState('titular')
  const relLabel = (r: string) => REL_OPTS.find((o) => o.value === r)?.label ?? r
  const add = () => { const a = Number(age); if (!name.trim() || !a) return; onChange([...lives, { name: name.trim(), age: a, rel }]); setName(''); setAge(''); setRel('titular'); setOpen(false) }
  const remove = (i: number) => onChange(lives.filter((_, j) => j !== i))
  return (
    <div>
      {lives.length > 0 ? (
        <div className="space-y-1.5">
          {lives.map((l, i) => (
            <div key={i} className="group/life flex items-center gap-2 rounded-lg border border-border/40 bg-foreground/[0.03] px-2.5 py-1.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-teal/15 text-[10px] font-bold text-teal">{initials(l.name)}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{l.name}</span>
              <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{l.age} anos</span>
              <span className="shrink-0 rounded bg-muted/70 px-1.5 py-0.5 text-[10px] font-medium text-foreground/70">{relLabel(l.rel)}</span>
              <button onClick={() => remove(i)} title="Remover" className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-all hover:text-danger group-hover/life:opacity-100"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      ) : <p className="text-[13px] text-muted-foreground/60">Nenhuma vida cadastrada.</p>}
      {open ? (
        <div className="mt-2 space-y-1.5 rounded-lg border border-border/60 bg-background p-2">
          <div className="grid grid-cols-[1fr_64px] gap-1.5">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="h-8 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus:border-teal" onKeyDown={(e) => { if (e.key === 'Enter') add(); else if (e.key === 'Escape') setOpen(false) }} />
            <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))} placeholder="Idade" inputMode="numeric" className="h-8 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus:border-teal" onKeyDown={(e) => { if (e.key === 'Enter') add(); else if (e.key === 'Escape') setOpen(false) }} />
          </div>
          <div className="flex items-center gap-1.5">
            <select value={rel} onChange={(e) => setRel(e.target.value)} className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus:border-teal">
              {REL_OPTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button onClick={add} className="grid h-8 w-8 place-items-center rounded-md bg-teal text-primary-foreground transition hover:brightness-110"><Check className="h-4 w-4" /></button>
            <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-teal transition hover:brightness-110"><Plus className="h-3.5 w-3.5" /> Adicionar vida</button>
      )}
    </div>
  )
}

function ResponsavelEdit({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const o = OWNERS.find((x) => x.id === value)
  return (
    <span className="relative inline-flex items-center text-[13px] text-muted-foreground">
      Responsável:
      <button onClick={() => setOpen((v) => !v)} title="Alterar responsável" className="ml-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium text-foreground transition-colors hover:bg-foreground/[0.06]">
        {o ? <img src={o.avatar} alt="" className="h-5 w-5 rounded-full object-cover" /> : null}{o?.name ?? '—'}<CaretDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className={cn('dropdown-in absolute left-0 top-full z-50 mt-1.5 w-52 rounded-lg border border-border dark:border-white/10 bg-card p-1', SHADOW)}>
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

export default function LeadDetail() {
  const navigate = useNavigate()
  const { detailId, closeDetail, getLead, saveLead, leads } = useLeads()
  const tagSuggestions = useMemo(() => [...new Set(leads.flatMap((l) => l.tags ?? []))].sort(), [leads])
  const { fields: customFields } = useCustomFields()
  const lead = getLead(detailId ?? undefined)
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState<LeadNote[]>(SEED_NOTES)
  const [noteFiles, setNoteFiles] = useState<NoteFile[]>([])
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyFiles, setReplyFiles] = useState<NoteFile[]>([])
  const [preview, setPreview] = useState<PreviewFile | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [tab, setTab] = useState<MainTab>('anotacoes')
  const [draft, setDraft] = useState(lead)
  const [dirty, setDirty] = useState(false)
  const attSeq = useRef(0)
  const org = useCreatable(SOURCE_OPTS)
  useEffect(() => { setDraft(lead); setDirty(false); setNote(''); setReplyingTo(null); setReplyText(''); setReplyFiles([]) }, [detailId]) // eslint-disable-line react-hooks/exhaustive-deps
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
  const pickNoteFiles = (files: File[]) => { if (files.length) setNoteFiles((p) => [...p, ...files.map((f) => ({ name: f.name, type: f.type || 'application/octet-stream', url: URL.createObjectURL(f) }))]) }
  const addNote = () => {
    if (!note.trim() && !noteFiles.length) return
    setNotes((p) => [{ id: `n-${Date.now()}`, author: 'Larissa Boss', at: 'agora', text: note.trim(), files: noteFiles }, ...p])
    setNote(''); setNoteFiles([]); toast.success('Anotação adicionada')
  }
  const pickReplyFiles = (files: File[]) => { if (files.length) setReplyFiles((p) => [...p, ...files.map((f) => ({ name: f.name, type: f.type || 'application/octet-stream', url: URL.createObjectURL(f) }))]) }
  const cancelReply = () => { setReplyingTo(null); setReplyText(''); setReplyFiles([]) }
  const addReply = (noteId: string) => {
    const t = replyText.trim()
    if (!t && !replyFiles.length) return
    setNotes((p) => p.map((n) => n.id === noteId
      ? { ...n, replies: [...(n.replies ?? []), { id: `r-${Date.now()}`, author: 'Larissa Boss', at: 'agora', text: t, files: replyFiles }] }
      : n))
    setReplyText(''); setReplyFiles([]); setReplyingTo(null); toast.success('Resposta adicionada')
  }
  const goChat = () => { closeDetail(); navigate('/app/chat') }
  // clique em anexo: HTML abre em aba separada; resto abre no lightbox in-app
  const openFile = (f: PreviewFile) => { if (isHtmlFile(f)) window.open(f.url, '_blank', 'noopener,noreferrer'); else setPreview(f) }

  const status = lifecycleOf(cur)
  const stage = STAGE_CATALOG[cur.stage]
  const stageColor = `hsl(var(${STAGE_COLOR[cur.stage] ?? '--muted-foreground'}))`
  const history = [
    stage?.kind === 'won' && { icon: GitBranch, text: `Movido para ${stage.label}`, when: relD(Math.max(0, (cur.entryDaysAgo ?? 0) - 1)) },
    { icon: GitBranch, text: `Entrou em ${stage?.label ?? '—'}`, when: relD(cur.entryDaysAgo) },
    { icon: UserPlus, text: `Lead criado${cur.source ? ` · ${cur.source}` : ''}`, when: relD(cur.entryDaysAgo) },
  ].filter(Boolean) as { icon: Icon; text: string; when: string }[]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDetail} />
      <div className={cn('relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border dark:border-white/10 bg-background', SHADOW)}>
        {/* cabeçalho */}
        <div className="shrink-0 border-b border-border bg-background/95 px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={closeDetail} className="grid h-9 w-9 shrink-0 self-start place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X className="h-5 w-5" /></button>
            <LeadAvatar lead={cur} className="h-16 w-16 shrink-0" textCls="text-[20px]" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold leading-tight tracking-tight">{cur.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: stageColor }} />{stage?.label ?? '—'}</span>
                {stage?.kind === 'open' && <StatusDot s={status} />}
                <ChipEdit value={cur.tier} opts={TIERS.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1), cls: t === 'bronze' ? 'bg-amber-700 text-white' : t === 'prata' ? 'bg-slate-400 text-slate-950' : t === 'ouro' ? 'bg-yellow-500 text-yellow-950' : 'bg-sky-500 text-white' }))} placeholder="+ tier" onChange={(t) => edit({ tier: t })} />
                <FollowupCell days={cur.followupInDays} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <ResponsavelEdit value={cur.ownerId} onChange={(oid) => edit({ ownerId: oid })} />
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 self-center">
              {dirty && (<>
                <button onClick={discard} className="flex h-9 items-center rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Descartar</button>
                <button onClick={save} className="flex h-9 items-center gap-1.5 rounded-lg bg-teal px-4 text-[13px] font-bold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(34,211,238,.6)] transition hover:brightness-110"><Check className="h-4 w-4" /> Salvar</button>
                <span className="mx-1 h-5 w-px bg-border" />
              </>)}
              <button onClick={() => toast('Ligar — em breve')} disabled={!cur.phone} className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"><PhoneCall className="h-4 w-4" /> Ligar</button>
              <button onClick={goChat} className="flex h-9 items-center gap-1.5 rounded-lg bg-teal px-3.5 text-[13px] font-bold text-primary-foreground transition hover:brightness-110"><ChatCircle className="h-4 w-4" /> Conversar</button>
            </div>
          </div>
        </div>

        {/* funil de etapas — segmentos de seta encaixando (pipeline, ponta a ponta) */}
        <div className="flex shrink-0 items-center border-y border-border/40 bg-foreground/[0.025] px-4 py-2.5">
          <FunilSelect value={cur.pipelineId} onChange={(id) => edit({ pipelineId: id })} />
          {STAGE_TABS.map((s, i) => {
            const curIdx = STAGE_TABS.indexOf(cur.stage)
            const on = i === curIdx
            const done = curIdx >= 0 && i < curIdx
            const first = i === 0
            const last = i === STAGE_TABS.length - 1
            const clip = first
              ? 'polygon(0 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 0 100%)'
              : last
                ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 11px 50%)'
                : 'polygon(0 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 0 100%, 11px 50%)'
            return (
              <button
                key={s} onClick={() => edit({ stage: s })}
                style={{ clipPath: clip, ...(on ? { backgroundColor: `hsl(var(${STAGE_COLOR[s] ?? '--muted-foreground'}))` } : {}) }}
                title={STAGE_CATALOG[s]?.label ?? s}
                className={cn('relative -ml-[9px] flex h-[30px] min-w-0 items-center justify-center gap-1 pl-[18px] pr-2 font-medium transition-all first:ml-0 first:pl-3',
                  on ? 'z-10 flex-[1.4] text-[12.5px] font-semibold text-white' : 'flex-1 text-[12px]',
                  !on && (done ? 'bg-teal/25 text-foreground/85 hover:bg-teal/35 dark:bg-teal/20' : 'bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground'))}
              >
                {done && <Check className="h-3 w-3 shrink-0" strokeWidth={3} />}
                <span className="truncate">{STAGE_CATALOG[s]?.label ?? s}</span>
              </button>
            )
          })}
        </div>

        {/* corpo: rail (dados) + main (feed com tabs) */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[340px_1fr]">
          {/* rail esquerdo — dados agrupados/colapsáveis */}
          <div className="space-y-4 overflow-y-auto border-r border-border/40 px-5 py-5">
            <Section icon={User} title="Dados do cliente" collapsible>
              <div className="grid grid-cols-1 gap-y-3">
                <EditField label="Telefone" icon={Phone} value={cur.phone ?? ''} display={cur.phone ? formatPhone(cur.phone) : '—'} onCommit={(v) => edit({ phone: v.replace(/\D/g, '') || null })} />
                <EditField label="E-mail" icon={Envelope} value={cur.email ?? ''} onCommit={(v) => edit({ email: v.trim() || undefined })} />
                <EditField label="Cidade" icon={MapPin} value={cur.city ?? ''} onCommit={(v) => edit({ city: v.trim() || undefined })} />
                <EditField label="CPF / CNPJ" value={cur.cpfCnpj ?? ''} onCommit={(v) => edit({ cpfCnpj: v.trim() || undefined })} />
                <EditField label="Tipo" type="select" options={TIPO_OPTS} value={cur.cnpj ? 'pme' : 'pf'} display={cur.cnpj ? 'PME (CNPJ)' : 'Pessoa física'} onCommit={(v) => edit({ cnpj: v === 'pme' })} />
                <EditField label="Origem" type="select" creatable options={org.options(cur.source)} value={cur.source ?? ''} display={cur.source ?? '—'} onCommit={(v) => { org.remember(v); edit({ source: v.trim() || null }) }} />
              </div>
              <div className="mt-4">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.07em] text-muted-foreground/55">Etiquetas</p>
                <TagsEditor tags={cur.tags ?? []} onChange={(tags) => edit({ tags })} suggestions={tagSuggestions} />
              </div>
            </Section>

            <Section icon={SlidersHorizontal} title="Campos personalizados" collapsible>
              {customFields.length > 0 ? (
                <div className="grid grid-cols-1 gap-y-3">
                  {customFields.map((f) => (
                    <div key={f.id} className="flex min-h-[32px] items-center justify-between gap-3">
                      <span className="text-[12.5px] text-muted-foreground">{f.label}</span>
                      <CustomFieldInline field={f} value={cur.custom?.[f.id]} onChange={(v) => edit({ custom: { ...(cur.custom ?? {}), [f.id]: v } })} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-[13px] text-muted-foreground/60">Nenhum campo personalizado ainda.</p>}
              <button onClick={() => setManageOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-teal transition hover:brightness-110"><SlidersHorizontal className="h-3.5 w-3.5" /> Gerenciar campos</button>
            </Section>

            <Section icon={Target} title="Proposta & perfil" collapsible>
              <div className="grid grid-cols-1 gap-y-3">
                <EditField label="Produto sugerido" value={cur.produtoSugerido ?? ''} onCommit={(v) => edit({ produtoSugerido: v.trim() || undefined })} />
                <EditField label="Valor estimado" type="currency" value={centsToReais(cur.valorEstimado)} display={cur.valorEstimado ? brl(cur.valorEstimado) : '—'} onCommit={(v) => edit({ valorEstimado: reaisToCents(v) })} />
                <div className="flex min-h-[32px] items-center justify-between gap-3">
                  <span className="text-[12.5px] text-muted-foreground">Perfil DISC</span>
                  <ChipEdit value={cur.disc} opts={DISC_OPTS} placeholder="+ perfil" onChange={(d) => edit({ disc: d })} />
                </div>
                <EditField label="Próxima ação" value={cur.proximaAcao ?? ''} onCommit={(v) => edit({ proximaAcao: v.trim() || undefined })} />
              </div>
            </Section>

            <Section icon={Users} title={`Vidas & beneficiários${cur.lives?.length ? ` · ${cur.lives.length}` : ''}`} collapsible>
              <LivesEditor lives={cur.lives ?? []} onChange={(l) => edit({ lives: l })} />
            </Section>

            <Section icon={Megaphone} title="Origem & marketing" collapsible>
              <div className="grid grid-cols-1 gap-y-3">
                <EditField label="UTM Source" value={cur.utmSource ?? ''} onCommit={(v) => edit({ utmSource: v.trim() || undefined })} />
                <EditField label="UTM Campaign" value={cur.utmCampaign ?? ''} onCommit={(v) => edit({ utmCampaign: v.trim() || undefined })} />
                <div className="flex min-h-[32px] items-center justify-between gap-3"><span className="text-[12.5px] text-muted-foreground">Data de entrada</span><span className="text-[13.5px] font-medium text-foreground">{relD(cur.entryDaysAgo)}</span></div>
              </div>
            </Section>

            <Section icon={Clock} title="Retorno & SLA" accent collapsible>
              <div className="divide-y divide-border/40">
                <Row label="Próximo retorno"><FollowupCell days={cur.followupInDays} /></Row>
                <Row label="SLA 1º atendimento"><span className="inline-flex items-center gap-1 font-mono text-[14px] tabular-nums text-foreground"><Lightning className="h-3.5 w-3.5 text-warning" />{cur.slaMinutes != null ? `${cur.slaMinutes}min` : '—'}</span></Row>
                <Row label="Última atividade"><span className="text-[14px] text-foreground">{relH(cur.noContactHours)}</span></Row>
                <Row label="Entrada no funil"><span className="text-[14px] text-foreground">{relD(cur.entryDaysAgo)}</span></Row>
              </div>
            </Section>
          </div>

          {/* main — feed com tabs (estilo RD/Monday) */}
          <div className="flex min-w-0 flex-col overflow-hidden">
            <div className="flex shrink-0 gap-1 border-b border-border/40 px-6 pt-3">
              {MAIN_TABS.map((t) => (
                <button key={t.k} onClick={() => setTab(t.k)} className={cn('relative px-3 pb-2.5 transition-all', tab === t.k ? 'text-[15px] font-semibold text-foreground' : 'text-[13px] font-medium text-muted-foreground hover:text-foreground')}>
                  {t.l}{tab === t.k && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-teal" />}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === 'resumo' && <XiaSummary lead={cur} />}

              {tab === 'historico' && (
                <div className="relative space-y-4 pl-4">
                  <span className="absolute bottom-1 left-[5px] top-1 w-px bg-border/50" />
                  {history.map((h, i) => (
                    <div key={i} className="relative flex items-start gap-3 text-[14px]">
                      <span className="absolute -left-4 top-1 grid h-[11px] w-[11px] place-items-center rounded-full bg-card ring-2 ring-border/70"><span className="h-1.5 w-1.5 rounded-full bg-teal" /></span>
                      <h.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                      <span className="flex-1 text-foreground/85">{h.text}</span>
                      <span className="shrink-0 text-[12px] text-muted-foreground/60">{h.when}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'anotacoes' && (
                <div className="max-w-2xl">
                  {/* composer */}
                  <div className="rounded-xl border border-border/60 bg-background transition-colors focus-within:border-teal">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Escreva uma anotação…" className="w-full resize-none rounded-t-xl bg-transparent p-3 text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground/45" />
                    {noteFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-3 pb-1.5">
                        {noteFiles.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.06] py-1 pl-1.5 pr-1 text-[12px]">
                            {f.type.startsWith('image/') ? <img src={f.url} className="h-4 w-4 rounded object-cover" alt="" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span className="max-w-[140px] truncate text-foreground">{f.name}</span>
                            <button onClick={() => setNoteFiles((p) => p.filter((_, j) => j !== i))} className="grid h-4 w-4 place-items-center rounded text-muted-foreground hover:text-danger"><X className="h-3 w-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 border-t border-border/40 px-2 py-1.5">
                      <div className="flex items-center gap-0.5">
                        {NOTE_ATTACH.map((a) => (
                          <label key={a.label} title={a.label} className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-teal">
                            <input type="file" multiple accept={a.accept} className="hidden" onChange={(e) => { pickNoteFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
                            <a.icon className="h-4 w-4" />
                          </label>
                        ))}
                      </div>
                      <button onClick={addNote} disabled={!note.trim() && !noteFiles.length} className="rounded-lg bg-teal px-3.5 py-1.5 text-[12px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-40">Adicionar nota</button>
                    </div>
                  </div>

                  {/* feed de notas */}
                  <div className="mt-5 space-y-3">
                    {notes.map((n) => (
                      <div key={n.id} className="rounded-xl border border-border/40 bg-foreground/[0.04] p-3.5">
                        <div className="mb-1.5 flex items-center gap-2">
                          <NoteAvatar name={n.author} className="h-7 w-7" textCls="text-[10px]" />
                          <span className="text-[13px] font-semibold text-foreground">{n.author}</span>
                          <span className="ml-auto text-[11px] text-muted-foreground">{n.at}</span>
                        </div>
                        {n.text && <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">{n.text}</p>}
                        {n.files.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {n.files.map((f, i) => f.type.startsWith('image/')
                              ? <button key={i} onClick={() => openFile(f)} className="transition hover:opacity-90"><img src={f.url} alt="" className="h-16 w-16 rounded-md object-cover" /></button>
                              : <button key={i} onClick={() => openFile(f)} className="inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.05] px-2 py-1 text-[12px] text-foreground transition-colors hover:text-teal"><FileText className="h-3.5 w-3.5 shrink-0" />{f.name}</button>
                            )}
                          </div>
                        )}

                        {/* respostas aninhadas */}
                        {n.replies && n.replies.length > 0 && (
                          <div className="mt-3 space-y-2 border-l-2 border-border/40 pl-3">
                            {n.replies.map((r) => (
                              <div key={r.id} className="rounded-lg border border-border/40 bg-foreground/[0.03] p-2.5">
                                <div className="mb-1 flex items-center gap-1.5">
                                  <NoteAvatar name={r.author} className="h-6 w-6" textCls="text-[9px]" />
                                  <span className="text-[12.5px] font-semibold text-foreground">{r.author}</span>
                                  <span className="ml-auto text-[10.5px] text-muted-foreground">{r.at}</span>
                                </div>
                                {r.text && <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/85">{r.text}</p>}
                                {r.files.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {r.files.map((f, i) => f.type.startsWith('image/')
                                      ? <button key={i} onClick={() => openFile(f)} className="transition hover:opacity-90"><img src={f.url} alt="" className="h-14 w-14 rounded-md object-cover" /></button>
                                      : <button key={i} onClick={() => openFile(f)} className="inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.05] px-2 py-1 text-[11.5px] text-foreground transition-colors hover:text-teal"><FileText className="h-3.5 w-3.5 shrink-0" />{f.name}</button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* responder */}
                        <div className="mt-2.5">
                          {replyingTo === n.id ? (
                            <div className="border-l-2 border-teal/40 pl-3">
                              <div className="rounded-lg border border-border/60 bg-background transition-colors focus-within:border-teal">
                                <textarea
                                  autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addReply(n.id) } else if (e.key === 'Escape') cancelReply() }}
                                  rows={2} placeholder={`Responder a ${n.author}…`}
                                  className="w-full resize-none rounded-t-lg bg-transparent p-2.5 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/45"
                                />
                                {replyFiles.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 px-2.5 pb-1.5">
                                    {replyFiles.map((f, i) => (
                                      <span key={i} className="inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.06] py-1 pl-1.5 pr-1 text-[12px]">
                                        {f.type.startsWith('image/') ? <img src={f.url} className="h-4 w-4 rounded object-cover" alt="" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                                        <span className="max-w-[140px] truncate text-foreground">{f.name}</span>
                                        <button onClick={() => setReplyFiles((p) => p.filter((_, j) => j !== i))} className="grid h-4 w-4 place-items-center rounded text-muted-foreground hover:text-danger"><X className="h-3 w-3" /></button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center justify-between gap-2 border-t border-border/40 px-2 py-1.5">
                                  <div className="flex items-center gap-0.5">
                                    {NOTE_ATTACH.map((a) => (
                                      <label key={a.label} title={a.label} className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-teal">
                                        <input type="file" multiple accept={a.accept} className="hidden" onChange={(e) => { pickReplyFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
                                        <a.icon className="h-3.5 w-3.5" />
                                      </label>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button onClick={cancelReply} className="rounded-lg px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Cancelar</button>
                                    <button onClick={() => addReply(n.id)} disabled={!replyText.trim() && !replyFiles.length} className="rounded-lg bg-teal px-3 py-1 text-[12px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-40">Responder</button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setReplyingTo(n.id); setReplyText('') }} className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-teal">
                              <ArrowElbowDownRight className="h-3.5 w-3.5" /> Responder
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {notes.length === 0 && <p className="text-[13px] text-muted-foreground/60">Nenhuma anotação ainda.</p>}
                  </div>
                </div>
              )}

              {tab === 'anexos' && (
                <div className="max-w-2xl space-y-2">
                  {(cur.attachments ?? []).map((a) => {
                    const isImg = a.type.startsWith('image/')
                    return (
                      <div key={a.id} className="group/att flex items-center gap-3 rounded-lg bg-foreground/[0.03] px-2.5 py-2">
                        <button onClick={() => openFile(a)} title="Abrir" className="shrink-0 transition hover:opacity-90">{isImg ? <img src={a.url} alt="" className="h-9 w-9 rounded-md object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-md bg-muted"><FileText className="h-4 w-4 text-muted-foreground" /></span>}</button>
                        <div className="min-w-0 flex-1"><button onClick={() => openFile(a)} className="block max-w-full truncate text-left text-[13.5px] font-medium text-foreground hover:text-teal">{a.name}</button><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{fmtSize(a.size)} · {a.type.split('/')[1] || 'arquivo'}</p></div>
                        <button onClick={() => removeAtt(a.id)} title="Remover" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-danger group-hover/att:opacity-100"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    )
                  })}
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-teal/50 hover:bg-foreground/[0.02] hover:text-foreground">
                    <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
                    <Paperclip className="h-4 w-4" /> Anexar — fotos, PDF, documentos
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {manageOpen && <ManageFieldsModal onClose={() => setManageOpen(false)} />}
      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
