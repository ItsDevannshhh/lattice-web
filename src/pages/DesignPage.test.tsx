import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
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

  it('selects the first material by itself, so the dataset hints can run', async () => {
    renderWithProviders(<DesignPage />)
    await waitFor(() => expect(screen.getAllByText('Ti-6Al-4V').length).toBeGreaterThan(0), { timeout: 3000 })
    expect(screen.queryByText('Choose a material')).not.toBeInTheDocument()
  })
})
