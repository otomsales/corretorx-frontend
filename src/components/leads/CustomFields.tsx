import { useState } from 'react'
import { Plus, Trash, CaretUp, CaretDown, X, SlidersHorizontal } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { brl } from '@/lib/format'
import { InlineText, InlineSelect, money } from './InlineCell'
import { useCustomFields, FIELD_TYPES, type CustomField, type CustomFieldType } from '@/store/customFields'

const fmtDate = (v: string) => {
  const [y, m, d] = v.split('-')
  return d && m && y ? `${d}/${m}/${y.slice(2)}` : v
}

/** Valor legível de um campo custom (read / coluna de tabela). */
export function customDisplay(field: CustomField, value: string | boolean | undefined): string {
  if (value === undefined || value === '') return '—'
  switch (field.type) {
    case 'boolean': return value ? 'Sim' : 'Não'
    case 'currency': return typeof value === 'string' && value ? brl(Number(value)) : '—'
    case 'date': return typeof value === 'string' ? fmtDate(value) : '—'
    default: return String(value)
  }
}

/** Editor inline de um campo custom (detalhe / painel / tabela). */
export function CustomFieldInline({ field, value, onChange }: {
  field: CustomField; value: string | boolean | undefined; onChange: (v: string | boolean) => void
}) {
  if (field.type === 'boolean') {
    return <InlineSelect value={value === true ? 'Sim' : value === false ? 'Não' : undefined} options={['Sim', 'Não']} onPick={(v) => onChange(v === 'Sim')} width={120} />
  }
  if (field.type === 'select') {
    return <InlineSelect value={typeof value === 'string' ? value : undefined} options={field.options ?? []} onPick={(v) => onChange(v)} />
  }
  const sVal = typeof value === 'string' ? value : ''
  if (field.type === 'currency') {
    return <InlineText type="currency" value={money.toInput(sVal ? Number(sVal) : null)} display={sVal ? brl(Number(sVal)) : undefined} onCommit={(v) => onChange(String(money.toCents(v)))} />
  }
  const t = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
  const disp = field.type === 'date' && sVal ? fmtDate(sVal) : undefined
  return <InlineText type={t} value={sVal} display={disp} onCommit={(v) => onChange(v)} />
}

/** Input de campo custom p/ formulário de cadastro (label acima). */
export function CustomFieldFormInput({ field, value, onChange }: {
  field: CustomField; value: string | boolean | undefined; onChange: (v: string | boolean) => void
}) {
  const base = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-[13.5px] outline-none focus:border-teal focus:ring-[3px] focus:ring-teal/15'
  const sVal = typeof value === 'string' ? value : ''
  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2.5 text-[13.5px] text-foreground">
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-teal" />
        {field.label}
      </label>
    )
  }
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-muted-foreground">{field.label}</span>
      {field.type === 'select' ? (
        <select value={sVal} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea value={sVal} onChange={(e) => onChange(e.target.value)} rows={2} className={cn(base, 'h-auto py-2')} />
      ) : (
        <input
          type={field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'currency' ? 'text' : 'text'}
          inputMode={field.type === 'number' ? 'numeric' : field.type === 'currency' ? 'decimal' : undefined}
         
          value={sVal} onChange={(e) => onChange(e.target.value)} className={base}
        />
      )}
    </label>
  )
}

/** Modal gerenciador de campos (criar/editar/reordenar/excluir). */
export function ManageFieldsModal({ onClose }: { onClose: () => void }) {
  const { fields, addField, updateField, removeField, move } = useCustomFields()
  const [label, setLabel] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [options, setOptions] = useState('')
  const [showInTable, setShowInTable] = useState(false)

  const add = () => {
    const l = label.trim()
    if (!l) { toast.error('Dê um nome ao campo'); return }
    const opts = type === 'select' ? options.split(',').map((s) => s.trim()).filter(Boolean) : undefined
    if (type === 'select' && !opts?.length) { toast.error('Adicione ao menos uma opção'); return }
    addField({ label: l, type, options: opts, showInTable })
    setLabel(''); setType('text'); setOptions(''); setShowInTable(false)
    toast.success('Campo criado')
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-teal" /><h3 className="text-[15px] font-bold">Campos personalizados</h3></div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            {fields.map((f, i) => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-2.5 py-2">
                <div className="flex flex-col">
                  <button disabled={i === 0} onClick={() => move(f.id, -1)} className="text-muted-foreground/50 transition-colors hover:text-foreground disabled:opacity-20"><CaretUp className="h-3.5 w-3.5" /></button>
                  <button disabled={i === fields.length - 1} onClick={() => move(f.id, 1)} className="text-muted-foreground/50 transition-colors hover:text-foreground disabled:opacity-20"><CaretDown className="h-3.5 w-3.5" /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} className="w-full truncate rounded bg-transparent text-[13.5px] font-medium text-foreground outline-none focus:bg-foreground/[0.05] focus:px-1" />
                  <p className="truncate text-[11px] text-muted-foreground">{FIELD_TYPES.find((t) => t.value === f.type)?.label}{f.options?.length ? ` · ${f.options.join(', ')}` : ''}</p>
                </div>
                <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground" title="Mostrar como coluna na tabela de Leads">
                  <input type="checkbox" checked={!!f.showInTable} onChange={(e) => updateField(f.id, { showInTable: e.target.checked })} className="h-3.5 w-3.5 accent-teal" /> coluna
                </label>
                <button onClick={() => removeField(f.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"><Trash className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {fields.length === 0 && <p className="py-6 text-center text-[13px] text-muted-foreground">Nenhum campo ainda.</p>}
          </div>

          <div className="mt-4 rounded-xl border border-border/40 bg-background/40 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Novo campo</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Nome do campo" className="col-span-2 h-9 rounded-lg border border-input bg-background px-3 text-[13px] outline-none focus:border-teal" />
              <select value={type} onChange={(e) => setType(e.target.value as CustomFieldType)} className="h-9 rounded-lg border border-input bg-background px-2 text-[13px] outline-none focus:border-teal">
                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground"><input type="checkbox" checked={showInTable} onChange={(e) => setShowInTable(e.target.checked)} className="h-3.5 w-3.5 accent-teal" /> Mostrar na tabela</label>
              {type === 'select' && <input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Opções separadas por vírgula" className="col-span-2 h-9 rounded-lg border border-input bg-background px-3 text-[13px] outline-none focus:border-teal" />}
            </div>
            <button onClick={add} className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 text-[13px] font-bold text-primary-foreground transition hover:brightness-110"><Plus className="h-4 w-4" /> Adicionar campo</button>
          </div>
        </div>
      </div>
    </div>
  )
}
