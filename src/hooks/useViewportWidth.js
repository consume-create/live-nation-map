import { useState, useEffect } from 'react'
import { BREAKPOINTS } from '../constants/theme'

/**
 * Custom hook to track viewport width with resize listener
 * @param {number} defaultWidth - Default width for SSR (default: 1440)
 * @returns {number} Current viewport width
 */
export function useViewportWidth(defaultWidth = BREAKPOINTS.DEFAULT_WIDTH) {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? defaultWidth : window.innerWidth
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return width
}

/**
 * Hook to check if viewport is mobile
 * @returns {boolean} True if viewport width < MOBILE breakpoint
 */
export function useIsMobile() {
  const width = useViewportWidth()
  return width < BREAKPOINTS.MOBILE
}
