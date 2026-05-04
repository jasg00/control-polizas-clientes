import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { getProximas } from '@/api/alertas'
import { getAICostos } from '@/api/reportes'
import { getTareas } from '@/api/tareas'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { useAuthStore } from '@/store/authStore'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/clientes': 'Clientes',
  '/polizas': 'Polizas',
  '/polizas/nueva': 'Nueva poliza',
  '/renovaciones': 'Renovaciones',
  '/tareas': 'Tareas',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuracion',
  '/admin/usuarios': 'Usuarios',
}

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? sectionTitle(location.pathname)
  const breadcrumbs = buildBreadcrumbs(location.pathname, title)

  const { data: proximas } = useQuery({
    queryKey: ['alertas', 'proximas'],
    queryFn: getProximas,
    refetchInterval: 5 * 60 * 1000,
  })
  const today = new Date().toISOString().slice(0, 10)
  const { data: tareasPendientes = [] } = useQuery({
    queryKey: ['tareas', 'sidebar', today],
    queryFn: () => getTareas({ completada: false, fecha_vencimiento_hasta: today }),
    refetchInterval: 5 * 60 * 1000,
  })
  const { data: aiCostos } = useQuery({
    queryKey: ['reportes', 'ai-costos', 'layout'],
    queryFn: () => getAICostos(),
    enabled: user?.rol === 'admin',
    refetchInterval: 5 * 60 * 1000,
  })

  const badges = {
    renovaciones: proximas?.urgente.length ?? 0,
    tareas: tareasPendientes.length,
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Toaster richColors position="top-right" />
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-white md:block">
        <Sidebar user={user} badges={badges} onLogout={handleLogout} />
      </aside>

      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent className="left-0 top-0 h-dvh w-80 max-w-[85vw] translate-x-0 translate-y-0 rounded-none p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
          <DialogTitle className="sr-only">Navegacion</DialogTitle>
          <Sidebar
            user={user}
            badges={badges}
            onLogout={handleLogout}
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="md:pl-64">
        <TopBar
          title={title}
          breadcrumbs={breadcrumbs}
          aiCostos={aiCostos}
          onOpenMenu={() => setMobileMenuOpen(true)}
        />
        <main className="min-h-[calc(100vh-73px)]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function sectionTitle(pathname: string) {
  if (pathname.startsWith('/clientes/')) return 'Detalle de cliente'
  if (pathname.startsWith('/polizas/')) return 'Detalle de poliza'
  return 'Control de Polizas'
}

function buildBreadcrumbs(pathname: string, title: string) {
  if (pathname === '/') return ['Dashboard']
  if (pathname.startsWith('/clientes/')) return ['Clientes', title]
  if (pathname.startsWith('/polizas/nueva')) return ['Polizas', 'Nueva poliza']
  if (pathname.startsWith('/polizas/')) return ['Polizas', title]
  return ['Dashboard', title]
}
