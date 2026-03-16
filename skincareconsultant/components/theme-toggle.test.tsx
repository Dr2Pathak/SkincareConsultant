import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useTheme } from 'next-themes'
import { ThemeToggle } from './theme-toggle'

vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}))

describe('ThemeToggle', () => {
  it('renders and toggles between light and dark', () => {
    const mockSetTheme = vi.fn()
    ;(useTheme as unknown as { mockReturnValue: (value: unknown) => void }).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
    })

    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /switch to dark mode/i })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })
})

