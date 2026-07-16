/** Dados mock do Funil comercial (saúde). value = mensalidade em CENTAVOS. */

export type LeadStage =
  | 'novo' | 'atendimento' | 'qualificado' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'

export interface Lead {
  id: string
  name: string
  phone: string | null
  operadora: string
  plano: string
  vidas: number
  value: number | null // centavos/mês
  source: string | null
  ownerId: string | null
  stage: string // id da etapa (editável no funil)
  lossReason: string | null
  pipelineId?: string // funil ao qual o lead pertence (default = comercial)
  tier?: 'bronze' | 'prata' | 'ouro' | 'diamante'
  tags?: string[]
  noContactHours?: number // horas desde o último contato (última atividade)
  slaMinutes?: number // minutos desde a entrada (SLA de 1º atendimento; só etapa de entrada)
  entryDaysAgo?: number // dias desde a entrada no funil
  city?: string
  cnpj?: boolean // sinaliza PME
  avatarUrl?: string // foto de perfil do WhatsApp (profile_pic_url); fallback = iniciais
  lifecycle?: 'potencial' | 'ativo' | 'frio' | 'ganho' | 'perdido' // status do ciclo de vida (derivado se ausente)
  followupInDays?: number | null // próximo retorno em dias (<0 atrasado, 0 hoje, null sem retorno)
  attachments?: Attachment[] // arquivos anexados (fotos, PDFs, documentos)
  // campos adicionais (espelham o chat-wave)
  email?: string
  cpfCnpj?: string
  produtoSugerido?: string // melhor saída de mercado
  valorEstimado?: number | null // proposta estimada (centavos)
  proximaAcao?: string
  disc?: 'dominante' | 'influente' | 'estavel' | 'analitico'
  contexto?: string // contexto da negociação
  utmSource?: string
  utmCampaign?: string
  lives?: { name: string; age: number; rel: string }[] // vidas/idades (beneficiários)
  custom?: Record<string, string | boolean> // valores de campos personalizáveis (por fieldId)
}

export const DISC_OPTS = [
  { value: 'dominante', label: 'Dominante', cls: 'bg-rose-600 text-white' },
  { value: 'influente', label: 'Influente', cls: 'bg-amber-500 text-amber-950' },
  { value: 'estavel', label: 'Estável', cls: 'bg-emerald-600 text-white' },
  { value: 'analitico', label: 'Analítico', cls: 'bg-sky-600 text-white' },
] as const

export const REL_OPTS = [
  { value: 'titular', label: 'Titular' }, { value: 'conjuge', label: 'Cônjuge' }, { value: 'filho', label: 'Filho(a)' },
  { value: 'pai_mae', label: 'Pai/Mãe' }, { value: 'irmao', label: 'Irmão(ã)' }, { value: 'outro', label: 'Outro' },
]

export interface Attachment {
  id: string
  name: string
  size: number // bytes
  type: string // MIME
  url: string // objectURL (mock) ou storage path
}

/** Catálogo estático de etapas (id → rótulo/tipo) p/ telas read-only (Leads). O Funil edita as suas em estado. */
export const STAGE_CATALOG: Record<string, { label: string; kind: 'open' | 'won' | 'lost' }> = {
  novo: { label: 'Novo', kind: 'open' },
  atendimento: { label: 'Em atendimento', kind: 'open' },
  qualificado: { label: 'Qualificado', kind: 'open' },
  proposta: { label: 'Proposta', kind: 'open' },
  negociacao: { label: 'Negociação', kind: 'open' },
  ganho: { label: 'Ganho', kind: 'won' },
  perdido: { label: 'Perdido', kind: 'lost' },
  'ia-novo': { label: 'Novo lead', kind: 'open' },
  'ia-qualif': { label: 'Qualificando', kind: 'open' },
  'ia-agendou': { label: 'Agendou', kind: 'open' },
  'ia-ok': { label: 'Qualificado', kind: 'won' },
  'ia-descartado': { label: 'Descartado', kind: 'lost' },
}

/** Deriva o ciclo de vida a partir da etapa + inatividade (quando o lead não tem lifecycle explícito). */
export function lifecycleOf(lead: Lead): NonNullable<Lead['lifecycle']> {
  if (lead.lifecycle) return lead.lifecycle
  const kind = STAGE_CATALOG[lead.stage]?.kind
  if (kind === 'won') return 'ganho'
  if (kind === 'lost') return 'perdido'
  if ((lead.noContactHours ?? 0) >= 72) return 'frio'
  return 'ativo'
}

export const PIPELINES = [
  { id: 'p-comercial', name: 'Comercial' },
  { id: 'p-ia', name: 'Atendimento IA' },
]

