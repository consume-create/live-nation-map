import { useMemo } from 'react'
import SiteHeader from '../modules/SiteHeader'
import RegionAccordion from './RegionAccordion'
import ResponsiveImage from './ResponsiveImage'
import { COLORS, GRID_BACKGROUND } from '../constants/theme'

export default function MobileMapView({ mapPoints = [], mobileMapImage }) {
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

      {/* Map image - dynamic from Sanity with static fallback */}
      <div style={{ width: '100%', padding: '20px 20px 40px', paddingTop: '120px' }}>
        {mobileMapImage?.asset ? (
          <ResponsiveImage
            image={mobileMapImage}
            alt="Interactive map of Live Nation venues across the United States"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        ) : (
          <img
            src={`${import.meta.env.BASE_URL}images/mobile-map.png`}
            alt="Interactive map of Live Nation venues across the United States"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
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
