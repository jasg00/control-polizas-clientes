import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Plus, Search, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createCliente, deleteCliente, getClientes } from '@/api/clientes'
import { ClienteForm } from '@/components/clientes/ClienteForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Cliente } from '@/types/models'

const PAGE_SIZE = 25

export default function Clientes() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch])

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', debouncedSearch],
    queryFn: () => getClientes(debouncedSearch || undefined),
  })

  const createMutation = useMutation({
    mutationFn: createCliente,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      setOpen(false)
      toast.success('Cliente creado')
    },
    onError: () => toast.error('No se pudo crear el cliente'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCliente,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      toast.success('Cliente eliminado')
    },
    onError: () => toast.error('No se pudo eliminar el cliente'),
  })

  const totalPages = Math.max(1, Math.ceil(clientes.length / PAGE_SIZE))
  const visibleClientes = useMemo(
    () => clientes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [clientes, page]
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientes.length} registros</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nuevo cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo cliente</DialogTitle>
            </DialogHeader>
            <ClienteForm
              submitLabel="Crear cliente"
              isSubmitting={createMutation.isPending}
              onSubmit={(data) => createMutation.mutate(data)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, RFC o email"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : clientes.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed text-center">
          <UserPlus className="mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Agrega tu primer cliente</h2>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  {['Nombre', 'Telefono', 'Email', 'RFC', 'Polizas activas', 'Acciones'].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-medium text-gray-600">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleClientes.map((cliente: Cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{cliente.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{cliente.telefono || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{cliente.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{cliente.rfc || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{cliente.polizas_activas ?? 0}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/clientes/${cliente.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(cliente.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pagina {page} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
