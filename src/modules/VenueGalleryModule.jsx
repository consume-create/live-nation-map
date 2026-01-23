import { useState, useEffect, useMemo } from 'react'
import ResponsiveImage from '../components/ResponsiveImage'

const DEFAULT_IMAGE_ASPECT = 4 / 3
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

// Mobile layout variations - staggered widths and positions
const MOBILE_LAYOUTS = [
  { width: '55%', align: 'flex-start', labelPosition: 'left' },   // left aligned, label on left
  { width: '50%', align: 'flex-end', labelPosition: 'right' },    // right aligned, label on right
  { width: '65%', align: 'flex-start', labelPosition: 'left' },   // left aligned, wider
  { width: '45%', align: 'flex-end', labelPosition: 'right' },    // right aligned, smaller
  { width: '58%', align: 'flex-start', labelPosition: 'left' },   // left aligned
  { width: '52%', align: 'flex-end', labelPosition: 'right' },    // right aligned
  { width: '60%', align: 'flex-start', labelPosition: 'left' },   // left aligned
  { width: '48%', align: 'flex-end', labelPosition: 'right' },    // right aligned
]

// Desktop layout - organic staggered positions with varied sizes and more vertical spacing
const ABSOLUTE_LAYOUTS = [
  // Row 1 - varied sizes and positions
  { top: 60, left: '6%', width: '22%', labelPosition: 'right' },
  { top: 180, left: '42%', width: '18%', labelPosition: 'left' },
  { top: 0, left: '72%', width: '28%', labelPosition: 'left' },
  // Row 2 - more vertical spread
  { top: 580, left: '38%', width: '20%', labelPosition: 'right' },
  { top: 720, left: '2%', width: '24%', labelPosition: 'left' },
  { top: 480, left: '68%', width: '28%', labelPosition: 'left' },
  // Row 3 - larger feature image with more spacing
  { top: 1150, left: '10%', width: '42%', labelPosition: 'left' },
  { top: 1380, left: '62%', width: '26%', labelPosition: 'left' },
  // Row 4 - spread out more
  { top: 1900, left: '4%', width: '28%', labelPosition: 'right' },
  { top: 2050, left: '45%', width: '34%', labelPosition: 'left' },
  { top: 1820, left: '75%', width: '22%', labelPosition: 'left' },
  // Row 5
  { top: 2600, left: '18%', width: '38%', labelPosition: 'left' },
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
  const rowGap = isCompact ? 48 : 220
  const useAbsoluteLayout = !isCompact

  // Calculate dynamic container height based on actual image positions
  const containerHeight = useMemo(() => {
    if (!useAbsoluteLayout || !clampedImages.length) return 0

    // Estimate container width (maxWidth is 1800px, minus padding)
    const estimatedContainerWidth = Math.min(viewportWidth - 280, 1800)
    let maxBottom = 0

    clampedImages.forEach((item, idx) => {
      // Use layout position directly, no banding
      const layout = ABSOLUTE_LAYOUTS[idx] || ABSOLUTE_LAYOUTS[idx % ABSOLUTE_LAYOUTS.length]
      const aspectRatio = getAspectRatio(item)

      // Calculate top position directly from layout
      const top = layout.top

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
        backgroundColor: '#000000',
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
                  display: 'flex',
                  flexDirection: 'column',
                  gap: `${rowGap}px`,
                }
          }
        >
          {clampedImages.map((item, idx) => {
            const label = item.title || item.label || ''
            const aspectRatio = getAspectRatio(item)

            // Desktop layout - use unique positions
            const absoluteSlot = ABSOLUTE_LAYOUTS[idx] || ABSOLUTE_LAYOUTS[idx % ABSOLUTE_LAYOUTS.length]
            const desktopLabelRight = absoluteSlot.labelPosition === 'right'

            // Mobile layout
            const mobileLayout = MOBILE_LAYOUTS[idx % MOBILE_LAYOUTS.length]
            const mobileLabelRight = mobileLayout.labelPosition === 'right'

            const isLabelRight = isCompact ? mobileLabelRight : desktopLabelRight

            return (
              <figure
                key={item._key || `${item.imageUrl}-${idx}`}
                style={{
                  margin: 0,
                  width: useAbsoluteLayout ? absoluteSlot.width || '30%' : mobileLayout.width,
                  maxWidth: isCompact ? '100%' : undefined,
                  alignSelf: useAbsoluteLayout ? undefined : mobileLayout.align,
                  position: useAbsoluteLayout ? 'absolute' : 'relative',
                  left: useAbsoluteLayout ? absoluteSlot.left || '0%' : undefined,
                  top: useAbsoluteLayout ? `${absoluteSlot.top}px` : undefined,
                  display: 'flex',
                  flexDirection: isLabelRight ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: isCompact ? 16 : 12,
                }}
              >
                {label && (
                  <figcaption
                    style={{
                      fontSize: 13,
                      fontFamily: 'var(--font-display, "Poppins", sans-serif)',
                      textTransform: 'uppercase',
                      color: '#fff',
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: isLabelRight ? 'flex-end' : 'flex-start',
                      gap: 4,
                      whiteSpace: 'nowrap',
                      paddingTop: 4,
                    }}
                  >
                    <span>{label}</span>
                    <span>/</span>
                  </figcaption>
                )}
                <div style={{ flex: '1' }}>
                  {item.image ? (
                    <ResponsiveImage
                      image={item.image}
                      alt={label}
                      aspectRatio={aspectRatio}
                      sizes="(max-width: 900px) 65vw, 30vw"
                    />
                  ) : (
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio,
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
                  )}
                </div>
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}
