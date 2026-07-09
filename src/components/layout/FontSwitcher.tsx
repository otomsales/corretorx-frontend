import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const FONTS = [
  { key: 'geist', label: 'Geist', css: 'Geist' },
  { key: 'satoshi', label: 'Satoshi', css: 'Satoshi' },
  { key: 'montserrat', label: 'Montserrat', css: 'Montserrat' },
] as const

/** Controle de comparação de fonte (preview). Some quando definir a fonte final. */
export function FontSwitcher() {
  const [font, setFont] = useState<string>(() => {
    try { return localStorage.getItem('cx-font') || 'geist' } catch { return 'geist' }
  })

  useEffect(() => {
    document.documentElement.dataset.font = font
    try { localStorage.setItem('cx-font', font) } catch { /* ignore */ }
  }, [font])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-white/[0.1] bg-[hsl(var(--card)/0.85)] p-1 pl-3 shadow-xl backdrop-blur-xl">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fonte</span>
      {FONTS.map((f) => (
        <button
          key={f.key}
          onClick={() => setFont(f.key)}
          style={{ fontFamily: f.css }}
          className={cn(
            'rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors',
            font === f.key
              ? 'bg-[hsl(var(--brand-soft))] text-[hsl(var(--brand-soft-foreground))]'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
