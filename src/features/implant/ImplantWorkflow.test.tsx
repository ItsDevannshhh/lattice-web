import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import { ImplantBanner } from '@/features/implant/ImplantBanner'
import { ZoneStrip } from '@/features/implant/ZoneStrip'
import { StiffnessProfile } from '@/features/implant/StiffnessProfile'
import type { Zone } from '@/api/implantTypes'

describe('Implant Workflow Components', () => {
  it('renders clinical disclaimer banner with required safety text', () => {
    renderWithProviders(<ImplantBanner />)
    expect(
      screen.getByText(/Medical & Clinical Disclaimer: Design aid only/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/physical printing and biomechanical testing are required/i),
    ).toBeInTheDocument()
  })

  it('renders ZoneStrip schematic with zone badges, sliders, and mm ranges', () => {
    const mockZones: Zone[] = [
      {
        id: 'z1',
        name: 'Proximal Metaphysis',
        range_mm: [0, 45],
        thickness_mm: 12,
        area_mm2: 450,
        stress_mpa: 25,
        kind: 'lattice',
        requirement: {
          stiffness_gpa: {
            x: { value: 6.0, source: 'automatic' },
            y: { value: 6.0, source: 'automatic' },
            z: { value: 8.5, source: 'automatic' },
          },
          strength_mpa: {
            x: { value: 80, source: 'automatic' },
            y: { value: 80, source: 'automatic' },
            z: { value: 110, source: 'automatic' },
          },
        },
      },
      {
        id: 'z2',
        name: 'Diaphyseal Stem',
        range_mm: [45, 140],
        thickness_mm: 16,
        area_mm2: 520,
        stress_mpa: 45,
        kind: 'lattice',
        requirement: {
          stiffness_gpa: {
            x: { value: 12.0, source: 'automatic' },
            y: { value: 12.0, source: 'automatic' },
            z: { value: 18.0, source: 'automatic' },
          },
          strength_mpa: {
            x: { value: 140, source: 'automatic' },
            y: { value: 140, source: 'automatic' },
            z: { value: 190, source: 'automatic' },
          },
        },
      },
    ]

    renderWithProviders(
      <ZoneStrip zones={mockZones} onBoundaryChange={() => {}} />,
    )

    expect(screen.getByText('Proximal Metaphysis')).toBeInTheDocument()
    expect(screen.getByText('Diaphyseal Stem')).toBeInTheDocument()
    expect(screen.getByText(/0–45\s*mm/)).toBeInTheDocument()
    expect(screen.getByText(/45–140\s*mm/)).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('renders StiffnessProfile SVG chart and accessible data table', () => {
    const profile = [
      { position_mm: 0, stiffness_gpa: 8.2, target_gpa: 8.0 },
      { position_mm: 45, stiffness_gpa: 12.1, target_gpa: 12.0 },
      { position_mm: 90, stiffness_gpa: 16.5, target_gpa: 16.0 },
      { position_mm: 140, stiffness_gpa: 18.2, target_gpa: 18.0 },
    ]

    renderWithProviders(<StiffnessProfile profile={profile} />)

    expect(screen.getByText('Axial Stiffness Profile (GPa vs mm)')).toBeInTheDocument()
    expect(
      screen.getByText(/Continuous stiffness gradient along implant length/i),
    ).toBeInTheDocument()

    // Accessible table for screen readers
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Implant stiffness along length')).toBeInTheDocument()
    expect(screen.getByText('8.2')).toBeInTheDocument()
    expect(screen.getByText('18.2')).toBeInTheDocument()
  })
})
