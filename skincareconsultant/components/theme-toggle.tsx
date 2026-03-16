'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ThemeToggleProps = {
  size?: 'icon' | 'sm'
  className?: string
}

export function ThemeToggle({ size = 'icon', className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = theme === 'dark'

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size}
        className={cn('relative', className)}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={handleToggle}
      className={cn('relative', className)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          isDark ? '-translate-y-4 opacity-0' : 'translate-y-0 opacity-100',
        )}
        aria-hidden="true"
      />
      <Moon
        className={cn(
          'absolute h-4 w-4 transition-transform duration-200',
          isDark ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        )}
        aria-hidden="true"
      />
    </Button>
  )
}

