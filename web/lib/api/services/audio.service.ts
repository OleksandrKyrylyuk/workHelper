/**
 * Audio operations service
 * Handles all audio-related API calls
 */
import { apiUpload } from "../client"

export interface AudioInfo {
  id: string
  filename: string
  s3Key: string
  contentType: string
  size: number
  status: string
  createdAt: string
}

export interface AudioUploadResponse {
  success: boolean
  audio: AudioInfo
}

/**
 * Upload a single audio file
 */
export async function uploadAudio(file: File): Promise<AudioUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload<AudioUploadResponse>("/audio/upload", formData)
}
