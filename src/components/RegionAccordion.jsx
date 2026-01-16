import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function RegionAccordion({ title, venues = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const contentRef = useRef(null)
  const [contentHeight, setContentHeight] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [venues])

  const handleVenueClick = (slug) => {
    navigate(`/venue/${slug}`)
  }

  return (
    <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
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
            color: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
        <img
          src="/images/plus-button.svg"
          alt={isOpen ? 'Collapse' : 'Expand'}
          style={{
            width: '25px',
            height: '25px',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        />
      </button>

      {/* Accordion Content */}
      <div
        style={{
          height: isOpen ? `${contentHeight}px` : '0px',
          overflow: 'hidden',
          transition: 'height 0.3s ease',
        }}
      >
        <div ref={contentRef}>
          {venues.map((venue) => (
            <button
              key={venue._id || venue.slug}
              onClick={() => handleVenueClick(venue.slug)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '20px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {/* Arrow Icon */}
              <img
                src="/images/ln-arrow.svg"
                alt=""
                style={{
                  width: '20px',
                  height: '20px',
                }}
              />

              {/* Venue Info */}
              <div>
                <div
                  style={{
                    color: '#fff',
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
                    color: 'rgba(255, 255, 255, 0.7)',
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
