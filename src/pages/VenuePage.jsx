import { Suspense, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas, useLoader } from '@react-three/fiber'
import { TextureLoader, PlaneGeometry } from 'three'
import FlashlightPlane from '../FlashlightPlane'
import VenueGalleryModule from '../modules/VenueGalleryModule'

export default function VenuePage({ mapPoints, pointsLoading }) {
  const { slug } = useParams()
  const navigate = useNavigate()

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
    overflow: 'hidden',
  }

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
          {venue.logoUrl && <LogoFlashlightPanel logoUrl={venue.logoUrl} />}
        </div>
      </div>

      {venue.gallery && venue.gallery.length > 0 && (
        <VenueGalleryModule images={venue.gallery} />
      )}
    </div>
  )
}

function LogoFlashlightPanel({ logoUrl }) {
  if (!logoUrl) return null

  return (
    <div
      style={{
        width: '420px',
        maxWidth: '90vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 450], fov: 30 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, premultipliedAlpha: false }}
      >
        <ambientLight intensity={0.55} />
        <pointLight position={[0, 120, 160]} intensity={1.1} />
        <Suspense fallback={null}>
          <LogoFlashlight logoUrl={logoUrl} />
        </Suspense>
      </Canvas>
    </div>
  )
}

function LogoFlashlight({ logoUrl }) {
  const geometry = useMemo(() => new PlaneGeometry(320, 60), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  const texture = useLoader(TextureLoader, logoUrl, (loader) => {
    loader.setCrossOrigin?.('anonymous')
  })

  return (
    <FlashlightPlane
      texture={texture}
      geometry={geometry}
      scale={[1.1, 1.1, 1.1]}
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
