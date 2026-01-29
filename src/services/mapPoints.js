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
    city,
    region,
    location,
    description,
    seo{
      metaTitle,
      metaDescription,
      "socialShareImageUrl": socialShareImage.asset->url
    },
    "heroImage": heroImage{
      asset->{
        _id, url,
        metadata{ lqip, dimensions{ width, height, aspectRatio } }
      },
      hotspot, crop
    },
    "heroLineSvgUrl": heroLineAnimation.asset->url,
    "logoData": {
      "url": logoTexture.asset->url,
      "dimensions": logoTexture.asset->metadata.dimensions
    },
    gallery[]{
      _key,
      title,
      "image": image{
        asset->{
          _id, url, mimeType,
          metadata{ lqip, dimensions{ width, height, aspectRatio } }
        },
        hotspot, crop
      }
    },
    aboutModule{
      "videoUrl": video.asset->url,
      "videoType": video.asset->mimeType,
      "videoPoster": videoPoster{
        asset->{
          _id, url, mimeType,
          metadata{ lqip, dimensions{ width, height, aspectRatio } }
        },
        hotspot, crop
      },
      description,
      services,
      partners[]{
        name,
        title
      },
      crew[]{
        name,
        title
      }
    }
  }
`

function normaliseGallery(rawGallery) {
  const gallery = Array.isArray(rawGallery) ? rawGallery : []

  return gallery
    .filter((item) => Boolean(item?.image?.asset?.url))
    .map((item) => {
      const dimensions = item.image.asset?.metadata?.dimensions || {}
      const aspectRatio =
        typeof dimensions.aspectRatio === 'number' && dimensions.aspectRatio > 0
          ? dimensions.aspectRatio
          : null

      return {
        _key: item._key || item.image.asset.url,
        title: item.title || '',
        image: item.image,
        imageUrl: item.image.asset.url,
        width: dimensions.width || null,
        height: dimensions.height || null,
        aspectRatio,
      }
    })
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
    city: point.city,
    region: point.region,
    location: point.location,
    position: latLonTo3D(lng, lat),
    heroImage: point.heroImage || null,
    heroImageUrl: point.heroImage?.asset?.url || null,
    heroLineSvgUrl: point.heroLineSvgUrl || point.heroImage?.asset?.url,
    logoUrl: point.logoData?.url,
    logoAspectRatio: point.logoData?.dimensions?.aspectRatio || 5.2,
    logoDimensions: {
      width: point.logoData?.dimensions?.width || null,
      height: point.logoData?.dimensions?.height || null,
    },
    gallery: normaliseGallery(point.gallery),
    aboutModule: point.aboutModule || null,
    description: point.description || null,
    seo: point.seo || null,
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

const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0]{
    siteTitle,
    siteDescription,
    "socialShareImageUrl": socialShareImage.asset->url,
    "mobileMapImage": mobileMapImage{
      asset->{
        _id, url,
        metadata{ lqip, dimensions{ width, height, aspectRatio } }
      }
    },
    "mobileMapImageUrl": mobileMapImage.asset->url
  }
`

export async function fetchSiteSettings() {
  if (!isSanityConfigured) {
    console.warn('Sanity client not configured; site settings unavailable.')
    return null
  }

  try {
    const data = await sanityClient.fetch(siteSettingsQuery)
    return data
  } catch (error) {
    console.warn('Failed to fetch Sanity site settings.', error)
    return null
  }
}
