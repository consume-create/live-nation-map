import { useState, useEffect } from 'react'

const DEFAULT_IMAGE_ASPECT = 4 / 3
const CARD_VARIATIONS = [
  { justify: 'flex-start', translateX: '-6%', translateY: '-8%' },
  { justify: 'center', translateX: '4%', translateY: '-10%' },
  { justify: 'flex-end', translateX: '2%', translateY: '-2%' },
  { justify: 'flex-start', translateX: '-2%', translateY: '10%' },
  { justify: 'center', translateX: '6%', translateY: '4%' },
  { justify: 'flex-end', translateX: '-4%', translateY: '12%' },
  { justify: 'center', translateX: '0%', translateY: '-4%' },
]

const ABSOLUTE_LAYOUTS = [
  { topVh: 0, left: '5%', width: '28%' },
  { topVh: 18, left: '40%', width: '20%' },
  { topVh: 30, left: '68%', width: '20%' },
  { topVh: 52, left: '12%', width: '30%' },
  { topVh: 68, left: '52%', width: '24%' },
  { topVh: 92, left: '8%', width: '36%' },
  { topVh: 118, left: '38%', width: '38%' },
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
  const bandCount = useAbsoluteLayout
    ? Math.max(1, Math.ceil(clampedImages.length / ABSOLUTE_LAYOUTS.length))
    : 0

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
                  minHeight: `${Math.max(100, bandCount * 120)}vh`,
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
              ? `${(absoluteSlot.topVh || 0) + verticalBand * 120}vh`
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
