import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ImplantBanner } from '@/features/implant/ImplantBanner'
import { ZoneStrip } from '@/features/implant/ZoneStrip'
import { ZoneTable } from '@/features/implant/ZoneTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useImplantZones, useSearchImplantZones } from '@/hooks/useImplant'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import type { Zone } from '@/api/implantTypes'

export default function ImplantZonesPage() {
  const { implantId } = useParams<{ implantId: string }>()
  const navigate = useNavigate()

  const { data: zones, isLoading, error, updateZones, isUpdating } = useImplantZones(implantId!)
  const searchMutation = useSearchImplantZones(implantId!)

  const [activeZoneId, setActiveZoneId] = useState<string | undefined>()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !zones) {
    return (
      <ErrorState
        title="Could not load implant zones"
        message="The implant data may have expired or is invalid."
        onBack={() => navigate('/implant')}
        backLabel="Back to implant upload"
      />
    )
  }

  const handleBoundaryChange = (idx: number, newBoundaryMm: number) => {
    const updated = [...zones]
    // Zone idx ends at newBoundaryMm; zone idx + 1 starts at newBoundaryMm
    updated[idx] = {
      ...updated[idx],
      range_mm: [updated[idx].range_mm[0], newBoundaryMm],
      thickness_mm: newBoundaryMm - updated[idx].range_mm[0],
    }
    updated[idx + 1] = {
      ...updated[idx + 1],
      range_mm: [newBoundaryMm, updated[idx + 1].range_mm[1]],
      thickness_mm: updated[idx + 1].range_mm[1] - newBoundaryMm,
    }
    updateZones(updated)
  }

  const handleUpdateZone = (idx: number, updatedZone: Zone) => {
    const next = [...zones]
    next[idx] = updatedZone
    updateZones(next)
  }

  const handleSearchAll = () => {
    searchMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Initiated lattice searches for all zones.')
        navigate(`/implant/${implantId}/results`)
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to start zone searches')
      },
    })
  }

  const latticeZonesCount = zones.filter((z) => z.kind === 'lattice').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Zoning &amp; Target Optimization"
          description={`Implant ${implantId} · Divide stem into axial biomechanical zones.`}
        />
        <Button
          size="lg"
          onClick={handleSearchAll}
          disabled={searchMutation.isPending || isUpdating || latticeZonesCount === 0}
          loading={searchMutation.isPending}
        >
          <Search className="mr-1.5 h-4 w-4" />
          Search lattices for all zones ({latticeZonesCount})
        </Button>
      </div>

      <ImplantBanner />

      {/* 1D Zone Strip Visualization & Controls */}
      <ZoneStrip
        zones={zones}
        totalLengthMm={160}
        onBoundaryChange={handleBoundaryChange}
        activeZoneId={activeZoneId}
        onSelectZone={setActiveZoneId}
      />

      {/* Zone Table */}
      <ZoneTable
        zones={zones}
        onUpdateZone={handleUpdateZone}
        activeZoneId={activeZoneId}
      />

      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          onClick={handleSearchAll}
          disabled={searchMutation.isPending || isUpdating || latticeZonesCount === 0}
          loading={searchMutation.isPending}
          className="min-w-[200px]"
        >
          <Search className="mr-1.5 h-4 w-4" />
          Search lattices for all zones
        </Button>
      </div>
    </div>
  )
}
