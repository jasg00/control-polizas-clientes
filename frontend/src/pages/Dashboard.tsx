import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, Clock, DollarSign, FileText, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getDashboardStats } from '@/api/dashboard'
import { updateTarea } from '@/api/tareas'
import { VigenciaBadge } from '@/components/polizas/VigenciaBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/authStore'
import type { Tarea } from '@/types/models'

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const qc = useQueryClient()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats,
    refetchInterval: 5 * 60 * 1000,
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, completada }: { id: number; completada: boolean }) => updateTarea(id, { completada }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['tareas'] })
    },
    onError: () => toast.error('No se pudo actualizar la tarea'),
  })

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 w-full" />)}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-lg border bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Sesion activa</p>
            <h2 className="text-2xl font-semibold">Hola, {user?.nombre ?? 'usuario'}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/clientes">Nuevo cliente</Link></Button>
            <Button asChild variant="outline"><Link to="/polizas/nueva">Nueva poliza</Link></Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric icon={Users} label="Clientes activos" value={stats.total_clientes} to="/clientes" tone="blue" />
        <Metric icon={FileText} label="Polizas activas" value={stats.total_polizas_activas} to="/polizas" tone="green" />
        <Metric icon={Clock} label="Vencen en 7 dias" value={stats.polizas_vencen_7_dias} to="/renovaciones?tab=urgente" tone="red" />
        <Metric icon={Clock} label="Vencen en 30 dias" value={stats.polizas_vencen_30_dias} to="/renovaciones?tab=este_mes" tone="yellow" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Metric icon={DollarSign} label="Comisiones ganadas este mes" value={formatMoney(stats.comision_mes_ganada)} to="/reportes" />
        <Metric icon={DollarSign} label="Comisiones pendientes de pago" value={formatMoney(stats.comision_mes_ganada - stats.comision_mes_pagada)} to="/reportes" tone="yellow" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Proximas renovaciones</h3>
            <Button asChild variant="outline" size="sm"><Link to="/renovaciones">Ver todas</Link></Button>
          </div>
          {stats.proximas_renovaciones.length === 0 ? (
            <EmptyState text="No hay renovaciones proximas" />
          ) : (
            <div className="space-y-3">
              {stats.proximas_renovaciones.map((poliza) => (
                <Link key={poliza.id} to={`/polizas/${poliza.id}`} className="block rounded-md border p-3 transition-colors hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{poliza.numero}</div>
                      <p className="text-sm text-muted-foreground">{poliza.cliente?.nombre ?? '-'} - {poliza.aseguradora}</p>
                    </div>
                    <VigenciaBadge diasRestantes={poliza.dias_restantes} estatus={poliza.estatus} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Tareas pendientes</h3>
              <p className="text-sm text-muted-foreground">{stats.tareas_vencidas} vencidas · {stats.tareas_hoy} para hoy o antes</p>
            </div>
            <Button asChild variant="outline" size="sm"><Link to="/tareas">Ver todas</Link></Button>
          </div>
          {stats.tareas_pendientes_hoy.length === 0 ? (
            <EmptyState text="Sin tareas pendientes para hoy" />
          ) : (
            <div className="space-y-2">
              {stats.tareas_pendientes_hoy.map((tarea) => (
                <TaskItem
                  key={tarea.id}
                  tarea={tarea}
                  onToggle={(completada) => completeMutation.mutate({ id: tarea.id, completada })}
                />
              ))}
            </div>
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
  tone,
}: {
  icon: typeof Users
  label: string
  value: ReactNode
  to: string
  tone?: 'blue' | 'green' | 'red' | 'yellow'
}) {
  const toneClass = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-800',
  }[tone ?? 'blue']
  return (
    <Link to={to} className="rounded-lg border bg-white p-5 transition-colors hover:bg-slate-50">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-md ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </Link>
  )
}

function TaskItem({ tarea, onToggle }: { tarea: Tarea; onToggle: (completada: boolean) => void }) {
  const overdue = !tarea.completada && tarea.fecha_vencimiento < new Date().toISOString().slice(0, 10)
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{tarea.titulo}</span>
          {overdue && <Badge variant="destructive">Vencida</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{formatDate(tarea.fecha_vencimiento)} · {tarea.cliente?.nombre ?? tarea.poliza?.numero ?? 'Sin vinculo'}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onToggle(!tarea.completada)}>
        {tarea.completada ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
      </Button>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
}
