/**
 * Audio operations service
 * Handles all audio-related API calls
 */
import { apiUpload, apiGet, apiDelete, API_BASE_URL, getAuthToken } from "../client"

export type AnalysisType = "call_analysis" | "call_analysis_big" | "client_visits"

export const ANALYSIS_TYPE_LABELS: Record<AnalysisType, string> = {
  call_analysis: "Call Analysis (Basic)",
  call_analysis_big: "Call Analysis (Extended)",
  client_visits: "Client Visits Report",
}

export interface AudioInfo {
  id: string
  filename: string
  s3Key?: string
  contentType: string
  size: number
  status: string
  createdAt: string
}

export interface AudioUploadResponse {
  success: boolean
  audio: AudioInfo
}

export interface AudioListResponse {
  success: boolean
  audios: AudioInfo[]
}

/**
 * Upload a single audio file with the selected analysis type
 */
export async function uploadAudio(file: File, analysisType: AnalysisType): Promise<AudioUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload<AudioUploadResponse>(`/audio/upload?analysisType=${encodeURIComponent(analysisType)}`, formData)
}

/**
 * List all audio files for the authenticated user
 */
export async function listAudios(): Promise<AudioListResponse> {
  return apiGet<AudioListResponse>("/audio/list")
}

/**
 * Delete an audio file by id
 */
export async function deleteAudio(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/audio/${id}`)
}

/**
 * Download analysis file as a .pdf file
 */
export async function downloadAnalysis(id: string, filename: string): Promise<void> {
  const token = await getAuthToken()
  const response = await fetch(`${API_BASE_URL}/audio/${id}/download-analysis`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error || "Failed to download analysis")
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement("a")
  const baseName = filename.replace(/\.[^.]+$/, "")
  anchor.href = url
  anchor.download = `${baseName}-analysis.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
