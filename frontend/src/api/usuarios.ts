import apiClient from './client'
import type { Usuario } from '@/types/models'

export async function getUsuarios(): Promise<Usuario[]> {
  const { data } = await apiClient.get<Usuario[]>('/usuarios')
  return data
}

export async function createUsuario(data: {
  nombre: string
  email: string
  password: string
  rol: string
}): Promise<Usuario> {
  const { data: user } = await apiClient.post<Usuario>('/usuarios', data)
  return user
}

export async function updateUsuario(id: number, data: Partial<Usuario & { activo: boolean }>): Promise<Usuario> {
  const { data: user } = await apiClient.put<Usuario>(`/usuarios/${id}`, data)
  return user
}

export async function deactivateUsuario(id: number): Promise<void> {
  await apiClient.delete(`/usuarios/${id}`)
}
