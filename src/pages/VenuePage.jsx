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

function sanitizeSvgMarkup(markup, { stripStrokes = false, removeDrawables = false } = {}) {
  if (typeof DOMParser === 'undefined') return markup
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(markup, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg) return markup
    normalizeSvgElement(svg)
    svg.removeAttribute('style')
    svg.setAttribute('focusable', 'false')

    if (stripStrokes) {
      const strokeElements = svg.querySelectorAll('path, line, polyline, polygon')
      strokeElements.forEach((el) => {
        el.setAttribute('stroke', 'none')
        el.style.stroke = 'none'
        el.style.strokeWidth = '0'
        el.style.removeProperty('stroke-dasharray')
        el.style.removeProperty('stroke-dashoffset')
        el.removeAttribute('stroke-dasharray')
        el.removeAttribute('stroke-dashoffset')
      })
    }

    if (removeDrawables) {
      const drawables = svg.querySelectorAll('path, line, polyline, polygon')
      drawables.forEach((el) => {
        el.parentNode?.removeChild(el)
      })
      const remainingContent = svg.innerHTML.trim()
      if (!remainingContent) {
        return null
      }
    }

    return svg.outerHTML
  } catch (error) {
    console.warn('[VenuePage] Failed to sanitize hero SVG markup', error)
    return markup
  }
}

const HERO_LOADER_MIN_MS = 1500
const HERO_REVEAL_FADE_MS = 500
const HERO_REVEAL_SLIDE_MS = 0

