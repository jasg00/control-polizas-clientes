import { Download, ExternalLink, FileText, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteDocumento, downloadDocumento, getDocumentos } from '@/api/documentos'
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
import type { Documento, TipoDocumento } from '@/types/models'

type Props = {
  polizaId?: number
  clienteId?: number
}

export function DocumentoList({ polizaId, clienteId }: Props) {
  const qc = useQueryClient()
  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos', { polizaId, clienteId }],
    queryFn: () => getDocumentos({ polizaId, clienteId }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDocumento,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documentos'] })
      toast.success('Documento eliminado')
    },
    onError: () => toast.error('No se pudo eliminar el documento'),
  })

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
  }

  if (documentos.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed text-center">
        <FileText className="mb-2 h-7 w-7 text-muted-foreground" />
        <p className="text-sm font-medium">Sin documentos registrados</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Tamano</TableHead>
          <TableHead>Fecha subida</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documentos.map((documento) => (
          <TableRow key={documento.id}>
            <TableCell className="font-medium">{documento.nombre_original}</TableCell>
            <TableCell>{labelTipo(documento.tipo)}</TableCell>
            <TableCell>{formatBytes(documento.tamano_bytes)}</TableCell>
            <TableCell>{formatDate(documento.created_at)}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Ver"
                  onClick={() => downloadDocumento(documento.id, documento.nombre_original, true)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Descargar"
                  onClick={() => downloadDocumento(documento.id, documento.nombre_original)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Eliminar"
                  disabled={deleteMutation.isPending}
                  onClick={() => confirmDelete(documento, deleteMutation.mutate)}
                >
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

function confirmDelete(documento: Documento, onConfirm: (id: number) => void) {
  if (window.confirm(`Eliminar "${documento.nombre_original}"?`)) {
    onConfirm(documento.id)
  }
}

function labelTipo(tipo: TipoDocumento) {
  const labels: Record<TipoDocumento, string> = {
    caratula: 'Caratula',
    endoso: 'Endoso',
    recibo: 'Recibo',
    siniestro: 'Siniestro',
    identificacion: 'Identificacion',
    otro: 'Otro',
  }
  return labels[tipo] ?? tipo
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
}
