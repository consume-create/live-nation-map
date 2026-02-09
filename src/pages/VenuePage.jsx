import { Suspense, useMemo, useEffect, useLayoutEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Canvas, useLoader } from '@react-three/fiber'
import { TextureLoader, PlaneGeometry } from 'three'
import FlashlightPlane from '../FlashlightPlane'
import VenueGalleryModule from '../modules/VenueGalleryModule'
import VenueAboutModule from '../modules/VenueAboutModule'
import NextUpModule from '../modules/NextUpModule'
import SiteHeader from '../modules/SiteHeader'
import BackButton from '../components/BackButton'
import { useViewportWidth } from '../hooks/useViewportWidth'
import { COLORS, BREAKPOINTS, Z_INDEX, ANIMATIONS, CAMERA } from '../constants/theme'
import { updateVenueSEO, resetToSiteSEO } from '../App'

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

const FLASHLIGHT_FOV_RAD = (CAMERA.FLASHLIGHT_FOV * Math.PI) / 180

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

    // Security: Remove all inline event handlers and dangerous elements
    const allElements = svg.querySelectorAll('*')
    allElements.forEach((el) => {
      // Remove all on* event handlers (onclick, onload, onmouseover, etc.)
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.toLowerCase().startsWith('on')) {
          el.removeAttribute(attr.name)
        }
      })
      // Remove javascript: hrefs
      if (el.hasAttribute('href') && el.getAttribute('href')?.toLowerCase().startsWith('javascript:')) {
        el.removeAttribute('href')
      }
      if (el.hasAttribute('xlink:href') && el.getAttribute('xlink:href')?.toLowerCase().startsWith('javascript:')) {
        el.removeAttribute('xlink:href')
      }
    })
    // Remove script and foreignObject elements entirely
    svg.querySelectorAll('script, foreignObject').forEach((el) => el.remove())

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

const HERO_REVEAL_SLIDE_MS = 0 // Delay before starting reveal animation

