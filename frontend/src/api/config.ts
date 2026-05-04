import apiClient from '@/api/client'
import type { ConfigAlertas, ConfigLLM, ConfigPresupuesto, ProveedorLLM } from '@/types/models'

export type ConfigLLMPayload = {
  proveedor: ProveedorLLM
  modelo: string
  api_key?: string
  temperatura: number
  activo: boolean
}

export type ConfigAlertasPayload = {
  dias_anticipacion: number[]
  email_agente_activo: boolean
  email_cliente_activo: boolean
  email_agente?: string
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_password?: string
  smtp_from_name?: string
}

export type ConfigTestResult = {
  ok: boolean
  modelo?: string
  latency_ms?: number
  error?: string
}

export async function getLLMConfig(): Promise<ConfigLLM> {
  const { data } = await apiClient.get<ConfigLLM>('/config/llm')
  return data
}

export async function updateLLMConfig(payload: ConfigLLMPayload): Promise<ConfigLLM> {
  const { data } = await apiClient.put<ConfigLLM>('/config/llm', payload)
  return data
}

export async function testLLMConfig(): Promise<ConfigTestResult> {
  const { data } = await apiClient.post<ConfigTestResult>('/config/llm/test')
  return data
}

export async function getAlertasConfig(): Promise<ConfigAlertas> {
  const { data } = await apiClient.get<ConfigAlertas>('/config/alertas')
  return data
}

export async function updateAlertasConfig(payload: ConfigAlertasPayload): Promise<ConfigAlertas> {
  const { data } = await apiClient.put<ConfigAlertas>('/config/alertas', payload)
  return data
}

export async function testAlertasEmail(): Promise<ConfigTestResult> {
  const { data } = await apiClient.post<ConfigTestResult>('/config/alertas/test-email')
  return data
}

export async function getPresupuestos(): Promise<ConfigPresupuesto[]> {
  const { data } = await apiClient.get<ConfigPresupuesto[]>('/config/presupuesto')
  return data
}

export async function updatePresupuesto(
  proveedor: ProveedorLLM,
  payload: { presupuesto_mensual_usd: number; alerta_porcentaje: number }
): Promise<ConfigPresupuesto> {
  const { data } = await apiClient.put<ConfigPresupuesto>(`/config/presupuesto/${proveedor}`, payload)
  return data
}
