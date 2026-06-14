# API Layer Structure
This directory contains the structured API layer for making HTTP requests to backend services.
## Directory Structure
```
lib/api/
├── client.ts                    # Base API client with HTTP methods
├── types.ts                     # Shared TypeScript types
├── services/                    # Service layer organized by domain
│   └── files.service.ts         # File operations service
└── README.md                    # This file
```
## Components
### `client.ts`
Base API client with:
- **ApiError**: Custom error class for API errors
- **apiGet()**: GET requests
- **apiPost()**: POST requests with JSON body
- **apiPut()**: PUT requests with JSON body
- **apiDelete()**: DELETE requests
- **apiUpload()**: File upload with FormData
All methods include automatic error handling and JSON parsing.
### `types.ts`
TypeScript interfaces for:
- API responses (UploadResponse, FileListResponse, etc.)
- Domain models (FileInfo)
- Common types (ApiResponse, PaginatedResponse)
### `services/`
Service layer that wraps API calls by domain:
#### `files.service.ts`
- `uploadFiles(files)` - Upload multiple files
- `getFilesList()` - Get list of all files
- `getDownloadUrl(filename)` - Get download URL for a file
- `deleteFile(filename)` - Delete a file by filename
## Usage Example
```typescript
import { uploadFiles } from "@/lib/api/services/files.service"
import { ApiError } from "@/lib/api/client"
try {
  const result = await uploadFiles(files)
  console.log(result.message)
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}: ${error.message}`)
  }
}
```
## Adding New Services
When adding new API endpoints:
1. Add types to `types.ts`
2. Create a new service file in `services/` (e.g., `chat.service.ts`)
3. Import and use the HTTP methods from `client.ts`
4. Export functions that wrap your API calls
Example:
```typescript
// services/chat.service.ts
import { apiPost } from "../client"
import type { ChatResponse } from "../types"
export async function sendMessage(message: string): Promise<ChatResponse> {
  return apiPost<ChatResponse>("/chat/message", { message })
}
```
## Configuration
API base URL is configured via environment variable:
- `NEXT_PUBLIC_API_URL` - defaults to `http://localhost:3001`
Set this in `.env.local` for development.
