import { useNavigate } from 'react-router-dom'
import useScrollDirection from '../hooks/useScrollDirection'
import { useViewportWidth } from '../hooks/useViewportWidth'
import { COLORS, BREAKPOINTS, Z_INDEX, ANIMATIONS } from '../constants/theme'
import headerIconLeft from '../assets/header-icon-left.svg'
import headerIconCenter from '../assets/header-icon-center.svg'

export default function SiteHeader() {
  const navigate = useNavigate()
  const viewportWidth = useViewportWidth()
  const scrollDirection = useScrollDirection(40)

  const isMobile = viewportWidth < BREAKPOINTS.MOBILE
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
        zIndex: Z_INDEX.HEADER,
        transition: `top ${ANIMATIONS.SLOW} ease`,
      }}
    >
      <nav
        aria-label="Main navigation"
        style={{
          width: '100%',
          backgroundColor: COLORS.BACKGROUND_ALT,
          borderTop: `1px solid ${COLORS.BORDER_WHITE_08}`,
          borderLeft: `1px solid ${COLORS.BORDER_WHITE_08}`,
          borderRight: `1px solid ${COLORS.BORDER_WHITE_08}`,
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
              <img src={headerIconLeft} alt="Live Nation logo" style={{ width: 64, height: 64 }} />
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
                  color: COLORS.TEXT_WHITE,
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
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, flex: 1, color: COLORS.TEXT_WHITE }}>
                  We worked with over 50+ clients, venue managers and owners, to create over 20+ venue stories,
                  re-brands and more.
                </p>
                <a href="https://consumeandcreate.co" target="_blank" rel="noopener noreferrer">
                  <img src={headerIconCenter} alt="Consume and Create logo" style={{ width: 36, height: 36 }} />
                </a>
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
