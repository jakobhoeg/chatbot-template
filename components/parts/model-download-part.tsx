import { type ModelDownloadProgressPart } from "@/tools"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"

export function ModelDownloadPart({
  part,
}: {
  part: ModelDownloadProgressPart
}) {
  const { status, progress, message } = part.data

  // Nothing to say once the download is done.
  if (status === "complete") return null

  if (status === "error") {
    return (
      <Alert variant="destructive">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Progress value={progress ?? null} className="max-w-sm px-1.5">
      <ProgressLabel className="flex items-center gap-2 font-normal text-muted-foreground">
        <Spinner />
        {message}
      </ProgressLabel>
      <ProgressValue />
    </Progress>
  )
}
