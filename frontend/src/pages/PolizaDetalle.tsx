import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit } from 'lucide-react'
import { toast } from 'sonner'
import { getPoliza, updatePoliza } from '@/api/polizas'
import { createTarea, type TareaPayload } from '@/api/tareas'
import { DocumentoList } from '@/components/documentos/DocumentoList'
import { DocumentoUploader } from '@/components/documentos/DocumentoUploader'
import { labelTipo, PolizaForm } from '@/components/polizas/PolizaForm'
import { VigenciaBadge } from '@/components/polizas/VigenciaBadge'
import { TareaForm } from '@/components/tareas/TareaForm'
import { TareaList } from '@/components/tareas/TareaList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function PolizaDetalle() {
  const { id } = useParams()
  const polizaId = Number(id)
  const [editing, setEditing] = useState(false)
  const qc = useQueryClient()

  const { data: poliza, isLoading } = useQuery({
    queryKey: ['polizas', polizaId],
    queryFn: () => getPoliza(polizaId),
    enabled: Number.isFinite(polizaId),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updatePoliza>[1]) => updatePoliza(polizaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polizas'] })
      qc.invalidateQueries({ queryKey: ['polizas', polizaId] })
      qc.invalidateQueries({ queryKey: ['clientes'] })
      setEditing(false)
      toast.success('Poliza actualizada')
    },
    onError: () => toast.error('No se pudo actualizar la poliza'),
  })
  const createTaskMutation = useMutation({
    mutationFn: createTarea,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      toast.success('Tarea creada')
    },
    onError: () => toast.error('No se pudo crear la tarea'),
  })

  if (isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-80 w-full" /></div>
  }

  if (!poliza) {
    return <div className="p-6 text-red-500">Poliza no encontrada</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/polizas">Volver</Link></Button>
            <Badge variant="secondary">{labelTipo(poliza.tipo)}</Badge>
            <VigenciaBadge diasRestantes={poliza.dias_restantes} estatus={poliza.estatus} />
          </div>
          <h1 className="text-2xl font-bold">{poliza.numero}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {poliza.aseguradora} {poliza.plan ? `- ${poliza.plan}` : ''} - Cliente:{' '}
            <Link className="font-medium text-slate-900 hover:underline" to={`/clientes/${poliza.cliente_id}`}>
              {poliza.cliente.nombre}
            </Link>
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditing((value) => !value)}>
          <Edit className="h-4 w-4" /> {editing ? 'Cancelar' : 'Editar'}
        </Button>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informacion</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="alertas">Historial alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="rounded-lg border bg-white p-4">
          {editing ? (
            <PolizaForm
              defaultValues={poliza}
              submitLabel="Guardar cambios"
              isSubmitting={updateMutation.isPending}
              onSubmit={(data) => updateMutation.mutate(data)}
            />
          ) : (
            <div className="space-y-6">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Info label="Fecha inicio" value={poliza.fecha_inicio} />
                <Info label="Fecha fin" value={poliza.fecha_fin} />
                <Info label="Dias restantes" value={poliza.dias_restantes} />
                <Info label="Prima" value={formatMoney(poliza.prima, poliza.moneda)} />
                <Info label="% Comision" value={`${Number(poliza.porcentaje_comision) * 100}%`} />
                <Info label="Monto comision" value={formatMoney(poliza.monto_comision, poliza.moneda)} />
                <Info label="Periodo gracia" value={`${poliza.periodo_gracia_dias} dias`} />
                <Info label="Comision pagada" value={poliza.comision_pagada ? 'Si' : 'No'} />
                <Info label="Estatus" value={poliza.estatus} />
                <Info label="Notas" value={poliza.notas} wide />
              </dl>

              <div>
                <h2 className="mb-3 text-sm font-semibold">Detalles</h2>
                <DetailJson value={poliza.detalles} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documentos" className="rounded-lg border bg-white p-4">
          <div className="space-y-5">
            <DocumentoUploader polizaId={poliza.id} />
            <DocumentoList polizaId={poliza.id} />
          </div>
        </TabsContent>

        <TabsContent value="tareas" className="rounded-lg border bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Tareas</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">Nueva tarea</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
                <TareaForm
                  fixedClienteId={poliza.cliente_id}
                  fixedPolizaId={poliza.id}
                  isSubmitting={createTaskMutation.isPending}
                  submitLabel="Crear tarea"
                  onSubmit={(data: TareaPayload) => createTaskMutation.mutate(data)}
                />
              </DialogContent>
            </Dialog>
          </div>
          <TareaList filters={{ poliza_id: poliza.id }} />
        </TabsContent>

        <TabsContent value="alertas" className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
          Sin alertas enviadas
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Info({ label, value, wide }: { label: string; value?: string | number | null; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2 lg:col-span-3' : undefined}>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm">{value || '-'}</dd>
    </div>
  )
}

function DetailJson({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object') {
    return <p className="text-sm text-muted-foreground">Sin detalles registrados</p>
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {Object.entries(value).map(([key, entry]) => (
        <div key={key} className="rounded-md bg-slate-50 px-3 py-2">
          <dt className="text-xs font-medium uppercase text-muted-foreground">{key.replaceAll('_', ' ')}</dt>
          <dd className="mt-1 text-sm">{Array.isArray(entry) ? `${entry.length} registros` : String(entry || '-')}</dd>
        </div>
      ))}
    </dl>
  )
}

function formatMoney(value: number, currency: 'MXN' | 'USD') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(Number(value || 0))
}
