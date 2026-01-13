import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useScrollDirection from '../hooks/useScrollDirection'
import headerIconLeft from '../assets/header-icon-left.svg'
import headerIconCenter from '../assets/header-icon-center.svg'
import headerIconRight from '../assets/header-icon-right.svg'

export default function SiteHeader() {
  const navigate = useNavigate()
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  )
  const scrollDirection = useScrollDirection(40)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = viewportWidth < 768
  const hidden = scrollDirection === 'down'

  return (
    <header
      style={{
        width: '100%',
        padding: 0,
        backgroundColor: 'transparent',
        position: 'fixed',
        top: hidden ? '-200px' : 0,
        left: 0,
        zIndex: 200,
        transition: 'top 0.4s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          backgroundColor: '#050505',
          backgroundImage: `
            linear-gradient(rgba(120,0,0,0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(120,0,0,0.18) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1.5fr)',
            gap: '24px clamp(32px, 4vw, 80px)',
            padding: '32px clamp(24px, 5vw, 80px)',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Back to map"
            >
              <img src={headerIconLeft} alt="" style={{ width: 64, height: 64 }} />
            </button>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#ccc',
                  textTransform: 'uppercase',
                }}
              >
                Project
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                2 Years 30+ Venues
              </p>
            </div>
          </div>

          {!isMobile && (
            <>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: '#fafafa' }}>
                  A Consume &amp; Create Productions
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, flex: 1 }}>
                  We worked with over 50+ clients, venue managers and owners, to create over 20+ venue stories,
                  re-brands and more.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img src={headerIconCenter} alt="" style={{ width: 36, height: 36 }} />
                  <img src={headerIconRight} alt="" style={{ width: 36, height: 36 }} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
