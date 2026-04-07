'use client'

type MicLevelMeterProps = {
  volume: number // 0-1 from useTrackVolume
}

export function MicLevelMeter({ volume }: MicLevelMeterProps) {
  const detected = volume > 0.01

  return (
    <div className="flex flex-col gap-2">
      <div className="h-2 w-full rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-[#22c55e] transition-[width] duration-[50ms]"
          style={{ width: `${Math.min(volume * 100, 100)}%` }}
        />
      </div>
      <p
        className={`text-xs font-semibold ${
          detected ? 'text-[#22c55e]' : 'text-destructive'
        }`}
      >
        {detected
          ? 'Audio detectado'
          : 'No se detecta audio. Verifica tu microfono.'}
      </p>
    </div>
  )
}
