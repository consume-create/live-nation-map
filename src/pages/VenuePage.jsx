import { Suspense, useMemo, useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import Building from '../Building'
import CameraController from '../CameraController'

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[10, 10, 10]} />
      <meshStandardMaterial color="#ff2b2b" wireframe />
    </mesh>
  )
}

export default function VenuePage({ mapPoints, pointsLoading }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [cameraTarget, setCameraTarget] = useState(null)
  const buildingPosition = useMemo(() => [0, 0, 0], [])

  const venue = useMemo(() => {
    return mapPoints.find((point) => point.slug === slug) || null
  }, [mapPoints, slug])

  useEffect(() => {
    setCameraTarget(null)
  }, [slug])

  const handleBuildingReady = useCallback(({ center, size, radius }) => {
    const centerArray = Array.isArray(center) ? center : [0, 0, 0]
    const sizeArray = Array.isArray(size) ? size : [0, 0, 0]

    const centerVec = new Vector3(
      centerArray[0] ?? 0,
      centerArray[1] ?? 0,
      centerArray[2] ?? 0
    )
    const positionVec = new Vector3(
      buildingPosition[0] ?? 0,
      buildingPosition[1] ?? 0,
      buildingPosition[2] ?? 0
    )
    const worldCenter = positionVec.add(centerVec)

    const verticalSpan = Math.abs(sizeArray[1] ?? 0)
    const lookOffset = new Vector3(0, verticalSpan * 0.25, 0)
    const lookAtPoint = worldCenter.clone().add(lookOffset)

    const fallbackRadius = sizeArray.reduce(
      (max, value) => Math.max(max, Math.abs(value ?? 0)),
      0
    ) * 0.5

    const effectiveRadius = radius && radius > 0 ? radius : fallbackRadius || 60

    const offset = new Vector3(
      effectiveRadius * 0.25,
      effectiveRadius * 1.8,
      effectiveRadius * 3.9
    )

    setCameraTarget({
      position: lookAtPoint,
      offset,
    })
  }, [buildingPosition])

  if (pointsLoading) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#030303', color: '#fff' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <h1>Loading Venue…</h1>
        </div>
      </div>
    )
  }

  if (!venue) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#030303', color: '#fff' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <h1>Venue Not Found</h1>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#ff2b2b',
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
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#030303' }}>
      <button
        onClick={() => navigate('/')}
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

      <Canvas gl={{ preserveDrawingBuffer: true, antialias: true }}>
        <color attach="background" args={[0, 0, 0]} />
        <PerspectiveCamera makeDefault position={[0, 40, 100]} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={50}
          maxDistance={450}
        />

        {cameraTarget && <CameraController targetPosition={cameraTarget} />}

        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 200, 100]} intensity={1} castShadow />
        <directionalLight position={[-100, 200, -100]} intensity={0.5} />
        <pointLight position={[0, 300, 0]} intensity={0.8} />

        <Suspense fallback={<LoadingFallback />}>
          <Building
            position={buildingPosition}
            venue={venue}
            onReady={handleBuildingReady}
          />
        </Suspense>
      </Canvas>

      {venue.gallery && venue.gallery.length > 0 && (
        <PhotosOverlay images={venue.gallery} />
      )}
    </div>
  )
}

function PhotosOverlay({ images = [] }) {
  if (!images.length) return null

  const entries = images.slice(0, 5)

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
