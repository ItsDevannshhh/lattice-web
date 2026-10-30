import type { Candidate } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useClipboard } from '@/hooks/useClipboard'
import { buildStl } from '@/lib/stl'
import { Copy, Download } from 'lucide-react'
import { toast } from 'sonner'

interface DownloadMenuProps {
  candidate: Candidate
  tiles: number
}

export function DownloadMenu({ candidate, tiles }: DownloadMenuProps) {
  const { copy } = useClipboard()

  const handleDownloadStl = async () => {
    try {
      const tilesArr: [number, number, number] = [tiles, tiles, tiles]
      const blob = await buildStl(candidate.lattice, {
        tiles: tilesArr,
        filename: `${candidate.id}.stl`,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${candidate.id}.stl`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.info('STL export is being finished by the viewer module')
    }
  }

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(candidate, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${candidate.id}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Design JSON downloaded')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleDownloadStl}>Download STL</DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadJson}>Download design JSON</DropdownMenuItem>
        <DropdownMenuItem onClick={() => copy(candidate.id, 'Design ID copied')}>
          <Copy className="h-3.5 w-3.5" />
          Copy design ID
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
