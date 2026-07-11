import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { LeadsProvider } from '@/store/leads'
import { CustomFieldsProvider } from '@/store/customFields'
import { TagColorsProvider } from '@/lib/tags'
import LeadDetail from '@/pages/LeadDetail'

export function AppLayout() {
  return (
    <TagColorsProvider>
      <CustomFieldsProvider>
        <LeadsProvider>{appShell()}</LeadsProvider>
      </CustomFieldsProvider>
    </TagColorsProvider>
  )
}

function appShell() {
  return (
    <div className="relative grid h-full grid-cols-[248px_1fr] grid-rows-1 overflow-hidden bg-background text-foreground">
      {/* Camada ambiente — orbs coloridos que o glass (backdrop-blur) frosta */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-8 h-[440px] w-[440px] rounded-full opacity-40 blur-[90px]" style={{ background: 'radial-gradient(circle, #2DD4BF, transparent 60%)' }} />
        <div className="absolute -left-20 bottom-[-60px] h-[400px] w-[400px] rounded-full opacity-30 blur-[90px]" style={{ background: 'radial-gradient(circle, #22D3EE, transparent 60%)' }} />
        <div className="absolute right-[-40px] top-[-60px] h-[320px] w-[560px] rounded-full opacity-[0.18] blur-[110px]" style={{ background: 'radial-gradient(circle, #2DD4BF, transparent 60%)' }} />
      </div>

      <Sidebar />

      <div className="relative flex min-w-0 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <LeadDetail />
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </div>
  )
}
