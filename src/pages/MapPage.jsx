import { useState, useCallback, useLayoutEffect, useRef, useMemo, useEffect, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Vector3 } from 'three'
import USMap from '../USMap'
import MapPoint from '../MapPoint'
import ShaderTester from '../ShaderTester'
import { isSanityConfigured } from '../lib/sanityClient'
import CameraController from '../CameraController'
import MapCursorTilt from '../MapCursorTilt'
import { US_BOUNDS } from '../usStates'
import SiteHeader from '../modules/SiteHeader'
import MobileMapView from '../components/MobileMapView'
import LiveNationLogo from '../components/LiveNationLogo'
import { BREAKPOINTS, ANIMATIONS, SPACING, CAMERA, COLORS, Z_INDEX } from '../constants/theme'
import { preloadVenuePage } from '../App'

function generateKey(point, idx) {
  return point._id || point.slug || idx
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function resolveSpacedPoints(points, minDistance) {
  if (!Array.isArray(points) || !points.length) return points
  if (!minDistance || !Number.isFinite(minDistance)) return points

  const halfWidth = US_BOUNDS.width / 2
  const halfHeight = US_BOUNDS.height / 2

  const working = points
    .map((point, idx) => ({
      key: generateKey(point, idx),
      original: point,
      pos: Array.isArray(point.position) ? [...point.position] : null,
    }))
    .filter((entry) => Array.isArray(entry.pos))

  const iterations = 8
  for (let iter = 0; iter < iterations; iter += 1) {
    for (let i = 0; i < working.length; i += 1) {
      for (let j = i + 1; j < working.length; j += 1) {
        const a = working[i]
        const b = working[j]
        const dx = b.pos[0] - a.pos[0]
        const dy = b.pos[1] - a.pos[1]
        const dist = Math.hypot(dx, dy) || 0.0001

        if (dist >= minDistance) continue

        const overlap = (minDistance - dist) / 2
        const seed = (i + 1) * (j + 3)
        const directionX = dist === 0 ? Math.cos(seed) : dx / dist
        const directionY = dist === 0 ? Math.sin(seed) : dy / dist

        a.pos[0] -= directionX * overlap
        a.pos[1] -= directionY * overlap
        b.pos[0] += directionX * overlap
        b.pos[1] += directionY * overlap

        a.pos[0] = clamp(a.pos[0], -halfWidth, halfWidth)
        a.pos[1] = clamp(a.pos[1], -halfHeight, halfHeight)
        b.pos[0] = clamp(b.pos[0], -halfWidth, halfWidth)
        b.pos[1] = clamp(b.pos[1], -halfHeight, halfHeight)
      }
    }
  }

  const adjusted = new Map()
  working.forEach((entry) => {
    adjusted.set(entry.key, entry.pos)
  })

  return points.map((point, idx) => {
    const key = generateKey(point, idx)
    const nextPosition = adjusted.get(key)
    if (!nextPosition) return point
    if (
      Array.isArray(point.position) &&
      Math.abs(point.position[0] - nextPosition[0]) < 0.001 &&
      Math.abs(point.position[1] - nextPosition[1]) < 0.001
    ) {
      return point
    }
    return {
      ...point,
      adjustedPosition: nextPosition,
    }
  })
}

export default function MapPage({ mapPoints, pointsLoading, pointsError, siteSettings }) {
  const navigate = useNavigate()
  const [selectedSlug, setSelectedSlug] = useState(null)
  const [showTester, setShowTester] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [cameraTarget, setCameraTarget] = useState(null)
  const [pendingSlug, setPendingSlug] = useState(null)
  const [showSplash, setShowSplash] = useState(true)
  const [splashOpacity, setSplashOpacity] = useState(0)
  const [mapOpacity, setMapOpacity] = useState(0)
  const [pinsRevealStartTime, setPinsRevealStartTime] = useState(null)
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }))
  const [transitionOverlayOpacity, setTransitionOverlayOpacity] = useState(0)
  const selectedPointScreenRef = useRef(null)
  const navigationTimeoutRef = useRef(null)
  const fadeTimeoutRef = useRef(null)
  const navTimeoutRef = useRef(null)
  const [popupExiting, setPopupExiting] = useState(false)
  const pinHoverCountRef = useRef(0)
  const cursorFollowerRef = useRef(null)
  const popupExitTimeoutRef = useRef(null)

  useEffect(() => {
    // Fade in splash immediately
    const fadeInTimer = setTimeout(() => {
      setSplashOpacity(1)
    }, 50)

    // Start fade out splash and fade in map simultaneously
    const fadeOutTimer = setTimeout(() => {
      setSplashOpacity(0)
      setMapOpacity(1)
      setPinsRevealStartTime(performance.now())
    }, ANIMATIONS.SPLASH_DURATION)

    // Remove splash after fade out completes
    const hideTimer = setTimeout(() => {
      setShowSplash(false)
    }, ANIMATIONS.SPLASH_REMOVAL)

    return () => {
      clearTimeout(fadeInTimer)
      clearTimeout(fadeOutTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  // Tablet breakpoint for responsive swap
  const isMobile = viewport.width < BREAKPOINTS.MOBILE

  useEffect(() => {
    // Prevent body scroll for fixed 3D map viewport (desktop only)
    if (!isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      // Restore scrolling when unmounting
      document.body.style.overflow = ''
    }
  }, [isMobile])

  const handleProjectUpdate = useCallback(({ x, y }) => {
    selectedPointScreenRef.current = { x, y }
  }, [])

  const handlePinHover = useCallback((hovered) => {
    pinHoverCountRef.current += hovered ? 1 : -1
    if (pinHoverCountRef.current < 0) pinHoverCountRef.current = 0
    const isHovered = pinHoverCountRef.current > 0
    const el = cursorFollowerRef.current
    if (!el) return
    const color = isHovered ? '#ffffff' : COLORS.ACCENT_RED
    const shadow = isHovered ? '0 0 12px rgba(255,255,255,0.35)' : '0 0 12px rgba(255,0,0,0.35)'
    const inner = el.querySelector('[data-cursor-inner]')
    if (!inner) return
    inner.style.borderColor = color
    inner.style.boxShadow = shadow
    inner.style.transform = isHovered ? 'scale(0.8)' : 'scale(1)'
    const bars = inner.querySelectorAll('[data-cursor-bar]')
    bars.forEach((b) => { b.style.background = color })
  }, [])

  const buildFocusTarget = useCallback((point) => {
    const pos = point?.adjustedPosition ?? point?.position
    if (!point || !Array.isArray(pos)) return null
    const [px = 0, py = 0] = pos
    const worldCenter = new Vector3(25 + px, 12.5, -py)
    return {
      position: worldCenter,
      zoomFactor: CAMERA.ZOOM_FACTOR,
    }
  }, [])

  const handlePointClick = (slug) => {
    if (isNavigating || cameraTarget) return
    selectedPointScreenRef.current = null
    preloadVenuePage()

    if (slug === selectedSlug) {
      setSelectedSlug(null)
      return
    }

    if (selectedSlug) {
      // Already showing a popup: play exit then switch to new pin
      setPopupExiting(true)
      if (popupExitTimeoutRef.current) clearTimeout(popupExitTimeoutRef.current)
      popupExitTimeoutRef.current = setTimeout(() => {
        popupExitTimeoutRef.current = null
        setSelectedSlug(slug)
        setPopupExiting(false)
      }, POPUP_EXIT_DURATION_MS)
    } else {
      setSelectedSlug(slug)
    }
  }

  const handleSeeMore = () => {
    if (!selectedPoint?.slug || isNavigating || cameraTarget) return

    const focusTarget = buildFocusTarget(selectedPoint)
    const venueSlug = selectedPoint.slug

    setPendingSlug(venueSlug)

    // Fade out the overlay gracefully instead of unmounting immediately
    // This prevents the heavy DOM teardown from stuttering the camera animation
    setPopupExiting(true)

    if (!focusTarget) {
      setIsNavigating(true)
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
      navigationTimeoutRef.current = setTimeout(() => {
        navigate(`/venue/${venueSlug}`)
      }, 3000)
      return
    }

    // Wait 2 frames for React to finish the exit render before starting camera
    // This separates the overlay teardown from the camera mount across frames
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCameraTarget(focusTarget)

        // Unmount the overlay after its fade-out completes (avoids mid-zoom stutter)
        if (popupExitTimeoutRef.current) clearTimeout(popupExitTimeoutRef.current)
        popupExitTimeoutRef.current = setTimeout(() => {
          popupExitTimeoutRef.current = null
          setSelectedSlug(null)
          setPopupExiting(false)
        }, POPUP_EXIT_DURATION_MS + 50)

        // Start fade to black so screen is fully black before navigation
        fadeTimeoutRef.current = setTimeout(() => {
          setTransitionOverlayOpacity(1)

          // Navigate after fade is fully opaque (1s transition + 200ms buffer)
          navTimeoutRef.current = setTimeout(() => {
            setIsNavigating(true)
            navigate(`/venue/${venueSlug}`)
          }, 1200)
        }, 1200)
      })
    })
  }

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
        navigationTimeoutRef.current = null
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current)
        fadeTimeoutRef.current = null
      }
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current)
        navTimeoutRef.current = null
      }
      if (popupExitTimeoutRef.current) {
        clearTimeout(popupExitTimeoutRef.current)
        popupExitTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    // Reset transition state when component unmounts
    return () => {
      setTransitionOverlayOpacity(0)
    }
  }, [])

  const handleCameraComplete = useCallback(() => {
    // Camera completes but we don't use this for navigation anymore
    // Navigation is triggered by timers in handleSeeMore
    setCameraTarget(null)
  }, [])

  useEffect(() => {
    if (!isNavigating) {
      setPendingSlug(null)
    }
  }, [isNavigating])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const minWorldDistance = useMemo(() => {
    const widthRatio = US_BOUNDS.width / Math.max(viewport.width, 320)
    return Math.max(16, 28 * widthRatio)
  }, [viewport.width])

  const spacedPoints = useMemo(
    () => resolveSpacedPoints(mapPoints, minWorldDistance),
    [mapPoints, minWorldDistance]
  )

  const selectedPoint = useMemo(
    () => spacedPoints.find((point) => point.slug === selectedSlug) || null,
    [spacedPoints, selectedSlug]
  )

  if (showTester) {
    return <ShaderTester onExit={() => setShowSplash(false)} />
  }

  // Mobile view with static map and accordions
  if (isMobile) {
    return (
      <>
        {/* Splash overlay */}
        {showSplash && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-start',
              zIndex: 9999,
              opacity: splashOpacity,
              transition: 'opacity 600ms ease-in-out',
              pointerEvents: splashOpacity > 0 ? 'auto' : 'none',
            }}
          >
            <LiveNationLogo
              stagger={ANIMATIONS.SPLASH_LOGO_STAGGER}
              duration={ANIMATIONS.SPLASH_LOGO_DURATION}
              fillColor="#1D1D1D"
              strokeColor="#1D1D1D"
              style={{
                width: 'calc(100% - 40px)',
                height: 'auto',
                margin: '20px',
              }}
            />
          </div>
        )}
        {/* Map content - renders behind splash */}
        <div
          style={{
            opacity: mapOpacity,
            transition: 'opacity 800ms ease-out',
          }}
        >
          <MobileMapView mapPoints={mapPoints} />
        </div>
      </>
    )
  }

  // Desktop 3D view
  return (
    <>
      {/* Splash overlay */}
      {showSplash && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            zIndex: 9999,
            opacity: splashOpacity,
            transition: 'opacity 600ms ease-in-out',
            pointerEvents: splashOpacity > 0 ? 'auto' : 'none',
          }}
        >
          <LiveNationLogo
            stagger={ANIMATIONS.SPLASH_LOGO_STAGGER}
            duration={ANIMATIONS.SPLASH_LOGO_DURATION}
            fillColor="#1D1D1D"
            strokeColor="#1D1D1D"
            style={{
              width: 'calc(100% - 40px)',
              height: 'auto',
              margin: '20px',
            }}
          />
        </div>
      )}
      {/* Map content - renders behind splash */}
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: COLORS.BACKGROUND_DARK,
          position: 'relative',
          overflow: 'hidden',
          opacity: mapOpacity,
          transition: 'opacity 800ms ease-out',
        }}
      >
        <SiteHeader />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: SPACING.HEADER_HEIGHT,
        }}
      >
        <button
        onClick={() => setShowTester(true)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 120,
          padding: '10px 18px',
          background: COLORS.ACCENT_RED_LIGHT,
          border: 'none',
          borderRadius: '8px',
          color: COLORS.TEXT_WHITE,
          cursor: 'pointer',
          fontWeight: '600'
        }}
      >
        Shader Tester
        </button>

        {(pointsLoading || pointsError || !isSanityConfigured) && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 110,
            padding: '10px 16px',
            background: COLORS.OVERLAY_DARK_65,
            color: COLORS.TEXT_WHITE,
            fontSize: '13px',
            letterSpacing: '0.12em',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {pointsLoading
            ? 'Syncing map data…'
            : !isSanityConfigured
              ? 'Configure Sanity env vars to load live map data.'
              : 'Showing cached map data (Sanity offline)'}
        </div>
        )}

        <Canvas style={{ height: '100%', position: 'relative', zIndex: 0 }}>
        <color attach="background" args={[0, 0, 0]} />
        <PerspectiveCamera
          makeDefault
          position={[164.3, 221.38, 270.94]}
          rotation={[-0.724, 0.286, 0.245]}
        />

        {cameraTarget && (
          <CameraController targetPosition={cameraTarget} onComplete={handleCameraComplete} />
        )}

        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 200, 100]} intensity={1} castShadow />
        <directionalLight position={[-100, 200, -100]} intensity={0.5} />
        <pointLight position={[0, 300, 0]} intensity={0.8} />

        <MapCursorTilt enabled={!cameraTarget}>
          <USMap />

          <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            {spacedPoints
              .filter((point) => Array.isArray(point.adjustedPosition || point.position))
              .map((point, index) => (
                <MapPoint
                  key={point._id || point.slug}
                  position={point.adjustedPosition || point.position}
                  label={point.title}
                  onClick={() => handlePointClick(point.slug)}
                  selected={selectedPoint?.slug === point.slug}
                  onProject={selectedPoint?.slug === point.slug ? handleProjectUpdate : undefined}
                  staggerIndex={index}
                  revealStartTime={pinsRevealStartTime}
                  onHover={handlePinHover}
                />
              ))}
          </group>
        </MapCursorTilt>

        <gridHelper args={[1000, 20, '#333333', '#222222']} position={[0, -5, 0]} />
        </Canvas>
      </div>
    </div>

    {/* Selection overlay and cursor outside map/Canvas so they always paint on top */}
    {selectedPoint && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          paddingTop: SPACING.HEADER_HEIGHT,
          pointerEvents: 'none',
          zIndex: Z_INDEX.SELECTION_OVERLAY,
          isolation: 'isolate',
        }}
      >
        <SelectionOverlay
          point={selectedPoint}
          screenRef={selectedPointScreenRef}
          onSeeMore={handleSeeMore}
          onClose={() => {
            if (popupExitTimeoutRef.current) {
              clearTimeout(popupExitTimeoutRef.current)
              popupExitTimeoutRef.current = null
            }
            setPopupExiting(false)
            setSelectedSlug(null)
          }}
          isLoading={isNavigating || Boolean(cameraTarget)}
          isExiting={popupExiting}
        />
      </div>
    )}
    <CursorFollower active ref={cursorFollowerRef} />

    {/* Transition Overlay - Fade to black */}
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        opacity: transitionOverlayOpacity,
        transition: 'opacity 1000ms ease-in-out',
        pointerEvents: transitionOverlayOpacity > 0 ? 'auto' : 'none',
        zIndex: 200,
      }}
    />
    </>
  )
}

