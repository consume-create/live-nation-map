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
      name: 'location',
      title: 'Map Location',
      type: 'geopoint',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'model',
      title: '3D Model (GLB/GLTF)',
      type: 'file',
      options: {
        accept: '.glb,.gltf,model/gltf-binary,model/gltf+json',
      },
      validation: (rule) => rule.required(),
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
            defineField({
              name: 'position',
              title: 'Overlay Positioning',
              type: 'object',
              fields: [
                { name: 'top', title: 'Top (%)', type: 'number' },
                { name: 'left', title: 'Left (%)', type: 'number' },
                { name: 'bottom', title: 'Bottom (%)', type: 'number' },
                { name: 'right', title: 'Right (%)', type: 'number' },
                { name: 'width', title: 'Width (px)', type: 'number' },
              ],
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
      validation: (rule) => rule.max(5),
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
