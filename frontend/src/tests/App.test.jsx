import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders hello world message', () => {
    render(<App />)
    expect(screen.getByText(/Hello World - React App Loaded!/i)).toBeInTheDocument()
  })

  it('displays fountain processor component', () => {
    render(<App />)
    expect(screen.getByText(/Fountain Text Processor/i)).toBeInTheDocument()
  })
})