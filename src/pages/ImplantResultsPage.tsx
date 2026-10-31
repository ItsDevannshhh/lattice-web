import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ImplantBanner } from '@/features/implant/ImplantBanner'
import { CandidateCard } from '@/features/results/CandidateCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useImplantZones, useZoneCandidates, useAssembleImplant } from '@/hooks/useImplant'
import { Layers, CheckCircle2, ShieldCheck, Box } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'

export default function ImplantResultsPage() {
  const { implantId } = useParams<{ implantId: string }>()
  const navigate = useNavigate()

  const { data: zones, isLoading: zonesLoading, error: zonesError } = useImplantZones(implantId!)
  const [selectedZoneIdx, setSelectedZoneIdx] = useState(0)
  const [choices, setChoices] = useState<Record<string, string>>({})

  const currentZone = zones?.[selectedZoneIdx]
  const isLatticeZone = currentZone?.kind === 'lattice'

  const {
    data: candidatesData,
    isLoading: candLoading,
  } = useZoneCandidates(implantId!, currentZone?.id ?? '')

  const assembleMutation = useAssembleImplant(implantId!)

  if (zonesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (zonesError || !zones) {
    return (
      <ErrorState
        title="Could not load implant results"
        message="Please check the implant ID."
        onBack={() => navigate('/implant')}
      />
    )
  }

  const latticeZones = zones.filter((z) => z.kind === 'lattice')
  const allLatticeZonesSelected =
    latticeZones.length > 0 && latticeZones.every((z) => Boolean(choices[z.id]))

  const handleSelectCandidate = (candidateId: string) => {
    if (!currentZone) return
    setChoices({ ...choices, [currentZone.id]: candidateId })
    toast.success(`Selected design for ${currentZone.name || currentZone.id}`)
  }

  const handleAssemble = () => {
    assembleMutation.mutate(choices, {
      onSuccess: () => {
        toast.success('Assembly job completed successfully!')
        navigate(`/implant/${implantId}/result`)
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to assemble implant')
      },
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Select Lattice Candidates per Zone"
          description={`Implant ${implantId} · Review solver-verified lattice designs for each zone.`}
        />
        <Button
          size="lg"
          onClick={handleAssemble}
          disabled={!allLatticeZonesSelected || assembleMutation.isPending}
          loading={assembleMutation.isPending}
        >
          <Layers className="mr-1.5 h-4 w-4" />
          Assemble Full Implant ({Object.keys(choices).length}/{latticeZones.length} selected)
        </Button>
      </div>

      <ImplantBanner />

      {/* Zone selection tabs */}
      <div className="flex gap-2 border-b border-line pb-2 overflow-x-auto">
        {zones.map((zone, idx) => {
          const isSelected = selectedZoneIdx === idx
          const hasChoice = Boolean(choices[zone.id])
          const isLattice = zone.kind === 'lattice'

          return (
            <button
              key={zone.id}
              onClick={() => setSelectedZoneIdx(idx)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors shrink-0',
                isSelected
                  ? 'bg-accent text-accent-fg'
                  : 'bg-surface hover:bg-surface-2 text-muted hover:text-text border border-line',
              )}
            >
              <span>{zone.name || `Zone ${idx + 1}`}</span>
              {isLattice ? (
                hasChoice ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Badge variant="neutral" className="text-[10px] px-1 py-0">
                    pending
                  </Badge>
                )
              ) : (
                <Badge variant="neutral" className="text-[10px] px-1 py-0">
                  solid
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Active zone content */}
      {currentZone && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-4">
            <div>
              <h3 className="text-sm font-semibold text-text">
                {currentZone.name || currentZone.id} ({currentZone.range_mm[0]}–{currentZone.range_mm[1]} mm)
              </h3>
              <p className="text-xs text-muted">
                Thickness: {currentZone.thickness_mm} mm &middot; Area: {currentZone.area_mm2.toFixed(0)} mm² &middot; Stress: {currentZone.stress_mpa.toFixed(1)} MPa
              </p>
            </div>
            {isLatticeZone && candidatesData?.grid && (
              <div className="flex items-center gap-2 text-xs font-mono text-muted">
                <Box className="h-4 w-4 text-accent" />
                <span>
                  Grid: {candidatesData.grid.cells.join('&times;')} cells ({candidatesData.grid.cell_mm} mm cell)
                </span>
              </div>
            )}
          </div>

          {!isLatticeZone ? (
            <div className="rounded-xl border border-line bg-surface p-8 text-center space-y-2">
              <ShieldCheck className="h-8 w-8 text-accent mx-auto" />
              <h4 className="text-sm font-semibold text-text">This section will be printed solid</h4>
              <p className="text-xs text-muted max-w-md mx-auto">
                {currentZone.reason || 'Designated solid for high stress or fatigue resistance requirements.'}
              </p>
            </div>
          ) : candLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          ) : candidatesData && candidatesData.candidates.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {candidatesData.candidates.map((cand) => {
                const isPicked = choices[currentZone.id] === cand.id

                return (
                  <div
                    key={cand.id}
                    className={cn(
                      'relative rounded-xl border transition-all flex flex-col justify-between overflow-hidden',
                      isPicked
                        ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-bg'
                        : 'border-line',
                    )}
                  >
                    <CandidateCard candidate={cand} jobId={`zone_${currentZone.id}`} request={null} />
                    <div className="p-3 bg-surface border-t border-line">
                      <Button
                        type="button"
                        size="sm"
                        variant={isPicked ? 'primary' : 'outline'}
                        className="w-full text-xs"
                        onClick={() => handleSelectCandidate(cand.id)}
                      >
                        {isPicked ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Selected for Zone
                          </>
                        ) : (
                          'Select this candidate'
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">No candidates found for this zone.</p>
          )}
        </div>
      )}

      {/* Assemble Action Bar */}
      <div className="flex justify-between items-center pt-4 border-t border-line">
        <span className="text-xs text-muted font-mono">
          {Object.keys(choices).length} of {latticeZones.length} lattice zones selected
        </span>
        <Button
          size="lg"
          onClick={handleAssemble}
          disabled={!allLatticeZonesSelected || assembleMutation.isPending}
          loading={assembleMutation.isPending}
          className="min-w-[180px]"
        >
          <Layers className="mr-1.5 h-4 w-4" />
          Assemble Implant
        </Button>
      </div>
    </div>
  )
}

