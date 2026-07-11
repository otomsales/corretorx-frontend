import { createContext, useContext, useState, type ReactNode } from 'react'

export type CustomFieldType = 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'select' | 'boolean'

export interface CustomField {
  id: string
  label: string
  type: CustomFieldType
  options?: string[] // p/ select
  required?: boolean
  showInTable?: boolean // aparece como coluna na tabela de Leads
}

export const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'number', label: 'Número' },
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Seleção' },
  { value: 'boolean', label: 'Sim / Não' },
]

const uid = () => `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

const SEED: CustomField[] = [
  { id: 'cf_corretora_ant', label: 'Corretora anterior', type: 'text' },
  { id: 'cf_vigencia', label: 'Data de vigência', type: 'date', showInTable: true },
  { id: 'cf_canal', label: 'Canal preferido', type: 'select', options: ['WhatsApp', 'Ligação', 'E-mail'], showInTable: true },
  { id: 'cf_ja_tem_plano', label: 'Já tem plano ativo?', type: 'boolean' },
]

interface Ctx {
  fields: CustomField[]
  addField: (f: Omit<CustomField, 'id'>) => void
  updateField: (id: string, patch: Partial<CustomField>) => void
  removeField: (id: string) => void
  move: (id: string, dir: -1 | 1) => void
}

const CustomFieldsCtx = createContext<Ctx | null>(null)

export function CustomFieldsProvider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<CustomField[]>(SEED)

  const addField: Ctx['addField'] = (f) => setFields((p) => [...p, { ...f, id: uid() }])
  const updateField: Ctx['updateField'] = (id, patch) => setFields((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  const removeField: Ctx['removeField'] = (id) => setFields((p) => p.filter((f) => f.id !== id))
  const move: Ctx['move'] = (id, dir) => setFields((p) => {
    const i = p.findIndex((f) => f.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= p.length) return p
    const next = [...p]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  return <CustomFieldsCtx.Provider value={{ fields, addField, updateField, removeField, move }}>{children}</CustomFieldsCtx.Provider>
}

export function useCustomFields() {
  const ctx = useContext(CustomFieldsCtx)
  if (!ctx) throw new Error('useCustomFields fora do provider')
  return ctx
}
