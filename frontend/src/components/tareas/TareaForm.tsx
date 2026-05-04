import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getClientes } from '@/api/clientes'
import { getPolizas } from '@/api/polizas'
import type { TareaPayload } from '@/api/tareas'
import { getUsuarios } from '@/api/usuarios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import type { PrioridadTarea, Tarea, TipoTarea } from '@/types/models'

const tipos = ['llamada', 'email', 'cotizacion', 'seguimiento', 'renovacion', 'otro'] as const
const prioridades = ['alta', 'media', 'baja'] as const

const schema = z.object({
  titulo: z.string().min(2, 'Titulo requerido'),
  tipo: z.enum(tipos),
  prioridad: z.enum(prioridades),
  fecha_vencimiento: z.string().min(1, 'Fecha requerida'),
  descripcion: z.string().optional(),
  cliente_id: z.number().optional(),
  poliza_id: z.number().optional(),
  asignada_a: z.number().optional(),
})

type FormData = z.infer<typeof schema>

type Props = {
  defaultValues?: Partial<Tarea>
  fixedClienteId?: number
  fixedPolizaId?: number
  submitLabel?: string
  isSubmitting?: boolean
  onSubmit: (data: TareaPayload) => void
}

export function TareaForm({ defaultValues, fixedClienteId, fixedPolizaId, submitLabel = 'Guardar tarea', isSubmitting, onSubmit }: Props) {
  const user = useAuthStore((state) => state.user)
  const [clienteSearch, setClienteSearch] = useState('')
  const isAdmin = user?.rol === 'admin'

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: defaultValues?.titulo ?? '',
      tipo: (defaultValues?.tipo as TipoTarea) ?? 'seguimiento',
      prioridad: (defaultValues?.prioridad as PrioridadTarea) ?? 'media',
      fecha_vencimiento: defaultValues?.fecha_vencimiento ?? new Date().toISOString().slice(0, 10),
      descripcion: defaultValues?.descripcion ?? '',
      cliente_id: fixedClienteId ?? defaultValues?.cliente_id,
      poliza_id: fixedPolizaId ?? defaultValues?.poliza_id,
      asignada_a: defaultValues?.asignada_a ?? user?.id,
    },
  })

  const selectedClienteId = fixedClienteId ?? watch('cliente_id')
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', 'tarea-form', clienteSearch],
    queryFn: () => getClientes(clienteSearch.trim() || undefined),
    enabled: !fixedClienteId,
  })
  const { data: polizas = [] } = useQuery({
    queryKey: ['polizas', 'tarea-form', selectedClienteId],
    queryFn: () => getPolizas(selectedClienteId ? { cliente_id: selectedClienteId } : {}),
  })
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: getUsuarios,
    enabled: isAdmin,
  })
  const dateWarning = useMemo(() => {
    const value = watch('fecha_vencimiento')
    return value && value < new Date().toISOString().slice(0, 10) ? 'La fecha esta en el pasado' : undefined
  }, [watch])

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(cleanPayload(data, fixedClienteId, fixedPolizaId)))} className="space-y-4">
      <Field label="Titulo" error={errors.titulo?.message}>
        <Input {...register('titulo')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tipo" error={errors.tipo?.message}>
          <Controller control={control} name="tipo" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{tipos.map((tipo) => <SelectItem key={tipo} value={tipo}>{labelTipo(tipo)}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </Field>
        <Field label="Prioridad" error={errors.prioridad?.message}>
          <Controller control={control} name="prioridad" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{prioridades.map((prioridad) => <SelectItem key={prioridad} value={prioridad}>{labelPrioridad(prioridad)}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </Field>
        <Field label="Fecha vencimiento" error={errors.fecha_vencimiento?.message ?? dateWarning}>
          <Input type="date" {...register('fecha_vencimiento')} />
        </Field>
      </div>

      {!fixedClienteId && (
        <div className="space-y-2">
          <Field label="Buscar cliente">
            <Input value={clienteSearch} onChange={(event) => setClienteSearch(event.target.value)} />
          </Field>
          <Controller control={control} name="cliente_id" render={({ field }) => (
            <Select value={field.value ? String(field.value) : 'none'} onValueChange={(value) => field.onChange(value === 'none' ? undefined : Number(value))}>
              <SelectTrigger><SelectValue placeholder="Vincular cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin cliente</SelectItem>
                {clientes.map((cliente) => <SelectItem key={cliente.id} value={String(cliente.id)}>{cliente.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
      )}

      {!fixedPolizaId && (
        <Field label="Vincular poliza">
          <Controller control={control} name="poliza_id" render={({ field }) => (
            <Select value={field.value ? String(field.value) : 'none'} onValueChange={(value) => field.onChange(value === 'none' ? undefined : Number(value))}>
              <SelectTrigger><SelectValue placeholder="Vincular poliza" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin poliza</SelectItem>
                {polizas.map((poliza) => <SelectItem key={poliza.id} value={String(poliza.id)}>{poliza.numero} - {poliza.aseguradora}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </Field>
      )}

      {isAdmin && (
        <Field label="Asignar a">
          <Controller control={control} name="asignada_a" render={({ field }) => (
            <Select value={field.value ? String(field.value) : String(user?.id ?? '')} onValueChange={(value) => field.onChange(Number(value))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{usuarios.map((usuario) => <SelectItem key={usuario.id} value={String(usuario.id)}>{usuario.nombre}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </Field>
      )}

      <Field label="Descripcion" error={errors.descripcion?.message}>
        <textarea {...register('descripcion')} className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" />
      </Field>

      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : submitLabel}</Button>
    </form>
  )
}

function cleanPayload(data: FormData, fixedClienteId?: number, fixedPolizaId?: number): TareaPayload {
  const payload: TareaPayload = {
    titulo: data.titulo.trim(),
    tipo: data.tipo,
    prioridad: data.prioridad,
    fecha_vencimiento: data.fecha_vencimiento,
    cliente_id: fixedClienteId ?? data.cliente_id,
    poliza_id: fixedPolizaId ?? data.poliza_id,
    asignada_a: data.asignada_a,
  }
  if (data.descripcion?.trim()) payload.descripcion = data.descripcion.trim()
  return payload
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-yellow-600">{error}</p>}
    </div>
  )
}

export function labelTipo(tipo: TipoTarea) {
  const labels: Record<TipoTarea, string> = {
    llamada: 'Llamada',
    email: 'Email',
    cotizacion: 'Cotizacion',
    seguimiento: 'Seguimiento',
    renovacion: 'Renovacion',
    otro: 'Otro',
  }
  return labels[tipo]
}

export function labelPrioridad(prioridad: PrioridadTarea) {
  return prioridad.charAt(0).toUpperCase() + prioridad.slice(1)
}
