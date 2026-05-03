import apiClient from './client'
import type { Cliente, ClienteWithPolizas } from '@/types/models'

export type ClientePayload = {
  nombre: string
  telefono?: string
  email?: string
  rfc?: string
  curp?: string
  direccion?: string
  fecha_nacimiento?: string
  notas?: string
}

export async function getClientes(q?: string): Promise<Cliente[]> {
  const { data } = await apiClient.get<Cliente[]>('/clientes', { params: q ? { q } : undefined })
  return data
}

export async function getCliente(id: number): Promise<ClienteWithPolizas> {
  const { data } = await apiClient.get<ClienteWithPolizas>(`/clientes/${id}`)
  return data
}

export async function createCliente(payload: ClientePayload): Promise<Cliente> {
  const { data } = await apiClient.post<Cliente>('/clientes', payload)
  return data
}

export async function updateCliente(id: number, payload: Partial<ClientePayload>): Promise<Cliente> {
  const { data } = await apiClient.put<Cliente>(`/clientes/${id}`, payload)
  return data
}

export async function deleteCliente(id: number): Promise<void> {
  await apiClient.delete(`/clientes/${id}`)
}
