/**
 * Base API configuration and utilities
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
export interface ApiResponse<T = unknown> {
  data?: T
  message?: string
  error?: string
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}
/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
      },
    })
    const data = await response.json()
    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.message || data.error || "Request failed",
        data
      )
    }
    return data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof Error) {
      throw new ApiError(0, error.message)
    }
    throw new ApiError(0, "An unexpected error occurred")
  }
}
/**
 * GET request
 */
export async function apiGet<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: "GET",
  })
}
/**
 * POST request with JSON body
 */
export async function apiPost<T = unknown>(
  endpoint: string,
  body?: unknown,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}
/**
 * PUT request with JSON body
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  body?: unknown,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}
/**
 * DELETE request
 */
export async function apiDelete<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: "DELETE",
  })
}
/**
 * Upload files with FormData
 */
export async function apiUpload<T = unknown>(
  endpoint: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  try {
    const response = await fetch(url, {
      ...options,
      method: "POST",
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    })
    const data = await response.json()
    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.message || data.error || "Upload failed",
        data
      )
    }
    return data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof Error) {
      throw new ApiError(0, error.message)
    }
    throw new ApiError(0, "Upload failed")
  }
}
export { API_BASE_URL }
