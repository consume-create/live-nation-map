import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CanvasTexture, LinearFilter, PlaneGeometry, SRGBColorSpace } from 'three'
import GUI from 'lil-gui'
import FlashlightPlane from '../FlashlightPlane'
import { useViewportWidth } from '../hooks/useViewportWidth'
import { BREAKPOINTS, CAMERA, COLORS } from '../constants/theme'

const PRODUCTION_DEFAULTS = {
  radius: 0.58,
  feather: 0.75,
  intensity: 2.7,
  ambient: 0.12,
  sweepSpeed: 0.22,
  sweepMin: 0.05,
  sweepMax: 0.95,
  sweepY: 0.45,
  pingPong: true,
}

const FLASHLIGHT_FOV_RAD = (CAMERA.FLASHLIGHT_FOV * Math.PI) / 180

export default function PlaygroundPage({ mapPoints, pointsLoading }) {
  const viewportWidth = useViewportWidth()

  const venues = useMemo(() => {
    return (mapPoints || [])
      .filter((p) => Boolean(p?.logoUrl))
      .slice()
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  }, [mapPoints])

  const [venueSlug, setVenueSlug] = useState(null)

  useEffect(() => {
    if (!venueSlug && venues.length) setVenueSlug(venues[0].slug)
  }, [venues, venueSlug])

  const activeVenue = useMemo(() => {
    if (!venues.length) return null
    return venues.find((v) => v.slug === venueSlug) || venues[0]
  }, [venues, venueSlug])

  const paramsRef = useRef({ ...PRODUCTION_DEFAULTS })
  const modeRef = useRef({ mode: 'manual', manualX: 0.5 })
  const [uiTick, setUiTick] = useState(0)
  const guiStateRef = useRef({ built: false, gui: null, removeKeyListener: null })
  const setVenueSlugRef = useRef(setVenueSlug)
  setVenueSlugRef.current = setVenueSlug

  useEffect(() => {
    if (guiStateRef.current.built || !venues.length) return
    guiStateRef.current.built = true

    const params = paramsRef.current
    const gui = new GUI()
    gui.domElement.style.position = 'absolute'
    gui.domElement.style.top = '20px'
    gui.domElement.style.right = '20px'
    gui.domElement.style.zIndex = '210'

    const venueMap = {}
    venues.forEach((v) => {
      const label = v.title || v.slug
      venueMap[label] = v.slug
    })
    const controls = {
      venue: venues[0].slug,
      mode: modeRef.current.mode,
      manualX: modeRef.current.manualX,
    }

    gui
      .add(controls, 'venue', venueMap)
      .name('Logo')
      .onChange((slug) => {
        setVenueSlugRef.current(slug)
      })

    gui
      .add(controls, 'mode', { Manual: 'manual', Auto: 'auto' })
      .name('Mode')
      .onChange((value) => {
        modeRef.current.mode = value
        setUiTick((n) => n + 1)
      })

    gui
      .add(controls, 'manualX', 0, 1, 0.001)
      .name('Manual X')
      .onChange((value) => {
        modeRef.current.manualX = value
        setUiTick((n) => n + 1)
      })

    const sweepFolder = gui.addFolder('Sweep (Auto)')
    sweepFolder.add(params, 'sweepSpeed', 0.05, 2.0, 0.01).name('Speed')
    sweepFolder.add(params, 'pingPong').name('Ping-Pong')
    sweepFolder
      .add(params, 'sweepMin', 0.0, 1.0, 0.01)
      .name('Start X')
      .onChange((value) => {
        if (value > params.sweepMax) params.sweepMax = value
      })
    sweepFolder
      .add(params, 'sweepMax', 0.0, 1.0, 0.01)
      .name('End X')
      .onChange((value) => {
        if (value < params.sweepMin) params.sweepMin = value
      })
    sweepFolder.add(params, 'sweepY', 0.0, 1.0, 0.01).name('Y Position')
    sweepFolder.open()

    const handleKey = (e) => {
      if (e.key !== 'h' && e.key !== 'H') return
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      const el = gui.domElement
      el.style.display = el.style.display === 'none' ? '' : 'none'
    }
    window.addEventListener('keydown', handleKey)

    guiStateRef.current.gui = gui
    guiStateRef.current.removeKeyListener = () => window.removeEventListener('keydown', handleKey)
  }, [venues])

  useEffect(
    () => () => {
      if (guiStateRef.current.removeKeyListener) guiStateRef.current.removeKeyListener()
      if (guiStateRef.current.gui) guiStateRef.current.gui.destroy()
      guiStateRef.current = { built: false, gui: null, removeKeyListener: null }
    },
    []
  )

  if (pointsLoading) {
    return <CenteredMessage>Loading venues…</CenteredMessage>
  }

  if (!activeVenue) {
    return <CenteredMessage>No venues with logos available.</CenteredMessage>
  }

  const isMobile = viewportWidth <= BREAKPOINTS.MOBILE
  const rawWidth = viewportWidth * (isMobile ? 0.8 : 0.665)
  const clampedWidth = Math.max(220, rawWidth)
  const panelWidth = `${clampedWidth}px`
  const scaleMultiplier = isMobile ? 0.95 : 0.85

  const pointerOverride =
    modeRef.current.mode === 'manual' ? { x: modeRef.current.manualX } : null

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        background: COLORS.BACKGROUND_DARK,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: panelWidth,
          maxWidth: isMobile ? '90vw' : '80vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: `${activeVenue.logoAspectRatio || 5.2} / 1`,
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
              <PlaygroundFlashlight
                key={activeVenue.slug}
                activeVenue={activeVenue}
                paramsObj={paramsRef.current}
                pointerOverride={pointerOverride}
                scaleMultiplier={scaleMultiplier}
                uiTick={uiTick}
              />
            </Suspense>
          </Canvas>
        </div>
      </div>
    </div>
  )
}

