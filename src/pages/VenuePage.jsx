import { Suspense, useMemo, useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas, useLoader } from '@react-three/fiber'
import { TextureLoader, PlaneGeometry } from 'three'
import FlashlightPlane from '../FlashlightPlane'
import VenueGalleryModule from '../modules/VenueGalleryModule'

let heroSvgStylesInjected = false
function ensureHeroSvgStyles() {
  if (heroSvgStylesInjected) return
  const style = document.createElement('style')
  style.id = 'hero-svg-draw-style'
  style.textContent = `
    @keyframes hero-svg-draw {
      0% { stroke-dashoffset: var(--hero-svg-length, 0); opacity: 0; }
      20% { opacity: 1; }
      100% { stroke-dashoffset: 0; opacity: 1; }
    }
  `
  document.head.appendChild(style)
  heroSvgStylesInjected = true
}

function normalizeSvgElement(svg) {
  if (!svg) return
  let viewBox = svg.getAttribute('viewBox')
  if (!viewBox) {
    const widthAttr = parseFloat(svg.getAttribute('width') || '0')
    const heightAttr = parseFloat(svg.getAttribute('height') || '0')
    if (widthAttr > 0 && heightAttr > 0) {
      viewBox = `0 0 ${widthAttr} ${heightAttr}`
      svg.setAttribute('viewBox', viewBox)
    }
  }
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.style.width = '100%'
  svg.style.height = '100%'
}

export default function VenuePage({ mapPoints, pointsLoading }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  )
  const [heroSvgMarkup, setHeroSvgMarkup] = useState(null)
  const [heroLineSvgMarkup, setHeroLineSvgMarkup] = useState(null)
  const [heroSvgReady, setHeroSvgReady] = useState(false)
  const [showHeroLoader, setShowHeroLoader] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!showHeroLoader) return undefined
    const timer = setTimeout(() => setShowHeroLoader(false), 2500)
    return () => clearTimeout(timer)
  }, [showHeroLoader])

  const venue = useMemo(() => {
    return mapPoints.find((point) => point.slug === slug) || null
  }, [mapPoints, slug])

  const heroUrl = venue?.heroImageUrl || null
  const heroLineSvgUrl = venue?.heroLineSvgUrl || null

  useEffect(() => {
    let cancelled = false
    setHeroSvgMarkup(null)
    setHeroLineSvgMarkup(null)
    setHeroSvgReady(false)

    if (!heroUrl) return () => {
      cancelled = true
    }

    async function loadSvg(url) {
      const response = await fetch(url, { mode: 'cors' })
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('svg')) {
        throw new Error('Asset is not SVG')
      }
      return response.text()
    }

    async function loadHeroAssets() {
      try {
        const svgText = await loadSvg(heroUrl)
        if (cancelled) return
        let lineText = svgText
        if (heroLineSvgUrl && heroLineSvgUrl !== heroUrl) {
          try {
            lineText = await loadSvg(heroLineSvgUrl)
          } catch (lineError) {
            console.warn('Failed to load hero line SVG, using hero art', lineError)
            lineText = svgText
          }
        }
        if (!cancelled) {
          setHeroSvgMarkup(svgText)
          setHeroLineSvgMarkup(lineText)
          setHeroSvgReady(true)
          setShowHeroLoader(false)
        }
      } catch (error) {
        console.warn('Failed to load hero SVG', error)
        if (!cancelled) {
          setHeroSvgMarkup(null)
          setHeroLineSvgMarkup(null)
          setHeroSvgReady(false)
        }
      }
    }

    loadHeroAssets()
    return () => {
      cancelled = true
    }
  }, [heroUrl, heroLineSvgUrl])

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

  const heroStyle = {
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#030303',
    backgroundImage:
      heroUrl && !heroSvgReady
        ? `linear-gradient(120deg, rgba(0,0,0,0.75), rgba(0,0,0,0.35)), url(${heroUrl})`
        : 'linear-gradient(120deg, rgba(0,0,0,0.8), rgba(0,0,0,0.7))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#fff',
    position: 'relative',
    paddingTop: '80px',
    paddingBottom: '60px',
  }

  return (
    <div
      style={{
        backgroundColor: '#030303',
        color: '#fff',
        width: '100%',
        height: '100vh',
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {showHeroLoader && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 60,
            background: 'rgba(3,3,3,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
      )}

      <div style={heroStyle}>
        {heroSvgReady && heroSvgMarkup && (
          <>
            <HeroStaticSVG markup={heroSvgMarkup} />
            <HeroSVGAnimator markup={heroLineSvgMarkup || heroSvgMarkup} />
          </>
        )}

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
      </div>

      {venue.gallery && venue.gallery.length > 0 && (
        <VenueGalleryModule images={venue.gallery} />
      )}
    </div>
  )
}

function HeroStaticSVG({ markup }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    const svg = container.querySelector('svg')
    if (svg) normalizeSvgElement(svg)
    return undefined
  }, [markup])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.7,
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}

function HeroSVGAnimator({ markup, accelerate = true }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    ensureHeroSvgStyles()
    const container = containerRef.current
    if (!container) return undefined
    const svg = container.querySelector('svg')
    if (!svg) return undefined
    normalizeSvgElement(svg)

    const drawables = svg.querySelectorAll('path, line, polyline, polygon')
    drawables.forEach((el, idx) => {
      const isPath = typeof el.getTotalLength === 'function'
      const length = isPath ? el.getTotalLength() : 600
      const stroke = el.getAttribute('stroke')
      if (!stroke || /^url/.test(stroke)) {
        el.setAttribute('stroke', 'rgba(255,255,255,0.9)')
      }
      el.setAttribute('fill', 'none')
      el.style.strokeDasharray = `${length}`
      el.style.strokeDashoffset = `${length}`
      el.style.setProperty('--hero-svg-length', `${length}`)
      const duration = accelerate ? 0.45 : 0.6
      const delayStep = accelerate ? 0.015 : 0.02
      el.style.animation = `hero-svg-draw ${duration}s ease-out forwards`
      el.style.animationDelay = `${idx * delayStep}s`
    })
    return undefined
  }, [markup, accelerate])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}

function LogoFlashlightPanel({ logoUrl, aspectRatio = 5.2, logoDimensions = {}, viewportWidth }) {
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
  const panelWidth = isMobile ? '70vw' : '50vw'
  const scaleMultiplier = isMobile ? 1.2 : 1.05

  return (
    <div
      style={{
        width: panelWidth,
        maxWidth: '90vw',
        height: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        padding: '20px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: `${safeAspect} / 1`,
          minHeight: 140,
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 450], fov: 30 }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, premultipliedAlpha: false }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.55} />
          <pointLight position={[0, 120, 160]} intensity={1.1} />
          <Suspense fallback={null}>
            <LogoFlashlight logoUrl={logoUrl} scaleMultiplier={scaleMultiplier} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}

function LogoFlashlight({ logoUrl, scaleMultiplier = 1 }) {
  const geometry = useMemo(() => new PlaneGeometry(320, 60), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  const texture = useLoader(TextureLoader, logoUrl, (loader) => {
    loader.setCrossOrigin?.('anonymous')
  })

  return (
    <FlashlightPlane
      texture={texture}
      geometry={geometry}
      scale={[1.1 * scaleMultiplier, 1.1 * scaleMultiplier, 1.1 * scaleMultiplier]}
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
