import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MagnifyingGlass, Bell, Moon, Sun } from '@phosphor-icons/react'

const TITLES: Record<string, string> = {
  '/app': 'Visão Geral',
  '/app/funil': 'Funil',
  '/app/leads': 'Leads',
  '/app/distribuicao': 'Distribuição de leads',
  '/app/chat': 'WhatsApp',
  '/app/chat-interno': 'Chat interno',
  '/app/agenda': 'Agendamentos',
  '/app/performance': 'Performance',
  '/app/implantacao': 'Implantação',
  '/app/pos-venda': 'Pós-venda',
  '/app/contratos': 'Contratos',
  '/app/renovacoes': 'Renovações & Reajustes',
  '/app/financeiro': 'Financeiro',
  '/app/faturamento': 'Faturamento',
  '/app/relatorios': 'Relatórios',
  '/app/automacoes': 'Automações',
  '/app/admin': 'Admin',
}

export function Topbar() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? (pathname.startsWith('/app/leads/') ? 'Detalhe do lead' : 'CorretorX')
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    setIsDark(next)
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-[hsl(var(--card)/0.6)] px-5 backdrop-blur-2xl">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar cliente, lead, contrato…"
            className="h-9 w-56 rounded-lg border border-input bg-muted/40 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-teal focus:ring-[3px] focus:ring-teal/20"
          />
        </div>

        <button
          onClick={toggleTheme}
          title="Alternar tema"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {isDark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>

        <button className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Notificações">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-card" />
        </button>
      </div>
    </header>
  )
}