export default function VenuePage({ mapPoints, pointsLoading, siteSettings }) {
  const { slug } = useParams()
  const viewportWidth = useViewportWidth()
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

  // Update SEO meta tags for this venue
  useEffect(() => {
    if (venue) {
      updateVenueSEO(venue, siteSettings)
    }
    return () => {
      // Reset to site-level SEO on unmount
      resetToSiteSEO(siteSettings)
    }
  }, [venue, siteSettings])

  const heroUrl = venue?.heroImageUrl || null
  const heroLineSvgUrl = venue?.heroLineSvgUrl || null

  useEffect(() => {
    // Ensure body can scroll for venue pages
    document.body.style.overflowY = 'auto'

    return () => {
      document.body.style.overflowY = ''
    }
  }, [])

  // Scroll to top when navigating to a new venue (after loader fade-in completes)
  useEffect(() => {
    // Loader fade-in is 450ms, scroll after it's fully opaque
    const scrollTimer = setTimeout(() => {
      window.scrollTo(0, 0)
    }, 500)
    return () => clearTimeout(scrollTimer)
  }, [slug])

  useEffect(() => {
    // Lock scroll while loader is active
    if (showHeroLoader) {
      document.body.style.overflowY = 'hidden'
    } else {
      document.body.style.overflowY = 'auto'
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
    setHeroVisible(false)

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
    setShowHeroLoader(true)

    function scheduleLoaderHide(reason) {
      if (cancelled || loaderHideScheduled) return
      loaderHideScheduled = true
      const elapsed = Date.now() - loaderStartRef.current
      const remaining = Math.max(0, ANIMATIONS.HERO_LOADER_MIN_MS - elapsed)
      const hide = () => {
        if (cancelled) return
        setShowHeroLoader(false)
        setHeroVisible(false)
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
      try {
        const response = await fetch(url, { mode: 'cors' })
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`)
        }
        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('svg')) {
          throw new Error('Asset is not SVG')
        }
        return response.text()
      } catch (error) {
        if (error.name === 'TypeError') {
          // Network error (CORS, offline, etc.)
          throw new Error(`Network error loading SVG: ${error.message}`)
        }
        throw error
      }
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
          scheduleLoaderHide('hero art ready')
        }
      } catch (error) {
        if (!cancelled) {
          setHeroSvgMarkup(null)
          setHeroLineSvgMarkup(null)
          setHeroArtReady(false)
          setHeroLineReady(false)
          setAllowLineAnimation(false)
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
      fadeTimer = setTimeout(() => {
        setHeroVisible(true)
      }, ANIMATIONS.HERO_REVEAL_FADE_MS)
    }
    return () => {
      if (fadeTimer) clearTimeout(fadeTimer)
    }
  }, [heroLoaderRendered])

  useEffect(() => {
    if (!heroVisible || !heroLineReady) return undefined
    const slideTimer = setTimeout(() => {
      setAllowLineAnimation(true)
    }, HERO_REVEAL_SLIDE_MS)
    return () => clearTimeout(slideTimer)
  }, [heroVisible, heroLineReady])

  if (!venue) return null

  const isMobile = viewportWidth < BREAKPOINTS.MOBILE

  const heroStyle = {
    width: '100%',
    minHeight: isMobile ? 'auto' : '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: COLORS.BACKGROUND_DARK,
    backgroundImage:
      heroUrl && !heroArtReady
        ? `linear-gradient(120deg, rgba(0,0,0,0.75), rgba(0,0,0,0.35)), url(${heroUrl})`
        : 'linear-gradient(120deg, rgba(0,0,0,0.8), rgba(0,0,0,0.7))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#fff',
    position: 'relative',
    paddingBottom: '60px',
    visibility: heroLoaderRendered ? 'hidden' : 'visible',
  }

  const heroArtStageStyle = {
    position: 'relative',
    width: '100%',
    maxWidth: '100%',
    marginLeft: 0,
    aspectRatio: '1920 / 1080',
    minHeight: isMobile ? 'auto' : '60vh',
    overflow: 'hidden',
    opacity: heroVisible ? 1 : 0,
    transition: `opacity ${ANIMATIONS.HERO_REVEAL_FADE_MS}ms ease`,
  }

  return (
    <main
      style={{
        backgroundColor: COLORS.BACKGROUND_DARK,
        color: COLORS.TEXT_WHITE,
        width: '100%',
        paddingTop: 180,
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      <SiteHeader />
      <BackButton />

      <h1 className="sr-only">{venue.title}</h1>

      {heroLoaderRendered && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: Z_INDEX.VENUE_LOADER,
            background: COLORS.BACKGROUND_DARK,
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
              key={venue.slug}
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

      <NextUpModule currentSlug={slug} venues={mapPoints} />
    </main>
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
          key={venueSlug}
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

  // Pre-set stroke-dasharray/dashoffset when markup changes (before shouldAnimate is true)
  // This ensures strokes are in their hidden state when the container becomes visible
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    const container = containerRef.current
    if (!container) return
    const svg = container.querySelector('svg')
    if (!svg) return

    const drawables = Array.from(svg.querySelectorAll('path, line, polyline, polygon'))
    drawables.forEach((el) => {
      // Get stroke length for dasharray
      const rawLength = getDrawableLength(el)
      const length = Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 1000

      // Pre-set to hidden state (dashoffset = full length means stroke is invisible)
      el.style.strokeDasharray = `${length}`
      el.style.strokeDashoffset = `${length}`
      el.style.opacity = '0'
    })
  }, [markup]) // Only depends on markup - runs before shouldAnimate becomes true

  // useLayoutEffect ensures animation styles are applied BEFORE browser paint,
  // preventing flash of fully-drawn lines during page transitions
  useLayoutEffect(() => {
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

    const drawables = Array.from(svg.querySelectorAll('path, line, polyline, polygon'))

    if (drawables.length === 0) {
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
        // Force browser reflow to ensure animation restarts cleanly
        void el.offsetWidth
      })
      drawables.forEach((el, idx) => {
        el.style.animation = `hero-svg-draw ${duration}s ease-out forwards`
        el.style.animationDelay = `${idx * delayStep}s`
      })
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

  const isMobile = viewportWidth <= BREAKPOINTS.MOBILE
  const rawWidth = viewportWidth * (isMobile ? 0.8 : 0.5)
  const clampedWidth = Math.max(220, rawWidth)
  const panelWidth = `${clampedWidth}px`
  const scaleMultiplier = isMobile ? 0.95 : 0.85
  const baseScale = CAMERA.FLASHLIGHT_SCALE_BASE * scaleMultiplier

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
          camera={{ position: [0, 0, CAMERA.FLASHLIGHT_DISTANCE], fov: CAMERA.FLASHLIGHT_FOV }}
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
    const width = CAMERA.FLASHLIGHT_BASE_HEIGHT * resolvedAspect
    return new PlaneGeometry(width, CAMERA.FLASHLIGHT_BASE_HEIGHT)
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
    2 * CAMERA.FLASHLIGHT_DISTANCE * Math.tan(Math.max(FLASHLIGHT_FOV_RAD / 2, 0.001))
  const planeWidth = CAMERA.FLASHLIGHT_BASE_HEIGHT * resolvedAspect
  const baseScale = CAMERA.FLASHLIGHT_SCALE_BASE * scaleMultiplier
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
