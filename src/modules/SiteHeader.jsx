import { useNavigate, useLocation } from 'react-router-dom'
import { useCallback, useState, useEffect, useRef } from 'react'
import useScrollDirection from '../hooks/useScrollDirection'
import { useViewportWidth } from '../hooks/useViewportWidth'
import { COLORS, BREAKPOINTS, Z_INDEX, ANIMATIONS } from '../constants/theme'
import headerIconLeft from '../assets/header-icon-left.svg'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { navigateWithFade } from '../utils/navigateWithFade'

const FONT = 'var(--font-display, "Poppins", sans-serif)'

const BODY_COPY =
  'Live Nation operates venues and properties nationwide — each one rooted in its own neighborhood, its own history, its own culture. They needed brand identities that honored those stories while scaling nationally. You can\u2019t just slap a template on a venue with 50 years of history. You have to listen first.'

const DRAG_THRESHOLD = 5
const DRAG_RANGE = 150 // px of vertical drag for full 0→1 volume range

function MusicBarsIcon({ width = 22, height = 25, animationData, isPlaying, volume, onToggle, onVolumeChange, hasInteracted }) {
  const dragRef = useRef({ active: false, startY: 0, startVol: 0, moved: 0, isDrag: false })
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  const animRef = useRef(null)

  // Before audio interaction: always animate (decorative)
  // After interaction: animate only when playing AND volume > 0
  const shouldAnimate = !hasInteracted || (isPlaying && volume > 0)

  // Create single lottie-web instance (dynamic import keeps it in the lottie chunk)
  useEffect(() => {
    if (!containerRef.current || !animationData) return
    let anim = null
    let cancelled = false
    import('lottie-web').then((mod) => {
      if (cancelled || !containerRef.current) return
      anim = mod.default.loadAnimation({
        container: containerRef.current,
        animationData,
        renderer: 'svg',
        loop: true,
        autoplay: true,
      })
      animRef.current = anim
    })
    return () => { cancelled = true; anim?.destroy(); animRef.current = null }
  }, [animationData])

  // Play/pause based on shouldAnimate
  useEffect(() => {
    const anim = animRef.current
    if (!anim) return
    if (shouldAnimate) {
      anim.play()
    } else {
      anim.pause()
    }
  }, [shouldAnimate])

  const handlePointerDown = useCallback((e) => {
    // Don't preventDefault — preserve user gesture context for audio.play()
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    dragRef.current = { active: true, startY: e.clientY, startVol: volume, moved: 0, isDrag: false }
  }, [volume])

  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current
    if (!d.active) return
    const dist = Math.abs(e.clientY - d.startY)
    d.moved = dist
    if (dist > DRAG_THRESHOLD) {
      d.isDrag = true
      setIsDragging(true)
      const deltaY = d.startY - e.clientY // up = positive
      const newVol = Math.max(0, Math.min(1, d.startVol + deltaY / DRAG_RANGE))
      onVolumeChange(newVol)
    }
  }, [onVolumeChange])

  const handlePointerUp = useCallback((e) => {
    const d = dragRef.current
    if (!d.active) return
    try { e.target.releasePointerCapture(e.pointerId) } catch {}
    if (!d.isDrag) {
      // Click — toggle play/pause
      onToggle()
    }
    d.active = false
    d.isDrag = false
    setIsDragging(false)
  }, [onToggle])

  if (!animationData) return <div style={{ width, height }} />

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="button"
      tabIndex={0}
      aria-label={isPlaying ? 'Pause music' : 'Play music'}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
    >
      {/* Volume tooltip */}
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            padding: '3px 8px',
            borderRadius: 10,
            backgroundColor: COLORS.ACCENT_RED,
            color: '#fff',
            fontFamily: FONT,
            fontSize: 10,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {Math.round(volume * 100)}%
        </div>
      )}
      {/* Single lottie with dark overlay mask for volume level */}
      <div style={{ position: 'relative', width, height }}>
        {/* White lottie (full brightness) */}
        <div ref={containerRef} style={{ width, height }} aria-hidden="true" />
        {/* Dark overlay on top portion — makes bars appear grey above volume level */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            clipPath: `inset(0 0 ${volume * 100}% 0)`,
            transition: isDragging ? 'none' : 'clip-path 0.3s ease',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}

