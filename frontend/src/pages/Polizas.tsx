import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownUp, Eye, FilePlus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deletePoliza, getPolizas, type PolizaFilters } from '@/api/polizas'
import { labelTipo } from '@/components/polizas/PolizaForm'
import { VigenciaBadge } from '@/components/polizas/VigenciaBadge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { EstatusPoliza, TipoPoliza } from '@/types/models'

const tipos: Array<TipoPoliza | 'todos'> = ['todos', 'auto', 'vida', 'hogar', 'gmm', 'empresarial', 'viaje', 'danos', 'obra_civil']
const estatuses: Array<EstatusPoliza | 'todos'> = ['todos', 'activa', 'por_vencer', 'vencida', 'cancelada']
const vencimientos = ['todos', '7', '15', '30', '60'] as const

export default function Polizas() {
  const [filters, setFilters] = useState<PolizaFilters>({ tipo: 'todos', estatus: 'todos', vence_en_dias: 'todos' })
  const [sort, setSort] = useState<'fecha_fin' | 'prima'>('fecha_fin')
  const qc = useQueryClient()

  const { data: polizas = [], isLoading } = useQuery({
    queryKey: ['polizas', filters],
    queryFn: () => getPolizas(filters),
  })

  const aseguradoras = useMemo(
    () => Array.from(new Set(polizas.map((poliza) => poliza.aseguradora))).filter(Boolean).sort(),
    [polizas]
  )

  const sortedPolizas = useMemo(() => {
    return [...polizas].sort((a, b) => {
      if (sort === 'prima') return Number(b.prima) - Number(a.prima)
      return a.fecha_fin.localeCompare(b.fecha_fin)
    })
  }, [polizas, sort])

  const deleteMutation = useMutation({
    mutationFn: deletePoliza,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polizas'] })
      toast.success('Poliza eliminada')
    },
    onError: () => toast.error('No se pudo eliminar la poliza'),
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Polizas</h1>
          <p className="text-sm text-muted-foreground">{polizas.length} registros</p>
        </div>
        <Button asChild>
          <Link to="/polizas/nueva"><Plus className="h-4 w-4" /> Nueva poliza</Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <FilterSelect
          value={filters.tipo ?? 'todos'}
          options={tipos}
          getLabel={(value) => (value === 'todos' ? 'Todos los tipos' : labelTipo(value))}
          onChange={(value) => setFilters((current) => ({ ...current, tipo: value as TipoPoliza | 'todos' }))}
        />
        <FilterSelect
          value={filters.aseguradora || 'todos'}
          options={['todos', ...aseguradoras]}
          getLabel={(value) => (value === 'todos' ? 'Todas las aseguradoras' : value)}
          onChange={(value) => setFilters((current) => ({ ...current, aseguradora: value }))}
        />
        <FilterSelect
          value={filters.estatus ?? 'todos'}
          options={estatuses}
          getLabel={(value) => (value === 'todos' ? 'Todos los estatus' : value)}
          onChange={(value) => setFilters((current) => ({ ...current, estatus: value as EstatusPoliza | 'todos' }))}
        />
        <FilterSelect
          value={String(filters.vence_en_dias ?? 'todos')}
          options={vencimientos}
          getLabel={(value) => (value === 'todos' ? 'Cualquier vencimiento' : `Vence en ${value} dias`)}
          onChange={(value) => setFilters((current) => ({ ...current, vence_en_dias: value === 'todos' ? 'todos' : Number(value) }))}
        />
        <Button variant="outline" onClick={() => setSort((value) => (value === 'fecha_fin' ? 'prima' : 'fecha_fin'))}>
          <ArrowDownUp className="h-4 w-4" /> {sort === 'fecha_fin' ? 'Fecha fin' : 'Prima'}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>
      ) : sortedPolizas.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed text-center">
          <FilePlus className="mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Agrega tu primera poliza</h2>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                {['No. Poliza', 'Tipo', 'Cliente', 'Aseguradora', 'Fecha fin', 'Dias', 'Prima', 'Comision', 'Acciones'].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-medium text-gray-600">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedPolizas.map((poliza) => (
                <tr key={poliza.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{poliza.numero}</td>
                  <td className="px-4 py-3 text-gray-600">{labelTipo(poliza.tipo)}</td>
                  <td className="px-4 py-3 text-gray-600">{poliza.cliente?.nombre ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{poliza.aseguradora}</td>
                  <td className="px-4 py-3 text-gray-600">{poliza.fecha_fin}</td>
                  <td className="px-4 py-3"><VigenciaBadge diasRestantes={poliza.dias_restantes} estatus={poliza.estatus} /></td>
                  <td className="px-4 py-3 text-gray-600">{formatMoney(poliza.prima, poliza.moneda)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatMoney(poliza.monto_comision, poliza.moneda)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/polizas/${poliza.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(poliza.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FilterSelect<T extends string>({
  value,
  options,
  getLabel,
  onChange,
}: {
  value: string
  options: readonly T[]
  getLabel: (value: T) => string
  onChange: (value: T) => void
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((option) => <SelectItem key={option} value={option}>{getLabel(option)}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function formatMoney(value: number, currency: 'MXN' | 'USD') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(Number(value || 0))
}
