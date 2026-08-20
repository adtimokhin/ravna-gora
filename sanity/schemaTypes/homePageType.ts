import { defineArrayMember, defineField, defineType } from "sanity";

export const homePageType = defineType({
  name: "homePage",
  title: "Home Page",
  type: "document",
  fields: [
    defineField({
      name: "language",
      type: "string",
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: "pageTitle",
      title: "Page Title",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "pageSubtitle",
      title: "Page Subtitle",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "picture",
      title: "Hero Picture",
      type: "image",
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "welcomeQuote",
      title: "Welcome Quote",
      type: "text",
      rows: 4,
      validation: (r) => r.required(),
    }),

    defineField({
      name: "latestIssue",
      title: "Latest Newspaper Issue",
      type: "object",
      fields: [
        defineField({
          name: "picture",
          title: "Cover Picture",
          type: "image",
          options: { hotspot: true },
          validation: (r) => r.required(),
        }),
        defineField({
          name: "date",
          title: "Date",
          type: "string",
          description: 'Display string, e.g. "March 2026"',
          validation: (r) => r.required(),
        }),
        defineField({
          name: "number",
          title: "Issue Number",
          type: "string",
          description: 'Display string, e.g. "#764"',
          validation: (r) => r.required(),
        }),
        defineField({
          name: "description",
          title: "Description",
          type: "text",
          rows: 3,
          validation: (r) => r.required(),
        }),
      ],
    }),

    defineField({
      name: "about",
      title: "About Section",
      type: "object",
      fields: [
        defineField({
          name: "heading",
          title: "Heading",
          type: "string",
          validation: (r) => r.required(),
        }),
        defineField({
          name: "paragraphs",
          title: "Paragraphs",
          type: "array",
          of: [defineArrayMember({ type: "text", rows: 4 })],
          validation: (r) => r.required().min(1),
        }),
        defineField({
          name: "picture",
          title: "Picture",
          type: "image",
          options: { hotspot: true },
          validation: (r) => r.required(),
        }),
        defineField({
          name: "photoCaption",
          title: "Photo Caption",
          type: "string",
        }),
        defineField({
          name: "photoYear",
          title: "Photo Year",
          type: "string",
        }),
        defineField({
          name: "linkText",
          title: "Link Text",
          description: 'e.g. "Load More →" — links to /about',
          type: "string",
          validation: (r) => r.required(),
        }),
      ],
    }),

    defineField({
      name: "membership",
      title: "Membership Section",
      type: "object",
      fields: [
        defineField({
          name: "heading",
          title: "Heading",
          type: "string",
          validation: (r) => r.required(),
        }),
        defineField({
          name: "paragraphs",
          title: "Paragraphs",
          type: "array",
          of: [defineArrayMember({ type: "text", rows: 4 })],
          validation: (r) => r.required().min(1),
        }),
        defineField({
          name: "ctaText",
          title: "CTA Button Text",
          description: 'e.g. "Join the Movement →" — links to /membership',
          type: "string",
          validation: (r) => r.required(),
        }),
      ],
    }),

    defineField({
      name: "chapters",
      title: "Chapters",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "name",
              title: "Name",
              type: "string",
              validation: (r) => r.required(),
            }),
            defineField({
              name: "websiteUrl",
              title: "Website URL",
              description: "Leave blank if the chapter has no website",
              type: "url",
            }),
          ],
          preview: {
            select: { title: "name", subtitle: "websiteUrl" },
          },
        }),
      ],
    }),
  ],
});
