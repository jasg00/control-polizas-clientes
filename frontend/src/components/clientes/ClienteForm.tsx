import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Cliente } from '@/types/models'
import type { ClientePayload } from '@/api/clientes'

const schema = z.object({
  nombre: z.string().min(2, 'Minimo 2 caracteres'),
  telefono: z.string().optional(),
  email: z.string().refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Email invalido'),
  rfc: z.string().refine((value) => !value || value.length === 13, 'RFC debe tener 13 caracteres'),
  curp: z.string().refine((value) => !value || value.length === 18, 'CURP debe tener 18 caracteres'),
  direccion: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  notas: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Props = {
  defaultValues?: Partial<Cliente>
  submitLabel?: string
  isSubmitting?: boolean
  onSubmit: (data: ClientePayload) => void
}

export function ClienteForm({ defaultValues, submitLabel = 'Guardar cliente', isSubmitting, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      telefono: '',
      email: '',
      rfc: '',
      curp: '',
      direccion: '',
      fecha_nacimiento: '',
      notas: '',
      ...defaultValues,
    },
  })

  useEffect(() => {
    if (defaultValues) {
      reset({
        nombre: defaultValues.nombre ?? '',
        telefono: defaultValues.telefono ?? '',
        email: defaultValues.email ?? '',
        rfc: defaultValues.rfc ?? '',
        curp: defaultValues.curp ?? '',
        direccion: defaultValues.direccion ?? '',
        fecha_nacimiento: defaultValues.fecha_nacimiento ?? '',
        notas: defaultValues.notas ?? '',
      })
    }
  }, [defaultValues, reset])

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(cleanPayload(data)))} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors.nombre?.message}>
          <Input {...register('nombre')} />
        </Field>
        <Field label="Telefono" error={errors.telefono?.message}>
          <Input {...register('telefono')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register('email')} />
        </Field>
        <Field label="RFC" error={errors.rfc?.message}>
          <Input maxLength={13} className="uppercase" {...register('rfc')} />
        </Field>
        <Field label="CURP" error={errors.curp?.message}>
          <Input maxLength={18} className="uppercase" {...register('curp')} />
        </Field>
        <Field label="Fecha de nacimiento" error={errors.fecha_nacimiento?.message}>
          <Input type="date" {...register('fecha_nacimiento')} />
        </Field>
      </div>

      <Field label="Direccion" error={errors.direccion?.message}>
        <textarea
          {...register('direccion')}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      </Field>

      <Field label="Notas" error={errors.notas?.message}>
        <textarea
          {...register('notas')}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      </Field>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )
}

function cleanPayload(data: FormData): ClientePayload {
  const payload: ClientePayload = { nombre: data.nombre.trim() }
  const fields: Array<keyof Omit<ClientePayload, 'nombre'>> = [
    'telefono',
    'email',
    'rfc',
    'curp',
    'direccion',
    'fecha_nacimiento',
    'notas',
  ]
  for (const field of fields) {
    const value = data[field]?.trim()
    if (value) payload[field] = field === 'rfc' || field === 'curp' ? value.toUpperCase() : value
  }
  return payload
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
