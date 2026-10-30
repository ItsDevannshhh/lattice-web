import type { LatticeViewerProps } from '@/components/LatticeViewer/types'
import { LatticePlaceholder } from '@/components/LatticeViewer/LatticePlaceholder'
import { LatticeScene } from '@/components/LatticeViewer/LatticeScene'

export default function LatticeViewer({
  lattice,
  variant = 'thumbnail',
  tiles = 1,
  renderMode = 'solid',
  colorByAxis = false,
  className,
}: LatticeViewerProps) {
  if (variant === 'thumbnail') {
    return (
      <LatticePlaceholder
        lattice={lattice}
        variant="thumbnail"
        className={className}
        colorByAxis={colorByAxis}
      />
    )
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${className ?? ''}`}>
      <LatticeScene
        lattice={lattice}
        tiles={tiles}
        renderMode={renderMode}
        colorByAxis={colorByAxis}
      />
    </div>
  )
}
