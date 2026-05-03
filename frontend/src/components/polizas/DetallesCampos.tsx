import type { ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TipoPoliza } from '@/types/models'

type DetallesValue = Record<string, unknown>
type Beneficiario = { nombre: string; porcentaje: number }

type Props = {
  tipo: TipoPoliza
  value?: DetallesValue
  onChange: (value: DetallesValue) => void
}

export function DetallesCampos({ tipo, value = {}, onChange }: Props) {
  const setField = (field: string, nextValue: string | number) => {
    onChange({ ...value, [field]: nextValue })
  }

  if (tipo === 'auto') {
    return (
      <Grid>
        <TextField label="Marca" value={text(value.marca)} onChange={(next) => setField('marca', next)} />
        <TextField label="Modelo" value={text(value.modelo)} onChange={(next) => setField('modelo', next)} />
        <NumberField label="Ano" value={numberValue(value.anio)} onChange={(next) => setField('anio', next)} />
        <TextField label="Placas" value={text(value.placas)} onChange={(next) => setField('placas', next.toUpperCase())} />
        <TextField label="VIN" value={text(value.vin)} onChange={(next) => setField('vin', next.toUpperCase())} />
        <NumberField label="Suma asegurada" value={numberValue(value.suma_asegurada)} onChange={(next) => setField('suma_asegurada', next)} />
        <SelectField
          label="Tipo cobertura"
          value={text(value.tipo_cobertura)}
          options={['amplia', 'limitada', 'rc']}
          onChange={(next) => setField('tipo_cobertura', next)}
        />
      </Grid>
    )
  }

  if (tipo === 'vida') {
    const beneficiarios = Array.isArray(value.beneficiarios) ? (value.beneficiarios as Beneficiario[]) : []
    return (
      <div className="space-y-4">
        <Grid>
          <NumberField label="Suma asegurada" value={numberValue(value.suma_asegurada)} onChange={(next) => setField('suma_asegurada', next)} />
          <SelectField
            label="Tipo vida"
            value={text(value.tipo_vida)}
            options={['temporal', 'permanente', 'dotal']}
            onChange={(next) => setField('tipo_vida', next)}
          />
        </Grid>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Beneficiarios</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ ...value, beneficiarios: [...beneficiarios, { nombre: '', porcentaje: 0 }] })}
            >
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </div>
          {beneficiarios.map((beneficiario, index) => (
            <div key={`${index}-${beneficiario.nombre}`} className="grid gap-2 sm:grid-cols-[1fr_120px_40px]">
              <Input
                value={beneficiario.nombre}
                placeholder="Nombre"
                onChange={(event) => updateBeneficiario(value, beneficiarios, index, 'nombre', event.target.value, onChange)}
              />
              <Input
                type="number"
                value={beneficiario.porcentaje}
                placeholder="%"
                onChange={(event) => updateBeneficiario(value, beneficiarios, index, 'porcentaje', Number(event.target.value), onChange)}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeBeneficiario(value, beneficiarios, index, onChange)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tipo === 'hogar') {
    return (
      <Grid>
        <TextField label="Direccion del riesgo" value={text(value.direccion_riesgo)} onChange={(next) => setField('direccion_riesgo', next)} wide />
        <NumberField label="Valor inmueble" value={numberValue(value.valor_inmueble)} onChange={(next) => setField('valor_inmueble', next)} />
        <NumberField label="Valor contenidos" value={numberValue(value.valor_contenidos)} onChange={(next) => setField('valor_contenidos', next)} />
        <TextField label="Cobertura" value={text(value.cobertura)} onChange={(next) => setField('cobertura', next)} wide />
      </Grid>
    )
  }

  if (tipo === 'gmm') {
    return (
      <Grid>
        <NumberField label="Suma asegurada" value={numberValue(value.suma_asegurada)} onChange={(next) => setField('suma_asegurada', next)} />
        <NumberField label="Deducible" value={numberValue(value.deducible)} onChange={(next) => setField('deducible', next)} />
        <NumberField label="Coaseguro (%)" value={numberValue(value.coaseguro)} onChange={(next) => setField('coaseguro', next)} />
        <NumberField label="Tope coaseguro" value={numberValue(value.tope_coaseguro)} onChange={(next) => setField('tope_coaseguro', next)} />
        <SelectField label="Red" value={text(value.red)} options={['abierta', 'cerrada']} onChange={(next) => setField('red', next)} />
      </Grid>
    )
  }

  if (tipo === 'empresarial') {
    return (
      <Grid>
        <TextField label="Giro" value={text(value.giro)} onChange={(next) => setField('giro', next)} />
        <TextField label="Ubicacion" value={text(value.ubicacion)} onChange={(next) => setField('ubicacion', next)} />
        <NumberField label="Suma asegurada" value={numberValue(value.suma_asegurada)} onChange={(next) => setField('suma_asegurada', next)} />
        <TextField label="Bienes asegurados" value={text(value.bienes_asegurados)} onChange={(next) => setField('bienes_asegurados', next)} wide />
      </Grid>
    )
  }

  if (tipo === 'viaje') {
    return (
      <Grid>
        <TextField label="Destino" value={text(value.destino)} onChange={(next) => setField('destino', next)} />
        <TextField label="Fecha viaje inicio" type="date" value={text(value.fecha_viaje_inicio)} onChange={(next) => setField('fecha_viaje_inicio', next)} />
        <TextField label="Fecha viaje fin" type="date" value={text(value.fecha_viaje_fin)} onChange={(next) => setField('fecha_viaje_fin', next)} />
        <NumberField label="Suma asegurada" value={numberValue(value.suma_asegurada)} onChange={(next) => setField('suma_asegurada', next)} />
      </Grid>
    )
  }

  if (tipo === 'danos') {
    return (
      <Grid>
        <TextField label="Objeto asegurado" value={text(value.objeto_asegurado)} onChange={(next) => setField('objeto_asegurado', next)} />
        <NumberField label="Limite de responsabilidad" value={numberValue(value.limite_responsabilidad)} onChange={(next) => setField('limite_responsabilidad', next)} />
      </Grid>
    )
  }

  return (
    <Grid>
      <TextField label="Nombre proyecto" value={text(value.nombre_proyecto)} onChange={(next) => setField('nombre_proyecto', next)} />
      <TextField label="Ubicacion" value={text(value.ubicacion)} onChange={(next) => setField('ubicacion', next)} />
      <NumberField label="Valor obra" value={numberValue(value.valor_obra)} onChange={(next) => setField('valor_obra', next)} />
      <TextField label="Contratista" value={text(value.contratista)} onChange={(next) => setField('contratista', next)} />
    </Grid>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  wide,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  wide?: boolean
}) {
  return (
    <div className={wide ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number | ''; onChange: (value: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function updateBeneficiario(
  value: DetallesValue,
  beneficiarios: Beneficiario[],
  index: number,
  field: keyof Beneficiario,
  nextValue: string | number,
  onChange: (value: DetallesValue) => void
) {
  onChange({
    ...value,
    beneficiarios: beneficiarios.map((beneficiario, currentIndex) =>
      currentIndex === index ? { ...beneficiario, [field]: nextValue } : beneficiario
    ),
  })
}

function removeBeneficiario(
  value: DetallesValue,
  beneficiarios: Beneficiario[],
  index: number,
  onChange: (value: DetallesValue) => void
) {
  onChange({ ...value, beneficiarios: beneficiarios.filter((_, currentIndex) => currentIndex !== index) })
}

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : ''
}
