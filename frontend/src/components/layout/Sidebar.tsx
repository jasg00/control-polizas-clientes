import { Link, NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Usuario } from '@/types/models'

export type SidebarBadges = {
  renovaciones?: number
  tareas?: number
}

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  badgeKey?: keyof SidebarBadges
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/polizas', label: 'Polizas', icon: FileText },
  { to: '/renovaciones', label: 'Renovaciones', icon: Clock, badgeKey: 'renovaciones' },
  { to: '/tareas', label: 'Tareas', icon: CheckSquare, badgeKey: 'tareas' },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
]

type Props = {
  user: Usuario | null
  badges: SidebarBadges
  onLogout: () => void
  onNavigate?: () => void
}

export function Sidebar({ user, badges, onLogout, onNavigate }: Props) {
  return (
    <div className="flex h-full flex-col bg-white">
      <Link to="/" onClick={onNavigate} className="border-b px-5 py-4">
        <div className="text-base font-semibold">Control de Polizas</div>
        <div className="text-xs text-muted-foreground">Clientes y cartera</div>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <SidebarLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            badge={item.badgeKey ? badges[item.badgeKey] : undefined}
            onNavigate={onNavigate}
          />
        ))}
        {user?.rol === 'admin' && (
          <>
            <div className="px-3 pt-4 text-xs font-medium uppercase text-muted-foreground">Admin</div>
            <SidebarLink to="/admin/usuarios" label="Usuarios" icon={Shield} onNavigate={onNavigate} />
            <SidebarLink to="/configuracion" label="Configuracion" icon={Settings} onNavigate={onNavigate} />
          </>
        )}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3">
          <div className="truncate text-sm font-medium">{user?.nombre ?? 'Usuario'}</div>
          <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
        </div>
        <Button variant="outline" className="w-full justify-start" onClick={onLogout}>
          <LogOut className="h-4 w-4" /> Salir
        </Button>
      </div>
    </div>
  )
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  badge,
  onNavigate,
}: {
  to: string
  label: string
  icon: LucideIcon
  badge?: number
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
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
      {badge !== undefined && badge > 0 && <Badge variant="destructive">{badge}</Badge>}
    </NavLink>
  )
}
