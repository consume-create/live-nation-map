import { useMemo } from 'react'
import SiteHeader from '../modules/SiteHeader'
import RegionAccordion from './RegionAccordion'

export default function MobileMapView({ mapPoints = [] }) {
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
    <div
      style={{
        minHeight: '100vh',
        background: '#030303',
        backgroundImage: `
          linear-gradient(rgba(200, 0, 0, 0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(200, 0, 0, 0.12) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
      <SiteHeader />

      {/* Static map image */}
      <div style={{ width: '100%', padding: '20px 20px 40px', paddingTop: '120px' }}>
        <img
          src="/images/mobile-map.png"
          alt="US Map"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
      </div>

      {/* Region accordions */}
      <div style={{ padding: '0 20px 60px' }}>
        <RegionAccordion title="WEST" venues={grouped.west} />
        <RegionAccordion title="CENTRAL" venues={grouped.central} />
        <RegionAccordion title="EAST" venues={grouped.east} />
      </div>
    </div>
  )
}
