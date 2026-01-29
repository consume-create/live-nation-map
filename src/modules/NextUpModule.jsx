import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { COLORS, BREAKPOINTS } from '../constants/theme'
import { useViewportWidth } from '../hooks/useViewportWidth'

// Up-right diagonal arrow icon
function ArrowIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
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

  if (!nextVenue) return null

  return (
    <section
      style={{
        width: '100%',
        padding: isMobile ? '80px 24px' : '120px clamp(32px, 6vw, 160px)',
        backgroundColor: COLORS.BACKGROUND_DARK,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Link
        to={`/venue/${nextVenue.slug}`}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'stretch',
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
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
            className="next-up-arrow"
          >
            <ArrowIcon size={isMobile ? 28 : 36} />
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
            backgroundColor: COLORS.BORDER_WHITE_30,
            transition: 'background-color 0.2s ease',
          }}
          className="next-up-line"
        />

        <style>
          {`
            a:hover .next-up-arrow {
              opacity: 1;
              transform: translate(4px, -4px);
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
