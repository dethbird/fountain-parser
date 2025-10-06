import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders editor heading', () => {
    render(<App />)
    const matches = screen.getAllByText(/Editor/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('renders preview heading', () => {
    render(<App />)
    const matches = screen.getAllByText(/Live Preview/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  // Keep tests focused on stable UI headings rather than sample content
})