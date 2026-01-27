import { useMemo } from 'react'
import ResponsiveImage from '../components/ResponsiveImage'
import { useViewportWidth } from '../hooks/useViewportWidth'
import { BREAKPOINTS, COLORS } from '../constants/theme'

const DEFAULT_IMAGE_ASPECT = 4 / 3
const LABEL_HEIGHT = 32

// Scattered positions - 2-3 per row, 32-48% widths, generous vertical spacing
const SCATTER_LAYOUTS = [
  // Row 1 - two images
  { top: 0, left: '2%', width: '42%', labelPosition: 'right' },
  { top: 40, left: '52%', width: '36%', labelPosition: 'left' },
  // Row 2 - three images staggered
  { top: 620, left: '0%', width: '34%', labelPosition: 'right' },
  { top: 680, left: '38%', width: '32%', labelPosition: 'left' },
  { top: 640, left: '72%', width: '26%', labelPosition: 'left' },
  // Row 3 - two images
  { top: 1200, left: '6%', width: '46%', labelPosition: 'left' },
  { top: 1260, left: '58%', width: '38%', labelPosition: 'right' },
  // Row 4 - three images
  { top: 1850, left: '0%', width: '38%', labelPosition: 'right' },
  { top: 1900, left: '42%', width: '32%', labelPosition: 'left' },
  { top: 1870, left: '76%', width: '22%', labelPosition: 'left' },
  // Row 5 - two images
  { top: 2480, left: '8%', width: '44%', labelPosition: 'left' },
  { top: 2520, left: '58%', width: '38%', labelPosition: 'right' },
  // Row 6 - three images
  { top: 3100, left: '4%', width: '36%', labelPosition: 'right' },
  { top: 3160, left: '44%', width: '28%', labelPosition: 'left' },
  { top: 3120, left: '74%', width: '24%', labelPosition: 'left' },
  // Row 7 - two images
  { top: 3700, left: '10%', width: '40%', labelPosition: 'left' },
  { top: 3760, left: '56%', width: '42%', labelPosition: 'right' },
  // Row 8 - three images staggered
  { top: 4320, left: '0%', width: '32%', labelPosition: 'right' },
  { top: 4380, left: '36%', width: '34%', labelPosition: 'left' },
  { top: 4340, left: '72%', width: '26%', labelPosition: 'left' },
  // Row 9 - two images
  { top: 4920, left: '4%', width: '48%', labelPosition: 'left' },
  { top: 4980, left: '56%', width: '40%', labelPosition: 'right' },
  // Row 10 - three images
  { top: 5560, left: '2%', width: '34%', labelPosition: 'right' },
  { top: 5620, left: '40%', width: '30%', labelPosition: 'left' },
  { top: 5580, left: '74%', width: '24%', labelPosition: 'left' },
]

// Mobile layout - randomized widths (60-90%)
const MOBILE_LAYOUTS = [
  { width: '75%', align: 'flex-start', labelPosition: 'left' },
  { width: '62%', align: 'flex-end', labelPosition: 'right' },
  { width: '88%', align: 'flex-start', labelPosition: 'left' },
  { width: '60%', align: 'flex-end', labelPosition: 'right' },
  { width: '68%', align: 'flex-start', labelPosition: 'left' },
  { width: '90%', align: 'flex-end', labelPosition: 'right' },
  { width: '65%', align: 'flex-start', labelPosition: 'left' },
  { width: '82%', align: 'flex-end', labelPosition: 'right' },
  { width: '70%', align: 'flex-start', labelPosition: 'left' },
  { width: '72%', align: 'flex-end', labelPosition: 'right' },
  { width: '85%', align: 'flex-start', labelPosition: 'left' },
  { width: '78%', align: 'flex-end', labelPosition: 'right' },
  // Additional 12 layouts for extended gallery
  { width: '76%', align: 'flex-start', labelPosition: 'left' },
  { width: '64%', align: 'flex-end', labelPosition: 'right' },
  { width: '86%', align: 'flex-start', labelPosition: 'left' },
  { width: '58%', align: 'flex-end', labelPosition: 'right' },
  { width: '72%', align: 'flex-start', labelPosition: 'left' },
  { width: '88%', align: 'flex-end', labelPosition: 'right' },
  { width: '66%', align: 'flex-start', labelPosition: 'left' },
  { width: '80%', align: 'flex-end', labelPosition: 'right' },
  { width: '74%', align: 'flex-start', labelPosition: 'left' },
  { width: '68%', align: 'flex-end', labelPosition: 'right' },
  { width: '84%', align: 'flex-start', labelPosition: 'left' },
  { width: '76%', align: 'flex-end', labelPosition: 'right' },
]

