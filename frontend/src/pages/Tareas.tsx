import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createTarea, type TareaFilters, type TareaPayload } from '@/api/tareas'
import { TareaForm } from '@/components/tareas/TareaForm'
import { TareaList } from '@/components/tareas/TareaList'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PrioridadTarea, TipoTarea } from '@/types/models'

export default function Tareas() {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<TipoTarea | 'todos'>('todos')
  const [prioridad, setPrioridad] = useState<PrioridadTarea | 'todos'>('todos')
  const [completadas, setCompletadas] = useState<'pendientes' | 'todas' | 'completadas'>('pendientes')
  const qc = useQueryClient()

  const filters: TareaFilters = {
    tipo,
    prioridad,
    completada: completadas === 'todas' ? undefined : completadas === 'completadas',
  }

  const createMutation = useMutation({
    mutationFn: createTarea,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      setOpen(false)
      toast.success('Tarea creada')
    },
    onError: () => toast.error('No se pudo crear la tarea'),
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-sm text-muted-foreground">Seguimientos, renovaciones y pendientes operativos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nueva tarea</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
            <TareaForm isSubmitting={createMutation.isPending} submitLabel="Crear tarea" onSubmit={(data: TareaPayload) => createMutation.mutate(data)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-3">
        <Select value={tipo} onValueChange={(value) => setTipo(value as TipoTarea | 'todos')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="llamada">Llamada</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="cotizacion">Cotizacion</SelectItem>
            <SelectItem value="seguimiento">Seguimiento</SelectItem>
            <SelectItem value="renovacion">Renovacion</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>

        <Select value={prioridad} onValueChange={(value) => setPrioridad(value as PrioridadTarea | 'todos')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las prioridades</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>

        <Select value={completadas} onValueChange={(value) => setCompletadas(value as typeof completadas)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendientes">Pendientes</SelectItem>
            <SelectItem value="completadas">Completadas</SelectItem>
            <SelectItem value="todas">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <TareaList filters={filters} />
      </div>
    </div>
  )
}
