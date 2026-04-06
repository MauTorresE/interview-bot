'use client'

import { INTERVIEWER_STYLES } from '@/lib/constants/campaign'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type StyleToggleProps = {
  selectedStyle: string
  onStyleChange: (style: string) => void
}

export function StyleToggle({ selectedStyle, onStyleChange }: StyleToggleProps) {
  const description = INTERVIEWER_STYLES.find(
    (s) => s.value === selectedStyle
  )?.description

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        value={[selectedStyle]}
        onValueChange={(newValue: (string | number)[]) => {
          // Enforce single-select: pick the newly added value
          const added = newValue.find((v) => String(v) !== selectedStyle)
          if (added) {
            onStyleChange(String(added))
          }
        }}
        className="flex flex-wrap gap-2"
      >
        {INTERVIEWER_STYLES.map((style) => (
          <ToggleGroupItem
            key={style.value}
            value={style.value}
            className="bg-muted/50 text-muted-foreground data-pressed:bg-primary data-pressed:text-primary-foreground"
          >
            {style.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
