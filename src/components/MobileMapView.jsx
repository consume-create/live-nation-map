import { useMemo, useState, useEffect, lazy, Suspense } from 'react'
import SiteHeader from '../modules/SiteHeader'
import RegionAccordion from './RegionAccordion'
import { COLORS, GRID_BACKGROUND } from '../constants/theme'

const Lottie = lazy(() => import('lottie-react'))

const LottiePlaceholder = (
  <div style={{ width: '100%', aspectRatio: '329 / 206' }} />
)

export default function MobileMapView({ mapPoints = [] }) {
  const [animationData, setAnimationData] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}animations/map-hotspots.json`)
      .then(res => res.json())
      .then(setAnimationData)
      .catch(() => {})
  }, [])

  // Group venues by region
  const grouped = useMemo(() => {
    const result = {
      west: [],
      central: [],
      east: [],
    }

    mapPoints.forEach((point) => {
      const region = point.region?.toLowerCase() || 'central'
      if (result[region]) {
        result[region].push(point)
      } else {
        result.central.push(point)
      }
    })

    return result
  }, [mapPoints])

  return (
    <main
      style={{
        minHeight: '100vh',
        background: COLORS.BACKGROUND_DARK,
        backgroundImage: GRID_BACKGROUND.image,
        backgroundSize: GRID_BACKGROUND.size,
      }}
    >
      <SiteHeader />

      <h1
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Live Nation Venue Map
      </h1>

      {/* Animated map with pulsing venue hotspots */}
      <div style={{
        width: '100%',
        padding: '0 20px',
        paddingTop: '140px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 260px)',
      }}>
        {animationData ? (
          <Suspense fallback={LottiePlaceholder}>
            <Lottie
              animationData={animationData}
              loop
              autoplay
              style={{ width: '100%', height: 'auto' }}
              aria-label="Animated map of Live Nation venues across the United States"
            />
          </Suspense>
        ) : (
          LottiePlaceholder
        )}
      </div>

      {/* Region accordions */}
      <div style={{ padding: '0 20px 60px' }}>
        <RegionAccordion title="WEST" venues={grouped.west} />
        <RegionAccordion title="CENTRAL" venues={grouped.central} />
        <RegionAccordion title="EAST" venues={grouped.east} />
      </div>
    </main>
  )
}
