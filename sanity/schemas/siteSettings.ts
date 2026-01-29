import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  groups: [
    { name: 'seo', title: 'SEO & Social' },
    { name: 'assets', title: 'Site Assets' },
  ],
  fields: [
    // SEO Fields
    defineField({
      name: 'siteTitle',
      title: 'Site Title',
      type: 'string',
      description: 'Main title for the site (used in browser tab and social shares)',
      group: 'seo',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'siteDescription',
      title: 'Site Description',
      type: 'text',
      rows: 3,
      description: 'Meta description for SEO and social shares (recommended: 150-160 characters)',
      group: 'seo',
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: 'socialShareImage',
      title: 'Social Share Image',
      type: 'image',
      description: 'Image for og:image and twitter:image. Recommended: 1200x630px.',
      group: 'seo',
      options: { hotspot: true },
    }),

    // Site Assets
    defineField({
      name: 'mobileMapImage',
      title: 'Mobile Map Image',
      type: 'image',
      description: 'Static map image shown on mobile devices. Recommended: ~1200px wide PNG.',
      group: 'assets',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Site Settings' }
    },
  },
})
