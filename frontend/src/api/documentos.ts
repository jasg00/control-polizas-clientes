import apiClient from '@/api/client'
import type { Documento, TipoDocumento } from '@/types/models'

export async function uploadDocumento(
  file: File,
  tipo: TipoDocumento,
  polizaId?: number,
  clienteId?: number
): Promise<Documento> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('tipo', tipo)
  if (polizaId) formData.append('poliza_id', String(polizaId))
  if (clienteId) formData.append('cliente_id', String(clienteId))

  const { data } = await apiClient.post<Documento>('/documentos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getDocumentos(params: { polizaId?: number; clienteId?: number } = {}): Promise<Documento[]> {
  const { data } = await apiClient.get<Documento[]>('/documentos', {
    params: {
      poliza_id: params.polizaId,
      cliente_id: params.clienteId,
    },
  })
  return data
}

export async function downloadDocumento(id: number, nombre: string, openInNewTab = false): Promise<void> {
  const { data } = await apiClient.get<Blob>(`/documentos/${id}`, { responseType: 'blob' })
  const url = URL.createObjectURL(data)

  if (openInNewTab) {
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return
  }

  const link = document.createElement('a')
  link.href = url
  link.download = nombre
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function deleteDocumento(id: number): Promise<void> {
  await apiClient.delete(`/documentos/${id}`)
}
