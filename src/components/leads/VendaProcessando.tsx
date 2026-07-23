import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { XMark } from '@/components/auth/AuthShell'
import { cn } from '@/lib/utils'

const PASSOS = [
  'Registrando a venda…',
  'Atualizando o lead para Ganho…',
  'Criando processo de implantação…',
  'Vinculando beneficiários…',
  'Notificando o backoffice…',
]

/** Confete simples em CSS — sem lib. */
function Confete() {
  const pecas = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 2.2 + Math.random() * 1.6,
      size: 6 + Math.random() * 8,
      rot: Math.random() * 360,
      cor: ['#2DD4BF', '#22D3EE', '#34D399', '#FBBF24', '#F472B6', '#A78BFA'][i % 6],
      redondo: i % 3 === 0,
    })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pecas.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-8%] animate-[vg-fall_linear_forwards]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.redondo ? p.size : p.size * 0.5,
            background: p.cor,
            borderRadius: p.redondo ? '9999px' : '2px',
            transform: `rotate(${p.rot}deg)`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

export function VendaProcessando({ leadName, duracaoMs = 5000, onDone }: {
  leadName: string
  duracaoMs?: number
  onDone: () => void
}) {
  const [pct, setPct] = useState(0)
  const [passo, setPasso] = useState(0)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    const inicio = Date.now()
    const t = setInterval(() => {
      const p = Math.min(100, ((Date.now() - inicio) / duracaoMs) * 100)
      setPct(p)
      setPasso(Math.min(PASSOS.length - 1, Math.floor((p / 100) * PASSOS.length)))
      if (p >= 100) { clearInterval(t); setPronto(true) }
    }, 60)
    return () => clearInterval(t)
  }, [duracaoMs])

  return createPortal(
    <>
      <style>{`
        @keyframes vg-fall { to { transform: translateY(115vh) rotate(720deg); opacity: .9 } }
        @keyframes vg-spin { to { transform: rotate(360deg) } }
        @keyframes vg-pop { 0% { transform: scale(.7); opacity: 0 } 60% { transform: scale(1.06) } 100% { transform: scale(1); opacity: 1 } }
      `}</style>
      <div className="fixed inset-0 z-[200] grid place-items-center bg-black/80 backdrop-blur-md">
        {pronto && <Confete />}
        <div className="relative flex w-full max-w-sm flex-col items-center px-8 text-center">
          {!pronto ? (
            <>
              {/* X do CorretorX girando */}
              <div className="relative grid h-24 w-24 place-items-center">
                <span className="absolute inset-0 rounded-full border-2 border-teal/15" />
                <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-teal" style={{ animation: 'vg-spin 1s linear infinite' }} />
                <XMark gid="vg-x" className="h-10 w-10" />
              </div>
              <p className="mt-6 text-[17px] font-bold tracking-tight text-white">Registrando venda…</p>
              <p className="mt-1 h-5 text-[13px] text-white/60">{PASSOS[passo]}</p>

              {/* barra enchendo */}
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#2DD4BF] to-[#22D3EE] transition-[width] duration-100" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 font-mono text-[11px] tabular-nums text-white/40">{Math.round(pct)}%</p>
            </>
          ) : (
            <div style={{ animation: 'vg-pop .45s cubic-bezier(.2,.8,.2,1) both' }}>
              <h2 className="text-[24px] font-extrabold tracking-tight text-white">Parabéns por mais uma venda!</h2>
              <p className="mt-2 text-[14px] text-white/70">{leadName}</p>
              <button
                onClick={onDone}
                className={cn('mt-7 w-full rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#22D3EE] px-5 py-3 text-[14px] font-bold text-[#062018] transition hover:brightness-110')}
              >
                Continuar
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
