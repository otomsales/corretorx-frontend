import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeSlash, CircleNotch, Check } from '@phosphor-icons/react'
import { AuthShell } from '@/components/auth/AuthShell'
import { cn } from '@/lib/utils'

const field =
  'h-[46px] w-full rounded-xl border border-input bg-muted/40 px-3.5 text-[14.5px] outline-none transition-all placeholder:text-muted-foreground/60 focus:border-teal focus:ring-[3px] focus:ring-teal/20'

export default function Signup() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [accept, setAccept] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (loading || !accept) return
    setLoading(true)
    // Mockup — troca por Supabase Auth + criação da org (corretora) no wire real
    setTimeout(() => {
      setLoading(false)
      navigate('/app')
    }, 1000)
  }

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h2 className="text-[26px] font-bold tracking-tight">Criar conta</h2>
          <p className="text-sm text-muted-foreground">
            Teste grátis por <span className="font-semibold text-foreground">14 dias</span>. Sem cartão de crédito.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="nome" className="text-xs font-semibold text-muted-foreground">Seu nome</label>
            <input id="nome" type="text" required autoComplete="name" autoCapitalize="words" placeholder="Ex: Larissa Souza" className={field} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="corretora" className="text-xs font-semibold text-muted-foreground">Nome da corretora</label>
            <input id="corretora" type="text" required autoComplete="organization" placeholder="Ex: Aurora Corretora de Saúde" className={field} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-muted-foreground">E-mail corporativo</label>
            <input id="email" type="email" required autoComplete="email" placeholder="voce@corretora.com.br" className={field} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="whats" className="text-xs font-semibold text-muted-foreground">WhatsApp</label>
            <input id="whats" type="tel" inputMode="tel" required autoComplete="tel" placeholder="(11) 98888-7777" className={field} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="senha" className="text-xs font-semibold text-muted-foreground">Senha</label>
            <div className="relative">
              <input
                id="senha" type={showPw ? 'text' : 'password'} required minLength={8} autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className={cn(field, 'pr-11')}
              />
              <button
                type="button" onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground/60 hover:text-muted-foreground"
              >
                {showPw ? <EyeSlash className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>

          {/* Consentimento LGPD — nunca pré-marcado */}
          <label className="flex cursor-pointer select-none items-start gap-2.5 text-[12.5px] leading-snug text-muted-foreground">
            <button
              type="button" role="checkbox" aria-checked={accept} onClick={() => setAccept((v) => !v)}
              className={cn(
                'mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border-[1.5px] transition-all',
                accept ? 'border-transparent bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE]' : 'border-input',
              )}
            >
              {accept && <Check className="h-3 w-3 text-[#04231F]" />}
            </button>
            <span>
              Li e aceito os <a href="#" onClick={(e) => e.preventDefault()} className="font-semibold text-teal hover:underline">Termos de Uso</a> e a{' '}
              <a href="#" onClick={(e) => e.preventDefault()} className="font-semibold text-teal hover:underline">Política de Privacidade</a> (LGPD).
            </span>
          </label>

          <button
            type="submit" disabled={loading || !accept}
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE] text-[15px] font-bold text-primary-foreground shadow-[0_10px_26px_-10px_rgba(34,211,238,.55)] transition-all hover:brightness-105 active:translate-y-px',
              (loading || !accept) && 'cursor-not-allowed opacity-60',
            )}
          >
            {loading ? <><CircleNotch className="h-[18px] w-[18px] animate-spin" /> Criando conta…</> : 'Criar conta grátis'}
          </button>
        </form>

        <p className="text-center text-[13px] text-muted-foreground">
          Já tem conta? <Link to="/" className="font-semibold text-teal hover:underline">Entrar</Link>
        </p>
      </div>
    </AuthShell>
  )
}
