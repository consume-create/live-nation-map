import { useState, useCallback, useLayoutEffect, useRef, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Vector3 } from 'three'
import USMap from '../USMap'
import MapPoint from '../MapPoint'
import ShaderTester from '../ShaderTester'
import { isSanityConfigured } from '../lib/sanityClient'
import CameraController from '../CameraController'
import { US_BOUNDS } from '../usStates'
import SiteHeader from '../modules/SiteHeader'
import MobileMapView from '../components/MobileMapView'

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

const HEADER_HEIGHT = 180

export default function MapPage({ mapPoints, pointsLoading, pointsError }) {
  const navigate = useNavigate()
  const [selectedSlug, setSelectedSlug] = useState(null)
  const [showTester, setShowTester] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [cameraTarget, setCameraTarget] = useState(null)
  const [pendingSlug, setPendingSlug] = useState(null)
  const [showSplash, setShowSplash] = useState(true)
  const [splashOpacity, setSplashOpacity] = useState(0)
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }))
  const [transitionOverlayOpacity, setTransitionOverlayOpacity] = useState(0)
  const selectedPointScreenRef = useRef(null)
  const navigationTimeoutRef = useRef(null)
  const fadeTimeoutRef = useRef(null)
  const navTimeoutRef = useRef(null)

  useEffect(() => {
    // Fade in immediately
    const fadeInTimer = setTimeout(() => {
      setSplashOpacity(1)
    }, 50)

    // Start fade out after 2 seconds
    const fadeOutTimer = setTimeout(() => {
      setSplashOpacity(0)
    }, 2000)

    // Remove splash after fade out completes
    const hideTimer = setTimeout(() => {
      setShowSplash(false)
    }, 2600)

    return () => {
      clearTimeout(fadeInTimer)
      clearTimeout(fadeOutTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  // Tablet breakpoint for responsive swap
  const isMobile = viewport.width < 768

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

  const buildFocusTarget = useCallback((point) => {
    if (!point || !Array.isArray(point.position)) return null
    const [px = 0, py = 0] = point.position
    const worldCenter = new Vector3(px, 12.5, -py)
    return {
      position: worldCenter,
      zoomFactor: 0.3,  // Zoom to 30% of current distance from target
    }
  }, [])

  const handlePointClick = (slug) => {
    if (isNavigating || cameraTarget) return
    selectedPointScreenRef.current = null
    setSelectedSlug((current) => (current === slug ? null : slug))
  }

  const handleSeeMore = () => {
    if (!selectedPoint?.slug || isNavigating || cameraTarget) return

    const focusTarget = buildFocusTarget(selectedPoint)

    setPendingSlug(selectedPoint.slug)

    // Close panel immediately to prevent line animation glitches
    setSelectedSlug(null)

    if (!focusTarget) {
      setIsNavigating(true)
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
      navigationTimeoutRef.current = setTimeout(() => {
        navigate(`/venue/${selectedPoint.slug}`)
      }, 3000)
      return
    }

    // Start camera animation
    setCameraTarget(focusTarget)

    // Start fade to black at 2 seconds (while camera is still moving)
    fadeTimeoutRef.current = setTimeout(() => {
      setTransitionOverlayOpacity(1)

      // Navigate 1 second later (when fade completes at 3 seconds total)
      navTimeoutRef.current = setTimeout(() => {
        setIsNavigating(true)
        navigate(`/venue/${selectedPoint.slug}`)
      }, 1000)
    }, 2000)
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
    return Math.max(8, 18 * widthRatio)
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
    return <ShaderTester onExit={() => setShowTester(false)} />
  }

  if (showSplash) {
    return (
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
          transition: 'opacity 500ms ease-in-out',
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}images/live-nation-logo.svg`}
          alt="Live Nation"
          style={{
            width: 'calc(100% - 40px)',
            height: 'auto',
            margin: '20px',
          }}
        />
      </div>
    )
  }

  // Mobile view with static map and accordions
  if (isMobile) {
    return <MobileMapView mapPoints={mapPoints} />
  }

  // Desktop 3D view
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000000', position: 'relative', overflow: 'hidden' }}>
      <SiteHeader />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: HEADER_HEIGHT,
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
          background: '#ff6b6b',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
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
            background: 'rgba(0, 0, 0, 0.65)',
            color: '#fff',
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

        {selectedPoint && (
        <SelectionOverlay
          point={selectedPoint}
          screenRef={selectedPointScreenRef}
          onSeeMore={handleSeeMore}
          onClose={() => setSelectedSlug(null)}
          isLoading={isNavigating || Boolean(cameraTarget)}
        />
        )}

        <Canvas style={{ height: '100%' }}>
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

        <USMap />

        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          {spacedPoints
            .filter((point) => Array.isArray(point.adjustedPosition || point.position))
            .map((point) => (
              <MapPoint
                key={point._id || point.slug}
                position={point.adjustedPosition || point.position}
                label={point.title}
                onClick={() => handlePointClick(point.slug)}
                selected={selectedPoint?.slug === point.slug}
                onProject={selectedPoint?.slug === point.slug ? handleProjectUpdate : undefined}
              />
            ))}
        </group>

        <gridHelper args={[1000, 20, '#333333', '#222222']} position={[0, -5, 0]} />
        </Canvas>

        <CursorFollower active />

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
      </div>
    </div>
  )
}

function SelectionOverlay({ point, screenRef, onSeeMore, onClose, isLoading }) {
  const cardRef = useRef(null)
  const anchorRef = useRef(null)
  const h1Ref = useRef(null)
  const vRef = useRef(null)
  const h2Ref = useRef(null)
  const endpointRef = useRef(null)

  const updateAnchor = useCallback(() => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const nextAnchor = {
      x: rect.right,
      y: rect.top + rect.height / 2,
    }
    anchorRef.current = nextAnchor
  }, [])

  useLayoutEffect(() => {
    updateAnchor()
  }, [updateAnchor, point?.slug])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handle = () => updateAnchor()
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [updateAnchor])

  const upperName = point?.title?.toUpperCase?.() ?? ''
  const subtitle = point?.state ? point.state.toUpperCase() : 'UNITED STATES'

  const hasAnimatedRef = useRef(false)

  useEffect(() => {
    hasAnimatedRef.current = false
    if (h1Ref.current) {
      h1Ref.current.style.width = '0px'
      h1Ref.current.style.opacity = '0'
    }
    if (vRef.current) {
      vRef.current.style.height = '0px'
      vRef.current.style.opacity = '0'
    }
    if (h2Ref.current) {
      h2Ref.current.style.width = '0px'
      h2Ref.current.style.opacity = '0'
    }
    if (endpointRef.current) {
      endpointRef.current.style.opacity = '0'
    }
  }, [point?.slug])

  const applyLineStyles = useCallback(() => {
    const screenPos = screenRef?.current
    const start = anchorRef.current
    const horizontalOne = h1Ref.current
    const verticalLine = vRef.current
    const horizontalTwo = h2Ref.current
    const endpoint = endpointRef.current

    if (!horizontalOne || !verticalLine || !endpoint || !start || !screenPos) {
      if (horizontalOne) horizontalOne.style.opacity = '0'
      if (verticalLine) verticalLine.style.opacity = '0'
      if (horizontalTwo) horizontalTwo.style.opacity = '0'
      if (endpoint) endpoint.style.opacity = '0'
      hasAnimatedRef.current = false
      return
    }

    // Anchor is in viewport coords, MapPoint is in Canvas coords (needs offset for paddingTop)
    const { x: startX, y: startY } = start
    const { x: endX, y: endY } = screenPos
    const containerEndY = endY + HEADER_HEIGHT // Add padding offset to Canvas coords
    const midX = Math.max(startX + 80, endX)

    // Set positions (these don't animate)
    horizontalOne.style.left = `${startX}px`
    horizontalOne.style.top = `${startY}px`

    const verticalTop = Math.min(startY, containerEndY)
    verticalLine.style.left = `${midX}px`
    verticalLine.style.top = `${verticalTop}px`

    const horizontalTwoWidth = Math.abs(endX - midX)
    const horizontalTwoLeft = Math.min(endX, midX)
    if (horizontalTwo && horizontalTwoWidth > 0.5) {
      horizontalTwo.style.left = `${horizontalTwoLeft}px`
      horizontalTwo.style.top = `${containerEndY}px`
    }

    endpoint.style.left = `${endX - 5}px`
    endpoint.style.top = `${containerEndY - 5}px`

    const applyDimensions = () => {
      horizontalOne.style.width = `${Math.max(0, midX - startX)}px`

      const verticalHeight = Math.abs(containerEndY - startY)
      verticalLine.style.height = `${verticalHeight}px`
      verticalLine.style.opacity = verticalHeight > 0 ? '1' : '0'

      if (horizontalTwo) {
        if (horizontalTwoWidth > 0.5) {
          horizontalTwo.style.width = `${horizontalTwoWidth}px`
          horizontalTwo.style.opacity = '1'
        } else {
          horizontalTwo.style.opacity = '0'
        }
      }

      endpoint.style.opacity = '1'
    }

    const ensureVisible = () => {
      horizontalOne.style.opacity = '1'
      applyDimensions()
    }

    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true
      requestAnimationFrame(ensureVisible)
    } else {
      ensureVisible()
    }
  }, [screenRef])

  useEffect(() => {
    let frame
    const loop = () => {
      applyLineStyles()
      frame = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(frame)
  }, [applyLineStyles])

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
          padding: '14px 24px 18px',
          textAlign: 'center',
          borderRadius: '6px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.45)',
          minWidth: '260px',
          zIndex: 130,
          letterSpacing: '0.05em',
        }}
      >
        <button
          aria-label="Close selection"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '12px',
            background: 'transparent',
            border: 'none',
            color: '#555',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ×
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
              borderRadius: '4px',
              border: '1px solid #000',
              background: 'transparent',
              color: '#000',
              fontWeight: 600,
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

      <div
        ref={h1Ref}
        style={{
          position: 'absolute',
          zIndex: 110,
          pointerEvents: 'none',
          borderTop: '2px dashed rgba(255,255,255,0.7)',
          opacity: 0,
          transition: 'opacity 0.4s ease-out, width 0.4s ease-out',
        }}
      />
      <div
        ref={vRef}
        style={{
          position: 'absolute',
          zIndex: 110,
          pointerEvents: 'none',
          borderLeft: '2px dashed rgba(255,255,255,0.7)',
          opacity: 0,
          transition: 'opacity 0.4s ease-out 0.1s, height 0.4s ease-out 0.1s',
        }}
      />
      <div
        ref={h2Ref}
        style={{
          position: 'absolute',
          zIndex: 110,
          pointerEvents: 'none',
          borderTop: '2px dashed rgba(255,255,255,0.7)',
          opacity: 0,
          transition: 'opacity 0.4s ease-out 0.2s, width 0.4s ease-out 0.2s',
        }}
      />
      <div
        ref={endpointRef}
        style={{
          position: 'absolute',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.85)',
          background: 'rgba(0,0,0,0.65)',
          zIndex: 111,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.4s ease-out 0.3s',
        }}
      />
    </>
  )
}

function CursorFollower({ active }) {
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
      ref={wrapperRef}
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
          style={{
            position: 'relative',
            width: '36px',
            height: '36px',
            border: '2px solid #ff2b2b',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(255,0,0,0.35)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '22px',
              height: '2px',
              background: '#ff2b2b',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '2px',
              height: '22px',
              background: '#ff2b2b',
            }}
          />
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#ff2b2b',
            }}
          />
        </div>
      </div>
    </div>
  )
}
