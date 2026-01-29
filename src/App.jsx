import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MapPage from './pages/MapPage'
import VenuePage from './pages/VenuePage'
import { fetchMapPoints, fetchSiteSettings } from './services/mapPoints'

// Default SEO values (fallbacks if Sanity data unavailable)
const DEFAULT_SEO = {
  siteTitle: 'Live Nation Venue Map',
  siteDescription: 'Interactive 3D map of Live Nation venues across the United States. Explore over 30 venues with immersive visual experiences.',
}

function updateMetaTag(selector, attribute, value) {
  const element = document.querySelector(selector)
  if (element && value) {
    element.setAttribute(attribute, value)
  }
}

function updateSEO(settings) {
  if (!settings) return

  const title = settings.siteTitle || DEFAULT_SEO.siteTitle
  const description = settings.siteDescription || DEFAULT_SEO.siteDescription
  const imageUrl = settings.socialShareImageUrl

  // Update document title
  document.title = title

  // Update meta description
  updateMetaTag('meta[name="description"]', 'content', description)

  // Update Open Graph tags
  updateMetaTag('meta[property="og:title"]', 'content', title)
  updateMetaTag('meta[property="og:description"]', 'content', description)
  if (imageUrl) {
    // Add og:image if it doesn't exist
    let ogImage = document.querySelector('meta[property="og:image"]')
    if (!ogImage) {
      ogImage = document.createElement('meta')
      ogImage.setAttribute('property', 'og:image')
      document.head.appendChild(ogImage)
    }
    ogImage.setAttribute('content', imageUrl)
  }

  // Update Twitter Card tags
  updateMetaTag('meta[name="twitter:title"]', 'content', title)
  updateMetaTag('meta[name="twitter:description"]', 'content', description)
  if (imageUrl) {
    // Add twitter:image if it doesn't exist
    let twitterImage = document.querySelector('meta[name="twitter:image"]')
    if (!twitterImage) {
      twitterImage = document.createElement('meta')
      twitterImage.setAttribute('name', 'twitter:image')
      document.head.appendChild(twitterImage)
    }
    twitterImage.setAttribute('content', imageUrl)
  }
}

// Update SEO meta tags for venue pages with fallback chain
export function updateVenueSEO(venue, siteSettings) {
  if (!venue) return

  // Title: seo.metaTitle > "{title} | Live Nation"
  const title = venue.seo?.metaTitle || `${venue.title} | Live Nation`
  document.title = title

  // Description: seo.metaDescription > description > site default
  const description =
    venue.seo?.metaDescription ||
    venue.description ||
    siteSettings?.siteDescription ||
    DEFAULT_SEO.siteDescription
  updateMetaTag('meta[name="description"]', 'content', description)

  // Image: seo.socialShareImageUrl > heroImageUrl > site default
  const imageUrl =
    venue.seo?.socialShareImageUrl ||
    venue.heroImageUrl ||
    siteSettings?.socialShareImageUrl

  // Update Open Graph tags
  updateMetaTag('meta[property="og:title"]', 'content', title)
  updateMetaTag('meta[property="og:description"]', 'content', description)
  if (imageUrl) {
    let ogImage = document.querySelector('meta[property="og:image"]')
    if (!ogImage) {
      ogImage = document.createElement('meta')
      ogImage.setAttribute('property', 'og:image')
      document.head.appendChild(ogImage)
    }
    ogImage.setAttribute('content', imageUrl)
  }

  // Update Twitter Card tags
  updateMetaTag('meta[name="twitter:title"]', 'content', title)
  updateMetaTag('meta[name="twitter:description"]', 'content', description)
  if (imageUrl) {
    let twitterImage = document.querySelector('meta[name="twitter:image"]')
    if (!twitterImage) {
      twitterImage = document.createElement('meta')
      twitterImage.setAttribute('name', 'twitter:image')
      document.head.appendChild(twitterImage)
    }
    twitterImage.setAttribute('content', imageUrl)
  }
}

// Reset SEO to site-level defaults
export function resetToSiteSEO(siteSettings) {
  updateSEO(siteSettings)
}

export default function App() {
  const [mapPoints, setMapPoints] = useState([])
  const [pointsLoading, setPointsLoading] = useState(true)
  const [pointsError, setPointsError] = useState(null)
  const [siteSettings, setSiteSettings] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        setPointsLoading(true)
        // Fetch map points and site settings in parallel
        const [points, settings] = await Promise.all([
          fetchMapPoints(),
          fetchSiteSettings(),
        ])
        if (cancelled) return
        setMapPoints(points)
        setSiteSettings(settings)
        setPointsError(null)

        // Update SEO meta tags
        updateSEO(settings)
      } catch (error) {
        if (!cancelled) {
          console.warn('Error loading data from Sanity', error)
          setPointsError(error)
        }
      } finally {
        if (!cancelled) {
          setPointsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <BrowserRouter basename="/map">
      <Routes>
        <Route
          path="/"
          element={
            <MapPage
              mapPoints={mapPoints}
              pointsLoading={pointsLoading}
              pointsError={pointsError}
              siteSettings={siteSettings}
            />
          }
        />
        <Route
          path="/venue/:slug"
          element={
            <VenuePage
              mapPoints={mapPoints}
              pointsLoading={pointsLoading}
              siteSettings={siteSettings}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
