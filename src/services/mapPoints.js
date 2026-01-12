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
    "heroImageUrl": heroImage.asset->url,
    "heroLineSvgUrl": heroLineAnimation.asset->url,
    "logoData": {
      "url": logoTexture.asset->url,
      "dimensions": logoTexture.asset->metadata.dimensions
    },
    gallery[]{
      _key,
      title,
      position,
      "imageData": {
        "url": image.asset->url,
        "dimensions": image.asset->metadata.dimensions
      }
    }
  }
`

function normaliseGallery(rawGallery) {
  const gallery = Array.isArray(rawGallery) ? rawGallery : []

  return gallery
    .map((item) => {
      const dimensions = item?.imageData?.dimensions || {}
      const width = typeof dimensions.width === 'number' ? dimensions.width : null
      const height = typeof dimensions.height === 'number' ? dimensions.height : null
      const aspectFromMeta =
        typeof dimensions.aspectRatio === 'number' && dimensions.aspectRatio > 0
          ? dimensions.aspectRatio
          : null
      const aspectFromSize =
        width && height && width > 0 && height > 0 ? width / height : null
      const aspectRatio = aspectFromMeta || aspectFromSize || null

      return {
        _key: item?._key,
        title: item?.title,
        position: item?.position,
        imageUrl: item?.imageData?.url,
        width,
        height,
        aspectRatio,
      }
    })
    .filter((item) => Boolean(item?.imageUrl))
    .map((item) => ({
      _key: item._key || item.imageUrl,
      title: item.title || '',
      imageUrl: item.imageUrl,
      position: item.position || {},
      width: item.width,
      height: item.height,
      aspectRatio: item.aspectRatio,
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
    heroImageUrl: point.heroImageUrl,
    heroLineSvgUrl: point.heroLineSvgUrl || point.heroImageUrl,
    logoUrl: point.logoData?.url,
    logoAspectRatio: point.logoData?.dimensions?.aspectRatio || 5.2,
    logoDimensions: {
      width: point.logoData?.dimensions?.width || null,
      height: point.logoData?.dimensions?.height || null,
    },
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
