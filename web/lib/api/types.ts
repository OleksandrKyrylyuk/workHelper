/**
 * Shared API types for the WorkHelper application
 */
// Common response types
export interface ApiResponse<T = unknown> {
  data?: T
  message?: string
  error?: string
}
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
// File types
export interface FileInfo {
  filename: string
  originalName?: string
  size: number
  mimeType?: string
  uploadedAt?: string
  path?: string
}
export interface UploadResponse {
  message: string
  files?: FileInfo[]
  count?: number
}
export interface FileListResponse {
  files: FileInfo[]
  count: number
}
export interface DeleteFileResponse {
  message: string
  filename: string
}