function getAspectRatio(item) {
  if (typeof item?.aspectRatio === 'number' && item.aspectRatio > 0) return item.aspectRatio
  const { width, height } = item?.image?.asset?.metadata?.dimensions || item || {}
  if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
    return width / height
  }
  return DEFAULT_IMAGE_ASPECT
}

// Seeded random for consistent but varied offsets
function seededRandom(seed) {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

export default function VenueGalleryModule({ images = [] }) {
  if (!Array.isArray(images) || !images.length) return null

  const clampedImages = images.slice(0, 24)
  const viewportWidth = useViewportWidth()
  const isCompact = viewportWidth < BREAKPOINTS.TABLET

  // Calculate container height for absolute layout
  const containerHeight = useMemo(() => {
    if (isCompact || !clampedImages.length) return 0

    const estimatedContainerWidth = Math.min(viewportWidth - 280, 1800)
    let maxBottom = 0

    clampedImages.forEach((item, idx) => {
      const layout = SCATTER_LAYOUTS[idx] || SCATTER_LAYOUTS[idx % SCATTER_LAYOUTS.length]
      const aspectRatio = getAspectRatio(item)

      // Add slight random offset to top position for more organic feel
      const randomOffset = (seededRandom(idx * 7) - 0.5) * 40
      const top = layout.top + randomOffset

      const widthPercent = parseFloat(layout.width) / 100
      const imageWidth = estimatedContainerWidth * widthPercent
      const imageHeight = imageWidth / aspectRatio

      maxBottom = Math.max(maxBottom, top + imageHeight + LABEL_HEIGHT)
    })

    return maxBottom + 100
  }, [clampedImages, isCompact, viewportWidth])

  return (
    <section
      style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        margin: '120px auto 160px',
        padding: '0 clamp(32px, 6vw, 140px)',
        backgroundColor: COLORS.BACKGROUND_DARK,
        borderTop: `1px solid ${COLORS.BORDER_WHITE_08}`,
      }}
    >
      <div style={{ maxWidth: '1800px', margin: '0 auto', position: 'relative' }}>
        <div
          style={
            !isCompact
              ? {
                  position: 'relative',
                  height: `${containerHeight}px`,
                  width: '100%',
                }
              : {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '40px',
                }
          }
        >
          {clampedImages.map((item, idx) => {
            const label = (item.title || item.label || '').trim()
            const aspectRatio = getAspectRatio(item)

            // Desktop - scattered absolute positioning
            const scatterSlot = SCATTER_LAYOUTS[idx] || SCATTER_LAYOUTS[idx % SCATTER_LAYOUTS.length]
            const randomTopOffset = (seededRandom(idx * 7) - 0.5) * 40
            const randomLeftOffset = (seededRandom(idx * 13) - 0.5) * 2
            const desktopLabelRight = scatterSlot.labelPosition === 'right'

            // Mobile layout
            const mobileLayout = MOBILE_LAYOUTS[idx % MOBILE_LAYOUTS.length]
            const mobileLabelRight = mobileLayout.labelPosition === 'right'

            const isLabelRight = isCompact ? mobileLabelRight : desktopLabelRight

            return (
              <figure
                key={item._key || `${item.imageUrl}-${idx}`}
                style={{
                  margin: 0,
                  width: !isCompact ? scatterSlot.width : mobileLayout.width,
                  maxWidth: isCompact ? '100%' : undefined,
                  alignSelf: !isCompact ? undefined : mobileLayout.align,
                  position: !isCompact ? 'absolute' : 'relative',
                  left: !isCompact ? `calc(${scatterSlot.left} + ${randomLeftOffset}%)` : undefined,
                  top: !isCompact ? `${scatterSlot.top + randomTopOffset}px` : undefined,
                  display: 'flex',
                  flexDirection: isLabelRight ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: isCompact ? 12 : 10,
                }}
              >
                {label && (
                  <figcaption
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-display, "Poppins", sans-serif)',
                      textTransform: 'uppercase',
                      color: COLORS.TEXT_WHITE,
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: isLabelRight ? 'flex-end' : 'flex-start',
                      gap: 3,
                      whiteSpace: 'nowrap',
                      paddingTop: 3,
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
                      sizes="(max-width: 900px) 55vw, 22vw"
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
