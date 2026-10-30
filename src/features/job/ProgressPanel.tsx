import { Progress } from '@/components/ui/progress'

interface ProgressPanelProps {
  progress: number
  message: string
}

export function ProgressPanel({ progress, message }: ProgressPanelProps) {
  return (
    <div className="space-y-3">
      <Progress value={progress} showLabel />
      <p className="text-muted text-sm" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
