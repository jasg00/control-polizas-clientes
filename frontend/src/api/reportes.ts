import apiClient from '@/api/client'
import type { LLMCallLog, ReporteAICostos, ReporteActividad, ReporteComisiones, VencimientoMes } from '@/types/models'

export async function getComisiones(mes?: string, agenteId?: number): Promise<ReporteComisiones> {
  const { data } = await apiClient.get<ReporteComisiones>('/reportes/comisiones', {
    params: { mes, agente_id: agenteId },
  })
  return data
}

export async function getVencimientos(): Promise<VencimientoMes[]> {
  const { data } = await apiClient.get<VencimientoMes[]>('/reportes/vencimientos')
  return data
}

export async function getActividad(): Promise<ReporteActividad> {
  const { data } = await apiClient.get<ReporteActividad>('/reportes/actividad')
  return data
}

export async function getAICostos(mes?: string): Promise<ReporteAICostos> {
  const { data } = await apiClient.get<ReporteAICostos>('/reportes/ai-costos', {
    params: mes ? { mes } : undefined,
  })
  return data
}

export async function getAIHistorial(): Promise<LLMCallLog[]> {
  const { data } = await apiClient.get<LLMCallLog[]>('/reportes/ai-costos/historial')
  return data
}
