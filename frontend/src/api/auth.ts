import apiClient from './client'
import type { TokenResponse, Usuario } from '@/types/models'

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', { email, password })
  return data
}

export async function refreshToken(refreshToken: string): Promise<{ access_token: string }> {
  const { data } = await apiClient.post('/auth/refresh', { refresh_token: refreshToken })
  return data
}

export async function getMe(): Promise<Usuario> {
  const { data } = await apiClient.get<Usuario>('/auth/me')
  return data
}
