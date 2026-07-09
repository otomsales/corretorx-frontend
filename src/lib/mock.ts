/** Dados mockados da Visão Geral. Trocar por hooks react-query + Supabase depois.
 *  Dinheiro em centavos. Números coerentes com uma corretora de saúde real. */

export const kpis = {
  mrrCents: 63042217, // R$ 630.422,17 — receita recorrente da carteira
  mrrTrend: 4.8,
  mrrHistory: [512, 528, 547, 559, 588, 604, 612, 630],

  vidasAtivas: 804,
  vidasTrend: 3.1,
  vidasHistory: [712, 726, 740, 758, 770, 786, 795, 804],

  negociacoesAbertas: 128,
  pipelineCents: 41870000, // R$ 418.700 em negociação
  negociacoesTrend: 12.0,
  negociacoesHistory: [88, 96, 104, 110, 112, 119, 124, 128],

  ganhosMes: 34,
  conversao: 26.5,
  conversaoTrend: -2.1,
  conversaoHistory: [31, 29, 30, 28, 27, 28, 27, 26.5],

  implantacoesAndamento: 19,
  implantacoesTrend: 5.0,
  implantacoesHistory: [12, 14, 13, 16, 15, 18, 17, 19],
}

export const funil = [
  { code: 'novo', label: 'Novo', count: 128, valueCents: 41870000 },
  { code: 'atendimento', label: 'Em atendimento', count: 86, valueCents: 33200000 },
  { code: 'qualificado', label: 'Qualificado', count: 61, valueCents: 27400000 },
  { code: 'proposta', label: 'Proposta', count: 38, valueCents: 19800000 },
  { code: 'negociacao', label: 'Negociação', count: 27, valueCents: 15600000 },
  { code: 'ganho', label: 'Ganho', count: 34, valueCents: 18240000 },
]

export const renovacoes = [
  { cliente: 'Construtora Aurora', operadora: 'Amil', dias: 6, tipo: 'reajuste', pct: 18.4, valueCents: 1846000 },
  { cliente: 'Clínica São Lucas', operadora: 'Bradesco Saúde', dias: 12, tipo: 'renovacao', pct: 0, valueCents: 928000 },
  { cliente: 'Transportes Vale', operadora: 'SulAmérica', dias: 18, tipo: 'reajuste', pct: 15.9, valueCents: 2410000 },
  { cliente: 'Padaria Central', operadora: 'Hapvida', dias: 23, tipo: 'renovacao', pct: 0, valueCents: 412000 },
  { cliente: 'Escritório Marques', operadora: 'Unimed', dias: 29, tipo: 'reajuste', pct: 12.7, valueCents: 1269000 },
]

export const operadoras = [
  { nome: 'Amil', vidas: 214, receitaCents: 17420000 },
  { nome: 'Bradesco Saúde', vidas: 186, receitaCents: 15980000 },
  { nome: 'SulAmérica', vidas: 142, receitaCents: 13260000 },
  { nome: 'Hapvida', vidas: 118, receitaCents: 8640000 },
  { nome: 'Unimed', vidas: 96, receitaCents: 7120000 },
  { nome: 'NotreDame', vidas: 48, receitaCents: 3960000 },
]

export const corretores = [
  { nome: 'Larissa Boss', vendas: 14, receitaCents: 8640000, metaPct: 118 },
  { nome: 'Rafael Nunes', vendas: 11, receitaCents: 6120000, metaPct: 92 },
  { nome: 'Camila Duarte', vendas: 9, receitaCents: 5480000, metaPct: 84 },
  { nome: 'Bruno Tavares', vendas: 7, receitaCents: 3910000, metaPct: 61 },
]

export const receitaTrend = [512, 528, 547, 559, 571, 588, 596, 604, 612, 621, 626, 630]
