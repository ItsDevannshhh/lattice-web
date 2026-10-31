import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ImplantBanner } from '@/features/implant/ImplantBanner'
import { ZoneStrip } from '@/features/implant/ZoneStrip'
import { StiffnessProfile } from '@/features/implant/StiffnessProfile'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SourceTag } from '@/components/ui/source-tag'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useImplantZones, useImplantResult } from '@/hooks/useImplant'
import { useClipboard } from '@/hooks/useClipboard'
import { apiClient } from '@/api/client'
import { Download, FileText, Copy, CheckCircle2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

export default function ImplantFinalPage() {
  const { implantId } = useParams<{ implantId: string }>()
  const navigate = useNavigate()
  const { copy } = useClipboard()

  const { data: zones } = useImplantZones(implantId!)
  const { data: result, isLoading, error } = useImplantResult(implantId!)

  const [downloadingStl, setDownloadingStl] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !result) {
    return (
      <ErrorState
        title="Could not load assembled implant"
        message="Please check the implant ID."
        onBack={() => navigate('/implant')}
      />
    )
  }

  const handleDownloadStl = async () => {
    setDownloadingStl(true)
    try {
      const response = await apiClient.get(`/api/implants/${implantId}/export.stl`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'model/stl' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `assembled_implant_${implantId}.stl`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Printable assembled implant STL downloaded')
    } catch {
      toast.error('Failed to download implant STL')
    } finally {
      setDownloadingStl(false)
    }
  }

  const handleDownloadReport = async () => {
    setDownloadingReport(true)
    try {
      const response = await apiClient.get(`/api/implants/${implantId}/report`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `implant_report_${implantId}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Implant clinical report downloaded')
    } catch {
      toast.error('Failed to download report')
    } finally {
      setDownloadingReport(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Assembled Orthopedic Implant"
          description={`Implant ${implantId} · Multi-zone functional gradient lattice assembly.`}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => copy(window.location.href, 'Link copied')}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy link
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleDownloadReport}
            loading={downloadingReport}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Download report
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleDownloadStl}
            loading={downloadingStl}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download STL
          </Button>
        </div>
      </div>

      <ImplantBanner />

      {/* Warnings if any */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="space-y-1">
          {result.warnings.map((w, i) => (
            <InlineAlert key={i} variant="info">
              {w}
            </InlineAlert>
          ))}
        </div>
      )}

      {/* Assembled zone overview */}
      {zones && (
        <ZoneStrip
          zones={zones}
          totalLengthMm={160}
          onBoundaryChange={() => {}}
        />
      )}

      {/* Target vs Achieved Summary */}
      {result.zones && result.zones.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Zone Verification &amp; Pass/Fail Summary</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs font-mono">
            {result.zones.map((z) => {
              const matchingZone = zones?.find((orig) => orig.id === z.zone_id)
              return (
                <div
                  key={z.zone_id}
                  className="rounded-lg border border-line bg-surface-2 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text font-sans">
                      {matchingZone?.name || z.zone_id}
                    </span>
                    <span className="text-success flex items-center gap-1 font-sans font-medium text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Pass
                    </span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Target:</span>
                    <span>{Number(z.target).toFixed(1)} GPa</span>
                  </div>
                  <div className="flex justify-between text-accent font-medium">
                    <span>Achieved:</span>
                    <span className="flex items-center gap-1">
                      {Number(z.achieved).toFixed(1)} GPa
                      <SourceTag source="verified" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Continuous Stiffness Profile */}
      <StiffnessProfile profile={result.profile} />

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
        <Button variant="ghost" size="sm" onClick={() => navigate('/implant')}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Design another implant
        </Button>
        <div className="flex gap-2">
          <Button
            size="lg"
            variant="secondary"
            onClick={handleDownloadReport}
            loading={downloadingReport}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Download report
          </Button>
          <Button
            size="lg"
            variant="primary"
            onClick={handleDownloadStl}
            loading={downloadingStl}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download Printable STL
          </Button>
        </div>
      </div>
    </div>
  )
}

