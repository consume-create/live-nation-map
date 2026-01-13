import { Suspense, useMemo, useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas, useLoader } from '@react-three/fiber'
import { TextureLoader, PlaneGeometry } from 'three'
import FlashlightPlane from '../FlashlightPlane'
import VenueGalleryModule from '../modules/VenueGalleryModule'
import VenueAboutModule from '../modules/VenueAboutModule'
import SiteHeader from '../modules/SiteHeader'

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

const FLASHLIGHT_PLANE_BASE_HEIGHT = 120
const FLASHLIGHT_SCALE_BASE = 1.1
const FLASHLIGHT_CAMERA_FOV = 30
const FLASHLIGHT_CAMERA_DISTANCE = 450
const FLASHLIGHT_FOV_RAD = (FLASHLIGHT_CAMERA_FOV * Math.PI) / 180

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
  const [heroLoaderRendered, setHeroLoaderRendered] = useState(true)
  const loaderStartRef = useRef(0)
  const loaderTimeoutRef = useRef(null)
  const heroLoadStartRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    return () => {
      if (loaderTimeoutRef.current) {
        clearTimeout(loaderTimeoutRef.current)
        loaderTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (showHeroLoader) {
      setHeroLoaderRendered(true)
      return undefined
    }
    const timer = setTimeout(() => setHeroLoaderRendered(false), 450)
    return () => clearTimeout(timer)
  }, [showHeroLoader])

  const venue = useMemo(() => {
    return mapPoints.find((point) => point.slug === slug) || null
  }, [mapPoints, slug])

  const heroUrl = venue?.heroImageUrl || null
  const heroLineSvgUrl = venue?.heroLineSvgUrl || null

  useEffect(() => {
    // Ensure body can scroll for venue pages
    document.body.style.overflow = 'auto'

    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    // Lock scroll while loader is active
    if (showHeroLoader) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
  }, [showHeroLoader])

  useEffect(() => {
    let cancelled = false
    setHeroSvgMarkup(null)
    setHeroLineSvgMarkup(null)
    setHeroSvgReady(false)

    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current)
      loaderTimeoutRef.current = null
    }

    if (!heroUrl) {
      setShowHeroLoader(false)
      return () => {
        cancelled = true
      }
    }

    loaderStartRef.current = Date.now()
    heroLoadStartRef.current = loaderStartRef.current
    console.log(`[VenuePage] Hero loader shown for "${slug}" at ${new Date(loaderStartRef.current).toISOString()}`)
    setShowHeroLoader(true)

    function finishLoader() {
      if (cancelled) return
      const minDisplayMs = 3000
      const elapsed = Date.now() - loaderStartRef.current
      const remaining = Math.max(0, minDisplayMs - elapsed)
      if (remaining === 0) {
        setShowHeroLoader(false)
        console.log(`[VenuePage] Loader hidden immediately after ${elapsed}ms for "${slug}"`)
        return
      }
      loaderTimeoutRef.current = setTimeout(() => {
        loaderTimeoutRef.current = null
        if (!cancelled) {
          setShowHeroLoader(false)
          console.log(
            `[VenuePage] Loader hidden after delay ${remaining}ms (elapsed ${elapsed}ms) for "${slug}"`
          )
        }
      }, remaining)
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
          const loadDuration = Date.now() - heroLoadStartRef.current
          console.log(`[VenuePage] Hero assets ready for "${slug}" in ${loadDuration}ms`)
          finishLoader()
        }
      } catch (error) {
        console.warn('Failed to load hero SVG', error)
        if (!cancelled) {
          setHeroSvgMarkup(null)
          setHeroLineSvgMarkup(null)
          setHeroSvgReady(false)
          const failDuration = Date.now() - heroLoadStartRef.current
          console.log(`[VenuePage] Hero asset load failed for "${slug}" after ${failDuration}ms`)
          finishLoader()
        }
      }
    }

    loadHeroAssets()
    return () => {
      cancelled = true
    }
  }, [heroUrl, heroLineSvgUrl])

  if (!venue) return null

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
        paddingTop: 180,
        position: 'relative',
      }}
    >
      <SiteHeader />
      {heroLoaderRendered && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 250,
            background: 'rgba(3,3,3,0.95)',
            opacity: showHeroLoader ? 1 : 0,
            transition: 'opacity 0.45s ease',
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
        {heroSvgReady && !showHeroLoader && heroSvgMarkup && (
          <>
            <HeroStaticSVG markup={heroSvgMarkup} />
            <HeroSVGAnimator
              markup={heroLineSvgMarkup || heroSvgMarkup}
              venueSlug={venue.slug}
            />
          </>
        )}

      </div>

      {venue.aboutModule && <VenueAboutModule about={venue.aboutModule} />}

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

function HeroSVGAnimator({ markup, accelerate = true, venueSlug }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    ensureHeroSvgStyles()
    const container = containerRef.current
    if (!container) return undefined
    const svg = container.querySelector('svg')
    if (!svg) return undefined
    normalizeSvgElement(svg)
    if (venueSlug) {
      console.log(`[VenuePage] Starting hero line animation for "${venueSlug}"`)
    } else {
      console.log('[VenuePage] Starting hero line animation (slug unknown)')
    }

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
  }, [markup, accelerate, venueSlug])

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
        ? Number(aspectRatio)
        : 5.2

  const [displayAspect, setDisplayAspect] = useState(() => safeAspect)

  useEffect(() => {
    setDisplayAspect(safeAspect)
  }, [safeAspect])

  const isMobile = viewportWidth <= 768
  const rawWidth = viewportWidth * (isMobile ? 0.8 : 0.5)
  const clampedWidth = Math.max(220, rawWidth)
  const panelWidth = `${clampedWidth}px`
  const scaleMultiplier = isMobile ? 0.95 : 0.85
  const baseScale = FLASHLIGHT_SCALE_BASE * scaleMultiplier

  return (
    <div
      style={{
        width: panelWidth,
        maxWidth: isMobile ? '90vw' : '60vw',
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
          aspectRatio: `${displayAspect} / 1`,
          minHeight: isMobile ? 200 : 260,
        }}
      >
        <Canvas
          camera={{ position: [0, 0, FLASHLIGHT_CAMERA_DISTANCE], fov: FLASHLIGHT_CAMERA_FOV }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, premultipliedAlpha: false }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.55} />
          <pointLight position={[0, 120, 160]} intensity={1.1} />
          <Suspense fallback={null}>
            <LogoFlashlight
              logoUrl={logoUrl}
              scaleMultiplier={scaleMultiplier}
              aspectRatio={displayAspect}
              onAspectResolved={(ratio) => {
                if (typeof ratio === 'number' && ratio > 0 && Math.abs(ratio - displayAspect) > 0.01) {
                  setDisplayAspect(ratio)
                }
              }}
              viewportWidth={viewportWidth}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}

