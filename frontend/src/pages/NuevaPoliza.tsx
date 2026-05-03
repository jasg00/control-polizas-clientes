import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createPoliza, type PolizaPayload } from '@/api/polizas'
import { PolizaForm } from '@/components/polizas/PolizaForm'
import { Button } from '@/components/ui/button'
import type { Poliza } from '@/types/models'

export default function NuevaPoliza() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const clienteId = Number(searchParams.get('cliente_id') || 0)

  const defaultValues = useMemo<Partial<Poliza>>(
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
          <p className="text-sm text-muted-foreground">Registro manual</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/polizas')}>Volver</Button>
      </div>

      <div className="max-w-4xl rounded-lg border bg-white p-5">
        <PolizaForm
          defaultValues={defaultValues}
          submitLabel="Crear poliza"
          isSubmitting={createMutation.isPending}
          onSubmit={(data: PolizaPayload) => createMutation.mutate(data)}
        />
      </div>
    </div>
  )
}
