import groq from 'groq'
import { sanityClient, isSanityConfigured } from '../lib/sanityClient'
import { latLonTo3D } from '../usStates'

const mapPointsQuery = groq`
  *[_type == "mapPoint"]|
    order(title asc)
  {
    _id,
    title,
    "slug": slug.current,
    state,
    location,
    description,
    "modelUrl": model.asset->url,
    "logoUrl": logoTexture.asset->url,
    gallery[]{
      _key,
      title,
      position,
      "imageUrl": image.asset->url
    }
  }
`

function normaliseGallery(rawGallery) {
  const gallery = Array.isArray(rawGallery) ? rawGallery : []

  return gallery
    .filter((item) => item?.imageUrl)
    .map((item) => ({
      _key: item._key || item.imageUrl,
      title: item.title || '',
      imageUrl: item.imageUrl,
      position: item.position || {},
    }))
}

function mapToRenderable(point) {
  if (!point || !point.location) return null
  const { lat, lng } = point.location
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  return {
    _id: point._id,
    title: point.title,
    slug: point.slug,
    state: point.state,
    description: point.description,
    location: point.location,
    position: latLonTo3D(lng, lat),
    modelUrl: point.modelUrl,
    logoUrl: point.logoUrl,
    gallery: normaliseGallery(point.gallery),
  }
}

export async function fetchMapPoints() {
  if (!isSanityConfigured) {
    console.warn('Sanity client not configured; map points unavailable.')
    return []
  }

  try {
    const data = await sanityClient.fetch(mapPointsQuery)
    return data.map(mapToRenderable).filter(Boolean)
  } catch (error) {
    console.warn('Failed to fetch Sanity map points.', error)
    return []
  }
}
