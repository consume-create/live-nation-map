import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import useScrollDirection from '../hooks/useScrollDirection'
import { useViewportWidth } from '../hooks/useViewportWidth'
import { BREAKPOINTS, ANIMATIONS, Z_INDEX, COLORS } from '../constants/theme'

function BackArrowIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={{ transform: 'scaleX(-1)', flexShrink: 0 }}
    >
      <path d="M0 0.5H19.1888V19.9075" stroke="currentColor" />
      <path d="M19.1886 0.5L0.68515 19.2143" stroke="currentColor" />
    </svg>
  )
}

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
    document.body.style.transition = 'opacity 0.3s ease'
    document.body.style.opacity = '0'
    setTimeout(() => {
      window.scrollTo({ top: 0 })
      navigate('/')
      setTimeout(() => {
        requestAnimationFrame(() => {
          document.body.style.opacity = '1'
        })
      }, 100)
    }, 350)
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

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        style={buttonStyle}
        className="back-btn"
        aria-label="Go back to see all venues"
      >
        <div className="back-btn-arrow">
          <BackArrowIcon size={20} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span
            className="back-btn-title"
            style={{
              fontFamily: 'var(--font-display, "Poppins", sans-serif)',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Back
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display, "Poppins", sans-serif)',
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'uppercase',
              color: '#ccc',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            See All Venues
          </span>
        </div>
      </button>
      <style>
        {`
          .back-btn-arrow {
            color: ${COLORS.TEXT_WHITE};
            transition: color 0.6s cubic-bezier(0.25, 0.1, 0.25, 1);
          }
          .back-btn-title {
            background: linear-gradient(90deg, ${COLORS.ACCENT_RED} 50%, ${COLORS.TEXT_WHITE} 50%);
            background-size: 200% 100%;
            background-position: 100% 0;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            transition: background-position 0.6s cubic-bezier(0.25, 0.1, 0.25, 1);
          }
          .back-btn:hover .back-btn-arrow {
            color: ${COLORS.ACCENT_RED};
          }
          .back-btn:hover .back-btn-title {
            background-position: 0% 0;
          }
        `}
      </style>
    </>
  )
}
