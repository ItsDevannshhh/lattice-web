import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import DesignPage from '@/pages/DesignPage'
import { renderWithProviders } from '@/test/utils'

describe('DesignPage', () => {
  it('renders without throwing or exceeding maximum update depth', async () => {
    renderWithProviders(<DesignPage />)
    expect(screen.getByText('Design a lattice')).toBeInTheDocument()
    expect(screen.getByText('Material')).toBeInTheDocument()
    expect(screen.getByText('Stiffness targets')).toBeInTheDocument()
    expect(screen.getByText('Strength targets')).toBeInTheDocument()
    expect(screen.getByText('Weight & part')).toBeInTheDocument()
  })
})

