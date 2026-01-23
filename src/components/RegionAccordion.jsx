import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS, ANIMATIONS } from '../constants/theme'

export default function RegionAccordion({ title, venues = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const contentRef = useRef(null)
  const [contentHeight, setContentHeight] = useState(0)
  const navigate = useNavigate()
  const contentId = `region-content-${title.toLowerCase()}`

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [venues])

  const handleVenueClick = (slug) => {
    navigate(`/venue/${slug}`)
  }

  return (
    <div style={{ borderBottom: `1px solid ${COLORS.BORDER_WHITE_30}` }}>
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${title} region venues`}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            color: COLORS.TEXT_WHITE,
            fontSize: '16px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
        <img
          src={`${import.meta.env.BASE_URL}images/plus-button.svg`}
          alt=""
          aria-hidden="true"
          style={{
            width: '25px',
            height: '25px',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: `transform ${ANIMATIONS.STANDARD} ease`,
          }}
        />
      </button>

      {/* Accordion Content */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={`region-header-${title.toLowerCase()}`}
        style={{
          height: isOpen ? `${contentHeight}px` : '0px',
          overflow: 'hidden',
          transition: `height ${ANIMATIONS.STANDARD} ease`,
        }}
      >
        <div ref={contentRef}>
          {venues.map((venue) => (
            <button
              key={venue._id || venue.slug}
              onClick={() => handleVenueClick(venue.slug)}
              aria-label={`View ${venue.title} venue in ${venue.city || venue.state}`}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '20px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${COLORS.BORDER_WHITE_15}`,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {/* Arrow Icon */}
              <img
                src={`${import.meta.env.BASE_URL}images/ln-arrow.svg`}
                alt=""
                aria-hidden="true"
                style={{
                  width: '20px',
                  height: '20px',
                }}
              />

              {/* Venue Info */}
              <div>
                <div
                  style={{
                    color: COLORS.TEXT_WHITE,
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  {venue.title}
                </div>
                <div
                  style={{
                    color: COLORS.TEXT_WHITE_70,
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {venue.city ? `${venue.city}, ${venue.state}` : venue.state}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
