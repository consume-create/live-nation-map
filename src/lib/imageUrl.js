import createImageUrlBuilder from '@sanity/image-url'

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production'

const builder = createImageUrlBuilder({ projectId, dataset })

export function urlFor(source) {
  return builder.image(source)
}