export default function SiteHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const viewportWidth = useViewportWidth()
  const scrollDirection = useScrollDirection(40)
  const [musicBarsData, setMusicBarsData] = useState(null)
  const { isPlaying, volume, togglePlayPause, setVolume, hasInteracted } = useAudioPlayer()

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}animations/white-music-bars.json`)
      .then(res => res.json())
      .then(setMusicBarsData)
      .catch(() => {})
  }, [])

  const [atTop, setAtTop] = useState(true)

  useEffect(() => {
    const handleScroll = () => setAtTop(window.scrollY < 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isMobile = viewportWidth < BREAKPOINTS.MOBILE
  const hidden = scrollDirection === 'down'
  const isVenuePage = location.pathname.includes('/venue/')
  const showBodyCopy = !isVenuePage && isMobile && atTop

  const handleLogoClick = useCallback(() => {
    if (isVenuePage) {
      navigateWithFade(navigate, '/')
    } else {
      navigate('/')
    }
  }, [navigate, isVenuePage])

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
        }}
      >
        {isMobile ? (
          /* ── Mobile: two-row layout ── */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 20px',
              gap: 14,
            }}
          >
            {/* Row 1: Logo | Title | Credits | Icon */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* Logo */}
              <button
                type="button"
                onClick={handleLogoClick}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
                aria-label="Back to map"
              >
                <img
                  src={headerIconLeft}
                  alt="Live Nation logo"
                  style={{ width: 32, height: 32 }}
                />
              </button>

              {/* Title */}
              <p
                style={{
                  margin: 0,
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: 13,
                  lineHeight: '110%',
                  textTransform: 'uppercase',
                  color: COLORS.TEXT_WHITE,
                  flexShrink: 0,
                }}
              >
                Live Nation
                <br />
                2 Years 30 +Venues
              </p>

              {/* Credits — push to right */}
              <p
                style={{
                  margin: 0,
                  marginLeft: 'auto',
                  fontFamily: FONT,
                  fontWeight: 500,
                  fontSize: 9,
                  lineHeight: '130%',
                  letterSpacing: '-0.02em',
                  color: COLORS.TEXT_WHITE,
                  flexShrink: 0,
                }}
              >
                A Consume &amp; Create
                <br />
                Productions
              </p>

              {/* Animated music bars */}
              <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                <MusicBarsIcon width={16} height={18} animationData={musicBarsData} isPlaying={isPlaying} volume={volume} onToggle={togglePlayPause} onVolumeChange={setVolume} hasInteracted={hasInteracted} />
              </div>
            </div>

            {/* Row 2: Body copy (hidden on venue pages, fades out on scroll) */}
            {!isVenuePage && (
              <div
                style={{
                  overflow: 'hidden',
                  maxHeight: showBodyCopy ? 100 : 0,
                  opacity: showBodyCopy ? 1 : 0,
                  transition: 'max-height 0.3s ease, opacity 0.3s ease',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: FONT,
                    fontWeight: 500,
                    fontSize: 10,
                    lineHeight: '150%',
                    letterSpacing: '-0.02em',
                    color: COLORS.TEXT_WHITE,
                  }}
                >
                  {BODY_COPY}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ── Desktop layout ── */
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 'clamp(24px, 4vw, 60px)',
              padding: '32px clamp(24px, 4vw, 64px)',
            }}
          >
            {/* Left — Logo + Project text */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 30,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={handleLogoClick}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
                aria-label="Back to map"
              >
                <img
                  src={headerIconLeft}
                  alt="Live Nation logo"
                  style={{ width: 50, height: 50 }}
                />
              </button>
              <p
                style={{
                  margin: 0,
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: 25,
                  lineHeight: '101%',
                  textTransform: 'uppercase',
                  color: COLORS.TEXT_WHITE,
                }}
              >
                Live Nation
                <br />
                2 Years 30 +Venues
              </p>
            </div>

            {/* Center — A Consume & Create Productions */}
            <p
              style={{
                margin: 0,
                fontFamily: FONT,
                fontWeight: 500,
                fontSize: 12,
                lineHeight: '130%',
                letterSpacing: '-0.02em',
                color: COLORS.TEXT_WHITE,
                flexShrink: 0,
              }}
            >
              A Consume &amp; Create
              <br />
              Productions
            </p>

            {/* Right — Description (hidden on venue pages) */}
            {!isVenuePage && (
              <p
                style={{
                  margin: 0,
                  fontFamily: FONT,
                  fontWeight: 500,
                  fontSize: 11,
                  lineHeight: '140%',
                  letterSpacing: '-0.02em',
                  color: COLORS.TEXT_WHITE,
                  maxWidth: 320,
                  flex: '1 1 auto',
                  minWidth: 180,
                }}
              >
                {BODY_COPY}
              </p>
            )}

            {/* Animated music bars */}
            <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
              <MusicBarsIcon width={22} height={25} animationData={musicBarsData} isPlaying={isPlaying} volume={volume} onToggle={togglePlayPause} onVolumeChange={setVolume} hasInteracted={hasInteracted} />
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