function LogoFlashlight({ logoUrl, aspectRatio = 5.2, scaleMultiplier = 1, onAspectResolved }) {
  const resolvedAspect = useMemo(
    () => (Number(aspectRatio) > 0.05 ? Number(aspectRatio) : 5.2),
    [aspectRatio]
  )
  const geometry = useMemo(() => {
    const width = FLASHLIGHT_PLANE_BASE_HEIGHT * resolvedAspect
    return new PlaneGeometry(width, FLASHLIGHT_PLANE_BASE_HEIGHT)
  }, [resolvedAspect])

  useEffect(
    () => () => {
      geometry.dispose()
    },
    [geometry]
  )

  const texture = useLoader(TextureLoader, logoUrl, (loader) => {
    loader.setCrossOrigin?.('anonymous')
  })

  useEffect(() => {
    if (!texture?.image) return undefined
    const image = texture.image
    const width = image.naturalWidth || image.videoWidth || image.width
    const height = image.naturalHeight || image.videoHeight || image.height
    if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
      const ratio = width / height
      if (ratio > 0 && typeof onAspectResolved === 'function') {
        onAspectResolved(ratio)
      }
    }
    return undefined
  }, [texture, onAspectResolved])

  const viewWidthAtCamera =
    2 * FLASHLIGHT_CAMERA_DISTANCE * Math.tan(Math.max(FLASHLIGHT_FOV_RAD / 2, 0.001))
  const planeWidth = FLASHLIGHT_PLANE_BASE_HEIGHT * resolvedAspect
  const baseScale = FLASHLIGHT_SCALE_BASE * scaleMultiplier
  const scaledPlaneWidth = planeWidth * baseScale
  const fitScale = scaledPlaneWidth > viewWidthAtCamera ? viewWidthAtCamera / scaledPlaneWidth : 1
  const finalScale = baseScale * fitScale

  return (
    <FlashlightPlane
      texture={texture}
      geometry={geometry}
      scale={[finalScale, finalScale, finalScale]}
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
