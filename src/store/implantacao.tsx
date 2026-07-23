import { createContext, useContext, useState, type ReactNode } from 'react'

/** Etapas da esteira de implantação (espelha zamo/vitaly). */
export const IMPL_STAGES = [
  { id: 'venda_recebida', label: 'Venda recebida' },
  { id: 'documento_solicitado', label: 'Documento solicitado' },
  { id: 'em_cadastro', label: 'Em cadastro' },
  { id: 'ds', label: 'DS / envio operadora' },
  { id: 'em_analise', label: 'Em análise' },
  { id: 'pendencia', label: 'Pendência' },
  { id: 'assinatura_contrato', label: 'Assinatura' },
  { id: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { id: 'pago', label: 'Pago' },
  { id: 'implantado', label: 'Implantado' },
] as const
export type ImplStage = (typeof IMPL_STAGES)[number]['id']

export type Modalidade = 'pf' | 'pme' | 'adesao'
export const MODALIDADES: { value: Modalidade; label: string; hint: string }[] = [
  { value: 'pf', label: 'Pessoa Física', hint: 'Plano individual/familiar' },
  { value: 'pme', label: 'PME', hint: 'Empresarial com CNPJ' },
  { value: 'adesao', label: 'Adesão', hint: 'Por entidade de classe' },
]

export type ImplLife = { name: string; age?: number; rel: string }

/** Como o contrato nasceu: venda nova ou renovação de um contrato anterior do mesmo lead. */
export type OrigemContrato = 'venda' | 'renovacao'

/**
 * Um CONTRATO do lead (a venda em si) + o processo de implantação dele.
 * O lead é a espinha dorsal e nunca duplica: o mesmo `leadId` acompanha o card do
 * comercial até a carteira. Cada venda fechada gera um contrato novo; renovação também.
 * Por isso a lista é append-only — nada sobrescreve contrato anterior.
 */
export interface ImplProcess {
  id: string
  leadId: string
  leadName: string
  /** 1º, 2º, 3º contrato daquele lead (ordem cronológica). */
  contratoNumero: number
  origem: OrigemContrato
  /** Contrato que este substitui (preenchido na renovação) — trilha do histórico. */
  contratoAnteriorId: string | null
  stage: ImplStage
  modalidade: Modalidade
  operadora: string
  plano: string
  acomodacao?: 'enfermaria' | 'apartamento'
  copart?: boolean
  odonto?: boolean
  compulsorio?: boolean
  planoAnterior?: string
  valorMensal: number | null // centavos
  taxaAdesao?: number | null
  vidas: number
  cnpj?: string
  cpf?: string
  razaoSocial?: string
  email?: string
  telefone?: string
  administradora?: string
  entidade?: string
  formacao?: string
  dataVenda: string // ISO yyyy-mm-dd
  vigencia?: string
  fidelidadeMeses?: number | null
  fonteVenda?: string
  vendedorId: string | null
  titular?: string
  composicao?: string
  estudoCotacao?: string
  observacoes?: string
  lives: ImplLife[]
  createdAt: number
}

const iso = (diasAtras: number) => {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  return d.toISOString().slice(0, 10)
}

/** Processos-semente: espelham os leads já ganhos do funil (demo da esteira + performance). */
const SEED: ImplProcess[] = [
  {
    id: 'impl-seed-l16', leadId: 'l16', leadName: 'Colégio Horizonte', contratoNumero: 1, origem: 'venda', contratoAnteriorId: null, stage: 'pago', modalidade: 'pme',
    operadora: 'Amil', plano: 'Empresarial', acomodacao: 'apartamento', copart: false, odonto: true,
    valorMensal: 2680000, taxaAdesao: null, vidas: 28, cnpj: '18.442.109/0001-55', razaoSocial: 'Colégio Horizonte Ltda',
    email: 'financeiro@colegiohorizonte.com.br', telefone: '11911009988',
    dataVenda: iso(2), vigencia: iso(-8), fidelidadeMeses: 12, fonteVenda: 'Meta Ads', vendedorId: 'u1',
    titular: 'Marcos Horizonte', composicao: 'titular + 27 vidas', lives: [], createdAt: 0,
  },
  {
    id: 'impl-seed-l17', leadId: 'l17', leadName: 'Restaurante Sabor', contratoNumero: 1, origem: 'venda', contratoAnteriorId: null, stage: 'implantado', modalidade: 'pme',
    operadora: 'Hapvida', plano: 'PME', acomodacao: 'enfermaria', copart: true, odonto: false,
    valorMensal: 548000, taxaAdesao: null, vidas: 7, cnpj: '31.208.774/0001-02', razaoSocial: 'Sabor Alimentação ME',
    email: 'contato@restaurantesabor.com.br', telefone: '11900998877',
    dataVenda: iso(6), vigencia: iso(-4), fidelidadeMeses: 12, fonteVenda: 'Site', vendedorId: 'u2',
    titular: 'Cláudia Sabor', composicao: 'titular + 6 vidas', lives: [], createdAt: 0,
  },
  {
    id: 'impl-seed-l19', leadId: 'l19', leadName: 'Academia Corpo & Ação', contratoNumero: 1, origem: 'venda', contratoAnteriorId: null, stage: 'em_analise', modalidade: 'pme',
    operadora: 'SulAmérica', plano: 'PME', acomodacao: 'apartamento', copart: true, odonto: true,
    valorMensal: 1120000, taxaAdesao: null, vidas: 14, cnpj: '22.774.301/0001-18', razaoSocial: 'Corpo & Ação Academia Ltda',
    email: 'adm@corpoeacao.com.br', telefone: '11955443300',
    dataVenda: iso(3), fidelidadeMeses: 12, fonteVenda: 'Indicação', vendedorId: 'u3',
    titular: 'Rogério Amaral', composicao: 'titular + 13 vidas', lives: [], createdAt: 0,
  },
  {
    id: 'impl-seed-l20', leadId: 'l20', leadName: 'Contabilidade Prisma', contratoNumero: 1, origem: 'venda', contratoAnteriorId: null, stage: 'pendencia', modalidade: 'pme',
    operadora: 'Unimed', plano: 'Empresarial', acomodacao: 'enfermaria', copart: false, odonto: false,
    valorMensal: 890000, taxaAdesao: null, vidas: 9, cnpj: '09.663.520/0001-74', razaoSocial: 'Prisma Contabilidade S/S',
    email: 'contato@prismacontabil.com.br', telefone: '11944332200',
    dataVenda: iso(7), fidelidadeMeses: 12, fonteVenda: 'Site', vendedorId: 'u4',
    titular: 'Sandra Prisma', composicao: 'titular + 8 vidas',
    observacoes: 'Pendência: falta cópia do contrato social atualizado.', lives: [], createdAt: 0,
  },
  ...([
    ['l21', 'Auto Peças Guerra', 'Amil', 'PME', 968000, 11, 'u1', 'em_cadastro', 1, 'Meta Ads'],
    ['l22', 'Dra. Helena Muniz', 'Bradesco Saúde', 'Individual', 296000, 2, 'u2', 'pago', 1, 'Indicação'],
    ['l23', 'Transportadora Rota Sul', 'SulAmérica', 'Empresarial', 1932000, 21, 'u3', 'ds', 4, 'Site'],
    ['l24', 'Buffet Encanto', 'Hapvida', 'PME', 474000, 6, 'u4', 'documento_solicitado', 0, 'WhatsApp'],
    ['l25', 'Marcelo Tavares', 'Unimed', 'Individual', 152000, 1, 'u1', 'implantado', 5, 'Meta Ads'],
    ['l26', 'Serralheria Ferro & Arte', 'NotreDame', 'PME', 636000, 8, 'u2', 'assinatura_contrato', 3, 'Indicação'],
    ['l27', 'Colégio Semear', 'Amil', 'Empresarial', 1786000, 19, 'u3', 'pago', 7, 'Site'],
    ['l28', 'Patrícia Nogueira', 'Bradesco Saúde', 'Individual', 384000, 3, 'u4', 'venda_recebida', 0, 'WhatsApp'],
    ['l29', 'Distribuidora Vega', 'SulAmérica', 'PME', 1094000, 13, 'u1', 'em_analise', 2, 'Meta Ads'],
  ] as const).map(([leadId, leadName, operadora, plano, valorMensal, vidas, vendedorId, stage, diasAtras, fonteVenda]) => ({
    id: `impl-seed-${leadId}`, leadId, leadName, contratoNumero: 1, origem: 'venda' as OrigemContrato, contratoAnteriorId: null, stage: stage as ImplStage,
    modalidade: (plano === 'Individual' ? 'pf' : 'pme') as Modalidade,
    operadora, plano, valorMensal, taxaAdesao: null, vidas,
    dataVenda: iso(diasAtras), fidelidadeMeses: 12, fonteVenda, vendedorId,
    lives: [], createdAt: 0,
  })),
]

/** Campos que a tela informa ao registrar a venda — o resto o store deriva. */
export type NovoContrato = Omit<ImplProcess, 'id' | 'stage' | 'createdAt' | 'contratoNumero' | 'origem' | 'contratoAnteriorId'>
  & { origem?: OrigemContrato }

type Ctx = {
  processes: ImplProcess[]
  /** Todos os contratos do lead, do mais novo para o mais antigo. */
  contratosDoLead: (leadId: string) => ImplProcess[]
  /** Contrato vigente do lead (o mais recente). */
  byLead: (leadId: string) => ImplProcess | undefined
  /** Registra uma venda como CONTRATO NOVO — nunca sobrescreve o anterior. */
  createProcess: (p: NovoContrato) => ImplProcess
  /** Renovação: contrato novo herdando os dados do anterior, com histórico preservado. */
  renovarContrato: (contratoId: string, mudancas?: Partial<NovoContrato>) => ImplProcess | undefined
  updateProcess: (id: string, patch: Partial<ImplProcess>) => void
  moveStage: (id: string, stage: ImplStage) => void
}

const C = createContext<Ctx>({
  processes: [], contratosDoLead: () => [], byLead: () => undefined,
  createProcess: () => ({} as ImplProcess), renovarContrato: () => undefined,
  updateProcess: () => {}, moveStage: () => {},
})
export const useImplantacao = () => useContext(C)

/** Fonte única dos contratos/processos de implantação (mock in-memory). */
export function ImplantacaoProvider({ children }: { children: ReactNode }) {
  const [processes, setProcesses] = useState<ImplProcess[]>(SEED)

  const contratosDoLead = (leadId: string) =>
    processes.filter((p) => p.leadId === leadId).sort((a, b) => b.contratoNumero - a.contratoNumero)

  const byLead = (leadId: string) => contratosDoLead(leadId)[0]

  const createProcess: Ctx['createProcess'] = (p) => {
    const anteriores = processes.filter((x) => x.leadId === p.leadId)
    const ultimo = anteriores.reduce<ImplProcess | undefined>((acc, x) => (!acc || x.contratoNumero > acc.contratoNumero ? x : acc), undefined)
    const novo: ImplProcess = {
      ...p,
      origem: p.origem ?? 'venda',
      id: `ctr-${p.leadId}-${anteriores.length + 1}-${Date.now()}`,
      contratoNumero: anteriores.length + 1,
      contratoAnteriorId: ultimo?.id ?? null,
      stage: 'venda_recebida',
      createdAt: Date.now(),
    }
    // append-only: cada venda é um contrato novo do mesmo lead (o anterior vira histórico)
    setProcesses((prev) => [novo, ...prev])
    return novo
  }

  const renovarContrato: Ctx['renovarContrato'] = (contratoId, mudancas) => {
    const base = processes.find((p) => p.id === contratoId)
    if (!base) return undefined
    const { id: _id, stage: _s, createdAt: _c, contratoNumero: _n, contratoAnteriorId: _a, origem: _o, ...dados } = base
    return createProcess({ ...dados, ...mudancas, origem: 'renovacao' })
  }

  const updateProcess = (id: string, patch: Partial<ImplProcess>) =>
    setProcesses((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const moveStage = (id: string, stage: ImplStage) =>
    setProcesses((prev) => prev.map((p) => (p.id === id ? { ...p, stage } : p)))

  return (
    <C.Provider value={{ processes, contratosDoLead, byLead, createProcess, renovarContrato, updateProcess, moveStage }}>
      {children}
    </C.Provider>
  )
}
