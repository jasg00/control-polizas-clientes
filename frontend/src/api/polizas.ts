import apiClient from './client'
import type { DetallesPoliza, EstatusPoliza, Poliza, PolizaSummary, TipoPoliza } from '@/types/models'

export type PolizaPayload = {
  numero: string
  tipo: TipoPoliza
  aseguradora: string
  plan?: string
  fecha_inicio: string
  fecha_fin: string
  prima: number
  moneda: 'MXN' | 'USD'
  periodo_gracia_dias?: number
  porcentaje_comision?: number
  estatus?: EstatusPoliza
  comision_pagada?: boolean
  detalles?: DetallesPoliza
  notas?: string
  cliente_id: number
}

export type PolizaFilters = {
  tipo?: TipoPoliza | 'todos'
  aseguradora?: string
  estatus?: EstatusPoliza | 'todos'
  cliente_id?: number
  vence_en_dias?: number | 'todos'
}

export async function getPolizas(filters: PolizaFilters = {}): Promise<PolizaSummary[]> {
  const params = cleanFilters(filters)
  const { data } = await apiClient.get<PolizaSummary[]>('/polizas', { params })
  return data
}

export async function getPoliza(id: number): Promise<Poliza> {
  const { data } = await apiClient.get<Poliza>(`/polizas/${id}`)
  return data
}

export async function createPoliza(payload: PolizaPayload): Promise<Poliza> {
  const { data } = await apiClient.post<Poliza>('/polizas', payload)
  return data
}

export async function updatePoliza(id: number, payload: Partial<PolizaPayload>): Promise<Poliza> {
  const { data } = await apiClient.put<Poliza>(`/polizas/${id}`, payload)
  return data
}

export async function deletePoliza(id: number): Promise<void> {
  await apiClient.delete(`/polizas/${id}`)
}

function cleanFilters(filters: PolizaFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '' && value !== 'todos')
  )
}
