import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CheckSquare,
  Clock,
  FileText,
  Home,
  LogOut,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home, available: true },
  { to: '/clientes', label: 'Clientes', icon: Users, available: true },
  { to: '/polizas', label: 'Polizas', icon: FileText, available: true },
  { to: '/renovaciones', label: 'Renovaciones', icon: Clock },
  { to: '/tareas', label: 'Tareas', icon: CheckSquare },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
]

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
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? sectionTitle(location.pathname)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Toaster richColors position="top-right" />
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-white md:flex md:flex-col">
        <Link to="/" className="border-b px-5 py-4">
          <div className="text-base font-semibold">Control de Polizas</div>
          <div className="text-xs text-muted-foreground">Clientes y cartera</div>
        </Link>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
          {user?.rol === 'admin' && (
            <>
              <div className="px-3 pt-4 text-xs font-medium uppercase text-muted-foreground">Admin</div>
              <SidebarLink to="/admin/usuarios" label="Usuarios" icon={Shield} available />
              <SidebarLink to="/configuracion" label="Configuracion" icon={Settings} />
            </>
          )}
        </nav>

        <div className="border-t p-4">
          <div className="mb-3">
            <div className="truncate text-sm font-medium">{user?.nombre ?? 'Usuario'}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground">Sistema local de polizas</p>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <Button asChild variant="outline" size="sm">
                <Link to="/clientes">Clientes</Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-73px)]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  available,
}: {
  to: string
  label: string
  icon: typeof Home
  available?: boolean
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
        )
      }
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {!available && <Badge variant="secondary">Soon</Badge>}
    </NavLink>
  )
}

function sectionTitle(pathname: string) {
  if (pathname.startsWith('/clientes/')) return 'Detalle de cliente'
  if (pathname.startsWith('/polizas/')) return 'Detalle de poliza'
  return 'Control de Polizas'
}
