import { auth } from "@/lib/auth"
import { pool } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AudioListTable, type AudioRow } from "@/components/audio-list-table"

async function getAudios(userId: string): Promise<AudioRow[]> {
  const result = await pool.query<AudioRow>(
    `SELECT id, filename, size, status, content_type AS "contentType", created_at AS "createdAt",
            analysis_s3_key AS "analysisS3Key"
     FROM audio_files
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  )
  return result.rows
}

export default async function AudioListPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const audios = await getAudios(session.user.id)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audio Files</CardTitle>
          <CardDescription>
            Your uploaded audio files and their transcription status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AudioListTable audios={audios} />
        </CardContent>
      </Card>
    </div>
  )
}

