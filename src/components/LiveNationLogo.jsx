import { useRef, useEffect, useId } from 'react'
import gsap from 'gsap'

// Full logo path data from the original SVG
const LOGO_PATHS = [
  // Path 1: Top row LIVE letters combined with some bottom elements
  "M378.612 164.049L329.708 0H176.073V229.185H251.711V1.25069L318.19 229.185H439.034L505.514 1.25069V229.185H692.921V162.923H581.151V143.605H692.921V85.6237H581.151V66.2621H692.921V0H427.516L378.612 164.049Z",
  // Path 2: L letter (top left)
  "M164.529 162.185H75.0625V0H0V229.185H164.529V162.185Z",
  // Path 3: NATION row - N and A
  "M318.19 240.734L251.711 468.669V240.734H177.357V361.657L72.9346 240.734H0V469.92H75.0625V351.28L178.799 469.92H329.733L340.509 432.217H416.718L427.494 469.92H505.879L439.035 240.734H318.19ZM359.023 367.434L378.613 298.894L398.202 367.434H359.023Z",
  // Path 4: T
  "M468.303 307.733H542.841V469.92H618.478V307.733H692.921V240.734H468.303V307.733Z",
  // Path 5: I (bottom)
  "M780.105 240.734H704.468V469.92H780.105V240.734Z",
  // Path 6: O
  "M1005.72 269.749C982.387 247.95 952.024 236.896 915.469 236.896H914.506C877.944 236.896 847.581 247.95 824.259 269.749C800.886 291.599 789.035 320.391 789.035 355.327C789.035 390.263 801.053 419.068 824.754 440.912C848.389 462.709 878.586 473.759 914.506 473.759H915.469C952.028 473.759 982.389 462.759 1005.71 441.064C1029.09 419.323 1040.94 390.477 1040.94 355.327C1040.94 320.398 1029.09 291.606 1005.72 269.749ZM950.571 389.606C941.634 398.44 929.824 402.92 915.469 402.92H914.506C900.142 402.92 888.335 398.44 879.409 389.606C870.483 380.782 865.955 369.25 865.955 355.327C865.955 341.404 870.483 329.88 879.411 321.048C888.341 312.213 900.148 307.734 914.506 307.734H915.469C929.819 307.734 941.628 312.214 950.57 321.047C959.497 329.885 964.025 341.419 964.025 355.327C964.025 369.236 959.498 380.777 950.571 389.606Z",
  // Path 7: N (second, rightmost)
  "M1227.23 361.657L1122.81 240.734H1049.87V469.92H1124.93V351.28L1228.67 469.92H1301.58V240.734H1227.23V361.657Z",
]

// Animation sequence - animate by visual groups from left to right
const ANIMATION_GROUPS = [
  { pathIndices: [1], delay: 0 },       // L (top-left)
  { pathIndices: [0], delay: 0.08 },    // I-V-E (top row middle)
  { pathIndices: [2], delay: 0.24 },    // N-A (bottom left)
  { pathIndices: [3], delay: 0.36 },    // T
  { pathIndices: [4], delay: 0.44 },    // I (bottom)
  { pathIndices: [5], delay: 0.52 },    // O
  { pathIndices: [6], delay: 0.60 },    // N (rightmost)
]

export default function LiveNationLogo({
  className = '',
  style = {},
  stagger = 0.07,
  duration = 0.5,
  fillColor = '#1D1D1D',
  strokeColor = '#1D1D1D',
  onAnimationStart,
  onAnimationComplete,
}) {
  const uniqueId = useId()
  const svgRef = useRef(null)
  const pathRefs = useRef([])
  const maskRefs = useRef([])

  useEffect(() => {
    if (!svgRef.current) return

    const paths = pathRefs.current.filter(Boolean)
    const masks = maskRefs.current.filter(Boolean)

    if (paths.length === 0) return

    // Kill any existing animations
    gsap.killTweensOf(paths)
    gsap.killTweensOf(masks)

    // Set initial states for paths
    paths.forEach((path) => {
      if (!path) return
      const length = path.getTotalLength()
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length,
        fillOpacity: 0,
        strokeOpacity: 1,
      })
    })

    // Set initial mask positions (reveal from bottom to top)
    masks.forEach((mask) => {
      if (!mask) return
      gsap.set(mask, {
        attr: { height: 0 },
      })
    })

    // Notify animation start
    onAnimationStart?.()

    // Create master timeline
    const tl = gsap.timeline({
      onComplete: () => {
        onAnimationComplete?.()
      },
    })

    // Animate each group
    ANIMATION_GROUPS.forEach((group) => {
      const groupStartTime = group.delay

      group.pathIndices.forEach((pathIndex) => {
        const path = paths[pathIndex]
        const mask = masks[pathIndex]

        if (!path) return

        const length = path.getTotalLength()

        // Mask reveal (slide up from bottom)
        if (mask) {
          tl.to(mask, {
            attr: { height: 500 },
            duration: duration * 0.9,
            ease: 'power2.out',
          }, groupStartTime)
        }

        // Stroke drawing
        tl.to(path, {
          strokeDashoffset: 0,
          duration: duration,
          ease: 'power2.inOut',
        }, groupStartTime)

        // Fill morph (starts 30% in, 60% duration)
        tl.to(path, {
          fillOpacity: 1,
          strokeOpacity: 0.3,
          duration: duration * 0.6,
          ease: 'power1.inOut',
        }, groupStartTime + duration * 0.3)

        // Final stroke fade
        tl.to(path, {
          strokeOpacity: 0,
          duration: duration * 0.3,
          ease: 'power1.out',
        }, groupStartTime + duration * 0.7)
      })
    })

    return () => {
      tl.kill()
    }
  }, [stagger, duration, onAnimationStart, onAnimationComplete])

  return (
    <svg
      ref={svgRef}
      className={className}
      style={style}
      viewBox="0 0 1302 474"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Live Nation"
    >
      <defs>
        {LOGO_PATHS.map((_, index) => (
          <mask key={`mask-${uniqueId}-${index}`} id={`logo-mask-${uniqueId}-${index}`}>
            <rect
              ref={(el) => (maskRefs.current[index] = el)}
              x="0"
              y="0"
              width="1400"
              height="0"
              fill="white"
            />
          </mask>
        ))}
      </defs>

      {LOGO_PATHS.map((d, index) => (
        <path
          key={`path-${uniqueId}-${index}`}
          ref={(el) => (pathRefs.current[index] = el)}
          d={d}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2"
          fillOpacity="0"
          strokeOpacity="1"
          mask={`url(#logo-mask-${uniqueId}-${index})`}
        />
      ))}
    </svg>
  )
}
