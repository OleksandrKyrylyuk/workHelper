/**
 * File operations service
 * Handles all file-related API calls
 */
import { apiGet, apiUpload, apiDelete, API_BASE_URL } from "../client"
import type { FileInfo, UploadResponse, FileListResponse, DeleteFileResponse } from "../types"
/**
 * Upload multiple files
 */
export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const formData = new FormData()
  files.forEach((file, index) => {
    formData.append(`file${index}`, file)
  })
  return apiUpload<UploadResponse>("/files/upload", formData)
}
/**
 * Get list of uploaded files
 */
export async function getFilesList(): Promise<FileInfo[]> {
  const response = await apiGet<FileListResponse>("/files/list")
  return response.files || []
}
/**
 * Get download URL for a file
 */
export function getDownloadUrl(filename: string): string {
  return `${API_BASE_URL}/files/download/${filename}`
}
/**
 * Delete a file
 */
export async function deleteFile(filename: string): Promise<DeleteFileResponse> {
  return apiDelete<DeleteFileResponse>(`/files/${filename}`)
}
