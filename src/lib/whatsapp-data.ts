/** Mock do inbox WhatsApp — conversas ligadas a leads do funil (leadId → painel lê do store). */

export interface WaMsg {
  id: string
  fromMe: boolean
  text: string
  t: string // HH:MM
  day: string // 'Hoje' | 'Ontem' | 'dd/MM'
  status?: 'sent' | 'delivered' | 'read'
  type?: 'text' | 'image' | 'audio' | 'doc'
}

export interface WaConv {
  id: string
  leadId?: string
  name: string
  phone: string // E.164 sem +
  avatarUrl?: string
  online?: boolean
  lastSeen?: string
  unread: number
  pinned?: boolean
  muted?: boolean
  favorite?: boolean
  archived?: boolean
  aiOn?: boolean
  messages: WaMsg[]
}

const m = (id: string, fromMe: boolean, text: string, t: string, day: string, status?: WaMsg['status'], type?: WaMsg['type']): WaMsg =>
  ({ id, fromMe, text, t, day, status, type })

export const WA_CONVERSATIONS: WaConv[] = [
  {
    id: 'w1', leadId: 'l1', name: 'Construtora Aurora', phone: '5511988887777', avatarUrl: 'https://i.pravatar.cc/100?img=12',
    online: true, unread: 2, pinned: true, aiOn: true, messages: [
      m('w1m1', false, 'Boa tarde! Vi o anúncio de vocês sobre plano PME 👀', '14:20', 'Ontem'),
      m('w1m2', true, 'Boa tarde! Que ótimo 😊 Vocês têm CNPJ ativo?', '14:22', 'Ontem', 'read'),
      m('w1m3', false, 'Temos sim, somos 12 funcionários', '14:25', 'Ontem'),
      m('w1m4', true, 'Perfeito. Consigo uma condição excelente na *Amil PME Adesão*. Posso montar a proposta com os 12?', '14:26', 'Ontem', 'read'),
      m('w1m5', false, 'Pode sim! Qual valor fica por vida?', '09:10', 'Hoje'),
      m('w1m6', false, 'E cobre São Paulo capital né?', '09:11', 'Hoje'),
    ],
  },
  {
    id: 'w2', leadId: 'l5', name: 'Transportes Vale', phone: '5541944443333', avatarUrl: 'https://i.pravatar.cc/100?img=52',
    online: false, lastSeen: 'hoje às 08:40', unread: 0, favorite: true, messages: [
      m('w2m1', true, 'Bom dia! Segue a proposta empresarial pra 24 vidas 📄', '08:30', 'Hoje', 'read', 'doc'),
      m('w2m2', true, 'Qualquer dúvida me chama 👍', '08:31', 'Hoje', 'read'),
      m('w2m3', false, 'Recebi, obrigado! Vou levar pra diretoria hoje', '08:38', 'Hoje'),
    ],
  },
  {
    id: 'w3', leadId: 'l8', name: 'Clínica São Lucas', phone: '5511911110000', avatarUrl: 'https://i.pravatar.cc/100?img=9',
    online: false, lastSeen: 'ontem às 19:12', unread: 3, aiOn: true, messages: [
      m('w3m1', false, 'Oi! A proposta da Bradesco tá de pé ainda?', '18:50', 'Ontem'),
      m('w3m2', true, 'Tá sim! Válida até sexta 🙌', '18:55', 'Ontem', 'read'),
      m('w3m3', false, 'Boa. Consegue incluir mais 2 dependentes?', '08:05', 'Hoje'),
      m('w3m4', false, 'São a esposa e o filho de um sócio', '08:05', 'Hoje'),
      m('w3m5', false, 'Me avisa o novo valor por favor', '08:06', 'Hoje'),
    ],
  },
  {
    id: 'w4', leadId: 'l2', name: 'Marina Prado', phone: '5511977776666', avatarUrl: 'https://i.pravatar.cc/100?img=45',
    online: false, lastSeen: 'hoje às 07:15', unread: 0, messages: [
      m('w4m1', false, 'Boa noite, é sobre o plano individual', '21:40', 'Ontem'),
      m('w4m2', true, 'Oi Marina! Claro, me conta um pouco: é só pra você?', '21:42', 'Ontem', 'read'),
      m('w4m3', false, 'Isso, só pra mim mesmo', '07:10', 'Ontem'),
      m('w4m4', true, 'Fechado. Te mando 3 opções de operadora em instantes 🔎', '07:14', 'Ontem', 'delivered'),
    ],
  },
  {
    id: 'w5', leadId: 'l11', name: 'Mercado Bom Preço', phone: '5511987654321', avatarUrl: 'https://i.pravatar.cc/100?img=25',
    online: true, unread: 1, messages: [
      m('w5m1', true, 'Oi! Passando pra saber se conseguiu ver a proposta da NotreDame 😀', '10:00', 'Hoje', 'read'),
      m('w5m2', false, 'Vi sim! Ficou bom, mas o RH quer comparar com a SulAmérica', '10:20', 'Hoje'),
    ],
  },
  {
    id: 'w6', leadId: 'l7', name: 'Ana Beatriz Lima', phone: '5511922221111', avatarUrl: 'https://i.pravatar.cc/100?img=15',
    online: false, lastSeen: 'há 2 dias', unread: 0, muted: true, messages: [
      m('w6m1', false, 'Obrigada pelo atendimento! 💚', '16:00', 'segunda-feira'),
      m('w6m2', true, 'Eu que agradeço, Ana! Qualquer coisa é só chamar 😉', '16:05', '08/07', 'read'),
    ],
  },
  {
    id: 'w7', leadId: 'l14', name: 'Metalúrgica Silva', phone: '5511933221100', avatarUrl: 'https://i.pravatar.cc/100?img=3',
    online: false, lastSeen: 'hoje às 06:50', unread: 0, pinned: true, messages: [
      m('w7m1', false, 'Fechamos com vocês! Pode emitir 🎉', '06:45', 'terça-feira'),
      m('w7m2', true, 'Maravilha!! 🥳 Já inicio a implantação e te envio a lista de documentos', '06:48', 'terça-feira', 'read'),
    ],
  },
  {
    id: 'w8', name: 'Lead Meta · João P.', phone: '5511977223344', online: false, unread: 0, messages: [
      m('w8m1', false, 'Vi um anúncio de plano de saúde...', '11:30', '02/07/2026'),
      m('w8m2', true, 'Oi João! Bem-vindo 👋 Me conta: é plano individual, familiar ou pra empresa?', '11:31', '02/07/2026', 'sent'),
    ],
  },
]
