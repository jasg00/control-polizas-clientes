import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { updatePoliza } from '@/api/polizas'
import { getActividad, getComisiones, getVencimientos } from '@/api/reportes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ActividadMetrica, PolizaSummary } from '@/types/models'

export default function Reportes() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const { data: comisiones, isLoading: loadingComisiones } = useQuery({
    queryKey: ['reportes', 'comisiones', mes],
    queryFn: () => getComisiones(mes),
  })
  const { data: vencimientos = [], isLoading: loadingVencimientos } = useQuery({
    queryKey: ['reportes', 'vencimientos'],
    queryFn: getVencimientos,
  })
  const { data: actividad, isLoading: loadingActividad } = useQuery({
    queryKey: ['reportes', 'actividad'],
    queryFn: getActividad,
  })

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-sm text-muted-foreground">Comisiones, vencimientos y actividad comercial</p>
      </div>

      <Tabs defaultValue="comisiones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comisiones">Comisiones</TabsTrigger>
          <TabsTrigger value="vencimientos">Vencimientos</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="comisiones" className="space-y-4">
          <div className="w-52">
            <Input type="month" value={mes} onChange={(event) => setMes(event.target.value)} />
          </div>
          {loadingComisiones || !comisiones ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard label="Total ganado" value={formatMoney(comisiones.total_ganado)} />
                <SummaryCard label="Pagado" value={formatMoney(comisiones.total_pagado)} />
                <SummaryCard label="Pendiente" value={formatMoney(comisiones.total_pendiente)} />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="rounded-lg border bg-white p-4">
                  <CommissionTable polizas={comisiones.polizas} />
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <h3 className="mb-4 font-semibold">Por aseguradora</h3>
                  <div className="space-y-3">
                    {comisiones.por_aseguradora.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin comisiones en este mes</p>
                    ) : comisiones.por_aseguradora.map((row) => (
                      <div key={row.aseguradora}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{row.aseguradora}</span>
                          <span>{formatMoney(row.total)}</span>
                        </div>
                        <div className="h-2 rounded bg-muted">
                          <div className="h-2 rounded bg-slate-900" style={{ width: `${percent(row.total, comisiones.total_ganado)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="vencimientos" className="rounded-lg border bg-white p-4">
          {loadingVencimientos ? <Skeleton className="h-64 w-full" /> : (
            <div className="space-y-3">
              {vencimientos.map((row) => (
                <div key={row.mes} className="flex items-center justify-between rounded-md border p-3">
                  <span className="font-medium">{formatMonth(row.mes)}</span>
                  <Badge variant="secondary">{row.total} polizas</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="actividad">
          {loadingActividad || !actividad ? <Skeleton className="h-48 w-full" /> : (
            <div className="grid gap-4 md:grid-cols-3">
              <ActivityCard label="Nuevos clientes" metric={actividad.nuevos_clientes} />
              <ActivityCard label="Nuevas polizas" metric={actividad.nuevas_polizas} />
              <ActivityCard label="Tareas completadas" metric={actividad.tareas_completadas} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CommissionTable({ polizas }: { polizas: PolizaSummary[] }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ id, paid }: { id: number; paid: boolean }) => updatePoliza(id, { comision_pagada: paid }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportes'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => toast.error('No se pudo actualizar la comision'),
  })

  if (polizas.length === 0) {
    return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Sin polizas con comision en este mes</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No. Poliza</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Aseguradora</TableHead>
          <TableHead>Prima</TableHead>
          <TableHead>Comision</TableHead>
          <TableHead>Pagada</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {polizas.map((poliza) => (
          <TableRow key={poliza.id}>
            <TableCell><Link className="font-medium hover:underline" to={`/polizas/${poliza.id}`}>{poliza.numero}</Link></TableCell>
            <TableCell>{poliza.cliente?.nombre ?? '-'}</TableCell>
            <TableCell>{poliza.aseguradora}</TableCell>
            <TableCell>{formatMoney(Number(poliza.prima))}</TableCell>
            <TableCell>{formatMoney(Number(poliza.monto_comision))}</TableCell>
            <TableCell>
              <Button
                type="button"
                variant={poliza.comision_pagada ? 'secondary' : 'outline'}
                size="sm"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: poliza.id, paid: !poliza.comision_pagada })}
              >
                {poliza.comision_pagada ? 'Pagada' : 'Pendiente'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}

function ActivityCard({ label, metric }: { label: string; metric: ActividadMetrica }) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{metric.actual}</div>
      <p className="mt-2 text-sm text-muted-foreground">Mes anterior: {metric.anterior} · {metric.cambio_porcentaje}%</p>
    </div>
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0)
}

function formatMonth(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function percent(value: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.round((value / total) * 100))
}
