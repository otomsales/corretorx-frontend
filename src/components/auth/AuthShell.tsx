import { useState, type ReactNode } from 'react'
import { Moon, Sun } from '@phosphor-icons/react'

export function XMark({ className, gid = 'cx' }: { className?: string; gid?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="24" y2="24">
          <stop offset="0" stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <path d="M5 4 L19 20 M19 4 L5 20" stroke={`url(#${gid})`} strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  )
}

/** Casca das telas de autenticação: painel de marca à esquerda + slot de formulário à direita. */
export function AuthShell({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    setIsDark(next)
  }

  return (
    <div className="grid min-h-full grid-cols-1 lg:grid-cols-[1.15fr_.85fr]">
      {/* Painel de marca */}
      <aside
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between"
        style={{
          padding: 'clamp(32px, 4vw, 64px)',
          background:
            'radial-gradient(120% 90% at 12% 8%, rgba(45,212,191,.16), transparent 46%),' +
            'radial-gradient(120% 120% at 92% 100%, rgba(34,211,238,.20), transparent 50%),' +
            'linear-gradient(160deg, #0B1220 0%, #0A0F1A 55%, #070B12 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,.05) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(148,163,184,.05) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
            maskImage: 'radial-gradient(120% 80% at 30% 30%, #000 30%, transparent 78%)',
          }}
        />
        <span className="pointer-events-none absolute -left-10 -top-16 h-72 w-72 rounded-full opacity-60 blur-[46px]" style={{ background: 'radial-gradient(circle, #2DD4BF, transparent 65%)' }} />
        <span className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full opacity-60 blur-[46px]" style={{ background: 'radial-gradient(circle, #22D3EE, transparent 65%)' }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-teal/30 bg-teal/10">
            <XMark className="h-6 w-6" gid="shell-top" />
          </div>
          <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-white/60">CorretorX</span>
        </div>

        <div className="relative z-10 flex max-w-[460px] flex-1 flex-col justify-center gap-6">
          <h1 className="flex items-center font-extrabold leading-[.9] tracking-tight" style={{ fontSize: 'clamp(40px, 5vw, 66px)' }}>
            <span className="text-[#F3F8FB]">CORRETOR</span>
            <span className="bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE] bg-clip-text text-transparent" style={{ filter: 'drop-shadow(0 6px 22px rgba(34,211,238,.55))' }}>X</span>
          </h1>
          <p className="text-[#C6D3DE]" style={{ fontSize: 'clamp(17px,1.6vw,21px)', lineHeight: 1.5 }}>
            Gestão inteligente para corretores. Do <b className="font-semibold text-[#EAF1F6]">lead</b> à{' '}
            <b className="font-semibold text-[#EAF1F6]">carteira ativa</b> — comercial, implantação, pós-venda e renovações num só lugar.
          </p>
        </div>
        <div className="relative z-10" />
      </aside>

      {/* Painel do formulário */}
      <main className="relative flex flex-col items-center justify-center bg-background px-6 py-10 sm:px-12">
        <button
          type="button"
          onClick={toggleTheme}
          title="Alternar tema"
          aria-label="Alternar tema"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-teal hover:text-foreground"
        >
          {isDark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>

        <div className="mb-7 flex items-center gap-2.5 lg:hidden">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-teal/30 bg-teal/10">
            <XMark className="h-5 w-5" gid="shell-mob" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">
            CORRETOR<span className="bg-gradient-to-br from-[#2DD4BF] to-[#22D3EE] bg-clip-text text-transparent">X</span>
          </span>
        </div>

        <div className="w-full max-w-[380px]">{children}</div>
      </main>
    </div>
  )
}
