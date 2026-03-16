import { useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { COLORS, BREAKPOINTS } from '../constants/theme'
import { useViewportWidth } from '../hooks/useViewportWidth'

// Up-right diagonal arrow icon — geometric bracket style
function ArrowIcon({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path d="M38.8536 39.416L38.8536 1.0002L3.52672e-05 1.0002" stroke="currentColor" strokeWidth="2" />
      <path d="M38.8536 0.999149L1.38767 38.043" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export default function NextUpModule({ currentSlug, venues = [] }) {
  const viewportWidth = useViewportWidth()
  const isMobile = viewportWidth < BREAKPOINTS.MOBILE

  const nextVenue = useMemo(() => {
    if (!venues.length || !currentSlug) return null

    // Sort alphabetically by title
    const sorted = [...venues].sort((a, b) =>
      (a.title || '').localeCompare(b.title || '')
    )

    // Find current index
    const currentIndex = sorted.findIndex((v) => v.slug === currentSlug)
    if (currentIndex === -1) return sorted[0] || null

    // Get next venue, wrapping to first if at end
    const nextIndex = (currentIndex + 1) % sorted.length
    return sorted[nextIndex]
  }, [currentSlug, venues])

  const navigate = useNavigate()

  const handleClick = useCallback((e) => {
    e.preventDefault()
    document.body.style.transition = 'opacity 0.3s ease'
    document.body.style.opacity = '0'
    setTimeout(() => {
      window.scrollTo({ top: 0 })
      navigate(`/venue/${nextVenue.slug}`)
      // Wait for new page to mount and paint before fading in
      setTimeout(() => {
        requestAnimationFrame(() => {
          document.body.style.opacity = '1'
        })
      }, 100)
    }, 350)
  }, [navigate, nextVenue])

  if (!nextVenue) return null

  return (
    <section
      style={{
        width: '100%',
        padding: isMobile ? '80px 24px 120px' : '120px clamp(32px, 6vw, 160px)',
        backgroundColor: COLORS.BACKGROUND_DARK,
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Link
        to={`/venue/${nextVenue.slug}`}
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '100%',
          textDecoration: 'none',
          color: COLORS.TEXT_WHITE,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 16 : 24,
            marginBottom: isMobile ? 20 : 28,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.85,
            }}
            className="next-up-arrow"
          >
            <ArrowIcon size={isMobile ? 44 : 64} />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: isMobile ? 4 : 6,
            }}
          >
            <span
              className="next-up-title"
              style={{
                fontFamily: 'var(--font-display, "Poppins", sans-serif)',
                fontSize: isMobile ? 28 : 42,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                lineHeight: 1.1,
              }}
            >
              {nextVenue.title}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display, "Poppins", sans-serif)',
                fontSize: isMobile ? 11 : 12,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                opacity: 0.6,
              }}
            >
              Next Venue
            </span>
          </div>
        </div>

        <div
          style={{
            width: '100%',
            height: 1,
            alignSelf: 'stretch',
            backgroundColor: COLORS.BORDER_WHITE_30,
            transition: 'background-color 0.2s ease',
          }}
          className="next-up-line"
        />

        <style>
          {`
            .next-up-title {
              background: linear-gradient(90deg, ${COLORS.ACCENT_RED} 50%, ${COLORS.TEXT_WHITE} 50%);
              background-size: 200% 100%;
              background-position: 100% 0;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              transition: background-position 0.6s cubic-bezier(0.25, 0.1, 0.25, 1);
            }
            a:hover .next-up-title {
              background-position: 0% 0;
            }
            a:active .next-up-title {
              background-position: 0% 0;
              transition-duration: 0s;
            }
            .next-up-arrow {
              color: ${COLORS.TEXT_WHITE};
              transition: color 0.6s cubic-bezier(0.25, 0.1, 0.25, 1);
            }
            a:hover .next-up-arrow {
              color: ${COLORS.ACCENT_RED};
            }
            a:active .next-up-arrow {
              color: ${COLORS.ACCENT_RED};
              transition-duration: 0s;
            }
            a:hover .next-up-line {
              background-color: ${COLORS.TEXT_WHITE};
            }
          `}
        </style>
      </Link>
    </section>
  )
}