const CONNECTOR_DRAW_DURATION_MS = 500
const CONNECTOR_ENDPOINT_DELAY_MS = 520       // slightly after line finishes drawing (500ms)
const CONNECTOR_RETRACT_DURATION_MS = 180
const POPUP_EXIT_DURATION_MS = 200
const POPUP_ENTER_DURATION_MS = 220

function SelectionOverlay({ point, screenRef, onSeeMore, onClose, isLoading, isExiting = false }) {
  const cardRef = useRef(null)
  const anchorRef = useRef(null)
  const pathRef = useRef(null)
  const endpointRef = useRef(null)
  const drawPhaseRef = useRef('drawing')
  const initialPathDRef = useRef(null)
  const drawCompleteTimeoutRef = useRef(null)
  const drawCancelledRef = useRef(false)
  const drawStartScheduledRef = useRef(false)
  const drawStartedForSlugRef = useRef(null)
  const slugRef = useRef(null)
  const [entered, setEntered] = useState(false)

  const updateAnchor = useCallback(() => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    anchorRef.current = {
      x: rect.right,
      y: rect.top + rect.height / 2,
    }
  }, [])

  useLayoutEffect(() => {
    updateAnchor()
  }, [updateAnchor, point?.slug])

  // Exit: when isExiting, card animates out
  useEffect(() => {
    if (isExiting) setEntered(false)
  }, [isExiting])

  // When exit starts, retract the line (draw off) then path is cleared on next point change
  useEffect(() => {
    if (!isExiting) return
    const pathEl = pathRef.current
    if (!pathEl) return
    const length = pathEl.getTotalLength()
    if (length > 0) {
      pathEl.setAttribute('stroke-dasharray', String(length))
      pathEl.style.transition = `stroke-dashoffset ${CONNECTOR_RETRACT_DURATION_MS}ms ease-out`
      pathEl.setAttribute('stroke-dashoffset', String(length))
    }
  }, [isExiting])

  // Enter: when not exiting and we have a point, animate card in after a frame
  useLayoutEffect(() => {
    if (!point || isExiting) return
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [point?.slug, isExiting])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handle = () => updateAnchor()
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [updateAnchor])

  const upperName = point?.title?.toUpperCase?.() ?? ''
  const subtitle = point?.state ? point.state.toUpperCase() : 'UNITED STATES'

  useEffect(() => {
    if (typeof point?.slug === 'undefined') return
    slugRef.current = point.slug
    // Only reset draw state when switching to a different slug (prevents double draw in Strict Mode)
    if (drawStartedForSlugRef.current === point.slug) return
    drawCancelledRef.current = true
    drawPhaseRef.current = 'drawing'
    initialPathDRef.current = null
    drawStartScheduledRef.current = false
    if (drawCompleteTimeoutRef.current != null) {
      cancelAnimationFrame(drawCompleteTimeoutRef.current)
      drawCompleteTimeoutRef.current = null
    }
    if (endpointRef.current) {
      endpointRef.current.style.opacity = '0'
    }
    // Clear path to card anchor only so old pin's path is not visible when SVG fades in (avoids double-draw look)
    const anchor = anchorRef.current
    if (pathRef.current && anchor) {
      pathRef.current.setAttribute('d', `M ${anchor.x} ${anchor.y}`)
    }
    drawCancelledRef.current = false
    drawStartedForSlugRef.current = point.slug
  }, [point?.slug])

  const applyLineStyles = useCallback(() => {
    const screenPos = screenRef?.current
    const start = anchorRef.current
    const pathEl = pathRef.current
    const circleEl = endpointRef.current

    if (!pathEl || !start || !screenPos) {
      return
    }

    const { x: startX, y: startY } = start
    const { x: endX, y: endY } = screenPos
    const containerEndY = endY + SPACING.HEADER_HEIGHT
    const midX = Math.max(startX + 80, endX)
    const pathD = `M ${startX} ${startY} H ${midX} V ${containerEndY} H ${endX}`

    if (drawPhaseRef.current === 'drawing') {
      if (!initialPathDRef.current && !drawStartScheduledRef.current) {
        drawStartScheduledRef.current = true
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            drawStartScheduledRef.current = false
            const start = anchorRef.current
            const screenPos = screenRef?.current
            if (!pathEl || !start || !screenPos) return
            const sx = start.x
            const sy = start.y
            const ex = screenPos.x
            const ey = screenPos.y
            const cey = ey + SPACING.HEADER_HEIGHT
            const mx = Math.max(sx + 80, ex)
            const pathDNew = `M ${sx} ${sy} H ${mx} V ${cey} H ${ex}`
            initialPathDRef.current = pathDNew
            pathEl.setAttribute('d', pathDNew)
            const length = pathEl.getTotalLength()
            pathEl.setAttribute('stroke-dasharray', String(length))
            pathEl.setAttribute('stroke-dashoffset', String(length))
            pathEl.style.transition = ''
            const startTime = performance.now()
            const durationMs = CONNECTOR_DRAW_DURATION_MS
            const tick = () => {
              if (drawCancelledRef.current) return
              const elapsed = performance.now() - startTime
              const progress = Math.min(elapsed / durationMs, 1)
              const offset = length * (1 - progress)
              pathEl.setAttribute('stroke-dashoffset', String(offset))
              if (progress < 1) {
                drawCompleteTimeoutRef.current = requestAnimationFrame(tick)
              } else {
                pathEl.setAttribute('stroke-dasharray', '10000')
                pathEl.setAttribute('stroke-dashoffset', '0')
                pathEl.style.transition = ''
                drawPhaseRef.current = 'following'
                drawCompleteTimeoutRef.current = null
              }
            }
            drawCompleteTimeoutRef.current = requestAnimationFrame(tick)
            if (endpointRef.current) {
              endpointRef.current.setAttribute('cx', String(ex))
              endpointRef.current.setAttribute('cy', String(cey))
            }
          })
        })
      }
    } else {
      pathEl.setAttribute('d', pathD)
    }

    if (circleEl && drawPhaseRef.current === 'following') {
      circleEl.setAttribute('cx', String(endX))
      circleEl.setAttribute('cy', String(containerEndY))
    }
  }, [screenRef])

  useEffect(() => {
    // Stop the rAF loop when exiting to free up frame budget for camera animation
    if (isExiting) return
    let frame
    const loop = () => {
      applyLineStyles()
      frame = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      cancelAnimationFrame(frame)
      drawCancelledRef.current = true
      if (drawCompleteTimeoutRef.current != null) {
        cancelAnimationFrame(drawCompleteTimeoutRef.current)
        drawCompleteTimeoutRef.current = null
      }
    }
  }, [applyLineStyles, isExiting])

  // Dot: reset to hidden immediately on point change, then fade in after line finishes
  useEffect(() => {
    if (endpointRef.current) {
      endpointRef.current.style.transition = 'none'
      endpointRef.current.style.opacity = '0'
    }
    const t = setTimeout(() => {
      if (endpointRef.current) {
        endpointRef.current.style.transition = 'opacity 0.3s ease-out'
        endpointRef.current.style.opacity = '1'
      }
    }, CONNECTOR_ENDPOINT_DELAY_MS)
    return () => clearTimeout(t)
  }, [point?.slug])

  // Dot: fade out when exiting
  useEffect(() => {
    if (!isExiting || !endpointRef.current) return
    endpointRef.current.style.transition = `opacity ${CONNECTOR_RETRACT_DURATION_MS}ms ease-out`
    endpointRef.current.style.opacity = '0'
  }, [isExiting])

  const cardVisible = !isExiting && entered
  const cardTransition = `opacity ${POPUP_ENTER_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${POPUP_ENTER_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`

  return (
    <>
      <div
        ref={cardRef}
        style={{
          position: 'absolute',
          bottom: '60px',
          left: '60px',
          background: '#f7f7f7',
          color: '#111',
          padding: '40px 24px 18px',
          textAlign: 'center',
          borderRadius: 0,
          boxShadow: '0 20px 45px rgba(0,0,0,0.45)',
          minWidth: '260px',
          zIndex: 130,
          letterSpacing: '0.05em',
          pointerEvents: isExiting ? 'none' : 'auto',
          opacity: cardVisible ? 1 : 0,
          transform: cardVisible ? 'scale(1)' : 'scale(0.98)',
          transition: cardTransition,
        }}
      >
        <button
          aria-label="Close selection"
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ff2b2b'
            e.currentTarget.style.borderColor = '#ff2b2b'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = '#555'
            e.currentTarget.style.color = '#555'
          }}
          style={{
            position: 'absolute',
            top: '10px',
            right: '12px',
            background: 'transparent',
            border: '2px solid #555',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#555',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
            padding: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>

        <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>{upperName}</div>
        <div style={{ fontSize: '14px', letterSpacing: '0.2em', marginBottom: '14px' }}>{subtitle}</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onSeeMore}
            disabled={isLoading}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ff2b2b'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.borderColor = '#ff2b2b'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#000'
              e.currentTarget.style.borderColor = '#000'
            }}
            style={{
              width: '60%',
              padding: '10px 0',
              borderRadius: 0,
              border: '1px solid #000',
              background: 'transparent',
              color: '#000',
              fontFamily: 'var(--font-display, "Poppins", sans-serif)',
              fontWeight: 700,
              letterSpacing: '0.12em',
              cursor: isLoading ? 'default' : 'pointer',
              opacity: isLoading ? 0.65 : 1,
              textTransform: 'uppercase',
              transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
            }}
          >
            {isLoading ? 'Preparing…' : 'See More'}
          </button>
        </div>
      </div>

      <svg
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: Z_INDEX.LINE_DRAWING,
          opacity: isExiting ? 0 : 1,
          transition: `opacity ${POPUP_EXIT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
        aria-hidden
      >
        <path
          ref={pathRef}
          fill="none"
          stroke={COLORS.ACCENT_RED}
          strokeWidth={2}
        />
        <circle
          ref={endpointRef}
          r={5}
          fill="rgba(0,0,0,0.65)"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={2}
          style={{ opacity: 0 }}
        />
      </svg>
    </>
  )
}

const CursorFollower = forwardRef(function CursorFollower({ active }, ref) {
  const wrapperRef = useRef(null)
  const animationRef = useRef(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const element = wrapperRef.current
    if (!element) return

    const setVisibility = (visible) => {
      element.style.opacity = visible ? '1' : '0'
    }

    const updateStyles = () => {
      const { x: cx, y: cy } = currentRef.current
      element.style.transform = `translate3d(${cx - 37}px, ${cy - 37}px, 0)`
    }

    const animate = () => {
      const { x: tx, y: ty } = targetRef.current
      const current = currentRef.current
      current.x += (tx - current.x) * 0.28
      current.y += (ty - current.y) * 0.28
      updateStyles()
      animationRef.current = requestAnimationFrame(animate)
    }

    const handleMove = (event) => {
      targetRef.current.x = event.clientX
      targetRef.current.y = event.clientY
    }

    if (active) {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      targetRef.current = { x: centerX, y: centerY }
      currentRef.current = { x: centerX, y: centerY }
      updateStyles()
      setVisibility(true)
      window.addEventListener('mousemove', handleMove, { passive: true })
      animationRef.current = requestAnimationFrame(animate)
    } else {
      setVisibility(false)
    }

    return () => {
      window.removeEventListener('mousemove', handleMove)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [active])

  return (
    <div
      ref={(el) => {
        wrapperRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '74px',
        height: '74px',
        pointerEvents: 'none',
        zIndex: 90,
        opacity: 0,
        transition: 'opacity 0.2s ease-out',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            border: '1px dashed rgba(255,0,0,0.2)',
          }}
        />
        <div
          data-cursor-inner=""
          style={{
            position: 'relative',
            width: '36px',
            height: '36px',
            border: `2px solid ${COLORS.ACCENT_RED}`,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(255,0,0,0.35)',
            transition: 'border-color 0.2s ease-out, box-shadow 0.2s ease-out, transform 0.2s ease-out',
          }}
        >
          <div
            data-cursor-bar=""
            style={{
              position: 'absolute',
              width: '22px',
              height: '2px',
              background: COLORS.ACCENT_RED,
              transition: 'background 0.2s ease-out',
            }}
          />
          <div
            data-cursor-bar=""
            style={{
              position: 'absolute',
              width: '2px',
              height: '22px',
              background: COLORS.ACCENT_RED,
              transition: 'background 0.2s ease-out',
            }}
          />
          <div
            data-cursor-bar=""
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: COLORS.ACCENT_RED,
              transition: 'background 0.2s ease-out',
            }}
          />
        </div>
      </div>
    </div>
  )
})
