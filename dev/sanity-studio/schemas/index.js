// An article, as many sites have it: a title, a main image with
// alternative text, and a body of Portable Text with images and tables.
import { defineField, defineType, defineArrayMember } from 'sanity';

const image = (name, title) =>
  defineField({
    name,
    title,
    type: 'image',
    fields: [defineField({ name: 'alt', title: 'Alternative text', type: 'string' })]
  });

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' } }),
    image('mainImage', 'Main image'),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        defineArrayMember({ type: 'block' }),
        defineArrayMember({
          type: 'image',
          fields: [defineField({ name: 'alt', title: 'Alternative text', type: 'string' })]
        }),
        defineArrayMember({ type: 'table' })
      ]
    })
  ]
});

export const schemaTypes = [article];
