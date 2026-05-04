import { useRef, useState } from 'react'
import axios from 'axios'
import { FileUp, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { uploadDocumento } from '@/api/documentos'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { TipoDocumento } from '@/types/models'

const tipos: Array<{ value: TipoDocumento; label: string }> = [
  { value: 'caratula', label: 'Caratula' },
  { value: 'endoso', label: 'Endoso' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'siniestro', label: 'Siniestro' },
  { value: 'identificacion', label: 'Identificacion' },
  { value: 'otro', label: 'Otro' },
]

type Props = {
  polizaId?: number
  clienteId?: number
}

export function DocumentoUploader({ polizaId, clienteId }: Props) {
  const [tipo, setTipo] = useState<TipoDocumento>('caratula')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocumento(file, tipo, polizaId, clienteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documentos'] })
      toast.success('Documento subido')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function handleFile(file: File) {
    uploadMutation.mutate(file)
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) handleFile(file)
    event.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <Select value={tipo} onValueChange={(value) => setTipo(value as TipoDocumento)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tipos.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div
          className={cn(
            'flex min-h-24 flex-col items-center justify-center rounded-md border border-dashed px-4 py-5 text-center transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-input bg-background'
          )}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={onInputChange}
          />
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="mb-2 h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium">Subiendo documento...</p>
            </>
          ) : (
            <>
              <FileUp className="mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">Arrastra un archivo o selecciona desde tu equipo</p>
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG o DOCX hasta 20 MB</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>
                Seleccionar archivo
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function getErrorMessage(err: unknown) {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
  }
  return err instanceof Error ? err.message : 'No se pudo subir el documento'
}
