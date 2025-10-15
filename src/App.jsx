import { useState, useEffect, useCallback, useLayoutEffect, useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import USMap from './USMap'
import MapPoint from './MapPoint'
import CameraController from './CameraController'
import Building from './Building'
import ShaderTester from './ShaderTester'
import { fetchMapPoints } from './services/mapPoints'
import { fallbackMapPoints } from './data/fallbackMapPoints'
import { isSanityConfigured } from './lib/sanityClient'

export default function App() {
  const [mapPoints, setMapPoints] = useState([])
  const [pointsLoading, setPointsLoading] = useState(true)
  const [pointsError, setPointsError] = useState(null)
  const [selectedSlug, setSelectedSlug] = useState(null)
  const [cameraTarget, setCameraTarget] = useState(null)
  const [showBuilding, setShowBuilding] = useState(false)
  const [buildingPosition, setBuildingPosition] = useState([0, 0, 0])
  const [showTester, setShowTester] = useState(false)
  const selectedPointScreenRef = useRef(null)

  const selectedPoint = useMemo(
    () => mapPoints.find((point) => point.slug === selectedSlug) || null,
    [mapPoints, selectedSlug]
  )

  const handleProjectUpdate = useCallback(({ x, y }) => {
    selectedPointScreenRef.current = { x, y }
  }, [])

  const handlePointClick = (slug) => {
    selectedPointScreenRef.current = null
    setSelectedSlug((current) => (current === slug ? null : slug))
  }

  const handleSeeMore = () => {
    if (!selectedPoint?.position) return

    const [x, y] = selectedPoint.position
    setBuildingPosition([0, 0, 0])

    const targetPos = { x, y: 25, z: -y }
    setCameraTarget({ position: targetPos, offset: [0, 90, 180] })
  }

  const handleAnimationComplete = () => {
    if (!showBuilding && selectedPoint) {
      setTimeout(() => {
        setShowBuilding(true)
        setCameraTarget({ position: { x: 0, y: 40, z: 100 }, offset: [0, 110, 220] })
      }, 800)
    }
  }

  const handleBackToMap = () => {
    setShowBuilding(false)
    setSelectedSlug(null)
    setCameraTarget(null)
    selectedPointScreenRef.current = null
  }

  useEffect(() => {
    let cancelled = false

    async function loadPoints() {
      try {
        setPointsLoading(true)
        const data = await fetchMapPoints()
        if (cancelled) return
        setMapPoints(data)
        setSelectedSlug((prev) => (prev && data.some((item) => item.slug === prev) ? prev : null))
        setPointsError(null)
      } catch (error) {
        if (!cancelled) {
          console.warn('Error loading map points from Sanity', error)
          setPointsError(error)
        }
      } finally {
        if (!cancelled) {
          setPointsLoading(false)
        }
      }
    }

    loadPoints()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    selectedPointScreenRef.current = null
  }, [selectedSlug])

  if (showTester) {
    return <ShaderTester onExit={() => setShowTester(false)} />
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#030303' }}>
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

      {showBuilding && (
        <button
          onClick={handleBackToMap}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 100,
            padding: '12px 24px',
            background: '#4a90e2',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          ← Back to Map
        </button>
      )}

      {!showBuilding && (pointsLoading || pointsError || !isSanityConfigured) && (
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

      {selectedPoint && !showBuilding && (
        <SelectionOverlay
          point={selectedPoint}
          screenRef={selectedPointScreenRef}
          onSeeMore={handleSeeMore}
          onClose={() => setSelectedSlug(null)}
        />
      )}

      <Canvas>
        <color attach="background" args={[0, 0, 0]} />
        <PerspectiveCamera makeDefault position={[0, 400, 400]} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={200}
          maxDistance={800}
          maxPolarAngle={Math.PI / 2}
        />
        <CameraController targetPosition={cameraTarget} onComplete={handleAnimationComplete} />

        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 200, 100]} intensity={1} castShadow />
        <directionalLight position={[-100, 200, -100]} intensity={0.5} />
        <pointLight position={[0, 300, 0]} intensity={0.8} />

        {!showBuilding ? (
          <>
            <USMap />

            <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              {mapPoints
                .filter((point) => Array.isArray(point.position))
                .map((point) => (
                  <MapPoint
                    key={point._id || point.slug}
                    position={point.position}
                    label={point.title}
                    onClick={() => handlePointClick(point.slug)}
                    selected={selectedPoint?.slug === point.slug}
                    onProject={selectedPoint?.slug === point.slug ? handleProjectUpdate : undefined}
                  />
                ))}
            </group>

            <gridHelper args={[1000, 20, '#333333', '#222222']} position={[0, -5, 0]} />
          </>
        ) : (
          <Building position={buildingPosition} venue={selectedPoint} />
        )}
      </Canvas>

      <CursorFollower active={!showBuilding} />

      {showBuilding && selectedPoint && (
        <PhotosOverlay images={selectedPoint.gallery} />
      )}
    </div>
  )
}

function SelectionOverlay({ point, screenRef, onSeeMore, onClose }) {
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
      return
    }

    const { x: startX, y: startY } = start
    const { x: endX, y: endY } = screenPos
    const midX = Math.max(startX + 80, endX)

    horizontalOne.style.left = `${startX}px`
    horizontalOne.style.top = `${startY}px`
    horizontalOne.style.width = `${Math.max(0, midX - startX)}px`
    horizontalOne.style.opacity = '1'

    const verticalTop = Math.min(startY, endY)
    const verticalHeight = Math.abs(endY - startY)
    verticalLine.style.left = `${midX}px`
    verticalLine.style.top = `${verticalTop}px`
    verticalLine.style.height = `${verticalHeight}px`
    verticalLine.style.opacity = verticalHeight > 0 ? '1' : '0'

    if (horizontalTwo) {
      const horizontalTwoWidth = Math.abs(endX - midX)
      const horizontalTwoLeft = Math.min(endX, midX)
      if (horizontalTwoWidth > 0.5) {
        horizontalTwo.style.left = `${horizontalTwoLeft}px`
        horizontalTwo.style.top = `${endY}px`
        horizontalTwo.style.width = `${horizontalTwoWidth}px`
        horizontalTwo.style.opacity = '1'
      } else {
        horizontalTwo.style.opacity = '0'
      }
    }

    endpoint.style.left = `${endX - 5}px`
    endpoint.style.top = `${endY - 5}px`
    endpoint.style.opacity = '1'
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
          top: '60px',
          left: '60px',
          background: '#f7f7f7',
          color: '#111',
          padding: '18px 32px 24px',
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
        {point?.description && (
          <p
            style={{
              margin: '0 0 18px 0',
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#303030',
            }}
          >
            {point.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onSeeMore}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '4px',
              border: 'none',
              background: '#ff2b2b',
              color: '#fff',
              fontWeight: 600,
              letterSpacing: '0.12em',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            See More
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
    if (!element) return undefined

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

function PhotosOverlay({ images = [] }) {
  const fallback = fallbackMapPoints[0]?.gallery ?? []
  const entries = (images.length ? images : fallback).slice(0, 5)

  if (!entries.length) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        color: '#fff',
        fontFamily: 'Orbitron, sans-serif',
      }}
    >
      {entries.map((item, idx) => {
        const { position = {} } = item
        const wrapperStyle = {
          position: 'absolute',
          pointerEvents: 'auto',
        }

        if (typeof position.top === 'number') wrapperStyle.top = `${position.top}%`
        if (typeof position.left === 'number') wrapperStyle.left = `${position.left}%`
        if (typeof position.bottom === 'number') wrapperStyle.bottom = `${position.bottom}%`
        if (typeof position.right === 'number') wrapperStyle.right = `${position.right}%`

        if (!('left' in wrapperStyle) && !('right' in wrapperStyle)) {
          wrapperStyle.left = '50%'
        }
        if (!('top' in wrapperStyle) && !('bottom' in wrapperStyle)) {
          wrapperStyle.top = '50%'
        }

        const width = typeof position.width === 'number' ? position.width : item.width || 220

        return (
          <div key={item._key || idx} style={wrapperStyle}>
            <div
              style={{
                position: 'relative',
                width,
              }}
            >
              <img
                src={item.imageUrl || item.src}
                alt={item.title || ''}
                style={{
                  display: 'block',
                  width: '100%',
                }}
              />
              {(item.title || item.label) && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-28px',
                    left: '0',
                    fontSize: 12,
                    letterSpacing: '0.25em',
                  }}
                >
                  {(item.title || item.label || '').toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
