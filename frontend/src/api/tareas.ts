import apiClient from '@/api/client'
import type { PrioridadTarea, Tarea, TipoTarea } from '@/types/models'

export type TareaPayload = {
  titulo: string
  tipo: TipoTarea
  prioridad: PrioridadTarea
  fecha_vencimiento: string
  descripcion?: string
  cliente_id?: number
  poliza_id?: number
  asignada_a?: number
}

export type TareaFilters = {
  completada?: boolean
  fecha_vencimiento_hasta?: string
  cliente_id?: number
  poliza_id?: number
  asignada_a?: number
  tipo?: TipoTarea | 'todos'
  prioridad?: PrioridadTarea | 'todos'
}

export async function getTareas(filters: TareaFilters = {}): Promise<Tarea[]> {
  const { data } = await apiClient.get<Tarea[]>('/tareas', { params: cleanFilters(filters) })
  return data
}

export async function createTarea(payload: TareaPayload): Promise<Tarea> {
  const { data } = await apiClient.post<Tarea>('/tareas', payload)
  return data
}

export async function updateTarea(id: number, payload: Partial<TareaPayload & { completada: boolean }>): Promise<Tarea> {
  const { data } = await apiClient.put<Tarea>(`/tareas/${id}`, payload)
  return data
}

export async function deleteTarea(id: number): Promise<void> {
  await apiClient.delete(`/tareas/${id}`)
}

function cleanFilters(filters: TareaFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '' && value !== 'todos')
  )
}
