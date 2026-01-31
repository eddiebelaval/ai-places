'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseFocusTrapOptions {
  isActive: boolean
  onEscape?: () => void
}

/**
 * Hook to trap focus within a container (for modals, dialogs, etc.)
 */
export function useFocusTrap<T extends HTMLElement>({
  isActive,
  onEscape,
}: UseFocusTrapOptions) {
  const containerRef = useRef<T>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Get all focusable elements within container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []

    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    )
  }, [])

  useEffect(() => {
    if (!isActive) return

    // Store currently focused element to restore later
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault()
        onEscape()
        return
      }

      // Handle Tab key for focus trapping
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift+Tab on first element -> go to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
        return
      }

      // Tab on last element -> go to first
      if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus when trap is deactivated
      previousActiveElement.current?.focus()
    }
  }, [isActive, onEscape, getFocusableElements])

  return containerRef
}
