/** Helpers de formatação pt-BR. Dinheiro sempre em CENTAVOS (invariante do schema). */

export const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })

export const brlFull = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const num = (n: number) => n.toLocaleString('pt-BR')

export const compact = (n: number) =>
  n.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

export const pct = (n: number, digits = 1) =>
  `${n.toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`

export function initials(name?: string | null): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

/** Cor estável por string (avatar). Hash → par bg/text tingido (exceção do vault p/ avatar). */
const AVATAR_TINTS = [
  'bg-sky-500/20 text-sky-300',
  'bg-violet-500/20 text-violet-300',
  'bg-amber-500/20 text-amber-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-rose-500/20 text-rose-300',
  'bg-cyan-500/20 text-cyan-300',
  'bg-indigo-500/20 text-indigo-300',
  'bg-teal-500/20 text-teal-300',
  'bg-orange-500/20 text-orange-300',
  'bg-fuchsia-500/20 text-fuchsia-300',
]
export function pickAvatar(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length]
}

/** Tolerante na entrada, canônico na saída. */
export function formatPhone(raw?: string | null): string {
  if (!raw) return ''
  const d = raw.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw
}
