import { defineConfig } from 'sanity'
import { deskTool } from 'sanity/desk'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'

const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.VITE_SANITY_PROJECT_ID ||
  ''

if (!projectId || /[^a-z0-9-]/i.test(projectId)) {
  throw new Error(
    "Invalid or missing Sanity project ID. Set SANITY_STUDIO_PROJECT_ID (no quotes) in sanity/.env or .env.local."
  )
}

const dataset = process.env.SANITY_STUDIO_DATASET || process.env.VITE_SANITY_DATASET || 'production'

export default defineConfig({
  name: 'default',
  title: '3D Map CMS',
  projectId,
  dataset,
  plugins: [deskTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
})
