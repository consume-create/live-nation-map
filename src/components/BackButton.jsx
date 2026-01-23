import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import useScrollDirection from '../hooks/useScrollDirection'
import { useViewportWidth } from '../hooks/useViewportWidth'
import { BREAKPOINTS, ANIMATIONS, Z_INDEX } from '../constants/theme'

export default function BackButton() {
  const navigate = useNavigate()
  const viewportWidth = useViewportWidth()
  const scrollDirection = useScrollDirection(40)
  const [headerHeight, setHeaderHeight] = useState(180)
  const measureRef = useRef(null)

  // Measure actual header height for responsive positioning
  useEffect(() => {
    const measureHeader = () => {
      const header = document.querySelector('header')
      if (header) {
        const rect = header.getBoundingClientRect()
        setHeaderHeight(rect.height)
      }
    }

    measureHeader()
    window.addEventListener('resize', measureHeader)

    // Re-measure after fonts load
    if (document.fonts?.ready) {
      document.fonts.ready.then(measureHeader)
    }

    return () => window.removeEventListener('resize', measureHeader)
  }, [viewportWidth])

  const isMobile = viewportWidth < BREAKPOINTS.MOBILE
  const hidden = scrollDirection === 'down'

  const handleClick = () => {
    navigate('/')
  }

  // When header visible: position directly below header
  // When header hidden: stay at top in header's space
  const buttonStyle = {
    position: 'fixed',
    top: hidden ? 32 : headerHeight + 16,
    left: isMobile ? 24 : 'clamp(24px, 5vw, 80px)',
    zIndex: Z_INDEX.BACK_BUTTON,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    transition: `top ${ANIMATIONS.SLOW} ease`,
  }

  const arrowStyle = {
    width: 20,
    height: 20,
    transform: 'scaleX(-1)',
    flexShrink: 0,
  }

  const textContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  }

  const backTextStyle = {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#fff',
    margin: 0,
    lineHeight: 1.3,
  }

  const subTextStyle = {
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'uppercase',
    color: '#ccc',
    margin: 0,
    lineHeight: 1.3,
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={buttonStyle}
      aria-label="Go back to see all venues"
    >
      <img
        src="/map/images/ln-arrow.svg"
        alt=""
        style={arrowStyle}
        aria-hidden="true"
      />
      <div style={textContainerStyle}>
        <span style={backTextStyle}>Back</span>
        <span style={subTextStyle}>See All Venues</span>
      </div>
    </button>
  )
}
