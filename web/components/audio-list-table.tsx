"use client"

import * as React from "react"
import { Trash2, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { deleteAudio, downloadAudioText, downloadAnalysis } from "@/lib/api/services/audio.service"
import { useRouter } from "next/navigation"

export interface AudioRow {
  id: string
  filename: string
  size: number
  status: string
  contentType: string
  createdAt: string
  analysisS3Key?: string | null
}

interface AudioListTableProps {
  audios: AudioRow[]
}

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    analyzed: "default",
    analyzing: "secondary",
    transcribed: "default",
    transcribing: "secondary",
    uploaded: "secondary",
    uploading: "outline",
    failed: "destructive",
  }
  return (
    <Badge variant={variantMap[status] ?? "outline"}>
      {status}
    </Badge>
  )
}

export function AudioListTable({ audios }: AudioListTableProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = React.useState<string | null>(null)
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)
  const [downloadingAnalysisId, setDownloadingAnalysisId] = React.useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setLoadingId(id)
    try {
      await deleteAudio(id)
      router.refresh()
    } catch (err) {
      console.error("Failed to delete audio:", err)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDownload = async (id: string, filename: string) => {
    setDownloadingId(id)
    try {
      await downloadAudioText(id, filename)
    } catch (err) {
      console.error("Failed to download transcription:", err)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDownloadAnalysis = async (id: string, filename: string) => {
    setDownloadingAnalysisId(id)
    try {
      await downloadAnalysis(id, filename)
    } catch (err) {
      console.error("Failed to download analysis:", err)
    } finally {
      setDownloadingAnalysisId(null)
    }
  }

  if (audios.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No audio files uploaded yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Analysis</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {audios.map((audio) => (
          <TableRow key={audio.id}>
            <TableCell className="font-medium max-w-xs truncate">
              {audio.filename}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {(audio.size / 1024 / 1024).toFixed(2)} MB
            </TableCell>
            <TableCell>
              <StatusBadge status={audio.status} />
            </TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                disabled={audio.status !== "analyzed" || !audio.analysisS3Key || downloadingAnalysisId === audio.id}
                onClick={() => handleDownloadAnalysis(audio.id, audio.filename)}
                title="Download conversation analysis"
              >
                {downloadingAnalysisId === audio.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Analysis</span>
              </Button>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(audio.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!["transcribed", "analyzing", "analyzed"].includes(audio.status) || downloadingId === audio.id}
                  onClick={() => handleDownload(audio.id, audio.filename)}
                  title="Download transcription text"
                >
                  {downloadingId === audio.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="ml-1 hidden sm:inline">Download text</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={loadingId === audio.id}
                  onClick={() => handleDelete(audio.id)}
                  title="Delete audio"
                >
                  {loadingId === audio.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
