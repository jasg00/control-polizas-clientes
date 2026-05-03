import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getUsuarios, createUsuario, updateUsuario } from '@/api/usuarios'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import type { Usuario } from '@/types/models'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().min(1, 'Requerido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  rol: z.enum(['admin', 'agente']),
})
type FormData = z.infer<typeof schema>

function NuevoUsuarioDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { rol: 'agente' },
  })

  const mutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setOpen(false); reset() },
    onError: (e: { response?: { data?: { detail?: string } } }) => setError(e.response?.data?.detail ?? 'Error al crear usuario'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Nuevo agente</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => { setError(null); mutation.mutate(d) })} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input {...register('nombre')} />
            {errors.nombre && <p className="text-sm text-red-500">{errors.nombre.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input {...register('email')} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Contraseña temporal</Label>
            <Input type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Rol</Label>
            <Select onValueChange={(v) => setValue('rol', v as 'admin' | 'agente')} defaultValue="agente">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agente">Agente</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear usuario'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminUsuarios() {
  const qc = useQueryClient()
  const { data: usuarios, isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: getUsuarios })

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => updateUsuario(id, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  return (
    <RoleGuard requiredRole="admin" fallback={<p className="p-8 text-red-500">Acceso denegado</p>}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestión de usuarios</h1>
          <NuevoUsuarioDialog />
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  {['Nombre', 'Email', 'Rol', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(usuarios ?? []).map((u: Usuario) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.rol === 'admin' ? 'default' : 'secondary'}>
                        {u.rol === 'admin' ? 'Administrador' : 'Agente'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.activo ? 'outline' : 'destructive'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActivo.mutate({ id: u.id, activo: !u.activo })}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
