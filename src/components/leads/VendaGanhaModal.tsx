import { useMemo, useState } from 'react'
import { X, Sparkle, CircleNotch, Check, CaretLeft, Buildings, User, IdentificationCard, Confetti, Warning, CalendarBlank, NotePencil, FileText, type Icon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { brl } from '@/lib/format'
import { OWNERS, REL_OPTS, type Lead } from '@/lib/funil-data'
import { MODALIDADES, type Modalidade, type ImplLife } from '@/store/implantacao'
import { WA_CONVERSATIONS } from '@/lib/whatsapp-data'
import { useLeads } from '@/store/leads'

export type VendaGanhaData = {
  modalidade: Modalidade
  operadora: string
  plano: string
  acomodacao?: 'enfermaria' | 'apartamento'
  copart: boolean
  odonto: boolean
  compulsorio?: boolean
  planoAnterior?: string
  valorMensal: number | null
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
  dataVenda: string
  vigencia?: string
  fidelidadeMeses?: number | null
  fonteVenda?: string
  vendedorId: string | null
  titular?: string
  composicao?: string
  estudoCotacao?: string
  observacoes?: string
  lives: ImplLife[]
}

/** Resumo da composição a partir dos beneficiários (titular + cônjuge + 2 filhos). */
export function comporContrato(lives: ImplLife[]): string {
  if (!lives.length) return ''
  const c: Record<string, number> = {}
  lives.forEach((l) => { c[l.rel] = (c[l.rel] ?? 0) + 1 })
  const plural = (n: number, s: string, p: string) => (n > 1 ? `${n} ${p}` : s)
  const parts: string[] = []
  if (c.titular) parts.push(plural(c.titular, 'titular', 'titulares'))
  if (c.conjuge) parts.push(plural(c.conjuge, 'cônjuge', 'cônjuges'))
  if (c.filho) parts.push(plural(c.filho, '1 filho(a)', 'filhos'))
  if (c.pai_mae) parts.push(plural(c.pai_mae, 'pai/mãe', 'pais'))
  if (c.irmao) parts.push(plural(c.irmao, 'irmão(ã)', 'irmãos'))
  if (c.outro) parts.push(plural(c.outro, '1 outro', 'outros'))
  return parts.join(' + ')
}

const OPERADORAS = ['Amil', 'Bradesco Saúde', 'SulAmérica', 'Hapvida', 'Unimed', 'NotreDame', 'Porto Seguro', 'Omint']
const toCents = (v: string) => Math.round((parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0) * 100)
const fromCents = (c?: number | null) => (c ? (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Extração heurística dos dados da venda a partir da conversa + ficha do lead (simula a X IA). */
function extrairDaConversa(lead: Lead) {
  const conv = WA_CONVERSATIONS.find((c) => c.leadId === lead.id)
  const texto = (conv?.messages ?? []).map((m) => m.text ?? '').join('\n')
  const alvo = `${texto}\n${lead.contexto ?? ''}\n${lead.produtoSugerido ?? ''}`
  const n = norm(alvo)
  const achou: string[] = []

  // operadora: da conversa, senão da ficha
  let operadora = OPERADORAS.find((o) => n.includes(norm(o))) ?? ''
  if (!operadora && lead.operadora && lead.operadora !== '—') operadora = lead.operadora
  if (operadora) achou.push('operadora')

  // plano / produto
  let plano = ''
  const mPlano = alvo.match(/\b(PME\s+Ades[aã]o(?:\s+\d+)?|PME|Ades[aã]o|Individual|Empresarial)\b/i)
  if (mPlano) plano = mPlano[0]
  if (!plano && lead.plano && lead.plano !== '—') plano = lead.plano
  if (plano) achou.push('plano')

  // vidas: "12 vidas" / "somos 12 funcionários"
  let vidas = 0
  const mVidas = alvo.match(/(\d{1,3})\s*(vidas?|funcion[áa]rios?|colaboradores?|benefici[áa]rios?)/i)
  if (mVidas) vidas = Number(mVidas[1])
  if (!vidas && lead.vidas) vidas = lead.vidas
  if (vidas) achou.push('vidas')

  // valor: "R$ 1.846,00" — pega o maior valor citado
  let valor: number | null = null
  const valores = [...alvo.matchAll(/R\$\s*([\d.]+,\d{2})/gi)].map((m) => toCents(m[1]))
  if (valores.length) valor = Math.max(...valores)
  if (!valor && lead.valorEstimado) valor = lead.valorEstimado
  if (!valor && lead.value) valor = lead.value
  if (valor) achou.push('valor')

  // modalidade — CNPJ/PME tem precedência ("PME Adesão" é produto PME, não adesão por entidade)
  const temCnpj = lead.cnpj || /cnpj|\bpme\b|empresa|funcion[áa]rio/i.test(alvo)
  const adesaoPura = /ades[aã]o/i.test(alvo) && !temCnpj
  const modalidade: Modalidade = adesaoPura ? 'adesao' : temCnpj ? 'pme' : 'pf'
  achou.push('modalidade')

  // acomodação / coparticipação / odonto
  const acomodacao: 'enfermaria' | 'apartamento' | undefined = /apartamento/i.test(alvo) ? 'apartamento' : /enfermaria/i.test(alvo) ? 'enfermaria' : undefined
  if (acomodacao) achou.push('acomodação')
  const copart = /coparticipa/i.test(alvo) && !/sem\s+coparticipa/i.test(alvo)
  if (/coparticipa/i.test(alvo)) achou.push('coparticipação')
  const odonto = /odonto/i.test(alvo)
  if (odonto) achou.push('odonto')

  // CNPJ da ficha
  const cnpj = lead.cpfCnpj && /\d{2}\.\d{3}\.\d{3}\/\d{4}/.test(lead.cpfCnpj) ? lead.cpfCnpj : undefined
  if (cnpj) achou.push('CNPJ')

  const cpf = lead.cpfCnpj && /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(lead.cpfCnpj) ? lead.cpfCnpj : undefined
  if (cpf) achou.push('CPF')

  // compulsório (PME): "todos os funcionários" / "compulsório"
  const compulsorio = /compuls[óo]rio|todos os funcion/i.test(alvo)
  if (compulsorio) achou.push('compulsório')

  // plano anterior — campo custom "Já tem plano ativo?" ou menção na conversa
  let planoAnterior = ''
  const custom = lead.custom ?? {}
  const jaTem = Object.entries(custom).find(([, v]) => v === true || v === 'Sim')
  const mAnterior = alvo.match(/(?:sa[ií]|vim|troca(?:r|ndo)?|migra(?:r|ndo)?|hoje (?:tenho|temos)|plano atual)[^.\n]{0,40}?\b(Amil|Bradesco|SulAm[ée]rica|Hapvida|Unimed|NotreDame|Porto|Omint)\b/i)
  if (mAnterior) planoAnterior = mAnterior[1]
  else if (jaTem) planoAnterior = 'Sim'
  if (planoAnterior) achou.push('plano anterior')

  // contato / origem vindos da ficha
  const email = lead.email ?? ''
  const telefone = lead.phone ?? ''
  const fonteVenda = lead.source ?? ''
  if (fonteVenda) achou.push('fonte')

  // vidas/beneficiários já cadastrados
  const lives: ImplLife[] = (lead.lives ?? []).map((l) => ({ name: l.name, age: l.age, rel: l.rel }))
  if (lives.length) achou.push('beneficiários')

  return { modalidade, operadora, plano, vidas, valor, acomodacao, copart, odonto, compulsorio, planoAnterior, cnpj, cpf, email, telefone, fonteVenda, lives, achou, temConversa: !!conv }
}

/* ---- padrão do painel do lead (definidos fora do componente p/ não remontar a cada tecla) ---- */
const IaTag = () => <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-teal px-1 py-px text-[9px] font-bold text-primary-foreground"><Sparkle className="h-2.5 w-2.5" weight="fill" />IA</span>

function Sec({ icon: I, title, children }: { icon: Icon; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/40 pt-4 first:border-t-0 first:pt-0">
      <div className="mb-2.5 flex items-center gap-2">
        <I className="h-[15px] w-[15px] shrink-0 text-muted-foreground" weight="duotone" />
        <h4 className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.08em] text-foreground">{title}</h4>
      </div>
      {/* 2 colunas com divisória vertical (só quando há coluna à direita) */}
      <div className="grid grid-cols-1 gap-x-7 sm:grid-cols-2 sm:[&>*:nth-child(even)]:border-l sm:[&>*:nth-child(even)]:border-border/40 sm:[&>*:nth-child(even)]:pl-7 sm:[&>[data-full]]:border-l-0 sm:[&>[data-full]]:pl-0">{children}</div>
    </section>
  )
}

function Row({ label, ia, children }: { label: string; ia?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[38px] items-center justify-between gap-3">
      <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] text-muted-foreground">{label}{ia && <IaTag />}</span>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </div>
  )
}

function Seg({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors', on ? 'bg-teal text-primary-foreground' : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground')}>{children}</button>
  )
}

