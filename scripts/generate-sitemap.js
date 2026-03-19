#!/usr/bin/env node
/**
 * Generates sitemap.xml from Sanity venue data.
 * Run: node scripts/generate-sitemap.js
 * Called automatically during build via npm run build.
 */
import { createClient } from '@sanity/client'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env if present (Netlify sets env vars directly, local dev needs .env)
const envPath = resolve(__dirname, '..', '.env')
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const match = line.match(/^\s*([\w]+)\s*=\s*(.*)$/)
      if (match && !match[1].startsWith('#')) {
        process.env[match[1]] = match[2].trim()
      }
    })
}

const projectId = process.env.VITE_SANITY_PROJECT_ID
const dataset = process.env.VITE_SANITY_DATASET || 'production'
const apiVersion = '2024-05-01'

const SITE_ORIGIN = 'https://consumeandcreate.co'

async function generate() {
  if (!projectId) {
    console.warn('VITE_SANITY_PROJECT_ID not set — generating sitemap with home page only')
    return buildXml([])
  }

  const client = createClient({ projectId, dataset, apiVersion, useCdn: true })
  const slugs = await client.fetch(`*[_type == "mapPoint"]{ "slug": slug.current }`)
  return buildXml(slugs.map((s) => s.slug).filter(Boolean))
}

function buildXml(slugs) {
  const today = new Date().toISOString().split('T')[0]
  const urls = [
    { loc: `${SITE_ORIGIN}/map/`, changefreq: 'weekly', priority: '1.0' },
    ...slugs.map((slug) => ({
      loc: `${SITE_ORIGIN}/map/venue/${slug}`,
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  const outPath = resolve(__dirname, '..', 'public', 'sitemap.xml')
  writeFileSync(outPath, xml, 'utf-8')
  console.log(`Sitemap generated: ${urls.length} URLs → public/sitemap.xml`)
}

generate().catch((err) => {
  console.error('Sitemap generation failed:', err.message)
  // Generate minimal sitemap as fallback
  buildXml([])
})
