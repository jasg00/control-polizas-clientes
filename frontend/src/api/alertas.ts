import apiClient from '@/api/client'
import type { AlertaEnviada, AlertasProximas } from '@/types/models'

export async function getProximas(): Promise<AlertasProximas> {
  const { data } = await apiClient.get<AlertasProximas>('/alertas/proximas')
  return data
}

export async function enviarAlerta(polizaId: number): Promise<AlertaEnviada> {
  const { data } = await apiClient.post<AlertaEnviada>(`/alertas/enviar/${polizaId}`)
  return data
}

export async function getHistorial(polizaId?: number): Promise<AlertaEnviada[]> {
  const { data } = await apiClient.get<AlertaEnviada[]>('/alertas/historial', {
    params: polizaId ? { poliza_id: polizaId } : undefined,
  })
  return data
}
