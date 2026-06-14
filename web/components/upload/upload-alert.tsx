import * as React from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface UploadAlertProps {
  type: "success" | "error"
  message: string
  className?: string
}

export function UploadAlert({ type, message, className }: UploadAlertProps) {
  return (
    <Alert
      variant={type === "error" ? "destructive" : "default"}
      className={className}
    >
      <AlertTitle>{type === "error" ? "Error" : "Success"}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