export default function VenuePage({ mapPoints, pointsLoading }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  )
  const [heroSvgMarkup, setHeroSvgMarkup] = useState(null)
  const [heroLineSvgMarkup, setHeroLineSvgMarkup] = useState(null)
  const [heroArtReady, setHeroArtReady] = useState(false)
  const [heroLineReady, setHeroLineReady] = useState(false)
  const [allowLineAnimation, setAllowLineAnimation] = useState(false)
  const [showHeroLoader, setShowHeroLoader] = useState(true)
  const [heroLoaderRendered, setHeroLoaderRendered] = useState(true)
  const [heroVisible, setHeroVisible] = useState(false)
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
    let loaderHideScheduled = false
    setHeroSvgMarkup(null)
    setHeroLineSvgMarkup(null)
    setHeroArtReady(false)
    setHeroLineReady(false)
    setAllowLineAnimation(false)

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
    console.log(
      `[VenuePage] Hero loader shown for "${slug}" at ${new Date(loaderStartRef.current).toISOString()}`
    )
    setShowHeroLoader(true)

    function scheduleLoaderHide(reason) {
      if (cancelled || loaderHideScheduled) return
      loaderHideScheduled = true
      const elapsed = Date.now() - loaderStartRef.current
      const remaining = Math.max(0, HERO_LOADER_MIN_MS - elapsed)
      const hide = () => {
        if (cancelled) return
        setShowHeroLoader(false)
        setHeroVisible(false)
        console.log(
          `[VenuePage] Loader hidden (${reason}) after ${Date.now() - loaderStartRef.current}ms for "${slug}"`
        )
      }
      if (remaining === 0) {
        hide()
        return
      }
      loaderTimeoutRef.current = setTimeout(() => {
        loaderTimeoutRef.current = null
        hide()
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
        const sanitizedHero = sanitizeSvgMarkup(svgText)
        let lineMarkup = sanitizedHero

        if (heroLineSvgUrl && heroLineSvgUrl !== heroUrl) {
          try {
            const lineText = await loadSvg(heroLineSvgUrl)
            lineMarkup = sanitizeSvgMarkup(lineText)
          } catch (lineError) {
            console.warn('Failed to load hero line SVG, using hero art', lineError)
          }
        }

        if (!cancelled) {
          setHeroSvgMarkup(sanitizedHero)
          setHeroArtReady(true)
          setHeroLineSvgMarkup(lineMarkup)
          const hasLineMarkup = Boolean(lineMarkup)
          setHeroLineReady(hasLineMarkup)
          if (!heroLoaderRendered && hasLineMarkup) {
            setAllowLineAnimation(true)
          }
          const loadDuration = Date.now() - heroLoadStartRef.current
          console.log(`[VenuePage] Hero assets ready for "${slug}" in ${loadDuration}ms`)
          scheduleLoaderHide('hero art ready')
        }
      } catch (error) {
        console.warn('Failed to load hero SVG', error)
        if (!cancelled) {
          setHeroSvgMarkup(null)
          setHeroLineSvgMarkup(null)
          setHeroArtReady(false)
          setHeroLineReady(false)
          setAllowLineAnimation(false)
          const failDuration = Date.now() - heroLoadStartRef.current
          console.log(`[VenuePage] Hero asset load failed for "${slug}" after ${failDuration}ms`)
          scheduleLoaderHide('hero art failed')
        }
      }
    }

    loadHeroAssets()
    return () => {
      cancelled = true
      if (loaderTimeoutRef.current) {
        clearTimeout(loaderTimeoutRef.current)
        loaderTimeoutRef.current = null
      }
    }
  }, [heroUrl, heroLineSvgUrl, slug])

  useEffect(() => {
    let fadeTimer = null
    if (!heroLoaderRendered) {
      console.log(
        `[VenuePage] Loader unmounted for "${slug}", scheduling hero visible in ${HERO_REVEAL_FADE_MS}ms at ${Date.now()}`
      )
      fadeTimer = setTimeout(() => {
        console.log(
          `[VenuePage] Setting heroVisible=true for "${slug}" at ${Date.now()}, elapsed from page load: ${Date.now() - loaderStartRef.current}ms`
        )
        setHeroVisible(true)
      }, HERO_REVEAL_FADE_MS)
    }
    return () => {
      if (fadeTimer) clearTimeout(fadeTimer)
    }
  }, [heroLoaderRendered, slug])

  useEffect(() => {
    if (!heroVisible || !heroLineReady) return undefined
    console.log(
      `[VenuePage] heroVisible=true and heroLineReady=true for "${slug}", scheduling allowLineAnimation in ${HERO_REVEAL_SLIDE_MS}ms at ${Date.now()}`
    )
    const slideTimer = setTimeout(() => {
      console.log(
        `[VenuePage] Setting allowLineAnimation=true for "${slug}" at ${Date.now()}, elapsed from page load: ${Date.now() - loaderStartRef.current}ms`
      )
      setAllowLineAnimation(true)
    }, HERO_REVEAL_SLIDE_MS)
    return () => clearTimeout(slideTimer)
  }, [heroVisible, heroLineReady, slug])

  if (!venue) return null

  const heroStyle = {
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#030303',
    backgroundImage:
      heroUrl && !heroArtReady
        ? `linear-gradient(120deg, rgba(0,0,0,0.75), rgba(0,0,0,0.35)), url(${heroUrl})`
        : 'linear-gradient(120deg, rgba(0,0,0,0.8), rgba(0,0,0,0.7))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#fff',
    position: 'relative',
    paddingBottom: '60px',
  }

  const heroArtStageStyle = {
    position: 'relative',
    width: '100vw',
    maxWidth: '100vw',
    marginLeft: 'calc(50% - 50vw)',
    aspectRatio: '1920 / 1080',
    minHeight: '60vh',
    overflow: 'hidden',
    opacity: heroVisible ? 1 : 0,
    transition: `opacity ${HERO_REVEAL_FADE_MS}ms ease`,
  }

  return (
    <div
      style={{
        backgroundColor: '#030303',
        color: '#fff',
        width: '100%',
        paddingTop: 180,
        position: 'relative',
        overflowX: 'hidden',
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
        {heroArtReady && heroSvgMarkup && (
          <div style={heroArtStageStyle}>
            <HeroArtLayers
              markup={heroSvgMarkup}
              lineMarkup={heroLineSvgMarkup}
              stageStyle={heroArtStageStyle}
              venueSlug={venue.slug}
              heroVisible={heroVisible}
              shouldAnimate={allowLineAnimation && heroLineReady}
            />
          </div>
        )}

      </div>

      {venue.aboutModule && <VenueAboutModule about={venue.aboutModule} />}

      {venue.gallery && venue.gallery.length > 0 && (
        <VenueGalleryModule images={venue.gallery} />
      )}
    </div>
  )
}

function HeroArtLayers({ markup, lineMarkup, stageStyle, venueSlug, heroVisible, shouldAnimate }) {
  const stageRef = useRef(null)
  const staticRef = useRef(null)
  const lineRef = useRef(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const observer = new ResizeObserver(() => {
      const staticSvg = staticRef.current?.querySelector('svg')
      if (staticSvg) normalizeSvgElement(staticSvg)
      const lineSvg = lineRef.current?.querySelector('svg')
      if (lineSvg) normalizeSvgElement(lineSvg)
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [markup, lineMarkup])

  return (
    <div ref={stageRef} style={stageStyle}>
      <div
        ref={staticRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.7,
          transform: heroVisible ? 'translateY(0)' : 'translateY(80px)',
          transition: 'transform 2000ms ease',
        }}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
      {lineMarkup && (
        <HeroSVGAnimator
          markup={lineMarkup}
          venueSlug={venueSlug}
          innerRef={lineRef}
          shouldAnimate={shouldAnimate}
        />
      )}
    </div>
  )
}

function getDrawableLength(element) {
  if (!element) return 0
  if (typeof element.getTotalLength === 'function') {
    try {
      const length = element.getTotalLength()
      if (Number.isFinite(length) && length > 0) return length
    } catch (error) {
      console.warn('[VenuePage] Failed to read SVG path length', error)
    }
  }
  try {
    const bbox = element.getBBox()
    if (!bbox) return 0
    const diag = Math.hypot(bbox.width, bbox.height)
      return Number.isFinite(diag) && diag > 0 ? diag : 0
  } catch (error) {
    console.warn('[VenuePage] Failed to read SVG bounds', error)
    return 0
  }
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function HeroSVGAnimator({ markup, accelerate = true, venueSlug, innerRef, shouldAnimate }) {
  const fallbackRef = useRef(null)
  const containerRef = innerRef || fallbackRef

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    ensureHeroSvgStyles()
    const container = containerRef.current
    if (!container) return undefined
    const svg = container.querySelector('svg')
    if (!svg) return undefined
    normalizeSvgElement(svg)
    if (!shouldAnimate || !markup) {
      svg.removeAttribute('data-hero-line-state')
      return undefined
    }
    if (venueSlug) {
      console.log(
        `[VenuePage] shouldAnimate=true, initializing hero line animation for "${venueSlug}" at ${Date.now()}`
      )
    } else {
      console.log(`[VenuePage] shouldAnimate=true, initializing hero line animation at ${Date.now()}`)
    }

    const drawables = Array.from(svg.querySelectorAll('path, line, polyline, polygon'))

    if (drawables.length === 0) {
      console.warn('[VenuePage] No drawable SVG elements found for hero line animation')
      svg.setAttribute('data-hero-line-state', 'empty')
      return () => {
        svg.removeAttribute('data-hero-line-state')
      }
    }

    const reduceMotion = prefersReducedMotion()
    drawables.forEach((el) => {
      const rawLength = getDrawableLength(el)
      const length = Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 1
      let stroke = el.getAttribute('stroke')
      if (!stroke || /^url/i.test(stroke) || stroke === 'none') {
        stroke = 'rgba(255,255,255,0.9)'
        el.setAttribute('stroke', stroke)
      }
      el.style.stroke = stroke
      el.setAttribute('fill', 'none')
      el.style.fill = 'none'
      el.style.strokeDasharray = `${length}`
      el.style.strokeDashoffset = `${length}`
      el.style.setProperty('--hero-svg-length', `${length}`)
      el.style.opacity = '0'
      el.style.animation = 'none'
    })

    let rafStart = null
    const duration = accelerate ? 0.5 : 0.65
    const delayStep = accelerate ? 0.003 : 0.006

    const beginAnimation = () => {
      console.log(
        `[VenuePage] beginAnimation() called for "${venueSlug}" at ${Date.now()}, applying CSS animations to ${drawables.length} elements`
      )
      if (reduceMotion) {
        svg.setAttribute('data-hero-line-state', 'static')
        drawables.forEach((el) => {
          el.style.strokeDashoffset = '0'
        })
        return
      }

      svg.setAttribute('data-hero-line-state', 'animating')
      drawables.forEach((el) => {
        el.style.animation = 'none'
        el.style.strokeDashoffset = el.style.strokeDasharray || el.style.strokeDashoffset
      })
      drawables.forEach((el, idx) => {
        el.style.animation = `hero-svg-draw ${duration}s ease-out forwards`
        el.style.animationDelay = `${idx * delayStep}s`
      })
      console.log(
        `[VenuePage] CSS animations applied for "${venueSlug}", first element will start immediately, last element starts in ${(drawables.length - 1) * delayStep}s`
      )
    }

    rafStart = requestAnimationFrame(beginAnimation)

    return () => {
      svg.removeAttribute('data-hero-line-state')
      drawables.forEach((el) => {
        el.style.animation = 'none'
      })
      if (rafStart) cancelAnimationFrame(rafStart)
    }
  }, [markup, accelerate, venueSlug, shouldAnimate])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: shouldAnimate ? 1 : 0,
        transition: 'opacity 0ms',
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}

export function LogoFlashlightPanel({ logoUrl, aspectRatio = 5.2, logoDimensions = {}, viewportWidth }) {
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
