import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MapPage from './pages/MapPage'
import VenuePage from './pages/VenuePage'
import { fetchMapPoints } from './services/mapPoints'

export default function App() {
  const [mapPoints, setMapPoints] = useState([])
  const [pointsLoading, setPointsLoading] = useState(true)
  const [pointsError, setPointsError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadPoints() {
      try {
        setPointsLoading(true)
        const data = await fetchMapPoints()
        if (cancelled) return
        setMapPoints(data)
        setPointsError(null)
      } catch (error) {
        if (!cancelled) {
          console.warn('Error loading map points from Sanity', error)
          setPointsError(error)
        }
      } finally {
        if (!cancelled) {
          setPointsLoading(false)
        }
      }
    }

    loadPoints()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <MapPage
              mapPoints={mapPoints}
              pointsLoading={pointsLoading}
              pointsError={pointsError}
            />
          }
        />
        <Route
          path="/venue/:slug"
          element={<VenuePage mapPoints={mapPoints} pointsLoading={pointsLoading} />}
        />
      </Routes>
    </BrowserRouter>
  )
}
