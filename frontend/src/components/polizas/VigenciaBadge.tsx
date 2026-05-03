import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EstatusPoliza } from '@/types/models'

type Props = {
  diasRestantes: number
  estatus: EstatusPoliza
}

export function VigenciaBadge({ diasRestantes, estatus }: Props) {
  const color = getColor(diasRestantes, estatus)
  const label = estatus === 'vencida' ? 'Vencida' : estatus === 'cancelada' ? 'Cancelada' : `${diasRestantes} dias`

  return (
    <Badge variant="outline" className={cn('border-transparent', color)}>
      {label}
    </Badge>
  )
}

function getColor(diasRestantes: number, estatus: EstatusPoliza) {
  if (estatus === 'cancelada') return 'bg-gray-100 text-gray-700'
  if (estatus === 'vencida' || diasRestantes <= 7) return 'bg-red-100 text-red-700'
  if (diasRestantes <= 15) return 'bg-orange-100 text-orange-700'
  if (diasRestantes <= 30) return 'bg-yellow-100 text-yellow-800'
  if (diasRestantes <= 60) return 'bg-blue-100 text-blue-700'
  return 'bg-green-100 text-green-700'
}
