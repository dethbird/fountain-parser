import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders editor heading', () => {
    render(<App />)
    expect(screen.getByText(/Editor/i)).toBeInTheDocument()
  })

  it('renders preview heading', () => {
    render(<App />)
    expect(screen.getByText(/Live Preview/i)).toBeInTheDocument()
  })

  // Keep tests focused on stable UI headings rather than sample content
})