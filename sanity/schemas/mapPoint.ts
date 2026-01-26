import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'mapPoint',
  title: 'Map Point',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'state',
      title: 'State',
      type: 'string',
      options: {
        list: [
          { title: 'Alabama', value: 'Alabama' },
          { title: 'Alaska', value: 'Alaska' },
          { title: 'Arizona', value: 'Arizona' },
          { title: 'Arkansas', value: 'Arkansas' },
          { title: 'California', value: 'California' },
          { title: 'Colorado', value: 'Colorado' },
          { title: 'Connecticut', value: 'Connecticut' },
          { title: 'Delaware', value: 'Delaware' },
          { title: 'Florida', value: 'Florida' },
          { title: 'Georgia', value: 'Georgia' },
          { title: 'Idaho', value: 'Idaho' },
          { title: 'Illinois', value: 'Illinois' },
          { title: 'Indiana', value: 'Indiana' },
          { title: 'Iowa', value: 'Iowa' },
          { title: 'Kansas', value: 'Kansas' },
          { title: 'Kentucky', value: 'Kentucky' },
          { title: 'Louisiana', value: 'Louisiana' },
          { title: 'Maine', value: 'Maine' },
          { title: 'Maryland', value: 'Maryland' },
          { title: 'Massachusetts', value: 'Massachusetts' },
          { title: 'Michigan', value: 'Michigan' },
          { title: 'Minnesota', value: 'Minnesota' },
          { title: 'Mississippi', value: 'Mississippi' },
          { title: 'Missouri', value: 'Missouri' },
          { title: 'Montana', value: 'Montana' },
          { title: 'Nebraska', value: 'Nebraska' },
          { title: 'Nevada', value: 'Nevada' },
          { title: 'New Hampshire', value: 'New Hampshire' },
          { title: 'New Jersey', value: 'New Jersey' },
          { title: 'New Mexico', value: 'New Mexico' },
          { title: 'New York', value: 'New York' },
          { title: 'North Carolina', value: 'North Carolina' },
          { title: 'North Dakota', value: 'North Dakota' },
          { title: 'Ohio', value: 'Ohio' },
          { title: 'Oklahoma', value: 'Oklahoma' },
          { title: 'Oregon', value: 'Oregon' },
          { title: 'Pennsylvania', value: 'Pennsylvania' },
          { title: 'Rhode Island', value: 'Rhode Island' },
          { title: 'South Carolina', value: 'South Carolina' },
          { title: 'South Dakota', value: 'South Dakota' },
          { title: 'Tennessee', value: 'Tennessee' },
          { title: 'Texas', value: 'Texas' },
          { title: 'Utah', value: 'Utah' },
          { title: 'Vermont', value: 'Vermont' },
          { title: 'Virginia', value: 'Virginia' },
          { title: 'Washington', value: 'Washington' },
          { title: 'West Virginia', value: 'West Virginia' },
          { title: 'Wisconsin', value: 'Wisconsin' },
          { title: 'Wyoming', value: 'Wyoming' },
        ],
      },
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'string',
      options: {
        list: [
          { title: 'West', value: 'west' },
          { title: 'Central', value: 'central' },
          { title: 'East', value: 'east' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Map Location',
      type: 'geopoint',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Venue Hero Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroLineAnimation',
      title: 'Hero Line Animation SVG',
      type: 'image',
      options: {
        accept: '.svg',
      },
      description: 'SVG used for line drawing overlay. Should match main hero dimensions.',
    }),
    defineField({
      name: 'logoTexture',
      title: 'Flashlight Logo',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery Images',
      type: 'array',
      of: [
        defineField({
          name: 'galleryItem',
          title: 'Gallery Item',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Label',
              type: 'string',
            }),
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: {
                hotspot: true,
              },
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {
              title: 'title',
              media: 'image',
            },
            prepare(selection) {
              const { title, media } = selection
              return {
                title: title || 'Untitled image',
                media,
              }
            },
          },
        }),
      ],
      validation: (rule) => rule.max(12),
    }),
    defineField({
      name: 'aboutModule',
      title: 'About Module',
      type: 'object',
      fields: [
        defineField({
          name: 'video',
          title: 'Feature Video',
          type: 'file',
          options: {
            accept: 'video/*',
          },
        }),
        defineField({
          name: 'videoPoster',
          title: 'Video Poster Image',
          type: 'image',
          options: { hotspot: true },
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'array',
          of: [{ type: 'block' }],
        }),
        defineField({
          name: 'services',
          title: 'Services',
          type: 'array',
          of: [{ type: 'string' }],
        }),
        defineField({
          name: 'partners',
          title: 'Partners',
          type: 'array',
          of: [
            defineField({
              name: 'partner',
              title: 'Partner',
              type: 'object',
              fields: [
                defineField({ name: 'name', title: 'Name', type: 'string' }),
                defineField({ name: 'title', title: 'Title / Role', type: 'string' }),
              ],
            }),
          ],
        }),
        defineField({
          name: 'crew',
          title: 'Crew',
          type: 'array',
          of: [
            defineField({
              name: 'crewMember',
              title: 'Crew Member',
              type: 'object',
              fields: [
                defineField({ name: 'name', title: 'Name', type: 'string' }),
                defineField({ name: 'title', title: 'Title / Role', type: 'string' }),
              ],
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      state: 'state',
    },
    prepare({ title, state }) {
      return {
        title,
        subtitle: state,
      }
    },
  },
})
