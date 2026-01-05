import { defineCliConfig } from 'sanity/cli'

const studioHost =
  process.env.SANITY_STUDIO_HOST ||
  process.env.SANITY_STUDIO_HOSTNAME ||
  process.env.VITE_SANITY_STUDIO_HOST ||
  'live-nation-map'

if (!studioHost || /[^a-z0-9-]/i.test(studioHost)) {
  throw new Error(
    "Invalid or missing Sanity studio hostname. Set SANITY_STUDIO_HOST in sanity/.env or .env.local."
  )
}

export default defineCliConfig({
  studioHost,
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || '<projectId>',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
})
