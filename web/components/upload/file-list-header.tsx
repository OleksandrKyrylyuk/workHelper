import * as React from "react"

interface FileListHeaderProps {
  fileCount: number
  maxFiles?: number
  className?: string
}

export function FileListHeader({
  fileCount,
  maxFiles = 10,
  className
}: FileListHeaderProps) {
  return (
    <h3 className={className}>
      Selected Files ({fileCount}/{maxFiles})
    </h3>
  )
}

