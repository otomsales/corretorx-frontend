import { useLocation } from 'react-router-dom'
import { Hammer } from '@phosphor-icons/react'

export default function Placeholder() {
  const { pathname } = useLocation()
  return (
    <div className="grid h-full place-items-center p-10 text-center">
      <div className="max-w-sm space-y-3">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Hammer className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold">Em construção</h2>
        <p className="text-sm text-muted-foreground">
          Esta tela ainda será desenhada. Rota atual: <span className="font-mono text-foreground">{pathname}</span>
        </p>
      </div>
    </div>
  )
}
