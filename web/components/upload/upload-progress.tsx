import * as React from "react"
import { Progress } from "@/components/ui/progress"

interface UploadProgressProps {
  progress: number
  className?: string
}

export function UploadProgress({ progress, className }: UploadProgressProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Uploading...</span>
        <span className="text-foreground font-medium">{progress}%</span>
      </div>
      <Progress value={progress} />
    </div>
  )
}

