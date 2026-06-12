"use client"

import * as React from "react"
import { Upload as UploadIcon, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { uploadFiles } from "@/lib/api/services/files.service"
import { ApiError } from "@/lib/api/client"

export default function UploadPage() {
  const [files, setFiles] = React.useState<File[]>([])
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }

  const addFiles = (newFiles: File[]) => {
    setMessage(null)
    const validFiles = newFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: "error", text: `File ${file.name} is too large. Maximum size is 10MB.` })
        return false
      }
      return true
    })

    setFiles(prev => {
      const combined = [...prev, ...validFiles]
      if (combined.length > 10) {
        setMessage({ type: "error", text: "Maximum 10 files allowed" })
        return combined.slice(0, 10)
      }
      return combined
    })
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setMessage(null)
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage({ type: "error", text: "Please select at least one file" })
      return
    }

    setUploading(true)
    setProgress(0)
    setMessage(null)

    try {
      setProgress(30)
      
      // Using the files service
      const data = await uploadFiles(files)
      
      setProgress(100)
      setMessage({ type: "success", text: data.message || "Files uploaded successfully" })
      setFiles([])
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage({
          type: "error",
          text: error.message
        })
      } else {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Failed to upload files"
        })
      }
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload Files</h1>
        <p className="mt-2 text-muted-foreground">
          Upload your documents for processing. Max 10MB per file, 10 files max.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Files</CardTitle>
          <CardDescription>
            Drag and drop files here or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Click to upload</span> or drag and drop
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOC, TXT or any file type (max 10MB per file)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Selected Files ({files.length}/10)</h3>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(index)
                      }}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="text-foreground font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              <AlertTitle>{message.type === "error" ? "Error" : "Success"}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="flex-1"
            >
              <UploadIcon className="mr-2 h-4 w-4" />
              Upload {files.length > 0 ? `${files.length} File${files.length > 1 ? "s" : ""}` : "Files"}
            </Button>
            {files.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setFiles([])
                  setMessage(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                  }
                }}
                disabled={uploading}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


