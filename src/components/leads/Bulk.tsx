import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Warning, Plus, type Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { OWNERS, STAGE_CATALOG } from '@/lib/funil-data'
import { tagTint } from '@/lib/tags'

const SHADOW = 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_4px_-1px_rgba(0,0,0,0.4),0_12px_24px_-8px_rgba(0,0,0,0.5),0_32px_64px_-16px_rgba(0,0,0,0.7)]'
const STAGE_COLOR: Record<string, string> = {
  novo: '--stage-1', atendimento: '--stage-2', qualificado: '--stage-3', proposta: '--stage-4',
  negociacao: '--stage-5', ganho: '--stage-6', perdido: '--stage-7',
}
export const COMERCIAL_STAGE_OPTS = ['novo', 'atendimento', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido']
  .map((id) => ({ value: id, label: STAGE_CATALOG[id].label, dot: `hsl(var(${STAGE_COLOR[id]}))` }))

/* ============================ Menu de contexto (botão direito) ============================ */
export type MenuItem = { label: string; icon?: Icon; onClick?: () => void; danger?: boolean; divider?: boolean }
export type MenuState = { x: number; y: number; items: MenuItem[] } | null

export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState>(null)
  const open = (e: React.MouseEvent, items: MenuItem[]) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, items }) }
  return { menu, open, close: () => setMenu(null) }
}

export function ContextMenu({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  if (!menu) return null
  const rows = menu.items.length
  const x = Math.max(8, Math.min(menu.x, window.innerWidth - 230))
  const y = Math.max(8, Math.min(menu.y, window.innerHeight - (rows * 34 + 24)))
  return createPortal(
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} aria-hidden />
      <div style={{ top: y, left: x }} className={cn('dropdown-in fixed z-[100] min-w-[210px] rounded-xl border border-white/10 bg-card p-1.5', SHADOW)}>
        {menu.items.map((it, i) => it.divider
          ? <div key={i} className="my-1 h-px bg-border/60" />
          : (
            <button key={i} onClick={() => { onClose(); it.onClick?.() }} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-foreground/[0.06]', it.danger ? 'text-danger' : 'text-foreground')}>
              {it.icon && <it.icon className="h-4 w-4 shrink-0 opacity-80" />}<span className="flex-1">{it.label}</span>
            </button>
          ))}
      </div>
    </>,
    document.body,
  )
}

