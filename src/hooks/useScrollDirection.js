import { useEffect, useState } from 'react'

export default function useScrollDirection(threshold = 40) {
  const [direction, setDirection] = useState('up')

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    let lastY = window.scrollY || 0
    let ticking = false

    const update = () => {
      const currentY = window.scrollY || 0
      const delta = currentY - lastY
      if (Math.abs(delta) > threshold) {
        setDirection(delta > 0 ? 'down' : 'up')
        lastY = currentY
      }
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return direction
}
