import { useState, useCallback } from 'react'
import { urlFor } from '../lib/imageUrl'

const DEFAULT_WIDTHS = [400, 800, 1200, 1600, 2000]
const DEFAULT_QUALITY = 80

function buildSrcSet(image, widths, maxWidth) {
  const capped = maxWidth
    ? widths.filter((w) => w <= maxWidth).concat(maxWidth > widths[widths.length - 1] ? [] : [maxWidth])
    : widths

  return capped
    .map((w) => {
      const url = urlFor(image).width(w).quality(DEFAULT_QUALITY).auto('format').url()
      return `${url} ${w}w`
    })
    .join(', ')
}

function buildSrc(image, width) {
  return urlFor(image).width(width || 1200).quality(DEFAULT_QUALITY).auto('format').url()
}

export default function ResponsiveImage({
  image,
  sizes = '100vw',
  width,
  aspectRatio,
  priority = false,
  style = {},
  alt = '',
}) {
  const [loaded, setLoaded] = useState(false)

  const handleLoad = useCallback(() => setLoaded(true), [])

  if (!image?.asset) return null

  const lqip = image.asset?.metadata?.lqip
  const originalWidth = image.asset?.metadata?.dimensions?.width
  const originalAspect = image.asset?.metadata?.dimensions?.aspectRatio
  const resolvedAspect = aspectRatio || originalAspect

  // Detect GIF to preserve animation - any Sanity transformation strips animation frames
  const isGif = image.asset?.mimeType === 'image/gif'

  // For GIFs, use raw asset URL with zero transformations to preserve animation
  if (isGif) {
    const rawUrl = image.asset?.url
    if (!rawUrl) return null

    return (
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          aspectRatio: resolvedAspect || undefined,
          backgroundColor: '#111',
          ...style,
        }}
      >
        <img
          src={rawUrl}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchpriority={priority ? 'high' : undefined}
          onLoad={handleLoad}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />
      </div>
    )
  }

  // For non-GIFs, use srcSet with auto format optimization
  const maxWidth = width || originalWidth || 2000
  const srcSet = buildSrcSet(image, DEFAULT_WIDTHS, maxWidth)
  const src = buildSrc(image, Math.min(1200, maxWidth))

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        aspectRatio: resolvedAspect || undefined,
        backgroundColor: '#111',
        ...style,
      }}
    >
      {lqip && (
        <img
          src={lqip}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
            opacity: loaded ? 0 : 1,
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none',
          }}
        />
      )}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchpriority={priority ? 'high' : undefined}
        onLoad={handleLoad}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      />
    </div>
  )
}