function CenteredMessage({ children }) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: COLORS.BACKGROUND_DARK,
        color: COLORS.TEXT_WHITE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        fontSize: 14,
        opacity: 0.6,
      }}
    >
      {children}
    </div>
  )
}

function PlaygroundFlashlight({ activeVenue, paramsObj, pointerOverride, scaleMultiplier }) {
  const resolvedAspect = useMemo(() => {
    const ratio = Number(activeVenue.logoAspectRatio)
    return ratio > 0.05 ? ratio : 5.2
  }, [activeVenue])

  const geometry = useMemo(() => {
    const width = CAMERA.FLASHLIGHT_BASE_HEIGHT * resolvedAspect
    return new PlaneGeometry(width, CAMERA.FLASHLIGHT_BASE_HEIGHT)
  }, [resolvedAspect])

  useEffect(() => () => geometry.dispose(), [geometry])

  const [texture, setTexture] = useState(null)
  useEffect(() => {
    if (!activeVenue.logoUrl) return undefined
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      const svgW = img.naturalWidth || img.width || 400
      const svgH = img.naturalHeight || img.height || 80
      const scale = 4
      const canvas = document.createElement('canvas')
      canvas.width = svgW * scale
      canvas.height = svgH * scale
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const tex = new CanvasTexture(canvas)
      tex.minFilter = LinearFilter
      tex.magFilter = LinearFilter
      tex.generateMipmaps = false
      tex.colorSpace = SRGBColorSpace
      tex.needsUpdate = true
      setTexture(tex)
    }
    img.onerror = (err) => {
      console.warn('[Playground] Failed to load logo image:', activeVenue.logoUrl, err)
    }
    img.src = activeVenue.logoUrl
    return () => {
      cancelled = true
    }
  }, [activeVenue.logoUrl])

  const viewWidthAtCamera =
    2 * CAMERA.FLASHLIGHT_DISTANCE * Math.tan(Math.max(FLASHLIGHT_FOV_RAD / 2, 0.001))
  const planeWidth = CAMERA.FLASHLIGHT_BASE_HEIGHT * resolvedAspect
  const baseScale = CAMERA.FLASHLIGHT_SCALE_BASE * scaleMultiplier
  const scaledPlaneWidth = planeWidth * baseScale
  const fitScale = scaledPlaneWidth > viewWidthAtCamera ? viewWidthAtCamera / scaledPlaneWidth : 1
  const finalScale = baseScale * fitScale

  if (!texture) return null

  return (
    <FlashlightPlane
      texture={texture}
      geometry={geometry}
      scale={[finalScale, finalScale, finalScale]}
      position={[0, 0, 0]}
      externalParams={paramsObj}
      pointerOverride={pointerOverride}
    />
  )
}
