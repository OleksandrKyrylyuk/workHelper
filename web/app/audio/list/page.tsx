import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from "lucide-react"

export default function AudioListPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audio Files List</CardTitle>
          <CardDescription>
            View and manage your uploaded audio files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Coming Soon
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              The audio files list feature will be implemented in a future update.
              You'll be able to view, download, and manage your uploaded audio files here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
