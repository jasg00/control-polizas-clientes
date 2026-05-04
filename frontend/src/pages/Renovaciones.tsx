import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ExternalLink, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { enviarAlerta, getProximas } from '@/api/alertas'
import { VigenciaBadge } from '@/components/polizas/VigenciaBadge'
import { Button } from '@/components/ui/button'
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
import type { PolizaSummary } from '@/types/models'

const tabs = [
  { key: 'urgente', label: 'Urgente' },
  { key: 'pronto', label: 'Proximas' },
  { key: 'este_mes', label: 'Este mes' },
  { key: 'proximo_bimestre', label: 'Proximos 2 meses' },
] as const

type TabKey = (typeof tabs)[number]['key']

export default function Renovaciones() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = (searchParams.get('tab') as TabKey) || 'urgente'
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['alertas', 'proximas'],
    queryFn: getProximas,
    refetchInterval: 5 * 60 * 1000,
  })

  const sendMutation = useMutation({
    mutationFn: enviarAlerta,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertas'] })
      toast.success('Recordatorio enviado')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'No se pudo enviar el recordatorio'),
  })

  if (isLoading) {
    return <div className="p-6 space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-80 w-full" /></div>
  }

  const buckets = data ?? { urgente: [], pronto: [], este_mes: [], proximo_bimestre: [] }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Renovaciones</h1>
        <p className="text-sm text-muted-foreground">Polizas activas o por vencer dentro de los proximos 60 dias</p>
      </div>

      <Tabs value={currentTab} onValueChange={(value) => setSearchParams({ tab: value })} className="space-y-4">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{buckets[tab.key].length}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="rounded-lg border bg-white p-4">
            <RenewalTable
              polizas={buckets[tab.key]}
              onSend={(id) => sendMutation.mutate(id)}
              sending={sendMutation.isPending}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function RenewalTable({ polizas, onSend, sending }: { polizas: PolizaSummary[]; onSend: (id: number) => void; sending: boolean }) {
  if (polizas.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center rounded-md border border-dashed text-center">
        <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">No hay polizas por vencer en este periodo</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Aseguradora</TableHead>
          <TableHead>No. Poliza</TableHead>
          <TableHead>Vence el</TableHead>
          <TableHead>Dias</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {polizas.map((poliza) => (
          <TableRow key={poliza.id}>
            <TableCell>{poliza.cliente?.nombre ?? '-'}</TableCell>
            <TableCell className="capitalize">{poliza.tipo.replace('_', ' ')}</TableCell>
            <TableCell>{poliza.aseguradora}</TableCell>
            <TableCell className="font-medium">{poliza.numero}</TableCell>
            <TableCell>{formatDate(poliza.fecha_fin)}</TableCell>
            <TableCell><VigenciaBadge diasRestantes={poliza.dias_restantes} estatus={poliza.estatus} /></TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button type="button" variant="ghost" size="icon" title="Enviar recordatorio" disabled={sending} onClick={() => onSend(poliza.id)}>
                  <Mail className="h-4 w-4" />
                </Button>
                <Button asChild variant="ghost" size="icon" title="Ver poliza">
                  <Link to={`/polizas/${poliza.id}`}><ExternalLink className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/polizas/${poliza.id}`}>Renovar</Link>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
}
