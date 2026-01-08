const LAYOUT_PATTERN = [
  { top: 6, left: 6 },
  { top: 10, left: 38 },
  { top: 12, left: 68 },
  { top: 42, left: 16 },
  { top: 40, left: 48 },
  { top: 68, left: 26 },
  { top: 66, left: 70 },
]

const BLOCK_HEIGHT = 580
const BLOCK_GAP = 160
const DEFAULT_IMAGE_WIDTH = 320
const IMAGE_ASPECT_RATIO = '4 / 3'

function hasManualPosition(position = {}) {
  return ['top', 'left', 'bottom', 'right'].some((key) => typeof position[key] === 'number')
}

function getManualCoordinates(position = {}) {
  const coords = {}
  if (typeof position.top === 'number') coords.top = `${position.top}%`
  if (typeof position.left === 'number') coords.left = `${position.left}%`
  if (typeof position.bottom === 'number') coords.bottom = `${position.bottom}%`
  if (typeof position.right === 'number') coords.right = `${position.right}%`
  if (!('left' in coords) && !('right' in coords)) coords.left = '50%'
  if (!('top' in coords) && !('bottom' in coords)) coords.top = '50%'
  return coords
}

export default function VenueGalleryModule({ images = [] }) {
  if (!images.length) return null

  const cycles = Math.ceil(images.length / LAYOUT_PATTERN.length)
  const groupCount = Math.max(cycles, 1)

  return (
    <section
      style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        padding: '100px 5vw 140px',
        backgroundColor: '#050505',
        backgroundImage: `
          linear-gradient(rgba(200, 0, 0, 0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(200, 0, 0, 0.12) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
        {Array.from({ length: groupCount }).map((_, cycleIdx) => {
          const start = cycleIdx * LAYOUT_PATTERN.length
          const batch = images.slice(start, start + LAYOUT_PATTERN.length)

          return (
            <div
              key={`venue-gallery-cycle-${cycleIdx}`}
              style={{
                position: 'relative',
                minHeight: BLOCK_HEIGHT,
                marginBottom: cycleIdx === groupCount - 1 ? 0 : BLOCK_GAP,
              }}
            >
              {batch.map((item, idx) => {
                const label = item.title || item.label || ''
                const patternIndex = idx % LAYOUT_PATTERN.length
                const fallbackLayout = LAYOUT_PATTERN[patternIndex] || LAYOUT_PATTERN[0]
                const useManual = hasManualPosition(item.position)
                const coords = useManual
                  ? getManualCoordinates(item.position)
                  : {
                      top: `${fallbackLayout.top}%`,
                      left: `${fallbackLayout.left}%`,
                      transform: 'translate(-50%, -50%)',
                    }

                return (
                  <figure
                    key={item._key || `${item.imageUrl}-${idx}`}
                    style={{
                      margin: 0,
                      position: 'absolute',
                      width: DEFAULT_IMAGE_WIDTH,
                      aspectRatio: IMAGE_ASPECT_RATIO,
                      ...coords,
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#0c0c0c',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.55)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
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
                      />
                      {label && (
                        <figcaption
                          style={{
                            position: 'absolute',
                            top: '-32px',
                            left: 0,
                            fontSize: 13,
                            fontFamily: 'Orbitron, sans-serif',
                            letterSpacing: '0.3em',
                            textTransform: 'uppercase',
                            color: '#fff',
                          }}
                        >
                          {label}
                          <span style={{ marginLeft: 8 }}> /</span>
                        </figcaption>
                      )}
                    </div>
                  </figure>
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}
