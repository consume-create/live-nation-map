import { createClient } from '@sanity/client'

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production'
const apiVersion = import.meta.env.VITE_SANITY_API_VERSION || '2024-05-01'
const token = import.meta.env.VITE_SANITY_READ_TOKEN
const useCdn = import.meta.env.VITE_SANITY_USE_CDN !== 'false'

export const sanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn,
      token,
      perspective: 'published',
    })
  : null

export const isSanityConfigured = Boolean(sanityClient)