export const OWNERS = [
  { id: 'u1', name: 'Larissa Boss', avatar: 'https://i.pravatar.cc/60?img=47' },
  { id: 'u2', name: 'Rafael Nunes', avatar: 'https://i.pravatar.cc/60?img=12' },
  { id: 'u3', name: 'Camila Duarte', avatar: 'https://i.pravatar.cc/60?img=45' },
  { id: 'u4', name: 'Bruno Tavares', avatar: 'https://i.pravatar.cc/60?img=33' },
]

export const LOSS_REASONS = [
  'Preço acima do orçamento',
  'Fechou com outro corretor',
  'Desistiu do plano',
  'Carência / condição não aceita',
  'Sem contato / não respondeu',
] as const

const L = (
  id: string, name: string, phone: string, operadora: string, plano: string,
  vidas: number, value: number, source: string, ownerId: string, stage: LeadStage,
  lossReason: string | null = null,
): Lead => ({ id, name, phone, operadora, plano, vidas, value, source, ownerId, stage, lossReason })

export const FUNIL_LEADS: Lead[] = [
  // Novo
  L('l1', 'Construtora Aurora', '11988887777', 'Amil', 'PME Adesão', 12, 1846000, 'Meta Ads', 'u1', 'novo'),
  L('l2', 'Marina Prado', '11977776666', 'Bradesco Saúde', 'Individual', 1, 128000, 'Indicação', 'u2', 'novo'),
  L('l3', 'Ótica Visão Clara', '21966665555', 'SulAmérica', 'PME', 8, 964000, 'Site', 'u3', 'novo'),
  L('l4', 'Rodrigo Menezes', '31955554444', 'Hapvida', 'Individual', 2, 214000, 'WhatsApp', 'u1', 'novo'),

  // Em atendimento
  L('l5', 'Transportes Vale', '41944443333', 'SulAmérica', 'Empresarial', 24, 2410000, 'Meta Ads', 'u2', 'atendimento'),
  L('l6', 'Padaria Central', '11933332222', 'Hapvida', 'PME', 6, 412000, 'Indicação', 'u3', 'atendimento'),
  L('l7', 'Ana Beatriz Lima', '11922221111', 'Unimed', 'Individual', 1, 139000, 'Site', 'u4', 'atendimento'),

  // Qualificado
  L('l8', 'Clínica São Lucas', '11911110000', 'Bradesco Saúde', 'PME Adesão', 9, 928000, 'Meta Ads', 'u1', 'qualificado'),
  L('l9', 'Escritório Marques', '11900001111', 'Unimed', 'Empresarial', 15, 1269000, 'Indicação', 'u2', 'qualificado'),
  L('l10', 'Fernanda Rocha', '11912345678', 'Amil', 'Individual', 3, 342000, 'WhatsApp', 'u3', 'qualificado'),

  // Proposta
  L('l11', 'Mercado Bom Preço', '11987654321', 'NotreDame', 'PME', 18, 1584000, 'Site', 'u4', 'proposta'),
  L('l12', 'Studio Pilates Corpo', '11955443322', 'SulAmérica', 'PME Adesão', 5, 620000, 'Meta Ads', 'u1', 'proposta'),
  L('l13', 'Paulo Andrade', '11944332211', 'Amil', 'Individual', 2, 268000, 'Indicação', 'u2', 'proposta'),

  // Negociação
  L('l14', 'Metalúrgica Silva', '11933221100', 'Bradesco Saúde', 'Empresarial', 32, 3120000, 'Indicação', 'u3', 'negociacao'),
  L('l15', 'Juliana Castro', '11922110099', 'Unimed', 'PME', 4, 486000, 'Meta Ads', 'u4', 'negociacao'),

  // Ganho
  L('l16', 'Colégio Horizonte', '11911009988', 'Amil', 'Empresarial', 28, 2680000, 'Meta Ads', 'u1', 'ganho'),
  L('l17', 'Restaurante Sabor', '11900998877', 'Hapvida', 'PME', 7, 548000, 'Site', 'u2', 'ganho'),

  // Perdido
  L('l18', 'Loja do Zé', '11988776655', 'NotreDame', 'PME', 5, 390000, 'WhatsApp', 'u3', 'perdido', 'Preço acima do orçamento'),
]

// seed de vidas/beneficiários p/ demonstração
const _seedLives = FUNIL_LEADS.find((l) => l.id === 'l1')
if (_seedLives) _seedLives.lives = [
  { name: 'João Aurora', age: 42, rel: 'titular' },
  { name: 'Marta Aurora', age: 39, rel: 'conjuge' },
  { name: 'Pedro Aurora', age: 12, rel: 'filho' },
]

