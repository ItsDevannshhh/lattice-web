# LatticeViewer — Interface Agreement

**Owner:** Teammate C

## Contract

The frontend always imports `LatticeViewer` through:

```tsx
const LatticeViewer = React.lazy(() => import('@/components/LatticeViewer'))
```

This keeps `three.js` out of the main bundle until the viewer is needed.

## Props

See `types.ts` for the full `LatticeViewerProps` interface.

- **`lattice`**: The exact API contract shape (`octant27` format). The viewer is responsible for mirroring about x=0, y=0, z=0 to get the full cell from [-1,1]³, merging coincident struts, and tiling by shifting 2 units per axis.
- **`tiles`**: Number of cells per side (1–5), default 1.
- **`variant`**: `'thumbnail'` (non-interactive, cheap, many can mount at once) or `'full'` (orbit, zoom).
- **`renderMode`**: `'solid'` (default) or `'wireframe'`.
- **`colorByAxis`**: When true, colour struts by their dominant axis direction (x=red, y=green, z=blue).
- **`className`**: The parent sizes the container; the viewer fills 100% width/height.

## Responsibilities

| Concern                                          | Owner                      |
| ------------------------------------------------ | -------------------------- |
| Tile count, render mode, color-by-axis controls  | Frontend (passed as props) |
| Orbit, zoom, camera                              | Viewer (teammate C)        |
| Mirroring, merging, tiling the octant27 data     | Viewer                     |
| Optional `showControls` prop for viewer-owned UI | Viewer (stretch)           |

## Performance Notes

Many thumbnail viewers may mount simultaneously in the results grid. Avoid creating a separate heavy WebGL context per card — consider a shared canvas, instanced rendering, or fallback to the SVG placeholder for thumbnails.
