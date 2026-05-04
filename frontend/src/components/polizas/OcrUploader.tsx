import { useRef, useState } from 'react'
import axios from 'axios'
import { CheckCircle, FileUp, Loader2, XCircle } from 'lucide-react'
import { uploadPdfForOcr } from '@/api/ocr'
import { Button } from '@/components/ui/button'
import type { OcrResult } from '@/types/models'
import { cn } from '@/lib/utils'

type State = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

type Props = {
  onExtracted: (data: OcrResult) => void
}

export function OcrUploader({ onExtracted }: Props) {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF')
      setState('error')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('El archivo es demasiado grande (max 20 MB)')
      setState('error')
      return
    }

    setState('uploading')
    setError(null)

    try {
      setState('processing')
      const result = await uploadPdfForOcr(file)
      setState('done')
      onExtracted(result)
    } catch (err: unknown) {
      setState('error')
      setError(getErrorMessage(err))
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function reset() {
    setState('idle')
    setError(null)
  }

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        isDragging && 'border-primary bg-primary/5',
        state === 'idle' && !isDragging && 'border-muted-foreground/30 hover:border-primary/50',
        state === 'done' && 'border-green-400 bg-green-50',
        state === 'error' && 'border-red-400 bg-red-50',
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onInputChange}
      />

      {state === 'idle' && (
        <div className="space-y-3">
          <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Arrastra una carátula PDF aquí</p>
            <p className="text-xs text-muted-foreground">o selecciona un archivo (max 20 MB)</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Seleccionar PDF
          </Button>
        </div>
      )}

      {(state === 'uploading' || state === 'processing') && (
        <div className="space-y-2">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Analizando póliza con IA...</p>
          <p className="text-xs text-muted-foreground">Leyendo PDF → Enviando a IA → Extrayendo datos</p>
        </div>
      )}

      {state === 'done' && (
        <div className="space-y-2">
          <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
          <p className="text-sm font-medium text-green-700">Campos pre-llenados — revisa los destacados</p>
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Analizar otro PDF
          </Button>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-2">
          <XCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="text-sm font-medium text-red-700">{error}</p>
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Intentar de nuevo
          </Button>
        </div>
      )}
    </div>
  )
}

function getErrorMessage(err: unknown) {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
  }
  return err instanceof Error ? err.message : 'Error al analizar el PDF'
}
