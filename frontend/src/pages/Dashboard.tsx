import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Shield, Users } from 'lucide-react'
import { getClientes } from '@/api/clientes'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/authStore'

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', 'dashboard'],
    queryFn: () => getClientes(),
  })

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-lg border bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Sesion activa</p>
            <h2 className="text-2xl font-semibold">Hola, {user?.nombre ?? 'admin'}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/clientes">Abrir clientes</Link>
            </Button>
            {user?.rol === 'admin' && (
              <Button asChild variant="outline">
                <Link to="/admin/usuarios">Usuarios</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric
          icon={Users}
          label="Clientes registrados"
          value={isLoading ? <Skeleton className="h-8 w-16" /> : clientes.length}
          to="/clientes"
        />
        <Metric icon={FileText} label="Polizas" value="Modulo 4" muted to="/polizas" />
        <Metric icon={Shield} label="Administracion" value={user?.rol === 'admin' ? 'Activa' : 'Agente'} to="/admin/usuarios" />
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h3 className="mb-3 text-base font-semibold">Disponible ahora</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Action title="Gestionar clientes" body="Crear, buscar, editar y revisar detalle de clientes." to="/clientes" />
          {user?.rol === 'admin' && (
            <Action title="Gestionar usuarios" body="Crear agentes y activar o desactivar accesos." to="/admin/usuarios" />
          )}
        </div>
      </section>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  to,
  muted,
}: {
  icon: typeof Users
  label: string
  value: ReactNode
  to: string
  muted?: boolean
}) {
  return (
    <Link to={to} className="rounded-lg border bg-white p-5 transition-colors hover:bg-slate-50">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={muted ? 'mt-1 text-xl font-semibold text-muted-foreground' : 'mt-1 text-3xl font-semibold'}>
        {value}
      </div>
    </Link>
  )
}

function Action({ title, body, to }: { title: string; body: string; to: string }) {
  return (
    <Link to={to} className="rounded-lg border p-4 transition-colors hover:bg-slate-50">
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Link>
  )
}
