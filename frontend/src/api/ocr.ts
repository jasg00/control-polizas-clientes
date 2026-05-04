import type { OcrResult } from '@/types/models'
import apiClient from '@/api/client'

export async function uploadPdfForOcr(file: File): Promise<OcrResult> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<OcrResult>('/ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
