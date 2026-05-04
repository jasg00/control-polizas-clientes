import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteTarea, getTareas, updateTarea, type TareaFilters } from '@/api/tareas'
import { labelPrioridad, labelTipo } from '@/components/tareas/TareaForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { PrioridadTarea, Tarea } from '@/types/models'

type Props = {
  filters?: TareaFilters
  compact?: boolean
  limit?: number
}

export function TareaList({ filters = {}, compact, limit }: Props) {
  const qc = useQueryClient()
  const { data: tareas = [], isLoading } = useQuery({
    queryKey: ['tareas', filters],
    queryFn: () => getTareas(filters),
  })
  const visible = limit ? tareas.slice(0, limit) : tareas

  const updateMutation = useMutation({
    mutationFn: ({ id, completada }: { id: number; completada: boolean }) => updateTarea(id, { completada }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tareas'] }),
    onError: () => toast.error('No se pudo actualizar la tarea'),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteTarea,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      toast.success('Tarea eliminada')
    },
    onError: () => toast.error('No se pudo eliminar la tarea'),
  })

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: compact ? 3 : 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
  }
  if (visible.length === 0) {
    return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Sin tareas registradas</div>
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {visible.map((tarea) => (
          <TaskRowCard
            key={tarea.id}
            tarea={tarea}
            onToggle={(completada) => updateMutation.mutate({ id: tarea.id, completada })}
          />
        ))}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titulo</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Prioridad</TableHead>
          <TableHead>Cliente / Poliza</TableHead>
          <TableHead>Vence el</TableHead>
          <TableHead>Completada</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((tarea) => (
          <TableRow key={tarea.id} className={cn(isOverdue(tarea) && 'bg-red-50/70')}>
            <TableCell className="font-medium">{tarea.titulo}</TableCell>
            <TableCell><Badge variant="secondary">{labelTipo(tarea.tipo)}</Badge></TableCell>
            <TableCell><PriorityBadge prioridad={tarea.prioridad} /></TableCell>
            <TableCell>
              <LinkedTargets tarea={tarea} />
            </TableCell>
            <TableCell>{formatDate(tarea.fecha_vencimiento)}</TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" onClick={() => updateMutation.mutate({ id: tarea.id, completada: !tarea.completada })}>
                {tarea.completada ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
              </Button>
            </TableCell>
            <TableCell>
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(tarea.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TaskRowCard({ tarea, onToggle }: { tarea: Tarea; onToggle: (completada: boolean) => void }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-md border p-3', isOverdue(tarea) && 'border-red-200 bg-red-50')}>
      <div>
        <div className="font-medium">{tarea.titulo}</div>
        <div className="mt-1 text-xs text-muted-foreground">{labelTipo(tarea.tipo)} - {formatDate(tarea.fecha_vencimiento)}</div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onToggle(!tarea.completada)}>
        {tarea.completada ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
      </Button>
    </div>
  )
}

function LinkedTargets({ tarea }: { tarea: Tarea }) {
  return (
    <div className="space-y-1 text-sm">
      {tarea.cliente && <Link className="block hover:underline" to={`/clientes/${tarea.cliente.id}`}>{tarea.cliente.nombre}</Link>}
      {tarea.poliza && <Link className="block text-muted-foreground hover:underline" to={`/polizas/${tarea.poliza.id}`}>{tarea.poliza.numero}</Link>}
      {!tarea.cliente && !tarea.poliza && '-'}
    </div>
  )
}

function PriorityBadge({ prioridad }: { prioridad: PrioridadTarea }) {
  const styles: Record<PrioridadTarea, string> = {
    alta: 'bg-red-100 text-red-700',
    media: 'bg-yellow-100 text-yellow-800',
    baja: 'bg-green-100 text-green-700',
  }
  return <Badge variant="outline" className={cn('border-transparent', styles[prioridad])}>{labelPrioridad(prioridad)}</Badge>
}

function isOverdue(tarea: Tarea) {
  return !tarea.completada && tarea.fecha_vencimiento < new Date().toISOString().slice(0, 10)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
}
