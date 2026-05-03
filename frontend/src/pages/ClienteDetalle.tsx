import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Mail, Phone, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { getCliente, updateCliente } from '@/api/clientes'
import { ClienteForm } from '@/components/clientes/ClienteForm'
import { VigenciaBadge } from '@/components/polizas/VigenciaBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ClienteDetalle() {
  const { id } = useParams()
  const clienteId = Number(id)
  const [editing, setEditing] = useState(false)
  const qc = useQueryClient()

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['clientes', clienteId],
    queryFn: () => getCliente(clienteId),
    enabled: Number.isFinite(clienteId),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateCliente>[1]) => updateCliente(clienteId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      qc.invalidateQueries({ queryKey: ['clientes', clienteId] })
      setEditing(false)
      toast.success('Cliente actualizado')
    },
    onError: () => toast.error('No se pudo actualizar el cliente'),
  })

  if (isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-80 w-full" /></div>
  }

  if (!cliente) {
    return <div className="p-6 text-red-500">Cliente no encontrado</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/clientes">Volver</Link></Button>
            <Badge variant="secondary">{cliente.polizas_activas ?? 0} polizas activas</Badge>
          </div>
          <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {cliente.telefono && <a className="inline-flex items-center gap-1" href={`tel:${cliente.telefono}`}><Phone className="h-4 w-4" />{cliente.telefono}</a>}
            {cliente.email && <a className="inline-flex items-center gap-1" href={`mailto:${cliente.email}`}><Mail className="h-4 w-4" />{cliente.email}</a>}
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditing((value) => !value)}>
          <Edit className="mr-2 h-4 w-4" /> {editing ? 'Cancelar' : 'Editar'}
        </Button>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informacion</TabsTrigger>
          <TabsTrigger value="polizas">Polizas</TabsTrigger>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="rounded-lg border p-4">
          {editing ? (
            <ClienteForm
              defaultValues={cliente}
              submitLabel="Guardar cambios"
              isSubmitting={updateMutation.isPending}
              onSubmit={(data) => updateMutation.mutate(data)}
            />
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info label="Telefono" value={cliente.telefono} />
              <Info label="Email" value={cliente.email} />
              <Info label="RFC" value={cliente.rfc} />
              <Info label="CURP" value={cliente.curp} />
              <Info label="Fecha de nacimiento" value={cliente.fecha_nacimiento} />
              <Info label="Direccion" value={cliente.direccion} />
              <Info label="Notas" value={cliente.notas} wide />
            </dl>
          )}
        </TabsContent>

        <TabsContent value="polizas" className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Polizas</h2>
            <Button asChild size="sm">
              <Link to={`/polizas/nueva?cliente_id=${cliente.id}`}><Plus className="mr-2 h-4 w-4" /> Nueva poliza</Link>
            </Button>
          </div>
          {cliente.polizas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin polizas registradas</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {cliente.polizas.map((poliza) => (
                <Link key={poliza.id} to={`/polizas/${poliza.id}`} className="rounded-md border p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{poliza.numero}</span>
                    <VigenciaBadge diasRestantes={poliza.dias_restantes} estatus={poliza.estatus} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{poliza.aseguradora} - {poliza.tipo}</p>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tareas" className="rounded-lg border p-4 text-sm text-muted-foreground">
          Sin tareas registradas
        </TabsContent>

        <TabsContent value="documentos" className="rounded-lg border p-4 text-sm text-muted-foreground">
          Sin documentos registrados
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Info({ label, value, wide }: { label: string; value?: string | number | null; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm">{value || '-'}</dd>
    </div>
  )
}
