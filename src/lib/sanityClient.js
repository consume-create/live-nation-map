import { createClient } from '@sanity/client'

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production'
const apiVersion = import.meta.env.VITE_SANITY_API_VERSION || '2024-05-01'
const token = import.meta.env.VITE_SANITY_READ_TOKEN
const useCdn = import.meta.env.VITE_SANITY_USE_CDN !== 'false'

// In dev, use a fetch that rewrites Sanity API URLs to same-origin so Vite proxy can forward them (avoids CORS).
// The client would otherwise request https://projectId.apicdn.sanity.io/... which we can't proxy; rewriting to
// origin + path makes the request hit our proxy.
const customFetch =
  import.meta.env.DEV && typeof window !== 'undefined'
    ? (input, init) => {
        const url = typeof input === 'string' ? input : input?.url
        if (url && url.startsWith('http') && !url.startsWith(window.location.origin)) {
          try {
            const parsed = new URL(url)
            const proxyUrl = `${window.location.origin}${parsed.pathname}${parsed.search}`
            return fetch(proxyUrl, init)
          } catch (_) {
            return fetch(input, init)
          }
        }
        return fetch(input, init)
      }
    : undefined

export const sanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn,
      token,
      perspective: 'published',
      ...(customFetch && { fetch: customFetch }),
    })
  : null

export const isSanityConfigured = Boolean(sanityClient)
