# File Upload/Download API

This module provides file upload, download, and management functionality with **temporary staging** for upload validation.

## How It Works

### Upload Process (3-Step Validation):
1. **Save to Temp** → Files are first saved to `uploads/temp/` directory
2. **Validate** → All validations (size, format, etc.) are performed
3. **Move to Permanent** → Only if all checks pass, files are moved to `uploads/` directory

**Benefits:**
- ❌ **No partial uploads**: If size limit is exceeded, temp files are automatically deleted
- ✅ **Atomic operations**: Either all files succeed or none are saved
- 🧹 **Auto cleanup**: Failed uploads don't leave orphaned files on the server

## Directory Structure

```
api/
├── src/
│   ├── controllers/
│   │   └── file.controller.ts    # File operation handlers
│   ├── routes/
│   │   └── file.routes.ts         # File API routes
│   └── utils/
│       └── file.utils.ts          # File system utilities
└── uploads/
    ├── temp/                      # Temporary staging (auto-cleaned)
    └── [permanent files]          # Successfully uploaded files
```

## Storage

- **Temp Directory**: `api/uploads/temp/` - Temporary staging for uploads
- **Permanent Directory**: `api/uploads/` - Successfully validated files
- Both directories are automatically created on server startup and gitignored

## API Endpoints

Base URL: `/files`

### 1. Upload Files
**POST** `/files/upload`

Upload single or multiple files with automatic validation and cleanup.

**Request:**
- Content-Type: `multipart/form-data`
- Body: One or more file fields

**Response (Success):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "files": [
    {
      "filename": "1718197200000-document.pdf",
      "mimetype": "application/pdf"
    }
  ]
}
```

**Response (File Too Large):**
```json
{
  "error": "File too large",
  "message": "Maximum file size is 10MB"
}
```
- **HTTP Status**: 413 (Payload Too Large)
- **Note**: Temp files are automatically deleted

### 2. Download File
**GET** `/files/download/:filename`

Download a file by filename.

**Parameters:**
- `filename` (path parameter): The filename to download

**Response:**
- Content-Type: `application/octet-stream`
- Content-Disposition: `attachment; filename="..."`
- Body: File stream

### 3. List Files
**GET** `/files/list`

Get a list of all uploaded files with their metadata.

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "filename": "1718197200000-example.pdf",
      "size": 12345,
      "created": "2026-06-12T10:30:00.000Z"
    }
  ]
}
```

### 4. Delete File
**DELETE** `/files/:filename`

Delete a file by filename.

**Parameters:**
- `filename` (path parameter): The filename to delete

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## Configuration

File upload limits are configured in `src/index.ts`:

```typescript
server.register(multipart, {
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
        files: 10 // Max 10 files per request
    }
});
```

## Usage Examples

### Using cURL

**Upload a file:**
```bash
curl -X POST http://localhost:3001/files/upload \
  -F "file=@/path/to/your/file.pdf"
```

**Upload multiple files:**
```bash
curl -X POST http://localhost:3001/files/upload \
  -F "file1=@/path/to/file1.pdf" \
  -F "file2=@/path/to/file2.txt"
```

**Download a file:**
```bash
curl -X GET http://localhost:3001/files/download/1718197200000-example.pdf \
  -o downloaded-file.pdf
```

**List all files:**
```bash
curl -X GET http://localhost:3001/files/list
```

**Delete a file:**
```bash
curl -X DELETE http://localhost:3001/files/1718197200000-example.pdf
```

### Using JavaScript/TypeScript

```typescript
// Upload a file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:3001/files/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);

// Download a file
const downloadResponse = await fetch(
  `http://localhost:3001/files/download/${filename}`
);
const blob = await downloadResponse.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
a.click();
```

## Error Handling

All endpoints return structured error responses:

```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

Common error codes:
- **400**: Bad request (no file uploaded, invalid parameters)
- **404**: File not found
- **413**: File too large (exceeds configured limit)
- **500**: Server error (file system issues, etc.)

## Temporary File Cleanup

The system automatically cleans up temporary files in these scenarios:

1. **Size Limit Exceeded**: Temp file deleted immediately
2. **Upload Error**: All temp files in the batch are deleted
3. **Move Failure**: Temp files are deleted if permanent move fails

**Note**: The temp directory is automatically managed - no manual cleanup needed.

## Future Integration

These uploaded files can be:
1. Processed and sent to a RAG (Retrieval-Augmented Generation) system
2. Automatically deleted after processing using the DELETE endpoint
3. Used for document analysis and indexing

## Utilities

The `file.utils.ts` module provides reusable functions:

**Temporary File Operations:**
- `saveFileToTemp(file)`: Save uploaded file to temp directory
- `moveFromTempToPermanent(filename)`: Move validated file to permanent storage
- `deleteTempFile(filename)`: Delete temp file

**Permanent File Operations:**
- `ensureUploadDir()`: Create upload directories if they don't exist
- `getFilePath(filename)`: Get full path to a permanent file
- `fileExists(filename)`: Check if a permanent file exists
- `deleteFile(filename)`: Delete a permanent file
- `listFiles()`: List all permanent files
- `getFileStats(filename)`: Get file size and creation date
