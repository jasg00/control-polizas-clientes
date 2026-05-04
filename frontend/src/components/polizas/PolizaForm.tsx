import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getClientes } from '@/api/clientes'
import type { PolizaPayload } from '@/api/polizas'
import { DetallesCampos } from '@/components/polizas/DetallesCampos'
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
import { cn } from '@/lib/utils'
import type { DetallesPoliza, OcrResult, Poliza, TipoPoliza } from '@/types/models'

const tipos = ['auto', 'vida', 'hogar', 'gmm', 'empresarial', 'viaje', 'danos', 'obra_civil'] as const
const monedas = ['MXN', 'USD'] as const

const schema = z.object({
  numero: z.string().min(1, 'Numero requerido'),
  tipo: z.enum(tipos),
  aseguradora: z.string().min(1, 'Aseguradora requerida'),
  plan: z.string().optional(),
  fecha_inicio: z.string().min(1, 'Fecha requerida'),
  fecha_fin: z.string().min(1, 'Fecha requerida'),
  prima: z.number().min(0, 'Prima invalida'),
  moneda: z.enum(monedas),
  periodo_gracia_dias: z.number().min(0).optional(),
  porcentaje_comision: z.number().min(0).max(1).optional(),
  estatus: z.enum(['activa', 'por_vencer', 'vencida', 'cancelada']).optional(),
  comision_pagada: z.boolean().optional(),
  notas: z.string().optional(),
  cliente_id: z.number().min(1, 'Cliente requerido'),
})

type FormData = z.infer<typeof schema>

type Props = {
  defaultValues?: Partial<Poliza>
  ocrResult?: OcrResult
  submitLabel?: string
  isSubmitting?: boolean
  onSubmit: (data: PolizaPayload) => void
}

