import { createContext, useContext, useState, type ReactNode } from 'react'
import { FUNIL_LEADS, type Lead, type Attachment } from '@/lib/funil-data'

interface LeadsCtx {
  leads: Lead[]
  getLead: (id?: string) => Lead | undefined
  saveLead: (l: Lead) => 'created' | 'updated' // upsert por id
  removeLead: (id: string) => void
  moveStage: (id: string, stage: string) => void
  logContact: (id: string, followupInDays: number | null) => void
  addAttachments: (id: string, files: File[]) => void
  removeAttachment: (id: string, attId: string) => void
  // detalhe como modal (aberto de qualquer tela)
  detailId: string | null
  openDetail: (id: string) => void
  closeDetail: () => void
}

let attSeq = 0

const Ctx = createContext<LeadsCtx | null>(null)

/** Fonte única de leads — lista e detalhe compartilham; editar em um reflete no outro. */
export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(() => FUNIL_LEADS.map((l) => ({ ...l })))

  const getLead = (id?: string) => leads.find((l) => l.id === id)

  const saveLead = (l: Lead): 'created' | 'updated' => {
    const exists = leads.some((x) => x.id === l.id)
    setLeads((prev) => (exists ? prev.map((x) => (x.id === l.id ? l : x)) : [l, ...prev]))
    return exists ? 'updated' : 'created'
  }
  const removeLead = (id: string) => setLeads((prev) => prev.filter((x) => x.id !== id))
  const moveStage = (id: string, stage: string) => setLeads((prev) => prev.map((x) => (x.id === id ? { ...x, stage } : x)))
  const logContact = (id: string, followupInDays: number | null) =>
    setLeads((prev) => prev.map((x) => (x.id === id ? { ...x, followupInDays, noContactHours: 0 } : x)))

  const addAttachments = (id: string, files: File[]) => {
    const atts: Attachment[] = files.map((f) => ({ id: `att-${++attSeq}-${f.size}`, name: f.name, size: f.size, type: f.type, url: URL.createObjectURL(f) }))
    setLeads((prev) => prev.map((x) => (x.id === id ? { ...x, attachments: [...(x.attachments ?? []), ...atts] } : x)))
  }
  const removeAttachment = (id: string, attId: string) =>
    setLeads((prev) => prev.map((x) => (x.id === id ? { ...x, attachments: (x.attachments ?? []).filter((a) => a.id !== attId) } : x)))

  const [detailId, setDetailId] = useState<string | null>(null)
  const openDetail = (id: string) => setDetailId(id)
  const closeDetail = () => setDetailId(null)

  return <Ctx.Provider value={{ leads, getLead, saveLead, removeLead, moveStage, logContact, addAttachments, removeAttachment, detailId, openDetail, closeDetail }}>{children}</Ctx.Provider>
}

export function useLeads() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLeads deve ser usado dentro de <LeadsProvider>')
  return ctx
}
