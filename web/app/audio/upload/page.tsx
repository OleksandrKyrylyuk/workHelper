"use client"

import * as React from "react"
import { Upload as UploadIcon, X, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { uploadAudio, type AnalysisType, ANALYSIS_TYPE_LABELS } from "@/lib/api/services/audio.service"
import { ApiError } from "@/lib/api/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

export default function AudioUploadPage() {
  const [file, setFile] = React.useState<File | null>(null)
  const [analysisType, setAnalysisType] = React.useState<AnalysisType | "">("")
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
    if (droppedFiles.length > 0) {
      addFile(droppedFiles[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFile(e.target.files[0])
    }
  }

  const addFile = (newFile: File) => {
    setMessage(null)

    // Validate file type (must be audio)
    if (!newFile.type.startsWith('audio/')) {
      setMessage({ type: "error", text: "Please select an audio file (mp3, wav, ogg, etc.)" })
      return
    }

    // Validate file size (max 100MB)
    if (newFile.size > 100 * 1024 * 1024) {
      setMessage({ type: "error", text: "File is too large. Maximum size is 100MB." })
      return
    }

    setFile(newFile)
  }

  const removeFile = () => {
    setFile(null)
    setMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: "error", text: "Please select an audio file" })
      return
    }

    if (!analysisType) {
      setMessage({ type: "error", text: "Please select an analysis type" })
      return
    }

    setUploading(true)
    setProgress(0)
    setMessage(null)

    try {
      setProgress(30)
      
      await uploadAudio(file, analysisType)
      
      setProgress(100)
      setMessage({ type: "success", text: "Audio file uploaded successfully" })
      setFile(null)
      
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
          text: error instanceof Error ? error.message : "Failed to upload audio file"
        })
      }
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Audio File</CardTitle>
          <CardDescription>
            Upload one audio file at a time. Maximum size 100MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="analysis-type">
              Analysis Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={analysisType}
              onValueChange={(value) => setAnalysisType(value as AnalysisType)}
              disabled={uploading}
            >
              <SelectTrigger id="analysis-type">
                <SelectValue placeholder="Select analysis type…" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ANALYSIS_TYPE_LABELS) as [AnalysisType, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Music className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Click to upload</span> or drag and drop
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Audio files only (MP3, WAV, OGG, M4A, FLAC, etc.) - max 100MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileInput}
            className="hidden"
          />

          {file && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Selected file:</p>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Music className="h-4 w-4 text-muted-foreground shrink-0" />
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
                    removeFile()
                  }}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Uploading...</p>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!file || !analysisType || uploading}
              className="flex-1"
            >
              <UploadIcon className="mr-2 h-4 w-4" />
              Upload Audio
            </Button>
            {file && (
              <Button
                variant="outline"
                onClick={removeFile}
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