export function PolizaForm({ defaultValues, ocrResult, submitLabel = 'Guardar poliza', isSubmitting, onSubmit }: Props) {
  const [clienteSearch, setClienteSearch] = useState(defaultValues?.cliente?.nombre ?? '')
  const [detalles, setDetalles] = useState<Record<string, unknown>>((defaultValues?.detalles as Record<string, unknown>) ?? {})

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: toFormDefaults(defaultValues),
  })

  useEffect(() => {
    reset(toFormDefaults(defaultValues))
    setDetalles((defaultValues?.detalles as Record<string, unknown>) ?? {})
    setClienteSearch(defaultValues?.cliente?.nombre ?? '')
  }, [defaultValues, reset])

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', clienteSearch],
    queryFn: () => getClientes(clienteSearch.trim() || undefined),
  })

  const tipo = watch('tipo')
  const prima = Number(watch('prima') || 0)
  const porcentaje = Number(watch('porcentaje_comision') || 0)
  const montoComision = useMemo(() => prima * porcentaje, [prima, porcentaje])

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(cleanPayload(data, detalles)))} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Numero de poliza" error={errors.numero?.message} confidence={ocrConf(ocrResult, 'numero')}>
          <Input {...register('numero')} className={cn(ocrClass(ocrResult, 'numero'))} />
        </Field>

        <Field label="Tipo" error={errors.tipo?.message} confidence={ocrConf(ocrResult, 'tipo')}>
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(value) => field.onChange(value as TipoPoliza)}>
                <SelectTrigger className={cn(ocrClass(ocrResult, 'tipo'))}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipos.map((option) => <SelectItem key={option} value={option}>{labelTipo(option)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Aseguradora" error={errors.aseguradora?.message} confidence={ocrConf(ocrResult, 'aseguradora')}>
          <Input {...register('aseguradora')} className={cn(ocrClass(ocrResult, 'aseguradora'))} />
        </Field>

        <Field label="Plan" error={errors.plan?.message} confidence={ocrConf(ocrResult, 'plan')}>
          <Input {...register('plan')} className={cn(ocrClass(ocrResult, 'plan'))} />
        </Field>

        <Field label="Fecha inicio" error={errors.fecha_inicio?.message} confidence={ocrConf(ocrResult, 'fecha_inicio')}>
          <Input type="date" {...register('fecha_inicio')} className={cn(ocrClass(ocrResult, 'fecha_inicio'))} />
        </Field>

        <Field label="Fecha fin" error={errors.fecha_fin?.message} confidence={ocrConf(ocrResult, 'fecha_fin')}>
          <Input type="date" {...register('fecha_fin')} className={cn(ocrClass(ocrResult, 'fecha_fin'))} />
        </Field>

        <Field label="Prima" error={errors.prima?.message} confidence={ocrConf(ocrResult, 'prima')}>
          <Input type="number" step="0.01" {...register('prima', { valueAsNumber: true })} className={cn(ocrClass(ocrResult, 'prima'))} />
        </Field>

        <Field label="Moneda" error={errors.moneda?.message} confidence={ocrConf(ocrResult, 'moneda')}>
          <Controller
            control={control}
            name="moneda"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn(ocrClass(ocrResult, 'moneda'))}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monedas.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Periodo de gracia (dias)" error={errors.periodo_gracia_dias?.message}>
          <Input type="number" {...register('periodo_gracia_dias', { valueAsNumber: true })} />
        </Field>

        <Field label="% Comision" error={errors.porcentaje_comision?.message}>
          <Input type="number" step="0.01" min="0" max="1" {...register('porcentaje_comision', { valueAsNumber: true })} />
        </Field>
      </div>

      <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Comision estimada: </span>
        <span className="font-semibold">{formatMoney(montoComision)}</span>
      </div>

      <div className="space-y-3">
        <Field label="Buscar cliente" error={errors.cliente_id?.message}>
          <Input value={clienteSearch} onChange={(event) => setClienteSearch(event.target.value)} />
        </Field>
        <Controller
          control={control}
          name="cliente_id"
          render={({ field }) => (
            <Select value={field.value ? String(field.value) : ''} onValueChange={(value) => field.onChange(Number(value))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => <SelectItem key={cliente.id} value={String(cliente.id)}>{cliente.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Detalles de la poliza</h2>
        <DetallesCampos tipo={tipo} value={detalles} onChange={setDetalles} />
      </div>

      <Field label="Notas" error={errors.notas?.message}>
        <textarea
          {...register('notas')}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      </Field>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )
}

function toFormDefaults(defaultValues?: Partial<Poliza>): FormData {
  return {
    numero: defaultValues?.numero ?? '',
    tipo: defaultValues?.tipo ?? 'auto',
    aseguradora: defaultValues?.aseguradora ?? '',
    plan: defaultValues?.plan ?? '',
    fecha_inicio: defaultValues?.fecha_inicio ?? '',
    fecha_fin: defaultValues?.fecha_fin ?? '',
    prima: Number(defaultValues?.prima ?? 0),
    moneda: defaultValues?.moneda ?? 'MXN',
    periodo_gracia_dias: Number(defaultValues?.periodo_gracia_dias ?? 0),
    porcentaje_comision: Number(defaultValues?.porcentaje_comision ?? 0),
    estatus: defaultValues?.estatus ?? 'activa',
    comision_pagada: defaultValues?.comision_pagada ?? false,
    notas: defaultValues?.notas ?? '',
    cliente_id: Number(defaultValues?.cliente_id ?? defaultValues?.cliente?.id ?? 0),
  }
}

function cleanPayload(data: FormData, detalles: Record<string, unknown>): PolizaPayload {
  const payload: PolizaPayload = {
    numero: data.numero.trim(),
    tipo: data.tipo,
    aseguradora: data.aseguradora.trim(),
    fecha_inicio: data.fecha_inicio,
    fecha_fin: data.fecha_fin,
    prima: Number(data.prima),
    moneda: data.moneda,
    periodo_gracia_dias: Number(data.periodo_gracia_dias ?? 0),
    porcentaje_comision: Number(data.porcentaje_comision ?? 0),
    cliente_id: Number(data.cliente_id),
    detalles: detalles as DetallesPoliza,
  }
  if (data.plan?.trim()) payload.plan = data.plan.trim()
  if (data.notas?.trim()) payload.notas = data.notas.trim()
  if (data.estatus) payload.estatus = data.estatus
  if (data.comision_pagada !== undefined) payload.comision_pagada = data.comision_pagada
  return payload
}

function Field({ label, error, confidence, children }: { label: string; error?: string; confidence?: number; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        {confidence !== undefined && confidence >= 0.8 && (
          <span className="text-xs text-green-600 font-medium">✓ IA</span>
        )}
        {confidence !== undefined && confidence > 0 && confidence < 0.8 && (
          <span className="text-xs text-yellow-600 font-medium" title={`Confianza: ${Math.round(confidence * 100)}% — verificar`}>
            ⚠ Verificar
          </span>
        )}
      </div>
      {children}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

function ocrConf(ocrResult: OcrResult | undefined, field: keyof OcrResult): number | undefined {
  if (!ocrResult) return undefined
  const item = ocrResult[field]
  if (!item || typeof item !== 'object' || !('confianza' in item)) return undefined
  if (item.valor === null) return undefined
  return item.confianza as number
}

function ocrClass(ocrResult: OcrResult | undefined, field: keyof OcrResult): string {
  const conf = ocrConf(ocrResult, field)
  if (conf === undefined) return ''
  if (conf >= 0.8) return 'ring-2 ring-green-400 ring-offset-0'
  return 'ring-2 ring-yellow-400 ring-offset-0'
}

export function labelTipo(tipo: TipoPoliza) {
  const labels: Record<TipoPoliza, string> = {
    auto: 'Auto',
    vida: 'Vida',
    hogar: 'Hogar',
    gmm: 'GMM',
    empresarial: 'Empresarial',
    viaje: 'Viaje',
    danos: 'Danos',
    obra_civil: 'Obra civil',
  }
  return labels[tipo]
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0)
}
