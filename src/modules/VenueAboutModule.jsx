import { useMemo, useState, useEffect } from 'react'

const GRID_BACKGROUND = `
  linear-gradient(rgba(50, 0, 0, 0.15) 1px, transparent 1px),
  linear-gradient(90deg, rgba(50, 0, 0, 0.15) 1px, transparent 1px)
`

function renderList(title, entries = []) {
  if (!entries.length) return null
  return (
    <div style={{ marginBottom: 48 }}>
      <h3
        style={{
          fontFamily: 'Orbitron, sans-serif',
          letterSpacing: '0.3em',
          fontSize: 16,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        {title}
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#fff' }}>
        {entries.map((item, idx) => {
          if (typeof item === 'string') {
            return (
              <li key={`${title}-${idx}`} style={{ marginBottom: 16, lineHeight: 1.4 }}>
                {item}
              </li>
            )
          }
          return (
            <li key={`${title}-${idx}`} style={{ marginBottom: 16, lineHeight: 1.4 }}>
              <div>{item.name}</div>
              {item.title && <div style={{ opacity: 0.75 }}>/ {item.title}</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function VenueAboutModule({ about = {} }) {
  const hasData = Boolean(
    about?.description?.length ||
      about?.services?.length ||
      about?.partners?.length ||
      about?.crew?.length ||
      about?.videoUrl
  )
  const descriptionBlocks = Array.isArray(about?.description) ? about.description : []
  const services = Array.isArray(about?.services) ? about.services.filter(Boolean) : []
  const partners = Array.isArray(about?.partners) ? about.partners : []
  const crew = Array.isArray(about?.crew) ? about.crew : []

  const videoElement = useMemo(() => {
    if (!about?.videoUrl) {
      if (!about?.videoPosterUrl) return null
      return (
        <img
          src={about.videoPosterUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )
    }

    return (
      <video
        src={about.videoUrl}
        poster={about.videoPosterUrl}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        controls
      />
    )
  }, [about?.videoUrl, about?.videoPosterUrl])

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isStacked = viewportWidth <= 1024

  if (!hasData) return null

  return (
    <section
      style={{
        width: '100%',
        padding: '140px clamp(32px, 6vw, 160px)',
        background: '#050505',
        backgroundImage: GRID_BACKGROUND,
        backgroundSize: '80px 80px',
        color: '#fff',
      }}
    >
      <div
        style={{
          maxWidth: 1600,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: isStacked ? '1fr' : 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: isStacked ? '48px' : '60px clamp(48px, 5vw, 120px)',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginBottom: 32,
            }}
          >
            About
          </h2>
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
              background: '#030303',
            }}
          >
            <div style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>{videoElement}</div>
            <div style={{ padding: '32px clamp(24px, 4vw, 60px)' }}>
              {descriptionBlocks.map((block, idx) => (
                <p key={`desc-${idx}`} style={{ fontSize: 16, lineHeight: 1.7, opacity: 0.85 }}>
                  {block.children?.map((span) => span.text).join('') ?? ''}
                </p>
              ))}
              {services.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <h4 style={{ textTransform: 'uppercase', letterSpacing: '0.25em', fontSize: 14, marginBottom: 12 }}>
                    Services
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.6 }}>
                    {services.map((service, idx) => (
                      <li key={`service-${idx}`}>{service}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: 32,
              marginBottom: 48,
            }}
          >
            {renderList('The Partners', partners)}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 32 }}>
            {renderList('The Crew', crew)}
          </div>
        </div>
      </div>
    </section>
  )
}