/** input inline: alinhado à direita, sem caixa até o foco (igual EditField) */
const fieldCls = (extra?: string) => cn(
  '-mr-1 h-8 w-full max-w-[220px] rounded-md border border-transparent bg-transparent px-1.5 text-right text-[13.5px] font-medium text-foreground outline-none transition-colors hover:bg-foreground/[0.05] focus:border-teal focus:bg-background',
  extra,
)

export function VendaGanhaModal({ lead, onClose, onConfirm }: {
  lead: Lead
  onClose: () => void
  onConfirm: (d: VendaGanhaData) => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [modalidade, setModalidade] = useState<Modalidade>(lead.cnpj ? 'pme' : 'pf')
  const [operadora, setOperadora] = useState(lead.operadora !== '—' ? lead.operadora : '')
  const [plano, setPlano] = useState(lead.plano !== '—' ? lead.plano : '')
  const [acomodacao, setAcomodacao] = useState<'enfermaria' | 'apartamento' | ''>('')
  const [copart, setCopart] = useState(false)
  const [odonto, setOdonto] = useState(false)
  const [valor, setValor] = useState(fromCents(lead.value ?? lead.valorEstimado))
  const [vidas, setVidas] = useState(String(lead.vidas || 1))
  const [cnpj, setCnpj] = useState(lead.cpfCnpj ?? '')
  const [cpf, setCpf] = useState('')
  const [razaoSocial, setRazaoSocial] = useState(lead.cnpj ? lead.name : '')
  const [email, setEmail] = useState(lead.email ?? '')
  const [telefone, setTelefone] = useState(lead.phone ?? '')
  const [compulsorio, setCompulsorio] = useState(false)
  const [planoAnterior, setPlanoAnterior] = useState('')
  const [taxaAdesao, setTaxaAdesao] = useState('')
  const [fidelidade, setFidelidade] = useState('')
  const [fonteVenda, setFonteVenda] = useState(lead.source ?? '')
  const [administradora, setAdministradora] = useState('')
  const [entidade, setEntidade] = useState('')
  const [formacao, setFormacao] = useState('')
  const [dataVenda, setDataVenda] = useState(() => new Date().toISOString().slice(0, 10))
  const [vigencia, setVigencia] = useState('')
  const [obs, setObs] = useState(lead.contexto ?? '')
  const [lives, setLives] = useState<ImplLife[]>(lead.lives ?? [])
  const [titular, setTitular] = useState(lead.name)
  const [vendedorId, setVendedorId] = useState<string | null>(lead.ownerId)
  const [estudoCotacao, setEstudoCotacao] = useState('')
  // composição: derivada dos beneficiários até o usuário editar à mão
  const [composicao, setComposicao] = useState('')
  const [composicaoTocada, setComposicaoTocada] = useState(false)
  const composicaoAuto = comporContrato(lives)
  const composicaoValor = composicaoTocada ? composicao : composicaoAuto
  // editor de vidas (novo OU edição de um existente)
  const [addLife, setAddLife] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [lnome, setLnome] = useState('')
  const [lidade, setLidade] = useState('')
  const [lrel, setLrel] = useState('titular')
  const fecharVida = () => { setAddLife(false); setEditIdx(null); setLnome(''); setLidade(''); setLrel('titular') }
  const editarVida = (i: number) => {
    const l = lives[i]
    setEditIdx(i); setAddLife(true)
    setLnome(l.name); setLidade(l.age ? String(l.age) : ''); setLrel(l.rel)
  }
  const salvarVida = () => {
    if (!lnome.trim()) return
    const nova = { name: lnome.trim(), age: Number(lidade) || undefined, rel: lrel }
    setLives((p) => (editIdx === null ? [...p, nova] : p.map((x, j) => (j === editIdx ? nova : x))))
    fecharVida()
  }

  const [iaLoading, setIaLoading] = useState(false)
  const [iaFields, setIaFields] = useState<Set<string>>(new Set())
  const preview = useMemo(() => extrairDaConversa(lead), [lead])
  const vendedor = OWNERS.find((o) => o.id === lead.ownerId)

  // catálogo vindo da base: operadoras e planos já cadastrados (planos filtram pela operadora escolhida)
  const { leads } = useLeads()
  const catalogo = useMemo(() => {
    const ops = new Set<string>(OPERADORAS)
    const porOperadora = new Map<string, Set<string>>()
    const todosPlanos = new Set<string>()
    leads.forEach((l) => {
      const op = (l.operadora ?? '').trim()
      const pl = (l.plano ?? '').trim()
      if (op && op !== '—') ops.add(op)
      if (pl && pl !== '—') {
        todosPlanos.add(pl)
        if (op && op !== '—') {
          if (!porOperadora.has(op)) porOperadora.set(op, new Set())
          porOperadora.get(op)!.add(pl)
        }
      }
    })
    return { operadoras: [...ops].sort(), porOperadora, todosPlanos: [...todosPlanos].sort() }
  }, [leads])

  const planosSugeridos = useMemo(() => {
    const daOperadora = [...(catalogo.porOperadora.get(operadora.trim()) ?? [])].sort()
    // planos da operadora primeiro; depois o resto, sem repetir
    return [...daOperadora, ...catalogo.todosPlanos.filter((p) => !daOperadora.includes(p))]
  }, [catalogo, operadora])

  const preencherComIA = () => {
    setIaLoading(true)
    setTimeout(() => {
      const r = preview
      const marcados = new Set<string>()
      setModalidade(r.modalidade); marcados.add('modalidade')
      if (r.operadora) { setOperadora(r.operadora); marcados.add('operadora') }
      if (r.plano) { setPlano(r.plano); marcados.add('plano') }
      if (r.vidas) { setVidas(String(r.vidas)); marcados.add('vidas') }
      if (r.valor) { setValor(fromCents(r.valor)); marcados.add('valor') }
      if (r.acomodacao) { setAcomodacao(r.acomodacao); marcados.add('acomodacao') }
      if (r.copart) { setCopart(true); marcados.add('copart') }
      if (r.odonto) { setOdonto(true); marcados.add('odonto') }
      if (r.cnpj) { setCnpj(r.cnpj); marcados.add('cnpj') }
      if (r.cpf) { setCpf(r.cpf); marcados.add('cpf') }
      if (r.compulsorio) { setCompulsorio(true); marcados.add('compulsorio') }
      if (r.planoAnterior) { setPlanoAnterior(r.planoAnterior); marcados.add('planoAnterior') }
      if (r.email) { setEmail(r.email); marcados.add('email') }
      if (r.telefone) { setTelefone(r.telefone); marcados.add('telefone') }
      if (r.fonteVenda) { setFonteVenda(r.fonteVenda); marcados.add('fonte') }
      if (r.lives.length) { setLives(r.lives); marcados.add('lives') }
      setIaFields(marcados)
      setIaLoading(false)
      setStep(2)
      toast.success(`X IA preencheu ${marcados.size} campos${r.temConversa ? ' a partir da conversa' : ' a partir da ficha'}`)
    }, 900)
  }

  const iaMark = (k: string) => iaFields.has(k)
  const labelCls = 'mb-1 flex items-center gap-1.5 text-[12px] text-muted-foreground'


  const valorCents = toCents(valor)
  const podeConfirmar = !!operadora.trim() && valorCents > 0

  const confirmar = () => {
    if (!podeConfirmar) { toast.error('Informe operadora e valor mensal'); return }
    onConfirm({
      modalidade, operadora: operadora.trim(), plano: plano.trim(),
      acomodacao: acomodacao || undefined, copart, odonto,
      compulsorio: modalidade === 'pme' ? compulsorio : undefined,
      planoAnterior: planoAnterior.trim() || undefined,
      valorMensal: valorCents, vidas: Math.max(1, Number(vidas) || 1),
      taxaAdesao: modalidade === 'adesao' ? toCents(taxaAdesao) || null : null,
      cnpj: modalidade === 'pme' ? cnpj.trim() || undefined : undefined,
      cpf: modalidade !== 'pme' ? cpf.trim() || undefined : undefined,
      razaoSocial: modalidade === 'pme' ? razaoSocial.trim() || undefined : undefined,
      email: email.trim() || undefined, telefone: telefone.trim() || undefined,
      administradora: modalidade === 'adesao' ? administradora.trim() || undefined : undefined,
      entidade: modalidade === 'adesao' ? entidade.trim() || undefined : undefined,
      formacao: modalidade === 'adesao' ? formacao.trim() || undefined : undefined,
      dataVenda, vigencia: vigencia || undefined,
      fidelidadeMeses: Number(fidelidade) || null,
      fonteVenda: fonteVenda.trim() || undefined, vendedorId,
      titular: titular.trim() || undefined,
      composicao: composicaoValor || undefined,
      estudoCotacao: estudoCotacao.trim() || undefined,
      observacoes: obs.trim() || undefined, lives,
    })
  }

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="dropdown-in relative flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_16px_32px_-12px_rgba(0,0,0,0.14)] dark:border-white/10 dark:shadow-[0_16px_32px_-10px_rgba(0,0,0,0.55),0_44px_72px_-16px_rgba(0,0,0,0.7)]">
        {/* header */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border/40 px-5 py-3.5">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><CaretLeft className="h-4 w-4" weight="bold" /></button>
          )}
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white"><Confetti className="h-4.5 w-4.5" weight="fill" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-bold tracking-tight text-foreground">Registrar venda ganha</h3>
            <p className="truncate text-[12px] text-muted-foreground">{lead.name} · passo {step} de 2</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X className="h-4.5 w-4.5" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {step === 1 ? (
            <>
              {/* atalho IA */}
              <button
                onClick={preencherComIA} disabled={iaLoading}
                className="mb-4 flex w-full items-center gap-3 rounded-xl border border-teal/40 bg-teal/[0.06] p-3 text-left transition-colors hover:bg-teal/[0.1] disabled:opacity-70"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal text-primary-foreground">
                  {iaLoading ? <CircleNotch className="h-4.5 w-4.5 animate-spin" weight="bold" /> : <Sparkle className="h-4.5 w-4.5" weight="fill" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold text-foreground">{iaLoading ? 'Lendo a conversa…' : 'Registrar automático com X IA'}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {iaLoading ? 'Extraindo operadora, plano, vidas e valor…' : preview.achou.length ? `Detecta: ${preview.achou.slice(0, 4).join(', ')}${preview.achou.length > 4 ? '…' : ''}` : 'Preenche a partir da conversa e da ficha'}
                  </span>
                </span>
              </button>

              <p className={labelCls}>Modalidade da venda</p>
              <div className="grid gap-2">
                {MODALIDADES.map((m) => {
                  const I = m.value === 'pme' ? Buildings : m.value === 'adesao' ? IdentificationCard : User
                  return (
                    <button key={m.value} onClick={() => setModalidade(m.value)}
                      className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-colors', modalidade === m.value ? 'border-teal bg-teal/[0.06]' : 'border-border/50 hover:bg-foreground/[0.03]')}>
                      <I className={cn('h-5 w-5 shrink-0', modalidade === m.value ? 'text-teal' : 'text-muted-foreground')} weight="duotone" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold text-foreground">{m.label}</span>
                        <span className="block text-[12px] text-muted-foreground">{m.hint}</span>
                      </span>
                      {modalidade === m.value && <Check className="h-4 w-4 shrink-0 text-teal" weight="bold" />}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {iaFields.size > 0 && (
                <p className="flex items-center gap-1.5 rounded-lg bg-teal/[0.06] px-2.5 py-1.5 text-[12px] text-teal">
                  <Sparkle className="h-3.5 w-3.5 shrink-0" weight="fill" /> {iaFields.size} campos preenchidos pela X IA — confira antes de confirmar.
                </p>
              )}

              <Sec icon={Buildings} title="Plano contratado">
                <Row label="Operadora" ia={iaMark('operadora')}>
                  <input list="vg-operadoras" value={operadora} onChange={(e) => setOperadora(e.target.value)} placeholder="—" className={fieldCls()} />
                  <datalist id="vg-operadoras">{catalogo.operadoras.map((o) => <option key={o} value={o} />)}</datalist>
                </Row>
                <Row label="Plano" ia={iaMark('plano')}>
                  <input list="vg-planos" value={plano} onChange={(e) => setPlano(e.target.value)} placeholder="—" className={fieldCls()} />
                  <datalist id="vg-planos">{planosSugeridos.map((p) => <option key={p} value={p} />)}</datalist>
                </Row>
                <Row label="Acomodação" ia={iaMark('acomodacao')}>
                  <div className="flex items-center gap-0.5 rounded-lg bg-foreground/[0.04] p-0.5">
                    {(['enfermaria', 'apartamento'] as const).map((a) => (
                      <Seg key={a} on={acomodacao === a} onClick={() => setAcomodacao(acomodacao === a ? '' : a)}>{a === 'enfermaria' ? 'Enfermaria' : 'Apto'}</Seg>
                    ))}
                  </div>
                </Row>
                <Row label="Adicionais">
                  <div className="flex items-center gap-0.5 rounded-lg bg-foreground/[0.04] p-0.5">
                    <Seg on={copart} onClick={() => setCopart(!copart)}>Copart.</Seg>
                    <Seg on={odonto} onClick={() => setOdonto(!odonto)}>Odonto</Seg>
                  </div>
                </Row>
                <Row label="Plano anterior" ia={iaMark('planoAnterior')}>
                  <input value={planoAnterior} onChange={(e) => setPlanoAnterior(e.target.value)} placeholder="Não possui" className={fieldCls()} />
                </Row>
                {modalidade === 'pme' && (
                  <Row label="Adesão" ia={iaMark('compulsorio')}>
                    <div className="flex items-center gap-0.5 rounded-lg bg-foreground/[0.04] p-0.5">
                      <Seg on={compulsorio} onClick={() => setCompulsorio(true)}>Compulsória</Seg>
                      <Seg on={!compulsorio} onClick={() => setCompulsorio(false)}>Livre</Seg>
                    </div>
                  </Row>
                )}
              </Sec>

              <Sec icon={Confetti} title="Valores">
                <Row label="Valor mensal" ia={iaMark('valor')}>
                  <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" className={fieldCls('font-mono tabular-nums')} />
                </Row>
                <Row label="Vidas" ia={iaMark('vidas')}>
                  <input value={vidas} onChange={(e) => setVidas(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="1" className={fieldCls('max-w-[90px] font-mono tabular-nums')} />
                </Row>
                {modalidade === 'adesao' && (
                  <Row label="Taxa de adesão">
                    <input value={taxaAdesao} onChange={(e) => setTaxaAdesao(e.target.value)} inputMode="decimal" placeholder="0,00" className={fieldCls('font-mono tabular-nums')} />
                  </Row>
                )}
                <Row label="Valor por vida">
                  <span className="px-1.5 font-mono text-[13.5px] tabular-nums text-muted-foreground">{valorCents && Number(vidas) ? brl(Math.round(valorCents / Number(vidas))) : '—'}</span>
                </Row>
              </Sec>

              <Sec icon={modalidade === 'pme' ? Buildings : modalidade === 'adesao' ? IdentificationCard : User} title={modalidade === 'pme' ? 'Dados da empresa' : modalidade === 'adesao' ? 'Adesão' : 'Titular'}>
                {modalidade === 'pme' && (
                  <>
                    <Row label="Razão social"><input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="—" className={fieldCls()} /></Row>
                    <Row label="CNPJ" ia={iaMark('cnpj')}>
                      <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className={fieldCls('font-mono tabular-nums')} />
                    </Row>
                  </>
                )}
                {modalidade === 'adesao' && (
                  <>
                    <Row label="Administradora"><input value={administradora} onChange={(e) => setAdministradora(e.target.value)} placeholder="—" className={fieldCls()} /></Row>
                    <Row label="Entidade de classe"><input value={entidade} onChange={(e) => setEntidade(e.target.value)} placeholder="—" className={fieldCls()} /></Row>
                    <Row label="Formação"><input value={formacao} onChange={(e) => setFormacao(e.target.value)} placeholder="—" className={fieldCls()} /></Row>
                  </>
                )}
                {modalidade !== 'pme' && (
                  <>
                    <Row label="Titular"><input value={titular} onChange={(e) => setTitular(e.target.value)} placeholder="—" className={fieldCls()} /></Row>
                    <Row label="CPF" ia={iaMark('cpf')}><input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className={fieldCls('font-mono tabular-nums')} /></Row>
                  </>
                )}
                <Row label="E-mail" ia={iaMark('email')}><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="—" className={fieldCls()} /></Row>
                <Row label="Telefone" ia={iaMark('telefone')}><input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="—" className={fieldCls('font-mono tabular-nums')} /></Row>
                <div data-full className="sm:col-span-2">
                  <Row label="Composição" ia={iaMark('lives')}>
                    <input
                      value={composicaoValor}
                      onChange={(e) => { setComposicaoTocada(true); setComposicao(e.target.value) }}
                      placeholder="titular + cônjuge + 2 filhos" className={fieldCls('max-w-[300px]')}
                    />
                  </Row>
                </div>
                <div data-full className="sm:col-span-2">
                  <div className="flex min-h-[38px] items-start justify-between gap-3 py-1">
                    <span className="flex shrink-0 items-center gap-1.5 pt-1 text-[12.5px] text-muted-foreground">
                      Beneficiários{lives.length ? ` · ${lives.length}` : ''}{iaMark('lives') && <IaTag />}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1">
                      {lives.map((l, i) => (
                        editIdx === i ? null : (
                          <span key={i} className="group/vg inline-flex items-center gap-1 rounded bg-foreground/[0.06] py-0.5 pl-1.5 pr-1 text-[11.5px] text-foreground transition-colors hover:bg-foreground/[0.1]">
                            <button onClick={() => editarVida(i)} title="Clique para editar" className="cursor-pointer">{l.name}{l.age ? ` · ${l.age}` : ''}{l.rel === 'titular' ? ' (tit.)' : ''}</button>
                            <button onClick={() => setLives((p) => p.filter((_, j) => j !== i))} title="Remover" className="grid h-3.5 w-3.5 place-items-center rounded text-muted-foreground opacity-0 transition-all hover:text-danger group-hover/vg:opacity-100"><X className="h-2.5 w-2.5" weight="bold" /></button>
                          </span>
                        )
                      ))}
                      {addLife ? (
                        <span className="flex items-center gap-1">
                          <input autoFocus value={lnome} onChange={(e) => setLnome(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') salvarVida(); if (e.key === 'Escape') fecharVida() }} placeholder="Nome" className="h-7 w-28 rounded-md border border-input bg-background px-1.5 text-[12px] outline-none focus:border-teal" />
                          <input value={lidade} onChange={(e) => setLidade(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') salvarVida(); if (e.key === 'Escape') fecharVida() }} placeholder="Id." inputMode="numeric" className="h-7 w-11 rounded-md border border-input bg-background px-1.5 text-[12px] outline-none focus:border-teal" />
                          <select value={lrel} onChange={(e) => setLrel(e.target.value)} className="h-7 rounded-md border border-input bg-background px-1 text-[12px] outline-none focus:border-teal">
                            {REL_OPTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <button onClick={salvarVida} title={editIdx === null ? 'Adicionar' : 'Salvar'} className="grid h-7 w-7 place-items-center rounded-md bg-teal text-primary-foreground"><Check className="h-3.5 w-3.5" weight="bold" /></button>
                          <button onClick={fecharVida} title="Cancelar" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
                        </span>
                      ) : (
                        <button onClick={() => { setEditIdx(null); setAddLife(true) }} className="rounded px-1.5 py-0.5 text-[11.5px] font-medium text-teal transition hover:brightness-110">+ vida</button>
                      )}
                    </div>
                  </div>
                </div>
              </Sec>

              <Sec icon={CalendarBlank} title="Datas & origem">
                <Row label="Data da venda">
                  <input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} className={fieldCls('max-w-[150px] tabular-nums')} />
                </Row>
                <Row label="Início de vigência">
                  <input type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)} className={fieldCls('max-w-[150px] tabular-nums')} />
                </Row>
                <Row label="Fidelidade (meses)">
                  <input value={fidelidade} onChange={(e) => setFidelidade(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="—" className={fieldCls('max-w-[90px] font-mono tabular-nums')} />
                </Row>
                <Row label="Fonte da venda" ia={iaMark('fonte')}>
                  <input value={fonteVenda} onChange={(e) => setFonteVenda(e.target.value)} placeholder="—" className={fieldCls()} />
                </Row>
                <Row label="Vendedor">
                  <span className="flex items-center justify-end gap-1.5">
                    {vendedor && <img src={vendedor.avatar} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />}
                    <select value={vendedorId ?? ''} onChange={(e) => setVendedorId(e.target.value || null)} className={fieldCls('max-w-[150px] cursor-pointer')}>
                      <option value="">—</option>
                      {OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </span>
                </Row>
              </Sec>

              <Sec icon={FileText} title="Estudo da cotação">
                <textarea value={estudoCotacao} onChange={(e) => setEstudoCotacao(e.target.value)} rows={2} placeholder="Resumo do estudo/comparativo que embasou a venda (operadoras cotadas, valores, rede)…"
                  className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-[13.5px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-teal sm:col-span-2" />
              </Sec>

              <Sec icon={NotePencil} title="Observações">
                <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Contexto do fechamento…"
                  className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-[13.5px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-teal sm:col-span-2" />
              </Sec>

              {!podeConfirmar && (
                <p className="flex items-center gap-1.5 text-[12px] text-warning"><Warning className="h-3.5 w-3.5 shrink-0" weight="fill" /> Informe operadora e valor mensal para confirmar.</p>
              )}
            </div>
          )}
        </div>

        {/* rodapé */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/40 px-5 py-3">
          <span className="text-[12px] text-muted-foreground">{valorCents > 0 && step === 2 ? <>Contrato: <strong className="font-mono text-foreground">{brl(valorCents)}</strong>/mês · {vidas || 1} vida(s)</> : 'Gera o processo de implantação'}</span>
          {step === 1 ? (
            <button onClick={() => setStep(2)} className="rounded-lg bg-teal px-4 py-2 text-[13px] font-bold text-primary-foreground transition hover:brightness-110">Continuar</button>
          ) : (
            <button onClick={confirmar} disabled={!podeConfirmar} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-40">
              <Confetti className="h-4 w-4" weight="fill" /> Confirmar venda
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