/* ============================ Barra de seleção ============================ */
export function SelectionToolbar({ count, total, allSelected, onSelectAll, onClear, actions, hideSelectAll }: {
  count: number; total: number; allSelected: boolean; onSelectAll: () => void; onClear: () => void
  actions: { label: string; icon: Icon; onClick: () => void; danger?: boolean }[]; hideSelectAll?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-teal/30 bg-teal/[0.06] px-3 py-2">
      <span className="text-[13px] font-semibold text-foreground">{count} selecionado{count > 1 ? 's' : ''}</span>
      {!hideSelectAll && !allSelected && <button onClick={onSelectAll} className="text-[12.5px] font-medium text-teal hover:underline">Selecionar todos ({total})</button>}
      <button onClick={onClear} className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground">Limpar</button>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {actions.map((a) => (
          <button key={a.label} onClick={a.onClick} className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors', a.danger ? 'border-danger/30 text-danger hover:bg-danger/10' : 'border-border text-foreground hover:bg-foreground/[0.06]')}>
            <a.icon className="h-3.5 w-3.5" /> {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============================ Modal genérico de escolha ============================ */
type Opt = { value: string; label: string; dot?: string; avatar?: string }

function Shell({ title, subtitle, onClose, children, footer }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-card', SHADOW)}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  )
}

function OptionRow({ o, onPick }: { o: Opt; onPick: (v: string) => void }) {
  return (
    <button onClick={() => onPick(o.value)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors hover:bg-foreground/[0.06]">
      {o.dot && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.dot }} />}
      {o.avatar && <img src={o.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />}
      <span className="flex-1 truncate">{o.label}</span>
    </button>
  )
}

/* ---- Mover etapa ---- */
export function PickStageModal({ subtitle, onPick, onClose }: { subtitle: string; onPick: (id: string) => void; onClose: () => void }) {
  return <Shell title="Mover etapa" subtitle={subtitle} onClose={onClose}>{COMERCIAL_STAGE_OPTS.map((o) => <OptionRow key={o.value} o={o} onPick={onPick} />)}</Shell>
}

/* ---- Responsável ---- */
export function PickOwnerModal({ subtitle, onPick, onClose }: { subtitle: string; onPick: (id: string) => void; onClose: () => void }) {
  return <Shell title="Mudar responsável" subtitle={subtitle} onClose={onClose}>{OWNERS.map((o) => <OptionRow key={o.id} o={{ value: o.id, label: o.name, avatar: o.avatar }} onPick={onPick} />)}</Shell>
}

/* ---- Mudar funil ---- */
export function PickPipelineModal({ subtitle, pipelines, onPick, onClose }: { subtitle: string; pipelines: { id: string; name: string }[]; onPick: (id: string) => void; onClose: () => void }) {
  return <Shell title="Mudar funil" subtitle={subtitle} onClose={onClose}>{pipelines.map((p) => <OptionRow key={p.id} o={{ value: p.id, label: p.name }} onPick={onPick} />)}</Shell>
}

/* ---- Etiquetar ---- */
export function AddTagModal({ subtitle, suggestions, onApply, onClose }: { subtitle: string; suggestions: string[]; onApply: (tag: string) => void; onClose: () => void }) {
  const [val, setVal] = useState('')
  const apply = (t: string) => { const s = t.trim(); if (s) onApply(s) }
  return (
    <Shell
      title="Etiquetar" subtitle={subtitle} onClose={onClose}
      footer={<><button onClick={onClose} className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted">Fechar</button>
        <button onClick={() => apply(val)} disabled={!val.trim()} className="flex items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 text-[13px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-45"><Plus className="h-4 w-4" /> Adicionar</button></>}
    >
      <div className="p-2">
        <input
          autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder="Nova etiqueta…"
          onKeyDown={(e) => { if (e.key === 'Enter') apply(val) }}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[13.5px] outline-none focus:border-teal focus:ring-[2.5px] focus:ring-teal/20"
        />
        {suggestions.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Sugestões</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((t) => (
                <button key={t} onClick={() => apply(t)} className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium transition hover:brightness-110', tagTint(t))}>{t}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

/* ---- Excluir em massa ---- */
export function BulkDeleteModal({ count, onConfirm, onClose }: { count: number; onConfirm: () => void; onClose: () => void }) {
  return (
    <Shell
      title="Excluir leads" onClose={onClose}
      footer={<><button onClick={onClose} className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted">Cancelar</button>
        <button onClick={onConfirm} className="rounded-lg bg-danger px-3.5 py-2 text-[13px] font-bold text-white transition hover:brightness-110">Excluir {count}</button></>}
    >
      <div className="flex items-start gap-3 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger/12"><Warning className="h-4 w-4 text-danger" /></span>
        <p className="text-[14px] leading-relaxed text-muted-foreground">Excluir <span className="font-semibold text-foreground">{count} lead{count > 1 ? 's' : ''}</span> da carteira? Esta ação não pode ser desfeita.</p>
      </div>
    </Shell>
  )
}

/* ---- checkbox reutilizável ---- */
export function Checkbox({ checked, indeterminate, onChange, className }: { checked: boolean; indeterminate?: boolean; onChange: () => void; className?: string }) {
  return (
    <button
      type="button" role="checkbox" aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange() }}
      className={cn('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-all', checked || indeterminate ? 'border-transparent bg-teal' : 'border-input hover:border-teal/60', className)}
    >
      {indeterminate ? <span className="h-0.5 w-2.5 rounded bg-primary-foreground" /> : checked ? <Check className="h-3 w-3 text-primary-foreground" /> : null}
    </button>
  )
}
