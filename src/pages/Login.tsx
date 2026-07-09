import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'forgot'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    // Mockup — troca por Supabase Auth no wire real
    setTimeout(() => {
      setLoading(false)
      if (mode === 'login') navigate('/app')
    }, 900)
  }

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="space-y-1.5">
          {mode === 'forgot' && (
            <button
              onClick={() => setMode('login')}
              className="mb-2 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          )}
          <h2 className="text-[26px] font-bold tracking-tight">
            {mode === 'login' ? 'Entrar' : 'Recuperar senha'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Acesse o painel da sua corretora' : 'Informe seu e-mail para redefinir a senha'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-muted-foreground">E-mail</label>
            <input
              id="email" type="email" required autoComplete="email"
              placeholder="voce@corretora.com.br"
              className="h-[46px] w-full rounded-xl border border-input bg-muted/40 px-3.5 text-[14.5px] outline-none transition-all placeholder:text-muted-foreground/60 focus:border-teal focus:ring-[3px] focus:ring-teal/20"
            />
          </div>

          {mode === 'login' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="senha" className="text-xs font-semibold text-muted-foreground">Senha</label>
                <button type="button" onClick={() => setMode('forgot')} className="text-xs font-semibold text-teal hover:underline">
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  id="senha" type={showPw ? 'text' : 'password'} required minLength={6} autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-[46px] w-full rounded-xl border border-input bg-muted/40 pl-3.5 pr-11 text-[14.5px] outline-none transition-all placeholder:text-muted-foreground/60 focus:border-teal focus:ring-[3px] focus:ring-teal/20"
                />
                <button
                  type="button" onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground/60 hover:text-muted-foreground"
                >
                  {showPw ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-muted-foreground">
              <input type="checkbox" defaultChecked className="peer sr-only" />
              <span className="grid h-[18px] w-[18px] place-items-center rounded-md border-[1.5px] border-input transition-all peer-checked:border-transparent peer-checked:bg-gradient-to-br peer-checked:from-[#2DD4BF] peer-checked:to-[#22D3EE] peer-focus-visible:ring-[3px] peer-focus-visible:ring-teal/25">
                <svg className="h-3 w-3 opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="#04231F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              Manter conectado neste dispositivo
            </label>
          )}

          <button
            type="submit" disabled={loading}
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE] text-[15px] font-bold text-primary-foreground shadow-[0_10px_26px_-10px_rgba(34,211,238,.55)] transition-all hover:brightness-105 active:translate-y-px',
              loading && 'cursor-progress opacity-75',
            )}
          >
            {loading ? (
              <><Loader2 className="h-[18px] w-[18px] animate-spin" /> {mode === 'login' ? 'Entrando…' : 'Enviando…'}</>
            ) : mode === 'login' ? 'Entrar' : 'Enviar link de recuperação'}
          </button>
        </form>

        {mode === 'login' && (
          <p className="text-center text-[13px] text-muted-foreground">
            Não tem conta?{' '}
            <Link to="/cadastro" className="font-semibold text-teal hover:underline">Criar conta grátis</Link>
          </p>
        )}
      </div>
    </AuthShell>
  )
}
