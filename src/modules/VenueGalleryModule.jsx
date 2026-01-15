import { useState, useEffect, useMemo } from 'react'

const DEFAULT_IMAGE_ASPECT = 4 / 3
const BAND_HEIGHT = 600 // pixels per band for overflow images
const LABEL_HEIGHT = 32 // approximate height for label + margin

const CARD_VARIATIONS = [
  { justify: 'flex-start', translateX: '-6%', translateY: '-8%' },
  { justify: 'center', translateX: '4%', translateY: '-10%' },
  { justify: 'flex-end', translateX: '2%', translateY: '-2%' },
  { justify: 'flex-start', translateX: '-2%', translateY: '10%' },
  { justify: 'center', translateX: '6%', translateY: '4%' },
  { justify: 'flex-end', translateX: '-4%', translateY: '12%' },
  { justify: 'center', translateX: '0%', translateY: '-4%' },
]

// Pixel-based positions - rows spaced 600px apart
const ABSOLUTE_LAYOUTS = [
  // Row 1 (top ~0)
  { top: 0, left: '2%', width: '28%' },      // left
  { top: 0, left: '36%', width: '20%' },     // center
  { top: 0, left: '62%', width: '24%' },     // right
  // Row 2 (top ~600)
  { top: 600, left: '5%', width: '24%' },    // left
  { top: 640, left: '42%', width: '28%' },   // right
  // Row 3 (top ~1200)
  { top: 1200, left: '50%', width: '32%' },  // right
  { top: 1280, left: '8%', width: '30%' },   // left
]

function getAspectRatio(item) {
  if (typeof item?.aspectRatio === 'number' && item.aspectRatio > 0) return item.aspectRatio
  const { width, height } = item || {}
  if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
    return width / height
  }
  return DEFAULT_IMAGE_ASPECT
}

export default function VenueGalleryModule({ images = [] }) {
  if (!Array.isArray(images) || !images.length) return null

  const clampedImages = images.slice(0, 12)

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isCompact = viewportWidth < 900
  const columnGap = isCompact ? 'clamp(32px, 6vw, 80px)' : 'clamp(120px, 8vw, 220px)'
  const rowGap = isCompact ? 64 : 220
  const useAbsoluteLayout = !isCompact

  // Calculate dynamic container height based on actual image positions
  const containerHeight = useMemo(() => {
    if (!useAbsoluteLayout || !clampedImages.length) return 0

    // Estimate container width (maxWidth is 1800px, minus padding)
    const estimatedContainerWidth = Math.min(viewportWidth - 280, 1800)
    let maxBottom = 0

    clampedImages.forEach((item, idx) => {
      const slotIndex = idx % ABSOLUTE_LAYOUTS.length
      const band = Math.floor(idx / ABSOLUTE_LAYOUTS.length)
      const layout = ABSOLUTE_LAYOUTS[slotIndex]
      const aspectRatio = getAspectRatio(item)

      // Calculate top position
      const top = layout.top + band * BAND_HEIGHT

      // Estimate image height based on width percentage and aspect ratio
      const widthPercent = parseFloat(layout.width) / 100
      const imageWidth = estimatedContainerWidth * widthPercent
      const imageHeight = imageWidth / aspectRatio

      // Account for label height
      const totalHeight = imageHeight + LABEL_HEIGHT

      maxBottom = Math.max(maxBottom, top + totalHeight)
    })

    return maxBottom + 80 // Add bottom padding
  }, [clampedImages, useAbsoluteLayout, viewportWidth])

  return (
    <section
      style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        margin: '120px auto 160px',
        padding: '0 clamp(32px, 6vw, 140px)',
        backgroundColor: '#050505',
        backgroundImage: `
          linear-gradient(rgba(200, 0, 0, 0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(200, 0, 0, 0.12) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1800px', margin: '0 auto', position: 'relative' }}>
        <div
          style={
            useAbsoluteLayout
              ? {
                  position: 'relative',
                  height: `${containerHeight}px`,
                  width: '100%',
                }
              : {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  columnGap,
                  rowGap: `${rowGap}px`,
                  alignItems: 'start',
                }
          }
        >
          {clampedImages.map((item, idx) => {
            const label = item.title || item.label || ''
            const aspectRatio = getAspectRatio(item)
            const variation = CARD_VARIATIONS[idx % CARD_VARIATIONS.length] || {}
            const translateX = !useAbsoluteLayout && variation.translateX ? variation.translateX : '0%'
            const translateY = !useAbsoluteLayout && variation.translateY ? variation.translateY : '0%'
            const justifySelf = variation.justify || 'center'
            const slotIndex = idx % ABSOLUTE_LAYOUTS.length
            const verticalBand = Math.floor(idx / ABSOLUTE_LAYOUTS.length)
            const absoluteSlot = ABSOLUTE_LAYOUTS[slotIndex] || {}
            const topOffset = useAbsoluteLayout
              ? `${(absoluteSlot.top || 0) + verticalBand * BAND_HEIGHT}px`
              : undefined

            return (
              <figure
                key={item._key || `${item.imageUrl}-${idx}`}
                style={{
                  margin: 0,
                  width: useAbsoluteLayout ? absoluteSlot.width || '30%' : '100%',
                  maxWidth: isCompact ? '100%' : 'min(440px, 32vw)',
                  justifySelf: useAbsoluteLayout ? undefined : justifySelf,
                  position: useAbsoluteLayout ? 'absolute' : 'relative',
                  left: useAbsoluteLayout ? absoluteSlot.left || '0%' : undefined,
                  top: useAbsoluteLayout ? topOffset : undefined,
                  transform:
                    !useAbsoluteLayout && (translateX !== '0%' || translateY !== '0%')
                      ? `translate(${translateX}, ${translateY})`
                      : 'none',
                  transition: 'transform 0.3s ease',
                }}
              >
                {label && (
                  <figcaption
                    style={{
                      fontSize: 13,
                      fontFamily: 'var(--font-display, "Poppins", sans-serif)',
                      textTransform: 'uppercase',
                      color: '#fff',
                      marginBottom: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>{label}</span>
                    <span>/</span>
                  </figcaption>
                )}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio,
                    backgroundColor: '#0c0c0c',
                    boxShadow: '0 24px 45px rgba(0, 0, 0, 0.6)',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={item.imageUrl || item.src}
                    alt={label}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    loading="lazy"
                  />
                </div>
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}