// foto de perfil do WhatsApp (mock — pravatar simula o profile_pic_url)
const pic = (n: number) => `https://i.pravatar.cc/100?img=${n}`

// Enriquecimento: tier / cidade / SLA / entrada / CNPJ / etiquetas / foto WhatsApp
const ENRICH: Record<string, Partial<Lead>> = {
  l1: { tier: 'ouro', city: 'São Paulo, SP', tags: ['Retorno'], noContactHours: 3, slaMinutes: 6, entryDaysAgo: 0, cnpj: true, avatarUrl: pic(12), followupInDays: 0, attachments: [{ id: 'a1', name: 'RG_titular.jpg', size: 184320, type: 'image/jpeg', url: pic(12) }, { id: 'a2', name: 'Proposta_Amil.pdf', size: 512000, type: 'application/pdf', url: '#' }], email: 'contato@construtoraaurora.com.br', cpfCnpj: '12.345.678/0001-90', produtoSugerido: 'Amil PME Adesão 400', valorEstimado: 1846000, proximaAcao: 'Enviar proposta revisada com 12 vidas até sexta', disc: 'dominante', contexto: 'Cliente compara com a concorrência. Sensível a preço, mas valoriza rede credenciada em SP capital.', utmSource: 'meta', utmCampaign: 'pme-saude-sp', lives: [{ name: 'Carlos Aurora', age: 44, rel: 'titular' }, { name: 'Rita Aurora', age: 41, rel: 'conjuge' }, { name: 'Léo Aurora', age: 12, rel: 'filho' }] },
  l2: { tier: 'bronze', city: 'Guarulhos, SP', noContactHours: 52, slaMinutes: 42, entryDaysAgo: 1, avatarUrl: pic(45), followupInDays: -3 },
  l3: { tier: 'prata', city: 'Rio de Janeiro, RJ', tags: ['PME'], noContactHours: 12, slaMinutes: 18, entryDaysAgo: 1, cnpj: true, followupInDays: 2 },
  l4: { tier: 'bronze', city: 'Belo Horizonte, MG', noContactHours: 28, slaMinutes: 9, entryDaysAgo: 2, avatarUrl: pic(33), followupInDays: null },
  l5: { tier: 'diamante', city: 'Curitiba, PR', tags: ['Prioridade'], noContactHours: 6, entryDaysAgo: 4, cnpj: true, avatarUrl: pic(52), followupInDays: 1 },
  l6: { tier: 'bronze', city: 'Osasco, SP', noContactHours: 96, entryDaysAgo: 9, followupInDays: -12 },
  l7: { tier: 'prata', city: 'Campinas, SP', noContactHours: 40, entryDaysAgo: 6, avatarUrl: pic(15), followupInDays: 5 },
  l8: { tier: 'ouro', city: 'São Paulo, SP', tags: ['Proposta enviada'], noContactHours: 18, entryDaysAgo: 8, cnpj: true, avatarUrl: pic(9), followupInDays: 0 },
  l9: { tier: 'prata', city: 'Santo André, SP', tags: ['Indicação'], noContactHours: 74, entryDaysAgo: 11, cnpj: true, followupInDays: -7 },
  l10: { tier: 'bronze', city: 'Sorocaba, SP', noContactHours: 8, entryDaysAgo: 5, avatarUrl: pic(60), followupInDays: 8 },
  l11: { tier: 'diamante', city: 'São Paulo, SP', tags: ['Alto ticket'], noContactHours: 22, entryDaysAgo: 12, cnpj: true, avatarUrl: pic(25), followupInDays: 3 },
  l12: { tier: 'prata', city: 'Niterói, RJ', noContactHours: 5, entryDaysAgo: 10, followupInDays: null },
  l13: { tier: 'bronze', city: 'Diadema, SP', noContactHours: 120, entryDaysAgo: 14, followupInDays: -15 },
  l14: { tier: 'diamante', city: 'São Paulo, SP', tags: ['Alto ticket'], noContactHours: 2, entryDaysAgo: 16, cnpj: true, avatarUrl: pic(3), followupInDays: 2 },
  l15: { tier: 'ouro', city: 'Jundiaí, SP', noContactHours: 15, entryDaysAgo: 15, avatarUrl: pic(48), followupInDays: 15 },
  l16: { tier: 'ouro', city: 'São Paulo, SP', tags: ['Fechado'], noContactHours: 1, entryDaysAgo: 20, cnpj: true, avatarUrl: pic(31) },
  l17: { tier: 'prata', city: 'Barueri, SP', noContactHours: 3, entryDaysAgo: 22, avatarUrl: pic(68) },
}
for (const l of FUNIL_LEADS) Object.assign(l, ENRICH[l.id])
