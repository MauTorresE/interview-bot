'use client'

type InterviewTimerProps = {
  elapsedSeconds: number
  targetSeconds: number
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function InterviewTimer({ elapsedSeconds, targetSeconds }: InterviewTimerProps) {
  return (
    <span className="font-mono text-sm text-muted-foreground">
      {formatTime(elapsedSeconds)} / {formatTime(targetSeconds)}
    </span>
  )
}
