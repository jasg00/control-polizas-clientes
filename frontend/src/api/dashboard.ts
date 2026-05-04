import apiClient from '@/api/client'
import type { DashboardStats } from '@/types/models'

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>('/dashboard/stats')
  return data
}
