import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createPoliza, type PolizaPayload } from '@/api/polizas'
import { OcrUploader } from '@/components/polizas/OcrUploader'
import { PolizaForm } from '@/components/polizas/PolizaForm'
import { Button } from '@/components/ui/button'
import type { OcrResult, Poliza, TipoPoliza } from '@/types/models'

export default function NuevaPoliza() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const clienteId = Number(searchParams.get('cliente_id') || 0)

  const baseDefaults = useMemo<Partial<Poliza>>(
    () => ({
      cliente_id: Number.isFinite(clienteId) ? clienteId : 0,
      moneda: 'MXN',
      tipo: 'auto',
      porcentaje_comision: 0,
      periodo_gracia_dias: 0,
      detalles: {},
    }),
    [clienteId]
  )

  const [ocrResult, setOcrResult] = useState<OcrResult | undefined>(undefined)
  const [formDefaults, setFormDefaults] = useState<Partial<Poliza>>(baseDefaults)

  function handleOcrExtracted(data: OcrResult) {
    setOcrResult(data)
    setFormDefaults({
      ...baseDefaults,
      numero: data.numero?.valor != null ? String(data.numero.valor) : baseDefaults.numero,
      aseguradora: data.aseguradora?.valor != null ? String(data.aseguradora.valor) : baseDefaults.aseguradora,
      tipo: data.tipo?.valor != null ? (String(data.tipo.valor) as TipoPoliza) : baseDefaults.tipo,
      fecha_inicio: data.fecha_inicio?.valor != null ? String(data.fecha_inicio.valor) : baseDefaults.fecha_inicio,
      fecha_fin: data.fecha_fin?.valor != null ? String(data.fecha_fin.valor) : baseDefaults.fecha_fin,
      prima: data.prima?.valor != null ? Number(data.prima.valor) : baseDefaults.prima,
      moneda: data.moneda?.valor != null ? (String(data.moneda.valor) as 'MXN' | 'USD') : baseDefaults.moneda,
      plan: data.plan?.valor != null ? String(data.plan.valor) : baseDefaults.plan,
      detalles: isObjectValue(data.detalles?.valor) ? data.detalles.valor : baseDefaults.detalles,
    })
  }

  const createMutation = useMutation({
    mutationFn: createPoliza,
    onSuccess: (poliza) => {
      qc.invalidateQueries({ queryKey: ['polizas'] })
      qc.invalidateQueries({ queryKey: ['clientes'] })
      toast.success('Poliza creada')
      navigate(`/polizas/${poliza.id}`)
    },
    onError: () => toast.error('No se pudo crear la poliza'),
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Nueva poliza</h1>
          <p className="text-sm text-muted-foreground">Sube una carátula PDF o llena el formulario manualmente</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/polizas')}>Volver</Button>
      </div>

      <div className="max-w-4xl space-y-4">
        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Extracción automática con IA
          </h2>
          <OcrUploader onExtracted={handleOcrExtracted} />
        </div>

        <div className="rounded-lg border bg-white p-5">
          <PolizaForm
            defaultValues={formDefaults}
            ocrResult={ocrResult}
            submitLabel="Crear poliza"
            isSubmitting={createMutation.isPending}
            onSubmit={(data: PolizaPayload) => createMutation.mutate(data)}
          />
        </div>
      </div>
    </div>
  )
}

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
