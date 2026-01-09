import { Suspense, useMemo, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas, useLoader } from '@react-three/fiber'
import { TextureLoader, PlaneGeometry } from 'three'
import FlashlightPlane from '../FlashlightPlane'
import VenueGalleryModule from '../modules/VenueGalleryModule'

export default function VenuePage({ mapPoints, pointsLoading }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const venue = useMemo(() => {
    return mapPoints.find((point) => point.slug === slug) || null
  }, [mapPoints, slug])

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
          <h1>{pointsLoading ? 'Loading Venue…' : 'Venue Not Found'}</h1>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '20px',
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
        </div>
      </div>
    )
  }

  const heroUrl = venue.heroImageUrl
  const heroStyle = {
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#030303',
    backgroundImage: heroUrl
      ? `linear-gradient(120deg, rgba(0,0,0,0.75), rgba(0,0,0,0.35)), url(${heroUrl})`
      : 'linear-gradient(120deg, rgba(0,0,0,0.8), rgba(0,0,0,0.7))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#fff',
    position: 'relative',
    paddingTop: '80px',
    paddingBottom: '60px',
  }

  const heroShift =
    viewportWidth <= 680 ? -22 : viewportWidth <= 1100 ? -38 : viewportWidth <= 1400 ? -50 : -58

  return (
    <div
      style={{
        backgroundColor: '#030303',
        color: '#fff',
        width: '100%',
        height: '100vh',
        overflowY: 'auto',
      }}
    >
      <div style={heroStyle}>
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

        <div
          style={{
            flex: 1,
            width: '100%',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            zIndex: 5,
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `translateY(${heroShift}%)`,
            }}
          >
            {venue.logoUrl && (
              <LogoFlashlightPanel
                logoUrl={venue.logoUrl}
                aspectRatio={venue.logoAspectRatio}
                logoDimensions={venue.logoDimensions}
                viewportWidth={viewportWidth}
              />
            )}
          </div>
        </div>
      </div>

      {venue.gallery && venue.gallery.length > 0 && (
        <VenueGalleryModule images={venue.gallery} />
      )}
    </div>
  )
}

function LogoFlashlightPanel({
  logoUrl,
  aspectRatio = 5.2,
  logoDimensions = {},
  viewportWidth,
}) {
  if (!logoUrl) return null

  const widthFromMeta =
    typeof logoDimensions.width === 'number' && logoDimensions.width > 0 ? logoDimensions.width : null
  const heightFromMeta =
    typeof logoDimensions.height === 'number' && logoDimensions.height > 0
      ? logoDimensions.height
      : null

  const safeAspect =
    widthFromMeta && heightFromMeta
      ? widthFromMeta / heightFromMeta
      : Number(aspectRatio) > 0.05
        ? aspectRatio
        : 5.2

  const isMobile = viewportWidth <= 768
  const panelWidth = isMobile ? 'min(85vw, 520px)' : 'min(55vw, 960px)'
  const planeScale = 0.92

  const containerStyle = {
    width: panelWidth,
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '16px',
    boxShadow: '0 40px 90px rgba(0,0,0,0.65)',
  }

  const ratioWrapperStyle = {
    width: '100%',
    position: 'relative',
    paddingTop: `${100 / safeAspect}%`,
    overflow: 'hidden',
    borderRadius: '12px',
  }

  return (
    <div
      style={containerStyle}
    >
      <div
        style={ratioWrapperStyle}
      >
        <Canvas
          orthographic
          camera={{
            position: [0, 0, 10],
            zoom: 1,
            left: -safeAspect / 2,
            right: safeAspect / 2,
            top: 0.5,
            bottom: -0.5,
            near: 0,
            far: 1000,
          }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, premultipliedAlpha: false }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <ambientLight intensity={0.55} />
          <pointLight position={[0, 120, 160]} intensity={1.1} />
          <Suspense fallback={null}>
            <LogoFlashlight
              logoUrl={logoUrl}
              planeWidth={safeAspect}
              planeHeight={1}
              scaleMultiplier={planeScale}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}

function LogoFlashlight({ logoUrl, scaleMultiplier = 1, planeWidth = 640, planeHeight = 120 }) {
  const geometry = useMemo(() => new PlaneGeometry(planeWidth, planeHeight), [planeWidth, planeHeight])

  useEffect(() => () => geometry.dispose(), [geometry])

  const texture = useLoader(TextureLoader, logoUrl, (loader) => {
    loader.setCrossOrigin?.('anonymous')
  })

  return (
    <FlashlightPlane
      texture={texture}
      geometry={geometry}
      scale={[scaleMultiplier, scaleMultiplier, scaleMultiplier]}
      position={[0, 0, 0]}
      configureParams={(params) => {
        params.radius = 0.58
        params.feather = 0.75
        params.intensity = 2.7
        params.ambient = 0.12
        params.sweepSpeed = 0.22
        params.sweepMin = 0.05
        params.sweepMax = 0.95
        params.sweepY = 0.45
        params.pingPong = true
      }}
    />
  )
}
