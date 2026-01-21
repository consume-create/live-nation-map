import { useMemo, useState, useEffect, useRef } from 'react'

const GRID_BACKGROUND = `
  linear-gradient(rgba(40, 0, 0, 0.25) 1px, transparent 1px),
  linear-gradient(90deg, rgba(40, 0, 0, 0.25) 1px, transparent 1px)
`

function renderList(title, entries = [], isMobile = false) {
  if (!entries.length) return null

  const titleWords = title.split(' ')

  return (
    <div style={{
      marginBottom: isMobile ? 0 : 60,
      display: isMobile ? 'flex' : 'block',
      gap: isMobile ? 40 : 0,
      alignItems: 'flex-start',
    }}>
      <h3
        style={{
          fontFamily: 'var(--font-display, "Poppins", sans-serif)',
          fontSize: isMobile ? 24 : 14,
          textTransform: 'uppercase',
          marginBottom: isMobile ? 0 : 20,
          fontWeight: 700,
          lineHeight: 1.2,
          minWidth: isMobile ? '120px' : 'auto',
        }}
      >
        {isMobile ? (
          <>
            {titleWords[0]}<br />{titleWords.slice(1).join(' ')}
          </>
        ) : (
          title
        )}
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#fff', display: 'flex', flexDirection: 'column', gap: isMobile ? 24 : 18 }}>
        {entries.map((item, idx) => {
          const entry = typeof item === 'string' ? { name: item } : item
          return (
            <li key={`${title}-${idx}`}>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{entry?.name}</div>
              {entry?.title && (
                <div style={{ opacity: 0.75, fontSize: 15 }}>/ {entry.title}</div>
              )}
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
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
          }}
        >
          <img
            src={about.videoPosterUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.4))',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: '2px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.45)',
              }}
            >
              ▶
            </span>
          </div>
        </div>
      )
    }

    return null
  }, [about?.videoPosterUrl, about?.videoUrl])

  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const mediaContent = useMemo(() => {
    if (!about?.videoUrl) {
      return videoElement
    }

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <video
          ref={videoRef}
          src={about.videoUrl}
          poster={about.videoPosterUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          controls={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          preload="metadata"
        />
        {!isPlaying && (
          <button
            type="button"
            onClick={() => {
              setIsPlaying(true)
              videoRef.current?.play?.()
            }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.65))',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Play venue video"
          >
            <span
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: '2px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)',
                fontSize: 26,
                color: '#fff',
              }}
            >
              ▶
            </span>
          </button>
        )}
      </div>
    )
  }, [about?.videoPosterUrl, about?.videoUrl, isPlaying, videoElement])

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
        background: '#000000',
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
          gridTemplateColumns: isStacked ? '1fr' : 'minmax(0, 2.5fr) minmax(280px, 0.9fr)',
          gap: isStacked ? '48px' : '60px clamp(32px, 3vw, 80px)',
        }}
      >
        <div>
          <div
            style={{
              display: isStacked ? 'block' : 'flex',
              alignItems: isStacked ? 'flex-start' : 'center',
              gap: isStacked ? 0 : 40,
              marginBottom: 32,
            }}
          >
            <h2
              style={{
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: 0,
                textTransform: 'uppercase',
                marginBottom: isStacked ? 24 : 0,
                whiteSpace: 'nowrap',
                alignSelf: isStacked ? 'flex-start' : 'flex-start',
              }}
            >
              About
            </h2>
            <div>
              <div style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', marginBottom: 28 }}>
                {mediaContent}
              </div>
              <div
                style={{
                  padding: isStacked ? '32px 0' : '32px clamp(24px, 4vw, 60px)',
                }}
              >
                <div
                  style={{
                    display: services.length > 0 && !isStacked ? 'grid' : 'block',
                    gridTemplateColumns: services.length > 0 && !isStacked ? 'minmax(0, 3fr) minmax(0, 1fr)' : '1fr',
                    columnGap: services.length > 0 && !isStacked ? 48 : 0,
                  }}
                >
                  <div>
                    {descriptionBlocks.map((block, idx) => (
                      <p key={`desc-${idx}`} style={{ fontSize: 16, lineHeight: 1.7, opacity: 0.85 }}>
                        {block.children?.map((span) => span.text).join('') ?? ''}
                      </p>
                    ))}
                  </div>
                  {services.length > 0 && (
                    <div style={{ marginTop: services.length > 0 && !isStacked ? 0 : 32 }}>
                      <h4
                        style={{
                          textTransform: 'uppercase',
                          fontSize: isStacked ? 24 : 14,
                          marginBottom: isStacked ? 20 : 12,
                          fontWeight: isStacked ? 700 : 600,
                        }}
                      >
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
          </div>
        </div>

        <div style={{ paddingRight: isStacked ? 0 : 10 }}>
          <div
            style={{
              borderTop: isStacked ? '2px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.1)',
              paddingTop: isStacked ? 48 : 32,
              marginBottom: isStacked ? 56 : 48,
            }}
          >
            {renderList('The Partners', partners, isStacked)}
          </div>
          <div style={{
            borderTop: isStacked ? '2px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.1)',
            paddingTop: isStacked ? 48 : 32,
          }}>
            {renderList('The Crew', crew, isStacked)}
          </div>
        </div>
      </div>
    </section>
  )
}
