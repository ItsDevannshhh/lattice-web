import type { Lattice } from '@/api/types'

export interface Strut3D {
  start: [number, number, number]
  end: [number, number, number]
  midpoint: [number, number, number]
  length: number
  direction: [number, number, number]
  dominantAxis: 'x' | 'y' | 'z'
}

export interface Node3D {
  position: [number, number, number]
}

export interface RebuiltLattice3D {
  struts: Strut3D[]
  nodes: Node3D[]
  bounds: {
    min: [number, number, number]
    max: [number, number, number]
    size: [number, number, number]
  }
  strutRadius: number
}

/**
 * Quantize a coordinate for deduplication keying
 */
function q(val: number): string {
  return val.toFixed(4)
}

/**
 * Deduplication key for an undirected strut between p1 and p2
 */
function strutKey(
  p1: [number, number, number],
  p2: [number, number, number],
): string {
  const k1 = `${q(p1[0])},${q(p1[1])},${q(p1[2])}`
  const k2 = `${q(p2[0])},${q(p2[1])},${q(p2[2])}`
  return k1 < k2 ? `${k1}_${k2}` : `${k2}_${k1}`
}

function nodeKey(p: [number, number, number]): string {
  return `${q(p[0])},${q(p[1])},${q(p[2])}`
}

/**
 * Rebuild full unit cell [-1, 1]³ from octant [0, 1]³ by mirroring across x=0, y=0, z=0,
 * and tile across N x N x N cells, deduplicating struts on symmetry planes and shared faces.
 */
export function buildTiledLattice(
  lattice: Lattice,
  tiles = 1,
): RebuiltLattice3D {
  const clampedTiles = Math.max(1, Math.min(5, Math.floor(tiles)))
  const octantNodes = lattice.nodes
  const octantEdges = lattice.edges

  // Octant signs (8 combinations)
  const signs: Array<[number, number, number]> = [
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1],
  ]

  const seenStruts = new Set<string>()
  const seenNodes = new Map<string, [number, number, number]>()
  const struts: Strut3D[] = []

  // Unit cell size in model units is 2 (spans [-1, 1])
  // Tiling offset step = 2
  // We center the whole assembly by subtracting (clampedTiles - 1)
  const centerOffset = clampedTiles - 1

  for (let tx = 0; tx < clampedTiles; tx++) {
    for (let ty = 0; ty < clampedTiles; ty++) {
      for (let tz = 0; tz < clampedTiles; tz++) {
        const shiftX = 2 * tx - centerOffset
        const shiftY = 2 * ty - centerOffset
        const shiftZ = 2 * tz - centerOffset

        // For each of the 8 octants
        for (const [sx, sy, sz] of signs) {
          for (const [i1, i2] of octantEdges) {
            const n1 = octantNodes[i1]
            const n2 = octantNodes[i2]
            if (!n1 || !n2) continue

            const p1: [number, number, number] = [
              sx * n1[0] + shiftX,
              sy * n1[1] + shiftY,
              sz * n1[2] + shiftZ,
            ]
            const p2: [number, number, number] = [
              sx * n2[0] + shiftX,
              sy * n2[1] + shiftY,
              sz * n2[2] + shiftZ,
            ]

            const key = strutKey(p1, p2)
            if (seenStruts.has(key)) continue
            seenStruts.add(key)

            // Register nodes
            const nk1 = nodeKey(p1)
            const nk2 = nodeKey(p2)
            if (!seenNodes.has(nk1)) seenNodes.set(nk1, p1)
            if (!seenNodes.has(nk2)) seenNodes.set(nk2, p2)

            // Calculate geometry
            const dx = p2[0] - p1[0]
            const dy = p2[1] - p1[1]
            const dz = p2[2] - p1[2]
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
            if (length < 1e-5) continue

            const adx = Math.abs(dx)
            const ady = Math.abs(dy)
            const adz = Math.abs(dz)

            let dominantAxis: 'x' | 'y' | 'z' = 'z'
            if (adx >= ady && adx >= adz) dominantAxis = 'x'
            else if (ady >= adx && ady >= adz) dominantAxis = 'y'

            struts.push({
              start: p1,
              end: p2,
              midpoint: [
                (p1[0] + p2[0]) / 2,
                (p1[1] + p2[1]) / 2,
                (p1[2] + p2[2]) / 2,
              ],
              length,
              direction: [dx / length, dy / length, dz / length],
              dominantAxis,
            })
          }
        }
      }
    }
  }

  const nodes: Node3D[] = Array.from(seenNodes.values()).map((position) => ({
    position,
  }))

  // Model-normalized strut radius:
  // 1 model unit corresponds to cell_size_mm / 2
  // radius_model = strut_radius_mm / (cell_size_mm / 2)
  const cellSize = lattice.cell_size_mm || 10
  const strutRadiusMm = lattice.strut_radius_mm || 0.3
  const strutRadius = Math.max(0.02, Math.min(0.25, (2 * strutRadiusMm) / cellSize))

  const minVal = -clampedTiles
  const maxVal = clampedTiles
  const sizeVal = 2 * clampedTiles

  return {
    struts,
    nodes,
    bounds: {
      min: [minVal, minVal, minVal],
      max: [maxVal, maxVal, maxVal],
      size: [sizeVal, sizeVal, sizeVal],
    },
    strutRadius,
  }
}

